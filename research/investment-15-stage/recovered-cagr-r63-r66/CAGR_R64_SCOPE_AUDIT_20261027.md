# ZGMINI CAGR R64 — 21개 산업·테마 원문 시장범위 비교감사

- 감사 기준일: 2026-10-27 KST
- 상태: `SOURCE_SCOPE_GROUPS_AUDITED / FINAL_CAGR_NOT_APPROVED`
- 범위: 21개 주제 × 3개 발행사 = 63개 슬롯. 산업 11개는 GICS 섹터 이름, 테마 10개는 별도 산업테마.
- 원문 CAGR 검증은 R63 시점 58/63. R64에서는 **공식 보고서 URL 60/60 웹 열람**으로 문서 시장 정체성을 대조했다. 웹 열람은 검색 제공자의 크롤링본일 수 있으므로 **R64 신규 직접 HTTP GET 60건으로 보고하지 않는다**.
- 2026-10-27 R63에서 수행한 직접 GET 60건의 `UTC·SHA256·원문 증거`는 R63 원장에 보존. R64는 수치를 변경·재활용해 최신 측정이라고 주장하지 않는다.
- PC Ollama 교차확인=미실시; 3회 반복 측정=미실시; GICS 섹터 확정 CAGR=미산출; 배포/DB/PC 런타임 변경=없음.
- 감사의 1차 목표는 **발행사 보고서의 시장 이름·주요 수익 대상이 동일한지 후보군 분리**다. 그룹명 일치가 곧 통계적 모집단 동등성·직접 평균 승인이라는 뜻은 아니다.

## 요약

- 출처 확인: 60/60 보고서 링크 열람. 원문 CAGR: 58/63 검증(기존 R63 값 보존), 미확정 5/63.
- 같은 **시장명 그룹**에서 검증된 출처가 2개 이상인 주제: 18/21. 나머지 3/21은 동등한 출처 2개 미확보.
- 특히 GICS 11개 섹터의 명칭과 개별 세계시장 매출 전망은 서로 다른 분류체계다. 소재=첨단소재, 임의소비재=승용차처럼 대체되지 않는다.
- R64의 비교 후보는 최종 CAGR 산식에 자동 편입하지 않는다. 원문 시장 규모·수익 경계·상품 분할·전망 기간 정합성 2차 검증을 거친 뒤 집계 승인.

## 21개 주제별 비교 후보

