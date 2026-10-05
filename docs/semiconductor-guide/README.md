# 반도체 주식 교과서 (Semiconductor Stock Guide)

반도체가 어떻게 만들어지는지(8대 공정), 용어는 무슨 뜻인지, 공정마다 어떤 국내 상장사가 돈을 버는지, 그리고 그 주식들이 실적(업황)을 따르는지 고유한 패턴이 있는지를 2015~2026년 실제 시세로 분석한 단일 HTML 교과서입니다.

- `index.html` — 교과서 본문 (8개 장 + 용어 사전 + 종목 카드 + 3D HBM 모형). 브라우저에서 바로 열면 됩니다. 3D 모형은 cdnjs의 three.js를, 글꼴은 Google Fonts를 불러오므로 인터넷 연결이 필요합니다.
- `analysis/universe.csv` — 분석 대상 86개 종목과 공정 그룹 분류.
- `analysis/build_panel.py` — KRX 일별 시가총액 데이터셋(FinanceData/marcap)에서 수정주가 패널과 시총가중 근사 지수를 만드는 스크립트.
- `analysis/metrics.py` — 종목별 지표(수익률, MDD, 베타, 하이닉스 동조성, 급등락 빈도, 추세성, 계절성)와 그룹 지수를 계산.
- `analysis/pack.py` — 지표와 월별 시세를 `index.html`에 내장되는 JSON으로 압축.
- `analysis/metrics.json` — 계산된 지표 원본.

## 데이터 출처

| 데이터 | 출처 | 기준일 |
|---|---|---|
| 일별 시세·시가총액 (1995~) | [FinanceData/marcap](https://github.com/FinanceData/marcap) (한국거래소 자료 수집) | 2026-10-01 |
| 2026년 KRX 업종지수 일별, 외국인·기관 순매수 | [james-brand/korea-market-data](https://github.com/james-brand/korea-market-data) (CC BY 4.0, K-Export Stars) | 2026-10-02 |
| RSI·이동평균 스냅샷 | [sbkim21kr/kospi_kosdaq_livermore_pearl_screener](https://github.com/sbkim21kr/kospi_kosdaq_livermore_pearl_screener) | 2026-10-02 |

## 재현 방법

```bash
git clone --depth 1 https://github.com/FinanceData/marcap /path/to/marcap
pip install pandas pyarrow numpy
# build_panel.py 안의 M 경로를 /path/to/marcap/data 로 바꾼 뒤
python analysis/build_panel.py && python analysis/metrics.py && python analysis/pack.py
```

## 한계

- 코스피·코스닥 지수는 공식 지수가 아니라 전 종목 시가총액 가중 수익률을 연쇄한 근사치입니다.
- 분기 실적 데이터는 포함되어 있지 않으며, "실적 추종" 판단은 업황 대리변수(SK하이닉스)와의 동조성, 급등락 빈도, 사업 구조를 종합한 것입니다.
- 2026년 10월 현재 상장 종목만 포함해 생존 편향이 있습니다.
- 교육용 자료이며 투자 권유가 아닙니다.
