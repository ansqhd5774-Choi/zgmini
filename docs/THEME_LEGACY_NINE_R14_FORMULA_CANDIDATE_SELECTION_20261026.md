# 기존 9개 테마 산식 편입 후보 1차 선별 R14 (2026-10-26)
적용 브랜치: research/theme-nine-r2-shadow-20261026
데이터 원본: config/theme-nine-r13-formula-candidate-prescreen.json
선정 단계: **ISSUER_THEME_FIT_PRE_SCREEN_ONLY, NOT_FORMULA_ADMITTED**

## 0. 최상위 사용자 기준
**ETF 편입 개수 목표/하한/상한 전부 없음.** 공식 발행사 전략과 실제 holdings의 테마 직접성, 적법한 무료 가격 공급, 원가격 자동수집, AUM·252일 이력 검증을 통과한 **모든 ETF**가 편입 대상이다. 편입 후보 수는 확인된 결과일 뿐 KPI가 아니며 어떤 수량 도달도 탐색 종료 조건이 아니다.

`우선 편입 검증 후보`(CORE_FIT_CANDIDATE)는 발행사 전략이 테마/가치사슬에 부합해 다음 실증으로 우선 진행하는 연구 판단이다. **테마 적합성 PASS/가격·이력 PASS/권리 PASS/AUM PASS/운영 PASS가 아니다.**
`범위 재검토 후보`(SCOPE_REVIEW)는 관련은 있지만 광범위한 업종·인접 테마가 섞여 실제 구성 비중을 확인해야 한다. 근거 확보 시 우선 그룹으로 전환 가능하고, 개수 조절 목적의 자동 제외는 금지한다.

## 1. 최초 편입 검증 로스터 (모든 후보의 실제 기술 Gate는 아직 PENDING)
| 테마 | 우선 편입 검증 후보 | 범위 재검토 후보 |
| --- | --- | --- |
| 로봇·자동화 | BOTZ, ROBO, ROBT, HUMN, RBTX, CBOT | ARKQ |
| 클라우드·SaaS | SKYY, CLOU, WCLD, FCLD | CLOD |
| 자율주행 | DRIV, IDRV, CABZ | BOTZ, HAIL, KARS |
| 원전·SMR | NLR, URA, NUKZ, URAN | URNM, URNJ |
| 방산 | ITA, SHLD, XAR, PPA, NATO | WR |
| 핀테크 | FINX, IPAY, BPAY, KYC, LATR | ARKF |
| 사이버보안 | CIBR, BUG, HACK, IHAK, WCBR, SPAM, PSWD, XA | — |
| AI·반도체 | SMH, SOXX, SOXQ, XSD, ARTY, AIQ, CHAT, PSI, EUV, DRAM, LLMA | — |
| 바이오·신약 | IBB, XBI, BBH, PBE, GNOM, ARKG, SBIO, FBT, GNMX | — |

- 이전 R11의 신규 37개 외에 이 단계에서 발행사 상품이 추가 확인된 9개: **RBTX, CBOT, WR, LATR, XA, EUV, DRAM, LLMA, GNMX**.
- 현재 등록 위치: 기존 편입 18 + 신규 추가 46 = 64 테마별 후보 위치 / **중복 티커 제외 63종**(BOTZ가 두 테마에 존재). 한 테마마다 적합성을 별도 판단.
- 연구용 CORE_FIT_CANDIDATE 위치 55, SCOPE_REVIEW 위치 9. 이 숫자는 통과 수/목표가 아니며, **최종 산식 추가 승인 완료 ETF 수는 0**.
- 가격 공급원과 이용권/공식 일자별 AUM/원가격·manifest SHA/실제 거래일 관측 전 **미검증**으로 유지한다.

## 2. 정량 검증이 필요한 범위 혼합
| 테마 | 별도 검토 ETF | 결정이 필요한 사실 |
| --- | --- | --- |
| 로봇·자동화 | ARKQ | 운용사에 따르면 자동화·제조와 함께 에너지·배터리·운송 등 기술혁신 분야를 포함한다. 로봇 직접 노출을 holdings/매출분류로 수치화하기 전에는 편입 미확정. |
| 클라우드·SaaS | CLOD | 데이터·디지털 보안·전자상거래 인프라를 포함하므로 해당 클라우드 부가가치 비율을 확인한다. |
| 자율주행 | BOTZ, HAIL, KARS | BOTZ는 로봇/AI, HAIL은 스마트 모빌리티, KARS는 EV 생산/소재/배터리 등이 혼합된다. 자율주행 주력 보유 비중 미확인. 기존 BOTZ도 자동 통과시키지 않는다. |
| 원전·SMR | URNM, URNJ | 우라늄 광업 및 채굴기업 편중. 핵연료 공급망으로는 관련성이 있지만 원전발전·SMR 직접 기술 노출도 및 기존 URA와 중복도 비교. |
| 방산 | WR | 군수산업 외 석유·가스 등 에너지 안보 기업을 포함한다. 방산 매출과 비방산 비중을 정량 확인. |
| 핀테크 | ARKF | ARKF는 2025-11-23 투자정책을 블록체인+핀테크로 변경. 디지털 금융 기술과 블록체인 보유분을 구분한다. |


