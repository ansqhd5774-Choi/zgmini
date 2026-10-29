ZGMINI R10 — Local-Core 간접 호출 확인 R3

R2에서 Local-Korea의 정적 참조가 발견되었지만 Korea 실행 경로는
게시 비활성입니다. 실제 Writer 게시를 요청하는 Local-Core VBS의
구조와 local-cycle.lock 소유 PID를 확인하는 읽기 전용 도구입니다.

1. 이 ZIP을 새 빈 폴더에 압축 해제합니다.
2. RUN_R10_CORE_ROUTE_PROOF.cmd를 정확히 1회 실행합니다.
3. 생성되는 ASSET_R10_CORE_ROUTE_PROOF_RESULT.txt만 전송합니다.

STATUS=READONLY_CORE_ROUTE_COMPLETED는 진단만 완료했다는 뜻입니다.
STATUS=READONLY_CORE_ROUTE_INCOMPLETE 또는 ERROR_CODE가 있으면
반복하지 않고 결과를 전달합니다.

승인 Writer SHA·config.source·최근 Writer 실행 및 핵심 스크립트의
파일 SHA와 구조적 키워드, 잠금의 PID·수명만 확인합니다.
소스 본문·명령 원문·토큰·인증정보는 출력하지 않습니다.

이 도구에는 설치·수집·D1 게시·스케줄러 수정 기능이 없습니다.
잠금 파일 삭제, 프로세스 종료, RUN_INSTALL 실행은 금지합니다.
단순한 문자열 탐지는 실제 분기 실행의 증거가 아니며
설치 승인이나 자동 갱신 완료를 뜻하지 않습니다.
