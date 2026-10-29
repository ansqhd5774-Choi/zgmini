# 시장 캘린더 R50 — SEC 대량 ZIP 실제 주식 수 확인 및 로컬 주가 전체 대조

- 저장소: `ansqhd5774-Choi/zgmini`; 기존 작업 브랜치: `codex/ui-improvements` (새 브랜치 생성 금지).
- 전제: R49 실측 SEC 매핑 2,627/2,640 티커, 기존 `companyfacts.zip` ZIP 엔트리 2,624 티커.
- R49의 ZIP 엔트리 존재는 회사 전체 발행주식 수·거래 가능한 상장 클래스·시총 검증을 의미하지 않는다.

## R50 실행 범위

1. 기존 PC SQLite 공개 캘린더(14일)와 R49 SEC 공식 매핑 JSON을 읽기 전용으로 연다.
2. 이미 저장된 `companyfacts.zip` 중앙 디렉터리에서 SEC CIK별 JSON 엔트리를 찾아 **디스크에 해제하지 않고** CRC 확인 후 메모리에서 해석한다. 최대 개별 팽창 크기 32MiB/압축 24MiB, ZIP 파일 10GiB, 중앙 디렉터리 16MiB를 제한한다.
3. `dei.EntityCommonStockSharesOutstanding` 및 `us-gaap.CommonStockSharesOutstanding`의 과거 관측치 중 감사일 전에 제출·종료된 후보를 확인한다. 사실 충돌/미존재/오래된 관측/중복 클래스 위험을 구분한다. **주식 수 실값, 개별 티커, 회사명, CIK는 결과 파일에 기록하지 않는다.**
4. 기존 `asset-r10-alpaca/incremental`의 모든 패턴 일치 JSON 주가 파일을 시간 역순으로 검사한다. 종전 R48 1,200개 임의 파일 상한은 제거한다. 최대 합계 512MiB/파일 32MiB, 파일 누락·스캔 상한·주가 충돌을 별도 보고한다.
5. SEC 발행주식 수 후보와 기존 주가가 동시에 있는 티커 수, 최근 90일 SEC 사실·7일 주가 후보 교집합을 집계하되, 시가총액·별점은 계산하지 않는다.
6. 데이터 제공자 호출 0회, PC DB/D1 쓰기 0회, 별점/사이트/스케줄러/운영 소스 변경 0회. 출력은 실행 폴더의 집계 결과 TXT 1개이며 기존 파일을 덮어쓰지 않는다.

## 남는 필수 작업

- 발행주식 총수의 회사·종목 클래스별 귀속, ADR·다중 종목, SEC 사실의 단위·수정 공시 확인.
- 주가의 해당 상장 클래스 가격, 분할 조정 및 동일 기준일, 전체 대상 주가 확보 경로, 공개 파생 데이터 권리.
- 모두 검증 후 기존 R43 등급(시총 ≥2,000억 달러 ★★★; ≥200억 달러 ★★; 기타 양의 시총 ★)과 별표 자동 갱신 구현. 경제지표의 별점은 그대로 유지.

## 공식 문서

- SEC XBRL CompanyFacts: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- Alpaca Market Data FAQ: https://docs.alpaca.markets/us/docs/market-data-faq
