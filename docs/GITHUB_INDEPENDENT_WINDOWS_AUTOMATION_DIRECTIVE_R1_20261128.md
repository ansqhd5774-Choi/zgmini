# GitHub 권한 및 독립 Windows 자동 실행 개선 R1
2026-11-28 · 총괄 실행 지시 및 진행 기록

## 목적과 범위
총괄 소속 zgmini / codex/controller-ops-lessons-20261105. 실제 제어 코드 변경은 zgmini-pc-control 최신 main 기반 전용 브랜치. 기존 AGENTS/PC_AUTOMATION_STANDARD 및 사용자 승인/보안 계약을 유지한다.
GitHub 요청 → 기존 Actions 검증 → 승인된 독립 Windows 유지보수기 → 실제 실행 → JSON/TXT/로그 → Runtime 검증 → 원장 정합화. 소스/CI/병합을 운영 완료로 간주하지 않는다.

## 실행 지시
1. 연결 계정/저장소 collaborator 권한, 실제 도구의 Contents/Actions/Workflow/Issues/PR/Checks 기능과 설정을 구분한다. 최소 권한만 사용하며 기존 pc-job Issue 트리거를 우선한다. 직접 dispatch 미지원은 권한 부족과 구별한다.
2. 기존 pc-maintenance 독립 수신기, Watchdog, manifest, 원자적 lease/CAS/백업/원복 및 결과 회수 재사용. A는 등록된 고정 조회만, B는 정확한 기존 승인 효과만, C는 기존 직접 인증을 유지한다. 공개 저장소의 일반 B polling 거부, 독립 Owner ancestry, 승인 취소 검증 및 민감정보 보호를 제거하지 않는다.
3. 실제 변경이 필요한 경우에만 최소 소스/Workflow를 작성하고 정상·미승인·취소·잘못된 SHA·중복·경합·복구·전달 실패·redaction 회귀시험과 정확 HEAD CI를 확인한다. 새 보안 효과나 C→B 전환은 별도 승인/설치된 신뢰 정책 없이 실행하지 않는다. 임의 shell/SQL, 환경변수 은폐, RDC, 새 예약/유료 서비스 금지.
4. #4069 최초 실증: 기존 s6-local-owner-readonly.mjs 독립 Windows 단회 실행 및 로컬 원장 대조 → controller-s6-4069-public-b-operator-once.mjs inspect → 보호 조건 PASS 시 정확 target 66b8a66c6112441576917e0ac9fbe4d39cbd5eea 단회 apply → 설치 해시, Controller/Watchdog, 공개 A 실제 실행 및 JSON/TXT/로그 readback. 원본 S6 재실행 금지. PR #4318/#4320/#4321/#4322의 유효 증거 재사용.
5. 최종 완료는 실제 Windows 읽기, 설치, 공개 A, 결과 회수 및 원장 정합화까지. 기존 C급 직접 실행 필요 시 이를 실제 제약으로 명시하며 승인 재요청과 혼동하지 않는다.

