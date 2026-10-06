"""판정 규칙·국면 합산·캘린더·저장소·파이프라인(오프라인, 수집기 모킹) 테스트."""
from datetime import date, timedelta

import pytest

from semi_tracker import calendar as cal
from semi_tracker import signals as sg
from semi_tracker.models import Point
from semi_tracker.phase import assess, diff_snapshots
from semi_tracker.run import Pipeline
from semi_tracker.store import Store

TODAY = date(2025, 10, 2)


@pytest.fixture
def store(tmp_path):
    return Store(str(tmp_path / "data"))


def _monthly(store, key, values, last_month=(2025, 9), note=""):
    y, m = last_month
    pts = []
    for v in reversed(values):
        pts.append(Point(f"{y:04d}-{m:02d}-01", v, note))
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    store.upsert_points(key, list(reversed(pts)))


def _daily(store, key, values, end=TODAY, note=""):
    pts = []
    d = end
    for v in reversed(values):
        pts.append(Point(d.isoformat(), v, note))
        d -= timedelta(days=1)
    store.upsert_points(key, list(reversed(pts)))


# ── 1. 고정가 ─────────────────────────────────────────────────────────
def test_contract_turns_up_is_bull(store):
    _monthly(store, "contract_dram_ddr4_8gb", [2.00, 1.95, 2.05])  # -2.5% → +5.1% 상승 전환
    s = sg.contract_price_signal(store, {}, TODAY)
    assert s.status == "bull" and s.votes == {1: 1.0, 2: 2.0}
    assert "상승 전환" in s.rationale and s.freshness == "fresh"


def test_contract_deceleration_is_caution(store):
    _monthly(store, "contract_dram_ddr4_8gb", [2.00, 2.20, 2.24])  # +10% → +1.8%
    s = sg.contract_price_signal(store, {}, TODAY)
    assert s.status == "caution" and s.votes == {3: 2.0}
    assert "둔화" in s.rationale


def test_contract_accelerating_decline_is_bear_and_narrowing_is_neutral(store):
    _monthly(store, "contract_dram_ddr4_8gb", [2.00, 1.90, 1.75])
    assert sg.contract_price_signal(store, {}, TODAY).status == "bear"
    _monthly(store, "contract_dram_ddr4_8gb", [2.00, 1.80, 1.78])
    s = sg.contract_price_signal(store, {}, TODAY)
    assert s.status == "neutral" and s.votes[1] == 1.5


def test_contract_needs_two_months(store):
    _monthly(store, "contract_dram_ddr4_8gb", [2.00])
    s = sg.contract_price_signal(store, {}, TODAY)
    assert s.status == "na" and s.needs_manual


# ── 2. 현물가 ─────────────────────────────────────────────────────────
def test_spot_below_contract_is_caution(store):
    _daily(store, "spot_dram_ddr4_8gb", [2.0] * 35)
    _monthly(store, "contract_dram_ddr4_8gb", [2.10, 2.20])
    s = sg.spot_price_signal(store, {}, TODAY)
    assert s.status == "caution" and s.votes == {3: 1.0, 4: 1.0}
    assert s.metrics["premium_pct"] < -5


def test_spot_rising_is_bull(store):
    _daily(store, "spot_dram_ddr4_8gb", [1.80] * 30 + [1.95] * 5)
    s = sg.spot_price_signal(store, {}, TODAY)
    assert s.status == "bull" and s.metrics["chg_1m"] > 3
    assert s.votes == {1: 1.0, 2: 1.0}


# ── 3. 재고 ───────────────────────────────────────────────────────────
def test_inventory_thresholds(store):
    store.upsert_points("customer_inventory_weeks", [Point("2025-07-24", 12, "컨콜")])
    assert sg.inventory_signal(store, {}, TODAY).status == "bear"
    store.upsert_points("customer_inventory_weeks", [Point("2025-07-24", 12), Point("2025-09-25", 8)])
    s = sg.inventory_signal(store, {}, TODAY)
    assert s.status == "bull" and s.votes == {1: 2.0}  # 정상 복귀 중
    store.upsert_points("customer_inventory_weeks", [Point("2025-09-26", 5)])
    assert sg.inventory_signal(store, {}, TODAY).status == "bull"
    store.upsert_points("customer_inventory_weeks", [Point("2025-09-27", 8)])
    assert sg.inventory_signal(store, {}, TODAY).status == "caution"


