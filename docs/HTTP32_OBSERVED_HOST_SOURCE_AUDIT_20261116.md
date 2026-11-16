# HTTP 32 관측 호스트 원본 소스 전수 대조 — 2026-11-16

## 증거와 해석
- 실제 운영 PC 원본: `zgmini-pc-control/results/pc-process-inventory-43886974720-1-operating.json`, 2026-11-16T14:34:01Z.
- 관측 32개: 최근 14일 사이 2개 이상 KST 날짜에 2개 이상 호출된 호스트. 공급자·API 키 개수, 승인된 주기 실행 명세, 데이터 저장 완료 건수가 **아니다**.
- 동일 원본의 관측 요약: 정상 30, 실패 0, 미확인 2. 32개와 `MONITORED_CALENDAR_SOURCES` 14개는 서로 다른 집계 단위.
- 아래 세 번째 열은 **정적 코드 검색으로 확인한 연결 후보**일 뿐, 실제 운영 PC의 승인된 실행 파일/시각/수집-저장-게시를 독립 입증한 것이 아니다. 호출주기를 소스 코드에서만 추정하여 호스트가 중단됐다고 판정하지 않는다.
- 컬럼 '참조 파일'은 현재 `zgmini` 저장소에서 문자열을 검색해 확인했으며, 하위 프로세스·가변 HTTP URL·외부 SDK 사용처를 전수 증명하는 것은 아니다.

| 번호 | 운영 PC 관측 호스트 | 저장소 내 참조 파일 | 역할 근거/주의 |
|---:|---|---|---|
| 1 | `api.bls.gov` | `lib/market-score/growth-r2-bls-request.mjs` | 성장·고용 BLS API |
| 2 | `api.census.gov` | `lib/market-score/growth-r2-census-request.mjs` | 성장 BFS/M3 API |
| 3 | `api.earningsapi.com` | `lib/earnings-api-calendar.mjs` | 실적 일정 API |
| 4 | `api.stlouisfed.org` | `lib/market-data/fred-api-transport.mjs` | FRED 경제지표 |
| 5 | `apps.bea.gov` | `scripts/pc-writer/consumption-r5.mjs` | BEA 원자료 |
| 6 | `cdn.www.census.gov` | `lib/market-score/growth-r2-chart-history-r1.mjs` | BFS 16개월 차트 CSV / 호출주기 미검증 |
| 7 | `data-dbg.krx.co.kr` | `worker/korea-rev7-provider.mjs` | KRX 시장자료 |
| 8 | `data.alpaca.markets` | `scripts/pc-writer/sector-fear-greed-r3-etf-incremental.mjs` | 독립 섹터 ETF/주식 바; R10 사용자가 제외 |
| 9 | `data.bis.org` | `worker/diagnostic-v1-canary.mjs` | BIS 진단 후보; 정규 실행 여부 미검증 |
| 10 | `data.financialresearch.gov` | `lib/diagnostic-layer/batch-b-official-adapters.mjs` | OFR 데이터 |
| 11 | `data.sec.gov` | `lib/market-score/sec-earnings-e1-r4-provider.mjs` | SEC XBRL/실적; 개별 404 보존 |
| 12 | `ecos.bok.or.kr` | `worker/korea-rev7-provider.mjs` | 한국은행 ECOS |
| 13 | `en.wikipedia.org` | `lib/market-score/sec-earnings-e1-r4-provider.mjs` | SEC 보조자료; 정규 주기 미검증 |
| 14 | `home.treasury.gov` | `lib/tic-calendar.mjs` | TIC 공식 발표 일정 |
| 15 | `ir.eia.gov` | `lib/eia-calendar.mjs` | EIA 발표 일정 |
| 16 | `marketparquet.com` | `tools/market-calendar-r43/R43_ANNUAL_PARQUET_OPTIONAL.mjs` | 선택적 연간 자료; 현행 사용 미검증 |
| 17 | `markets.newyorkfed.org` | `lib/market-score/rate-r2-provider.mjs` | NY Fed 금리 자료 |
| 18 | `oui.doleta.gov` | `lib/market-score/employment-r6-provider.mjs` | DOL 실업 데이터 |
| 19 | `production.dataviz.cnn.io` | `worker/feed-collectors/fear-greed.ts` | CNN 공포탐욕 원자료 |
| 20 | `raw.githubusercontent.com` | `lib/market-score/breadth-b1-r3-contract.mjs` | GitHub 호스팅 공개 자료; 현행 주기 미검증 |
| 21 | `thedocs.worldbank.org` | `lib/diagnostic-layer/nyfed-worldbank-adapters.mjs` | World Bank 원문 자료 |
| 22 | `www.bea.gov` | `lib/release-calendar.mjs` | BEA 공식 일정 |
| 23 | `www.bls.gov` | `lib/release-calendar.mjs` | BLS 공식 일정 |
| 24 | `www.census.gov` | `lib/release-calendar.mjs` | Census 공식 일정 |
| 25 | `www.cftc.gov` | `lib/cftc-calendar.mjs` | CFTC 공식 일정 |
| 26 | `www.eia.gov` | `lib/eia-calendar.mjs` | EIA 공식 일정 |
| 27 | `www.federalreserve.gov` | `lib/release-calendar.mjs` | 연준 공식 일정·지표 |
| 28 | `www.nass.usda.gov` | `lib/market-calendar-usda-nass.mjs` | USDA NASS 일정 |
| 29 | `www.newyorkfed.org` | `lib/market-score/rate-r2.mjs` | NY Fed 지표 |
| 30 | `www.sec.gov` | `lib/market-score/sec-fund-flow-r1-provider.mjs` | SEC 공시·자금흐름 |
| 31 | `www.treasurydirect.gov` | `lib/treasury-calendar.mjs` | 미국 국채 공식 일정 |
| 32 | `www.usda.gov` | `lib/usda-calendar.mjs` | USDA 공식 일정 |

