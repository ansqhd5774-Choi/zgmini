# 보조 Controller — 현재 실행 상태 및 인수 원장
기준일: 2026-11-28 KST
총괄: zgmini / codex/controller-ops-lessons-20261105
이 문서는 R3/R4의 과거 기록을 보존하면서 현재 다음 행동을 정정한다.

## 1. 현재 완료·미완료
- 현재 Supervisor PID 25256, Watchdog PID 43904, Controller source 3c7d4cfefacf072fd35cb19706b352c64c5e4fd2.
- 2026-11-27 23:36 KST 직접 사후검증 11/11: 정상 heartbeat/owner, Controller manifest 바이트, 살아 있는 6자식, Watchdog HEALTHY, 두 Standby READY, GitHub Runner 6/6 Online.
- Supervisor 25256의 실제 실행 인수는 controller/standby.mjs이며 부모는 Watchdog 43904. Standby의 실제 Supervisor 승격 경로가 사용되었음을 직접 확인했다.
- 이것은 기존 S6 단회 요청 #3947/#4069가 성공했다는 증거가 아니다. 정상 운용 중인 warm standby에서 장애가 발생하는 모든 경우나 PC 전원 장애 내성을 입증하지 않는다.
- #4230 runner-smoke의 46017319371 / 46017321376은 private-only Workflow 조건으로 SKIPPED. 실제 A 작업 결과는 아직 미검증이다.
- 유지보수기는 POLL_WAIT / GITHUB_PRIVATE_REPOSITORY_REQUIRED. 공개 저장소와 기존 보안 계약 불일치가 직접 실행 차단이다.
- 건강한 현재 Runner를 대상으로 고아-six 종료·Owner 인수를 실행하지 않는다. PR #4229 HOLD를 유지한다.

## 2. 자동 시작 설명 정정
기존 Guardian 27308/Watchdog 43904는 2026-11-27 23:32:46 KST에 이미 시작됐다.
현재 정상 Watchdog은 해당 프로세스다. 이후 Guardian 2개가 추가 시작됐지만 Watchdog 본체는 하나다.
수동 시작이 필수였다고 한 Codex의 조기 판단은 정정한다. 자동 시작 누락은 입증되지 않았다.
정상 Watchdog을 다시 시작하지 않는다. Guardian 중복 실행 개선은 별도 비차단 항목으로 관리한다.

## 3. 원래 S6 효과 원장
원본 pc-s6-63afb126-72dc-4ec5-a721-4819771fa9ee의 현장 journal:
- status/phase: RECOVERY_REQUIRED
- code: S6_PORT_PROMOTION_UNVERIFIED
- failedAt: WATCHDOG_RELEASE_OUTCOME_UNVERIFIED
- leaseReleaseAcknowledged=true, mutationAttempted=true
- 당시 backlog pause/resume 기록은 존재한다. 원본 결과·claim·journal을 덮어쓰지 않는다.
기존 요청을 재발행하거나 현재 정상 프로세스에 같은 STOP을 다시 실행하지 않는다.
과거 불확실한 효과와 현재 별도 자연 복구 결과는 분리 기록한다.

## 4. 공개 CI 분리 — 이번 실제 반영
- 공개 소스 저장소: https://github.com/ansqhd5774-Choi/zgmini-pc-control-source
- snapshot commit: 5b2db84694367711c766781a5e72f371909b9e57
- 원본 code source: zgmini-pc-control@3eab41671d7c3acc7d2321d0b7abc9cb84dc0e2d
- 공개 범위: 기존 common/standby/supervisor/watchdog 및 Windows 격리시험 5파일. SOURCE_REVISION.json에 바이트 SHA-256 고정.
- 운영 원자료·비밀정보·운영 원장·운영 Runner 등록·유지보수 수신기는 포함하지 않는다.
- GitHub-hosted windows-latest / Node 22, contents:read, checkout credentials 비보존. self-hosted/운영 PC 접속 없음.
- Run 46022582674 / Job 140585698092 SUCCESS: 실제 Windows 격리시험 13/13 PASS, 0 FAIL, 0 SKIP.
- 초기 workflow 단독 bootstrap commit 465abb87...의 Run 46022464847은 source snapshot 미등록 상태에서 실패했다. snapshot이 포함된 위 commit/성공 Run으로 구분한다.
- 이것은 보조 Controller 관련 공개 CI 분리이며 기존 모든 CI의 완전한 이관·무제한 무료 보장을 의미하지 않는다.
- 기존 운영 저장소에 GitHub-hosted job을 사용하는 Workflow 5개가 있어 비공개 전환 시 할당량 사용 범위가 남는다. self-hosted 운영 작업 자체와 구분한다.

## 5. 다음 필수 행동 — Public 유지 및 실제 PC 재개
2026-11-28 사용자가 `zgmini-pc-control` Public 유지를 확정했으므로 과거 비공개 전환 후보는 **폐기**한다. 요금제 변경·가시성 변경을 실행 재개의 대안으로 되살리지 않는다.

