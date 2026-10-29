ZGMINI R10 — 예약 실행 경로 확인 R2 (읽기 전용)

목표: R1에서 미확정된 스케줄러 → 승인 Writer 경로를 확인하기 위해
PC에서 관련 예약 작업과 간접 VBS/JS 연결의 지문을 수집합니다.

1. 이 ZIP을 이전 패키지와 혼합하지 말고 새 빈 폴더에 압축 해제.
2. RUN_R10_ROUTE_INVENTORY.cmd 정확히 1회 실행.
3. 생성된 ASSET_R10_ROUTE_INVENTORY_RESULT.txt만 전달.

정상 기대값: STATUS=READONLY_INVENTORY_COMPLETED.
이 값은 진단만 성공한 것이며 설치 승인이나 자동 갱신 성공이 아닙니다.
STATUS=READONLY_INVENTORY_INCOMPLETE/ERROR_CODE라면 재실행하지 말고 전달.

읽는 범위: schtasks 작업명과 조회 상태, ZGMINI 관련 작업 XML,
E:\ZGmini 아래 허용 VBS/CMD/JS 파일의 지문 및 정적 참조,
승인 Writer 체크아웃 SHA·변경 상태, 잠금 이름과 경과 시간.
가능할 경우 WMIC로 관련 프로세스의 PID·상위 PID·스크립트 파일명만 조사.
WMIC이 없거나 접근 불가하면 PROCESS_LINEAGE=UNAVAILABLE로 기록합니다.
실행 명령 원문·설정 전문·인증정보·스크립트 내용은 기록하지 않습니다.

이 도구는 수집/게시/배포를 실행하지 않습니다. Windows PC에서
결과 TXT 1개를 패키지 폴더에 기록하는 것 외에 쓰기 동작이 없습니다.

금지: 기존 RUN_INSTALL.cmd 실행, 프로세스 종료, 잠금 삭제,
스케줄러/VBS 수정, 강제 Writer 실행, 무분별한 반복 검사.

주의: 동적으로 조합한 경로는 정적 검사만으로 증명할 수 없습니다.
ROUTE_LITERAL_MATCH=NO는 연결이 없다는 확정 증거가 아닙니다.
