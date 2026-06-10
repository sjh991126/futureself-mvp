# Trippy

AI 기반 여행 플래너 **Trippy** 모노레포입니다. 디자인 소스는 Figma
[Trippy Premium → New Designs](https://www.figma.com/design/28z9P68PMwjsrgw9ymN1Pr/Trippy-Premium?node-id=10717-37066)
페이지를 기준으로 합니다.

## 구성

| 경로 | 설명 |
| --- | --- |
| `frontend-beta-dev/` | Trippy 모바일 앱 (Expo / React Native) |
| `web/` | **Trippy 웹 버전** — Figma "New Designs" 페이지의 주요 플로우를 구현한 정적 웹앱 (빌드 불필요) |
| `app.py` | Future Self Coach — Streamlit MVP (별도 프로젝트) |

## Trippy Web (`web/`)

Figma **New Designs** 페이지의 플로우를 그대로 옮긴 웹 버전입니다.
순수 HTML/CSS/JS로 작성되어 빌드 과정 없이 어디서든 호스팅할 수 있습니다
(GitHub Pages, Netlify, S3 등).

```bash
cd web
python3 -m http.server 8000
# → http://localhost:8000
```

구현된 화면 (Figma 플로우 기준):

- **Onboarding** — Welcome(브랜드 로고) → 카테고리 콜라주 온보딩
- **Home** — 검색, TrippyAI 플랜 히어로, TrippySpot for You 테마, Hotels/Flights, What's Nearby 지도
- **FLOW 4 · AI TripList** — Where to next? → AI Magic 필터(카테고리·인원·날짜·위치) → 로딩 → 생성된 TripList(콜라주·날짜·경로 지도·Day 일정)
- **FLOW 5 · Manual TripList** — Custom Build → 날짜 범위 캘린더 → TripList
- **FLOW 3 · Instant TrippySpot** — 지도 + 스팟 시트(Drive/Walk, Navigate, Hot 배지)
- **FLOW 2 · Browse** — Made for You (TripList/Places 탭)
- **Booking** — Book Hotels(가격 트렌드 차트, Best Deals) · Book Flight(Round-trip/One-way)
- **FLOW 6 · Community** — 피드, 필터, 친구 초대, 좋아요
- **Reels** — Paste Reel URL / Share from Instagram
- **Profile** — 팔로워/팔로잉, 지역 하이라이트, TripLists

로고는 브랜드 워드마크(`web/assets/trippy-logo.png`, est. 2021)를 사용합니다.

## Trippy Mobile (`frontend-beta-dev/`)

```bash
cd frontend-beta-dev
cp .env.example .env   # 값 채우기 (API, Google, Firebase, Stripe)
npm install
npx expo start
```

> `.env`, `ios/GoogleService-Info.plist`, `app/src/config.js`는 팀 컨벤션(.gitignore)에 따라
> 커밋되지 않습니다. 로컬 개발 시 기존 사본에서 가져와 주세요.

## Future Self Coach (`app.py`)

```bash
pip install -r requirements.txt
streamlit run app.py
```
