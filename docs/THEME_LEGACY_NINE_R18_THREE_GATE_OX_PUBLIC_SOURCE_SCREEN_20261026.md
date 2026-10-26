# 기존 9개 테마 ETF 3중 O/X 공개자료 판정 R18 (2026-10-26)

- 저장소/브랜치: `ansqhd5774-Choi/zgmini` / `research/theme-nine-r2-shadow-20261026`
- 범위: **공식 웹문서로 공개 여부·가능성 판단만 수행**. 구성종목/시세 실물 다운로드, API 데이터 수집, 로컬 CMD·PC writer 실행 **없음**.
- 운영: 현재 main·공개 점수·가중치·산식·D1·Cloudflare·스케줄러 **변경 없음**.
- 기존 편입 18개 위치도 자동 합격이 아님. 신규 후보 상한·하한 없음.

## 1. 현재 결과(63개 고유 ETF, 64개 테마 위치)

| 검사 기준 | O | X | ? (미확인) |
| --- | ---: | ---: | ---: |
| ① 발행사가 전체 구성종목과 비중을 공개했는가 | **56** | 0 | 7 |
| ② 무료로 지속 수집 및 상업 저장·가공 공개 가능한가 | 0 | 0 | **63** |
| ③ 실제 법적 운용사가 C등급 이상인가 | 0 | 0 | **63** |

**'?'는 X가 아니다.** 불리한 추정이나 자료 누락으로 ETF를 탈락시키지 않는다. 단, 3개 O가 확인되기 전까지 신규 산식 편입도 승인되지 않는다. 현재 3중 AND 확정 편입 = **0개**, 확정 탈락 = **0개**.

### O/X 정의

- **① O**: 발행사의 최신 상품 자료에서 보유종목 전체 조회, 보유종목 상세표 또는 전체 CSV/XLS 공개 경로 확인. **다운로드 성공이나 비중 합계 검산을 요구하지 않는다.**
- **② O**: 승인된 무료 제공처가 해당 ETF의 필요한 실제 시세를 제공하고, 사이트의 상업적 **내부 저장·가공 점수 공개**가 약관상 허용된다는 명확한 근거가 있음. 실제 수집 실행 없이 문서로 확인한다. 웹에 차트가 있는 것만으로는 O가 아니다.
- **③ O**: 펀드의 실제 법적 운용사가 확인되고 C등급 이상 심사의 등록·규제 이력·공시·운영안정성 근거가 충족됨. SEC IAPD 검색 결과만으로 C 확정 불가.
- **X**는 공시 부재, 권리 금지, 실제 등록제재상 부적격 등 **분명한 부정 근거가 확인된 경우만** 기입한다.

## 2. 테마별 판정 현황

| 테마 | 기존 ETF | 후보 위치 | ① O 위치 | ① ? 위치 | ② O | ③ O |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 로봇·자동화 | BOTZ, ROBO | 7 | 7 | 0 | 0 | 0 |
| 클라우드·SaaS | SKYY, CLOU | 5 | 3 | 2 | 0 | 0 |
| 자율주행 | DRIV, BOTZ | 6 | 6 | 0 | 0 | 0 |
| 원전·SMR | NLR, URA | 6 | 5 | 1 | 0 | 0 |
| 방산 | ITA, SHLD | 6 | 5 | 1 | 0 | 0 |
| 핀테크 | FINX, ARKF | 6 | 6 | 0 | 0 | 0 |
| 사이버보안 | CIBR, BUG | 8 | 6 | 2 | 0 | 0 |
| AI·반도체 | SMH, SOXX | 11 | 11 | 0 | 0 | 0 |
| 바이오·신약 | IBB, XBI | 9 | 8 | 1 | 0 | 0 |
| **합계(위치)** | 18개 기존 위치 | **64** | **57** | **7** | **0** | **0** |

BOTZ는 로봇·자동화와 자율주행에 중복되므로 전체 63개 고유 ETF 기준 ① O는 **56개**다.

## 3. ETF별 판정표

표의 공식 링크는 해당 발행사의 상품 공개자료다. IAPD 기업 매칭은 R16에 따로 보관하며 ③의 최종 등급 증명은 아니다.

