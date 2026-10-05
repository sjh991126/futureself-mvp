"""대만 공개자료관측소(MOPS) 월별 매출 공시에서 TSMC(2330) 월매출 추출."""
from __future__ import annotations

from datetime import date
from typing import Optional

from bs4 import BeautifulSoup

from ..http import get, make_session

MOPS_URL = "https://mops.twse.com.tw/nas/t21/sii/t21sc03_{roc_year}_{month}_0.html"
TSMC_CODE = "2330"


def _num(text: str) -> Optional[float]:
    t = text.replace(",", "").strip()
    if not t or t in ("-", "--"):
        return None
    try:
        return float(t)
    except ValueError:
        return None


def decode_mops(content: bytes) -> str:
    head = content[:3000].lower()
    if b"utf-8" in head:
        return content.decode("utf-8", errors="replace")
    return content.decode("cp950", errors="replace")


def parse_mops(html: str, code: str = TSMC_CODE) -> Optional[dict]:
    """월매출 표에서 code 행을 찾아 {revenue, prev_month, last_year, mom_pct, yoy_pct} (단위: NT$ 천) 반환."""
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


def fetch_month(session, year: int, month: int, code: str = TSMC_CODE) -> Optional[dict]:
    url = MOPS_URL.format(roc_year=year - 1911, month=month)
    resp = get(session, url)
    row = parse_mops(decode_mops(resp.content), code)
    if row:
        row["year"], row["month"] = year, month
        row["date"] = f"{year:04d}-{month:02d}-01"
    return row


def fetch_recent(session=None, months: int = 2, today: Optional[date] = None) -> list[dict]:
    """최근 N개월(직전 달부터) 시도. 아직 공시 전인 달은 건너뛴다."""
    session = session or make_session()
    today = today or date.today()
    y, m = today.year, today.month
    out = []
    for _ in range(months):
        m -= 1
        if m == 0:
            y, m = y - 1, 12
        try:
            row = fetch_month(session, y, m)
        except Exception:  # noqa: BLE001
            row = None
        if row:
            out.append(row)
    return out
