ZGMINI 미국 등락종목 수 R7 - 2026-10-31 일회성 수집 재시도

R6 확인 결과:
collectorStatus=SKIPPED
collectorSourceStatus=SKIPPED_ALREADY_SUCCESS
latestStoredTradeDate=2026-10-29
expectedDate=2026-10-30
calculationStatus=LATEST_SESSION_NOT_STORED

R7은 기존 수집기가 같은 날 성공 이력 때문에 건너뛰더라도,
최신 완결 거래일 자료가 PC SQLite에 없는 경우에 한해서
기존 승인 소스의 B1 수집 함수를 한번 더 호출합니다.
이때 기존 PC quota 장부 및 provider 요청 제한을 재사용합니다.
그 결과를 다시 감사하고 98% 적격 종목을 확보할 때에만 D1에 게시합니다.
원천 사이트가 10월 30일 자료를 아직 제공하지 않는다면 게시하지 않습니다.

사용 절차:
1. R7 ZIP을 이전 버전과 다른 새 쓰기 가능한 폴더에 전부 풉니다.
2. 기존 Core/미국 예약 수집이 실행 중이 아닌 때 실행하세요.
3. US_BREADTH_PC_R7_MANUAL.cmd 한 번만 실행합니다.
4. US_BREADTH_PC_R7_MANUAL_RESULT.txt를 전달합니다.

sourceRefreshAttempted=true : 구버전 캐시로 인한 생략을 피해 1회 실제 재조회 시도.
sourceRefreshStatus / sourceRefreshTradeDate : 제공처에서 받은 거래일과 상태.
status=PUBLISHED_OR_ALREADY_VERIFIED : 게시 이후 D1 재조회 확인.
status=WAIT_VERIFIED_SOURCE : 최신 확정 거래일의 검증 가능한 입력이 아직 없음.
status=FAILED : 무작정 재실행 금지, 결과를 먼저 전달하세요.

승인 PC Git SHA 검증, Node 24, 원본 DB 경로, 소스 무변경 검사를 유지합니다.
자동 실행 R4 및 다른 예약 작업은 설치/변경하지 않습니다.
PC 소스를 수정하거나 장부, lock, checkpoint, DB, junction을 초기화하지 마세요.
