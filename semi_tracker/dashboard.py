"""Streamlit 대시보드: 종합 국면, 10개 지표 판정, 시계열, 수동 입력 편집, 일정·수집 상태.

실행: streamlit run semi_tracker/dashboard.py
데이터 폴더는 환경변수 TRACKER_DATA_DIR (기본 data) 또는 사이드바에서 바꿀 수 있습니다.
"""
from __future__ import annotations

import os
import sys
from datetime import date

import altair as alt
import pandas as pd
import streamlit as st

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from semi_tracker import __version__, config  # noqa: E402
from semi_tracker.models import FRESHNESS_LABEL  # noqa: E402
from semi_tracker.store import Store  # noqa: E402

st.set_page_config(page_title="반도체 사이클 국면 트래커", page_icon="📈", layout="wide")

BLUE, RED, GRAY = "#2a78d6", "#e34948", "#9a9892"
STATUS_COLOR = {"bull": "#0ca30c", "neutral": "#9a9892", "caution": "#fab219", "bear": "#d03b3b", "na": "#6b6a66"}
PHASE_COLOR = {1: "#1baf7a", 2: "#0ca30c", 3: "#fab219", 4: "#d03b3b", None: "#6b6a66"}

SERIES_BY_INDICATOR: dict[str, list[tuple[str, str, str]]] = {
    "contract_price": [("contract_dram_ddr4_8gb", "DDR4 8Gb 고정가", "USD"), ("contract_dram_ddr5_16gb", "DDR5 16Gb 고정가", "USD"),
                       ("contract_nand_512gb_tlc", "NAND 512Gb TLC 고정가", "USD")],
    "spot_price": [("spot_dram_ddr4_8gb", "DDR4 8Gb 현물가", "USD"), ("spot_dram_ddr5_16gb", "DDR5 16Gb 현물가", "USD"),
                   ("spot_nand_512gb_tlc", "NAND 512Gb TLC 현물가", "USD")],
    "inventory_weeks": [("customer_inventory_weeks", "고객 재고 주수", "주"), ("dio_weeks_samsung", "삼성전자 재고일수(주 환산)", "주"),
                        ("dio_weeks_hynix", "SK하이닉스 재고일수(주 환산)", "주"), ("dio_weeks_micron", "마이크론 재고일수(주 환산)", "주")],
    "micron": [("micron_revenue_usd_bn", "마이크론 분기 매출", "B$"), ("micron_gross_margin_pct", "마이크론 매출총이익률", "%")],
    "nvidia_tsmc": [("nvidia_dc_revenue_usd_bn", "엔비디아 데이터센터 매출(수동)", "B$"), ("nvidia_revenue_usd_bn", "엔비디아 총매출", "B$"),
                    ("tsmc_monthly_revenue_ntd_bn", "TSMC 월매출", "NT$B"), ("tsmc_monthly_yoy_pct", "TSMC 월매출 YoY", "%")],
    "capex": [("capex_samsung_krw_tn", "삼성전자 분기 CAPEX", "조원"), ("capex_hynix_krw_tn", "SK하이닉스 분기 CAPEX", "조원"),
              ("micron_capex_usd_bn", "마이크론 분기 CAPEX", "B$")],
    "foreign_flow": [("foreign_net_value_005930", "삼성전자 외국인 순매수 금액", "억원"), ("foreign_net_value_000660", "SK하이닉스 외국인 순매수 금액", "억원")],
    "usdkrw": [("usdkrw", "USD/KRW", "원")],
    "pbr": [("pbr_005930", "삼성전자 P/B", "배"), ("pbr_000660", "SK하이닉스 P/B", "배")],
}
BAR_SERIES = {"foreign_net_value_005930", "foreign_net_value_000660"}
REFERENCE_LINES = {"pbr_005930": [1.2, 2.0], "pbr_000660": [1.2, 2.0], "customer_inventory_weeks": [6, 10]}


# ── 데이터 ─────────────────────────────────────────────────────────────
def get_store() -> Store:
    default = os.environ.get("TRACKER_DATA_DIR", "data")
    data_dir = st.sidebar.text_input("데이터 폴더", value=default)
    return Store(data_dir)


def series_df(store: Store, key: str) -> pd.DataFrame:
    pts = store.load_series(key)
    if not pts:
        return pd.DataFrame(columns=["date", "value", "note"])
    df = pd.DataFrame([p.to_row() for p in pts])
    df["date"] = pd.to_datetime(df["date"])
    return df


