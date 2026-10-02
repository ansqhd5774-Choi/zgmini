# ZGMINI Cloudflare Workers Migration R2

## R2_STATUS
감사와 로컬 배포 준비를 진행했다. Production/DNS/DB 쓰기 변경 0, Worker deploy 0, main 자동배포 활성화 0. 실제 candidate runtime은 D1/Auth/Domain gate 때문에 준비 완료로 보고하지 않는다.

## SOURCE_AUTHORITY
Sites 공식 list_site_versions + get_deployment_status에서 버전 377의 source commit de0504f191ab2ba5e0bdbdebd312f162f25f035e, deployment succeeded를 확인했다. 현재 get_site는 latest 377 / active / zgmini.kr다. source authority 미확정 gate는 해소됐다.

migration branch는 이미 이 source의 descendant였다. 최초 로컬 main 20b3f3d는 375 source로 대응한다. GitHub main 7369d8d203f084bed8f9d766fc0952d42b972c7b는 현재 fetch로 재확인했다. Sites remote cached ref와 Production source는 동일하지만 remote latest branch 자체는 R1 timeout 이후 재확인하지 않았다. 저장된 공식 배포 source를 부정하지 않는다.

세 diff와 공통 조상 기준 review를 저장했다. snapshot local/migration HEAD는 R2 시작 aa8ff46400a63405d27d6208f1fcd4d8c3097f27이다. R2 추가 변경은 package scripts/account ID/docs뿐이며 application source는 Production과 같다.

60개 차이: Sites만 변경 42, 양쪽 변경 13, GitHub만 변경 5. merge-tree는 conflict(exit 1)이므로 생성된 virtual tree는 적용하지 않았다. 8개 상세페이지와 detail API는 모두 Production 기준으로 보존했다. GitHub 쪽에는 해당 page/API가 없다.

Reconcile 결정:
- 42 Sites-only: 전부 유지한다. main의 오래된 트리로 삭제하지 않는다.
- 13 양쪽 변경: Production 최신 staged growth collection/BFS CSV/부분 coverage 우선순위/earnings backfill/상세 contract/dashboard를 유지한다. GitHub의 alternate collector와 gauge UI는 현재 운영 결과를 바꾸므로 이 migration에 합치지 않는다. new scheduler import/backfill 목적은 Production worker에 이미 존재하지만 두 구현의 byte equality를 주장하지 않는다.
- GitHub-only 5개는 test-only 변경이다. 3개 시험 적용을 fixture에서 검증했으나 30개 중 5개 실패했다. 원본 Production 테스트를 복구했으며 같은 30개/25 pass/5 fail을 확인했다. 이는 새 migration runtime 변경으로 생긴 회귀가 아니다. 나머지 2개는 alternate UI/collector fixture에 의존하므로 보류한다. assertion을 삭제하거나 Production 코드를 바꿔 test를 억지로 맞추지 않았다.

## CLOUDFLARE_ACCOUNT
사용자 직접 로그인 완료 후 현재 계정 Ansqhd5774@gmail.com's Account / 6e9b57e718b247330a6efa42a9516e95를 읽기 전용 확인했다. Workers Free Current plan. Worker 1개, Pages 0개, 기존 Worker는 zgmini-kfg-v2-daily-scheduler다. Builds usage 0 minutes, Git repository 연결 없음. 기존 Cron 1개/12시간마다 실행, bindings 0개, secret 이름 ZGMINI_DAILY_SECRET만 확인했다.

## ZONE_STATUS
현재 계정 Zone 목록 0개. zgmini.kr zone/status/할당 nameservers/관리 DNS record는 이 계정에서 확인할 수 없다. R1의 공개 DNS CNAME custom-domains.chatgpt.site 증거를 재사용했다. 이 결과만으로 registrar 계정의 DNS 수정 권한이 없다고 단정하지 않는다. 직접 custom domain 전환에 필요한 active zone은 현재 계정에 없다.

