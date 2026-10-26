# 기존 9개 테마 ETF 공식 구성종목 공개 1차 확인 R17 (2026-10-26)

- 연구 브랜치: `research/theme-nine-r2-shadow-20261026`
- 63종 고유 ETF / 64개 테마별 후보 위치를 `config/theme-nine-r17-holdings-disclosure-pilot.json`에 유지
- 연구 파일이며 현행 산식·AUM·PC writer·main·D1·공개 점수 불변
- **지금 확인한 것은 발행사 공개 위치. 전체 파일 다운로드·비중 합계/티커 대조는 아직 PASS 아님.**

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
- 파일의 실제 회수·종목명/비중·기준일·종목수 및 합계 검증: **0/9**
- 최종 Gate ① 통과: **0/9** (현재는 검증 대기; 공개 불능(X)과 다름)
- 사용자 기준 Gate ②(무료 상업적 저장·가공 지표 공개 및 실제 가격/AUM 자동 수집) 또는 ③(C등급 이상) 통과로 **확대 해석 금지**.
- XAR은 발행사 공식 자료목록에 일별 보유종목이 표시되지만 실제 파일 확인 전까지 O 확정 금지.
- IBB는 공식 페이지에서 CSV 링크를 보여주나 다른 페이지 렌더링에서는 보유종목 행이 일시적으로 표시되지 않았다. 수집 성공 또는 실패로 확정 금지.

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
- 이후: 전체 보유종목 원파일 readback → 테마 관련 기업 비중/중복 검증 → 가격·AUM/이용권 검증 → SEC/IAPD 현행 규제·운영 검증 → 비공개 AUM 상대가중 그림자점수 252일 비교 → 사용자 승인 후 운영 반영.

## 3. 공식 근거
- 개별 ETF의 공식 상품·Holdings 페이지는 표에 직접 기록.
- SEC Rule 6c-11 ETF 홈페이지 공시 요구: https://www.sec.gov/investment/exchange-traded-funds-small-entity-compliance-guide
- 공개 열람 가능 여부와 상업적 재배포·가격 데이터 저장 사용권은 별개다.

이번 R17은 9개 기존 ETF의 보유종목 공개 위치를 확인한 **파일 회수 전 단계**이며, 적격성 O/X 최종 심사는 계속 진행 중이다.
