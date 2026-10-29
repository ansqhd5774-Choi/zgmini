ZGMINI R10 - 정규 실행 원본과 게시 분기 읽기 전용 R5

앞선 R4에서 Local-Core VBS -> R38 -> R31 체인에는 run-local.mjs 호출이
직접 기록되어 있지 않았고 local-cycle.lock의 PID는 별도 local-cycle.mjs였습니다.
이번 한 번의 조회는 그 프로세스의 부모 프로세스 연결과 --publish/--korea
분기, 최근 local-cycle 결과, 등록 예약 작업 상태를 함께 확인합니다.

1. ZIP을 새 폴더 하나에 압축 해제합니다.
2. RUN_R10_LINEAGE_READONLY.cmd를 정확히 한 번만 실행합니다.
3. 생성된 ASSET_R10_LINEAGE_RESULT.txt 하나만 전달합니다.
   파일이 없으면 ASSET_R10_LINEAGE_LAUNCH_RESULT.txt만 전달합니다.

현재 승인된 E:\ZGmini\runtime\node.exe만 사용합니다.
PowerShell/CIM 조회는 Node 내부에서 읽기 전용으로 실행합니다.
프로세스 명령줄 원문, 계정 정보, 인증정보는 결과 파일에 기록하지 않습니다.
현재 프로세스가 없으면 과거 부모 실행 경로는 복원할 수 없으며,
그 경우 NORMAL_WRITER_ORIGIN_NOT_PROVEN은 계속 STOP입니다.

기존 RUN_INSTALL.cmd를 실행하지 마십시오. R5는 설치 승인 도구가 아닙니다.
잠금 파일 삭제/프로세스 종료/예약 작업 변경/개별 Writer 실행은 금지합니다.
config, 마지막 Writer 기록, 예약 상태, Git HEAD는 조회만 합니다.
원본 수집기·SQLite·D1·Cloudflare는 실행하거나 변경하지 않습니다.
기존 정상 운영을 보존하고 다음 결과를 바탕으로 최소 후속 조치를 정합니다.

저장소: ansqhd5774-Choi/zgmini
기존 작업 브랜치: codex/api-site-integration-r1-20261026
공통 기준: docs/CMD_EXECUTION_PLAYBOOK.md (중앙 고정 원본)
