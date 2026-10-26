# 기존 9개 테마 — ETF 후보 2차 추가 탐색 R10 (2026-10-26)
브랜치 research/theme-nine-r2-shadow-20261026
최신 선정 기준: docs/THEME_LEGACY_NINE_R8_ELIGIBLE_ETF_UNCAPPED_20261026.md
1차 기록: docs/THEME_LEGACY_NINE_R9_ETF_ISSUER_DISCOVERY_20261026.md
상태: 공식 상품·투자 목적 확인에 국한됨. **ETF 최종 선정/권리/실가격 수집/공식 AUM 검증이 아니다.**

## 2차 발행사 공식 신규 후보
| 테마 | 추가 ETF | 상품 및 테마 관련성/주의 | 공식 발행사 자료 |
| --- | --- | --- | --- |
| 로봇·자동화 | HUMN | Roundhill 휴머노이드 로봇, 비교적 신규 테마 | https://www.roundhillinvestments.com/etf/humn/ |
| 클라우드·SaaS | CLOD | Themes 클라우드·데이터·전자상거래 인프라, SaaS 순도 측정 | https://themesetfs.com/etfs/clod |
| 자율주행 | CABZ | Roundhill 로보택시·자율주행·기술; 출시 기간과 실가격 유무 확인 | https://www.roundhillinvestments.com/etf/cabz/ |
| 자율주행 | KARS | KraneShares EV·미래 이동수단; 순수 자율주행과 범용 EV 차이를 평가 | https://kraneshares.com/etf/kars/ |
| 원전·SMR | URNJ | Sprott 중소형 우라늄 광업; 직접 SMR보다는 핵연료 연관 노출 | https://sprottetfs.com/urnj-sprott-junior-uranium-miners-etf/ |
| 원전·SMR | URAN | Themes 우라늄 채굴·원전 기술·장비·인프라 혼합 | https://themesetfs.com/etfs/uran |
| 방산 | NATO | Themes 북대서양조약기구 회원국의 항공우주·방위산업 | https://themesetfs.com/documents/SummaryProspectus/Summary-Prospectus-Themes-Transatlantic-Defense-ETF.pdf |
| 핀테크 | KYC | Corgi 디지털은행·결제·BaaS·금융 인프라 액티브, 신규 2026년 상장 | https://corgiinvest.com/kyc |
| 사이버보안 | SPAM | Themes 사이버보안, 디지털 보안 SW 중심 | https://themesetfs.com/etfs/spam |
| 사이버보안 | PSWD | Xtrackers 사이버보안 집중 지수 | https://etf.dws.com/en-us/PSWD-cybersecurity-select-equity-etf/ |
| AI·반도체 | CHAT | Roundhill 생성형 AI·기술, AI 소프트웨어/반도체 노출 구분 | https://www.roundhillinvestments.com/etf/chat/ |
| AI·반도체 | PSI | Invesco 반도체 지수, 기존 SMH·SOXX와 보유 중복 확인 | https://www.invesco.com/us/en/financial-products/etfs/invesco-semiconductors-etf.html |
| 바이오·신약 | SBIO | ALPS FDA 2·3상 단계 신약 보유 바이오 기업 중소형 | https://www.alpsfunds.com/exchange-traded-funds/SBIO |
| 바이오·신약 | FBT | First Trust NYSE Arca 바이오 지수 | https://www.ftportfolios.com/retail/ETF/ETFsummary.aspx?Ticker=FBT |

## 누적 검산 (수량은 결과 집계이지 선정 목표가 아님)
- R9 발행사 확인 신규 후보 **23개**
- 본 R10 발행사 확인 신규 후보 **14개**
- 두 회차 신규 후보 누계 **37개** (테마별 편입 후보 위치, 기존 18개 위치 제외)
- 중복 ETF가 복수 테마에 해당할 수 있으므로 통합 master에서는 티커별 dedupe 및 각 테마별 적합성을 별도 기록한다.
- 위 37개 모두 사용권/시세 자동수집/실제 SHA/AUM 기준일 미확인, 최종 편입 승인 0개. 후보가 많아졌다고 검증 기준을 완화하지 않는다.
- 향후에도 후보 발굴은 인위적 ETF 수 목표가 아니라 전체 시장과 발행사 공식 자료의 지속 점검에 따라 진행한다.

## 실제 편입 Gate로 넘어가기 전에 해야 할 일
1. 신규 37개+현재 18개 위치를 날짜가 명시된 공식 ETF/지수/holdings/공식 AUM으로 **개별 감사**, 중복 티커/전략 변경/청산·레버리지 여부 확인.
2. 실가격 공급자 이용 계약에서 **무료·상업 이용·저장·파생 공개**가 허용되는지 각 수집 경로별로 확인. 발행사 페이지에 표시된 시세·보유 목록의 웹 공개는 자동수집/공개 권리의 증거가 아니다.
3. 승인 Windows CMD에서 실제 가격 공급 경로를 테스트해 개별 R2 최소 40회 검증 세션, SPY 공통 거래일, 실제 252일 축과 가격모드·분할·원본 SHA를 점검.
4. 최종 후보별 이유와 재선정 표를 사용자에 제출해 공개 산식 전환 승인 전에 비공개 shadow R2+AUM 252일 비교 수행.
5. 출시가 짧은 HUMN/CABZ/KYC 등도 628일 미만 이유 하나로 제외하지 않으며 R2 적응형 유효 구간 검증, 실제 부족 세션은 null 유지.

## 확인된 교차/순도 리스크 (판정 미완료)
- 로봇·자율주행에서 BOTZ, ARKQ, HUMN, CABZ의 실제 노출이 겹칠 수 있다.
- 자율주행 KARS·IDRV·DRIV는 EV 공급망을 포함한다. 자율주행 순도 100%라고 표현하지 않는다.
- 원전 URNM/URNJ는 우라늄 광업, NUKZ/URAN/NLR는 원전 생태계까지 포괄하므로 단순 같은 성격 ETF로 취급하지 않는다.
- 핀테크 ARKF는 현행 블록체인·핀테크, KYC는 디지털 금융 인프라, IPAY는 결제로 범위가 다르다.
- 시장 가격·정식 holdings·권리 미검증 상태에서 이를 수치 가중치 또는 최종 ETF 로스터로 전환하지 않는다.

## 출처와 자료기준일
- 공식 발행사 상품 페이지를 2026-10-26에 조회한 결과다. 문서 중 미래 회계일의 팩트시트가 검색되는 경우 현재 사실/실적 근거로 취급하지 않는다.
- ETF 운용사 상품 존재·투자 목적과 실제 시장가격 취득/저장/공개 권리는 별개이다.