def chart(df: pd.DataFrame, title: str, unit: str, bar: bool = False, refs: list[float] | None = None) -> alt.Chart:
    base = alt.Chart(df).encode(
        x=alt.X("date:T", title=None, axis=alt.Axis(grid=False, labelColor="#52514e")),
        y=alt.Y("value:Q", title=unit, axis=alt.Axis(gridColor="#e8e7e3", labelColor="#52514e"), scale=alt.Scale(zero=bar)),
        tooltip=[alt.Tooltip("date:T", title="날짜", format="%Y-%m-%d"), alt.Tooltip("value:Q", title=unit, format=",.3f"),
                 alt.Tooltip("note:N", title="메모")],
    )
    if bar:
        mark = base.mark_bar(cornerRadiusTopLeft=3, cornerRadiusTopRight=3).encode(
            color=alt.condition(alt.datum.value >= 0, alt.value(BLUE), alt.value(RED)))
    else:
        mark = base.mark_line(strokeWidth=2, color=BLUE, point=alt.OverlayMarkDef(size=28, color=BLUE, filled=True))
    layers = [mark]
    for r in refs or []:
        layers.append(alt.Chart(pd.DataFrame({"y": [r]})).mark_rule(color=GRAY, strokeDash=[4, 4]).encode(y="y:Q"))
    return alt.layer(*layers).properties(title=alt.TitleParams(title, anchor="start", fontSize=13, color="#52514e"), height=200)


def badge(text: str, color: str) -> str:
    return (f'<span style="display:inline-block;padding:2px 10px;border-radius:12px;background:{color}22;'
            f'border:1px solid {color};color:inherit;font-weight:600;font-size:0.85rem">{text}</span>')


# ── 수집 실행 ───────────────────────────────────────────────────────────
def run_pipeline(store: Store, offline: bool) -> None:
    from semi_tracker.run import Pipeline
    with st.spinner("수집·판정 실행 중… (네트워크 상태에 따라 1~2분)"):
        Pipeline(store.root, offline=offline, verbose=False).run(notify=False)
    st.success("완료. 페이지를 새로 고칩니다.")
    st.rerun()


# ── 화면 ───────────────────────────────────────────────────────────────
def render_phase(snapshot: dict) -> None:
    ph = snapshot["phase"]
    color = PHASE_COLOR.get(ph.get("phase"))
    c1, c2 = st.columns([1.2, 2])
    with c1:
        st.markdown(
            f'<div style="border-left:6px solid {color};padding:0.6rem 1rem;border-radius:8px;background:{color}14">'
            f'<div style="font-size:0.85rem;opacity:0.75">종합 국면 · 기준일 {snapshot["today"]}</div>'
            f'<div style="font-size:1.9rem;font-weight:800;line-height:1.2">{ph["label"]}</div>'
            f'<div style="font-size:0.95rem;margin-top:0.3rem">신뢰도 {ph["confidence"]:.0%} · 지표 {ph["coverage"]}/{len(snapshot["signals"])}개 반영</div>'
            "</div>", unsafe_allow_html=True)
        st.caption(ph["summary"])
        if ph.get("guide"):
            st.info(f"다음 확인 포인트 — {ph['guide']}")
    with c2:
        votes = ph.get("votes", {})
        vdf = pd.DataFrame({"국면": [config.PHASES[k] for k in (1, 2, 3, 4)],
                            "투표": [float(votes.get(str(k), votes.get(k, 0))) for k in (1, 2, 3, 4)]})
        vdf["선택"] = [config.PHASES.get(ph.get("phase")) == p for p in vdf["국면"]]
        bars = alt.Chart(vdf).mark_bar(cornerRadiusEnd=4, height=26).encode(
            x=alt.X("투표:Q", title="가중 투표 합계", axis=alt.Axis(gridColor="#e8e7e3")),
            y=alt.Y("국면:N", sort=None, title=None, axis=alt.Axis(labelFontSize=13, labelLimit=200, labelOverlap=False)),
            color=alt.condition(alt.datum.선택, alt.value(BLUE), alt.value("#9ec5f4")),
            tooltip=[alt.Tooltip("국면:N"), alt.Tooltip("투표:Q", format=".1f")],
        ).properties(height=190, title=alt.TitleParams("국면별 투표 (지표 해석 규칙의 가중 합)", anchor="start", fontSize=13, color="#52514e"))
        labels = bars.mark_text(align="left", dx=4, color="#52514e").encode(text=alt.Text("투표:Q", format=".1f"))
        st.altair_chart(bars + labels, use_container_width=True)
        if ph.get("dissenters"):
            st.markdown("**반대 신호:** " + " · ".join(f"{d['name']} → {d['phase_label']}" for d in ph["dissenters"][:4]))


