"""10개 지표의 해석 규칙(표의 '해석' 열)을 판정 함수로 옮긴 모듈.

각 함수는 Store 의 시계열과 수동 입력을 읽어 Signal 을 돌려준다.
votes 는 국면 ①~④ 에 대한 가중 투표로, phase.py 가 합산해 종합 국면을 추정한다.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from . import calendar as cal
from .config import INDICATOR_BY_KEY, KR_STOCKS, PRIMARY_DRAM_PRODUCT, THRESHOLDS as T
from .models import Point, Signal
from .store import Store


# ── 공통 도우미 ────────────────────────────────────────────────────────
def pct(a: Optional[float], b: Optional[float]) -> Optional[float]:
    if a is None or b is None or b == 0:
        return None
    return (a / b - 1.0) * 100.0


def _fmt_pct(v: Optional[float], digits: int = 1) -> str:
    return "n/a" if v is None else f"{v:+.{digits}f}%"


def _is_fresh(as_of: Optional[str], max_days: int, today: date) -> bool:
    if not as_of:
        return False
    try:
        return (today - date.fromisoformat(as_of[:10])).days <= max_days
    except ValueError:
        return False


def _value_before(points: list[Point], target: date) -> Optional[Point]:
    """target 이하 날짜 중 가장 늦은 점."""
    best = None
    for p in points:
        if date.fromisoformat(p.date) <= target:
            best = p
        else:
            break
    return best


def _manual_list(manual: dict, *path) -> list[dict]:
    cur: object = manual
    for p in path:
        if not isinstance(cur, dict):
            return []
        cur = cur.get(p)
    if isinstance(cur, list):
        return sorted([x for x in cur if isinstance(x, dict)], key=lambda x: str(x.get("date", "")))
    return []


def _base(key: str, today: date, **kw) -> Signal:
    meta = INDICATOR_BY_KEY[key]
    return Signal(key=key, name=meta["name"], lead_lag=meta["lead_lag"],
                  next_release=cal.next_release(key, today), **kw)


def _na(key: str, today: date, why: str, needs: Optional[list[str]] = None) -> Signal:
    return _base(key, today, status="na", headline="데이터 없음", rationale=why,
                 freshness="missing", needs_manual=needs or [])


# ── 1. DRAM·NAND 고정거래가격 ───────────────────────────────────────────
def contract_price_signal(store: Store, manual: dict, today: date) -> Signal:
    per_product: dict[str, dict] = {}
    for key in store.list_series():
        if not key.startswith("contract_"):
            continue
        pts = store.load_series(key)
        if len(pts) < 2:
            continue
        last, prev = pts[-1], pts[-2]
        per_product[key[len("contract_"):]] = {
            "price": last.value, "as_of": last.date,
            "mom": pct(last.value, prev.value),
            "mom_prev": pct(prev.value, pts[-3].value) if len(pts) >= 3 else None,
            "manual": "manual" in last.note,
        }
    if not per_product:
        return _na("contract_price", today,
                   "고정거래가격 월별 데이터가 2개월 이상 필요합니다. DRAMeXchange 스크랩이 비어 있으면 "
                   "data/manual_inputs.yaml 의 contract_price 에 월별 값을 입력하세요.",
                   ["TrendForce 월말 고정가 (DRAM·NAND, 최근 2개월 이상)"])

    def _avg(prefix: str, field: str) -> Optional[float]:
        vals = [v[field] for k, v in per_product.items() if k.startswith(prefix) and v.get(field) is not None]
        return sum(vals) / len(vals) if vals else None

    dram_mom, dram_prev = _avg("dram", "mom"), _avg("dram", "mom_prev")
    nand_mom, nand_prev = _avg("nand", "mom"), _avg("nand", "mom_prev")
    mom, mom_prev, basis = (dram_mom, dram_prev, "DRAM") if dram_mom is not None else (nand_mom, nand_prev, "NAND")
    as_of = max(v["as_of"] for v in per_product.values())
    is_manual = any(v["manual"] for v in per_product.values())
    decel = T["contract_decel_pp"]

    if mom is None:
        return _na("contract_price", today, "전월 대비 변화율을 계산할 수 없습니다.")
    if mom > 0 and mom_prev is not None and mom_prev <= 0:
        status, why, votes = "bull", f"{basis} 고정가 전월 대비 상승 전환 → 업사이클 시작 신호", {1: 1.0, 2: 2.0}
    elif mom > 0 and mom_prev is not None and mom_prev > 0:
        if mom < mom_prev - decel:
            status, why, votes = "caution", f"{basis} 고정가 상승 지속이나 상승률 둔화({_fmt_pct(mom_prev)}→{_fmt_pct(mom)}) → 고점 경고", {3: 2.0}
        else:
            status, why, votes = "bull", f"{basis} 고정가 상승 지속·가속({_fmt_pct(mom_prev)}→{_fmt_pct(mom)}) → 업사이클 진행", {2: 2.0}
    elif mom > 0:
        status, why, votes = "bull", f"{basis} 고정가 전월 대비 상승 (전환 여부는 다음 달 데이터로 확인)", {2: 1.5}
    elif mom < 0 and mom_prev is not None and mom_prev < 0:
        if mom > mom_prev + decel:
            status, why, votes = "neutral", f"{basis} 고정가 하락 지속이나 낙폭 축소({_fmt_pct(mom_prev)}→{_fmt_pct(mom)}) → 바닥 접근 가능성", {1: 1.5, 4: 0.5}
        else:
            status, why, votes = "bear", f"{basis} 고정가 하락 지속·가속 → 하강 국면", {4: 2.0}
    elif mom < 0 and mom_prev is not None and mom_prev >= 0:
        status, why, votes = "bear", f"{basis} 고정가 하락 전환 → 고점 통과 경고", {4: 2.0, 3: 0.5}
    elif mom < 0:
        status, why, votes = "bear", f"{basis} 고정가 전월 대비 하락", {4: 1.5}
    else:
        status, why, votes = "neutral", f"{basis} 고정가 보합", {}

    parts = []
    if dram_mom is not None:
        parts.append(f"DRAM 전월比 {_fmt_pct(dram_mom)}")
    if nand_mom is not None:
        parts.append(f"NAND 전월比 {_fmt_pct(nand_mom)}")
    if PRIMARY_DRAM_PRODUCT in per_product:
        parts.append(f"DDR4 8Gb ${per_product[PRIMARY_DRAM_PRODUCT]['price']:.2f}")
    return _base("contract_price", today, status=status, headline=" · ".join(parts), rationale=why,
                 as_of=as_of, votes=votes,
                 freshness="manual" if is_manual else ("fresh" if _is_fresh(as_of, T["stale_days_monthly"], today) else "stale"),
                 metrics={"dram_mom": dram_mom, "dram_mom_prev": dram_prev, "nand_mom": nand_mom,
                          "nand_mom_prev": nand_prev, "products": per_product})


# ── 2. 현물가격 ───────────────────────────────────────────────────────
def spot_price_signal(store: Store, manual: dict, today: date, contract: Optional[Signal] = None) -> Signal:
    key = f"spot_{PRIMARY_DRAM_PRODUCT}"
    pts = store.load_series(key)
    product = PRIMARY_DRAM_PRODUCT
    if not pts:
        candidates = [(len(store.load_series(k)), k) for k in store.list_series() if k.startswith("spot_")]
        candidates = [c for c in candidates if c[0] >= 1]
        if not candidates:
            return _na("spot_price", today,
                       "현물가 일별 데이터가 필요합니다 (DRAMeXchange 자동 수집 또는 manual_inputs.yaml 의 spot_price).",
                       ["DRAMeXchange 현물가 (DDR4 8Gb 등)"])
        key = max(candidates)[1]
        product = key[len("spot_"):]
        pts = store.load_series(key)
    last = pts[-1]
    last_d = date.fromisoformat(last.date)
    p1m = _value_before(pts, last_d - timedelta(days=28))
    p1w = _value_before(pts, last_d - timedelta(days=7))
    chg_1m = pct(last.value, p1m.value) if p1m else None
    chg_1w = pct(last.value, p1w.value) if p1w else None
    contract_price = None
    if contract and contract.metrics.get("products", {}).get(product):
        contract_price = contract.metrics["products"][product]["price"]
    else:
        cpts = store.load_series(f"contract_{product}")
        if cpts:
            contract_price = cpts[-1].value
    premium = pct(last.value, contract_price) if contract_price else None

    votes: dict = {}
    reasons: list[str] = []
    status = "neutral"
    gap = T["spot_vs_contract_pct"]
    if premium is not None and premium < -gap:
        status = "caution"
        reasons.append(f"현물가가 고정가보다 {abs(premium):.1f}% 낮음 → 고정가 하락 예고")
        votes[3] = votes.get(3, 0) + 1.0
        votes[4] = votes.get(4, 0) + 1.0
    elif premium is not None and premium > gap:
        reasons.append(f"현물가가 고정가보다 {premium:.1f}% 높음 → 고정가 상승 압력")
        votes[1] = votes.get(1, 0) + 1.0
        votes[2] = votes.get(2, 0) + 1.0
        status = "bull"
    ref = chg_1m if chg_1m is not None else chg_1w
    ref_label = "1개월" if chg_1m is not None else "1주"
    if ref is not None:
        if ref > T["spot_1m_change_pct"]:
            reasons.append(f"현물가 {ref_label} {_fmt_pct(ref)} 상승 → 고정가 선행 반등 신호")
            votes[1] = votes.get(1, 0) + 1.0
            votes[2] = votes.get(2, 0) + 1.0
            if status == "neutral":
                status = "bull"
        elif ref < -T["spot_1m_change_pct"]:
            reasons.append(f"현물가 {ref_label} {_fmt_pct(ref)} 하락 → 고정가 하락 선행")
            votes[4] = votes.get(4, 0) + 1.0
            votes[3] = votes.get(3, 0) + 0.5
            status = "bear" if status != "caution" else "caution"
        else:
            reasons.append(f"현물가 {ref_label} {_fmt_pct(ref)} (보합권)")
    if ref is None:
        reasons.append("변동률 계산에는 1주 이상 이력이 필요합니다 (데이터 축적 중)")
    label = product.replace("dram_", "").replace("nand_", "").upper().replace("_", " ")
    head = f"{label} 현물 ${last.value:.2f}"
    if chg_1m is not None:
        head += f" · 1M {_fmt_pct(chg_1m)}"
    elif chg_1w is not None:
        head += f" · 1W {_fmt_pct(chg_1w)}"
    if premium is not None:
        head += f" · 고정가 대비 {_fmt_pct(premium)}"
    return _base("spot_price", today, status=status, headline=head, rationale=" / ".join(reasons),
                 as_of=last.date, votes=votes,
                 freshness="manual" if "manual" in last.note else ("fresh" if _is_fresh(last.date, T["stale_days_daily"], today) else "stale"),
                 metrics={"product": product, "spot": last.value, "chg_1m": chg_1m, "chg_1w": chg_1w,
                          "contract": contract_price, "premium_pct": premium})


# ── 3. 재고 주수 ──────────────────────────────────────────────────────
def inventory_signal(store: Store, manual: dict, today: date) -> Signal:
    cust = store.load_series("customer_inventory_weeks")
    votes: dict = {}
    reasons: list[str] = []
    status = "na"
    as_of = None
    metrics: dict = {}
    normal, bear_w = T["inventory_normal_max_weeks"], T["inventory_bear_weeks"]
    if cust:
        w = cust[-1].value
        prev_w = cust[-2].value if len(cust) >= 2 else None
        as_of = cust[-1].date
        metrics["customer_weeks"] = w
        metrics["customer_weeks_prev"] = prev_w
        if prev_w is not None and prev_w >= bear_w and w < prev_w:
            status = "bull"
            reasons.append(f"고객 재고 {prev_w:g}주→{w:g}주로 감소 중 → 정상 복귀 = 반등 조건 형성")
            votes[1] = 2.0
        elif w >= bear_w:
            status = "bear"
            reasons.append(f"고객 재고 {w:g}주 (≥{bear_w}주) → 가격 하락 국면")
            votes[4] = 2.0
        elif w > normal:
            status = "caution"
            reasons.append(f"고객 재고 {w:g}주 → 정상(4~{normal}주) 상회, 주의")
            votes[3] = 1.0
        else:
            status = "bull"
            reasons.append(f"고객 재고 {w:g}주 → 정상(4~{normal}주) 범위")
            votes[2] = 1.5
        if cust[-1].note:
            reasons.append(cust[-1].note)
    # 공급사 재고일수(자동 계산) — 보조 지표
    dio_parts = []
    for company, label in (("samsung", "삼성"), ("hynix", "하이닉스"), ("micron", "마이크론")):
        pts = store.load_series(f"dio_weeks_{company}")
        if not pts:
            continue
        latest = pts[-1].value
        hist = sorted(p.value for p in pts[-9:-1])
        med = hist[len(hist) // 2] if hist else None
        dev = pct(latest, med) if med else None
        metrics[f"dio_weeks_{company}"] = latest
        metrics[f"dio_dev_{company}"] = dev
        dio_parts.append(f"{label} {latest:.1f}주" + (f"({_fmt_pct(dev, 0)} vs 8분기 중앙값)" if dev is not None else ""))
        if dev is not None and dev > T["dio_vs_median_pct"]:
            votes[4] = votes.get(4, 0) + 0.5
            votes[3] = votes.get(3, 0) + 0.5
            if status in ("na", "neutral"):
                status = "caution"
        elif dev is not None and dev < -T["dio_vs_median_pct"]:
            votes[2] = votes.get(2, 0) + 0.5
            votes[1] = votes.get(1, 0) + 0.5
            if status == "na":
                status = "bull"
        if as_of is None:  # 고객 재고 주수의 기준일이 우선
            as_of = pts[-1].date
    if dio_parts:
        reasons.append("공급사 재고일수(재무제표 기준): " + ", ".join(dio_parts))
    if status == "na":
        return _na("inventory_weeks", today,
                   "고객 재고 주수(실적 발표 코멘트)를 manual_inputs.yaml 의 inventory_weeks.customer 에 입력하세요. "
                   "DART_API_KEY 가 있으면 삼성·하이닉스 재고일수는 자동 계산됩니다.",
                   ["고객(서버·PC) 재고 주수 — 삼성·하이닉스·마이크론 컨콜 코멘트"])
    needs = [] if cust else ["고객 재고 주수 (수동)"]
    head = (f"고객 재고 {metrics['customer_weeks']:g}주" if cust else "고객 재고 미입력")
    if dio_parts:
        head += " · " + dio_parts[0]
    fresh = "manual" if cust and _is_fresh(cust[-1].date, T["stale_days_quarterly"], today) else (
        "fresh" if _is_fresh(as_of, T["stale_days_quarterly"], today) else "stale")
    return _base("inventory_weeks", today, status=status, headline=head, rationale=" / ".join(reasons),
                 as_of=as_of, votes=votes, freshness=fresh, metrics=metrics, needs_manual=needs)


# ── 4. 마이크론 실적·가이던스 ─────────────────────────────────────────
def micron_signal(store: Store, manual: dict, today: date) -> Signal:
    rev = store.load_series("micron_revenue_usd_bn")
    gm = store.load_series("micron_gross_margin_pct")
    guides = _manual_list(manual, "micron", "guidance")
    if not rev and not guides:
        return _na("micron", today,
                   "SEC EDGAR 수집 전이거나 실패했습니다. 가이던스는 manual_inputs.yaml 의 micron.guidance 에 입력하세요.",
                   ["마이크론 가이던스 (매출 중간값, GM 중간값)"])
    votes: dict = {}
    reasons: list[str] = []
    metrics: dict = {}
    status = "neutral"
    as_of = None
    if rev:
        last = rev[-1]
        as_of = last.date
        qoq = pct(last.value, rev[-2].value) if len(rev) >= 2 else None
        yoy = pct(last.value, rev[-5].value) if len(rev) >= 5 else None
        metrics.update({"revenue_usd_bn": last.value, "rev_qoq": qoq, "rev_yoy": yoy})
        gm_last = gm[-1].value if gm else None
        gm_prev = gm[-2].value if len(gm) >= 2 else None
        gm_prev2 = gm[-3].value if len(gm) >= 3 else None
        metrics.update({"gross_margin_pct": gm_last, "gm_prev": gm_prev})
        if qoq is not None and qoq > 0 and (gm_prev is None or (gm_last is not None and gm_last >= gm_prev)):
            reasons.append(f"매출 QoQ {_fmt_pct(qoq)}" + (f", GM {gm_prev:.1f}%→{gm_last:.1f}% 확대" if gm_prev is not None else "") + " → 가격·비트 출하 호조")
            votes[2] = votes.get(2, 0) + 1.5
            status = "bull"
        elif gm_last is not None and gm_prev is not None and gm_prev2 is not None and gm_last < gm_prev < gm_prev2:
            reasons.append(f"GM 2분기 연속 하락({gm_prev2:.1f}→{gm_prev:.1f}→{gm_last:.1f}%) → 가격 하락 반영")
            votes[4] = votes.get(4, 0) + 1.5
            status = "bear"
        elif qoq is not None and qoq < 0:
            reasons.append(f"매출 QoQ {_fmt_pct(qoq)} 감소" + (f", GM {gm_last:.1f}%" if gm_last is not None else ""))
            votes[3] = votes.get(3, 0) + 0.5
            votes[4] = votes.get(4, 0) + 1.0
            status = "caution"
        elif qoq is not None:
            reasons.append(f"매출 QoQ {_fmt_pct(qoq)}" + (f", GM {gm_last:.1f}% (전분기 {gm_prev:.1f}%)" if gm_prev is not None and gm_last is not None else ""))
            votes[2] = votes.get(2, 0) + 0.5
    guide_txt = ""
    if guides:
        g = guides[-1]
        g_rev = g.get("revenue_mid_usd_bn")
        g_gm = g.get("gross_margin_mid_pct")
        metrics["guidance"] = g
        as_of = max(as_of or "", str(g.get("date", "")))
        if g_rev is not None and rev:
            implied = pct(float(g_rev), rev[-1].value)
            metrics["guidance_implied_qoq"] = implied
            if implied is not None and implied > T["guidance_qoq_pct"]:
                reasons.append(f"가이던스 매출 ${float(g_rev):.2f}B = 직전比 {_fmt_pct(implied)} → 국내 대형주 실적 상향 미리보기")
                votes[2] = votes.get(2, 0) + 1.5
                status = "bull" if status != "bear" else "caution"
            elif implied is not None and implied < -T["guidance_qoq_pct"]:
                reasons.append(f"가이던스 매출 ${float(g_rev):.2f}B = 직전比 {_fmt_pct(implied)} → 실적 둔화 예고")
                votes[4] = votes.get(4, 0) + 1.5
                votes[3] = votes.get(3, 0) + 0.5
                status = "bear" if status != "bull" else "caution"
            else:
                reasons.append(f"가이던스 매출 ${float(g_rev):.2f}B = 직전比 {_fmt_pct(implied)} (보합) → 모멘텀 정체")
                votes[3] = votes.get(3, 0) + 0.5
                if status == "bull":
                    status = "caution"
        if g_gm is not None and gm:
            d = float(g_gm) - gm[-1].value
            reasons.append(f"GM 가이던스 {float(g_gm):.1f}% ({d:+.1f}%p vs 직전)")
            if d > 1:
                votes[2] = votes.get(2, 0) + 0.5
            elif d < -1:
                votes[4] = votes.get(4, 0) + 0.5
        guide_txt = f" · 가이던스 ${float(g_rev):.1f}B" if g_rev is not None else ""
        if g.get("note"):
            reasons.append(str(g["note"]))
    head = (f"매출 ${rev[-1].value:.2f}B (QoQ {_fmt_pct(metrics.get('rev_qoq'))})" if rev else "실적 미수집") + guide_txt
    needs = [] if guides and _is_fresh(str(guides[-1].get("date", "")), T["stale_days_quarterly"], today) else ["최신 가이던스 (분기 실적 발표 후)"]
    fresh = "fresh" if _is_fresh(as_of, T["stale_days_quarterly"], today) else "stale"
    return _base("micron", today, status=status, headline=head, rationale=" / ".join(reasons) or "판정 근거 부족",
                 as_of=as_of, votes=votes, freshness=fresh, metrics=metrics, needs_manual=needs)


# ── 5. 엔비디아 실적·CoWoS 캐파 (+TSMC 월매출) ────────────────────────
def _growth_pattern(values: list[float]) -> tuple[Optional[float], Optional[float], Optional[float]]:
    """최근 3개 성장률 (g0 오래된 것 … g2 최신)."""
    g = [pct(values[i], values[i - 1]) for i in range(1, len(values))]
    g = [x for x in g if x is not None]
    while len(g) < 3:
        g.insert(0, None)
    return g[-3], g[-2], g[-1]


def nvidia_tsmc_signal(store: Store, manual: dict, today: date) -> Signal:
    dc = store.load_series("nvidia_dc_revenue_usd_bn")
    total = store.load_series("nvidia_revenue_usd_bn")
    tsmc = store.load_series("tsmc_monthly_revenue_ntd_bn")
    tsmc_yoy = store.load_series("tsmc_monthly_yoy_pct")
    cowos = _manual_list(manual, "nvidia", "cowos_capacity")
    if not dc and not total and not tsmc:
        return _na("nvidia_tsmc", today,
                   "EDGAR(엔비디아)·MOPS(TSMC) 수집 전입니다. 데이터센터 매출은 manual_inputs.yaml 의 nvidia.data_center_revenue_usd_bn 에 입력하세요.",
                   ["엔비디아 데이터센터 매출 (분기)", "CoWoS 캐파 코멘트"])
    votes: dict = {}
    reasons: list[str] = []
    metrics: dict = {}
    status = "neutral"
    as_of = None
    series, label, weight = (dc, "데이터센터 매출", 1.0) if len(dc) >= 2 else (total, "총매출", 0.6)
    if len(series) >= 2:
        g0, g1, g2 = _growth_pattern([p.value for p in series[-4:]])
        as_of = series[-1].date
        metrics.update({"nvidia_series": label, "nvidia_latest_usd_bn": series[-1].value, "nvidia_qoq": g2, "nvidia_qoq_prev": g1})
        if g2 is not None and g2 < 0:
            reasons.append(f"엔비디아 {label} QoQ {_fmt_pct(g2)} 감소 → HBM 수요 원천 약화")
            votes[4] = votes.get(4, 0) + 1.5 * weight
            status = "bear"
        elif g1 is not None and g0 is not None and g2 is not None and g2 < g1 < g0:
            reasons.append(f"엔비디아 {label} 성장률 2분기 연속 둔화({_fmt_pct(g0)}→{_fmt_pct(g1)}→{_fmt_pct(g2)}) → HBM 밸류체인 고점 신호")
            votes[3] = votes.get(3, 0) + 2.0 * weight
            status = "caution"
        elif g1 is not None and g2 is not None and g2 < g1:
            reasons.append(f"엔비디아 {label} 성장률 둔화 조짐({_fmt_pct(g1)}→{_fmt_pct(g2)}) → 다음 분기 재확인")
            votes[3] = votes.get(3, 0) + 1.0 * weight
            votes[2] = votes.get(2, 0) + 0.5 * weight
            status = "caution"
        elif g2 is not None:
            reasons.append(f"엔비디아 {label} QoQ {_fmt_pct(g2)} 성장 유지·가속 → HBM 수요 견조")
            votes[2] = votes.get(2, 0) + 1.5 * weight
            status = "bull"
    if tsmc:
        y = tsmc_yoy[-1].value if tsmc_yoy else None
        metrics.update({"tsmc_month": tsmc[-1].date[:7], "tsmc_revenue_ntd_bn": tsmc[-1].value, "tsmc_yoy": y})
        as_of = as_of or tsmc[-1].date
        if y is not None:
            if y > T["tsmc_strong_yoy_pct"]:
                reasons.append(f"TSMC {tsmc[-1].date[:7]} 매출 YoY {_fmt_pct(y)} → 선단 공정·CoWoS 수요 강세")
                votes[2] = votes.get(2, 0) + 0.5
            elif y < 0:
                reasons.append(f"TSMC 월매출 YoY {_fmt_pct(y)} 감소")
                votes[4] = votes.get(4, 0) + 1.0
                if status == "neutral":
                    status = "bear"
            else:
                reasons.append(f"TSMC 월매출 YoY {_fmt_pct(y)}")
            if len(tsmc_yoy) >= 3 and tsmc_yoy[-1].value < tsmc_yoy[-2].value < tsmc_yoy[-3].value:
                reasons.append("TSMC YoY 성장률 3개월 연속 둔화")
                votes[3] = votes.get(3, 0) + 0.5
    if cowos:
        c = cowos[-1]
        metrics["cowos_note"] = c.get("note")
        reasons.append(f"CoWoS: {c.get('note')} ({c.get('date')})")
    head_parts = []
    if "nvidia_latest_usd_bn" in metrics:
        head_parts.append(f"NVDA {metrics['nvidia_series']} ${metrics['nvidia_latest_usd_bn']:.1f}B (QoQ {_fmt_pct(metrics['nvidia_qoq'])})")
    if "tsmc_yoy" in metrics:
        head_parts.append(f"TSMC {metrics['tsmc_month']} YoY {_fmt_pct(metrics['tsmc_yoy'])}")
    needs = []
    if not dc:
        needs.append("엔비디아 데이터센터 매출 (분기, 수동)")
    if not cowos:
        needs.append("CoWoS 캐파 코멘트 (TrendForce/TSMC)")
    return _base("nvidia_tsmc", today, status=status, headline=" · ".join(head_parts) or "데이터 일부", rationale=" / ".join(reasons),
                 as_of=as_of, votes=votes, freshness="fresh" if _is_fresh(as_of, T["stale_days_quarterly"], today) else "stale",
                 metrics=metrics, needs_manual=needs)


# ── 6. CAPEX 가이던스 ─────────────────────────────────────────────────
def _yoy_quarter(pts: list[Point]) -> Optional[float]:
    if not pts:
        return None
    last = pts[-1]
    target = date.fromisoformat(last.date) - timedelta(days=365)
    best, best_gap = None, 999
    for p in pts[:-1]:
        gap = abs((date.fromisoformat(p.date) - target).days)
        if gap < best_gap:
            best, best_gap = p, gap
    if best is None or best_gap > 20:
        return None
    return pct(last.value, best.value)


def capex_signal(store: Store, manual: dict, today: date, late_cycle: bool = False) -> Signal:
    companies = (("samsung", "삼성전자", "capex_samsung_krw_tn", "조원"),
                 ("hynix", "SK하이닉스", "capex_hynix_krw_tn", "조원"),
                 ("micron", "마이크론", "micron_capex_usd_bn", "B$"))
    votes: dict = {}
    reasons: list[str] = []
    metrics: dict = {}
    status = "na"
    as_of = None
    directions = []
    for cid, name, skey, unit in companies:
        entries = _manual_list(manual, "capex", cid)
        if entries:
            e = entries[-1]
            d = str(e.get("direction", "")).strip()
            directions.append((name, d, e))
            as_of = max(as_of or "", str(e.get("date", "")))
        pts = store.load_series(skey)
        if pts:
            yoy = _yoy_quarter(pts)
            metrics[f"{cid}_capex_latest"] = pts[-1].value
            metrics[f"{cid}_capex_yoy"] = yoy
            metrics[f"{cid}_capex_unit"] = unit
            as_of = max(as_of or "", pts[-1].date)
            if yoy is not None and yoy > T["capex_yoy_surge_pct"]:
                reasons.append(f"{name} 분기 CAPEX {pts[-1].value:.1f}{unit} (YoY {_fmt_pct(yoy)}) 급증")
                votes[3] = votes.get(3, 0) + 0.5
            elif yoy is not None and yoy < T["capex_yoy_cut_pct"]:
                reasons.append(f"{name} 분기 CAPEX {pts[-1].value:.1f}{unit} (YoY {_fmt_pct(yoy)}) 축소")
                votes[1] = votes.get(1, 0) + 0.5
            else:
                reasons.append(f"{name} 분기 CAPEX {pts[-1].value:.1f}{unit}" + (f" (YoY {_fmt_pct(yoy)})" if yoy is not None else ""))
    ups = [n for n, d, _ in directions if d.startswith("증")]
    downs = [n for n, d, _ in directions if d.startswith("감") or d.startswith("축")]
    if ups:
        if late_cycle:
            status = "caution"
            reasons.insert(0, f"{', '.join(ups)} CAPEX 증액 가이던스 + 사이클 후반 신호 → 과잉의 씨앗(국면 ②→③)")
            votes[3] = votes.get(3, 0) + 2.0
        else:
            status = "bull"
            reasons.insert(0, f"{', '.join(ups)} CAPEX 증액 가이던스 → 장비주 호재 (국면 ②)")
            votes[2] = votes.get(2, 0) + 1.5
    if downs:
        reasons.insert(0, f"{', '.join(downs)} CAPEX 감액 → 공급 조절, 장비주엔 역풍이나 다음 사이클 바닥 형성")
        votes[4] = votes.get(4, 0) + 1.0
        votes[1] = votes.get(1, 0) + 1.0
        status = "caution" if status == "na" else status
    if directions and not ups and not downs:
        reasons.insert(0, "CAPEX 가이던스 유지")
        votes[2] = votes.get(2, 0) + 0.5
        status = "neutral" if status == "na" else status
    for n, d, e in directions:
        if e.get("note"):
            reasons.append(f"{n}: {e['note']}")
    if status == "na" and metrics:
        status = "neutral"
    if status == "na":
        return _na("capex", today,
                   "CAPEX 가이던스 방향(증액/유지/감액)을 manual_inputs.yaml 의 capex 에 입력하세요. "
                   "실제 집행액은 DART_API_KEY 가 있으면 자동 수집됩니다.",
                   ["삼성·하이닉스·마이크론 CAPEX 가이던스 방향"])
    head = ", ".join(f"{n} {d}" for n, d, _ in directions) or "가이던스 미입력"
    needs = [] if directions else ["CAPEX 가이던스 방향 (수동)"]
    return _base("capex", today, status=status, headline=head, rationale=" / ".join(reasons),
                 as_of=as_of or None, votes=votes,
                 freshness="manual" if directions else ("fresh" if _is_fresh(as_of, T["stale_days_quarterly"], today) else "stale"),
                 metrics={**metrics, "late_cycle": late_cycle}, needs_manual=needs)


# ── 7. 장비 수주 공시 ─────────────────────────────────────────────────
def equipment_orders_signal(store: Store, manual: dict, today: date, dart_available: bool = True) -> Signal:
    recs = store.load_records("equipment_orders")
    if not recs:
        why = ("DART_API_KEY 가 없어 공시를 수집하지 못했습니다." if not dart_available
               else "최근 수집된 단일판매·공급계약 공시가 없습니다 (수집 전이거나 공시 없음).")
        sig = _na("equipment_orders", today, why)
        if not dart_available:
            sig.needs_manual = ["DART_API_KEY 설정"]
        return sig

    def _d(r):
        s = str(r.get("rcept_dt", ""))
        return date(int(s[:4]), int(s[4:6]), int(s[6:8])) if len(s) == 8 else None

    recent = [r for r in recs if _d(r) and (today - _d(r)).days <= 90]
    prior = [r for r in recs if _d(r) and 90 < (today - _d(r)).days <= 180]
    n_recent, n_prior = len(recent), len(prior)
    amt = sum((r.get("amount_krw") or 0) for r in recent) / 1e8
    votes: dict = {}
    if n_recent >= 3 and n_recent > n_prior * 1.5:
        status, why = "bull", f"최근 90일 공시 {n_recent}건 (직전 90일 {n_prior}건) → 수주 증가, 장비주 실적 확정 신호"
        votes[2] = 1.0
    elif n_prior >= 3 and n_recent < n_prior * 0.5:
        status, why = "bear", f"최근 90일 공시 {n_recent}건 (직전 90일 {n_prior}건) → 수주 둔화"
        votes[4] = 1.0
    else:
        status, why = "neutral", f"최근 90일 공시 {n_recent}건 (직전 90일 {n_prior}건)"
    why += " / 주가는 대개 발표 전에 반영 → 공시일 차익실현 흔함 (동행~후행)"
    latest = recs[0] if recs else None
    head = f"90일 {n_recent}건" + (f" · 합계 {amt:,.0f}억원" if amt else "")
    if latest:
        head += f" · 최근: {latest.get('corp_name')} ({str(latest.get('rcept_dt'))[:8]})"
    as_of = f"{str(latest['rcept_dt'])[:4]}-{str(latest['rcept_dt'])[4:6]}-{str(latest['rcept_dt'])[6:8]}" if latest else None
    return _base("equipment_orders", today, status=status, headline=head, rationale=why, as_of=as_of, votes=votes,
                 freshness="fresh", metrics={"n_recent_90d": n_recent, "n_prior_90d": n_prior, "amount_recent_krw_bn": amt,
                                             "recent": recent[:10]})


# ── 8. 외국인 순매수 ──────────────────────────────────────────────────
def foreign_flow_signal(store: Store, manual: dict, today: date) -> Signal:
    window = T["foreign_window_days"]
    per: dict[str, dict] = {}
    for code, name in KR_STOCKS.items():
        pts = store.load_series(f"foreign_net_{code}")
        if len(pts) < 5:
            continue
        vals = store.load_series(f"foreign_net_value_{code}")
        cum = sum(p.value for p in pts[-window:])
        prev = sum(p.value for p in pts[-2 * window:-window]) if len(pts) >= window + 5 else None
        cum_val = sum(p.value for p in vals[-window:]) if vals else None
        per[code] = {"name": name, "cum20_shares": cum, "prev20_shares": prev, "cum20_value_krw_bn": cum_val,
                     "days": min(len(pts), window), "as_of": pts[-1].date}
    if not per:
        return _na("foreign_flow", today, "외국인 순매매 일별 데이터가 5일 이상 필요합니다 (네이버 금융 수집).")
    votes: dict = {}
    reasons: list[str] = []
    statuses = []
    for code, m in per.items():
        v_txt = f" ({m['cum20_value_krw_bn']:+,.0f}억원)" if m["cum20_value_krw_bn"] is not None else ""
        if m["cum20_shares"] > 0:
            statuses.append("bull")
            reasons.append(f"{m['name']} {m['days']}일 누적 순매수 {m['cum20_shares']:+,.0f}주{v_txt}")
        elif m["prev20_shares"] is not None and m["prev20_shares"] > 0:
            statuses.append("caution")
            reasons.append(f"{m['name']} {m['days']}일 누적 순매도 전환 {m['cum20_shares']:+,.0f}주{v_txt} → 경계 신호")
        else:
            statuses.append("bear")
            reasons.append(f"{m['name']} {m['days']}일 누적 순매도 지속 {m['cum20_shares']:+,.0f}주{v_txt}")
    if "caution" in statuses:
        status = "caution"
        votes[3] = 1.5
    elif all(s == "bear" for s in statuses):
        status = "bear"
        votes[4] = 1.5
    elif all(s == "bull" for s in statuses):
        status = "bull"
        votes[2] = 1.0
        votes[1] = 0.5
    else:
        status = "neutral"
        votes[2] = 0.5
        votes[4] = 0.5
    as_of = max(m["as_of"] for m in per.values())
    head = " · ".join(f"{m['name']} 20일 {m['cum20_shares']:+,.0f}주" for m in per.values())
    return _base("foreign_flow", today, status=status, headline=head, rationale=" / ".join(reasons), as_of=as_of,
                 votes=votes, freshness="fresh" if _is_fresh(as_of, T["stale_days_daily"], today) else "stale", metrics=per)


# ── 9. 원/달러 환율 ───────────────────────────────────────────────────
def usdkrw_signal(store: Store, manual: dict, today: date, foreign: Optional[Signal] = None) -> Signal:
    pts = store.load_series("usdkrw")
    if len(pts) < 2:
        return _na("usdkrw", today, "환율 일별 데이터가 필요합니다 (Frankfurter/네이버 수집).")
    window = T["fx_window_days"]
    last = pts[-1]
    base = pts[-window - 1] if len(pts) > window else pts[0]
    chg = pct(last.value, base.value)
    f_status = foreign.status if foreign else "na"
    votes: dict = {}
    thr = T["fx_change_pct"]
    if chg is not None and chg > thr:
        if f_status in ("caution", "bear"):
            status, why = "bear", f"원화 약세({_fmt_pct(chg)}, {window}일) + 외국인 이탈 겹침 → 주가에 마이너스"
            votes[4] = 1.0
            votes[3] = 0.5
        else:
            status, why = "neutral", f"원화 약세({_fmt_pct(chg)}, {window}일) → 수출 이익엔 플러스, 외국인 수급은 아직 우호"
            votes[2] = 0.5
    elif chg is not None and chg < -thr:
        if f_status == "bull":
            status, why = "bull", f"원화 강세({_fmt_pct(chg)}, {window}일) + 외국인 순매수 → 외국인 자금 유입 국면"
            votes[2] = 1.0
            votes[1] = 0.5
        else:
            status, why = "neutral", f"원화 강세({_fmt_pct(chg)}, {window}일) → 수출 이익엔 부담, 수급 확인 필요"
    else:
        status, why = "neutral", f"환율 {window}일 변동 {_fmt_pct(chg)} → 중립"
    return _base("usdkrw", today, status=status, headline=f"USD/KRW {last.value:,.1f} · {window}일 {_fmt_pct(chg)}",
                 rationale=why, as_of=last.date, votes=votes,
                 freshness="fresh" if _is_fresh(last.date, T["stale_days_daily"], today) else "stale",
                 metrics={"rate": last.value, "chg_window_pct": chg, "foreign_status": f_status})


# ── 10. P/B ───────────────────────────────────────────────────────────
def pbr_signal(store: Store, manual: dict, today: date) -> Signal:
    vals: dict[str, tuple[float, str]] = {}
    for code, name in KR_STOCKS.items():
        pts = store.load_series(f"pbr_{code}")
        if pts:
            vals[name] = (pts[-1].value, pts[-1].date)
    if not vals:
        return _na("pbr", today, "PBR 데이터가 없습니다 (네이버 금융 수집 또는 manual_inputs.yaml 의 pbr).", ["삼성전자·하이닉스 P/B"])
    votes: dict = {}
    reasons: list[str] = []
    statuses = []
    for name, (v, d) in vals.items():
        if v <= T["pbr_low"]:
            statuses.append("bull")
            reasons.append(f"{name} P/B {v:.2f}배 → 과거 사이클 저점(1.0~1.2) 구간")
            votes[1] = votes.get(1, 0) + 0.5
        elif v >= T["pbr_high"]:
            statuses.append("caution")
            reasons.append(f"{name} P/B {v:.2f}배 → 과거 고점(2.0~2.5) 구간")
            votes[3] = votes.get(3, 0) + 0.5
        else:
            statuses.append("neutral")
            reasons.append(f"{name} P/B {v:.2f}배 → 과거 범위 중간")
    status = "caution" if "caution" in statuses else ("bull" if statuses and all(s == "bull" for s in statuses) else "neutral")
    reasons.append("2025~26년은 과거 범위를 크게 벗어나 참고치로만 사용")
    as_of = max(d for _, d in vals.values())
    return _base("pbr", today, status=status, headline=" · ".join(f"{n} {v:.2f}배" for n, (v, _) in vals.items()),
                 rationale=" / ".join(reasons), as_of=as_of, votes=votes,
                 freshness="fresh" if _is_fresh(as_of, T["stale_days_daily"], today) else "stale",
                 metrics={n: v for n, (v, _) in vals.items()})


# ── 전체 ──────────────────────────────────────────────────────────────
def compute_all(store: Store, manual: dict, today: Optional[date] = None, dart_available: bool = True) -> list[Signal]:
    today = today or date.today()
    contract = contract_price_signal(store, manual, today)
    spot = spot_price_signal(store, manual, today, contract)
    inventory = inventory_signal(store, manual, today)
    micron = micron_signal(store, manual, today)
    nvidia = nvidia_tsmc_signal(store, manual, today)
    late_cycle = contract.status == "caution" or spot.status == "caution" or nvidia.status == "caution"
    capex = capex_signal(store, manual, today, late_cycle=late_cycle)
    equipment = equipment_orders_signal(store, manual, today, dart_available=dart_available)
    foreign = foreign_flow_signal(store, manual, today)
    fx = usdkrw_signal(store, manual, today, foreign)
    pbr = pbr_signal(store, manual, today)
    return [contract, spot, inventory, micron, nvidia, capex, equipment, foreign, fx, pbr]
