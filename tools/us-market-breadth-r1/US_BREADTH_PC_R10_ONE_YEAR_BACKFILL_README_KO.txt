ZGMINI 미국 S&P 500 등락종목 수 - 검증된 최근 1년 날짜별 게시 R10.2

R10.1 실행에서 확인된 IMPORT_APPROVED_MODULES / MODULE_NOT_FOUND를 해결한 수정본입니다.
기존 R7/R8과 동일하게 계산기와 공개 결과 계약은 ZIP에 직접 포함합니다.
두 모듈은 고정 SHA-256을 검사하고, PC 승인 checkout에서는 기존 원장 감사,
거래일 달력, D1 인증/연결만 사용합니다. 산식 및 98% 적격률은 변경하지 않았습니다.

R9 원장 진단에서 최근 252거래일 중 248일이 기존 98% 적격률 검사를
통과했습니다. R10은 이 248일의 값만 재검산한 뒤 Cloudflare D1에
날짜별 public:market-breadth-r1:usa:YYYY-MM-DD 키로 게시합니다.

1. ZIP 파일 전체를 새로운 쓰기 가능한 폴더에 '폴더 구조 유지'로 압축 해제합니다.
   lib/market-breadth/ 아래 compute.mjs와 us-public-r1.mjs가 반드시 있어야 합니다.
2. 한국 시간 20:30~21:30(기존 자동 작업 시간대) 외에 실행하세요.
3. US_BREADTH_PC_R10_ONE_YEAR_BACKFILL.cmd를 한 번 실행하세요.
4. US_BREADTH_PC_R10_ONE_YEAR_BACKFILL_RESULT.txt를 보내주세요.

결과 해석:
- runnerRevision=R10_2_PINNED_PACKAGE_MODULES 으로 수정본 실행을 구별합니다.
- status=VERIFIED, verifiedDays=248은 날짜별 D1 키 248건의 재조회 통과를 뜻합니다.
- status=FAILED이면 stage/errorCode/errorClass/sourceAuditProgress로 중단 위치를 확인합니다.
- status=FAILED 직후 임의로 다시 실행하지 말고 결과 파일을 전달하세요.
- ZIP 내부의 하위 폴더를 유지하고 구버전 R10/R10.1 파일과 혼용하지 마세요.

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
