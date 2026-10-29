# 시장 캘린더 R51 완료 증거 및 R52 후속 기준 — 2026-10-29

## 실제 PC 실행 결과

- 사용자 제공 최종 `MARKET_CALENDAR_R51_LATEST_RESULT.txt`: `STATUS=R51_RESUME_COMPLETE`, `PREVIOUS_BATCH_FILES=2`, `NEW_BATCHES=18`, `LATEST_BATCH=20`, `TOTAL_BATCHES=20`, `STOP_REASON=NONE`.
- 고정 수집 계획: SHA `4f6be1ba8f45007d25b7702b5eb6d5b3d193c60e7e13793876042a84e34c0138`, 미확보 주가 2,394종목, 총 20배치.
- 사용자 제공 18개 `MARKET_CALENDAR_R51_COLLECT_RESULT_20261029T14*.txt`의 batch 3~20은 모두 `R51_BATCH_STORED` 및 `batchReadbackVerified=true`. 이번 실행 계획 2,154종목 중 2,153종목의 가격 후보를 저장했고 미관측 `noBarTickerCount=1`이었다. API 호출은 총 54회(각 배치 3회), 재시도는 없었다.
- 이전 1~2배치의 계획 종목 240개는 선행 결과에서 모두 가격 후보가 확보되었다. 따라서 R51 누락 2,394개 중 **합계 2,393개 가격 후보**, 1개 가격 미관측이다. 이는 원장 파일의 모든 개별 행을 직접 재검증한 결과가 아니라 **각 배치 요약과 readback PASS의 합산**이다.
- 이번 실행 `DB_WRITES=0`, `D1_WRITES=0`, `PUBLIC_STARS_CHANGED=false`; 시가총액이나 별점 공개는 아직 수행하지 않았다.
- 기존 R51 저장 폴더·plan/raw/rows는 보존한다. 완료된 R51 가격 수집을 다시 처음부터 실행하거나 완료 증거 파일을 반복 요구하지 않는다.

## 다음 단계 R52: 실제 후보 교집합과 신뢰도 읽기 전용 검증

1. 기존 PC SQLite의 2,640개 고유 실적 티커, R49 SEC CIK 매핑, R50 `companyfacts.zip` 데이터, R10 기존 주가 246개 및 **R51 20개 rows 파일**을 한 번에 결합한다. R51 계획 SHA·연속 배치·행별 범위·중복·가격 충돌과 관측일을 재검증한다.
2. R50의 SEC 주식 수 이용 가능한 후보는 2,372개 티커였다. 기존 246개 + 새 2,393개 가격 후보가 각각 고유하고 원본 범위가 유지되는 경우 가격 후보는 2,639/2,640개다. 이 조건에서 단순 집합 교집합은 최소 2,371개·최대 2,372개가 되지만, 이는 **시장가치 계산 검증 가능 종목 수가 아니다**.
3. `inspectSecShares`는 CompanyFacts의 issuer-level/클래스별 분리 차원을 확인하지 못한다. CIK가 여러 ticker로 연결된 기업, ADR/예탁증서, 서로 다른 시점의 주식 수와 가격, 회사 분할·역분할, SEC 값 충돌과 오랜 관측을 구분한다. 동일 회사가 여러 클래스로 거래될 때 한 클래스의 주가×회사 전체 주식 수를 회사 시가총액으로 오인하지 않는다.
4. 공유된 소스·가격·주식 수로 추정 시가총액을 산출하더라도 공개 별표를 자동으로 바꾸기 전에 분류 대상의 회사 전체 시가총액, as-of, 유효기간, 기업/주식클래스 일치와 공개 파생 표시 이용 권한을 별도로 검증한다.
5. 사용자 승인 R43 구간은 변경 금지: ★★★ 2,000억 달러 이상, ★★ 200억~2,000억 달러 미만, ★ 양의 200억 달러 미만, 불확실하면 미확인. 지표 일정 별표·기존 공개 UI·DB·스케줄러는 R52에서 변경하지 않는다.
6. R52 실행 방식은 기존 R48/R49/R50 읽기 전용 함수 재사용, PC에서 단 한 번의 ZIP+CMD 검증, 한 개 요약 결과 파일. 민감 원시 가격·주식 수·API 키를 채팅이나 Git에 기록하지 않는다.

## 공식 근거

- SEC EDGAR CompanyFacts 및 nightly bulk archive: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- Alpaca 역사적 일봉 `adjustment=split` 및 `feed=iex`: https://docs.alpaca.markets/us/reference/stockbars
- 기존 기준: `docs/MARKET_CALENDAR_R43_EARNINGS_MARKETCAP_IMPORTANCE_PROPOSAL_20261029.md`, `docs/MARKET_CALENDAR_R50_BULK_FACTS_PLAN.md`, `docs/MARKET_CALENDAR_R51_RECOVERY_R5.md`.
