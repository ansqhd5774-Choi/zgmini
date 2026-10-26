# 기존 9개 테마 R26 — 발행사 공식 AUM 확인 (4단계, 부분 진행)

- 기준: 기존 R22 승인 6단계 중 4단계. 기존 ETF 63종 후보를 변경하지 않는다.
- 검색 시작: 2026-10-27 01:10 KST, 무료 공개 발행사 웹 페이지만 이용.
- 검증 상태: **51/63종 공식 수치 확보** (최신일·과거 공식 공시일 구분; 검색색인 원문만 확인된 기록은 별도 표시). 미확인 12종 조사 중. 5단계 합산 **실행 금지 상태**.
- 통화: USD. AUM은 공식 발행사 수치이며 날짜별 역사 자산값은 아니다. 공식 사이트 수치 반올림 여부를 기록한다.

## 1. 로봇·자동화 테마 — 발행사 자료

| ETF | AUM (USD) | 기준일 | 확인 결과 | 직접 출처 |
| --- | ---: | --- | --- | --- |
| BOTZ | 약 **3,100,000,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (발행사 $3.10B 표시) | [Global X BOTZ](https://www.globalxetfs.com/funds/botz) |
| ROBT | **742,239,266** | 2026-10-23 | `OFFICIAL_EXACT` (기존 10-21의 758,835,620에서 최신 관측일로 갱신) | [First Trust ROBT 공식 펀드 요약](https://www.ftportfolios.com/Retail/Etf/EtfSummary.aspx?Ticker=ROBT) |
| RBTX | **9,596,069** | 2026-10-23 | `OFFICIAL_EXACT` | [BlackRock RBTX](https://www.blackrock.com/us/financial-professionals/products/354128/ishares-future-robotics-and-related-technologies-active-etf) |
| ROBO | **2,090,410,802** | 2026-10-05 | `OFFICIAL_SEARCH_EXCERPT_OLD` (발행사 페이지 검색색인에는 Net Assets 금액 명시, 직접 로딩한 페이지에서는 숫자 영역 비어 있음) | [ROBO Global ETF](https://www.roboglobaletfs.com/robo) |
| ARKQ | 약 **1,891,000,000** | 2026-09-30 | `OFFICIAL_ROUNDED_SEARCH_EXCERPT_OLD` (발행사 ETF 전체 목록 검색색인 'Net Assets $1,891 Million'; 직접 페이지는 동적 표 미로드) | [ARK 미국 ETF 전체 목록](https://www.ark-funds.com/our-etfs) |
| HUMN | **82,970,715** | 2026-06-30 | `OFFICIAL_EXACT_OLD` (Roundhill 발행사 제출 반기보고서, 최신 웹 AUM은 동적 빈칸) | [SEC 수록 Roundhill HUMN 발행사 공시](https://www.sec.gov/Archives/edgar/data/1976517/000113322826012187/R2.htm) |
| CBOT | 약 **1,470,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (Corgi $1.47M) | [Corgi CBOT](https://corgiinvest.com/cbot) |

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

## 4. 추가 발행사 정밀 확인 — State Street·VanEck·Sprott·Corgi·DWS

| 테마 | ETF | AUM (USD) | 기준일 | 확인 결과 | 직접 출처 |
| --- | --- | ---: | --- | --- | --- |
| 방산 | XAR | 약 **4,858,630,000** | 2026-10-23 | `OFFICIAL_DISPLAY_PRECISION` (State Street $4,858.63M) | [State Street XAR 미국 상장](https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-aerospace-defense-etf-xar) |
| 방산 | WR | 약 **980,000** | 2026-10-21 | `OFFICIAL_ROUNDED` (Corgi $0.98M) | [Corgi 미국 상장 WR](https://corgiinvest.com/wr) |
| 원전·SMR | NLR | 약 **3,050,000,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (VanEck 미국 상장 $3.05B) | [VanEck NLR 미국 상장](https://www.vaneck.com/us/en/investments/uranium-nuclear-energy-etf-nlr/overview) |
| 원전·SMR | URNM | **1,640,006,321.99** | 2026-10-23 | `OFFICIAL_EXACT_CENTS` (Sprott 'ETF Fund Details') | [Sprott URNM](https://sprottetfs.com/urnm-sprott-uranium-miners-etf/) |
| 원전·SMR | URNJ | **280,069,013.94** | 2026-10-23 | `OFFICIAL_EXACT_CENTS` (Sprott 'ETF Fund Details') | [Sprott URNJ](https://sprottetfs.com/urnj-sprott-junior-uranium-miners-etf/) |
| 사이버보안 | PSWD | **6,483,031** | 2026-10-23 | `OFFICIAL_EXACT` (Xtrackers USD net assets) | [DWS 미국 상장 PSWD](https://etf.dws.com/en-us/PSWD-cybersecurity-select-equity-etf/) |
| 사이버보안 | XA | 약 **8,250,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (Corgi $8.25M) | [Corgi 미국 상장 XA](https://corgiinvest.com/xa) |
| AI·반도체 | XSD | 약 **2,395,560,000** | 2026-10-23 | `OFFICIAL_DISPLAY_PRECISION` (State Street $2,395.56M) | [State Street XSD 미국 상장](https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-semiconductor-etf-xsd) |
| AI·반도체 | SMH | 약 **66,600,000,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (VanEck 미국 상장 $66.60B) | [VanEck SMH 미국 상장](https://www.vaneck.com/us/en/investments/semiconductor-etf-smh/overview) |
| 바이오·신약 | XBI | 약 **10,356,730,000** | 2026-10-23 | `OFFICIAL_DISPLAY_PRECISION` (State Street $10,356.73M) | [State Street XBI 미국 상장](https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-biotech-etf-xbi) |
| 바이오·신약 | BBH | 약 **501,960,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (VanEck 미국 상장 $501.96M) | [VanEck BBH 미국 상장](https://www.vaneck.com/us/en/investments/biotech-etf-bbh/overview/) |

**동일 심볼 주의:** 미국 상장 `NATO`(Themes)는 유럽 상장 HANetf `NATO`와 다른 펀드이고, 미국 상장 `URAN`(Themes)은 호주 상장 VanEck `URAN`과 다른 펀드다. 다른 거래소의 AUM을 혼용하지 않는다.

## 5. 공식 AUM 추가 확보 — ARK·KraneShares·Range·Roundhill·WisdomTree·iShares·Corgi·Global X·Themes

| 테마 | ETF | AUM (USD) | 기준일 | 확인 결과 | 직접 출처 |
| --- | --- | ---: | --- | --- | --- |
| 자율주행 | CABZ | **3,790,199** | 2026-06-30 | `OFFICIAL_EXACT_OLD` (Roundhill 반기보고) | [SEC 수록 Roundhill CABZ 공시](https://www.sec.gov/Archives/edgar/data/1976517/000113322826012187/R2.htm) |
| 자율주행 | KARS | **63,574,768** | 2026-10-23 | `OFFICIAL_EXACT_SEARCH_EXCERPT` (KraneShares ETF 전체 목록의 Net Assets; 동적 표 미로드) | [KraneShares 미국 ETF 전체 목록](https://kraneshares.com/etf/) |
| 원전·SMR | NUKZ | **약 668,000,000** | 2026-09-30 | `OFFICIAL_ROUNDED_OLD` (Range 발행사 $668MM) | [Range NUKZ 전용 소개](https://www.nukz.rangeetfs.com/) |
| 핀테크 | ARKF | **약 830,900,000** | 2026-09-30 | `OFFICIAL_ROUNDED_SEARCH_EXCERPT_OLD` (ARK ETF 목록 Net Assets $830.9M) | [ARK 미국 ETF 전체 목록](https://www.ark-funds.com/our-etfs) |
| 핀테크 | BPAY | **9,251,801** | 2026-01-31 | `OFFICIAL_EXACT_OLD` (iShares 발행사 제출 반기보고) | [SEC 수록 iShares BPAY 공시](https://www.sec.gov/Archives/edgar/data/1761055/000119312526144976/R2.htm) |
| 핀테크 | KYC | **약 398,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (Corgi $398K) | [Corgi KYC](https://corgiinvest.com/kyc) |
| 핀테크 | LATR | **약 947,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (Corgi $947K) | [Corgi LATR](https://corgiinvest.com/latr) |
| 사이버보안 | WCBR | **약 227,066,750** | 2026-10-23 | `OFFICIAL_DISPLAY_PRECISION` (WisdomTree Total Assets (000) $227,066.75) | [WisdomTree WCBR](https://www.wisdomtree.com/us/products/megatrends/wcbr) |
| 사이버보안 | SPAM | **2,296,525** | 2026-03-31 | `OFFICIAL_EXACT_OLD` (Themes 발행사 제출 반기보고; 현 시점 금액 아님) | [SEC 수록 Themes SPAM 공시](https://www.sec.gov/Archives/edgar/data/1976322/000113322826008958/R2.htm) |
| AI·반도체 | ARTY | **3,677,535,964** | 2026-09-30 | `OFFICIAL_EXACT_OLD` (iShares 미국 상장 ETF 순자산 목록) | [iShares ETF Investments List](https://www.ishares.com/us/products/etf-investments) |
| AI·반도체 | EUV | **약 253,800,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (Corgi $253.80M) | [Corgi EUV](https://corgiinvest.com/euv) |
| AI·반도체 | LLMA | **약 2,500,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (Global X $2.50M) | [Global X LLMA](https://www.globalxetfs.com/funds/llma) |
| 바이오·신약 | ARKG | **약 2,219,000,000** | 2026-09-30 | `OFFICIAL_ROUNDED_SEARCH_EXCERPT_OLD` (ARK ETF 목록 Net Assets $2,219M) | [ARK 미국 ETF 전체 목록](https://www.ark-funds.com/our-etfs) |
| 바이오·신약 | GNMX | **약 1,280,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (Corgi $1.28M) | [Corgi GNMX](https://corgiinvest.com/gnmx) |

**검증 보수성:** 검색엔진이 발행사 공식 표에서 읽어온 AUM이라도 직접 HTML 렌더링이 비어 있으면 `OFFICIAL_*_SEARCH_EXCERPT`로 표기한다. 특히 2026-03·06·09 AUM은 10월 값과 서로 같은 날짜가 아니다. `DRAM`은 반기공시 값에 비정상적으로 큰 수치가 노출되어 운용사 교차검증 전 확정값으로 편입하지 않는다.

## 6. 운영 규칙

1. 데이터 수치가 외부 포털에 보이더라도 **발행사 자료로 확인되지 않으면 AUM을 채우지 않는다**.
2. 공식 2026-10-23 AUM과 2026-08-31·2026-03-31 과거 공시 AUM을 동일 날짜 현재 수치로 위장하지 않는다. 각 수치의 실제 기준일을 유지한다.
3. 공식 표시가 `$3.10B`처럼 반올림된 값이면 `OFFICIAL_ROUNDED`를 별도로 표기한다. 아직 세부 정확금액을 복원하지 않는다.
4. 새 API/유료 경로/자체 추정 AUM/과거 날짜별 가상 AUM을 도입하지 않는다.
5. **4단계 전체 63종 공식 자료 조사 완료 전** 이 파일을 R32 합산용 완성 입력으로 사용하지 않는다. 추가 확인 없이 R26을 공개 자료로 게시하지 않는다.

## 7. 차기 작업

- 미확인 12종(`HAIL`, `URAN`, `PPA`, `NATO`, `IPAY`, `HACK`, `SOXQ`, `CHAT`, `PSI`, `DRAM`, `PBE`, `SBIO`) 공식 발행사 페이지·ETF별 공시 확인. FCLD/CLOD 및 일부 과거 확인치의 최신 AUM 추가 조사.
- 발행사 공식 사실확인 날짜·USD 금액·원문 URL·검증 상태를 ETF별 축적.
- 4단계 전수 조사 후 5단계 R32 가중 계산기에 입력하고 252일 그림자 검증을 수행한다.
