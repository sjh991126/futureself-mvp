"""수집기 파서 테스트 (네트워크 없이 픽스처로)."""
from datetime import date

from semi_tracker.fetchers import dart, dramexchange, edgar, fx, mops, naver


# ── DRAMeXchange ──────────────────────────────────────────────────────
def test_dramexchange_parse_spot_and_contract(fixture_text):
    recs = dramexchange.parse_price_tables(fixture_text("dramexchange_home.html"), today=date(2025, 10, 2))
    spot = {r["product"]: r for r in recs if r["kind"] == "spot"}
    contract = {r["product"]: r for r in recs if r["kind"] == "contract"}
    assert spot["dram_ddr4_8gb"]["price"] == 2.105
    assert spot["dram_ddr4_8gb"]["change_pct"] == -1.10
    assert spot["dram_ddr5_16gb"]["price"] == 5.632
    assert spot["nand_512gb_tlc"]["price"] == 2.951
    assert contract["dram_ddr4_8gb"]["price"] == 2.00
    assert contract["dram_ddr4_8gb"]["change_pct"] == 5.26
    assert contract["dram_ddr4_8gb"]["period"] == "2025-09-01"
    assert len(contract) == 2
    assert not any(r["item"].startswith("Not a price") for r in recs)


def test_dramexchange_parse_period_variants():
    assert dramexchange.parse_period("Sep. 2025") == "2025-09-01"
    assert dramexchange.parse_period("2025/09") == "2025-09-01"
    assert dramexchange.parse_period("2025-10-01") == "2025-10-01"
    assert dramexchange.parse_period("Dec", today=date(2026, 1, 15)) == "2025-12-01"
    assert dramexchange.parse_period("hello") is None


def test_trendforce_news_filter(fixture_text):
    news = dramexchange.parse_news(fixture_text("trendforce_news.html"))
    titles = [n["title"] for n in news]
    assert any("DRAM Contract Prices" in t for t in titles)
    assert any("CoWoS" in t for t in titles)
    assert not any("Smartphone" in t for t in titles)
    assert all(n["url"].startswith("https://www.trendforce.com/") for n in news)


# ── EDGAR ─────────────────────────────────────────────────────────────
def _micron_like_facts():
    """FY2025(2024-08-30~2025-08-28): 10-Q 분기+누적, 10-K 연간. 분기값 10,11,12,13."""
    fy_start = "2024-08-30"
    q_ends = ["2024-11-28", "2025-02-27", "2025-05-29", "2025-08-28"]
    q_starts = [fy_start, "2024-11-29", "2025-02-28", "2025-05-30"]
    vals = [10.0, 11.0, 12.0, 13.0]
    facts = []
    cum = 0.0
    for i in range(3):
        cum += vals[i]
        facts.append({"start": q_starts[i], "end": q_ends[i], "val": vals[i], "form": "10-Q", "filed": f"2025-0{i + 1}-15"})
        if i > 0:
            facts.append({"start": fy_start, "end": q_ends[i], "val": cum, "form": "10-Q", "filed": f"2025-0{i + 1}-15"})
    facts.append({"start": fy_start, "end": q_ends[3], "val": sum(vals), "form": "10-K", "filed": "2025-10-10"})
    # 무시돼야 하는 8-K 와 2년치 연간 비교 사실
    facts.append({"start": "2023-09-01", "end": "2024-08-29", "val": 30.0, "form": "10-K", "filed": "2025-10-10"})
    return facts


def test_edgar_derive_quarterly_handles_ytd_and_annual():
    q = edgar.derive_quarterly(_micron_like_facts())
    assert [r["end"] for r in q] == ["2024-11-28", "2025-02-27", "2025-05-29", "2025-08-28"]
    assert [r["value"] for r in q] == [10.0, 11.0, 12.0, 13.0]
    assert q[3]["derived"] is True and q[0]["derived"] is False
    assert all(85 <= r["days"] <= 95 for r in q)


def test_edgar_derive_quarterly_prefers_latest_filing():
    facts = _micron_like_facts()
    facts.append({"start": "2024-08-30", "end": "2024-11-28", "val": 10.5, "form": "10-Q/A", "filed": "2025-06-01"})
    q = edgar.derive_quarterly(facts)
    assert q[0]["value"] == 10.5


