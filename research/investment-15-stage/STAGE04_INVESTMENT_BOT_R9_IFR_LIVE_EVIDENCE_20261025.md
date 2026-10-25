# AI 자동 투자 봇 — 04단계 산업 입력 R9 (IFR 추가)

기준일: **2026-10-25 KST**  
브랜치: `codex/investment-15-stage-m2-r25-20261025`  
범위: **연구 전용 공식 산업 입력, 기존 테마 F 9/9, 산업 원자료 확인 5/9, 성장·매력도·순위·주문 미승인**.

## 새 검증 결과: 세계 산업용 로봇 신규 설치량

- 정식 계약된 주지표는 **세계 산업용 로봇 신규 설치량(대/연)**이다. 서비스로봇·인간형 로봇·로봇 누적 가동대수 또는 2026 예측으로 대체하지 않았다.
- 단일 출처: IFR 공식 **World Robotics 2026 Industrial Robots — Executive Summary**. 공식 PDF URL <https://ifr.org/img/worldrobotics/Executive_Summary_WR_2026_-_Industrial_Robots.pdf>.
- 공식 PDF SHA256: `a6c2ab78c54fcbe01f6b4cabf16ad0eda9674e71d9516b8659c7dde546ba31d5` (**실제 HTTP 원문 실측**). 코드가 실행할 때마다 PDF 내용 해시를 다시 검사하고, 판본 변경 시 `IFR_SOURCE_VERSION_DRIFT`로 실패한다.
- 동일 2026 출판물에 기재된 관측 원값은 **2025년 신규 설치 603,307대**. 2025년 성장률 **+11%**는 원문의 **반올림 발표값**이므로 `industryReportedRoundedGrowthPct`로만 노출한다.
- 보고서에 명시된 **2022년 552,946대**는 과거 최고 기록 참고 자료이지 **2024년 비교 분모가 아니다**. 2024년 재개정된 정확한 전 세계 설치 원값은 해당 공개 요약에서 확인되지 않았으므로 `industryGrowthPct=null`·`industryAccelerationPctPoints=null`·과거 N=0/0으로 둔다.
- 2026년 신규 설치 **655,000대는 전망**이므로 2025년 확정치의 다음 시점 실제 실적으로 취급하지 않는다.
- World Robotics의 정식 데이터베이스 및 과거 시계열은 **유료·권리 보호 대상**이다. 공개 PDF/전체 데이터베이스 복제·재배포, 상업적 2차 서비스 이용권을 주장하지 않는다. [IFR 정식 자료 안내](https://ifr.org/worldrobotics/). 이 코드는 공식 공개 PDF를 확인하되 세 가지 팩트 외 원문·표·이미지·원데이터를 GitHub에 저장하지 않는다.

## R9 자동 입력 상태

| 테마 | 기계 판독되는 공식 값 | 성장 산식 준비도 |
|---|---|---|
| 로봇·자동화 / IFR | 2025 **603,307대**, 전년대비 반올림 +11% 원문 확인 | 정확한 2024 원값·가속도 미확보 → **PARTIAL / G·D·M NULL** |
| 클라우드·SaaS / Eurostat | 2025 **52.74%**, 최근 2년간 +7.42%p | 관측 연도 불연속 → 공식 순위 보류 |
| 자율주행 / CPUC | 2026Q2 **4,220,075건**, YoY +88.8251% | 역사 가속 N0·Waymo 지역 제한 → 보류 |
| 핀테크 / FedNow | 2026Q3 **6,376,467건**, YoY +154.4478% | 저기저·단일망·권리 검토 → 보류 |
| 바이오·신약 / FDA | 2025 **46건**, YoY -8.0000% | 한 보고서의 과거 N8/7·전 산업 대표성 검토 → 보류 |

- 실제 Node 실측: `NODE_USE_ENV_PROXY=1 node research/investment-15-stage/stage04/investment-bot-gate-readonly.mjs` → 종료 코드 **0**, `INVESTMENT_BOT_STAGE04_INPUT_GATE_R9`, `LIVE_INPUT_PARTIAL_INDUSTRY_UNRANKED`, `validatedLiveThemes=5`, `inputContractValid=true`.
- F 9개 관측일 2026-10-23; 가장 최근 바이오 잠정 F=22.63294 유지. 2025 산업값과 2026 F를 **동일 시점의 두 관측이라고 주장하지 않는다**.
- 회귀검사: F **5/5**, R9 통합 gate **13/13**, R8 산업 원본 **6/6**, 신규 IFR 해시·오류 처리 **4/4** → **28/28 PASS**.
- 모든 테마 `approvedGrowthG=null`, `approvedDislocationD=null`, `approvedAttractivenessM=null`, `officialRank=null`, `automatedTradeEnabled=false`, `orderRequests=[]`.
- 신규 모듈 `stage04/ifr-robot-official-readonly.mjs`, 회귀 `stage04/ifr-robot-r9.test.mjs`. 기존 `.cmd` 실행기는 그 자리에서 R9 JS를 호출하며 스케줄러 등록은 없다. 사용자 Windows CMD 실측 미확인.

## 남은 4/9 자료와 확인한 제약

| 사전등록 산업·기관 | 현재 공식 자료 조사 | 계속 보류하는 이유 |
|---|---|---|
| 원전·SMR / IAEA PRIS | [PRIS Analytics](https://pris-stats.iaea.org/)에 건설 중 **80,720MW(e), 77기**의 현재 화면 스냅샷이 존재 | 2025년 말 연간 77.2GW(e) 사례와 **발표시점이 다른 동적 스냅샷**을 성장 시계열로 연결 불가. `stock→flow` 변경은 승인 전 금지. |
| 방산 / SIPRI | [세계 군사비](https://www.sipri.org/databases/milex) 1949~2025 장기 자료 존재 | [SIPRI 이용약관](https://www.sipri.org/about/terms-and-conditions)에 **상업적 데이터 사용 시 서면 허가 및 로열티 협상** 명시. 무료 상업 재배포/파생 운영 가능으로 간주 금지. |
| 사이버보안 / ENISA | [NIS Investments 2025](https://www.enisa.europa.eu/publications/nis-investments-2025) 보고서 IT 예산 중 사이버 지출 약 **9%** | 이전 조사와 표본·산업 범위·평가 정의 검수 미완료. 단순 전년 성장률 연결 금지. |
| 데이터센터·전력 / IEA | [Global Energy Review 2026](https://www.iea.org/reports/global-energy-review-2026) 등 2025 수요 증가 설명 존재 | 연간 세계 데이터센터 전력 수요 **정확한 장기 원시열·동일 판본**과 재사용 조건 미확보. 증가율 하나만으로 과거 분포/가속도를 날조하지 않는다. |

**다음 단계:** 무료 사용 가능한 동일 정의 원본을 충족하면 04단계에 추가. 원본 9개 시계열의 가용 길이·권리 제약을 끝까지 기록하고, 승인된 G1/G2/G/D/M 계산 조건이 확정되기 전에는 자동 투자 순위·기업 발굴 트리거·증권 계좌 주문 연결을 작동시키지 않는다. 15단계 상태 오케스트레이션은 기존 읽기 전용 경계를 유지한 채 별도 확장할 수 있다.

이전 기록 `STAGE04_INVESTMENT_BOT_R8_FDA_CPUC_LIVE_EVIDENCE_20261025.md`(4/9), `STAGE04_INVESTMENT_BOT_R7_LIVE_EVIDENCE_20261025.md`(2/9)는 이력으로 보존.
