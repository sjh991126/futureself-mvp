"""원/달러 환율: Frankfurter(ECB 기준환율, 키 불필요) → 네이버 환율 순으로 시도."""
from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from ..http import get, make_session
from . import naver

FRANKFURTER_URL = "https://api.frankfurter.app/{start}..{end}?from=USD&to=KRW"


def parse_frankfurter(data: dict) -> list[dict]:
    rates = data.get("rates", {})
    out = []
    for d, v in rates.items():
        krw = v.get("KRW") if isinstance(v, dict) else None
        if krw is not None:
            out.append({"date": d, "rate": float(krw)})
    return sorted(out, key=lambda r: r["date"])


def fetch_usdkrw(session=None, days: int = 90, today: Optional[date] = None) -> tuple[str, list[dict]]:
    """(source_name, rows) 반환. rows: [{date, rate}]"""
    session = session or make_session()
    today = today or date.today()
    start = today - timedelta(days=days)
    try:
        resp = get(session, FRANKFURTER_URL.format(start=start.isoformat(), end=today.isoformat()))
        rows = parse_frankfurter(resp.json())
        if rows:
            return "frankfurter", rows
    except Exception:  # noqa: BLE001 - 다음 소스로
        pass
    rows = naver.fetch_usdkrw(session)
    return "naver", rows