def test_inventory_supplier_dio_only(store):
    pts = [Point(f"202{3 + i // 4}-{(i % 4) * 3 + 3:02d}-28", 15.0, "dart") for i in range(8)] + [Point("2025-09-30", 20.0, "dart")]
    store.upsert_points("dio_weeks_hynix", pts)
    s = sg.inventory_signal(store, {}, TODAY)
    assert s.status == "caution" and s.metrics["dio_dev_hynix"] > 15
    assert "고객 재고 주수 (수동)" in s.needs_manual


# ── 4. 마이크론 ───────────────────────────────────────────────────────
def test_micron_bull_and_guidance(store):
    store.upsert_points("micron_revenue_usd_bn", [Point("2025-02-27", 8.05), Point("2025-05-29", 9.30), Point("2025-08-28", 11.32)])
    store.upsert_points("micron_gross_margin_pct", [Point("2025-02-27", 37.9), Point("2025-05-29", 39.0), Point("2025-08-28", 45.7)])
    manual = {"micron": {"guidance": [{"date": "2025-09-23", "revenue_mid_usd_bn": 12.5, "gross_margin_mid_pct": 51.5}]}}
    s = sg.micron_signal(store, manual, TODAY)
    assert s.status == "bull" and s.votes[2] == 3.5
    assert s.metrics["guidance_implied_qoq"] > 5 and not s.needs_manual


def test_micron_weak_guidance_turns_caution(store):
    store.upsert_points("micron_revenue_usd_bn", [Point("2025-05-29", 9.30), Point("2025-08-28", 11.32)])
    manual = {"micron": {"guidance": [{"date": "2025-09-23", "revenue_mid_usd_bn": 10.0}]}}
    s = sg.micron_signal(store, manual, TODAY)
    assert s.status == "caution" and s.votes[4] == 1.5


# ── 5. 엔비디아·TSMC ──────────────────────────────────────────────────
def test_nvidia_two_quarter_deceleration_is_caution(store):
    store.upsert_points("nvidia_dc_revenue_usd_bn", [Point("2024-10-27", 30.8), Point("2025-01-26", 35.6), Point("2025-04-27", 39.1), Point("2025-07-27", 41.1)])
    s = sg.nvidia_tsmc_signal(store, {}, TODAY)
    assert s.status == "caution" and s.votes[3] == 2.0
    assert "2분기 연속 둔화" in s.rationale


def test_nvidia_fallback_total_and_tsmc(store):
    store.upsert_points("nvidia_revenue_usd_bn", [Point("2025-04-27", 44.1), Point("2025-07-27", 46.7)])
    store.upsert_points("tsmc_monthly_revenue_ntd_bn", [Point("2025-08-01", 335.8), Point("2025-09-01", 331.0)])
    store.upsert_points("tsmc_monthly_yoy_pct", [Point("2025-08-01", 33.8), Point("2025-09-01", 31.4)])
    s = sg.nvidia_tsmc_signal(store, {}, TODAY)
    assert s.status == "bull" and s.metrics["nvidia_series"] == "총매출"
    assert s.votes[2] == pytest.approx(1.5 * 0.6 + 0.5)
    assert "엔비디아 데이터센터 매출 (분기, 수동)" in s.needs_manual


# ── 6. CAPEX ──────────────────────────────────────────────────────────
def test_capex_increase_depends_on_cycle_stage(store):
    manual = {"capex": {"hynix": [{"date": "2025-07-24", "direction": "증액", "note": "M15X"}]}}
    early = sg.capex_signal(store, manual, TODAY, late_cycle=False)
    late = sg.capex_signal(store, manual, TODAY, late_cycle=True)
    assert early.status == "bull" and early.votes == {2: 1.5}
    assert late.status == "caution" and late.votes == {3: 2.0}
    assert "과잉의 씨앗" in late.rationale


