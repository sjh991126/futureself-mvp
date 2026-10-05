"""지표별 다음 발표 예정일 계산(발표 주기 기반 추정)."""
from __future__ import annotations

import calendar as _cal
from datetime import date, timedelta
from typing import Optional


def last_business_day(year: int, month: int) -> date:
    d = date(year, month, _cal.monthrange(year, month)[1])
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d


def next_business_day(today: date) -> date:
    d = today + timedelta(days=1)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d


def _next_monthly(today: date, day: int, months: Optional[list[int]] = None) -> date:
    """오늘 이후(포함) 가장 가까운 '지정 월의 day일'. months 가 None 이면 매월."""
    months = months or list(range(1, 13))
    y, m = today.year, today.month
    for _ in range(26):
        if m in months:
            dim = _cal.monthrange(y, m)[1]
            d = date(y, m, min(day, dim))
            if d >= today:
                return d
        m += 1
        if m > 12:
            y, m = y + 1, 1
    return today


def _next_month_end(today: date) -> date:
    d = last_business_day(today.year, today.month)
    if d >= today:
        return d
    y, m = (today.year + 1, 1) if today.month == 12 else (today.year, today.month + 1)
    return last_business_day(y, m)


def events(today: Optional[date] = None) -> list[dict]:
    """모든 지표의 다음 이벤트 목록 [{key, label, date, est, days}] (날짜순)."""
    today = today or date.today()
    ev = [
        ("contract_price", "TrendForce 월말 고정거래가격 발표", _next_month_end(today), True),
        ("spot_price", "DRAMeXchange 현물가 (매 거래일)", next_business_day(today), False),
        ("micron", "마이크론 분기 실적 (하순, 예상)", _next_monthly(today, 25, [3, 6, 9, 12]), True),
        ("nvidia_tsmc", "엔비디아 분기 실적 (하순, 예상)", _next_monthly(today, 25, [2, 5, 8, 11]), True),
        ("nvidia_tsmc", "TSMC 월매출 공시 (10일경)", _next_monthly(today, 10), True),
        ("capex", "삼성전자 잠정실적 (7일경)", _next_monthly(today, 7, [1, 4, 7, 10]), True),
        ("capex", "SK하이닉스 실적·CAPEX 코멘트 (하순, 예상)", _next_monthly(today, 24, [1, 4, 7, 10]), True),
        ("inventory_weeks", "삼성전자 확정실적·컨콜 (재고 코멘트, 하순)", _next_monthly(today, 28, [1, 4, 7, 10]), True),
        ("equipment_orders", "DART 단일판매·공급계약 공시 (수시)", next_business_day(today), False),
        ("foreign_flow", "KRX 투자자별 매매 (매 거래일)", next_business_day(today), False),
        ("usdkrw", "원/달러 환율 (매 거래일)", next_business_day(today), False),
        ("pbr", "P/B 갱신 (매 거래일)", next_business_day(today), False),
    ]
    out = [{"key": k, "label": l, "date": d.isoformat(), "est": est, "days": (d - today).days} for k, l, d, est in ev]
    out.sort(key=lambda e: (e["date"], e["key"]))
    return out


def next_release(key: str, today: Optional[date] = None) -> Optional[str]:
    for e in events(today):
        if e["key"] == key:
            suffix = " (예상)" if e["est"] else ""
            return f"{e['date']}{suffix} · {e['label']}"
    return None
