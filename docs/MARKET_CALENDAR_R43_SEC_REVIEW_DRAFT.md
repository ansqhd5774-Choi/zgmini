# R43 연 1회 SEC 발행사 후보 초안 (PC 비공개)

상태: **검토 후보 생성 도구**. 승인된 전체 적격 발행사 명부(`R57_REVIEWED_ISSUER_MEMBERSHIP_R1`)를 생성하거나 R43을 게시하지 않는다.

## 입력과 실행

1. 연간 수동 작업 시 SEC 공식 `company_tickers_exchange.json`을 직접 확보한다.
   - SEC 안내: https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data
   - 공식 파일: https://www.sec.gov/files/company_tickers_exchange.json
2. 확보한 파일을 승인된 PC의 `%ZGMINI_PC_HOME%` 또는 기존 `E:\ZGmini\data\pc-writer\` 안에 `local-sec-company-tickers-exchange.json`으로 보관한다. 파일은 GitHub나 공개 D1에 업로드하지 않는다.
3. 저장소 루트의 `MARKET_CALENDAR_R43_SEC_REVIEW_DRAFT.cmd`를 수동 실행한다. CLI로는 아래와 같이 확인한다.

   ```text
   node tools/market-calendar-r43/R43_SEC_ROSTER_CANDIDATES.mjs --preflight --pc-home <PC-home-absolute-path>
   ```

4. 사전 확인 성공 뒤 운영자가 `Y`로 명시적으로 승인해야만 `local-market-calendar-r43-sec-review-draft.json`을 한 번 생성한다. 기존 초안이나 결과 TXT는 덮어쓰지 않는다.

## 안전 경계

- 모든 발행사와 개별 주식의 `eligible`은 `null`, `reviewStatus`는 `PENDING`으로 고정한다.
- 같은 SEC CIK의 복수 종목은 검토 편의를 위해 한 **후보**로 묶는다. 실제 R43 발행사 통합 여부는 별도 승인해야 한다.
- NYSE·Nasdaq 이외 거래소, 본사 국가, 중국 본사, OTC, ETF/증권 종류, 특수 주식 및 CIK 충돌을 검토자가 확인한다.
- SEC 공식 안내는 CIK·종목코드·거래소 **연결** 정보를 제공하며, 해당 자료의 정확성·포괄성을 보장하지 않는다. 적격 종목 전체 명부로 자동 간주하지 않는다.
- 권리 확인, 실제 발행사 ID, 거래일·상대거래량·연간 기준일은 별도 기존 R43 승인 계약으로 검증한다.
- 이 초안은 `local-market-calendar-r43-reviewed-issuers.json`을 생성하지 않으며, 그 파일로 이름을 바꾸어 사용해도 승인 계약을 통과해서는 안 된다.
- 자동 API, 유료 다운로드, 새 예약 작업, Core 5분 주기, D1 게시, 공개 등급 변화는 **0**이다.

## 후속 진행 조건

검토자가 출처/권리 및 개별 종목 적격성·중국 본사 제외·복수 클래스 통합을 확정하고 별도의 승인된 R57 명부를 생성한 뒤에만 기존 R43 연간 입력 생성기 → 사전검증 → 수동 게시 → D1 재조회 → 공개 검증 순서를 진행한다. 후보 초안의 생성 성공만으로 첫 R43 게시 완료를 선언하지 않는다.