def test_capex_actual_yoy(store):
    store.upsert_points("capex_samsung_krw_tn", [Point("2024-09-30", 10.0), Point("2025-09-30", 14.0)])
    s = sg.capex_signal(store, {}, TODAY)
    assert s.status == "neutral" and s.metrics["samsung_capex_yoy"] == pytest.approx(40.0)
    assert s.votes == {3: 0.5}


# ── 7. 장비 수주 ──────────────────────────────────────────────────────
def test_equipment_orders_counts(store):
    recs = [{"rcept_no": f"r{i}", "rcept_dt": (TODAY - timedelta(days=d)).strftime("%Y%m%d"), "corp_name": "한미반도체", "amount_krw": 1e10}
            for i, d in enumerate([3, 10, 30, 60, 120])]
    store.upsert_records("equipment_orders", recs, key="rcept_no", sort_key="rcept_dt")
    s = sg.equipment_orders_signal(store, {}, TODAY)
    assert s.status == "bull" and s.metrics["n_recent_90d"] == 4 and s.metrics["n_prior_90d"] == 1
    assert s.metrics["amount_recent_krw_bn"] == pytest.approx(400.0)
    assert sg.equipment_orders_signal(Store(str(store.root) + "_empty"), {}, TODAY, dart_available=False).needs_manual == ["DART_API_KEY 설정"]


# ── 8~10. 외국인·환율·P/B ─────────────────────────────────────────────
def test_foreign_flow_flip_is_caution(store):
    _daily(store, "foreign_net_005930", [100] * 20 + [-50] * 20)
    _daily(store, "foreign_net_000660", [10] * 40)
    s = sg.foreign_flow_signal(store, {}, TODAY)
    assert s.status == "caution" and s.votes == {3: 1.5}
    assert "순매도 전환" in s.rationale


def test_foreign_flow_both_buying_is_bull(store):
    _daily(store, "foreign_net_005930", [100] * 25)
    _daily(store, "foreign_net_000660", [10] * 25)
    _daily(store, "foreign_net_value_005930", [8.0] * 25)
    s = sg.foreign_flow_signal(store, {}, TODAY)
    assert s.status == "bull" and s.metrics["005930"]["cum20_value_krw_bn"] == pytest.approx(160.0)


def test_usdkrw_with_foreign_context(store):
    _daily(store, "usdkrw", [1350.0] * 21 + [1400.0] * 5)
    bear = sg.usdkrw_signal(store, {}, TODAY, foreign=sg.Signal("foreign_flow", "x", "bear", "", "", ""))
    neutral = sg.usdkrw_signal(store, {}, TODAY, foreign=sg.Signal("foreign_flow", "x", "bull", "", "", ""))
    assert bear.status == "bear" and "겹침" in bear.rationale
    assert neutral.status == "neutral"
    _daily(store, "usdkrw", [1400.0] * 21 + [1350.0] * 5)
    assert sg.usdkrw_signal(store, {}, TODAY, foreign=sg.Signal("foreign_flow", "x", "bull", "", "", "")).status == "bull"


def test_pbr_bands(store):
    _daily(store, "pbr_005930", [1.1], note="naver")
    _daily(store, "pbr_000660", [1.15])
    assert sg.pbr_signal(store, {}, TODAY).status == "bull"
    _daily(store, "pbr_000660", [2.3])
    s = sg.pbr_signal(store, {}, TODAY)
    assert s.status == "caution" and s.votes == {1: 0.5, 3: 0.5}
    assert "참고치" in s.rationale


