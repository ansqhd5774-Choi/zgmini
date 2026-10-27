# 기존 9개 테마 R40 — R23 원가격과 저장 MarketParquet 일별 가격 교차 검사

- 날짜: 2026-10-27
- 유일한 작업 브랜치: **codex/theme-fear-greed-integration-20261025**
- 직전 실PC 증거: **R39 54/63 ETF + SPY 양일 보유**, 2026-10-23 / 2026-10-26, 사용자가 제출한 동일 결과 2건.
- 현재 정확한 상태: **R40_CODE_TESTED / REAL_PC_RESULT_PENDING / NO_PRICE_MODE_EQUIVALENCE / NO_R32_NEW_DATE_CALC / NO_PUBLICATION**.

## 1. 작업 목적과 이미 완료된 연구

우주·위성에서 개발한 승인 R32 다중 ETF 계산을 기존 9개 테마에 적용하는 작업을 계속한다. 승인 로스터 9테마·64편입 자리·고유 63 ETF, R23 1h 원본 121페이지 SHA 증거, R25 개별 점수, R32 PC 9×252=2,268건, R33 공개 교집합 8×252=2,016건을 재조사/재수집/재개발하지 않는다.

R39 결과에서 두 날짜 기존 MarketParquet EOD에는 ETF 54종과 SPY가 있으며, 누락 9종은 **CABZ, CBOT, GNMX, KYC, LATR, LLMA, RBTX, WR, XA**다. R32의 2026-10-23 최신 적격 고유 45종은 모두 EOD 54종 안에 있다. 다만 기존 R32 가격 모드 **RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE**와 R39 자료 **DAILY_SPLIT_ADJUSTED_NOT_R32_RAW_1H**는 동일 데이터가 아니다.

## 2. 구현·실행 파일

다음 5개를 한 폴더에 모은 Windows 압축 파일: **THEME_NINE_R40_PRICE_MODE_OVERLAP_WINDOWS.zip**

1. THEME_NINE_R40_PRICE_MODE_OVERLAP.cmd — 기존 PC Node 또는 PATH node를 실행.
2. theme-nine-r40-price-mode-overlap.mjs — R23 vs 저장 EOD 순수 읽기 검사.
3. theme-nine-r39-parquet-coverage.mjs — **R39 기존 SHA 고정 Parquet 및 감사 JSON 재사용**.
4. theme-nine-r25-approved-selector.mjs — **우주·위성의 승인 NY 15시/조기폐장 12시 실제 1h 선택기**.
5. theme-nine-r20-approved-candidates.json — 승인 로스터 SHA256 **e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c**를 R39에서 검증.

CMD 더블클릭 시 TXT를 **압축 해제한 CMD와 같은 폴더**에 생성. Windows E: 원본/DB에 기록하지 않고, 소스 호출·설치·예약 작업 등록·D1/Cloudflare/공개 변경 없음. resultFile을 콘솔에 표시하고 종료 키 입력을 기다린다. 압축 내부에서 곧바로 실행하지 않는다.

## 3. R40 실제 검사

1. R39의 기존 두 날짜 Parquet 파일 바이트 SHA를 고정값으로 검증하고 현재 누락/보유 로스터가 **54/63+SPY**인지 확인한다. 이미 제출된 R39 CMD 자체를 재실행하지 않는다.
2. 기존 R23 원본 manifest 고정 SHA **8c6aa292da35310ce37093b73a331177582fb741d16d8a6423bee7413ddbcdb5** 및 121/121 실제 raw 페이지 SHA를 확인한다. 원본 JSONL은 변경하지 않는다.
3. 우주·위성 R25 승인 선택기로 각 ETF와 SPY의 NY 거래일 **15시(조기폐장 12시)** 실측 대용 종가를 복원한다. **일반 EOD 공식 마감값으로 둔갑시키지 않는다.**
4. 이미 저장된 etf_daily_YYYY-MM-DD.parquet 파일을 날짜 순으로 조사해 **마지막 최대 628개**를 읽는다. 각 날짜 감사 JSON의 SHA·완료·출처·거래일을 반드시 검사한다. Parquet에서는 승인 63종+SPY만 메모리에 남기고 비승인 종목 수백만 건을 누적하지 않는다. 과거 Parquet의 timestamp 날짜 스키마도 처리한다.
5. 실제 저장 EOD의 ETF–SPY **동일 날짜 실측 수**를 산출한다. 40 / 377 / 628 문턱의 충족 여부는 **이번에 검증된 보유 자료 안에서만** 확정한다. 628개보다 오래된 자료가 있을 때 낮은 숫자는 실제 상장 이후 전체 수보다 적은 하한값일 수 있다. 빈 거래일을 채우거나 임의로 적격/탈락시키지 않는다.
6. 두 가격 모드에서 날짜가 일치하는 ETF/SPY를 대상으로 **원가격 대비 EOD 차이(bp), 표본 날짜 수, 연속 비교 가능한 구간의 수익률 차이(bp)**를 계산한다. 가격 자체는 TXT에 내보내지 않는다. 공통 날짜가 한 개뿐이면 수익률 동등성을 추정하지 않고 '비교 가능 수익률 구간 0'으로 남긴다.
7. 보고서는 항상 **priceModeAlignmentAuthorized=false**, **publicationAuthorized=false**, **provisionalCalculation=NOT_PERFORMED_SEPARATE_PRICE_MODES**다. 분석 결과가 같거나 근접하더라도 가격 모드·권리·R32 계산 승인이 자동 부여되지 않는다.

R39에 없던 ETF 9종은 기존 승인 명단에서 제거하지 않는다. 다른 asset file에 있을 수 있다는 가능성과 실제 정규 PC 작업 수집 대상인지는 별도 관측 근거로만 판정한다. 새 작업이나 API GET을 추가할 근거로 R40 결과를 오용하지 않는다.

## 4. 완료 판정과 다음 한 단계

- **로컬 코드·단위 테스트 완료**: R37 bridge/reader, R39, R40 총 4개 테스트 파일 PASS; 실제 PC 결과는 **미접수**.
- **R40 실PC 검사 완료 조건**: 사용자가 새 TXT를 제출하고, 각 날짜 원본 SHA·실제 EOD 40/377/628 실측 분포·1h와 EOD 겹침 날짜 수·소스모드 차이를 보고해야 한다. STOP이면 원인 최소 범위만 수정한다.
- **S3 마무리→S4 전제**: 실제 EOD 이력이 충분하면 **EOD만으로 일관된 원가격/동일 R2 계산 경로**를 별도 연구용으로 검산할 수 있는지 판단한다. R23 raw 1h와 EOD를 끼워 이어 붙이는 것은 금지. 이후에야 기존 R32 테마 집계와 역사 AUM 근거를 사용한다.
- **실행 주체/관리**: 기존 Windows PC에서 사용자가 CMD 실행. 기존 데이터·예약 작업·D1·실사이트는 그대로. 적격 ETF 63종을 다시 선정하거나 R32 지표 가중치를 새로 정하지 않는다.

### 원천 공급자 규격

- [MarketParquet 문서](https://marketparquet.com/documentation): 일간 가격은 분할 조정, 과거 일간 자료는 date 대신 timestamp 열이 있을 수 있음.
- [MarketParquet 자료 품질](https://marketparquet.com/data-quality): 조정 이력·데이터 검증 정책.
- [GetMarketHistory API](https://getmarkethistory.com/docs/api/reference): 원래 시간봉 출처.
