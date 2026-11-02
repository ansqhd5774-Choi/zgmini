ZGMINI US BREADTH R47 FIX2 읽기 전용 Core 실행 경로 확인

이전 R47 결과는 실행 명령문 2개, 참조 스크립트 2개로 확인됐습니다.
FIX2는 정규 Core local-cycle과 보조 스크립트를 구별하여,
정규 Core 소스가 승인 SHA 및 clean 상태에 맞는지 확인합니다.

실행:
1. ZIP 전체를 다운로드 폴더 내 별도 폴더에 압축 해제합니다.
2. US_BREADTH_R47_FIX2_CORE_TRACE_READONLY.cmd를 실행합니다.
3. CMD와 같은 폴더에 생긴 US_BREADTH_R47_FIX2_CORE_TRACE_*.txt를
   대화에 첨부합니다. CMD 종료 전에 탐색기에서 그 TXT가 선택됩니다.

Windows E:\ZGmini\runtime\node.exe만 실행합니다.
로그 출력 폴더는 CMD와 같은 폴더로 고정하며 E:에 진단 로그를 쓰지 않습니다.

실행 명령문, 실제 PC 경로, 전체 Task XML, config 원문, token,
종목별 가격, 원시 데이터는 로그에 넣지 않습니다.
Core 잠금/PID/예약 작업/수집/원자료/D1에 어떤 변경도 하지 않습니다.

주의: 고유 Core 소스가 확인돼도, 보조 명령의 실제 실행·15분 자연 슬롯
진행까지 성공한 것으로 판정하지 않습니다. 그 항목들은 다음 증거에서
구분 검증합니다.
