# R39: 기존 MarketParquet에 R32 63 ETF가 있는지 1회 검사

## 목적

R35 무료 1시간봉의 최신 NY 관측일은 2026-10-23에서 멈춰 있지만, 별도 R7 실제 PC 결과가 이미 저장된 MarketParquet의 2026-10-26 ETF 종가를 SHA로 검증했다. 따라서 **새 유료 수집이나 중복 재수집 없이**, 기존 10개 공개 테마 중 공통 8개 개선 산식의 2026-10-26 잠정치 계산에 필요한 종목별 자료가 실제 저장되어 있는지 검사한다.

## 실행

`THEME_NINE_R39_PARQUET_COVERAGE_WINDOWS.zip`의 세 파일을 한 폴더에 모두 풀고 `THEME_NINE_R39_PARQUET_COVERAGE.cmd`를 더블클릭한다.

1. `THEME_NINE_R39_PARQUET_COVERAGE.cmd` — Windows CMD, ASCII CRLF.
2. `theme-nine-r39-parquet-coverage.mjs` — Node 순수 읽기 검증.
3. `theme-nine-r20-approved-candidates.json` — R20 원본과 SHA256 일치해야 통과.

출력: 사용자 실제 Desktop 경로 `THEME_NINE_R39_PARQUET_COVERAGE_RESULT_<UTC>_<PID>.txt` 단일 파일. Desktop은 레지스트리 Shell Folders 값 우선, 실제 폴더를 확인한 뒤 사용한다. OneDrive Desktop 경로도 지원한다. 실패 시 가능하면 STOP 보고서를 동일 위치에 생성한다.

## 저장소·검증·비변경 보장

- 읽기 소스: `E:\ZGmini\data\theme-market-history-r131\marketparquet-r165\etf_daily_2026-10-23.parquet`와 `etf_daily_2026-10-26.parquet` 및 각각 대응하는 r167 감사 JSON.
- 두 Parquet 바이트 SHA256을 R7 실제 PC에서 이미 확인된 값과 대조하고, 감사 자료의 `date/source/complete/sha256`을 검증한다.
- 기존 PC에 설치된 `hyparquet` 디코더를 재사용한다. 설치·다운로드·API 요청 없음.
- R20 ETF 64자리/서로 다른 ETF 63개와 SPY를 대상으로 10월 23일/26일의 실측 종가 보유 여부를 확인한다. 누락·중복·날짜 불일치·비정상 가격을 숨기지 않는다.
- 원시 가격값을 공개하지 않고 **종목별 실측 존재 여부**와 누락 ETF만 TXT에 기록한다.
- 대상 자료는 split-adjusted EOD인 반면 R32는 raw unadjusted 1h이므로 **그대로 잇거나 혼합 계산하지 않는다**. 가격 모드 비교·산식 재현 검산은 다음 단계이며 R39은 점수 계산·게시를 승인하지 않는다.
- `E:` 원본 파일, E: DB, D1, GitHub 배포, Windows 예약 작업, 공개 10개 테마와 과거 점수 **변경 0건**.

## 실행 및 코드 검증

- `node --test tests/theme-nine-r39-parquet-coverage.test.mjs`: 정상 63종 + SPY, 실제 결측, 원가격 오류·중복·날짜 불일치 단위테스트.
- 실제 사용자 PC 파일의 현재 상태와 종목별 보유 여부는 사용자가 R39 CMD를 실행해 제출하는 TXT 전에는 미확인.

## 참고

- Market History 공식 운영: https://getmarkethistory.com/docs/reliability/
- 공식 D1 문서: https://developers.cloudflare.com/d1/worker-api/prepared-statements/

## 2026-10-27 실PC R39 실행 결과 — **확정 실측**

사용자가 제출한 결과 원본 2건과 CMD 실행 화면을 확인했다.

- `THEME_NINE_R39_PARQUET_COVERAGE_RESULT_20261027133725_36928.txt`
- `THEME_NINE_R39_PARQUET_COVERAGE_RESULT_20261027133736_36960.txt`
- 실행 화면: Windows CMD 정상 종료, `PARTIAL_DAILY_ETF_COVERAGE_ONLY`, `basePresent=54 / nextPresent=54 / paired=54`.
- 두 보고서의 전체 필드가 동일하다. **재실행 요구 금지**. 실제 가격 미출력은 R39 개인정보/원자료 보호 설계에 따른 정상 동작이다.

| 항목 | 실측 |
| --- | --- |
| 로스터 | 기존 사용자 승인 9테마·64자리·고유 ETF 63종, SHA `e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c` |
| 2026-10-23 저장 EOD | ETF 54/63, SPY 있음 |
| 2026-10-26 저장 EOD | ETF 54/63, SPY 있음 |
| 양일 공통 | ETF **54/63(85.71%)**, SPY 양일 있음 |
| 양일 동일 결측 | `CABZ,CBOT,GNMX,KYC,LATR,LLMA,RBTX,WR,XA` (고유 9종) |
| 10/23 Parquet SHA256 | `4f0bbb08f4a67818209d6d32d465006111c6d6b0c958caf7f9202a49ca8c8f45` |
| 10/26 Parquet SHA256 | `002465943c1cdb51191d528032652ad87ee0ab06f6bacb163b1ff4ce04a9174a` |
| 자료 모드 | `MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED`; **R32 1h 원가격과 다름** |
| 공급자/원자료/DB/D1/스케줄러 쓰기 | 전부 **0** |
| R32 점수 계산·공개 승인 | `NOT_PERFORMED_PRICE_MODE_BRIDGE_NOT_VERIFIED` / `false` |

