# R43 — 기업 실적 별표를 시가총액 기준으로 전환하는 제안
작성: 2026-10-29. **상태: PROPOSED / 사용자 최종 수치 승인 전 / 소스·운영 변경 없음.**

## 목적과 범위
- `/market-calendar/` 기업 실적(`kind='earnings'`) 중요도 ★★★·★★·★의 기준을 실제 **미국 달러 시가총액**으로 일관화. 특정 9개 빅테크 하드코딩·EarningsAPI priority 기반 중요도를 대체하는 것이 목표.
- 경제/금융 발표(`kind='economic'`) 중요도 및 다른 시장 점수/산식은 변경하지 않는다. 기업 실적 예정일과 시각의 검증 상태도 유지.
- 2026-10-29 main 조사: `lib/earnings-api-display.mjs` `CORE_TICKERS={NVDA,AAPL,MSFT,GOOG,GOOGL,AMZN,META,TSLA,AVGO}`; `impactOf=CORE_TICKERS.has(ticker)?3:event.priority===true?2:1`. 시장가치 조회 없음. ABBV 저평가 원인.

## 제안하는 절대 시가총액 구간 (USD, inclusive lower bounds)
| 표시 | 구간 | 코드 판정 기준 |
| --- | --- | --- |
| ★★★ | 2,000억 달러 이상 | `marketCapUsd >= 200_000_000_000` |
| ★★ | 200억 달러 이상, 2,000억 달러 미만 | `20_000_000_000 <= marketCapUsd < 200_000_000_000` |
| ★ | 200억 달러 미만 | `0 < marketCapUsd < 20_000_000_000` |
| 미확인 | 시가총액 누락·불일치·만료·검증 실패 | 숫자나 별을 임의 생성하지 않음. 표시/필터 계약 변경은 승인 및 구현 게이트에 포함 |

- 미국 전체 대상 종목에 **동일 절대 구간** 적용. ‘그날 실적 기업 중 순위’로 등급을 매기지 않는다.
- ABBV는 2,000억 달러 이상인 검증된 스냅샷을 확보할 때 ★★★. 시총이 변하면 모든 기업에 동일 규칙 적용. 추정 시총이나 종목명 예외를 사용하지 않는다.
- 정확한 경계값 비교; 표시용 반올림 숫자로 등급을 결정하지 않는다.
- 시장 반응을 확정적으로 예측하는 등급이 아니라 **기업 규모를 바탕으로 한 실적 발표 중요도 지표**임을 표시한다.

## 데이터 확인·품질 조건 (제안)
- 우선 기존 PC 저장 원자료에서 검증 가능한 최신 시총 스냅샷을 찾고, 신규 공급자 연결/호출 전에 승인된 키·호출 정책을 확인한다.
- 공식 `SEC EDGAR` companyfacts 등에서 확인 가능한 유통주식수(발행주식수·자기주식 혼동 금지)와 적절한 단일 날짜·통화의 시장 종가를 사용할 수 있으나, 종목별 주식 종류·ADR 비율·단위·액면분할·휴장·보고 지연을 검증하지 못하면 계산하지 않는다.
- 리포팅 기준은 **기업 단위(issuer-level)** 시가총액. `GOOG/GOOGL` 등 복수 클래스는 같은 기업으로 취급. 개별 클래스 시가총액만으로 회사 전체를 낮게 평가하지 않는다.
- 다른 통화를 쓰는 주식은 검증된 동일 관측일 환율 없이는 USD 시총으로 변경 금지.
- 데이터에는 `ticker/issuer,` `marketCapUsd,` `priceAsOf,` `sharesAsOf,` `source,` `storedAt,` `confidence/validation` 등을 로컬 내부에서 추적하되 **DB/public contract 확장 및 TTL/주기 변경은 별도 승인·영향 확인 후에만** 수행한다.
- 당일 실적 종목 전체의 매핑률 및 2주 예약 종목 전체의 매핑률을 보고하고, 누락은 `미확인`으로 분리. `priority=true`는 시가총액 미확인의 위장 대체재가 아니다.
- 거래일 기준 최신으로 갱신하는 것은 목표이지만 신규 수집 주기나 TTL을 확정/변경한 것이 아님. 기존 PC 수집 주기·허용 쿼터 내에서 승인 후 설계.
- PC에서 수집/저장/검증 → 로컬 산정 → 저장 결과만 게시 → D1/API/UI read-back. 방문자 GET에서 원격 API 호출/무거운 계산 금지.
- 기존 `EarningsAPI` 스냅샷의 private/redistribution=false 계약 유지: 원자료와 미허가 시총 데이터 공개 D1/HTML로 복제하지 않는다. 허가된 파생 등급만 공개.
- provider 또는 매핑 실패 시 마지막 유효 별표 표시 여부와 시차 표기는 검증·승인된 TTL 규칙을 따른다. 승인 전 임의 수명·가중치·임시 수치 도입 금지.

## 기술 사전조사 (소스만)
- 메인 `lib/earnings-api-display.mjs`에서 시총 입력 사용/조회는 없음.
- PC `scripts/pc-writer/alpaca-incremental.mjs`는 종가·거래량을 가져오지만 발행주식수는 포함하지 않음; 이 모듈은 자산 버블 수집 맥락이어서 캘린더 재사용 가능성 별도 검증.
- `lib/market-score/equibles-e1-r1-provider.mjs`에 marketcap CSV 파서는 있으나 PRO 권한이 필요한 별도 평가 경로; 실제 무료 운영 시총 전량 확보라는 증거가 아님.
- SEC 무료 API는 공식 문서에 확인되나, 실제 ZGmini 모든 예약 종목의 주식수 품질/다중 클래스 매핑은 아직 증명되지 않음.

## 운영 전 Gate
1. 사용자 ★ 구간 및 미확인 처리 승인 (아직 미확정).
2. 승인된 무료 데이터 소스/약관, 전체 종목 coverage, 최근 실제 runtime 데이터와 수집 쿼터 확인.
3. 별표값(1/2/3)과 미확인 상태를 API HTML 필터/표시 계약과 일치시키고 이전 R31~R42 회귀 테스트 보존.
4. 빅테크 + ABBV + 중형/소형/누락/복수 클래스/구간 경계/상태 지연 테스트.
5. UI 전용 브랜치에서 최소 파일 수정 후 테스트 → 분리 PR → main → Cloudflare Git Integration → 배포 exact SHA → 공개 PC/모바일 확인.

## 참고 (시가총액 규모의 근거)
- FINRA market cap explainer: https://syndication.finra.org/content/market-cap-explained
- S&P 2025-07-01 지수 신규 편입 하한 (S&P 500 USD 22.7B): https://www.nasdaq.com/press-release/sp-dow-jones-indices-announces-update-sp-composite-1500-market-cap-guidelines-2025-07
- SEC CompanyFacts API: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- SEC 발행주식수 태그 품질 경고: https://www.sec.gov/newsroom/whats-new/osd-announcement-2210-dqreminder-entitycommonstocksharesoutstanding
- Alpaca 무료 시장 데이터 IEX 한정: https://docs.alpaca.markets/us/docs/market-data-faq

## 상태
Document-only candidate, no scoring changes, no new provider calls, no DB/D1 writes, no scheduler changes, no PR, no production deployment.
