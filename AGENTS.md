ZGMINI PLUGIN & EXECUTION RULES — COMPACT R5 FINAL

## 0. 최상위 원칙
- 승인된 산식·데이터 구조·Revision·작업 기준 최우선.
- 승인 없는 구조/DB/배포방식/산식/DNS 변경 금지.
- 실행하지 않은 작업 완료/PASS 보고 금지.
- 소스/GitHub/Build/Deploy/Runtime/D1/Queue/UI/DNS 검증 구분.
- 실제 다음 작업을 막는 경우만 BLOCKER.
- 유효 Evidence 재사용. identity/contract 변경 시 해당 Gate만 재검증.
- 무료 우선. 유료·종량제는 무료 대안이 충분하면 사용 금지.
- 우선순위: 프로젝트 지침 > 이후 사용자 명시 승인 최신 운영 변경 > live tool/API Evidence > 최신 유효 Evidence > 과거 대화/메모리.
- 지침과 최신 승인 contract 충돌 시 실행 중단 후 최신 contract 기준으로 지침 갱신.

## 1. GitHub — SOURCE OF TRUTH
- 기준 소스는 GitHub 최신 `main`.
- 작업 전 remote main SHA / work-base SHA 확인.
- 작업 중 main 변경 시 source drift 확인, stale overwrite 금지.
- 목표에 필요한 최소 파일만 수정.
- 완료 코드는 main 반영 후 exact commit SHA Evidence 기록.
- GitHub 직접 접근 가능 시 불필요한 local clone/RDC 금지.
- 과거 SHA를 현재값으로 재사용 금지.
- migration/analysis branch 전체 merge 금지. 검증된 필요한 파일만 selective recovery.

## 2. Cloudflare — DEPLOYMENT CONTROL PLANE — ACTIVE
- 기본 경로:
  `GitHub latest main -> Cloudflare Git integration -> Build -> exact Deployment -> Production 검증`
- GitHub main이 Production source authority.
- Git integration 연결 전 자동배포 존재 추정 금지.
- Build 성공 ≠ Production 정상.
- building/pending 중 불필요한 새 배포 금지.
- exact deployment 기준 status/log 확인.
- 승인 없는 direct Wrangler Production deploy, Worker overwrite, branch 변경, rollback, 다른 commit 재배포, 우회배포 금지.

## 3. OpenAI Sites — DEPLOYMENT RETIRED
- ZGMINI Production 배포에 Sites 사용 금지.
- 별도 재승인 전 source sync/push, Save Version, Deploy, Publish 금지.
- 과거 Sites Version/deployment/source는 역사 Evidence만 허용.
- 현재 트래픽이 Sites를 향해도 Sites가 deployment authority라는 뜻은 아님.
- 현재 source/runtime 판정에 Sites 과거 상태 사용 금지.

## 4. Domain / DNS — CLOUDFLARE AUTHORITY
- `zgmini.kr` DNS authority는 Cloudflare. 도메인 등록기관과 DNS authority를 혼동 금지.
- DNS target과 DNS authority를 혼동 금지.
- 현재 DNS target은 Gate 직전 live 조회.
- Cloudflare candidate 검증 완료 전 추가 DNS/route 변경 금지.
- DNS cutover 전 기존 레코드와 rollback 경로 확인.
- cutover 후 HTTPS/도메인 정상 확인 전 완료 판정 금지.

## 5. Deployment Authority Gate — REQUIRED
배포 직전 반드시 확인:
- `DEPLOYMENT_CONTROL_PLANE=CLOUDFLARE`
- `GITHUB_MAIN_SHA=<live>`
- `CONNECTED_REPOSITORY=<live>`
- `CONNECTED_BRANCH=main`
- `SOURCE_DRIFT=NONE`
- `SITES_DEPLOY_ALLOWED=NO`
- `DIRECT_WRANGLER_ALLOWED=NO`
- DNS 변경은 승인된 cutover 단계에서만 허용.
불일치 시 배포 중단.

## 6. Cloudflare / D1 / Queue — RUNTIME
- D1 기본 DB. Supabase 교체/중복저장 금지(승인 제외).
- API=저장 전용, 산식=저장 데이터 전용.
- 승인 산식/가중치/정규화/지표 계약 변경 금지.
- Runtime 우선순위:
  `Cloudflare build/deployment > Worker logs > D1 read > Queue state > PostHog > source`
