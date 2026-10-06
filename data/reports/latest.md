# 반도체 사이클 국면 트래커 — 2026-10-06

**종합 국면: ② 상승·확장** (신뢰도 41%, 지표 8/10개 반영)

② 상승·확장 가능성 41% (지표 8/10개 반영, 상승 성향 -0.04). 주된 근거: 마이크론 실적·가이던스, 엔비디아 실적·CoWoS 캐파, 재고 주수. ③ 전환 경계 신호가 누적되고 있습니다.

> 다음 확인 포인트: 고정가 상승률이 둔화되기 시작하는지, 엔비디아 데이터센터 성장률이 꺾이는지가 다음 경계선입니다.

| 국면 | 투표 합계 |
|---|---|
| ① 바닥·회복 | 0.5 |
| ② 상승·확장 | 2.8 |
| ③ 고점·과열 | 2.1 |
| ④ 하강·침체 | 1.5 |

## 이전 실행 대비 변화

- 첫 실행

## 지표별 판정

| # | 지표 | 현재값 | 판정 | 근거 | 선행/동행 | 기준일 | 상태 |
|---|---|---|---|---|---|---|---|
| 1 | DRAM·NAND 고정거래가격 | 데이터 없음 | ⚫ 데이터 없음 | 고정거래가격 월별 데이터가 2개월 이상 필요합니다. DRAMeXchange 스크랩이 비어 있으면 data/manual_inputs.yaml 의 contract_price 에 월별 값을 입력하세요. | 동행 (주가는 1~2분기 선행) | — | 미수집 |
| 2 | 현물가격 (spot) | DDR4 8GB 현물 $5.95 | ⚪ 중립 | 변동률 계산에는 1주 이상 이력이 필요합니다 (데이터 축적 중) | 선행 1~3개월 | 2026-10-06 | 최신 |
| 3 | 재고 주수 | 고객 재고 미입력 · 마이크론 17.4주(-18% vs 8분기 중앙값) | 🟢 우호 | 공급사 재고일수(재무제표 기준): 마이크론 17.4주(-18% vs 8분기 중앙값) | 동행 | 2026-05-28 | 오래됨 |
| 4 | 마이크론 실적·가이던스 | 매출 $41.46B (QoQ +73.7%) | 🟢 우호 | 매출 QoQ +73.7%, GM 74.4%→84.6% 확대 → 가격·비트 출하 호조 | 선행 1개월 | 2026-05-28 | 오래됨 |
| 5 | 엔비디아 실적·CoWoS 캐파 | NVDA 총매출 $96.2B (QoQ +17.9%) · TSMC 2026-08 YoY +53.3% | 🟡 경계 | 엔비디아 총매출 성장률 둔화 조짐(+19.8%→+17.9%) → 다음 분기 재확인 / TSMC 2026-08 매출 YoY +53.3% → 선단 공정·CoWoS 수요 강세 | 선행 1~2분기 | 2026-07-26 | 최신 |
| 6 | CAPEX 가이던스 | 가이던스 미입력 | ⚪ 중립 | 마이크론 분기 CAPEX 7.8B$ (YoY +166.4%) 급증 | 장비주에 선행 2~4분기 | 2026-05-28 | 오래됨 |
| 7 | 장비 수주 공시 | 데이터 없음 | ⚫ 데이터 없음 | DART_API_KEY 가 없어 공시를 수집하지 못했습니다. | 동행~후행 | — | 미수집 |
| 8 | 외국인 순매수 | 삼성전자 20일 -18,489,897주 · SK하이닉스 20일 -6,292,551주 | 🔴 비우호 | 삼성전자 20일 누적 순매도 지속 -18,489,897주 (-46,921억원) / SK하이닉스 20일 누적 순매도 지속 -6,292,551주 (-111,636억원) | 동행 | 2026-10-02 | 최신 |
| 9 | 원/달러 환율 | USD/KRW 1,344.0 · 20일 -0.3% | ⚪ 중립 | 환율 20일 변동 -0.3% → 중립 | 동행 | 2026-10-05 | 최신 |
| 10 | P/B (삼성전자·하이닉스) | 삼성전자 3.22배 · SK하이닉스 4.89배 | 🟡 경계 | 삼성전자 P/B 3.22배 → 과거 고점(2.0~2.5) 구간 / SK하이닉스 P/B 4.89배 → 과거 고점(2.0~2.5) 구간 / 2025~26년은 과거 범위를 크게 벗어나 참고치로만 사용 | — | 2026-10-06 | 최신 |

