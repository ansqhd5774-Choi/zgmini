# R2 Free 측정 실행명세

현재 종합 판정: WARN. 런타임 측정 미완료는 NON_BLOCKING이며 측정값을 추정으로 채우지 않는다. 여기서 PASS는 관측된 범위에만 적용한다.

|항목|현재 관측|판정|실제 candidate 측정 방법|
|---|---|---|---|
|계정 Workers 플랜|대시보드 Free / Current plan|PASS|변경 없이 유지|
|HTTP CPU|candidate 미배포. 기존 scheduler CPU는 candidate 증거 아님|WARN|cold/warm 별로 각 route 10회, trace cpuTime으로 max/p95 기록. <=10ms 필요|
|dashboard SSR CPU|미측정|WARN|preview /에서 Worker trace CPU 확인. wall duration과 구분|
|/api/market-score CPU|미측정|WARN|stored-only 실제 반환 contract 확인 후 같은 제한 횟수 측정|
|D1 rows_read/rows_written|이 계정 D1 0개. Sites 실제 사용량 미확인|WARN|identity/read boundary 확인 후 query meta와 Metrics 비교. candidate rows_written 반드시 0|
|scheduled CPU|기존 scheduler 1 cron. 새 collector 미실행|WARN|Production collector 실행 금지. 이후 별도 승인된 격리 입력에서 실제 cpuTime 측정. 외부 HTTP 호출로 CPU 제한 우회 불가|
|build|R1 독립 build와 dry-run PASS. R2 script 실행 시 duration 기록|PASS|고정 lockfile 기준 Cloudflare Build duration과 월 actual build minutes 기록; fresh CI install 별도|
|assets|R1 dry-run 41 files; bundle gzip 1069.07 KiB|PASS|빌드 산출물 파일 수/개별 최대 byte 기록. Free 20,000 files/25MiB 대비 검사|
|subrequests|candidate 미측정|WARN|Worker trace/metrics에서 요청별 실제 외부+내부 query 분리 기록. provider calls 0이어야 함|
|Cron 수|현재 계정 1개 + 이전 예정 native 3개 = 4개|PASS|Free 계정 5개 이내. 실제 전환 승인 전 새 Cron 등록 금지|
|Images|Hosted storage 미구독; binding 변환 호출 미검증|WARN|유료 구독 신청 없이 공식 Free transformation entitlement와 실제 binding 사용 여부 확인|

10회라는 표본은 최소 smoke measurement이며 전체 traffic 또는 모든 cold path를 보장하지 않는다. 최초 FAIL/DB write attempt/auth bypass가 있으면 반복 호출하지 않고 중단한다. CPU <=10ms, subrequests <=50, D1 queries <=50/invocation, 전체 D1 rows read <=5M/day 및 write <=100K/day, DB <=500MB, account <=5GB 여부를 실제 수치로 판정한다.

D1 row read는 반환 행 수가 아니라 scan 수다. 전체 DB COUNT 반복은 쿼터를 소비하므로 row count inventory는 DB identity 확인 후 한 번의 bounded aggregate 범위로 제한한다. scheduled 336 invocations/day만으로 row read/write 적합성을 확정하지 않는다.

Sources (2026-10-02 확인):
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/
- https://developers.cloudflare.com/images/pricing/
- https://developers.cloudflare.com/images/optimization/binding/

## CI 경로
install npm ci (Node >=22.13.0) → npm run build:cloudflare → 승인 후 generated dist/server/wrangler.json으로 deploy. npm run deploy:cloudflare:dry-run은 먼저 fresh build하고 upload하지 않는다. main Builds 연결, 실배포 명령 실행, runtime secrets 등록, custom domain 등록은 R2에서 수행하지 않았다.
