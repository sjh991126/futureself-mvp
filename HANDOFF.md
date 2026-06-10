# Trippy Web — 엔지니어 인수인계 문서 (HANDOFF)

> 작성: 2026-06-10 · 브랜치 `claude/trusting-volta-umfwba` · PR [#1](https://github.com/sjh991126/futureself-mvp/pull/1)
> 디자인 소스: Figma [Trippy Premium → **New Designs** 페이지](https://www.figma.com/design/28z9P68PMwjsrgw9ymN1Pr/Trippy-Premium?node-id=10717-37066)

기존 Expo(React Native) 앱(`frontend-beta-dev/`)의 **웹 버전**입니다.
빌드 도구 없는 순수 HTML/CSS/JS 프론트 + 작은 Node 서버(AI·프록시) 구성으로,
서버 없이 정적 호스팅만 해도 데모 데이터로 100% 동작하고, 서버를 띄우면
실계정 가입/로그인 + Claude AI 추천 + 일일 트렌딩이 살아납니다.

---

## 1. 아키텍처

```
브라우저 (web/)
 ├─ js/app.js   화면 라우팅(해시) · 렌더링 · 이벤트
 ├─ js/api.js   TrippyAPI 클라이언트 (아래 두 백엔드 추상화, 실패 시 폴백)
 ├─ js/data.js  데모 데이터 (Figma 화면 내용 그대로) + 트렌딩 폴백 생성기
 │
 ▼ same-origin
server/server.js (Node 18+ / Express 4)
 ├─ 정적 서빙: ../web
 ├─ POST /api/ai/triplist ─┐
 ├─ POST /api/ai/spots     ├─ Anthropic SDK → claude-opus-4-8
 ├─ GET  /api/trending/:k ─┘   (structured outputs + adaptive thinking)
 │        └─ trending-cache.json 에 날짜별 캐시 (하루 1회 생성)
 └─ ANY  /backend/* ──────────► https://api.trippy.global/*  (CORS 프록시)
                                  └ 가입/OTP/로그인/프로필/커뮤니티/트립리스트
```

**폴백 체인(중요)**: 모든 라이브 호출은 try/catch로 감싸져 있고 실패하면
`data.js`의 데모 데이터로 대체됩니다. 따라서 서버 다운·키 없음·백엔드 장애
어떤 경우에도 화면이 깨지지 않습니다. (라이브/데모 여부는 토스트와 화면 라벨로 표시)

---

## 2. 파일별 역할

### web/ (프론트)

| 파일 | 내용 |
| --- | --- |
| `index.html` | 17개 화면 전부가 `<section class="screen">`으로 들어있는 단일 페이지. 데스크톱 사이드바(`<aside class="sidebar">`), 생성(+) 모달, 인라인 SVG 지도 2종 포함. 하단 `window.TRIPPY_CONFIG`로 백엔드 주소 설정 |
| `css/styles.css` | 디자인 토큰(§4) → 컴포넌트 → 화면별 스타일 → **`@media (min-width:1024px)` 데스크톱 재배치**(맨 아래 블록) 순서로 구성 |
| `js/data.js` | Figma 화면의 텍스트·콘텐츠를 그대로 옮긴 `DATA` 객체 + `buildTrendingFallback()` (날짜 시드 기반이라 데모에서도 매일 순위가 바뀜) |
| `js/api.js` | `TrippyAPI` 모듈. ① 백엔드(인증·데이터) ② TrippyAI(서버) 두 축. `location.protocol`이 http(s)면 same-origin(`/backend`, `/api/...`)을 쓰고 `file://`이면 백엔드 직통·AI 비활성 |
| `js/app.js` | IIFE 하나. 해시 라우터(`go()`), 화면별 렌더 함수, 인증 폼 핸들러, AI 호출, 트렌딩 로딩. 모든 동적 DOM은 여기서 생성 |
| `assets/` | 로고(드라이브 원본 `logo.png` 다운스케일), 모바일 앱 `categories_images` 재활용(520px 리사이즈), 아바타, 히어로 |
| `DEPLOY.md` | trippy.global 배포 가이드 (Node 모드 / 정적+Spring CORS 모드) |

### server/ (백엔드 보조)

| 파일 | 내용 |
| --- | --- |
| `server.js` | 전체 서버 (~250줄). 아래 §5, §6에 엔드포인트 상세 |
| `package.json` | 의존성 `express@4`, `@anthropic-ai/sdk` 단 둘 |
| `.env.example` | `ANTHROPIC_API_KEY`(필수), `TRIPPY_API_BASE`, `PORT`, `TRIPPY_AI_MODEL` |
| `trending-cache.json` | 런타임 생성(gitignore). `{categories:{date,items[50]}, triplists:{...}}` |

---

## 3. 화면 ↔ Figma 매핑

해시 라우팅: `#/{screenId}`. `app.js`의 `NO_NAV`(바텀내비 숨김), `DARK_NAV`(다크 내비) Set으로 분류.

| screen id | Figma 프레임 (New Designs) | 비고 |
| --- | --- | --- |
| `welcome` | Welcome to Trippy | 로고는 브랜드 워드마크(est. 2021)로 교체 (대표 요청) |
| `onboarding` | Onboarding (카테고리 콜라주) | 3슬라이드, 마지막에 가입 유도 |
| `login` `signup` `verify` | Username/Password 시리즈 | 웹용으로 통합 구성, 실 API 연동 |
| `home` | HomePage - New User | 라이트 테마. 데스크톱에서 2컬럼(`.home-cols`) |
| `plan` | Where to next? | AI Magic / Custom Build 분기 |
| `ai-filter` | AI - Filter | 카테고리·인원·날짜·위치 → AI 요청 파라미터 |
| `loading` | Loading animation | CSS conic-gradient 스피너. AI 응답 대기와 동기화 |
| `triplist` | AI Generated TripList | `renderTrip()`이 데모/AI 결과 공용 렌더. 다일(multi-day) 지원 |
| `custom` | Manual - Dates | 달력 범위 선택 → 일수만큼 AI 생성 |
| `spot` | TrippySpotwithDirections | 테마 연동, 새로고침 5회 제한, Drive/Walk 토글(×3 시간) |
| `madeforyou` | Made for you - TripList/Places | 탭 2종 |
| `trending` | (신규 — 요청사항) | Top 50, 카테고리/트립리스트 탭, ▲▼NEW 델타 |
| `hotels` `flights` | Book Hotels / Book Flight | 가격 트렌드 SVG 차트, 토글·스왑 동작 |
| `community` | Community | 좋아요 토글 동작, 로그인 시 실피드 |
| `reels` | Add from Reels | 안내 화면 |
| `profile` | User profile page | 로그인 시 실데이터, 로그아웃 버튼 |

---

## 4. 디자인 시스템 (styles.css `:root`)

- 다크 서피스: `--bg #000` `--surface #141417` `--input #232327`
- 브랜드 그라디언트: `--grad: linear-gradient(92deg,#4f7df9→#47c8dc→#4de8c2)` (버튼·날짜 pill·사이드바 Create)
- 포인트: `--teal #45e3c4`(링크/선택), `--purple #c9b8ff`(커뮤니티), `--hot`(주황→핑크 배지)
- 폰트: Plus Jakarta Sans (Google Fonts, 실패 시 시스템 폰트)
- 반응형 분기: **1024px**. 미만 = Figma 모바일 그대로(바텀내비), 이상 = 사이드바 + 멀티컬럼. 760~1023px는 폰 프레임 중앙 배치

---

## 5. TrippyAI (Claude) 구현 상세 — `server/server.js`

- SDK: `@anthropic-ai/sdk`, 모델 `claude-opus-4-8` (env로 교체 가능)
- 모든 호출 공통: `thinking:{type:"adaptive"}` + **structured outputs**
  (`output_config.format = {type:"json_schema", schema}`) → 응답이 스키마 보장 JSON.
  스트리밍(`messages.stream → finalMessage()`)으로 타임아웃 방지
- 시스템 프롬프트: TrippyAI 페르소나, 기본 도시 Hong Kong, "실존·영업 중 장소" 지시

| 엔드포인트 | 입력 | 출력 스키마 | 용도 |
| --- | --- | --- | --- |
| `POST /api/ai/triplist` | `{destination, category, groupSize, dates, days(≤5)}` | `{title, days:[{label, places:[{name,sub,time}]}]}` | AI Magic / Custom Build |
| `POST /api/ai/spots` | `{theme, location, exclude[]}` | `{spots:[{name,cat,status,statusText,mins,tags[3],hot}]}` | TrippySpot (hot은 1개만) |
| `GET /api/trending/:kind` | `kind ∈ categories\|triplists` | `{date, items:[{name,area,blurb,trend,score}]×50}` | 트렌딩 Top 50 |

**일일 캐시 로직**: `getTrending()`이 `trending-cache.json`의 `date`가 오늘이면 그대로 반환,
아니면 Claude로 50개 재생성 후 덮어씀 → **Claude 호출은 종류당 하루 1번**.
(다중 인스턴스 운영 시 Redis 등으로 교체 권장 — §9)

키가 없으면 503 반환 → 프론트가 폴백 사용.

## 6. 백엔드 프록시 & 인증 — 왜 이렇게 했나

모바일 앱은 CORS가 없지만 브라우저는 있습니다. 그리고 이 백엔드는 **로그인 토큰을
응답 헤더(`Authorization`, `Refresh-Token`)로** 내려주는데, 브라우저 JS는
`Access-Control-Expose-Headers` 없이는 그 헤더를 읽지 못합니다. 그래서:

- `ANY /backend/* → ${TRIPPY_API_BASE}/*` 단순 포워딩 프록시를 두고
- 프록시가 위 두 헤더를 그대로 전달 + `Access-Control-Expose-Headers` 부여

프론트(`api.js`)의 인증 플로우 — 모바일 앱 코드(`app/src/api/*`)와 동일 계약:

```
signup  : POST /api/v1/signup   {email, password, userName, name, imageUrl:null, role:"USER"}
verify  : POST /api/v1/verify   {email, otp}
login   : POST /login           {userName, password}
          → 토큰: 응답 헤더 우선, 없으면 body(accessToken/refreshToken)
profile : GET  /api/users/v1/profile          (Bearer)
posts   : GET  /api/community/v1/posts?page=&size=   → Spring pageable {content:[...]}
mylists : GET  /api/triplists/v1              (Bearer)
```

토큰 저장: `localStorage("trippy.accessToken" / "trippy.refreshToken" / "trippy.user")`.
**미구현**: 401 시 자동 refresh (모바일의 interceptor 대응) — §9 TODO 1순위.

프록시 없이 정적 호스팅만 쓰려면 Spring에 CORS 설정 필요 — `web/DEPLOY.md`에 코드 스니펫 있음.

---

## 7. 실행 & 배포

```bash
# 풀 모드
cd server && cp .env.example .env   # ANTHROPIC_API_KEY 입력
npm install && npm start            # http://localhost:3000 (web 포함 서빙)

# 정적 데모 모드 — web/index.html 더블클릭 또는 아무 정적 호스팅
```

헬스체크: `GET /healthz` → `{ok, ai(키 인식 여부), model, backend}`.
운영 배포(PM2/nginx/DNS)는 `web/DEPLOY.md` 참고. 권장: `app.trippy.global`.

## 8. 보안 — 꼭 처리할 것

1. 🔴 **AWS 키 교체(rotate)**: `frontend-beta-dev/app/src/api/s3_upload.js`에 실 AWS
   액세스 키가 하드코딩돼 있었음. 저장소 커밋에서는 `@env` 방식으로 제거했지만
   (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, `.env.example`에 항목 추가),
   **이미 유출된 것으로 간주하고 IAM에서 키 비활성화+재발급** 해야 함
2. `server/.env`는 gitignore — 운영에선 시크릿 매니저 사용
3. 프록시는 화이트리스트 없이 `TRIPPY_API_BASE` 전체를 포워딩 — 공개 배포 전
   필요한 경로만 허용하도록 좁히는 것 권장

## 9. 엔지니어 TODO (우선순위순)

1. **토큰 리프레시**: 401 → `/api/refresh`(`Refresh-Token` 헤더) 재시도 인터셉터 (모바일 `config.js` 로직 참고)
2. **소셜 로그인**: Google/Apple 웹 OAuth 클라이언트 등록 후 `(auth)/login.jsx` 플로우 이식
3. **이미지 실데이터**: 현재 장소/트립리스트 썸네일은 카테고리 placeholder — 백엔드 `imageUrl` 연결
4. **지도**: 인라인 SVG 모형 → Google Maps JS SDK (모바일은 `google_places.js` 사용 중)
5. 트렌딩 캐시 Redis화 + 카테고리 클릭 → 해당 카테고리 콘텐츠 화면(`/api/categories/v1/{id}/content`)
6. TripList 저장/공유 — 생성 결과를 `POST /api/triplists/v1`로 저장
7. 커뮤니티 글쓰기/댓글/좋아요 실연동 (`newPost.js`, `likePost.js` 계약 참고)
8. E2E를 CI로: 검증 스크립트는 Playwright 기준 (모바일 428px / 데스크톱 1400px, JS 에러 0 기준으로 작성돼 있었음)

## 10. 알려진 제약

- AI 응답 시간: triplist 5~15초(로딩 화면이 대기), trending 첫 생성 ~30초(이후 캐시)
- 트렌딩 캐시는 서버 로컬 파일 — 인스턴스별로 따로 생성됨
- `file://`로 열면 AI·백엔드 비활성(데모 전용) — 정상 동작이며 의도된 분기