## 수동 입력 필요

- **DRAM·NAND 고정거래가격**: TrendForce 월말 고정가 (DRAM·NAND, 최근 2개월 이상)
- **재고 주수**: 고객 재고 주수 (수동)
- **마이크론 실적·가이던스**: 최신 가이던스 (분기 실적 발표 후)
- **엔비디아 실적·CoWoS 캐파**: 엔비디아 데이터센터 매출 (분기, 수동)
- **엔비디아 실적·CoWoS 캐파**: CoWoS 캐파 코멘트 (TrendForce/TSMC)
- **CAPEX 가이던스**: CAPEX 가이던스 방향 (수동)
- **장비 수주 공시**: DART_API_KEY 설정

`data/manual_inputs.yaml` 을 수정한 뒤 커밋하면 다음 실행부터 반영됩니다.

## 반대 신호

- 외국인 순매수 → ④ 하강·침체 (가중치 1.5): 삼성전자 20일 누적 순매도 지속 -18,489,897주 (-46,921억원) / SK하이닉스 20일 누적 순매도 지속 -6,292,551주 (-111,636억원)
- P/B (삼성전자·하이닉스) → ③ 고점·과열 (가중치 1.0): 삼성전자 P/B 3.22배 → 과거 고점(2.0~2.5) 구간 / SK하이닉스 P/B 4.89배 → 과거 고점(2.0~2.5) 구간 / 2025~26년은 과거 범위를 크게 벗어나 참고치로만 사용
- CAPEX 가이던스 → ③ 고점·과열 (가중치 0.5): 마이크론 분기 CAPEX 7.8B$ (YoY +166.4%) 급증

## 다음 발표 일정

| 날짜 | D-day | 이벤트 |
|---|---|---|
| 2026-10-07 (예상) | D-1 | 삼성전자 잠정실적 (7일경) |
| 2026-10-07 | D-1 | DART 단일판매·공급계약 공시 (수시) |
| 2026-10-07 | D-1 | KRX 투자자별 매매 (매 거래일) |
| 2026-10-07 | D-1 | P/B 갱신 (매 거래일) |
| 2026-10-07 | D-1 | DRAMeXchange 현물가 (매 거래일) |
| 2026-10-07 | D-1 | 원/달러 환율 (매 거래일) |
| 2026-10-10 (예상) | D-4 | TSMC 월매출 공시 (10일경) |
| 2026-10-24 (예상) | D-18 | SK하이닉스 실적·CAPEX 코멘트 (하순, 예상) |
| 2026-10-28 (예상) | D-22 | 삼성전자 확정실적·컨콜 (재고 코멘트, 하순) |
| 2026-10-30 (예상) | D-24 | TrendForce 월말 고정거래가격 발표 |
| 2026-11-25 (예상) | D-50 | 엔비디아 분기 실적 (하순, 예상) |
| 2026-12-25 (예상) | D-80 | 마이크론 분기 실적 (하순, 예상) |

## 수집 상태

| 소스 | 결과 | 모드 | 메시지 |
|---|---|---|---|
| dramexchange | OK | auto | 9개 가격 (spot) |
| trendforce_news | OK | auto | 헤드라인 8건 |
| fx | OK | auto | frankfurter 64일 (최근 1344.0) |
| naver_005930 | OK | auto | 순매매 60일, PBR 3.22 |
| naver_000660 | OK | auto | 순매매 60일, PBR 4.89 |
| edgar_micron | OK | auto | 분기 68개 (최근 2026-05-28 매출 $41.46B) |
| edgar_nvidia | OK | auto | 분기 74개 (최근 2026-07-26 $96.2B) |
| mops_tsmc | OK | auto | 2026-08 NT$514.8B (YoY 53.320053714712955%) |
| dart_financials | FAIL | needs_key | DART_API_KEY 미설정 (무료 발급: opendart.fss.or.kr) |
| dart_equipment | FAIL | needs_key | DART_API_KEY 미설정 (무료 발급: opendart.fss.or.kr) |

## TrendForce 관련 헤드라인

