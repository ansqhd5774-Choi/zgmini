# R6 최소 최적화 및 자동빌드 준비 판정

## 범위와 현재 배포
기존 R5 candidate b22b191f-85fa-4f96-9297-088627266138만 읽기 요청으로 측정한다. 코드 배포/Production/DNS/D1/main 변경 없음. D1 SUPPORT_REQUIRED는 R4/R5 유효 증거를 재사용하며 재조사하지 않는다.

## Static / SSR 분리
- /flags/us.svg 및 JS/CSS/이미지: A STATIC_ASSET_ONLY. 현재 run_worker_first=true여서 guard와 ASSETS.fetch의 작은 CPU는 발생한다. asset 응답 크기/시간을 페이지 SSR과 별도 집계한다.
- /: B STATIC_HTML_POSSIBLE. app/page.tsx는 client component이며 market-data/session 등의 GET을 hydration 뒤 실행한다. 실제 현재 구현은 request-time RSC/SSR. 클라이언트 날짜/검색/상호작용과 hydration 일치 검증이 필요하다.
- /inflation/, /recession/, /liquidity-crisis/, /credit-risk/, /earnings-recession/, /asset-bubble/, /debt-risk/, /supply-shock/: B STATIC_HTML_POSSIBLE. 각 page.tsx는 동기 metadata+markup+client panel; cookies/headers/server fetch 없음. panel의 useEffect가 해당 *-detail GET API를 no-store로 호출한다. 현재 구현은 request-time SSR이지만 매 요청 서버 렌더가 업무상 필수라는 증거 없음. 정적화 완료/호환성을 확정한 판정은 아니다.
- 공개 API: D API_DYNAMIC_REQUIRED. DB-dependent API는 현재 short-circuit503; 이는 실제 DB 연결 후 산식/조회/JSON 비용의 검증이 아니다. /api/session은 기존 framework GET handler의 익명 결과200. SSR_REQUIRED로 확정된 page는 이 검사 범위에 없음.

## CPU 원인 근거와 한계
worker/candidate-r5.ts에서 page만 handler.fetch(Vinext)를 실행하며 DB API는 handler 전에 반환한다. DB binding 없음. source query를 실행하는 경로 없음.
설치된 vinext0.0.50의 dist/server/app-ssr-entry.js: RSC stream decode, React element tree 생성, loadBootstrapScriptContent, renderToReadableStream, head/metadata/RSC embed stream을 수행한다. R5 build에는 SSR index587.84kB/page632.77kB/chart845.18kB가 포함된다. dynamic import 경고1개는 slot.js 정적/동적 중복이다. dynamic import 자체가 outlier 원인이라는 함수별 CPU 증거는 없다.
build 산출물 dist/server에서 .map 파일0개. candidate middleware는 NextResponse.next로 대체되므로 Production canonical redirect가 원인이 아니다. layout JSON-LD stringify는 작은 고정 객체이고 서버 데이터 JSON 직렬화 없음. React render/stream/framework path가 반복 초과와 연결되지만 각 함수의 CPU 비중은 flamegraph 없이 미확정이다. cold start만의 문제라고 분류하지 않는다.

## FAIL/WARN route에 한정할 최소 수정안
1. 해당 page의 build-time HTML+RSC+client asset 생성 및 배포 artifact에 보관. response snapshot cache나 시간 경과 데이터 고정 방식은 사용하지 않는다.
2. candidate build pipeline에서 route allowlist만 prerender. 기존 API route는 별도 동적 처리하고 no-store 유지한다. hydration/client navigation/RSC 요청/404/HEAD/Content-Type 검증 필요.
3. 생성된 shell만 ASSETS로 전달하고 모든 mutation/internal 경로는 기존 guard를 먼저 통과시킨다. run_worker_first를 무조건 끄지 않는다.
4. 설치된 Vinext의 runPrerender 및 prerenderApp은 HTML/RSC artifact를 지원하지만 CLI --prerender-all은 전 route 대상이다. 이 저장소에는 API와 dynamic routes가 함께 있으므로 전체 export 명령을 바로 적용하지 않는다. candidate Cloudflare bundle/asset integration을 allowlist로 검증해야 한다.
5. 동일 workload와 공식 CPU 로그로 before/after 각각31개 이상 비교하고 UI/guard 검사 후 candidate만 재배포한다. API payload 축소/산식 변경/DB cache 추가는 이번 원인과 무관하므로 하지 않는다.

이번 R6에서는 optional runtime 최적화 미적용. 측정과 원인 경계/최소 계획을 완료하고 멈춘다. Free 10ms 충족 가능성은 정적 shell 전환 후 재측정 전까지 NOT_PROVEN.

## GitHub → Cloudflare Workers Builds
판정: AUTO_BUILD_PARTIAL. 설정 설계 가능; Cloudflare Linux clean install/build 및 repository 연결은 미검증/미활성화.

| 항목 | 준비 설정 |
|---|---|
| repository | ansqhd5774-Choi/zgmini |
| repo root | / (git ls-tree에 package.json/vite.candidate-r5.config.ts가 최상위) |
| branch filter | migration/cloudflare-workers-r1만 candidate의 배포 branch; 다른 branch preview OFF; main 연결 금지 |
| install | npm ci (lockfile 사용, 기존 install:ci는 Sites 전용이므로 사용하지 않음) |
| build | node node_modules/vite/bin/vite.js build --config vite.candidate-r5.config.ts |
| deploy | node scripts/check-candidate-r5.mjs && node node_modules/wrangler/bin/wrangler.js deploy --config dist/server/wrangler.json |
| candidate name | zgmini-migration-candidate-r5 |
| production name | 별도 Worker/config를 미래 승인 시 확정; 현재 candidate 명칭을 Production으로 재사용하지 않음 |
| build env names | NODE_VERSION (>=22.13; 로컬24.19.0), WORKERS_CI_BRANCH / WORKERS_CI_COMMIT_SHA (공식 자동 주입) |
| deploy credentials | Cloudflare Builds가 관리하는 deploy token만 사용; 애플리케이션 runtime secret은0 |
| runtime secrets/bindings | candidate는 secret0 / D1없음 / ASSETS만 |

현재 contract check는 git branch --show-current를 엄격 검사한다. CI가 detached HEAD면 실패한다. 활성화 전에 WORKERS_CI_BRANCH를 검증하는 CI 전용 branch gate를 추가하고 main 거부를 테스트해야 한다. branch 환경변수는 write guard를 활성화하는 runtime flag가 아니며 배포 대상 guard와 함께 사용한다.
package-lock.json 존재, .npmrc cache=.sites-runtime/npm-cache는 로컬 캐시 경로일 뿐 Sites 인증 요구는 아니다. clean Linux npm ci 및 환경별 optional dependency 설치는 별도 실제 CI로 확인해야 한다. 로컬 node_modules는 기존 checkout 공유이므로 clean CI 성공의 증거로 삼지 않는다.

## 공식 근거
- [실시간 로그와 샘플링](https://developers.cloudflare.com/workers/observability/logs/real-time-logs/)
- [Workers Builds 설정·build/runtime secrets 분리](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Build branch 설정](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
- [Build image와 Node 버전](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
