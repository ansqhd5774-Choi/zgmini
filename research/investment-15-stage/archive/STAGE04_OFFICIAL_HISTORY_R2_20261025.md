# 역사적 조사 기록 — 최신 판단용 아님

> 이 파일은 당시 조사 원문을 보존한 아카이브다. **04단계 현재 판단은 `STAGE04_SAME_VINTAGE_VALIDATION_R3_20261025.md` 및 `STAGE04_LIVE_F_AND_SOURCE_GATE_R4_20261025.md`를 우선**한다.
> R1의 FDA 2023=55, 2025 가속 +1.09%p는 혼합 판본 오류이며 R2/R3에서 2023=54, 가속 −0.5926%p로 정정됐다. 이력 수치를 현재 계산이나 운영에 재사용하면 안 된다.

---

# 개인 투자 15단계 — 04단계 공식 산업 시계열 심화 조사 R2

> 조사 기준: 2026-10-25 KST  
> 근거 설계: `INVESTMENT_PROCESS_15_STAGE_PRECISE_IMPLEMENTATION_PLAN_R2_QUANT_20261025.md`  
> 이전 조사: `STAGE04_PRIMARY_SOURCE_RESEARCH_R1_20261025.md`  
> **상태: READ_ONLY / HISTORICAL_SERIES_PARTIAL / UNRANKED_REVIEW / NO_TRADE**  
> 03단계 통과 9개 테마 보존. 기존 ETF·공탐 산식·운영 데이터·저장소·스케줄러·사이트·15개 PDF는 변경하지 않았다. 모든 점수 G1/G2/G/F/D/M은 이번 보고서에서 **미산출/미승인** 상태다.

## 1. 진행 결과 요약

R1의 기관별 *최근 1~3개 관측치*를 넘어, 공식 자료에서 과거 연속값이 공개되어 있는지 조사했다. 값은 원기관의 표시 자릿수와 보고서 판본을 보존한다. **아래의 성장률과 가속도는 자료 검산용 원단위 변화이지 04단계 매력도 순위가 아니다.**

| 03단계 통과 테마 | 공식기관 | 이번에 확인한 원관측 구간 | 최신 관측 성장·변화 | 전기 대비 가속도/변화 | 현재 자료 상태 및 주요 제약 |
|---|---|---|---|---|---|
| 데이터센터·전력 | IEA | 2024~2025 원수치; 2015~2025 그래프 존재 | 2025 **+17% YoY** | — | `PARTIAL_QUANT` · 2015~2025 그래프 원자료 다운로드 미제공 |
| 로봇·자동화 | IFR | **2022~2025 정확 건수**, 2015~2025 그래프는 천 단위 반올림 | 2025 **+11.30% YoY**(제시 원값의 산술) | **+11.15%p**(단, 2024와 이전 연도는 2025 판본, 판본 대조 필요) | `PARTIAL_QUANT / VINTAGE_REVIEW / RIGHTS_REVIEW` |
| 자율주행 | California CPUC | 2025 Q1~2026 Q2 보고 ZIP 게시 | — | — | `PARTIAL_QUANT / REDACTED_OR_UNEXTRACTED` · 2025년 분기 주기 변경 |
| 바이오·신약 | FDA CDER | **2016~2025 동일 2025 판본 10개**; 2015는 구판 별도 참조 | 2025 **−8.00% YoY** | **−0.59%p** | `PROXY_SCOPE_LIMITED / VINTAGE_CORRECTED` · 2023 연간 승인 건수 구판 55→신판 54 정정 |
| 원전·SMR | IAEA PRIS | 2023~2025 연말 건설 중 설비용량 | 2025 **+19.69%**(공표 반올림값 간 계산) | **+14.13%p**(다른 판본 연결의 *잠정 검산*, 정식 연속값으로 승인 불가) | `PROXY_SCOPE_LIMITED / VINTAGE_REVIEW` · 전체 원전 ≠ SMR |
| 방산 | SIPRI | 2024~2025 동일 2026 판본 실질 성장률 | 2025 **+2.9% YoY** | **−6.8%p**(2024 +9.7%) | `RIGHTS_PUBLICATION_RESTRICTED / PARTIAL_QUANT` |
| 핀테크 | FedNow | **2024 Q1~2026 Q3 분기 거래건수 11개** | 2026 Q3 **+154.45% YoY** | **+19.91%p**(직전 Q2 YoY 대비) | `PROXY_SCOPE_LIMITED / LOW_BASE_REVIEW` · FedNow만, 초기 확산효과 |
| 사이버보안 | ENISA | **2020~2024 설문조사 평균 보안예산 비중** | 2024 비중 **9.3%**, 전년 **−0.3%p** | **−2.3%p**(비중 변화의 변화, 시장매출 가속도 아님) | `PROXY_SCOPE_LIMITED / SAMPLE_COMPARABILITY_REVIEW` |
| 클라우드·SaaS | Eurostat | 2021·2023·2025 발표 | 2025 **52.7%**; 공식발표 2023 대비 **+7.4%p/2년** | — | `PROXY_SCOPE_LIMITED / REVISION_REVIEW` · 1년 YoY 아님 |