- [Wafer Fabrication / Foundry](https://www.trendforce.com/research/wafer-fabrication-foundry)
- [Mobile DRAM Contract Price](https://www.trendforce.com/price/dram/mobileDram_contract)
- [NAND Flash Contract Price](https://www.trendforce.com/price/flash/flash_contract)
- [PC-Client OEM SSD Contract Price](https://www.trendforce.com/price/flash/pcc_oem_ssd_contract)
- [NAND Flash Wafer Contract Price](https://www.trendforce.com/price/flash/wafer_contract)
- [AI Server Demand Sustains Memory Contract Price Increases in 4Q26, While Consumer-Side Pressure Persists, Says TrendForce](https://www.trendforce.com/presscenter/news/20260930-13258.html)
- [HBM Supply Constraints Persist, 2027 Price Outlook Revised Upward with Blended ASP Forecast to Rise 121% YoY, Says TrendForce](https://www.trendforce.com/presscenter/news/20260929-13255.html)
- [DRAM Module Revenue Surges 59% YoY in 2025 as Crowding-Out Effect Constrains Chip Supply and Drives Prices Higher, Says TrendForce](https://www.trendforce.com/presscenter/news/20260922-13249.html)

## 지표 정의 (원문)

| 지표 | 어디서 보나 | 해석 | 선행/동행 | 자동화 |
|---|---|---|---|---|
| DRAM·NAND 고정거래가격 | 트렌드포스(DRAMeXchange) 매월 말 발표, 증권사 데일리 | 전월 대비 상승 전환이 업사이클 시작 신호. 상승률 둔화가 고점 경고. | 동행 (주가는 1~2분기 선행) | 수동 (DRAMeXchange 고정가 페이지는 회원 전용 → manual_inputs.yaml 에 월별 입력, 공개 표가 열리면 자동 전환) |
| 현물가격 (spot) | DRAMeXchange, 증권사 리포트 | 고정가보다 먼저 움직인다. 현물가가 고정가 아래로 내려가면 고정가 하락 예고. | 선행 1~3개월 | 자동 (DRAMeXchange 공개 현물가 표) |
| 재고 주수 | 삼성·하이닉스·마이크론 실적 발표, 고객(서버·PC) 재고 코멘트 | 정상 4~6주. 10주 이상이면 가격 하락 국면, 정상 복귀가 반등 조건. | 동행 | 혼합 (고객 재고 주수는 수동, 공급사 재고일수는 DART·EDGAR 재무제표로 자동 계산) |
| 마이크론 실적·가이던스 | 분기 실적 (12·3·6·9월), 국내 발표보다 먼저 | 마이크론의 가격·비트 출하 전망이 국내 대형주 실적의 미리보기. | 선행 1개월 | 혼합 (실적은 SEC XBRL 자동, 가이던스는 수동) |
| 엔비디아 실적·CoWoS 캐파 | 분기 실적 (2·5·8·11월), TSMC 월 매출 | HBM 수요의 원천. 데이터센터 매출 증가율 둔화가 HBM 밸류체인 고점 신호. | 선행 1~2분기 | 혼합 (엔비디아 총매출은 SEC XBRL, TSMC 월매출은 TWSE OpenAPI 자동 · 데이터센터 매출·CoWoS 캐파는 수동) |
| CAPEX 가이던스 | 삼성·하이닉스 실적 발표(1·4·7·10월), 연초 투자 계획 | 증액은 장비주 호재이나 사이클 후반의 대규모 증설은 과잉의 씨앗(국면 ②→③). | 장비주에 선행 2~4분기 | 혼합 (실제 집행액은 DART·EDGAR 자동, 가이던스 방향은 수동) |
| 장비 수주 공시 | DART 단일판매·공급계약 공시 | 장비주 실적 확정 신호. 주가는 대개 발표 전에 반영되어 공시일에 차익실현이 흔함. | 동행~후행 | 자동 (DART 공시 목록 API, DART_API_KEY 필요) |
| 외국인 순매수 | KRX 투자자별 매매, 일별 | 삼성전자·하이닉스는 외국인 방향이 곧 주가 방향. 20일 누적 순매도 전환은 경계 신호. | 동행 | 자동 (네이버 증권 모바일 JSON API: /api/stock/{code}/trend) |
| 원/달러 환율 | 일별 | 원화 약세는 수출 이익에 플러스이나 외국인 자금 이탈과 겹치면 주가에는 마이너스. | 동행 | 자동 (Frankfurter/ECB → 네이버 환율 JSON 순으로 시도) |
| P/B (삼성전자·하이닉스) | 증권사 밸류에이션 테이블 | 과거 사이클 저점 1.0~1.2배, 고점 2.0~2.5배. 2025~26년은 과거 범위를 크게 벗어나 참고치로만. | — | 자동 (네이버 증권 모바일 JSON API: /api/stock/{code}/integration 의 PBR) |

_생성: 2026-10-06T00:52:30+00:00 · 투자 판단의 참고용이며 데이터 오류 가능성이 있습니다._
