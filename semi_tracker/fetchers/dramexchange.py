"""DRAMeXchange 공개 페이지(현물가·고정가 표)와 TrendForce 보도자료 헤드라인.

고정거래가격 전체 데이터는 유료이므로 공개 페이지에 노출된 요약 표만 시도하고,
파싱 결과가 없으면 호출 측에서 수동 입력(manual_inputs.yaml)으로 대체한다.
"""
from __future__ import annotations

import re
from datetime import date
from typing import Optional

from bs4 import BeautifulSoup

from ..config import PRODUCT_PATTERNS
from ..http import get, make_session

HOME_URL = "https://www.dramexchange.com/"
TRENDFORCE_NEWS_URL = "https://www.trendforce.com/presscenter/news"
NEWS_KEYWORDS = ("dram", "nand", "hbm", "cowos", "memory", "contract price", "spot price", "capex", "foundry")

_NUM_RE = re.compile(r"-?\d+(?:,\d{3})*(?:\.\d+)?")
_PERIOD_HINT_RE = re.compile(r"(?i)\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?|20\d{2}[./-]?\d{0,2}")
_MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}


def match_product(text: str) -> Optional[str]:
    for pat, key in PRODUCT_PATTERNS:
        if re.search(pat, text, re.I):
            return key
    return None


def _num(text: str) -> Optional[float]:
    m = _NUM_RE.search(text.replace("$", "").replace("US", ""))
    if not m:
        return None
    try:
        return float(m.group().replace(",", ""))
    except ValueError:
        return None


def parse_period(text: str, today: Optional[date] = None) -> Optional[str]:
    """'Sep. 2025', '2025/09', '1H Sep' 같은 기간 표기를 'YYYY-MM-01' 로."""
    today = today or date.today()
    t = text.lower()
    m = re.search(r"(20\d{2})[./-](\d{1,2})", t)
    if m:
        return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}-01"
    m = re.search(r"([a-z]{3})[a-z]*\.?\s*(20\d{2})?", t)
    if m and m.group(1) in _MONTHS:
        year = int(m.group(2)) if m.group(2) else today.year
        month = _MONTHS[m.group(1)]
        if not m.group(2) and month > today.month:
            year -= 1
        return f"{year:04d}-{month:02d}-01"
    return None


def _table_kind(table) -> Optional[str]:
    """표 헤더(우선)와 가장 가까운 제목·캡션·부모 class 로 spot/contract 를 분류."""
    header = " ".join(th.get_text(" ", strip=True) for th in table.find_all("th")).lower()
    if not header:
        first = table.find("tr")
        header = first.get_text(" ", strip=True).lower() if first else ""
    if "fixed" in header or "contract" in header:
        return "contract"
    if "session" in header or "spot" in header or "daily high" in header:
        return "spot"
    ctx_parts = []
    cap = table.find("caption")
    if cap:
        ctx_parts.append(cap.get_text(" ", strip=True))
    heading = table.find_previous(["h1", "h2", "h3", "h4", "h5", "caption", "strong", "b"])
    if heading is not None:
        ctx_parts.append(heading.get_text(" ", strip=True))
    for el in (table, table.parent):
        if el is not None and el.get("class"):
            ctx_parts.append(" ".join(el.get("class")))
        if el is not None and el.get("id"):
            ctx_parts.append(str(el.get("id")))
    ctx = " ".join(ctx_parts).lower()
    if "contract" in ctx or "fixed" in ctx:
        return "contract"
    if "spot" in ctx:
        return "spot"
    return None


def parse_price_tables(html: str, today: Optional[date] = None) -> list[dict]:
    """페이지 내 모든 표에서 제품 가격 레코드를 추출.

    반환 레코드: {product, item, kind(spot|contract), price, change_pct, period}
    """
    soup = BeautifulSoup(html, "lxml")
    records: list[dict] = []
    for table in soup.find_all("table"):
        kind = _table_kind(table)
        if kind is None:
            continue
        headers = [th.get_text(" ", strip=True).lower() for th in table.find_all("th")]
        avg_idx = next((i for i, h in enumerate(headers) if "average" in h or "avg" in h), None)
        chg_idx = next((i for i, h in enumerate(headers) if "change" in h or "chg" in h), None)
        for tr in table.find_all("tr"):
            cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
            if len(cells) < 2:
                continue
            product = match_product(cells[0])
            if not product:
                continue
            price = None
            if avg_idx is not None and avg_idx < len(cells):
                price = _num(cells[avg_idx])
            change = None
            if chg_idx is not None and chg_idx < len(cells) and "%" in cells[chg_idx]:
                change = _num(cells[chg_idx])
            if price is None:
                numeric = [(i, _num(c)) for i, c in enumerate(cells[1:], start=1)
                           if _num(c) is not None and "%" not in c]
                if numeric:
                    price = numeric[-1][1]
            if change is None:
                pct_cells = [c for c in cells[1:] if "%" in c]
                if pct_cells:
                    change = _num(pct_cells[-1])
            period = None
            for c in cells[1:]:
                if _PERIOD_HINT_RE.search(c):
                    period = parse_period(c, today)
                    if period:
                        break
            if price is None or price <= 0:
                continue
            records.append({
                "product": product,
                "item": cells[0],
                "kind": kind,
                "price": price,
                "change_pct": change,
                "period": period,
            })
    return records


def parse_news(html: str, keywords=NEWS_KEYWORDS, limit: int = 12) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    seen = set()
    out = []
    for a in soup.find_all("a", href=True):
        title = a.get_text(" ", strip=True)
        if len(title) < 25:
            continue
        low = title.lower()
        if not any(k in low for k in keywords):
            continue
        href = a["href"]
        if href.startswith("/"):
            href = "https://www.trendforce.com" + href
        if href in seen:
            continue
        seen.add(href)
        out.append({"title": title, "url": href})
        if len(out) >= limit:
            break
    return out


def fetch_prices(session=None, today: Optional[date] = None) -> list[dict]:
    session = session or make_session()
    resp = get(session, HOME_URL)
    return parse_price_tables(resp.text, today)


def fetch_news(session=None) -> list[dict]:
    session = session or make_session()
    resp = get(session, TRENDFORCE_NEWS_URL)
    return parse_news(resp.text)