# ── 국면 합산 ─────────────────────────────────────────────────────────
def test_phase_assessment_and_diff(store):
    _monthly(store, "contract_dram_ddr4_8gb", [2.00, 1.95, 2.05])
    _daily(store, "spot_dram_ddr4_8gb", [1.80] * 30 + [2.20] * 5)
    store.upsert_points("customer_inventory_weeks", [Point("2025-09-25", 5)])
    _daily(store, "foreign_net_005930", [100] * 25)
    _daily(store, "foreign_net_000660", [10] * 25)
    sigs = sg.compute_all(store, {}, TODAY)
    ph = assess(sigs)
    assert ph.phase == 2 and ph.coverage == 4
    assert ph.drivers[0]["key"] == "contract_price"
    assert 0 < ph.confidence <= 1
    snap = {"phase": ph.to_dict(), "signals": [s.to_dict() for s in sigs]}
    assert diff_snapshots(None, snap) == ["첫 실행"]
    prev = {"phase": {"label": "④ 하강·침체"}, "signals": [{**s.to_dict(), "status": "na", "status_label": "⚫"} for s in sigs]}
    changes = diff_snapshots(prev, snap)
    assert changes[0].startswith("국면: ④ 하강·침체 → ② 상승·확장")
    assert any("DRAM·NAND 고정거래가격" in c for c in changes)


def test_phase_withholds_with_little_data(store):
    ph = assess(sg.compute_all(store, {}, TODAY))
    assert ph.phase is None and "판단 보류" in ph.label


# ── 캘린더·저장소 ─────────────────────────────────────────────────────
def test_calendar():
    assert cal.last_business_day(2025, 11) == date(2025, 11, 28)   # 11/30 일요일
    assert cal.next_business_day(date(2025, 10, 3)) == date(2025, 10, 6)
    ev = cal.events(date(2025, 10, 2))
    by_key = {}
    for e in ev:
        by_key.setdefault(e["key"], e)
    assert by_key["contract_price"]["date"] == "2025-10-31"
    assert by_key["micron"]["date"] == "2025-12-25"
    assert by_key["nvidia_tsmc"]["date"] == "2025-10-10"
    assert by_key["capex"]["date"] == "2025-10-07"
    assert cal.next_release("contract_price", date(2025, 10, 31)).startswith("2025-10-31 (예상)")
    assert cal.next_release("contract_price", date(2025, 11, 1)).startswith("2025-11-28")


def test_store_upsert_and_records(store):
    assert store.upsert_points("x", [Point("2025-01-01", 1), Point("2025-01-02", 2)]) == 2
    assert store.upsert_points("x", [Point("2025-01-02", 3)]) == 0
    assert [p.value for p in store.load_series("x")] == [1, 3]
    assert store.upsert_records("r", [{"id": "a", "v": 1}, {"id": "b", "v": 2}], key="id", sort_key="id") == 2
    assert store.upsert_records("r", [{"id": "a", "v": 9, "w": 1}], key="id") == 0
    assert {r["id"]: r for r in store.load_records("r")}["a"] == {"id": "a", "v": 9, "w": 1}
    assert store.load_manual() == {}


