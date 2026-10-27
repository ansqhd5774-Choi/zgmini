# 기존 9개 테마 ETF 3조건 O/X 직접 검증 — R19

> 조사일: 2026-10-26 · 저장 브랜치: `research/theme-nine-r2-shadow-20261026` · 운영 반영 없음

## 결론

| 검증 항목 | O | X | 미확인 |
| :-- | --: | --: | --: |
| ① 운용사 공식 구성종목 전체 공개 | 63 | 0 | 0 |
| ② GetMarketHistory에서 정확한 ETF 티커 검색·파생 지표 사용 가능 | 63 | 0 | 0 |
| ③ SEC 등록 운용사 자체 신뢰도 C 이상 | 63 | 0 | 0 |

- 조사 대상 **ETF 63종(9개 테마 편입 위치 64개)**. BOTZ는 두 테마에 등장하므로 고유 종목 수와 위치 수가 다름.
- 세 조건 **모두 O: 63종**. 이는 *서류·검색 기반 편입 검토 통과*이지 63종을 운영 산식에 모두 넣기로 결정한 것은 아님.
- 수량 상한/목표 없음. 후보가 더 발견되면 동일 조건 적용.
- 가격(OHLCV) 수집 **0회**; 코드·운영 점수·스케줄러·기존 승인 가중치·main **변경 0회**.

## 정확한 O/X 기준과 한계

