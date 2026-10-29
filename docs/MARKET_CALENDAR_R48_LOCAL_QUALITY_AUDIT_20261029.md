# 시장 캘린더 R48 — 기존 SEC·Alpaca 자료 실측 품질 감사

작업 브랜치: `codex/ui-improvements` · 대상 저장소: `ansqhd5774-Choi/zgmini`.

## R47 PC 실측 확정 (2026-10-29)

- 14일 실적 이벤트/고유 티커: 2,640/2,640 (issuer 통합 전).
- E1-R3 ticker↔CIK 매핑: 229; SEC CompanyFacts 이름 확인: 229.
- Alpaca `group-*.json` 종목 멤버십 교집합: 246.
- SEC CompanyFacts 파일명과 Alpaca 그룹에 함께 존재하는 대상: 227 (전체의 8.6%).
- SEC 파일명 총 500, Alpaca 멤버십 그룹 파일 총 55, 그룹 파싱 누락 0.
- 시가총액 검증 완료 0, 등급 적용 가능 0. API 0회, DB/D1 변경 0.

R47 수치는 파일 **존재와 멤버십**만 확인했다. 시가총액 산출 가능성이나 실제 가격 데이터, 단일 주식종류/기업 전체 유통·발행 주식 수를 의미하지 않는다.

## R48 점검 목표와 실제 소스

- 원본: `storage/core.sqlite`의 `public_feed_snapshots_v1`과 `market_score_earnings_e1_r3_universe_v1` 최신 행.
- SEC: `manual-input/e1-r5/incoming/companyfacts/CIK*.json`에서 `dei.EntityCommonStockSharesOutstanding` / `us-gaap.CommonStockSharesOutstanding`의 양의 주식 수, 공시일·관측일·동일시점 상충 여부 확인.
- Alpaca: `asset-r10-alpaca/incremental/YYYY-MM-DD-YYYY-MM-DD-group-N.json`에 저장된 `source=ALPACA`, `feed=iex`, `adjustmentStatus=split` 일봉 종가의 실제 존재·관측일·동일시점 상충 확인.
- 동일 CIK에 여러 티커가 연결된 경우를 집계. **다중 클래스 issuer-level 시총 산출은 하지 않는다.**
- 관측 연령은 분포별로만 집계한다. 7/30/90/180일 구간은 설명용이며 **새 승인 TTL이나 최신성 판정 규칙이 아니다.**
- SEC ShareFacts의 구체적 클래스/컨텍스트, ADR 비율, 분할 전후 주가/주식 수 일치, 공개 파생 출력권은 별도 검증 대상. `gradeableTickerCount=0` 유지.

## 구현

- `scripts/pc-writer/market-calendar-r48-quality-readonly.mjs`
- `scripts/pc-writer/market-calendar-r48-quality-readonly.test.mjs`
- 루트 실행기 `MARKET_CALENDAR_R48_OFFLINE_QUALITY.cmd`

기본 Windows PC 데이터 경로는 기존 `E:\ZGmini\data\pc-writer`, Node는 기존 `E:\ZGmini\runtime\node.exe`를 사용한다.

프로그램은 외부 요청 0, `DatabaseSync({readOnly:true})` + `PRAGMA query_only=ON`, 원본 파일 읽기만 수행. 결과는 같은 폴더에 `MARKET_CALENDAR_R48_OFFLINE_QUALITY_RESULT.txt` 한 건만 `wx` 플래그로 생성하며, 기존 파일 존재 시 중단한다. 보고서에는 집계·상태만 기록하고 티커, CIK, raw 주식 수·가격·키를 기록하지 않는다. 데이터 파일 수·크기 상한에 도달하면 `PARTIAL_SOURCE_FILES`를 보고하고 임의 0/최신값을 보충하지 않는다.

## 검증과 상태

- Node 내장 테스트 11개(로컬 SQLite 통합 fixture 포함)와 구문 검사 수행. PC E: 원자료 실제 실행은 **NOT RUN**.
- GitHub 소스/스크립트 준비와 PC 실행은 구분. R48 결과를 받은 뒤 유효 SEC share fact · IEX 종가가 얼마나 겹치는지 확인.
- DB/D1 쓰기·수집·게시·스케줄러·운영 UI 별표 변경 **없음**.

## 출처

- SEC 공식 CompanyFacts/XBRL API: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- SEC XBRL Guide (2026-10-23): https://www.sec.gov/files/edgar/filer-information/specifications/xbrl-guide-2026-10-23.pdf
- Alpaca Historical Bars: https://docs.alpaca.markets/us/reference/stockbars
- FMP 공개 파생 사용권: https://site.financialmodelingprep.com/insights/platform/can-you-use-fmp-data-in-a-public-app-website-or-client-dashboard
