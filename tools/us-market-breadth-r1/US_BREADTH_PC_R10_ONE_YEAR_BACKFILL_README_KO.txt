ZGMINI 미국 S&P 500 등락종목 수 - 검증된 최근 1년 날짜별 게시 R10.1

R10 1차 실행 오류 재진단 개선판입니다. 승인된 데이터 검사, 98% 적격률,
Cloudflare 날짜별 게시 방식, PC 운영 설정은 기존 R10과 같습니다.
R10 오류 로그가 어느 단계에서 발생했는지와 오류 종류를 기록하도록 보강했습니다.

R9 원장 진단에서 최근 252거래일 중 248일이 기존 98% 적격률 검사를
통과했습니다. R10은 이 248일의 값만 재검산한 뒤 Cloudflare D1에
날짜별 public:market-breadth-r1:usa:YYYY-MM-DD 키로 게시합니다.

1. ZIP의 파일 5개를 모두 별도의 쓰기 가능한 폴더에 압축 해제합니다.
2. 한국 시간 20:30~21:30(기존 자동 작업 시간대) 외에 실행하세요.
3. US_BREADTH_PC_R10_ONE_YEAR_BACKFILL.cmd를 한 번 실행하세요.
4. US_BREADTH_PC_R10_ONE_YEAR_BACKFILL_RESULT.txt를 보내주세요.

결과 해석:
- runnerRevision=R10_1_STAGE_DIAGNOSTIC 으로 개선판 실행 여부를 구별합니다.
- status=VERIFIED, verifiedDays=248은 날짜별 D1 키 248건의 재조회 통과를 뜻합니다.
- status=FAILED이면 stage/errorCode/errorClass/sourceAuditProgress로 중단 위치를 확인합니다.
- status=FAILED 직후 임의로 다시 실행하지 말고 결과 파일을 전달하세요.
- ZIP 전체 파일을 같은 폴더에 풀고 구버전 R10과 파일이 섞이지 않게 하세요.

안전 조건:
- R9 결과의 SHA-256, 승인 PC source SHA, SQLite 저장 종가,
  종목별 원본 출처, 98% 감사, 상승/보합/하락 수를 모두 다시 비교합니다.
- 차트에 사용되는 날짜별 D1 키만 추가합니다. 현재값 키는 쓰지 않습니다.
- 기존 날짜별 값이 다르면 게시하지 않고 중단합니다.
- D1 삽입 뒤 실제 readback으로 확인합니다. 불확실하면 중단합니다.
- 수집기 실행, SQLite 변경, 예약 작업 변경, GitHub 브랜치 변경이 없습니다.
- 실패해도 성공한 날짜는 유지됩니다. 재실행은 먼저 결과를 검토하세요.

여전히 미검증 4일:
2026-03-26, 2026-03-27, 2026-09-23, 2026-10-14
이 4일을 임의 생성하거나 검증 없이 게시하지 않습니다.
