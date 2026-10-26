# 기존 9개 테마 — 발행사 공식 자료 1차 구성 점검 R1

- 조사일: 2026-10-26
- 작업 상태: **공식 발행사 설명 기반 1차 후보 점검 / 재선정·재가중·재계산·공개 변경 전혀 없음**
- 표본: `config/theme-data-registry.json`의 기존 9개 2-ETF 조합 (총 18편입 위치, BOTZ 중복)
- 정확도: 아래는 **펀드의 투자 목적·추종 영역** 확인 결과다. 최신 보유 종목별 실제 비중, 공식 AUM/기준일, ETF별 순도 비율, 가격 데이터 사용·저장·파생 공개 권리 및 현재 PC 운영 상태까지 검증한 결과가 아니다.

## 1. 기존 조합의 조사 우선순위

| 테마 / 현재 ETF | 발행사 기준 확인한 범위 | 정량 확인 과제 | 단정 금지 |
| --- | --- | --- | --- |
| 로봇·자동화 BOTZ/ROBO | BOTZ는 로봇·AI와 일부 자율주행; ROBO는 로봇·자동화·AI | 두 ETF의 보유 종목별 가중치 중복, 별도 자율주행과 교차 노출 | 중복이 곧 오류라는 단정 |
| 클라우드·SaaS SKYY/CLOU | SKYY는 클라우드 컴퓨팅 지수, CLOU는 SaaS/PaaS/IaaS·데이터센터/엣지 등 포함 | SaaS 비중 대 인프라 비중, 데이터센터·전력 테마와 교차 노출 | 이름만으로 순도 100% 추정 |
| 자율주행 DRIV/BOTZ | DRIV는 자율주행뿐 아니라 EV 제조·부품·원자재; BOTZ는 로봇·AI·일부 자율주행 | **자율주행 핵심 노출 비중**, 로봇 테마와 BOTZ 중복 | EV 전체를 무조건 자율주행으로 처리 |
| 원전·SMR NLR/URA | NLR은 우라늄 채굴부터 원전 건설·운영·기술까지; URA는 우라늄 및 원전 부품 | **SMR 직접 연관 비중**과 우라늄 가격 민감도 분리 | 우라늄 ETF = SMR ETF라는 주장 |
| 방산 ITA/SHLD | ITA는 미국 항공우주·방위산업(상업용 항공 포함), SHLD는 방위 기술 | 민간 항공/기존 방산/신기술의 상대 비중 | ITA·SHLD가 같은 위험 노출이라는 주장 |
| 핀테크 FINX/ARKF | FINX는 금융 기술; ARKF는 **2025-11-23 이후 블록체인·핀테크** | ARKF 전략 변경 전후 노출 비중과 최신 핀테크 순도 | ARKF를 현재도 순수 구형 Fintech 명칭으로만 취급 |
| 사이버보안 CIBR/BUG | CIBR은 사이버보안 지수, BUG도 사이버보안 업체 중심 | 지수별 상위 종목 중복·소형주/대형주 편중 | 비슷한 펀드명만으로 동일 비중 추정 |
| AI·반도체 SMH/SOXX | 두 ETF 모두 반도체 제조·장비 중심 | **AI 관련 매출/기업 노출**과 반도체 산업 전체의 구별, 최신 가격 조정/분할 안내 | 반도체 전체 = AI 전용이라고 주장 |
| 바이오·신약 IBB/XBI | IBB는 미국 상장 바이오 지수, XBI는 바이오 섹터의 균등 가중 지수 | 규모·종목 중복·중소형주 민감도 차이, PC 공개 점수 재계산 불일치 | XBI·IBB 변동 차이를 계산 오류로 단정 |

**구체 확인 사실:**

- 기존 구성 등록부에서 `BOTZ`가 로봇·자동화와 자율주행 **두 테마에 모두 편입**된다. 발행사 BOTZ 설명 자체에도 자율주행이 포함되므로 이름만으로 배제하거나 정당화할 수 없다.
- Global X DRIV의 공식 펀드 목적은 자율주행과 전기차·부품/원자재를 포괄한다. 자율주행이라는 사용자 표시명과 ETF 전체 구성 사이의 차이를 최신 holdings로 정량 측정해야 한다.
- ARK의 공식 ARKF 설명에 따르면 2025-11-23부터 명칭과 투자정책이 블록체인·핀테크로 바뀌었다. 정식 ETF 과거 가격이 바뀌는 것은 아니지만 **현재 테마의 대표성 평가**에는 반영해야 한다.
- iShares의 SOXX 공식 안내에는 2026-11-03 기준일, 2026-11-04 장 마감 후 주식분할 시행 예정이라고 명시돼 있다. **조사일 현재 미래 예정 사항**이며 이미 분할이 발생했다고 취급하면 안 된다. 앞으로는 원가격과 조정가격 혼합·데이터 공급자 분할 처리 방식을 별도 검증한다.

