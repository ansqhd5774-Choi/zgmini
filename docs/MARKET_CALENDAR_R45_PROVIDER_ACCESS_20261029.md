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


## R45 실제 PC 결과 (2026-10-29, 사용자 제출 파일)
- `AUDIT=MARKET_CALENDAR_R45_PROVIDER_ACCESS`; `status=R45_BOUNDED_PROBE_COMPLETED`.
- `providerRequests=3`, `dbWrites=0`, `d1Writes=0`, `credentialsExposed=false`, `rawDataLogged=false`.
- FMP_BATCH: HTTP 200 / CAP_FIELD_PRESENT / observedSymbols=2 / validSymbols=2 / hasAsOfDate=true.
- FMP_SINGLE: HTTP 200 / CAP_FIELD_PRESENT / observedSymbols=1 / validSymbols=1 / hasAsOfDate=true.
- EARNINGS_PROFILE: HTTP 200 / CAP_FIELD_PRESENT / observedSymbols=1 / validSymbols=1 / hasAsOfDate=false.
- `fullCoverageValidated=false`, `publicDisplayLicenseValidated=false`. **2,640개 종목 일괄 자동수집과 운영 반영 성공을 의미하지 않음.**

## R46 최소 호출 검증 계획
- R44 로컬 14일 HTML-only 저장본(2,640건/2,640개 고유 티커)에서 최대 25개 티커를 결정적으로 추출해 FMP batch 요청 **정확히 최대 1회**만 수행.
- Windows 1회 CMD 결과 `MARKET_CALENDAR_R46_FMP_BATCH_PILOT_RESULT.txt`에는 반환 건수/결측/중복/관측일 범위/별표 구간 집계만 기록하고 개별 원시 시가총액·API 키·요청 URL을 기록하지 않는다.
- PC SQLite 읽기 전용, DB/D1/운영 UI/스케줄러/호출 주기/TTL 변경 없음. 12초 제한·응답 크기 256KB·실패 시 재시도 0회·결과 파일 중복 생성 STOP.
- `/mnt/data/MARKET_CALENDAR_R46_FMP_BATCH_PILOT_20261029.zip` 패키지를 사용자에게 제공(대화별 전달물; GitHub 운영 파일/등록 작업 아님).
- 샘플 표본 결과가 25/25라도 실제 전체 2,640개 ticker 커버리지, 다른 통화 정규화, issuer 단위 시총, 공개 파생 결과의 라이선스는 **여전히 미검증**.
- R46 로컬 모의 테스트 7/7 PASS. 사용자 PC 실측은 **NOT RUN**.
- 참고: https://site.financialmodelingprep.com/developer/docs/stable/batch-market-cap / https://site.financialmodelingprep.com/pricing-plans (일괄·대량 제공 상위 티어 및 표시/재배포 별도 라이선스 주의).


## R46 실제 PC 결과 (2026-10-29): 25개 요청, 2개만 반환
- 사용자 제공 `MARKET_CALENDAR_R46_FMP_BATCH_PILOT_RESULT.txt` 실제 증거.
- `status=R46_BOUNDED_PILOT_COMPLETE`, `providerRequests=1`; `dbWrites=0`, `d1Writes=0`.
- R44 일정 스냅샷 `recordCount=2640`, `uniqueTickers=2640` (기업별 CIK를 합친 issuer 수는 아님).
- 배치 요청 `sampleRequested=25`, `returnedMatched=2`, `coveragePercent=8`, `missingCount=23`, `invalidCount=0`, `duplicateCount=0`, `unexpectedCount=0`; HTTP 200.
- 반환된 2건 `date=2026-10-28` 모두 ★★★ 구간. 누락 23개가 소형 기업이라는 뜻이 아니라 **자료가 반환되지 않았음**을 뜻한다.
- `currencyVerified=false`, `issuerLevelVerified=false`, `publicDisplayLicenseValidated=false`, `all2640CoverageValidated=false`.
- 요청 코드를 실측 대조한 결과, `/stable/market-capitalization-batch?symbols=...` 형식은 FMP 공식 문서와 일치한다. 하지만 2/25만 반환된 정확한 원인은 데이터 부족·요금제 제한·이름 매칭 등으로 **아직 구분할 수 없음**. 특정 원인이나 일반적인 2종목 제한을 확정하지 않는다.
- R45의 2/2 확보 결과를 2,640개 전체 사용 가능 증거로 확대하지 않는다. 무료 계정 시총 FMP 대량 재호출·유료 업그레이드 금지.
- FMP는 무료 공개 사이트뿐 아니라 ★ 점수처럼 파생 출력도 적절한 라이선스 범위를 확인해야 한다고 설명한다. 별표 결과를 무단 게시하지 않음. https://site.financialmodelingprep.com/insights/platform/can-you-use-fmp-data-in-a-public-app-website-or-client-dashboard

## R47 후속: 기존 PC 저장 자료 간 무호출 교집합 점검 (사용자 실행 전)
- **목적:** FMP 확대 대신 이미 저장한 SEC Company Facts, 기존 E1-R3 CIK↔ticker 매핑, 기존 Alpaca 그룹 티커가 실적 2,640개 티커와 얼마나 겹치는지 증거로 확인. **표시·계산·게시 자동화가 완료됐다는 뜻이 아님.**
- 패키지: `MARKET_CALENDAR_R47_OFFLINE_SOURCE_COVERAGE_20261029.zip` 안의 `MARKET_CALENDAR_R47_OFFLINE_SOURCE_COVERAGE.cmd`, `market-calendar-r47-offline-source-audit.mjs`, `README_R47.txt`.
- Windows 기존 node `E:\ZGmini\runtime\node.exe`, PC 저장소 `E:\ZGmini\data\pc-writer`. 1회 실행 후 `MARKET_CALENDAR_R47_OFFLINE_SOURCE_COVERAGE_RESULT.txt` 전달.
- `storage/core.sqlite`: `market-calendar:earnings-display-html` + `market_score_earnings_e1_r3_universe_v1` 최신 `body_json`을 **readonly**로 조회.
- 원본 파일 이름만 조회: `manual-input/e1-r5/incoming/companyfacts/CIK*.json`. `asset-r10-alpaca/group-*.json`에서 ticker 멤버십만 판정. 모든 가격·주식수·시총 raw row는 보고하지 않음.
- 결과: 일정 수/고유 티커 수, SEC 맵핑 후보·회사공시 파일 후보·Alpaca 그룹 종목 후보·동시 출현 후보 **집계 수만** 기록. 유효/최신 주식수, 실제 issuer-level cap, USD 여부는 아직 검증 안 되므로 `gradeableTickerCount=0` 고정.
- 새 provider API 호출 0, PC SQLite 쓰기 0, D1 쓰기 0, 자동 재시도 0. 결과 파일이 이미 있으면 생성·실행을 중단. 신규 스케줄러·Cloudflare Cron·배포·기존 중요도 로직 변경 없음.
- 로컬 모의 fixture 단위 테스트 7/7 PASS; **실제 PC에서 R47을 돌렸다고 주장하지 않음**.
- SEC 공식 bulk 자료 설명: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- R47 결과로 기존 원본의 겹치는 범위를 확인한 뒤 공급자별 정확성·라이선스·실제 샘플 등급 검증 후에만 전체 자동화 범위를 결정.
