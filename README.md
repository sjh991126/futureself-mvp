# Trippy

AI 기반 여행 플래너 **Trippy** 모노레포입니다. 디자인 소스는 Figma
[Trippy Premium → New Designs](https://www.figma.com/design/28z9P68PMwjsrgw9ymN1Pr/Trippy-Premium?node-id=10717-37066)
페이지를 기준으로 합니다.

## 구성

| 경로 | 설명 |
| --- | --- |
| `frontend-beta-dev/` | Trippy 모바일 앱 (Expo / React Native) |
| `web/` | **Trippy 웹 버전** — Figma "New Designs" 플로우 전체 + 웹 최적화 레이아웃 (데스크톱 사이드바) |
| `server/` | 웹 서버 — Claude AI 추천(TrippyAI) · 일일 트렌딩 Top 50 · 백엔드 CORS 프록시 |
| `app.py` | Future Self Coach — Streamlit MVP (별도 프로젝트) |

## Trippy Web (`web/` + `server/`)

Figma **New Designs** 페이지의 플로우를 그대로 옮긴 웹 버전입니다.
모바일(<1024px)은 Figma 디자인 그대로, 데스크톱(≥1024px)은 사이드바 내비게이션과
멀티 컬럼 레이아웃으로 재배치됩니다.

```bash
# 풀 모드 — 실제 가입/로그인 + Claude AI + 트렌딩 Top 50
cd server && cp .env.example .env   # ANTHROPIC_API_KEY 입력
npm install && npm start            # → http://localhost:3000

# 정적 데모 모드 — 서버 없이
cd web && python3 -m http.server 8000
```

실서비스 연동 기능 (풀 모드):

- **회원가입/로그인** — `api.trippy.global` 실계정 (`/api/v1/signup` → 이메일 OTP `/api/v1/verify` → `/login`), 서버의 `/backend` 프록시로 브라우저 CORS 문제 없이 동작
- **TrippyAI 추천 (Claude `claude-opus-4-8`)** — AI Magic 필터 → 실제 장소로 일정 생성, TrippySpot 새로고침 → 지금 영업 중인 주변 스팟 3곳, Custom Build 날짜 선택 → 일자별 일정
- **트렌딩 Top 50** — 카테고리/트립리스트 랭킹을 Claude가 **매일 1회** 생성·캐시, 홈에 Top 5 미리보기
- 모든 기능은 서버/키가 없으면 데모 데이터로 자동 폴백

배포(trippy.global 연결)는 [`web/DEPLOY.md`](web/DEPLOY.md) 참고.

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