## 착수 증거 (2026-11-28)
- 인증된 GitHub 계정 ansqhd5774-Choi, 양 저장소 collaborator permission=admin 직접 확인. 이는 연결 도구 개별 API scope나 Windows Owner 인증을 증명하지 않는다.
- 연결 도구에는 Actions job/log 조회 및 재실행은 존재하나 신규 workflow_dispatch 작업은 현재 제공되지 않는다. 기존 pc-job 트리거는 정상 A 실행의 정규 대안.
- [#4326](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4326) / [Run 46090590261](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46090590261): #4069 최신 댓글에 seat3 공개 A core-status PASS, actualExecutionSha=d3764580fdb08ecddd5f9b1064051eec30f90492, JSON/TXT 2/2라고 기록. 원본 결과는 별도 직접 대조 대상.
- [#4069 최신 원장](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4069#issuecomment-7231330159): 신규 target 미사용, 독립 Windows 조회/inspect/apply 미완료. Closed 상태를 운영 성공으로 간주하지 않는다.
- 현행 main maintenance-agent.mjs는 공개 일반 B 요청을 PUBLIC_B_EFFECT_SEPARATE_AUTH_REQUIRED로 거부한다. 고정 CI 후보 별도 정책이 존재하나 기존 Owner 직접 실행 권한을 자동 대체하지 않는다.
- 다음 필수 행동: #4326 원본 readback, 이미 설치된 독립 실행기의 실제 승인 범위 확인. 직접 Owner 경로가 필요한 경우 기존 계약으로 진행. 공개 B 자동화 확대는 영향·별도 승인이 필요한 경우에 한해 설계한다.

## 진행률 계약
권한/구조 확인 10%, 권한 정합화 10%, 독립 계약 설계 10%, 연결 20%, 회귀 10%, 실제 읽기 10%, 설치 15%, 사후검증 10%, 원장 5%. 각 단계는 해당 효과의 증거로만 집계. 이번 문서 반영은 실제 Windows 실행이 아니다. 운영 변경 0.

## 원본 증거 회수 결과
- #4326 Run 46090590261: public-approved-a SUCCESS (job 140810318884), public-readonly-intake SUCCESS, approved-pc-job SKIPPED. 실제 Actions 로그 직접 회수.
- [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/46090590261-1-seat-3.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/46090590261-1-seat-3.txt) 원본 2/2 재조회 및 jobId/requestId/operation/seat/status/code/actualExecutionSha 일치. core-status PASS, seat 3, d3764580fdb08ecddd5f9b1064051eec30f90492. SUMMARY_ONLY/PUBLIC_REPOSITORY_REDACTED; 로컬 #4069 원장 자체를 읽었다는 증거 아님.
- 기존 public A 재사용 가능 확인. 신규 target 설치/Owner 직접 실행 미입증. 관리자 권한 추가 부여 불필요; GitHub 설정/운영 변경 0. 현재 단계는 권한 및 구조 확인 완료(10/100), 권한 정합화는 기존 admin 권한 확인과 별개로 도구별 쓰기/실행 범위 미완료. 다음 설계는 기존 독립 실행 계약을 유지하며 필요한 추가 권한 효과만 분리; 공개 B polling이나 C급 직접 인증 우회 금지.

## 독립 자동 수신 계약의 기존 실증과 정확한 차단 경계
- 운영 PC #3905 [원본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45839799357-1-operating.json), 2026-11-26 14:33Z: receiver PRESENT_FORMAT_ONLY, approvedV2PinMatches=false, approvedReceiptGuardPinMatches=true, executionAuthorized=false, installedSourceIntegrityAsserted=false. 과거 관측이며 현재 설치 정책을 단정하지 않는다.
- 격리 PC #4138 [원본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45902346176-1-handoff.json), 2026-11-26 22:05Z: CI_CONTROLLER_B_AUTO_POLICY_NOT_CONFIGURED, enabled=false 관측, policyConfigured=false, activationAuthorized=false. 현재 Public 저장소의 기존 private-only 진단을 재발행하지 않는다.
- 현 main maintenance-contract.mjs::installedControllerBPolicy는 공개 V2를 설치된 7파일 유지보수기 manifest의 정확 workflowId/blob/installedSha/targetSha/manifestSha256에 고정. 일반 Owner Issue나 환경변수로 이 pin을 만들 수 없다. maintenance-agent.mjs::processIssue는 공개 일반 B를 차단하며, CI 발행 봇도 정확한 설치 V2 및 원본 receipt가 없으면 차단한다. 기존 handoff 73f70de98b030d4bac0af48ac50023ec1bd7ce1f의 policy는 V1, workflow blob b568bbc5de05b2d6fff75419b88322b3e2de020c; 현 발행 Workflow blob 887cd36ee5ad438e634897f937b1a7c8958962e1과 다르다. 해당 과거 manifest를 현재 공개 V2 승인으로 재사용하지 않는다.
- 현 발행 Workflow는 기존 고정 publisher 및 공개 효과 별도 승인 조건을 이미 갖춘다. 새 Workflow는 불필요하다. 기존 #3939 Owner-native 직접 승인과 커넥터 작성 댓글의 구분 유지. 연결 GitHub 도구에는 Actions variables/settings 변경 기능도 제공되지 않는다. 사용자 승인 target #4321은 독립 Owner operator 계약이며 공개 CI B 수신 정책을 변경하는 승인이 아니다.
- 최소 설계 결정: A는 기존 pc-job; 현재 #4069는 별도 C/Owner 경로의 정확 승인 B operator로 한 번 수행; 향후 무인 B는 기존 CI publisher와 독립 수신기 V2만 재사용하되 별도의 정확 효과 정책 및 직접 설치 신뢰 계약 충족 시에만 활성화. 운영 PC와 격리 PC 관측을 혼용하지 않는다. 현재 사용자 직접 인증 없는 자동 B 수행 불가; 운영 변경 0. 설계 단계의 경로 확정만 인정하며 자동 B 연결/검증은 미완료.

## 현행 고정 발행기 실제 소스 대조 — 두 호스트 신뢰 분리
- Workflow .github/workflows/ci-approval-controller-b.yml (blob 887cd36ee5ad438e634897f937b1a7c8958962e1, workflow ID 430972394는 기존 원장 값)의 공개 실행은 격리 Windows label zgmini-handoff-ci-isolated에서 고정 source 4d3fe664a90f2e8c3dea885559b1ec263df66a24를 checkout한다. 해당 SHA의 ci-approval/completed-run-intake.mjs 원본을 직접 읽었다. GitHub 변수만으로 승인할 수 없으며 격리 호스트의 로컬 E:/ZGmini/automation/pc-maintenance/MAINTENANCE_INSTALL.json 및 정확 7파일 SHA256을 검증한다. 운영 PC의 별도 maintenance-agent.mjs도 자체 로컬 V2 정책을 검증한다. 두 호스트 중 하나의 승인/설치 증거를 다른 호스트에 복사해 PASS를 주장하지 않는다.
- #4069 기존 승인 효과 target=66b8a66c6112441576917e0ac9fbe4d39cbd5eea, installed=d3764580fdb08ecddd5f9b1064051eec30f90492, approval manifest raw SHA256=5652da3ae1ebed1273f5944a348e781e611db046efbd54cf4b406bcef69647f7 (#4321 원장). 이 값들은 기존 독립 Owner 설치 입력이며 공개 V2 설치 정책 승인이 아니다. 새 활성 policy 또는 변수 값을 생성/설치하지 않는다.
- #4324 merge adfd7f954d5289923d185b359d26d780c7b37b48는 로컬 backlog projection의 nullish resume 수정이며 immutable target에 포함되지 않음. 이를 설치된 수정으로 주장하지 않는다.
- 현재 #4069 직접 실행의 정확 경로: 실제 PC의 동일 사용자 독립 콘솔에서 checkout/source closure 및 기존 작업자 변경 보호 확인 후, 고정 node로 tools/s6-local-owner-readonly.mjs 단회 읽기; 원장 확인 후 tools/controller-s6-4069-public-b-operator-once.mjs inspect. 기대 PASS/PUBLIC_B_OPERATOR_PREFLIGHT_READY_ONLY, target 일치, installed=false, operationalWrites=0. 승인·현재 source/lease/CAS 일치 시에만 명시적 interactive apply 한 번. BLOCKED/STATE_UNKNOWN 또는 기존 claim은 즉시 중지 및 해당 영수증 정합화. 동일 ID 재실행 금지. 결과는 승인된 최소 출력만 회수한다. 자동 B 정책 전환을 위해 이 효과를 이중 소비하지 않는다.
- 이 확인은 실제 운영 실행 차단의 구체화이며 새로운 운영 완료 단계가 아니다. 진행률 20% 유지(기존 기록 기준), 운영/정책/변수 변경 0. 다음 필수는 현재 승인된 독립 Owner 실행이다. 무인 공개 B 정책의 새 효과는 별도 정규 승인 및 두 호스트의 설치 신뢰 확인이 필요하다.

## 2026-11-28 10:20 KST — 실제 독립 Owner 설치 성공 및 공개 A 종단 검증
- 사용자 CMD 증거: checkout clean fast-forward HEAD 9f21b5e2987e144c5d9b081ec6682d9613111389, 독립 reader 01:12:45.264Z READ_ONLY_OBSERVED, ownerVerified/independentOperatorVerified=true, #4069 RECOVERY_REQUIRED, WATCHDOG_RELEASE_OUTCOME_UNVERIFIED, originalFailureMatches=true, leaseReleaseAcknowledged=true, originalOwnerMatchesCurrent=false, pauseWindowContainsIssueOpenedAt=true, replayLedgerStatus=NOT_RECORDED. ACTIVE_RUNNER_PROCESS, installedSourceMatch=true; historicalPromotionVerified/liveWatchdogExecutionVerified=false. 원본 S6 재실행 0. [#4069 조회](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4069#issuecomment-7231511752).
- inspect PASS/PUBLIC_B_OPERATOR_PREFLIGHT_READY_ONLY, writes=0, target 66b8a66c6112441576917e0ac9fbe4d39cbd5eea. 단회 apply 사용자 화면 01:20:33.243Z PASS/APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED, installedShaBefore=d3764580fdb08ecddd5f9b1064051eec30f90492, actualInstalledSha=66b8a66c6112441576917e0ac9fbe4d39cbd5eea, protectedStateUnchanged=true, runnerSetVerified=true, postSourceVerified=true, workflowEnabled=true. [#4330](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4330).
- [#4331](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4331) / [Run 46092550651](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46092550651), seat2 public-approved-a SUCCESS, core-status PASS, [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/46092550651-1-seat-2.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/46092550651-1-seat-2.txt) 2/2 직접 원격 재조회 일치. actualExecutionSha=66b8a66c6112441576917e0ac9fbe4d39cbd5eea. SUMMARY_ONLY, 파일별 해시 원격 미공개.
- 신규 고유 A [#4332](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4332) controller-s6-4069-journal-readonly 등록된 operation 1회 제출. 현재 결과 대조 전. [#4069 회신](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4069#issuecomment-7231606201). 직접 Owner 설치 및 core-status 성공은 무인 공개 B 자동화 활성화 증거가 아니다. 기존 승인 효과 재설치 금지.

## #4069 후속 실제 실행 5/5 완료
- [#4332](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4332) / [Run 46092679070](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46092679070), job 140816964333 public-approved-a SUCCESS. seat3 controller-s6-4069-journal-readonly PASS, actualExecutionSha=66b8a66c6112441576917e0ac9fbe4d39cbd5eea. [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/46092679070-1-seat-3.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/46092679070-1-seat-3.txt) 원격 원본 2/2 일치. 정확 target source inspectS64069ReconciliationReadonly는 RECOVERY_REQUIRED, 실패 코드/lease 해제, backlog RESUMED, successEstablished=false 등이 충족되어야 PASS. 공개 summary만 전송; 원본 S6 성공 아님.
- [#4069 최종 원장](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4069#issuecomment-7231621493), [#4330 설치 증거 정합화](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4330#issuecomment-7231621966). #4069 후속 조회·설치·검증 5/5 완료. 재설치/원본 S6 replay 금지. 무인 B 자동 승인과 C급 직접 인증 경계는 별도 미완료이며 이 성과로 자동 활성화하지 않는다.