- public HTTP만으로 D1/Queue 정상 추정 금지.
- D1 write는 read-back Evidence 확인.
- Build / Worker / D1 / Queue / Cron 성공을 각각 구분.
- CPU 문제 해결을 위해 지표 삭제·weight/threshold/산식 변경 금지.
- Queue 최적화는 실행단위/입력/checkpoint/저장경로만 조정하고 결과 계약 유지.

## 7. Stored Data / Formula Contract
- Provider/API 응답은 먼저 저장.
- 산식은 저장 데이터만 사용.
- 0/null/missing 구분.
- 임의 fallback 숫자 생성 금지.
- stale 데이터를 최신처럼 표시 금지.
- 상태는 계약대로 `PENDING/READY/STALE/PARTIAL/BACKLOG/SOURCE_FAILED/CALCULATION_FAILED/UNAVAILABLE`.
- projection/read model은 승인된 `sourceVersion/sourceStoredAt` checkpoint 계약 유지.
- selective recovery 시 배포본과 branch를 직접 대조.

## 8. PostHog
- 실제 사용자 행동/UI/Error Tracking/Flag/Analytics 확인용.
- 테스트/Production 이벤트 구분.
- 기존 데이터로 충분하면 신규 이벤트 추가 금지.
- 민감정보 저장 금지.
- 데이터 없음 = `NO_RUNTIME_EVIDENCE`.
- Runtime 오류는 Cloudflare Evidence 우선.

## 9. Context7 / 공식문서
- React/Next/Vinext/Cloudflare/Wrangler/D1/Queue/Drizzle 등 버전 의존 API는 Context7/최신 공식문서 우선.
- deprecated API를 기억으로 추정 금지.
- 현재 코드/공식문서가 명확하면 불필요한 재조회 금지.

## 10. TinyFish — DEFAULT DENY
- 종량제/quota 제한이므로 기본 사용 금지.
- 공개 페이지, HTTP/API, 정적 DOM, 일반 검색, GitHub/Cloudflare 상태 확인에 사용 금지.
- 무료 우선:
  `기존 Evidence > GitHub > Cloudflare read/API > Web > Context7/공식문서 > 무료 Plugin > local/Codex`
- 로그인/클릭/입력/JS동적상태/브라우저 전용 오류가 필수이고 무료 대안 없을 때만 검토.
- 사용자가 해당 작업에서 명시하지 않았다면 실행 직전 승인.
- 기본 1회. timeout/error 후 새 run 자동 생성 금지.
- 기존 Profile 재사용.
- quota/wallet 부족은 무료 대안 있으면 BLOCKER 아님.
- Wallet/자동충전/구독/유료플랜 변경은 승인 필수.

## 11. Firecrawl / Web
- 일반 Search·공식문서로 충분하면 Firecrawl 사용 금지.
- credit 제한 시 반복 호출 금지, 무료 Search 전환.
- 소스/Production 상태는 GitHub/Cloudflare 우선.
- 무료 Search로 충분하면 Firecrawl도 사용 금지.

## 12. Figma / Linear / SEO
- Figma 원본이 있으면 UI 기준. 실제 UI는 Production 화면 확인.
- Linear는 큰 Stage/Revision/Owner/Evidence 관리용.
- 실제 GitHub/Cloudflare/Production 상태가 Linear보다 우선.
- SEO: GSC Wizard 우선, `payment_required`면 반복 금지. Windsor fallback 허용.
- SEO 데이터로 Runtime 오류 판정 금지.

## 13. DigitalOcean / RDC / Windows
- DigitalOcean NON-DEFAULT. 비용 발생 리소스 생성 전 승인.
- RDC LAST RESORT. GitHub/Cloudflare/Plugin 가능 작업에 사용 금지.
- RDC는 PC-local/CMD/local Codex 상태 등에만 사용.
- offline/quota 소진 시 반복 polling 금지.
- Windows는 CMD-only. PowerShell/WSL 임의 사용 금지.
- CMD: 경로 quote, `%~dp0`, ASCII+CRLF, BOM 없음.
- `.sh`는 LF 유지.
- token/secret/password는 memory-only, Evidence 저장 금지.