### 로봇·자동화

| ETF | ① 구성공개 | ② 수집·권리 | ③ C등급↑ | ① 공식 근거 |
| --- | :---: | :---: | :---: | --- |
| [BOTZ (기존)](https://www.globalxetfs.com/funds/botz/) | **O** | **?** | **?** | Holdings·Download Full CSV |
| [ROBO (기존)](https://www.roboglobaletfs.com/robo) | **O** | **?** | **?** | View All·Download As CSV |
| [ROBT](https://www.ftportfolios.com/Retail/Etf/EtfSummary.aspx?Ticker=ROBT) | **O** | **?** | **?** | 전체 보유종목 표·Export to Excel |
| [ARKQ](https://www.ark-funds.com/funds/arkq) | **O** | **?** | **?** | Daily holdings PDF·CSV |
| [HUMN](https://www.roundhillinvestments.com/etf/humn/) | **O** | **?** | **?** | View All·Download CSV/PDF |
| [RBTX](https://www.ishares.com/us/products/354128/ishares-future-robotics-and-related-technologies-active-etf) | **O** | **?** | **?** | Holdings 전체표·CSV |
| [CBOT](https://corgiinvest.com/cbot) | **O** | **?** | **?** | All Holdings·Download Holdings |

### 클라우드·SaaS

| ETF | ① 구성공개 | ② 수집·권리 | ③ C등급↑ | ① 공식 근거 |
| --- | :---: | :---: | :---: | --- |
| [SKYY (기존)](https://www.ftportfolios.com/Retail/Etf/EtfSummary.aspx?Ticker=SKYY) | **O** | **?** | **?** | 전체 보유종목 표·Export to Excel |
| [CLOU (기존)](https://www.globalxetfs.com/funds/clou) | **O** | **?** | **?** | Holdings·Download Full CSV |
| [WCLD](https://www.wisdomtree.com/us/products/megatrends/wcld) | **O** | **?** | **?** | View all holdings |
| [FCLD](https://institutional.fidelity.com/advisors/investment-solutions/performance/fidelity-etfs) | **?** | **?** | **?** | Fidelity가 공개한 Basket Holdings는 실제 펀드 전체 자산과 동일하다는 보장 없음. |
| [CLOD](https://themesetfs.com/etfs/clod) | **?** | **?** | **?** | 발행사 상품 페이지 403, 전체 현행 구성종목 목록 확인 불가. |

### 자율주행

| ETF | ① 구성공개 | ② 수집·권리 | ③ C등급↑ | ① 공식 근거 |
| --- | :---: | :---: | :---: | --- |
| [DRIV (기존)](https://www.globalxetfs.com/funds/driv) | **O** | **?** | **?** | Holdings·Download Full CSV |
| [BOTZ (기존)](https://www.globalxetfs.com/funds/botz/) | **O** | **?** | **?** | Holdings·Download Full CSV |
| [IDRV](https://www.ishares.com/us/products/307332/ishares-self-driving-ev-and-tech-etf-fund) | **O** | **?** | **?** | Holdings 전체표·CSV |
| [HAIL](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-kensho-smart-mobility-etf-hail) | **O** | **?** | **?** | SPDR Daily Holdings 공식 문서목록 |
| [CABZ](https://www.roundhillinvestments.com/etf/cabz/) | **O** | **?** | **?** | View All·Download CSV/PDF |
| [KARS](https://kraneshares.com/etf/kars/) | **O** | **?** | **?** | Full Holdings .CSV |

### 원전·SMR

| ETF | ① 구성공개 | ② 수집·권리 | ③ C등급↑ | ① 공식 근거 |
| --- | :---: | :---: | :---: | --- |
| [NLR (기존)](https://www.vaneck.com/us/en/investments/uranium-nuclear-energy-etf-nlr/) | **O** | **?** | **?** | Holdings 전체표·XLS |
| [URA (기존)](https://www.globalxetfs.com/funds/ura) | **O** | **?** | **?** | Holdings·Download Full CSV |
| [URNM](https://sprottetfs.com/urnm-sprott-uranium-miners-etf/) | **O** | **?** | **?** | ETF Holdings 전체 목록 |
| [NUKZ](https://www.rangeetfs.com/nukz) | **O** | **?** | **?** | Holdings 전체표 |
| [URNJ](https://sprottetfs.com/urnj-sprott-junior-uranium-miners-etf/) | **O** | **?** | **?** | ETF Holdings 전체 목록 |
| [URAN](https://themesetfs.com/etfs/uran) | **?** | **?** | **?** | 발행사 상품 페이지 403, 전체 현행 구성종목 목록 확인 불가. |

### 방산

| ETF | ① 구성공개 | ② 수집·권리 | ③ C등급↑ | ① 공식 근거 |
| --- | :---: | :---: | :---: | --- |
| [ITA (기존)](https://www.ishares.com/us/products/239502/ishares-us-aerospace-defense-etf) | **O** | **?** | **?** | Holdings 전체표·CSV |
| [SHLD (기존)](https://www.globalxetfs.com/funds/shld) | **O** | **?** | **?** | Holdings·Download Full CSV |
| [XAR](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-aerospace-defense-etf-xar) | **O** | **?** | **?** | SPDR Daily Holdings 공식 문서목록 |
| [PPA](https://www.invesco.com/us/en/financial-products/etfs/invesco-aerospace-defense-etf.html) | **O** | **?** | **?** | Portfolio Holdings·Export data |
| [NATO](https://themesetfs.com/documents/SummaryProspectus/Summary-Prospectus-Themes-Transatlantic-Defense-ETF.pdf) | **?** | **?** | **?** | 발행사 상품 페이지 403, 전체 현행 구성종목 목록 확인 불가. |
| [WR](https://corgiinvest.com/wr) | **O** | **?** | **?** | All Holdings·Download Holdings |

### 핀테크

| ETF | ① 구성공개 | ② 수집·권리 | ③ C등급↑ | ① 공식 근거 |
| --- | :---: | :---: | :---: | --- |
| [FINX (기존)](https://www.globalxetfs.com/funds/finx) | **O** | **?** | **?** | Holdings·Download Full CSV |
| [ARKF (기존)](https://www.ark-funds.com/funds/arkf) | **O** | **?** | **?** | Daily holdings PDF·CSV |
| [IPAY](https://amplifyetfs.com/ipay/) | **O** | **?** | **?** | View All Holdings 전체표 |
| [BPAY](https://www.ishares.com/us/products/329128/ishares-fintech-active-etf) | **O** | **?** | **?** | Holdings 전체표·CSV |
| [KYC](https://corgiinvest.com/kyc) | **O** | **?** | **?** | All Holdings·Download Holdings |
| [LATR](https://corgiinvest.com/latr) | **O** | **?** | **?** | All Holdings·Download Holdings |

### 사이버보안

| ETF | ① 구성공개 | ② 수집·권리 | ③ C등급↑ | ① 공식 근거 |
| --- | :---: | :---: | :---: | --- |
| [CIBR (기존)](https://www.ftportfolios.com/retail/etf/etfsummary.aspx?Ticker=CIBR) | **O** | **?** | **?** | 전체 보유종목 표·Export to Excel |
| [BUG (기존)](https://www.globalxetfs.com/funds/bug) | **O** | **?** | **?** | Holdings·Download Full CSV |
| [HACK](https://amplifyetfs.com/HACK/) | **O** | **?** | **?** | View All Holdings 전체표 |
| [IHAK](https://www.ishares.com/us/products/307352/ishares-cybersecurity-and-tech-etf) | **O** | **?** | **?** | Holdings 전체표·CSV |
| [WCBR](https://www.wisdomtree.com/us/products/megatrends/wcbr) | **O** | **?** | **?** | View all holdings |
| [SPAM](https://themesetfs.com/etfs/spam) | **?** | **?** | **?** | 발행사 상품 페이지 403, 전체 현행 구성종목 목록 확인 불가. |
| [PSWD](https://etf.dws.com/en-us/PSWD-cybersecurity-select-equity-etf/) | **?** | **?** | **?** | Portfolio 섹션·분기 보유종목 보고서는 있으나 최신 전체 일별 공개 표 확인 불가. |
| [XA](https://corgiinvest.com/xa) | **O** | **?** | **?** | All Holdings·Download Holdings |

### AI·반도체

| ETF | ① 구성공개 | ② 수집·권리 | ③ C등급↑ | ① 공식 근거 |
| --- | :---: | :---: | :---: | --- |
| [SMH (기존)](https://www.vaneck.com/us/en/investments/semiconductor-etf-smh/) | **O** | **?** | **?** | Holdings 전체표·XLS |
| [SOXX (기존)](https://www.ishares.com/us/products/239705/ishares-phlx-semiconductor-etf) | **O** | **?** | **?** | Holdings 전체표·CSV |
| [SOXQ](https://www.invesco.com/us/en/financial-products/etfs/invesco-phlx-semiconductor-etf.html) | **O** | **?** | **?** | Portfolio Holdings·Export data |
| [XSD](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-semiconductor-etf-xsd) | **O** | **?** | **?** | SPDR Daily Holdings 공식 문서목록 |
| [ARTY](https://www.ishares.com/us/products/297905/ishares-future-ai-tech-etf) | **O** | **?** | **?** | Holdings 전체표·CSV |
| [AIQ](https://www.globalxetfs.com/funds/aiq) | **O** | **?** | **?** | Holdings·Download Full CSV |
| [CHAT](https://www.roundhillinvestments.com/etf/chat/) | **O** | **?** | **?** | View All·Download CSV/PDF |
| [PSI](https://www.invesco.com/us/en/financial-products/etfs/invesco-semiconductors-etf.html) | **O** | **?** | **?** | Portfolio Holdings·Export data |
| [EUV](https://corgiinvest.com/euv) | **O** | **?** | **?** | All Holdings·Download Holdings |
| [DRAM](https://www.roundhillinvestments.com/etf/dram/) | **O** | **?** | **?** | View All·Download CSV/PDF |
| [LLMA](https://www.globalxetfs.com/funds/llma) | **O** | **?** | **?** | Holdings·Download Full CSV |

### 바이오·신약

| ETF | ① 구성공개 | ② 수집·권리 | ③ C등급↑ | ① 공식 근거 |
| --- | :---: | :---: | :---: | --- |
| [IBB (기존)](https://www.ishares.com/us/products/239699/ishares-biotechnology-etf) | **O** | **?** | **?** | Holdings 전체표·CSV |
| [XBI (기존)](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-biotech-etf-xbi) | **O** | **?** | **?** | SPDR Daily Holdings 공식 문서목록 |
| [BBH](https://www.vaneck.com/us/en/investments/biotech-etf-bbh/overview/) | **O** | **?** | **?** | Holdings 전체표·XLS |
| [PBE](https://www.invesco.com/us/en/financial-products/etfs/invesco-biotechnology-genome-etf.html) | **O** | **?** | **?** | Portfolio Holdings·Export data |
| [GNOM](https://www.globalxetfs.com/funds/gnom/) | **O** | **?** | **?** | Holdings·Download Full CSV |
| [ARKG](https://www.ark-funds.com/funds/arkg) | **O** | **?** | **?** | Daily holdings PDF·CSV |
| [SBIO](https://www.alpsfunds.com/exchange-traded-funds/SBIO) | **?** | **?** | **?** | 발행사 Portfolio/Top Five만 확인, 최신 전체 구성종목 공개 목록 확인 불가. |
| [FBT](https://www.ftportfolios.com/retail/ETF/ETFsummary.aspx?Ticker=FBT) | **O** | **?** | **?** | 전체 보유종목 표·Export to Excel |
| [GNMX](https://corgiinvest.com/gnmx) | **O** | **?** | **?** | All Holdings·Download Holdings |

## 4. 아직 ①을 O로 확정하지 않은 7개

| ETF | 확인하지 못한 점 |
| --- | --- |
| CLOD | 발행사 상품 페이지 403, 전체 현행 구성종목 목록 확인 불가. |
| FCLD | Fidelity가 공개한 Basket Holdings는 실제 펀드 전체 자산과 동일하다는 보장 없음. |
| NATO | 발행사 상품 페이지 403, 전체 현행 구성종목 목록 확인 불가. |
| PSWD | Portfolio 섹션·분기 보유종목 보고서는 있으나 최신 전체 일별 공개 표 확인 불가. |
| SBIO | 발행사 Portfolio/Top Five만 확인, 최신 전체 구성종목 공개 목록 확인 불가. |
| SPAM | 발행사 상품 페이지 403, 전체 현행 구성종목 목록 확인 불가. |
| URAN | 발행사 상품 페이지 403, 전체 현행 구성종목 목록 확인 불가. |

## 5. ②·③ 판정이 미완료인 이유

- **② 수집 가능·사용권:** [GetMarketHistory 공식 약관](https://getmarkethistory.com/docs/terms)과 [MarketParquet 라이선스](https://marketparquet.com/license)에는 가공물 관련 조건이 있지만, 현재의 **무료 범위에서 63종 ETF에 40/252거래일분을 제공하는지**, 공개 점수에 대한 상업적 권리가 현재 계정에 유효한지 확인되지 않았다. **시장자료를 시험 수집하지 않는다.** 관련 기록: `docs/THEME_LEGACY_NINE_R12_MARKETDATA_RIGHTS_GATES_20261026.md`.
- **② 공급원 무료 용량의 문서상 가능성:** [GetMarketHistory 공식 안내](https://getmarkethistory.com/)는 무료 계정에 **월 25만 개의 1시간봉**을 제공하며, [API 안내](https://getmarkethistory.com/docs/quickstart)는 무료 범위가 1시간봉에 한정된다고 명시한다. **63 ETF + SPY = 64종 × 252거래일 × 정규장 7개 시간봉 가정 = 112,896개**이므로 용량만 놓고 보면 1년 분량 수집이 가능할 여지가 있다. 그러나 이 수치는 **이론값**이며 장전·장후 봉, 결측, 증분·요청단위 과금, 개별 종목의 실제 등록/백필, 48시간 지연을 반영하지 않았다. 자료 수집은 실행하지 않았으며 이를 개별 ETF의 ② O로 승격하지 않는다. [공식 가격 권리 조항](https://getmarkethistory.com/docs/terms)은 원시 가격 재배포를 금지하고 원시 시계열을 복원할 수 없는 파생물 공개를 조건부 허용한다.
- **③ C등급:** 법적 자문사 18개 후보의 CRD/IAPD 페이지 연결은 확보했으나, 개별 ETF의 실제 법인 동일성, 현재 등록 상태, 공개 제재기록, 운용 안정성을 종합한 등급은 **확정 전**이다. 관련 기록: `config/theme-nine-r16-iapd-identity-crosswalk.json`. 공식: [SEC IAPD](https://adviserinfo.sec.gov/).
- ① 공개 O는 **보유주식의 테마 적합성 최종 합격**을 뜻하지 않는다. BOTZ/ARKF/URNM 등 혼합 전략 상품은 비중과 해당 테마 노출을 별도 검토한다.

## 6. 근거 예시(직접 확인)

- [Global X LLMA](https://www.globalxetfs.com/funds/llma): Holdings 기준일·Download Full CSV·View All Holdings
- [First Trust ROBT](https://www.ftportfolios.com/Retail/Etf/EtfHoldings.aspx?Ticker=ROBT): 전체 111개 구성종목 및 Export to Excel
- [KraneShares KARS](https://kraneshares.com/etf/kars/): 기준일이 표기된 Full Holdings .CSV
- [State Street 공식 ETF 목록](https://www.ssga.com/us/en/individual/fund-finder?tab=documents&type=etfs): SPDR Daily Holdings
- [Roundhill HUMN](https://www.roundhillinvestments.com/etf/humn/): View All 및 Download CSV
- [Corgi GNMX](https://corgiinvest.com/gnmx): 전체 보유종목 이름/비중표
- [SEC ETF Rule 6c-11](https://www.sec.gov/investment/exchange-traded-funds-small-entity-compliance-guide): 일반 ETF 홈페이지의 일별 포트폴리오 공시 체계 안내(개별 상품 확인 대체 불가)

다음 작업도 공식 문서만 확인해 **② O/X, ③ C 이상 O/X를 완성하는 것**이며, 사용자가 요청하지 않은 수집·계산·배포는 하지 않는다.
