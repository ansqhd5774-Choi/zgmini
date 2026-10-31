ZGMINI 미국 시장 등락 수 R6 — 수동 1회 이어하기

R5 결과: collectorStatus=SKIPPED, status=WAIT_COLLECTOR.
R5는 기존 수집기의 '이미 성공했으므로 중복 수집 생략' 상태에서도
저장된 최신 거래일 데이터 검증과 게시를 중단하는 문제가 있었습니다.

변경 사항:
1. 기존 수집기가 COMPLETE라면 기존대로 데이터 검증/게시를 시도합니다.
2. SKIPPED + SKIPPED_ALREADY_SUCCESS인 경우에도 저장된 데이터를
   읽기 전용으로 감사하여 최신 거래일 적격률이 충족되면 게시합니다.
3. 그 외 SKIPPED, 실패, 부분 수집은 게시하지 않습니다.
4. 원천 데이터에 아직 최신 거래일이 없으면 WAIT_VERIFIED_SOURCE로
   중단하고 expectedDate / latestStoredTradeDate를 보고합니다.
5. 승인된 데이터 수집기/SQLite/설정/21시 예약 작업을 변경하지 않습니다.

사용 방법:
1. R6 ZIP을 새 쓰기 가능한 폴더에 완전히 압축 해제합니다.
2. 기존 Core/미국 수집 작업이 실행 중이 아닌 때
   US_BREADTH_PC_R6_MANUAL.cmd를 한 번 실행합니다.
3. 같은 폴더에 생성된 US_BREADTH_PC_R6_MANUAL_RESULT.txt를 전달합니다.

status=PUBLISHED_OR_ALREADY_VERIFIED: D1 재조회까지 완료됐습니다.
status=WAIT_VERIFIED_SOURCE: 최신 거래일 원천 자료가 아직 부족해 게시 안 됨.
status=WAIT_COLLECTOR: 수집 결과 미완료. collectorSourceStatus 확인.
status=FAILED: 재실행하지 않고 보고서부터 전달해 주세요.

기존 작업/DB/checkpoint/잠금/Junction을 삭제·초기화하지 마세요.
R5 ZIP을 덮어쓰지 말고 R6를 새 폴더에 해제해 주세요.
