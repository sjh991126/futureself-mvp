import streamlit as st
from datetime import datetime

st.set_page_config(
    page_title="Future Self Coach | 미래 자기 코치",
    page_icon="🧭",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# 간소화된 CSS
st.markdown("""
<style>
    .main-header { font-size: 2.4rem; font-weight: 800; color: #1a1a2e; text-align: center; padding: 2rem 0 0.5rem 0; }
    .sub-header { font-size: 1.05rem; color: #666; text-align: center; margin-bottom: 2rem; }
</style>
""", unsafe_allow_html=True)

if "step" not in st.session_state:
    st.session_state.step = 0
if "data" not in st.session_state:
    st.session_state.data = {}


def burnout_score(d):
    s = 0
    h = d.get("work_hours", 40)
    if h > 60: s += 25
    elif h > 50: s += 18
    elif h > 45: s += 12
    elif h > 40: s += 6
    s += (d.get("stress_level", 5) / 10) * 25
    s += min(len(d.get("symptoms", [])) * 5, 30)
    s += ((10 - d.get("autonomy", 5)) / 10) * 20
    return min(int(s), 100)


def income_trajectory(d):
    base = d.get("current_income", 60000)
    rates = {"금융/투자": 0.08, "테크/IT": 0.10, "컨설팅": 0.09,
             "제조/산업": 0.04, "헬스케어": 0.06, "미디어/크리에이티브": 0.05, "기타": 0.05}
    r = rates.get(d.get("industry", "기타"), 0.05)
    return {"y1": int(base * (1+r)), "y3": int(base * (1+r)**3), "y5": int(base * (1+r)**5)}


def make_scenarios(d):
    bs = burnout_score(d)
    it = income_trajectory(d)
    h = d.get("work_hours", 45)
    st_lv = d.get("stress_level", 5)
    goal = d.get("primary_goal", "성장과 수입")
    inc = d.get("current_income", 60000)

    risk_label = "🔴 높음" if bs > 65 else ("🟡 중간" if bs > 40 else "🟢 낮음")

    sc_a = {
        "title": "🔴 시나리오 A — 지금 패턴 유지",
        "type": "error",
        "lines": [
            f"- **1년 후:** 수입 ${it['y1']:,} 예상. 번아웃 리스크 점수 {bs}/100 유지.",
            f"- **3년 후:** {'번아웃 실제 발생 가능성 60%+, 이직·공백 리스크.' if bs > 65 else '성장 정체, 서서히 에너지 소진.'} 수입 ${it['y3']:,}.",
            f"- **5년 후:** {'커리어·건강 동시 위기.' if bs > 65 else '안정적이나 의미 공백 시작.'} 수입 ${it['y5']:,}.",
        ],
        "note": f"주 {h}시간 + 스트레스 {st_lv}/10이 계속되면 {'1~2년 내 번아웃이 거의 확실합니다.' if bs > 65 else '에너지가 서서히 소진됩니다.'}",
        "health_risk": risk_label,
    }

    if h > 50:
        change = "주 근무시간 -10시간 + 고가치 업무 집중"
        benefit = "번아웃 리스크 40% 감소, 장기 수입 오히려 증가"
    elif st_lv > 7:
        change = "주 2회 디지털 디톡스 + 명확한 경계 설정"
        benefit = "스트레스 감소, 팀 내 신뢰도 오히려 상승"
    else:
        change = "사이드 프로젝트 or 핵심 스킬 1개 집중 개발"
        benefit = "3년 내 수입 다각화, 협상력 강화"

    sc_b = {
        "title": "🟡 시나리오 B — 한 가지 변화",
        "type": "warning",
        "lines": [
            f"- **핵심 변화:** {change}",
            f"- **1년 후:** 적응기(6개월). 에너지 회복 시작.",
            f"- **3년 후:** {benefit}. 수입 ${int(it['y3']*1.05):,}.",
            f"- **5년 후:** 건강·수입·관계 균형. 수입 ${int(it['y5']*1.12):,}.",
        ],
        "note": f"가장 현실적이고 즉시 실행 가능한 경로입니다.",
        "health_risk": "🟡 중간→낮음",
    }

    pivots = {
        "성장과 수입": "독립 컨설턴트 or 창업 — 수입 천장 없음",
        "자유와 건강": "주 4일 근무 회사 이직 or 프리랜서 전환",
        "의미와 임팩트": "스타트업/소셜벤처 피봇 — 수입 감소, 만족도 급상승",
    }
    pivot = pivots.get(goal, "새 커리어 경로 탐색")

    sc_c = {
        "title": "🟢 시나리오 C — 급진적 피봇",
        "type": "success",
        "lines": [
            f"- **방향:** {pivot}",
            f"- **1년 후:** 수입 일시 감소 가능. 심리적 불안 최고조.",
            f"- **3년 후:** 새 경로 안착 시 번아웃 리스크 최저.",
            f"- **5년 후:** {'수입 천장 돌파 가능.' if goal == '성장과 수입' else '수입·자유·의미 3박자 가능.'} 실행 의지 필수.",
        ],
        "note": f"필수 전제: 재정 버퍼 최소 ${inc//12*6:,} (6개월치) 확보.",
        "health_risk": "🟢 낮음",
    }
    return sc_a, sc_b, sc_c


def action_plan(d):
    bs = burnout_score(d)
    h = d.get("work_hours", 45)
    acts = []
    if bs > 65:
        acts.append("- 🔴 **이번 주** — 상사/HR에게 업무량 조정 대화 일정 잡기")
        acts.append("- 🔴 **이번 주** — 번아웃 증상 트래킹 시작 (Daylio 앱 or 노트)")
    if h > 50:
        acts.append("- 🟡 **이번 주** — '하지 않을 일(Not-to-do)' 3가지 작성")
        acts.append("- 🟡 **이번 달** — 주 근무시간 측정, 목표 -5시간 설정")
    acts.append("- ✅ **이번 달** — 신뢰할 멘토 1명과 30분 커피챗 예약")
    acts.append("- ✅ **이번 달** — 시나리오 B 변화 1가지 소규모 실험 시작")
    acts.append("- 📅 **3개월 후** — 리포트 재진단 & 번아웃 점수 비교")
    return acts


# ── 페이지 함수들 ──────────────────────────────────────────

def pg_welcome():
    st.markdown('<div class="main-header">🧭 미래 자기 코치</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">지금 패턴이 3년 후 당신을 어디로 데려갈지 시뮬레이션해드립니다</div>', unsafe_allow_html=True)
    c1, c2, c3 = st.columns([1, 2, 1])
    with c2:
        st.markdown("""
#### 이런 분들을 위한 서비스예요
- 😮‍💨 열심히 일하는데 에너지가 바닥나는 것 같은 분
- 🤔 지금 커리어 방향이 맞는 건지 불확실한 분
- 🎯 번아웃 없이 수입·자유·의미를 다 잡고 싶은 분

**소요 시간: 약 5분 | 완전 무료 베타**
        """)
        if st.button("무료 진단 시작하기 →", use_container_width=True, type="primary"):
            st.session_state.step = 1
            st.rerun()


def pg_s1():
    st.progress(0.2)
    st.markdown("### 📋 기본 정보 (1/4)")
    c1, c2 = st.columns(2)
    with c1:
        name = st.text_input("이름 (닉네임 가능)", placeholder="홍길동")
        industry = st.selectbox("업종", ["금융/투자", "테크/IT", "컨설팅", "제조/산업", "헬스케어", "미디어/크리에이티브", "기타"])
        years = st.slider("현재 분야 경력(년)", 0, 30, 5)
    with c2:
        title = st.text_input("직책", placeholder="시니어 분석가, 팀장 등")
        co_size = st.selectbox("회사 규모", ["1-10명", "11-50명", "51-200명", "201-1000명", "1000명 이상"])
        income = st.number_input("연 수입 (USD 기준, 대략)", 10000, 1000000, 60000, 5000)
    _, cn = st.columns([1, 1])
    with cn:
        if st.button("다음 →", use_container_width=True, type="primary"):
            st.session_state.data.update({"name": name or "익명", "industry": industry,
                "years_experience": years, "job_title": title,
                "company_size": co_size, "current_income": income})
            st.session_state.step = 2; st.rerun()


def pg_s2():
    st.progress(0.4)
    st.markdown("### 💼 현재 업무 강도 (2/4)")
    c1, c2 = st.columns(2)
    with c1:
        wh = st.slider("주당 평균 근무시간", 20, 100, 45)
        sl = st.slider("스트레스 레벨 (1=없음, 10=한계)", 1, 10, 6)
        sleep = st.slider("평균 수면시간(시간/일)", 3, 10, 6)
    with c2:
        auto = st.slider("업무 자율성 (1=없음, 10=완전)", 1, 10, 5)
        wlb = st.slider("워라밸 만족도 (1=최악, 10=최고)", 1, 10, 4)
        vac = st.number_input("최근 1년 실제 휴가일수", 0, 30, 5)
    cb, cn = st.columns(2)
    with cb:
        if st.button("← 이전", use_container_width=True): st.session_state.step = 1; st.rerun()
    with cn:
        if st.button("다음 →", use_container_width=True, type="primary"):
            st.session_state.data.update({"work_hours": wh, "stress_level": sl,
                "sleep_hours": sleep, "autonomy": auto, "wlb": wlb, "vacation_days": vac})
            st.session_state.step = 3; st.rerun()


def pg_s3():
    st.progress(0.6)
    st.markdown("### 🚨 번아웃 증상 체크 (3/4)")
    st.caption("지난 3개월 동안 해당되는 항목 모두 선택")
    items = [
        "아침에 일어날 때 이미 피곤하다",
        "일에 대한 열정·의욕이 크게 줄었다",
        "작은 일에도 짜증나거나 감정 조절이 어렵다",
        "집중력 저하, 업무 효율이 떨어졌다",
        "주말에도 업무 생각을 떨치기 어렵다",
        "친구·가족과 보내는 시간이 줄었다",
        "두통·소화불량·어깨 통증 등 신체 증상",
        "내 성과·기여가 가치 있는지 의문이 든다",
        "이직이나 커리어 전환을 자주 생각한다",
        "술·과식 등 스트레스 해소에 의존하는 경향",
    ]
    selected = []
    c1, c2 = st.columns(2)
    for i, item in enumerate(items):
        with (c1 if i % 2 == 0 else c2):
            if st.checkbox(item, key=f"sym_{i}"): selected.append(item)
    cb, cn = st.columns(2)
    with cb:
        if st.button("← 이전", use_container_width=True): st.session_state.step = 2; st.rerun()
    with cn:
        if st.button("다음 →", use_container_width=True, type="primary"):
            st.session_state.data["symptoms"] = selected
            st.session_state.step = 4; st.rerun()


def pg_s4():
    st.progress(0.8)
    st.markdown("### 🎯 커리어 가치관 (4/4)")
    c1, c2 = st.columns(2)
    with c1:
        goal = st.radio("지금 가장 중요한 커리어 목표는?",
            ["성장과 수입", "자유와 건강", "의미와 임팩트"])
        concerns = st.multiselect("가장 걱정되는 것은? (복수 선택 가능)",
            ["AI로 직업이 사라질 것 같다", "지금 회사에서 성장이 멈췄다",
             "번아웃으로 커리어를 망칠 것 같다", "수입이 기대만큼 안 는다",
             "나만의 경쟁력이 뭔지 모르겠다", "일과 삶의 균형이 무너지고 있다"])
    with c2:
        horizon = st.radio("집중하고 싶은 시간 범위",
            ["당장 6개월", "1-2년", "3-5년", "10년 이상"])
        readiness = st.slider("큰 변화를 줄 준비도 (1=전혀, 10=지금 당장)", 1, 10, 5)
        extra = st.text_area("추가로 하고 싶은 말 (선택)", placeholder="제일 힘든 점, 바라는 것...", height=90)
    cb, cn = st.columns(2)
    with cb:
        if st.button("← 이전", use_container_width=True): st.session_state.step = 3; st.rerun()
    with cn:
        if st.button("🔮 리포트 생성하기", use_container_width=True, type="primary"):
            st.session_state.data.update({"primary_goal": goal, "career_concern": concerns,
                "time_horizon": horizon, "change_readiness": readiness, "additional": extra})
            st.session_state.step = 5; st.rerun()


def pg_report():
    d = st.session_state.data
    name = d.get("name", "익명")
    bs = burnout_score(d)
    sc_a, sc_b, sc_c = make_scenarios(d)
    acts = action_plan(d)

    st.markdown(f'<div class="main-header">📊 {name}님의 미래 자기 리포트</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="sub-header">생성일: {datetime.now().strftime("%Y년 %m월 %d일")}</div>', unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("### 🔍 현재 상태 요약")
    m1, m2, m3, m4 = st.columns(4)
    flag = "🔴" if bs > 65 else ("🟡" if bs > 40 else "🟢")
    m1.metric("번아웃 리스크", f"{flag} {bs}/100")
    m2.metric("주당 근무시간", f"{d.get('work_hours', 45)}시간")
    m3.metric("스트레스 레벨", f"{d.get('stress_level', 5)}/10")
    m4.metric("번아웃 증상 수", f"{len(d.get('symptoms', []))}/10개")

    if bs > 65:
        st.error("⚠️ 번아웃 고위험 구간입니다. 지금 바로 변화가 필요합니다.")
    elif bs > 40:
        st.warning("⚡ 번아웃 주의 구간입니다. 작은 변화부터 시작하세요.")
    else:
        st.success("✅ 번아웃 리스크가 상대적으로 낮습니다. 성장 전략에 집중하세요.")

    st.markdown("---")
    st.markdown("### 🗺️ 3가지 미래 시나리오")

    # HTML 대신 Streamlit 기본 컴포넌트로 렌더링
    for sc in [sc_a, sc_b, sc_c]:
        if sc["type"] == "error":
            with st.error(sc["title"]):
                for line in sc["lines"]: st.markdown(line)
                st.markdown(f"**💬 {sc['note']}**")
                st.markdown(f"**🏥 건강 리스크: {sc['health_risk']}**")
        elif sc["type"] == "warning":
            with st.warning(sc["title"]):
                for line in sc["lines"]: st.markdown(line)
                st.markdown(f"**💬 {sc['note']}**")
                st.markdown(f"**🏥 건강 리스크: {sc['health_risk']}**")
        else:
            with st.success(sc["title"]):
                for line in sc["lines"]: st.markdown(line)
                st.markdown(f"**💬 {sc['note']}**")
                st.markdown(f"**🏥 건강 리스크: {sc['health_risk']}**")
        st.markdown("<br>", unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("### ✅ 이번 달 액션 플랜")
    with st.container():
        for a in acts:
            st.markdown(a)

    if d.get("additional"):
        st.markdown("---")
        st.info(f'💬 **당신이 남긴 말:** "{d["additional"]}"')

    st.markdown("---")
    st.markdown("### 🤝 다음 단계")
    c1, c2 = st.columns(2)
    with c1:
        st.info("**1:1 코칭 세션 신청**\n\n이 리포트를 들고 코치와 30분 심층 대화를 나눠보세요. 지금은 무료 베타 기간입니다.")
        if st.button("1:1 세션 신청하기", use_container_width=True, type="primary"):
            st.balloons()
            st.success("신청 완료! 48시간 내 연락드립니다.")
    with c2:
        st.info("**처음부터 재진단**\n\n3개월 후 다시 측정해서 변화를 확인하세요.")
        if st.button("재진단하기", use_container_width=True):
            st.session_state.step = 0
            st.session_state.data = {}
            st.rerun()


# ── MAIN ──────────────────────────────────────────────────

def main():
    steps = {0: pg_welcome, 1: pg_s1, 2: pg_s2, 3: pg_s3, 4: pg_s4, 5: pg_report}
    steps[st.session_state.step]()

if __name__ == "__main__":
    main()
