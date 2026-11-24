# ZGMINI W04 고용지표 — 운영 완료 5단계 실행계획

개정일: 2026-11-25 KST  
작업 저장소: `ansqhd5774-Choi/zgmini`  
작업 브랜치: `codex/employment-1y-reader-r1`  
계획 개편 직전 HEAD: `20fd8977766be7634605efa8a4f68a1863c2b339`

## 1. 현재 위치와 최종 목표

**현재: 3/5단계 완료(1·2·4), 3·5단계 진행 중.** 완료 조건 충족 개수이며 작업량의 20% 또는 운영 복구 20%라는 뜻이 아니다. 이 문서 개정으로 기능 완료 개수는 늘어나지 않는다.

기존 고용지표 29개가 실제 저장 원자료에 따라 계산·게시·표시되고, 기존 자동 실행에서 갱신되는 상태를 완성한다. 공개 기준일, 실제 관측일, 저장·게시 시각을 구분한다. 과거 자료가 부족한 범위는 정확한 PARTIAL로 공개하되 현재 수집·게시 전체의 전역 선행조건으로 만들지 않는다.

이 문서가 W04의 현재 실행 순서 정본이다. 과거 72단계 계획과 53/72(73.6%)는 완료 증거 추적용으로 보존하며 신규 실행 순서·기능 완료율로 사용하지 않는다. 과거 PIT-07의 7개 이력 쓰기는 적격 자료가 없는 별도 보류 항목이고, 과거 PIT-09/10의 12개 검증은 아래 2·4·5단계에 묶는다. 새 승인 Gate를 만드는 개편이 아니다.

## 2. 실제 실행 순서

| 단계 | 작업 | 완료 기준 | 현재 판정 |
|---|---|---|---|
| 1 | 운영 기준선 확정 | 유효한 기존 설치·PC 저장 계산·공개 API 증거로 버전/시각/지표 수 및 현재 결함을 식별 | DONE |
| 2 | 저장·게시 연결 확인 및 필요한 최소 복구 | 기존 Writer 게시 원장→D1 정확키→공개 API의 같은 결과 확인. 다르면 최초 불일치 연결만 수정·검증 | DONE |
| 3 | 원자료 갱신 정상화 | DOL 차단·오래된 관측일의 원인을 고치고, 공급처에서 실제 제공되는 최신 자료의 수집·저장·계산 전진 확인 | IN_PROGRESS |
| 4 | PC·모바일 표시 확인 및 필요한 최소 수정 | API와 화면의 29개 ID·원값·관측일·단위·점수/차트 상태 일치. 결측과 부분 이력을 정확히 표시 | DONE |
| 5 | 기존 자동 실행 확인과 종결 | 유효한 기존 정규 실행 기록으로 정상 갱신/정당한 UNCHANGED를 확인하고, 코드·운영·자료 한계를 구분해 종결 | IN_PROGRESS |

순서는 기본 작업 흐름이다. 2단계의 특정 D1 조회 도구 제한이 3단계의 기존 수집 로그 분석이나 4단계의 공개 화면 확인까지 막지 않는다. 동일 자원에 겹치는 쓰기만 기존 절차로 직렬화한다. 문서·진단·승인 파일 수를 늘리는 것을 진척으로 계산하지 않는다.

## 3. 현재 증거 — 1단계 완료 근거

