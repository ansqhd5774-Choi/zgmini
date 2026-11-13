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
