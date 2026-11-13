# 시장 캘린더 44차 — TreasuryDirect TA_WS 365일 원문 감사 (2026-11-14 KST)

**원담당 브랜치:** `codex/zgmini-gpt-workspace-20261025` (현재 `zgmini/main=643b7c7c4372ffad552443fc312c6cb1b944e2fc` 대비 470 ahead / 559 behind; 전체 병합·rebase 금지). 이 브랜치에는 기존 Treasury R1 최신 계획서가 없으며 그 계획은 [별도 기능 브랜치](https://github.com/ansqhd5774-Choi/zgmini/blob/codex/market-calendar-treasury-cache-private-code-r1-20261109/docs/market-calendar-treasury-annual-execution-plan-r1.md)에 있음. 기능 원본 코드를 소유 브랜치 간 무분별하게 복제하지 않는다.

**전체 진행률 95/100 → 95/100.** 이전 기능 설치·수집·계산·D1 게시·API/화면 95점을 증거 시점과 함께 재사용하며, 독립 PC TA_WS 원문 감사 5점은 미완료. 문서 정리 자체에 추가 점수를 주지 않는다.

## 1. 실제 PC의 마지막 유효 읽기 증거

- [#1132](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1132) / Run `42690541955`: 승인 Writer B `WRITER_B_INSTALLED_VERIFIED`(당시 overlay source `70d2d1dbd8180255133bdd7fc925ae07bb8d6cc9`). 11월 14일 운영 파일의 현행 SHA라는 뜻 아님.
- [#1135](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1135) / Run `42692713050`: `release-calendar-runtime-readonly` PASS, `2026-11-09T20:23:10.889Z` checkpoint, `READY`, Treasury 포함 13원천, 공급자 요청 24. `sqliteOpened=false`이므로 TA_WS 입력 원문 증거 아님.
- **더 최신 기존 A 재사용:** [#1299](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1299) / [Run 43166235600](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43166235600) / [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43166235600-1-seat-3.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43166235600-1-seat-3.txt) **2/2 실물 조회와 jobId/status/code 일치**. PC Controller SHA `badad9124157879d7a645b64f2768113d632355b`, `PASS/RELEASE_CALENDAR_SOURCE_INVENTORY_READONLY`, `firstFail=null`, 캘린더 checkpoint `2026-11-12T06:05:13.049Z`, `CACHED`, 해당 호출 providerRequests=0, `sqliteOpened=false`, 운영 데이터 쓰기 0. 캐시 사용은 원본 손상 판정 아님. 중복 A 요청하지 않음.
- [#1334](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1334) 다른 기능의 운영 PC 진단(2026-11-13 KST)도 Controller 실제 실행 SHA `badad912...`를 기록한다. 이는 11/13 시점 증거로, 11/14 현재 설치 SHA를 독립 확인한 것은 아님.
- 설치 A 누락의 과거 실증: [#1023](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1023) / Run `42595227055`: `BLOCKED/OPERATION_NOT_ALLOWED`, `LAST_PASS=EVENT_RECEIVED`, `FIRST_FAIL=EVENT_OR_REQUEST_VALIDATION`, 운영 쓰기 0. 이 소비된 요청은 재실행하지 않음.

## 2. 41차 Reader 적용 범위 — 최신 source 기준 정정

- 제어 저장소 `main`의 `config/operations.json`에는 `source-inventory-runtime-readonly` A/light 등록이 **소스상 존재**하나, 실제 PC가 실행한 `badad912...`의 `config/operations.json` Git blob `d22d18bd9b252cbaa5e6b8e082377a872630b2b3`와 `controller/operations.mjs` `f6ef5a4dccf9b1b09f50db6edfa61004e6503b44`에는 등록·라우팅 **둘 다 없음**. main 병합 [#1191](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1191)과 PC 실설치를 구분.
- 이전 계획의 **7파일 후보는 최신 `main`에 비해 누락**: 현재 설치 대비 `main` operation은 31→37개(A 6개 신규), router는 신규 import **6개**. 신규 `d05-lineage-readonly.mjs`를 포함해 **8파일 source-level 최소 후보**(config 1, 라우터 1, 새 모듈 6). 정확한 운영 승인 manifest나 실PC 현재 바이트 검증은 아직 아님.
- 후보 파일과 **Git blob SHA-1**(SHA-256 승인 manifest 값과 구분):
  - `config/operations.json`: `c906683afd487762f5bc32f50a199679df200dc3`
  - `controller/operations.mjs`: `b507697ce089254cd61932f1d5b703b48f93e0db`
  - `controller/source-inventory-runtime-readonly.mjs`: `db9e9c8347277287cc6ef10bad310be125314d52`
  - `controller/d05-lineage-readonly.mjs`: `43eaf1b976b3584b3f18739366d7122ec59bb9d4`
  - `controller/inflation-core-lock-observation-readonly.mjs`: `82ac34052ef22edbecd8ab7348fe76bffcb3d583`
  - `controller/writer-b-1063-recovery-readonly.mjs`: `b67a3dcf57fd54d7b6977a9bb867a62442bd5a56`
  - `controller/shared-resource-release-readonly.mjs`: `9eb5f752f6fbfc3f48d3bd2e7a5d7cbc5a816039`
  - `controller/employment-r6-collection-evidence-readonly.mjs`: `2daa4e03b6affe5fd44c68311eca57ddee614b0e`
- 여섯 신규 모듈의 import는 Node 내장 모듈과 기존 설치에 존재하는 `controller/core-runtime-source-readonly.mjs`만 참조함(해당 기존 Git blob `6e11effce48a1bf6c4d85493cd23523746d49dc2`). **main 전체 무승인 설치 금지**; 공유 Controller [#68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68) 단일 적용 담당이 현재 설치/다른 승인 변경/보호 해시와 합쳐 정확한 승인 파일·raw SHA-256·백업·lease·PC 결과를 확정.
- 신규 A는 설치되기 전 호출하면 안 됨. 다른 A의 정상 독립 조회는 #996 공유 설치 복구와 별도로 가능. Remote Desktop Commander, 임의 CMD/SQL 사용 금지.

## 3. TA_WS 원문 감사의 구체적 판정 계약

- **입력:** 운영 PC 기존 `E:\\ZGmini\\data\\pc-writer\\storage\\core.sqlite`의 `market_input_batches_v1` 최신 `batch_key LIKE 'release-calendar:treasury:taws:%'` 한 건. 저장 키는 `release-calendar:treasury:taws:YYYY-MM-DD`, 본문 `gzip:` JSON. 임의 사용자 경로/쿼리 금지.
- **접근 안전:** 실제 Reader의 `DatabaseSync(readOnly:true)`, `PRAGMA query_only=ON`, SQLite 헤더/경로 검사, WAL `-wal`·`-shm` 보조 파일 보호. WAL 부재면 `STATE_UNKNOWN/WAL_SIDECARS_ABSENT_UNVERIFIED`, 손상 단정 금지.
- **A JSON 완료 조건:** `core.sqliteOpened=true`, `core.treasuryTawsInput.status=OBSERVED`, `eligibleCountMatchesStored=true`, `fromDate/toDate`의 **실제 365일(포함 양끝, 364일 차이)**, `rawRowCount/storedAwardedCount/eligibleAwardedRows/textBytes` 유효, `textSha256` 64자리, 출처 공식 고정 값, 최신 저장 시각, 요청 Run/attempt/seat와 JSON/TXT 2/2 readback. `NOT_STORED`/불일치/UNKNOWN이면 100% 판정 금지.
- **검증 표현의 한계:** 기존 Reader는 `eligibleAwardedRows`를 다시 세지만 **원문 행의 중복 건수를 따로 반환하지 않으며**, 기간 검사는 365일 **초과 금지**이지 정확히 365일 등식 검사가 아님. A 실행 후 실제 `fromDate/toDate`로 365일 포함범위 확인해야 함. `textSha256`는 로컬 본문 지문이며 사전 외부 기준 해시가 없으면 외부 원본과 일치한다고 주장 불가. `scope=ELIGIBLE_RESULT_COUNT_NOT_FULL_PARSER_REVALIDATION`은 전체 원본 파서 독립 재실행 아님. **원문 중복 여부는 독립적으로 미확인**이고 기존 공개 API `id+date` 중복 0과 별도로 표시.
- 원문 텍스트/CUSIP/전체 URL·인증 자료/전체 로컬 DB는 출력·GitHub 게시 금지. 기존 유효 output 및 checkpoint는 보존. 다른 운영 범위 변경·재수집/재게시 금지.

## 4. D1·Production 후속 검증

- 기존 **실제 운영 D1** `zgmini-core-r42` 읽기 전용 행 `public_feed_snapshots_v1` output/release-calendar/current: `stored_at=1794255759536`(`2026-11-09T20:22:39.536Z`)과 당시 API `updatedAt` 0ms 일치. **2026-11-09 관측 범위**로만 재사용.
- 2026-11-10 22:25 KST 기존 API/UI 실측: `READY`, `updatedAt=2026-11-10T08:35:05.649Z`, 총 2,288, Treasury 894(공고 444/입찰 450), 2026-11월 UI Treasury 37=API 37, API `id+date` 중복 0. **오늘 2026-11-14의 새 API 본문·D1 최신 행·PC/모바일 화면 일치를 확인한 결과는 아님**. 이번 웹 조회는 API JSON 응답 도구 접근 실패, 화면 정적 로딩 껍데기만 확인. HTTP 200/로딩 문구를 새 데이터 확인으로 승격하지 않음.
- 마지막 5점은 **실제 설치 새 A + 원문 메타 + 원본 기간/건수/지문 증거**와 서로 대응하는 게시 버전/날짜 검증 후에만 산입. D1 직접 행 readback·Production 실측 불가하면 미검증으로 명시.

## 5. 다음 단일 필수 실행

**담당: 공용 Controller 단일 적용 담당 → 시장 캘린더 원담당 순서.**
1. 공용 Owner가 실제 공유 설치 가능 여부와 현재 Controller 설치 SHA/8파일 후보·다른 승인 변경을 대조하고 정규 승인 manifest·raw SHA-256·백업·lease를 확정하여 A를 설치. #996 C급 보관/NO-GO 상태를 임의 해제하지 않음.
2. 설치 결과 JSON/TXT 및 `config/operations.json` A 등록/실제 라우팅 확인 후, 시장 캘린더 원담당이 **새 고유 pc-job** `source-inventory-runtime-readonly` A를 **1회** 실행하여 원본 행/기간/해시 metadata 회수.
3. PC 원자료 감사와 D1/API/UI 동일 관측 버전·기간·중복 증거 검증 후에만 **95→100%** 판단. 기밀/운영 변경 불필요.

**이번 변경:** 이 문서 1파일만 개발 브랜치에 추가. 새 PC A/B 요청, Controller/Runner/Core/DB/D1/예약/운영 source 수정, 브랜치 전체 병합, 테스트 재실행 0. Reader 관련 기존 source 테스트 14/14 PASS 증거는 재사용(이번 신규 테스트가 아님).


<!-- market-calendar-r48-fed-2027-control-probe-20261114 -->
## 6. 48차 후속 실제 작업 — 공통 #68 지시 접수, FOMC 독립 소스 검사 및 회귀 패치

**기준:** [공통 #68 48차 지시](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863150401)에서 시장 캘린더 항목만 적용. 전체 **95%→95%**. `main=643b7c7c4372ffad552443fc312c6cb1b944e2fc`, 본인 전용 브랜치의 44차 계획/기존 수집·계산·D1·공개 성공 증거 재사용.

1. **동적 보조 파일 확인 — 설치 후보 누락 발견:** 최신 제어 `main`의 `controller/writer-b-1063-recovery-readonly.mjs`는 정적 import 없이 `new URL('./writer-b-1063-task-probe.mjs',import.meta.url)`를 만들어 `cscript`에 실행 전달. 파일 `controller/writer-b-1063-task-probe.mjs` Git blob SHA-1 `c7102b4a60293ceadc80916469a75bfcd69b821d`; 이전 44차 8파일 후보에 **빠져 있음**. 따라서 전체 신규 6 A 공통 적용 후보는 **기존 8 + 동적 1 = 적어도 9개 source 파일**이며 완전성·승인까지 주장하지 않음. [총괄 41차 13파일 검토안](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/codex/controller-ops-lessons-20261105/docs/CONTROLLER_READER_A_SOURCE_DIFF_PREFLIGHT_20261114.md)은 다른 수정 기존 파일까지 분리. 실제 install-before SHA/raw SHA256/lease/승인은 공유 Controller 단일 Owner가 통합 결정. 단, **Treasury만을 위한 `source-inventory-runtime-readonly`의 정확한 기능 최소 의존성**과 모든 신규 A 공용 라우팅 적용 범위를 구분할 것. 이번 운영 설치/기존 요청 재실행 0.
2. **Production 감사 증거 신규 재사용(독립 실시간 API 호출로 위장 금지):** [#835의 48차 API 담당 증거](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/835#issuecomment-6863123928), `checkedAt=2026-11-13T15:22:25.384Z`: `/api/release-calendar` HTTP 200, `status=PARTIAL`, 총 2358, Treasury 개별 `READY` 894건, 공개 구간 2025-11-14~2026-11-14의 Treasury 872건, `id+date` 중복 0. 개별 `sources.fed_fomc=SOURCE_FAILED`를 Treasury 원문 결손이라고 해석하지 않음. 동일 본문 D1 stored_at/bodySha256 및 11/14 실시간 새 호출은 이번에 **NOT_VERIFIED**. 웹 도구에서 직접 API GET 실패; 기존 API 담당 실측만 재사용.
3. **FOMC 독립 공식 자료 확인:** Federal Reserve [2026-11-12 개정 발표](https://www.federalreserve.gov/newsevents/pressreleases/monetary20261112a.htm)에 따라 2027년 정기 회의가 8건 유지되며 `2027-10-26/27`은 **전략 논의 전용**, 마지막 통화정책 회의는 종전 `2027-12-07/08`에서 `2027-11-16/17`로 이동. [현재 공식 회의 달력](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm)도 2027 Nov 16–17, Dec 7–8 부재를 표시. `zgmini/main/tests/release-calendar-fomc-annual.test.mjs`는 검사 전 2027년 말일 `2027-12-08`을 **오래된 fixture로 고정**; 실제 Production `fed_fomc=SOURCE_FAILED`와 직접 인과 관계는 미확인.
4. **실제 독립 코드 수정:** 담당 브랜치는 559 behind로 현재 main의 `parseFomcAnnualCalendar` 자체가 없어 무리한 전체 병합을 하지 않고, `main`에서 격리된 코드 전용 브랜치 `codex/market-calendar-fomc-2027-revised-fixture-r48-20261114`에 **테스트 1파일만 수정**, [Draft PR #1063](https://github.com/ansqhd5774-Choi/zgmini/pull/1063), HEAD `3e91368a2cf4316997cb7a5e4bfafc96dcc64d6d`. 2027 월명은 고정 배열 위치가 아니라 각 이벤트 날짜에서 계산; 11월 17일 포함/12월 8일 제외, 2027 오염/역전 날짜 회귀 변경. Production 소스 수집기/파서/중요도/DB/D1/UI/운영 SHA 변경 **0**. 현재 2027년 전략 전용 회의 분류/점수 변경 승인은 없음. CI 확인은 PR의 동일 HEAD 성공 결과만 통과 처리하며 실제 Fed HTML 전체 파싱 성공은 아직 별도 미검증.
5. **FOMC FIRST FAIL 범위:** 공개 `fed_fomc=SOURCE_FAILED` 확인. 원본 PC 공급자 GET HTTP status, 저장된 HTML parse result, 원본 checkpoint 실패 코드는 기존 인증 결과에서 **확인되지 않아 `SOURCE_CAUSE_UNKNOWN`**. source parser는 `parseFomcAnnualCalendar`의 8회 및 HTML 특정 태그 검사를 갖고 있으며, 수집기는 실패 시 과거 유효 일정을 보존. 새 Collector B나 개별 우회 SQL로 원인 추정 검증하지 않음. 승인된 기존 A/읽기 경로에서 관련 source 오류 메타가 나오면 시점·원인·기존 정상 이벤트를 대조해 필요한 부분만 수정.
6. **남은 TA_WS 5점:** 지금까지 진본 PC `source-inventory-runtime-readonly` 신규 A 설치 및 Treasury 원문 365일 최신 `row/eligible/SHA/WAL` 실제 JSON/TXT 없음. #1299 기존 A `sqliteOpened=false`는 독립 원문 감사 대체 불가. 실제 Reader 설치 증거 확인 후 신규 고유 1회 → 원문 감사 → D1/Production 같은 버전 재조회만 완료 조건. **전체 95/100 유지**.

**48차 변경 파일/증거:** 이 문서 단독 수정 + 신규 테스트 1파일의 독립 Draft PR #1063; 원격 재조회/CI는 결과별 분리. 설치 manifest·Controller/Runner/Writer·운영 SQLite·D1·재수집·배포·DNS·예약 변경 없음.
