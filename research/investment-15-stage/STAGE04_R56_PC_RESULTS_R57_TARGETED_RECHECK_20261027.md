# Stage04 R56 실측 및 R57 후속조치 — 2026-10-27

## R56 PC 3주제 병렬 관측 사실

첨부된 PC 원본: `R56_TOPICS05_06_07_TRIPLE_RESULT.txt`, `.json`,
`_HISTORY.ndjson`. 사후 진단은 이 실제 기록만 사용하고, 과거 R35의
저장된 성장률 수치를 독립 조사로 재사용하지 않았다.

- ⑤ 금융, ⑥ 유틸리티, ⑦ 헬스케어 주제 작업을 동시에 시작했으며 세 작업의
  겹치는 실행 시간은 측정 3회 각각 3,726 / 3,466 / 3,860ms였다.
- Ollama는 공유 **직렬 큐**였다. 이는 3개 모델 추론이 동시에 실행됐다는 의미가 아니다.
- 각 1회 예열과 3회 측정; 전체 실행 4,838 / 4,551 / 5,048ms,
  측정 중앙값 4,838ms.
- ⑤ 중앙값 4,297ms, 변동 17.5%, 결과 일치, 유효 3/3 매체.
- ⑥ 중앙값 3,726ms, 변동 7.0%, 결과 일치, 유효 2/3 매체.
- ⑦ 중앙값 4,549ms, 변동 6.3%, 결과 일치, 유효 3/3 매체.
- 이번 작업만으로 2개와 3개 병렬 수행의 순수 속도 향상을 인과적으로 증명하지는 못한다.

## R56 보고서 성장률 관측 (섹터 확정 CAGR 아님)

| 주제 | 매체 | 보고서 범위 | 미래 전망 성장률 | 기간 | 비고 |
|---|---|---|---:|---|---|
| ⑤ 금융 | TBRC | Financial Services 광범위 시장 | 7.3% | 2026-2030 | 메타데이터 6.8%는 과거율과 검산 일치; 범위 검토 |
| ⑤ 금융 | SkyQuest | Retail Banking 일부시장 | 6.7% | 2026-2033 | 대리지표 |
| ⑤ 금융 | Precedence | Retail Banking 일부시장 | 6.0% | 2026-2035 | 대리지표 |
| ⑥ 유틸리티 | TBRC | Utilities 광범위 시장 | **보류** | 보류 | 하단 표와 미래 본문 불일치 |
| ⑥ 유틸리티 | SkyQuest | Electricity Transmission & Distribution | 4.4% | 2026-2033 | 대리지표 |
| ⑥ 유틸리티 | Precedence | Power Transmission & Distribution | 3.91% | 2026-2034 | 대리지표 |
| ⑦ 헬스케어 | TBRC | Healthcare Services | 4.9% | 2026-2030 | 대리지표 |
| ⑦ 헬스케어 | SkyQuest | Healthcare Services | 7.42% | 2026-2033 | 대리지표 |
| ⑦ 헬스케어 | Precedence | Hospital Services | 5.84% | 2026-2035 | 병원 일부시장, 전체 GICS 진입 차단 |

서로 다른 범위·전망 기간을 곧바로 평균하여 섹터 성장률로 발표하지 않는다.
세 주제 모두 `sector_cagr=null`을 유지한다.

## ⑥ TBRC Utilities의 확인된 원문 불일치

공식 URL: https://www.thebusinessresearchcompany.com/report/utilities-global-market-report

1. 역사 구간: 2025년 7,022.70 → 2026년 7,411.11 (billion USD),
   본문 5.5%, 검산 5.531%.
2. 미래 본문: 2026년 7,411.11 → 2030년 9,392.75 (billion USD),
   본문 6.1%, 검산 6.103%.
3. 원문 하단 요약표: 최종 금액은 9,392.75로 **동일**하나,
   미래 연도를 **2035**, 성장률을 **5.5%**로 표시한다.
4. 기존 R29 검산기는 표의 2035와 본문의 2030을 동일 기간으로 취급할 수
   없어 `INCONSISTENT_REPORT_PERIOD_OR_UNITS`로 보류했다. 보류 자체는 안전한 동작이다.

R57의 예외 확인은 공식 본문 값, 2025~2026 역산, 2026~2030 역산,
하단 표의 모순을 **동시에 증명**하는 경우에만 적용한다.
다른 보고서에 대한 완화 규칙은 만들지 않았다.

R57 PC 재실행 결과는 **아직 수신되지 않았다**. 따라서 R57 통과를
사실처럼 보고하거나 R56 ⑥을 사후 수정하지 않는다.

## 출처 및 접근 경계

- TBRC Financial Services: https://www.thebusinessresearchcompany.com/report/financial-services-global-market-report
- SkyQuest Retail Banking: https://www.skyquestt.com/report/retail-banking-market
- Precedence Retail Banking: https://www.precedenceresearch.com/retail-banking-market
- TBRC Utilities: https://www.thebusinessresearchcompany.com/report/utilities-global-market-report
- SkyQuest Electricity T&D: https://www.skyquestt.com/report/electricity-transmission-and-distribution-market
- Precedence Power T&D: https://www.precedenceresearch.com/power-transmission-and-distribution-market
- TBRC Healthcare Services: https://www.thebusinessresearchcompany.com/report/healthcare-service-global-market-report
- SkyQuest Healthcare Services: https://www.skyquestt.com/report/healthcare-services-market
- Precedence Hospital Services: https://www.precedenceresearch.com/hospital-services-market

BRI 접속 0회. 유료 원문 추가 확보·권한 우회·생산 코드 수정·병합·배포 0회.
