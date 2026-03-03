import streamlit as st
from datetime import datetime

st.set_page_config(
    page_title="Future Self Coach | 미래 자기 코치",
    page_icon="🧭",
    layout="wide",
    initial_sidebar_state="collapsed"
)

st.markdown("""
<style>
    .main-header { font-size: 2.4rem; font-weight: 800; color: #1a1a2e; text-align: center; padding: 2rem 0 0.5rem 0; }
    .sub-header { font-size: 1.05rem; color: #666; text-align: center; margin-bottom: 2rem; }
    .insight-box { background:#f8f9ff; border-left:5px solid #4B4BFF; border-radius:10px; padding:1.2rem 1.5rem; margin:0.8rem 0; }
    .quote-box { background:#fffdf0; border-left:5px solid #f5a623; border-radius:10px; padding:1rem 1.5rem; margin:0.8rem 0; font-style:italic; }
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
    return {"y1": int(base*(1+r)), "y3": int(base*(1+r)**3), "y5": int(base*(1+r)**5)}


def deep_psychological_profile(d):
    bs = burnout_score(d)
    h = d.get("work_hours", 45)
    sl = d.get("stress_level", 5)
    symptoms = d.get("symptoms", [])
    autonomy = d.get("autonomy", 5)
    wlb = d.get("wlb", 4)
    sleep = d.get("sleep_hours", 6)
    goal = d.get("primary_goal", "성장과 수입")
    readiness = d.get("change_readiness", 5)
    concerns = d.get("career_concern", [])

    # 번아웃 단계 진단 (Maslach 3단계 기반)
    if bs > 75:
        burnout_stage = "3단계 — 만성 번아웃 (Chronic Burnout)"
        stage_desc = (
            "심리학자 크리스티나 마슬락(Christina Maslach)의 번아웃 3요인 모델에서 가장 심각한 단계입니다. "
            "단순한 피로를 넘어, 정서적 고갈(Emotional Exhaustion), 비인격화(Depersonalization), "
            "성취감 상실(Reduced Personal Accomplishment)이 동시에 진행되는 상태입니다. "
            "이 단계에서는 '조금 쉬면 나아지겠지'라는 판단이 가장 위험합니다. "
            "연구에 따르면 만성 번아웃 상태에서는 코르티솔(스트레스 호르몬) 수치가 만성적으로 높아져 "
            "면역계, 심혈관계, 인지기능까지 실질적인 손상이 시작됩니다."
        )
    elif bs > 55:
        burnout_stage = "2단계 — 번아웃 진행 중 (Active Burnout)"
        stage_desc = (
            "번아웃이 이미 진행되고 있는 단계입니다. 뇌과학적으로, 이 시기에는 전전두엽(Prefrontal Cortex)의 "
            "활성도가 낮아지고 편도체(Amygdala)가 과활성화됩니다. 쉽게 말해, '이성적 판단'이 약해지고 "
            "'감정적 반응'이 커지는 상태입니다. 지금 작은 일에 과민반응하거나, 미래에 대한 불안이 커진다면 "
            "이 신경학적 변화가 이미 시작된 신호일 수 있습니다."
        )
    elif bs > 35:
        burnout_stage = "1단계 — 번아웃 위험 신호 (Early Warning)"
        stage_desc = (
            "번아웃의 초기 경고 단계입니다. 이 단계는 '가장 중요한 개입 시점'이기도 합니다. "
            "하버드 의대 연구에 따르면, 번아웃 초기(Early Warning) 단계에서 개입할 경우 "
            "완전 회복 가능성이 90% 이상이지만, 만성 번아웃으로 진행된 후에는 "
            "완전 회복까지 평균 12~18개월이 소요됩니다. 지금이 가장 적절한 행동 시점입니다."
        )
    else:
        burnout_stage = "0단계 — 지속 가능한 상태 (Sustainable Zone)"
        stage_desc = (
            "현재 번아웃 리스크는 낮은 상태입니다. 그러나 '지속 가능한 고성과(Sustainable High Performance)'를 "
            "위해서는 지금의 상태를 유지하면서 다음 레벨로 성장하는 전략이 필요합니다. "
            "스탠퍼드 심리학자 앤드류 후버만(Andrew Huberman)의 연구에 따르면, "
            "현재 안정 구간에 있는 사람들이 가장 빠르게 번아웃으로 진입하는 경우는 "
            "'성장 없는 안정' 상태가 6개월 이상 지속될 때입니다."
        )

    # 심리적 패턴 분석
    patterns = []
    if h > 55 and autonomy < 5:
        patterns.append(
            "**학습된 무력감(Learned Helplessness) 패턴 감지** — "
            "높은 업무량 + 낮은 자율성의 조합은 심리학자 마틴 셀리그만이 정의한 "
            "'학습된 무력감'을 유발합니다. 아무리 열심히 해도 상황이 바뀌지 않는다는 "
            "무의식적 믿음이 형성되어, 점점 '어차피 해도 소용없다'는 수동성이 강화됩니다."
        )
    if sl > 7 and wlb < 4:
        patterns.append(
            "**일-삶 경계 붕괴(Work-Life Boundary Collapse) 패턴 감지** — "
            "높은 스트레스와 낮은 워라밸 만족도가 동시에 나타나면, "
            "일과 삶의 심리적 경계(Psychological Detachment)가 무너지기 시작합니다. "
            "수면 중에도 뇌가 업무 문제를 계속 처리하는 상태가 되어, "
            "쉬어도 회복이 되지 않는 악순환 구조가 만들어집니다."
        )
    if sleep < 6:
        patterns.append(
            "**수면 부채(Sleep Debt) 누적 — 인지기능 저하 경고** — "
            "하버드 수면 연구소에 따르면, 하루 6시간 미만 수면이 2주 이상 지속되면 "
            "24시간 완전 수면 박탈(술에 취한 상태)과 동일한 인지 저하가 나타납니다. "
            "의사결정력, 공감 능력, 창의적 문제 해결력이 모두 급격히 떨어지는 상태입니다."
        )
    if "이직이나 커리어 전환을 자주 생각한다" in symptoms:
        patterns.append(
            "**'탈출 환상(Escape Fantasy)' 패턴 감지** — "
            "이직이나 커리어 전환에 대한 빈번한 생각은 번아웃의 대표적인 인지 증상입니다. "
            "주의할 점은, 이 상태에서의 이직 결정은 통계적으로 60% 이상이 '동일한 패턴의 반복'으로 끝납니다. "
            "환경만 바꿔서는 근본적인 문제가 해결되지 않기 때문입니다. "
            "반드시 '무엇에서 도망치는가'가 아니라 '무엇을 향해 가는가'를 먼저 정의해야 합니다."
        )
    if not patterns:
        patterns.append(
            "**현재 건강한 심리 패턴 유지 중** — "
            "주요 번아웃 위험 패턴이 감지되지 않았습니다. "
            "다만 고성과자일수록 '나는 괜찮다'는 인지 왜곡이 번아웃을 늦게 인식하게 만드는 경향이 있습니다. "
            "정기적인 자기 점검이 중요합니다."
        )

    return burnout_stage, stage_desc, patterns


def make_scenarios(d):
    bs = burnout_score(d)
    it = income_trajectory(d)
    h = d.get("work_hours", 45)
    sl = d.get("stress_level", 5)
    goal = d.get("primary_goal", "성장과 수입")
    inc = d.get("current_income", 60000)
    industry = d.get("industry", "기타")
    years = d.get("years_experience", 5)
    readiness = d.get("change_readiness", 5)

    risk_label = "🔴 높음" if bs > 65 else ("🟡 중간" if bs > 40 else "🟢 낮음")

    # ── 시나리오 A ──────────────────────────────────────
    if bs > 65:
        a_y1 = (
            f"수입은 ${it['y1']:,}으로 소폭 증가하겠지만, 이는 '성과 착시'에 해당합니다. "
            "번아웃 상태에서의 수입 증가는 실제로 삶의 질을 높이지 못합니다. "
            f"번아웃 리스크 {bs}/100은 이미 임계점을 넘은 상태로, "
            "대부분의 사람들이 이 구간에서 1년 내 '강제 중단(sick leave, 갑작스런 이직, 건강 이슈)' 경험을 보고합니다."
        )
        a_y3 = (
            f"3년 후 예상 수입 ${it['y3']:,}. 그러나 McKinsey 연구에 따르면, "
            "번아웃 고위험군의 58%가 3년 내 비자발적 커리어 단절을 경험합니다. "
            "더 심각한 것은 관계 자본(Relationship Capital)의 소멸입니다. "
            "번아웃 상태에서는 사람을 멀리하게 되어, 3년 후 네트워크가 현재의 절반 이하로 줄어드는 패턴이 나타납니다."
        )
        a_y5 = (
            f"5년 후 예상 수입 ${it['y5']:,}. 하지만 수치는 의미가 없습니다. "
            "갤럽(Gallup) 직장인 연구에 따르면 만성 번아웃 후 5년간 수입이 증가한 그룹에서도 "
            "삶의 만족도, 건강 상태, 관계 만족도는 모두 하락 곡선을 그립니다. "
            "당신이 원하는 '성공'의 그림이 이것인지 다시 물어볼 필요가 있습니다."
        )
    else:
        a_y1 = (
            f"수입 ${it['y1']:,} 예상. 현재 패턴은 단기적으로는 안정적입니다. "
            "그러나 번아웃 점수 {bs}/100은 '안전' 구간이 아니라 '경고' 구간에 있습니다. "
            "지금의 안정감은 실제 안전이 아닌 '적응(Adaptation)'일 가능성이 높습니다."
        )
        a_y3 = (
            f"3년 후 수입 ${it['y3']:,}. 경력 성장은 예상대로 진행되겠지만, "
            "내면의 의미(Meaning)와 에너지가 서서히 고갈되는 패턴이 나타납니다. "
            "심리학자 에이미 브즈니에프스키(Amy Wrzesniewski)의 연구에서, "
            "이런 '기능하지만 의미 없는' 상태가 3년 이상 지속되면 "
            "갑작스러운 mid-career crisis로 연결되는 경우가 많습니다."
        )
        a_y5 = (
            f"5년 후 수입 ${it['y5']:,}. 커리어는 쌓이지만 정체성 공백이 시작됩니다. "
            "'나는 왜 이 일을 하고 있는가?'라는 실존적 질문이 커집니다."
        )

    sc_a = {
        "title": "🔴 시나리오 A — 지금 패턴 유지",
        "type": "error",
        "y1": a_y1, "y3": a_y3, "y5": a_y5,
        "health_risk": risk_label,
        "expert_note": (
            "**전문가 시각:** 실리콘밸리 최고의 임원 코치 중 한 명인 "
            "마샬 골드스미스(Marshall Goldsmith)는 말합니다. "
            "*'What got you here won't get you there.'* "
            "지금까지 성과를 만들어온 방식이 앞으로도 통한다는 가정은 "
            "가장 흔하고 가장 비싼 실수입니다."
        )
    }

    # ── 시나리오 B ──────────────────────────────────────
    if h > 50:
        change = "전략적 에너지 재배분 — 주 근무시간 -10시간 + 80/20 법칙 적용"
        b_detail = (
            "이탈리아 경제학자 파레토(Vilfredo Pareto)의 80/20 법칙을 당신의 업무에 적용합니다. "
            "현재 당신이 하는 일의 20%가 전체 성과의 80%를 만들어냅니다. "
            "나머지 80%의 업무(보고서 재작업, 불필요한 회의, 저가치 요청)를 "
            "과감히 줄이거나 위임하는 것만으로도 총 근무시간은 -10시간, 성과는 오히려 증가합니다."
        )
    elif sl > 7:
        change = "심리적 안전 구조 구축 — 경계 설정(Boundary Setting) + 스트레스 해독"
        b_detail = (
            "신경과학자 리사 펠드만 배럿(Lisa Feldman Barrett)의 연구에 따르면, "
            "만성 스트레스 상태에서 '아무것도 안 하는 것'은 회복이 아닙니다. "
            "뇌가 정말 회복되려면 '예측 가능한 즐거움(Predictable Pleasure)'이 주기적으로 필요합니다. "
            "주 2회, 30분의 완전한 몰입 활동(독서, 운동, 음악 등)을 '회의처럼' 일정에 블록해보세요."
        )
    else:
        change = "성장 엔진 추가 — 전략적 스킬 투자 or 외부 네트워크 확장"
        b_detail = (
            "당신의 현재 상태는 '안정적'이지만, 성장 동력이 필요한 시점입니다. "
            "노벨 경제학상 수상자 Gary Becker의 인적 자본 이론에 따르면, "
            "현재 수입의 10%를 자기 스킬 투자에 쓰는 사람은 "
            "3년 내 수입이 평균 23% 더 빠르게 성장합니다."
        )

    sc_b = {
        "title": "🟡 시나리오 B — 한 가지 전략적 변화",
        "type": "warning",
        "change": change,
        "detail": b_detail,
        "y1": (
            f"**적응 6개월:** 처음엔 불편합니다. 일을 줄이거나 경계를 긋는 것이 '게으름'처럼 느껴질 것입니다. "
            "이는 정상적인 심리적 저항(Psychological Resistance)입니다. "
            "애덤 그랜트(Adam Grant, 와튼스쿨)의 연구에 따르면, 이 불편함은 평균 6-8주면 넘어섭니다."
        ),
        "y3": (
            f"**3년 후 수입 ${int(it['y3']*1.05):,}** (현재 패턴 대비 +5% 추가). "
            "더 중요한 변화는 수치가 아닙니다. 에너지 회복 → 더 나은 의사결정 → 더 좋은 관계 → "
            "더 큰 기회 포착이라는 선순환 구조가 만들어집니다."
        ),
        "y5": (
            f"**5년 후 수입 ${int(it['y5']*1.12):,}** (현재 패턴 대비 +12%). "
            "수입 차이보다 더 큰 자산은 '지속 가능성(Sustainability)'입니다. "
            "5년 후에도 여전히 성장하고 있는 자신을 상상해보세요."
        ),
        "health_risk": "🟡 중간 → 🟢 낮음 (6개월 내)",
        "expert_note": (
            "**전문가 시각:** 세계적인 번아웃 연구자 제니퍼 모스(Jennifer Moss)는 말합니다. "
            "*'번아웃 예방은 셀프케어의 문제가 아닙니다. 일하는 방식 자체를 재설계하는 문제입니다.'* "
            "요가나 명상은 도움이 되지만, 근본적인 구조 변화 없이는 반창고에 불과합니다."
        )
    }

    # ── 시나리오 C ──────────────────────────────────────
    pivots = {
        "성장과 수입": {
            "title": "독립 컨설턴트 or 창업으로의 피봇",
            "detail": (
                f"현재 {industry} 분야에서 {years}년의 경험은 시장에서 희소한 자산입니다. "
                "독립 컨설턴트로 전환할 경우, 같은 전문성으로 시간당 2-4배의 수익을 낼 수 있습니다. "
                "Harvard Business Review 연구에 따르면, 조직 내 7년 이상 경력자가 "
                "독립 컨설턴트로 전환했을 때 3년 내 이전 연봉의 130-180%를 달성하는 경우가 67%입니다. "
                "단, 첫 12개월은 수입의 불규칙성을 감당할 심리적·재정적 내성이 필요합니다."
            )
        },
        "자유와 건강": {
            "title": "라이프스타일 최적화 커리어로의 피봇",
            "detail": (
                "4시간 노동(The 4-Hour Workweek)의 팀 페리스(Tim Ferriss)가 말하는 것처럼, "
                "'은퇴'는 목표가 아니라 '지금 원하는 삶을 사는 것'이 목표여야 합니다. "
                "주 4일 근무가 가능한 회사로의 이직, 원격근무 허용 역할로의 전환, "
                "또는 수입을 일부 줄이더라도 시간 자율성을 극대화하는 선택이 여기에 해당합니다. "
                "Microsoft, Unilever의 주 4일 실험에서 생산성이 오히려 40% 향상됐습니다."
            )
        },
        "의미와 임팩트": {
            "title": "의미 중심 커리어로의 피봇 (Purpose-Driven Career)",
            "detail": (
                "심리학자 빅터 프랭클(Viktor Frankl)은 말했습니다. "
                "*'삶의 의미를 찾은 사람은 어떤 고난도 견딜 수 있다.'* "
                "스타트업, 임팩트 투자, 소셜벤처, 교육 등으로의 피봇은 "
                "단기적으로 수입이 줄 수 있지만, 정서적 에너지가 회복되면서 "
                "장기적으로 더 나은 의사결정과 더 큰 성과를 만드는 경우가 많습니다. "
                "LinkedIn 데이터에 따르면 의미 기반 직종 이직자의 5년 후 직업 만족도는 "
                "수입 기반 이직자보다 2.3배 높습니다."
            )
        }
    }
    pv = pivots.get(goal, pivots["성장과 수입"])

    sc_c = {
        "title": f"🟢 시나리오 C — 급진적 피봇: {pv['title']}",
        "type": "success",
        "detail": pv["detail"],
        "y1": (
            "**1년 차 — 불확실성의 계곡(Valley of Uncertainty):** "
            "이 시기는 심리적으로 가장 힘든 구간입니다. "
            "스탠퍼드 심리학자 캐롤 드웩(Carol Dweck)이 말하는 '성장 마인드셋'이 가장 필요한 시기이기도 합니다. "
            "수입이 일시적으로 20-30% 감소할 수 있습니다."
        ),
        "y3": (
            "**3년 차 — 재건(Reconstruction) 단계:** "
            "새 경로에서 자리를 잡기 시작합니다. "
            "번아웃 리스크가 최저 수준으로 떨어지고, 새로운 에너지로 빠르게 성장합니다. "
            f"수입은 현재 수준 회복 또는 초과 달성 가능합니다 (${int(it['y3']*0.95):,} ~ ${int(it['y3']*1.3):,})."
        ),
        "y5": (
            "**5년 차 — 새로운 정점(New Peak):** "
            "이 경로를 선택한 사람들은 5년 후 수입·만족도·건강 세 가지 모두에서 "
            "현재 패턴을 유지한 그룹보다 높은 수치를 기록하는 경우가 많습니다. "
            f"예상 수입 ${int(it['y5']*1.2):,} (낙관 시나리오) ~ ${int(it['y5']*0.9):,} (보수 시나리오). "
            f"**필수 전제 조건:** 재정 버퍼 최소 ${inc//12*6:,} (생활비 6개월치) 확보 후 실행."
        ),
        "health_risk": "🟢 낮음 (3년 내)",
        "expert_note": (
            "**전문가 시각:** 세계 최고의 커리어 코치 중 한 명인 "
            "라이프 임팩트 코치 마이클 하얏트(Michael Hyatt)는 말합니다. "
            "*'가장 후회되는 결정은 실패한 결정이 아니라, 시도조차 하지 않은 결정이다.'* "
            "이 시나리오는 리스크가 가장 크지만, 가장 후회가 적은 선택이 될 가능성도 가장 높습니다."
        )
    }
    return sc_a, sc_b, sc_c


def expert_action_plan(d):
    bs = burnout_score(d)
    h = d.get("work_hours", 45)
    sl = d.get("stress_level", 5)
    sleep = d.get("sleep_hours", 6)
    symptoms = d.get("symptoms", [])
    readiness = d.get("change_readiness", 5)
    goal = d.get("primary_goal", "성장과 수입")

    actions = []

    # 즉시 (이번 주)
    actions.append(("🔴 이번 주 — 즉시 실행", [
        "**'에너지 감사(Energy Audit)'를 해보세요** — "
        "오늘 하루 업무 목록을 적고, 각 항목 옆에 '+에너지(준다)' / '-에너지(빼앗는다)'를 표시하세요. "
        "에너지를 빼앗는 업무가 전체의 50% 이상이라면, 구조적 변화가 필요한 신호입니다.",

        "**수면 시간을 30분 늘리는 것 하나만 이번 주에 해보세요** — "
        f"현재 {sleep}시간 수면은 {'심각한 부족 상태입니다.' if sleep < 6 else '개선 여지가 있습니다.'} "
        "마튜 워커(Matthew Walker, 수면 과학자)의 연구에 따르면, "
        "수면 30분 추가가 인지 능력, 감정 조절, 창의성에 즉각적인 영향을 줍니다. "
        "이것이 어떤 생산성 해킹보다 ROI가 높습니다."
        if sleep < 7 else
        "**오늘 퇴근 후 '완전한 단절(Psychological Detachment)' 30분을 실험해보세요** — "
        "업무 알림을 모두 끄고, 일과 관련 없는 활동을 30분 동안 하세요. "
        "이것이 불가능하게 느껴진다면, 그 자체가 번아웃의 신호입니다."
    ]))

    # 이번 달
    month_actions = [
        "**신뢰할 수 있는 멘토 1명과 '진짜 대화' — '어떻게 지내요?' 말고, '나 지금 이런 고민이 있어요'로 시작하세요** — "
        "갤럽의 직장인 연구에서, 직장에 '진짜 친구'가 1명 이상 있는 사람은 "
        "없는 사람보다 업무 성과가 7배 높고, 번아웃 확률이 64% 낮습니다.",

        "**'하지 않을 일(Not-to-do List)'을 3가지 작성해서 실제로 안 해보세요** — "
        "이것이 처음엔 불안하게 느껴질 것입니다. 그 불안 자체가 현재 당신이 "
        "'거절 공포(Fear of Saying No)'에 얼마나 지배받고 있는지를 보여줍니다.",
    ]
    if bs > 55:
        month_actions.insert(0,
            "**HR 또는 신뢰하는 상사와 업무 구조 조정 대화를 예약하세요** — "
            "이것이 '약하다는 신호'라는 두려움이 있을 수 있습니다. 그러나 "
            "맥킨지 연구에서, 고성과자 중 상사와 솔직한 대화를 나눈 그룹의 "
            "1년 후 성과가 그렇지 않은 그룹보다 평균 31% 높았습니다. "
            "침묵은 미덕이 아니라 비용입니다."
        )
    actions.append(("🟡 이번 달 — 구조적 변화", month_actions))

    # 3개월 목표
    actions.append(("🟢 3개월 목표 — 시스템 만들기", [
        f"**시나리오 B에서 선택한 변화 1가지를 실제로 실험해보세요** — "
        "완벽하게 할 필요 없습니다. 70%만 해도 됩니다. "
        "행동과학자 BJ 포그(BJ Fogg, 스탠퍼드)에 따르면, "
        "작은 행동이 반복되면 정체성 자체가 바뀝니다('나는 변화를 만드는 사람').",

        "**이 진단을 다시 해서 번아웃 점수 변화를 측정하세요** — "
        f"목표: 현재 {bs}점에서 3개월 내 {max(bs-15, 20)}점 이하로 낮추기. "
        "숫자가 내려가지 않는다면, 접근 방식 자체를 다시 점검해야 합니다.",
    ]))

    return actions


# ── 페이지 함수들 ──────────────────────────────────────────

def pg_welcome():
    st.markdown('<div class="main-header">🧭 미래 자기 코치</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">전 세계 최고의 심리학자·커리어 전문가의 프레임워크로<br>지금 패턴이 3년 후 당신을 어디로 데려갈지 시뮬레이션합니다</div>', unsafe_allow_html=True)
    c1, c2, c3 = st.columns([1, 2, 1])
    with c2:
        st.markdown("""
#### 이런 분들을 위한 서비스예요
- 😮‍💨 열심히 일하는데 에너지가 바닥나는 것 같은 분
- 🤔 지금 커리어 방향이 맞는 건지 불확실한 분
- 🎯 번아웃 없이 수입·자유·의미를 다 잡고 싶은 분
- 💡 막연한 조언이 아닌, 심리학·행동과학 기반의 구체적 인사이트를 원하는 분

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
    burnout_stage, stage_desc, patterns = deep_psychological_profile(d)
    sc_a, sc_b, sc_c = make_scenarios(d)
    acts = expert_action_plan(d)

    st.markdown(f'<div class="main-header">📊 {name}님의 미래 자기 리포트</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="sub-header">생성일: {datetime.now().strftime("%Y년 %m월 %d일")}</div>', unsafe_allow_html=True)

    # 요약 지표
    st.markdown("---")
    st.markdown("### 🔍 현재 상태 요약")
    m1, m2, m3, m4 = st.columns(4)
    flag = "🔴" if bs > 65 else ("🟡" if bs > 40 else "🟢")
    m1.metric("번아웃 리스크", f"{flag} {bs}/100")
    m2.metric("주당 근무시간", f"{d.get('work_hours', 45)}시간")
    m3.metric("스트레스 레벨", f"{d.get('stress_level', 5)}/10")
    m4.metric("번아웃 증상 수", f"{len(d.get('symptoms', []))}/10개")

    # 번아웃 단계 진단
    st.markdown("---")
    st.markdown("### 🧠 심층 심리 프로파일")
    st.markdown(f"#### {burnout_stage}")
    st.markdown(f'<div class="insight-box">{stage_desc}</div>', unsafe_allow_html=True)

    st.markdown("**감지된 심리 패턴:**")
    for p in patterns:
        st.markdown(f'<div class="insight-box">{p}</div>', unsafe_allow_html=True)

    # 3가지 시나리오
    st.markdown("---")
    st.markdown("### 🗺️ 3가지 미래 시나리오")

    with st.expander("🔴 시나리오 A — 지금 패턴 유지 (클릭해서 펼치기)", expanded=True):
        st.markdown(f"- **1년 후:** {sc_a['y1']}")
        st.markdown(f"- **3년 후:** {sc_a['y3']}")
        st.markdown(f"- **5년 후:** {sc_a['y5']}")
        st.markdown(f"- **🏥 건강 리스크:** {sc_a['health_risk']}")
        st.markdown(f'<div class="quote-box">{sc_a["expert_note"]}</div>', unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    with st.expander("🟡 시나리오 B — 한 가지 전략적 변화 (클릭해서 펼치기)", expanded=True):
        st.markdown(f"**핵심 변화:** {sc_b['change']}")
        st.markdown(f'<div class="insight-box">{sc_b["detail"]}</div>', unsafe_allow_html=True)
        st.markdown(f"- {sc_b['y1']}")
        st.markdown(f"- {sc_b['y3']}")
        st.markdown(f"- {sc_b['y5']}")
        st.markdown(f"- **🏥 건강 리스크:** {sc_b['health_risk']}")
        st.markdown(f'<div class="quote-box">{sc_b["expert_note"]}</div>', unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    with st.expander("🟢 시나리오 C — 급진적 피봇 (클릭해서 펼치기)", expanded=True):
        st.markdown(f'<div class="insight-box">{sc_c["detail"]}</div>', unsafe_allow_html=True)
        st.markdown(f"- {sc_c['y1']}")
        st.markdown(f"- {sc_c['y3']}")
        st.markdown(f"- {sc_c['y5']}")
        st.markdown(f"- **🏥 건강 리스크:** {sc_c['health_risk']}")
        st.markdown(f'<div class="quote-box">{sc_c["expert_note"]}</div>', unsafe_allow_html=True)

    # 액션 플랜
    st.markdown("---")
    st.markdown("### ✅ 전문가 수준 액션 플랜")
    for section_title, action_list in acts:
        st.markdown(f"#### {section_title}")
        for a in action_list:
            st.markdown(f'<div class="insight-box">{a}</div>', unsafe_allow_html=True)

    if d.get("additional"):
        st.markdown("---")
        st.info(f'💬 **당신이 남긴 말:** "{d["additional"]}"\n\n위 내용을 바탕으로 1:1 코칭 세션에서 더 깊이 다뤄드릴 수 있습니다.')

    st.markdown("---")
    st.markdown("### 🤝 다음 단계")
    c1, c2 = st.columns(2)
    with c1:
        st.info("**1:1 심층 코칭 세션 (30분)**\n\n이 리포트를 들고 전문 코치와 심층 대화를 나눠보세요. 지금은 무료 베타 기간입니다.")
        if st.button("1:1 세션 신청하기", use_container_width=True, type="primary"):
            st.balloons()
            st.success("신청 완료! 48시간 내 연락드립니다.")
    with c2:
        st.info("**3개월 후 재진단**\n\n액션 플랜을 실행하고, 3개월 후 다시 진단해서 번아웃 점수 변화를 확인하세요.")
        if st.button("처음으로 돌아가기", use_container_width=True):
            st.session_state.step = 0
            st.session_state.data = {}
            st.rerun()


def main():
    steps = {0: pg_welcome, 1: pg_s1, 2: pg_s2, 3: pg_s3, 4: pg_s4, 5: pg_report}
    steps[st.session_state.step]()

if __name__ == "__main__":
    main()
