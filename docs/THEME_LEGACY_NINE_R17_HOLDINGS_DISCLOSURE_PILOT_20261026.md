# 기존 9개 테마 ETF 공식 구성종목 공개 1차 확인 R17 (2026-10-26)

- 연구 브랜치: `research/theme-nine-r2-shadow-20261026`
- 63종 고유 ETF / 64개 테마별 후보 위치를 `config/theme-nine-r17-holdings-disclosure-pilot.json`에 유지
- 연구 파일이며 현행 산식·AUM·PC writer·main·D1·공개 점수 불변
- **① 구성종목 공개 O는 발행사 공식 전체 목록·비중·기준일의 공개 여부로 판정한다. 파일 다운로드나 PC 수집은 필요하지 않다.**

## 1. 기존 테마당 1개 ETF로 공개 위치 교차확인

| 테마 | ETF | 공식 발행사 확인 | 공개 위치 유형 | 표기 종목수 | 데이터 기준일 |
| --- | --- | --- | --- | ---: | --- |
| 로봇·자동화 | BOTZ | https://www.globalxetfs.com/funds/botz/ | Full CSV 표기, 일부 HTML 행 | 81 | 10/23 |
| 클라우드·SaaS | SKYY | https://www.ftportfolios.com/Retail/Etf/EtfHoldings.aspx?Ticker=SKYY | 전체 보유종목 HTML, Excel | 65 (현금 제외) | 10/23 |
| 자율주행 | DRIV | https://www.globalxetfs.com/funds/driv/ | Full CSV 표기 | 74 | 종목 수 10/19, 원파일 기준일 미검증 |
| 원전·SMR | NLR | https://www.vaneck.com/us/en/investments/uranium-nuclear-energy-etf-nlr/ | 일별 전체 보유종목 표, XLS | 28 (현금 포함) | 10/23 |
| 방산 | XAR | https://www.ssga.com/us/en/individual/fund-finder?tab=documents&type=etfs | 공식 자료목록의 Daily Holdings | 미확인 | 실제 파일 미검증 |
| 핀테크 | FINX | https://www.globalxetfs.com/funds/finx | Full CSV 표기 | 79 | 종목 수 10/23 |
| 사이버보안 | CIBR | https://www.ftportfolios.com/Retail/Etf/EtfHoldings.aspx?Ticker=CIBR | 전체 보유종목 HTML, Excel | 45 (현금 제외) | 10/23 |
| AI·반도체 | SMH | https://www.vaneck.com/us/en/investments/semiconductor-etf-smh/holdings | 일별 전체 보유종목 표, XLS | 26 | 10/23 |
| 바이오·신약 | IBB | https://www.ishares.com/us/products/239699/ishares-biotechnology-etf | 전체 CSV 다운로드 링크, 동적 행 조회 불안정 | 243 | 10/23 |

### 정확한 상태
- 공식 보유종목 표/전체 파일 경로 발견: **9/9**
- ① 공식 전체 보유종목 목록·파일 공개 O: **9/9**
- 실제 파일 수집: **실행하지 않음(판정 필수조건 아님)**
- 사용자 기준 Gate ②(무료 상업적 저장·가공 지표 공개 및 실제 가격/AUM 자동 수집) 또는 ③(C등급 이상) 통과로 **확대 해석 금지**.
- XAR은 발행사 공식 자료목록의 Daily Holdings 제공을 근거로 ① 공개 O. 실제 수집 여부는 별도 평가.
- IBB는 공식 전체 CSV 링크가 공개되어 ① 공개 O. 일부 페이지의 동적 렌더링 문제는 공개 여부 O를 취소하지 않는다.

## 2. 구성 변경 비교용 후보 모수 (R14 기준)

| 테마 | 기존 2종 | R14 전체 후보 위치 | 기존 대비 추가 검증 위치 |
| --- | --- | ---: | ---: |
| 로봇·자동화 | BOTZ, ROBO | 7 | 5 |
| 클라우드·SaaS | SKYY, CLOU | 5 | 3 |
| 자율주행 | DRIV, BOTZ | 6 | 4 |
| 원전·SMR | NLR, URA | 6 | 4 |
| 방산 | ITA, SHLD | 6 | 4 |
| 핀테크 | FINX, ARKF | 6 | 4 |
| 사이버보안 | CIBR, BUG | 8 | 6 |
| AI·반도체 | SMH, SOXX | 11 | 9 |
| 바이오·신약 | IBB, XBI | 9 | 7 |
| 합계 | 기존 18개 위치 | 64 | 46 |

- BOTZ는 로봇·자동화와 자율주행에 중복 후보로 존재한다. ETF 고유 모수는 **63종**이다.
- 64개 후보 위치는 **목표 수량·최종 선정 수량이 아니다**.
- 기존 18개 위치도 자동 유지하지 않는다. 실제 ETF별 Gate 검증 후 모두 적합하면 유지하고 아니면 교체 대상으로 검토한다.
- 이후 연구: 나머지 ETF의 공식 구성종목 공개 O/X 조사 → 공식 자료상 지속적 가격 수집 가능성과 사용권 O/X 조사 → 법적 운용사의 C등급 이상 여부 O/X 조사 → 3개 모두 O인 후보만 편입 검토. 현재 단계에서 자료 수집·산식·배포 실행 금지.

## 3. 공식 근거
- 개별 ETF의 공식 상품·Holdings 페이지는 표에 직접 기록.
- SEC Rule 6c-11 ETF 홈페이지 공시 요구: https://www.sec.gov/investment/exchange-traded-funds-small-entity-compliance-guide
- 공개 열람 가능 여부와 상업적 재배포·가격 데이터 저장 사용권은 별개다.

이번 R17은 기존 ETF 9종의 **① 구성종목 공개 O** 확인이며, 나머지 기준 ②·③은 별도 조사한다. 파일을 다운로드하지 않고 확인했다.
