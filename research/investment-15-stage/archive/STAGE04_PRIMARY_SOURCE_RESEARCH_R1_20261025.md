# 역사적 조사 기록 — 최신 판단용 아님

> 이 파일은 당시 조사 원문을 보존한 아카이브다. **04단계 현재 판단은 `STAGE04_SAME_VINTAGE_VALIDATION_R3_20261025.md` 및 `STAGE04_LIVE_F_AND_SOURCE_GATE_R4_20261025.md`를 우선**한다.
> R1의 FDA 2023=55, 2025 가속 +1.09%p는 혼합 판본 오류이며 R2/R3에서 2023=54, 가속 −0.5926%p로 정정됐다. 이력 수치를 현재 계산이나 운영에 재사용하면 안 된다.

---

# 개인투자 15단계 — 04단계 산업 실측자료 1차 조사 R1

> 조사일: 2026-10-25 (KST)  
> 원설계: `INVESTMENT_PROCESS_15_STAGE_PRECISE_IMPLEMENTATION_PLAN_R2_QUANT_20261025.md`  
> 범위: 이미 03단계를 통과한 ETF 테마 9개 유지. **공식기관 실측 원값·변화율과 동일 시계열 가능성만 조사**  
> 결과 상태: **SOURCE_RESEARCH_PARTIAL / OPERATING_MODEL_UNCHANGED / NO_TRADE**  
> 운영 반영: 없음. 기존 03단계 ETF 선정·산식·공탐·DB·가중치·사이트에 변경 없음.

## 1. 첫 조사 결과

원값과 이전값을 같은 정의로 확인한 자료만 계산했다. 아래 성장률은 산업마다 단위가 다르므로 서로 직접 비교하여 순위를 만들지 않는다. `—`는 0점이나 실패가 아니다. 수치는 공식 자료에 표시된 자릿수에 따라 반올림되며, 정식 과거 시계열의 동일 판본 검증이 남아 있다.

| 기존 통과 테마 | 공식기관·사전등록 대상 | 최신 관측값과 비교값 | 확인된 변화 | 가속도 또는 비교 제약 | 1차 조사 상태 |
|---|---|---|---|---|---|
| 데이터센터·전력 | IEA / 세계 데이터센터 전력 사용량 | **2025년 485 TWh**, 2024년 약 **415 TWh** | **+17% YoY**(IEA 공표; 표시 원값으로 계산하면 약 +16.9%) | 2023년 이전 동정의 원계열 추출 미완료. 2015~2025 차트가 있으나 페이지에서 원 CSV 다운로드 불가 | `PARTIAL_QUANT` |
| 로봇·자동화 | IFR / 세계 산업용 로봇 신규 설치 | **2025년 603,307대**, 2024년 약 **542,000대** | IFR **+11.2% YoY**. 2024년 값은 전년도 보고서의 약수 | 2026년 판본의 2024·2023 정확 원값과 개정 여부를 함께 대조해야 가속도 확정 가능 | `PARTIAL_QUANT` |
| 자율주행 | California CPUC / 상업용 AV 승객 서비스 | 2026년 **2분기 보고자료** 게시; 2025년 같은 분기 자료도 게시 | **수치 추출 보류** | 2025년 보고주기가 달력 분기로 변경됨. 일부 보고서가 비공개 처리되며, 2026년 3분기 제출기한은 11월 1일 | `PARTIAL_QUANT / BREAK_IN_SERIES_REVIEW` |
| 바이오·신약 | FDA CDER / 미국 신규 신약 승인 건수 | **2025년 46건**, **2024년 50건**, **2023년 55건** | 2025 YoY **−8.00%**; 2024 YoY **−9.09%** | 2025 성장률 가속도 **+1.09%p**(감소 속도 둔화). 승인 건수는 바이오산업 매출·수요가 아닌 협소한 대리변수 | `PROXY_SCOPE_LIMITED` |
| 원전·SMR | IAEA / 세계 원전 건설 중 설비용량 | 2025년 말 **77.2 GW(e)·72기**, 2024년 말 **64.5 GW(e)·62기** | 공표 반올림값 기준 건설 용량 **+19.69%** | 발표 판본 간 개정·원전 전반과 SMR 범위 차이. 기존 운영설비 2025년 377.1 GW(e)·2024년 약 377 GW(e)와도 구분 | `PROXY_SCOPE_LIMITED / SERIES_REVIEW` |
| 방산 | SIPRI / 세계 실질 군사비 | 2025년 **2,887십억 USD(당해 명목)**, 실질 YoY 증가율 **+2.9%** | **2024년 +9.7% → 2025년 +2.9%**, 성장률 가속도 **−6.8%p** | 2026년 개정판의 2024년 성장률을 사용. 2025년 금액과 2024년 금액을 직접 나누어 실질 증가율 계산 금지 | `PARTIAL_QUANT / RIGHTS_LIMITED_PUBLIC` |
| 핀테크 | Federal Reserve Financial Services / FedNow 분기 결제 건수 | **2026 Q3 6,376,467건 / 2025 Q3 2,506,002건** | YoY **+154.45%**; 2026 Q2 YoY **+134.54%** → 가속도 **+19.91%p** | FedNow만 나타내는 협소한 시장이며 2023년 개시 초기 저기저효과와 Q3 일부기간 자료 주의 | `PROXY_SCOPE_LIMITED` |
| 사이버보안 | ENISA / 조사대상 기업의 IT 예산 대비 보안 예산 | 2025 NIS Investments 보고: 조사대상 예산 비중 **약 9%** | 산업 매출 성장률로 환산 **불가** | 원조사 기간·표본 변경·평균/중앙값·회계연도 연속성을 검증해야 함 | `PROXY_SCOPE_LIMITED / PARTIAL_QUANT` |
| 클라우드·SaaS | Eurostat / EU 기업의 유료 클라우드 사용 비율 | **2025년 52.7%**, 2023년 **45.3%**(발표된 7.4%p 차이의 역산) | **2023→2025 +7.4%p**, 연평균 단순 변화 **+3.7%p/년** | 2년 간격을 1년 YoY로 표시하면 안 됨. 2021년 등을 동일 최신 판본으로 확보한 뒤 가속도 계산 | `PARTIAL_QUANT / PROXY_SCOPE_LIMITED` |