| 주제 | 주된 동일 명칭 그룹(검증 출처 수) | 판정 및 보완사항 |
|---|---|---|
| 1. 정보기술 | 2매체 이상 그룹 없음 | TBRC는 통신 포함; GICS 정보기술 분류와 경계 불일치. 단일 공통시장 없음. |
| 2. 커뮤니케이션 서비스 | `TELECOM`(3) | 3매체 통신시장 후보; GICS 커뮤니케이션 서비스의 미디어·엔터테인먼트 제외. |
| 3. 임의소비재 | `PASSENGER_CARS`(3) | 승용차 시장 3매체 후보; GICS 임의소비재 전체는 아님. |
| 4. 산업재 | `INDUSTRIAL_MACHINERY`(2) | 산업기계 2매체 비교 후보, 공작기계는 더 좁은 시장. |
| 5. 금융 | `RETAIL_BANKING`(2) | 금융서비스 광역시장과 소매은행 2매체를 같은 평균에 혼합 금지. |
| 6. 유틸리티 | `POWER_TRANSMISSION`(2) | 유틸리티 전체와 전력 송배전은 다름. TBRC 메타데이터 충돌 원장 유지. |
| 7. 헬스케어 | `HEALTHCARE_SERVICES`(2) | 의료서비스 2매체 비교 후보. 병원서비스 5.84/5.99% 충돌 해소 전 제외. |
| 8. 소재 | `ADVANCED_MATERIALS`(3) | 첨단소재 3매체 후보. GICS 소재 전체(범용 소재·광업 등)와 동일시 금지. |
| 9. 에너지 | `OIL_AND_GAS`(2) | 에너지 섹터의 석유·가스 부문 2매체만 확보. |
| 10. 필수소비재 | 2매체 이상 그룹 없음 | 주식(식품) 시장과 FMCG는 동일 모집단이 아님. 비교가능 2매체 확보 필요. |
| 11. 부동산 | `REAL_ESTATE_BROAD`(3) | 동명칭 3매체 후보이나 매출·거래·자산가치 기준과 REIT 포함 여부 추가 확인. |
| 12. 로봇·자동화 | `ROBOTICS_CORE`(2) | 로봇 2매체는 잠정 비교 후보. 로봇기술/로봇의 하드웨어·서비스 구성 추가 확인. |
| 13. 클라우드·SaaS | `CLOUD_COMPUTING`(3) | 클라우드 3매체 후보이며 SaaS 전체와 완전 동의어 아님. |
| 14. 자율주행 | `AUTONOMOUS_VEHICLES`(3) | 자율주행차 3매체 범위 일치 후보. 자동화 단계/서비스 포함 여부 추가 검증. |
| 15. 원전·SMR | 2매체 이상 그룹 없음 | 서로 다른 3개 모집단. 원전·SMR 하나의 CAGR로 단순 평균 금지. |
| 16. 방산 | `DEFENSE_ELECTRONICS`(2) | 방산 전체와 방산 전자장비 2매체는 분리. |
| 17. 핀테크 | `FINTECH_BLOCKCHAIN`(2) | 블록체인 분야 2매체 후보이며 핀테크 전체 아님. Precedence 기간 충돌 유지. |
| 18. 사이버보안 | `CYBERSECURITY`(3) | 3매체 사이버보안 시장 후보. 매출 규모/시장 세분화 동등성 점검. |
| 19. 바이오·신약 | `BIOTECH_TOTAL`(2) | 바이오 서비스와 바이오기술 산업 규모 혼합 금지; 신약시장까지 모두 포함하지 않음. |
| 20. 데이터센터·전력 | `DATA_CENTER`(3) | 3매체 데이터센터 후보. 전력 수요/전력 시장 성장률은 별개. |
| 21. 우주·위성 | `SATELLITES`(3) | 위성 3매체 후보. 우주 전체 산업 CAGR 아님; Precedence 미국 하위절 오류 표시 유지. |

## 전체 63개 시장 정의·원문 상태