확정된 직접 원인: 기존 `pc-job.yml` Private 전용 Job과 설치 Controller의 Private 검증 때문에 Public에서 A Job SKIPPED (#4230), 독립 유지보수기 Private 검증 때문에 `POLL_WAIT / GITHUB_PRIVATE_REPOSITORY_REQUIRED` (#4156). 기존 Supervisor/6 Listener/Watchdog/Standby2 정상 상태와 구분한다.

### 현재 완료된 GitHub 소스 작업
- 제어 저장소 [PR #4241](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4241) → main merge `feaf0a380890663d8881881bea63587576188c76`: 유지보수기 owner/repo 숫자 신원 검증 후 Public metadata-only poll, B 효과 `PUBLIC_B_EFFECT_SEPARATE_AUTH_REQUIRED`. 기존 `pc-job.yml`·Controller 실행물 불변. 정확 HEAD CI [#46030250470](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46030250470) SUCCESS.
- 제어 저장소 [PR #4244](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4244) → main merge `b757143036bb98059080e4abfb64692b1a49c7f5`: C/독립 운영자 전용 handoff manifest `approvals/maintenance-handoffs/feaf0a380890663d8881881bea63587576188c76.json`, 설치 소스 `b08f3a482e9bb39523f47675ae06bc6e02e01d2d` → 목표 `feaf0a380890663d8881881bea63587576188c76`, 고정 9파일 raw SHA256 비교에서 기존 8개 동일, `tools/maintenance-agent.mjs` 1개만 변경. 정확 HEAD CI [#46030662722](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46030662722) SUCCESS. Controller B 설치 정책·워크플로/Runner 운영 효과 승인 확대 없음.
- [PR #4246](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4246) → 제어 main `f816c498d3aae937698835b29141b14f6ee65ed2`: Public owner-only Controller 신원 검증·출력 축약용 런타임 4파일을 기존 검토된 Draft 코드에서 선행 분리, 정확 HEAD `90591cde1aca0b06d1a57f61d49fb8e07fb5d60c` GitHub-hosted [CI #46032445044](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46032445044) SUCCESS. **`pc-job.yml`은 Private-only 그대로**, Public Windows A Job 활성화·운영 Controller 설치·수신기 인계는 모두 미완료. 중앙 원장 [#68/7223125920](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223125920).
- Public A 소스 후보 [Draft PR #4232](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4232)는 미병합. 이전 통합 HEAD `8583b22454c5d7a50f3d6592778212dd8858eb22`의 GitHub-hosted CI [#46029482365](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46029482365) 92/92 PASS는 운영 설치가 아니다. 다른 담당자가 수정한 뒤 최신 HEAD 재확인 필요.

### 다음 실제 필수 실행
1. **독립 C급 Windows 운영자 경로**에서 기존 source/설치 manifest 7파일 raw CAS·startup·Receiver WMI origin·lease·보호 백업 및 복구 조건을 fresh 확인. 기존 `tools/handoff-maintenance.mjs --source-sha feaf0a380890663d8881881bea63587576188c76`의 승인된 범위로 단회 인계하고 실제 새 receiver origin/status readback을 확보한다. 일반 Runner·Supervisor·Watchdog를 중단하지 않는다.
2. 위 metadata-only 인계로 **Controller B effect가 활성화되지는 않는다**. 기존 B GitHub Issue 경로가 Public에서 안전하게 실행될 수 있는 별도 인증된 운영 적용 경로는 아직 미확보다. Controller entry의 정확 설치 SHA/파일 preimage·승인·독립 보안 실행 경로를 확인하기 전에는 Draft #4232 Public A Job을 병합·활성화하지 않는다. 임의 shell·private gate 삭제로 우회하지 않는다.
3. 안전한 Controller/Workflow 실제 적용 후 Owner 신규 고유 A `runner-smoke` 1건만 실행하여 Run/Job/seat·Supervisor owner 검사·로컬 JSON/TXT 및 공개용 안전 projection 원격 readback을 확인한다.
4. 유지보수기 `PUBLIC_SOURCE_ONLY`는 B `LISTENING`과 구분하고, B effect는 별도 승인 전 HOLD한다. 기존 UNKNOWN #3947/#4069/#4156 미재실행, Supervisor·Runner6·Watchdog·Standby2·원장/SQLite/D1 변경 없음 확인 후 실제 재개 범위만 닫는다.

중앙 원장 [#68/7222876454](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7222876454). 사용자에게 임의 CMD 반복이나 추가 장애 주입 시험을 요구하지 않는다.

## 6. 완료 판정
현재: Supervisor/6 Runner/Watchdog/Standby2 운영 정상 관측 + 공개 Windows CI 격리시험 + **Public 유지보수기 source-only 및 Public-safe Controller 코드 main 반영, 1파일 인계 승인 manifest 준비 완료**.
**미완료:** 운영 유지보수기 실제 설치와 receiver origin 검증, Controller Public-safe 설치 및 정규 Public A Workflow 활성화, 새 A급 작업 실행·JSON/TXT 원격 readback, B effect 인증 수신 경로.
문서·CI·main 병합만으로 실제 PC 자동 업무 재개 또는 전체 HA 완료를 선언하지 않는다.
