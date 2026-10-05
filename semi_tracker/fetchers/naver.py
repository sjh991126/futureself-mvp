"""네이버 금융: 외국인·기관 순매매(일별), 종목 PBR/현재가, 원/달러 일별 환율."""
from __future__ import annotations

import re
from typing import Optional

from bs4 import BeautifulSoup

from ..http import get, make_session

FRGN_URL = "https://finance.naver.com/item/frgn.naver?code={code}&page={page}"
MAIN_URL = "https://finance.naver.com/item/main.naver?code={code}"
FX_URL = "https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_USDKRW&page={page}"
_DATE_RE = re.compile(r"^(\d{4})\.(\d{2})\.(\d{2})$")


def decode_naver(content: bytes) -> str:
    return content.decode("cp949", errors="replace")


def _num(text: str) -> Optional[float]:
    t = text.replace(",", "").replace("%", "").replace("+", "").strip()
    if t in ("", "-", "--"):
        return None
    try:
        return float(t)
    except ValueError:
        return None


def parse_foreign_table(html: str) -> list[dict]:
    """외국인·기관 순매매 표 → [{date, close, volume, inst_net, frgn_net, frgn_holding, frgn_ratio}]."""
    soup = BeautifulSoup(html, "lxml")
    rows: dict[str, dict] = {}
    for tr in soup.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if len(cells) < 7:
            continue
        m = _DATE_RE.match(cells[0])
        if not m:
            continue
        d = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
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
    """종목 메인 페이지에서 PBR·PER·현재가 추출."""
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
    """환율 일별 시세 표 → [{date, rate}] (매매기준율)."""
    soup = BeautifulSoup(html, "lxml")
    rows: dict[str, dict] = {}
    for tr in soup.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if len(cells) < 2:
            continue
        m = _DATE_RE.match(cells[0])
        if not m:
            continue
        rate = _num(cells[1])
        if rate is None:
            continue
        d = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
        rows.setdefault(d, {"date": d, "rate": rate})
    return sorted(rows.values(), key=lambda r: r["date"])


def fetch_foreign_flows(session=None, code: str = "005930", pages: int = 2) -> list[dict]:
    session = session or make_session()
    merged: dict[str, dict] = {}
    for page in range(1, pages + 1):
        resp = get(session, FRGN_URL.format(code=code, page=page), headers={"Referer": "https://finance.naver.com/"})
        for r in parse_foreign_table(decode_naver(resp.content)):
            merged.setdefault(r["date"], r)
    return sorted(merged.values(), key=lambda r: r["date"])


def fetch_main(session=None, code: str = "005930") -> dict:
    session = session or make_session()
    resp = get(session, MAIN_URL.format(code=code), headers={"Referer": "https://finance.naver.com/"})
    return parse_main(decode_naver(resp.content))


def fetch_usdkrw(session=None, pages: int = 3) -> list[dict]:
    session = session or make_session()
    merged: dict[str, dict] = {}
    for page in range(1, pages + 1):
        resp = get(session, FX_URL.format(page=page), headers={"Referer": "https://finance.naver.com/"})
        for r in parse_fx_table(decode_naver(resp.content)):
            merged.setdefault(r["date"], r)
    return sorted(merged.values(), key=lambda r: r["date"])