## D1_IDENTITY
NOT_PROVEN. 현재 계정 D1 0개, rows read/write/storage 0은 이 계정의 값이다. Sites Production D1이 비었다는 뜻이 아니다. Sites D1 ID/name/account/table/row counts/checkpoints를 알 수 없어 동일성 비교를 수행하지 못했다. SAME/Different 어느 쪽도 추정하지 않는다. export/import/create/delete/migration apply 모두 0.

## AUTH_STATUS
공개 dashboard는 비로그인 상태에서도 작동하도록 구성됐다. session/favorites 및 내부 운영 기능은 Sites 인증 헤더에 의존한다. source에서 userId를 생성하지 않고 gateway의 opaque ID를 그대로 DB에 저장한다. 기존 ID를 새 IdP subject/email hash로 치환하지 않는다. verified session + trusted 기존 ID mapping 설계만 작성했으며 구현하지 않았다. userId 연속성 gate는 미해결이다.

## CANDIDATE_STATUS
build:cloudflare, deploy:cloudflare:dry-run을 추가했다. 확인한 account_id를 별도 migration config에 넣었다. DB는 실제 ID가 아닌 UNRESOLVED placeholder를 유지했고 routes/crons/public preview는 비활성이다. remoteBindings=false. deploy 준비 검사에서 D1 미해결로 fail-closed한다.

R2 Vite build exit 0, 16.986 seconds. Wrangler dry-run exit 0, gzip 1069.07 KiB. runtime CPU/DB/auth 검증은 수행하지 않았다. generated config의 account ID와 제한 설정은 검사한다. 실제 DB read-only 연결이나 internal mutation HTTP 차단은 아직 구현되지 않았으므로 준비된 설정을 그대로 실배포해서는 안 된다. Auth implementation도 0이다.

## FREE_PLAN_STATUS
전체 WARN. 현재 계정 Free, 기존 Cron 수, local build/assets 범위는 PASS. candidate SSR/API CPU, D1 실제 scan/writes, subrequests, scheduled collector CPU, Images binding은 WARN. 확인된 초과 증거가 없어서 FAIL을 만들지 않았다. Images hosted storage는 미구독이며 Free transformations 5,000/month 문서와 실제 binding 사용 가능성은 별개다. 유료 활성화하지 않았다. measurement plan에 구체적인 sample/중단/limit 기준을 기록했다.

## BLOCKERS
1. D1 identity/소유 계정 접근 미확정: 실제 candidate DB 연결을 막는다.
2. 검증된 기존 userId mapping 미확정: 회원/즐겨찾기 Production 전환을 막는다.
3. 현재 계정 active zgmini.kr zone 부재: custom domain 전환을 막는다. 권한 없음과 설정 부재를 구분한다.
4. 실제 DB 연결 전 candidate read-only boundary 검증 필요: existing native DB binding이 자동 SELECT-only는 아니다. Cron 비활성만으로 HTTP 쓰기 위험이 제거되지 않는다.

## NON_BLOCKING
기존 fixture 5 failures, build warnings, candidate runtime/Free 측정 미완료, Sites remote 최신 ref 관찰 제약. 원격 ref 제약은 공식 Production source 확인을 무효화하지 않는다.

## CHANGED_FILES
package.json, wrangler.cloudflare.json, docs/migration/r2/**. 기존 worker/db/auth/middleware/UI/score source는 변경하지 않았다. GitHub-only 테스트는 시험 후 원복했으며 최종 commit에 포함하지 않는다.

## EVIDENCE
production-source-evidence.json, cloudflare-inventory.json, source-comparison.json, 3 *.diff, three-way-review.txt, github-tests-compatibility.json, r2-build-result.json, build-assets.json. 인증정보 값·user record 원자료는 저장하지 않았다.

## NEXT_ACTION
Sites의 공식 D1 identity/소유 계정·접근 방식과 기존 opaque userId 연계 수단을 확보해야 한다. 현재 connector는 DB resource inventory/SQL 조회를 제공하지 않고 env 이름 목록에는 DB ID가 없다. 새 DB 생성이나 Sites 쿠키/인증 추출로 대신하지 않는다. 해당 증거 확보 후 identity match → read-only candidate boundary → 허용된 runtime 검증 순으로 재개한다. R2에서는 deployment 자체가 금지돼 실행하지 않았다.
