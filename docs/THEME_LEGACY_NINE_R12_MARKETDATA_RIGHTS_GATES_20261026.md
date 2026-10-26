# 기존 9개 테마 R12 — 가격 공급원 라이선스/실측 준비 감사 (2026-10-26)
브랜치: research/theme-nine-r2-shadow-20261026
단계: RESEARCH_ONLY, **가격 호출/다운로드/PC 실행/운영 변경 없음**.

## 1. 확인한 공식 약관(검토일 2026-10-26)
| 공급원 | 공식 이용 조건으로 확인 | 가격 형식/유료 여부 | ZGMINI 판정 |
| --- | --- | --- | --- |
| GetMarketHistory | 약관 §5: 합법적으로 수신한 바를 내부 저장/분석 가능, 가공된 지표·차트 등은 원시 바 시계열의 대량 재구성이 불가능한 경우 배포 가능. 원시 바 자체의 파일/공개 API 재배포는 금지. | 약관 §1·§6: 무계정 무료는 제한된 카탈로그·시범 시간봉, 무료 계정은 월별 시간봉 허용량. 나머지 /query/v1/bars 요청은 bar 잔액 차감. 원시·미조정 OHLCV 및 corporate action 별도 확인 필요. | **RIGHTS_CONDITIONAL**, 다만 **FREE_ETF_DAILY_ACCESS_UNVERIFIED** 및 전 37 ETF actual bars 미검증. 무상으로 252일×ETF 조회 가능한지 별도 실측 전 PASS 금지. |
| MarketParquet | 라이선스: 원자료 내부 저장·분석 및 원시 OHLCV를 복원할 수 없는 가공 차트·통계 공개 허용. 파일/원본 데이터셋 재배포 금지. | FAQ/문서: 무료 최근 1년 일봉 샘플 제공, 전체 아카이브 및 신규 데이터 자동구독은 유료 상품도 있음. 공식 라이선스의 'license granted ... on payment for an archive' 문구로 인해 무료 샘플의 이용 권리/계약 적용을 명확히 검토할 필요. 가격 split-adjusted, 배당 미조정. | **DERIVED_USE_TERMS_FOUND / FREE_SAMPLE_RIGHTS_PENDING**. 유료 구독·전체 아카이브 결제는 사용자 미승인, 실행 금지. 37 ETF 실제 샘플·정시성 검증 전 PASS 금지. |

- GetMarketHistory 약관(2026-10-19 발효): https://getmarkethistory.com/docs/terms
- GetMarketHistory API 문서: https://getmarkethistory.com/docs/api/reference
- MarketParquet 라이선스: https://marketparquet.com/license
- MarketParquet 이용약관: https://marketparquet.com/terms
- MarketParquet 무료샘플/가격: https://marketparquet.com/faq
- MarketParquet 자료 포맷: https://marketparquet.com/documentation

## 2. R8 게이트 적용 해석
1. 무료·상업적 이용·저장·가공 지표 공개가 **현재 사용 계정/무료 티어에 모두 적용되는지** 확인한다.
2. **원가격 공급원 A/B의 원시 데이터 공개 금지**와 ZGMINI 기존 공개 응답을 비교한다. 원시 OHLCV 또는 되돌려 만들 수 있는 값의 공개는 승인되지 않는다.
3. 가격 모드가 상이하다: GetMarketHistory는 raw/unadjusted, MarketParquet는 split-adjusted이며 배당 미조정. 공급원을 섞어 원자료의 기준을 혼동하지 않는다. 각 ETF/거래일별 split·corporate actions와 SPY 동일 정책을 검증한다.
4. **첫 37개 ETF 후보의 시세·수집/사용 적합 판정은 전부 미완료**. 공급원 자체가 가공물 권리를 제공한다는 것만으로 개별 펀드 252거래일 수집 성공이라고 판단하지 않는다.
5. 다수 ETF의 편입 수량은 상한/하한 없이 **테마, 원시 시세, 라이선스, 날짜 표기 AUM, 운영 가능성 통과 결과로만 결정**.
6. 이후 PC 수집 실측은 사용자가 승인한 Windows CMD 경로와 기존 데이터 저장 규칙을 지켜 진행하며, 승인 전 production 주기 작업·D1·main 변경 금지.

## 3. 현재 연구 전용 머신 명세
- `config/theme-nine-r11-eligibility-candidates.json`
- 현행 9개 테마 종전 18편입 위치 + 신규 37편입 후보 위치 = 55. BOTZ 중복으로 서로 다른 54개 티커. 숫자는 현재 조사된 결과이며 **선정 목표가 아님**.
- 모든 shadowEligible = null (PENDING); 기존 공개 ETF의 운영 상태와 신규 shadow 적격 판정을 구분한다.
- 공식 source URL, R9/R10 발견 기록, 권리/가격/AUM/holdings/운영 각각의 검사 필드를 독립적으로 관리한다.
- **이 파일은 실제 `config/theme-data-registry.json` 런타임과 연결되지 않는다.**

## 4. 바로 다음 실증 과제
- 우선 공급원별 무료 ETF 일봉 호출 허용 여부, 저작·파생권, 요청당 대상 ETF, 최신 일자와 40/252 실제 일봉 가능 여부를 테스트하여 각각 PASS/PENDING/REJECT 기록한다.
- 가격 확보가 합법적이고 확실해지기 전에는 공식 보유 목록·기준일/AUM만 병렬 감사하여 후보 선별과 스코어 산출을 혼동하지 않는다.
- 기존 공개 테마 신규 ETF 편입은 모든 Gate 통과 후 사용자 별도 승인 필요.
