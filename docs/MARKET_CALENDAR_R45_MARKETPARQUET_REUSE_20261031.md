# R45: 기존 B1 MarketParquet 파일의 PC 비공개 재사용

상태: **구현 및 합성 입력 검증 완료 / PC 운영 수집 결과 미확인 / 공개 R43 등급 변경 없음**  
대상 브랜치: `codex/zgmini-gpt-workspace-20261025`

## 목적과 허용 범위

- 기존 B1 S&P500 수집이 이미 다운로드하는 MarketParquet `stock_daily/latest.parquet`와 직전 거래일 파일을 재사용한다.
- B1은 500여 S&P500 종목만 DB에 기록하지만, R45는 이미 파싱된 **전체 `asset_type=stock` 행**에서 종목별 종가·거래량을 추출해 PC 내부 파일에 보관한다.
- 신규 제공자 HTTP 요청, 과거 20일치 소급 호출, 일정·DB 스키마 변경, DB 추가 기록, 게시물 변경이 없다.
- 이 단계는 **R43 ★★★ 산식/운영 활성화가 아니라 향후 검증할 시장 데이터 입력 확보**이다.

## 실행 연결

1. PC `scripts/pc-writer/collect-local.mjs`에만 R45 private snapshot observer를 설치한다.
2. 기존 B1 `collectBreadthB1R3ToStore`가 MarketParquet 주 수집기를 호출할 때 선택적으로 observer를 전달한다.
3. 기존 B1 시총과 무관한 수급 수집 조건(종목 포함률 98% 이상)을 통과하면, 이미 받은 현재/전일 주식 행을 observer에 넘긴다.
4. R45는 각 거래일의 유효한 개별 주식 행이 2,000개 이상인지 확인하고 `PC_HOME/market-calendar-r45-marketparquet/stock_daily_YYYY-MM-DD.json`에만 쓴다.
5. 파일은 원본 배포가 아닌 PC 비공개 저장 용도이다(`publicFeed:false`, `redistribution:false`); 코드상 새로운 발행 API 및 공개용 파일 내보내기는 없다.

## 파일 안전장치

- 각 날짜를 정규화하고 거래일 간 선후관계, 종목 코드, 종가 양수, 거래량 유효성을 검증한다.
- 전체 두 날짜를 먼저 검증하고, 날짜별 SHA-256 무결성 정보와 종목 수를 기록한다.
- 동일 날짜·동일 내용은 `ALREADY_STORED`, 다른 내용은 `CONFLICT_PRESERVED`로 처리하며 기존 파일을 덮어쓰지 않는다.
- 임시 파일 생성 후 같은 파일시스템 내 하드링크의 배타적 생성을 이용해 저장 충돌 시 기존 데이터를 보존한다. 로컬 저장 오류는 `R45_CAPTURE_FAILED_PRESERVE_B1`로 보고하고 B1 수집 판단에 개입하지 않는다.
- 수집 결과 JSON에는 날짜별 건수와 상태만 쓰며 상세 종목 행이나 가격을 포함하지 않는다.

## 시험 및 한계

- **합성 3,000종목 × 2일** 입력으로 신규 저장, 반복 실행, 소스 변경·기존 파일 손상 시 보존, 불완전·중복 데이터 차단, 부적절한 거래량 제외를 시험한다.
- PC에 실제로 MarketParquet 전체 행이 최소 2,000개씩 확보되는지, 기존 수집 작업이 실행되는지, 저장 파일이 누적되는지는 운영 실행 후 확인 대상이다. 별도의 선제적 2,634종목 전체 API 확보율 검증이나 새 API는 요구하지 않는다.
- 2일 종가·거래량만으로 시가총액, 20일 평균 거래대금/거래량, SEC 사업 규모, 주요 지수 비중, 해외/중국 본사 구분 또는 R43 적격 전체 모집단을 확정할 수 없다.
- 따라서 이 R45 저장을 근거로 **77.3%(102/132) 시뮬레이션 결과를 실전 재현했다고 선언하지 않으며**, 공개 R3 등급이나 R43의 ★★★ 배정을 수정하지 않는다.
- MarketParquet 원본 자료를 외부로 재배포하지 않으며, 실제 배포·운영 전에 현재 데이터 이용 조건을 재확인한다.

## 소스 파일

- `lib/market-score/breadth-b1-r6-marketparquet-provider.mjs`: 추가 요청 없는 observer 호출
- `lib/market-score/breadth-b1-r3-collector.mjs`: observer 전달
- `scripts/pc-writer/collect-local.mjs`: PC-local 등록 및 요약 기록
- `scripts/pc-writer/market-calendar-r45-marketparquet-capture.mjs`: 비공개 종가/거래량 스냅샷 저장
- `tests/market-calendar-r45-marketparquet-capture.test.mjs`: 합성 입력 기반 안전성 검사
