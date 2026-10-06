"""네이버 증권: 외국인·기관 순매매(일별), 종목 PBR/현재가, 원/달러 일별 환율.

2026년 기준 finance.naver.com 의 구 HTML 페이지(item/frgn, item/main, marketindex 일별)는
새 사이트로 리다이렉트되거나 410 으로 폐기되었으므로 모바일 JSON API 를 우선 쓰고,
HTML 파서는 폴백으로만 남겨 둔다.
"""
from __future__ import annotations

import re
from typing import Optional

from bs4 import BeautifulSoup

from ..http import get, make_session

TREND_API = "https://m.stock.naver.com/api/stock/{code}/trend?pageSize={size}&page={page}"
INTEGRATION_API = "https://m.stock.naver.com/api/stock/{code}/integration"
FX_API_CANDIDATES = [
    "https://m.stock.naver.com/front-api/marketIndex/prices?category=exchange&reutersCode=FX_USDKRW&page={page}&pageSize=60",
    "https://m.stock.naver.com/api/marketIndex/exchange/FX_USDKRW/prices?page={page}&pageSize=60",
]
FRGN_URL = "https://finance.naver.com/item/frgn.naver?code={code}&page={page}"
MAIN_URL = "https://finance.naver.com/item/main.naver?code={code}"
FX_URL = "https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_USDKRW&page={page}"
API_HEADERS = {"Referer": "https://m.stock.naver.com/", "Accept": "application/json, text/plain, */*"}
_DATE_RE = re.compile(r"^(\d{4})\.(\d{2})\.(\d{2})$")


def decode_naver(content: bytes) -> str:
    return content.decode("cp949", errors="replace")


def _num(text) -> Optional[float]:
    if text is None:
        return None
    t = str(text).replace(",", "").replace("%", "").replace("+", "").replace("배", "").replace("원", "").strip()
    if t in ("", "-", "--", "N/A"):
        return None
    try:
        return float(t)
    except ValueError:
        return None


def _bizdate(s) -> Optional[str]:
    s = str(s or "").strip()
    if len(s) == 8 and s.isdigit():
        return f"{s[:4]}-{s[4:6]}-{s[6:8]}"
    m = _DATE_RE.match(s)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        return s[:10]
    return None


# ── JSON API 파서 ─────────────────────────────────────────────────────
def parse_trend_json(items: list) -> list[dict]:
    """/api/stock/{code}/trend → [{date, close, volume, inst_net, frgn_net, frgn_ratio}] (날짜 오름차순)."""
    rows: dict[str, dict] = {}
    for it in items or []:
        if not isinstance(it, dict):
            continue
        d = _bizdate(it.get("bizdate"))
        frgn = _num(it.get("foreignerPureBuyQuant"))
        if not d or frgn is None:
            continue
        rows.setdefault(d, {
            "date": d,
            "close": _num(it.get("closePrice")),
            "volume": _num(it.get("accumulatedTradingVolume")),
            "inst_net": _num(it.get("organPureBuyQuant")),
            "frgn_net": frgn,
            "frgn_holding": None,
            "frgn_ratio": _num(it.get("foreignerHoldRatio")),
        })
    return sorted(rows.values(), key=lambda r: r["date"])


def parse_integration_json(data: dict) -> dict:
    """/api/stock/{code}/integration → {pbr, per, price} (totalInfos 의 code/key 로 찾는다)."""
    out: dict = {}
    infos = data.get("totalInfos") if isinstance(data, dict) else None
    for it in infos or []:
        if not isinstance(it, dict):
            continue
        code = str(it.get("code", "")).lower()
        key = str(it.get("key", "")).upper()
        val = _num(it.get("value"))
        if val is None:
            continue
        if code == "pbr" or key == "PBR":
            out["pbr"] = val
        elif code == "per" or key == "PER":
            out["per"] = val
        elif code in ("closeprice", "currentprice", "nowprice", "lastcloseprice") and "price" not in out:
            out["price"] = val
    if "price" not in out and isinstance(data, dict):
        for k in ("closePrice", "currentPrice", "nowPrice"):
            v = _num(data.get(k))
            if v is not None:
                out["price"] = v
                break
    return out


def parse_fx_json(data) -> list[dict]:
    """환율 JSON(여러 후보 형태) → [{date, rate}]. 날짜·가격 필드명을 유연하게 찾는다."""
    items = data
    if isinstance(data, dict):
        for k in ("result", "data", "prices", "list", "items"):
            if isinstance(data.get(k), list):
                items = data[k]
                break
        else:
            items = []
    rows: dict[str, dict] = {}
    for it in items or []:
        if not isinstance(it, dict):
            continue
        d = None
        for k in ("localTradedAt", "bizdate", "date", "tradeDate", "localDate"):
            d = _bizdate(it.get(k))
            if d:
                break
        rate = None
        for k in ("closePrice", "price", "closePriceValue", "rate", "basePrice"):
            rate = _num(it.get(k))
            if rate is not None:
                break
        if d and rate:
            rows.setdefault(d, {"date": d, "rate": rate})
    return sorted(rows.values(), key=lambda r: r["date"])


