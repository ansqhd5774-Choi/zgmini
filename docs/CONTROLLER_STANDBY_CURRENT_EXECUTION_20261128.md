# 보조 Controller — 현재 실행 상태 및 인수 원장
기준일: 2026-11-28 KST
총괄: zgmini / codex/controller-ops-lessons-20261105
이 문서는 R3/R4의 과거 기록을 보존하면서 현재 다음 행동을 정정한다.

## 0. 2026-11-28 03:51 KST 복구 후 우선 판정 — 과거 4/8 기록 대체

**현재 우선 결론:** Public 저장소에서 일반 작업자 PC 업무 재개에 필요한 Controller 설치·실행 복구 **8/8(100%) 완료**. 아래 §1 및 §5~§6의 `3c7d4cfe…`, `POLL_WAIT`, `4/8(50%)`, B 미설치·A 미실행 문구는 **각 관측 시점의 복구 전 역사 기록**이며 최신 운영 상태/실행 지시가 아니다. S6 원본 `#3947/#4069`의 과거 불확실성 및 전원·호스트 장애까지 포함한 모든 HA 전환 보증은 이 완료 범위에 포함하지 않는다.

| 검증 대상 | 현재 증거 기반 판정 |
|---|---|
| B급 Controller 복구 | 독립 인증 Windows 운영자 원본 요청 [#4263](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4263#issuecomment-7225893906) `PASS/B4263_ORIGINAL_REQUEST_RECOVERED`. 실제 설치 Controller `555f95708984580cd7d5a0fd05a80b718e867710`. 원본 요청 중복 실행·신규 B 요청 없음. |
| Public 일반 A 실행 | [#4266 Run 46051863226](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46051863226) `core-status`, [#4267 Run 46052065337](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46052065337) `runner-smoke`: Windows `public-approved-a` 각각 SUCCESS, seat 6, 설치 SHA 일치. 기존 고유 원본 요청과 [공개 JSON/TXT 2쌍](https://github.com/ansqhd5774-Choi/zgmini-pc-control/tree/main/results) 필드 일치. 별도 재실행 불필요. |
| 복구 후 Runtime·수신기 | 운영 PC 읽기 전용 관측 `2026-11-27T18:51:09.042Z`(28일 03:51 KST): `runtimeState=HEALTHY`, Controller 파일 검증, Supervisor owner/heartbeat/6 children, Runner 6/6 online·idle, Workflow active, Watchdog HEALTHY, 설치 lease 미보유·backlog open 0. 유지보수기 신원·최신성 검증, `PUBLIC_SOURCE_ONLY/SOURCE_ONLY_VERIFIED` 정상 보호. [#4263 최종 관측](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4263#issuecomment-7225955420). |
| Standby **2개 최신 동시** READY | **재확인 미완료**. 이전 [#4156 원본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4156#issuecomment-7221305213)은 11월 27일 23:49:41 KST `standby1=READY, standby2=READY, standbyReadyCount=2`를 증명. 03:51 복구 후 관측에는 `standby=READY`만 명시되어 2개를 그 시각 동시에 검증했다고 주장할 수 없음. 이것은 이미 복구된 일반 A 업무의 전역 BLOCKER가 아님. |
| 로컬 비공개 전체 JSON/TXT | **독립 재열람 미확인**. 공개 `results/46051863226-1-seat-6.{json,txt}` 및 `results/46052065337-1-seat-6.{json,txt}`의 `PASS`·requestId·operation·SHA 일치는 GitHub에서 직접 재조회. 그러나 `SUMMARY_ONLY/PUBLIC_RESULT_CODE_REDACTED`이므로 Windows 로컬 비공개 원문 전체 확인의 대체가 아님. 운영 비공개 원문을 GitHub에 올리지 않는다. |
| 비신뢰 요청 차단 | Public B 자동적용 금지 및 소스/부정 회귀시험 증거는 유효. 추가 악성 요청 실주입은 수행하지 않았으며 이번 복구 종단 성공의 필수 재시험으로 확대하지 않는다. |

**다음 읽기 전용 확인:** 기존 공식 Windows 상태 계약으로 동일 관측시각의 Standby 2개 READY 원본을 확인하고, 허용된 기존 경로에서 로컬 전체 결과의 존재·내용을 독립 대조한다. 재조회가 불가능하면 해당 두 항목만 `UNVERIFIED`로 남긴다. 새 Controller 설치·B 재승인·Runner/Watchdog 재시작·Workflow 수동 변경·복구명령 재실행·장애 주입은 하지 않는다.

**조회 경로의 소스 확인(2026-11-28, 운영 변경 없음):** 제어 `main`의 `tools/automation-status.mjs`는 Watchdog 요약에 단수 `standbyRole`만 투영하므로 그 출력의 `READY`를 `2/2 READY`로 승격할 수 없다. 기존 `tools/runner-watchdog.mjs`는 운영 `E:/ZGmini/automation/pc-watchdog/STATUS.json`에 `standbyRole`, `secondStandbyRole`, `standbyReadyCount`, `at`를 기록한다. **동일한 최신 시각·소유 PID 검증과 역할 둘 다 READY/개수 2를 읽은 Windows 증거**가 필요하다. 웹/GitHub 소스 조회는 이 로컬 파일을 읽지 못한다.

로컬 전체 A 결과는 `E:/ZGmini/automation/pc-control/ledger/<requestId>.json`의 `report`가 보존 기준이다(`controller/engine.mjs`). `jobs/run-<runId>-1-seat-6/RESULT.json`·`RESULT.txt`는 공개 결과/댓글 검증 후 정상 임시 정리되는 구조이므로 해당 임시 파일 부재만으로 결과 소실을 추정하지 않는다(`controller/report-temp-retention.mjs`). `#4266`과 `#4267`의 서로 다른 고유 requestId에 대해 로컬 ledger의 원문 `jobId`/`operation`/`status`/`actualExecutionSha` 및 보호 결과를 **승인된 Windows 읽기 경로에서 직접 대조할 때만** 비공개 원문 확인으로 승격한다. GitHub의 축약 JSON/TXT 2쌍은 이미 대조 완료했으므로 다시 A Job을 발행하지 않는다. 이 대화에서 독립 Windows 호스트 로컬 파일 접근 경로는 확인되지 않았으며, 미확인 2건을 임의 PASS로 처리하지 않는다.

---

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

## 5. 과거 다음 필수 행동 — Public 유지 및 실제 PC 재개(복구 전 당시 기록)
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

### 실제 Public SOURCE_ONLY 수신 검증 및 오진 분류 수정 — 2026-11-28
- 실제 운영 PC `automation-status.mjs` readback (01:50:20 KST): 설치 유지보수기 `3bed26ecabde1ac9046e000b1b32d912fa1ab53b`, `maintenanceFilesVerified=true`, `receiverStatus=PUBLIC_SOURCE_ONLY`, 관측 약 50초 전, Receiver PID 일치, `diagnostics=[]`, `installLock.held=false`, `operationalWrites=0`. Controller `3c7d4cfefacf072fd35cb19706b352c64c5e4fd2` 정상, Supervisor 소유자/자식6/heartbeat 검증, Runner 6개 온라인·유휴, Watchdog HEALTHY, Standby READY. **독립 C급 유지보수기 설치 및 Public metadata-only 수신은 운영 실측 완료**. [Issue #68 근거](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223794770).
- `maintenanceState=UNVERIFIED`의 실제 소스 원인: 진단 함수는 receiver `LISTENING`만 HEALTHY로 인식했으나 Public은 보안상 `PUBLIC_SOURCE_ONLY`가 정상. [제어 PR #4252](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4252) merge `86edae7f8022cacdfb1a121484e3feda7bced227`, [CI #46037278715](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46037278715) 성공, `automation-status` 37/37 PASS. Public 상태를 `SOURCE_ONLY_VERIFIED`로 구분하지만 `automationState=PARTIAL_OR_UNVERIFIED` 및 Public B 제한은 그대로. 새 소스 GitHub 병합과 운영 설치는 구분하며, 실제 PC 검사당시의 출력은 그대로 보존.
- 다음 작업은 소스 진단 추가가 아니라 별도 인증이 필요한 **Controller 4파일 B 운영 적용/현장 CAS·백업·복구** 및 설치 후 `pc-job.yml` Public A 활성화 순서 확보, 신규 `runner-smoke` 정상 실행/JSON·TXT 대조. 기존 C PASS·UNKNOWN·상태 진단 재실행을 새로운 완료조건으로 만들지 않는다.

### Public A 설치 전 구버전 실행 위험 최소 수정 — 2026-11-28
- [제어 Draft PR #4253](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4253) source HEAD `91d2521592db813cde28c6f196c86ed79c6f1326`, base=`main`, **미병합**. Public owner A 워크플로 최초 단계에서 운영 설치 `host.json.controllerSourceSha=20d5bbbf305531dca9bf5b74744df83daf37cf17` + `controller/common,entry,preimage-manifest-stager,upload` 4파일 실제 원본 SHA256 및 symlink 없음 확인 후에만 stager/entry/always uploader를 허용한다. 구버전/변조/누락 시 기설치 Private Controller 실행·공개 원자료 송출 없음. 기존 Private Job 및 GitHub-hosted 관측은 동일. 이 가드는 B 효과 인증/운영 설치의 대체물이 아니다.
- [hosted Source CI #46039195091](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46039195091) 정확 HEAD Windows+Ubuntu **SUCCESS**, Windows 실제 임시 CMD 방식 누락 호스트 **exit 2, stdout/stderr 빈값** 시험 PASS. 기존 PR base Draft는 GitHub CI의 main-only 원본 검증에 차단됐으며, 보안 조건을 완화하지 않고 main 기준 새 **Draft**로 전환 후 시험함. Private self-hosted 운영 시험은 SKIP; 실제 PC 영향 없음. [Issue #68 증거](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7224064921).
- **현장 여전히** 설치 Controller `3c7d4cfefacf072fd35cb19706b352c64c5e4fd2`, 유지보수기 `3bed26ec...` 수신 정상. Public B `PUBLIC_B_EFFECT_SEPARATE_AUTH_REQUIRED`의 별도 인증과 4파일 CAS/lease/backup/rollback·Supervisor 보호·workflow cutover 순서 확인 전에는 PR #4253와 기존 #4232를 병합/운영 활성화하지 않음. 신규 `runner-smoke` 실제 결과는 아직 없음. 업무 종단 3/8단계 유지.

### 4-6 Public A Workflow `main` 통합 및 실제 Run — 2026-11-28
- **정규 통합 완료**: [PR #4254](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4254) exact 2파일 → 제어 `main@85be0582a57606434ffe2f02f7bddc662d3e3fa5`. 신규 `public-approved-a`는 고정 repo/owner Issue 신원과 최초 `host.json` 설치 SHA `20d5bbbf305531dca9bf5b74744df83daf37cf17`·4파일 SHA256를 확인한 후에만 고정 A entry/업로드 진행. 기존 Private PC Job 및 Public GitHub-hosted readonly Job는 원본 그대로 유지. [source CI #46040126376](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46040126376) SUCCESS; 이전 후보 [Windows·Ubuntu CI #46039195091](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46039195091)로 CMD 부정값/무출력 검증 재사용.
- **실제 owner Issue #4255** `pc-stage4-activation-4254-20261128-01`: [Run #46040328689](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46040328689)에서 `public-approved-a` 실제 **`zgmini-pc-06` 배정**. 현장 기존 Controller SHA 때문에 설치본 preflight FAILURE, stager/entry/uploader **전부 SKIPPED**, legacy Private job SKIPPED. 실제 승인 A worker 실행/출처 업로드는 **없음**. 한 번 생성한 원 요청 재실행 금지. labeled 중복 이벤트 Run #46040328231 모두 SKIPPED.
- **실제 이벤트로 발견·수정한 GitHub-hosted 문제**: #4255 Public readonly `PUBLIC_PC_JOB_ISSUE_IDENTITY_DENIED` (필수 아닌 상위 `event.number` 요구). [PR #4256](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4256) main `7d3a2513c2c516c2a864d8c9658ccf3b00094213`에서 필수 `event.issue.number` 검증과 계정·라벨 보호를 유지하면서 실제 GitHub 공식 Issues webhook 구조를 수용. [CI #46040608600](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46040608600) SUCCESS.
- **새 고유 검증 Issue #4257** `pc-stage4-readonly-confirm-4256-20261128-01`: [Run #46040782051](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46040782051)에서 hosted `public-readonly-intake` SUCCESS/`CANDIDATE_ONLY`/`PUBLIC_PC_JOB_READONLY_CANDIDATE`, `executionAuthorized=false`, `controllerBAuthorized=false`, `operationalWrites=0`. 같은 Run `public-approved-a` 실제 **`zgmini-pc-04` 배정**, 설치 구버전 preflight 실패, stager/entry/uploader 전부 SKIPPED. labeled 중복 Run #46040783918 전체 SKIPPED. 원래 소스 SHA·실행 결과를 절대로 PASS로 소급하지 않는다.
- **4-6 정확 판정**: Public 저장소 최신 main의 Workflow 통합·GitHub Events 접수·실제 Windows Runner routing·구버전/민감 실행 차단 및 hosted readonly 처리 **DONE**. 전체 8단계 중 4단계 소스/운영 Admission·Guard 완료 **4/8(50%)**. 이는 **7단계 A worker 실행 PASS가 아님**. 설치 Controller 아직 `3c7d4cfe...`, Public B 효과 `PUBLIC_B_EFFECT_SEPARATE_AUTH_REQUIRED` 그대로. 원본 로컬 JSON/TXT 및 원격 안전 공개 결과는 새 Controller 실설치 이후의 작업.
- 원본 증거: [제어 Issue #68/7224280130](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7224280130). 과거 Draft #4232/#4253는 변경/보안 계약을 재검토하지 않고 중복 병합하지 않는다.

### 5단계 정확한 Public Controller 설치 계약 준비 — 2026-11-28
- **원래 설치 불가능한 사후검사 원인 수정:** 독립 설치기 `tools/update.mjs`는 고유 `PC Update <requestId> postcheck` 제목으로 Owner A postcheck를 생성하지만 Public `pc-job.yml`은 정확 `pc-job` 제목만 받던 구조였다. [PR #4258](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4258) main `9b12c27a341fe3f982e93a631497bdf23547d371`, [hosted CI #46042084726](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46042084726) PASS: 기존 `pc-UUID` 또는 `pc-update-UUID` 요청의 본문 `<id>-postcheck`, 정확 title+기존 허용 A 진단만 Owner Public Workflow/Controller에서 수용. 기존 Private·Public B 보호·결과 축약 무변경.
- **이전 4파일 선택 통합 `20d5bbbf...`는 이제 최종 후보에서 제외**: 새 사후검사 진입 확인 코드가 없어 설치 후 실제 postcheck를 통과할 수 없음. 기록은 보존하되 설치를 요청하지 않는다.
- **신규 정확 4파일 후보 `555f95708984580cd7d5a0fd05a80b718e867710` 생성**: 브랜치 `codex/public-a-controller-postcheck-selective-20261128`, 단일 부모는 실PC 마지막 관측 Controller `3c7d4cfefacf072fd35cb19706b352c64c5e4fd2`. diff는 `controller/common.mjs` (raw SHA256 `9e940a92c0f3ac332ba4d8a5d52b4bac0d647340bdb30863e2628b5b70d27083`), `entry.mjs` (`1874aa1b0b9c6ce109a15737a608a711b81aecb7e3bdcc475032be8b54c1dca7`), `preimage-manifest-stager.mjs` (`806950791803cfc9a1fb387dfdbc4b74757304c48df20e90a2d9b76d52c8cf10`), `upload.mjs` (`a0a6065c7f2fd8f816e6b0a9efd9e7aba14e990bd0336aadc6b0be74baaefe8e`)만. 동일 main 원본 blob/전이 import closure·기본 설정·engine·Supervisor 불변.
- [PR #4259](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4259) → main `197e06b13287fb2e4a869d1d3e764756ecf119b4`, [CI #46042593781](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46042593781) SUCCESS: Public A Workflow의 설치본 사전검사 SHA/4파일 해시를 새 후보로 고정했고 기존 구형 Controller 실행 차단은 그대로. 신규 `drafts/controller-public-a-postcheck-selective-candidate-20261128.json`에 `approved=false`/`publicBEffectAuthorized=false`/`operatingPreimageRawCasVerified=false`/미설치 명시. **source 검증 통과와 운영 설치 승인·실제 CAS 확인은 별개**.
- **실제 차단**: 독립 설치된 유지보수기 `3bed26ec...`는 Public에서 `PUBLIC_SOURCE_ONLY`만 수신, B Issue에 `PUBLIC_B_EFFECT_SEPARATE_AUTH_REQUIRED`를 반환. 기존 Owner `tools/maintenance-request.mjs`도 Private 저장소 인증 조건이라 Public B 요청 제출 불가. 새 target에 대한 정규 `approvals/controller-selective-targets/<target>.json`, `approvals/controller-updates/<target>.json`는 main에 없고 별도 effect-specific 인증 승인·업로드 경로 및 최신 on-host 원본 CAS·lease 관측도 없다. **승인 없는 B 인가 manifest를 작성하거나 수신기 보안을 삭제하지 않음**.
- 기존 `tools/update.mjs`의 안전한 적용 순서는 별도 인증+원본 CAS·원장 → staging → Public Workflow pause → 6 Runner/업로드 drain+lease → snapshot/보호 readback → 독립 Supervisor owner 정확 stop/4파일 교체/6 Runner reconnect → Workflow resume/backlog 보존 → 기존 고유 postcheck 최초 1회 실행·원본/공개 결과 비교 → 필요 시 정규 rollback. 현장 실제 B 적용은 미실행, 건강한 6 Runner/Watchdog/Standby·DB/D1·UNKNOWN 보존. [Issue #68 실증/차단 근거](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7224557021).
- **완료 판정**: 5단계 SHA/4파일 원본·소스 검증 및 사후검사 연결 후보는 완료, **B 별도 운영 승인·인증된 독립 Windows 적용 경로·직전 CAS 미확보로 5단계 미완료**, 전체 **4/8(50%)** 유지. 4-6 Public A 접수·조기 실행 차단은 실Run 완료, 그러나 목표 설치 후 A PASS 아님.

### 당시 다음 실제 필수 실행(복구 전 역사 기록, 재실행 지시 아님)
1. **유지보수기 독립 C급 handoff 이미 완료**: 사용자 제공 Windows 실행 원본에서 `status=PASS`, `code=STOPPED_RECEIVER_HANDOFF_AND_WINDOWS_ORIGIN_VERIFIED`, 교체 source `feaf0a380890663d8881881bea63587576188c76`. [Issue #68/7223128772](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223128772). 동일 인계 **재실행 금지**. 이는 인계 시점 Receiver origin 검증이지 이후 지속 `PUBLIC_SOURCE_ONLY` poll 검증은 아니다. 정상 Supervisor·Runner·Watchdog는 변경하지 않는다.
2. **Public Controller B 설치 효과 승인·인증 경로가 별도 필요**: 현 유지보수기 `3bed26ec...`는 `PUBLIC_SOURCE_ONLY`이며 `PUBLIC_B_EFFECT_SEPARATE_AUTH_REQUIRED`를 유지한다. 정상 Supervisor·Runner를 일괄 중단하지 않고 새 Controller 4파일 선택적 적용을 위한 host/file CAS·owner·lease·스냅샷·복구 조건 및 별도 인증된 적용 경로를 확보한다. **Public A Workflow는 위 4-6에서 이미 활성화됐으나** 운영 Controller가 구버전이면 설치본 검사에서 안전하게 차단된다. 따라서 B 설치 후 postcheck Issue 최초 이벤트에서 가드를 통과하는지 검증해야 하며, C 인계를 B 권한으로 재해석하지 않는다.
3. **이미 활성인** Public A Workflow가 실제 target Controller 설치 뒤 정상 `runner-smoke`를 수행하는지, 새 고유 Owner A 한 건에서 Run/Job/seat·Supervisor owner 검사·로컬 JSON/TXT·공개용 안전 projection 원격 readback을 대조한다. 기존 구버전 차단 시험 Issue #4255/#4257은 재실행하지 않는다.
4. 유지보수기 `PUBLIC_SOURCE_ONLY`는 B `LISTENING`과 구분하고, B effect는 별도 승인 전 HOLD한다. 기존 UNKNOWN #3947/#4069/#4156 미재실행, Supervisor·Runner6·Watchdog·Standby2·원장/SQLite/D1 변경 없음 확인 후 실제 재개 범위만 닫는다.

최신 중앙 원장 [#68/7223430357](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223430357). 사용자에게 임의 CMD 반복이나 추가 장애 주입 시험을 요구하지 않는다.

## 6. 과거 완료 판정(복구 전 당시 기록)
당시: Supervisor/6 Runner/Watchdog/Standby2 운영 정상 관측 + 공개 Windows CI 격리시험 + **Public 유지보수기 독립 인계 실제 PASS(해당 시점 신규 Receiver 출처 검증)** + Public-safe Controller 소스 main 반영 + 정확한 4파일 선택 통합 후보·source-only 회귀시험 완료.
**당시 마지막 완료:** 유지보수기 `3bed26ec...` 독립 Windows C 인계 PASS 및 Public SOURCE_ONLY 실측, Stage 4-6 Public owner A Workflow `main` 병합·GitHub 실Run·Windows Runner 배정·구버전 차단·hosted 후보 정상 readback까지 확인. **최종 정상 A 업무 미복구:** Controller 4파일 `20d5bbbf...` 실제 B 설치 효과 인증/현장 CAS·백업·복구/실행, 설치 후 최초 owner A 정상 PASS, 로컬 원본 및 원격 안전 JSON/TXT 회수. Public B 효과 계속 HOLD. 4/8단계(50%)지만 종단 기능 복구가 아님.
문서·CI·main 병합만으로 실제 PC 자동 업무 재개 또는 전체 HA 완료를 선언하지 않는다.
