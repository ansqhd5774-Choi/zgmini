ZGMINI R10 자동 갱신 — CMD 선택 적용 패키지 R10
===============================================

목표: 기존에 승인된 PC Writer의 정상 게시 주기에 R10 원자료 6개 지표와
최근 완료 5분기 이력을 함께 갱신하도록 PR #893의 훅만 선별 회수합니다.
새 수집/게시 실행, 스케줄러/VBS 변경, D1 강제 쓰기, main 배포는 없습니다.

현재 준비 상태 (2026-10-30):
- R7 PC PREFLIGHT는 STOP_WRITER_BASELINE_SHA_MISMATCH로 중단했습니다.
  승인 HEAD·config.source·last Writer source는 같고 tracked dirty는 NO입니다.
  Windows checkout의 CRLF와 Git blob LF 차이 가능성에 대비하여 R10은
  줄바꿈만 정규화해 내용 동일 여부를 검증합니다. 다른 문자/공백 변경,
  단독 CR, 혼합 줄바꿈은 계속 중단됩니다. 실제 원인은 PC R10 재확인 전 미확정입니다.
- GitHub 원본 검증: PR #893 병합 SHA 8a7634a5358cb19280725fe29a977ba4feb44be8
- 과거 기록 승인 Writer SHA: a477ef304425145f559352af4291e437e3b08a2d
- 위 두 SHA는 PC에서 재확인해야 합니다. PC 설치 및 정규 실행은 아직 미검증입니다.
- 위 승인 Writer SHA는 GitHub 원격에서 직접 조회되지 않았습니다.
  따라서 오래된 run-local.mjs의 정확한 해시는 실제 PC Git 객체에서 구합니다.
  보존된 고정 소스 SHA와 PC Git 객체가 다르면 즉시 중단합니다.
- R5 실제 Windows 관찰에서 Local-Core VBS -> local-cycle.mjs --publish ->
  run-local.mjs --publish 실행을 확인했습니다. R7은 이 실측 증거와 동일한
  Core VBS 해시를 고정 검증합니다. 새 예약 작업을 만들지 않습니다.
- 당시 Core 작업/Writer는 실행 중이고 잠금 파일이 존재했습니다.
  R10은 두 작업이 유휴 상태이고 다음 Core 예약까지 120초 이상 남아 있을 때만
  설치하도록 재검증합니다. 120초 미만이면 자동 실행/잠금 삭제 없이 STOP합니다.

사용자 실행 순서:
1. ZIP을 새 빈 폴더(예: E:\ZGmini\r10-cmd-r10)에 풀어 놓습니다.
   ZIP 외부의 신뢰할 수 있는 GitHub 명세에 기록된 SHA-256으로
   ZIP 자체와 package-manifest.json의 해시를 먼저 대조하세요.
2. Windows에서 RUN_PREFLIGHT.cmd를 정확히 1회 실행합니다.
   정규 작업이 실행 중이거나 다음 예약이 너무 가까우면 읽기 전용 상태 조회를
   최대 8분 동안 10초 간격으로 자동 재확인합니다. CMD 창을 닫지 마십시오.
   소스·해시·권한 오류는 기다리지 않고 즉시 중단합니다.
   결과 ASSET_R10_CMD_PREFLIGHT_RESULT.txt를 확인합니다.
   이번 R10은 우선 PREFLIGHT 결과 TXT만 전달하세요. 실제 PC 결과에서
   WRITER_BASELINE_EQUIVALENCE, 의존 파일 일치, 안전 게이트가 확인될 때까지
   INSTALL을 실행하지 마세요.
   STOP/ERROR_CODE가 발생하면 설치하지 말고 해당 TXT만 전달하세요.
3. 별도 승인 후 RUN_INSTALL.cmd를 정확히 1회 실행합니다.
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
- Core/Korea 예약 작업이 Ready가 아니거나 다음 Core 예약이 너무 가까운 경우
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
- 모든 CMD는 운영에 검증된 E:\ZGmini\runtime\node.exe만 사용합니다.
  PATH의 호환되지 않는 Node로 대체하지 않습니다.
- 전체 Node 프로세스 개수 대신 운영 Writer 관련 프로세스만 확인하고,
  명령줄/작업 상태를 확인할 수 없으면 STOP합니다.
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
- Git commit 후에는 더 짧은 30초 안전 시간도 다시 검사한 다음 config.source를
  원자적으로 변경합니다. Core/Korea 실행 중이면 중단하며 복구 증거를 보존합니다.
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

R10 추가 게이트: 혼합 LF/CRLF를 무조건 허용하지 않습니다. 기존 Git 원본과
모든 문자·공백·줄바꿈 제외 내용이 100% 같고, 단독 CR이 없을 때만 통과합니다.
실제 파일의 기존 LF/CRLF 패턴은 한 바이트도 고치지 않고 승인 훅만 삽입합니다.
WRITER_*_EOL, WRITER_*_CRLF, WRITER_*_LF 결과를 별도로 확인하세요.
현재는 RUN_PREFLIGHT.cmd만 실행하고, INSTALL은 별도 결과 확인 전 보류하세요.

R10 추가 게이트 (2026-10-31): R9 실 PC 사전검사는 Writer 전체 내용은
Git 원본과 완전히 동일했으나 publication-guard.mjs의 바이트 해시
차이에서 STOP했습니다. 이는 실제 코드 차이인지 줄바꿈 차이인지 미확정입니다.
R10은 guard를 덮어쓰지 않고 pinned PR #893의 guard와 전체 UTF-8
텍스트를 대조합니다. LF/CRLF 차이만 허용하고 코드·공백 변형,
단독 CR, 잘못된 UTF-8은 STOP합니다. 기존 의존 파일에도 같은 원칙을
적용해 반복되는 줄바꿈 STOP을 줄입니다. Git tracked clean 및
승인 source 확인, 스케줄러/잠금/원장 보안 조건은 그대로 유지합니다.
INSTALL은 이번 PC PREFLIGHT 결과 확인 이전에는 실행하지 마세요.