# ── 구 HTML 파서 (폴백) ────────────────────────────────────────────────
def parse_foreign_table(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    rows: dict[str, dict] = {}
    for tr in soup.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if len(cells) < 7:
            continue
        d = _bizdate(cells[0])
        if not d:
            continue
        rec = {
            "date": d,
            "close": _num(cells[1]),
            "volume": _num(cells[4]),
            "inst_net": _num(cells[5]),
            "frgn_net": _num(cells[6]),
            "frgn_holding": _num(cells[7]) if len(cells) > 7 else None,
            "frgn_ratio": _num(cells[8]) if len(cells) > 8 else None,
        }
        if rec["frgn_net"] is None:
            continue
        rows.setdefault(d, rec)
    return sorted(rows.values(), key=lambda r: r["date"])


def parse_main(html: str) -> dict:
    out: dict = {}
    m = re.search(r'id="_pbr"[^>]*>\s*([\d.,]+)', html)
    if m:
        out["pbr"] = _num(m.group(1))
    m = re.search(r'id="_per"[^>]*>\s*([\d.,]+)', html)
    if m:
        out["per"] = _num(m.group(1))
    m = re.search(r'class="no_today".*?<span class="blind">([\d,]+)</span>', html, re.S)
    if m:
        out["price"] = _num(m.group(1))
    return out


def parse_fx_table(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    rows: dict[str, dict] = {}
    for tr in soup.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if len(cells) < 2:
            continue
        d = _bizdate(cells[0])
        rate = _num(cells[1]) if d else None
        if d and rate is not None:
            rows.setdefault(d, {"date": d, "rate": rate})
    return sorted(rows.values(), key=lambda r: r["date"])


# ── 네트워크 ──────────────────────────────────────────────────────────
def fetch_foreign_flows(session=None, code: str = "005930", pages: int = 1, page_size: int = 60) -> list[dict]:
    """모바일 JSON API 우선, 실패 시 구 HTML 페이지."""
    session = session or make_session()
    merged: dict[str, dict] = {}
    try:
        for page in range(1, pages + 1):
            resp = get(session, TREND_API.format(code=code, size=page_size, page=page), headers=API_HEADERS)
            items = resp.json()
            for r in parse_trend_json(items if isinstance(items, list) else []):
                merged.setdefault(r["date"], r)
            if not isinstance(items, list) or len(items) < page_size:
                break
    except Exception:  # noqa: BLE001 - HTML 폴백
        merged = {}
    if merged:
        return sorted(merged.values(), key=lambda r: r["date"])
    for page in range(1, max(pages, 2) + 1):
        resp = get(session, FRGN_URL.format(code=code, page=page), headers={"Referer": "https://finance.naver.com/"})
        for r in parse_foreign_table(decode_naver(resp.content)):
            merged.setdefault(r["date"], r)
    return sorted(merged.values(), key=lambda r: r["date"])


def fetch_main(session=None, code: str = "005930") -> dict:
    session = session or make_session()
    try:
        resp = get(session, INTEGRATION_API.format(code=code), headers=API_HEADERS)
        out = parse_integration_json(resp.json())
        if out.get("pbr") is not None:
            return out
    except Exception:  # noqa: BLE001 - HTML 폴백
        pass
    resp = get(session, MAIN_URL.format(code=code), headers={"Referer": "https://finance.naver.com/"})
    return parse_main(decode_naver(resp.content))


def fetch_usdkrw(session=None, pages: int = 1) -> list[dict]:
    session = session or make_session()
    for tmpl in FX_API_CANDIDATES:
        try:
            merged: dict[str, dict] = {}
            for page in range(1, pages + 1):
                resp = get(session, tmpl.format(page=page), headers=API_HEADERS)
                for r in parse_fx_json(resp.json()):
                    merged.setdefault(r["date"], r)
            if merged:
                return sorted(merged.values(), key=lambda r: r["date"])
        except Exception:  # noqa: BLE001 - 다음 후보
            continue
    merged = {}
    for page in range(1, pages + 1):
        resp = get(session, FX_URL.format(page=page), headers={"Referer": "https://finance.naver.com/"})
        for r in parse_fx_table(decode_naver(resp.content)):
            merged.setdefault(r["date"], r)
    return sorted(merged.values(), key=lambda r: r["date"])
