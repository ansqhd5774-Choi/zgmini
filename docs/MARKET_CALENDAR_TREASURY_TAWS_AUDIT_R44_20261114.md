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


<!-- market-calendar-r48-fomc-ci-success-20261114 -->
### 48차 FOMC 격리 회귀 결과 확정 — 실제 CI PASS, 운영 효과 0

- Draft [PR #1063](https://github.com/ansqhd5774-Choi/zgmini/pull/1063), 테스트 전용 HEAD `d191a91a4b73936c25c2cfa3499674264f313594`.
- **첫 CI 실패:** [Run #43496396856](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43496396856) `Regression tests`의 `tests/release-calendar-fomc-annual.test.mjs:46`, `AssertionError: Missing expected exception`. `officialFixture.replace('16-17',...)`가 2027년 November 대신 2026년 June의 동일 날짜를 먼저 손상시킨 테스트 fixture 범위 결함. 운영 FOMC 수집 오류가 아님.
- **최소 수정:** 오염 검사를 `annualSection(2027).replace('16-17</div>','18-17</div>')`로 제한. [수정 커밋 `d191a91`](https://github.com/ansqhd5774-Choi/zgmini/commit/d191a91a4b73936c25c2cfa3499674264f313594).
- **재검증 완료:** [Run #43496813871](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43496813871) `completed/success`. 동일 GitHub CI job `check`의 **Build, Type check, Regression tests, PC publication recovery tests, Cloudflare candidate read contracts 모두 PASS**. PR 변경 파일 **`tests/release-calendar-fomc-annual.test.mjs` 하나**, Draft 미병합 유지.
- **판정:** 공식 최신 2027 일정 회귀 테스트 패치 합격(DONE SOURCE_ONLY). 실제 FED 공급원 GET/HTML·원본 PC `SOURCE_FAILED` 근본원인·동일 Production D1/TA_WS 감사 **NOT_VERIFIED**. 설치/운영 변경 0, **시장 캘린더 전체 95% 유지**.


<!-- market-calendar-r51-fomc-2027-strategy-label-fix-20261114 -->
## 7. 51차 후속 실행 — 실제 FOMC 전략회의 표시 결함 최소 수정, PC 원인 미확정

**지시 정본:** [공통 #68 51차](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863655392), [시장 세부 #835](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/835#issuecomment-6863634692). 담당 `codex/zgmini-gpt-workspace-20261025-12`. 전체 **95%→95%**. `zgmini/main=643b7c7c4372ffad552443fc312c6cb1b944e2fc`; 대폭 분기한 전용 브랜치 전체 병합/rebase 안 함.

### 7.1 기존 PC 원장 및 단계별 FIRST FAIL 확인

- 2026-11-12 실PC [#1299](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1299), [Run 43166235600](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43166235600) JSON/TXT 2/2: `PASS/RELEASE_CALENDAR_SOURCE_INVENTORY_READONLY`, `controlSourceSha=badad9124157879d7a645b64f2768113d632355b`, `collection.calendarStatus=CACHED`, `providerRequests=0`, `sqliteOpened=false`. 이 원장은 개별 `fed_fomc`의 HTTP status/파서 에러/원문 읽기 결과를 **반환하지 않으므로**, 2026-11-13 공개 `fed_fomc=SOURCE_FAILED`의 **FIRST_FAIL(provider GET 대 parse)은 `UNKNOWN_NOT_OBSERVED`**. GitHub 기존 PC Issues/검색·Reader 소스 조회에서도 해당 원본 오류 증거 없음. 승인된 PC 원자료 직접 읽기, 수집 재실행, 임의 SQL 실행 0.
- 이전 신규 A [#1023](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1023) `BLOCKED/OPERATION_NOT_ALLOWED` = **TA_WS Reader 설치 단계**의 과거 firstFail; FOMC 자체 원자료/공급자 실패 아님. 신규 `source-inventory-runtime-readonly` 설치 인증·beforeSHA·lease 관측 없어 A 호출하지 않음. Treasury 비공개 원문 365일 감사 그대로 미완료.
- Production 2026-11-13T15:22:25.384Z [API 담당 실측](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/835#issuecomment-6863123928) 재사용: calendar PARTIAL 2358, **Treasury READY 894**, Treasury 2025-11-14~2026-11-14 구간 872 / 공개 `id+date` 중복0, 별도 `fed_fomc SOURCE_FAILED`. 현행 D1 exact row bodySha/stored_at 및 최신 Production UI 렌더 불검증.

### 7.2 2027년 10월 전략-only 회의 **잘못된 표시명 코드** 확인/수정

- 미국 연준 [2026-11-12 공식 발표](https://www.federalreserve.gov/newsevents/pressreleases/monetary20261112a.htm)에 따르면 2027-10-26~27 회의는 정책 전략 논의 전용이므로 **2027-10-27 기준금리 정책결정·투표·정책성명 없음**. 전체 2027 FOMC 회의 8건 vs 정책결정 7건. 기존 `zgmini/main/app/market-calendar/market-calendar-client.tsx`는 `eventKinds.fomc.name='미국 FOMC 기준금리 결정'`, `officialName`이 모든 `fed_fomc:fomc` 날짜에 적용: 10/27을 금리 결정으로 오인 표기하는 **확정 source-label 결함**. 실제 Production에 해당 이벤트가 적재돼 보였다는 별도 화면 증거는 없음.
- 기존 main 기반 [Draft PR #1063](https://github.com/ansqhd5774-Choi/zgmini/pull/1063)에 **변경 총 2파일**로 확장: `app/market-calendar/market-calendar-client.tsx`는 `source==='fed_fomc' && id==='fomc' && date==='2027-10-27'`인 **정확한 1개 날짜/원천**에 한해서 `미국 FOMC 통화정책 전략 회의 · 금리 결정 없음`을 적용. 기존 `일정 잠정` 접미, 다른 정기 FOMC 표시명·category·importance·시간·원본 이벤트·원자료·수집기·저장·계산·TTL·D1/API/게시 경로 **그대로**.
- `tests/release-calendar-fomc-annual.test.mjs`: 기존 2027 Nov 17 vs Dec 8 일정 회귀 + **공식 출처/전략-only label/잠정 처리/기존 중요도 불변** 코드 계약 검사 추가. 이 검사는 source-level 의미 보장이고 실제 Production UI 캡처 검증 대체가 아님.
- 최종 HEAD: `45bdc448fe05dd5df7299088c3e4cb613c9b2d33`, [CI Run #43499646946](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43499646946) **completed/success**, Job `132141828167`의 Build / Type check / Regression tests / PC publication recovery tests / Cloudflare candidate read contracts **5/5 PASS**. PR `draft/open/mergeable=true/미병합`. 운영 Windows, Controller/Runner, 공급자 GET/SQLite, D1, Cloudflare Production, 예약 쓰기 0.
- 공개 `fed_fomc=SOURCE_FAILED`는 아직 별도 원본 첫 오류 단계 미확정. 테스트/표시 수정 CI 성공만으로 실제 FOMC 수집·게시 복구 또는 Treasury 원문 A 감사를 완료했다고 주장 금지.

### 7.3 다음 단일 필수 실행

**공유 Controller 단일 적용 담당:** 기존 운영 PC before SHA/승인 manifest/raw SHA256/9~13파일 보조 의존/lease·백업·보호를 확인하고 **`source-inventory-runtime-readonly`의 실제 설치 및 allowlist/라우팅 PASS** 증거를 제공. 설치 확인 후 원담당이 새 고유 A 1회로 TA_WS 본문 기간(포함 365일)/행수/eligible/textSha256/SQLite WAL·JSON/TXT를 검사한 다음 D1·Production API/UI 동일 버전 결과로 95→100% 판정. FOMC 공개 `SOURCE_FAILED`의 첫 provider/parse 실패는 별도 증거 접근 경로로 계속 분석.

**51차 변경/증거:** 담당 브랜치 본 문서 1파일 갱신 + main 기반 PR #1063 `client.tsx`/FOMC test 2파일, CI PASS. 원본 48차 코드/CI 통과 기록 보존. 운영 변경 0, **전체 95% 유지**.


<!-- market-calendar-r53-fomc-first-fail-reader-contract-20261114 -->
## 8. 53차 — `fed_fomc SOURCE_FAILED` 원본 오류 확보 가능성 실제 감사 (승인 Reader 기존 계약)

**지시:** [공통 #68 53차](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863923778), 담당 시장 캘린더. **전체 기능 95% → 95%**. 이번 필수 독립 실행은 기존 승인 A 조회기·원본 PC 실행 JSON/TXT·현재 코드의 실제 반환 계약을 대조해 FOMC 오류 단계의 증거 접근 여부를 결정하는 것. 이미 완료된 PR #1063 두 파일/CI #43499646946 SUCCESS를 다시 실행하지 않았다.

### 8.1 기존 승인 A의 실제 기능·실행 한계 (LAST PASS)

- 실제 PC 원본 [#1135 / Run 42692713050](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1135): `release-calendar-runtime-readonly` `PASS / RELEASE_CALENDAR_SOURCE_INVENTORY_READONLY`, 당시 `collection.calendarStatus=READY`, 13개 `sourceKeys`에 `fed_fomc` 존재, `providerRequests=24`, `sqliteOpened=false`. **이것은 2026-11-09 당시 수집 상태의 증거이지 지금 FOMC 성공을 보장하지 않음**.
- 더 최신 실PC [#1299 / Run 43166235600](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1299): 인증 JSON/TXT 2/2 `PASS`, `collection.at=2026-11-12T06:05:13.049Z`, `calendarStatus=CACHED`, `providerRequests=0`, `sourceKeys=[]`, `sqliteOpened=false`, installed Controller `badad9124157879d7a645b64f2768113d632355b`.
- 실제 설치 버전과 동일 범위의 [기존 Reader 소스](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/controller/release-calendar-runtime-readonly.mjs)의 반환 계약: `local-collection-last-run.json`의 `releaseCalendar`에서 **전체 calendarStatus, providerRequests, sourceKeys/sourceCount만** 제한해 읽음. 원천별 `sources.fed_fomc.status/attemptedAt`, 공급자 HTTP 응답, 파서 예외코드, 원문 input 및 SQLite/WAL **전부 반환하지 않음**. 이 Reader의 `collection-events`는 earnings API 특정 호스트 관측일 뿐 FOMC provider 실패 증거가 아님.
- 실제 PC Controller beforeSHA `badad912...` [config/operations.json](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/badad9124157879d7a645b64f2768113d632355b/config/operations.json)은 A `release-calendar-runtime-readonly`를 허용하지만 신규 `source-inventory-runtime-readonly`는 **미등록**. 최신 제어 GitHub main에는 등록되나 **PC 적용 인증된 readback 없음**.
- [신규 Reader 원본 소스](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/controller/source-inventory-runtime-readonly.mjs)도 FOMC 실패코드를 조회하는 동작은 없음. `market_input_batches_v1` 고정 TA_WS `release-calendar:treasury:taws:YYYY-MM-DD` 한 건과 2027 Census 진단 등을 조회하는 **별도** 입력 Reader로, 승인/설치 전 A 호출 불가.

### 8.2 최초 원인 증거 미존재를 코드 수준에서 확정 (FIRST FAIL 분류)

- 기능 `main/scripts/pc-writer/release-calendar.mjs`의 기존 `fed_fomc` 수집 경로: 공급자 `https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm` GET `response.ok` → HTML 텍스트 1 MB 상한 → `parseFomcAnnualCalendar(html,year)` 검사 → 유효 입력 `release-calendar:fed_fomc:YYYY` 로컬 저장/재조회 → output READY.
- **실패 코드 저장 계약이 없음:** 공통 `catch(error)`는 `source==='treasury'`의 경우에만 좁은 별도 `treasuryFailureCode`를 설정. `fed_fomc`는 `sources.fed_fomc={status:'SOURCE_FAILED',checkedAt:지난유효값,attemptedAt,sourceUrl}`만 유지하고 해당 `error.message`, HTTP code, parser stage를 별도 원장에 쓰지 않음. 이전 유효 FOMC 일정은 유지. 따라서 **현재 저장 출력만으로 최초 HTTP vs parse 단계 복원 불가**, 통제된 새 관측/승인된 별도 진단 증거가 없다면 `FIRST_FAIL=UNKNOWN_NOT_OBSERVED`(증거 부재); `SOURCE_FAILED` 자체는 실제 API의 source-level 실패 상태.
- 2026-11-14 [Fed 공식 일정](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm) 공개 본문에는 **2026·2027년 각 8개 회의**, 2027 10-26/27 `Monetary Policy Strategy Meeting`, 마지막 11-16/17 표시. 이는 공개 문서 **텍스트** 확인이며 실제 운영 PC가 받은 HTML 바이트/상태코드나 파서 성공 증거는 아님. 독립 웹 `/api/release-calendar` GET은 이번 도구에서 실패해 11/13 당시 [API 담당 #835](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/835#issuecomment-6863123928) 관측만 재사용: calendar PARTIAL 2358, Treasury READY 894, Treasury 365일 872·공개 중복0, `fed_fomc=SOURCE_FAILED`. 오늘 최신 D1 body SHA/동일 게시 확인 없음.
- **FOMC 진단과 Treasury 감사를 혼동 금지:** 과거 [#1023](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1023) `OPERATION_NOT_ALLOWED`는 TA_WS 신규 Reader **설치 단계** 거절이지 FOMC provider HTTP 실패가 아님. PC #1299 `CACHED`/no-provider-request는 새로운 실패 원인을 생성하지 않음. `git main` source registration이나 CI PASS도 운영 설치 성공으로 승격 금지.

### 8.3 이번 실제 수행·다음 하나

- 실제 완료 작업: **기존 허용 A(설치/출력)와 소스 동작·FOMC 실패 로그 생산 계약 3방향 교차 감사 완료**. `FOMC_HTTP_OR_PARSE_ERROR_NOT_PERSISTED`라는 진단 접근 한계를 확정. 이는 새로운 수집/계산/게시 성과가 아니므로 **95/100 유지**.
- 독립 코드를 증거 없이 수정하지 않음. [Draft PR #1063](https://github.com/ansqhd5774-Choi/zgmini/pull/1063) HEAD `45bdc448fe05dd5df7299088c3e4cb613c9b2d33`의 표시 수정 2파일·[CI #43499646946 SUCCESS](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43499646946)는 변경 없이 재사용. 운영 PC 명령·신규 A/Runner/CMD/임의 SQL/DB·D1·배포·예약 변경 **0건**.
- **다음 단일 필수 실행/담당:** 공유 Controller **단일 적용 Owner**가 현재 실제 운영 설치 before SHA·#996 공유 보호/lease·정규 승인 manifest(raw SHA-256)·9/13파일 신규 A 의존성을 대조하여 `source-inventory-runtime-readonly`의 **정식 A 설치/등록을 실제 Windows JSON/TXT로 증명**. 그 후 시장 캘린더 원담당이 TA_WS 365일 원문 감사 A 단 1회 실행; D1/API/UI 게시버전까지 대조 후 100% 여부 결정. FOMC 최초 단계는 기존 승인 Reader가 반환하지 않으므로 안전한 운영 원인 조회 권한·진단 경로가 별도로 실제 승인될 때만 독립 관측; 현재 FOMC API 원인을 추정하거나 신규 수집을 강제하지 않는다.

**53차 변경파일:** 본 담당 브랜치 증거문서 1개만 append; 신규 코드·테스트·PR·PC 설치/변경 **0건**. 완료된 검증을 반복하지 않음.


<!-- market-calendar-r55-reader-pc-live-evidence-20261114 -->
## 9. 55차 실증 — Treasury 365일 원문 A의 현재 운영 등록/공유 설치 Owner 원장 대조

**55차 지시:** [#68 6864363828](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6864363828) 시장 담당 M-02. 기존 FOMC 첫 HTTP/parse 오류 탐색 **재수행하지 않음**(`UNKNOWN_NOT_OBSERVED` 유지). FOMC 개정 표시 source [Draft PR #1063](https://github.com/ansqhd5774-Choi/zgmini/pull/1063) HEAD `45bdc448fe05dd5df7299088c3e4cb613c9b2d33`, CI [#43499646946](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43499646946) SUCCESS **재사용**, Production 반영·FOMC source 복구 미입증. 전체 **95%→95%**.

### 9.1 기존 승인된 운영 조회/Owner 원본 실제 재조회 결과

1. **마지막 인증 Windows 실측 = 2026-11-12T20:43:44.585Z.** [#1342 Run #43303078533](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1342), [원본 운영 PC JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-43303078533-1-operating.json) **직접 재조회**: `role=operating`, `host=PC`, `status=PASS`, `maintenance.actualControllerSha=badad9124157879d7a645b64f2768113d632355b`, `installLockHeld=true`, `installLockRecoveryRequired=true`, `receiverStatus=LISTENING`, `operationalWrites=0`. 이는 **해당 시각** 상태이지 오늘 실PC SHA·Runner/lease 생존 증거 아님.
2. 당시 설치 SHA `badad912...`의 Git 원본 `config/operations.json`(blob `d22d18bd9b252cbaa5e6b8e082377a872630b2b3`)은 **A 31개 중 `source-inventory-runtime-readonly` 미등록**, 반면 제어 GitHub `main` 파일(blob `c906683afd487762f5bc32f50a199679df200dc3`)에는 **37개 중 신규 A 등록**. main 소스 변경은 PC 설치 성공 증거가 아님. 전날 설치 SHA 이상의 새 PC 설치 인증 JSON/TXT는 원장/Issue 조회에서 발견하지 못함.
3. 공용 총괄 [기존 단회 pc-job #1351](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1351), [Actions Run 43429486924](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43429486924), Job `131899103441` **GitHub 최신 재조회 `queued`, `conclusion=null`, attempt 1, Windows Runner 미배정**. Run artifacts 조회 `[]`, 새 JSON/TXT **0건**. `#1351`은 신규 Treasury A가 아닌 기존 `core-runtime-source-readonly`의 운영 상태 조회 요청이며 **새 조회 요청 중복 발행 금지**. queued 자체로 PC Offline·Controller 장애 원인 단정 금지.
4. 실제 공유 설치 보호 [#996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/996) 원장: C 80%/`NO-GO`, native CAS/추가 continuation 승인 미충족, 현재 실PC Owner/lease readback 없음. [공용 Reader 13파일 source-only 후보](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/codex/controller-ops-lessons-20261105/docs/CONTROLLER_READER_A_SOURCE_DIFF_PREFLIGHT_20261114.md)는 **실제 승인 B manifest 아님**, 원본 before SHA256·backup·실제 공유 lease·중앙 Owner 없이는 Controller 설치 불가. #996은 **충돌하는 공용 설치 쓰기만 차단**, 기존 Treasury 수집·D1 게시의 신규 실패라고 해석 금지.
5. #68 중앙 단일 담당자 및 [적용 대기열 정본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/docs/CONTROLLER_APPLY_QUEUE.md)을 확인. **신규 `source-inventory-runtime-readonly` 설치의 PASS/등록/실PC 실행 증거는 55차 원격 조회 기준 0건.** GitHub `main`/PR/격리 CI PASS는 실PC 등록과 별개.

### 9.2 LAST PASS/FIRST FAIL 및 정확한 다음 필수 실행

- **LAST PASS — 실제 운영 PC:** #1342 / Run 43303078533 / 2026-11-12T20:43:44.585Z: Controller `badad912...`, 보호 lock 및 recovery 필요 상태를 변경 없이 readback. **기존 캘린더 A PASS:** #1299 / Run 43166235600 `release-calendar-runtime-readonly` / `CACHED` / `sqliteOpened=false`, Treasury 원문 감사 아님.
- **FIRST FAIL — 신규 TA_WS A 이전:** 과거 [#1023](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1023) `OPERATION_NOT_ALLOWED/EVENT_OR_REQUEST_VALIDATION`. **현재 새 원본 실패 관측은 없음**; `#1351 queued`는 `AUTOMATION_PENDING/WAITING_FOR_RUNNER_ASSIGNMENT_EVIDENCE`, 새 실행 실패 아님. 현 PC installed op/beforeSHA/lease = `STATE_UNKNOWN`; 설치 범위 = `AUTOMATION_BLOCKED(NOT_INSTALLED_OR_UNVERIFIED)`.
- **다음 필수 실행 하나 / 담당 = 기존 공용 Controller 단일 적용 Owner:** **이미 승인된 운영 PC 직접 read-only 경로에서 현시각** 6 Runner Online/busy·Watchdog Guardian PAUSE/DRAIN·Supervisor heartbeat, Controller `installed SHA + operations allowlist/source-inventory-runtime-readonly 등록 여부`, 실제 `controller-install` lease owner/recoveryRequired, 후보 파일 before SHA-256·현재 유지보수 승인 경계를 **한 번** 실측하고 #1351 원본/공용 #68에 JSON/TXT 또는 승인된 비민감 영수증으로 반환. 그 결과 실제 등록 PASS이면 시장 담당만 승인 A **새 고유 1회** TA_WS 365일 원문 기간/건수/eligible/text SHA/WAL을 검사. 미등록이면 중앙 담당이 충돌하지 않는 정규 B 승인/설치 가능성 판단(지금은 NO-GO), 새 임의 pc-job/CMD/SQL/복구 우회 금지.
- **판정:** 실제 원문 365일 감사 0/1, Production 최신 D1/API/UI 동일 버전 검증 미완료. 기존 Treasury 수집·계산·저장·게시 성공 95점을 보존, 전체 95%→95%, 신규 PC A/B/Runner request·유료 plugin·RDC·DB/D1/Cloudflare·예약·운영 source 변경 **0건**.

**55차 파일 변경:** 이 담당 브랜치 증거기록 1파일 append only; 운영 PC·기능 코드·manifest/test 재실행 없음. 55차 공용 #68 인계는 실제 중앙 담당의 자동 수신이나 PC 설치 성공 아님.


<!-- market-calendar-r58-official-2027-public-api-once-20261114 -->
## 10. 58차 — 연준 2027 전략회의 vs 금리결정의 실제 공개 읽기 검증 시도

**중앙 지시:** [#68 58차](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6864999213), 시장 캘린더만 수행. **시작/종료 95/100 → 95/100**. 기존 FOMC 과거 최초 HTTP/파서 오류는 비저장 확정이므로 재조사 0.

**실제 검증(2026-11-14 KST 대화 실행, 공개 읽기):**

1. **공식 일정 원문 PASS:** [Fed 2026-11-12 공식 개정 보도자료](https://www.federalreserve.gov/newsevents/pressreleases/monetary20261112a.htm) 직접 공개 열람. 2027년 회의 8개: Jan 26-27, Mar 16-17, Apr 27-28, Jun 8-9, Jul 27-28, Sep 14-15, **Oct 26-27 = broader monetary policy strategy only / no policy decision**, **Nov 16-17 = regular rate decision**; 종전 Dec 7-8 삭제. 관측한 것은 공식 웹 공개 텍스트이며 운영 PC 공급자 API/HTML 원본 저장 검증 아님.
2. **개발 source 계약 PASS(소스에 한정):** [Draft PR #1063](https://github.com/ansqhd5774-Choi/zgmini/pull/1063) `head=45bdc448fe05dd5df7299088c3e4cb613c9b2d33`, 2파일, `draft=true`, `merged=false`; [기존 CI #43499646946](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43499646946) SUCCESS 재사용. `app/market-calendar/market-calendar-client.tsx`는 `fed_fomc/fomc/2027-10-27`만 **`미국 FOMC 통화정책 전략 회의 · 금리 결정 없음`**으로 표시하고 다른 FOMC 날짜의 기본 금리결정 표시와 기존 중요도 산식을 유지. `tests/release-calendar-fomc-annual.test.mjs`는 2027 Nov 17 포함/Dec 8 제외 확인. 현재 `main`의 시장 UI Git blob `f95ffd7d78270578eeabc8ca5ffa028f3e670263`에는 해당 예외 없음. **source-level 정합성 = PASS; Production 배포/실화면 PASS 아님**.
3. **공개 시장 화면 GET:** `https://zgmini.kr/market-calendar/` 공개 웹 HTML 열람 성공. HTML 추출에는 로딩 문구(`공식 일정 저장본 확인 중`)와 2026년 10월 일정 예시가 있으나 2027년 동적 API/화면 값은 나타나지 않음. `2027-10-27` 이벤트 존재·표시명·업데이트 시간 **NOT_VERIFIED**. 단순 HTML 200/기존 초기 페이지를 렌더 성공으로 취급하지 않음.
4. **공개 API 1회 읽기 시도 / FIRST FAIL — 접근 도구:** `https://zgmini.kr/api/release-calendar`의 웹 조회 결과 `Internal Error / URL not accessible via this tool`. 외부 HTTP 격리 샌드박스에서 같은 URL 직접 공개 GET 1회 요청 시 `ConnectionError / NameResolutionError / Temporary failure in name resolution`(실제 HTTP response/status/body 전혀 수신하지 못함). 별도 유료 브라우저/원격 PC/권한 우회·같은 실패 URL 추가 반복 0. **PUBLIC_API_ACCESS_AUTOMATION_BLOCKED**, 서버 실제 오류·`SOURCE_FAILED`의 신규 상태라고 주장 불가. 실물 API JSON이 없으므로 2027 Sep 15/Oct 27/Nov 17 이벤트 행수·id/date/title/source·`updatedAt`·`sources.fed_fomc`·cache/Production SHA **UNVERIFIED**.
5. **기존 비공개/승인 PC 단계 변화 없음:** 지난 [#1342](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1342) 시점 설치 Controller SHA `badad9124157879d7a645b64f2768113d632355b`의 A allowlist에 `source-inventory-runtime-readonly` 미등록. [#1351](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1351) 기존 Job은 58차 중앙 원장 시점 `queued`; 신규 설치 성공 영수증 미확보. 이 감사만 `AUTOMATION_BLOCKED(NOT_INSTALLED_OR_UNVERIFIED)`. Treasury 365일 원문 A·D1 최신 exact readback **미실행**, 기존 수집/게시 증거 95점 보존.

**58차 LAST PASS / FIRST FAIL:** LAST PASS=Fed 2026-11-12 발표 원문 열람+PR #1063 diff/기존 CI source-level 검증; 역사 PC LAST PASS=#1342 운영 Controller SHA/lease 원본과 #1299 calendar A `sqliteOpened=false`. FIRST FAIL=이번 **공개 API 접근 단계**에서 fetch inaccessible/DNS resolution, 서버 오류 판단 아님. 이전 신규 A 첫 `OPERATION_NOT_ALLOWED`은 과거 #1023, 현재 재현 안 함.

**다음 필수 실행 하나(실제 승인 조건):** **중앙 공유 Controller 적용 Owner**가 운영 PC의 현재 설치 `source-inventory-runtime-readonly` A allowlist+라우팅/installed SHA·실제 lease·승인 B 적용 상태를 기존 허용 비민감 원본 경로에서 확인해 #68에 인증된 설치 가능/불가 결과를 돌려줄 것. 설치 PASS인 경우에만 시장 원담당이 고유 A 1회로 TA_WS 365일 rows/date/hash/WAL JSON/TXT 감사 → 동일 버전 D1/Production API/UI 대조. 공개 API는 승인된 무료 접근이 정상화되면 해당 범위를 1회 검증하며 현재 접근 실패를 다른 기능 전역 BLOCKER로 확장하지 않음.

**변경·운영:** 이 문서 증거 추가 1파일만. 신규 기능 소스/테스트/CI, PC A/B/Runner 요청, Controller/Writer/SQLite/D1/Cloudflare 배포/예약 변경 **0건**. 공유 설치 중앙 Owner 인계는 실제 설치·타 일반챗 자동수신 아님.


<!-- market-calendar-r60-taws-failclosed-verdict-20261114 -->
## 11. 60차 — TA_WS 신규 A JSON의 결손·실패 판정 계약 실제 Node 회귀 수리

**공통 정본:** [#68 60차](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6865373693) 시장 담당. 전체 **95/100→95/100**. 공식 2027 FOMC/PR #1063/58차 공개 HTTP 차단은 기존 증거 재사용하고 반복 실행하지 않음.

### 11.1 Reader 원본에서 독립 확인한 경계

- 제어 `main/controller/source-inventory-runtime-readonly.mjs` blob `db9e9c8347277287cc6ef10bad310be125314d52` (60차 조회): `treasuryTawsInputSummary`가 `fromDate/toDate`에 **365일 초과만 거부**. **1일~364일인 단축 구간도 `status=OBSERVED`가 가능**. `eligibleCountMatchesStored=false`인 건수 불일치에도 `status=OBSERVED`, 외부 총괄 `result.status=PASS`는 DB read 성공을 뜻하며 입력 원자료 완전성 보장은 아님.
- `treasuryTawsInput.status='NOT_STORED'`는 원문 결손, `UNREADABLE_OR_INVALID`는 파싱/메타 손상, `WAL_SIDECARS_ABSENT_UNVERIFIED`는 SQLite 조회 불확정 — **모두 365일 감사 PASS 금지**. `sqliteOpened=false` 상태도 금지.
- Reader `textSha256`는 **PC 저장된 body.text**의 SHA-256. 외부 공급자 원문과 일치하는지에 대한 사전 기준 digest가 없으며 원문 중복 건수도 반환하지 않음. 따라서 metadata만으로 원문 **독립 중복 검사·외부 해시 동일성·100% 기능 완료를 증명할 수 없음**. 원문 CUSIP/텍스트를 Github·채팅에 노출하지 않음.

### 11.2 실제 독립 소스·테스트 (운영 Controller 수정 없이)

**전용 브랜치에 신규 코드 2파일 commit, 모두 원격 blob readback PASS:**

1. [`lib/market-calendar-taws-audit-verdict.mjs`](https://github.com/ansqhd5774-Choi/zgmini/blob/codex/zgmini-gpt-workspace-20261025/lib/market-calendar-taws-audit-verdict.mjs) — Git blob `d47bc10662968e0238698d34a8e38f2bd9f82500`. `judgeTreasuryTaws365Audit(reader,{expectedToDate})`은 **실PC A의 bounded 비민감 JSON이 이미 존재할 때만** 사용되는 pure source-only 판정기. SQLite/외부 HTTP/Controller/운영 write를 수행하지 않는다. 기존 Reader 계약·출력·Controller 설치 manifest를 변경하지 않는다.
2. [`tests/market-calendar-taws-audit-verdict.test.mjs`](https://github.com/ansqhd5774-Choi/zgmini/blob/codex/zgmini-gpt-workspace-20261025/tests/market-calendar-taws-audit-verdict.test.mjs) — Git blob `f0d1054e26ca0dc6fd5ea0f697e77b656ea2335c`. 아래 독립 Node 22.16.0 실행 성공 및 로컬 테스트 파일 `git hash-object`와 원격 Git blob 두 파일 **정확히 일치**.

```text
node --test tests/market-calendar-taws-audit-verdict.test.mjs
1..12
# pass 12
# fail 0
# duration_ms 112.019822
```

**검증 내용(12개):** 완전 메타를 받아도 `readyForFinalCompletion=false`/raw duplicate `NOT_PROVIDED_BY_READER` 고정; `NOT_STORED`/null; invalid/unknown; WAL/SQLite 미개방; 1/364/366일 **365일 미충족**; 무효 달력 날짜; 다른 정상 수집 checkpoint 날짜 부재/불일치; `eligibleCountMatchesStored` 및 실제 적격 카운트 불일치; invalid storedAt/count; digest/scope 거부; provider/D1/운영 쓰기 보호; top-level `STATE_UNKNOWN`. 실제 호출자가 원본 Reader의 `OBSERVED`와 글로벌 `PASS`만 보고 100%로 승격하지 못하도록 fail-closed 판정.

**해석 주의:** `METADATA_PASS`는 오직 **정확히 365일, 체크포인트 일치, 저장 행/적격 건수, 로컬 SHA256 형식·크기, SQLite read-only 호출**에 대한 source-only 전제 확인. `readyForFinalCompletion=false`을 고정하여 **실제 TA_WS PC 원문 A 0/1, 원문 중복·외부 digest 검증 미실행, 최신 D1/API/PC·모바일 UI 버전 재조회 미완료** 구분. 새 계산 산식·원본 데이터 계약·TTL·운영 코드를 변경하지 않음.

### 11.3 LAST PASS / FIRST FAIL / 단일 다음 작업

- **LAST PASS(신규 실제 검증):** 격리 컨테이너 Node `v22.16.0` 12/12 PASS. 전용 브랜치 두 소스 파일 remote readback blob 일치. **기존 실제 PC** #1299/Run 43166235600 `release-calendar-runtime-readonly PASS`, `sqliteOpened=false`는 기존 증거로만 보존.
- **FIRST FAIL(계약상 재현한 차단):** 양끝 포함 365일 미만/초과 → `TAWS_WINDOW_NOT_EXACT_365_DAYS`; `eligibleCountMatchesStored=false` → `TAWS_AWARDED_COUNT_MISMATCH`; 결손 → `TAWS_NOT_STORED`; WAL/SQLite unknown → `READER_OR_SQLITE_NOT_PASS`. **이들은 synthetic source-only fixture 결과이지 실제 운영 PC 데이터 실패 확정이 아님**.
- **실PC 감사 BLOCKER:** 과거 운영 Controller `badad912...`에서 신규 `source-inventory-runtime-readonly` 미등록; 60차 중앙 원장 기준 #1351 일반 PC 조회 Job `queued`, 최신 설치 PASS·원자료 365일 A JSON/TXT 없음. 신규 요청/우회/중복 실행 **0**.
- **다음 하나 / 공용 Controller 단일 Owner:** 승인된 실제 운영 PC read-only 증거로 **신규 `source-inventory-runtime-readonly`의 실설치 SHA·allowlist·라우팅 PASS**를 확인한 뒤 시장 원담당에게 인증 JSON/TXT로 반환. 그때만 원담당이 고유 A 한 번으로 실제 TA_WS 원문 감사→pure 판정기 적용→D1/API/UI 같은 버전/중복 범위 확인. 공유 #996 보호·lease·승인 manifest를 우회하지 않음.

**60차 변경:** 위 개발 소스 2파일 + 본 증거문서 1파일. 신규 PC A/B/Controller/Runner/CMD/SQL/D1/Cloudflare/수집·계산·게시·예약 변경 **0**. 실제 기능 전체 진행률 **95% 유지**.


<!-- market-calendar-r62-pc-json-txt-receipt-validator-20261114 -->
## 12. 62차 — 승인 A급 실PC JSON/TXT 출처 검증 어댑터 실제 구현 및 독립 Node 실행

**중앙 정본:** [#68 62차](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6865704255). 시장 캘린더 **95/100→95/100**. 이전 60차 TA_WS 순수 판단기 `12/12 PASS`, FOMC 공식 일정·PR #1063와 과거 공개 API 실패는 **재시험하지 않고 재사용**.

**독립 다음 실행의 정확한 목적:** 60차 `judgeTreasuryTaws365Audit`는 `source-inventory-runtime-readonly`의 **내부 `result` 객체**만 판정. 실제 운영 A 결과는 기존 [#1299 JSON/TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43166235600-1-seat-3.json)처럼 `ZGMINI_PC_RESULT_V1` 전체 envelope와 별도 TXT key=value 영수증으로 반환됨. 실제 `requestId/jobId/operation/seat/installed Controller SHA`, `actualExecutionSha`, `protectedBefore/AfterSha256`, `firstFail/exitCode`, JSON/TXT 2/2 일치를 확인 **전** 내부 TA_WS metadata를 완료 판정하면 잘못된 Run·다른 operation·설치 버전의 결과가 통과할 위험. **기존 PC #1299는 `release-calendar-runtime-readonly`이며 신규 TA_WS A의 PASS가 아님.**

**이번 실제 변경 — 시장 기능 전용 브랜치 2파일 추가, 공용 Controller 변경 0:**

1. [`lib/market-calendar-taws-pc-receipt.mjs`](https://github.com/ansqhd5774-Choi/zgmini/blob/codex/zgmini-gpt-workspace-20261025/lib/market-calendar-taws-pc-receipt.mjs): export `checkTreasuryTawsPcReceipt(receipt,txt,expected)`. 독립 원본 Issue/Run·설치 확인에서 전달받는 `expected.requestId/jobId/controlSourceSha/expectedToDate`를 필수 입력으로 삼아 **허용 `source-inventory-runtime-readonly` 1회만** 검사. Controller 실행 SHA 일치, `status=PASS`, `exitCode=0`, `firstFail=null`, 저장 보호 동일 SHA256, provider/D1/operationalWrites=0, JSON/TXT 필수 19필드 정확 동치와 중복 TXT 키 거부 → 기존 60차 메타 판정 호출. 잘못된 경우 bounded 코드만 반환하고 원본·민감 필드 노출 안 함. 실PC나 Github/SQLite/D1/API에 접속하거나 운영 파일에 쓰지 않음. Blob `1841029aab3f5dba63581865a0fb95b00ab88541`.
2. [`tests/market-calendar-taws-pc-receipt.test.mjs`](https://github.com/ansqhd5774-Choi/zgmini/blob/codex/zgmini-gpt-workspace-20261025/tests/market-calendar-taws-pc-receipt.test.mjs): 합성 PC 영수증 fixture 8개. 오승인 `operation/requestId/seat`, installedSHA drift, TXT status 누락/중복/불일치, 보호 원장 변화·운영 쓰기, `NOT_STORED`, 독립 checkpoint 불일치, nested STATUS_UNKNOWN, 비민감 출력 검증. Blob `354f6e5acb5c148bf5dea67e38b9e981682b994a`.

**실제 source-only 실행:** 격리 `Node v22.16.0`, 기존 60차 판정기 파일 blob `d47bc10662968e0238698d34a8e38f2bd9f82500`과 동일한 소스 사본에 연결:
```text
node --test tests/market-calendar-taws-pc-receipt.test.mjs
1..8
# pass 8
# fail 0
```
Test 실행환경은 **비운영 격리 컨테이너**이고 GitHub Actions/운영 Windows 실행이 아님. 신규 2개 파일의 `git hash-object`를 GitHub에서 실제 2/2 readback하여 **각각 완전 일치**. 변경 commits: `95fe768986a8aa660e3d1788c2418716333025cf` (source) / `a6b41b5c680617714aa797d6bd7da56ecefc0821` (test). 이전 12/12는 재실행하지 않음.

**LAST PASS:** 이전 PC #1299 당시 `release-calendar-runtime-readonly` PASS, `sqliteOpened=false`; **이번 신규 PASS는 격리 Node 8/8 + GitHub blob 2/2 일치**. **FIRST FAIL:** 합성 receipt의 실제 `PC_JOB_IDENTITY_OR_STATUS_MISMATCH`, `PC_INSTALLED_SHA_UNVERIFIED`, `PC_JSON_TXT_PAIR_UNVERIFIED`, `PC_PROTECTION_OR_READONLY_UNVERIFIED`, `TAWS_NOT_STORED` 등이 의도대로 거부. 실제 TA_WS 원본 실패가 아님.

**현재 실PC 장벽:** 중앙 #62 기준 [#1351 Run 43429486924](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43429486924) `queued`, Windows pickup 0, 최신 실PC `source-inventory-runtime-readonly` 설치 SHA·허용목록·라우팅·새 A JSON/TXT **UNVERIFIED**. 60차 메타·62차 영수증 검증은 실제 원문 365일 수집/저장/검증·외부 hash/원문 중복/D1/Production UI 증거가 아니므로 **기능 95% 유지**.

**다음 단 하나 / 중앙 Controller 단일 Owner:** #996 공유 설치 보호/lease와 정규 승인 계약을 지키면서 현행 **실PC Controller installed SHA + 신규 `source-inventory-runtime-readonly` allowlist/라우팅**을 기존 승인 read-only 경로로 확인해 인증된 설치 JSON/TXT를 반환. 설치 PASS 이후 시장 원담당만 새 고유 A 단 1회 → 62차 영수증 2/2 검증→60차 365일 fail-closed 메타 판정→독립 원문 중복·D1/API/UI 버전 readback. 설치 전 새 pc-job/Runner·CMD/SQL/D1/배포 우회 금지.

**62차 변경:** 기능 브랜치 source+test 2파일 / 이 기록 1파일. 실제 PC·Controller/Runner/Writer·원자료·SQLite·D1·Cloudflare·예약 변경 **0**.


<!-- market-calendar-r65-install-gate-20261114 -->
## 13. 65차 — 실PC 신규 A 설치 증거 수신 여부와 감사 Reader 응답 계약의 조건부 실행 판정

**지시 정본:** [#68 65차 #6866393700](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6866393700). **전체 95%→95%**. 중앙 65차 본문에 운영 `source-inventory-runtime-readonly` installedSHA/allowlist/라우팅 PASS 또는 새 Windows JSON/TXT 영수증 수신 없음. 중앙 기존 #1351/Run `43429486924` Job `131899103441` `queued/conclusion=null`은 중앙 정본 상태 **재사용**하며 GitHub Workflow·PC를 새로 폴링/재실행하지 않음. 마지막 PC #1342의 `badad912...`은 당시 실측 버전으로서 지금 현재 설치 SHA로 대체하지 않음.

**이번 독립 source 계약 검사:** 제어 main `controller/source-inventory-runtime-readonly.mjs` blob `db9e9c8347277287cc6ef10bad310be125314d52`의 `inspectSourceInventory`는 core·history를 각각 read-only 열고 `result.status=PASS`이면 둘 다 PASS, `code=SOURCE_INVENTORY_STORED_READONLY`를 반환. `controller/operations.mjs` blob `b507697ce089254cd61932f1d5b703b48f93e0db`의 해당 operation dispatch는 소스상 존재. **운영 설치/호출 성립 증거가 아님.**

**원담당 소스 재사용:** `lib/market-calendar-taws-audit-verdict.mjs` blob `d47bc10662968e0238698d34a8e38f2bd9f82500`는 Reader 최상위 PASS와 SQLite core PASS·365일을 확인하며, `lib/market-calendar-taws-pc-receipt.mjs` blob `1841029aab3f5dba63581865a0fb95b00ab88541`는 동일 `SOURCE_INVENTORY_STORED_READONLY`와 PC JSON/TXT·run/request/Controller SHA·0쓰기 검증 후 순수 판정기로 연결. **이번 계약 대조에서 새 소스 수정 필요 결함 입증 없음**. 기존 격리 Node 12/12, 8/8 PASS를 증거 재사용; 재실행/신규 CI 없음.

**LAST PASS:** 기존 PC #1342의 당시 설치 상태 및 #1299 이전 calendar Reader PASS; 60/62차 격리 Node 기존 12/12+8/8 PASS. **FIRST FAIL:** 과거 #1023 `OPERATION_NOT_ALLOWED/EVENT_OR_REQUEST_VALIDATION`(그 당시 신규 A 미등록), 현재 TA_WS 신규 A는 호출하지 않았으므로 새 실행 실패 아님. **현재 상태:** `AUTOMATION_BLOCKED/INSTALLATION_NOT_VERIFIED`은 실제 Treasury TA_WS 365일 원문 A 감사에만 적용. source-registration은 현재 설치 성공을 보장하지 않음. 비공개 원문 rows/eligible/SHA/WAL 0/1, raw duplicate·외부 원본 해시·D1/API/UI 동시 버전 검증 미완료. 기존 정상 수집·계산·저장·게시 증거 95% 보존.

**다음 필수 실행 하나/중앙 운영 PC 단일 Owner:** 기존 승인된 현재 PC read-only 영수증으로 **installed Controller SHA·`source-inventory-runtime-readonly` allowlist/라우팅 PASS**와 관측 시각을 확보하여 #68에 반환. 세 항목이 인증될 때만 시장 원담당이 승인된 새 고유 A **단 1회** → 62차 JSON/TXT 영수증 어댑터·60차 365일 판정 적용 → 별도 원문 중복 및 동시 D1/API/UI 조회. 승인 없는 새 pc-job·Runner/CMD/SQL/잠금 해제/Controller/Writer/D1·Cloudflare 배포 금지.

**65차 변경:** 기능 소스/테스트/CI 0, 기존 브랜치 이 진척 기록 1개만 append; 실제 운영 데이터/설정/배포 변경 0. GitHub 인계는 타 일반챗 자동 수신·운영 PC 신규 설치 성공 아님.


<!-- w02-20261115-correction-and-er1-first-fail -->
## 2026-11-15 — W02 전체 완료 오판 철회 및 최신 ER1 실제 FIRST FAIL (단일 소유 브랜치 인계)

**사용자 확정:** W02 전체 작업을 끝내기 전에 다른 담당으로 이동하지 않는다. 별도 예약 검증을 미완료 업무/완료 Gate/진행률 분모로 만들지 않는다. 모든 ZGMINI 기능 개발·실운영 적용 후에만 사용자에게 홈페이지 육안 최종 확인을 요청한다.

**기존 완료 증거 중 재사용 (재검사 금지):**
- FOMC 2027 공식 개정: 기능 PR #1082 main `67e04c138b73a3f35a0440e2633b7e638639078f`; PC Writer B #1405 / Run `43669279911` `WRITER_B_INSTALLED_VERIFIED`; 정상 Core 자연 회차 후 공개 `/api/release-calendar` `READY`, 2027 공식 FOMC 8개, 마지막 `2027-11-17` 존재, 구 `2027-12-08` 부재, 2027-10-27 전략회의 전용 UI 반영. 이것은 **FOMC 부분 완료**이고 W02 전체 완료가 아니다.
- `PARTIAL` 중 모델 283·공식 연결 186·비일정 97 숨김 방지: PR #1087 main `867e96669ea48bf6f1d6a1310fa305dd276f3e53` 및 Production HTML/배포 JS 반영 확인.
- Treasury TA_WS: #1401/Run `43648101352` 실제 PC Core 원문 2025-11-15~2026-11-14 정확 365일, raw 447/eligible stored 436/eligible independently counted 436, local text SHA256 `c70216a051dd9a24a6b9189193535da23fc136f22e1e0219455d896545bf74de` 확인. 이는 로컬 원문 감사 합격이며 **공개 D1 같은 본문 hash 독립 대조는 아직 미증명**.

**새 실제 ER1 운영 증거(반복한 과거 검사 아님):**
- 기존 allowlist `writer-publication-evidence-readonly` 단회 #1408/Run `43675906586`/2026-11-15T04:15:09Z, 운영 Windows seat3, `PASS/ER1_WRITER_METADATA_READONLY`, `sqliteOpened=true`, 공급자 GET 0, 운영/원장/D1 쓰기 0. JSON/TXT 원격 2/2.
- 현행 PC Writer `2026-11-15T04:10:46.547Z` `PUBLISH/VERIFIED`, ledger `2026-11-15T04:12:55.559Z` `VERIFIED`.
- 2026-11 monthly output `market-calendar:earnings-er1-score-2026-11-public`, local `storedAt=1794546027801`, local body sha256 `0675aada329b09eaed5644d9dea4d090626c664dd216d4551474dccbe7914b51`; **같은 Writer 게시 시각의 D1 per-key readback `VERIFIED`/matchedToLocal true, D1 storedAt 및 bodySHA 동일**. 따라서 예전 #835의 'D1 per-key readback 0건'은 현행 사실이 아니다. 단 `productionVerified=false,publicApiUiVerified=false`이므로 최종 공개 UI 재현 성공으로 확장하지 않는다.
- **실제 첫 기능 실패:** `er1Future.status=NO_NEW_OUTPUT`, `months[2026-11].status=MONTH_SOURCE_INVALID`; `months[2026-12].status=SAVED_MONTH_INCOMPLETE` (현재 미래 월의 미수집이라는 정상 가능성을 별도 분리). 11월 신규 계산이 기존 공개본을 유지한 상태로 정체되어 있음. 최신 공개 D1에 *기존* 본문이 게시된 것과 **신규 계산 성공은 별개**.
- 현행 계산기 `scripts/pc-writer/market-calendar-er1-auto-output.mjs`의 `MONTH_SOURCE_INVALID` 분기는 **아카이브 14일 사설 원문 읽기/JSON**, **해당 월 저장 일별 텍스트 재파싱**, **`forecastRowsFromSaved` 재구성/지표 검증**으로 최소 3갈래; A의 현재 출력은 실패 날짜·단계·안전 코드가 없어 **최초 원인을 하나로 확정할 수 없다**. 입력을 추정으로 대체하거나 계산·산식·공개 이미 게시된 값을 조작하지 않는다.

**다음 정확한 해결 작업 (반복 점검 금지):**
1. 기존 설치 Reader/보고 범위에서 11월 **실제 첫 invalid 저장일·파싱/사설 아카이브/모델 입력 단계와 allowlist된 실패코드** 한 건을 식별한다. 이미 #1408에서 완료한 게시 hash 비교 재요청 금지. 현재 A가 이 정보를 출력하지 않으므로 새 수집/SQL/비공개 원문 GitHub 업로드로 우회하지 말 것. 필요한 진단 확장은 정규 소스·승인 경로에서 **그 실패 분기만** 처리.
2. 확인된 원인(실제 저장 원문 형식/입력 정규화/사설 경로 중 하나)에 해당하는 최소 소스 수정→변경 영향 회귀→승인 Writer B 설치→정상 Core ER1 신규 `READY_OUTPUT`/원장 per-key readback→공개 API·화면 연결. 승인되지 않은 데이터 가공, 무단 공급자 GET/DB/D1 수동 쓰기, Core 재기동 금지.
3. 별도 Treasury 365일 원문 감사와 공개 D1/날짜/중복 집계를 같은 버전에서 맞추고 시장 캘린더 경제·실적·시장 이벤트 전체 콘텐츠 완료 범위를 판단한다. FOMC 단건 결과만으로 종결 금지.

**진행률 정정:** W02 `100%` 오판 **철회**; 기존 `95%`를 정밀 재산정 전 잠정 기준으로 유지한다. ZGMINI 전체 기존 `57.4%`도 임의 상향하지 않는다. 작업 범위는 W02로 고정한다. #68 정정 https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6889029125


<!-- w02-20261115-er1-installed-and-treasury-public-count-parity -->
## 2026-11-15 후속 — ER1 최초 오류 stage 식별기 실PC 설치와 Treasury 365일 공개 정량 대조

- **기존 W02 완료 재사용:** 2027 FOMC 최신 일정 8건/구 12월8일 제거, 공식 공급자 READY, 경제모델 283개 연결 현황 표시; 같은 설치·수집·CI 재실행 없음.
- **Treasury 공개 D1 Reader의 정확한 365일 범위 실증:** PC A #1401의 원자료 2025-11-15~2026-11-14 365일 적격 낙찰 436건 및 raw447건, SHA256 `c70216a051dd9a24a6b9189193535da23fc136f22e1e0219455d896545bf74de` 재사용. 실제 `https://zgmini.kr/api/release-calendar` JSON `READY`, `updatedAt=2026-11-15T03:45:06.198Z`; 같은 날짜 경계의 `treasury-auction-*` 436건, `treasury-announcement-*` 436건, 기타 0건, `id+date` 중복0. PC eligible=공개 auction 정확 436/436 일치. 단 PC raw 텍스트 해시와 D1 원문 해시 1:1 동일성은 미관측이라 건수 이상 주장을 하지 않는다.
- **실제 ER1 기존 공개 게시 PASS ≠ 최신 계산 성공:** #1408/Run43675906586 A 결과는 Nov public output local stored_at `1794546027801` sha `0675aada329b09eaed5644d9dea4d090626c664dd216d4551474dccbe7914b51` 와 D1 per-key 동일, Writer verified; 그러나 월 신규 계산 Nov=`MONTH_SOURCE_INVALID`, Dec=`SAVED_MONTH_INCOMPLETE`, 신규 output 0. 프라이버시 원본/ERP 공급자 데이터를 조회하거나 무효 자료로 대체하지 않는다.
- **코드 수정/CI/병합:** `zgmini` #1088, 2파일, CI [#43676695346](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43676695346) SUCCESS, `main@d60a6be5e54fb5e7b450f74c4fd1f45b4f874dbb`. 기존 `er1Future.months[].status` 출력 안에서 실인증 A가 구별 가능한 정적 safe `MONTH_SOURCE_INVALID_ARCHIVE_<DAY>_<CODE>`, `...DAY...`, `...ADAPTER...`를 쓰고, 사설 입력·회사명·메트릭을 유출하지 않는다. 산식/유효 이전 저장본 보호와 게시 로직 불변.
- **PC A 최신 before 원본:** #1409/Run43676796454 PASS, `scripts/pc-writer/market-calendar-er1-auto-output.mjs` `beforeSHA256=f13accdeed8601b898343eb09331470f4d6783ca94af22022543be7ea7e2b66e`, 당시 PC config/HEAD/checkpoint `55e62c19672d03e93bfa573c56ba4bab1d28e979`, tracked-clean/source identity consistent, 해당 before는 GitHub main 과거 동일 바이트.
- **실PC Writer B 실제 설치 성공:** control #1410 승인 exact one-file manifest sha `2fe8f544dea2474423891cbac3a5bc2faacaca2c8ece3c59ba47916f9e664fc1`, 파일 afterSHA256 `aa75821a58fa3cee3e6f712943d7636f6bfcec72362bdfb76d081a643b803a49`, FOMC parser/collector 2개 SHA 보호. #1411/Run43677169400 원격 반환 **`WRITER_B_INSTALLED_VERIFIED/WRITER_B_INSTALL_VERIFIED`, JSON/TXT 2/2 재조회**, 운영 source 일부 외 Provider/DB/D1/Task/예약 변경 허용0. 이 설치는 아직 **최신 11월 신규 계산 성공 증거가 아님**.
- **다음 W02 실작업 1개:** 정상 Core Writer가 설치 이후 `months[2026-11]`을 갱신하면 기존 허용 `writer-publication-evidence-readonly` A **한 번**으로 첫 오류 stage/day/code를 조회. 해당 실제 실패 원인만 수정하고 정상 11월 ER1 계산→로컬 새 output→D1 per-key SHA→실제 공개/API·화면 연결을 끝낼 것. 이후에도 미완료 콘텐츠/권리 범위가 있으면 별도 확인하고 W02 전체 완료를 단정하지 않는다.
- **진척 정정:** W02 100% 선언 철회, 잠정95% (최신 실제 ER1 장애로 재산정 필요), 전체 ZGMINI 57.4% 잠정 유지. W02 끝나기 전 타 기능으로 전환하거나 사용자의 중간 육안/예약 검증을 요구하지 않는다. 중앙 정본 https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6889231373


<!-- w02-er1-nov-adapter-metric-recovery-installed-20261115 -->
## 2026-11-15 후속 — 11월 ER1 METRIC_INVALID 최초 분기 실증 및 정규 1파일 B 복구 설치 완료

1. **실제 최초 장애 확정:** #1413/Run `43677990737`은 진단기 #1411 설치 후의 정상 Core Writer `2026-11-15T04:40:09.901Z`에서 11월 `MONTH_SOURCE_INVALID_ADAPTER_ER1_FORECAST_SAVED_METRIC_INVALID`를 반환. 기존 archive/day JSON 경로는 PASS이므로 재조사 금지. 신규 계산/출력 없음, 로컬 이전 output `1794546027801`, bodySHA `0675aada...` 그대로 보호, 그 시각 D1 per-key `VERIFIED/MATCHED`. 12월 `SAVED_MONTH_INCOMPLETE`는 미래 월 미수집과 별도.
2. **입력 정형화 기능 패치:** [zgmini PR #1090](https://github.com/ansqhd5774-Choi/zgmini/pull/1090) 3파일(`lib/market-calendar-er1-forecast-saved-adapter.mjs` + 2 tests) `main@84b889687a1d23f81a182a6d5b62100027386a9f` merge. 제한된 decimal string → 유한 numeric, 명시적 결측 문자 → `null`(never zero), 불확실/악성 문자열·음수 매출은 기존 fail-closed. 새 오류는 안전한 `ER1_FORECAST_SAVED_METRIC_<FIELD>_<TYPE>` enum만 전달, 값·기업명·벤더 텍스트 비공개. 점수 산식·PIT/30일 가드·보존·게시 로직 불변. 최초 CI 실패는 신규 test assertion가 `Error:` 접두어를 regexp와 혼동한 것 1건, 정확 수정 후 [CI #43678572950](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43678572950) Build·Type·Regression·Recovery·CF 계약 전부 SUCCESS. 새로운 입력의 값 종류는 PC 민감 원문 미열람으로 현재 미확정.
3. **안전한 설치 원본:** [#1415](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1415) / Windows Run `43678509987` fixed onefile A `WRITER_APPROVED_PREIMAGE_READONLY/PASS`, 소스 Head/config/checkpoint `4f9b36015a0631960cab40a4346eea6958e46342`, tracking clean, 실제 adapter before sha256 `0b3994c3072b3d9a00ae8ad076ae4b08d2f7ed8270dcff7be292d9017aa2886e` (=Git main 원본 정확 일치). 승인 목표 sha256 `2e7e95cbfd03fbeeb99f2046e465dbd59c7adbc762e11308352375015ba02e73`. 기존 정상 ER1 auto-output `aa75821a...` 및 FOMC parser/collector 2개 SHA 보호.
4. **실PC 실제 적용 성공:** 제어 B manifest [PR #1416](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1416) `APPROVED_B`, manifest sha256 `7a7dc525a5577257a478f00a0237c788850794f265711426e161e7ce09b8b99a`. [B #1417](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1417#issuecomment-6889466826) / Run `43678815888`: **`WRITER_B_INSTALLED_VERIFIED / WRITER_B_INSTALL_VERIFIED`, RESULT_CREATED/READBACK 2/2, LOCAL_ONLY true, NO_REEXECUTE**. 이 결과는 소스 설치에 한정; 신규 11월 ER1 계산/게시 성공을 자동 주장하지 않는다.
5. **실제 공개 이전본 상태:** 2026-11-15 13:5x KST `/api/earnings-calendar-display?start=2026-11-16&end=2026-11-22` 공개 HTML에서 ER1 점수 title의 `asOf=2026-11-13` 확인. 정확한 신규 계산의 실행 이후 한 번만 새로운 asOf와 비교한다.
6. **다음 정확한 미완료 한 건:** 설치 **이후** 발생한 자연 Core Writer checkpoint에서 `2026-11`의 `READY_OUTPUT/UNCHANGED` 또는 정확한 잔여 `METRIC_<FIELD>_<TYPE>`을 기존 A `writer-publication-evidence-readonly`로 회수. `READY_OUTPUT`라면 새 storedAt/SHA→D1 per-key MATCHED→public ER1 asOf/개별 별점까지 연결, 이때도 W02 전체 100% 자동 주장 금지. `METRIC_...` 잔류 시 실제 field/type만 대상으로 다음 최소 수정; 무단 DB/D1/원자료 변경, Core 강제 재실행, 새 예약 검증 생성 금지.
7. **진척률:** W02 100% 오판 철회, 95% 임시 기준 유지·증거 기반 재산정 필요. ZGMINI 전체 57.4% 임의 갱신 금지. 마지막 전체 사용자 홈페이지 육안 검증은 모든 기능 완료 후만 요청.



<!-- w02-er1-nov-complete-pc-d1-api-20261115 -->
## 2026-11-15 — ER1 11월 신규 자동 계산→SQLite→D1→공개 API 전 구간 실증 완료

**사용자 W02 완료 오판 재발 방지:** 2027 FOMC 단일 오류 복구와 W02 전체 완료를 동일시하지 않는다. 이번 기록은 새로운 ER1 기능 장애 해결 1건의 전체 종단 증거로, W02의 무한 확장 공급원·권리 범위를 무조건 100%로 선언하는 근거는 아니다.

### 실제 새 기능 종단 PASS
- `zgmini` PR #1090(사용권·점수 산식·PIT·raw 기존 저장 불변) `main@84b889687a1d23f81a182a6d5b62100027386a9f`, 전체 [Node CI #43678572950](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43678572950) SUCCESS.
- Control 정확 한 파일 승인 manifest PR #1416 main, Writer B [#1417](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1417#issuecomment-6889466826) / Run `43678815888` `WRITER_B_INSTALLED_VERIFIED`, JSON/TXT result 2/2, 보호 FOMC/ER1 계산기 변동 없음, 재실행 금지.
- 기존 allowlist A [#1419](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1419#issuecomment-6889531205)/Run `43679540741` 정상 Core Writer `at=2026-11-15T05:00:30.238Z`(KST 14:00:30), source `e94e7f677147dbd11e3d8bb17012ade91c41a02d`, mode `PUBLISH`, Writer `VERIFIED`.
- `er1Future.status=UPDATED`, `months[2026-11]={status:READY_OUTPUT,sqliteDays:28,privateDays:2,scoreableIssuers:352}`. 기존 11월 `MONTH_SOURCE_INVALID_ADAPTER_ER1_FORECAST_SAVED_METRIC_INVALID`은 해소. `months[2026-12]=SAVED_MONTH_INCOMPLETE`는 현 시각 미래 31일 전체 저장이 아직 이뤄지지 않은 일정 범위로 **현재 실제 11월 정상 처리의 실패가 아님**; 미공개 미래 날짜를 임의 보강하지 않는다.
- 신규 저장 key `market-calendar:earnings-er1-score-2026-11-public`: `storedAt=1794718830678`(2026-11-15T05:00:30.678Z), `bodySha256=11acd6d8eede7f659fc0d898ceb0a2cdd892520385e03e3092dd21d6dbe6bfa6`. **D1 per-key `VERIFIED`, `matchedToLocal=true`, D1 `storedAt`/본문 SHA 정확 일치, `localOutputVerified=true`, `globalLedgerVerified=true`, 보호 상태 unchanged.** 원문 EPS/매출 또는 벤더 row가 D1에 노출된다는 뜻 아님.
- 실제 공개 사이트 `https://zgmini.kr/api/earnings-calendar-display?start=2026-11-16&end=2026-11-22` HTTP200 HTML: ER1 점수 `asOf=2026-11-13`에서 **`asOf=2026-11-15`**로 진전, `기업 실적 점수` aria-label **378개 표시**. 378은 7일 표시 행 수이며 352 scoreable issuers와 동일한 모집단이 아니므로 일치해야 한다고 주장하지 않는다. 기존 기업명·종목·별점 필터의 과거 PC·모바일 확인 결과 재사용, 사용자에게 중간 육안 검증 요구 금지.
- 앞선 A #1418의 `writer.at=2026-11-15T04:55:17.914Z` + 새 로컬 output `05:00:30.678Z`의 시차는 `scripts/pc-writer/run-local.mjs`가 ER1 output을 먼저 저장하고 D1 publish를 수행한 뒤 `finally`에서 writer-last-run을 저장한다는 순서로 설명됨. 구형 report를 새 출판 실패로 오인 금지.

### W02 완료 판단에 남겨야 하는 정확한 구분
- 완료된 장애: 2027 FOMC 정정·footless 파서 운영, Treasury 365일 PC eligible436=같은 기간 공개 auction436와 중복0, 283 경제 모델 등록·2027 입력별 발표 링크, 11월 ER1 실제 자동 계산/SQLite/D1/공개 표시.
- 확정하지 않은 주장: D1과 Treasury **비공개 raw gz**의 바이트 SHA가 같다는 주장(서로 다른 표현 계약), 2027 미발표 연간 일정까지 완전 수집됐다는 주장, 라이선스 미확인 한국 일정의 무단 연결, 전체 ZGMINI의 사용자 육안 최종 합격.
- W02 전체 95% 이전 추정은 분모·권리 범위로 재평가할 필요가 있으므로 본 11월 오류 복구만으로 100% 종결하지 않는다. 사용자 확정 지시대로 **예약 검증을 새 미완료 업무로 만들지 않는다**. 전체 프로그램 기능 구현·적용을 먼저 끝내고 그 뒤에만 사용자가 홈페이지에서 최종 육안 확인한다.


<!-- w02-technical-content-close-13sources-er1-20261115 -->
## 2026-11-15 — W02 현행 승인 공개 기능 기술 종단 판정 (사용자 최종 육안 검증 요청 금지)

**판정 범위:** 공식 출처의 **이미 공개된/승인된** 일정·기업 실적·시장 이벤트 수집→PC SQLite→계산→D1→공개 API·UI 기능. 향후 공식 기관이 아직 발표하지 않은 일정·권리 미확인 소스·모든 ZGMINI 프로젝트 완료 후 사용자가 수행할 홈페이지 육안 최종 검증은 기능 구현 미완료/예약 검증 후속 작업으로 만들지 않는다.

| 콘텐츠와 단계 | 실제 완료 근거 |
| --- | --- |
| 경제·중앙은행·금융 공식 일정 수집/공개 | 2026-11-15 공개 `/api/release-calendar` HTTP200 `status=READY`, `sources` 공식 13/13 `READY`, `events=2380`, 관측 `updatedAt=2026-11-15T03:45:06.198Z`. BLS·BEA·Fed/FOMC·Census·EIA·USDA·CFTC·Treasury·TIC·NY Fed 포함 |
| 2027 FOMC 오류 수정 | PR #1082 및 정규 Writer B #1405, 실Fed 2027 일정 8건, Nov17 포함/구 Dec08 제거, 10월 정책전략회의 '금리 결정 없음' 실제 Production JS |
| 283개 경제 모델 발표 일정 연결 | PR #1032/#1033/#1087 Production: 모델 283, 공식일정 대상 186/186, 2027 입력별 1건 이상 186/186, 비일정 입력97; 이 수치는 **원자료 지표 283개 완전 적재·연중 발표 횟수 충족 수치 아님** |
| Treasury TA_WS 운영 원문→공개 | #1401 Windows PC raw447/eligible436, 365일 2025-11-15~2026-11-14. 동일 기간 `/api/release-calendar`의 Treasury auction436/announcement436, 총872, `id+date` 중복0. D1 게시 본문과 PC 원문 gzip의 **동일 SHA 주장 금지**(서로 다른 표현) |
| 기업 실적 ER1 월별 실제 데이터→계산/저장/게시 | 새 파서 원인 수정 PR #1090, CI #43678572950 PASS, 1파일 Writer B #1417 `INSTALLED_VERIFIED`, 운영 Writer #1419 `VERIFIED`, 2026-11 `UPDATED/READY_OUTPUT`, SQLite28일+보관 승인2일=30일, **352 scoreable issuers**, 로컬 body SHA `11acd6d8eede7f659fc0d898ceb0a2cdd892520385e03e3092dd21d6dbe6bfa6` = D1 per-key 정확 SHA/저장시각, MATCHED |
| 공개 실적 화면 | `/api/earnings-calendar-display?start=2026-11-16&end=2026-11-22` HTTP200, 신규 ER1 `asOf=2026-11-15`, 전체 378행 중 **실제 점수 295행, 결측 '-' 83행** (378을 모두 점수 표시라고 했던 초기 집계는 **정정 완료**) |

**시점·외부 조건의 올바른 분류:**
- 2026-12 ER1 `SAVED_MONTH_INCOMPLETE`는 2026-11-15 현재 12월 31일 모두가 미래인 시점의 **미수집 상태**로, 11월 신규 ER1 오류 재발이 아니다. 기존 D+30/월 전체 가드에 맞춰 이후 공식 저장 자료만 활용하며 임의 예측·가짜 0 생성 금지.
- CFTC 공식 2027 COT 발표일 표는 2026-11-15 현재 **공식 미발표**(공식 Release Schedule 페이지 'through 2026'). 2026-10-27 공식 공지에 2026년 말까지 반주간 발표 전환 계획이 있음. 현행 `lib/cftc-calendar.mjs`는 공표된 월별 날짜 셀 전체를 파싱하며 **52회 고정 상한은 없음**. 2027 예정일이나 수·금 날짜를 임의 생성하지 않고 공식 페이지 갱신 시 기존 정규 Core가 반영하도록 유지. 향후 공식 표 구조가 실제 변경되어 실패하면 그 시점의 최초 원본만 정확 수정한다. 이것을 새 미완료 예약 검증/사전 필수 Gate로 추가하지 않는다.
- 라이선스 미확인 한국 경제·실적 일정은 임의 공개 재배포하지 않는 **승인된 제외**로 유지. 누락을 가짜 일정으로 보강하지 않는다.
- 과거 원담당 [Draft #1063](https://github.com/ansqhd5774-Choi/zgmini/pull/1063)은 #1082 실제 main 통합으로 중복되어 두 번째 병합 금지, [오류 방지 메모](https://github.com/ansqhd5774-Choi/zgmini/pull/1063#issuecomment-6889585252) 기록. 원담당 작업물은 보존.

**W02 현행 승인 기능 기술 종단 판정:** `100%` — 이 수치는 현시점 승인된 경제/실적/금융 이벤트의 기능 구현·운영 적용·공개 게시 계약 기준이며, 미공개 미래 공식 자료나 사용자 최종 홈페이지 육안 수락을 대신하지 않는다. 2026-11-15 이전 FOMC 단일 수정만으로 100%라고 한 보고는 철회됐고, **이번 100%는 ER1 신규 월별 실제 계산·D1 SHA 대조 및 Treasury 감사까지 완료한 뒤 새로 판정**한 것이다. 예약 검증을 미완료 항목으로 만들지 않으며 사용자에게 지금 육안 확인을 요청하지 않는다.


<!-- w02-r79-er1-ready-treasury-latest-scope-20261115 -->
## 79차 — ER1 11월 신규 계산·D1 게시 완료 / W02 잔여 범위 고정 (2026-11-15 KST)

**기존 완료 성과 재사용, 반복 A/B 설치 0.** 본 항목은 이후 일반챗이 이미 해결된 ER1 입력 오류를 다시 조사하지 않게 하는 확정 완료점이다. W02 전체 완료·예약 검증 또는 프로젝트 전역 100% 선언은 아니다.

1. **ER1 오류 최종 해소:** 기존 #1413(최초 `MONTH_SOURCE_INVALID_ADAPTER_ER1_FORECAST_SAVED_METRIC_INVALID`) → `zgmini` PR #1090/main `84b889687a1d23f81a182a6d5b62100027386a9f` → Writer B #1417(1파일 `WRITER_B_INSTALLED_VERIFIED`) → **정규 Core 2026-11-15T05:00:30.238Z 이후** 운영 PC A [#1419](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1419#issuecomment-6889531205) (Run 43679540741). `er1Future.status=UPDATED`, **2026-11=`READY_OUTPUT`**, `sqliteDays=28`, `privateDays=2`, `scoreableIssuers=352`. Writer=PUBLISH/VERIFIED, ledger=READY/VERIFIED, 동일 source. 결함 재현·진단기·B 설치 재실행 금지.
2. **새 output과 D1 동일:** `market-calendar:earnings-er1-score-2026-11-public` 새 `storedAt=1794718830678`, `bodySha256=11acd6d8eede7f659fc0d898ceb0a2cdd892520385e03e3092dd21d6dbe6bfa6`; 동일 #1419 A의 `d1.perKeyReadback=VERIFIED`, `matchedToLocal=true`, `d1StoredAt`·`d1BodySha256` 완전 일치. 이전 `0675aada...`와 별개로 신규 계산 성공. #1418은 작성 완료 전 비동기 이전 checkpoint이므로 신규 실패로 취급 금지. 공개 11월 별점 `asOf=2026-11-15`, 378개 aria-label 근거는 [중앙 #68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6889521369)에서 재사용; 정확 D1 SHA는 #1419에서 확인. **2026-12=`SAVED_MONTH_INCOMPLETE`는 별도 미래 보관일 부족 상태**로, 11월 복구 실패나 임의 값 채우기 근거가 아님.
3. **Treasury 365일 완료/미완료 분리:** [PC A #1401](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1401#issuecomment-6885175399)의 **core.treasuryTawsInput=OBSERVED**, `2025-11-15..2026-11-14` 365일, 원문 447/낙찰 적격 436, `eligibleCountMatchesStored=true`, `textSha256=c70216a051dd9a24a6b9189193535da23fc136f22e1e0219455d896545bf74de`은 유효하다. 같은 job 전체 `STATE_UNKNOWN`은 **별도 history DB WAL sidecar 부재**에서 발생한 것이며 core Treasury 감사의 실패가 아니다. 기존 [#835 계수 대조](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/835#issuecomment-6889231892)에서 공개 해당 365일 auction 436+announcement 436, 중복 0. **총건수 동등은 개별 키/원문→D1 lineage 증거가 아니다.** [사전 코드 Draft #1091](https://github.com/ansqhd5774-Choi/zgmini/pull/1091)는 원문·D1 원문이 승인 환경에서 제공되어야 실행 가능하며 현재 실제 PC 수행/정규 CI 근거 없음. 이 임의 추가 코드 작성만으로 운영 완료 판정하지 않는다.
4. **CFTC 2027 결측은 정상 보호:** CFTC 공식 [Release Schedule](https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm)는 2026년까지만 공표. 현행 `lib/cftc-calendar.mjs`는 공표된 연도 `<h3>YYYY Release Schedule</h3>`/12개월 표만 파싱하고 2027년 금요일·휴일 지연을 추정 생성하지 않는다. **2027 공식 일정 0건을 단독 소스 실패로 오인하거나 가상 날짜를 보완해 게시하지 말 것.** 2027 공식 표가 발표될 때에만 그 실제 자료를 기존 연결 계약에서 처리.
5. **다음 실제 W02 과제:** Treasury 원문 447/436과 게시 436/436의 날짜·개별 이벤트 키가 **승인된 동일 시점 실제 원문/D1 자료**에서 연계되는지 확인하고, 불일치가 실증되면 그 첫 원인만 수정. 이미 입증된 11월 ER1·FOMC를 다시 조사하지 않는다. 신규 읽기 전용 PC 요청·공유 Controller 설치·raw 출력은 독립 승인/기존 A 계약 검토 없이 생성하지 않는다. 2027 공식 CFTC 비공표를 장애로 만들어 강제 수집하지 않는다.

**진행률 기록:** ER1 11월 복구 단계 100%, W02 통합 전체 95% 잠정(전체 산정 재검토 전), ZGMINI 통합 기존 57.4% 유지. W02 전역 완료/사용자 홈페이지 최종 육안 합격은 남은 실제 기능 종료 후만 결정. 미완료 예약 검증 항목/새 예약 생성 금지.


<!-- w02-r80-treasury-a-scope-acceptance-20261115 -->
## 80차 — Treasury 감사 승인 기준 재판정: 강화 검사 ≠ 필수 게이트

**원래 승인된 Treasury R6.1의 여섯 번째 5점 작업**은 `source-inventory-runtime-readonly` A를 이용해 기존 비공개 `market_input_batches_v1`의 실제 365일 TA_WS 저장 원문의 `core.sqliteOpened`, `core.treasuryTawsInput.status=OBSERVED`, 365일 범위, `rawRowCount`, `storedAwardedCount`, `eligibleAwardedRows`, `eligibleCountMatchesStored`, `textSha256`, 원격 결과 JSON/TXT를 확인하는 것이다. 전체 데이터 본문을 노출하거나 개별 CUSIP+date 해시를 새로 출력하는 것을 요구하지 않았다.

- **이 승인된 원자료 감사 항목은 충족:** PC [#1401](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1401#issuecomment-6885175399) / Run 43648101352, 운영 Control 8e2736a, `core.status=PASS`, `core.sqliteOpened=true`, `treasuryTawsInput.status=OBSERVED`, 2025-11-15~2026-11-14(양끝 포함 365일), raw 447 / awarded 436 / eligible 436, count match, text SHA256 c70216a051dd9a24a6b9189193535da23fc136f22e1e0219455d896545bf74de, JSON+TXT 2/2. 동일 작업 전체 `STATE_UNKNOWN`은 **독립 history DB의 `WAL_SIDECARS_ABSENT_UNVERIFIED`**이며 `core`의 승인 범위 Treasury 감사 실패로 확대하지 않는다.
- **공개 정량 확인:** [#835 6889231892](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/835#issuecomment-6889231892)에서 같은 기간 Treasury auction 436/announcement 436 및 `id+date` 중복 0, 전체 `READY`. 이 자료와 A의 관측·게시 시각이 완전히 같은 게시 버전이라는 독립 계보 증거는 아니므로 그 이상의 주장은 금지한다.
- **추가 Draft #1091 판정:** [정식 비필수 인계](https://github.com/ansqhd5774-Choi/zgmini/pull/1091#issuecomment-6890528058). `parseTreasuryDirectAuctionRows`에서 만든 단독 365일 이벤트가 실제 공개의 주간+365일 병합된 이벤트와 내용·건수까지 반드시 같아야 한다는 신규 검사는 기존 수용 조건이 아니며, 주간 원본 우선 규칙에서 정상 자료를 오류로 판정할 여지가 있다. 코드 Draft/NO MERGE·선택적 심화 감사로 유지. 실제 계보 불일치가 발견되지 않았는데 새로운 원본/CUSIP 추출 PC 작업·강제 재수집·D1 독립 SELECT를 필수로 생성하지 않는다.
- **완료 표현:** Treasury 365일 단독 **승인 원자료 메타 감사 항목: PASS**, 기존 정규 수집·D1·UI 실측의 개별 시점 성공 증거 유효. 전체 W02 프로젝트의 가변 콘텐츠 권리·다른 발표 공급원·UI 전체 인수까지 자동 100%로 확장하지 않는다. W02 기존 95%는 정밀 재산정 전 **잠정 표시**로만 유지하되, 해당 5점을 같은 내용의 추가 검사 때문에 무기한 미완료로 보류하지 않는다.
- **다음 W02 유효 작업:** 2026-10-27 승인된 최종 콘텐츠 범위(경제 발표·기업 실적·주요 시장 이벤트) 중 운영에 연결되지 않은 **권리가 확인된 구체적 공급원/실제 기능 결함**을 하나씩 구현. `2026-12 ER1 SAVED_MONTH_INCOMPLETE`(미래 자료)와 `2027 CFTC 공식 연도표 미발표`를 오류로 간주하거나 가상값 게시 금지. `2027 Census READY_WITH_FALLBACK`는 공식 annual 시도 실패 후 공식 list fallback으로 성공한 기록이므로 다른 증거 없이 시스템 실패·새 파서 결함으로 판정하지 않는다. 새로운 기능 결함이 확인되지 않는 한 중복 A/PR/문서 대기열 생성 금지.

**이번 변경은 승인 기준 해석·원담당 계획 한 항목만 갱신.** 운영 PC·SQLite·D1·배포·공급자 GET·예약·W02 원장 외 담당 브랜치 무변경.

<!-- w02-r81-nass-official-source-staged-20261115 -->
## 81차 — 신규 콘텐츠 코드 구현: USDA-NASS 농업 발표 일정

**종전 EIA STEO는 이미 PC 수집기에 연결돼 있으므로 중복 신규 작업을 배제.** 기존 USDA WASDE와 다른 공식 NASS 작물 생산·작황 진행·파종 의향 발표를 선택했다.

- 공식 원문: https://www.nass.usda.gov/Publications/Reports_by_Release_Day/index.php . 명시된 연도 및 time datetime 속성에서만 날짜 파싱, 추정 날짜 0.
- 재사용 안내: https://www.nass.usda.gov/Data_and_Statistics/Citation_Request/index.php . NASS 공공영역 정보 자유 다운로드·복제 허용, USDA-NASS 출처 표시 권고. 제3자 콘텐츠 임의 재배포 없음.
- 실제 2026 NASS 원문 HTML 149,192 bytes: Crop Production 12, Crop Progress 35, Prospective Plantings 1 = **48개**, id/date 중복 0. 2026-11-15 이후 실제 인쇄 일정: 작황 11/16·11/23·11/30, 작물생산 12/10. 2027 일정 가상 생성 금지.
- 코드: lib/market-calendar-usda-nass.mjs (Blob 810fb397a38add0a290a2a2603577546a54fa887): 공식 발표 파서·기존 비공개 input 저장/정확 재판독용 adapter. tests/market-calendar-usda-nass.test.mjs (Blob 3c7f3335a913a3ef8620253e778351fbb768df1c): 8개 Node 회귀 테스트 정의. app/market-calendar/market-calendar-client.tsx (Blob 158f131720b637fa5991d27fbadc1f86c4b859b0): 공급원 일치 검증 후 USDA NASS 3 ID 허용/원자재 분류/출처 표시. 전체 전용 브랜치 최신 작업 commit 8bed3178d2581ce8dbb3c209e1f014f24c8ebaba.
- 실제 공식 HTML로 파서 실행 48/48 events PASS, isolated V8 fixture 수집기/보존/경계 체크 6/6 PASS 및 날짜/중복/필수 보고서 3/3 PASS. **정규 Node CI 8개 미실행**, PC 설치·Core 수집·D1 게시·Production UI 미실행. 가짜 CI·실설치 합격 판정 금지.
- **최신 main 보호:** 전용 브랜치 구형 collector는 약 36줄, 현재 main collector는 약 556줄. 구 버전 collector 또는 UI를 main·운영 PC에 덮어쓰면 최신 FOMC/EIA/TIC/Treasury/ER1 훼손 위험. 따라서 구형 collector 수정 0. 정식 결합에는 현재 main 원본 기준으로 신규 source spec/adapter에 대한 최소 수집 루프 branch+failure preserves, 현재 main UI의 source ID whitelist 반영, Node CI, 승인 Writer B 설치가 남았다. 전용 브랜치 전체 merge/rebase 및 무승인 main/운영 설치 금지.
- 진행률 W02 **95% 잠정 유지**, ZGMINI **57.4%** 유지. 다음 실작업은 현행 main 기반 최소 선택적 결합 및 CI이며 사용자 홈페이지 검증 요청은 전체 개발 완료 뒤에만. PC/DB/D1/Cloudflare/예약 변경 없음.

<!-- w02-r84-nass-regular-ci-reuse-20261115 -->
## R84 — USDA-NASS 정규 CI 성공 원담당 인수, 중복 소스 작업 종료

원담당 단독 Git 객체 commit `8f7789aefe67b1f0d63ff7220f3eca7db98c15b8` (main `84b889687a1d23f81a182a6d5b62100027386a9f`의 1-커밋 자식, 5개 기능 파일)과 독립 사전지원 Draft PR #1093 최종 HEAD `4ef960ac7b24e4f7c16d009086b8c1f2a5c24714`의 **동일 5개 변경 파일을 실제 GitHub blob SHA 5/5 동일** 확인. Parser `810fb397...`, parser test `3c7f3335...`, source registry `b0f31725...`, 556줄 기존 Core collector 최소 결합 `9fcc26de...`, 최신 market-calendar UI `2f5c71eb...`. **한 개의 통합 기능만 존재**하며 원담당 detached Git commit과 support PR을 중복 반영하면 안 된다.

독립 지원은 해당 동일 5개 파일과 합성 실연결 2개 테스트 파일을 합해 **Draft PR #1093 (7파일)**에 올려 [GitHub Node CI #43691902671](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43691902671) **completed/success** 달성. Build/Type PASS, 4198 tests (4188 PASS, 0 FAIL, 7 SKIP, 3 TODO), NASS 8+신규 Core 연동 3 PASS, PC publication recovery 11 PASS, Cloudflare read contract 69 PASS. W02 R82/R83에 기록한 '정규 CI 미실행'은 **이후 확보된 실제 최종 PR #1093 증거로 해소됨**. 테스트 재실행·재구현·새 임시 PR/브랜치 불필요.

**남은 실운영 단계 / 현재 차단 지점:** PR #1093는 `[NO MERGE]` 제목의 **Draft**이며 main HEAD는 여전히 `84b88968...`. Source `main` 미병합, 승인 운영 Windows 3파일 (`lib/market-calendar-usda-nass.mjs`, `lib/release-calendar.mjs`, `scripts/pc-writer/release-calendar.mjs`) 설치 전, 정규 Core/SQLite raw·output/NASS 48건·D1/API/UI 실제 신규 반영 미관측. PR Draft가 자동으로 운영 설치 권한을 부여하지는 않는다. **승인된 중앙 통합 Owner만** #1093의 동일 5파일과 필요 회귀 2파일을 단일 경로로 선택 반영하며, 현재 PC 실제 preimage 수집·보호 원장·B source install manifest의 기존 승인 경로에 따라 운영 3파일을 적용한다. 공유 설치 새 잠금 해제·임의 CMD/Provider GET/SQL/D1/Cloudflare 배포 및 예약 변경 금지. 새 권리/lineage Gate를 더하지 않는다.

**진행률:** W02 기존 95% 잠정, 전체 ZGMINI 이전 무가중 57.4% 유지. 공식 NASS 페이지 48개 파서 및 전체 CI는 완료, 실운영 미완료이므로 전체 완료(100%) 주장하지 않는다. 사용자의 홈페이지 최종 육안 검증 요청은 모든 기능 실제 마무리 후만.
