# Trippy Web — trippy.global 배포 가이드

웹 버전은 두 가지 모드로 동작합니다.

| 모드 | 무엇이 되나 | 어떻게 |
| --- | --- | --- |
| **풀 모드 (권장)** | 실제 가입/로그인 + Claude AI 추천 + 일일 트렌딩 Top 50 | `server/` Node 서버로 서빙 |
| 정적 모드 | 데모 데이터로 모든 화면 동작 (AI·백엔드 연동 없음) | `web/`만 아무 정적 호스팅에 업로드 |

## 풀 모드 — Node 서버 (권장)

```bash
cd server
cp .env.example .env        # ANTHROPIC_API_KEY 채우기 (https://platform.claude.com)
npm install
npm start                   # → http://localhost:3000
```

서버가 하는 일:

- `web/` 정적 파일 서빙
- `POST /api/ai/triplist`, `POST /api/ai/spots` — Claude(`claude-opus-4-8`) 기반 실시간 추천
- `GET /api/trending/{categories|triplists}` — **매일 1회 Claude가 Top 50 랭킹 생성** 후 캐시 (`trending-cache.json`)
- `ANY /backend/*` → `api.trippy.global/*` 프록시 — **브라우저 CORS 문제 없이** 가입(`/api/v1/signup`)·OTP(`/api/v1/verify`)·로그인(`/login`)·프로필·커뮤니티 API 사용

### trippy.global 에 올리기

1. 서버(EC2/Lightsail/Render/Fly.io 등)에 이 저장소 배포 후 위 명령 실행 (PM2 권장: `pm2 start server/server.js --name trippy-web`)
2. DNS: `trippy.global` (또는 `app.trippy.global`) A/CNAME → 해당 서버
3. 리버스 프록시(nginx/Caddy)로 443 → 3000 포워딩 + TLS

```nginx
server {
  server_name trippy.global;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
}
```

> 마케팅 사이트가 이미 `trippy.global` 루트를 쓰고 있다면 `app.trippy.global` 서브도메인을 권장합니다.

## 정적 모드 (서버 없이)

`web/` 폴더를 Netlify Drop / GitHub Pages / S3에 업로드하면 끝.
이 모드에서 실제 로그인/가입을 쓰려면 백엔드(api.trippy.global, Spring)에 CORS 설정이 필요합니다:

```java
@Configuration
public class WebCorsConfig implements WebMvcConfigurer {
  @Override public void addCorsMappings(CorsRegistry r) {
    r.addMapping("/**")
     .allowedOrigins("https://trippy.global", "https://app.trippy.global")
     .allowedMethods("GET","POST","PUT","DELETE","PATCH","OPTIONS")
     .allowedHeaders("*")
     // 로그인 토큰이 응답 헤더로 내려오므로 반드시 노출 필요
     .exposedHeaders("Authorization", "Refresh-Token");
  }
}
```

`web/index.html`의 `window.TRIPPY_CONFIG.apiBase`로 백엔드 주소를 바꿀 수 있습니다.

## 참고

- AI 키가 없으면 모든 AI 기능은 데모 데이터로 자동 폴백됩니다 (화면에 demo 표시).
- 트렌딩 캐시는 서버 로컬 파일이므로 다중 인스턴스 구성 시 공유 스토리지/Redis로 교체하세요.
- Google/Apple 소셜 로그인은 웹용 OAuth 클라이언트 등록이 따로 필요해 이번 버전에서는 이메일/비밀번호 가입만 지원합니다.
