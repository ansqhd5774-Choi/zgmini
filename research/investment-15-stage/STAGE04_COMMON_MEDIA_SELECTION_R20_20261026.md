# 04단계 R20 — 9개 테마 공통 매체 선정·조회 가능성 검증 기준

작성: 2026-10-26 KST. 상태: `SOURCE_DISCOVERY_PARTIAL / APPROVED_COMMON_INDUSTRY_MEDIA=NONE / READ_ONLY / NO_TRADE`.

> **R19의 후속 작업은 산업 수치 확보가 아니다.** 사용자 정정에 따라, 우선 산업별로 매체를 바꾸지 않아도 되는 공통 매체를 탐색하고, 조회 가능 여부 및 이용 기준을 정의한다. 사이트의 공개 기사 발견, 정기 자동 조회 권한, 동일 범위 실측 통계 제공은 세 가지 다른 검증이다. **추가 사용자 정정: 9개를 수동 순회하는 검증은 100개로 확대할 수 없으므로 금지한다.**

## A. 공통 매체 승인 기준 — 제안, 사용자 확인 대상

아래의 **소스 합격 조건**은 향후 산업별 개별 수치 조사를 무한 반복하지 않기 위한 선택 기준이다. 실제 투자 점수 산식/가중치 승인과 무관하다.

| Gate | 검증 대상 | 통과 증거 | 실패/미확인 시 처리 |
|---|---|---|---|
| S1 공통성 | 03단계 승인 테마가 **9개→100개→그 이상** 늘어도 같은 공급자/조회 계약으로 자동 확장 가능한가 | 제공자가 **전체 지표 카탈로그/공통 분류코드/필터 또는 배치 API**를 제공하고, 하나의 응답·일괄 쿼리 결과로 대상 목록과 공급원 전체의 매핑 가능성을 판정 | 테마별 검색엔진 수동 조사, 100개 URL 개별 방문, 개별 사이트 전환은 방식 자체를 불합격 |
| S2 실제 조회 | 일괄 조회 또는 증분 조회가 가능한가 | 일괄/페이지네이션/배치 호출 또는 `updated_since` 등 변경분 경로와 정해진 소스 식별자. 응답 정체성·기간·오류를 구분 | 검색엔진 결과가 여러 개 존재하는 것만으로 `AUTOMATION_PASS` 금지 |
| S3 자동화 권한 | 자동 수집·가공·공개 파생값 사용이 허가됐는가 | 출처 공식 이용약관/데이터셋 라이선스에 상업적 사용·자동 수집·파생 공개·보관 범위의 근거 확인 | 명시적 금지면 `REJECTED`; 불명확하면 `RIGHTS_UNKNOWN`. 우회 수집 금지 |
| S4 측정 적합 | 테마의 **실제 산업 활동/수요**를 관측하는가 | 지표 정의, 지역, 범위, 단위, 표본, 방법론, 관측기간을 표시하며 테마에 직접 대응 | ETF 가격·검색 관심도·설문 비중·단일 업체 활동 등은 `PROXY`, 실제 테마 전체 성장으로 둔갑 금지 |
| S5 시간·판본 | 실제 관측치와 추정·전망치, 개정판을 구별하는가 | 관측기간·발행일·수정시각, 분기/연간 주기, 실제/추정/전망 구별, 동일 범위 비교 가능 | 전망 CAGR을 관측 YoY로 사용 금지. 시계열 짧아도 테마 탈락/0점 처리 금지 |
| S6 실행 안정 | 전 테마를 같은 로직으로 빠르게 읽을 수 있는가 | **테마 수 N에 선형 증가하는 개별 네트워크 조회 없이** 페이지/배치 수와 최대 호출 횟수·지연을 측정, 반복 실행 시 부분 실패와 갱신 누락 분리 | 테마가 100개면 100번 매체 탐색하는 구조는 규모 확장 실패. 무한 재시도·대체 도메인 순회 금지 |

**종합 판정**: `COVERAGE_VERIFIED`, `PUBLIC_READABLE`, `AUTOMATION_AUTHORIZED`, `REUSE_AUTHORIZED`, `INDUSTRY_DIRECT`, `HISTORY_VERIFIED`, `OPERATIONAL_TESTED`는 **각각 따로** 기록. `SELECTED`는 필수 관문이 모두 검증된 경우에만 사용한다. 9개 주제에 페이지가 있다는 것만으로 9/9 실측 또는 라이선스 승인으로 말하지 않는다.

**효율 규칙**: 투자 프로그램은 04단계에서 사전 승인된 **ZGMINI 한 엔드포인트**만 사용. 외부 통일 매체가 발견돼도 투자 프로그램에 테마/티커별 도메인 선택기를 넣지 않는다. 전체를 충족하는 외부 공급자가 없다면 누락된 **필드만** 사용자에게 보고하고, ZGMINI 내부 집계 대상으로 설계·승인받는다. 해당 내부 집계도 합법적 수집 원천 검증은 생략할 수 없다. 원천 확인과 개인투자 04단계 점수화/공개는 별도 승인 과정이다.

### R20.1 필수 확장성·신선도 조건 (사용자 추가 정정)

