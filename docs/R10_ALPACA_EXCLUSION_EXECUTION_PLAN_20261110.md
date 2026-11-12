# R10 Alpaca 사용 금지 — R6.1 실행 계획 (2026-11-10)

## 1. 최종 목표와 적용 범위

- 사용자 결정: ZGMINI R10의 **Alpaca Basic/IEX 신규 공급처 호출, 과거 Alpaca B 데이터의 신규 6요소 점수 입력 재사용, Alpaca 데이터로 신규 R10 공개 결과 생성**을 금지한다.
- 보존: 과거 원자료·SQLite·checkpoint·이력·마지막 유효 게시 결과와 타 공급처 자료. 결측을 0으로 대체하거나 승인 산식·가중치·TTL·DB 계약을 임의 변경하지 않는다.
- 완료는 **개발 소스 준비**가 아니라 실제 **운영 PC 호출 차단 → 로컬 상태 검증 → 기존 공개 자료와 신규 데이터 게시 판정 → API/UI 확인**으로 판단한다. R10만 담당한다. 제어 저장소/공통 Controller 자체 개발은 별도 소유다.
- GitHub PR/테스트, PC Writer 설치, 웹 Git Integration 배포, 실제 Runtime/공개 결과를 각각 구분한다.

## 2. 정본·브랜치·현재 완료 지점