def render_signal_table(snapshot: dict) -> None:
    rows = []
    for i, s in enumerate(snapshot["signals"], start=1):
        rows.append({"#": i, "지표": s["name"], "현재값": s["headline"], "판정": s["status_label"], "근거": s["rationale"],
                     "선행/동행": s["lead_lag"], "기준일": s.get("as_of") or "—", "상태": FRESHNESS_LABEL.get(s["freshness"], s["freshness"])})
    st.dataframe(pd.DataFrame(rows), hide_index=True, use_container_width=True,
                 column_config={"#": st.column_config.NumberColumn(width="small"), "근거": st.column_config.TextColumn(width="large"),
                                "현재값": st.column_config.TextColumn(width="medium")})
    todo = [(s["name"], n) for s in snapshot["signals"] for n in s.get("needs_manual", [])]
    if todo:
        with st.expander(f"수동 입력 필요 항목 {len(todo)}개", expanded=False):
            for name, n in todo:
                st.markdown(f"- **{n}** — {name}")


def render_indicator_details(store: Store, snapshot: dict) -> None:
    for s in snapshot["signals"]:
        meta = config.INDICATOR_BY_KEY[s["key"]]
        color = STATUS_COLOR.get(s["status"], GRAY)
        with st.expander(f"{s['status_label']}  {s['name']} — {s['headline']}", expanded=False):
            st.markdown(badge(s["status_label"], color) + " " + badge(FRESHNESS_LABEL.get(s["freshness"], s["freshness"]), GRAY)
                        + f" &nbsp; 기준일 {s.get('as_of') or '—'} &nbsp;·&nbsp; {s['lead_lag']}", unsafe_allow_html=True)
            st.markdown(f"**판정 근거:** {s['rationale']}")
            st.markdown(f"**해석 규칙(원문):** {meta['interpretation']}  \n**어디서 보나:** {meta['where']}  \n**자동화:** {meta['auto']}")
            if s.get("next_release"):
                st.markdown(f"**다음 발표:** {s['next_release']}")
            if s.get("needs_manual"):
                st.warning("수동 입력 필요: " + ", ".join(s["needs_manual"]))
            charts = []
            for key, label, unit in SERIES_BY_INDICATOR.get(s["key"], []):
                df = series_df(store, key)
                if len(df):
                    charts.append(chart(df, label, unit, bar=key in BAR_SERIES, refs=REFERENCE_LINES.get(key)))
            if charts:
                cols = st.columns(min(len(charts), 2))
                for i, c in enumerate(charts):
                    with cols[i % len(cols)]:
                        st.altair_chart(c, use_container_width=True)
            if s["key"] == "equipment_orders":
                recs = store.load_records("equipment_orders")
                if recs:
                    df = pd.DataFrame(recs)
                    cols_show = [c for c in ("rcept_dt", "corp_name", "report_nm", "amount_krw", "sales_ratio_pct", "url") if c in df.columns]
                    st.dataframe(df[cols_show].head(30), hide_index=True, use_container_width=True,
                                 column_config={"url": st.column_config.LinkColumn("공시"), "amount_krw": st.column_config.NumberColumn("계약금액(원)", format="%,.0f")})
            if s.get("metrics"):
                with st.popover("세부 수치"):
                    st.json({k: v for k, v in s["metrics"].items() if k not in ("recent", "products")})
            st.markdown("출처: " + " · ".join(f"[{u.split('/')[2]}]({u})" for u in meta["links"]))


def render_manual_editor(store: Store) -> None:
    st.markdown("자동 수집이 불가능한 값(고정가, 고객 재고 주수, 가이던스, CAPEX 방향 등)은 아래 YAML 을 수정해 저장하세요. "
                "저장 후 **오프라인 재판정**을 누르면 네트워크 없이 바로 반영됩니다.")
    current = ""
    if os.path.exists(store.manual_path):
        with open(store.manual_path, encoding="utf-8") as f:
            current = f.read()
    text = st.text_area("data/manual_inputs.yaml", value=current, height=420, label_visibility="collapsed")
    c1, c2 = st.columns(2)
    if c1.button("저장", type="primary", use_container_width=True):
        import yaml
        try:
            yaml.safe_load(text)
        except yaml.YAMLError as e:
            st.error(f"YAML 문법 오류: {e}")
            return
        with open(store.manual_path, "w", encoding="utf-8") as f:
            f.write(text)
        st.success("저장했습니다. 커밋하면 자동 실행에도 반영됩니다.")
    if c2.button("오프라인 재판정 (저장된 데이터 + 수동 입력)", use_container_width=True):
        run_pipeline(store, offline=True)


