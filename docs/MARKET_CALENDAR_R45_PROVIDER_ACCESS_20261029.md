# 시장 캘린더 R45 — 공급자 시총 API 접근 진단 (2026-10-29)

## R44 실제 PC 증거
- 읽기 전용 성공: `R44_READONLY_RETRIEVED`, API 호출 0, DB/D1 쓰기 0.
- 14일간 `eventCount=2640`, `uniqueTickers=2640`; issuer 별 통합 전이므로 실제 고유 기업 수와 다를 수 있다.
- `marketCapCandidateTables=[]`; 시총 저장 값은 현재 확보하지 못했음.
- `configuredProviderKeyNames`에 FMP 및 EarningsAPI 관련 항목 3개 있으나 값·인증/요금제 확인 근거 아님.
- `capSourcePermission=UNVERIFIED`, `marketCapCoverage=null`; 실 사이트 ★ 계산 로직 유지.

## R45 단발 허용 범위
- PC에 이미 존재하는 `providers.env` 키 사용. URL/키 값/원자료를 출력하지 않는다.
- FMP batch ABBV,AAPL 1회, FMP single ABBV 1회, EarningsAPI profile ABBV 1회: 총 최대 3회, 12초 제한, 0회 재시도.
- 사용자 PC에서 `MARKET_CALENDAR_R45_PROVIDER_ACCESS.cmd`를 직접 한 번 실행하는 형태이며 PC 수집기·예약 작업·DB/D1/API·사용자 페이지 변경 없음.
- 저장은 `MARKET_CALENDAR_R45_PROVIDER_ACCESS_RESULT.txt` 1개만. 이미 존재 시 요청 0회로 STOP.
- `CAP_FIELD_PRESENT`는 테스트 티커 1~2개 필드 확인에만 해당한다. 2,640개 전체 coverage, 데이터 재배포 허가, 최신성, 기업 단위 시총 검증은 별도.
- 인증 실패·유료 기능 차단·429 응답 등에서는 다른 키 생성·유료 전환·재시도하지 않음.

## 외부 공급자 약관 근거
- FMP batch: https://site.financialmodelingprep.com/developer/docs/stable/batch-market-cap
- FMP single: https://site.financialmodelingprep.com/developer/docs/stable/market-cap
- FMP 가격·제한: https://site.financialmodelingprep.com/pricing-plans
- EarningsAPI profile, 무료 100회/일, 1,000회/월: https://www.earningsapi.com/docs/examples/profile-enrichment
- SEC official 무료 companyfacts bulk: https://www.sec.gov/search-filings/edgar-application-programming-interfaces

## 결론/후속 게이트
R44가 밝힌 2,640개 티커 규모에서는 EarningsAPI 무료 월간 1,000회 단건 조회로 전체 자동 갱신 불가. FMP 무료 배치 전체 사용권 확인 전 가정 금지. R45 접근/스키마 테스트 확인 후 SEC bulk+기존 가격 자료 등 무료·허용 공급 경로를 검토하며 **전체 issuer coverage와 공개 파생 중요도 이용 허가** 검증 후 자동화 실시.

Source on `codex/ui-improvements`; PC 실행 결과 미수신, 운영 시총 점수 전환 미적용, 데이터베이스·배포 변경 없음.