# ── 파이프라인 (수집기 모킹) ──────────────────────────────────────────
def test_pipeline_with_mocked_fetchers(tmp_path, monkeypatch, fixture_text):
    from semi_tracker import config
    from semi_tracker.fetchers import dramexchange, edgar, fx, mops, naver

    monkeypatch.setattr(config, "DART_API_KEY", "")
    monkeypatch.setattr(dramexchange, "fetch_prices", lambda session, today: dramexchange.parse_price_tables(fixture_text("dramexchange_home.html"), today))
    monkeypatch.setattr(dramexchange, "fetch_news", lambda session: dramexchange.parse_news(fixture_text("trendforce_news.html")))
    monkeypatch.setattr(fx, "fetch_usdkrw", lambda session, days, today: ("frankfurter", [{"date": (today - timedelta(days=i)).isoformat(), "rate": 1400 - i} for i in range(30, -1, -1)]))
    monkeypatch.setattr(naver, "fetch_foreign_flows", lambda session, code, pages: naver.parse_foreign_table(fixture_text("naver_frgn.html")))
    monkeypatch.setattr(naver, "fetch_main", lambda session, code: naver.parse_main(fixture_text("naver_main.html")))
    monkeypatch.setattr(mops, "fetch_recent", lambda session, months, today: [{"date": "2025-09-01", "revenue": 330979760.0, "yoy_pct": 31.41}])

    def fake_concept(self, cik, tag, unit="USD"):
        if tag in ("RevenueFromContractWithCustomerExcludingAssessedTax", "GrossProfit", "CostOfGoodsAndServicesSold", "PaymentsToAcquirePropertyPlantAndEquipment"):
            scale = {"RevenueFromContractWithCustomerExcludingAssessedTax": 1e9, "GrossProfit": 4e8, "CostOfGoodsAndServicesSold": 6e8, "PaymentsToAcquirePropertyPlantAndEquipment": 2e8}[tag]
            return [{"start": "2025-03-01", "end": "2025-05-29", "val": 9 * scale, "form": "10-Q", "filed": "2025-06-20"},
                    {"start": "2025-05-30", "end": "2025-08-28", "val": 11 * scale, "form": "10-Q", "filed": "2025-09-20"}]
        if tag == "InventoryNet":
            return [{"end": "2025-05-29", "val": 8e9, "form": "10-Q", "filed": "2025-06-20"},
                    {"end": "2025-08-28", "val": 9e9, "form": "10-Q", "filed": "2025-09-20"}]
        raise RuntimeError("404")

    monkeypatch.setattr(edgar.EdgarClient, "concept", fake_concept)

    p = Pipeline(str(tmp_path / "data"), today=TODAY, verbose=False)
    snap = p.run(notify=False)

    modes = {s["key"]: s["mode"] for s in snap["sources"]}
    assert modes["dramexchange"] == "auto" and modes["edgar_micron"] == "auto" and modes["dart_financials"] == "needs_key"
    assert all(s["ok"] for s in snap["sources"] if s["mode"] == "auto")
    by_key = {s["key"]: s for s in snap["signals"]}
    assert by_key["spot_price"]["status"] != "na" and by_key["spot_price"]["metrics"]["contract"] == 2.0
    assert by_key["usdkrw"]["status"] != "na"
    assert by_key["pbr"]["headline"].startswith("삼성전자 1.32배")
    assert by_key["micron"]["metrics"]["revenue_usd_bn"] == pytest.approx(11.0)
    assert by_key["nvidia_tsmc"]["metrics"]["tsmc_yoy"] == 31.41
    assert p.store.load_series("dio_weeks_micron")[-1].value == pytest.approx(9e9 / 6.6e9 * 91 / 7, rel=1e-3)
    assert (tmp_path / "data" / "reports" / "latest.md").exists()
    assert (tmp_path / "data" / "signal_history.csv").exists()
    assert snap["changes"] == ["첫 실행"]
    # 두 번째 실행: 변화 없음
    snap2 = Pipeline(str(tmp_path / "data"), today=TODAY, verbose=False).run(notify=False)
    assert snap2["changes"] == []


def test_pipeline_offline_applies_manual(tmp_path):
    store = Store(str(tmp_path / "data"))
    store.save_manual({
        "contract_price": {"dram_ddr4_8gb": [{"month": "2025-08", "price": 1.95}, {"month": "2025-09", "price": 2.05, "note": "TrendForce"}]},
        "inventory_weeks": {"customer": [{"date": "2025-09-25", "weeks": 5, "note": "컨콜"}]},
        "capex": {"hynix": [{"date": "2025-07-24", "direction": "증액"}]},
        "pbr": [{"date": "2025-09-30", "samsung": 1.3, "hynix": 2.4}],
    })
    snap = Pipeline(str(tmp_path / "data"), today=TODAY, offline=True, verbose=False).run(notify=False)
    by_key = {s["key"]: s for s in snap["signals"]}
    assert by_key["contract_price"]["status"] == "bull" and by_key["contract_price"]["freshness"] == "manual"
    assert by_key["inventory_weeks"]["status"] == "bull"
    assert by_key["capex"]["status"] == "bull"
    assert by_key["pbr"]["status"] == "caution"
    assert all(s["mode"] == "skipped" for s in snap["sources"] if s["mode"] != "needs_key")
    assert snap["phase"]["phase"] == 2
