ZGMINI R10 자동 갱신 — CMD 선택 적용 패키지 R6
===============================================

목표: 기존에 승인된 PC Writer의 정상 게시 주기에 R10 원자료 6개 지표와
최근 완료 5분기 이력을 함께 갱신하도록 PR #893의 훅만 선별 회수합니다.
새 수집/게시 실행, 스케줄러/VBS 변경, D1 강제 쓰기, main 배포는 없습니다.

현재 준비 상태 (2026-10-29):
- GitHub 원본 검증: PR #893 병합 SHA 8a7634a5358cb19280725fe29a977ba4feb44be8
- 과거 기록 승인 Writer SHA: a477ef304425145f559352af4291e437e3b08a2d
- 위 두 SHA는 PC에서 재확인해야 합니다. PC 설치 및 정규 실행은 아직 미검증입니다.
- 위 승인 Writer SHA는 GitHub 원격에서 직접 조회되지 않았습니다.
  따라서 오래된 run-local.mjs의 정확한 해시는 실제 PC Git 객체에서 구합니다.
  보존된 고정 소스 SHA와 PC Git 객체가 다르면 즉시 중단합니다.

사용자 실행 순서:
1. ZIP을 새 빈 폴더(예: E:\ZGmini\r10-cmd-r6)에 풀어 놓습니다.
   ZIP 외부의 신뢰할 수 있는 GitHub 명세에 기록된 SHA-256으로
   ZIP 자체와 package-manifest.json의 해시를 먼저 대조하세요.
2. Windows에서 RUN_PREFLIGHT.cmd를 정확히 1회 실행합니다.
   결과 ASSET_R10_CMD_PREFLIGHT_RESULT.txt를 확인합니다.
   STATUS=READY_FOR_INSTALL인 경우에만 3번으로 진행합니다.
   STOP/ERROR_CODE가 발생하면 설치하지 말고 해당 TXT만 전달하세요.
3. RUN_INSTALL.cmd를 정확히 1회 실행합니다.
   결과 ASSET_R10_CMD_INSTALL_RESULT.txt를 확인합니다.
   STATUS=PC_SOURCE_INSTALLED_AWAIT_NORMAL_CYCLE이면 설치 단계만 완료된 것입니다.
   STOP이면 임의 재실행하지 말고 TXT를 전달하세요.
   승인 checkout이 아니라면 일체 변경하지 않습니다.
4. 기존 정규 Writer 실행이 자연스럽게 발생한 이후
   RUN_VERIFY.cmd를 정확히 1회 실행합니다.
   결과 ASSET_R10_CMD_VERIFY_RESULT.txt를 확인합니다.
   첫 주기 결과가 확인되면 다음 정규 주기 이후 같은 VERIFY CMD를
   정확히 1회 더 실행합니다. 정규 주기를 직접 강제하지 않습니다.

각 CMD의 입력: 없음. 모든 작업은 고정 승인 데이터 위치와 실제 등록
작업을 확인합니다. Node 22.13+ 및 PC 운영 checkout의 Git이 필요합니다.
ZIP 폴더 자체에는 .git이 없어도 되며, 가짜 .git을 만들지 않습니다.

중단 조건:
- 운영 작업이 동작 중이거나 잠금 파일/게시 SUBMITTING/불명확한 ledger
- 승인 Writer SHA·실제 실행 checkout·예약 경로가 일치하는지 확인 불가
- tracked dirty, 기존 dependency 버전/해시 불일치, R10 훅 일부 적용
- 패키지 해시 불일치, Node 버전 미달, 시험 실패, 예상 밖 소스 차이
- STOP 후 자동 반복 실행 금지; 에러 원인 확인 후 신규 승인 필요

금지 행동:
- 잠금·게시 원장 삭제, 프로세스 종료, Task Scheduler 재등록
- 기존 비활성 Writer 활성화, E: 경로 대체/초기화, DB·원장 삭제
- 수집기·Writer 수동 강제 실행, Cloudflare/D1 직접 게시, 사이트 배포
- ZIP 안 파일 수정, 검증 무시, 변경이력 초기화/강제 Git reset

안전장치:
- PREFLIGHT는 PC 파일 변경 없음(패키지 내 결과 TXT만 작성).
- INSTALL은 전제 조건을 만족할 때만 run-local.mjs 훅과
  필요한 동일 버전 의존 파일을 선택 적용합니다.
- 의존 파일이 기존에 있다면 정확한 GitHub 고정 해시와 같아야 하며,
  다르면 덮어쓰지 않습니다.
- 변경 전 run-local.mjs와 config.json은 PC 내 별도 백업으로 보존하고
  백업 SHA를 확인합니다. 설정에 있는 비밀값은 결과나 ZIP으로 내보내지 않습니다.
- Git commit 직전 실패는 변경 파일을 복원합니다.
  Git commit 이후 문제가 발생한 경우에는 이력 파괴를 막기 위해
  자동 reset하지 않고 STOP하여 수동 복구 대상으로 기록합니다.
- 설치 CMD는 승인된 코드를 배치할 뿐 원자료 수집/D1 게시를 실행하지 않습니다.
- VERIFY는 정상 주기의 Writer 기록만 확인합니다.
  두 D1 키의 개별 readback은 Writer 코드 및 정상 실행 결과로 판단하며,
  별도 Cloudflare 직접 조회를 했다고 보고하지 않습니다.

돌려보낼 파일:
- ASSET_R10_CMD_PREFLIGHT_RESULT.txt
- ASSET_R10_CMD_INSTALL_RESULT.txt (PREFLIGHT READY 이후에만)
- ASSET_R10_CMD_VERIFY_RESULT.txt (정규 첫 주기/다음 주기 각각)

주요 상태:
- BEFORE_SHA / AFTER_SHA / CONFIG_SOURCE
- HOOK_STATUS / TEST_STATUS / BACKUP_STATUS / RESTORE_STATUS
- R10_SIDECAR_RAW / R10_SIDECAR_HISTORY / D1_READBACK / NEXT_CYCLE

중앙 실행 기준:
https://github.com/ansqhd5774-Choi/zgmini/blob/codex/theme-fear-greed-integration-20261025/docs/CMD_EXECUTION_PLAYBOOK.md
작업별 계약:
https://github.com/ansqhd5774-Choi/zgmini/blob/codex/api-site-integration-r1-20261026/docs/ASSET_R10_CMD_ACTIVATION_CONTRACT.md
