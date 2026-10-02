# Cloudflare Workers 이전 1차 감사 — 2026-10-02

## GOAL
GitHub main → Workers Builds 자동 배포로 이전한다. zgmini.kr, 기존 D1 데이터·수집·점수·API·상세페이지를 보존한다. 기존 Sites는 전환 승인 및 검증 전까지 유지한다.

## CURRENT_ARCHITECTURE
- 최초 로컬 main: 20b3f3d11c3b38d5365591c58fae976ca1fad05b, 작업 변경 없음. origin은 GitHub가 아닌 Sites Git 서버이며 cached origin/main보다 2 commits 뒤였다.
- 로컬 migration/cloudflare-workers-r1은 확인된 Sites ref de0504f191ab2ba5e0bdbdebd312f162f25f035e에서 분리했다. 원래 main은 이동하지 않았다. Sites 원격 재확인은 응답하지 않아 중단했다. 이 ref를 최신 Production과 동일하다고 주장하지 않는다.
- GitHub main은 실제 fetch 기준 7369d8d203f084bed8f9d766fc0952d42b972c7b. 공통 조상은 0c4098b2dbc8b1d0818194603b6710a3ccccfccf. Sites ref와 60 files / 535 insertions / 2285 deletions 차이. GitHub에 상세페이지와 API 여러 개가 없다. 덮어쓰기 또는 무조건 merge하지 않았다.
- Sites 서비스 조회: active, live URL https://zgmini.kr, latest version number 377. 이는 최신 버전 번호이며 배포 commit 증거가 아니다.
- 실제 DNS 조회: zgmini.kr CNAME custom-domains.chatgpt.site. Cloudflare zone 소유·계정·nameserver는 미확인.
- vinext 0.0.50, Cloudflare Vite plugin 1.37.1, Wrangler 4.92.0, Vite 8.0.13, Node >=22.13.0. package-lock 고정. 설치된 node_modules를 재사용했으며 fresh npm ci 증거는 없다.
- worker/index.ts의 fetch → vinext app-router; D1 DB, ASSETS, IMAGES 사용. DB 저장 adapter는 cloudflare:workers와 D1 prepare/batch 및 Drizzle을 사용한다. db/schema.ts와 drizzle/*.sql 외에 Worker의 런타임 테이블 생성 SQL도 보존 대상이다.
- 감사 대상 101개 파일의 경로·크기·SHA256은 source-inventory-20261002.json. env 이름은 코드 참조 이름이며 실제 secret 존재·유효성 증거가 아니다.

## SITES_DEPENDENCIES
1. vite.config.ts의 .openai/hosting.json import와 Sites metadata packaging plugin. 실제 DB ID/계정/secret 주입은 저장소에 없다. database_id는 로컬 placeholder다.
2. build/sites-vite-plugin.ts는 dist/.openai에 hosting와 drizzle migrations를 복사한다. 직접 Workers deploy는 이 metadata로 DB 연결/스키마를 자동 복원하지 않는다.
3. scripts/sites-env.sh 및 install-ci.sh/build-verified.sh는 Sites writable HOME/cache, Linux flock/timeout, seeded npm cache를 전제한다. 직접 Cloudflare 빌드는 npm ci + Vite로 분리한다.
4. app/chatgpt-auth.ts는 oai-authenticated-user-* 헤더를 신뢰하며 /signin-with-chatgpt, /signout-with-chatgpt, /callback을 Sites가 처리한다. favorites/session 및 내부 운영 API가 이를 사용한다. 직접 공개 Worker에서 방문자가 보낸 동일 헤더를 신뢰하면 안 된다. 검증된 auth와 기존 userId 매핑이 필요하다.
5. middleware.ts는 zgmini.kr 이외 host를 308 redirect한다. preview에서 기존 Production으로 이동하므로 새 Worker 검증 증거로 쓸 수 없다.
6. 운영 provider secrets, scheduler credential, 외부 scheduler 실제 설정, custom domain/인증서 관리가 Sites 밖으로 이어져야 한다.

## CLOUDFLARE_READY
vinext/Cloudflare plugin, fetch/scheduled entrypoint, nodejs_compat, D1 adapter, 기존 점수·수집·저장 모듈은 구조상 재사용 가능하다. 스키마·산식·provider fallback을 변경하지 않았다. R2는 hosting config에서 null이다. IMAGES는 코드에 존재하며 기존 UI의 사용 여부·계정 entitlement를 검증해야 한다.

별도 vite.cloudflare.config.ts / wrangler.cloudflare.json을 추가했다. Sites plugin과 metadata import가 없다. routes/crons는 비었고 workers_dev/preview_urls는 false, remoteBindings는 false다. 실제 D1 대신 명시적인 미해결 placeholder를 유지한다. 이것은 로컬 빌드 준비이며 deploy 가능한 완료 설정이 아니다.

## BLOCKERS
- 전환 범위: 실제 Sites D1 소유 account/database ID 및 사용자 Cloudflare 계정에서의 bind/export 권한 미확인. 직접 접근 가능하면 동일 DB를 재사용하여 데이터 이전 불필요. 다른 계정의 관리 DB라면 그대로 bind 가능하다고 가정할 수 없으며 공식 export와 최종 쓰기 동기화 방법이 필요하다. GitHub 코드는 데이터 백업이 아니다.
- 무손실 source: GitHub main과 Sites ref가 갈라져 상세페이지/API 누락이 실제 diff에 있다. 배포 source commit을 확인하여 단일 authoritative baseline으로 수렴해야 한다.
- 인증 보존: Sites identity gateway를 직접 Worker로 가져올 수 없다. 즐겨찾기 기존 userId를 보존하는 인증 대체와 내부 API 접근 제어가 필요하다.
- domain 전환: Cloudflare zone 소유 및 현재 CNAME 교체 권한 미확인. 준비 작업에는 영향 없지만 cutover에는 필수다.

## NON_BLOCKING
middleware deprecation과 dynamic import bundle warnings는 빌드를 막지 않았다. Windows 시스템 Node 대신 bundled Node 24.19.0을 사용해 빌드했다. Sites Git 읽기 timeout은 기존 Production 실패를 뜻하지 않는다. 과거 D1 저장 기록은 현재 DB의 크기·row count·소유권 증거가 아니다.

## FREE_PLAN_FIT
판정: 조건부/운영 적합성 미확인. Free를 보장하거나 Paid 신청하지 않았다.
- Workers: 100,000 requests/day, HTTP CPU 10ms, memory 128MB, 외부 subrequests 50/request. SSR와 score precompute CPU를 실제 Worker에서 측정해야 한다. I/O 대기 시간과 CPU는 다르다.
- 현재 native crons: */5 * * * *, 17 * * * *, 37 * * * * → 288+24+24=336 scheduled invocations/day. Free account cron 한도 5개 대비 이 프로젝트는 3개지만 계정 전체 사용량은 미확인. Cron CPU도 10ms라 heavy collector/score 재계산은 적합하다고 단정할 수 없다. 외부 scheduler HTTP로 호출해도 CPU 제한이 사라지지 않는다.
- config/api-operations.json은 provider schedules registry이며 runtimePolicyLoaded=false다. registry의 15분 주기와 native hourly cron을 혼동하지 않는다. 외부 market/korea/employment endpoints는 실제 외부 scheduler 설정과 별도 확인한다.
- D1: 5 million rows read/day, 100,000 rows written/day, 500MB/database, total 5GB, 10 DBs, 50 queries/invocation, Time Travel 7 days. SQL scan counts와 runtime CREATE/DELETE/UPSERT까지 합산해야 한다. 현재 사용량/DB 크기 미확인.
- Builds: 3,000 minutes/month, concurrency 1, timeout 20min, 2 vCPU/8GB. 빌드 구조는 적합하나 월 push 횟수와 account 전체 사용량은 미확인. 숫자는 2026-10-02 공식 문서 기준이며 과거 Free cron 3개/번들 3MB 수치를 적용하지 않는다.