- Controller B [#2597](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2597#issuecomment-7058230482): SUCCEEDED / APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED, 실제 target=installed `5b33787dd32523496cd5a87dca73beb07ffaa409`. 기존 #2505 복구는 완료된 이력이며 다시 시작하지 않는다.
- 독립 실제 A [#2599](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2599#issuecomment-7058226952), Run `44872832077`, 원격 `results/44872832077-1-seat-3.json`: PASS / CORE_READONLY_DIAGNOSIS. Core-only 저장 결과 checksum·모델 검증 VERIFIED. 공급자·D1 쓰기 0, 보호 상태 불변. 동일 source의 유효 증거를 재사용한다.
- 위 PC 결과: `sourceStoredAt=1795220421678`, 지표 29개, chartReady 22개, `methodologyVersion=EMP-R6-FORMULA-R2-CPS-2025-10`, `formulaHash=sha256:04486846cd6063452d1c764116d3a31209f074d23a8764bf5b6ec8467095210e`.
- 2026-11-21 이번 계획 검토의 Production 직접 GET [공개 API](https://zgmini.kr/api/employment-r6/observations): HTTP 200, status PARTIAL, asOfDate 2026-11-21, 29 indicators. 위 모델 버전·formulaHash·sourceStoredAt과 일치. summary는 sourceFeatures 29 / recentlyObservedFeatures 22 / chartReadyFeatures 22 / chartPartialFeatures 5 / scoredFeatures 28 / recentlyScoredFeatures 22. 이는 선택 메타데이터 대조이며 PC·D1·공개 본문 전체 동치 검증은 아니다.
- API 실제 관측일: INITIAL_CLAIMS·INITIAL_CLAIMS_4W·CONTINUED_CLAIMS는 2026-10-24, STATE_CLAIMS_BREADTH는 2025-07-19이며 scoreStatus PARTIAL_HISTORY. asOfDate 11월 21일을 원자료의 최신 관측일로 보고하지 않는다. API와 과거 격리 차트의 날짜가 다른 경우 입력 범위·as-of·변환을 구분해 원인을 확인한다.
- #2599의 수집 checkpoint는 DOL_UI_WEEKLY_CLAIMS에 CIRCUIT_OPEN / DOL_RELEASE_OBSERVATION_STALE을 기록했다. 이 증거만으로 공급처 자체 장애나 모든 지표 갱신 실패를 확정하지 않는다.
- D1 정확키의 현재 body/stored_at 직접 재조회, 최신 전체 본문 대조, PC·모바일 실제 표시 및 자동 전진은 이번 계획에서 아직 완료로 판정하지 않았다.

### 2026-11-21 실PC D1 증거로 2단계 완료 판정

- Controller [#2626](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2626#issuecomment-7059293030): 실제 설치 `565ddbd4ebfc46c88fb7dbaa810fd545656c6306`, 보호 상태 불변. 신규 정확키 A [#2628](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2628#issuecomment-7059333207) / Run `44880744929`: 실PC `PASS/R6_D1_LOCAL_MATCHED`, D1 `market_public_snapshots_v1/detail:employment-r6:one-year:v1`의 본문 해시와 로컬 저장 결과 해시 `8694003053de364a6190ea46f48c2beb2a17f52f4a828fafac099c8e26ba8442` 일치, D1 `stored_at=1795220441703`, `sourceStoredAt=1795220421678`, 29 지표·22 차트·모델 버전 일치, 공급자·D1 쓰기 0. 기존 Writer `UNCHANGED`와 양립하므로 재게시 불필요.
- 기존 2026-11-21 Production GET HTTP 200 / `PARTIAL` / 29 ID·요약·모델과 해당 저장값 일치. API `employmentR6StoredDisplayResponse`는 동일 고정키를 읽고 `Response.json(body)`로 반환하며 공개 GET에서 별도 데이터 재계산·공급자 호출 없음. 정확키의 운영 실측 원본과 공개 응답의 필수 메타데이터 연결 검증 완료. 별도 Production 본문 모든 필드의 독립 SHA 캡처는 없으므로 29개 ID별 값·단위·관측일·차트 마지막 점의 화면/API 대조는 4단계에서 검증하며 이를 2단계 D1 조회 실패로 취급하지 않는다.
- **단계2 DONE / 단계3 IN_PROGRESS**. 아래 2단계 원문은 완료한 접근 방법의 이력으로 보존하며, 실제 다음 실행은 DOL checkpoint 수집 실패 원인 검증이다.

## 4. 2단계 완료 이력 — 기존 증거 재사용

1. 이미 운영 중인 Writer의 최근 R6 게시 원장, 정확 저장 key `market_public_snapshots_v1 / detail:employment-r6:one-year:v1`와 재조회 영수증을 확인한다. UNCHANGED·새 게시·실패를 구분한다.
2. 기존 승인된 공식 Cloudflare/D1 읽기 경로로 정확키의 body와 stored_at을 확인하고, 공개 응답과 PC 로컬 결과를 각각의 변환 계약에 맞춰 대조한다. 지표 ID/값/단위/관측일/상태/모델 버전/시각을 비교하며 메타데이터 일치만으로 전체 본문 일치를 선언하지 않는다. 변환된 JSON의 직렬화 hash를 원본 hash와 무조건 같게 요구하지 않는다.
3. 이미 같은 유효 결과가 공개돼 있으면 재게시·재설치 없이 종료한다. 다르면 최초 불일치 지점만 수정하고 승인된 기존 Writer를 이용해 저장·재조회까지 확인한다. 기존 유효한 게시 영수증은 해당 source·결과·시점 범위에서 재사용한다.
4. 특정 도구가 조회할 수 없으면 다른 기존 공식 수단·기존 비민감 재조회 증거·정확한 수동 Cross-Check를 활용한다. D1 미조회 사실을 숨기지 않되 이를 위해 새 Controller·워크플로·전역 Gate를 만들지 않는다. 자동화 제약과 실제 Runtime 실패를 구분하고 독립 작업은 계속한다.

## 5. 원자료·화면·자동 실행 — 3~5단계

### 3단계: 실제 갱신 결함만 수정

- DOL 마지막 실패 로그·저장된 응답·checkpoint·retry/circuit 조건부터 대조한다. 요청 범위/파서/공급처 지연/이미 해소된 오류의 장기 차단을 구분한다. 같은 진단을 반복하지 않고 원인이 확인되면 해당 코드 최소 수정→관련 회귀→승인 범위의 적용→실자료 readback까지 이어간다.
- 새 공급처 호출은 현재 승인·공급처 실제 호출 예산을 따른다. 기존 응답으로 충분하면 재호출·전체 재수집을 하지 않는다. 일시 오류를 무기한 수동 해제 대기로 남기거나 다른 정상 그룹의 수집까지 차단하지 않는다.
- STATE_CLAIMS_BREADTH의 오래된 날짜는 원자료, PIT 계산의 선택 구간, 공개 payload 변환 중 최초 차이를 확인한다. 정당한 이력 부족은 PARTIAL_HISTORY로 남기며 오래된 점수를 최신 점수로 꾸미지 않는다.
- 모든 지표에 같은 관측일을 요구하지 않는다. 공식 발표 주기·미발표와 구현상 갱신 누락을 구분하고 실제 제공 가능한 최신 자료를 기준으로 완료를 판정한다.

### 4단계: 실제 렌더링 확인

- 기존 /economic-indicators/employment/의 PC·모바일에서 단위/관측일/점수/차트/마지막 점/결측 문구를 API와 비교한다. chartReady 22개는 모든 차트의 52주 전체 완비를 뜻하지 않는다.
- 화면이 정상이라면 수정하지 않는다. 결함이 있으면 기존 UI 역할·브랜치 절차로 정확한 결함만 전달·수정·실제 렌더링 검증한다. UI 재설계·산식 변경·가짜 차트는 추가하지 않는다.

### 5단계: 기존 실행 증거로 종료

- 기존 정규 실행의 수집→저장→계산→게시/UNCHANGED→조회 기록을 연결한다. 이미 유효한 기록이 있으면 다음 날·다음 발표를 새 완료조건으로 추가하지 않는다.
- 새 실행이 꼭 필요한 부분만 기존 승인 경로로 확인한다. 발표가 없으면 정상 UNCHANGED와 실패를 구분한다. 장시간 작업은 checkpoint 전진을 확인하며 관찰 timeout만으로 재시작하지 않는다.
- 실제 다음 발표 때의 자연 갱신만 아직 확인할 수 없다면 그 항목을 미검증으로 명시한다. 새 감시 예약이나 동일 작업 반복으로 대체하지 않는다.
- 변경이 필요했던 항목은 검증된 정상본/설정/대상 key를 보존하고, 실패 확정 시 해당 범위만 복귀·검증한다. 결과 UNKNOWN은 원장/저장값부터 대조하고 무조건 rollback·재실행하지 않는다.


### 3단계 최신 실PC 관측 (2026-11-21)
<!-- W04-STEP3-LAST-DOL-RAW-20261121 -->
- [제어 #2631](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2631#issuecomment-7059375658) / Run `44880998942` 실제 읽기 성공. 저장된 최신 DOL RELEASE `2026-11-21T07:25:45.294Z`: `PARTIAL/DOL_RELEASE_OBSERVATION_STALE`, DOL National HTTP 200 XML, 4개 시리즈 정상 파싱, 원문/파서 최신 유효일 모두 `2026-10-24`; 국내 아닌 미국 DOL 지역 ETA539의 최신 완료 주차는 `2026-11-07`. 최신 National 4개가 실제 11월 관측일로 전진했다는 증거 없음.
- 2026-11-19 DOL 공식 Weekly Claims News Release(https://oui.doleta.gov/press/2026/111926.pdf)는 2026-11-14 종료 주 초기청구 203,000건 발표. 이 PDF 발표본과 Collector의 `wkclaims/report.asp` POST XML은 **동일 공급처의 별도 제공물**이고, 한쪽의 발표만으로 다른 쪽 XML이 갱신되었다고 주장할 수 없다. National XML이 정상 200을 주지만 늦은 숫자 주차를 반환한 현상을 데이터 출처·업데이트 시각 문제로 분리하되 원인은 추가 검증 전 미확인으로 둔다. 공급처 추가·요금제·수집 주기 또는 산식 변경 없이 기존 승인 범위에서만 후속 처리한다.

## 6. 과거 History와 72단계 기록의 처리

과거 2,880키는 당시 원자료 연결·실제 가용 시점 TRUE_PIT 인증이 미완료다. 후보 값 일치나 현재 원자료 존재만으로 역사적 인증 완료를 주장하지 않는다. 근거 없는 보간·availableAt 소급·Current의 History 강제 편입을 하지 않는다. 적격 근거와 정확 승인 범위가 생겼을 때만 별도 복구한다.

기존 PIT-04/05/06의 DONE은 각 원본 해시/계보 분류·복구 NO-GO 판정·소스 검사 완료 범위다. 특히 PIT-06-05의 DONE을 2,880키 역사적 가용일 전체 검증 완료로 확대하지 않는다. 본 계획은 이 범위를 은폐하거나 기존 증거를 무효화하지 않는다.

과거 전체 계획은 [개편 직전 72단계 원문](https://github.com/ansqhd5774-Choi/zgmini/blob/20fd8977766be7634605efa8a4f68a1863c2b339/docs/EMPLOYMENT_R6_CURRENT_EXECUTION_PLAN_20261116.md), 실제 누적 증거는 [진행 원장](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)에 보존한다. 이전 계획의 본문·집계표·상단 38/52/53 등의 상충 숫자는 과거 시점 기록이며 현재 실행 지시로 사용하지 않는다.

## 7. 담당자 실행·보고 기준

W04 원담당이 기존 권한 범위의 기능 작업을 끝까지 수행한다. 공유 Controller 쓰기·역할 밖 UI 변경처럼 실제 조정이 필요한 범위만 기존 담당과 연결하며, 댓글 인계를 실제 실행 완료로 취급하지 않는다. PR #933 전체는 Draft/충돌 상태이므로 일괄 병합하지 않고 필요한 변경만 기존 승인 절차로 처리한다.

매 회차 이 파일의 단계 표와 진행 원장에 실제 변화만 동기화한다. 현재 단계/완료 근거/최초 불일치/다음 구체 실행을 짧게 기록한다. 코드·CI·설치·저장·공개·화면 검증을 구분한다. 이번 5단계 계획 작성 자체나 과거 증거 재확인만으로 단계를 올리지 않는다.

**담당자 재개 지점은 아래 §9의 최신 운영 검증으로 갱신한다. 위 2026-11-21 기준 수집 실패 이력은 과거 상태로 보존하며 2단계 D1 조회/게시 반복은 금지한다.**

## 8. 2026-11-25 초기 운영 체크포인트 — §9 이전 이력
- **단계1·2 DONE(기존 증거 재사용):** [#3461](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3461) / Run #45467625998의 정규 Writer 4파일 선택 설치 `WRITER_B_INSTALLED_VERIFIED`, 로컬 운영 source SHA `d8ac245003e7b8e006c2345382d5c639c6d5f18b`, Task 원본 복원. [#3467](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3467)은 실제 활성 Core와 승인 source 연결 확인. 기존 [#3466](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3466)에서 로컬↔D1 `detail:employment-r6:one-year:v1` 결과 hash 일치(29 ID·22 차트)는 **11/24 19:23 UTC 신규 수집 이전 데이터**의 유효 확인 범위이다.
- **3단계 전진:** [#3468](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3468) / Run #45469724495, [#3469](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3469)에서 실제 2026-11-24 19:23:15 UTC 정규 DOL `RELEASE`, `DOL_UI_WEEKLY_CLAIMS=SUCCESS`, 공식 호출 2회, BLS 다른 계열은 기존 저장 결과 재사용 확인. **새 수집 이후 Writer·SQLite 상세행·D1 갱신의 동일 결과/같은 사이클 연결은 아직 미확인**. 전체 상세 감사 [#3465](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3465)는 `STATE_CLAIMS_51_COVERAGE`에서 시간 초과, 과거 51지역×600주 유효 증거 보존; 이를 DB 손상이나 신규 수집 실패로 재해석하지 않는다.
- **실패한 읽기 작업의 정확한 종료:** 원래 [#3471](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3471) Core/Writer 및 [#3472](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3472) D1 검사 모두 원본 result JSON/TXT 0/2. 접수 시각에 대응하는 후보 Actions Run #45470608675, #45470614866은 Runner 배정 후 Step 0개·`completed/cancelled`, 후보 #45470609077/#45470617514는 `skipped`. 요청 ID를 직접 연결한 webhook 영수증은 없어 Run과 Issue의 정확한 귀속은 미인증. **AUTOMATION_RESULT_NOT_DELIVERED**로 #3471·#3472 `CLOSED/not_planned`; R6 계산·게시 장애나 정상 결과로 치환하지 않는다. 같은 조건의 무근거 재요청·강제 취소/Runner 재시작은 하지 않는다.
- **4단계 검증기 신규 소스(실실행 미완료):** `tests/w04-r6-production-ui-readonly-r1.mjs`를 W04 전용 브랜치에 추가했다. Production API와 1440/390px 실브라우저의 29개 원값·관측일·단위·점수·차트 마지막 점을 모의 응답 없이 대조하며 실제 정상 GET/Playwright 실행 증거가 나올 때만 완료로 판정한다. 2026-11-25 현재 구현·구문 파싱·GitHub 파일 readback만 확인. 추가 CI/설치/DB/D1 변경 없음.
- **4단계 부분 계약 증거:** 현재 `zgmini/main` R2 formula의 29개 고유 ID와 R6 화면 표의 29개 고유 ID는 순서까지 29/29 동일. 하지만 Production HTML의 hydration 전 `R6 공개 저장값 확인 중`은 실제 실데이터 없는 오류 증거가 아니며, 기존 `employment-r6-public-browser-r1.mjs`는 mocked API, 기존 R54 Production E2E는 다른 상단 점수 검증이다. **실제 29개 원값·관측일·단위·점수·차트 마지막점과 PC 1440px/모바일 390px 동치 검증은 NOT_DONE**.
- **다음 필수 실행:** 기존 정상 Core/Writer 새 주기 결과가 현재 환경에서 확인 가능해질 때 **원본 수집 checkpoint 이후 Writer 완료/정당한 UNCHANGED 시각·sourceStoredAt·local hash→D1 body/hash/stored_at→공개 API→UI**를 동일 입력/기준일로 연결 검증한다. 단, 이미 취소된 #3471/#3472를 같은 조건으로 반복하지 않으며 정상 실행 경로/필수 로그 가용성이 달라졌는지 먼저 확인. 정규 다음 발표 대기를 요청하지 않은 새 완료조건으로 만들지 않는다.
- **§8 당시 단계 판정(§9에서 갱신):** 1·2 DONE / 3 IN_PROGRESS / 4·5 NOT_DONE = 2/5단계(40%). 문서·Issue 종결은 실기능 완료 증거 아님.

## 9. 2026-11-25 실제 Production R6 PC·모바일 검증 — 4단계 DONE
<!-- W04-STEP4-PRODUCTION-REAL-PASS-20261125 -->
- **실측 코드·운영 기준 분리:** W04 전용 브랜치의 구 R1 formulaHash `sha256:18e18d10...`와 현재 배포 R2 `sha256:04486846...`를 혼동해 [초회 Run #45475125267](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45475125267)이 스크립트의 잘못된 기준으로 FAIL. `zgmini/main` 공식 R2 및 기존 #3466 운영 영수증에 맞춘 **읽기 전용 검증기**로 수정. 브랜치·운영 산식, DB/D1 수정 없음. 29개 ID는 R1 브랜치와 R2 main에서 순서까지 동일.
- **실제 브라우저 성공:** [Run #45475574834](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45475574834)의 W04 실데이터 전용 Step SUCCESS, **PC 1440px·모바일 390px PASS**, 모의 API/가짜 값 없음. Production GET HTTP 200, 29개 ID·원값·단위·관측일·이전값·점수 및 차트 마지막 관측일/도형 좌표, READY/STALE/결측 표시를 각각 검증. `sourceFeatures=29`, `recentlyObservedFeatures=22`, `chartReadyFeatures=22`, `chartPartialFeatures=5`, `scoredFeatures=24`, `recentlyScoredFeatures=18`, JS 오류 0. 결과 JSON/스크린샷 GitHub artifact #14960690247 회수·확인. 최초 스크린샷에는 정상 첫 방문 소개 팝업이 표를 가려 실화면 가시성 캡처 한계가 확인됨.
- **팝업 종료·실화면 보완 성공:** W04 테스트가 첫 방문 안내창의 기존 `닫기` 버튼을 클릭하고 숨김 상태 및 실제 테이블/카드 표시를 검증하도록 최소 보완(`ef57a7b81e25204458e740ea75a8e2cccf438a26`). [후속 Run #45476398968](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45476398968)에서도 W04 Step SUCCESS. 해당 Run 최종 [아티팩트 #14958859694](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45476398968/artifacts/14958859694)의 `w04-r6-production-ui/results.json` 및 1440/390px PNG를 실제 다운로드·육안 대조하여 양쪽 `PASS`·`introDismissed=true`·표/카드 원값과 차트 노출 확인. 전체 워크플로는 W04 무관 지연 렌더링 시험 실패로 FAIL이며, W04 검증 단계만 성공. Node.js CI [#45476399043](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45476399043) SUCCESS.
- **최신성의 실제 한계:** 공개 API `sourceStoredAt=1795536201789`(2026-11-24 16:03:21.789 UTC), `D1 stored_at=1795536461679`(16:07:41.679 UTC), `asOfDate=2026-11-24`. DOL 신규 정규 수집 `2026-11-24T19:23:15.174Z`보다 **원천 저장·게시 시간이 앞섬**. 따라서 4단계 화면 동치 PASS는 **신규 수집→Writer 계산→D1 재게시까지 갱신됐다는 증거가 아님**. 단계3은 IN_PROGRESS, 단계5는 NOT_DONE을 유지한다.
- **기타 CI 분리:** #45475574834의 전체 브라우저 Workflow는 W04 Step PASS 이후 **무관한** `dashboard-deferred-ui-browser-r1.mjs`에서 미국 공탐 breadth SVG 5초 표시 대기 TIMEOUT으로 FAIL. 원인은 추가 증거 전 미확정, W04 자체 실패/완료 취소의 근거가 아니며 범위 외 개선을 새 전역 Gate로 두지 않는다.
- **최신 단계 판정: 1·2·4 DONE / 3 IN_PROGRESS / 5 NOT_DONE = 3/5 (60%)**. 다음 필수 W04 실행은 기존 승인 PC/Writer 정상 경로로 수집 이후 Writer 완료·정당한 UNCHANGED checkpoint/로컬 해시·sourceStoredAt과 D1 정확키 `detail:employment-r6:one-year:v1`의 `stored_at`·body hash를 동일 입력/주기로 연결하는 것. 기존 #3471/#3472 취소 요청의 중복 재실행 금지. 브랜치 PR #933은 Draft/충돌 상태로 전체 병합·운영 자동 적용 금지.

## 10. 신규 DOL 성공·실제 변경·필요한 게시를 구별하는 최신 판정 기준 (2026-11-25)
<!-- W04-R6-POST-DOL-NOOP-DISTINCTION-20261125 -->
- **최초 구분 조건:** 정규 수집 시각 2026-11-24T19:23:15.174Z 뒤 Writer 최신성은 아직 미인증이지만, 수집의 `SUCCESS`만으로 신규 SQLite 행이 있다고 가정한 §8·§9의 "그 이후 Writer가 반드시 실행돼야 한다"는 무조건적인 해석은 정정한다. `lib/market-score/employment-r6-collector.mjs`의 `collectOneGroup`은 행이 비어 있거나 공식 관측일 stale·series 누락·rejected가 없으면 `inserted=0/revised=0`이어도 `SUCCESS` 가능. `collectedRows/inserted/revised/noop/historyRowsAdded/changedSeriesIds`는 원래 SQLite `recordRun`에 저장한다. `scripts/pc-writer/employment-r6-auto-collection.mjs`가 노출하는 Core 체크포인트의 `groups`에는 일부 상태·요청 수만 있고 변경 건수는 없다.
- **가설 분리 읽기(기존 정규 허용 경로만):** 위 실제 19:23 수집 원본 `employment-r6` DOL `RELEASE` run의 `insertedCount/revisedCount/noopCount`, `completedAt`, `detail.latestNationalSeriesObservationDates`, `detail.nationalResponseEvidence` 및 기존 현재 관측 행을 read-only로 확인한다. 공개 영역/Issue에는 개인키·원문·대량 이력 없이 비민감 판정·건수·해시만 남긴다. `SUCCESS`/공급자 호출 2회와 신규 데이터 반영을 구별한다. 같은 조건으로 취소된 #3471/#3472 재등록 금지, #3409 유지보수 lease 또는 설치 상태를 임의 변경하지 않는다.
- **조건별 완료 경로:** (A) `inserted+revised=0`, 기존 저장 National4 관측일·원본 해시가 같은 최신 발표와 일치하는 경우, 19:23 수집은 정당한 *no-op*이다. 기존 유효한 로컬 Writer `UNCHANGED`·D1 정확키·공개 API의 같은 결과를 재사용할 수 있으며, 단지 수집 시각 이후에 Writer를 억지 재실행/재게시할 필요가 없다. 단, 공식 발표의 최신 관측일과 실제 DB 저장 상태가 맞는지 및 정상 정규 실행 여부는 별도 확인한다. (B) `inserted+revised>0` 또는 갱신된 National4라면, 후행 Writer의 새 `sourceStoredAt`/local hash와 D1 `stored_at`/body hash/Production 표시까지 검증해야 하며 최초 불일치만 수정한다. (C) 조회 증거가 없으면 **DATA_CHANGE_UNKNOWN**이며 완료로 승격하거나 no-op이라고 가정하지 않는다.
- **§10 당시 상태(§11 최신 실증으로 갱신):** 이전 실측 `sourceStoredAt=1795536201789`, D1 `stored_at=1795536461679`, 수집 checkpoint 19:23:15Z 이후 변경 건수 미확보. 당시 신규 GitHub PC Job 성공 영수증이 없었고 원래 #3471/#3472는 0-step `cancelled`. 정상 읽기 실행 조건 변화가 확인되지 않았으므로 현재 새 A를 중복 발행하지 않는다. 1·2·4 DONE / 3 IN_PROGRESS / 5 NOT_DONE = **3/5(60%) 유지**. 정규 다음 발표 대기나 새 예약/Runner/Controller 설치를 별도 완료조건으로 추가하지 않는다.

## 11. 2026-11-25 후속 정상 자동 실행·D1 실PC readback (최신 증거)
<!-- W04-20261125-CORE-WRITER-D1-PASS-11 -->
- **실PC 신규 경량 A 성공:** [#3484](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3484) → [Run #45480969295](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45480969295) `completed/success`. 정확 원본 JSON/TXT [1](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45480969295-1-seat-1.json) 및 [2](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45480969295-1-seat-1.txt) 직접 readback, 요청 `pc-8b1e02ad-1acd-4ee7-a8f8-93c83f31a2a5` 일치, `PASS/CORE_READONLY_DIAGNOSIS`, 실제 Controller `6b3c9c0ce77354d81babe4c9ea7785663c6c2cb4`, 보호 이전/이후 SHA 동일, source `d8ac245003e7b8e006c2345382d5c639c6d5f18b`. 별도 `labeled` 이벤트는 승인 작업 중복 실행 아님.
- **기존 정규 실행의 실제 후속:** `local-cycle-last-run.json.modifiedAt=2026-11-24T20:19:20.936Z` COMPLETE, `local-collection-last-run.json.modifiedAt=2026-11-24T20:23:11.151Z` COMPLETE, `employmentR6.status=NOOP`, 공급자 호출 0, 6개 `RELEASE_ALREADY_STORED`; `local-writer-last-run.json.modifiedAt=2026-11-24T20:24:56.453Z` VERIFIED, 고용 R6 `UNCHANGED`, 오류 없음, 29개 지표·22개 차트, 로컬 결과 SHA `4b5f4807a78a9ed4d1856988b3e8c074c5a25e82d360e81f95d947efb435d996`, 로컬 결과 자체 재조회 VERIFIED. 이전 2026-11-24T19:23:15.174Z DOL RELEASE SUCCESS **이후** Writer 실행·계산 경로가 실제 있었음이 입증됐으며, §8·§9의 이전 '후속 Writer 미확보' 관측은 과거 시점 상태임.
- **실PC D1 정확키 성공:** [#3485](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3485) → [Run #45481281226](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45481281226) `completed/success`; 원본 JSON/TXT [1](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45481281226-1-seat-2.json) 및 [2](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45481281226-1-seat-2.txt) readback. `PASS/R6_D1_LOCAL_MATCHED` 정확키 `detail:employment-r6:one-year:v1`, D1 body SHA = 최신 로컬 결과 SHA `4b5f4807...`, `sourceFeatures=29`, `chartReady=22`, R2 formula hash `sha256:04486846...`, 읽기 전용, 보호 상태 불변. 두 Issue 모두 `CLOSED/completed`. 앞서 4단계의 Production 29/29 PC·모바일 PASS는 같은 저장 기준 메타데이터에서 유효함.
- **Unix timestamp 정정:** `sourceStoredAt=1795536201789`은 `2026-11-24T16:03:21.789Z`(**2026-11-25 01:03:21.789 KST**), D1 `stored_at=1795536461679`은 `2026-11-24T16:07:41.679Z`(**01:07:41.679 KST**). §9 이전 설명의 `19:13/19:17 UTC`는 epoch 환산 오류여서 위 표기를 정정했다. `local-writer-last-run.json.modifiedAt=20:24:56.453Z`는 별도 **후행 파일 checkpoint** 시각이며, `sourceStoredAt`와 혼동 금지. D1이 예전 저장 시각인 것은 Writer `UNCHANGED`가 정상인 경우 기대되며 재게시 성공 영수증으로 주장하지 않는다.
- **남은 3단계 정확 한계:** DOL `2026-11-24T19:23:15Z` 수집의 실제 SQLite `inserted/revised/noop` 및 National4 최신 저장 관측과 `STATE_CLAIMS_BREADTH`의 지연 원인·정당한 PARTIAL 여부는 이번 경량 A 결과에 없음. 공개 body가 로컬/D1과 일치해도 역사적 raw/PIT 완전성을 뜻하지 않음. 동일 조건에서 600주×51지역 중량 `employment-r6-collection-evidence-readonly`는 #3465 TIMEOUT 실증이 있어 재반복하지 않았고, 임의 shell/SQL/DB repair/Controller 설치·조회 Gate 완화 없음. **1·2·4 DONE / 3·5 IN_PROGRESS = 3/5 (60%)**. 5단계의 기존 자동 실행/정당한 `UNCHANGED` 확인 범위는 실증됐지만 전체 기능 종결은 3단계 원자료 판정 전까지 보류한다.
