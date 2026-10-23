ZGMINI PLUGIN & EXECUTION RULES — COMPACT R5 FINAL

## 0. 최상위 원칙
- 승인된 산식·데이터 구조·Revision·작업 기준 최우선.
- 승인 없는 구조/DB/배포방식/산식/DNS 변경 금지.
- 실행하지 않은 작업 완료/PASS 보고 금지.
- 소스/GitHub/Build/Deploy/Runtime/D1/Queue/UI/DNS 검증 구분.
- 실제 다음 작업을 막는 경우만 BLOCKER.
- 유효 Evidence 재사용. identity/contract 변경 시 해당 Gate만 재검증.
- ETF 테마 신규 확장은 `docs/THEME_ETF_COMPATIBILITY_STANDARD_R1_2026-10-23.md`를 따른다. 기존 7개 및 승인된 AI·바이오 선택 확장은 운영·검증 기준선이다. 신규 테마의 ETF 1종 구성이나 명시된 짧은 이력/결측만으로 기존 승인과 검증을 소급 무효화하지 않는다. 기존 검증을 재사용하고 ETF 구성·산식·가격 처리·공급원 계정/약관 계약 중 실제 변경된 부분만 추가 검증한다. 일일 가격 검증 시각/표본 갱신은 동일 계약의 승인 갱신 사유가 아니다. 새 위반 사실이 확인되면 영향 범위를 별도 감사한다.
- 무료 우선. 유료·종량제는 무료 대안이 충분하면 사용 금지.
- 상위 시스템·보안 제한을 준수한다. 동일 범위에서는 사용자의 최신 명시 지시·승인이 과거 프로젝트 지침보다 우선한다.
- 지침과 최신 승인 contract 충돌 시 실행 중단 후 최신 contract 기준으로 지침 갱신.

## 1. GitHub — SOURCE OF TRUTH
- 기준 소스는 GitHub 최신 `main`.
- 개발 main, PC 운영 승인 SHA, 실제 실행·배포 SHA를 구분한다. PC 운영 source는 config·작업 등록·실행 기록으로 확인하며 main과 다르다는 이유만으로 교체하지 않는다.
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
- PC SQLite는 원자료·수집 이력·계산 저장소, D1은 공개 결과와 승인된 최소 제어 저장소다. 일반 계산은 원격 원자료에 의존하지 않는다. Supabase 교체/중복저장 금지(승인 제외).
- API=저장 전용, 산식=저장 데이터 전용.
- 승인 산식/가중치/정규화/지표 계약 변경 금지.
- 실제 Runtime·저장/API 응답을 build/deployment 준비 상태와 구분한다. 배포 성공만으로 Runtime 정상 판정 금지.
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
- RDC 사용·실행·설치·연결·Online 요구 금지. 로컬 파일/Git/CMD는 로컬 Codex, 로그인·GUI는 사용 가능한 Computer Use를 사용한다.
- 일반 채팅의 로컬 접근 제한은 AUTOMATION_BLOCKED이며 PC writer OFFLINE을 뜻하지 않는다.
- offline/quota 소진 시 반복 polling 금지.
- Windows는 CMD-only. PowerShell/WSL 임의 사용 금지.
- CMD: 경로 quote, `%~dp0`, ASCII+CRLF, BOM 없음.
- `.sh`는 LF 유지.
- token/secret/password는 memory-only, Evidence 저장 금지.

