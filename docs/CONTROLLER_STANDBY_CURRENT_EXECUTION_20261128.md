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

## 5. 다음 필수 행동
운영 PC를 멈추거나 보안 게이트를 삭제하지 않고, 공개 CI와 운영 제어의 경계를 확정한다.
가장 작은 운영 변경 후보는 기존 zgmini-pc-control의 비공개 전환이며 저장소 이름/Runner 등록/설치 바이트를 보존한다.
그러나 이전 사용자 Public 지시를 임의로 뒤집지 않는다. 공개 CI 준비와 요금 영향 차이를 제시한 뒤 이 가시성 변경을 명시 확인받는다.
승인 전 현재 공개 설정은 그대로 유지한다. 비공개 전환 승인 시에는 현장 상태를 재확인하고:
1. 기존 유지보수기의 자연 poll에서 LISTENING 회복
2. 원본 UNKNOWN이 자동 재실행되지 않았는지 확인
3. 새 고유 runner-smoke A 한 건의 실제 JSON/TXT/실행 SHA 회수
4. Controller·Watchdog·2 READY·6 Runner·원장 보존 확인
5. 실제 확인 범위로 운영 완료와 잔여 warm-failover 검증을 구분
원래 S6 재실행이나 새 장애 주입을 단순히 진척 수치를 채우기 위해 수행하지 않는다.

## 6. 완료 판정
현재: Active+Standby2 운용 확인 / 공개 Windows CI 확인 / 운영 접수 및 작업 성공 검증 미완료.
문서 수정·13개 격리시험을 운영 HA 전체 완료로 집계하지 않는다.