1. **매체 선정 시 100개 개별 조사 불가**: 후보 매체의 API 문서, 전체 지표 목록, 공통 카테고리·분류 체계, 배치/증분 조회, 약관만 소수 대표 쿼리로 검증한다. 매체가 전체 목록/공통 조회 계약을 제공하지 않으면 그 매체는 대규모 실행에 부적합하다. 테마마다 인터넷에서 새로운 기사를 찾는 자동 루프를 생성하지 않는다.
2. **한 번 읽기·여러 테마 매핑**: ZGMINI 내부에서 허용된 매체의 일괄 자료 1건/제한된 페이지 수를 받아 승인된 동적 테마 목록에 자동 매핑한다. 중복된 데이터를 테마 수만큼 새로 호출하지 않는다. 필요한 경우에도 임의 사이트 추가가 아니라 등록된 출처/필드 계약 변경을 승인받는다.
3. **최신성 보장**: 자료의 `observedAt / publishedAt / sourceStoredAt /checkedAt`을 구분한다. 공급자 발표 주기에 맞춰 **새 판본/변경분만 확인**하고, 신규 발표가 없다면 저장된 관측치의 날짜를 유지하여 `STALE/PARTIAL`로 표시한다. 매일 같은 100건을 수집하거나 1개월간 1→100번 순회한 뒤 다시 1번부터 시작하지 않는다.
4. **확장성 시험**: 외부 실제 자료 대신 가상 목록 `N=9 / 100 / 1,000`으로 일괄 호출 수·페이징·누락·변경분 처리·테마 자동 편입을 검증한다. **가상 데이터 시험은 실제 산업 실측 성공이 아니다.**
5. **예시 API 기능 검증만**: [세계은행 Indicators API 공식 문서](https://datahelpdesk.worldbank.org/knowledgebase/articles/898581)는 한 호출에 복수 지표 코드를 지원하며 최대 60개 지표 제한과 페이지네이션을 명시한다. 이는 '100개를 하나씩 열지 않아도 되는 조회 형태'의 예시지, 세계은행이 우리의 9개 테마 직접 산업수요를 제공한다는 뜻이 아니다. **실제 소스로 선정된 것 아님**.

## B. 통합 매체 후보 사전조사 — 공개 원문/공식 약관

| 후보 | 공개 조회 검증 | 전체 테마 실제 수요/연속 관측 | 자동화·파생 공개 권한 | R20 상태 |
|---|---|---|---|---|
| **Grand View Research** | 테마 연관 보고서 **공개 요약 페이지는 다수 확인**; 아래 9항목 링크 | 현행연도 *시장규모 추정* + 미래 CAGR 다수. 9개의 동일 의미 실제 역사 관측 계열 미검증. 방산·핀테크·바이오는 인접/하위 시장이므로 직접 매핑 미확정 | [공식 이용약관](https://www.grandviewresearch.com/info/terms-of-use) §15(d)에서 체계적·자동화된 추출 금지, [구매/라이선스](https://www.grandviewresearch.com/info/purchase-and-licencing-agreement) §7.4에서 재게시·스크래핑 등 사전 서면 동의 요구 | **`REJECTED_AUTOMATION_RIGHTS`**: 사람의 공개 페이지 열람과 자동 수집은 다름 |
| **Mordor Intelligence** | 산업 보고서 발행 매체로 확인. 테마별 조회는 권리 조건 미충족으로 중단 | 9개 직접 산업 시계열 미검증 | [공식 약관](https://www.mordorintelligence.com/terms-and-conditions) §6: 구매 콘텐츠는 내부 사용, 무허가 재배포·파생상품 금지 | **`REJECTED_REUSE_RIGHTS`** |
| **OECD STAN** | [공식 데이터셋 설명](https://www.oecd.org/en/data/datasets/structural-analysis-database.html) 확인 | ISIC 표준 산업으로 여러 신생 테마를 직접 분리할 수 있는지 미확인 | 데이터셋별 사용권·제3자 제공 여부 개별 검토 필요 | `COVERAGE_GAP / NOT_SELECTED` |
| **미 BEA Industry** | [공식 산업통계 안내](https://www.bea.gov/industry/industry-economic-accounts-information-guide) 확인 | 미국 NAICS 업종별 총산출/부가가치. 글로벌 세부 9테마와 직접 동일하지 않음 | 해당 구체 데이터/서비스 용도 확인 전 승인하지 않음 | `SCOPE_GAP / NOT_SELECTED` |
| **미 Census QSS** | [공식 조사범위](https://www.census.gov/services/qss/about_the_survey.html) 확인 | 선택된 미국 서비스업. 제조/SMR/방산 등 일괄 범위 미달 | 해당 구체 데이터/서비스 용도 확인 전 승인하지 않음 | `COVERAGE_GAP / NOT_SELECTED` |

**중요**: Grand View Research/Mordor에 대한 공개 페이지 확인은 웹 검색과 약관 열람이다. 금지된 자동 스크래핑·실제 통합 자동호출을 수행하거나 성공으로 기록하지 않았다. OECD/BEA/Census 역시 산업 계정의 **분류범위**만 확인했으며 9개 상세 지표별 API GET·권리 심사는 아직 완료되지 않았다.

## C. 9개 테마 매체 범위 조사 — Grand View Research의 관련 페이지

| 승인된 테마 | 한 매체 내부에서 발견한 공개 요약 페이지 | 주제 일치 판정 | 검증해야 할 차이 |
|---|---|---|---|
| 로봇·자동화 | [Industrial Robotics](https://www.grandviewresearch.com/industry-analysis/industrial-robotics-market) | `PARTIAL_SCOPE` | 산업용 로봇 매출 ≠ 모든 자동화 산업 |
| 클라우드·SaaS | [Cloud Computing](https://www.grandviewresearch.com/industry-analysis/cloud-computing-industry) | `PARTIAL_SCOPE` | 클라우드 전체 ≠ SaaS만 또는 둘의 중복 제거 |
| 자율주행 | [Autonomous Vehicles](https://www.grandviewresearch.com/industry-analysis/autonomous-vehicles-market) | `DIRECT_CANDIDATE` | 자율주행 단계·상용 서비스/장비 범위 |
| 원전·SMR | [Small Modular Reactor](https://www.grandviewresearch.com/industry-analysis/small-modular-reactor-market-report) | `PARTIAL_SCOPE` | SMR 시장 ≠ 모든 원전 산업 |
| 방산 | [Military Drone](https://www.grandviewresearch.com/industry-analysis/military-drone-market-report) | `RELATED_ONLY` | 군용 드론은 전체 방위산업 시장 아님 |
| 핀테크 | [Fintech as a Service](https://www.grandviewresearch.com/industry-analysis/fintech-as-a-service-market-report) | `RELATED_ONLY` | FaaS는 전체 핀테크 산업 아님 |
| 사이버보안 | [Cybersecurity](https://www.grandviewresearch.com/industry-analysis/cyber-security-market) | `DIRECT_CANDIDATE` | 클라우드 보안 포함/중복 범위 주의 |
| 바이오·신약 | [Biopharmaceutical](https://www.grandviewresearch.com/industry-analysis/biopharmaceutical-market) | `PARTIAL_SCOPE` | 바이오의약품 시장 ≠ 전체 바이오/신약 개발 |
| 데이터센터·전력 | [Data Center](https://www.grandviewresearch.com/industry-analysis/data-center-market-report), [Data Center Power](https://www.grandviewresearch.com/industry-analysis/data-center-power-market) | `PARTIAL_SCOPE` | 전력 인프라 포함 범위·시장 중복 문제 |

결과: **9개 테마 모두 '연관 페이지' 후보는 찾았으나 9개 직접 대응 산업 시계열을 검증하지 못했다.** 직접 후보 2/9, 범위 일부 대응 5/9, 인접 하위시장 2/9(이 분류는 본 작업의 의미상 사전 매핑이며 원 매체의 통계적 대표성 인증이 아니다). 그리고 **자동 추출 금지 약관 때문에 공통 자동 매체로 채택 불가**.

## D. 실제 조회 실험과 후속 판정 기준

1. **이번 실측**: 공개 페이지/지표 설명 및 공급자 공식 약관을 검색·열람으로 확인했다. **자동화된 9개 페이지 GET 검증 없음**, 과거 시계열 다운로드 없음. 과거 공개 링크 9개를 열거한 표는 수작업 연관성 사전조사의 이력일 뿐 **반복할 운영 절차가 아니다**.
2. **다음 조사**: 허용된 **공식 API 또는 명시적 재사용 라이선스**가 있는 단일 공급자가 나타나면, 먼저 약관 S3 검사 → **매체 자체의 카탈로그/배치·증분 조회 가능 여부** S1/S2 → 소수 분야로 정의/판본·수집 계약 S4/S5 검증 → 가상 N=100·1,000 규모의 호출 수·지연 S6 검증 → 전 테마 동적 매핑 가능 여부를 **일괄 결과로 확인**한다. 조회 불가·사용권 모호하면 즉시 보류하며 타사 경유 우회하지 않는다.
3. **매체가 없다면**: 공통 조회 불가 테마/세부 지표를 목록으로 사용자에게 보고하고, ZGMINI 공통 산업자료 피드에 **필요한 누락항목만** 추가하는 안을 제시한다. 승인 없이는 운영 API·DB·스케줄러·D1·수집/공개 코드 변경 없음.
4. **최종 보고 자격**: 최소한 후보별 `조회 상태 / 정확한 주제 대응 / 자동수집 허가 / 저장·상업·파생 공개권 / 실제 과거 관측 / 안정적 응답` 표를 갖춘 후 소스 선정 결론 보고. 소스를 선정하지 못한 상태를 산업 데이터 미확보와 혼동하지 않는다.

현재 공통 외부 매체 `SELECTED=0`, 누락된 직접 산업 공통 조회 지표 `9/9 미확인`. 원천 선정 0건은 **기존 9개 테마의 투자상 탈락 0건**이다. R19 검증 코드는 변경하지 않았으며, `G1/G2/G/D/M/순위=NULL`, 주문·배포 0.
