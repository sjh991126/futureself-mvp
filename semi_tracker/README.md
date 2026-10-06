# 반도체 사이클 국면 트래커 (semi_tracker)

"8.4 국면을 확인하는 지표" 표의 10개 지표를 **자동 수집 → 해석 규칙으로 판정 → 종합 국면(①~④) 추정 → 리포트·대시보드·알림**까지 자동화한 트래커입니다.

| # | 지표 | 자동화 수준 | 소스 |
|---|---|---|---|
| 1 | DRAM·NAND 고정거래가격 | 부분 자동 (공개 표 스크랩, 실패 시 수동) | DRAMeXchange 공개 페이지 + `manual_inputs.yaml` |
| 2 | 현물가격 (spot) | 자동 | DRAMeXchange 공개 현물가 표 |
| 3 | 재고 주수 | 혼합 (고객 재고 주수 수동, 공급사 재고일수 자동 계산) | DART(삼성·하이닉스), SEC EDGAR(마이크론) |
| 4 | 마이크론 실적·가이던스 | 혼합 (실적 자동, 가이던스 수동) | SEC EDGAR XBRL |
| 5 | 엔비디아 실적·CoWoS 캐파 | 혼합 (총매출·TSMC 월매출 자동, 데이터센터 매출·CoWoS 수동) | SEC EDGAR, 대만 MOPS |
| 6 | CAPEX 가이던스 | 혼합 (집행액 자동, 가이던스 방향 수동) | DART, SEC EDGAR |
| 7 | 장비 수주 공시 | 자동 | DART 공시목록 API (단일판매·공급계약) |
| 8 | 외국인 순매수 | 자동 | 네이버 금융 외국인·기관 순매매 |
| 9 | 원/달러 환율 | 자동 | Frankfurter(ECB) → 네이버 환율 |
| 10 | P/B (삼성전자·하이닉스) | 자동 | 네이버 금융 |

각 지표의 "해석" 열은 `signals.py` 의 규칙으로, "선행/동행" 열은 메타데이터로 그대로 옮겼습니다 (`config.py`).

## 빠른 시작

```bash
pip install -r semi_tracker/requirements.txt
export DART_API_KEY=...                  # 선택: https://opendart.fss.or.kr 무료 발급 (삼성·하이닉스 재무, 장비 수주 공시)
export TRACKER_CONTACT_EMAIL=you@example.com   # SEC EDGAR 가 요구하는 연락처 User-Agent

python -m semi_tracker.run               # 수집 + 판정 → data/latest.json, data/reports/latest.md
streamlit run semi_tracker/dashboard.py  # 대시보드
python -m pytest semi_tracker/tests -q   # 테스트 (네트워크 불필요)
```

유용한 옵션: `--offline` (저장 데이터·수동 입력만으로 재판정), `--only fx,naver_005930` (일부 소스만), `--today 2025-10-02` (기준일 고정), `--strict` (소스 실패 시 종료코드 1).

## 자동 실행 (GitHub Actions)

`.github/workflows/semi_tracker.yml` 이 **평일 08:10 KST** 에 수집을 실행하고 변경된 `data/` 를 커밋합니다. Actions 탭에서 **Run workflow** 로 수동 실행도 됩니다 (워크플로가 기본 브랜치에 있어야 함). 트래커 코드를 바꾼 PR 에서는 테스트와 라이브 수집 검증이 커밋 없이 실행되고, 결과 리포트는 잡 요약(Job Summary)과 아티팩트로 남습니다.

리포지토리 Settings → Secrets 에 넣을 값 (모두 선택):

| Secret | 용도 |
|---|---|
| `DART_API_KEY` | 삼성·하이닉스 분기 재무(재고·매출원가·CAPEX), 장비주 단일판매·공급계약 공시 |
| `TRACKER_CONTACT_EMAIL` | SEC EDGAR 접속용 연락처 (없으면 `tracker@example.com`) |
| `SLACK_WEBHOOK_URL` | 판정·국면이 바뀌었을 때 Slack 알림 |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Telegram 알림 |

알림은 **이전 실행 대비 지표 판정이나 국면이 바뀐 경우에만** 보냅니다.

## 수동 입력

`data/manual_inputs.yaml` 에 유료·컨콜 기반 값을 입력하고 커밋하면 다음 실행부터 반영됩니다 (같은 날짜의 자동 값보다 우선). 대시보드의 **수동 입력** 탭에서 편집·저장하고 **오프라인 재판정**으로 즉시 확인할 수 있습니다.

