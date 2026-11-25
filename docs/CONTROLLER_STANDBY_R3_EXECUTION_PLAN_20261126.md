# ZGMINI 보조 Controller 구축 — 실행계획 R3 및 승인 범위

- 기준일: 2026-11-26 KST
- 총괄 책임: 프로세스 총괄
- 총괄 저장소/브랜치: `ansqhd5774-Choi/zgmini` / `codex/controller-ops-lessons-20261105`
- 구현 저장소/브랜치: `ansqhd5774-Choi/zgmini-pc-control` / `codex/controller-standby-r1-20261126`
- 근거 연구: [R2 벤치마킹·기존 소스 조사](CONTROLLER_HA_RESEARCH_PLAN_R2_20261126.md)
- 공통 이슈: [#68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68) — 진행 중인 기존 담당/인수 범위를 보호
- **이번 범위: 운영 PC 동일 호스트의 Active 1 + Standby 1**
- 상태: R3 지시 접수 및 브랜치 정본 반영. 코드/CI/Windows 격리/운영 적용/실제 전환은 각각 독립 증거로 보고.
- R2 연구 완료, R3의 새로운 벤치마킹·전역 통계 조사 불필요. R2의 최종 1+2 후보는 이번 R3의 완료조건이 아니다.

## 1. 목표 및 제외

기존 운영 PC의 Controller 실행 조정 기능에 보조 Controller 하나를 추가한다. Active만 Supervisor·Runner의 신규 작업 시작을 제어한다. Standby는 준비·소유권 관측만 수행하며 Runner/Worker를 미리 실행하지 않는다. 기존 Watchdog/Guardian/독립 유지보수기의 안전한 복구 기능을 보존하면서 **승격 책임을 단일 경로**로 통합한다.

Controller 프로세스 장애에 대응하는 1차 단계다. 동일 Windows/전원/운영 E:·DB·Writer 자체 장애에서 실제 업무 복구가 된다고 주장하지 않는다. 두 번째 Standby, 별도 서버, etcd/Consul, quorum/외부 권위 저장소, 새 예약·서비스·계정·권한은 이번 범위에서 제외한다.

사용자 목표는 단순 계획서 추가가 아니라 **최소 Standby 소스 구현 + Windows 격리 경합시험 + 정규 승인 운영 적용 및 실제 전환·복귀 검증**이다. GitHub 기록만으로 완료 처리하지 않는다.

## 2. R2에서 재사용할 현재 소스 계약

| 기존 코드 | 재사용 기준 | 새 구현 연결 |
|---|---|---|
| `controller/supervisor.mjs` | 단일 `leases/supervisor`와 source hash·PID/nonce/bootAt, 6 Runner 실행·중단 | Standby는 lease 소유자 전에는 어떤 Runner도 시작하지 않음. stale Active는 신규 seat 시작 경계에서 차단 |
| `controller/common.mjs` | 로컬 원자적 `exclusive()` / `owner.json` / nonce / boot identity | 기존 소유권 재사용, 세대값이 꼭 필요한 경우 같은 권위 경로에서만 발급 |
| `tools/runner-watchdog.mjs` | 죽은 PID만 증명해 lease archive하고 Supervisor를 최대 시간당 3회 안전 복구 | **단일 승격 책임의 제어 진입점**으로 재사용. Watchdog 직접 spawn과 Standby 승격의 이중 실행 금지 |
| `tools/runner-watchdog-startup.vbs` | 로그인 Startup Guardian | 새로운 서비스/예약/Startup 추가 금지. 변경 필요성 입증 시 기존 정규 유지보수기 적용 |
| `controller/entry.mjs`, `controller/engine.mjs` | 고정 승인/7-key 요청·requestId/seat/resource lease·local ledger | 실제 신규 작업 시작 전에 유효한 소유권 검증; 결과 불명 Worker 재실행 금지 |
| `tools/maintenance-agent.mjs` 등 | 승인된 Controller 업데이트·백업/복구/CAS·installation lease | 설치/복구 중 관련 전환만 유보; 기존 유지보수기 자기 교체 금지 |
| `.github/workflows/pc-job.yml` | 기존 6자리 PC Runner 및 Issue concurrency | 워크플로 변경은 실제 필요성 입증 전 해당 없음 |

R2에서 확인한 설치 SHA·Runner online은 당시 읽기 증거로만 사용한다. 실제 운영 적용 직전 current source/CAS/lease와 대상 Windows 계정/경로를 정규 read-only 경로로 재확인한다. #2353·#3409의 이미 확인된 완료 증거는 재사용한다.

## 3. 필수 동작 및 불변식

1. 동일 호스트 **실효 Active는 항상 최대 하나**. Standby `READY` 상태는 Runner와 업무 Worker 실행 수 0.
2. Watchdog이 단일 승격/복구 책임자다. Standby가 별도로 죽은 owner lease를 archive하거나 제어권을 탈취하지 않는다.
3. Supervisor owner 원본 nonce·boot identity·PID 및 원자적 취득이 출처 증거다. heartbeat 만료만으로 owner 사망·권한 상실을 추정하지 않는다.
4. Active 소유권 상실 시 신규 Worker/Seat를 시작하는 모든 관련 **실제 진입 경계**에서 fail-closed. 기존 완료·실행 중·종료 불명은 requestId별 보존.
5. `ledger/<requestId>` 결과가 있으면 기존 완료 영수증 재사용. Worker 존재/상태 불확실·업로드 실패로 공급자/DB/D1/게시 작업을 자동 재실행하지 않는다.
6. 설치 중 `PAUSE`/`DRAIN`/`controller-install`·관련 작업 lease가 있으면 충돌하는 전환만 중단. 독립적 읽기·다른 정상 작업에 전역 HA Gate를 씌우지 않는다.
7. 이전 Active 복귀 시 우선권 선점 금지. 이전 owner가 살아 있거나 식별 불명확하면 `HOLD_LIVE_OR_UNKNOWN`.
8. 동작 지시·source SHA·manifest/승인/워크플로 계약 완화 없음. 권한 없는 프로세스 강제종료·lease 직접 삭제·DB 초기화 금지.

## 4. 실행 단계와 작업 산출물

### S1. 실제 경계·단일 승격 책임 확정

- 정상 경로: Startup Guardian → Watchdog → Controller Supervisor → 6 Runner → 승인된 PC job entry/engine.
- Watchdog의 `tick/decide/archiveDeadLease`, Supervisor `exclusive()`·Runner `launch`, job `entry/engine` 확인.
- 종료된 Supervisor의 자식 Worker가 남을 수 있는 조건·lease 보호·결과 복구 경계를 식별.
- Standby 실행 계정/경로는 승인된 기존 환경만 사용. Windows 격리 시험 fixture와 실제 설치 경로를 구분.

**완료:** 단일 승격 소유자, 작업 시작 경계, 인계 가능/불가 상태를 구현·시험 계약으로 고정.

### S2. 최소 Standby 소스 구현

- Standby는 `READY`로 기동하고 source·기존 owner 상태를 관측하되 업무·Runner 실행 금지.
- Watchdog이 **기존 owner 사망을 입증하고 해당 기존 lease를 정규 archive한 후**, 하나의 복구 경로를 선택.
- 같은 호스트 원자적 소유권을 실제 Supervisor가 획득한 뒤에만 `ACTIVE`.
- 승격 거부 시 Standby 유지, 원본 lease·상태·최초 실패 코드 보존.
- 필요 시 기존 Supervisor 신규 시작 경계에 소유권/nonce 재검증을 추가.

**완료:** 두 후보 격리 경합에서 유효 ACTIVE 하나, 중복 Runner 0개.

### S3. 기존 복구·작업 원장 연결

- Watchdog 정상 restart와 Standby 승격을 **한번만** 실행.
- Active/Standby와 requestId·source·seat/resource lease·보고 영수증 연결.
- `PASS/FAIL/BLOCKED` 완료 영수증 재사용, `RUNNING` Worker 재관측, `STATE_UNKNOWN` request 단독 reconciliation.
- 기존 결과 업로드 실패 시 로컬 JSON/TXT 회수, 기존 요청 자동 replay 금지.
- 이전 Active 재등장 시 Standby로 복귀하며 설치 source를 임의 교체하지 않음.

**완료:** 장애 시 이전 작업 유실/중복 0, 관련 보호상태 유지.

### S4. Windows 격리시험

아래 10개 필수 시험을 기존 격리 PC 또는 승인된 Windows 시험 환경에서 실행. 실제 운영 Core/Runner/Writer 종료·변경 금지.

| T | 조건 | 기대 |
|---|---|---|
| 01 | Active 종료 입증 | 단일 승격 경로·원자적 소유권 |
| 02 | 살아 있는 Active의 heartbeat 지연 | 강제 종료·승격 없음 |
| 03 | 후보 두 개 동시 승격 | 하나만 Active |
| 04 | 이전 Active 다시 등장 | stale owner 신규 업무 차단 |
| 05 | 전환 중 후보 종료 | 원본/원장/lease 회수 가능 |
| 06 | 오래 살아 있는 Worker | requestId 중복 시작 없음 |
| 07 | 유지보수·설치·복구 lease 진행 중 | 해당 쓰기 전환 유보 |
| 08 | JSON/TXT 원장·업로드 누락 | 로컬 영수증 보존·재실행 없음 |
| 09 | 별도 독립 업무 동시 진행 | 불필요한 전역 중단 없음 |
| 10 | Standby 자체 종료 | 정상 Active 영향 없음 |

**완료:** 시험 케이스별 PASS/FAIL/증거, 실행 시간·CPU/RAM·조회량 기록. 단위/모의 CI와 Windows 실측을 구분.

### S5. 적용물 확정·승인된 정규 설치

- 정확한 새 source SHA, 파일별 SHA-256, 기존 설치 source/원본 CAS/백업/lease, 실행 사용자/경로, Startup/Guardian/Watchdog 재사용 방식 고정.
- 새 서비스/예약/계정/보안 권한이 필요하면 구체적 파일·효과를 제시하고 **그 변경만 별도 승인**. 불필요하면 해당 없음.
- 기존 B 설치·독립 유지보수기 및 별도 C급 사용자 직접 단계의 원래 계약 사용. 현재 정상 실행을 빌드 완료로 무단 교체 금지.

**완료:** 운영 상태에서 Active 1 + Standby 1 실제 기동·source readback 및 안전 복구 수단 확보.

### S6. 승인된 운영 전환·복귀 검증

- 안전한 1회 오류 주입, 감지 → 유일 소유권 승격 → Runner·requestId·원장 인계 → 기존 허용 읽기 작업의 새 JSON/TXT·Issue 성공 → 이전 Active 재등장 차단 → Standby/정상 복귀.
- 운영 Writer/DB/Core/예약·공급자/D1 미변경 확인. 장애 전환 시간·첫 정상 작업 시간·실제 조회량/CPU/RAM을 측정.

**완료:** 실제 1회 이상의 안전 전환과 업무 정상 처리·복귀가 확인될 때만 1차 구축 완료. PC 전원/디스크 무중단, Cross-host 장애 내성은 해당 없음.

## 5. 완료 판정과 보고

| 항목 | 산출 증거 | 완료 구분 |
|---|---|---|
| 총괄 문서·전용 구현 브랜치 | GitHub commit·원격 파일 재조회 | 계획 반영 |
| 최소 Standby·단일 승격 코드 | 변경 파일 SHA·테스트·정확 branch HEAD·PR | 구현 |
| 격리 시험 | 10조건별 Windows 런타임 PASS/FAIL·시간/자원 | 격리 검증 |
| 정규 설치·운영 전환 | 승인·설치 SHA/Controller/Runner·원장·JSON/TXT·복귀 | 운영 완료 |

소스/CI 성공을 운영 HA 성공으로 보고하지 않는다. **전체 완료 기준은 Active 1 + Standby 1 실기동·단일 신규 작업 시작 권한·기존 원장/Worker 보존·Windows 경합·실운영 안전 전환/복귀**다. 미검증 수치는 0 또는 PASS가 아니라 미측정으로 표시한다.

**현재 단계:** R3 작업 범위 확정, 전용 브랜치 기준 반영. 이후 작업은 S1부터 필요한 최소 구현·테스트에 직접 착수하되 불필요한 R2 재조사/새 서비스/추가 Standby를 만들지 않는다.

## 6. 2026-11-26 구현 착수·원격 증거

| 구분 | 실제 확인 | 판정 |
|---|---|---|
| R3 총괄 계획·R2 범위 정정 | 본 문서 및 [R2 개정](CONTROLLER_HA_RESEARCH_PLAN_R2_20261126.md) 원격 반영 | DONE (문서) |
| 구현 브랜치 | [`zgmini-pc-control/codex/controller-standby-r1-20261126`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/tree/codex/controller-standby-r1-20261126), 신규 main 분기 | DONE (브랜치) |
| Standby 소스·Watcher·fencing | [Draft PR #3738](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3738), 최신 확인 source HEAD `fd2947ff9dbb25d168b30064eff45662ddbd5bbc` | SOURCE IMPLEMENTED / 미병합 |
| 소스 회귀시험 | Standby Node 단위시험 11/11 PASS, [Controller Run #45712678648](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45712678648), C996/Secret Scan PASS(이전 HEAD). 최신 HEAD는 10개 Windows TEMP 경합시험을 [Run #45714063369](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45714063369)에 추가함 | 이전 HEAD PASS / 최신 Windows 결과 QUEUED |
| Windows 실제 10개 경합·작업 인계 시험 | Windows용 실제 자식 프로세스·mkdir lease 경합 fixture 10종 구현, 기존 격리 Runner CI에 연결. 운영 전환/실제 Windows 실행 영수증은 미확인 | SOURCE READY / WINDOWS NOT VERIFIED |
| 설치/전환·복귀 | Watchdog B source 계약 `watchdog-b/contract.mjs`·`watchdog-b/upgrade.mjs`는 과거 고정 target에 한정. 현재 운영 Watchdog preimage SHA/계정·정규 새 B 인계 증거 미확보. 실제 운영 변경 없음 | NOT APPLIED / exact upgrade contract pending |

정확한 운영 source/설치 승인은 별도. 검증된 결과가 나오기 전 Draft PR을 main에 병합하거나 `INSTALL.json`의 Standby 활성화 값을 임의 조정하지 않는다. 완료 상태·변경 파일·실제 작업 결과는 이후 GitHub PR/Run 증거 기준으로 업데이트한다.

**최신 인수 지점:** Source-side 무변경 정상 운영 보호. 최신 PR HEAD의 격리 Windows Run/Job 실제 종료 상태를 회수 → 그 결과에 한정해 결함 수정. 운영 Watchdog B 업그레이드는 기존 계약이 과거 1회 고정 해시만 허용하므로 정확한 현장 installed SHA 및 별도 승인 manifest를 먼저 확보한 뒤 기존 정규 경로를 최소 확장한다. 동일 Runtime 미확정 상태에서 직접 `INSTALL.json` 수정 금지.

## 7. 2026-11-26 R3 안전성 재검토·후속 구현

대상 [구현 Draft PR #3738](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3738).
현재 확인된 소스 HEAD: `10452721e33984a2c817df8ffb085c5a8b986876`.

- **실패 조건 1 — 불완전한 Runner PID 목록:** 과거 구현의 heartbeat 판정은 `children:[]` 또는 일부 자식 목록을 종료 증거로 받아들일 수 있었다. 기존 Supervisor의 상태 쓰기와 프로세스 종료가 교차하면 남은 Runner를 놓칠 위험이 있다. `tools/runner-watchdog.mjs`에 `provenOldRunnerExit()` 추가: 이전 owner PID와 정확히 일치하는 6좌석/고유 PID 증거·모든 PID 종료가 확인된 경우에만 Standby 승격을 허용한다. heartbeat만 오래됐다는 이유로 승격하지 않는다.
- **실패 조건 2 — Watchdog nonce의 Runner 전달:** Standby 승격 후 동적 Supervisor import는 Standby 환경을 그대로 상속할 수 있다. `controller/standby.mjs`에서 부모 Watchdog IPC 신원 확인 직후 `ZGMINI_WATCHDOG_NONCE`와 `ZGMINI_WATCHDOG_PID`를 환경에서 제거한다.
- 두 조건에 대해 기존 `tests/controller-standby.test.mjs` 회귀시험 추가: 11 → **14개 작성**. 최신 [CI Run #45714992080](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45714992080)는 조사 시 대기 상태이므로 **14개 PASS 주장 금지**.
- 실제 프로세스/파일시스템 경합 10종은 `tests/controller-standby-windows-isolation.test.mjs`에서 기존 Windows 격리 CI에 연결. 역시 **실행 완료 증거 미확보**.
- 현행 Watchdog B 승인 계약의 과거 고정 소스 SHA로 신규 Standby를 설치했다고 주장하지 않는다. 실PC Watchdog preimage·새 정확 승인 파일/해시·실제 Windows 실행 경로 검증 전까지 **Draft 유지, 운영 변경 0**.

**다음 필수 실행:** 최신 Windows CI Run #45714992080의 Job/시험 결과를 회수하고 실패 조건을 최소 수정한다. 해당 CI가 성공하더라도 운영 전환 성공을 뜻하지 않는다.

## 8. 2026-11-26 Windows 실행물 승격 증거 보완

- **코드 근거:** [Draft #3738](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3738), 확인된 최신 HEAD `f898a18a5d561ad047b5a73ead74230fee7e2699`.
- **과거 CI:** R3 초판 11개 단위시험은 정확한 이전 HEAD의 [#45712678648](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45712678648)에서 PASS였음. 이후 코드가 변경되어 이 결과를 최신 HEAD의 성공으로 소급하지 않음.
- **현행 구현:** 추가 검증 7개를 포함한 단위시험 **18개 작성**, Windows 실제 임시폴더·자식 프로세스·lease 경합 및 WMI 관측 **11개 작성**. 최신 [#45715789661](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45715789661) Windows 격리 CI 실행 결과는 **미확인/QUEUED**.
- **확인된 실패 조건 수정:** 이전 Supervisor의 `cmd.exe` 자식 PID 6개가 종료되어도 실제 `Runner.Listener.exe`·`Runner.Worker.exe`가 생존할 수 있다. 승격에는 정확한 과거 6좌석/PID 종료 + 실제 Windows WMI의 Controller 경로에 속한 Listener/Worker **0개** 증거를 모두 요구. WMI 경로 인식·접근 불명은 승격만 보류. Watchdog IPC nonce·PID의 Runner 환경 전파 차단. 이전 리더 lease가 없는 정상 종료 뒤에는 확인된 이전 heartbeat/PID/WMI 종료 증거로만 전환.
- **미실증/직접 제약:** 아직 실제 Windows CI 완료, Watchdog→Standby 전체 IPC 전환, 승인된 운영 PC Controller 소스·Watchdog 설치 SHA 및 B 승인 raw manifest, 실제 Active/Standby 한 번의 전환·업무·복귀 증거가 없음. 과거 Watchdog B R3 #1393의 `STAGED`와 #1395의 별도 신규 프로세스 성공은 역사 증거이며 현재 신규 HA 운영 승인/설치 근거는 아님.
- **운영 보호:** `main` 미병합, Watchdog 또는 Controller 운영 파일 수정 0, 기존 6 Runner/Core/DB/Writer/D1/예약 변경 0. 새로운 공통 차단 Gate·서버·Runner·예약 생성 없음.

**다음 필수 실행 하나:** 최신 CI #45715789661의 정확한 Job 결과를 회수하여 결함 여부를 판정한다. 정상이라면 실제 Windows 격리 IPC 검증과 변경 대상의 설치 preimage 확정으로 바로 진행한다.

## 9. 신규 Standby 실행물 분리·운영 적용 인계 (2026-11-26)

현재 구현 [PR #3738](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3738)의 소스 파일은 서로 다른 **두 기존 정규 설치 계열**에 걸쳐 있다. 단일 PR·단일 파일 복사로 운영 적용하지 않는다.

| 운영 영향 | 설치 대상 | 기존 정규 적용 책임 | 의존 |
|---|---|---|---|
| Controller Active 실행·새 job 시작 소유권 검증 | `controller/common.mjs`, `controller/engine.mjs`, `controller/entry.mjs`, `controller/supervisor.mjs`, `controller/standby.mjs` 및 정확한 `host.json` manifest | Controller 독립 B 유지보수기 및 기존 Controller 승인 원장 | 먼저 설치. 기존 Watchdog의 Standby 활성화는 이때까지 OFF |
| Watchdog의 유일 승격 경로·Standby 자식 기동 | `tools/runner-watchdog.mjs` → `E:/ZGmini/automation/pc-watchdog/runner-watchdog.mjs`, 승인된 `INSTALL.json` | 기존 별도 `watchdog-b/upgrade.mjs` 계열 정규 단회 B 및 Guardian 자연 재기동 경로 | Controller 새 파일의 실제 설치·6좌석 운영 readback 이후 |
| 소스 검증 및 결과 공개 | `tests/controller-standby.test.mjs`, `tests/controller-standby-windows-isolation.test.mjs`, `.github/workflows/controller-maintenance-source-tests.yml`, `tools/automation-status.mjs` | GitHub CI·기존 허용 진단 | Controller/Watchdog 운영 설치 파일과 혼동하지 않음 |

### 실제 확인·불확실성

- Controller B는 기존 승인 source/target SHA·파일별 SHA256·백업·CAS·동일 승인 operation/6좌석·독립 후검사 계약을 따름. 원본 `main`과 운영 실제 SHA는 다를 수 있음.
- Watchdog B 과거 고정 구현의 `NEXT_TARGET=a2ec241d98a2ca93508443deb5b4688ecbccb905`와 `NEXT_SOURCE_SHA=3f99ea3357c6731cc9000bde1273db915cb07ba5fa480718194deb6330c29072`는 **이번 Standby 변경 승인 해시가 아님**. [#1393](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1393)는 역사적 STAGED이고, [#1395](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1395)는 후속 새 Watchdog 프로세스의 당시 인증 증거로만 재사용. 현재 설치 SHA·계정·Startup 부팅 상태는 적용 전 재조회.
- 정확한 새로운 Watchdog 설치 파일(코드+manifest) 범위와 **현재 설치 preimage**를 확인해 기존 정규 B 경로가 수용 가능한지 판단. 이전 고정 해시를 변경 없이 재사용하거나 `INSTALL.json` 설정을 수작업으로 활성화하지 않음.
- 실제 새 Standby 활성화 시 `ACTIVE 1 + READY 1`, Standby Runner spawn 0, Watchdog 독립 복구 경합 0, source SHA·nonce/boot·원장·6좌석 readback을 분리해 확인.
- Rollback은 정확한 검증된 백업·원본 CAS·승인된 복구 순서를 따름. 활성화된 Watchdog과 이전 Controller 버전의 불일치가 생기지 않도록 Watchdog 인계가 안전하게 비활성화된 증거를 우선 확보. 다른 공유 설치와 실제 충돌할 때만 #68 자원별 lease·정규 적용 조정 사용.
- **실제 Runtime 한계:** 동일 PC의 Wrapper `cmd.exe` PID 종료만으로 Runner.Listener/Worker 종료가 증명되지 않으므로 새 코드에는 WMI 읽기 전용 독립 확인을 추가했음. 격리 테스트 결과를 운영 적용 증거라고 하지 않음.

### 운영 적용 전 직접 필요한 증거만

1. 최신 PR HEAD의 정확한 Windows source/경합 CI 결과 및 실패 코드
2. 현재 운영 Controller 설치 SHA·Watchdog 설치 원본 SHA·설치 계정/경로·이전 백업 및 공유 B lease
3. 실제 변경 파일별 승인 manifest와 기존 정규 B 실행 계약의 지원 여부
4. 독립적으로 승인된 제한적 실제 전환 1회 및 기존 허용 읽기 작업 JSON/TXT 원장 readback

과거 #3409 설치·복구나 #1393 Watchdog 스테이징을 재실행하지 않는다. 새 인프라·상주 모니터·예약·전역 Gate를 추가하지 않는다.

### 2026-11-26 후속 Windows 경합시험 동기화 수정

- 구현 브랜치 최신 HEAD: `d050e4dfa54f3ea1a045db6d03320748eedc7403`.
- 수정 파일: `tests/controller-standby-windows-isolation.test.mjs` 한 파일. 첫 후보의 소유권을 고정 350ms 뒤 해제하던 fixture는 Windows CI가 늦게 스케줄링할 때 두 후보의 순차 획득을 경쟁 실패로 오판할 위험이 확인됨.
- 개선: 두 후보 `ACQUIRED`/`BUSY` 판단이 모두 관찰된 후, 부모가 release 신호 파일을 만들고 최초 점유자가 lease를 해제한다. 테스트는 운영 원본이 아니라 격리 TEMP 경로만 사용한다.
- 해당 변경은 테스트 신뢰성 수정이며 Standby 운영 인계 성공이 아님.
- 최신 Controller CI: [Run 45716201111](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45716201111) — 최종 결과 확인 전까지 `QUEUED/NOT_VERIFIED`. 같은 HEAD의 Automation Status는 SUCCESS, 다른 검사는 미완료. 오래된 HEAD의 PASS를 현재 HEAD에 전용하지 않는다.

**인계할 단일 다음 행동:** Run 45716201111의 실제 Windows Job 로그와 18개 단위·11개 격리시험 결과를 회수하여 필요 시 실패한 경로만 수정한다. 이후 기존 B 계약으로 Controller→Watchdog 단계별 적용의 실제 SHA·CAS·소유권을 확정한다.

## 10. 2026-11-26 Windows 격리 경합 실증 및 IPC 인계 검증 추가

**정확 HEAD `d050e4dfa54f3ea1a045db6d03320748eedc7403` 검증 회수 완료:**

| 증거 | 결과 | 해석 범위 |
|---|---|---|
| [Controller Maintenance Source Run #45716201111](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45716201111), Job #139562773112 | **SUCCESS** | Windows 격리 CI 전체 성공 |
| 위 Run의 `tests/controller-standby-windows-isolation.test.mjs` | **11/11 PASS, 0 FAIL, 0 SKIP** | 실제 Windows 프로세스/파일시스템 lease 경합과 TEMP WMI 검증; 운영 전환 아님 |
| 같은 HEAD의 Automation Status·C996·Secret Scan | **모두 SUCCESS** | 소스·보안 검사, 설치 아님 |

**다음 구현 증분:** [Draft PR #3738](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3738)의 후속 HEAD `eb796b1357cfc3b9039ca1136aa554c85963b981`에서 `tests/controller-standby-ipc-windows-isolation.test.mjs` 5개 통합시험을 새로 작성하고 기존 Windows 격리 CI에 연결함. TEMP에 복사한 Standby 및 최소 Supervisor가 실제 Node IPC로 `READY`→`PROMOTE`를 수행한다. 정상 승격/거부/기존 owner 보호/Watchdog 신원 불일치/두 후보 경합 모두 시험 대상이나 이 HEAD의 실제 CI PASS는 **아직 미확인**. [최신 Run #45717320783](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45717320783) 결과를 확인해야 한다.

- 격리 프로세스는 실제 운영 `E:` Controller·Watchdog을 읽거나 수정하지 않으며 TEMP 사본의 인증 경로와 소유권만 사용한다.
- 이 시험은 실제 Standby IPC 및 atomic Supervisor lease 취득 검증이지 **실제 Watchdog tick 전체 수명주기**·운영 Runner 6좌석의 안전한 재접속·업무 원장 인계/운영 전환 증거가 아니다.
- **다음 필수 실행:** 위 최신 Run의 실제 IPC 5종 결과 회수 및 실패 조건 최소 수정. 이후 동일 Windows 격리에서 실제 Watchdog 단일 승격 경로와 Controller 원장 인계에 필요한 남은 구현 경계를 검증한다.

## 11. 최신 HEAD Windows Standby IPC 통합시험 실제 성공

- 구현 저장소: [Draft #3738](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3738) / HEAD `eb796b1357cfc3b9039ca1136aa554c85963b981`.
- 실제 Windows CI: [Controller #45717320783](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45717320783), Job `139566593926` — **SUCCESS**. 기존 TEMP 프로세스/lease 11/11 PASS(0 FAIL), 새 IPC 후보·원자적 소유권 시험 **5/5 PASS(0 FAIL, 0 SKIP)**.
- IPC 실제 사례: `READY` 상태에서 lease/Worker 실행 없음 → 인증된 `PROMOTE` → TEMP Supervisor lease 소유권 원자 획득; 오래된 자식 종료 미입증 차단; 기존 owner 유지; Watchdog 신원 불일치 차단; 복수 후보 동시 승격에서 소유권 1개.
- 새 IPC 시험은 운영 모듈의 인증·전환 로직을 Windows TEMP에 복사하고, Supervisor에만 최소 격리 대체 구현을 사용함. **실제 운영 Watchdog tick, 6 Runner/Worker 원장 인계, 현장 Controller source 설치·전환·복귀에 대한 성공 증거가 아님.**
- 같은 SHA의 C996와 Secret Scan **SUCCESS**. Automation Status는 원장 갱신 당시 최종 결과를 별도로 확인 중.
- Controller 정규 B 업그레이드의 `installablePath()`는 `controller/[a-z][a-z0-9-]*.mjs`를 허용해 새로운 `controller/standby.mjs`를 원천 차단하지 않음. 그러나 승인된 전체 Target tree·변경 목록·manifest 해시·독립 승인 및 운영 source CAS는 별도 검증 필수. Watchdog B는 역사적 한정 대상 해시로 이번 새 코드를 자동 적용할 수 없음.
- **운영 적용 0회**, 이전 Controller/Watchdog 정상 운영 불변, PR Draft 유지. 신규 상주 서비스/예약/Runner·Provider/DB/D1 변경 없음.

**다음 필수 실행:** 기존 B 정규 설치의 실제 현행 Controller SHA·Watchdog SHA·변경 파일 목록을 읽기 전용으로 확정하고, 별도 Watchdog 정규 인계 경로와 기존 승인 범위를 맞춘다. 이미 완료된 16개 Windows 격리시험을 근거 없이 재실행할 필요는 없다.