**해석 주의:** 테마 산업의 정확한 범위와 기관이 측정한 일부 지표의 범위는 다를 수 있다. 특히 FDA, FedNow, ENISA, IAEA의 전체 원전, Eurostat의 EU 도입률은 테마 전체 기업의 수익성과 동일하지 않다. 그러나 이 제한은 **해당 실측값의 설명 범위**이며, 테마 탈락 또는 0점 사유가 아니다.

## 2. 주요 계산 검산

- FDA 2025: `(46/50−1)×100 = −8.00%`; 2024: `(50/55−1)×100 = −9.09%`; `a=+1.09%p`.
- FedNow 2026 Q3: `(6,376,467/2,506,002−1)×100 = +154.45%`; 2026 Q2: `(4,997,811/2,130,889−1)×100 = +134.54%`; `a=+19.91%p`.
- IAEA 건설중 설비: `(77.2/64.5−1)×100 = +19.69%` (각 보고서의 반올림된 값; 동일판본 검증 필요).
- Eurostat: `52.7−45.3 = +7.4%p`(2년 변화). `7.4/2 = +3.7%p/년`은 연평균 설명값이고 **실측 연간 YoY가 아니다**.
- SIPRI: 동일 2026년 보고서가 밝힌 `g_2024=+9.7%, g_2025=+2.9%`로 `a=−6.8%p`.

## 3. 출처 — 모두 공식 기관 자료

