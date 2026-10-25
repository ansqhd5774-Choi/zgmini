# 우주·위성 테마 ETF 9종 발행사 전수 조사 R7 (비공개)

- 조사일: 2026-10-25 (발행사 자료의 관측일/업데이트일은 각각 구분)
- 상태: `9_ISSUER_RESEARCHED / NASA_FIRST_PRICE_VALIDATION / FINAL_PAIR_NOT_APPROVED`
- 연구 목적: 초기 UFO+NASA **2종 지정 자체를 결론으로 취급하지 않고**, 실물 우주·위성 관련 ETF 9개를 같은 기준으로 점검한다. 실제 가격 N 검증 후 선택한다.
- 비교 기준: ①순수 우주·위성 테마 노출 ②실제 공시된 순자산(AUM) ③30일 중앙 호가 스프레드 ④실제 상장/관측 기간 ⑤ETF 구성 종목 중복 및 편중 ⑥무료 API의 실제 원봉·저장·파생 표시 권리.
- 비교 자료가 없는 셀은 결측. 임의 점수·순위 가중치·예상 수익률을 만들지 않는다.

| ETF | 운용사 / 성격 | 발행사 수치 (각자 관측일) | 비교 판단 | 현재 조치 |
| --- | --- | --- | --- | --- |
| **NASA** | Tema / 우주 경제 투자 | 2026-10-22 순자산 **$950.55M**, 30일 중앙 스프레드 **0.05%**, 약 38종 | 신생 전문 ETF 중 규모·유동성 우위. SpaceX 대규모 편중 확인 필요 | **누락 실가격 1순위 실측** |
| **UFO** | Procure / 우주산업 지수 | 2026-10-22 순자산 **$466.59M**, 스프레드 **0.23%**, 2019년 출시 | 상대적으로 긴 이력과 기존 PC 실제 유효 656일 확보 | **기존 PC 원본 그대로 재사용** |
| WARP | VanEck / 우주 전문 지수 | 2026-10-23 순자산 **$37.40M**, 약 22종 | 순도 높음. NASA와 SpaceX 등 구성 중복 비교 필요 | NASA 검증 실패 시 우선 대안 |
| ORBX | Global X / 우주 관련 매출 기준 | 2026-10-21 순자산 **$36.69M**, 스프레드 **0.36%** | 테마 순도 높은 후보, NASA보다 규모·유동성 열세 | 대안 |
| MARS | Roundhill / 우주 혁신 액티브 | 발행사 약 **$41.83M** (조회 당시) | 운용재량/구성 편중·스프레드 추가 비교 | 대안 |
| ARKX | ARK / 우주·방산 혁신 | 발행사 약 **$700M** (조회 당시) | 방산 노출 확대로 우주 순도 떨어짐; 기존 방산 테마 중복 | 보조 후보 |
| ROKT | State Street / 우주 및 심해 | 2026-10-22 순자산 **$148.41M**, 2018년 출시 | 이력 장점, 심해 탐사까지 포함되어 순수 우주 테마 약화 | 보조 후보 |
| DIPR | Corgi / 우주·위성통신 특화 액티브 | 2026-10-22 순자산 **$1.31M**, 2026-05 출시 | 위성 직접성 장점, 거래/규모 위험과 짧은 이력 | 관찰 |
| WSPC | WisdomTree / 우주경제 | 2026-10-23 순자산 **$1.20M**, 스프레드 **0.58%**, 2026-07 출시 | 규모·호가 비용과 짧은 이력 불리 | 관찰 |

## 1. 후보 선택은 잠정적이다

1. **NASA는 ‘매입 추천’이 아니라, NASA의 빠진 진짜 시간봉을 가장 먼저 수집해 평가할 후보**다. 큰 AUM 및 낮은 스프레드는 가격 자료의 유효 N, 원봉 연속성, SPY와의 날짜 정합성, 보유 중복을 입증하지 않는다.
2. **UFO는 이미 실측된 656 유효 세션(2026-10-23 기준)을 보존한다.** SPY도 별도 데이터센터 전력 테마의 사용자 PC 실물 1시간봉 11,295행 및 SHA 검증으로 재사용한다. UFO/SPY **Provider 재호출 금지**.
3. UFO+NASA는 **우선 조사 조합**일 뿐 확정 2종이 아니다. 9개 후보 전수조사와 정량 근거 없이 쌍을 먼저 고정했던 절차를 바로잡는다. 실제 NASA 데이터가 불충분하거나 구성 중복/유동성 조건에 문제가 있으면 WARP·ORBX·MARS 등을 다시 비교한다.
4. NASA 발행사 2026-10-23 구성 자료에서 **SpaceX 약 27.98%**로 집중도가 높다. NASA와 WARP 등 우주 ETF 간 실질 중복의 정량 점검이 필요하다. 개인 종목 가격을 ETF 점수에 섞지는 않는다.
5. 9개 ETF 후보가 있다는 이유로 9개 모두 **원봉 다운로드**하지 않는다. 공시 비교에서 적합성 선별 → 현행 데이터 재사용 → 선택 후보의 부족 원봉만 수집 → 실제 일별 N/중복 검사 → 최종 편입 검토의 순서다.

## 2. R7 NASA 전용 비공개 수집 경로