## 두 개 미확인 원인과 권리 경계
1. `data.alpaca.markets`: 현행 Core에서 R10은 **EXCLUDED_BY_USER**, 호출 0건 — #1775 / Run 43886974720. 해당 호스트를 공유하는 독립 섹터/ETF 호출은 별개. 마지막 실제 HTTP 200 시각 2026-11-16T00:00:11Z. 과거 20시간 캐시·장중 일자별 수집 때문에 반복 관측 간격이 짧았다고 이를 승인된 매시간 호출 일정으로 간주할 수 없다.
2. `cdn.www.census.gov`: 16개월 차트 CSV 경로, 마지막 HTTP 200 2026-11-03T21:00:36Z. 월별 발표 이후 CDN 신규 호출/저장 증거 미확인. 별도의 `api.census.gov` 경유 성장 공식 BFS G060/G061/G062는 실제 `https://zgmini.kr/api/market-score`에 2026-10 관측월, `2026-11-12T16:57:41.159Z` 확보 시각으로 게시됨. 현행 성장 BFS 정상과 CDN 연결 미확인은 동시에 성립할 수 있다.
3. SEC `data.sec.gov` 7×200/2×404는 호스트 통신 성공과 일부 선택 XBRL 프레임 부재를 분리한다. 개별 404는 원장에 유지.
4. 무단으로 R10 호출을 재활성화하지 않고, CDN 정규 수집을 신규 예약으로 생성하지 않으며, 미확인 시 기존 32/32로 승격하지 않는다.

## 안전한 다음 검증
- 승인된 런타임 source SHA·Core Task·collector별 checkpoint로 **실제 활성 호스트/작업**을 별도 목록화. 현재 이 표만으로 활성 분모를 32라고 확정하지 않음.
- HTTP 연결 성공(최근 실측 2xx)·수집기 스케줄 적기 실행·원자료 파싱/SQLite 저장·D1 공개 게시를 네 별도 판정으로 유지. 스케줄 판정은 추정된 호출 간격이 아닌 공급자 발행주기와 정규 작업 계약에 근거.
- 이력 전용·선택적·사용자 제외 호스트를 임의로 제거해 30/30을 꾸미지 않음. 새로운 권위 있는 출처/실측으로 확인 후 집계 범위를 변경.

## 2026-11-17 최종 Census CDN 직접 검증 및 한정 감시 기준
- 기존 HTTP 31/32의 마지막 미확인은 공식 월간 Census BFS CSV CDN (`cdn.www.census.gov`). 마지막 운영 fetch-wrapper HTTP 200은 2026-11-03T21:00:36Z로 36시간 일간 판정에 의해 unknown.
- 운영 PC 실제 GET **한 번**: Control Issue #1797 / Run 43903908465, `HTTP_200_CSV_FROM_OPERATING_PC`, 2026-11-16T16:07:56.551Z, HTTP 200, CSV, Last-Modified 2026-11-12T15:00:01Z, providerCalls=1, operationalWrites=0, retries=0.
- 현재 14일 rolling 관측 원장에 반복 포함됐고 마지막 응답이 실제 2xx인 **이 공식 월간 CSV 단일 호스트에 한해** 36시간 미호출을 통신 실패/미확인 근거로 삼지 않는다. 최대 15일 경계에서는 실제 마지막 2xx/혼재 여부를 검증하고, 4xx·5xx·NETWORK_ERROR, 쿼터, 미관측은 정상 승격하지 않는다.
- 이는 **HTTP 호스트 연결 상태 판정**에만 해당하며 16개월 차트 D1 최신월, 공식 발표 동기화, 정규 수집 주기의 건강도는 별개로 유지한다. 계정 인증/D1 전수 감사/신규 cron 불필요.
- 공개 API와 PC 관측 결과에서 실제 32/32 재검증 전에는 최종 성공으로 표기하지 않는다.
