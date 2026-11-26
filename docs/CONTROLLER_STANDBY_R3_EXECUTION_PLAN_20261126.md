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
- 같은 SHA의 **C996·Secret Scan·Automation Status도 모두 SUCCESS**. 즉 최신 HEAD에 연결된 CI는 **4/4 SUCCESS**이며 각 Run ID는 Controller #45717320783, C996 #45717320700, Secret Scan #45717320687, Automation Status #45717320707.
- Controller 정규 B 업그레이드의 `installablePath()`는 `controller/[a-z][a-z0-9-]*.mjs`를 허용해 새로운 `controller/standby.mjs`를 원천 차단하지 않음. 그러나 승인된 전체 Target tree·변경 목록·manifest 해시·독립 승인 및 운영 source CAS는 별도 검증 필수. Watchdog B는 역사적 한정 대상 해시로 이번 새 코드를 자동 적용할 수 없음.
- **운영 적용 0회**, 이전 Controller/Watchdog 정상 운영 불변, PR Draft 유지. 신규 상주 서비스/예약/Runner·Provider/DB/D1 변경 없음.

**다음 필수 실행:** 기존 B 정규 설치의 실제 현행 Controller SHA·Watchdog SHA·변경 파일 목록을 읽기 전용으로 확정하고, 별도 Watchdog 정규 인계 경로와 기존 승인 범위를 맞춘다. 이미 완료된 16개 Windows 격리시험을 근거 없이 재실행할 필요는 없다.

## 12. 운영 Controller 최신 읽기·Standby 최초 기동 수정 (2026-11-26)

### 실제 운영 PC 확인 (기존 정규 A 경로, 단회)