**이 표는 9/9개 테마에 대한 조사 기록이지 9/9 QUANTIFIED 판정이 아니다.** 동일 개정판의 과거 성장률 분포, 권리, 자료 대표성과 기존 공탐 F를 충족하지 못해 확정 `M`은 9개 모두 `NULL`이다.

## 2. 공식 원관측 시계열 — 재현용

### 2.1 IFR 세계 산업용 로봇 *신규 설치량*

| 관측연도 | 연간 신규 설치(대) | 확인 자료 |
|---|---:|---|
| 2022 | 552,946 | IFR *World Robotics 2025* 요약 (2025 판본) |
| 2023 | 541,302 | IFR *World Robotics 2025* 요약 (2025 판본) |
| 2024 | 542,076 | IFR *World Robotics 2025* 요약 (2025 판본) |
| 2025 | 603,307 | IFR *World Robotics 2026* 요약 (2026 판본) |

- 2024 증가율 `(542076/541302−1)×100 = +0.1430%`.
- 2025 증가율 `(603307/542076−1)×100 = +11.2956%`.
- 최신 증가율 가속도 `+11.1527%p`는 **두 개 판본을 연결한 시험 계산**이며 최신 판본의 2024년 수정 여부 확인 전 확정 입력값이 아니다.
- 2026년 IFR 요약의 2015~2025 차트는 연도별 지역 값이 천 대 단위로 반올림돼 있다. 판매되는 전체 통계 DB 원값과 혼합하지 않는다.
- 출처: [IFR World Robotics 2026 요약 PDF](https://ifr.org/img/worldrobotics/Executive_Summary_WR_2026_-_Industrial_Robots.pdf), [IFR 2025 요약 PDF](https://ifr.org/img/worldrobotics/Executive_Summary_WR_2025_Industrial_Robots.pdf).
- 권리: IFR PDF에는 상업적 재생산·저장·전송의 사전 서면 허락 조건이 명시된다. **상업화·원자료 장기저장·재배포를 허가받았다는 의미가 아니다.**

### 2.2 FDA CDER *신규 의약품 승인 건수*

| 연도 | 건수 | 전년 대비 성장률 |
|---|---:|---:|
| 2015 | 45 | — (2024 구판 별도 참조, **동일판본 비교에서 제외**) |
| 2016 | 22 | — (2025 신판 시계열 시작) |
| 2017 | 46 | +109.09% |
| 2018 | 59 | +28.26% |
| 2019 | 48 | −18.64% |
| 2020 | 53 | +10.42% |
| 2021 | 50 | −5.66% |
| 2022 | 37 | −26.00% |
| 2023 | 54 | +45.95% |
| 2024 | 50 | −7.41% |
| 2025 | 46 | −8.00% |

- **정정:** FDA CDER *2024 보고서*의 2023 수치는 55건, *2025 보고서*의 같은 연도 수치는 **54건**이다. 구판 2023 수치와 신판 2025 수치를 혼합했던 최초 R2 계산을 폐기했다.
- 동일 **2025 보고서** 2016~2025 연속 관측 기준 2025 가속도는 `−8.00−(−7.4074)=−0.5926%p` (감소 폭이 조금 확대됨). **방향이 이전 계산과 반대**이므로 공식 판본 일치 검증은 필수다.
- 동일 2025 판본에서 현 관측 전 성장률 후보: 2017~2024 **8개**, 가속도 후보: 2018~2024 **7개**. 2015(45건)는 구판의 별도 참고값이므로 이 역사 표본에 포함하지 않는다. 최소 표본 수는 **미승인**이다.
- 출처: [FDA CDER 2024 연차보고서 10년 그래프](https://www.fda.gov/media/184967/download), [FDA CDER 2025 연차보고서](https://www.fda.gov/media/190705/download).
- 한계: 신약 출시/승인 건수의 연간 변동성과 승인기관의 제품 범위. 승인 수를 바이오산업 전체 매출 또는 ETF 수익률로 오인하지 않는다.

### 2.3 Federal Reserve Financial Services *FedNow 분기 결제건수*

전부 `settled customer credit transfers`로, 2023년 Q3은 **완전한 분기가 아니므로** 비교 기준에서 제외한다.

| 분기 | 결제건수 | 전년 동분기 대비 |
|---|---:|---:|
| 2024 Q1 | 97,424 | — |
| 2024 Q2 | 156,076 | — |
| 2024 Q3 | 336,487 | — |
| 2024 Q4 | 915,263 | — |
| 2025 Q1 | 1,310,017 | +1,244.66% |
| 2025 Q2 | 2,130,889 | +1,265.29% |
| 2025 Q3 | 2,506,002 | +644.75% |
| 2025 Q4 | 2,466,494 | +169.48% |
| 2026 Q1 | 2,728,510 | +108.28% |
| 2026 Q2 | 4,997,811 | +134.54% |
| 2026 Q3 | 6,376,467 | +154.45% |

- 현재 가속도 `2026 Q3 YoY−2026 Q2 YoY = +19.91%p`.
- 현재 관측 이전의 분기 YoY 비교 후보 수 6개(2025 Q1~2026 Q2), 가속도 비교 후보 수 5개(2025 Q2~2026 Q2). 출시 초기 저기저효과로 자체 백분위가 왜곡될 가능성을 민감도 검증에 포함한다.
- 출처: [FedNow 공식 분기 통계](https://www.frbservices.org/resources/financial-services/fednow-service-resources/fednow-service-volume-value-statistics/) (2026-10-20 갱신).
- 한계: FedNow *단일 결제망* 이용 추이, 전체 핀테크 시장의 매출/침투율은 아님.

### 2.4 ENISA 보안예산 ÷ IT예산 *설문 평균 비중*

| 자료 관측연도(도표) | 평균 비중 |
|---|---:|
| 2020 | 8.8% |
| 2021 | 7.2% |
| 2022 | 7.6% |
| 2023 | 9.6% |
| 2024 | 9.3% |

- 비중 변화: 2023 `+2.0%p`, 2024 `−0.3%p`; 비중 변화의 가속 `−2.3%p`.
- 분자/분모가 각기 변하는 **설문 지출 비율**이므로 원래 산업 매출성장률 `g`를 적용하지 않는다. 원설계 2.7의 보급률·비중 `%p` 별도 처리에 해당한다.
- 출처: [ENISA NIS Investments 2025 보고서, Figure 3](https://www.enisa.europa.eu/sites/default/files/2026-02/NIS%20Investments%202025%20-%20Main%20report.pdf). 2025 *보고서 명칭*을 2025 *관측연도*라고 바꾸지 않았다.
- 한계: 표본·산업 구성 변화가 확인되기 전 가속도는 **자료상 계산일 뿐 산업 실질 성장 판단 아님**.

### 2.5 IAEA PRIS *건설 중 원전 용량*, SIPRI *실질 군사비 증가율*

| 기관 | 관측연도 | 관측값 | 비교·주의 |
|---|---|---|---|
| IAEA | 2023 | **61.1 GW(e), 59기** | 2024년 보고 판본 |
| IAEA | 2024 | **64.5 GW(e), 62기** | 2025년 보고/포스터 판본; 다른 반올림 원문에는 64.4 |
| IAEA | 2025 | **77.2 GW(e), 72기** | 2026년 발표 판본 |
| SIPRI | 2023 | **실질 +6.8%** | 2024년에 공개된 당시 판본; 2026 통일판본과 다를 수 있음 |
| SIPRI | 2024 | **실질 +9.7%** | **2026년 SIPRI Yearbook 판본**. 2025년 발행 구판의 +9.4%와 혼합 금지 |
| SIPRI | 2025 | **실질 +2.9%** | **2026년 SIPRI Yearbook 판본** |

- IAEA 판본 혼합 검산: 2024 `+5.56%`, 2025 `+19.69%`, 가속 `+14.13%p` **잠정**. 연도 간 통일 판본 원자료로 재조회하기 전 `G` 입력 금지. 전체 원전 건설과 SMR은 범위가 다르다.
- SIPRI 동일 2026년 요약판의 2024→2025 실질 성장률 변화 `2.9−9.7=−6.8%p`. 실질 증가율과 서로 다른 연도 명목 달러 값을 나눈 결과를 혼동하지 않는다.
- 출처: [IAEA 2023 보고](https://www.iaea.org/sites/default/files/gc/gc68-inf-4.pdf), [IAEA 2024 PRIS 포스터](https://pris.iaea.org/PRIS/PRIS_poster_2024.pdf), [IAEA 2025 PRIS 설명](https://www.iaea.org/newscenter/pressreleases/iaea-projects-global-nuclear-power-capacity-could-triple-by-2060-continuing-rising-trend), [SIPRI Yearbook 2026 요약](https://www.sipri.org/sites/default/files/2026-06/yb26_summary_en_1.pdf), [SIPRI 데이터베이스](https://www.sipri.org/databases/milex).
- **중요 권리 제약:** [SIPRI 이용약관](https://www.sipri.org/about/terms-and-conditions)은 공개 SIPRI 데이터의 *상업 사용*에 사전 허가 및 로열티 협의를 요구한다. 이번 개인 조사에서 수치와 원문을 확인한 것을 공개·상업용 파생 자료의 자동 사용 승인으로 간주하지 않는다.

### 2.6 IEA·CPUC·Eurostat 추가 확인

- **IEA:** 2025 세계 데이터센터 전력 소비 **약 485TWh / +17%**, 2024 약 **415TWh**. [2015~2025 공식 시각화](https://www.iea.org/data-and-statistics/charts/data-centre-electricity-consumption-2015-2025)는 제공되지만 페이지에 **원자료 다운로드 미제공**이 명시돼 있어 임의 그래프 픽셀에서 과거 수치 생성하지 않는다. [공식 보고서](https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary).
- **CPUC:** [공식 AV 분기 보고 포털](https://www.cpuc.ca.gov/regulatory-services/licensing/transportation-licensing-and-analysis-branch/autonomous-vehicle-programs/quarterly-reporting)에 2025 Q2와 2026 Q2 Waymo Deployment ZIP들이 게시되어 있음. 링크 검증은 완료했지만 ZIP 내부 표는 이번 웹 조회 도구에서 **지원하지 않는 형식**이라 수치 미추출. 2025-01-01부터 달력분기 전환, Waymo 데이터 일부는 `REDACTED`라 공개 실제 총계 확인이 필요. **보고서 게시 사실을 산업성장률로 대체하지 않음.**
- **Eurostat:** [2025 발표](https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20260203-1)에서 EU 기업 유료 클라우드 도입률 **52.7%**, 2023 대비 **+7.4%p / 2년**. [2023 발표](https://ec.europa.eu/eurostat/en/web/products-eurostat-news/w/ddn-20231208-1)는 2023 **45.2%**, [2021 발표](https://ec.europa.eu/eurostat/web/products-eurostat-news/-/DDN-20211209-2)는 약 **42%**. 같은 최신 데이터셋 [`isoc_cicce_use`](https://ec.europa.eu/eurostat/databrowser/view/isoc_cicce_use/default/table?lang=en)에서 2021·2023·2025를 재추출하기 전 과거 수치의 단순 차감으로 2년 가속도를 **확정하지 않는다**. 조사 대상 기업 범위/설문 정의·개정 여부 점검이 남음.

## 3. R2.0 04단계로 넘어가기 위한 남은 필수 검증

| 구분 | 남은 작업 | 검증 기준 |
|---|---|---|
| 역사 정규화 | 산업별 한 *관측시점 이전*에 공개된 성장·가속도 비교 표본 구축 | sample count와 수정판본, 최소 표본 기준을 분리 표시 |
| 공식 원값 | IEA 그래프 원자료, CPUC 비공개/ZIP 집계, IAEA 동일판본 연간 원값, Eurostat 동일판본, IFR 판본 대조 | 자료 미확보는 `NULL`, 가짜 과거값 생성 금지 |
| 대표성 | FDA 승인 건수/IAEA 전체 원전/FedNow 결제망/ENISA 설문/Eurostat EU 보급률의 ETF 테마 대표성 | `PROXY_SCOPE_LIMITED`, 기업 실사로 강제 변경 금지 |
| 공급원 이용권 | 특히 IFR 유료 통계·SIPRI 상업사용 제약과 다른 기관의 파생/보관/재배포 | 개인 연구와 공개·상업 사용 상태 구분 |
| 운영 공탐 F | ZGMINI **실제 최신 Runtime**에서 9개 F의 점수·관측일·잠정/확정 조회 | 이번 인터넷 도구에서 `zgmini.kr` 접속 불가. 과거 R25의 20.79 같은 저장 숫자로 최신 F 대체 금지 |
| 정량 G·M | 같은 지표의 과거 percentile 검증, 표본 문턱, 부호 보정, 60:40·70:30 민감도 | 사용자 승인 전 `UNRANKED_REVIEW`; 실제 순위·운영 적용 금지 |

## 4. 변경·결정 기록

- R1의 값은 누락·오류 진단에만 재사용하고 오늘 공식 자료를 다시 확인했다.
- **신규 확보:** IFR 정확 설치 건수 2022~2024, FDA **2025 판본의 2016~2025** 장기 시계열, FedNow 2024 Q1~2026 Q3 연속 분기, ENISA 2020~2024 도표, IAEA 2023 건설 중 용량.
- **공식 판본 정정:** FDA 2023 신규 의약품 승인 건수는 구판 55건과 신판 54건이 다르다. R2 최초 제출의 2025 가속도 +1.09%p는 잘못된 혼합 판본 계산이며 **동일 2025 판본에서는 −0.59%p**다.
- **발견한 함정:** IFR/IAEA/SIPRI의 수정·발표 판본 차이, FedNow 초기 저기저효과, Eurostat 2023 구판 45.2% 대 2025 발표의 +7.4%p 역산값 45.3%, CPUC 2025 분기 정의 변경과 일부 검열.
- **하지 않음:** 9개 테마 재선정, 외부 기사 주관 점수화, 기존 공탐 감사/변경, G/F/D/M 미승인 점수 출력, GitHub/Cloudflare/DB/스케줄러/공급원 설정/자동주문 변경.

## 5. 바로 다음 진행 단위

1. 현재 확보한 원관측값을 **같은 보고 판본**의 과거값과 대조해 각 테마마다 `X[t]`, `X[t-1]`, `X[t-2]`, `growthHistoryCount`, `accelerationHistoryCount`, `metricScope`, `sourceRevision`을 검증한다.
2. 장기 정규화 표본이 확보 가능한 테마부터 **가중치·최소표본·저기저효과의 민감도**를 계산하되 결과는 `PROPOSED/UNRANKED_REVIEW`로 유지한다.
3. 실제 관측일을 가진 기존 9개 공탐 F를 **읽기 전용**으로 연결해 G 대비 괴리의 계산 가능 여부를 점검한다.
4. 숫자와 권리·범위·결측 사유를 표로 제출한 후 **사용자 승인** 시에만 프로그램 산식·정식 순위 구현 단계로 이동한다.

**최종 상태:** 자료탐색 R2는 전진했지만 **04단계 정량 매력도 계산이 완료된 것은 아니다.** 기존 03단계 자격, 운영값, 사용자 원본 15개 PDF는 변경 없이 유지한다.
