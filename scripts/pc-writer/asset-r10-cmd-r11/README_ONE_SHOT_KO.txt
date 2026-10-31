ZGMINI — R11 원본 보존 + 1회 안전 설치 안내 (2026-10-31)

상태: Windows R11 INSTALL 결과 STOP_SCHEDULER_BUSY; Core=Running, lock=PRESENT, AFTER_SHA=NOT_APPLIED.

이 ZIP은 2026-10-31 검증된 R11 원본 28개 파일을 바이트 그대로 포함하며
추가된 RUN_ONE_SHOT_SAFE_INSTALL.cmd만 새 실행 진입점입니다.
R11 package-manifest.json의 승인 계약이나 내부 파일은 수정하지 않습니다.

1. 이 ZIP을 새로운 빈 폴더에 압축 해제합니다.
2. RUN_ONE_SHOT_SAFE_INSTALL.cmd를 1회 실행합니다.
3. 기존 R11 RUN_PREFLIGHT.cmd의 최대 8분 유휴 대기가 동작합니다.
4. READY_FOR_INSTALL + lock/process CLEAR + task Ready + manifest hash가
   모두 기록된 경우에만 원본 R11 RUN_INSTALL.cmd를 한 번 호출합니다.
5. RUN_INSTALL 자체가 승인 source, 예약 작업, 프로세스, lock, 게시 원장을
   재검증합니다. 예약 작업 실행으로 다시 busy가 되면 STOP으로 끝납니다.
6. RUN_INSTALL은 절대 자동 재시도하지 않습니다. 스케줄러/잠금/DB 변경은
   이 보조 파일에서 하지 않으며, 강제 게시/수집도 하지 않습니다.
7. ASSET_R10_ONE_SHOT_RESULT.txt와 ASSET_R10_CMD_INSTALL_RESULT.txt
   (존재할 때)를 전달합니다. 설치 성공 시 원본 R11의 RUN_VERIFY.cmd로
   정상 주기를 별도 검증해야 합니다.

안전 제한:
- 본 도구는 Windows 전용이고 PATH Node로 대체하지 않습니다.
- 기존 파일이 없거나 PREFLIGHT가 STOP이면 설치 호출하지 않습니다.
- 중단되면 반복 실행하지 말고 결과를 제출합니다.
- 새 CMD 파일은 R11 installer와 manifest를 우회하거나 수정하지 않습니다.

검증 범위: ZIP 내 R11 원본 28개 파일 해시·원본 Node 테스트 25건 통과;
새 CMD 자체는 Windows에서 실제 실행하지 않았습니다.
