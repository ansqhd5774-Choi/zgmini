# AI 자동 투자 봇 · R14 IFR 산업용 로봇 차기 보고서 감시

기준일: 2026-10-25 KST. 대상: `codex/investment-15-stage-m2-r25-20261025`의 Stage04 **읽기 전용 연구**. 산업 산식, 기존 ETF, G/D/M 가중치, 투자 순위, 주문, 운영 사이트는 변경하지 않는다.

## 공식 발표 혼동 방지

IFR의 [공식 Press Releases 목록](https://ifr.org/ifr-press-releases)에 아래 두 발표가 동시에 노출된다.

| 구분 | 발표 | 관측·공표 | R14 처리 |
|---|---|---|---|
| 산업용 로봇 | [World Robotics 2026 발표](https://ifr.org/ifr-press-releases/news/five-million-robots-now-operate-in-factories-globally) | 2025 세계 산업용 로봇 신규 설치 603,307대; 보고서 반올림 연간 증가율 +11% | 2026 고정 PDF와 같은 **산업용** 판본의 목록 알림 |
| 서비스 로봇 | [2026 서비스 로봇 발표](https://ifr.org/ifr-press-releases/news/global-sales-of-professional-service-robots-surge-24-percent) | 서비스 로봇 출하 증가율 +24% | 다른 통계 모집단이므로 **산업용 신규 설치량 시계열에 병합 금지** |

2026-10-25 현재 확인한 IFR 목록 첫 페이지에 2026년 산업용 연차판 발표가 있으며, 최신 산업용 보고서 2027년판을 찾았다는 근거는 없다. **그러나 홈페이지 현재 보이는 뉴스 몇 건을 확인한 것만으로 IFR의 모든 보고서 판본을 망라했다고 주장할 수도 없다.** 따라서 결과를 `NO_LATER_INDUSTRIAL_RELEASE_IN_VISIBLE_PRESS_WINDOW_NOT_PROOF`로 한정한다.

## R14 사전 지정 기관 실시간 조회

1. IFR 공식 Press Releases 페이지를 **매 실행 GET**하여 카드별로 제목·부제·요약·동일 카드의 발표 주소를 함께 검사한다.
2. **World Robotics YYYY Report by IFR released**와 같은 카드 안의 **industrial robots** 표기가 일치할 때만 산업용 보고서 발표로 분류한다. `service robots`가 있는 카드는 분리·제외한다.
3. 현재 고정 검증 보고서보다 더 높은 연도 산업용 발표가 명확히 검출되면 `NEWER_INDUSTRIAL_WORLD_ROBOTICS_PRESS_RELEASE_REVIEW_REQUIRED`로 신규 PDF·수치 판본 검증을 요구한다. 기존 2026 PDF의 SHA·603,307대 원값은 자동 교체하지 않는다.
4. HTML 구조/공식 출처/날짜/페이지 길이가 불명확하면 `UNVERIFIED`; 기존에 저장한 HTML·스크린샷이나 추정 과거 자료로 결측을 메우지 않는다.
5. 뉴스 색인이 **완전한 연차보고서 목록이 아님**을 `indexIsCompleteAnnualCatalog=false`, `latestAnnualReportAutomaticallyVerified=false`로 항상 표시한다.
6. 이번 연구에서 지정한 자료 조회는 **읽기 전용 일시 처리**로, IFR 보도자료 HTML/PDF 사본·대량 역사시계열은 브랜치에 저장하지 않는다.

## 실제 실행·검증 결과

- 개발 환경 공식 HTTPS 통합 실측: `INVESTMENT_BOT_STAGE04_INPUT_GATE_R14`, `LIVE_INPUT_PARTIAL_INDUSTRY_UNRANKED`.
- 기존 승인 9개 테마 F **9/9**, 공식 산업 원천 **7/9** 연결 유지. 이번 IFR 차기판 감시는 **추가 산업 테마가 아닌** 원천 검증기 1개다.
- IFR 보도자료 보이는 범위: 산업용 2026판 **1건**, 서비스 로봇 발표 **1건 제외**, 산업용 최신 연차판 자동 보증 `false`.
- 로봇·자동화 F 관측 **2026-10-23 20.68849 (BASE_OBSERVED)**, IFR 2026 보고서의 2025 설치량 **603,307대** 유지. 공표 **+11%는 반올림**이므로 정확한 2024 기저값·성장 가속도 **NULL**.
- FDA 차기 연도 2026 진행 중 목록 경고(R13) 유지. 다른 기관 IEA·ENISA는 동일 계열 차기 **연차판 공식 색인**이 검증되지 않아 최신성 자동 판정하지 않음.
- IAEA PRIS Excel HTTP 403, SIPRI 상업적 파생 이용권 미확인: **미연결 2/9 유지**. 권한 우회·대체 값 임의 생성하지 않음.
- 단위·통합 자동 테스트 **52/52 PASS**(9개 테스트 파일). 타국 사이트 리다이렉트/공식 구조 변경/서비스 로봇 오분류/미래 발표/목록 누락/발견 알림 실패 격리 검증.
- 승인된 투자 성장점수 G, 괴리 D, 매력 M, 순위 **NULL**, 주문 **0건**, 자동매매 OFF. Windows CMD 실기기 실행·`main` 병합·운영 배포 **없음**.

## 파일

- 신규 `stage04/ifr-edition-press-watch-readonly.mjs`: IFR 공식 보도자료 카드별 산업용 로봇 발표 감시.
- 신규 `stage04/ifr-press-watch-r14.test.mjs`: 산업/서비스 판본 분리·오류·미래연도·새판 발견 테스트.
- 수정 `stage04/investment-bot-gate-readonly.mjs`: 독립적인 IFR 뉴스 감시 연결. 목록 실패가 PDF 원값/F를 훼손하지 않음.
- 수정 `stage04/source-vintage-audit-readonly.mjs`: IFR 카드의 발견 신호를 원값의 연도/판본과 분리.
- 수정 `stage04/investment-bot-gate.test.mjs`: 기존 9개 F·산업 7/9·투자 미승인·주문 OFF 회귀 및 뉴스 목록 실패 격리 검증.
- 수정 `README.md`, `STATUS.md`, `ARTIFACT_INDEX.md`.

## 이후 과제

IEA·ENISA에 대해서는 공식 원문과 같은 종류의 연차 보고서 **전체 또는 최근 판본 공식 목록**을 확보할 때까지만 탐색한다. 이름이 유사한 다른 IEA 지역 보고서나 ENISA NIS360을 최신 `Key Questions on Energy and AI` 또는 `NIS Investments`로 잘못 대체하지 않는다. 새로운 발표가 감지돼도 PDF·원자료·이용권·동질성 재검증 전 기존 연간 지표를 교체하지 않는다.