Sources:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/

## MINIMUM_MIGRATION_CHANGES
- 추가 완료: vite.cloudflare.config.ts, wrangler.cloudflare.json, scripts/check-cloudflare-migration.mjs, 본 감사·inventory. 기존 Sites 설정, worker, db, 산식은 변경하지 않았다.
- 확정 후 변경: package.json의 build:cloudflare / deploy:cloudflare (Vite와 생성 dist/server/wrangler.json 사용), 실제 existing DB binding/account ID, runtime secrets 안전 등록, preview host 제한 middleware, 검증된 auth adapter/identity header 제거, DB 오류 메시지의 Sites 안내 정리.
- 보존: worker/**, db/schema.ts, drizzle/** 및 runtime SQL. 직접 배포 명령에 D1 migration apply/create/delete를 연결하지 않는다.
- account 확인 후 IMAGES 바인딩 사용 가능성 검증. 사용 경로가 있다면 서비스 entitlement 또는 기존 동작을 보존하는 대안을 결정한다.

## MIGRATION_SEQUENCE
1. Production 배포 commit·route/API 목록·현재 collector/checkpoint/DB 크기와 집계·secret 이름을 기록. source divergence를 별도 migration branch에서 해결한다.
2. 동일 D1 bind 가능성부터 확인한다. 불가 시 공식 export 가능성과 증분 동기화 설계를 먼저 확정한다. 기존 Sites는 계속 운영한다. 임의 새 DB 생성 금지.
3. 사용자 계정 Cloudflare에 독립 candidate를 준비. cron 없음, 기존 Production DB 쓰기 없음, 내부 변경 endpoint 접근 차단, 인증 헤더 위조 방지. 새 임시 host에만 제한적으로 접근하고 canonical redirect 예외를 특정 host에만 둔다.
4. 인증/userId, 기존 상세페이지·API·본문/점수 일치, DB 읽기, asset/image, scheduler auth, CPU/D1 read-write 측정. fixture/build와 Production 검증을 구분한다.
5. Workers Builds에서 ansqhd5774-Choi/zgmini 연결. initially migration branch와 candidate worker에 연결하고 repo root를 확인. install npm ci, build npx vite build --config vite.cloudflare.config.ts, deploy npx wrangler deploy --config dist/server/wrangler.json. build variables와 runtime secrets는 별개. Worker dashboard name과 config name을 일치시킨다. main 자동배포는 source reconciliation과 승인 후 연결한다.
6. 승인 요청 자료: candidate runtime 결과, DB rollback/백업, exact DNS 변경안, collector 단일 writer 계획, source SHA, cron·secret 체크. 여기서 Production 변경 승인 전 멈춘다.
7. 승인 후 최종 DB checkpoint/백업 확보. 공유 DB라면 collector를 단일 writer로 인계하고 소스/스키마 변경 없이 재사용한다. 계정 이동이면 이 시점에만 승인된 짧은 쓰기 동결·최종 동기화·집계 검증을 수행하며 reads는 기존 Sites에서 유지한다. 완전한 무중단은 공유 DB 또는 검증된 동기화 경로가 있을 때만 확정한다.
8. zgmini.kr는 현재 CNAME이 있으므로 단순 Add Custom Domain은 충돌한다. active zone/ownership/cert 준비 후 승인된 기존 record 교체와 custom domain 연결을 수행한다. Sites 배포와 원복용 CNAME을 유지한다.
9. 실제 도메인에서 API/detail/auth/asset/score freshness/collector checkpoint 검수. 실패하면 DNS/route를 기존 Sites로 복구, 신규 writer/crons 중단, 기존 writer를 한 번만 재개. 같은 DB에 과거 dump를 덮어써 최신 행을 잃는 rollback 금지.
10. 안정성 확인 및 별도 승인 후 Sites 의존 제거. 기존 Sites 제거와 DB 삭제는 자동 수행하지 않는다.

Sources:
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/

## NEXT_ACTION
Cloudflare 로그인 후 read-only 계정/zone/D1 inventory 확인. 배포 commit과 source 차이를 해결한 후 candidate 설정을 완성한다. 현재 배포/도메인/DB 변경은 수행하지 않는다. 준비된 check-cloudflare-migration.mjs는 제한 설정을 검사하며 --deployment-readiness는 미해결 조건에서 실패한다.

## 실행 검증
- 별도 Vite build: 5개 build 단계 완료, exit 0. Sites plugin을 실행하지 않았다.
- Wrangler 4.92.0 deploy --dry-run --config dist/server/wrangler.json: exit 0, upload 없음. Total Upload 5463.33 KiB / gzip 1069.07 KiB, assets 41 files. 이는 CPU/startup/실제 DB 연결 성공 증거가 아니다.
- migration 제한 설정 검사 PASS. API registry 17 providers source/storage 검사는 PASS. 기존 native cron/precompute/backlog 테스트 7/7 PASS. 실제 provider 호출 또는 D1 쓰기 테스트는 수행하지 않았다.
- Cloudflare dashboard는 실제 로그인 화면이었다. zone/account/D1 read-only 확인은 로그인까지 AUTOMATION_BLOCKED이며 기존 Sites Production 장애가 아니다.
- 준비 코드 외 기존 application/worker/db/config 변경 없음. main push, Sites deploy, custom domain 변경, DB create/delete/migrate, 유료 기능 신청 없음.
