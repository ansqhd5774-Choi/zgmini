ZGMINI ASSET R10 Writer 실제 호출 경로 읽기 전용 진단 R4

목적: 등록된 Local-Core VBS -> R38/R31 실행기 연결 구조,
현재 Writer의 승인 소스, 등록 작업의 활성 상태와 local-cycle.lock PID의
실제 프로세스 유형을 증거로 구분합니다.

실행 전: 기존 R10 R6 INSTALL을 실행하지 마십시오.
패키지 ZIP 전체를 E: 드라이브 등 임의의 새 폴더에 압축 해제합니다.
파일을 한 폴더 안에 두고 RUN_R10_WRITER_ORIGIN_READONLY.cmd를 정확히 1회 실행합니다.
입력하는 값은 없습니다. Node.js, Git, PowerShell이 있는 기존 Windows PC에서 실행합니다.
공백/한글 폴더명도 지원합니다. 작업 중 창이 열려 결과 파일 경로를 알려줍니다.

결과: 같은 폴더의 ASSET_R10_WRITER_ORIGIN_RESULT.txt 하나만 대화로 보내주세요.
READONLY_WRITER_ORIGIN_COMPLETED는 조사 성공을 뜻하며 설치 허가가 아닙니다.
HASH_MATCH=NO, SOURCE_DRIFT, LEDGER SUBMITTING, PROCESS_IDENTITY_CHECK=UNAVAILABLE이면 STOP.
LOCK_STATUS=PRESENT면 활성 PID 여부를 떠나 INSTALL을 하지 마십시오.
정체를 모르는 프로세스/잠금 파일을 중단, 삭제, 수정하지 마십시오.
VBS, 예약 작업, config, 원장, DB, D1, 수집기, 배포는 변경하지 않습니다.

이 패키지는 원본 VBS/JS 실행을 하지 않고 파일 SHA와 코드 구조만 읽습니다.
PowerShell 프로세스 조회는 명령줄 원문 대신 PID 관련 최소 상태만 보고합니다.
스케줄러/PowerShell 조회가 안 되면 UNAVAILABLE로 남기며 우회하지 않습니다.

패키지와 결과는 분리되며 실제 PC Windows 검증은 사용자 실행 후 가능합니다.
GitHub 작업 브랜치 codex/api-site-integration-r1-20261026 / 새 브랜치 금지.
중앙 기준 원본 https://github.com/ansqhd5774-Choi/zgmini/blob/b4a2345179277ff8f0834ac9d5fc1f73251b4d4a/docs/CMD_EXECUTION_PLAYBOOK.md
