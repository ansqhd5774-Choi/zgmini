# 미국 등락 지수 — 확정치 503 제한 원인과 원자료 무변경 감사 R18

## 사용자 확정 계약 (2026-11-01 최신 정정)

- **잠정치**: Alpaca IEX, 장중 S&P 500 약 503종목 실관측, 15분. 98% 확보나 확정 방향 일치율을 요구하지 않는다.
- **확정치**: MarketParquet `stock_daily` **미국 주식 전체 적격 종목**. 약 6,500개는 실제 공급자의 최근 일별 주식 수를 설명하는 값이지, 정확히 6,500으로 강제하는 상수가 아니다.
- 확정치의 503개 S&P 500 제한은 사용자 승인 의도와 불일치한다. B1 S&P 500 가중 점수와 확정 시장 등락 종목 수는 서로 별개다.
- 기존 공개 확정 결과 및 **250거래일 이력**, B1 점수, 데이터베이스 스키마, 예약 작업, PC 원자료를 임의로 변경·재작성·삭제하지 않는다.

## 코드로 확인한 오류 경로

`market-breadth-us-r1.mjs`는 PC `market_score_breadth_b1_r3_universe_v1`의 S&P 500 명단(490~520개)을 선택한다. `...current_v1` 및 `...history_v1`도 그 명단에 맞춰 저장된 MarketParquet 가격이다. `us-public-r1.mjs`는 `universe=SP500`과 `expectedCount=490~520`을 강제한다. 따라서 MarketParquet 파일이 약 6,500개 미국 주식을 공급하더라도 현재 확정 게시기가 503개만 표시하는 것은 **코드의 필터링** 때문이며, MarketParquet가 503개만 제공하기 때문이 아니다.

## R18 읽기 전용 확인

`node scripts/pc-writer/us-breadth-confirmed-source-audit-r18.mjs --inspect`

- 실제 PC에서 실행할 경우 **표준 출력에만 JSON 요약**을 출력한다. E: 결과 파일, 진단 기록, 자동 스케줄러, D1 게시를 만들지 않는다.
- 기존 `core.sqlite`를 읽기 전용으로 열어 최근 두 거래일의 B1 저장 종목 수와 로컬 공개 결과 정보를 확인한다.
- 기존 `E:\ZGmini\data\theme-market-history-r131\marketparquet-r165`, `...\marketparquet-r167`, `...\raw`, `E:\ZGmini\data\pc-writer` 및 실제 `ZGMINI_PC_HOME` 등 제한된 **알려진 운영 경로만** 살핀다. `stock_daily_YYYY-MM-DD.parquet`와 `by_date/stock_daily/YYYY/YYYY-MM-DD.parquet`, `stock_daily/YYYY/YYYY-MM-DD.parquet`를 탐색한다. E: 전체 재귀 검색은 하지 않으며 ETF 파일을 주식 전체 원자료로 간주하지 않는다.
- 실제 저장 파일을 찾으면 그 안의 날짜·`asset_type=stock`·중복·상장폐지 접미사·가격/거래량을 검사해 적격 후보 수와 양일 종목 교집합 수를 출력한다. 개별 종목 가격과 개인 API 키는 출력하지 않는다.
- 파일 SHA256을 출력하고, 같은 파일의 기존 `.audit.json` 또는 `marketparquet-r167` 감사를 발견하면 날짜·source·complete·SHA256 일치를 확인한다. 감사 불일치/훼손은 즉시 후보 계산 차단. 감사 파일이 없으면 `LOCAL_AUDIT_NOT_FOUND`로 구분한다. **일치하는 로컬 감사만으로 MarketParquet 원본의 진위·전체 다운로드 완전성을 입증한 것은 아니다.** 따라서 `providerAuthenticityVerified=false`이며 공개 승인은 여전히 불가하다.
- 두 원본 날짜를 읽을 수 있으면 R19 전체 시장 확정치 **후보**도 함께 계산한다. `publicationAllowed=false`이며 기존 확정 키와 이력은 쓰지 않는다.
- Parquet 해독은 저장소의 `hyparquet`를 우선 사용하고, 해당 설치가 없으면 이미 운영 중인 R167의 승인된 디코더를 읽기 전용으로 재사용한다. 디코더 설치·다운로드는 하지 않는다.
- 두 파일이 없으면 `FULL_MARKET_SOURCE_NOT_YET_VERIFIED`로 보고한다. 이 상태에서 503을 6500으로 임의 변경하거나 새로운 확정치를 발행하지 않는다.

## 후속 단계 게이트

1. PC에서 R18 출력 결과로 기존 전체 주식 원자료의 **저장 유무, 실제 종목 수, 두 날짜 간 동일 가격 조정 기준**을 확인한다.
2. 저장 원자료가 충분하면 별도 전체 시장 확정 계산기를 개발해 B1 503종목 체계를 보호한다. 미보관이면 MarketParquet 전체 일봉을 먼저 승인된 운영 경로에 저장하는 최소 수집 설계를 검증한다.
3. `~6500` 후보에서 OTC, ETF, 중복/상장폐지 등 **실제 시장 적격성**과 누락 규칙을 정하고 검산한다. 가격 비교에는 같은 조정 기준의 이웃 거래일을 사용한다.
4. 실제 원자료·독립 확정 계산·D1 결과 검산 후 공개 API/UI를 정정한다. 이미 게시된 250일 결과의 대량 수정이나 역산 백필은 수행하지 않는다.
5. 잠정치 R17의 15분 운영·D1·화면 연결은 별도 게이트로 진행한다.

**R18은 분석 도구이며 실제 Windows PC에서 실행됐거나 전체 6,500개가 검증됐다는 뜻이 아니다.**
