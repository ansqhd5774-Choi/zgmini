ZGMINI R10 — R6 PREFLIGHT 중단 원인 상세 진단 R1

목적: 기존 R6 PREFLIGHT에서 확인된 예약 경로·프로세스·잠금
판정의 근거를 추가로 수집하는 읽기 전용 보완 도구입니다.
R10 설치나 Writer 실행 기능은 없습니다.

준비 상태: 승인 Writer SHA와 config.source는 기존 R6 결과에서 일치.
예약 작업의 실제 연결·잠금·프로세스는 아직 확인되지 않았습니다.

1. ZIP을 Windows PC의 새로운 빈 폴더에 압축 해제합니다.
   공백 또는 한글이 포함된 폴더에도 압축 해제할 수 있습니다.
2. RUN_R10_BLOCKER_DETAIL.cmd를 정확히 1회 실행합니다.
3. 같은 폴더에 생성된 ASSET_R10_BLOCKER_DETAIL_RESULT.txt를 전달합니다.

정상 기대값: STATUS=READONLY_DETAIL_COMPLETED
이는 진단 실행 성공만 뜻하며 설치 승인은 아닙니다.
상세 내용에 따라 운영 경로는 계속 미확정일 수 있습니다.

STOP: 결과에 READONLY_DETAIL_INCOMPLETE/ERROR_CODE가 나오거나
결과 파일이 생성되지 않으면 반복 실행하지 말고 보고해 주세요.

절대 금지: 기존 R6 RUN_INSTALL 실행, 잠금 삭제, 프로세스 종료,
예약 작업·VBS 변경, 수집/게시 강제 실행, 스케줄러 새 등록.

읽는 항목: 등록 예약 작업의 XML/상태, 인가된 프로젝트 내부
스크립트 파일의 SHA, 체크아웃 SHA·tracked 상태, 프로세스 이름/PID,
잠금 이름·크기·수정 후 경과 분, 게시 ledger·마지막 Writer 상태.
소스 본문·설정 전문·인증정보는 결과 파일에 기록하지 않습니다.

주의: 파일 경로를 동적으로 구성하는 실행 경로는 추적할 수
없으므로 ROUTE_LITERAL_MATCH=NO는 연결 부재의 확증이 아닙니다.