def test_edgar_instants_and_dio():
    inv = [
        {"end": "2025-05-29", "val": 100.0, "form": "10-Q", "filed": "2025-06-20"},
        {"end": "2025-05-29", "val": 101.0, "form": "10-Q", "filed": "2025-06-25"},  # 최신 제출 우선
        {"end": "2025-08-28", "val": 120.0, "form": "10-K", "filed": "2025-10-10"},
        {"start": "2024-08-30", "end": "2025-08-28", "val": 999.0, "form": "10-K", "filed": "2025-10-10"},  # 기간 사실은 제외
    ]
    series = edgar.instant_series(inv)
    assert [(r["end"], r["value"]) for r in series] == [("2025-05-29", 101.0), ("2025-08-28", 120.0)]
    cogs = [{"end": "2025-08-28", "value": 60.0, "days": 91}]
    dio = edgar.days_inventory(cogs, series)
    assert len(dio) == 1
    assert abs(dio[0]["dio_days"] - 120.0 / 60.0 * 91) < 1e-9
    assert abs(dio[0]["weeks"] - dio[0]["dio_days"] / 7) < 1e-9


# ── DART ──────────────────────────────────────────────────────────────
def _dart_rows(label, ytd_rev, ytd_cogs, ytd_capex, inv):
    return [
        {"sj_div": "IS", "account_id": "ifrs-full_Revenue", "account_nm": "수익(매출액)", "thstrm_amount": "1", "thstrm_add_amount": str(ytd_rev)},
        {"sj_div": "IS", "account_id": "ifrs-full_CostOfSales", "account_nm": "매출원가", "thstrm_amount": "1", "thstrm_add_amount": str(ytd_cogs)},
        {"sj_div": "CF", "account_id": "ifrs-full_PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities",
         "account_nm": "유형자산의 취득", "thstrm_amount": str(-ytd_capex), "thstrm_add_amount": ""},
        {"sj_div": "BS", "account_id": "ifrs-full_Inventories", "account_nm": "재고자산", "thstrm_amount": str(inv), "thstrm_add_amount": ""},
    ]


def test_dart_quarters_from_ytd():
    q = dart.quarters_from_ytd({"Q1": 10, "H1": 25, "Q3": 45, "FY": 70})
    assert q == {"Q1": 10, "H1": 15, "Q3": 20, "FY": 25}
    # 중간 보고서가 빠지면 그 다음 분기는 계산하지 않는다
    q = dart.quarters_from_ytd({"Q1": 10, "Q3": 45, "FY": 70})
    assert q == {"Q1": 10, "FY": 25}


def test_dart_pick_account_by_id_then_name():
    rows = [{"sj_div": "IS", "account_id": "x", "account_nm": "매출원가", "thstrm_amount": "5"},
            {"sj_div": "BS", "account_id": "ifrs-full_Inventories", "account_nm": "기타", "thstrm_amount": "7"}]
    assert dart.pick_account(rows, "cogs", "IS")["thstrm_amount"] == "5"
    assert dart.pick_account(rows, "inventory")["thstrm_amount"] == "7"
    assert dart.pick_account(rows, "revenue") is None


def test_dart_quarterly_metrics(monkeypatch):
    client = dart.DartClient(api_key="dummy")
    data = {
        "11013": _dart_rows("Q1", 100, 60, 10, 50),
        "11012": _dart_rows("H1", 210, 125, 22, 55),
        "11014": _dart_rows("Q3", 330, 195, 36, 58),
        "11011": _dart_rows("FY", 460, 270, 52, 60),
    }
    monkeypatch.setattr(client, "statements", lambda corp, year, code, fs_div="CFS": data[code] if year == 2025 else [])
    m = client.quarterly_metrics("00126380", [2024, 2025])
    assert [(r["end"], r["value"]) for r in m["revenue"]] == [("2025-03-31", 100), ("2025-06-30", 110), ("2025-09-30", 120), ("2025-12-31", 130)]
    assert [r["value"] for r in m["cogs"]] == [60, 65, 70, 75]
    assert [r["value"] for r in m["capex"]] == [10, 12, 14, 16]
    assert [(r["end"], r["value"]) for r in m["inventory"]][-1] == ("2025-12-31", 60)