## 14. 실행 우선순위
- 개발 소스: GitHub latest main. PC 운영 소스: 승인 config·작업 등록·실행 기록.
- 배포: `GitHub main -> Cloudflare Git integration -> Build -> exact Deployment -> Production`.
- Runtime: 실제 실행·API/저장 증거 우선. build/deploy와 Runtime 검증을 구분한다.
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
- 임시 workaround/debug endpoint/우회 스크립트 정리. 정상 운영용 로컬 키 파일은 보존하고 Git·배포·Evidence에 포함하지 않는다.

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
- 2026-10-18 사용자 승인: 이란·주변 분쟁 보도 흐름 R3의 수집 범위·분류·출처 다변화 개편을 반영한다. docs/IRAN_REFERENCE_FLOW_R3.md를 따른다. R1/R2 원장·공개 key는 보존하며 R3 별도 key/checkpoint를 사용한다. 기존 비중·단계 가감점·표시1배를 유지하고 요격은 −4로 구분한다. 미관측·포화·부분 실패를 표시하며 AIS 장애를 완화 또는 뉴스 갱신 중단으로 처리하지 않는다. reader 배포 및 검산·readback 후 운영 전환한다.
- 2026-10-15 사용자 승인: 점수 상승·하락 화살표는 실제 공개 점수 변동 시각부터 24시간만 표시한다. 점수 비교 기준·산식·데이터 갱신 주기·유효기간은 유지한다. 동일 점수 재수집·게시·새로고침은 화살표 시간을 연장하지 않는다. 상세 계약은 docs/SCORE_ARROW_24H.md를 따른다.
- 2026-10-15 사용자 승인: 이란 참고 흐름 R2를 운영 시험한다. docs/IRAN_REFERENCE_FLOW_R2.md의 단계별 가감점·기존 5영역 비중·표시 1배를 적용한다. R1 원장과 공개 키는 보존한다. R2는 별도 키·checkpoint를 사용하며 공개 reader 배포 확인 후 게시한다. 출처 실패·분석 대기·중복 후보를 성공이나 종전 확인으로 표시하지 않는다.
- 2026-10-10 최신 승인 작업: 소비 R5 5영역(D30/Y25/L15/H20/B10) 전환을 진행한다. docs/CONSUMPTION_R5.md의 비중·정규화·발표일 계약을 따른다. 실데이터 연결 및 검증 완료 전에는 R4 운영 결과를 R5로 표기하거나 후보 결과를 배포하지 않는다. R3/R4 이력은 보존한다.
- 2026-10-10 사용자 확정: 소비 R4는 월간 실질 PCE 최근 3개월 연율 70% + 전년 대비 30%이다. 각 증가율 g를 clip(50+10g,0,100)으로 변환한다. 추가 민감도·가속도 합산은 없다. 소득·저축·연체 등은 보조 정보로 분리한다. 기존 R3 저장 이력은 보존하고 R4 월간 이력과 연결하지 않는다. 상세 계약은 docs/CONSUMPTION_R4.md를 따른다.
- 2026-10-09 최신 사용자 승인: 이란 아웃브레이크 1차는 기사 기반 참고 흐름 점수로 제공한다. 임시 기준점 50에서 고정 규칙으로 확전은 하락, 완화는 상승시킨다. 기존 5개 영역 가중치는 유지한다. 엄격한 R1.3 공식 종전 판정과 분리하며 종전 확률로 표시하지 않는다. 최근 14일 차트는 보도일 기준 재구성임을 명시하고, 수집 실패는 마지막 값 보존·갱신 지연으로 처리한다. 이 참고 모델의 출시 조건에 AIS 완전 검증이나 공식 종전 확인을 추가하지 않는다.
- SOURCE OF TRUTH: GitHub latest main
- DEPLOYMENT CONTROL PLANE: Cloudflare
- DEFAULT DEPLOY: GitHub main -> Cloudflare Git integration -> Build -> Deployment -> Production
- RUNTIME: Cloudflare Workers
- DB: PC SQLite 원자료·이력·계산 / Cloudflare D1 공개 결과·승인 최소 제어
- QUEUE: Cloudflare Queues(승인 contract만)
- SCHEDULER: Windows 작업 ZGMINI-PC-Local-Core / ZGMINI-PC-Local-Korea / ZGMINI-PC-Iran-Progress-R13. 기존 ZGMINI-PC-Writer는 비활성 복구용이다. Cloudflare Cron=0, ZGMINI_COLLECTION_TARGET=pc, ZGMINI_COMPUTE_TARGET=pc 유지. 승인 없는 원격 수집·계산 스케줄러 재활성화 금지.
- 2026-10-05 최신 승인: PC가 API 수집·원자료 저장·시장/Korea/projection 계산을 담당한다. Cloudflare에는 공개 결과만 게시한다. PC 게시 검증 후 Cloudflare Cron 수집을 중지한다. `docs/PC_WRITER_R2.md`가 이전 R1의 수집 위치 계약을 대체한다. 산식/TTL/원격 DB 스키마/DNS 계약은 변경하지 않는다. RDC는 사용하지 않는다.
- DOMAIN/DNS AUTHORITY: Cloudflare
- OPENAI SITES: DEPLOYMENT RETIRED
- DIRECT WRANGLER PROD DEPLOY: DEFAULT DENY
- SUPABASE: DEFAULT DENY

## 20. E: 이전 후 로컬 경로 계약
- 현재 운영 경로·복구 정책은 `docs/PC_STORAGE_E_DRIVE.md`를 따른다.
- 프로젝트 `E:\ZGmini\projects\`, 데이터 `E:\ZGmini\data\`, writer `E:\ZGmini\data\pc-writer\`, 이란 `E:\ZGmini\data\iran-progress-r13\`, Node `E:\ZGmini\runtime\node.exe`.
- 기존 C: 프로젝트 경로와 `%USERPROFILE%\.zgmini`는 호환용 junction이다. 문자열만으로 미이전 판정·일괄 치환하지 않는다. 실제 대상을 확인한다.
- junction 삭제·C: 운영 폴더 재생성·DB/checkpoint 초기화 금지. E: 접근 실패 시 빈 DB나 C: 대체 저장소를 만들지 않는다.
- PC·로그인 세션·인터넷·E: 연결이 운영 조건이다. 채팅·Codex 창·RDC Online은 조건이 아니다.
- 개인 PC 경로는 운영 배치 기록이며 모든 환경의 하드코딩 기본값이 아니다. 기존 경로 설정과 junction 호환을 보존한다.
- 경로 이전만으로 운영 source·산식·TTL·DB 구조·작업 주기·배포·DNS를 변경하지 않는다.
