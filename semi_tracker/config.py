"""지표 정의·임계값·대상 종목 등 트래커 설정.

표 "8.4 국면을 확인하는 지표"의 열(어디서 보나 / 해석 / 선행·동행)을 그대로 메타데이터로 보존한다.
임계값은 THRESHOLDS 에 모아 두어 대시보드·테스트에서 같은 값을 쓴다.
"""
from __future__ import annotations

import os

# ── 접속 설정 ──────────────────────────────────────────────────────────
# SEC EDGAR 는 연락처가 포함된 User-Agent 를 요구한다. 환경변수로 넣어 주세요.
CONTACT_EMAIL = os.environ.get("TRACKER_CONTACT_EMAIL", "tracker@example.com")
DART_API_KEY = os.environ.get("DART_API_KEY", "")
REQUEST_TIMEOUT = 25

# ── 대상 기업 ──────────────────────────────────────────────────────────
KR_STOCKS = {
    "005930": "삼성전자",
    "000660": "SK하이닉스",
}
# DART 고유번호(corp_code). 변경 시 data/cache/dart_corp_codes.json 로 자동 재해석됨.
DART_CORP_CODES = {
    "005930": "00126380",  # 삼성전자
    "000660": "00164779",  # SK하이닉스
}
SEC_CIK = {
    "MU": 723125,     # Micron Technology
    "NVDA": 1045810,  # NVIDIA
}
# 장비 수주 공시(단일판매·공급계약) 감시 대상 — KRX 종목코드: 이름
EQUIPMENT_STOCKS = {
    "042700": "한미반도체",
    "036930": "주성엔지니어링",
    "240810": "원익IPS",
    "319660": "피에스케이",
    "084370": "유진테크",
    "095610": "테스",
    "039030": "이오테크닉스",
    "403870": "HPSP",
    "003160": "디아이",
    "281820": "케이씨텍",
    "039440": "에스티아이",
    "079370": "제우스",
    "089030": "테크윙",
    "348210": "넥스틴",
    "092870": "엑시콘",
}

# DRAMeXchange 현물/고정가 제품 키 매핑 (정규식 → 시리즈 키)
PRODUCT_PATTERNS = [
    (r"DDR5\s*16\s*G", "dram_ddr5_16gb"),
    (r"DDR4\s*16\s*Gb", "dram_ddr4_16gb"),
    (r"DDR4\s*8\s*Gb", "dram_ddr4_8gb"),
    (r"DDR3\s*4\s*Gb", "dram_ddr3_4gb"),
    (r"512\s*Gb\s*TLC", "nand_512gb_tlc"),
    (r"256\s*Gb\s*TLC", "nand_256gb_tlc"),
    (r"1\s*Tb\s*TLC", "nand_1tb_tlc"),
    (r"64\s*Gb\s*MLC", "nand_64gb_mlc"),
]
PRIMARY_DRAM_PRODUCT = "dram_ddr4_8gb"   # 현물 vs 고정가 비교 기준 제품
PRIMARY_NAND_PRODUCT = "nand_512gb_tlc"

# ── 판정 임계값 ────────────────────────────────────────────────────────
THRESHOLDS = {
    "contract_decel_pp": 0.5,        # 상승률 둔화로 보는 전월 대비 상승률 감소폭(%p)
    "spot_vs_contract_pct": 5.0,     # 현물-고정가 괴리 판단 기준(%)
    "spot_1m_change_pct": 3.0,       # 현물가 1개월 변동 판단 기준(%)
    "inventory_normal_max_weeks": 6, # 정상 재고 상한(주)
    "inventory_bear_weeks": 10,      # 가격 하락 국면 기준(주)
    "dio_vs_median_pct": 15.0,       # 공급사 재고일수 vs 8분기 중앙값 괴리(%)
    "guidance_qoq_pct": 5.0,         # 가이던스 중간값 vs 직전 실적 QoQ 판단 기준(%)
    "tsmc_strong_yoy_pct": 20.0,     # TSMC 월매출 YoY 강세 기준(%)
    "capex_yoy_surge_pct": 30.0,
    "capex_yoy_cut_pct": -20.0,
    "foreign_window_days": 20,       # 외국인 누적 순매수 창(거래일)
    "fx_window_days": 20,
    "fx_change_pct": 2.0,            # 원/달러 20일 변동 판단 기준(%)
    "pbr_low": 1.2,
    "pbr_high": 2.0,
    "stale_days_daily": 7,           # 일별 지표 신선도 한계(일)
    "stale_days_monthly": 45,
    "stale_days_quarterly": 120,
}

PHASES = {
    1: "① 바닥·회복",
    2: "② 상승·확장",
    3: "③ 고점·과열",
    4: "④ 하강·침체",
}
PHASE_GUIDE = {
    1: "현물가 선행 반등·재고 정상화·외국인 순매수 전환이 겹치면 다음 분기 고정가 상승 전환을 확인하세요.",
    2: "고정가 상승률이 둔화되기 시작하는지, 엔비디아 데이터센터 성장률이 꺾이는지가 다음 경계선입니다.",
    3: "현물가가 고정가 아래로 내려가는지, CAPEX 증액 발표가 몰리는지, 외국인 20일 누적이 순매도로 바뀌는지를 봅니다.",
    4: "재고 주수의 정상(4~6주) 복귀와 낙폭 축소가 반등 조건입니다. P/B 저점 구간 진입 여부를 참고하세요.",
}