| 번호 | 시장 | 발행사 | 보고서 대상 시장 | 시장명 그룹 | 주제 적합성 | CAGR | 기간 | 원문상태 | 링크 |
|---:|---|---|---|---|---|---:|---|---|---|
| 1 | 정보기술 | TBRC | IT·하드웨어·통신·SW 복합 | `IT_EXTENDED` | 경계혼합 | 8.3% | 2026-2030 | `CONSISTENT` | [원문](https://www.thebusinessresearchcompany.com/report/information-technology-global-market-report) |
| 1 | 정보기술 | SkyQuest | IT 서비스 | `IT_SERVICES` | 부분시장 | 9.6% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/it-services-market) |
| 1 | 정보기술 | Precedence | 미선정 | — | 미확정 | 미확정 | — | `OFFICIAL_REPORT_NOT_SELECTED` | — |
| 2 | 커뮤니케이션 서비스 | TBRC | 통신 | `TELECOM` | 부분시장 | 5.3% | 2026-2030 | `CONSISTENT` | [원문](https://www.thebusinessresearchcompany.com/report/telecom-global-market-report) |
| 2 | 커뮤니케이션 서비스 | SkyQuest | 통신 | `TELECOM` | 부분시장 | 6.2% | 2026-2033 | `SKYQUEST_GLOBAL_METADATA_OPENING_VERIFIED` | [원문](https://www.skyquestt.com/report/telecommunication-market) |
| 2 | 커뮤니케이션 서비스 | Precedence | 통신 | `TELECOM` | 부분시장 | 6.03% | 2026-2035 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.precedenceresearch.com/telecommunication-market) |
| 3 | 임의소비재 | TBRC | 승용차 | `PASSENGER_CARS` | 부분시장 | 7.4% | 2026-2030 | `RESOLVED_HISTORIC_RATE_MISLABEL` | [원문](https://www.thebusinessresearchcompany.com/report/passenger-car-global-market-report) |
| 3 | 임의소비재 | SkyQuest | 승용차 | `PASSENGER_CARS` | 부분시장 | 5.42% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/passenger-cars-market) |
| 3 | 임의소비재 | Precedence | 승용차 | `PASSENGER_CARS` | 부분시장 | 5.57% | 2026-2035 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.precedenceresearch.com/passenger-cars-market) |
| 4 | 산업재 | TBRC | 산업기계 | `INDUSTRIAL_MACHINERY` | 부분시장 | 6.9% | 2026-2030 | `CONSISTENT` | [원문](https://www.thebusinessresearchcompany.com/report/industrial-machinery-global-market-report) |
| 4 | 산업재 | SkyQuest | 산업기계 | `INDUSTRIAL_MACHINERY` | 부분시장 | 4.2% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/industrial-machinery-market) |
| 4 | 산업재 | Precedence | 공작기계 | `MACHINE_TOOLS` | 하위세분 | 5.94% | 2026-2035 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.precedenceresearch.com/machine-tools-market) |
| 5 | 금융 | TBRC | 금융서비스 전체 | `FINANCIAL_SERVICES` | 폭넓은 관련시장 | 7.3% | 2026-2030 | `RESOLVED_HISTORIC_RATE_MISLABEL` | [원문](https://www.thebusinessresearchcompany.com/report/financial-services-global-market-report) |
| 5 | 금융 | SkyQuest | 소매은행 | `RETAIL_BANKING` | 부분시장 | 6.7% | 2026-2033 | `SKYQUEST_GLOBAL_METADATA_OPENING_VERIFIED` | [원문](https://www.skyquestt.com/report/retail-banking-market) |
| 5 | 금융 | Precedence | 소매은행 | `RETAIL_BANKING` | 부분시장 | 6% | 2026-2035 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.precedenceresearch.com/retail-banking-market) |
| 6 | 유틸리티 | TBRC | 유틸리티 | `UTILITIES` | 폭넓은 관련시장 | 6.1% | 2026-2030 | `NARRATIVE_VERIFIED_METADATA_CONFLICT` | [원문](https://www.thebusinessresearchcompany.com/report/utilities-global-market-report) |
| 6 | 유틸리티 | SkyQuest | 전력 송배전 | `POWER_TRANSMISSION` | 부분시장 | 4.4% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/electricity-transmission-and-distribution-market) |
| 6 | 유틸리티 | Precedence | 전력 송배전 | `POWER_TRANSMISSION` | 부분시장 | 3.91% | 2026-2034 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.precedenceresearch.com/power-transmission-and-distribution-market) |
| 7 | 헬스케어 | TBRC | 의료서비스 | `HEALTHCARE_SERVICES` | 부분시장 | 4.9% | 2026-2030 | `CONSISTENT` | [원문](https://www.thebusinessresearchcompany.com/report/healthcare-service-global-market-report) |
| 7 | 헬스케어 | SkyQuest | 의료서비스 | `HEALTHCARE_SERVICES` | 부분시장 | 7.42% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/healthcare-services-market) |
| 7 | 헬스케어 | Precedence | 병원서비스 | `HOSPITAL_SERVICES` | 충돌보류 | 미확정 | — | `GLOBAL_CAGR_CONFLICT` | [원문](https://www.precedenceresearch.com/hospital-services-market) |
| 8 | 소재 | TBRC | 첨단소재 | `ADVANCED_MATERIALS` | 부분시장 | 8.1% | 2026-2030 | `RESOLVED_HISTORIC_RATE_MISLABEL` | [원문](https://www.thebusinessresearchcompany.com/report/advanced-materials-global-market-report) |
| 8 | 소재 | SkyQuest | 첨단소재 | `ADVANCED_MATERIALS` | 부분시장 | 6.6% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/advanced-materials-market) |
| 8 | 소재 | Precedence | 첨단소재 | `ADVANCED_MATERIALS` | 부분시장 | 6.21% | 2026-2035 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.precedenceresearch.com/advanced-materials-market) |
| 9 | 에너지 | TBRC | 석유·가스 | `OIL_AND_GAS` | 부분시장 | 5.4% | 2026-2030 | `CONSISTENT` | [원문](https://www.thebusinessresearchcompany.com/report/oil-and-gas-global-market-report) |
| 9 | 에너지 | SkyQuest | 석유·가스 | `OIL_AND_GAS` | 부분시장 | 4.7% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/oil-and-gas-market) |
| 9 | 에너지 | Precedence | 미선정 | — | 미확정 | 미확정 | — | `OFFICIAL_REPORT_NOT_SELECTED` | — |
| 10 | 필수소비재 | TBRC | 주식(식품) | `STAPLE_FOOD` | 부분시장 | 6.1% | 2026-2030 | `RESOLVED_HISTORIC_RATE_MISLABEL` | [원문](https://www.thebusinessresearchcompany.com/report/staple-food-global-market-report) |
| 10 | 필수소비재 | SkyQuest | FMCG·일용소비재 | `FMCG` | 시장범위상이 | 3.8% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/fmcg-market) |
| 10 | 필수소비재 | Precedence | 미선정 | — | 미확정 | 미확정 | — | `OFFICIAL_REPORT_NOT_SELECTED` | — |
| 11 | 부동산 | TBRC | 부동산 시장 | `REAL_ESTATE_BROAD` | 폭넓은 관련시장 | 7.2% | 2026-2030 | `RESOLVED_HISTORIC_RATE_MISLABEL` | [원문](https://www.thebusinessresearchcompany.com/report/real-estate-global-market-report) |
| 11 | 부동산 | SkyQuest | 부동산 시장 | `REAL_ESTATE_BROAD` | 폭넓은 관련시장 | 5.5% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/real-estate-market) |
| 11 | 부동산 | Precedence | 부동산 시장 | `REAL_ESTATE_BROAD` | 폭넓은 관련시장 | 5.47% | 2026-2035 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.precedenceresearch.com/real-estate-market) |
| 12 | 로봇·자동화 | TBRC | 로봇·자동화 | `ROBOTICS_AUTOMATION` | 확장시장 | 21% | 2026-2030 | `CONSISTENT` | [원문](https://www.thebusinessresearchcompany.com/report/robotics-and-automation-market-global-report) |
| 12 | 로봇·자동화 | SkyQuest | 로봇 시장 | `ROBOTICS_CORE` | 부분시장 | 17% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/robotics-market) |
| 12 | 로봇·자동화 | Precedence | 로봇기술 | `ROBOTICS_CORE` | 부분시장 | 14.4% | 2026-2035 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.precedenceresearch.com/robotics-technology-market) |
| 13 | 클라우드·SaaS | TBRC | 클라우드 컴퓨팅 | `CLOUD_COMPUTING` | 부분시장 | 15.6% | 2026-2030 | `RESOLVED_HISTORIC_RATE_MISLABEL` | [원문](https://www.thebusinessresearchcompany.com/report/cloud-computing-global-market-report) |
| 13 | 클라우드·SaaS | SkyQuest | 클라우드 컴퓨팅 | `CLOUD_COMPUTING` | 부분시장 | 19.51% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/cloud-computing-market) |
| 13 | 클라우드·SaaS | Precedence | 클라우드 컴퓨팅 | `CLOUD_COMPUTING` | 부분시장 | 20.61% | 2026-2035 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.precedenceresearch.com/cloud-computing-market) |
| 14 | 자율주행 | TBRC | 자율주행차 | `AUTONOMOUS_VEHICLES` | 직접대상후보 | 28.1% | 2026-2030 | `CONSISTENT` | [원문](https://www.thebusinessresearchcompany.com/report/autonomous-vehicle-global-market-report) |
| 14 | 자율주행 | SkyQuest | 자율주행차 | `AUTONOMOUS_VEHICLES` | 직접대상후보 | 29.7% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/autonomous-vehicles-market) |
| 14 | 자율주행 | Precedence | 자율주행차 | `AUTONOMOUS_VEHICLES` | 직접대상후보 | 34.84% | 2026-2035 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.precedenceresearch.com/autonomous-vehicle-market) |
| 15 | 원전·SMR | TBRC | 원자로 | `NUCLEAR_REACTOR` | 부분시장 | 5.5% | 2026-2030 | `CONSISTENT` | [원문](https://www.thebusinessresearchcompany.com/report/nuclear-reactor-global-market-report) |
| 15 | 원전·SMR | SkyQuest | 원자로 건설 | `NUCLEAR_CONSTRUCTION` | 부분시장 | 1.8% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/nuclear-reactor-construction-market) |
| 15 | 원전·SMR | Precedence | 원자력 발전 | `NUCLEAR_POWER` | 부분시장 | 1.62% | 2026-2035 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.precedenceresearch.com/nuclear-power-market) |
| 16 | 방산 | TBRC | 방산 전체 | `DEFENSE_TOTAL` | 폭넓은 관련시장 | 8% | 2026-2030 | `RESOLVED_HISTORIC_RATE_MISLABEL` | [원문](https://www.thebusinessresearchcompany.com/report/defense-global-market-report) |
| 16 | 방산 | SkyQuest | 방산 전자장비 | `DEFENSE_ELECTRONICS` | 부분시장 | 5% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/defense-electronics-market) |
| 16 | 방산 | Precedence | 방산 전자장비 | `DEFENSE_ELECTRONICS` | 부분시장 | 5.03% | 2026-2035 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.precedenceresearch.com/defense-electronics-market) |
| 17 | 핀테크 | TBRC | 핀테크 블록체인 | `FINTECH_BLOCKCHAIN` | 부분시장 | 42.3% | 2026-2030 | `RESOLVED_HISTORIC_RATE_MISLABEL` | [원문](https://www.thebusinessresearchcompany.com/report/fintech-blockchain-global-market-report) |
| 17 | 핀테크 | SkyQuest | 핀테크 블록체인 | `FINTECH_BLOCKCHAIN` | 부분시장 | 44.4% | 2026-2033 | `REPORT_REGION_GLOBAL_CAGR_CONFIRMED` | [원문](https://www.skyquestt.com/report/fintech-blockchain-market) |
| 17 | 핀테크 | Precedence | 핀테크 블록체인 | `FINTECH_BLOCKCHAIN` | 충돌보류 | 미확정 | — | `GLOBAL_RATE_CONFIRMED_PERIOD_CONFLICT` | [원문](https://www.precedenceresearch.com/fintech-blockchain-market) |
| 18 | 사이버보안 | TBRC | 사이버보안 | `CYBERSECURITY` | 직접대상후보 | 11.8% | 2026-2030 | `CONSISTENT` | [원문](https://www.thebusinessresearchcompany.com/report/cybersecurity-global-market-report) |
| 18 | 사이버보안 | SkyQuest | 사이버보안 | `CYBERSECURITY` | 직접대상후보 | 15.71% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/cyber-security-market) |
| 18 | 사이버보안 | Precedence | 사이버보안 | `CYBERSECURITY` | 직접대상후보 | 12.37% | 2026-2035 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.precedenceresearch.com/cyber-security-market) |
| 19 | 바이오·신약 | TBRC | 바이오 기술 서비스 | `BIOTECH_SERVICES` | 부분시장 | 12.4% | 2026-2030 | `RESOLVED_HISTORIC_RATE_MISLABEL` | [원문](https://www.thebusinessresearchcompany.com/report/biotechnology-services-global-market-report) |
| 19 | 바이오·신약 | SkyQuest | 바이오테크 시장 | `BIOTECH_TOTAL` | 부분시장 | 14.96% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/biotechnology-market) |
| 19 | 바이오·신약 | Precedence | 바이오테크 시장 | `BIOTECH_TOTAL` | 부분시장 | 13.61% | 2026-2035 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.precedenceresearch.com/biotechnology-market) |
| 20 | 데이터센터·전력 | TBRC | 데이터센터 | `DATA_CENTER` | 부분시장 | 9.2% | 2026-2030 | `RESOLVED_HISTORIC_RATE_MISLABEL` | [원문](https://www.thebusinessresearchcompany.com/report/data-center-global-market-report) |
| 20 | 데이터센터·전력 | SkyQuest | 데이터센터 | `DATA_CENTER` | 부분시장 | 11.51% | 2026-2033 | `SKYQUEST_GLOBAL_METADATA_OPENING_VERIFIED` | [원문](https://www.skyquestt.com/report/data-center-market) |
| 20 | 데이터센터·전력 | Precedence | 데이터센터 | `DATA_CENTER` | 부분시장 | 11.06% | 2026-2035 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.precedenceresearch.com/data-center-market) |
| 21 | 우주·위성 | TBRC | 위성 | `SATELLITES` | 부분시장 | 5.5% | 2026-2030 | `CONSISTENT` | [원문](https://www.thebusinessresearchcompany.com/report/satellites-global-market-report) |
| 21 | 우주·위성 | SkyQuest | 위성 | `SATELLITES` | 부분시장 | 12.7% | 2026-2033 | `GLOBAL_LITERAL_CONFIRMED` | [원문](https://www.skyquestt.com/report/satellite-market) |
| 21 | 우주·위성 | Precedence | 위성 | `SATELLITES` | 부분시장 | 7.97% | 2026-2035 | `GLOBAL_MAIN_VERIFIED_US_SECTION_EDITORIAL_CONFLICT` | [원문](https://www.precedenceresearch.com/satellite-market) |

## 후속 게이트

1. **R64-2 세부 정의감사:** 후보 그룹이 같은지 보고서 Market Definition, Segments, 매출/자산/거래 규모 기준, 기준연도·예측연도를 출처별로 비교한다. `표제동일`만으로 PASS하지 않는다.
2. **R65 누락 보완:** 정보기술/Precedence, 에너지/Precedence, 필수소비재/Precedence는 동일 모집단이 확인되는 공식 보고서 발견 시만 채택한다. 헬스케어/Precedence 5.84 vs 5.99%, 핀테크/Precedence 2025–34 vs 2026–34 충돌은 정정 전 NULL 유지.
3. **R66 모델 검증:** 이용 가능한 PC Ollama 승인 경로에서 워밍업 1회+실측 3회. 모델은 미확정 숫자를 생성하지 못하며 원문 후보 선택·범위만 재점검.
4. **R67 통합:** 비교 가능한 **동일 시장 그룹 내** 독립 출처만 산술평균. N·기간 범위·범위 격차·출처 링크 동시 출력. 대표 하위시장 평균은 GICS 전체 섹터 성장률이나 복합 테마 성장률로 표시하지 않는다.
5. **R68 기준 저장:** 판단 로그·결과의 GitHub 연구 브랜치 보존. main 선택 회수·사이트 연결·배포는 별도 승인.

## 근거 및 현 상태

- [MSCI/S&P 공식 GICS 섹터 정의](https://www.spglobal.com/spdji/en/landing/topic/gics/) — 기업 업종 분류 11섹터와 보고서 수익시장 구분.
- [TBRC Information Technology](https://www.thebusinessresearchcompany.com/report/information-technology-global-market-report) — IT Services, Computer Hardware, Telecom, Software Products 포함. Telecom은 GICS Communication Services 쪽.
- [SkyQuest Nuclear Reactor Construction](https://www.skyquestt.com/report/nuclear-reactor-construction-market) 및 [Precedence Nuclear Power](https://www.precedenceresearch.com/nuclear-power-market) — 서로 다른 원전시장 정의.
- [Precedence Hospital Services](https://www.precedenceresearch.com/hospital-services-market) 및 [Precedence FinTech Blockchain](https://www.precedenceresearch.com/fintech-blockchain-market) — 미해결 원문 충돌.
- [R63 연구 기준](CAGR_R63_21_RESEARCH_PLAYBOOK_20261027.md) · [R63 출처 원장](CAGR_R63_21_SOURCE_MATRIX_20261027.md).
- JSON 머신판에는 슬롯별 원문 URL, R63 수집 UTC/SHA256, 시장명 그룹, 값, 상태, R64 웹 열람 여부가 보존된다.

**변경 경계:** 본 문서는 연구 근거이며 `main`·PC·Cloudflare·D1·시장 심리·공탐 산식을 변경하지 않는다.
