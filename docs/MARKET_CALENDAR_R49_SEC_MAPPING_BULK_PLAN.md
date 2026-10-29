# 시장 캘린더 R49 — SEC 기업 식별 매핑·보유 ZIP 확대 점검

작업 저장소: `ansqhd5774-Choi/zgmini` · 기존 브랜치: `codex/ui-improvements`.

## R48 실측 근거 (2026-10-29)

- 14일 실적 티커 2,640개; 기존 E1-R3 매핑 229개.
- SEC 발행주식 수 후보 216개, 기존 Alpaca 최근 주가 246개, 동시 존재 214개.
- 시가총액 검증 0개, `gradeableTickerCount=0`. 주가 파일 1,760개 중 560개 미열람은 검사 상한에 의한 부분 점검이며 공급자 실패 근거가 아님.
- 기존 `manual-input/e1-r5/incoming/companyfacts.zip` 있음(R47 PC 실측).

## R49 실행 계약

1. 기존 SQLite `market-calendar:earnings-display-html`와 E1-R3 `universe`를 읽기 전용으로 조회한다.
2. `manual-input/e1-r5/incoming/company_tickers_exchange.json`이 있으면 재사용한다. 없으면 SEC 공식 `https://www.sec.gov/files/company_tickers_exchange.json`에 **최대 1회만** 요청한다. 기존 SEC 다운로드 코드의 공개 User-Agent 식별 문자열을 재사용한다. 응답 8MiB 제한/12초 제한/재시도 0회/Schema 검사 후 PC 원자료 경로에 `wx`로만 저장한다. 실패·HTTP 제한은 자동 우회하지 않는다.
3. 이미 보유한 `companyfacts.zip`을 해제하지 않고 ZIP 중앙 디렉터리를 읽어 CIK 포함 개수와 ticker↔CIK↔ZIP 교집합을 집계한다. 압축 내부 원자료는 읽지 않는다.
4. 신규 식별 매핑 후보, 충돌, 클래스 기호(`.`/`-`) 별칭 **미적용** 후보, 보유 파일과의 교집합만 보고한다. 기존 E1-R3 매핑과 불일치하면 자동 교체하지 않는다.
5. 로컬 원자료 SEC 대응표 1개 외에 DB/D1/배포/UI/스케줄러/설정은 변경하지 않는다. 시총·별표 0건 산출. 세부 티커·CIK·원자료·인증정보는 감사 결과에 기록하지 않는다.

## 후속 게이트

- R49는 **티커↔CIK 커버리지**만 확인한다. ZIP의 존재와 발행주식 수가 기업 전체 시가총액을 증명하지 않는다.
- 회사 종류별 발행 주식 수, ADR, 분할·주가 기준일, USD 단위, 공개 파생 이용권을 검증한 뒤에만 자동 별표 계산·게시로 전환한다.
- 기존 2,640개 캘린더, R43의 200B/20B USD 별 등급, 경제지표의 현재 중요도는 유지한다.

## 공식 근거

- SEC 기업·티커·거래소 매핑, Fair Access 및 User-Agent: https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data
- SEC CompanyFacts bulk ZIP: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- Alpaca 가격 API는 후속 별도 범위 확인: https://docs.alpaca.markets/us/docs/market-data-faq
