# R6 최종 감사

R6_STATUS: DONE_AUDIT / FREE_FIT_NOT_YET_READY

## 실제 측정
- 배포 버전: 기존 R5 b22b191f-85fa-4f96-9297-088627266138 유지. R6 deploy0.
- 최종 paced workload: 13 routes, HTTP888 requests, 공식 CPU 표본403개(각31개), JSON parser errors0.
- 초기 짧은 간격 workload: 403 requests, CPU coverage 부족. initial-sampled-profile.json에 별도 보존; 최종 분위수에 포함하지 않는다.
- 요청 간격350ms, HTTP redirect manual, candidate hostname 고정. URL/query/header 원자료 대신 필요한 측정 필드만 저장한다. wrangler tail은 종료했고 남은 해당 tail 프로세스0.
- CPU/wall은 Cloudflare live-tail의 cpuTime/wallTime. client_elapsed_ms는 네트워크 포함 별도값이며 CPU로 사용하지 않는다. nearest-rank quantiles; integer-ms precision. CPU0은 sub-ms 반올림 범위이지 실제 계산0이라는 뜻이 아니다.
- 누락된 trace는0으로 채우지 않는다. 공식 tail은 샘플링될 수 있으며 0.999999 설정에서도 누락이 있었다. 전체 HTTP888개 중 캡처된403개만 CPU 집계. 전체 요청의 정확한 P99로 확대하지 않는다.
- First-observed와 sequential-warm 그룹을 별도 저장. warm은 연속 요청 그룹이며 isolate 재사용/실제 cold 여부를 확인한 결과는 아니다.

## 판정
FREE_PLAN_STATUS: FAIL. / 및 상세8개 모두 P95>10ms 또는 반복 초과. 총80개 captured outlier, 전체 개별 timestamp/response size/phase/SSR 여부는 CPU_RESULTS.md 및 route-profile.json에 기록.
대시보드31/31 captured CPU가10ms 초과. 전체 P95/P99 89/94ms, sequential-warm 그룹 P95/P99 35/36ms. 따라서 단발 cold/bootstrap만으로 설명되지 않는다.
DB503 API 둘은 관측 CPU PASS(0ms 정밀도). 실제 D1 조회/계산/API JSON이 우회됐으므로 미래 DB 연결 후 endpoint 성능 PASS가 아니다.
/api/session은 P95=2/P99=13ms, warm 그룹 outlier1개. 단일 outlier의 bootstrap/cold 원인 미확정이므로 사용자 WARN 조건을 만족했다고 선언하지 않는다: NOT_PROVEN_WARN_CAUSE.
/flags/us.svg는 별도 asset control: CPU P99=3ms, PASS. static asset이며 현재 Worker-first dispatch 비용 포함.
캡처된 runtime errors0, 각 페이지200/API503 또는session200/asset200. CPU limit1102 관측0. >10ms 로그가 있어도 오류0이라는 이유로 Free PASS로 처리하지 않는다.
요청별 subrequests와 cache hit/miss는 공식 tail/응답에 제공되지 않아 UNKNOWN. R5 aggregate subrequests를 route별 값으로 나누지 않는다.

## 원인 및 최소 방안
현재 반복 초과 경로는 Vinext/React request-time RSC/SSR HTML render와 연결된다. API guard/ASSETS 경로와 분리한 실제 CPU 증거 및 source/build output을 사용했다. symbol-level CPU 비중과 dynamic import/bootstrap/JSON 각각의 비용은 미확정.
상세8개는 synchronous shell+client-side data API이므로 STATIC_HTML_POSSIBLE. 대시보드도 후보. 산식·schema·history·live API 의미를 그대로 유지하고 build-time HTML/RSC allowlist 정적 생성부터 검증하는 것이 최소안이다. 구체적인 파일/계약/검증과 CI 설정은 OPTIMIZATION_AND_BUILD_PLAN.md 참조.

OPTIMIZATION_APPLIED: NONE. optional 최적화는 적용하지 않았다. BEFORE_AFTER: baseline profile만 확보; after 측정 없음. 운영 의미를 바꿀 수 있는 전역 export/캐시 우회나 application 변경 없이 감사 완료.
AUTO_BUILD_STATUS: AUTO_BUILD_PARTIAL. root/install/build/deploy/branch/env/secrets/name 분리안 작성. 실제 Cloudflare clean CI 미검증, branch gate의 detached-HEAD 대응 필요, Git 연결/자동배포 활성화0.

## 변경과 검증
Production/DNS/D1/main 변경0; 기존 Sites writer/Cloudflare scheduler 구성 변경0. 해당 항목은 R5 유효 증거와 이번 작업이 read-only candidate HTTP/tail 및 migration 문서 변경뿐이라는 action evidence를 재사용한다. DNS/D1/Auth 재조사0.
application/score/schema/middleware/worker/index.ts는 de0504f와 diff0. R5 generated config/bundle contract check 현재 PASS.
새 profiling/summarizer node --check PASS. git diff --check PASS. R5 동일 application의 build PASS 및 guard tests5/5 PASS 증거 재사용. R6 source에 runtime 변경이 없어 새 build/배포/브라우저 UI 재검사를 반복하지 않았다.
변경 파일은 scripts/profile-candidate-r6.mjs, scripts/summarize-candidate-r6.mjs 및 docs/migration/r6/*뿐이다.

## Blockers / Next
R6 감사 자체의 BLOCKER 없음. Free 운영 gate는 현재 SSR CPU FAIL; 실제 이전 gate D1 SUPPORT_REQUIRED 유지. Logs partial capture/cache/subrequests/cold identity는 측정 한계이며 감사 중단 사유로 확대하지 않는다.
정적 shell 호환성+동일 workload before/after 최적화 검증을 다음 별도 범위로 제안한다. R6는 여기서 STOP; Production/DNS/D1/main 전환 또는 자동배포 활성화 금지.