- `contract_price.<제품>`: 월별 고정가 (2개월 이상이면 전월 대비, 3개월 이상이면 상승률 둔화 판정)
- `inventory_weeks.customer`: 고객(서버·PC) 재고 주수
- `micron.guidance`: 분기 가이던스 (매출·GM 중간값)
- `nvidia.data_center_revenue_usd_bn`, `nvidia.cowos_capacity`
- `capex.<회사>`: 가이던스 방향 (증액/유지/감액)
- `pbr`, `usdkrw`, `spot_price`: 자동 수집 실패 시 대체

## 판정 로직 요약

각 지표는 `bull(우호) / neutral / caution(경계) / bear(비우호) / na` 상태와 함께 국면 ①~④ 에 가중 투표를 냅니다. `phase.py` 가 투표를 합산해 가장 높은 국면을 고르고 신뢰도(최다 득표 / 전체)와 근거·반대 신호를 제시합니다. 판정 가능한 지표가 3개 미만이면 "판단 보류".

| 지표 | 핵심 규칙 |
|---|---|
| 고정가 | 전월比 상승 전환 → ②(업사이클 시작) · 상승률 둔화 → ③(고점 경고) · 하락 가속 → ④ · 낙폭 축소 → ① |
| 현물가 | 고정가 대비 −5% 이하 → 고정가 하락 예고(③/④) · 1개월 +3% 이상 → 선행 반등(①/②) |
| 재고 주수 | ≤6주 정상(②) · 7~9주 주의 · ≥10주 하락 국면(④) · 10주↑에서 감소 중 → 반등 조건(①). 공급사 재고일수는 8분기 중앙값 대비 ±15% 로 보조 판정 |
| 마이크론 | 매출 QoQ↑+GM↑ → ② · GM 2분기 연속↓ → ④ · 가이던스 중간값 vs 직전 실적 ±5% |
| 엔비디아·TSMC | 데이터센터 매출 성장률 2분기 연속 둔화 → ③(2.0) · 성장 유지 → ② · TSMC YoY>20% 가점, 3개월 연속 둔화 감점 |
| CAPEX | 증액 + 사이클 후반 신호(고정가·현물·엔비디아 중 하나라도 경계) → ③ "과잉의 씨앗" · 증액 + 초중반 → ② 장비주 호재 · 감액 → ④/① |
| 장비 수주 | 최근 90일 공시 건수 vs 직전 90일 (1.5배↑ 증가, 0.5배↓ 둔화), 가중치 낮음(동행~후행) |
| 외국인 | 20일 누적 순매수 → ② · 직전 20일 양(+)에서 음(−) 전환 → ③ 경계 · 지속 순매도 → ④ |
| 환율 | 20일 ±2% 기준. 원화 약세 + 외국인 이탈 → ④ · 원화 강세 + 외국인 순매수 → ② |
| P/B | ≤1.2 저점 구간(①) · ≥2.0 고점 구간(③), 참고치로 가중치 0.5 |

임계값은 `config.THRESHOLDS` 에서 조정합니다.

## 구조

```
semi_tracker/
  config.py      지표 메타데이터(표 원문), 임계값, 종목·CIK·DART 코드
  run.py         파이프라인 CLI (수집 → 수동 병합 → 판정 → 저장 → 알림)
  signals.py     지표별 판정 규칙      phase.py   국면 합산      calendar.py  다음 발표일
  report.py      마크다운 리포트       notify.py  Slack/Telegram  store.py     CSV/JSON/YAML 저장소
  dashboard.py   Streamlit 대시보드
  fetchers/      dramexchange · edgar · dart · naver · fx · mops (네트워크 함수와 순수 파서 분리)
  tests/         파서(픽스처)·규칙·국면·파이프라인(수집기 모킹) 테스트
data/
  manual_inputs.yaml  수동 입력        series/*.csv  지표 시계열     latest.json  최신 스냅샷
  reports/latest.md   최신 리포트       signal_history.csv  일자별 판정 이력   equipment_orders.json
```

## 알아둘 점

- 외부 사이트(DRAMeXchange·네이버·MOPS)의 HTML 구조가 바뀌면 해당 소스만 실패로 표시되고 나머지는 계속 동작합니다. 실패한 소스는 리포트의 **수집 상태** 표와 대시보드에서 확인하고 `manual_inputs.yaml` 로 대체하세요.
- TrendForce 고정거래가격 전체 데이터는 유료입니다. 공개 표에서 못 읽으면 월말 발표치를 수동 입력해야 "전월 대비" 판정이 가능합니다.
- 투자 판단의 참고용이며, 자동 수집 데이터에는 오류가 있을 수 있습니다.