## 2. 자료 수집 전 정의할 중립적 수치

후보 선정 통과 기준이나 점수 산식을 아직 정하지 않는다. 다음은 기존 구성과 후보 구성을 **동일 방식으로 비교하기 위한 관측 항목**이다.

1. **테마 순도 측정:** 기준일의 실제 holdings weight 중 사전 명시한 테마 적합 판정에 속하는 종목 가중치 합. 종목별 판정 근거·`UNKNOWN` 비중을 모두 남기며, 미확인 보유 종목을 0 또는 100으로 단정하지 않는다.
2. **ETF 간 보유 종목 중복:** 동일한 식별자에 대해 각 ETF 보유 비중 중 작은 값을 합산하는 후보 지표. 종목 식별·분할·현금/파생분 검증 전에는 확정 중복률을 출력하지 않는다.
3. **테마 간 중복:** 동일 ETF 재사용뿐 아니라 서로 다른 ETF 안의 동일 기업 비중도 비교. BOTZ는 시작점일 뿐; 전체 9개에서 스캔한다.
4. **AUM 시나리오:** 발행사 공식 AUM·기준일·통화·조회일을 보유해야 산출. 기존 두 ETF 50:50, R3 70:30→50:50, 3종 이상 AUM 승인 규칙을 **혼동하지 않는다**. 구형 9개 2종의 새로운 AUM 비중은 현재 미승인이다.
5. **가격·산식 동등성:** 동일 PC 저장 가격·SPY·뉴욕 날짜·가격모드를 사용. ETF별 N≥628이면 R188/R2 최근 252점 차이≈0이 필수. 다른 기업/ETF를 편입하면 별도 신규 버전 점수로 구분한다.
6. **신선도:** 실제 최근 관측일과 마지막 정규 실행일을 각각 기록. 자료 지연과 시장 심리 횡보를 혼동하지 않는다.

## 3. 다음 실제 작업을 위한 증거 체크리스트

- [ ] 저장 PC의 9개 ETF별 실제 원가격·SPY·가격 모드·manifest SHA
- [ ] PC 업무용 현재 스케줄러와 최신 정상 실행 로그
- [ ] 9개 기존 공개 252일 점수와 확정/잠정 구분
- [ ] 모든 ETF의 **발행사 공식 최신 holdings/AUM** 자료(기준일 포함) 및 이용·저장·파생 공개 권리
- [ ] 종목 중복·순도·대표성 수치와 산식 R188/R2 동등성 결과
- [ ] 9개별 개선안과 현재 점수 대비 1년 차이 검증, 별도 사용자 전환 승인

## 4. 1차 조사 원문 — 발행사 직접 링크

| ETF | 확인 자료 |
| --- | --- |
| BOTZ / DRIV | [Global X BOTZ](https://www.globalxetfs.com/funds/botz/) · [Global X DRIV](https://www.globalxetfs.com/funds/driv/) |
| ROBO | [ROBO Global ROBO](https://www.roboglobaletfs.com/robo) |
| SKYY / CLOU | [First Trust SKYY](https://www.ftportfolios.com/Retail/Etf/EtfSummary.aspx?Ticker=SKYY) · [Global X CLOU](https://www.globalxetfs.com/funds/clou) |
| NLR / URA | [VanEck NLR](https://www.vaneck.com/us/en/investments/uranium-nuclear-energy-etf-nlr/) · [Global X URA](https://www.globalxetfs.com/funds/ura/) |
| ITA / SHLD | [iShares ITA](https://www.ishares.com/us/products/239502/ishares-u-s-aerospace-defense-etf) · [Global X SHLD](https://www.globalxetfs.com/funds/shld) |
| FINX / ARKF | [Global X FINX](https://www.globalxetfs.com/funds/finx) · [ARK ARKF](https://www.ark-funds.com/funds/arkf) |
| CIBR / BUG | [First Trust CIBR](https://www.ftportfolios.com/Retail/Etf/EtfSummary.aspx?Ticker=CIBR) · [Global X BUG](https://www.globalxetfs.com/funds/bug) |
| SMH / SOXX | [VanEck SMH](https://www.vaneck.com/us/en/investments/semiconductor-etf-smh/) · [iShares SOXX](https://www.ishares.com/us/products/239705/fund) |
| IBB / XBI | [iShares IBB](https://www.ishares.com/us/products/239699/ishares-biotechnology-etf) · [State Street XBI](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-biotech-etf-xbi) |

이 문서는 기사 추천, 9개 교체 확정안, 실측 holdings 분석, 현재 운용 현황 PASS가 아니다. 실제 구성 자료와 원가격 검증 뒤 R2/R3 리포트에서 갱신한다.
