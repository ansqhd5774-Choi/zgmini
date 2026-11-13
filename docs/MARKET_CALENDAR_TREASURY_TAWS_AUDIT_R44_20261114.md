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
