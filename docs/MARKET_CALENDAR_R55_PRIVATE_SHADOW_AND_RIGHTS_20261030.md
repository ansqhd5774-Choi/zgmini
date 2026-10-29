# R55: 비공개 시총 등급 미리보기 게이트와 사용권 점검 (2026-10-30)

저장소 `ansqhd5774-Choi/zgmini`, 기존 브랜치 `codex/ui-improvements`. `main` 병합/Cloudflare 배포 없음.

## 현재 확인된 실측·제약

- R53 PC 결과: 최근 주가+SEC 주식 수 후보 2,372개, 실제 기업 전체 시가총액 검증 0개, 별표 판정 0개, 공개 파생 표시 권한 미확인.
- 공식 Alpaca 지원 문서에서는 API 데이터를 플랫폼에 재배포할 수 없다고 명시한다. 별표처럼 추상화한 파생 정보까지 별도 허가 없이 외부 공개 가능한지는 **확정하지 않는다**. https://alpaca.markets/support/redistribute-alpaca-api
- FMP 이용약관은 별도 계약 없는 웹사이트 공개 표시와 파생 데이터 사용을 제한한다. 앞선 R46 파일럿의 일부 결과만으로 공개 권한을 추정해서는 안 된다. https://site.financialmodelingprep.com/terms-of-service
- SEC CompanyFacts는 기업별 공시 값은 제공하나 다중 주식 클래스, ADR 비율, 분할 조정과 정확한 기업 전체 시가총액을 보장하지 않는다. https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- 현재 R54는 증거를 검증하는 수집기가 아니라 상위 검증이 완료된 **입력을 받는 순수 게이트**다. 호출자가 붙인 검증 불리언만으로 실제 계약상 권한이 존재한다고 주장하지 않는다.

## 구현

- `scripts/pc-writer/market-calendar-r55-shadow-preview.mjs`
- `scripts/pc-writer/market-calendar-r55-shadow-preview.test.mjs`

R54가 검증했다고 표시한 종목과 기존 HTML-only 캘린더 스냅샷을 비교하여 **메모리 안에서만** 중요도 마크업 변환을 연습한다. 누락/충돌/복수 클래스 불일치/기존 행 계약 불일치가 있으면 미리보기 자체를 생성하지 않는다. 유효할 때도 결과는 `PRIVATE_SHADOW_ONLY`와 `NOT_PUBLICABLE_HTML`로 구분되어 기존 공개 리더의 `READY_DISPLAY`/ `OWN_SITE_HTML_ONLY` 계약에 맞지 않는다.

코드와 검증:
- Node 22 구문 검사 PASS 및 오프라인 단위 테스트 **8/8 PASS**(모의 자료, PC 운영 실측 아님)
- 신규 파일 Git blob SHA: module `e2e6f3d3dafa28affbdcd23d0be35e1130da7a89`, tests `39bd356755ab75fe074429e2a2c03478291a1c1f`, 로컬 검증용 동일 SHA.
- 어떠한 주식 수/주가/시총도 GitHub에 업로드하지 않음. provider 호출, PC SQLite 쓰기, D1 쓰기, 별표 변경, 새 예약 작업 모두 없음.
- 현재 운영값은 검증된 시총 0개이므로 R55의 **실제 변환 대상 없음**. 시범 테스트의 ABBV/GOOG/GOOGL 등급은 실제 값이 아닌 모의 데이터다.

## 후속 필수 작업

새로운 반복 R51~R53 수집은 필요 없다. 무료 사용 가능한 기업별 USD 시가총액의 **법적으로 허용된 공개 파생 표시 출처**를 확정하거나 해당 출처에서 필요한 명시적인 허가를 확보해야 한다. 해당 가격과 issuer-wide shares의 클래스/ADR/기업행위/기준일 검증이 선행되어야 한다. 이후에만 기존 PC 재계산→저장→기존 HTML-only 공개 게시 경로에 최소 변경으로 연결하고 readback/API/PC·모바일 UI를 검증한다. 승인되지 않은 TTL, 산식, DB 계약, 기존 별표 fallback은 변경 금지.