## 14. 실행 우선순위
- 소스: GitHub > RDC.
- 배포: `GitHub main -> Cloudflare Git integration -> Build -> exact Deployment -> Production`.
- Runtime: `Cloudflare deployment/build > Worker logs > D1 > Queue > PostHog > source`.
- D1: Cloudflare D1 read > public 추정 금지.
- UI: Figma > Production 실제 화면 > GitHub CSS/DOM.
- 문서/API: Context7 > 공식문서 > 추정 금지.
- 외부조사: Search/공식문서 > Firecrawl > TinyFish(승인+필수).
- SEO: GSC Wizard > Windsor.
- DB: D1 > Supabase 금지(승인 제외).

## 15. Cloudflare Cutover Gate
candidate -> Production 전환 전 모두 PASS:
- candidate source가 GitHub latest main에 회수됨
- migration branch 전체 merge 없음
- Cloudflare Git integration repo/branch(main) 확인
- hosted build/test PASS
- exact deployment succeeded
- workers.dev API/UI 정상
- D1 binding/read 정상
- Queue producer/consumer 정상
- 필요한 projection/read model READY
- CPU/waitUntil/5xx 오류 없음
- 산식/계약 변경 0
이 Gate 전 추가 Cloudflare DNS/route 변경 금지.

## 16. Production 완료 Gate
필요 항목 모두 만족해야 완료:
- latest main 반영
- source drift 없음
- source change/GitHub reflection PASS
- Deployment Authority Gate PASS
- Cloudflare Build PASS
- exact deployment succeeded
- 필요한 API HTTP 정상
- Worker Runtime 정상
- D1 저장/조회 정상
- Queue/Cron 정상(해당 시)
- 산식/계약 훼손 없음
- 실제 Production UI 정상(해당 시)
- 최종 전환 시 Cloudflare DNS/HTTPS 정상
- Runtime 오류 없음 또는 목표 무관함이 Evidence로 증명
- 요청 기능 실제 동작
- 임시 workaround/debug endpoint/우회 스크립트/credential 파일 0.

## 17. 비용 / Evidence / FAIL
- 무료 우선: GitHub, Cloudflare Free/read API, PostHog Free, Context7, Web, 공식문서.
- TinyFish/Firecrawl/DigitalOcean/유료 API는 꼭 필요한 경우만.
- quota/credit 소진 서비스 반복 호출 금지.
- 유료 리소스/Wallet/구독/지속과금 생성 전 승인.
- 변동 상태를 메모리 현재값으로 사용 금지:
  GitHub SHA, Cloudflare Build/Deployment, Worker/Domain binding, API/D1/Queue, DNS target, Plugin, quota, RDC, PostHog.
- 해당 Gate 직전 live 재조회.
- 오류 시 `LAST PASS / FIRST FAIL / exact error / ROOT CAUSE / SIDE EFFECT / 최소수정 / RETEST`.
- 실행하지 않은 작업 PASS 금지. 추측 SUCCESS 금지.

## 18. Tool Schema / Secret
- tool inventory/schema는 현재 runtime 기준.
- 과거 schema를 영구 계약으로 사용 금지.
- required/optional/type 추정 금지.
- secret/token/password 노출·Evidence 저장 금지.
- schema/parser 오류와 외부 서비스 오류를 구분.

## 19. ACTIVE CONTRACT
- SOURCE OF TRUTH: GitHub latest main
- DEPLOYMENT CONTROL PLANE: Cloudflare
- DEFAULT DEPLOY: GitHub main -> Cloudflare Git integration -> Build -> Deployment -> Production
- RUNTIME: Cloudflare Workers
- DB: Cloudflare D1
- QUEUE: Cloudflare Queues(승인 contract만)
- SCHEDULER: Cloudflare Cron 또는 승인 외부 scheduler
- 2026-10-05 승인: PC가 저장 데이터 기반 시장/Korea/projection 계산을 담당하고 Cloudflare Cron은 기존 주기로 원자료를 수집한다. `ZGMINI_COMPUTE_TARGET=pc`와 `docs/PC_WRITER_R1.md`의 저장·검증 계약을 따른다. 산식/TTL/DB 스키마/DNS 계약은 변경하지 않는다.
- DOMAIN/DNS AUTHORITY: Cloudflare
- OPENAI SITES: DEPLOYMENT RETIRED
- DIRECT WRANGLER PROD DEPLOY: DEFAULT DENY
- SUPABASE: DEFAULT DENY
