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

## 공통 실행 기준 참조 및 선택 이유 (2026-10-29)

- 공통 원본: [`codex/theme-fear-greed-integration-20261025:docs/CMD_EXECUTION_PLAYBOOK.md`](https://github.com/ansqhd5774-Choi/zgmini/blob/codex/theme-fear-greed-integration-20261025/docs/CMD_EXECUTION_PLAYBOOK.md). 이 문서를 복제하지 않고 작업에 필요한 실행 계약만 여기 기록한다.
- R50의 목적은 **이미 PC에 저장된 SEC ZIP과 Alpaca 주가 후보의 품질 확인**이다. 현재 PC의 Git checkout·승인 실행 SHA를 직접 확인할 권한이 없으므로 독립 ZIP + 얇은 CMD + Node 도구를 선택했다. Git checkout을 임의 변경하거나 신규 설치기를 만들지 않는다.
- 기존 도구 재사용: `market-calendar-r48-quality-readonly.mjs`의 저장 캘린더 해석·주식 수 후보 검증·주가 검사 함수, `market-calendar-r49-sec-map-bulk-readonly.mjs`의 SEC 공식 매핑 파서. R50은 ZIP 엔트리 본문 검사와 **모든 기존 주가 파일** 집계 기능만 추가한다.
- 고정 실행 코드 출처: `87c62a2427ce4aa7d2096d08e796bc908cb16b44` (`codex/ui-improvements`, R50 신규 4개 파일 최초 반영). 현재 개발 브랜치 HEAD나 `main`이 이후 변경되더라도 이 SHA를 임의의 PC 운영 승인 SHA로 간주하지 않는다.
- 별도 설치·적용·백업·롤백 단계는 **없음**(읽기 전용). 기존 PC `E:\ZGmini\data\pc-writer`의 SQLite, SEC ZIP·매핑 JSON, Alpaca 증분 가격 파일을 읽고 실행 폴더에 결과 TXT 1개만 생성한다. 기존 실행 파일·DB·D1·예약 작업을 수정하지 않는다.
- Git checkout이 없는 PC에는 고정 코드와 **동일 상대 경로의 정적 import**, 고정 소스 SHA, SHA-256 파일별 manifest, 한국어 설명이 있는 ZIP을 제공한다. ZIP 내부 SHA 비교만으로 출처를 검증한 것으로 보고하지 않고 GitHub 고정 SHA의 파일별 blob과 별도로 대조한다.

## 실행/STOP/결과 계약

1. 새 빈 폴더에 R50 ZIP을 풀고 `MARKET_CALENDAR_R50_BULK_FACTS.cmd`를 **한 번만** 실행한다. 입력값·인증정보를 대화나 CMD에 제공하지 않는다.
2. 필요 조건: 승인 Node `E:\ZGmini\runtime\node.exe`, 원본 PC SQLite, SEC 매핑 JSON과 `companyfacts.zip`, 기존 Alpaca 가격 폴더(없으면 정직하게 보고). 압축 파일과 같은 폴더에 필수 JS 모듈이 모두 있어야 한다.
3. 정상 도구 종료: `STATUS=R50_BULK_AND_PRICE_READONLY_COMPLETE`, 생성 파일 `MARKET_CALENDAR_R50_BULK_FACTS_RESULT.txt`. 이 상태는 **분석 절차 완료**를 뜻하며 주가 충분·시가총액 검증·별표 갱신 성공을 뜻하지 않는다.
4. 결과 파일 선존재, Node/스크립트 누락, 원본 DB/SEC 매핑/ZIP 손상, 오류 종료는 **STOP**이다. 임의 재실행·데이터 삭제·잠금 해제·DB 초기화·스케줄러 변경을 하지 않는다.
5. 실행 결과 TXT만 회수한다. 개별 기업 원자료·비밀정보를 보고서에 기록하지 않는다. PC 실측 결과가 도착해야 다음 단계(회사별 클래스 검증, 주가 누락 보완, 대량 작업 chunk/checkpoint 필요 여부)를 결정한다.

## 검증 경계

- 완료: R50 모의 원자료 유닛 테스트 8/8, JS 문법 검사, ZIP 파일 무결성, 원격 브랜치 신규 파일 4개의 blob 일치 확인.
- 미실행/미확인: 사용자 Windows PC의 실제 R50 실행·ZIP 검증 스크립트 실행·원본 2,624개 SEC 엔트리 실제 해석·원천 주가 보완·기업별 시총·D1·운영 배포·다음 예약 실행.
- 유효한 기존 R49 증거는 재사용한다. R50 실패의 원인과 실제 영향 범위가 확인되기 전에는 새 설치/수집 도구나 반복 감사 작업을 추가하지 않는다.