- 원본: [#3746](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3746), 요청 `2d8874f1-52e6-4c13-8f2e-b60f3d7241a5`, [Run #45718424591](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45718424591).
- 정확 결과: `PASS/PROCESS_INVENTORY_COLLECTED`, `results/pc-process-inventory-45718424591-1-operating.json` 및 TXT 영수증 확인. 2026-11-25 23:05:29.613 UTC(한국시간 2026-11-26 08:05:29).
- 당시 실설치 Controller SHA `53fe24e22446d21a9fd4ee308d12b7cba7f37e25`; 유지보수기 source SHA `9a0378ffb96aa9f1403f74c189d3c39b30e4604e`. `runtimeState=HEALTHY`, `automationState=HEALTHY`, 전용 6 Runner 온라인, 설치 lease 미점유. 원본의 `maintenance.status=STATE_UNKNOWN`은 별개 제한된 조사 범위이며 Runtime 정상 결과를 취소하는 증거가 아님.
- 측정된 새 A 효과: 운영 쓰기 0·공급자 호출 0·D1 쓰기 0·자동 재시도 0. 해당 A Issue는 원본 JSON/TXT 검증 후 CLOSED/completed.
- **Watchdog 현장 설치 script SHA-256 및 그 설치 manifest raw SHA는 이 A 원본 결과에 없음.** 과거 Watchdog #1393 STAGED / #1395 새 프로세스 인증은 역사적 유효 증거지만 **현재 파일 CAS preimage**가 아니므로 그대로 신형 B 승인에 사용 금지.

### 구현 브랜치 소스 결함 수정

- 정상 최초 시작에서 Supervisor lease와 이전 heartbeat가 모두 아예 없으면 기존 `provenOldRunnerExit()` 검사 때문에 Standby가 영구 승격 거부될 수 있었음.
- `tools/runner-watchdog.mjs`의 `verifiedColdStandbyStart()`는 두 값이 모두 정확히 `null`일 때만 최초 시작으로 분류. 과거 owner/heartbeat의 한 쪽만 없거나 불명확하면 여전히 기존 6좌석 완전 종료 증거를 요구. 별도로 실제 WMI Listener/Worker 없음·소스해시·원자적 lease 보호를 계속 요구함.
- `tests/controller-standby.test.mjs`에 초기 기동/불명확한 이전 소유권 회귀검사 추가. 첫 Windows CI [#45718697371](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45718697371)는 기존 test가 옛 코드 문자열을 요구한 테스트 단정 불일치로 437건 중 1건 FAIL; 제품 로직 실패라는 근거 아님. 해당 테스트 정규식을 새 안전 조건에 맞게 최소 수정함.
- 최신 구현 HEAD `c0c4dcff6c8071b1318cca956e43ba82718c4975` / [Controller CI #45719063995](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719063995) — **현재 재검증 결과 대기**. 이전 HEAD 4/4 성공을 최신 SHA에 전용하지 않음.
- 기존 Worker/Runner 임의 종료·원본 lease 강제삭제·Controller/Watchdog 설치·main 병합·DB/Writer/공급자/D1 변경 없음. PR #3738 Draft.

**다음 필수 실행:** 최신 CI #45719063995의 정확한 실패/통과 영수증을 확인하고, 실제 배포 직전의 **Watchdog 설치 파일 SHA**를 기존 승인된 읽기 전용 경로로 확보해, Controller B 후행 Watchdog B의 현재 SHA·파일별 CAS·승인 manifest를 확정한다. 인증되지 않은 과거 SHA로 새 B를 요청하지 않는다.

## 13. Watchdog 정확한 B preimage 확보용 기존 A 보완 (2026-11-26)

- 실제 운영 최신 [#3746 / Run 45718424591](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45718424591)은 Controller 설치 SHA `53fe24e22446d21a9fd4ee308d12b7cba7f37e25`, 6 Runner 정상, B 설치 lease 없음, A 쓰기 0을 입증했으나 **독립 Watchdog 설치 스크립트/INSTALL.json 원본 SHA-256을 노출하지 않는 범위**임.
- 과거 Watchdog [#1393 STAGED](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1393)/[#1395 새 프로세스 인증](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1395)을 현재 파일 CAS 증거로 오용하지 않기 위해, **기존** `process-inventory-readonly`의 선택 probe를 추가하는 별도 읽기 전용 Draft [PR #3749](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3749)를 생성함.
- 정확 소스: `zgmini-pc-control/codex/controller-standby-watchdog-preimage-a-20261126` / HEAD `480f81a11286f656be07685d0417840c76196c37`. 변경 파일은 기존 `tools/pc-process-inventory-readonly.mjs` 및 해당 테스트 2개뿐. 새 Workflow·Job 유형·Runner·서비스·예약·권한 없음.
- 고정 Watchdog 디렉터리의 `runner-watchdog.mjs` 및 `INSTALL.json` 두 파일을 regular/no-link/크기·변경 여부 한정으로 읽고 SHA-256·manifest 일치·scope만 출력. 원본 바이트·명령줄·인증정보·운영 write 0. 실패는 `STATE_UNKNOWN`으로 표시.
- [소스 CI](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3749/checks)는 시작 시점 대기. 승인/병합 없이 운영 PC에 새 A 프로브를 제출하지 않음. PR #3738의 Standby Active 구현 Draft와 분리하여, 현재 정상 Controller/Watchdog을 변경하지 않음.
- 이후 기존 A에서 정확한 Watchdog raw preimage가 확보되면 Controller B 후행 Watchdog B의 대상 SHA·파일별 manifest·CAS를 현재 원본과 대조한다. **A에서 해시를 확인했다고 B 설치 승인 또는 전환 완료라고 표시하지 않음.**

## 14. 2026-11-26 최신 R3 CI 실행 영수증 회수

- **Controller #3738 정확 HEAD**: `c0c4dcff6c8071b1318cca956e43ba82718c4975`, Draft / 미병합.
- [Controller Maintenance Run #45719063995](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719063995) / Job `139572486091`은 **SUCCESS**. 실제 완료 Job 로그에서 Windows OS-TEMP lease/경합 **11/11 PASS**, Standby Node IPC 인계 **5/5 PASS** 확인. 모든 단계 완료, 작업 단계 실패 0.
- 같은 정확 HEAD의 [Automation Status #45719063900](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719063900) 및 [C996 #45719063953](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719063953)은 **SUCCESS**. [Secret Scan #45719063892](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719063892)는 이 조회 당시 **QUEUED**. 따라서 PR #3738 정확 HEAD **3/4 통과, 최종 CI 확정 전**.
- **Watchdog 사전 해시 A #3749**: 정확 HEAD `480f81a11286f656be07685d0417840c76196c37`, Draft / 미병합. [C996 #45719391727](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719391727), [Process Inventory Source #45719391743](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719391743), [Secret Scan #45719391479](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719391479)은 이 조회 당시 **QUEUED**. PR 이벤트의 operating/handoff 스냅샷 SKIPPED는 정상 분기 조건이며 운영 readback 실행으로 집계하지 않음.
- 확인 가능한 원본 증거가 없는 CI 대기를 테스트 실패로 바꾸지 않고, 동일 HEAD의 완료 결과가 바뀌지 않는 한 재실행·재요청하지 않는다. 다음 필수 행동은 **#3749 소스 검증 확정 → 정규 main 통합 검토 → 1회 기존 A 운영 Watchdog 설치 원본 SHA-256 조회 → 정확한 새 B/CAS 명세 준비**. #3738은 운영 B 보호·전체 실기 전환 완료 전까지 Draft 유지.
- 위 CI는 격리 소스 검증이다. 이번 진행에서 Controller/Watchdog 운영 파일·활성 Runner 6좌석·Core/DB/Writer/D1/예약을 변경하거나 신규 B를 실행하지 않았다.

## 15. 2026-11-26 exact-head CI 전진 및 현장 WMI 구분

- **PR #3738** 최신 HEAD `c0c4dcff6c8071b1318cca956e43ba82718c4975`: [Controller Maintenance #45719063995](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719063995), [Automation Status #45719063900](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719063900), [C996 #45719063953](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719063953), [Secret Scan #45719063892](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719063892) **4/4 SUCCESS**. 이 HEAD에서 Windows 격리 경합 11/11 PASS, Standby IPC 5/5 PASS가 실제 로그로 확인됨.
- Windows 격리 로그에는 `R3_WMI_TEMP_SCOPE=UNVERIFIED`가 찍혀 있음. 격리 계약 시험 통과와 **실제 설치 PC에서 Runner.Listener/Worker WMI 경로 확인 완료를 구분**한다. 독립 WMI 접근·실제 Controller/Watchdog tick→6좌석 전환·복귀는 운영 적용 전에 별도 현장 증거가 필요함. source CI만으로 완료로 승격하지 않음.
- **PR #3749** 최신 HEAD `480f81a11286f656be07685d0417840c76196c37`: [Secret Scan #45719391479](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719391479)와 [C996 #45719391727](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719391727) **SUCCESS**; [Process Inventory Source #45719391743](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719391743)은 본 조회 시 **QUEUED**, 실패 아님. 합계 관련 7개 CI 가운데 **6/7 PASS**(마지막 1개 미완료). PR·운영 미병합·미설치 보존.
- 다음 허용 실행: #3749 마지막 실제 source 테스트 결과 회수. 통과 및 current main 충돌·승인 검토 후 read-only A source를 정규 통합하고, 정확한 본 운영 PC Watchdog source·raw manifest SHA를 **한 번** 기존 A로 재조회. 이 증거 없이는 별도 Watchdog B를 승인·설치하지 않는다.

## 16. Watchdog A 소스 정규 통합 및 운영 읽기 전용 요청

- **#3749** source `480f81a11286f656be07685d0417840c76196c37` 관련 C996 [#45719391727](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719391727), Secret Scan [#45719391479](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719391479), Process Inventory Source [#45719391743](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45719391743) **3/3 SUCCESS**. 이 3개는 소스/격리 CI 증거이고 현장 Watchdog preimage 증명은 아님.
- 소스 전용 PR [#3749](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3749)은 exact head 검증 후 정규 **squash merge SUCCESS**, main SHA `f3e5b493975f32101ebfb4fb335288079fa0d1ca`. main의 `tools/pc-process-inventory-readonly.mjs`에서 고정 `controller-standby-watchdog-preimage-readonly`가 실제 존재함을 readback함. Watchdog/Controller 운영 파일을 설치·재기동하지 않음.
- 운영 PC 기존 A 요청 [Issue #3750](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3750), requestId `59dc4e79-7b13-4766-9d52-6b3b4a2c8e51`, 기존 `pc-process-inventory-readonly` / `role=operating` / 위 고정 probe로 **1회** 발행. [Run #45720992541](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45720992541)의 운영 Job `139578970797`이 진행 중인 시점의 기록; JSON/TXT 최종 영수증과 실제 SHA가 아직 없으면 미확인으로 유지.
- **#3738**은 아직 Draft/source-only, main 미병합. 다음 필수 행동은 원 요청 #3750의 실제 결과 JSON/TXT 조회 → source SHA-256, manifest raw SHA-256, installedMatch 및 scope 대조 → Controller와 Watchdog의 별도 B 계약·기존 승인 효과 검증. 운영 6 Runner/Core/Writer/DB/D1·현행 설치 보호 유지.

## 17. 운영 Watchdog 원본 CAS 확보 및 신규 B 입력 확정

- **실제 운영 PC A 조회 완료:** [요청 #3750](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3750) (requestId `59dc4e79-7b13-4766-9d52-6b3b4a2c8e51`) → [Run #45720992541](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45720992541), 운영 Job `139578970797` **SUCCESS**, 관측시각 `2026-11-25T23:24:54.534Z` / KST 2026-11-26 08:24:54. 결과쌍 `results/pc-process-inventory-45720992541-1-operating.json` 및 `.txt`를 main에서 직접 재조회·대조. `status=PASS`, `code=WATCHDOG_PREIMAGE_SOURCE_AND_MANIFEST_MATCH`, `installedMatch=true`, `operationalWrites=0`, `providerCalls=0`, `d1Writes=0`. Issue #3750은 결과검증 후 `completed`로 종결.
- **현장 설치 Watchdog 소스 preimage SHA-256:** `3f99ea3357c6731cc9000bde1273db915cb07ba5fa480718194deb6330c29072`. INSTALL.json에 선언된 `sha256`과 실제 스크립트 바이트가 **일치**. 기존 설치 `scope=RUNNER_RECOVERY_AND_MAINTENANCE_HANDOFF_V1`.
- **현장 설치 INSTALL.json 원본 bytes SHA-256:** `28c8017d469a0e2b13af96e01e686bae874d174b1ddac9e6a170ee2487bd6829`. 이 raw manifest 해시는 소스 SHA와 다른 CAS 입력이며, 과거 #1393/#1395의 고정값에서 추정하지 않음.
- **격리 확인용 정확한 신규 Standby 후보:** 구현 Draft [#3738](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3738) / HEAD `c0c4dcff6c8071b1318cca956e43ba82718c4975`. GitHub 원본 파일 바이트(base64) SHA-256을 독립 계산하여 역사적 소스 commit `a2ec241d...`의 실제 Watchdog SHA-256 `3f99ea...`가 일치함도 교차 검증함.
  - `tools/runner-watchdog.mjs`: `4029b768d8dcbb75353106b761b5da672433e693a8be033411c62abebfd27470`.
  - `controller/common.mjs`: `91e4ceb5d26412893cc047670a420338aa8ef293e95498f852ac0a2f5edd6cc6`.
  - `controller/engine.mjs`: `6112b5a357d6ecba2ffb299857c2649ee51ca97e1e7755162efd69337976769f`.
  - `controller/entry.mjs`: `407ea8693ab48a03b04ec77fe63f86d05537a37661b42c9ddcd55f5b36aa01d7`.
  - `controller/supervisor.mjs`: `5ec0952872adcaa16eb14adec614f024bac7264deb5b59fb68b9080f0edb0344`.
  - `controller/standby.mjs`: `e18c09b7e9b90fc483d5200e1e0c4741d2e4f93e049328566d710e37c21be7e7`.
- **현행 B 계약 제한:** 기존 `watchdog-b/contract.mjs`와 `upgrade.mjs`는 역사적 R2/R3 대상 SHA 및 당시 Controller 설치 SHA를 엄격히 고정함. 신규 Watchdog 후보 `4029b768...`와 현재 Controller 버전·INSTALL.json raw SHA, `installed.standby={mode:'ACTIVE_1_STANDBY_1',approved:true}`의 새 운영 효과를 기존 B 요청에 몰래 대입할 수 없음. 기존 B 계약을 임의 우회·재사용하지 않음.
- **다음 필수 구현:** 별도 정확 B 승인/manifest·CAS 계약에서 현장 Watchdog preimage 두 해시와 신규 후보 파일 SHA, 향후 **먼저 설치·readback 완료된 Controller**의 source SHA/파일 목록, Startup·ACL·Owner/heartbeat·자원 lease·백업/복구를 연결. 설치 적용은 현행 Controller B → 검증된 Watchdog B 순서. [#3738] Draft, 새 HA 운영 미적용; 운영 PC의 WMI 실제 Runner.Listener/Worker 경로·tick/승격/업무 인계/복귀는 여전히 미실증. 검증된 상태와 미완료 단계를 혼동하지 않는다.

## 18. Standby Watchdog B R4 계약·소스 통합 완료

- **대상과 계열:** Standby 기능 구현은 제어 저장소 Draft [#3738](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3738) / 정확 source HEAD `c0c4dcff6c8071b1318cca956e43ba82718c4975`; 새로운 Watchdog B 계약은 별도 [#3751](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3751) / `codex/controller-standby-watchdog-b-r4-20261126`. 서로 다른 변경 효과·운영 설치 단계를 혼동하지 않는다.
- **R4 최신 소스 확정:** PR #3751 HEAD `bb87feecdee470ead02cc6eae7a4e744143c188c`, 관련 exact-head [Controller Maintenance #45722274900](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45722274900), [C996 #45722274949](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45722274949), [Secret Scan #45722274906](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45722274906) **3/3 SUCCESS**. Windows Controller Maintenance 로그의 신규 R4 B 4개 테스트 **4/4 PASS**, 전체 실패 0.
- **소스만 main 통합:** #3751 정규 squash merge `f09f5a5510bd11e6e6f869ea1728d940939a5e59`. main readback에서 `watchdog-b/standby-r4-contract.mjs`, 기존 `watchdog-b/upgrade.mjs`의 R4 경로와 비활성 `approvals/watchdog-upgrades/c0c4dcff6c8071b1318cca956e43ba82718c4975.json` 확인. **approved=false**, 운영 Issue B 미발행·설치·재기동·실제 승격·복귀 0회.
- **계약 보안/기존 경로:** 변경 파일 4개(신규 R4 계약, 기존 Watchdog B upgrader, 기존 회귀시험, 정확한 비활성 B 후보 승인 명세). R2/R3 기존 승인 상수·경로는 변경하지 않음. R4는 운영 A #3750에서 확인한 **스크립트 preimage `3f99ea3357c6731cc9000bde1273db915cb07ba5fa480718194deb6330c29072` 및 INSTALL raw SHA `28c8017d469a0e2b13af96e01e686bae874d174b1ddac9e6a170ee2487bd6829`**, 신규 후보 Watchdog `4029b768d8dcbb75353106b761b5da672433e693a8be033411c62abebfd27470`, Controller 필수 5파일 SHA, 별도 승인된 **실제 설치 Controller SHA**를 각각 검사. Controller SHA는 승인 manifest에서 구체화하고 host.json 및 파일별 실제 바이트 해시와 함께 대조하므로 main 이동만으로 새 코드 핀을 반복 수정하지 않음.
- **운영 적용 규칙:** (1) #3738 Standby 소스 정규 통합 검토 및 정확한 Controller B 승인 manifest 준비 → (2) 독립 유지보수기 B 설치·검증, 6 Runner·실제 WMI 경로·Controller SHA·host.json/readback → (3) 실제 검증된 Controller SHA로 R4 비활성 후보 manifest의 정확한 B 승인/파일해시/CAS·복구 계약 확정 → (4) 기존 단회 Watchdog B의 승인된 backup/ACL/source&manifest CAS 경로로만 stage, 자연 재기동의 독립 승인 효과 확인 → (5) 실제 Active/Standby/업무 인계/복귀 영수증. 기존 R4 명세의 `approved=false`는 실행 승인 아님.
- **복구/불명 상태:** Watchdog B의 기존 단회 claim·원본 양 파일 백업·prewrite CAS·ACL 검사·중단 후 `RECOVERY_REQUIRED` 판단을 재사용하지만, R4 실제 운영 파일 교체 후의 Guardian 자연기동/복귀와 정확한 복구 적용 증거는 아직 없다. stage 또는 전환 결과 불명 시 원래 요청/백업/lease를 먼저 재조회하고 임의 재요청·수작업 복원·강제 프로세스 종료·lease 삭제를 하지 않는다. `R3_WMI_TEMP_SCOPE=UNVERIFIED`는 격리 성공이 운영 PC WMI 실측을 대신하지 않는다는 별도 미해결 범위다.
- **다음 필수 실행:** #3738의 현재 Draft/source와 최신 main을 대조해 승인된 Controller B 설치 source·전체 파일해시·preimage·복귀 계약을 완성하고 실제 운영 전 단계로 진전. R4 source 병합만으로 Standby 구축 완료라고 기록하지 않는다.

## 19. 현장 Controller 이력 분기와 기존 selective B 확인

- 운영 원본 [#3746](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3746)의 실제 Controller SHA `53fe24e22446d21a9fd4ee308d12b7cba7f37e25`와 Standby 후보 [#3738](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3738) HEAD `c0c4dcff6c8071b1318cca956e43ba82718c4975` 간 Git compare는 **diverged**. 표준 응답의 ahead 2904/behind 66과 최대 표시 300파일은 직접 변경 대상 전수 목록이 아님. 이 분기 상태로 현재 main 전체 또는 개발 브랜치를 누적 B 설치하면 다수 비승인 파일이 섞일 위험이 있으므로 단순 full-tree 교체를 진행하지 않음.
- 실제 설치된 독립 유지보수기 source `9a0378ffb96aa9f1403f74c189d3c39b30e4604e`의 `tools/maintenance-contract.mjs`, `tools/update.mjs`에서 **기존 `selectiveSource` 경로가 구현됨**을 정확한 source ref로 확인. `ZGMINI_CONTROLLER_SELECTIVE_SOURCE_V1`, `controllerOnlyInstall=true`, `pc-controller-maintenance`, target overlay commit의 **단일 부모가 정확히 현행 설치 SHA**, main에 출처 파일/approved pin 존재, 정확한 allowFiles=diff, import closure, 이전 운영 config와 6좌석 보존, 백업·복구/사후 A 검사 계약을 유지함. 이 경로는 source 존재 확인이며 **운영 실제 selective B 적용 성공 증거는 아님**.
- 따라서 **다음 구현 실행**은 #3738의 소스 main 통합 및 최신 의존 검증을 선행 확인하고, 설치 원본 `53fe24e...`에서 출발하는 정확한 Controller-only selective overlay와 `approvals/controller-selective-targets/<target>.json`, `approvals/controller-updates/<target>.json`을 기존 허용 계약으로 준비하는 것. R4 Watchdog B 소스는 이미 main [#3751](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3751) 통합 상태지만 승인 후보 `approved:false`이며 실운영 source/manifest 교체하지 않음.
- 구현 PR #3738에 이 선행조건과 R4 source 통합 결과를 [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3738#issuecomment-7177845436)로 연결. GitHub 댓글은 다른 대화의 실제 자동 인수/실행 영수증이 아님.

## 20. Standby Controller 선택적 B — 설치 원본 기반 최소 6파일 소스 확정

- 기준 운영 Controller 실측 출처는 기존 A [#3746](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3746) / `53fe24e22446d21a9fd4ee308d12b7cba7f37e25`; 독립 유지보수기 `9a0378ffb96aa9f1403f74c189d3c39b30e4604e`. 실제 설치 대상의 현재 동일성은 **운영 B 적용 직전 재조회 필요**, 과거 실측을 영구 현행으로 확정하지 않는다.
- 독립 Git 객체로 실제 설치 SHA만을 **유일한 부모**로 가진 Standby 선택적 소스를 만들었다. 최종 후보 `b91340d5047daf753e1c17a5c966e4d2aecea586`, 브랜치 `codex/controller-standby-selective-r3-minimal-20261126`; GitHub `compare(installed, target)`가 **1 commit ahead / 0 behind / 6 Controller-only changed paths**임을 확인. `controller/common.mjs`, `engine.mjs`, `entry.mjs`, `standby.mjs`, `supervisor.mjs`은 소스 CI 4/4 성공한 #3738의 고정 후보 바이트. `controller/operations.mjs`만 설치 원본에 `CORE_STATUS_STAGES` export 6줄을 추가한 최소 blob `63a5135ce67d5339b70e6509e44974ccf480b3ba` / raw SHA-256 `d4a76910806cba861b3253f5fd24eccc8968fcbaa66133999483034b2f661cd3`으로 구성.
- **중간 결함 2건 처리:** (1) 5파일 overlay `8da8834d5fde333850ad02269ef080cf1de4ce76`는 신규 engine이 요구하는 `CORE_STATUS_STAGES`가 설치된 operations에서 미export되어 **실제 import failure 조건**; (2) 6파일 overlay `8c4d5234cb4e4b60c8e057946724ae9438eea471`는 #3738 전체 operations 바이트를 복사해 Standby와 무관한 R6/Core 진단 효과까지 적용되는 범위 초과. 둘 다 **운영 미설치·B 불발행**, 각각의 이전 승인 후보/핀을 Draft PR에서 삭제했다. 정확한 최소 파일 보완으로 복구함.
- 새 [Draft PR #3752](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3752), 브랜치 `codex/controller-standby-selective-b-20261126`에서 `approvals/controller-selective-targets/b91340d5047daf753e1c17a5c966e4d2aecea586.json`, `approvals/controller-updates/b91340d5047daf753e1c17a5c966e4d2aecea586.json`에 **기존 B manifest/selectiveSource** 필드와 정확한 6파일 해시, 메인 출처 `f09f5a5510bd11e6e6f869ea1728d940939a5e59`, `controllerOnlyInstall=true`, 버전별 백업/설치 SHA 복구, 기존 `core-status` 사후 A를 사용. `config/operations.json`, 기존 6좌석, Watchdog, 업무 코드, 예약, Provider/Writer/DB/D1은 overlay diff에 포함되지 않음.
- 공통 Controller Maintenance Windows CI에 기존 워크플로의 3개 R3 선택적 B 회귀시험을 연결했으며 [정확 HEAD CI 검사](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3752/checks)는 작성 당시 **QUEUED**, 아직 PASS로 기재하지 않음. 범위를 넓힌 기능용 신규 Runner/예약/Workflow는 추가하지 않았다.
- 개발 소스 [#3738](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3738)은 4/4 source CI 성공에도 **Draft/미병합 유지**, 실운영 WMI/Owner·Runner.Listener 신원/자식 실행 보장, 정규 B 실적용 및 실제 승격/복귀는 미검증. #3752의 B 후보 역시 Draft/미병합, **B Issue 미발행**, Controller/Watchdog 설치·재시작 변경 0. 다른 저장소/작업의 운영 효과를 대신 인증하지 않는다.
- 다음 필수 행동: #3752 exact-head 검사 결과·실패 수정 → custom six-module import/export와 현행 설치의 검증 → 승인된 운영 Controller B의 정규 소스/rollback/후검사 확정 → 실PC Controller readback → 별도 Watchdog R4 `approved:false` 명세 활성화 여부 판단.

## 21. Controller B 최소 소스 결정 — R6 영향 제거

- 이전 §20에 기록한 `8c4d5234cb4e4b60c8e057946724ae9438eea471`은 운영 **미설치**, 현행 승인 대상 **아님**. 검토 과정에서 `controller/operations.mjs` 전체를 과거 설치본 위에 복사하면 Standby와 무관한 R6/Core 관측·진단 로직도 함께 교체된다는 반대 증거를 확인해 교체 범위를 줄였다.
- **최신 단일 적용 후보:** `b91340d5047daf753e1c17a5c966e4d2aecea586` (브랜치 `codex/controller-standby-selective-r3-minimal-20261126`), 유일 부모=실측 설치 Controller `53fe24e22446d21a9fd4ee308d12b7cba7f37e25`. GitHub 비교 **ahead=1, behind=0, 6개 변경 모두 Controller .mjs**, 그중 `controller/operations.mjs`은 정확히 6개 추가행만 있으며 기존 소스 내용은 불변. 기존 설치 원본에 `CORE_STATUS_STAGES` 상수만 추가하고 R6/이란 Task/타 데이터 계산의 실행 경로는 보존.
- 새 `operations.mjs` blob `63a5135ce67d5339b70e6509e44974ccf480b3ba`, 바이트 SHA-256 `d4a76910806cba861b3253f5fd24eccc8968fcbaa66133999483034b2f661cd3` (GitHub raw source 기준, 해시 계산 알고리즘은 표준 SHA-256 검산). 나머지 5파일은 #3738 exact source 바이트와 동일.
- [Draft PR #3752](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3752)에서 이전 `8da8834d...`(import export 누락)와 `8c4d5234...`(R6 범위 초과) 승인 후보 및 main 선택적 Pin을 **각각 삭제**; 올바른 `approvals/controller-selective-targets/b91340d5047daf753e1c17a5c966e4d2aecea586.json` 및 `approvals/controller-updates/b91340d5047daf753e1c17a5c966e4d2aecea586.json` 두 정확 파일만 유지. 버전별 백업/원본 SHA 복귀·6좌석·`core-status`·권한·lease는 기존 계약.
- 기존 Controller Maintenance Windows CI에 추가된 회귀시험은 고정 raw manifest 및 main Pin 허용/거부뿐 아니라 immutable Git parent, 6파일 Git diff, 실제 Git blob SHA-256, config 무변경, 기존 `validateControllerImportClosure` 전체 분석, minimal operations 소스 원본 바이트 복원을 실행하도록 보완. 최신 HEAD `0f9a135f456746e3a5cac6ea360caffb897a8864`의 [CI](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3752/checks)는 확인 시점 **QUEUED**, PASS로 미기재. 운영 B·Standby 전환·Watchdog 재시작은 **미실시**.
- 이후 실행은 #3752 실제 CI 검증/실패 수정, #3738 리뷰·필요한 안전 검증, 현장 설치 SHA/WMI/Runner owner 재조회, 정확한 B 계약의 승인·설치·원본 readback, Watchdog B 후행 검증 순서.

## 22. 선택적 Controller B 최신 CI 완수 및 WMI 읽기 전용 진단 분리

- [#3752](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3752) 정확 HEAD `0f9a135f456746e3a5cac6ea360caffb897a8864`: [Controller Maintenance #45724552810](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45724552810) **SUCCESS**, Windows Job `139590985357` 82개 단계 **실패 0**. 실제 Windows 로그에서 신규 R3 selective contract 회귀시험 **5/5 PASS**: 승인·원본 SHA, 거부 조건, 정책 불변, 커밋 단일 부모+정확한 6개 파일 raw 해시+full module import closure, `operations.mjs` 최소 export 외 소스 보존. 동일 HEAD [C996 #45724552796](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45724552796), [Secret Scan #45724552803](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45724552803) 모두 **SUCCESS** — 총 **3/3 PASS**.
- 개발 대상 `b91340d5047daf753e1c17a5c966e4d2aecea586` 및 해당 `approvals/controller-updates/...`, `approvals/controller-selective-targets/...`는 #3752 **Draft/미병합**. 운영 설치 B Issue를 발행하지 않았으며, 이 CI는 운영 PC 실제 설치·6좌석·WMI·승격 검증이 아님.
- 실행 경로에 필요한 기존 WMI 프로세스 이름·PID 재고는 #3746의 read-only A에서 확인했지만, 실제 Standby 승격을 판단하는 **WMI ExecutablePath의 정규화/원본 연결**은 미검증임. 이를 해결하기 위해 같은 `pc-process-inventory-readonly` A 작업의 **고정 operating 전용 optional probe**를 [Draft PR #3757](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3757)로 구현. 프로세스 두 종(`Runner.Listener.exe`, `Runner.Worker.exe`)의 CIM/WMI 실행파일 경로를 기존 Controller runners 디렉터리에만 정규화 분류하며 외부로는 **상태·유한 카운트만** 제공, PID·경로·cmd·키/환경변수는 게시하지 않음. 경로 접근 실패나 불명확한 파일은 `STATE_UNKNOWN`; 단회 현재 관측이므로 `promotionApproved=false` 고정.
- #3757은 source-only/검증 중이고 **운영 A 미요청**; source CI 통과 후 필요하면 main 정규 통합 → 공식 기존 A 단회 readback → 실제 WMI path 관측을 분리 기록. 이 A 진단 결과는 **실제 old PID exit/Watchdog IPC·Runner takeover 증거를 대체하지 않음**. #3738, #3752의 Draft 및 비활성 Watchdog B `approved:false` 유지.

## 23. 운영 WMI A 실제 불완전 증거 및 원인 분해

- 소스 전용 [#3757](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3757): 정확 HEAD `07e731b70e796e8261ea0255fa8d33bb5afdc756`에 [Process Inventory #45725292974](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45725292974), [C996 #45725293016](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45725293016), [Secret Scan #45725293089](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45725293089) **3/3 SUCCESS**. 신규 기존 A 인증·실행파일경로 비공개·불명 처리 3/3 유닛 PASS. 소스만 정규 squash merge `21c60dd54050b89790c6c09d87b4b38c9cdfcadd`, main readback으로 고정 `controller-standby-runner-wmi-readonly` 확인. PC 설치 파일은 교체하지 않음.
- 기존 공식 `pc-process-inventory-readonly` operating A 단회 [Issue #3758](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3758), requestId `b8a2e9f4-0a7c-4fdd-8b1f-c7db502d99ce` → [Run #45725713948](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45725713948) / Job `139594921659`. 정확 main `21c60dd...`에서 실행된 실제 JSON/TXT `results/pc-process-inventory-45725713948-1-operating.json/.txt`를 직접 회수함.
- **실제 관측** `STATE_UNKNOWN / STANDBY_WMI_EXECUTABLE_PATH_UNVERIFIED`, UTC `2026-11-26T00:02:42.050Z`. Controller 경로와 정규화가 확인된 `Runner.Listener.exe=6`, `Runner.Worker.exe=1`; **별도 WMI 프로세스 실행파일 경로 1개 미확인**. WMI API 자체가 불가한 것과 다르다. `promotionApproved=false`, `operationalWrites=0`, `providerCalls=0`, `d1Writes=0`. Job exit 2는 상태를 PASS로 포장하지 않고 거부한 기존 fail-closed 동작. A 요청 재실행하지 않으며 이 결과를 장애 또는 운영 실증 PASS로 오해하지 않음.
- 이 미확인 1개가 **Listener/Worker 어느 계열이고 왜 누락됐는지**를 기존 A에 안전하게 구분하기 위해 별도 [Draft #3759](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3759)를 생성. 판별 정보는 `unknownListenerCount`, `unknownWorkerCount`, `missingWmiPathCount`, `nonAbsoluteWmiPathCount`, `canonicalizationFailedCount`의 집계 숫자만 포함. PID·실행파일 원경로·환경변수·명령·에러 원문 비공개, 원래 `STATE_UNKNOWN` 안전 결정과 `promotionApproved=false`는 유지. 새로운 Controller/Watchdog/DB/Runner 운영 변경을 추가하지 않음.
- **남은 필수 선행:** #3759 exact-head CI → 기존 A 정규 source 통합 후 원인 분해를 위한 새 1회 공식 A 관측 → 불명 1개의 실제 원인별 최소 대응 여부 결정. Source #3738 및 Controller B #3752는 여전히 Draft/미설치, Watchdog R4 `approved:false`. 실운영 B·Standby 승격은 필요한 안전 증거 전에는 진행하지 않는다.

## 24. WMI 누락 실행파일 정확 원인 및 지속 프로세스 구분

- 실제 WMI A #3758에서 `Runner.Listener.exe=6`, `Runner.Worker.exe=1`, **원본 경로 미확인 1**이라는 `STATE_UNKNOWN`을 받았음. 이는 WMI API 전체 실패가 아니라 *개별* `ExecutablePath` 미검증. 기존 실패 요청을 재실행하지 않고 경로 누락 원인 판정 집계만 기존 A에 최소 추가함.
- 별도 [PR #3759](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3759), exact HEAD `8b39d1c98937031be1b9b5848079055ffba63700`, [Process Inventory CI #45726061407](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45726061407) + [Secret Scan #45726061422](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45726061422) + [C996 #45726061521](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45726061521) **3/3 PASS**. 원인분류 회귀시험 `R3 WMI exact unknown process type and cause...` PASS, source-only merge `1f41c70437a9dc761a80964547de86f24d1f99a8` 및 main readback 완료. 변경은 기존 A의 타입·누락사유별 비공개 *카운트*만: PID/경로/계정/명령/서비스명 원문 비공개. `STATE_UNKNOWN`, `promotionApproved=false` 유지.
- 새 정당한 원인 분해 A [Issue #3760](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3760) / requestId `d3908cb7-1782-4663-9f2a-2e88aa56432f` → [Run #45726382965](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45726382965) / Job `139597197473` / `results/pc-process-inventory-45726382965-1-operating.json/.txt`: 실제 UTC `2026-11-26T00:08:19.741Z`. **Controller 경로 Listener 6, Worker 1, 추가 경로미확인 Listener 1, 미확인 Worker 0**. 정확 이유: **WMI `ExecutablePath` 값 누락 1**, 비절대경로 0, 파일 정규화 실패 0. 최종 `STATE_UNKNOWN / STANDBY_WMI_EXECUTABLE_PATH_UNVERIFIED`, 수집 단계 exit 2는 기존 fail-closed 결과이며 `operationalWrites=0,providerCalls=0,d1Writes=0`.
- 신규 조사 대신 **이미 저장된 별개 시각의 정상 스냅샷 A [#3746](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3746)** 재조회: UTC `2026-11-25T23:05:29.613Z`에 Listener **7**, 그중 세션 1 **6개**, 세션 0 **1개**, 독립 `actions.runner` 서비스 **1개 RUNNING**. 이 시각·시스템 상태가 약 1시간 뒤의 `#3760` 결과와 수적으로 일관되므로 추가 Listener가 이번 A 수행 때문에 생겼다는 가설을 지지하지 않음. 그러나 **2026-11-26 새 미확인 Listener의 PID ↔ session0 ↔ 실제 actions.runner 서비스 소유자/조상 직접 연결은 미입증**, 과거 개수로 현재 인과를 확정하지 않음.
- WMI 검사에서 미확인 Listener를 무조건 무시하는 패치, Windows service 세션만으로 이탈을 입증했다고 가정하는 패치, 정확 B 후보 교체·설치·Watchdog 승격은 **하지 않음**. 다음 필요 증거는 기존 A 공식 범위의 고정·비공개 **Win32_Process ParentProcessId ↔ 등록된 actions.runner 서비스 ProcessId/Owner session** 대조로 해당 추가 Listener가 운영 Controller Supervisor/여섯 좌석과 분리된 것인지 판별하는 최소 관측. 그 결과에 따라 관련 없는 서비스는 독립 증거로 제외 가능한지 별도 안전 회귀검증 후 실제 운영 B로 돌아간다. 기존 유효 source CI와 R3 #3752의 3/3 PASS를 반복하지 않음.

## 25. 추가 Listener 서비스 소속 독립 증거 수집 계약

- **확인된 현재 증거:** [#3760](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3760) / [Run #45726382965](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45726382965): Controller Runner.Listener 경로 확인 6개, Worker 경로 확인 1개, **별도 Listener 1개의 WMI `ExecutablePath` null**; 실행파일 정규화 실패 0. 과거 정상 A #3746에는 Listener 총 7개 중 세션1 6/세션0 1 및 RUNNING actions.runner 서비스 1개. 둘은 수적으로 일치하지만 동일 PID/서비스 조상 관계는 아직 미확인. `STATE_UNKNOWN`과 승격 차단 유지.
- 이 정확한 미확인 부분만 구분할 고정 A 소스 [Draft PR #3764](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3764), 전용 브랜치 `codex/controller-standby-service-lineage-a-20261126`, 현재 HEAD `cb57fc8c84c560dfe418da4c4270e5c4ebd335b7`. 기존 `pc-process-inventory-readonly`의 **동일 operating 고정 probe**만 확장함. Windows의 현재 `Win32_Process`를 최대 4096개 상한 내 로컬 처리, `Win32_Service` 중 RUNNING `actions.runner.*` 서비스의 ProcessId를 찾고 미확인 Listener의 ParentProcessId 조상을 최대 8단계 확인. 외부 JSON/TXT에는 `unknownSession0Count`, `unknownServiceAncestorCount`, `unknownSession0ServiceAncestorCount`, `serviceObservationUnavailableCount`의 **집계 숫자만** 게시하고 원문 PID/부모 PID/세션별 대상 경로/서비스명·계정·명령/키/환경은 비공개 유지. 필요한 시스템 증거가 빠지면 기존 `STATE_UNKNOWN` 유지, `promotionApproved=false` 고정. 새 승인 경로·Runner·예약·프로세스 종료·Core/DB 변경 없음.
- #3764에 집계·서비스 조회 불능·비공개 및 Windows 고정 PowerShell 호출 확인을 위한 신규 회귀시험 **2개 작성**. exact-head CI [Process Inventory #45727024198](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45727024198), [C996 #45727024302](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45727024302), [Secret Scan #45727024161](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45727024161)는 기록 당시 **QUEUED**(0/3), 통과/병합으로 기록하지 않음.
- 이후 필수는 동일 HEAD CI 실결과 회수/코드 오류시 최소 수정 → source-only 정규 main 통합 여부 판단 → 기존 승인 A의 새 requestId 1회로 현재 **서비스 조상 연결** 독립 확인 → 실제 controller supervisor/6-seat 세션과 무관함이 입증된 경우에만 Watchdog 후보의 fail-closed 식별 조건을 최소 수정 및 관련 회귀검증 고려. 서비스 존재/세션0만으로 unknown 프로세스를 그냥 무시하지 않음. #3738 Standby 및 #3752 Controller B는 여전히 Draft, 운영 설치/전환 **미완료**.

## 26. 서비스 계통 실측과 Watchdog 단일 예외 가드 최소 수정

- **#3764 정확한 서비스 조상 진단 코드**: [PR #3764](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3764) HEAD `cb57fc8c84c560dfe418da4c4270e5c4ebd335b7`; [Process Inventory #45727024198](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45727024198), [C996 #45727024302](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45727024302), [Secret Scan #45727024161](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45727024161) 정확 HEAD **3/3 SUCCESS**. 신규 서비스 lineage·fail-closed Windows 격리시험 **2/2 PASS**. 정규 squash main merge `1ed37eb16bac07df22c782b4a2e48f3280c2c25e` 및 main source readback. 운영 설치 Controller·Watchdog 변경 없음.
- **실제 공식 운영 A**: [Issue #3767](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3767), 고유 requestId `83441ac6-f819-4f52-9363-130d40495b8a` → [Run #45727859397](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45727859397), 운영 Job `139602156378`. 정확 실행 소스 main `1ed37eb...`, JSON/TXT 쌍 `results/pc-process-inventory-45727859397-1-operating.json/.txt` 직접 검증, 시각 `2026-11-26T00:19:42.924Z`. Controller Runner.Listener 정확 경로 **6개**, Controller Worker **1개**, 별도 Listener의 WMI `ExecutablePath` 비어 있음 **1개**, 그 1개는 **session 0**이며 같은 WMI 조회 시점의 등록·RUNNING `actions.runner.*` 서비스 PID에 부모·조상 연결 **1개** 확인. 서비스 조회 실패 건수 0, 미확인 Worker 0, 정규화 실패 0. 외부 공개 출력은 고정 타입/카운트뿐이며 PID/경로/서비스 원명/계정·환경변수는 비공개. **A 최종 상태는 `STATE_UNKNOWN/STANDBY_WMI_EXECUTABLE_PATH_UNVERIFIED`**, `promotionApproved=false`, 운영/공급자/D1 쓰기 각 0. Exit 2는 원래 안전 정책대로 이 불확실성을 PASS로 조작하지 않은 결과; #3767에 [결과 주석](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3767#issuecomment-7178693613) 남김.
- **기능 원인 최소 수정**: [Standby Draft #3738](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3738)의 Watchdog `classifyRunnerExecutableProof`와 실제 Windows WMI 조회를 해당 운영 증거에 맞춰 변경. `ExecutablePath==''`인 **Listener 정확 1개**만 `sessionId===0`, 등록된 RUNNING 서비스 조상 `serviceAncestor===true`, 조회 성공 `serviceObservationAvailable===true`가 한 번의 WMI 스냅샷에 전부 있어야 기존 Controller 실행 객체 스캔의 예외로 분류; 같은 PID 중복·두 개 이상 예외·다른 Listener/Worker 경로 누락·권한/WMI 실패는 `UNVERIFIED`, 실제 Controller 경로의 Runner가 하나라도 있으면 `ACTIVE_RUNNER_PROCESS`를 유지. 기존 old owner/heartbeat/6 seats PID exit와 IPC/lease 가드는 **전혀 제거하지 않음**. 신규 경계 회귀시험 2개 작성.
- 새로운 #3738 개발 HEAD `f9c2760ae92ce98ca20784e4a26150edbd0e3578`이며 `tools/runner-watchdog.mjs` raw 바이트 SHA-256 `9150a024bcb979b69a9d908c75b8eb7cec6794d22506384a28b64a722074951b`를 GitHub base64 원문으로 직접 검산. 이전 승인 비활성 Watchdog B R4 후보는 `c0c4dcff...` / `4029b768...`로 **신규 source와 불일치**하므로 절대 재사용하지 않는다. 해당 B의 정확한 신규 SHA/target/선택적 설치 Controller 해시를 정규 source-only 계약에서 다시 묶기 전까지 B 실행 불허.
- 변경 HEAD의 CI는 이 기록 시 [C996 #45728146589](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45728146589), [Automation Status #45728146494](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45728146494) **2/4 SUCCESS**, Controller Maintenance #45728146516 실행 중, Secret Scan #45728146629 대기. 아직 #3738 전체 CI나 운영 HA 성공으로 표현하지 않는다.
- **다음 필수:** #3738 최신 HEAD CI와 실제 WMI 격리·경계시험 회수/오류 보완 → 비활성 Watchdog B 후속 source/manifest를 새 실제 SHA로 안전하게 재연결 → 현재 Controller 전용 B의 필수 운영 승인·실설치·readback 후 Watchdog B 적용/소유권 승격·복귀, 6좌석 독립 결과 검증. 미인증 B 요청·Watchdog 재시작·lease 삭제·Runner 강제 종료·개인정보 게시 없음.

## 27. Standby 전체 소스 통합·Controller B 운영 단회 접수

- **#3738 기능 소스 검증 및 main**: 신규 #3738 HEAD `f9c2760ae92ce98ca20784e4a26150edbd0e3578`에서 [C996 #45728146589](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45728146589), [Automation #45728146494](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45728146494), [Controller Maintenance #45728146516](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45728146516), [Secret Scan #45728146629](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45728146629) **4/4 SUCCESS**; Windows Controller Maintenance 83개 단계 실패 0, 기존 서비스 Listener 한 개만 예외/Controller 잔존 차단의 신규 시험 2/2 PASS. 정규 source-only squash main merge `ba32df13644d0ee7195a2166a62ea92a27a740f1`. Main watchdog blob `90e04cc0491b22a85c02e37bc2737166ff37d932`로 HEAD 원문 동일, `controller/operations.mjs`의 `CORE_STATUS_STAGES` export main 존재 확인. **운영 소스 설치·승격 없음.**
- **#3752 Controller B selective main 준비**: PR #3752 exact-head [Maintenance #45724552810](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45724552810), [C996 #45724552796](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45724552796), [Secret #45724552803](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45724552803) **3/3 SUCCESS**, 신규 5/5 정확 raw Git parent·6파일·import closure 시험 PASS. 정규 squash main `504d7345fd5932a873d4f3dea08c3707217ba443`. Live preimage `53fe24e22446d21a9fd4ee308d12b7cba7f37e25` → 독립 단일 부모 Controller target `b91340d5047daf753e1c17a5c966e4d2aecea586`, Controller 6파일만 업데이트, exact manifest 및 pin main 파일 readback, `VERSIONED_SNAPSHOT` 원본 복구·`core-status` 사후검사 유지. Main의 raw B manifest bytes SHA-256 `b49c75697bb7bc202017378877e62c14f140626984e6a611173e3b5cde38daa2` 별도 계산·검산, 파일 blob SHA와 구분함.
- **#3770 Watchdog B R4 successor source**: 새 Watchdog 후보는 #3738 source `f9c276...` / SHA-256 `9150a024bcb979b69a9d908c75b8eb7cec6794d22506384a28b64a722074951b`. 구 R4의 오래된 `c0c4...` 비활성 후보를 source PR #3770에서 폐기하고 새 `approvals/watchdog-upgrades/f9c2760ae92ce98ca20784e4a26150edbd0e3578.json`을 **approved=false**로 저장. Controller 예상 설치 source `b91340...`, 정확 6파일 해시(operations 최소 export 포함). PR #3770 [C996 #45728640122](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45728640122), [Secret #45728640184](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45728640184), [Maintenance #45728640138](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45728640138) **3/3 SUCCESS**, R4 안전 회귀 5/5 PASS, 정규 squash main `6ef04280b59baab15f6f9a818b44ba80167f20f2`, main source·비활성 manifest readback. **Watchdog B 요청/설치 0**, 승인 플래그를 임의로 true로 변경하지 않음.
- **실제 운영 전 B preflight**: 새 1회 공식 읽기 전용 A [#3772](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3772), requestId `c470ea9e-bf0b-4b1c-8cad-22e4e6d42a67`, [Run #45728972830](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45728972830), Job `139605929537`. JSON/TXT `results/pc-process-inventory-45728972830-1-operating.json/.txt` readback, UTC `2026-11-26T00:29:06.149Z`. `status=PASS/PROCESS_INVENTORY_COLLECTED`, 실제 Controller `53fe24e22446d21a9fd4ee308d12b7cba7f37e25`가 B manifest 원본과 일치, 6 Runner 전원 online, Controller runtime HEALTHY, install lease false, maintenance receiver LISTENING, WMI Listener 7 / Worker 2. 운영·공급자·D1 쓰기 0. 주의: 상세 `maintenance.status=STATE_UNKNOWN/MAINTENANCE_SOURCE_READONLY`, 개별 `controllerFilesVerified=null`은 해당 A 프로젝션으로 모든 B 안전 상태가 PASS됐다는 뜻이 아님; `runtimeSignals.controllerFilesVerified=true`은 별도 확인. 유지보수기의 **현재 실제 source SHA가 이전 `9a0378...`와 다른 `7d70161c454f0242afdc08ffd52841689b308d2b`**임을 새로 관측했고, 그 정확 source의 `maintenance-contract.mjs`와 `update.mjs`에서 `selectiveSource`, `controllerOnlyInstall`, main ancestor, exact parent/diff/import/6seat 방어를 검증. 옛 maintainer SHA를 현재라고 기록하지 않음.
- **Controller B 실제 정규 요청**: source-only main 승인 [#3752](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3752)와 현장 원본·정확 raw manifest를 대조하고 중복 요청 0 확인 후 단회 [Issue #3774](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3774), `pc-controller-update` 라벨 `pc-maintenance`, requestId `pc-update-ec4971ac-2fe9-4a7f-9f33-541a60e83dd4`, 대상 `b91340...`, raw manifest SHA `b49c...`로 접수. 실제 PC 유지보수기 [수신 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3774#issuecomment-7178866639) `LAST_PASS=REQUEST_MANIFEST_AND_UNIQUE_CLAIM_VALIDATED`, UTC `2026-11-26T00:32:42.507Z`. 이는 정확히 **접수/claim 성공**, 아직 설치·사후검증 PASS 아님. 수신기 `tools/maintenance-agent.mjs`는 원 Issue에 progress/comment 및 `results/maintenance-pc-update-...json/.txt`를 후속 게시, 별도 issue-event Actions run이 없는 것으로 B 실행 실패라 판단하지 않음. 동일 requestId 새 Issue·다른 B 요청·PID 강제 종료 금지. 기존 요청 영수증·실행 단계·local backup·postcheck를 실제로 회수한 후 Watchdog B를 판단함.
- 다음 필수: [#3774](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3774)의 Controller 결과 최종 상태·원본/목표 SHA·백업 및 복구·6 Runner/reconnect·실제 postcheck run/job과 JSON/TXT를 확인. `RUNNING`/미관측은 실패로 바꾸지 않음. Controller 설치 성공·현장 source SHA readback 이후에만 현장 Watchdog preimage CAS를 재확인하고 #3770의 `approved=false`를 정확 승인 절차로 처리하여 **Watchdog B 후행 적용**, 독립 Guardian 및 Active↔Standby 승격/복귀를 실제 Windows에서 검증한다.

## 28. Controller 실제 B 설치 성공, 독립 6석 재검증 및 Watchdog 후행 준비

- **Controller 선택적 B 실설치 완료**: [원본 Issue #3774](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3774), requestId `pc-update-ec4971ac-2fe9-4a7f-9f33-541a60e83dd4`. 운영 독립 유지보수기가 정확 raw manifest SHA-256 `b49c75697bb7bc202017378877e62c14f140626984e6a611173e3b5cde38daa2`로 승인·claim한 뒤, 단회 실제 적용. 결과 `results/maintenance-pc-update-ec4971ac-2fe9-4a7f-9f33-541a60e83dd4.json/.txt` main 직접 회수: `SUCCEEDED / APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED`, `lastPass=PASS`, `firstFail=NONE`, 목표·**실제 설치** Controller `b91340d5047daf753e1c17a5c966e4d2aecea586` 일치, `protectedStateUnchanged=true`, `workflowEnabled=true`, 복구 요청 없음. 기존 원본 보존·백업/복원·Core post-operation 계약으로 실행됨. [업로더 검증 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3774#issuecomment-7178967735)에 `REPORT_UPLOAD_VERIFIED`; #3774 이력 보존 후 `closed/completed` 처리. **이전 main merge와 달리 이 단계는 실제 PC 적용이 확인됨.**
- **설치 후 독립 Runtime A**: 한 번의 공식 [Issue #3779](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3779), requestId `69dc1cc7-fbd3-45fb-8a5f-d368a476f538`, [Run #45730212178](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45730212178). 저장 결과 `results/pc-process-inventory-45730212178-1-operating.json/.txt`, UTC `2026-11-26T00:40:48.948Z`. 운영 설치 SHA `b91340d5...` 재조회 일치, `PASS / PROCESS_INVENTORY_COLLECTED`, Runtime/Automation `HEALTHY`, Supervisor `alive/identity/fresh/children VERIFIED`, **여섯 Runner 모두 online**, workflow active, maintenance receiver LISTENING, Controller-install lease 없음, 해당 A 운영·공급자·D1 쓰기 0. `maintenance.status=STATE_UNKNOWN/MAINTENANCE_SOURCE_READONLY`는 이 진단의 세부 관측 한계이고 별도 실제 런타임/파일검증 PASS와 혼동하지 않는다.
- **Watchdog R4 후행 정확 승인 후보**: 기존 source main #3770의 고정 `watchdog-b/standby-r4-contract.mjs`와 source bytes `f9c2760ae92ce98ca20784e4a26150edbd0e3578` / `9150a024bcb979b69a9d908c75b8eb7cec6794d22506384a28b64a722074951b` 유지. 이전 운영 Watchdog script hash `3f99ea3357c6731cc9000bde1273db915cb07ba5fa480718194deb6330c29072`, `INSTALL.json` raw bytes hash `28c8017d469a0e2b13af96e01e686bae874d174b1ddac9e6a170ee2487bd6829`는 기존 A #3750에서 검증했으며 새 B 실행 시 CAS를 다시 강제한다. 정확 설치 Controller `b91340...` 및 6 source bytes 해시·Watchdog 두 파일만 허용한 계약에서 별도 [Draft PR #3780](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3780)로 해당 manifest의 `approved:false→true` **단일 효과** 및 raw manifest 해시/거부 회귀시험을 변경. 정확 manifest raw SHA256 `5467e63ebda7afda6753ea22244c38daa3c2fe7f5bf7431939f283a9a392a453`, GitHub raw base64 바이트 직접 검산. 새 Runner/Watcher/예약·설치 경로 추가 없음. 기록 당시 PR #3780 CI는 C996 #45730406635 SUCCESS, Secret #45730406688 SUCCESS, Maintenance #45730406666 QUEUED. **아직 main 미병합·Watchdog B 미발행**.
- **실제 다음 행동:** PR #3780 동일 SHA CI 3/3 확정 및 원문 반영 → 운영 Watchdog 기존 설치 preimage/서명/lease 안전검사 내장된 공식 `pc-watchdog-b-upgrade` 한 번 → 실제 JSON/TXT의 `STAGED/WATCHDOG_B_APPROVED_SOURCE_STAGED_AWAITING_NATURAL_RESTART`와 새 source/INSTALL 일치·백업/ACL 검증. 단계 `STAGED`는 **운영 Watchdog 프로세스 활성화/Active1 Standby1 런타임 성공과 다름**. 기존 Watchdog 자연 재시작 이후에만 독립 IPC, old owner/heartbeat/6 children exit, 단일 Active/Standby, 장치 격리·복귀 검증. 임의 강제 kill/Controller lock 제거/중복 B issue 금지.

## 29. Watchdog R4 정규 B STAGED 및 자연 재시작 실측 준비

- Controller 선택적 B #3774의 실제 `SUCCEEDED`/목표 SHA `b91340d5047daf753e1c17a5c966e4d2aecea586` 및 보호 불변 원장·독립 운영 A #3779 `PASS`/6 Runner online/HEALTHY 검증은 계속 유효. #3774와 #3779는 정확 결과 pair와 댓글을 보존한 뒤 `closed/completed` 처리함.
- **Watchdog R4 정확 승인 검증**: [PR #3780](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3780), 정확 HEAD `f22538d19a421f934029945ea059777fbf0c17a2`: [Maintenance #45730406666](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45730406666), [C996 #45730406635](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45730406635), [Secret #45730406688](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45730406688) **3/3 SUCCESS**. Windows Maintenance 84개 단계 실패 0, 고정 R4 승인 manifest의 원문 해시와 Controller 6파일/비승인 거부 검사 PASS. PR 정상 main squash merge `598f699d1c69e8eed9567c58013219b94aef7569`, main approval file `approved=true`, raw manifest SHA-256 `5467e63ebda7afda6753ea22244c38daa3c2fe7f5bf7431939f283a9a392a453` (GitHub base64 raw bytes 독립 검산). 설치된 전기 Watchdog script `3f99ea3357c6731cc9000bde1273db915cb07ba5fa480718194deb6330c29072`, INSTALL raw hash `28c8017d469a0e2b13af96e01e686bae874d174b1ddac9e6a170ee2487bd6829`는 정확 CAS 계약에서 유지.
- **실제 Watchdog B**: 단회 [Issue #3784](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3784), `pc-watchdog-b-8a5ce329-6df0-4f42-b6d1-e45c2a765f3b` → [Run #45731043122](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45731043122), Job `139612811721` **SUCCESS**(원본 install 단계·보고 단계 모두 PASS). 실제 원장 `results/watchdog-b-pc-watchdog-b-8a5ce329-6df0-4f42-b6d1-e45c2a765f3b.json/.txt` 직접 재조회: `STAGED / WATCHDOG_B_APPROVED_SOURCE_STAGED_AWAITING_NATURAL_RESTART`, `writes=2`, 정확 대상 `f9c2760ae92ce98ca20784e4a26150edbd0e3578`. 기존 Watchdog 파일·INSTALL.json 정확 백업·ACL/원본 CAS 검사 및 후검증은 B source 정규 계약으로 수행. 원본 Issue [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3784#issuecomment-7179111823), 실행 결과 기록 후 해당 **B stage만** 완료/종결; [추가 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3784#issuecomment-7179177273)에 `STAGED != ACTIVE`, 자연재시작/실제 승격 미증명 명시. **Watchdog 강제 종료 없음**, 신규 B 재요청 금지.
- **현재 미검증 경계**: `STAGED`는 디스크 source+manifest 적용이지 현재 실행 중 Watchdog 프로세스의 새 SHA·`standbyRole:READY` 증거가 아니다. 기존 PC 운영 A는 Watchdog 런타임 자기 nonce/PID·시작시각·IPC READY 정보를 별도 projection하지 않으므로, 기존 `pc-process-inventory-readonly`의 고정 `operating` A probe를 확장하는 [Draft PR #3787](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3787) 개발. 정확 `INSTALL.standby.mode=ACTIVE_1_STANDBY_1` / source raw SHA, 설치 Controller source `b91340...`, Watchdog owner `at>=upgradedAt`, `STATUS.at` 60초 freshness, PID owner identity, Active supervisor와 독립 Standby PID 생존, `STATUS.state=HEALTHY`, `standbyRole=READY`를 **로컬에서만** 검사. JSON/TXT는 불변 보안 코드·집계 boolean만, raw PID/경로/nonce/계정 비공개. 결과 `failoverTested=false`, `promotionApproved=false` 절대 불변; 아직 실제 승격/복귀를 증명하지 않는다.
- #3787은 원래 head에서 Windows 시험 fixture의 경로가 비호환인 부분을 **코드 실행 전** cross-platform `path.resolve`로 정정했으며, 현재 HEAD `6c6c532d5aea09ee42aa4d235710293da9719c5c`. 기록 시 CI [Secret #45731729635](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45731729635), [C996 #45731729571](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45731729571), [Process Inventory #45731729590](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45731729590) **모두 QUEUED, 0/3**, 소스 merge/운영 A 아직 하지 않음.
- **다음 필수:** #3787 정확 HEAD CI 회수·오류 시 최소 수정 → source-only main 통합 → 기존 operating A 단회 readback으로 실제 자연 재시작 여부/Watchdog IPC `READY`를 확인. 자연 재시작 대기라면 `STATE_UNKNOWN/WATCHDOG_R4_NATURAL_RESTART_PENDING` 유지, 강제 restart나 새 감시용 예약 추가하지 않음. `READY`면 실제 old owner/6 children exit, 동일 PC 두 Active 금지, 복귀/Guardian 경로의 정규 안전 실증이 별도 필요하며 관련 승인·lease 보호를 지킨다.

## 30. R4 런타임 A 실측: Watchdog 자연 재시작 미발생

- **#3787 정확 소스 검증 및 정규 main**: [PR #3787](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3787)의 최종 HEAD `6c6c532d5aea09ee42aa4d235710293da9719c5c`. 기존 read-only inventory의 고정 `probe=controller-standby-r4-runtime-readonly`만 추가, 임의 경로·역할 수신 금지. 설치된 Watchdog 소스 원문 SHA-256과 `INSTALL.json`, Controller host SHA, Watchdog owner PID/nonce·시작 시각 `owner.at>=INSTALL.upgradedAt`, 최근 `STATUS.json`, Active Supervisor와 IPC READY Standby의 서로 다른 살아있는 PID를 내부 PC에서 검증; 외부 결과는 안전 boolean/code로 한정, 실제 failoverTested/promotionApproved 항상 false. 고정 읽기·alias 불허·60초 freshness·부모 PID 신원/승격 여부 부정에 대한 회귀시험 4개. 최초 HEAD Windows mock 경로 오판을 cross-platform fixture로 정정했고, **최종 HEAD** [Process Inventory #45731729590](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45731729590), [C996 #45731729571](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45731729571), [Secret Scan #45731729635](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45731729635) **3/3 SUCCESS**, Windows 신규 시험 4/4 PASS. Source-only squash main merge `09952081543e7f9c49b0c72f5f869525a25bf71f`, main probe readback. 새 Runner/CMD/Controller/Watchdog 실행·예약·DB/Writer/공급자 호출 변경 없음.
- **자연 재시작 단회 실제 PC A**: [Issue #3791](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3791), requestId `48dd3ebf-9976-428e-a97c-c2c2f336d0d9`, [Run #45732318320](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45732318320), Job `139617075464`, 실제 source main `09952081543e7f9c49b0c72f5f869525a25bf71f`. 결과 `results/pc-process-inventory-45732318320-1-operating.json/.txt` readback, UTC `2026-11-26T00:57:27.317Z`: `STATE_UNKNOWN / WATCHDOG_R4_NATURAL_RESTART_PENDING`, `installedMatch=true` (Watchdog R4 디스크 script + INSTALL SHA 일치), `controllerTargetMatch=true` (Controller B 실설치 SHA `b91340...`), `statusFresh=true` (기존 Watchdog이 현재도 heartbeat 기록), **`naturalRestartObserved=false`** (Watchdog receiver owner 기록 시각이 `INSTALL.upgradedAt` 전임). `watchdogOwnerVerified=false`는 신규 R4 활성 소유자 신원 미검증, `standbyIpcReady=false`, `activeSupervisorVerified=false`는 R4 검증 조건 미도달 상태이지 기존 Active Controller가 다운됐다는 의미 아님. `failoverTested=false`, `promotionApproved=false`, `operationalWrites=0`, `providerCalls=0`, `d1Writes=0`. 수집 단계 exit 2는 fail-closed 결과, API/Windows 도구 장애나 신규 설치 실패로 재분류 금지. 이 1회 진단 자체는 결과를 [원본 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3791#issuecomment-7179297345)에 기록해 `closed/completed` 처리; 실제 Standby 운영 목표는 **미완료**.
- **현재 유효 완료 경계**: Controller B #3774 실제 `SUCCEEDED`, 독립 A #3779 여섯 Runner online·Supervisor HEALTHY, Watchdog B #3784 실제 `STAGED` with 2 written files/backup/ACL, 고정 R4 source·manifest 정확함. Watchdog 새 프로세스 **자연 재시작은 확인되지 않았으므로**, 실행 중 Watchdog의 `standbyRole=READY`, 실제 Active1+passive Standby1, old PID/6 children 종료 후 승격·복귀는 아직 입증되지 않았다.
- **다음 필수 트리거**는 실제 자연 Watchdog 재시작을 나타내는 독립 Runtime 변화이며, 이때 같은 고정 A `controller-standby-r4-runtime-readonly`을 **새 requestId 1회** 실행해 재시작 이후 source·owner·heartbeat·IPC `READY`를 readback한다. 증거 없는 동일 A 재실행·B 재요청·Watchdog 프로세스 강제 kill·Supervisor lease 삭제·감시 전용 예약 신설·임의 복구는 하지 않음. `READY` 검증 이후에도 실제 old owner 6-seat exit·중복 Active 차단과 안전 복귀의 Windows 운영 실증은 별도 상태로 유지.

## 31. W06 Controller B 후속 설치와 R4 A 정확 SHA 정합성 보완 (2026-11-26)

- **후속 설치 실측, 이전 설치 증거 보존:** W06 별도 [Controller B #3788](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3788) 원본 댓글과 정확 `results/maintenance-pc-update-83a3ca2c-c52b-4f91-8d1c-bc5e650c998a.json/.txt` 직접 대조: `SUCCEEDED / APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED`, target/actual Controller `182bb46f2838306ba40d8b4ec32bac40ab75b69a`, `protectedStateUnchanged=true`, `workflowEnabled=true`, `firstFail=NONE`, 업로더 `REPORT_UPLOAD_VERIFIED`. 앞선 본 R3 Controller B #3774 `b91340d5047daf753e1c17a5c966e4d2aecea586` 설치의 **이후 별도 정규 변경**이며, #3774 자체 성공 이력을 부정하지 않는다. #3788 원본 Issue는 조회 시 OPEN; 다른 소유자의 요청을 임의로 재발행·종결하지 않음.
- **정확 변경/상호작용:** GitHub `b91340d5…` → `182bb46f…` commit 비교에서 변경은 `controller/preimage-manifest-contract.mjs` **1파일뿐**. 신규 그 파일의 승인 SHA-256은 `c59d5d36f0024b7a4b1781ea6eef9351f6275db33c8799bec05bf99abebbfcc1`. R4 Watchdog #3784는 그대로 `STAGED`이고 기존 stage manifest의 `expectedControllerSha=b91340d5…`는 설치 당시 승인/CAS 근거로 보존한다. 신규 Controller 설치 후 기존 `controller-standby-r4-runtime-readonly` A의 별도 `controllerTargetMatch` 고정 비교는 새 `182bb46f…`에서 거짓이 되는 **진단 판정 간극**이 있음. 이를 Watchdog 자연 재시작 성공/실패 또는 전체 Controller 기능 불일치로 단정하지 않는다.
- **최소 조회 수정 소스:** 신규 격리 작업 브랜치 `zgmini-pc-control/codex/controller-r4-w06-readonly-compat-20261126`의 [Draft PR #3799](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3799), HEAD `707323842a843eb25101e55f24966308040e30c7`. 기존 R4 operating-only A에서 옛 `b91340d5…` 허용은 보존하되 새 `182bb46f…`는 원래 Controller 핵심 6개 파일과 W06 preimage 1파일의 **일곱 해시 정확 일치**를 함께 요구하도록 변경. 다른 source SHA/해시 누락·변경/잘못된 manifest와 재시작 전 불합격에 대한 회귀시험 추가. A의 응답 `failoverTested=false`, `promotionApproved=false`, no writes/promotion unchanged. **Watchdog R4 B 승인·설치/실행 파일·프로세스/예약/Runner 변경 없음.**
- **CI 실행 대기:** PR #3799의 정확 HEAD로 새 [C996 #45795541145](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45795541145), [Secret Scan #45795541205](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45795541205), [Process Inventory #45795541241](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45795541241) **최초 HEAD에서 생성된 3개 Run으로, 최신 HEAD 성공 증거로 재사용하지 않음**. 후속 변경은 `controllerFiles=null`일 때 boolean false를 유지하는 fail-closed 보정 및 회귀시험이며 현재 최종 HEAD는 `707323842a843eb25101e55f24966308040e30c7`. 정확 최신 HEAD CI 통과 전 main 통합이나 신규 운영 A 요청 없음.
- **미완료 운영 목표:** 마지막 #3791 실제 A는 W06 후속 B 이전의 `STATE_UNKNOWN/WATCHDOG_R4_NATURAL_RESTART_PENDING`; #3788 이후 Watchdog 자연 재시작·IPC `READY` 및 Active 1 + Standby 1은 **신규 실측 없음**. 안전한 다음 실행은 PR #3799 정확 HEAD CI 회수·최소 수정/합병 가능 여부 판단; 자연 재시작이 독립 확인된 뒤에는 새 installed Controller 및 Watchdog 조건을 반영한 공식 운영 A **고유 requestId 1회** 결과 회수. 그 후 실제 안전 승격·복귀 증거로 R3 S6 완료 여부 별도 판단. 동일 B 재요청·강제 Watchdog/Runner 종료·새 감시용 예약 없음.


## 32. R3 후속 통합과 최종 1+2 구성 정렬 (2026-11-26)

- **최종 목표와 현행 단계 구분:** 사용자가 재확인한 전체 후보 구성은 **메인 Active Controller 1 + 보조 Controller 2(Standby 2), 총 3개**다. 이는 R2의 `Active 1 + Standby 2` 후보와 일치한다. 그러나 기존 R3에 명시된 운영 설치 승인·영향 범위는 **동일 운영 PC Active 1 + Standby 1**의 1차 구축이다. R3의 완료 수치와 현재 설치 증거를 전체 1+2 달성으로 보고하지 않는다. 최종 1+2를 지향하되 기존 1차 승인/원본/불변식은 보존하며, 두 번째 보조는 별도 단계에서 정확한 소스/설치 효과와 계약을 검증한다.
- **W06 실제 설치 후 A 판정 결함 해소(소스 통합):** 제어 저장소 [PR #3799](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3799) 정확 HEAD `707323842a843eb25101e55f24966308040e30c7`에 대해 C996 [#45795704733](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45795704733), Secret Scan [#45795704790](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45795704790), Process Inventory [#45795704591](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45795704591) **3/3 SUCCESS**. Draft 해제 및 정상 squash merge `936e82fbfd403f59aaf527494911186b674bbdc8`, main exact readback 완료. W06 B 후속 설치 `182bb46f…`의 진단 인정 조건을 Controller 기존 6파일+W06 preimage 파일의 **7개 정확 SHA-256**과 결합해 임의 후속 SHA·부분 원장 거부. 설치기 `tools/update.mjs`의 실제 `plannedFiles=deployed`/전체 deployable target tree stage와 `host.controllerFiles` 재기록 방식을 재확인해 7파일 존재 요구가 설치 계약과 일치함을 검증. 단일 최초 B #3774의 성공/Watchdog R4 stage 승인 원장은 불변이다.
- **최종 1+2 실구현 경로:** (1) 현재 1차 Standby의 Watchdog 자연 재시작과 exact 운영 A `READY`/유일 Active/6좌석·원장 검증, (2) 두 보조 후보 모두 **비실행 대기 상태**에서 Runner/Worker 0개·자동 선점 0개, 기존 Watchdog **단일 승격 결정자**와 기존 owner/nonce/lease CAS 경계 유지, (3) Active 사망 및 이전 6 Runner 종료의 실제 증명 후 한 후보만 원자적 승인·승격, 첫 후보 상태 불명 시 두 번째를 병렬로 시작하지 않고 fail-closed, (4) 두 보조 동시 대기 및 재시작·경합·오류·복귀의 격리 Windows 검증, (5) 필요 운영 파일·자원·권한의 정확한 변화 및 승인 계약을 고정한 뒤 안전한 정규 설치·운영 1+2 실제 readback/전환/복귀 검증. 기존 1차 완료 전 추가 설치·Watchdog 강제 재시작·새 서비스/예약·DB 변경·승인 우회는 하지 않음.
- **판정/다음 행동:** PR #3799는 **소스 CI+main 통합 DONE**, W06 #3788은 별도 Controller **B 설치 SUCCEEDED**, Watchdog R4 #3784는 **STAGED**, #3791 현재 유효한 A는 **자연 재시작 전 STATE_UNKNOWN**이다. 실운영 **Active1+Standby1 READY 미증명**, **Active1+Standby2 미구축**. 독립 자연 재시작 Runtime 증거 발생 시 기존 승인 A를 정확 대상 고유 requestId로 한 번 readback → 1차 장애 전환/복귀 실측 → 2번째 보조 정규 소스·안전계약/시험·설치 실행 순서로 진행. 단순 신규 시계열 확인 예약은 만들지 않는다. 전체 1+2 진행률은 현재 동일 분모의 객관적 증거가 없어 미산정.

## 33. 두 번째 Standby 소스 구현 착수 — 단일 Watchdog·후속 1+2 (2026-11-26)

- **범위 및 실제 소스:** 기존 1차 R3 운영 설치와 승인된 Watchdog R4 `STAGED`를 변경하지 않은 채, 보조 저장소 독립 브랜치 `codex/controller-standby-2-pool-20261126`에서 [Draft PR #3805](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3805), HEAD `a79b9bc1d4050d62597ccb2d6097c15cc8ab350b`로 두 번째 **동일 호스트 passive** Standby 후보의 Watchdog 풀 코드를 작성. 수정된 파일은 `tools/runner-watchdog.mjs`, `tests/controller-standby.test.mjs`, `tests/controller-standby-ipc-windows-isolation.test.mjs`의 정확 3파일이며, 새 Runner·예약·계정·DB·설치 파일/실제 프로세스 변경 없음.
- **운영 이전 안전 경계:** 새 구성은 향후 별도 검증된 `INSTALL.json: standby.mode=ACTIVE_1_STANDBY_2,approved=true`에서만 두 후보를 생성. 기존 운영 승인 `ACTIVE_1_STANDBY_1`에서는 기존 후보 1개만 생성. Watchdog이 단독으로 소유한 두 IPC 자식은 `READY` 시 Runner/Worker 시작 0, 기본 첫 번째 후보를 선택하되 미준비 시 준비된 두 번째만 fallback 가능. 승격 시 `promotionPending`을 설정하고 실제 Supervisor owner.pid와 최신 heartbeat가 해당 후보를 증명할 때만 해제. 다른 정상 Active가 먼저 확인된 경우에는 Watchdog `HEALTHY`를 유지하면서 해당 승격의 소유권 판정만 `UNVERIFIED_OWNER_MISMATCH`로 보류하여 독립 업무를 오차단하지 않는다. 결과 불명·owner 불일치에는 두 번째 승격 금지 및 fail-closed. 각 후보 시작 상한은 시간당 3회, Watchdog 전체 복구 상한은 기존 시간당 3회 유지.
- **검증 상태:** 결정적 후보 선택·보류 회귀시험 2건 및 Windows OS TEMP의 실제 두 IPC 후보 1회 선택/두 번째 fallback 실증 시험 2건 추가. PR #3805의 **과거 HEAD** `4b1bc7b…`에서는 [C996 #45797574063](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45797574063)와 [Automation #45797574213](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45797574213) SUCCESS 확인. 건강 상태 보존 수정 후 **최신 HEAD** `a79b9bc…`의 신규 CI는 [C996 #45798045475](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45798045475), [Secret #45798045428](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45798045428), [Automation #45798045506](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45798045506), [Controller Maintenance #45798045487](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45798045487) **C996 #45798045475, Secret #45798045428, Automation #45798045506, Controller Maintenance #45798045487 4/4 SUCCESS**. 과거 HEAD의 PASS를 새 HEAD PASS로 재사용하지 않는다. **최신 HEAD 4/4 SUCCESS:** Windows 분리 PC의 Controller Maintenance [#45798045487](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45798045487)는 84개 단계 모두 SUCCESS, Standby Windows 경합 및 실제 IPC 2후보 시험 모두 SUCCESS. [PR #3805](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3805) Draft 해제 후 정확 HEAD `a79b9bc1d4050d62597ccb2d6097c15cc8ab350b`를 squash 병합, merge SHA **`45807c661ee7f5f11a20b5780e6fd31116b24f84`**, `main` exact readback으로 Watchdog 1+2 선택 코드와 격리 IPC 시험 코드 확인. **소스 병합 완료와 운영 1+2 실제 설치·기동은 별개.** 별도 R5 운영 설치 원본·효과·CAS/승인 계약과 자연 재시작 후 1차 READY 검증은 미완료.
- **후속 필수:** (완료) 정확 HEAD CI/Windows 실측 및 main 병합 → (다음) 새 1+2 모드와 설치 대상 파일, Controller 정확 원본 및 Watchdog 기존 설치 preimage·CAS/복구 계약 대조 → 기존 1차 자연 재시작 이후 정상 ACTIVE1+READY1 실증을 우선 확인 → 승인된 범위의 R5 B 정규 설치를 정확하게 준비·실행해 실제 ACTIVE1+READY2, 후보 동시 READY·단일 승격·원장/6 Runner 보존·복귀 검증. 두 번째 후보가 같은 PC에 존재하는 것만으로 전원/디스크/OS 장애 대응이나 3-node quorum 성립을 주장하지 않는다.


## 34. 1+2 개발 통합 및 1+1 운영 A 재검증 (2026-11-26)

- **1+2 소스/시험 통합:** 제어 저장소 [PR #3805](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3805), 정확 PR HEAD `a79b9bc1d4050d62597ccb2d6097c15cc8ab350b`, C996 [#45798045475](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45798045475), Secret [#45798045428](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45798045428), Automation [#45798045506](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45798045506), Controller Maintenance/Windows 격리 IPC [#45798045487](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45798045487) **4/4 SUCCESS**. Maintenance는 84개 단계 모두 성공, Windows TEMP의 두 후보 IPC 격리·단일 승격·fallback 시험 통과. 승인 범위 외 설치 파일/설정 변경 없는 3개 소스/테스트 파일만 수정. Draft 해제·squash merge commit **`45807c661ee7f5f11a20b5780e6fd31116b24f84`** 및 `main` 코드/시험 사후 readback 완료. 이는 개발·CI·소스 통합이지 운영 1+2 기동이 아니다.
- **기존 승인 운영 A 단회 검증:** W06 Controller B #3788 후속 변경 및 A 진단 PR #3799 소스 통합이라는 새 입력에 대해 고유 requestId `a3fd29d1-5b21-48ab-a88f-97652b360fc1`의 [Issue #3810](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3810)를 기존 `pc-process-inventory-readonly` 운영 A로 1회 실행. 실제 [Run #45799468743](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45799468743), `main` 실행 source `45807c661ee7f5f11a20b5780e6fd31116b24f84`, [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45799468743-1-operating.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45799468743-1-operating.txt) 결과쌍과 Issue 댓글 확인. **`STATE_UNKNOWN/WATCHDOG_R4_NATURAL_RESTART_PENDING`**, `installedMatch=true`, `controllerTargetMatch=true`, `statusFresh=true`, `naturalRestartObserved=false`, `watchdogOwnerVerified=false`, `standbyIpcReady=false`, `activeSupervisorVerified=false`, `failoverTested=false`, `promotionApproved=false`, `operationalWrites=0`. GitHub job 종료 `failure/exit 2`는 진단 `STATE_UNKNOWN`을 나타낸 것이며 컨트롤러 실제 런타임 실패 증거가 아니다. 전용 A 요청 [#3810](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3810)은 단회 진단 결과·원장 회수 후 `closed/completed` 처리했으며, 이는 HA 정상화 완료 판정이 아니다.
- **현행 경계:** Watchdog R4 파일 `STAGED` 정상/Controller W06 후속 SHA 정상, 그러나 현재 Watchdog 프로세스의 자연 재시작은 **2026-11-26 10:16 UTC(19:16 KST)** 관측에서 아직 없음. 따라서 `ACTIVE1+READY1` 미증명 및 `ACTIVE1+READY2` 운영 미설치. 기존 1차 소스/설치/원장·Runner 보존, 현재 운영에 강제 Watchdog 종료/재시작·중복 B·반복 A·새 감시 예약 생성 없음. 후속은 **실제 자연 재시작 시각과 설치 source가 바뀌었을 때만** 정규 A를 다시 사용하여 1차 `READY`/owner·6 Runner를 확인하고, 1차 안전 승격·복귀 및 두 번째 보조의 정확한 승인/백업/CAS/운영 검증으로 이어간다. 현재 1+2 전체 운영 완료율은 객관적 분모가 없어 미산정.


## 35. Active 1 + Standby 2 정규 B 원본·승격 조건 준비 (2026-11-26)

- **새 실측 원본:** 기존 승인 `pc-process-inventory-readonly`의 별도 온디스크 원본/manifest A [Issue #3814](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3814), [Run #45800213545](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45800213545) **PASS**. [결과 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45800213545-1-operating.json)·TXT/댓글을 대조했다. R4 on-disk source SHA256 `9150a024bcb979b69a9d908c75b8eb7cec6794d22506384a28b64a722074951b`(선언과 일치), **R4 on-disk `INSTALL.json` 원본 SHA256 `a47343964fbf3668d27f77deba69dbfc9b53788775c26ea420eeb3b2509e3805`**. 원본 관측과 자연 재시작은 다르며 #3810의 `NATURAL_RESTART_PENDING`을 해소한 증거가 아니다. 새 A는 원본 해시 획득이라는 독립 목적의 1회 조회이고, 실제 데이터/설치 쓰기 0·재시도 0.
- **정규 B 소스 준비:** 제어 저장소 전용 브랜치 `codex/controller-standby-r5-install-contract-20261126` [Draft PR #3815](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3815)에서 기존 `watchdog-b/upgrade.mjs`를 재사용하는 R5 정규 전환 경로를 구현. R5 목표 immutable commit `45807c661ee7f5f11a20b5780e6fd31116b24f84`, 해당 `tools/runner-watchdog.mjs` raw SHA256 `9137447231d354d9999cdadbbb5b2a6dee7f0bf869df61881742902ac445128f`를 정확 고정. 이전 R4 소스/manifest 원본 및 W06 Controller `182bb46f2838306ba40d8b4ec32bac40ab75b69a`의 정확 7파일 SHA256을 동시 확인. 기존 백업·동일 디렉터리 ACL·원본 CAS·권한·재시작 금지와 `INSTALL.json` 2파일 교체 계약을 유지. R2/R3/R4 승인 입력/코드는 그대로 두고 V5 `ACTIVE_1_STANDBY_2`만 독립 경로로 추가한다.
- **실제 승격 사전검사:** 신규 R5는 B claim/백업/운영 쓰기 **이전**에 R4 원본 source·manifest의 정확 해시, 기존 Watchdog 프로세스의 **`owner.at>=R4 upgradedAt` 자연 재시작**, 실제 `status.state=HEALTHY`·`standbyRole=READY`, 기존 Watchdog/Active Supervisor/Standby의 서로 다른 PID·활성 프로세스와 최신 시각을 요구한다. 단계 미입증/원장·파일 해시/Controller 불일치에는 fail-closed. Windows 격리 테스트에서 원본/부정 사례를 검증하도록 기존 watchdog B 회귀시험을 확장했다.
- **현재 적용 경계:** **PR #3815 최신 HEAD `1c85058caa8d92328e4d052afe8d4262c6299019`의 CI 3/3 SUCCESS:** [C996 #45800892895](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45800892895), [Secret Scan #45800892852](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45800892852), [Controller Maintenance #45800892834](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45800892834) 모두 SUCCESS. Windows 격리 Controller Maintenance 84개 단계 성공 및 R5 전용 부정/정상 회귀시험 5건 `ok` 실로그 확인. Draft 해제 → squash merge **`7997b374b9aca7a2b6cde21db1bc214a278ca639`** 및 `main`의 정확 R5 경로·원본 SHA 재조회 완료. **R5 승인 manifest는 아직 만들지 않았고 B Issue도 발행하지 않았다.** #3810은 `NATURAL_RESTART_PENDING`, 1차 R4 `READY`/실제 장애 전환·복귀 미증명. 임의 Watchdog 강제 재시작·두 번째 Standby 실제 기동·중복 Runner/예약·DB 변경은 하지 않는다. 다음 단계는 (완료) PR 최신 HEAD CI 및 Windows 격리 회귀시험·소스 통합 → (미완료) 유효한 자연 재시작과 1차 안전 운영 증거 확인 → 정확 B manifest/원본 CAS와 운영 1+2 설치·readback·승격/복귀 검증. 전체 1+2 운영 완료율은 미산정.


## 36. R4 Guardian 자연 재시작 원인과 계보 증거 (2026-11-26)

- **추가 원인 분리:** 실제 PC A [#3810](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3810)의 `installedMatch=true / controllerTargetMatch=true / statusFresh=true / naturalRestartObserved=false`와 [#3814](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3814)의 raw `INSTALL.json` SHA 정합성이 확인되었다. `tools/runner-watchdog.mjs`의 실행 경로는 정상 Watchdog 프로세스가 자기 소스 파일 교체만으로 종료되지 않으며 계속 15초 tick을 수행한다. `STAGED`만을 근거로 새 R4 메모리 인스턴스가 활성화되거나 Standby가 생성됐다고 간주하는 것은 실제 실패 조건이다. 자연 재시작만을 무기한 기다리는 것은 완료를 보장하지 않는다.
- **공통 공식 경로 재사용 근거:** 기존 Guardian 활성화 [Issue #1395](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1395)는 승인된 단일 Watchdog PID 전환과 기존 Guardian의 새 프로세스 인증 `PASS/WATCHDOG_GUARDIAN_NEW_RUNTIME_ATTESTED` 원장/결과쌍이 존재한다. 그러나 #1395는 과거 R3 정확 source SHA와 requestId에 고정되어 R4 #3784로 재사용·재발행할 수 없다. `watchdog-b/guardian-rotate.vbs`의 기존 `PROBE`는 읽기 전용이나 `ACTIVATE`는 한 PID를 종료시키므로 명시적 정확한 보호·승인·원장과 분리해야 한다.
- **새로 구분할 최소 증거:** 동일 호스트 Active·6 Runner를 건드리지 않고 R4의 현재 Watchdog이 기존 Guardian 소유인지(실제 프로세스 계보/사용자 SID/세션/실행 인수/10분 경과), WMI 증거가 충분한지만 기존 읽기 전용 PC 프로세스 A와 기존 WMI 헬퍼로 확인. 다른 원인일 때 WMI 실패 사유가 구분된다. **조회 결과는 활성화 승인·실행 증거가 아니다.**
- **소스 구현:** 제어 저장소 브랜치 `codex/controller-r4-guardian-origin-a-20261126`, [Draft PR #3819](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3819) 최신 HEAD `6aa27972cfe94c2c97c26c7060f9bd238ddc9cac`에 고정 `controller-standby-r4-guardian-origin-readonly` probe를 기존 `pc-process-inventory-readonly` A에 추가. 역사적 승인 헬퍼 SHA256 `ba4890ca8c8dd7ba4d885d88aff000443a58d1a8b1c9d01f386e10b3e0aa3bbe`로 파일을 검증하고 `guardian-origin-readonly.vbs` + `guardian-rotate.vbs PROBE`만 제한 실행. 외부 출력은 안전한 mismatch 코드와 `guardianProbePassed`만, PID/SID/명령행·키/원자료는 미게시. 운영 Windows에 새 프로세스 종료/설치/설정/예약 없음.
- **CI 실제 첫 실패 구분:** 최초 HEAD `d3dcbca…`의 PC Process Inventory [#45802415408](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45802415408)에서는 신규 Guardian 시험 4건 모두 PASS, 그러나 **기존 R4 파일 픽스처 1건이 현재 checkout의 1+2 R5 Watchdog source SHA `913744…`를 R4 STAGED SHA `9150a0…`로 잘못 동일시하여 FAIL**. R4 판정 로직은 실제로 `STATE_UNKNOWN/WATCHDOG_R4_STAGE_OR_CONTROLLER_SOURCE_UNVERIFIED`를 반환해 정상 fail-closed. 픽스처를 그 정합성 거부 회귀시험으로 정확히 수정(가짜 PASS나 assertion 삭제 없음). 수정 HEAD의 [Process Inventory #45802734574](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45802734574) **SUCCESS**, [Secret Scan #45802734505](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45802734505) **SUCCESS**, [C996 #45802734637](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45802734637)은 기록 시 `QUEUED` (최신 HEAD 2/3). 본체 운영 A 새 probe는 main 통합 전이므로 아직 발행하지 않았다.
- **후속 필수:** PR #3819 정확 HEAD 남은 C996 완료 확인/최소 수정 → 소스 main 통합 → 운영 PC에서 그 고정 WMI A **고유 요청 단회** → 명시적 PASS/불일치 결과로 Guardian 활성화 정규 후속을 판단. 단일 Watchdog 전환을 위해 기존 R3 승인 requestId를 재사용하거나 임의 kill/중복 B/새 예약을 만들지 않는다. 운영 1+1/1+2 완성은 아직 입증되지 않았다.


## 37. R4 Guardian 실제 WMI 계보 검증 및 활성화 소스 연결 (2026-11-26)

- **실측 구분:** 공식 읽기 전용 운영 A [Issue #3824](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3824), [Run #45803455305](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45803455305) 결과쌍 [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45803455305-1-operating.json)/TXT와 댓글을 확인. 상태 `READ_ONLY_OBSERVED/WATCHDOG_R4_GUARDIAN_WMI_PROBE_VERIFIED`, `stageVerified=true`, `naturalRestartObserved=false`, `guardianProbePassed=true`, `originMismatches=["COMMAND_EXACT"]`(명령 인수 따옴표 형식만 역사적 보조 진단과 차이, 현재 엄격한 WMI `PROBE`는 통과), `activationApproved=false`, `activationExecuted=false`, `promotionApproved=false`, `operationalWrites=0`. GitHub Run `failure`는 `READ_ONLY_OBSERVED`의 종료 코드로, WMI 진단 실패·운영 Controller 장애 근거가 아니다. 해당 단회 조회 Issue는 `closed/completed`, HA 전환 완료로 해석하지 않는다.
- **A 소스 구현 통합:** 제어 저장소 [PR #3819](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3819), 최신 HEAD `6aa27972cfe94c2c97c26c7060f9bd238ddc9cac`, CI [Process Inventory #45802734574](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45802734574), [C996 #45802734637](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45802734637), [Secret #45802734505](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45802734505) **3/3 SUCCESS**, squash merge `bce1d4c29476265a76394b949a00a5e31503bcd4`. 기존 안전한 `guardian-rotate.vbs PROBE`만 사용하는 고정 A이며 Guardian `ACTIVATE` 효과 0.
- **기존 단일 Guardian 정규 B 연결:** [PR #3827](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3827) 정확 HEAD `d505fc7125a37cf729f03dc98f8a925e55d55fb3`의 C996 [#45804241580](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45804241580), Controller Maintenance [#45804241643](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45804241643), Secret [#45804241559](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45804241559) **3/3 SUCCESS**, Windows 유지보수 84단계 및 R4 전용 4개 부정/정상 시험 PASS. squash merge `db7e51bd7ae8a6f66f3e77f2a97cc14db3e87317`. 과거 #1395의 R3 단일 Watchdog PID 인증 성공은 그 당시 정확 SHA/승인 범위에서만 보존하고, 기존 R3 승인/nonce/이력을 R4 요청에 재사용하지 않는다. R4 별도 exact target `f9c2760ae92ce98ca20784e4a26150edbd0e3578`, stage #3784, 정확 설치 source `9150a0…`, W06 Controller `182bb46…`를 재검증하도록 R4 전용 계약을 추가. 운영 `ACTIVATE` 명령은 실행하지 않음.
- **원본 CAS 보강:** R4 승인/최종 설치 보호에서 이름/선언값만으로 전환하지 않도록, [PR #3832](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3832) 전용 브랜치 `codex/controller-r4-guardian-raw-cas-20261126`, HEAD `bc226acf64db90f7af3e77d465c1a2d53ff7169d`에 운영 A #3814로 확보된 **R4 `INSTALL.json` 실제 raw SHA256 `a47343964fbf3668d27f77deba69dbfc9b53788775c26ea420eeb3b2509e3805`**를 정확 고정. R4 활성화 manifest 승인의 `installedManifestSha256`, B 사전/직전 CAS 및 Guardian 신규 프로세스의 사후 readback까지 같은 원본 해시가 필수. source-only 변경 3파일, 새 운영 파일·프로세스·예약·DB 쓰기 0.
- **검증·실행 경계:** 최신 PR #3832 CI [C996 #45805067060](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45805067060) SUCCESS, [Secret #45805066500](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45805066500) SUCCESS, [Controller Maintenance #45805066531](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45805066531) 기록 당시 QUEUED. R4 단일 PID 활성화용 **신규 exact 승인 manifest/Issue는 미생성**이며 `ACTIVE1+READY1`, 이어지는 `ACTIVE1+READY2`는 운영 미증명. 후속 필수는 정확 HEAD Windows CI 결과 회수 및 최소 수정 → source-only 통합 → R4 정규 Guardian B의 원본/기존 동일효과 승인 계약과 PID/lease/Guardian CAS 확인 → 정확 B 효과 적용이 허용될 때만 단회 실행 및 실제 새 R4 `READY`·6 Runner 불변 검증 → 최종 R5 1+2 설치·정상 전환·복귀. 임의 kill/기존 Issue 재실행/새 감시 예약 없음.
