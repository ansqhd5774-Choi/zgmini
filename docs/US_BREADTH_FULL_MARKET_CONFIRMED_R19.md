# 미국 등락 지수 — MarketParquet 전체 시장 확정 계산 후보 R19

## 목표 및 경계

- 사용자 최종 정의: 장중 잠정은 Alpaca IEX 약 503종목/15분, 확정은 MarketParquet 미국 주식 전체 약 6,500종목.
- R18의 PC 원자료 조사에 이어 **계산 산술**을 독립 모듈로 분리한다. 기존 S&P 500/B1 계산기를 변경하지 않는다.
- `lib/market-breadth/us-marketparquet-confirmed-r2.mjs`의 `calculateFullMarketConfirmedCandidate`는 **이미 저장되어 확인된 두 거래일 일봉**을 매개변수로 받아 종목별 상승·보합·하락을 계산한다.
- MarketParquet 공식 일봉의 `date` 또는 과거 `timestamp`, `symbol`, `asset_type`, `close`, `volume`을 사용한다. Stock만 포함하고 ETF·`-DELISTED`는 제외한다. 동일 기준 분할 조정·배당 비조정 가격만 비교한다.
- 당일 유효 주식 종목 수가 `expectedCount`이다. 원천 일봉의 전체 종목 수를 6,500으로 고정하지 않는다. 전일 값이 없는 종목은 미관측으로 구분한다.
- 이 문서의 R19 `STRICT` 기본 모드는 당시 사용하던 **98% 실제 가격 쌍** 검증을 유지한다. 단, 2026-11-01 사용자가 신규 전체시장 확정치 R2에 명시적으로 승인한 `MISSING_AS_UNCHANGED` 모드에서는 전일 가격이 없는 종목을 보합으로 집계하고, `imputedUnchangedCount`와 `sourcePairCoverage`를 따로 기록한다. R1의 기존 250거래일 기록과 잠정치에는 이를 적용하지 않는다.

## 현재 코드 상태

- R19는 `CALCULATED_UNPUBLISHED` 후보 또는 검증 실패 사유만 반환한다. `publicationAllowed=false`가 고정이며, 배포 가능한 최종 확정 공개 기록이 아니다.
- R18 PC 감사 명령을 한 번 실행하면 저장 원자료 두 파일이 있을 때 **R19 계산 후보까지 출력**한다. 실측 결과와 공개 발행 승인은 여전히 별도다.
- 공급자 호출, E: 파일 생성, PC DB 쓰기, D1 쓰기, 스케줄러 변경, API/UI 변경이 없다.
- 기존 확정 키 `public:market-breadth-r1:usa`, 250거래일 일자별 이력, 잠정 키 `public:market-breadth-provisional-r1:usa`는 모두 그대로다.
- 현재 MarketParquet의 일봉 스키마에는 `exchange` 필드가 명시되지 않는다. 나스닥/NYSE 범위를 요구한다면 별도 승인된 상장 종목 분류 자료를 확인해야 하며, 데이터가 없는 거래소 필드를 임의로 만들어 필터링하지 않는다.

## 검증 및 남은 게이트

1. R18의 실제 PC 결과로 저장된 전체 `stock_daily` **원자료 두 날짜**와 실제 커버리지를 확인한다.
2. 원자료 공급자의 완전성, 저장·재조회 및 변조 방지, 전 거래일 가격 조정 모드, 주식 종목 구분을 검증한다.
3. 원자료가 저장된 상태에서만 R19 계산 후보를 검산한다. 실제 승인된 확정 공개 계약/발행 키 분리는 별도 적용 게이트로 진행한다.
4. **기존 250거래일 확정 기록을 수정·백필하지 않는다.** 서로 다른 모집단의 503개 이력과 새 전체 시장 확정 결과를 혼합해 동일한 추세처럼 보이지 않는다.
5. R17 IEX 잠정치의 실제 PC 15분 수집/D1 공개/UI 검증은 별도 수행한다.

공식 자료: <https://marketparquet.com/documentation>, <https://marketparquet.com/data-quality>.