def test_dart_supply_contract_filter(monkeypatch):
    client = dart.DartClient(api_key="dummy")
    items = [
        {"corp_name": "한미반도체", "report_nm": "단일판매ㆍ공급계약체결", "rcept_no": "2025093000001", "rcept_dt": "20250930"},
        {"corp_name": "한미반도체", "report_nm": "임원ㆍ주요주주특정증권등소유상황보고서", "rcept_no": "2025092900002", "rcept_dt": "20250929"},
        {"corp_name": "한미반도체", "report_nm": "[기재정정]단일판매ㆍ공급계약체결", "rcept_no": "2025091500003", "rcept_dt": "20250915"},
    ]
    monkeypatch.setattr(client, "disclosures", lambda corp, b, e, pblntf_ty="I": items)
    out = client.supply_contracts({"042700": "00xxxxxx"}, date(2025, 4, 1), date(2025, 10, 1))
    assert [o["rcept_no"] for o in out] == ["2025093000001", "2025091500003"]
    assert out[0]["url"].endswith("2025093000001")


def test_dart_parse_corp_codes_and_contract_details():
    xml = b"""<?xml version="1.0" encoding="UTF-8"?><result>
    <list><corp_code>00126380</corp_code><corp_name>\xec\x82\xbc\xec\x84\xb1\xec\xa0\x84\xec\x9e\x90</corp_name><stock_code>005930</stock_code><modify_date>20240101</modify_date></list>
    <list><corp_code>00999999</corp_code><corp_name>X</corp_name><stock_code> </stock_code><modify_date>20240101</modify_date></list>
    <list><corp_code>00111111</corp_code><corp_name>Y</corp_name><stock_code>042700</stock_code><modify_date>20240101</modify_date></list>
    </result>"""
    assert dart.parse_corp_codes(xml, ["005930", "042700"]) == {"005930": "00126380", "042700": "00111111"}
    text = "<TABLE><TR><TD>계약금액(원)</TD><TD>125,400,000,000</TD></TR><TR><TD>매출액대비(%)</TD><TD>22.5</TD></TR></TABLE>"
    d = dart.parse_contract_details(text)
    assert d == {"amount_krw": 125400000000.0, "sales_ratio_pct": 22.5}


# ── Naver ─────────────────────────────────────────────────────────────
def test_naver_foreign_table(fixture_text):
    rows = naver.parse_foreign_table(fixture_text("naver_frgn.html"))
    assert [r["date"] for r in rows] == ["2025-09-26", "2025-09-29", "2025-09-30"]
    last = rows[-1]
    assert last["close"] == 84500 and last["frgn_net"] == 1234567 and last["inst_net"] == -512345
    assert last["frgn_ratio"] == 51.95
    assert rows[1]["frgn_net"] == -800000


def test_naver_main_and_fx(fixture_text):
    m = naver.parse_main(fixture_text("naver_main.html"))
    assert m == {"pbr": 1.32, "per": 13.21, "price": 84500.0}
    fxrows = naver.parse_fx_table(fixture_text("naver_fx.html"))
    assert [(r["date"], r["rate"]) for r in fxrows] == [("2025-09-29", 1404.7), ("2025-09-30", 1401.5)]


def test_naver_decode_cp949():
    raw = "외국인 순매매량 2025.09.30".encode("cp949")
    assert "외국인" in naver.decode_naver(raw)


# ── FX / MOPS ─────────────────────────────────────────────────────────
def test_frankfurter_parse():
    data = {"amount": 1.0, "base": "USD", "rates": {"2025-09-30": {"KRW": 1401.2}, "2025-09-29": {"KRW": 1404.5}, "2025-09-28": {}}}
    rows = fx.parse_frankfurter(data)
    assert [(r["date"], r["rate"]) for r in rows] == [("2025-09-29", 1404.5), ("2025-09-30", 1401.2)]


def test_mops_parse_and_decode(fixture_text):
    html = fixture_text("mops_month.html")
    row = mops.parse_mops(html)
    assert row["name"] == "台積電" and row["revenue"] == 330979760.0
    assert row["mom_pct"] == -1.43 and row["yoy_pct"] == 31.41
    assert mops.parse_mops(html, code="9999") is None
    decoded = mops.decode_mops(html.encode("cp950"))
    assert mops.parse_mops(decoded)["revenue"] == 330979760.0
    utf = mops.decode_mops(html.replace("charset=big5", "charset=utf-8").encode("utf-8"))
    assert "台積電" in utf
