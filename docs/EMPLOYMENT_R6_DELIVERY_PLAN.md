# ZGMINI 고용 R6 29개 지표 — 전체 기능 완료 계획

> 상태: ACTIVE_PLAN / 기능 개발·실행의 기준 문서. **이 문서 작성·커밋은 PC 설치, source 승인, DB 편입, D1 게시, 배포를 뜻하지 않는다.**
>
> 최신 실증 반영: 2026-11-08 KST. 저장소 `ansqhd5774-Choi/zgmini`, 기존 작업 브랜치 `codex/employment-1y-reader-r1`, 갱신 전 원격 HEAD `9552afce3c4c5533f476690bfc24e9c36715c418`. 이후 작업에서는 대상의 live SHA를 다시 확인한다.
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
| 과거 후보 STAGE | [#185](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/185) `RESOURCE_WAIT_MEMORY`; [#217](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/217) `WAL_SIDECAR_NOT_READY`, 당시 SQLite 미열림·쓰기 0 | 이후 #782에서 정상 실증. 두 과거 요청 ID 재실행 금지 |
| 과거 WAL/메모리 경량 진단 (2026-11-08) | [#729](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/729) `BLOCKED/RESOURCE_WAIT_MEMORY`, 당시 RAM 1,333MiB < 필요 1,536MiB. SQLite 열기·운영/D1 쓰기 0, 보호 상태 불변. [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/42402667929-1-seat-1.json) | 과거 시점 대기 증거. 이후 #781/#782 정상 실증, 재실행 금지 |
| 과거 경량 사전점검 (2026-11-08) | [#741](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/741) `BLOCKED/R6_DB_PREFLIGHT_FAILED`: 당시 RAM 480/1,536MiB, Core WAL sidecar 부재. SQLite 열기·운영 쓰기 0 | **현재 BLOCKER 아님**. 다음 #781/#782의 정상 관측이 우선하며 #741 재실행 금지 |
| 실PC 최신 경량·중량 실증 | [#781](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/781) A/light PASS → [#782](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/782) `PASS/EMPLOYMENT_R6_READONLY_STAGE_COMPLETED`: SQLite 실제 열림, 원자료 29/29, 최근 관측 23, 차트 READY 21/PARTIAL 5, 점수 READY 2, 추가 RAM 192MiB, 운영·D1·공급자 쓰기 0, 원본 보호 동일 | **S4 읽기 전용 실증 완료**. 후보↔Core 겹침키 2건의 개정 상충으로 `HOLD_CONFLICTING_REVISIONS`, 후보 자동 승격 금지. Core-only 운영 경로는 별개 |
| 실제 Writer source 조회 | [#784](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/784) A급 PASS, PC 운영 로컬 HEAD `9040e821…`, `run-local.mjs` preimage 1개 확인. 146/148개 목록은 `OMITTED_SUMMARY_ONLY`, `lib/market-score` 중첩 파일 미조회 | **실제 source B manifest에 필요한 기존 11개 파일의 preimage 10개 미확보**. 기존 GitHub source 해시로 대체 불가 |
| 공통 실행 계약 부족 | [#783](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/783) 공통 A 경로별 해시 조회 부족 및 R6 opt-in `config.json` 안전 B 경로 미확인 | **S5 현재 BLOCKER**. 원담당은 source B/수집·계산·게시를 직접 수행, 공통 담당은 최소 A/B 계약 보완 |
| 코드·CI | 브랜치 작성 전 HEAD `afdd8fab…`, [Node.js CI](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/41522685973) PASS, [UI CI](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/41522685634) FAIL(지연 대시보드/계정 fixture) | 현재 개발 변경 관련 성공과 별도 CI 실패를 구분; 운영 반영 아님 |
| 공개 사이트(2026-11-08) | [고용지표 페이지](https://zgmini.kr/economic-indicators/employment/)의 29개 행 모두 R6 원값/점수/미니차트 미제공; 상단 별도 R54 점수 42.7. `/api/employment-r6/observations`는 브라우저에 `Not Found` 표시(정확한 HTTP 상태코드 미확인) | 전체 R6 API/UI 미연결. 최신 main에 해당 R6 공개 route 부재 |

## 3. 단계별 작업·담당·완료 조건

각 단계의 **담당은 고용지표 원담당**이다. 공용 Controller/Writer·동일 Core checkout의 실제 공유 쓰기 경합이 있는 경우에만 #68 조정 담당과 범위·순서를 협의한다. 별도 프로세스 과제 #434의 자연 B 실증 대기는 전역 선행 조건이 아니다.

| ID | 범위 / 재사용할 기존 구현 | 다음 행동과 선행 관계 | 완료 판정 · 증거 | 상태(기준선) |
|---|---|---|---|---|
| S1 | 공식 원자료·연구 후보 범위. 기존 BLS/DOL 수집·발표 일정 | 공식 발표된 관측치와 후보의 최근 분기/1년 창을 출처·관측일별 분류. 신규 공급자 요청·보강 횟수는 기존 승인 계약을 먼저 대조 | 29개별 근거 있는 `READY/PARTIAL/UNAVAILABLE` 분류, 결측 임의 보간 0 | `READY` (후보 일부 확보), 23/29 |
| S2 | R6 수집/저장·공개 reader 코드, 승인 산식·PIT 계약 | 기존 브랜치 코드를 재사용, 신규 변경 범위의 집중 테스트·CI만 수행 | 현행 기능 코드/Node CI PASS. 운영 PASS는 별도 | `DONE` (개발 범위 한정), 운영 미적용 |
| S3 | 고정 PC Runner 호스트·A 작업 등록 | #184/#586 증거 재사용. 설치·전체 Controller 점검 반복 없음 | 해당 시점 호스트 등록·보호 확인 | `DONE` (등록 범위 한정) |
| S4 | Core↔후보 **읽기 전용** 대조 | #781 경량 및 #782 중량 실증 재사용. 후보 겹침키 2건 상충은 승격 거부를 유지하며 Core-only 경로와 분리 | #782 PASS/원자료 29·차트 READY 21·점수 READY 2/보호 해시 불변 및 후보 상충 2건 기록 | `READY` (실증 PASS, 후보 승격 금지) |
| S5 | 기존 Core 수집·계산·로컬 저장 | #783의 최소 공통 A 경로 조회로 실제 PC preimage 확보, 기존 공통 B source manifest 11M/8A로 안전 설치. 실제 R6 opt-in 값을 조회하고 필요한 두 키만 승인 B로 활성화. 새 Task 금지 | 기존 Core에서 release-aware 6그룹 수집, SQLite 원자료/PIT 저장, 계산·로컬 결과 재조회, checkpoint/시각 전진. Core 잠금 보호 | `BLOCKED` (#783 A/B 계약 미해결, 기능 코드는 준비) |
| S6 | 기존 D1 공개 스냅샷 `market_public_snapshots_v1` / `detail:employment-r6:one-year:v1` | 운영 **Core DB만** STAGE한 승인 결과를 게시. 격리 후보 PUBLISH 금지 | 게시 body/hash/stored_at 동일 재조회, 오류·timeout 시 먼저 기존 D1/ledger 확인, 이중 게시 0 | `DEFERRED` (앞 단계 완료 뒤) |
| S7 | 기존 API·고용 페이지·Cloudflare Git integration | S6 완료 후 D1 GET reader의 29개 ID·6개 요약 카운터·1년/최근 92일 창·sourceVersion/sourceStoredAt를 검증하고 기존 배포 경로 사용. 실제 UI 표현 수정이 필요하면 기존 UI 전용 브랜치 계약 준수 | main 반영 SHA, exact deployment, API와 D1, PC/모바일 29행의 원값·점수·날짜·차트/결측 상태 일치 | `DEFERRED` (앞 단계 완료 뒤) |

**S1의 29개 지표 데이터 범위 검증은 S4의 Core 편입 승인이 아니다.** S4가 PASS해도 운영 Core의 PIT 공백 2,880건이 해소됐다고 가정하거나 후보를 자동 승격하지 않는다. S5·S6의 실제 승인/설치 조건이 별도로 남는다.

## 4. 현재 재개 조건 — 공통 #783, 기존 성공 증거 재사용

- **완료:** `#781`의 메모리/WAL 경량 검사와 `#782`의 중량 SQLite 실증은 성공했다. #729/#741의 과거 자원 대기 상태를 현재 장애로 재기재하거나 A/light→heavy를 재요청하지 않는다.
- **후보 승격 금지:** #782의 중복키 중 개정 상충 2건은 `HOLD_CONFLICTING_REVISIONS` 유지. Core-only 수집·로컬 결과 게시에는 격리 후보 DB를 결합하지 않는다.
- **현재 공통 차단 #783-1:** 기존 설치 A `pc-source-preflight`의 중첩 `lib/market-score` 조회 부재·목록 생략으로 PC에서 변경되는 11개 `M` 파일의 원본 SHA-256을 전부 얻지 못한다. 운영 HEAD는 GitHub에 없는 로컬 오버레이므로 GitHub SHA를 `beforeSha256`으로 가정하지 않는다. 이미 확보한 `run-local.mjs` preimage 하나는 재사용한다.
- **현재 공통 차단 #783-2:** 운영 `config.json`의 `employmentR6AutoCollection`, `employmentR6OneYearAutoPublication` 값은 미확인이고 source-only Writer B는 두 설정을 수정할 권한이 없다. 공통 읽기 및 필요한 경우 승인된 최소 설정 B 경로가 요구된다.
- **원담당 다음 실행:** 공통 담당에게 인계된 #783의 **실PC에서 설치·승인된 정확한 A 조회 operation**이 확보되는 즉시 11개 `M` 실제 preimage를 한 번 수집한다. 이후 기존 공통 Writer B로 19개(11M/8A) 최소 manifest를 작성·안전 설치하고, 실제 opt-in 상태에 따라 승인된 설정 B를 진행한다. PC Core→SQLite→로컬 계산→D1→API/UI까지 원담당이 수행한다.

## 5. 실제 운영 연결의 작업 순서

- **Core collector**: 기존 `scripts/pc-writer/employment-r6-auto-collection.mjs`와 6개 공식 release 그룹을 사용한다. `employmentR6AutoCollection`은 기본 OFF, 실제 승인된 `runningSource === approvedSource` 확인이 선행된다. provider 호출은 공식 발표 due·기존 예산 안에서만 수행하고 수집값을 먼저 저장한다.
- **저장 자료 계산**: 승인된 R6 산식·PIT class·releaseDate/availableAt·관측일을 사용하며 계산 중 공급자 API를 다시 부르지 않는다. 1년 차트와 10년 점수 준비를 별개로 검증한다.
- **Core 게시**: 기존 `scripts/pc-writer/employment-r6-auto-publication.mjs`, `employmentR6OneYearAutoPublication` 기본 OFF. 실제 운영 Core DB만 사용하고 후보·격리 DB를 게시하지 않는다. 승인 소스 불일치·미검증 데이터는 차단한다.
- **공개 검증**: `worker/employment-r6-public-display.mjs`와 기존 GET API를 사용한다. TTL·산식·D1 key/스키마 임의 변경 없이 version, 29 IDs, 6 counters, 92일/1년 창, 소스 계보 및 결측 상태를 확인한다. GET은 D1만 읽는다.
- **배포·확인**: 필요한 기능 변경만 PR에서 선택적으로 main 반영한다. PR #933의 여러 변경 파일을 통째로 무조건 병합하지 않는다. 최신 main에는 ER1 원자료 수집기·전이 모듈이 있으나 기존 고용 브랜치에는 없으므로 ER1 실행 8줄만 복사하는 부분 병합도 금지한다. 출시 source 통합은 **최신 main 기준 R6 opt-in 수집·게시 및 필요한 의존성만 선택 이식**해 ER1/R10과 기존 공급자 계약을 보존하며, 관련 CI 실패의 실제 범위를 분류한다. Cloudflare Git integration exact Deployment, D1/API/사이트를 별도로 검증한다. 승인 없는 Wrangler 직배포·DNS 변경 금지.

## 6. 진행률 산정과 업데이트 규칙

최신 사용자 보고 기준 **전체 진행률 약 55%**는 아래 7개 가중치의 **추정치**이며 인력 소요시간·기능 출시율의 실측값이 아니다. #782 실제 중량 읽기 실증에만 S4의 진척을 반영했다. 계획·PR·CI만으로 S5~S7의 운영 진행률을 올리지 않는다.

| 단계 | 가중치 | 2026-11-08 단계율 | 전체 기여 |
|---|---:|---:|---:|
| S1 연구 후보 데이터 | 20% | 79.3% (최근 분기·1년 READY 각 23/29 기준선) | 15.9% |
| S2 개발 코드/관련 검사 | 20% | 100% (현재 변경 코드 기준, 실PC와 별개) | 20.0% |
| S3 PC 호스트 준비 | 10% | 100% (#586 시점) | 10.0% |
| S4 후보/Core 실PC 대조 | 15% | 60% (#782 PASS, 후보 PIT 상충 2건은 승격 금지) | 9.0% |
| S5 Core 자동 수집·계산·로컬 검증 | 15% | 0% | 0 |
| S6 D1 실제 게시·재조회 | 10% | 0% | 0 |
| S7 Production API/UI 검증 | 10% | 0% | 0 |
| **합계** | **100%** | — | **54.9% ≈ 55%** |

S1의 23/29은 일시적 수치 지표다. 공식 미발표·BED 등의 결측이 실제로 정당한 경우엔 개별 상태·증거가 완비됐을 때 S1을 완료로 인정할 수 있지만, 가짜 `READY` 값으로 채울 수 없다. 기존 원자료 수치나 공표 일정이 바뀌면 해당 영향 범위만 다시 검산한다.

매 작업 보고: **전체 진행률 전→후**, 이번 실제 실행/수정, 대상 브랜치·커밋, 고유 PC Issue 및 JSON/TXT 증거, LAST PASS/FIRST FAIL과 현재 BLOCKER, **다음 필수 실행 한 건/통과 조건**. 단계 상태는 `DONE/READY/RUNNING/STATE_UNKNOWN/BLOCKED/DEFERRED`를 사용한다. 원래 완료한 검증을 새 성과로 반복 집계하지 않는다.

## 7. 운영 보호·계획에서 제외한 작업

- 기존 Core 5분 예약, Korea, 승인 제거된 Iran R13 상태(`APPROVED_RETIRED_ABSENT`), R7/R38 다단계 실행기, 운영 source/config, 잠금·lease, SQLite·D1, 기존 수집·게시 주기·산식·공급자 예산·DNS를 임의 변경하지 않는다.
- B급이 실제 필요한 경우 공용 유지보수 계약/manifest/해시/원본 백업/복구/lease를 지키고 겹치는 운영 쓰기만 자원별 직렬화한다. 기능별 CMD·새 예약·Controller 전체 재설치·6 Runner 전원 유휴·전체 Core 재검사는 일반 A급의 선행 조건이 아니다.
- 사용자에게 CMD 실행/로그 전달 반복 요청을 하지 않는다. 기존 Runner 허용 operation으로 실행·회수한다. 운영 원자료·키·개인 경로·전체 config를 GitHub Issue/댓글·TXT·계획서에 노출하지 않는다.
- 출시 후 **다음 공식 발표에서 자연 자동 갱신 여부**는 별도 후속 추적으로 기록한다. 발표가 없는 기간의 `UNCHANGED`를 수집 실패로 판정하거나, 이 자연 관찰을 초기 UI 출시의 불필요한 선행 Gate로 만들지 않는다.

**다음 필수 행동(단일):** [공통 #783](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/783)의 실제 승인·설치된 `lib/market-score` 포함 **경로별 PC SHA-256 읽기 전용 operation** 인계를 받아 10개 잔여 `M` 파일의 실PC preimage를 회수한다. 조회 계약이 없는 현재 임의 셸·기능별 CMD·해시 추정으로 B를 우회하지 않는다. 이어서 기존 Writer B(19파일)·필요한 opt-in 설정 B·Core 수집·SQLite 저장/계산·D1·API/UI 실게시를 순서대로 수행한다. **자연 예약 검증은 실제 기능 출시 후 추가 후속작업**이다.