### 테마별 R20 편입 목록 대비 실제 파일 존재 여부

| 테마 | R20 ETF 자리 | R39 양일 보유 자리 | R39 양일 결측 | R32 2026-10-23 **점수 유효 자리** |
| --- | ---: | ---: | --- | ---: |
| 로봇·자동화 | 7 | 5 | `RBTX,CBOT` | 5 |
| 클라우드·SaaS | 5 | 5 | 없음 | 4 |
| 자율주행 | 6 | 5 | `CABZ` | 3 |
| 원전·SMR | 6 | 6 | 없음 | 5 |
| 방산 | 6 | 5 | `WR` | 4 |
| 핀테크 | 6 | 4 | `KYC,LATR` | 3 |
| 사이버보안 | 8 | 7 | `XA` | 5 |
| AI·반도체 | 11 | 10 | `LLMA` | 10 |
| 바이오·신약 | 9 | 8 | `GNMX` | 7 |
| **합계 (ETF 자리)** | **64** | **55** | **9** | **46** |

- `BOTZ`가 로봇과 자율주행 양쪽에 포함되므로 **보유 55자리 = 서로 다른 ETF 54종**, **R32 유효 46자리 = 서로 다른 ETF 45종**이다.
- R32 최신 유효 45종은 모두 R39 10/23 및 10/26 저장자료의 보유 54종에 포함된다. 하지만 **가격 파일에 존재함 = R32 점수 산출 가능함**은 아니다. R32는 실측 공통 세션 40일 이상 및 동일 가격모드·산식 조건을 요구한다.
- 9종 결측은 **위 두 날짜의 기존 `etf_daily` Parquet에서 미발견**을 뜻한다. 상장폐지·API 미지원·운용사 결격·수집 실패 중 무엇인지까지 확정하지 않았다. 사용자 승인 R20 로스터에서 **임의 삭제하거나 0점 처리하지 않는다**.
- R39는 **두 날짜의 파일 보유만 확인**했다. 252일/628일 장기 EOD 보유, 조기폐장·NY 기준일, 2026-10-26 R2 개별 점수, 공식 AUM 최신성, 정규 작업의 63종 전체 수집 범위를 검증한 것은 아니다.

### 다음 작업 우선순위 (S3 → S4, 새 산식 금지)

1. **R39 통과 범위 확정**: 두 실PC 결과를 재사용하고 R39 재실행·R19/R20/R23/R25/R32 재연구 금지.
2. **가격모드 브리지 실증**: 기존 R23의 SHA 검증된 `RAW_UNADJUSTED_1H` ETF/SPY 뉴욕 15시 대용 종가와 MarketParquet `DAILY_SPLIT_ADJUSTED` EOD의 **서로 겹치는 실제 거래일**을 비교한다. 단순 하루 존재 검사나 무근거 환산계수로 정합성을 선언하지 않는다. 가능한 실측 공통 날짜 수·개별 ETF와 SPY 결측·비율/수익률 차이·분할 영향을 각각 기록한다.
3. **충분한 독립 이력 판별**: 저장 EOD가 54종의 실제 40/377/628 유효 공통일을 충족하는지 먼저 확인한다. 원 R23 1h와 섞지 않고 **동일 가격모드의 연속 자료**로 기존 R2/R32 함수를 다시 적용할 수 있는지 판단한다. 54종 전체가 곧바로 2026-10-26 점수 유효라는 주장은 금지.
4. **나머지 9종 처리**: 기존 PC 정규 작업의 실제 ETF 목록과 EOD 종목 분류/소스 자료를 확인한 뒤에만 필요한 종목을 기존 수집 경로에 **최소 편입**한다. 9종 데이터 부재만으로 나머지 54종의 연구·검산을 중단하지 않되, 9종의 결측은 그대로 유지한다. 별도 스케줄러·중복 공급자 GET·자의적 로스터 변경 금지.
5. **R32 기존 9테마 비공개 반복 검산**: 적격 ETF만 역사 날짜별 실제 공식 발행사 AUM 가중치로 집계하고 기존 2,268건 원 결과와 날짜별 차이를 분리 표시한다. 동일 거래일·원본 SHA·권리·승인 없이 R37 D1 게시 및 공개 10개 교체 금지.
6. 후속 공개 전환은 `theme-legacy-nine-r37/current` 별도 D1 키의 실측·readback·구버전 fallback·권리 확인·사용자 별도 승인을 모두 통과한 경우에만 진행한다.

### 공식 공급자 근거

- [MarketParquet 문서](https://marketparquet.com/documentation): 일별 Parquet 자료와 주식/ETF 분할조정 가격.
- [MarketParquet 품질/방법론](https://marketparquet.com/data-quality): 원가격과 조정 가격 사이의 재현성 유의.
- [GetMarketHistory API](https://getmarkethistory.com/docs/api/reference): 시간봉 자료의 별도 출처·형식.
