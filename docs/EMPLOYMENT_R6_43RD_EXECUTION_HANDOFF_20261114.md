<!-- employment-r6-55th-actual-owner-source-v8-proof-20261114 -->
## 55차 — 현재 원격 소스/승인 범위·실 PC readback 부재 구분 및 실제 Reader 함수 검증 (2026-11-14 KST)

**전체 기능:** 87.5%(7/8) → 87.5%(7/8), 기존 D1 28/29 READY / `STATE_CLAIMS_BREADTH=PARTIAL_HISTORY`, 실제 누락 주·지역 UNKNOWN. **55차 원문:** https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6864363828 . 53차 완료 항목·기존 #1062/#1064·#1361 Draft 원장 재사용; 기존 pc-job/Runner 재발행 없음.

### 실제 수행 및 증거
1. [제어 main `69e25a08`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/commit/69e25a08a903dc8e52ef1093ec15837de4c20858)의 `config/operations.json` blob `c906683afd...`에 신규 `employment-r6-collection-evidence-readonly` **A급 60초/light 등록** 원격 확인. 이는 **개발 정본 등록이지 운영 Controller 설치 A 허용목록 검증이 아님**.
2. 역사적 B #1040 `WRITER_B_INSTALLED_VERIFIED` / 1파일 `employment-r6-provider.mjs`, candidate `e0488984...`, after SHA256 `a3474258...`, 실제 Run `42603899010` 성공. #1063 `employment-r6-collector.mjs` candidate `b1541453...`, after SHA256 `f22b2f14...`는 Run `42617811190` `WRITER_B_RECOVERY_REQUIRED`, installationVerified=false. #1087 복구는 Core 복구이지 collector B 설치 증거 아님. 둘 다 **현장 현재 바이트 SHA 검증 안 됨**.
3. 독립 #1195 [B 5파일 성공](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1195#issuecomment-6754390582) `release/employment-r6-cps-r2-20261110` candidate `b37c7c02...` 확인; exact scope는 `formula.mjs`, `feature-engine.mjs`, `one-year-read-model.mjs`, `one-year-stage.mjs`, `public-display.mjs` 5개이고 **provider/collector 0개**, 따라서 #1195 성공도 Collector 현재 설치 성공으로 소급 불가.
4. 기존 PC 진단 [#1351 Run 43429486924](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43429486924) 현재 `queued/conclusion=null`. 실제 Windows 실행·결과 JSON/TXT **0**, 고유 requestId `pc-8ff3a2e8-1bc9-4470-81ad-7789fc0b2b13`. 격리 CI PC는 운영 PC 허용목록 증거 아님.
5. R6 전용 [Draft #1361](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1361) blob `9ead740f2935b5f6f511c2006e7533c525128ca3`에서 `coverage`/실제 `fullTenYearRawCoverage` 함수 원문을 추출하여 V8에서 **실제 함수 코드 실행**: 합성 주간 row count로 6/6 PASS: 577 완전주, 576주에서 중간 주 2016-03-05 결손, 577 관측/중간 주 결손, 2026-10-31 50/51 주, prior-4w zero, 530주 부족/required 577주·29427행. **직접 함수 단위 증거**이며 Node sqlite 전체 모듈 통합 테스트·지역코드 DB 조회·실운영 실행 PASS는 아님. 기존 [C996 CI #43502771075](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43502771075) 는 다른 소스 27/27 PASS만 수행하므로 Reader 직접 CI `NOT_VERIFIED` 유지.
6. GitHub 각 exact manifest 원격 확인으로 현재 55차에 기존 성공 설치 기록을 부풀리지 않고 정규 중앙 Owner 실측에 필요한 출처/바이트 해시/경로를 특정함. source/deployment/운영 변경 **0**.

### 단일 중앙 Owner 현장 readback 계약 및 현재 차단
중앙 단일 소유자가 **기존 승인된 운영 PC 직접 읽기 경로**로 관측시각(KST/UTC), 운영 host/Runner 6좌석 online-busy, #1351 배정/시도와 미실행 이유, Watchdog STATUS·Guardian STOP·PAUSE/DRAIN·Supervisor PID/heartbeat·lease owner, Controller 설치 SHA 및 허용 A 목록 (`employment-r6-collection-evidence-readonly` 실제 존재/부재), Writer sourceRoot 및 HEAD/config.source SHA, `employment-r6-provider.mjs`/`employment-r6-collector.mjs` 실제 파일 SHA256를 **비민감 고정 필드·기존 고유 원장으로** 반환. 상태가 불명이면 UNKNOWN으로 기록. 별도 무승인 설치/B 덮어쓰기/#1351 재실행·수동 CMD/SQL/D1/DNS/Controller 복구 금지.

**LAST PASS:** 원격 control A 등록·B 1/1 실패 분리·#1195 5파일 실제 범위·Draft reader 함수 6/6 PASS 및 source CI 범위/원장 보존. **FIRST FAIL:** 운영 #1351 queued/PC Windows 0; 현재 Provider+Collector exact SHA 및 installed A 현장 검사 부재. 577주×51지역 첫 결손·29/29 미완료. **다음 한 필수 행동:** 중앙 단일 Owner의 위 **기존 정규 운영 PC 읽기 원장 1회** 회수(공유 쓰기 없이); 그 결과로 승인된 A에서 실제 첫 결손 주/지역 조회, 필요 시 승인된 B 최소 원자료 보완→로컬 계산/게시/화면 검증.

**변경 건수:** GitHub 전용 원담당 인계 문서 1건, 공유 Controller/Writer/PC/DB/D1/API/UI/Cloudflare 0, Runner 재실행 0, RDC 0.

---

<!-- employment-r6-followup-reader-first-gap-20261114 -->
## 53차 후속 독립 소스 — 기존 A Reader 최초 결손 주·지역 정밀화 (2026-11-14 KST)

**기능:** 87.5%(7/8) → 87.5%(7/8); D1 기존 28/29 READY, 마지막 1개 PARTIAL_HISTORY 유지. 원본 53차 승인·운영 설치 확인은 직전 섹션과 [#68 결과 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6864040245)로 완료되어 중복 재검사/재요청 없음.

**발견된 실질적 결함:** 신규 A `employment-r6-collection-evidence-readonly`의 `fullTenYearRawCoverage`가 (1) 저장 576주 등 부족분 중 특정 완전 주 부재의 첫 실제 결손 날짜 대신 null을 내거나, (2) 577주 개수는 맞지만 한 날짜가 통째로 빠진 경우 해당 누락일 대신 다른 저장 주를 가리킬 수 있음. 지역 50/51인 주의 실제 빠진 고정 주 코드는 반환하지 않아 53차의 첫 결손 주·지역 실측 목적과 불일치. **운영 DB에서 발생했는지는 UNKNOWN.**

**실제 허용 source-only 작업:** 공통 Controller 설치는 건드리지 않고 제어 main `69e25a08` 기준 독립 브랜치 `fix/employment-r6-evidence-first-gap-20261114`에 정확한 2파일 선택적 수정 및 [Draft PR #1361](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1361), [커밋 6286a7de](https://github.com/ansqhd5774-Choi/zgmini-pc-control/commit/6286a7deeed0f17e25cb4148835a4539f3523db7) 원격 저장. `controller/employment-r6-collection-evidence-readonly.mjs`은 승인된 주간/선행 4주 산식·A read-only scope 유지하면서 필수 달력 주를 map으로 정확히 일치시켜 최초 실제 없는 날짜를 반환, 첫 `REGION_51_COVERAGE_GAP`에서 해당 주의 고정 51개 공공 지역 코드만 1회 SELECT DISTINCT하여 누락 코드 배열을 반환. 원자료·비밀·값 반환 없음, DB 쓰기·공급자 호출·D1·설치 변경 0. `tests/employment-r6-collection-evidence-readonly.test.mjs` 기존 2개 assertion 강화 + synthetic 2개 추가.

**검증의 정확한 범위:** Diff 2파일/1 commit, PR open/draft/main 미병합. [자동 CI Run #43502771075](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43502771075)는 SUCCESS지만 실제 **C996 무관 27/27 tests**만 수행해 본 Reader 회귀 2개나 전체 Reader 테스트 합격으로 환산 **금지**. 동등 로직을 Node22 메모리 SQLite에서 독립 시뮬레이션한 5시나리오 PASS는 실제 GitHub Reader 모듈/실PC 데이터 실증이 아님. 신규 소스 정밀 Reader 테스트의 실제 CI PASS는 **NOT_VERIFIED**.

**LAST PASS:** 정확한 PR #1361 2파일 remote source readback/독립 로직 시뮬 5/5 PASS; 직전 #1062/#1064 CI 성공은 별개 보존. **FIRST FAIL:** Reader 변경 자체의 대상 테스트 CI 없음, 운영 A 설치 확인 없음, [기존 #1351](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43429486924) Runner queued/PC JSON·TXT 0. 운영 DOL 실제 최초 결손 주·지역 UNKNOWN; source-only PR 성공 ≠ 29/29 게시.

**다음 한 단계(운영 경로 Owner):** 기존 승인된 운영 PC 직접 읽기로 #1351 Runner/Controller 설치 SHA·A 허용목록, provider·collector 설치 실바이트와 manifest 전후 SHA를 반환한다. 신규 Reader 패치를 포함한 Controller 설치는 본 Draft나 임의 테스트 PASS로 허가되지 않으며 중앙 단일 Owner의 정확한 범위·기존 보호/승인·Reader 대상 회귀 검증 후에만 가능. 해당 A 실제 등록/조회 뒤 최초 결손 주·지역과 577연속 완전주×51지역을 실측하고 기존 28개 유효 결과 보존하여 마지막 지표를 계산·게시한다.

**운영 PC/SQLite/공급자/D1/Cloudflare 변경 0, 기존 requestId 중복 실행 0, RDC 0.**

---

<!-- employment-r6-53rd-operational-approval-boundary-20261114 -->
## 53차 고용 R6 — B 승인 소스와 신규 A 실제 등록 분리 (2026-11-14 KST)

**기능 전체:** 87.5%(7/8) → 87.5%(7/8). **운영 공개 마지막 유효값:** 28/29 scored READY, `STATE_CLAIMS_BREADTH`는 `PARTIAL_HISTORY`/score null. 첫 실제 결손 주·지역 **UNKNOWN**. 공급자 호출·운영 SQLite/Controller/Writer/D1/Cloudflare 변경 **0**.

**원본 53차 지시:** [제어 #68 6863923778](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863923778). Control main `69e25a08`; 기능 main `643b7c7c`. 53차 범위는 설치 승인의 **정확한 과거 파일/해시·실제 설치**와 신규 A의 **개발 main 등록·운영 등록**을 구별하고 중앙 단일 Owner의 다음 read-only 반환 계약을 확정하는 것.

### 승인 B 600주 — 기존 승인 및 실물의 범위

1. **Provider BACKFILL 600주, 1파일:** [승인 manifest](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/approvals/writer-updates/employment-r6-2015-600-onefile-20261109.json) `APPROVED_B`, source branch `feat/bls-registered-v2-20261109`, candidate `e0488984`, 변경 `lib/market-score/employment-r6-provider.mjs` 단 1파일, after SHA-256 `a3474258efcbd12c8ac081d07a0d7ffb3055b5ddd8d35080248aecf60ba30381`. 기존 [Issue #1040/Run 42603899010](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1040#issuecomment-6738212099)는 `WRITER_B_INSTALLED_VERIFIED`/JSON·TXT readback 2/2, 당시 LOCAL_OVERLAY source SHA `f422cd570b679f21cebbd76db11310fa9087ee5f`. **당시 Provider 설치 성공**이며 현재 설치 파일·active source SHA의 증명은 아님.
2. **Collector 600주 window/ledger, 1파일:** [별도 승인 manifest](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/approvals/writer-updates/employment-r6-backfill-window-collector-20261109.json) `APPROVED_B`, candidate `b1541453`, 변경 `lib/market-score/employment-r6-collector.mjs` 단 1파일, after SHA-256 `f22b2f1447e462d3101caf027323572606db61352ab6a53524dd406cca7a4915`. [#1063/Run 42617811190](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1063#issuecomment-6740229895)의 최종 결과는 `WRITER_B_RECOVERY_REQUIRED` / `WRITER_B_CORE_REENABLE_SOURCE_PAIR_STOP`, `sourceSha=null`, `installationVerified=false`(결과 JSON). [#1087/Run 42634492692](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1087#issuecomment-6742480737)의 Core 활성화/lock 복구 PASS는 설치 성공의 대체가 아님. 현 Collector 실제 바이트/HEAD-config pair **UNKNOWN**.
3. 두 승인은 **그 당시 source 후보·파일·before/afterSHA와 1회 설치**에만 해당. [Draft #1062](https://github.com/ansqhd5774-Choi/zgmini/pull/1062)(ETA539 결측 2파일)·[Draft #1064](https://github.com/ansqhd5774-Choi/zgmini/pull/1064)(600w 3파일, HEAD `bce5a2a5`) 또는 현재 담당 브랜치 `65b2917` 전체를 신규 설치 승인한 것이 아님. 신규 source 재설치·재수집이 실제 필요한지는 **현재 PC exact SHA 확인 후** 최소 범위/신규 manifest를 Owner가 판단. 동일 요청 재실행 0.

### 신규 A — 개발 등록과 설치 확인 차이

- Control 최신 main `config/operations.json` 및 `controller/operations.mjs`에는 `employment-r6-collection-evidence-readonly`가 A/light, 60초로 등록되고 [Reader source](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/controller/employment-r6-collection-evidence-readonly.mjs)가 있음(정적 소스).
- **최근 실PC Controller 실측**은 `badad912…`/31개 allowlist로 위 A **미등록**. GitHub main 37개와 다름. 운영 PC 현재 설치 SHA·실제 53차 등록 상태는 직접 readback 없어 **UNKNOWN**(과거 미등록과 구분). 신규 Reader A 실PC 실행/JSON·TXT 0건.
- 기존 [#1351/Run #43429486924](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43429486924)는 **다른 operation** `core-runtime-source-readonly`의 소비된 원본, `queued`/Runner 미배정, Windows 결과 0. `employment-r6-collection-evidence-readonly`의 요청·성공으로 분류 금지. 중복 실행/재발행 금지.
- A는 고정 로컬 SQLite를 읽어 `DOL_ETA539:530w/600w` metadata, 원자료 완전주 수·첫 결손 주·지역 수·국가/주 run 요약과 `fullTenYearRawCoverage`를 **비민감 집계만** 반환하도록 작성. 단, **실제 첫 누락 지역명/주**는 반환된 진단 필드의 한계 내에서 판정하며 필요한 경우 추가 승인된 정밀 범위가 필수. 정적 Reader 존재만으로 577주×51지역=29,427지역-주 성공을 인정하지 않음.

### 독립 소스 보완 / 검증 범위

- 51차 기존 커밋 `151b1194`까지 보존. 추가 [담당 커밋 `65b2917`](https://github.com/ansqhd5774-Choi/zgmini/commit/65b29179774777b9654b32976bd48dd3303ba9bf)은 **오래된 전용 브랜치에 현 main에서 이미 검증된** DOL 오래된 관측일의 잘못된 SUCCESS 방지, provider 호출 후 SQLite write 실패시 요청 수 보존, 같은 synthetic 회귀 2건을 최소 3파일로 이식한 **SOURCE_ONLY** 작업. 병합/운영 적용 없음.
- [#1064 HEAD CI #43500043358](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43500043358) `completed/success`, 기존 8/8 회귀·전체 4186 tests/0 fail. [#1062 CI #43489515759](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43489515759) `completed/success`/기존 4/4. **새 전용 브랜치 추가 회귀 2건을 실행한 신규 CI는 확보하지 않았으므로 PASS로 주장하지 않음.** 소스 브랜치 전체 main 대비 diverged, 강제 merge/rebase/clean 없음.

### LAST PASS / FIRST FAIL / 단 하나의 다음 필수 실행

- **LAST PASS:** historical B Provider #1040 `WRITER_B_INSTALLED_VERIFIED` + 정확한 로컬 source SHA/2/2 JSON·TXT(당시 시점), 최신 2 Draft PR source CI 성공, 53차 브랜치 commit 원격 readback. 운영 점수의 마지막 검증 `28/29`는 기존 증거를 보존하는 상태이며 신규 D1 검증은 아님.
- **FIRST FAIL (실제 선행 접근):** 현행 운영 PC의 `employment-r6-collection-evidence-readonly` 설치·등록을 입증하는 A readback 부재, #1351의 운영 Runner `queued` 배정 증거 미확보. 판정 `AUTOMATION_BLOCKED / OPERATING_PC_READER_INSTALL_UNVERIFIED`; DOL 수집 `RUNTIME_FAILED`와 구별. Collector #1063 설치 실패 이력은 별도 보존.
- **다음 필수 실행 하나 = 중앙 기존 운영 PC/Controller 단일 Owner가 승인된 직접 읽기 경로로 다음을 한 번에 반환:** `host=PC`, `capturedAt`, 6 Runner online/busy·Supervisor/Watchdog/Guardian/PAUSE·DRAIN/maintenance lease owner·before SHA, 기존 #1351 job 배정, **Controller 설치 SHA/allowlist의 신규 A 존재**, 실제 `sourceRoot/HEAD/config.source`, `provider.mjs`·`collector.mjs` 현장 SHA-256, 과거 #1040/#1063 afterSHA 대비 일치 여부, 2/2 결과와 정확한 Issue/Run 참조. 비밀/원자료는 반환하지 않음. 신규 A가 미설치면 중앙 Owner만 기존 승인 manifest/source 보호 기준으로 설치 가능 여부를 판정; 승인 이전 새 실행 금지.
- **Owner 반환 후 원담당:** 등록 완료 시 신규 A **정확히 1회**로 SQLite 600주 snapshot·51개 지역×577연속주 실측→첫 결손 주/지역에 필요한 최소 원자료 확보→승인된 로컬 계산·저장→D1/API/UI `29/29 READY` 검증. 우선 검증 단계가 실제로 닫히기 전 게시 금지.

---

<!-- employment-r6-51st-execution-primary-20261114 -->
## 51차 최신 실제 실행 결과 (2026-11-14 KST)

**전용 담당 고용 R6. 시작 7/8=87.5% → 종료 7/8=87.5%.** 기존 공개 D1 `28/29 scored READY`, `STATE_CLAIMS_BREADTH` 한 개 `PARTIAL_HISTORY`(점수 null, 마지막 게시 관측일 2025-07-19) 보존. 현 PC 신규 원자료/게시 실증 0건.

**51차 원본 고용 담당 지시:** [제어 #68 51차](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863655392), 원문 지시: Draft #1062(2파일)·#1064(3파일) 기존 완료 재사용, 둘의 파일 교집합 0, 600w 요청 성공 ≠ 577연속주×51지역 PASS, source-only 안전 검증 독립 계속. `main`은 기능 `643b7c7c4372ffad552443fc312c6cb1b944e2fc`, 제어 `69e25a08a903dc8e52ef1093ec15837de4c20858`로 확인, 전용 브랜치 `main` 대비 71 ahead / 93 behind (51차 소스 작업 후 비교). 전체 병합/rebase/강제 정리 없음.

### 실제 완료 소스 작업 — 현재 main의 승인된 안전 동작을 전용 브랜치에 복원

정적 소스 교차검토 결과 **전용 오래된 브랜치의 DOL `fetchDolClaims`는 전국 DOL 1차 응답 성공 후 ETA539 2차 호출이 실패하면 전체 그룹을 throw**하여 전국 원자료를 정상 저장·부분 실패 기록하는 최신 `main`의 보호 동작이 빠져 있었음. 해당 고장 *가능성*은 소스로 확정, **실제 #1169 부분 수집 원인은 아직 UNKNOWN**.

- `lib/market-score/employment-r6-provider.mjs`: 최신 `main`의 전국 정상 데이터 보존 / state ETA539 실패 `DOL_ETA539_SOURCE_FAILED` 분리 / snapshots 국가 1개만 보존하는 기존 검증 동작을 지정 브랜치로 선택적으로 이식. 단, 원담당에 이미 반영된 승인 BACKFILL **600주** 요청 설정은 보존. [커밋 `a1f7ab44`](https://github.com/ansqhd5774-Choi/zgmini/commit/a1f7ab442e3eceec4d426dc73f159c3fd3c872b3).
- `lib/market-score/employment-r6-collector.mjs`: `partialFailureCode`의 안전한 `DOL_ETA539_SOURCE_FAILED` 판정 유지, 기존 DOL 전용 provenance·600주 수집 성공/당일 시도 중복 방지 유지. [커밋 `2aa7d4dd`](https://github.com/ansqhd5774-Choi/zgmini/commit/2aa7d4dd30645841c00692d2acc673ff1d042fa1).
- `tests/employment-r6-backfill-600w-resume.test.mjs`: 전국 XML 정상 200 → ETA539 HTTP 503을 **가상 fetch**로 주입, 4개 전국 지표 보존·state 누락·run PARTIAL·에러 기록·가짜 600주 window 성공 표시 금지 확인. 기존 7개 회귀와 합계 **8/8**. 전용 커밋 [`680596a0`](https://github.com/ansqhd5774-Choi/zgmini/commit/680596a054ce571855a2a610f15560b29258dee0).
- **별도 선택적 검증**: [기능 Draft PR #1064](https://github.com/ansqhd5774-Choi/zgmini/pull/1064) 현재 main 기준 변경 파일 정확히 **3개 동일**(`provider`, `collector`, `tests/employment-r6-backfill-600w-resume.test.mjs`), HEAD `bce5a2a52cbe34bd9f85e41d8e2e33b59b84f190`. 현재 `main`의 DOL 부분 실패 보호 동작과 600주 로직의 함께 쓰임 검증. [CI Run #43500043358](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43500043358) **SUCCESS** / 신규 테스트 8/8 PASS / 전체 4186 tests, 4177 PASS, 0 FAIL, 6 SKIP, 3 TODO, 별도 11/11·69/69 PASS. Draft는 아직 main 미병합·PC 미설치. [기존 #1062](https://github.com/ansqhd5774-Choi/zgmini/pull/1062) `c3` 공란→허위 0 패치/4회 회귀 성공 별도 보존, 두 PR 파일 교집합 0.

### 독립 공식 원본 조회와 증거 경계

- ETA539 공식 데이터 원본 `https://oui.doleta.gov/unemploy/csv/ar539.csv`; DOL [정부 데이터 카탈로그](https://catalog.data.gov/dataset/unemployment-insurance-weekly-claims-extended-benefits-trigger-data-eta-539)에서 ETA539 과거 주간 자료를 공식 등재한 사실 확인.
- 독립 WEB CSV 직접 GET은 `text/csv` 미지원으로 원문 파싱 불가, 이번 분리 실행 환경 다운로드는 DNS 문제로 실패. **운영 PC 요청·공급자 API 수집기 호출은 0회**, 원문 직접 전체 감사/첫 결손일 확인 `NOT_VERIFIED`. 웹 다운로드 장애를 운영 공급자 장애로 확정하지 않음.
- **현재 DOL 첫 실제 결손 주·지역**: UNKNOWN. 마지막 유효 게시 관측 2025-07-19은 최초 누락 관측일이 아님. 검증해야 할 원자료 계약은 **577개 연속 완전주×51지역**, 계산 29/29은 실제 로컬/게시 재조회 전 `NOT_DONE`.

### LAST PASS / FIRST FAIL / 다음 필수 실행 하나

- **LAST PASS** = 51차 본인 소스 수정 dev 브랜치 3파일·기능 PR #1064(3파일) Remote CI 성공, 8/8 회귀/전체 0 FAIL. 기존 D1 28/29 공개 성공(2026-11-10 실측) 독립 보존.
- **FIRST FAIL (운영 게이트)** = 현재 운영 Controller 마지막 실측 `badad912…`의 `employment-r6-collection-evidence-readonly` 미등록/정밀 A readback 0. 최신 GitHub control main 37 allowlist는 설치 근거 아님. 기존 [#1351 / Run #43429486924](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43429486924)은 재조회 여전히 **queued/Runner 미배정**, PC JSON/TXT 없음, `AUTOMATION_PENDING`. 실제 DOL `RUNTIME_FAILED` 증거 아님.
- **단 하나의 다음 필수 실행 (중앙 단일 운영 Owner):** 기존 #1351 실행 배정·원본 PC source/installed Controller allowlist·lease/Owner 상태를 **기존 승인된 직접 읽기 경로로** 확인하고, 공유 #996 C 보호/정규 exact manifest 범위에서 `employment-r6-collection-evidence-readonly` 등록·실제 A readback 증거를 확보해 원담당에게 반환. #1351 새 요청/재실행·무승인 설치·임의 CMD/SQL/RDC 금지.
- 이후 고용 원담당: 신규 A 단회로 **첫 결손 주·지역, ETA539 600w snapshot/SQLite checkpoint**, 운영 PC provider/collector exact SHA 조회 → 부족 구간만 승인 B 수집/SQLite 재조회 → 승인 기존 R2로 29/29 로컬 계산·ledger→D1 sourceVersion/storedAt→Production API/UI 동일성 확인. 자연 예약 검증 제외.

**51차 운영 자원 변경:** 운영 PC source/SQLite/D1/Controller/Task/Cloudflare 0건. 검증 CI 가상 테스트의 데이터는 실제 raw 관측 아님.

---

<!-- employment-r6-48th-primary-status-20261114 -->
## 48차 최신 실행 결과 (2026-11-14 KST · 아래 43차 기록은 당시 이력)

- **기능 완료율 87.5%=7/8 유지**, 이전 D1 28/29 scored READY 재사용. 이번에 실제 PC 수집/계산/게시·D1 쓰기 0건.
- 48차 지시 [공통 #68 원본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863150401) 중 고용 원담당 범위 확인; 같은 운영 단계를 막연히 재검증하지 않고 **수집기 source 결손 실제 수정**.
- 전용 브랜치 `codex/employment-1y-reader-r1` 수정: `lib/market-score/employment-r6-provider.mjs`의 기존 DOL BACKFILL 530→**600주**(기존 다른 브랜치/승인된 계약과 일치); `lib/market-score/employment-r6-store.mjs` 마지막 `BACKFILL` 모드 전용 run 조회; `lib/market-score/employment-r6-collector.mjs` 600주 실제 요청 provenance `DOL_ETA539_600_WEEKS_V1` 및 동일 UTC일 중복 수집 방지/기존 600주 SUCCESS 재실행 방지; `tests/employment-r6-backfill-600w-resume.test.mjs` **7건** 신설.
- 정확한 전용 브랜치 순차 커밋: provider `96ad08e59a6dee6e4093679ea4ff1c9a50552d0c`, store `367c86bb017edfa385160a796c0a0495c27dae6a`, collector `274ac3b6374b8b85e55d9963be56fefc2516d1c7`, test `e262fb3fefcdf751cf6a0e1a4ac485efcf1ccc6d`.
- 현재 main 기준 **3파일만** 분리한 [Draft PR #1064](https://github.com/ansqhd5774-Choi/zgmini/pull/1064), HEAD `3cc193e4695f1c610a8bb24e7cbab123726dcd10` (provider·collector·test; main store에는 기존 mode-specific 조회 있음). [CI #43496830194](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43496830194) **SUCCESS**, 신규 7/7 PASS, 전체 **4,185건/4,176 PASS/0 FAIL/6 SKIP/3 TODO**, 별도 회귀 11/11, 공개 경계 관련 69/69 PASS. `main` 병합이나 PC 설치는 진행하지 않음.
- 기존 [Draft PR #1062](https://github.com/ansqhd5774-Choi/zgmini/pull/1062)의 빈 ETA539 c3 결측→가짜 0 수정/4회 회귀 PASS도 **별도 SOURCE_ONLY** 증거로 유지. 두 PR을 실제 600주 운영 설치·첫 DOL 결손 해결 증거로 사용하지 않음.
- 공식 DOL 실제 첫 결손 주·지역: 여전히 **UNKNOWN**(운영 raw 600주·SQLite 577연속주×51지역 readback 없음). 단순 요청 WINDOW가 600이라는 사실은 실제 577주 완전성 증명이 아님. 이전 #1169 PARTIAL/기존 28개 유효 결과 보존.
- 운영 차단: 마지막 Controller 설치 관측 `badad912…`의 신규 `employment-r6-collection-evidence-readonly` 미등록. 공통 Controller 적용 41차 13파일 source-only 후보는 [기존 #68 인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6862442751) 그대로이며, 겹치는 공유 설치 쓰기만 Controller Owner가 담당. [#1351/Run #43429486924](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43429486924) 마지막 조회 `queued`/Runner 미배정, 같은 requestId 재실행 0.
- **다음 필수 실행 하나:** Controller/Runner 단일 Owner가 **기존 #1351 Runner 배정·PC 실제 source/lease/Controller 허용목록을 승인된 읽기로 검증하고 신규 R6 정밀 A 등록의 정규 적용 증거**를 고용 담당자에게 전달. 그 뒤 고용 원담당이 저장된 DOL 최초 결손을 단회 읽기→정확한 보완 B→29/29 로컬·D1·API/UI 확인. 승인 없는 운영 source/DB/D1/Controller 변경, RDC, 자연 예약 검증 0.

---

# ZGMINI 고용 R6 — 43차 프로세스 총괄 복귀 전달문

**기준일 2026-11-14 KST · 담당 원대화 `codex/employment-1y-reader-r1`.**
**목표:** 승인된 DOL 51지역×10년 역사에서 `STATE_CLAIMS_BREADTH` 정확한 결손 위치를 읽어 공식 자료로 보완하고 기존 28개 유효 점수를 보존하면서 29/29 실제 계산·저장·D1·API/UI 검증.
**진행률:** 시작 7/8=87.5% → 종료 7/8=87.5%; 최근 실측 D1 R2 점수 28/29 READY, 미평가 1/29(2025-07-19 마지막 *게시 관측일*). 8단계 운영 세부 0/5, 정적 개발·CI만으로 완료율 가산 없음.

## 이번 정적 결함과 정확한 변경
- **정적 결함 확정:** `lib/market-score/employment-r4-shadow-provider.mjs`의 ETA539 `c3` 파서가 `Number('') === 0` 성질 때문에 빈 필드 또는 공백 셀을 실제 0건으로 취급. 51지역 완전주 선정에서 가짜 값을 유효로 승인할 수 있음. **실제 원본 CSV/PC SQLite의 이 결함 발생 여부는 확인되지 않았으며 #1169의 원인으로 단정하지 않음.**
- **1파일 최소 수정:** `c3` 값을 trim하여 공란이면 해당 지역-주 관측을 제외한 후 기존 숫자 파싱. 정상 공급자 `0`은 유효. 기존 산식/가중치, 데이터 계약, source hash, 저장 방식, D1, 수집 주기 변경 없음.
- **테스트 1파일 추가:** `tests/employment-r6-eta539-missing-claim.test.mjs`; 공란/공백 제외, 명시 0 보존, 최신 51지역 불완전주보다 마지막 완전주 보존 총 4시나리오.
- **원작업 브랜치 커밋:** 파서 `801cddf2e34c0a763f4a7c259e5a3d3d88e8d329`; 테스트 `924e40e38c0e28fac011b012e395f5f74a12cb9e`. 지정 `codex/employment-1y-reader-r1` 브랜치는 main 대비 60 ahead/93 behind (대조시점); 전체 병합·reset/rebase·강제 정리 없음.
- **CI 검증용 선택적 Draft:** [PR #1062](https://github.com/ansqhd5774-Choi/zgmini/pull/1062), `fix/employment-r6-eta539-missing-c3-20261114` → `main`에 **동일 2파일만** 제안, HEAD `039a512a8e48fef4eefc9d71da9c07e089b57063`. [Node CI #43489515759](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43489515759) `completed/success`; **신규 테스트 4/4 PASS**, 전체 회귀 **4182 tests / 4173 pass / 0 fail / 6 skip / 3 todo**, 게시 후보·Cloudflare read 계약 69/69 PASS. CI는 **SOURCE_ONLY**; main 병합/PC 운영 배포/공급자 수집 0건.

## 현재 DOL 데이터의 엄격한 판정
- 기존 운영 게시 `STATE_CLAIMS_BREADTH`: `PARTIAL_HISTORY`, 점수 `null`, 관측일 2025-07-19. 다른 28/29 D1 유효 점수는 보존.
- 승인 계산은 현재 포함 10년 참조 521주 + 4주 전년 비교에 필요한 선행 55주 + 현재 1주, **최소 577 연속 완전주 × 51지역 = 29,427 지역-주 관측**을 요구. 이 계약의 수학·산식 변경 없음.
- 기능 GitHub `main@643b7c7c4372ffad552443fc312c6cb1b944e2fc`과 **지정 브랜치** 모두 DOL BACKFILL 530주; 별도 `feat/bls-registered-v2-20261109`에는 이미 승인된 600주 수집기 후보. 해당 브랜치 전체 병합 금지. 운영 PC 최신 provider/collector 파일 SHA·snapshot의 530/600주 판정은 아직 **UNKNOWN**(과거 #1040 공급자 600주 설치 이력은 현재 source 고정 증거 아님).
- **실제 최초 누락 주/지역, ETA539 600주 원자료 snapshot, SQLite checkpoint 최신값: 이번에 실증하지 못했음(UNKNOWN).** 2025-07-19는 최초 누락 날짜가 아님. 공식 자료의 발표/정정 여부와 파서 변환·DB 저장 문제를 단회 읽기 전 구분하지 않는다.

## Controller A 등록 — 총괄 41차 통합 후보와 명시 연결
- 마지막 실운영 확인 Controller `badad9124157879d7a645b64f2768113d632355b` allowlist **31개 A**, `employment-r6-collection-evidence-readonly` **미등록**. 제어 `main@69e25a08a903dc8e52ef1093ec15837de4c20858` **37개 A**, 위 신규 operation 포함. 신규 Reader의 소스 정적 테스트 13/13 PASS(기존 증거)이지 PC 실설치 증거 아님.
- [공통 41차 인계 정본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/codex/controller-ops-lessons-20261105/docs/CONTROLLER_READER_A_SOURCE_DIFF_PREFLIGHT_20261114.md): 14 Git 파일 diff(비배포 테스트 1) → **배포 후보 Controller 런타임 12 + config 1 = 13파일**. `controller/operations.mjs`의 static import 때문에 Reader 파일만 임의 복사/등록 불가. **원담당 필요 효과는 단 하나: `employment-r6-collection-evidence-readonly` 등록 및 실제 A로 DOL 최초 결손을 비민감 집계 readback**, 총 13파일 전부 설치를 일괄 요구하지 않음. 설치 전 실제 PC source/maintainer/lease/approval/해시/기존 31 A 보호는 Controller 단일 적용 Owner가 판단.
- **총괄 수신 원장:** [#68 인계 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6862442751). 이는 단지 GitHub 원장으로, 다른 ChatGPT 자동 수신·설치 성공 아님.
- #1217/#1227 `PC_JOB_INTAKE_NOT_OBSERVED` / 기존 requestId 소비 보존. 별도 단일 A [#1351](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1351), [Run #43429486924](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43429486924) **queued / Runner 미배정 / 결과 JSON·TXT 없음**(이번 재조회). 재실행하지 않음. #996 C NO-GO는 실제 공유 설치 쓰기에만 영향.

## 남은 필수 실행 하나
**Controller/운영 PC Owner:** 기존 #1351의 Runner 배정·원본 결과 JSON/TXT 2/2 및 현행 운영 Controller 설치 source/lease의 읽기 전용 증거를 먼저 회수한다. 해당 원본이 확보되고 통합 13파일 설치가 정규 승인·해시·공유 lock 조건에서 가능하면 `employment-r6-collection-evidence-readonly`만 필요한 효과로 설치·등록한 증거를 고용 원담당에 전달한다. #1351 재발행·임의 CMD/Remote Desktop·C 복구 우회 금지.

**이후 원담당 실행 경로:** 등록된 A 고유 요청 **1회** → 첫 불완전 주·지역 / `DOL_ETA539:530w|600w` snapshot / SQLite raw 577주 연속성 판정 → 승인 600주 provider/collector 현재 PC SHA가 OLD인 경우에만 정규 B 최소 적용 → 필요한 공식 원자료 수집·SQLite 재조회 → 승인 R2 저장자료 계산 → 로컬 결과/ledger → D1 버전·stored_at/readback → Production API/UI **29/29 READY**. 원자료 불충족 시 `PARTIAL_HISTORY` 그대로 보존.

**제외:** 자연 예약 검증, 새 scheduler, 임의 provider 재호출, 작업용 RDC, 신규 C·Runner/ZIP/우회 경로. 실제 운영/DB/D1 쓰기 **0건**.