def render_ops(store: Store, snapshot: dict) -> None:
    c1, c2 = st.columns(2)
    with c1:
        st.markdown("#### 다음 발표 일정")
        cal_df = pd.DataFrame(snapshot.get("calendar", []))
        if len(cal_df):
            cal_df["날짜"] = cal_df["date"] + cal_df["est"].map({True: " (예상)", False: ""})
            cal_df["D-day"] = cal_df["days"].map(lambda d: f"D-{d}" if d > 0 else "오늘")
            st.dataframe(cal_df[["날짜", "D-day", "label"]].rename(columns={"label": "이벤트"}), hide_index=True, use_container_width=True)
    with c2:
        st.markdown("#### 수집 상태")
        src = pd.DataFrame(snapshot.get("sources", []))
        if len(src):
            src["결과"] = src["ok"].map({True: "✅", False: "⚠️"})
            st.dataframe(src[["결과", "key", "mode", "message", "fetched_at"]].rename(columns={"key": "소스", "mode": "모드", "message": "메시지", "fetched_at": "시각"}),
                         hide_index=True, use_container_width=True)
        st.caption(f"DART_API_KEY: {'설정됨' if config.DART_API_KEY else '미설정 (삼성·하이닉스 재무, 장비 수주 공시 수집 불가)'} · "
                   f"SEC 연락처 UA: {config.CONTACT_EMAIL}")
    news = snapshot.get("news") or []
    if news:
        st.markdown("#### TrendForce 관련 헤드라인")
        for n in news[:10]:
            st.markdown(f"- [{n['title']}]({n['url']})")
    hist_path = os.path.join(store.root, "signal_history.csv")
    if os.path.exists(hist_path):
        hist = pd.read_csv(hist_path)
        if len(hist) >= 2 and "phase" in hist:
            hist["date"] = pd.to_datetime(hist["date"])
            hist["phase"] = pd.to_numeric(hist["phase"], errors="coerce")
            st.markdown("#### 국면 판정 이력")
            ch = alt.Chart(hist.dropna(subset=["phase"])).mark_line(interpolate="step-after", strokeWidth=2, color=BLUE, point=True).encode(
                x=alt.X("date:T", title=None), y=alt.Y("phase:Q", title="국면", scale=alt.Scale(domain=[0.5, 4.5]), axis=alt.Axis(values=[1, 2, 3, 4])),
                tooltip=["date:T", "phase:Q"]).properties(height=160)
            st.altair_chart(ch, use_container_width=True)
    with st.expander("지표 정의 (8.4 국면을 확인하는 지표 — 원문)"):
        st.dataframe(pd.DataFrame([{"지표": m["name"], "어디서 보나": m["where"], "해석": m["interpretation"], "선행/동행": m["lead_lag"], "자동화": m["auto"]}
                                   for m in config.INDICATORS]), hide_index=True, use_container_width=True)


def main() -> None:
    st.title("📈 반도체 사이클 국면 트래커")
    st.caption(f"8.4 '국면을 확인하는 지표' 10개를 자동 수집·판정합니다 · v{__version__}")
    store = get_store()
    st.sidebar.markdown("### 실행")
    offline = st.sidebar.toggle("오프라인(저장 데이터만)", value=False)
    if st.sidebar.button("지금 수집·판정 실행", type="primary", use_container_width=True):
        run_pipeline(store, offline=offline)
    st.sidebar.caption("자동 실행은 GitHub Actions 가 평일 아침 수행하고 결과를 data/ 에 커밋합니다.")
    snapshot = store.load_latest()
    if not snapshot:
        st.warning("아직 실행 결과가 없습니다. 왼쪽 **지금 수집·판정 실행**을 누르거나 `python -m semi_tracker.run` 을 실행하세요.")
        with st.expander("지표 정의 (8.4 국면을 확인하는 지표)", expanded=True):
            st.dataframe(pd.DataFrame([{"지표": m["name"], "어디서 보나": m["where"], "해석": m["interpretation"], "선행/동행": m["lead_lag"], "자동화": m["auto"]}
                                       for m in config.INDICATORS]), hide_index=True, use_container_width=True)
        return
    gen = snapshot.get("generated_at", "")[:16].replace("T", " ")
    st.sidebar.markdown(f"마지막 실행: `{gen}`")
    tab1, tab2, tab3, tab4 = st.tabs(["국면 요약", "지표 상세", "수동 입력", "일정·수집 상태"])
    with tab1:
        render_phase(snapshot)
        if snapshot.get("changes") and snapshot["changes"] != ["첫 실행"]:
            st.markdown("**이전 실행 대비 변화:** " + " / ".join(snapshot["changes"]))
        render_signal_table(snapshot)
    with tab2:
        render_indicator_details(store, snapshot)
    with tab3:
        render_manual_editor(store)
    with tab4:
        render_ops(store, snapshot)
    st.caption(f"오늘 {date.today().isoformat()} · 투자 판단의 참고용이며 자동 수집 데이터에는 오류가 있을 수 있습니다.")


main()
