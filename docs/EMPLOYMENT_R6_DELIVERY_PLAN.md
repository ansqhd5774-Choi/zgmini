# ZGMINI 고용 R6 29개 지표 — 전체 기능 완료 계획

> 상태: ACTIVE_PLAN / 기능 개발·실행의 기준 문서. **이 문서 작성·커밋은 PC 설치, source 승인, DB 편입, D1 게시, 배포를 뜻하지 않는다.**
>
> 작성 기준: 2026-11-08 KST. 저장소 `ansqhd5774-Choi/zgmini`, 기존 작업 브랜치 `codex/employment-1y-reader-r1`, 확인한 작성 전 HEAD `afdd8fab1c03b321e4b8b0853bb236c0800a0a14`. 추후 작업 시에는 매번 필요한 대상의 live SHA를 별도로 확인한다.
>
> 작업 추적: [PR #933](https://github.com/ansqhd5774-Choi/zgmini/pull/933) (작성 당시 OPEN/Draft, 미병합). 실행 절차 정본은 [제어 저장소 공통 지침](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/docs/PC_AUTOMATION_STANDARD.md), 고용 Runner의 세부 경로 계약은 [기존 인계 문서](EMPLOYMENT_R6_PC_RUNNER_HANDOFF.md)다. 이 계획은 그 승인·보호 조건을 변경하지 않는다.

## 1. 최종 목표와 완료 판정

미국 고용 구성 지표 **29개(BLS 24개, DOL/ETA 5개)**를 기존 PC Core의 공식 발표 기반 수집 → 로컬 원자료·PIT 이력 저장 및 재조회 → 승인된 산식·1년 기간 계산 → 로컬 결과 저장 → 기존 D1 공개 결과 게시·readback → `GET /api/employment-r6/observations` → `/economic-indicators/employment/`의 29개 행에 연결한다. 공개 GET은 저장 결과만 읽고 공급자 요청·원자료 대량 계산을 수행하지 않는다.

완료 조건:
1. 기존 Core의 승인 source/config와 실행 소스를 확인하고, 고용 R6 모듈이 현재 요구하는 **`runningSource === approvedSource`** 검사를 통과한 승인 source에서만 opt-in을 실제 활성화하여 정상 동작을 확인한다.
2. 29개 지표마다 실제 원값·관측일·출처·갱신시각·점수/판단·1년 차트의 준비 상태를 추적한다. 공식 미발표 또는 관측 불충분이면 `PARTIAL/STALE/UNAVAILABLE`을 실제 근거대로 표시하며 **29/29 READY나 과거 자료 보간을 강제하지 않는다**. 1년 차트 READY는 10년 산식 점수 READY와 별개다.
3. 로컬 수집·계산 결과가 실제 저장 자료와 일치하고, 공개 D1의 지정 key의 body/hash/stored_at 재조회가 일치한다. D1에는 원자료·키·대량 PIT 이력을 올리지 않는다.
4. Production API/UI에서 29개 ID·원값·상태·점수·날짜·차트가 D1 결과와 일치한다. 상단 별도 R54 종합점수를 R6 개별 점수에 합산하지 않는다.
5. 개발 커밋·관련 검사·승인된 PC 실행·D1 게시·GitHub main 병합·Cloudflare exact Deployment·Production 화면 확인을 별도 증거로 기록한다. 다음 실제 공식 발표의 자연 자동 갱신은 출시 후 별도 추적하며, 발표가 없으면 `UNCHANGED`와 실패를 구분한다.

## 2. 2026-11-08 기준선 — 시점별 근거

| 대상 | 확인 증거 | 이 문서에서 인정하는 범위 |
|---|---|---|
| 연구 후보(격리 DB, 이전 검증) | 원자료 29/29, 최근 1분기 23/29, 1년 차트 READY 23/29, 산식 READY 22/29 ([PR #933](https://github.com/ansqhd5774-Choi/zgmini/pull/933)) | 연구 자료 확보. 운영 Core 승격·현재 시점의 준비 상태 아님 |
| 운영 Core(2026-11-02 STAGE) | 원자료 8/29, 최근 1분기 2/29, 1년 READY 2/29, PIT 이력 공백 2,880건 ([고용 Runner 인계](EMPLOYMENT_R6_PC_RUNNER_HANDOFF.md)) | 당시 스냅샷. 현재 Core 데이터 수로 단정 금지 |
| 실행기 설치 | [#184](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/184) 등록 성공; [#586](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/586) `PASS/R6_HOST_ALREADY_REGISTERED` | 호스트 등록·보호 확인. 후보 STAGE PASS 아님 |
| 후보 STAGE | [#185](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/185) `RESOURCE_WAIT_MEMORY`; [#217](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/217) `WAL_SIDECAR_NOT_READY`, SQLite 미열림·쓰기 0 | 후보/Core 대조 미검증. 두 요청은 소비된 ID로 재실행 금지 |
| WAL/메모리 실제 경량 진단 (2026-11-08) | [#729](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/729) `BLOCKED/RESOURCE_WAIT_MEMORY`, Core `WAL`·`-wal/-shm` 모두 존재·ready, 후보 `ROLLBACK`·ready, 가용 RAM 1,333MiB < 필요 1,536MiB. SQLite 열기·운영/D1 쓰기 0, 보호 상태 불변. [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/42402667929-1-seat-1.json) | 이전 #217의 WAL 차단은 이번에 재현되지 않음. 실제 현재 장애는 메모리 대기이며, 진단 재실행 금지 |
| 최신 경량 사전점검 (2026-11-08) | [#741](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/741) `BLOCKED/R6_DB_PREFLIGHT_FAILED`: Core SQLite 헤더 WAL, `-wal/-shm` 부속 파일 현재 없음, 후보 SQLite ROLLBACK 정상, RAM 480/1,536MiB(1,056MiB 부족). SQLite 열기 0, 운영·D1 쓰기 0, 보호 해시 불변. [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/42405899559-1-seat-5.json) · [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/42405899559-1-seat-5.txt) | 최신 실제 PC 증거. #729의 WAL READY·RAM 1,333MiB는 이전 시점 증거로 보존하며, #741 및 #729 모두 소비된 ID로 재실행 금지 |
| 코드·CI | 브랜치 작성 전 HEAD `afdd8fab…`, [Node.js CI](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/41522685973) PASS, [UI CI](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/41522685634) FAIL(지연 대시보드/계정 fixture) | 현재 개발 변경 관련 성공과 별도 CI 실패를 구분; 운영 반영 아님 |
| 공개 사이트(2026-11-08) | [고용지표 페이지](https://zgmini.kr/economic-indicators/employment/)의 29개 행 모두 원값/점수/미니차트 미제공; 상단 별도 점수 42.7 | 전체 UI 데이터 연결 미완료 |

## 3. 단계별 작업·담당·완료 조건

각 단계의 **담당은 고용지표 원담당**이다. 공용 Controller/Writer·동일 Core checkout의 실제 공유 쓰기 경합이 있는 경우에만 #68 조정 담당과 범위·순서를 협의한다. 별도 프로세스 과제 #434의 자연 B 실증 대기는 전역 선행 조건이 아니다.

| ID | 범위 / 재사용할 기존 구현 | 다음 행동과 선행 관계 | 완료 판정 · 증거 | 상태(기준선) |
|---|---|---|---|---|
| S1 | 공식 원자료·연구 후보 범위. 기존 BLS/DOL 수집·발표 일정 | 공식 발표된 관측치와 후보의 최근 분기/1년 창을 출처·관측일별 분류. 신규 공급자 요청·보강 횟수는 기존 승인 계약을 먼저 대조 | 29개별 근거 있는 `READY/PARTIAL/UNAVAILABLE` 분류, 결측 임의 보간 0 | `READY` (후보 일부 확보), 23/29 |
| S2 | R6 수집/저장·공개 reader 코드, 승인 산식·PIT 계약 | 기존 브랜치 코드를 재사용, 신규 변경 범위의 집중 테스트·CI만 수행 | 현행 기능 코드/Node CI PASS. 운영 PASS는 별도 | `DONE` (개발 범위 한정), 운영 미적용 |
| S3 | 고정 PC Runner 호스트·A 작업 등록 | #184/#586 증거 재사용. 설치·전체 Controller 점검 반복 없음 | 해당 시점 호스트 등록·보호 확인 | `DONE` (등록 범위 한정) |
| S4 | Core↔후보 **읽기 전용** 대조 | #741의 RAM 부족 및 Core WAL sidecar 부재를 개별 조건으로 보존. 두 조건의 새 정상 증거가 확보된 경우에만 신규 고유 A/light→승인 heavy STAGE | 동일 실행 SHA·29 상태·PIT 계보·관측일/출처·후보 무결성 및 쓰기 0을 고유 TXT/JSON으로 확인 | `BLOCKED`: #741 RAM 480/1,536MiB, Core WAL sidecar 현재 없음; #729는 이전 시점 PASS 범위만 보존 |
| S5 | 기존 Core 수집·계산·로컬 저장 | S4 결과에서 검증된 source/데이터 범위 확인 → 현재 운영 PC 승인 source·config와 opt-in의 승인 범위를 대조 → 기존 5분 Core 후속 단계로 연결. 새 Task 금지 | 공식 발표 due 시 공급자 그룹 수집, 원자료 hash/PIT append 또는 NOOP, 계산, 로컬 결과 재조회, checkpoint/시각 전진. Core 잠금 보호 | `DEFERRED` (앞 단계 완료 뒤) |
| S6 | 기존 D1 공개 스냅샷 `market_public_snapshots_v1` / `detail:employment-r6:one-year:v1` | 운영 **Core DB만** STAGE한 승인 결과를 게시. 격리 후보 PUBLISH 금지 | 게시 body/hash/stored_at 동일 재조회, 오류·timeout 시 먼저 기존 D1/ledger 확인, 이중 게시 0 | `DEFERRED` (앞 단계 완료 뒤) |
| S7 | 기존 API·고용 페이지·Cloudflare Git integration | S6 완료 후 D1 GET reader의 29개 ID·6개 요약 카운터·1년/최근 92일 창·sourceVersion/sourceStoredAt를 검증하고 기존 배포 경로 사용. 실제 UI 표현 수정이 필요하면 기존 UI 전용 브랜치 계약 준수 | main 반영 SHA, exact deployment, API와 D1, PC/모바일 29행의 원값·점수·날짜·차트/결측 상태 일치 | `DEFERRED` (앞 단계 완료 뒤) |

**S1의 29개 지표 데이터 범위 검증은 S4의 Core 편입 승인이 아니다.** S4가 PASS해도 운영 Core의 PIT 공백 2,880건이 해소됐다고 가정하거나 후보를 자동 승격하지 않는다. S5·S6의 실제 승인/설치 조건이 별도로 남는다.

## 4. WAL 원인 분류 결과 및 조건부 재개

**최신 추가 증거:** #741에서 `R6_DB_PREFLIGHT_FAILED`는 Core WAL 헤더에 필요한 부속 파일이 없는 현재 안전 조건과 RAM 480MiB 부족을 동시에 관측했다. WAL 모드의 부속 파일 부재만으로 SQLite 손상을 확정하지 않으며, 현재 승인된 R6 실행기는 부속 파일이 없을 때 DB를 열지 않도록 설계됐다. 보호 조건을 임의 완화하거나 Core를 강제 가동하지 않는다. #741의 실행 source SHA `aada254071879544f87ffd286f02a7d6053cd8ba`는 Controller SHA이며, 요청한 브랜치 SHA `03a495fe3c51826bcf576a20d182b203534b5026`와 구분한다. 이 요청 이후 개발 HEAD가 변경됐더라도 #741의 결과가 바뀌지 않는다.

**2026-11-08 실제 갱신:** #729 경량 사전진단 한 건을 정상 접수·회수했다. `lastPass=ALLOWLISTED_WORKER_STARTED`, `firstFail=ALLOWLISTED_OPERATION`, 실제 실행 SHA `aada254071879544f87ffd286f02a7d6053cd8ba`(Controller), 요청 고용 브랜치 SHA `bf289de83855172afdf30b86f7eb38d3c4d97570`(서로 다름). `RESOURCE_WAIT_MEMORY`는 1,536MiB 기준 대비 가용 1,333MiB에서 안전하게 중단된 결과다. 아래 1~3번은 **이미 수행한 절차 기록**이므로 반복하지 않는다.

1. **원담당**이 기존 `#185/#217`과 동일한 신규 실행이 없는지 확인하고, 현재 작업 브랜치 live HEAD·Controller에 설치된 operation을 확인한다. Controller는 [#586](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/586)의 기존 성공 증거를 재사용하되 과거 SHA를 현재 설치 SHA로 고정하지 않는다.
2. 현재 `config/operations.json`에 있는 `employment-r6-wal-memory-preflight`(A/light, 60초)를 **새 UUID requestId 한 건**, 기존 7필드 `ZGMINI_PC_JOB_V1` JSON과 `pc-job` label로 접수한다. 임의 CMD·DB 경로·SQL·스크립트 문자열을 Issue에 넣지 않는다.
3. **그 요청 Issue 하나**의 runId/attempt/seat 결과 JSON+TXT/댓글을 회수하여 `status/code/lastPass/firstFail/actualExecutionSha`, `core/candidate`별 header WAL/rollback·-wal/-shm·가용 1536MiB·쓰기 0을 판정한다.
4. 분기:
   - `R6_WAL_MEMORY_PREFLIGHT_READY`: 1536MiB 및 동일 source/host 조건을 재확인하고, 기존 `employment-r6-candidate-stage-readonly`(A/heavy)를 **새 고유 ID로 한 번** 실행해 후보/Core·PIT 결과쌍까지 회수한다.
   - `RESOURCE_WAIT_MEMORY`: 활성 Core를 중단하지 않고 자원 변화를 기다리며, 수정·환경 변화 없는 중복 요청 금지.
   - `R6_DB_PREFLIGHT_FAILED` / `WAL_SIDECAR_NOT_READY`: 두 DB 중 실패 위치·실제 sidecar 상태를 분리한다. 파일 삭제·checkpoint·운영 DB 복사/재생성 없이 SQLite 공식 WAL 조건과 기존 사전검사를 대조한다. 안전한 변경이 필요할 때만 격리 fixture로 rollback·WAL(양측/단측/부재)·동시 writer·메모리 부족을 시뮬레이션하고 관련 코드만 수정·테스트·정규 등록한다.
   - 경로·host SHA/manifest 불일치: 이미 등록된 host와 실제 파일·승인 source의 정확한 불일치만 조사하고, 필요한 경우에만 공통 B 적용 경로로 최소 변경한다.
5. 후속 heavy가 `PASS`라 해도 그것은 **읽기 전용 데이터 대조 완료**일 뿐이다. 관측/점수 미충족 항목을 근거와 함께 분류한 후 S5로 진행한다. `PASS`/`BLOCKED` 실행 상태와 결과 전달 상태를 혼합하지 않는다.

## 5. 실제 운영 연결의 작업 순서

- **Core collector**: 기존 `scripts/pc-writer/employment-r6-auto-collection.mjs`와 6개 공식 release 그룹을 사용한다. `employmentR6AutoCollection`은 기본 OFF, 실제 승인된 `runningSource === approvedSource` 확인이 선행된다. provider 호출은 공식 발표 due·기존 예산 안에서만 수행하고 수집값을 먼저 저장한다.
- **저장 자료 계산**: 승인된 R6 산식·PIT class·releaseDate/availableAt·관측일을 사용하며 계산 중 공급자 API를 다시 부르지 않는다. 1년 차트와 10년 점수 준비를 별개로 검증한다.
- **Core 게시**: 기존 `scripts/pc-writer/employment-r6-auto-publication.mjs`, `employmentR6OneYearAutoPublication` 기본 OFF. 실제 운영 Core DB만 사용하고 후보·격리 DB를 게시하지 않는다. 승인 소스 불일치·미검증 데이터는 차단한다.
- **공개 검증**: `worker/employment-r6-public-display.mjs`와 기존 GET API를 사용한다. TTL·산식·D1 key/스키마 임의 변경 없이 version, 29 IDs, 6 counters, 92일/1년 창, 소스 계보 및 결측 상태를 확인한다. GET은 D1만 읽는다.
- **배포·확인**: 필요한 기능 변경만 PR에서 선택적으로 main 반영한다. PR #933의 여러 변경 파일을 통째로 무조건 병합하지 않는다. 최신 main에는 ER1 원자료 수집기·전이 모듈이 있으나 기존 고용 브랜치에는 없으므로 ER1 실행 8줄만 복사하는 부분 병합도 금지한다. 출시 source 통합은 **최신 main 기준 R6 opt-in 수집·게시 및 필요한 의존성만 선택 이식**해 ER1/R10과 기존 공급자 계약을 보존하며, 관련 CI 실패의 실제 범위를 분류한다. Cloudflare Git integration exact Deployment, D1/API/사이트를 별도로 검증한다. 승인 없는 Wrangler 직배포·DNS 변경 금지.

## 6. 진행률 산정과 업데이트 규칙

이전 사용자 보고 기준 **전체 진행률 약 46%**는 아래 7개 가중치의 **추정치**이며 인력 소요시간·기능 출시율의 실측값이 아니다. 가중치는 임의로 변경하지 않는다. 새로운 증거가 있을 때만 단계 비율을 바꾸고, PLAN/PR/CI만으로 S4~S7의 운영 진행률을 올리지 않는다.

| 단계 | 가중치 | 2026-11-08 단계율 | 전체 기여 |
|---|---:|---:|---:|
| S1 연구 후보 데이터 | 20% | 79.3% (최근 분기·1년 READY 각 23/29 기준선) | 15.9% |
| S2 개발 코드/관련 검사 | 20% | 100% (현재 변경 코드 기준, 실PC와 별개) | 20.0% |
| S3 PC 호스트 준비 | 10% | 100% (#586 시점) | 10.0% |
| S4 후보/Core 실PC 대조 | 15% | 0% (아직 PASS 없음) | 0 |
| S5 Core 자동 수집·계산·로컬 검증 | 15% | 0% | 0 |
| S6 D1 실제 게시·재조회 | 10% | 0% | 0 |
| S7 Production API/UI 검증 | 10% | 0% | 0 |
| **합계** | **100%** | — | **45.9% ≈ 46%** |

S1의 23/29은 일시적 수치 지표다. 공식 미발표·BED 등의 결측이 실제로 정당한 경우엔 개별 상태·증거가 완비됐을 때 S1을 완료로 인정할 수 있지만, 가짜 `READY` 값으로 채울 수 없다. 기존 원자료 수치나 공표 일정이 바뀌면 해당 영향 범위만 다시 검산한다.

매 작업 보고: **전체 진행률 전→후**, 이번 실제 실행/수정, 대상 브랜치·커밋, 고유 PC Issue 및 JSON/TXT 증거, LAST PASS/FIRST FAIL과 현재 BLOCKER, **다음 필수 실행 한 건/통과 조건**. 단계 상태는 `DONE/READY/RUNNING/STATE_UNKNOWN/BLOCKED/DEFERRED`를 사용한다. 원래 완료한 검증을 새 성과로 반복 집계하지 않는다.

## 7. 운영 보호·계획에서 제외한 작업

- 기존 Core 5분 예약, Korea, 승인 제거된 Iran R13 상태(`APPROVED_RETIRED_ABSENT`), R7/R38 다단계 실행기, 운영 source/config, 잠금·lease, SQLite·D1, 기존 수집·게시 주기·산식·공급자 예산·DNS를 임의 변경하지 않는다.
- B급이 실제 필요한 경우 공용 유지보수 계약/manifest/해시/원본 백업/복구/lease를 지키고 겹치는 운영 쓰기만 자원별 직렬화한다. 기능별 CMD·새 예약·Controller 전체 재설치·6 Runner 전원 유휴·전체 Core 재검사는 일반 A급의 선행 조건이 아니다.
- 사용자에게 CMD 실행/로그 전달 반복 요청을 하지 않는다. 기존 Runner 허용 operation으로 실행·회수한다. 운영 원자료·키·개인 경로·전체 config를 GitHub Issue/댓글·TXT·계획서에 노출하지 않는다.
- 출시 후 **다음 공식 발표에서 자연 자동 갱신 여부**는 별도 후속 추적으로 기록한다. 발표가 없는 기간의 `UNCHANGED`를 수집 실패로 판정하거나, 이 자연 관찰을 초기 UI 출시의 불필요한 선행 Gate로 만들지 않는다.

**다음 필수 행동(단일):** #741의 결과를 완료 증거로 보존한다. **신규 PC 환경 증거에서 RAM 1,536MiB 이상과 Core WAL 부속 파일 준비가 함께 확인될 때만** 현재 승인된 호스트·불변 R6 후보 번들 SHA를 확인하고, 중복되지 않는 새 고유 A/light 검증 후 승인 `employment-r6-candidate-stage-readonly` A/heavy를 실행한다. 지금의 동일 실패를 재요청하지 않는다. 자원 대기 동안 독립 소스 검증·최신 main 기준 R6 선택 이식 준비는 계속한다. 개발 HEAD를 이미 승인된 PC 번들 SHA로 간주하지 않는다.
