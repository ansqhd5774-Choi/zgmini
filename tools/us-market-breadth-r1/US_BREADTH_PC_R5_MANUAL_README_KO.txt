ZGMINI 미국 시장 등락 지수 R5 - 수동 1회 수집

1. R5 ZIP을 Windows PC의 쓰기 가능한 새 폴더에 완전히 압축 해제합니다.
2. US_BREADTH_PC_R5_MANUAL.cmd를 정확히 한 번 실행합니다.
3. 기존 승인 수집기가 동작하는 동안 CMD 창을 유지합니다(최대 20분).
4. 실행이 끝나면 같은 폴더의 US_BREADTH_PC_R5_MANUAL_RESULT.txt를 전달합니다.

이번 수동 실행에서 해제되는 것은 뉴욕시간 오전 6시 이전 실행 제한뿐입니다.
아래 보호 조건은 그대로 유지합니다.
- 승인된 PC 소스 SHA, 설정, 소스 무변경 여부 및 Node 실행 파일 검사
- 기존 승인 수집기의 결과 검증과 최신 거래일 원자료 감사
- 종목 적격률 기준, 등락 수 산식, 원격 최신 자료 보호, D1 재조회 검증

기존 21시 예약 작업이나 다른 작업의 설정을 변경하지 않습니다.
PC의 승인 소스를 수정하거나 자동 실행 결과 JSON을 덮어쓰지 않습니다.
status=WAIT_COLLECTOR 또는 WAIT_VERIFIED_SOURCE이면 게시되지 않은 상태입니다.
status=PUBLISHED_OR_ALREADY_VERIFIED이면 다음 단계에서 공개 API를 확인합니다.
status=FAILED이면 반복 실행하지 말고 결과 파일부터 전달합니다.

미국 수집 또는 기존 Core 수집이 실행 중일 때는 이 도구를 시작하지 마세요.
잠금 파일, SQLite, 체크포인트, junction, 예약 작업을 삭제하지 마세요.
