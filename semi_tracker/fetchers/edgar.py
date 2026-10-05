"""SEC EDGAR XBRL companyconcept API 로 마이크론·엔비디아 분기 재무 데이터 수집.

10-Q 는 분기값과 누적값이 섞여 있고 10-K 는 연간값만 있으므로,
같은 시작일(start)을 가진 사실(fact)을 종료일 순으로 차감해 분기값을 만든다.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Optional

from ..http import get, make_session, sec_user_agent

CONCEPT_URL = "https://data.sec.gov/api/xbrl/companyconcept/CIK{cik:010d}/us-gaap/{tag}.json"

REVENUE_TAGS = ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"]
GROSS_PROFIT_TAGS = ["GrossProfit"]
INVENTORY_TAGS = ["InventoryNet"]
COGS_TAGS = ["CostOfGoodsAndServicesSold", "CostOfRevenue", "CostOfGoodsSold"]
CAPEX_TAGS = ["PaymentsToAcquirePropertyPlantAndEquipment"]
_FORMS = ("10-Q", "10-K")


def _d(s: str) -> date:
    return date.fromisoformat(s)


def derive_quarterly(facts: list[dict]) -> list[dict]:
    """기간(duration) 사실 목록 → 분기 레코드 [{start, end, value, days, filed, derived}] (end 오름차순)."""
    rows = [f for f in facts if f.get("start") and f.get("end") and str(f.get("form", "")).startswith(_FORMS)]
    best: dict[tuple, dict] = {}
    for f in rows:
        k = (f["start"], f["end"])
        if k not in best or f.get("filed", "") > best[k].get("filed", ""):
            best[k] = f
    groups: dict[str, list[dict]] = defaultdict(list)
    for f in best.values():
        groups[f["start"]].append(f)
    out: dict[str, dict] = {}
    for start, items in groups.items():
        items.sort(key=lambda f: f["end"])
        prev_end: Optional[date] = None
        prev_val: Optional[float] = None
        for f in items:
            s = _d(start) if prev_end is None else prev_end
            e = _d(f["end"])
            span = (e - s).days
            val = float(f["val"]) if prev_val is None else float(f["val"]) - prev_val
            if 75 <= span <= 100:
                rec = {"start": s.isoformat(), "end": f["end"], "value": val, "days": span + 1,
                       "filed": f.get("filed", ""), "derived": prev_val is not None}
                cur = out.get(f["end"])
                if cur is None or rec["filed"] > cur["filed"] or (
                        rec["filed"] == cur["filed"] and cur["derived"] and not rec["derived"]):
                    out[f["end"]] = rec
            prev_end, prev_val = e, float(f["val"])
    return sorted(out.values(), key=lambda r: r["end"])


def instant_series(facts: list[dict]) -> list[dict]:
    """시점(instant) 사실 → [{end, value, filed}] (end 오름차순, 최신 제출 우선)."""
    best: dict[str, dict] = {}
    for f in facts:
        if f.get("start") or not f.get("end") or not str(f.get("form", "")).startswith(_FORMS):
            continue
        cur = best.get(f["end"])
        if cur is None or f.get("filed", "") > cur.get("filed", ""):
            best[f["end"]] = {"end": f["end"], "value": float(f["val"]), "filed": f.get("filed", "")}
    return sorted(best.values(), key=lambda r: r["end"])


def days_inventory(cogs_q: list[dict], inventory: list[dict]) -> list[dict]:
    """분기 매출원가와 기말 재고로 재고일수(DIO)·주수 계산."""
    inv = {r["end"]: r["value"] for r in inventory}
    out = []
    for q in cogs_q:
        v = inv.get(q["end"])
        if v is None or q["value"] <= 0:
            continue
        dio = v / q["value"] * q["days"]
        out.append({"end": q["end"], "dio_days": dio, "weeks": dio / 7.0})
    return out


class EdgarClient:
    def __init__(self, session=None):
        self.session = session or make_session(user_agent=sec_user_agent())

    def concept(self, cik: int, tag: str, unit: str = "USD") -> list[dict]:
        resp = get(self.session, CONCEPT_URL.format(cik=cik, tag=tag))
        data = resp.json()
        return data.get("units", {}).get(unit, [])

    def first_available(self, cik: int, tags: list[str]) -> tuple[Optional[str], list[dict]]:
        for tag in tags:
            try:
                facts = self.concept(cik, tag)
            except Exception:  # noqa: BLE001 - 다음 태그 시도
                continue
            if facts:
                return tag, facts
        return None, []

    def quarterly(self, cik: int, tags: list[str]) -> list[dict]:
        _, facts = self.first_available(cik, tags)
        return derive_quarterly(facts)

    def instants(self, cik: int, tags: list[str]) -> list[dict]:
        _, facts = self.first_available(cik, tags)
        return instant_series(facts)
