"""TSMC(2330) 월매출: TWSE OpenAPI(JSON, 최신 월) → 대만 공개자료관측소(MOPS) HTML 순으로 시도."""
from __future__ import annotations

from datetime import date
from typing import Optional

from bs4 import BeautifulSoup

from ..http import get, make_session

TWSE_OPENAPI_URL = "https://openapi.twse.com.tw/v1/opendata/t187ap05_L"  # 상장사 월별 영업수입 (최신 월)
MOPS_URL = "https://mops.twse.com.tw/nas/t21/sii/t21sc03_{roc_year}_{month}_0.html"
TSMC_CODE = "2330"


def _num(text) -> Optional[float]:
    t = str(text).replace(",", "").strip() if text is not None else ""
    if not t or t in ("-", "--"):
        return None
    try:
        return float(t)
    except ValueError:
        return None


def roc_ym_to_date(ym: str) -> Optional[str]:
    """'11408' (민국 114년 8월) → '2025-08-01'."""
    ym = str(ym).strip()
    if len(ym) not in (5, 6) or not ym.isdigit():
        return None
    year = 1911 + int(ym[:-2])
    month = int(ym[-2:])
    if not 1 <= month <= 12:
        return None
    return f"{year:04d}-{month:02d}-01"


def parse_twse_openapi(rows: list[dict], code: str = TSMC_CODE) -> Optional[dict]:
    """TWSE OpenAPI 월매출 JSON 에서 code 행 추출 (키는 부분 문자열로 찾아 필드명 변경에 견딘다)."""
    for r in rows:
        if not isinstance(r, dict) or str(r.get("公司代號", "")).strip() != code:
            continue

        def pick(sub: str, exclude: str = "累計"):
            for k, v in r.items():
                if sub in k and exclude not in k:
                    return v
            return None

        rev = _num(pick("當月營收"))
        if rev is None:
            continue
        d = roc_ym_to_date(r.get("資料年月", ""))
        out = {
            "code": code,
            "name": str(r.get("公司名稱", "")).strip(),
            "revenue": rev,
            "prev_month": _num(pick("上月營收")),
            "last_year": _num(pick("去年當月營收")),
            "mom_pct": _num(pick("上月比較增減")),
            "yoy_pct": _num(pick("去年同月增減")),
            "date": d,
        }
        if d:
            out["year"], out["month"] = int(d[:4]), int(d[5:7])
        return out
    return None


def decode_mops(content: bytes) -> str:
    head = content[:3000].lower()
    if b"utf-8" in head:
        return content.decode("utf-8", errors="replace")
    return content.decode("cp950", errors="replace")


def parse_mops(html: str, code: str = TSMC_CODE) -> Optional[dict]:
    """MOPS 월매출 표에서 code 행을 찾아 {revenue, prev_month, last_year, mom_pct, yoy_pct} (단위: NT$ 천) 반환."""
    soup = BeautifulSoup(html, "lxml")
    for td in soup.find_all("td"):
        if td.get_text(strip=True) != code:
            continue
        cells = [c.get_text(strip=True) for c in td.parent.find_all("td")]
        if len(cells) < 7:
            continue
        rev = _num(cells[2])
        if rev is None:
            continue
        return {
            "code": code,
            "name": cells[1],
            "revenue": rev,
            "prev_month": _num(cells[3]),
            "last_year": _num(cells[4]),
            "mom_pct": _num(cells[5]),
            "yoy_pct": _num(cells[6]),
        }
    return None


def fetch_latest_openapi(session, code: str = TSMC_CODE) -> Optional[dict]:
    resp = get(session, TWSE_OPENAPI_URL, headers={"Accept": "application/json"})
    data = resp.json()
    row = parse_twse_openapi(data if isinstance(data, list) else [], code)
    if row and not row.get("date"):
        row = None
    return row


def fetch_month(session, year: int, month: int, code: str = TSMC_CODE) -> Optional[dict]:
    url = MOPS_URL.format(roc_year=year - 1911, month=month)
    resp = get(session, url)
    row = parse_mops(decode_mops(resp.content), code)
    if row:
        row["year"], row["month"] = year, month
        row["date"] = f"{year:04d}-{month:02d}-01"
    return row


def fetch_recent(session=None, months: int = 2, today: Optional[date] = None) -> list[dict]:
    """최신 월(OpenAPI) + 직전 N개월(MOPS, 가능한 것만). 아직 공시 전인 달은 건너뛴다."""
    session = session or make_session()
    today = today or date.today()
    out: dict[str, dict] = {}
    try:
        row = fetch_latest_openapi(session)
        if row:
            out[row["date"]] = row
    except Exception:  # noqa: BLE001 - MOPS 로 대체
        pass
    y, m = today.year, today.month
    for _ in range(months):
        m -= 1
        if m == 0:
            y, m = y - 1, 12
        key = f"{y:04d}-{m:02d}-01"
        if key in out:
            continue
        try:
            row = fetch_month(session, y, m)
        except Exception:  # noqa: BLE001
            row = None
        if row:
            out[key] = row
    return sorted(out.values(), key=lambda r: r["date"])