1. **① O:** 해당 발행사 공식 페이지의 구성종목 및 전체 보유내역 다운로드, 또는 공식 보고서 Schedule of Investments로 ETF 구성종목 공개 확인. 공식 상품 페이지가 일시 403이더라도 공인된 검색 색인에 발행사 `Full Holdings CSV` 표기가 있으면 **O**; 실제 정기 자동 수집 가능성의 확인과 구분.
2. **② O:** [GetMarketHistory 심볼 검색 API](https://getmarkethistory.com/docs/api/reference)의 `source=stocks`, `timeframe=1m`, `prefix=<ticker>` 조회 후 응답에서 정확한 `symbol` 일치 및 `rows>0`. 63건 모두 성공. 공식 [약관 5절](https://getmarkethistory.com/docs/terms)은 내부 저장과 복원 불가능한 파생 지표 공개를 허용하지만 원시 시세 재배포는 금지. 무료 [한도](https://getmarkethistory.com/docs/limits), [48시간 지연](https://getmarkethistory.com/docs/coverage) 적용. 따라서 *티커 존재 O*와 *252거래일 완전한 시세 보유·적시 갱신*은 별개.
3. **③ O:** 2026-10 SEC 등록 투자자문업자 명부에서 각 운용 법인 법정명·CRD 확인, `SEC Current Status=Approved` 및 Form ADV 최근 제출을 점검하고 아래 **ZGMINI 내부 연구등급** 부여. ETF 브랜드명과 법적 운용사를 구분. SEC가 A/B/C 등급을 매긴 것이 아님.

## 테마별 전체 후보 검증표

표의 ②는 **티커 검색과 사용 허용 확인**, 실제 가격 수집·252거래일·40거래일 판정이 아님.

### 로봇·자동화

| ETF | ① 구성종목 | ② 티커 검색 | ③ 운용사 등급 | 3조건 |
| :-- | :--: | :--: | :--: | :--: |
| [BOTZ](https://www.globalxetfs.com/funds/botz/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=BOTZ&limit=25) | [A·100점](https://adviserinfo.sec.gov/firm/summary/146932) | O |
| [ROBO](https://www.roboglobaletfs.com/robo) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=ROBO&limit=25) | [A·98점](https://adviserinfo.sec.gov/firm/summary/151197) | O |
| [ROBT](https://www.ftportfolios.com/Retail/Etf/EtfSummary.aspx?Ticker=ROBT) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=ROBT&limit=25) | [B·85점](https://adviserinfo.sec.gov/firm/summary/107027) | O |
| [ARKQ](https://www.ark-funds.com/funds/arkq) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=ARKQ&limit=25) | [A·98점](https://adviserinfo.sec.gov/firm/summary/169525) | O |
| [HUMN](https://www.roundhillinvestments.com/etf/humn/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=HUMN&limit=25) | [A·96점](https://adviserinfo.sec.gov/firm/summary/300799) | O |
| [RBTX](https://www.ishares.com/us/products/354128/ishares-future-robotics-and-related-technologies-active-etf) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=RBTX&limit=25) | [B·80점](https://adviserinfo.sec.gov/firm/summary/105247) | O |
| [CBOT](https://corgiinvest.com/cbot) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=CBOT&limit=25) | [B·90점](https://adviserinfo.sec.gov/firm/summary/337985) | O |

### 클라우드·SaaS

| ETF | ① 구성종목 | ② 티커 검색 | ③ 운용사 등급 | 3조건 |
| :-- | :--: | :--: | :--: | :--: |
| [SKYY](https://www.ftportfolios.com/Retail/Etf/EtfSummary.aspx?Ticker=SKYY) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=SKYY&limit=25) | [B·85점](https://adviserinfo.sec.gov/firm/summary/107027) | O |
| [CLOU](https://www.globalxetfs.com/funds/clou) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=CLOU&limit=25) | [A·100점](https://adviserinfo.sec.gov/firm/summary/146932) | O |
| [WCLD](https://www.wisdomtree.com/us/products/megatrends/wcld) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=WCLD&limit=25) | [B·85점](https://adviserinfo.sec.gov/firm/summary/139684) | O |
| [FCLD](https://institutional.fidelity.com/advisors/investment-solutions/performance/fidelity-etfs) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=FCLD&limit=25) | [B·89점](https://adviserinfo.sec.gov/firm/summary/108281) | O |
| [CLOD](https://themesetfs.com/etfs/clod) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=CLOD&limit=25) | [B·93점](https://adviserinfo.sec.gov/firm/summary/332224) | O |

### 자율주행

| ETF | ① 구성종목 | ② 티커 검색 | ③ 운용사 등급 | 3조건 |
| :-- | :--: | :--: | :--: | :--: |
| [DRIV](https://www.globalxetfs.com/funds/driv) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=DRIV&limit=25) | [A·100점](https://adviserinfo.sec.gov/firm/summary/146932) | O |
| [BOTZ](https://www.globalxetfs.com/funds/botz/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=BOTZ&limit=25) | [A·100점](https://adviserinfo.sec.gov/firm/summary/146932) | O |
| [IDRV](https://www.ishares.com/us/products/307332/ishares-self-driving-ev-and-tech-etf-fund) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=IDRV&limit=25) | [B·80점](https://adviserinfo.sec.gov/firm/summary/105247) | O |
| [HAIL](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-kensho-smart-mobility-etf-hail) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=HAIL&limit=25) | [B·89점](https://adviserinfo.sec.gov/firm/summary/111242) | O |
| [CABZ](https://www.roundhillinvestments.com/etf/cabz/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=CABZ&limit=25) | [A·96점](https://adviserinfo.sec.gov/firm/summary/300799) | O |
| [KARS](https://kraneshares.com/etf/kars/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=KARS&limit=25) | [B·91점](https://adviserinfo.sec.gov/firm/summary/157103) | O |

### 원전·SMR

| ETF | ① 구성종목 | ② 티커 검색 | ③ 운용사 등급 | 3조건 |
| :-- | :--: | :--: | :--: | :--: |
| [NLR](https://www.vaneck.com/us/en/investments/uranium-nuclear-energy-etf-nlr/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=NLR&limit=25) | [B·85점](https://adviserinfo.sec.gov/firm/summary/105080) | O |
| [URA](https://www.globalxetfs.com/funds/ura) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=URA&limit=25) | [A·100점](https://adviserinfo.sec.gov/firm/summary/146932) | O |
| [URNM](https://sprottetfs.com/urnm-sprott-uranium-miners-etf/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=URNM&limit=25) | [B·91점](https://adviserinfo.sec.gov/firm/summary/139022) | O |
| [NUKZ](https://www.rangeetfs.com/nukz) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=NUKZ&limit=25) | [A·98점](https://adviserinfo.sec.gov/firm/summary/151197) | O |
| [URNJ](https://sprottetfs.com/urnj-sprott-junior-uranium-miners-etf/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=URNJ&limit=25) | [B·91점](https://adviserinfo.sec.gov/firm/summary/139022) | O |
| [URAN](https://themesetfs.com/etfs/uran) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=URAN&limit=25) | [B·93점](https://adviserinfo.sec.gov/firm/summary/332224) | O |

### 방산

| ETF | ① 구성종목 | ② 티커 검색 | ③ 운용사 등급 | 3조건 |
| :-- | :--: | :--: | :--: | :--: |
| [ITA](https://www.ishares.com/us/products/239502/ishares-us-aerospace-defense-etf) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=ITA&limit=25) | [B·80점](https://adviserinfo.sec.gov/firm/summary/105247) | O |
| [SHLD](https://www.globalxetfs.com/funds/shld) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=SHLD&limit=25) | [A·100점](https://adviserinfo.sec.gov/firm/summary/146932) | O |
| [XAR](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-aerospace-defense-etf-xar) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=XAR&limit=25) | [B·89점](https://adviserinfo.sec.gov/firm/summary/111242) | O |
| [PPA](https://www.invesco.com/us/en/financial-products/etfs/invesco-aerospace-defense-etf.html) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=PPA&limit=25) | [B·93점](https://adviserinfo.sec.gov/firm/summary/125601) | O |
| [NATO](https://themesetfs.com/documents/SummaryProspectus/Summary-Prospectus-Themes-Transatlantic-Defense-ETF.pdf) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=NATO&limit=25) | [B·93점](https://adviserinfo.sec.gov/firm/summary/332224) | O |
| [WR](https://corgiinvest.com/wr) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=WR&limit=25) | [B·90점](https://adviserinfo.sec.gov/firm/summary/337985) | O |

### 핀테크

| ETF | ① 구성종목 | ② 티커 검색 | ③ 운용사 등급 | 3조건 |
| :-- | :--: | :--: | :--: | :--: |
| [FINX](https://www.globalxetfs.com/funds/finx) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=FINX&limit=25) | [A·100점](https://adviserinfo.sec.gov/firm/summary/146932) | O |
| [ARKF](https://www.ark-funds.com/funds/arkf) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=ARKF&limit=25) | [A·98점](https://adviserinfo.sec.gov/firm/summary/169525) | O |
| [IPAY](https://amplifyetfs.com/ipay/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=IPAY&limit=25) | [A·98점](https://adviserinfo.sec.gov/firm/summary/173781) | O |
| [BPAY](https://www.ishares.com/us/products/329128/ishares-fintech-active-etf) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=BPAY&limit=25) | [B·80점](https://adviserinfo.sec.gov/firm/summary/105247) | O |
| [KYC](https://corgiinvest.com/kyc) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=KYC&limit=25) | [B·90점](https://adviserinfo.sec.gov/firm/summary/337985) | O |
| [LATR](https://corgiinvest.com/latr) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=LATR&limit=25) | [B·90점](https://adviserinfo.sec.gov/firm/summary/337985) | O |

### 사이버보안

| ETF | ① 구성종목 | ② 티커 검색 | ③ 운용사 등급 | 3조건 |
| :-- | :--: | :--: | :--: | :--: |
| [CIBR](https://www.ftportfolios.com/retail/etf/etfsummary.aspx?Ticker=CIBR) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=CIBR&limit=25) | [B·85점](https://adviserinfo.sec.gov/firm/summary/107027) | O |
| [BUG](https://www.globalxetfs.com/funds/bug) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=BUG&limit=25) | [A·100점](https://adviserinfo.sec.gov/firm/summary/146932) | O |
| [HACK](https://amplifyetfs.com/HACK/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=HACK&limit=25) | [A·98점](https://adviserinfo.sec.gov/firm/summary/173781) | O |
| [IHAK](https://www.ishares.com/us/products/307352/ishares-cybersecurity-and-tech-etf) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=IHAK&limit=25) | [B·80점](https://adviserinfo.sec.gov/firm/summary/105247) | O |
| [WCBR](https://www.wisdomtree.com/us/products/megatrends/wcbr) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=WCBR&limit=25) | [B·85점](https://adviserinfo.sec.gov/firm/summary/139684) | O |
| [SPAM](https://themesetfs.com/etfs/spam) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=SPAM&limit=25) | [B·93점](https://adviserinfo.sec.gov/firm/summary/332224) | O |
| [PSWD](https://etf.dws.com/en-us/PSWD-cybersecurity-select-equity-etf/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=PSWD&limit=25) | [C·73점](https://adviserinfo.sec.gov/firm/summary/154558) | O |
| [XA](https://corgiinvest.com/xa) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=XA&limit=25) | [B·90점](https://adviserinfo.sec.gov/firm/summary/337985) | O |

### AI·반도체

| ETF | ① 구성종목 | ② 티커 검색 | ③ 운용사 등급 | 3조건 |
| :-- | :--: | :--: | :--: | :--: |
| [SMH](https://www.vaneck.com/us/en/investments/semiconductor-etf-smh/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=SMH&limit=25) | [B·85점](https://adviserinfo.sec.gov/firm/summary/105080) | O |
| [SOXX](https://www.ishares.com/us/products/239705/ishares-phlx-semiconductor-etf) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=SOXX&limit=25) | [B·80점](https://adviserinfo.sec.gov/firm/summary/105247) | O |
| [SOXQ](https://www.invesco.com/us/en/financial-products/etfs/invesco-phlx-semiconductor-etf.html) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=SOXQ&limit=25) | [B·93점](https://adviserinfo.sec.gov/firm/summary/125601) | O |
| [XSD](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-semiconductor-etf-xsd) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=XSD&limit=25) | [B·89점](https://adviserinfo.sec.gov/firm/summary/111242) | O |
| [ARTY](https://www.ishares.com/us/products/297905/ishares-future-ai-tech-etf) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=ARTY&limit=25) | [B·80점](https://adviserinfo.sec.gov/firm/summary/105247) | O |
| [AIQ](https://www.globalxetfs.com/funds/aiq) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=AIQ&limit=25) | [A·100점](https://adviserinfo.sec.gov/firm/summary/146932) | O |
| [CHAT](https://www.roundhillinvestments.com/etf/chat/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=CHAT&limit=25) | [A·96점](https://adviserinfo.sec.gov/firm/summary/300799) | O |
| [PSI](https://www.invesco.com/us/en/financial-products/etfs/invesco-semiconductors-etf.html) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=PSI&limit=25) | [B·93점](https://adviserinfo.sec.gov/firm/summary/125601) | O |
| [EUV](https://corgiinvest.com/euv) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=EUV&limit=25) | [B·90점](https://adviserinfo.sec.gov/firm/summary/337985) | O |
| [DRAM](https://www.roundhillinvestments.com/etf/dram/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=DRAM&limit=25) | [A·96점](https://adviserinfo.sec.gov/firm/summary/300799) | O |
| [LLMA](https://www.globalxetfs.com/funds/llma) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=LLMA&limit=25) | [A·100점](https://adviserinfo.sec.gov/firm/summary/146932) | O |

### 바이오·신약

| ETF | ① 구성종목 | ② 티커 검색 | ③ 운용사 등급 | 3조건 |
| :-- | :--: | :--: | :--: | :--: |
| [IBB](https://www.ishares.com/us/products/239699/ishares-biotechnology-etf) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=IBB&limit=25) | [B·80점](https://adviserinfo.sec.gov/firm/summary/105247) | O |
| [XBI](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-biotech-etf-xbi) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=XBI&limit=25) | [B·89점](https://adviserinfo.sec.gov/firm/summary/111242) | O |
| [BBH](https://www.vaneck.com/us/en/investments/biotech-etf-bbh/overview/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=BBH&limit=25) | [B·85점](https://adviserinfo.sec.gov/firm/summary/105080) | O |
| [PBE](https://www.invesco.com/us/en/financial-products/etfs/invesco-biotechnology-genome-etf.html) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=PBE&limit=25) | [B·93점](https://adviserinfo.sec.gov/firm/summary/125601) | O |
| [GNOM](https://www.globalxetfs.com/funds/gnom/) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=GNOM&limit=25) | [A·100점](https://adviserinfo.sec.gov/firm/summary/146932) | O |
| [ARKG](https://www.ark-funds.com/funds/arkg) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=ARKG&limit=25) | [A·98점](https://adviserinfo.sec.gov/firm/summary/169525) | O |
| [SBIO](https://www.alpsfunds.com/exchange-traded-funds/SBIO) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=SBIO&limit=25) | [A·98점](https://adviserinfo.sec.gov/firm/summary/134340) | O |
| [FBT](https://www.ftportfolios.com/retail/ETF/ETFsummary.aspx?Ticker=FBT) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=FBT&limit=25) | [B·85점](https://adviserinfo.sec.gov/firm/summary/107027) | O |
| [GNMX](https://corgiinvest.com/gnmx) | O | [O](https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=GNMX&limit=25) | [B·90점](https://adviserinfo.sec.gov/firm/summary/337985) | O |

## 운용사 자체 평가 18개

**공식 입력값:** 2026-10 SEC [Registered Investment Advisers 명부](https://www.sec.gov/data-research/sec-markets-data/information-about-registered-investment-advisers-exempt-reporting-advisers) / [다운로드 ZIP](https://www.sec.gov/files/investment/data/other/information-about-registered-investment-advisers-exempt-reporting-advisers/ia100226.zip), 등록 승인 여부, 최근 ADV 제출, 보고 규제 공시 항목, 신고 규제 운용자산 규모(RAUM), ETF 보유내역 공개.

| 운용 법인 | CRD | SEC 상태 | Item 11 Y 필드수 | 점수 | 내부 등급 |
| :-- | --: | :--: | --: | --: | :--: |
| [GLOBAL X MANAGEMENT COMPANY LLC](https://adviserinfo.sec.gov/firm/summary/146932) | 146932 | Approved | 0 | 100 | **A** |
| [EXCHANGE TRADED CONCEPTS, LLC](https://adviserinfo.sec.gov/firm/summary/151197) | 151197 | Approved | 0 | 98 | **A** |
| [FIRST TRUST ADVISORS LP](https://adviserinfo.sec.gov/firm/summary/107027) | 107027 | Approved | 4 | 85 | **B** |
| [ARK INVESTMENT MANAGEMENT LLC](https://adviserinfo.sec.gov/firm/summary/169525) | 169525 | Approved | 0 | 98 | **A** |
| [ROUNDHILL FINANCIAL INC.](https://adviserinfo.sec.gov/firm/summary/300799) | 300799 | Approved | 0 | 96 | **A** |
| [BLACKROCK FUND ADVISORS](https://adviserinfo.sec.gov/firm/summary/105247) | 105247 | Approved | 9 | 80 | **B** |
| [CORGI STRATEGIES, LLC](https://adviserinfo.sec.gov/firm/summary/337985) | 337985 | Approved | 0 | 90 | **B** |
| [WISDOMTREE ASSET MANAGEMENT, INC.](https://adviserinfo.sec.gov/firm/summary/139684) | 139684 | Approved | 4 | 85 | **B** |
| [FIDELITY MANAGEMENT & RESEARCH COMPANY LLC](https://adviserinfo.sec.gov/firm/summary/108281) | 108281 | Approved | 3 | 89 | **B** |
| [TEMA ETFS LLC](https://adviserinfo.sec.gov/firm/summary/332224) | 332224 | Approved | 0 | 93 | **B** |
| [SSGA FUNDS MANAGEMENT, INC.](https://adviserinfo.sec.gov/firm/summary/111242) | 111242 | Approved | 3 | 89 | **B** |
| [KRANE FUNDS ADVISORS, LLC](https://adviserinfo.sec.gov/firm/summary/157103) | 157103 | Approved | 1 | 91 | **B** |
| [VAN ECK ASSOCIATES CORPORATION](https://adviserinfo.sec.gov/firm/summary/105080) | 105080 | Approved | 4 | 85 | **B** |
| [SPROTT ASSET MANAGEMENT USA INC.](https://adviserinfo.sec.gov/firm/summary/139022) | 139022 | Approved | 1 | 91 | **B** |
| [INVESCO CAPITAL MANAGEMENT LLC](https://adviserinfo.sec.gov/firm/summary/125601) | 125601 | Approved | 1 | 93 | **B** |
| [AMPLIFY INVESTMENTS LLC](https://adviserinfo.sec.gov/firm/summary/173781) | 173781 | Approved | 0 | 98 | **A** |
| [DBX ADVISORS LLC](https://adviserinfo.sec.gov/firm/summary/154558) | 154558 | Approved | 15 | 73 | **C** |
| [ALPS ADVISORS, INC.](https://adviserinfo.sec.gov/firm/summary/134340) | 134340 | Approved | 0 | 98 | **A** |

- 내부 등급 분포: **A 6곳 · B 11곳 · C 1곳 · D 0곳**. C등급은 DBX Advisors(73점). 18개 모두 현재 SEC 상태 Approved.
- 규제 공시 `Item 11 Y` 필드수는 **문항에 예라고 답한 개수**이지 위반 사건 수·확정 제재 횟수가 아님. 공시가 있다는 이유만으로 탈락시키지 않으며, 내용에 대한 단정 금지.
- 평가 100점 만점: 등록 25 · 규제 공시 25 · 공시 투명성 25 · 운영 이력/RAUM 25. A≥90, B≥75, C≥60, D<60. 규제공시 Y가 있거나 운용 이력이 5년 미만이면 A는 B로 상한. 항목별 구체 점수는 [JSON](../config/theme-nine-r19-three-gate-ox-verified.json) 참고.

## R18 → R19 확인 내용

- ① `?`이었던 7개 **FCLD, CLOD, URAN, NATO, SPAM, PSWD, SBIO**를 공식 발행사 보유내역 공개 증거로 **O** 판정. FCLD는 Fidelity 공식 반기보고서의 실제 보유 종목표를 확인하며 *creation basket*과 혼동하지 않음.
- ② GetMarketHistory 정확 티커 검색 **63/63 O**. 첫 조회 제한(HTTP 429) 8개는 대기 후 동일 *심볼 검색만* 재조회해 확인.
- ③ 18개 운용사의 법적 명칭·SEC CRD·승인 여부·공시 정보를 기준으로 등급 산출. **18/18 C 이상, ETF 63/63 O**.
- 실제 가격/거래량 수집·개별 RSI/공탐 계산·AUM 가중치 재계산·기존 공개 차트 252일 변경·main 병합·배포 **하지 않음**.

## 후속 검증 범위(이번 3조건과 구분)

- 테마 연관성: 보유종목 비중이 해당 산업을 실제로 대표하는지. BOTZ(로봇·AI·자율주행), URNM/URNJ(우라늄 채굴), ARKF(복합 전략) 등은 별도 비교.
- 적응형 점수: RBTX·LLMA처럼 신규 상장 ETF는 실제 거래일 40일 충족 전 계산하지 않음. 일부 희소거래 상품은 심볼 검색 O이어도 필요한 관측 이력 결측 가능.
- 최신 공식 AUM과 ETF 간 중복 검토, 기존 대비 252거래일 shadow 비교는 별도 단계. 사용자 승인 전 운영 반영 금지.

## 공식 공개 근거(추가 7종)

- FCLD: Fidelity 공식 2025-12-31 반기보고서 `Fidelity Cloud Computing ETF—Schedule of Investments`(전체 보유 종목·금액·비중).
- CLOD, URAN, NATO, SPAM: Themes ETF 각 공식 상품 페이지의 `Full Holdings CSV` 표기.
- PSWD: DWS 공식 2026-02-28 `Schedule of Investments` 공개.
- SBIO: ALPS 공식 `Download Full Holdings` 공개.

공식 링크와 ETF별 서술형 증거는 [R19 JSON](../config/theme-nine-r19-three-gate-ox-verified.json)에 저장.
