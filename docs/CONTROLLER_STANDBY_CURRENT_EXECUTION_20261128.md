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
- [PR #4246](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4246) → 제어 main `f816c498d3aae937698835b29141b14f6ee65ed2`: Public owner-only Controller 신원 검증·출력 축약용 런타임 4파일을 기존 검토된 Draft 코드에서 선행 분리, 정확 HEAD `90591cde1aca0b06d1a57f61d49fb8e07fb5d60c` GitHub-hosted [CI #46032445044](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46032445044) SUCCESS. **`pc-job.yml`은 Private-only 그대로**이고 Public Windows A Job 활성화·운영 Controller 설치는 미완료. 유지보수기 실제 인계 PASS는 아래 별도 현장 증거로 분리한다. 중앙 원장 [#68/7223125920](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223125920).
- [PR #4247](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4247) → 제어 main `b92ca9f36ad53005e861a93c72b76bd5f5ab9cf7`: 현장 설치 기준 Controller `3c7d4cfe...`를 유일한 부모로 하는 **4파일 선택 통합 커밋 `20d5bbbf305531dca9bf5b74744df83daf37cf17`** 작성. 검토된 main `f816c498...`의 정확한 네 blob·SHA256을 유지하고 엔진·Supervisor·설정·Private-only Workflow 무변경. 제어 `drafts/controller-public-a-selective-candidate-20261128.json`은 `approved:false`이며 운영 설치 manifest 아님. [Run #46033331267](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46033331267) hosted source CI SUCCESS 및 선택 통합 신규 3시험 PASS. 제어 B 효과 승인·운영 적용은 미완료.
- [PR #4250](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4250) 제어 main `3bed26ecabde1ac9046e000b1b32d912fa1ab53b`: 인증된 Public A Job의 실행 실패도 이전 Private 방식과 같은 Run/Job/좌석/진입 실패 검증으로 분류, 무조건 재실행·가짜 PASS 없이 원래 실패 보존. [Source CI #46035036268](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46035036268) SUCCESS, 관련 회귀 23/23 PASS. 이전 실제 유지보수기 인계 소스 `feaf0a380890663d8881881bea63587576188c76`와 고정 9파일 비교에서 신규 대상은 `maintenance-contract.mjs`, `update.mjs` 2파일만 차이, 7파일 동일. 신규 C 인계 별도 승인·현장 검증 필요, 설치 증거 없음. 최신 원장 [#68/7223430357](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223430357).
- [PR #4251](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4251) → 제어 `main@2b07f3ee9080b9e2d97690e623126b93b57043c5`: 기존 C 인계 완료 소스 `feaf0a380890663d8881881bea63587576188c76` → 새 Public 사후검사 호환 소스 `3bed26ecabde1ac9046e000b1b32d912fa1ab53b`의 **2파일 7→7 단회 독립 인계 승인 명세**를 `approvals/maintenance-handoffs/3bed26ecabde1ac9046e000b1b32d912fa1ab53b.json`에 반영. `tools/maintenance-contract.mjs`, `tools/update.mjs` 외 7/9 소스 파일 해시 유지, `ciControllerBPolicy` 무변경, Public B 실행은 차단 유지. [Source CI #46035587770](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46035587770) SUCCESS, 유지보수기 회귀 57/57 PASS. 새 Windows 인계 PASS·지속 Poll은 **아직 미검증**. 중앙 원장 [#68/7223558628](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223558628).
- **유지보수기 인계 현장 완료**: [#68/7223128772](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223128772) Windows operator PASS, target `feaf0a380890663d8881881bea63587576188c76`; 이후 지속 poll은 unverified. 과거 `POLL_WAIT/GITHUB_PRIVATE_REPOSITORY_REQUIRED`를 현재 그대로 재확정하지 않으며 현장 인계 PASS와 혼동하지 않는다.
- [PR #4248](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4248) main `07378a0a296b33e98d9fad286fedcd9e955400a8`: 동일한 정확 4파일 overlay `20d5bbbf...`의 전체 전이 import closure를 기존 설치기 검사 함수로 검증, [CI #46033877362](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46033877362) SUCCESS. 운영 PC 미설치.
- [PR #4249](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4249) main `067c42a35a74afd2065529463c6fbc2ba4972bfb`: **Public 설치 후 사후검사 불일치 원인** 수정. 기존 유지보수기 `tools/maintenance-contract.mjs`·`tools/update.mjs`는 과거 Private `approved-pc-job`만 인식했고 Public 응답은 출처필드를 투영에서 제거하므로 정상 Public A도 검증 불가였다. Public 고정 Job은 중복 활성 거부, 신규 외부 정보 전송 없이 기존 운영 PC **영구 ledger**의 정확 요청 digest/실Job·seat·원본 Source/Controller SHA로만 `postSourceVerified` 확인. 임시 pointer 자동 정리 후에도 계약 유지. Public summary만으로 PASS 불가. [Source CI #46034563905](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46034563905) SUCCESS, 관련 회귀 22/22 PASS. **이는 main 소스만의 수정이며 새 유지보수기 C 인계/실제 B 적용 증거 없음**.
- Public A 소스 후보 [Draft PR #4232](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4232)는 미병합. 이전 통합 HEAD `8583b22454c5d7a50f3d6592778212dd8858eb22`의 GitHub-hosted CI [#46029482365](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46029482365) 92/92 PASS는 운영 설치가 아니다. 다른 담당자가 수정한 뒤 최신 HEAD 재확인 필요.

### 11월 28일 실제 Windows C 인계 차단 — 목표 Git 객체 미확보
- 사용자 제공 CMD 원본: `--source-sha 3bed26ecabde1ac9046e000b1b32d912fa1ab53b` 실행 시 `fatal: Not a valid commit name ...` → `AUTOMATION_BLOCKED/HANDOFF_ENVIRONMENT_ERROR`. 고정 `handoff-maintenance.mjs`의 `git merge-base --is-ancestor target HEAD`에서 사전 차단. 실제 운영 파일 교체·새 Receiver 인계 완료 증거 **없음**.
- GitHub 원격에서는 해당 target commit 존재, `main@2b07f3ee9080b9e2d97690e623126b93b57043c5`의 선조(ahead 3, behind 0), 승인 manifest 그대로. **운영 PC 로컬 checkout의 Git commit 객체 미인식**이 확인된 실패 조건, 로컬 브랜치·fetch 이력 미관측. 해당 실패를 새 승인·B 효과·Controller 설치 차단 오류로 오판하지 않는다.
- 운영자용 정규 수정 순서: `git -C "E:\\ZGmini\\projects\\zgmini-pc-control" status --short --branch`의 main/dirty 보호 확인 → 같은 경로에서 `git ... pull --ff-only origin main`(충돌 또는 다른 브랜치면 STOP, reset/clean/stash 금지) → `git ... cat-file -t 3bed...` 결과 `commit` 및 `merge-base --is-ancestor` 성공 확인. **새 증거 없이 기존 실패 handoff 재실행하지 않음**. Git checkout 이력이 충족된 경우에만 승인된 동일 C 2파일 인계 재시험, 실제 PASS/Receiver WMI origin/lease/백업·복구 원본 회수. B effect 계속 HOLD. [Issue #68 근거](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223625814).

### 실제 Windows C 2파일 인계 — 2026-11-28 PASS
- 사용자 제공 CMD 결과: `schema=ZGMINI_MAINTENANCE_HANDOFF_RESULT_V1`, `status=PASS`, `targetSha=3bed26ecabde1ac9046e000b1b32d912fa1ab53b`, `installedShaBefore=feaf0a380890663d8881881bea63587576188c76`, `code=STOPPED_RECEIVER_HANDOFF_AND_WINDOWS_ORIGIN_VERIFIED`, 신규 Receiver PID `36604`. 출력은 고정 7→7 C급 런타임 2파일의 **운영 인계 완료** 증거이며 백업 경로도 반환됐다. [중앙 원장 #68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223684178).
- 이전 목표 Git 객체 미인식 `HANDOFF_ENVIRONMENT_ERROR`는 fast-forward 동기화 후 정상 인계 완료로 해결됨. 동일 C 인계 재요청 금지.
- **남음:** 이후 `PUBLIC_SOURCE_ONLY` poll의 지속 수신 현재 관측, 별도 인증된 Public Controller B 운영 적용 경로/host CAS·rollback, 정확 4파일 target `20d5bbbf305531dca9bf5b74744df83daf37cf17` 설치, 설치 확인 후 Public A Workflow 활성화 및 새 owner `runner-smoke` 원본 결과. 이 C PASS만으로 B 효과 허용·Controller 설치 완료·A 실행 성공을 주장하지 않음. 진행률 기준 3/8 단계 유지.

### 다음 실제 필수 실행
1. **유지보수기 독립 C급 handoff 이미 완료**: 사용자 제공 Windows 실행 원본에서 `status=PASS`, `code=STOPPED_RECEIVER_HANDOFF_AND_WINDOWS_ORIGIN_VERIFIED`, 교체 source `feaf0a380890663d8881881bea63587576188c76`. [Issue #68/7223128772](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223128772). 동일 인계 **재실행 금지**. 이는 인계 시점 Receiver origin 검증이지 이후 지속 `PUBLIC_SOURCE_ONLY` poll 검증은 아니다. 정상 Supervisor·Runner·Watchdog는 변경하지 않는다.
2. **Public Controller B 설치 효과 승인·인증 경로가 별도 필요**: 현 설치 유지보수기는 `PUBLIC_B_EFFECT_SEPARATE_AUTH_REQUIRED`를 유지한다. 정상 Supervisor·Runner를 일괄 중단하지 않고 새 Runtime 4파일 선택적 적용을 위한 현장 host/file CAS·owner·lease·스냅샷·복구 조건 및 신규 소스 수신 경로를 확인한다. 이전 C PASS를 B 권한으로 재해석하지 않는다. **적용 순서도 필수**: 기존 B 갱신기가 Supervisor 재연결 후 즉시 A postcheck Issue를 만들기 때문에, Private-only Workflow 상태에서는 POSTCHECK PASS가 나올 수 없다. 그렇다고 미설치 Controller에서 Public A Workflow를 조기 활성화하지 않는다. 승인된 보호된 Workflow 전환 시점과 설치 후 검사 연결을 명시한 실행 경로 확보 전에는 B를 시작하지 않는다.
3. 안전한 Controller/Workflow 실제 적용 후 Owner 신규 고유 A `runner-smoke` 1건만 실행하여 Run/Job/seat·Supervisor owner 검사·로컬 JSON/TXT 및 공개용 안전 projection 원격 readback을 확인한다.
4. 유지보수기 `PUBLIC_SOURCE_ONLY`는 B `LISTENING`과 구분하고, B effect는 별도 승인 전 HOLD한다. 기존 UNKNOWN #3947/#4069/#4156 미재실행, Supervisor·Runner6·Watchdog·Standby2·원장/SQLite/D1 변경 없음 확인 후 실제 재개 범위만 닫는다.

최신 중앙 원장 [#68/7223430357](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223430357). 사용자에게 임의 CMD 반복이나 추가 장애 주입 시험을 요구하지 않는다.

## 6. 완료 판정
현재: Supervisor/6 Runner/Watchdog/Standby2 운영 정상 관측 + 공개 Windows CI 격리시험 + **Public 유지보수기 독립 인계 실제 PASS(해당 시점 신규 Receiver 출처 검증)** + Public-safe Controller 소스 main 반영 + 정확한 4파일 선택 통합 후보·source-only 회귀시험 완료.
**미완료:** PR #4251 2파일 유지보수기 변경의 *새로운 Windows C 인계* 및 이후 Public metadata-only 수신 readback, Controller 4파일 B 운영 적용을 위한 현장 CAS·별도 B 효과 인증, *Controller 실제 설치→Public Workflow 활성→A postcheck*의 안전한 순서·원본 실행 증거, 신규 A급 JSON/TXT readback. Public B 효과 계속 HOLD. 승인 없는 운영 변경 없음.
문서·CI·main 병합만으로 실제 PC 자동 업무 재개 또는 전체 HA 완료를 선언하지 않는다.