| 기관 | 공식 발표·시계열 링크 | 발표/관측 범위 | 접근·재사용 확인사항 |
|---|---|---|---|
| IEA | [Key Questions on Energy and AI](https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary), [2015~2025 차트](https://www.iea.org/data-and-statistics/charts/data-centre-electricity-consumption-2015-2025), [2024 기준](https://www.iea.org/reports/energy-and-ai/executive-summary) | 2025 관측·2026 발표 | 페이지는 CC BY 4.0 표시. 차트는 CSV 다운로드 불가 명시. |
| IFR | [2026 보도자료](https://ifr.org/news/five-million-robots-now-operate-in-factories-globally/), [2026 보고서 소개](https://ifr.org/post), [2025 보도자료](https://ifr.org/ifr-press-releases/global-robot-demand-in-factories-doubles-over-10-years) | 2025 연간·2026.09 발표 | 원시 장기 자료와 별도의 World Robotics 이용약관 확인 필요. |
| CPUC | [AV Quarterly Reporting](https://www.cpuc.ca.gov/regulatory-services/licensing/transportation-licensing-and-analysis-branch/autonomous-vehicle-programs/quarterly-reporting) | 2026 Q2까지 게시 확인 | 일부 필드 redacted. 2025년부터 분기 정의 달라짐. |
| FDA CDER | [2025 승인](https://www.fda.gov/drugs/novel-drug-approvals-fda/novel-drug-approvals-2025), [2024 승인](https://www.fda.gov/drugs/novel-drug-approvals-fda/novel-drug-approvals-2024), [2023 승인](https://www.fda.gov/drugs/novel-drug-approvals-fda/novel-drug-approvals-2023) | 2023~2025 확정 연간 | 정의는 CDER 신규 의약품 승인, CBER/전체 신약 매출 아님. |
| IAEA | [2025 데이터·2026 발표](https://www.iaea.org/newscenter/pressreleases/iaea-projects-global-nuclear-power-capacity-could-triple-by-2060-continuing-rising-trend), [2026 공식 해설](https://www-pub.iaea.org/MTCD/publications/PDF/PubID-16138-PAT-019_web.pdf), [2024 데이터](https://www.iaea.org/sites/default/files/gc/gov-inf-2025-8-gc69-inf-4.pdf) | 연말 2024·2025 | PRIS의 동일 시점·운영/건설 분류 변경 여부 확인. |
| SIPRI | [2025 Fact Sheet(2026 판본)](https://www.sipri.org/publications/2026/sipri-fact-sheets/trends-world-military-expenditure-2025), [Military Expenditure Database](https://www.sipri.org/databases/milex) | 1988~2025 세계 합계 | **SIPRI 데이터의 상업 이용은 별도 허가·계약 필요**. 개인 연구와 외부 공개를 구분. |
| Fed Reserve | [FedNow Volume and Value Statistics](https://www.frbservices.org/resources/financial-services/fednow-service-resources/fednow-service-volume-value-statistics/) | 마지막 갱신 2026-10-20, 2026 Q3 포함 | 2023 Q3는 불완전한 분기임을 기관이 명시. |
| ENISA | [NIS Investments 2025](https://www.enisa.europa.eu/sites/default/files/2025-12/NIS%20Investments%202025%20-%20Main%20report.pdf), [ENISA 소개 기사](https://www.enisa.europa.eu/news/whats-driving-cybersecurity-investments-and-where-lie-the-challenges) | 2025 보고서 | 보고서 본문 CC BY 4.0, 도표/외부 인용/표본 정의는 별도 확인. |
| Eurostat | [2025 발표 기사](https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20260203-1), [원데이터 코드 `isoc_cicce_use`](https://ec.europa.eu/eurostat/databrowser/view/isoc_cicce_use/default/table?lang=en) | 2025·2023 | EU 기업·유료 서비스 보급률. 데이터셋의 동일 분류·구성 재조회 필요. |

## 4. 실제 G/F/D/M에 앞선 검증 조건

1. 각 주지표의 **동일 개정판 역사 원시계열**을 확보하고 실제 비교 표본 수(`growthHistoryCount`, `accelerationHistoryCount`)를 계산. 과거에 공개되지 않았던 수정값으로 과거 판단을 백테스트하지 않음.
2. 2025년부터 CPUC 분기 규격 변경, IAEA 운영·건설 구분, ENISA 표본 변동, FDA의 좁은 대표성 등은 각각 데이터 품질 상태로 추적.
3. ZGMINI 기존 공탐 F는 **현재 운영 관측일·확정/잠정 여부를 확인하고 읽기 전용**으로만 조회. 이번 웹 검색에서 해당 도메인이 접근되지 않아 **F의 최신 수치를 확보하지 못함**. 오래된 저장 점수로 대체하지 않음.
4. R2 제안의 `G1/G2=60/40`, `M=70%×G+30%×max(0,G−F)`, 성장 부호 보정 및 최소 과거 표본 수는 **검증·사용자 승인 전**. 따라서 9개 M/순위는 **전부 `UNRANKED_REVIEW`**로 남김.
5. 뉴스·AI 해석은 실측 계량에 가산하지 않음. 유료 기사·내부자 이메일·금지 규제당국 문서/복제본 이용 없음.

## 5. 이번 조사에서 변하지 않은 항목

- 03단계 통과 테마 9개와 기존 공탐 산식·점수·ETF는 재심사/수정하지 않았다.
- GitHub commit·PR, Cloudflare 배포, Windows CMD 실행, Provider, 스케줄러, 로컬 DB, 실제 주문은 수행하지 않았다.
- 본 문서는 04단계 원천자료 조사 1차 결과이며 정식 매력도 점수 또는 특정 테마의 투자 추천이 아니다.