- PC 제어 정본: `ansqhd5774-Choi/zgmini-pc-control` 최신 `main`의 `AGENTS.md`, `docs/GENERAL_CHAT_START.md`, `docs/PC_AUTOMATION_STANDARD.md`, `docs/AGENT_HANDOFF_CENTRAL_ORCHESTRATOR_V1.md`. 2026-11-10 사용자 R6.1에서 강조한 격리 Writer B 사고 처리·일반챗 재개 기준을 따른다.
- 기능 저장소: `ansqhd5774-Choi/zgmini`; 작업 브랜치 **`fix/asset-r10-alpaca-exclusion-runtime-20261110`**, 승인된 운영 B manifest 고정 후보 커밋 `9856ba04189eae332837b62551cb89577c56b376`, 수집기 소스 영구 차단·회귀 테스트 반영 커밋 `ead573c9f7a0d38a81cf2666e7138c2a997e3f29`, Draft [PR #1058](https://github.com/ansqhd5774-Choi/zgmini/pull/1058). 두 소스 SHA와 PC 설치 SHA를 혼동하지 않는다.
- 오래된 R10 분기 `fix/asset-bubble-r10-latest-observations-20261103`의 전체 내용은 현 main보다 크게 뒤져 있으므로 통째 PC checkout에 적용하지 않는다.
- 기존 R10 금지 패치 8개 파일의 관련 Node 테스트 **31/31 PASS**. 별도 발견된 collector 직접 호출 회귀 위험을 기능 브랜치의 수집기 1줄 가드와 직접 호출 0회·파일 쓰기 0건 테스트 1개로 보완(기존 변경 8파일 + 신규 수집기 1파일 + 기존 쿼터 테스트 개정 1파일 + 계획서 1파일 = PR 변경 총 11파일: 문서 2, 코드/테스트 9). 해당 관련 3개 테스트 파일 **15/15 PASS** 및 기존 R10 5개 수집·재개 테스트를 사용 중단 후 원본/체크포인트/쿼터 상태 불변 검사로 보완한 관련 4개 테스트 파일 **31/31 PASS**, 문법·diff 검사 PASS. 이는 당초 source-only 기록이며, 이후 운영 설치 증거는 4단계 및 2026-11-12 현행 상태를 따른다. PR/CI만을 PC 성공으로 표시하지 않는다.
- Windows A 근거: [#1207](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1207) 정확한 PC 파일 preimage; [#1209](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1209) collector 함수 초반 `EXCLUDED_BY_USER/runRequests:0` insert-only `PASS_READONLY`. [#1216](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1216) 2026-11-10T00:49:55Z `core.lockPresent=false` 및 PC 승인 source `de81749f83c086f5cb0cad7ed1d5cc958de19280` 관측은 **그 시각만의 자료**, 동시 자연 유휴 2회나 live Core 실행 소스 전체 연결 증거는 아니다.
- 제어 저장소 기존 승인 manifest: `approvals/writer-updates/r10-alpaca-excluded-minimal-overlay-20261110.json`, SHA-256 **`4c14d8ed23f62fa5c64f482d61fe203cff53312713ebd10bf732a6f6a1f54108`**; 정확히 2개 운영 Writer 파일 수정, 3개 기존 타 담당 누적 파일 보호.
- 첫 정규 B [#1210](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1210) / Run `42724651597`: `WRITER_B_PREFLIGHT_STOP/WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED`; 결과 JSON/TXT 2/2, 운영 변경 **0**, 동일 요청 재사용/자동 재실행 **금지**.
- Controller #917 [PR #1214](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1214) 복구는 해당 사고 완료. **별도** [#996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/996)의 더 최근 원본은 `UNKNOWN/RUNNER_SET_DRIFT`와 `RECOVERY_REQUIRED`, Workflow `disabled_manually` 관측이 있다. 2026-11-10 #996 관리자 C 복구는 공통 단일 담당이 별도 처리 중이며, 현재 완료로 추정하지 않는다.

## 3. 산정: 5개 마일스톤 × 20% (현재 4/5 = 80%)

| 단계 | 상태 | 완료/통과 조건 | 필수 증거·담당 |
| --- | --- | --- | --- |
| **1. 사용 금지 결정·보존 범위** | **DONE 20/20** | Alpaca 신규 호출/과거 B 재사용/신규 R10 게시 금지·원본/마지막 게시 보존 확정 | 사용자 명시 결정, R10 담당 |
| **2. 현 main 기준 소스 패치** | **DONE 20/20** | 기존 8파일 변경 + 신규 수집기 1파일 직접 차단 + 기존 테스트 1파일 보강, 산식·타 기능 보존, 기존 31/31 및 최신 집중 31/31 PASS | PR #1058 / `9856ba…` + `ead573c…` + `64c682a…`, R10 담당 |
| **3. 실제 PC preimage·승인 설치 설계** | **DONE 20/20** | A preimage/insert preview, 2파일 manifest, 보호 해시, B #1210 무변경 이연 정확 분류 | #1207/#1209/#1210 및 승인 JSON, R10 담당 |
| **4. 실제 Writer 2파일 안전 설치** | **DONE 20/20 (2026-11-12)** | 신규 고유 정규 B 1회 `SUCCEEDED`·PC 실제 afterSHA·config source/작업 정의·원본 백업·JSON/TXT 재조회. 원본 누적 Writer 3파일 불변 | 신규 B Issue/Run/원격 결과·PC 상태; R10 담당 |
| **5. 전체 R10 금지 효과·공개 검증** | **PENDING 0/20** | provider 호출 0, 과거 B 자료로 새 6요소/점수 생성 0, health/scheduler/checkpoint에서 금지 상태 명확, 과거 유효 게시 보존; 승인된 신규 공개 결과가 있을 때 SQLite/D1/API/UI 일치·시각 검증 | 운영 checkpoint/ledger, 관련 A/B 최소 후속 변경, 공개 화면; R10 담당 |

*진행률은 5단계 완료 수 기준이며, 제어 저장소 Controller 프로젝트 진척도나 자동 인계 프로젝트 진척도를 합산하지 않는다. 단계 3의 첫 B 이연은 설치 완료가 아니라 사전승인 및 무변경 실패 분류의 완료다.*

## 4. 다음 최소 실행 (순서·조건·STOP)

### 4.1 실제 공유 자원 상태 확인 — 조회 한정

- 담당: **R10 원담당**, Controller #996 복구는 **공통 Controller 단일 담당**.
- 최신 [#996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/996)의 **실제 복구 완료 여부, Workflow 활성 여부 및 현재 Writer B 입구 영향**을 원본 결과만으로 확인한다. #996 C 진행을 R10이 대신 수행하거나 재요청하지 않는다.
- #996이 여전히 불명확해도 별개 소스 조사·관련 테스트·독립 A 조회는 계속한다. **신규 Writer B의 실제 admission/lease/Workflow에 직접 영향이 있을 때만 설치 단계 BLOCKER**로 취급한다. 모든 R10 작업의 전역 Gate로 만들지 않는다.
- 새 운영 Writer B를 판단할 때 PC 정확한 HEAD/config source, 설치 전 2파일 beforeSHA, 보호 3파일 SHA, Core XML/launcher, 실제 natural idle/lock 상태를 승인된 A read-only 증거로 필요한 범위에서 재대조한다. 기존 #1207/#1209 증거가 유효하면 재수집 없이 재사용한다. 단일 `lockPresent=false` 시점만으로 설치 유휴 확정하지 않는다.
- STOP: source/해시가 달라졌으면 기존 manifest를 억지 적용하지 말고 실제 변경 담당·범위 확인 후 새 manifest 설계; 원본 `#1210` 재실행 금지.

### 4.2 정규 Writer B 2파일 운영 설치

- 담당: **R10 원담당**, 공유 Writer 동시 쓰기 시 한 명의 설치 조정 담당/유효 lease 사용.
- 입력: 변경이 없으면 위 기존 `APPROVED_B` manifest·2파일 afterSHA + 3파일 protected SHA + Core launcher·Task SHA.
- `scripts/pc-writer/alpaca-incremental.mjs`: 검증된 함수 초반 insert-only 반환만 삽입; 호출 수가 0인지 판정. `scripts/pc-writer/build-asset-r10-release.mjs`: 승인 preimage 일치 조건에서만 금지된 공급처 사용을 거부.
- 기존 `local-cycle.mjs`(인플레이션 누적 설치), `additional-collection-health.mjs`, `progressive-publication.mjs`는 통파일 덮어쓰기 금지. 원본 DB/checkpoint/lock/Task도 유지.
- 기존 정규 Writer B의 두 번의 자연 idle 관측 및 승인된 내부 pause/원본 복원 절차를 사용. Core 강제 중지·잠금 삭제·오류 무시·무한 재시도 없음.
- 결과: 고유 새 B Issue/requestId 1건의 runId·LAST PASS/FIRST FAIL·정확한 오류, 원격 JSON/TXT 2/2 readback·PC 실제 파일 SHA/backup/config source를 확인한다. **GitHub PR/CI만으로 PC PASS 금지**.
- 정상 자원 대기(`WAIT_RECORDED`, `WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED`)는 새 **수리 가능한 Incident로 등록하지 않음**. 진짜 증거 인증된 수리 가능 실패만 R6.1 격리 Runner → 단일 중앙 ChatGPT → 원본 Issue 결과로 처리. 인위적 실패 만들지 않음.

### 4.3 6요소·잔여 health/스케줄·공개 효과 확인

- 담당: **R10 원담당**.
- PC 실제 다음 승인된 수행에서 Alpaca 공급처 호출 수 0, 금지된 역사 B 입력의 6요소 계산·신규 게시 거부, 기존 유효 공개 데이터 보존을 관측한다. 잘못된 0 점수/가짜 최신값/성공 표시 금지.
- 2파일 설치로 해결되지 않은 `local-cycle`·`additional-collection-health`·`progressive-publication` 등의 R10 잔여 연결은 실제 런타임 영향이 확인된 **최소 삽입형 변경만** 설계하고 별도 보호/승인 경로로 검증한다. 무관 기능의 누적 적용을 덮어쓰지 않는다.
- R10 신규 점수 게시가 합법적 공급처 자료로 가능한 경우에만 승인된 경로의 로컬 결과/ledger → D1 저장 시각/버전 → 공개 API → PC/모바일 UI 확인. 신규 점수를 계산·게시하지 않는 것이 금지의 올바른 효과면 **차단 증거+마지막 유효 자료 보존**으로 판정하며 없는 신규 게시를 강요하지 않는다.
- GitHub Draft PR #1058 준비/승인 병합과 Cloudflare 배포는 별개이며, source/배포 관련 승인이 실제 필요해질 때 해당 경로만 진행한다. 예약 자동 갱신 검증은 기능 작업 완료 후 후속 관측으로 분리한다.

## 5. R6.1 사고 인계·보고 계약

- 일반챗은 최신 제어 저장소 관련 지침만 확인하고 자기 원담당 작업을 계속한다.
- **격리 Windows Runner `zgmini-handoff-ci-isolated`**는 정규 Writer B의 **인증된 수리 가능 실패**에 대해서만 `workflow_run` 원본 bot/manifest SHA/JSON·TXT를 검증해 기존 `agent-handoff` Issue로 보낸다. 성공·안전 대기·STATE_UNKNOWN은 자동 수리 실패가 아니다.
- 단일 중앙 ChatGPT는 등록된 Incident의 원인에 한정해 수정·테스트·PR·CI를 수행하고 **원본 GitHub Issue**에 검증 결과를 기록한다. 다른 일반챗 자동 수신/재개·PC 자동 변경을 주장하지 않는다.
- 새 격리 경로의 자연 장애 전체 왕복 후속 실증은 `DEFERRED`이며 본 R10 기능의 완료 Gate가 아니다.
- 매 종료 보고 형식: **이번 결과 / 검사 증거 / R10 단계별 완료(분자/분모)·전체 프로젝트와 구분 / 실제 BLOCKER만 / 다음 실행 하나와 담당 / 저장소·브랜치·commit**.
- **2026-11-12 현재 상태: R10 4/5 = 80%.** 정규 [Writer B #1308](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1308) / [Run 43174588398](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43174588398) `WRITER_B_INSTALLED_VERIFIED`, 신규 PC 로컬 승인 source `84df5e80f4bcdadd2a274d6f55a90290426c2406`, `LOCAL_OVERLAY`, 지정 2파일 설치. JSON/TXT 원격 readback 2/2, `RECOVERY=NONE`, 원본 3개 보호, source/config/Task 보존. [#1309](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1309) Core status PASS, [#1310](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1310) collector afterSHA `49d2f7de...` PASS, [#1311](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1311) release builder afterSHA `66a3d806...` PASS. `sourceHead=config.source=84df5e80...` 확인. **아직 이전 Writer 체크포인트 source는 `d560eb85...`이므로 설치 이후 자연 Core 실행/Writer 결과가 새 SHA로 전진한 증거는 없다.** 확인 전에는 Alpaca provider 호출 0·신규 R10 점수/게시 0의 실운영 효과나 공개 D1/API/UI 완료를 주장하지 않는다. 5단계가 다음 필수 업무. 기존 [#1210](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1210) 재실행 금지, #996 Controller C 복구는 별도.