- 실행은 사용자 Windows PC CMD에서만 `theme-space-satellite-r7-nasa-only.cmd`. Cloudflare, GitHub Actions, D1, scheduler, DB, 기존 9개 테마는 변경하지 않는다.
- 부족한 **NASA 1종**, 기간 `2026-03-30`~`2026-10-23`, GetMarketHistory 1h API, 1회 사용자 실행 최대 4 GET, 명시적 `--collect` 없으면 외부 요청 없음.
- 기존 `E:/ZGmini/data/themes/space-satellite/raw-manifest.json`, UFO/ROKT/ARKX 등은 보존. 같은 위치에 NASA 원문 + SHA/관측일 metadata만 추가. R7 독립 체크포인트를 사용하며 실패(네트워크·HTTP 402 포함) 뒤의 암묵적 재시도 금지. 이미 NASA 원문이 발견되면 자동 중단하고 검토부터 한다.
- 결과 로그는 **CMD 파일 바로 옆** `SPACE_SATELLITE_R7_NASA_RESULT.txt`. E:에는 원가격 및 운영용 manifest/독립 체크포인트만 저장.
- 수집 완료 로그는 **자료 저장 단계만** 증명한다. 마지막 뉴욕 15시(조기 폐장 12시) 유효 봉, 원가격 중복/누락, SPY 공통 날짜 N, 40/377/628 및 실물 점수/252표시, 데이터 권리 확인은 **별도 다음 게이트**.
- 저장되는 값은 `RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE`. 결측·상장 전 값의 생성/보간 금지, 과거 점수를 현재 잠정치로 대체 금지.
- Provider 상품 안내 및 약관상 공개 샘플만으로 전체 기간 무료 수집·라이선스를 **보장할 수 없음**. 실제 `402`/제한은 STOP. 원가격 공개·제3자 재배포 금지, 파생 공개는 해당 사용 경로의 권리를 확인한 뒤 승인.

## 3. 발행사·API 원자료

- NASA: https://temaetfs.com/nasa
- UFO: https://www.procureetfs.com/ufo/
- WARP: https://www.vaneck.com/us/en/investments/space-etf-warp/overview/
- ORBX: https://www.globalxetfs.com/funds/orbx/
- MARS: https://www.roundhillinvestments.com/etf/mars/
- ARKX: https://www.ark-funds.com/funds/ARKX
- ROKT: https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-kensho-final-frontiers-etf-rokt
- DIPR: https://corgiinvest.com/dipr · Cboe 상장 공시 https://www.cboe.com/us/equities/listings/listed_products/symbols/DIPR · SEC 투자설명서 https://www.sec.gov/Archives/edgar/data/2078265/000207826526000147/Corgi_497K_DIPR.htm
- WSPC: https://www.wisdomtree.com/us/products/megatrends/wspc
- GetMarketHistory 약관: https://getmarkethistory.com/docs/terms
- 데이터 문서: https://getmarkethistory.com/docs/api/reference
- 배경 보도: Reuters, *Space ETFs booming in anticipation of SpaceX IPO*, 2026-05-22, https://www.reuters.com/legal/transactional/space-etfs-booming-anticipation-spacex-ipo-2026-05-22/

## 4. 사용자 PC R7 NASA 수집 성공 증거 — 2026-10-25

- 제출 로그: `SPACE_SATELLITE_R7_NASA_RESULT.txt`.
- 실제 사용자 실행 결과: `status=PRIVATE_NASA_RAW_COLLECTION_COMPLETE`, `providerCalls=1`, `rawFilesStored=1`, `pages=1`, `complete=true`.
- 같은 로그에서 `publicWrites=0`, `d1Writes=0`, `schedulerWrites=0`. 결과 파일에 실제 행·가격·유효 거래일 수·manifest SHA는 **없으므로** 임의로 채우지 않는다.
- 원자료는 PC의 우주 테마 raw manifest에 추가되었다는 collector 결과. 채팅 측에서 PC 파일의 해시·기간·거래일 N을 직접 읽어 검증한 것은 **아니다**.
- 기존 UFO 656일, 외부 데이터센터·전력의 SPY 11,295 1h 바는 별도 이전 PC 실측 증거에 따라 재사용한다. R6 NASA+SPY CMD 재실행은 여전히 금지.

### 다음 승인 전 검사 R8 — 저장 데이터만 읽기

- `theme-space-satellite-r8-real-audit.mjs`는 기존 신규 테마 R2 감사기를 `sharedSpyThemeId='data-center-power'`로 실행한다.
- 지정된 6개 JS 파일의 SHA256을 CMD에서 검증한 뒤 실제 우주 NASA/UFO와 데이터센터 SPY manifest/raw의 체크섬을 읽는다. **Provider GET 0**, 원자료/DB·D1·스케줄러 변경 0.
- 보고서: NASA/UFO/SPY 각 원본 파일·실제 세션·최종 관측일, SPY 공유 출처 SHA, 쌍의 252일 표본·공통 세션·실제 점수/가중치(가능한 경우에만), 권리/최종 승인 false.
- 보고서의 private score가 존재하더라도 **최종 NASA 편입 확정·운영 산식 승인·파생 지표 게시 권리 확보**를 뜻하지 않는다. NASA 편중·UFO와의 보유 중복을 정량 검토하고 사용자가 최종 조합을 승인해야 한다.

**승인/운영 상태:** `NINE_RESEARCHED / PC_R7_NASA_RAW_ONE_FILE_STORED / PC_R8_ACTUAL_N_AND_PAIR_SCORE_PENDING / ETF_PAIR_NOT_FINAL / RIGHTS_NOT_APPROVED / NO_D1_NO_DEPLOY`.
