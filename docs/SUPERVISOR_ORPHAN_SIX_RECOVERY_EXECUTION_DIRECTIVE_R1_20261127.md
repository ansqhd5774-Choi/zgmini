# ZGMINI Supervisor 고아 Runner 6개 운영 복구 실행 지시문 R1

- 작성/적용: 2026-11-27 KST · **프로세스 총괄 작업 지시, 운영 B 승인 아님**
- 작업 정본: `ansqhd5774-Choi/zgmini` / `codex/controller-ops-lessons-20261105`
- 실제 Controller 구현: `ansqhd5774-Choi/zgmini-pc-control`의 최신 `main` 기반 전용 브랜치
- 장애·증거 원장: [#4156](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4156), [정밀 조사 결과](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4156#issuecomment-7218088763)
- 실행 기준: 제어 저장소 `AGENTS.md`, `docs/PC_AUTOMATION_STANDARD.md`, 기존 Controller/Watchdog/maintenance 설치·승인 계약
- **실제 운영 복구 시작 기준: 0/1 (0%)**. 이 문서의 commit·PR·CI는 Supervisor 복구 완료가 아니다.

## 1. 목표와 완료 판정

**최종 목표:** 사용자 승인 범위에서 Supervisor 소유권 상실을 실제 운영 PC에서 복구하고, 다음 결과를 **같은 설치·관측 대상**에서 확인한다.

1. 이전 고아 Runner 문제 해소와 중복 Listener 6개 생성 방지
2. 현재 Supervisor 단일 Owner PID·nonce·same boot, 정확한 lease, fresh heartbeat 검증
3. 전용 GitHub Runner 6/6 Online, 정상 Worker 실행 및 실제 `runner-smoke PASS`
4. Watchdog R6 `HEALTHY`, Standby **서로 다른 PID의 2/2 READY / IPC** 실증
5. 정상 접수·기존 request/journal/backlog 보존, 필요한 실제 운영 JSON/TXT·Issue/Run/Job·설치 SHA readback 일치

수집·데이터/DB/D1·다른 기능의 동작은 이 복구와 필요한 직접 의존성만 확인한다. 운영 복구가 미완료면 진행률을 100%로 만들지 말 것.

## 2. 보존할 관측 사실 (현재 상태를 과거 시각으로 소급하지 않는다)

| 실제 증거 | 시각(KST) | 범위·결론 |
|---|---|---|
| [#4149 / Run 45905235905](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45905235905) | 11/27 07:32 | 마지막 확인된 Supervisor alive/fresh/childrenVerified=true |
| [#4156 / Run 45907384333](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45907384333) | 11/27 07:51–07:54 | Guardian 단회 활성화 `STATE_UNKNOWN`; 최초 사망의 인과 원인은 **미입증** |
| [#4158 / Run 45907709067](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45907709067) | 11/27 07:56 | Supervisor dead/stale, Runner 6/6 Online, Receiver LISTENING |
| [#4159 / Run 45908087228](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45908087228) | 11/27 07:59 | Controller Listener 6개+Worker 1개 관측, 별도 서비스 Listener 1개의 경로 미확인. 그 당시 Worker 1개를 **현 시점 0개**로 주장 금지 |
| [#4185](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4185) / [#4187](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4187) | 11/27 오전 | Runner05 작업 환경 old nonce 일치(한 Worker), 6 Listener WMI 생성시각 old heartbeat 이전·두 관측 동일. **6개 모두의 original nonce/launch provenance는 미입증** |
| [#4195 / Run 45930154288](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45930154288) | 11/27 11:45 | 6개 독립 콘솔, 추가 구성원 0, 당시 관측. 실운영 정상 종료·현재 콘솔 고정 증거 아님 |
| [#4221 / Run 45996087186](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45996087186) | 11/27 21:08 | R6 설치·소유자 확인, `BLOCKED_OLD_RUNNER_EXECUTABLE_UNVERIFIED`; Supervisor HEALTHY 미확인, Standby READY **미입증** |

`assessR6StandbyRuntimeSnapshot`는 Watchdog이 HEALTHY가 아니면 Standby IPC 검증 전에 기본 `standbyReadyCount=0`을 반환한다. 따라서 조회값 0을 실제 Standby 프로세스 0개 사망 사실로 해석하지 않는다.

기존 `tools/runner-watchdog.mjs`는 6 child의 실제 종료와 독립 `NO_CONTROLLER_RUNNER_PROCESS` WMI 결과를 확인한 뒤에만 새 Supervisor 승격을 허용한다. 이 검사는 현재 보호 원인이며 제거·우회하지 말 것.

## 3. 복구 방식 선택: 두 가설을 분리하여 판정

### A. 기존 6 Runner 무중단 인수 — 조건부 후보

- 장점: Runner 중단 최소화.
- 현행 설치 `controller/supervisor.mjs`는 시작할 때 `run.cmd` 6개를 **새로 spawn**한다. `controller/common.mjs::exclusive`가 신규 nonce를 발급하고 `assertSupervisorOwner`는 live Owner PID+same boot+Worker 상속 nonce 정확 일치를 요구한다.
- `NO_SPAWN` 관련 모니터·Actor·TEMP CAS는 source-only 후보이며 **설치된 원자적 Owner 인수 B operation이 아니다**.
- 계속 검토하려면 원래 **여섯 Listener 각각**의 nonce/launcher 계보, same-host private 비교, Watchdog과 동시 owner claim 배제, 2파일 Owner/heartbeat CAS·조건부 복구, 새 Runner spawn 없음, 새 Owner의 작업 admission을 종단 검증해야 한다. 단일 Worker nonce/WMI birth 관측으로 이 증거를 대체하지 않는다.
- 위 핵심 출처를 신뢰 가능한 방법으로 증명하지 못한다면 이 방식에 추가 소스만 반복하지 않고 B안으로 진행.

### B. 고아 Runner 6개 정확한 정상 종료 → 기존 R6 Watchdog 복구 — **우선 구현 후보**

- 이유: 당시 6개 콘솔 독립 실측과 TEMP Windows 콘솔 신호 시험이 존재하며, 6개 실제 종료 후 기존 Watchdog의 중복 방지 계약을 **그대로 통과**시키는 경로이기 때문이다.
- **중요한 미입증:** 실제 설치 GitHub Runner 빌드의 `CTRL+C`와 `CTRL+BREAK` 종료 처리, 서비스/콘솔 모드, Listener·Worker의 정상 drain/취소/손실 여부. `CTRL+BREAK`는 GitHub Runner에서 OS shutdown 의미로 해석될 수 있다. TEMP Node의 SIGBREAK PASS는 실제 Runner 작업 보존 증명이 아니다.
- 동일 OS/Runner 버전 및 독점 콘솔 조건의 격리 시험으로 실제 신호 종류·정상 종료와 타 프로세스 무영향을 분리 확정. 승인 없는 신호 종류 임의 교체 금지.
- 개별 PID 종료를 확인하기 전에 절대 다음 좌석을 중단하지 말고, 6좌석 중 하나라도 불명확하면 자동 재전송·대량 종료를 하지 않는다.

### C. 기존 S6 재호출/Watchdog 우회/임의 Owner 교체 — **제외**

- 기존 `pc-controller-s6-once`는 살아 있는 Supervisor 트리용이며 `/F` 강제 종료 경로가 있어 현재 dead Owner+고아 Listener 6개와 효과가 다르다.
- Guardian #4156, S6 #4069 같은 효과 재실행/요청 재발행, `taskkill /F`, 보호 판정 삭제, 수동 lease 삭제·Owner/heartbeat 덮어쓰기, PC 재부팅, Runner 6개 추가 생성은 승인된 복구 수단이 아니다.

## 4. 승인 없이 즉시 수행할 실제 개발·검증

**작업은 가능한 구현/CI까지 직접 진행**한다. 설치 전 권한 부족을 이유로 기존 완료된 조사·PR·테스트를 재생산하지 않는다.

1. 제어 저장소 최신 `main` / dirty·오픈 PR / #4156·#4221의 최신 실제 증거 및 현행 설치·정책 상태를 확인해 *변경된 사실만* 갱신한다. 문서에 남은 SHA를 설치 현재값으로 사용하지 않는다.
2. 기존 소스를 재사용:
   - `tools/supervisor-orphan-six-graceful-b-coordinator.mjs`
   - `tools/supervisor-orphan-six-b-admission.mjs`, `tools/supervisor-orphan-six-b-flat-request.mjs`
   - `tools/supervisor-orphan-six-b-receiver-source.mjs`, `tools/supervisor-orphan-six-b-maintainer-inlet-source.mjs`
   - `tools/supervisor-orphan-six-maintenance-journal.mjs`
   - `tools/supervisor-orphan-six-windows-ctrlbreak-port.mjs`
   - `tools/supervisor-orphan-six-installed-seven-cas-readonly.mjs`
   - 기존 `tools/maintenance-agent.mjs`, `tools/update.mjs`, `tools/handoff-maintenance.mjs` 및 Win32 관측기·Watchdog.
3. 소스 후보와 설치된 기능을 구분한다. 현 설치 유지보수기에는 `pc-controller-orphan-six-graceful-once` 수신 분기가 없고 live RUNNER 신호 포트는 `ORPHAN_SIX_BREAK_INSTALLED_B_AUTHORITY_UNAVAILABLE`로 차단한다. 이 2개 **실제 실행 연결 결손**의 최소 수정·허용된 독립 Windows B private 포트를 구성하되 안전 거부를 단독 제거하거나 임의 일반 A/CMD로 실행 권한을 만들지 않는다.
4. Windows **격리 환경**에서 같은 Launcher/Runner 빌드의 정상 종료·0 Worker·독점 콘솔·다른 콘솔 생존·Owner/lease/Watchdog 충돌·PID 재사용/생성시각 drift·승인 철회·부분 중단·중간 크래시·원장 CAS·재실행 금지를 실제 실패 경로로 검증한다. 증명 안 되면 해당 효과 미구현으로 남긴다.
5. 기존 유지보수기의 **정규 7→7** 설치 명세에 현 설치 원문·정확 소스 SHA·9개 보호 source SHA256·기존 `ciControllerBPolicy` **그대로 보존**·backup·rollback·원본 CAS를 정합화한다. source 병합·테스트 PASS가 실제 설치 승인/실행이 아니다.
6. 전용 브랜치에서 최소 파일만 변경, 관련 CI의 **정확 HEAD**에서 회귀/보안/Secret 결과 확인, PR 리뷰·병합 범위와 운영 설치·Runtime 증거를 분리한다.

## 5. 별도 B 운영효과 승인 전후의 경계

**기존 Controller B CI 정책 교체**는 사용자의 명시적 지시대로 **보류** 중이다. 이번 문서나 신규 PR·이슈는 해당 교체 승인도, 고아 Runner 정상 종료 승인도 아니다.

- 승인 전: Controller/Runner/Watchdog/lease/Owner/heartbeat/유지보수 설치/DB/D1에 운영 쓰기·프로세스 종료 0건 유지. 기존 공식 읽기와 TEMP 격리 CI는 가능.
- 실제 복구 효과 승인 대상: 정확 `controller-orphan-six-graceful-once` **고아 Controller Runner 6개만** Worker 드레인·각 좌석 신원/독점 콘솔 확인 뒤 **일회성 협조 종료**, 기존 R6 Watchdog 복귀. 강제 종료, Controller B CI 정책 변경, 다른 Runner/외부 프로세스, DNS·DB·수집·게시·예약 변경은 **제외**.
- 실행 직전: 최신 실제 운영 PC 설치 소스/7파일·보호 9 source·Controller/Watchdog·Owner/host/heartbeat의 **서로 다른 raw SHA 대상**과 private six PID/birth/path/console pin, Worker=0, 관련 lease=0, intake pause/drain, one-use claim 및 Watchdog in-flight fence를 현재값으로 검증한다.
- 승인 범위의 실행을 위해 정규 독립 설치기·실제 B 승인 manifest/원본 댓글/PR 출처·OS 원장·lease가 충족되지 않으면 **운영 STOP**. 위 조건을 일반 소스 작업이나 무관한 서비스의 전역 blocker로 확장하지 않는다.

## 6. 승인 후 단회 실제 운영 절차 (승인 전 실행 금지)

1. 독립 Windows B 수신기에서 정확 Install/Actor/Approval/Controller/Watchdog CAS와 one-use claim 소유 확인. 경합 설치·진행 중 원장/불확실 요청은 **재실행하지 않는다**.
2. 새 작업 intake 차단/ACK·기존 Worker 0·관련 lease 0·다른 쓰기/승격 비진행을 확인한다. 실제 정상 업무가 돌고 있으면 진행을 보류한다.
3. 처음 고정한 여섯 Listener ID와 현재 WMI/콘솔을 다시 대조한다. 한 좌석당 **신호 직전 최신 B 승인 결정** 및 durable `STOP_INTENT` fsync+raw readback을 기록한다.
4. 한 좌석에서만 실증된 **정상 종료 신호 1회** 제출 후 같은 old PID+birth가 사라졌음을 동일 호스트 WMI **이중 재조회**로 증명한다. `SENT` 응답은 exit 증거가 아니다.
5. 성공한 좌석 원장 CAS 갱신 후 다음 좌석 반복. 신호 실패/timeout/PID drift/다른 콘솔 구성원/Worker 재진입/Watchdog 경합 시 원본 원장·lease를 보존하고 `RECOVERY_REQUIRED`로 **정지**, 자동 재송신·강제 종료·추정 성공 금지.
6. 여섯 old Listener 전원 부재·중복 Runner 0·원장 단계 검증 후 기존 정규 Watchdog 경합 보호를 해제하고 R6의 정상 Supervisor 선출을 관찰한다. 새 Owner·heartbeat·6 Runner 정상 재연결 확인.
7. `runner-smoke PASS`, R6 `HEALTHY`, Standby 각자 독립 PID/IPC 2/2 `READY`, 원장/업무 결과/Issue·Run·JSON/TXT를 비교. `POSTCHECK_PENDING`이나 일반 HTTP/Job 200만으로 종료 판정 금지.

## 7. 보고·진행률과 인수

- **작업 단위:** 소스 구현/CI·PR 병합, 설치 준비/승인, 실제 B 단회 실행, Supervisor/R6/Standby/Runner 종단 정상화 **각각 별도 상태**로 보고한다.
- 담당자는 기존 GitHub #4156 원장 및 원래 Run/claim에 최소 필요 내용만 기록한다. 새 Gate·중복 Issue·독립 Controller·새 예약·무관한 보고서 양산 금지.
- 진행 보고는 **이번에 실제 끝낸 변경·검증, 직접 blocker, 다음 한 필수 실행**만 남긴다. 시작/종료 진행률은 실제 Supervisor 운영 복구 0/1 기준.
- 실운영 정규 B 권한이 아직 없다면 가능한 소스 구현·Windows 격리시험과 설치 source 계약을 마무리하고, 사용자에게 **정확한 신규 운영효과 승인 범위와 현장 CAS**를 제시한다. 같은 `계속` 지시를 재차 요구하지 않는다.

**효력:** 본 문서는 작업 지시·계획 정본일 뿐이며 승인 파일, 운영 장비 설치·권한 위임, 기존 정책 교체 또는 B 운영 효과 실행 증빙으로 사용하지 않는다.