- 우선 그룹에서도 편중/중복·시점별 보유 변경을 검사한다. **우선 표기를 최종 편입 허가로 취급 금지**.
- 예: AI·반도체 테마의 SMH·SOXX·SOXQ 등은 지수 구성이 유사할 수 있고 AIQ·ARTY·CHAT·LLMA는 SW·서비스도 포함할 수 있다. 명칭으로 자동 50:50 또는 임의 균형 조절하지 않는다. 실제 공식 AUM 규칙과 중복 보고 후 비공개 산식을 검증한다.
- 원전 URA는 광업에 치우칠 수 있어도 원전 핵연료 가치사슬이라는 직접 목적 때문에 1차 우선으로 유지했으나 실 holdings·중복·규모 검사에는 동일 기준 적용.
- 핀테크의 LATR은 BNPL 한 산업군, 사이버보안의 XA는 AI 보안의 세부 산업군이다. 단일 세부 업종이라는 이유만으로 배제하지 않는다.

## 3. 이번 추가 탐색의 공식 발행사
| ETF | 발행사 페이지 기준 상장일/상태 | 공식 URL |
| --- | --- | --- |
| RBTX | 2026-10-20 | https://www.ishares.com/us/products/354128/ishares-future-robotics-and-related-technologies-active-etf |
| CBOT | 2026-05-05 | https://corgiinvest.com/cbot |
| WR | 해당 문서에서 상장시점 재검증 필요 | https://corgiinvest.com/wr |
| LATR | 2026-05-05 | https://corgiinvest.com/latr |
| XA | 상장시점 재검증 필요 | https://corgiinvest.com/xa |
| EUV | 2026-05-05 | https://corgiinvest.com/euv |
| DRAM | 2026-04-02 | https://www.roundhillinvestments.com/etf/dram/ |
| LLMA | 2026-09-30 | https://www.globalxetfs.com/funds/llma |
| GNMX | 2026-05-05 | https://corgiinvest.com/gnmx |

- **RBTX 2026-10-20 / LLMA 2026-09-30 상장**: 2026-10-26 현재 실관측 40거래일에 도달할 수 없다. 테마 관련 후보로 보존하되 유효 R2 개별 점수는 실제 40세션까지 `null`. 과거 점수를 가상 채우거나 628일 미만을 이유로 후보에서 영구 제거하지 않는다.
- DRAM(메모리주식 ETF)과 레버리지 상품 RAM(2X Long DRAM Daily Target)을 혼동하지 않는다. 이 목록은 DRAM이며, 별도 레버리지 상품을 무단 편입하지 않는다.
- 조회일 2026-10-26 기준 과거/현재 공식 상품과 미래 회계일 팩트시트·캡처를 구별한다.

## 4. 실제 공식 산식 후보 진입 Gate (ETF마다 필수)
1. **Theme gate**: 발행사 투자목적·공식 holdings 파일 기준일·상장/청산/전략 변경, 투자 대상의 로봇/클라우드/자율주행 등 테마 직접 매출·생태계 비중을 객관적으로 기록한다. ETF 간 중복은 수치로 명시한다.
2. **Rights gate**: 무료 이용에 상업적 내부 저장, 가공 점수/차트 공개가 허용되는 가격원. 원시 OHLCV 공개 금지·수신한 원자료의 내부 보존 조건을 따르고 허용을 추정하지 않는다.
3. **Raw price gate**: 승인된 사용자 PC Windows CMD에서 허용 공급원별 **실제 ETF 가격 + SPY 동일 거래일**, 분할·배당/가격 모드, 최신 일자·지연, 40+실제 세션, 252일 공통 타임라인의 정상 수집 확인. SHA256과 raw manifest에 Evidence 기록. 출처가 없으면 값은 null.
4. **Dated AUM gate**: 발행사 공식 순자산·기준일·통화 확인 후 유효한 자산별 상대 가중 계산. 단일 현재 AUM 값을 과거 실제 AUM이라고 허위 기록 금지.
5. **Adaptive/R32 gate**: 날짜별 적격 집합 A(t)를 이용. 3종 이상 공식 AUM 정규화, 2종/1종은 승인된 R32 분기, 0종 null. 252D 고정. T40/R20/V40, 40/377/628 적응형 구간 계약을 위반하지 않는다.
6. **Shadow then approval**: 기존 2 ETF 공개 점수 대비 비공개 독립 산식 252D, 최신/1M/3M/1Y·결측·가중 편중을 검산한다. 그 후 사용자의 **별도 승인 전 main·D1·공개 API·스케줄러 변경 금지**.

## 5. 출처 추적
- 새 9개 및 앞서 확보한 37개 모두 R13 JSON `officialProductSource`에 발행사 URL과 1차 판단을 티커별 기록했다.
- 일부 공식 전략의 직접 증거:
  * BOTZ: https://www.globalxetfs.com/funds/botz/
  * ARKQ: https://www.ark-funds.com/funds/arkq
  * ARKF (2025 전략 개편): https://www.ark-funds.com/funds/arkf
  * KARS: https://kraneshares.com/etf/kars/
  * NLR: https://www.vaneck.com/us/en/investments/uranium-nuclear-energy-etf-nlr/
  * URNM/URNJ: https://sprottetfs.com/urnm-sprott-uranium-miners-etf/ ; https://sprottetfs.com/urnj-sprott-junior-uranium-miners-etf/
  * WR (방산+에너지): https://corgiinvest.com/wr
  * Market data rights: docs/THEME_LEGACY_NINE_R12_MARKETDATA_RIGHTS_GATES_20261026.md
