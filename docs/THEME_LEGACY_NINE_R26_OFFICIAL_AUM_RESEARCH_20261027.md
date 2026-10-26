# 기존 9개 테마 R26 — 발행사 공식 AUM 확인 (4단계, 부분 진행)

- 기준: 기존 R22 승인 6단계 중 4단계. 기존 ETF 63종 후보를 변경하지 않는다.
- 검색 시작: 2026-10-27 01:10 KST, 무료 공개 발행사 웹 페이지만 이용.
- 검증 상태: **22/63종 공식 수치 확보** (최신일·과거 공식 공시일 구분). 로봇 4종 아직 확인 대기. 나머지 37종 아직 확인 전. 5단계 합산 **실행 금지 상태**.
- 통화: USD. AUM은 공식 발행사 수치이며 날짜별 역사 자산값은 아니다. 공식 사이트 수치 반올림 여부를 기록한다.

## 1. 로봇·자동화 테마 — 발행사 자료

| ETF | AUM (USD) | 기준일 | 확인 결과 | 직접 출처 |
| --- | ---: | --- | --- | --- |
| BOTZ | 약 **3,100,000,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (발행사 $3.10B 표시) | [Global X BOTZ](https://www.globalxetfs.com/funds/botz) |
| ROBT | **742,239,266** | 2026-10-23 | `OFFICIAL_EXACT` (기존 10-21의 758,835,620에서 최신 관측일로 갱신) | [First Trust ROBT 공식 펀드 요약](https://www.ftportfolios.com/Retail/Etf/EtfSummary.aspx?Ticker=ROBT) |
| RBTX | **9,596,069** | 2026-10-23 | `OFFICIAL_EXACT` | [BlackRock RBTX](https://www.blackrock.com/us/financial-professionals/products/354128/ishares-future-robotics-and-related-technologies-active-etf) |
| ROBO | — | — | `PENDING`: 발행사 사이트에서는 확인일·보유종목만 확인, AUM 값 부재 | [ROBO Global ETF](https://www.roboglobaletfs.com/robo) |
| ARKQ | — | — | `PENDING`: 공식 ETF 목록 검색에는 2026-09-30 $1,891M가 노출됐으나 상세 페이지가 동적 `--` 표시. 원자료 확인 전까지 확정값 미반영 | [ARK ETF 목록](https://www.ark-funds.com/our-etfs) |
| HUMN | — | — | `PENDING`: 발행사 펀드 페이지 `AUM` 항목이 빈칸으로 반환됨 | [Roundhill HUMN](https://www.roundhillinvestments.com/etf/humn/) |
| CBOT | — | — | `PENDING`: 발행사 펀드 페이지 확보, 공식 AUM 값은 아직 확인되지 않음 | [Corgi CBOT](https://corgiinvest.com/cbot) |

## 2. 클라우드·SaaS 테마 — 발행사 자료

| ETF | AUM (USD) | 기준일 | 확인 결과 | 직접 출처 |
| --- | ---: | --- | --- | --- |
| SKYY | **3,532,667,040** | 2026-10-23 | `OFFICIAL_EXACT` | [First Trust SKYY 공식 펀드 요약](https://www.ftportfolios.com/Retail/Etf/EtfSummary.aspx?Ticker=SKYY) |
| CLOU | 약 **428,300,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (발행사 $428.30M 표시) | [Global X CLOU](https://www.globalxetfs.com/funds/clou) |
| WCLD | 약 **342,415,760** | 2026-10-23 | `OFFICIAL_DISPLAY_PRECISION` (발행사 'Total Assets (000) $342,415.76', $10 단위 표시; 실제 완전 정수 정밀도 아님) | [WisdomTree 미국 상장 WCLD](https://www.wisdomtree.com/us/products/megatrends/wcld) |
| FCLD | 약 **144,700,000** | 2026-08-31 | `OFFICIAL_ROUNDED_OLD` (Fidelity $144.7M; 최신치 확보 전까지 과거 관측으로 유지) | [Fidelity US ETF 목록](https://institutional.fidelity.com/advisors/investment-solutions/performance/fidelity-etfs) |
| CLOD | **1,541,624** | 2026-03-31 | `OFFICIAL_EXACT_OLD` (Themes 발행사 제출 반기보고서; 2026-10 현재치 아님) | [SEC 수록 Themes CLOD 발행사 공시](https://www.sec.gov/Archives/edgar/data/1976322/000113322826008958/R2.htm) |

**시차 주의:** FCLD/CLOD는 자료가 없는 것이 아니라 확인 가능한 **공식 수치가 오래된 상태**다. 2026-10-23의 다른 ETF AUM과 시간동기된 값으로 취급하지 않으며, R32 가중 입력의 최신성 판정은 후속 확인 때 결정한다.

## 3. 추가 발행사 원문 — 다른 7개 테마에 속하는 ETF

| 테마 | ETF | AUM (USD) | 기준일 | 확인 결과 | 직접 출처 |
| --- | --- | ---: | --- | --- | --- |
| 자율주행 | DRIV | 약 **320,410,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (Global X $320.41M) | [Global X DRIV](https://www.globalxetfs.com/funds/driv) |
| 자율주행 | IDRV | **118,394,250** | 2026-10-23 | `OFFICIAL_EXACT` | [iShares IDRV](https://www.ishares.com/us/products/307332/ishares) |
| 원전·SMR | URA | 약 **4,790,000,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (Global X $4.79B) | [Global X URA](https://www.globalxetfs.com/funds/ura) |
| 방산 | SHLD | 약 **6,450,000,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (Global X $6.45B) | [Global X SHLD](https://www.globalxetfs.com/funds/shld) |
| 방산 | ITA | **11,773,379,229** | 2026-10-23 | `OFFICIAL_EXACT` | [iShares ITA](https://www.ishares.com/us/products/239502/ishares-us-aerospace-defense-etf) |
| 핀테크 | FINX | 약 **156,200,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (Global X $156.20M) | [Global X FINX](https://www.globalxetfs.com/funds/finx) |
| 사이버보안 | BUG | 약 **2,230,000,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (Global X $2.23B) | [Global X BUG](https://www.globalxetfs.com/funds/bug) |
| 사이버보안 | CIBR | **18,360,022,084** | 2026-10-23 | `OFFICIAL_EXACT` | [First Trust CIBR](https://www.ftportfolios.com/Retail/Etf/EtfSummary.aspx?Ticker=CIBR) |
| 사이버보안 | IHAK | **1,274,337,325** | 2026-10-23 | `OFFICIAL_EXACT` | [BlackRock iShares IHAK](https://www.blackrock.com/us/individual/products/307352/ishares-cybersecurity-and-tech-etf) |
| AI·반도체 | AIQ | **10,052,200,543** | 2026-10-23 | `OFFICIAL_EXACT` (Global X 전체 ETF 공식 목록 정밀금액; 개별 펀드 페이지는 $10.05B 반올림) | [Global X 미국 상장 ETF 전체 목록](https://www.globalxetfs.com/explore) |
| AI·반도체 | SOXX | **43,232,903,200** | 2026-10-23 | `OFFICIAL_EXACT` | [iShares SOXX](https://www.ishares.com/us/products/239705/ishares-phlx-semiconductor-etf) |
| 바이오·신약 | GNOM | 약 **104,970,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (Global X $104.97M) | [Global X GNOM](https://www.globalxetfs.com/funds/gnom) |
| 바이오·신약 | IBB | **10,728,806,661** | 2026-10-23 | `OFFICIAL_EXACT` | [iShares IBB](https://www.ishares.com/us/products/239699/IBB/1000) |
| 바이오·신약 | FBT | **2,976,622,106** | 2026-10-23 | `OFFICIAL_EXACT` | [First Trust FBT](https://www.ftportfolios.com/Retail/Etf/EtfSummary.aspx?Ticker=FBT) |

## 4. 운영 규칙

1. 데이터 수치가 외부 포털에 보이더라도 **발행사 자료로 확인되지 않으면 AUM을 채우지 않는다**.
2. 공식 2026-10-23 AUM과 2026-08-31·2026-03-31 과거 공시 AUM을 동일 날짜 현재 수치로 위장하지 않는다. 각 수치의 실제 기준일을 유지한다.
3. 공식 표시가 `$3.10B`처럼 반올림된 값이면 `OFFICIAL_ROUNDED`를 별도로 표기한다. 아직 세부 정확금액을 복원하지 않는다.
4. 새 API/유료 경로/자체 추정 AUM/과거 날짜별 가상 AUM을 도입하지 않는다.
5. **4단계 전체 63종 공식 자료 조사 완료 전** 이 파일을 R32 합산용 완성 입력으로 사용하지 않는다. 추가 확인 없이 R26을 공개 자료로 게시하지 않는다.

## 5. 차기 작업

- 미확인 로봇 4종의 공식 자산값 확인 및 나머지 37종 공식 발행사 페이지 순차 조사. FCLD/CLOD 신선한 공식 값 추가 확인.
- 발행사 공식 사실확인 날짜·USD 금액·원문 URL·검증 상태를 ETF별 축적.
- 4단계 전수 조사 후 5단계 R32 가중 계산기에 입력하고 252일 그림자 검증을 수행한다.