# ── 지표 메타데이터 (표 원문 보존) ─────────────────────────────────────
INDICATORS = [
    {
        "key": "contract_price",
        "name": "DRAM·NAND 고정거래가격",
        "where": "트렌드포스(DRAMeXchange) 매월 말 발표, 증권사 데일리",
        "interpretation": "전월 대비 상승 전환이 업사이클 시작 신호. 상승률 둔화가 고점 경고.",
        "lead_lag": "동행 (주가는 1~2분기 선행)",
        "cadence": "monthly",
        "auto": "수동 (DRAMeXchange 고정가 페이지는 회원 전용 → manual_inputs.yaml 에 월별 입력, 공개 표가 열리면 자동 전환)",
        "links": ["https://www.dramexchange.com/", "https://www.trendforce.com/presscenter/news"],
    },
    {
        "key": "spot_price",
        "name": "현물가격 (spot)",
        "where": "DRAMeXchange, 증권사 리포트",
        "interpretation": "고정가보다 먼저 움직인다. 현물가가 고정가 아래로 내려가면 고정가 하락 예고.",
        "lead_lag": "선행 1~3개월",
        "cadence": "daily",
        "auto": "자동 (DRAMeXchange 공개 현물가 표)",
        "links": ["https://www.dramexchange.com/"],
    },
    {
        "key": "inventory_weeks",
        "name": "재고 주수",
        "where": "삼성·하이닉스·마이크론 실적 발표, 고객(서버·PC) 재고 코멘트",
        "interpretation": "정상 4~6주. 10주 이상이면 가격 하락 국면, 정상 복귀가 반등 조건.",
        "lead_lag": "동행",
        "cadence": "quarterly",
        "auto": "혼합 (고객 재고 주수는 수동, 공급사 재고일수는 DART·EDGAR 재무제표로 자동 계산)",
        "links": ["https://opendart.fss.or.kr/", "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000723125"],
    },
    {
        "key": "micron",
        "name": "마이크론 실적·가이던스",
        "where": "분기 실적 (12·3·6·9월), 국내 발표보다 먼저",
        "interpretation": "마이크론의 가격·비트 출하 전망이 국내 대형주 실적의 미리보기.",
        "lead_lag": "선행 1개월",
        "cadence": "quarterly",
        "auto": "혼합 (실적은 SEC XBRL 자동, 가이던스는 수동)",
        "links": ["https://investors.micron.com/"],
    },
    {
        "key": "nvidia_tsmc",
        "name": "엔비디아 실적·CoWoS 캐파",
        "where": "분기 실적 (2·5·8·11월), TSMC 월 매출",
        "interpretation": "HBM 수요의 원천. 데이터센터 매출 증가율 둔화가 HBM 밸류체인 고점 신호.",
        "lead_lag": "선행 1~2분기",
        "cadence": "quarterly",
        "auto": "혼합 (엔비디아 총매출은 SEC XBRL, TSMC 월매출은 TWSE OpenAPI 자동 · 데이터센터 매출·CoWoS 캐파는 수동)",
        "links": ["https://investor.nvidia.com/", "https://investor.tsmc.com/english/monthly-revenue"],
    },
    {
        "key": "capex",
        "name": "CAPEX 가이던스",
        "where": "삼성·하이닉스 실적 발표(1·4·7·10월), 연초 투자 계획",
        "interpretation": "증액은 장비주 호재이나 사이클 후반의 대규모 증설은 과잉의 씨앗(국면 ②→③).",
        "lead_lag": "장비주에 선행 2~4분기",
        "cadence": "quarterly",
        "auto": "혼합 (실제 집행액은 DART·EDGAR 자동, 가이던스 방향은 수동)",
        "links": ["https://opendart.fss.or.kr/"],
    },
    {
        "key": "equipment_orders",
        "name": "장비 수주 공시",
        "where": "DART 단일판매·공급계약 공시",
        "interpretation": "장비주 실적 확정 신호. 주가는 대개 발표 전에 반영되어 공시일에 차익실현이 흔함.",
        "lead_lag": "동행~후행",
        "cadence": "daily",
        "auto": "자동 (DART 공시 목록 API, DART_API_KEY 필요)",
        "links": ["https://dart.fss.or.kr/"],
    },
    {
        "key": "foreign_flow",
        "name": "외국인 순매수",
        "where": "KRX 투자자별 매매, 일별",
        "interpretation": "삼성전자·하이닉스는 외국인 방향이 곧 주가 방향. 20일 누적 순매도 전환은 경계 신호.",
        "lead_lag": "동행",
        "cadence": "daily",
        "auto": "자동 (네이버 증권 모바일 JSON API: /api/stock/{code}/trend)",
        "links": ["https://finance.naver.com/item/frgn.naver?code=005930", "https://finance.naver.com/item/frgn.naver?code=000660"],
    },
    {
        "key": "usdkrw",
        "name": "원/달러 환율",
        "where": "일별",
        "interpretation": "원화 약세는 수출 이익에 플러스이나 외국인 자금 이탈과 겹치면 주가에는 마이너스.",
        "lead_lag": "동행",
        "cadence": "daily",
        "auto": "자동 (Frankfurter/ECB → 네이버 환율 JSON 순으로 시도)",
        "links": ["https://finance.naver.com/marketindex/"],
    },
    {
        "key": "pbr",
        "name": "P/B (삼성전자·하이닉스)",
        "where": "증권사 밸류에이션 테이블",
        "interpretation": "과거 사이클 저점 1.0~1.2배, 고점 2.0~2.5배. 2025~26년은 과거 범위를 크게 벗어나 참고치로만.",
        "lead_lag": "—",
        "cadence": "daily",
        "auto": "자동 (네이버 증권 모바일 JSON API: /api/stock/{code}/integration 의 PBR)",
        "links": ["https://finance.naver.com/item/main.naver?code=005930", "https://finance.naver.com/item/main.naver?code=000660"],
    },
]
INDICATOR_BY_KEY = {i["key"]: i for i in INDICATORS}
