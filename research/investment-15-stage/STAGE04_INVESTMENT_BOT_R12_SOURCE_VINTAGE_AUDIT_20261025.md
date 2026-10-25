# AI 자동 투자 봇 · R12 원천 조회·발표·관측 시점 분리 검증

기준: 2026-10-25 KST. 변경 대상: `codex/investment-15-stage-m2-r25-20261025`의 Stage04 **읽기 전용 증거 검사**만. 산업 가중치/산식·ETF 선정·운영 사이트·DB·Provider·스케줄러·주문은 건드리지 않는다.

## 검증하려는 문제

**공식 URL에 오늘 HTTP 200으로 접속했다는 사실은 그 기관이 해당 지표의 새 연차판을 오늘 발표했다는 증거가 아니다.** 또한 발표일, 실제 지표 관측기간, 원문 페이지 수정일, 통계 DB 수정일은 구분해야 한다. 이전 보고서 숫자를 최신 산업 성장 수치로 자동 격상시키지 않는다.

## R12 읽기 전용 증거 계약

| 분류 | 원천 | 검증해야 할 시간/범위 | 최신성 판정 |
|---|---|---|---|
| 동적 공식 시계열 | Federal Reserve FedNow | 관측 분기, 페이지 마지막 수정 문구 | 실시간 원문에서 마지막 수치 읽음. 페이지 수정은 발표 관측분기와 구분 |
| 동적 비연속 조사 | Eurostat | 2025 등 실제 값 존재 조사연도, 데이터셋 수정 시각 | 2023→2025 증가를 1년 YoY라 하지 않음 |
| 동적 자료 목록 | CPUC AV | 실제 확보된 분기 목록/범위, 캘리포니아 사업자 대리변수 | 조사된 분기만 사용. 더 최신 분기 존재 여부의 영구 보장 없음 |
| 고정 보고서 | FDA CDER | 2025 데이터(2025 보고서), PDF SHA | 매 실행 원본 무결성 검증. 차기 보고서 자동 탐지 아님 |
| 고정 보고서 | IFR | 2025 신규 설치, 2026 보고서 | 현재 2026 PDF 원문 무결성 검증. 2027판 자동 탐지 아님 |
| 고정 보고서 | IEA | 2025 전력 추정, 2026 보고서 | 2025 추정 관측과 2030 예측 구분. 차기 판본 자동 탐지 아님 |
| 고정 조사 | ENISA | 2025 조사판, 2025-12-08 보도자료 발행 | 예산 비중 9%는 시장성장률 아님. 차기 조사판 자동 탐지 아님 |
| 미연결 | IAEA PRIS | 공식 2026 Table03 원본 Excel HTTP 403 | 무단 우회·기존수치 대체 금지 |
| 미연결 | SIPRI | 상업적 파생 활용권 미확인 | 이용권 없이 연결·가공 제공 금지 |

R12 `sourceVintageAudit`는 9행 각각에 다음 사실만 내보낸다.

- `observationPeriod`: 자료가 실제 설명하는 연도·분기·조사판. 미검증이면 `NULL`.
- `publicationDateIso`: 문서 **발행일이 원문으로 확인된 경우만**. ENISA는 `2025-12-08`; 다른 기관은 없는 출판일을 임의 생성하지 않는다.
- `pageLastUpdatedText`: FedNow 원문 페이지 마지막 갱신 문구로, 관측일·보고서 발행일과 다름.
- `datasetUpdatedAt`: Eurostat 데이터셋 수정 시각으로, 조사연도·보고서 발행일과 다름.
- `sourceDocumentYear`: FDA 2025, IFR/IEA 2026, ENISA 2025 같이 **근거가 있는 문서 판본연도**.
- `gateCompletedAtUtc`: 전체 읽기 전용 조회 **종료 시각**. 개별 데이터의 관측·발표 시각이라고 주장하지 않음.
- `editionCurrencyState`: 동적 원천/고정 연차판/미연결 분류; `latestEditionVerified=false` (새 판본을 자동으로 완전 탐지한다고 주장하지 않음).
- `approvedGrowthG`, `approvedDislocationD`, `approvedAttractivenessM`: **NULL**. 새 투자 산식 없음.

## 실제 검증

- 개발 측 HTTPS 통합 실행: `INVESTMENT_BOT_STAGE04_INPUT_GATE_R12`, `LIVE_INPUT_PARTIAL_INDUSTRY_UNRANKED`.
- 기존 승인된 9개 테마 F **9/9** 읽기 전용으로 유지. 공식 산업 원천은 **7/9** 유지.
- 공식 7개 가운데 **연차 원문 고정 조회 4개**, **동적 목록·시계열 조회 3개**. 미연결 2개 IAEA/SIPRI는 결측.
- 최신 판본임을 별도 자동 검증했다는 주장 **0건** (`automaticLatestEditionClaims=0`).
- 자동 테스트 **42/42** 케이스 통과(7개 테스트 파일); 외부 원문 바이트·이력자료는 GitHub에 저장하지 않음.
- R12 감사 과정은 미연결 원천의 가짜 원값, 9개 기관 중복·개수 드리프트, G/D/M·순위 또는 주문 생성이 감지되면 즉시 실패한다.
- 실행 시 조회 종료 UTC는 실제 런타임에서 출력되며, 사용자 Windows CMD에서의 실제 실행 검증은 **미실행**.

## 코드 변경

- `stage04/source-vintage-audit-readonly.mjs`: 독립적인 시간 출처/보고서 판본/자료 결측 감사.
- `stage04/source-vintage-r12.test.mjs`: 발행·수정·관측·조회 시각 구분, 결측 및 자동주문 차단 회귀검증.
- `stage04/investment-bot-gate-readonly.mjs`: 기존 조회를 바꾸지 않고 `sourceVintageAudit`만 결합.
- `stage04/investment-bot-gate.test.mjs`: 기존 9 F/7 산업 데이터 합격과 4+3 판본 분류 검증.
- `README.md`, `STATUS.md`, `ARTIFACT_INDEX.md`: 작업 기준 및 재개 위치.

## 다음 단계

사용권과 공개 접근이 확인되기 전 IAEA·SIPRI는 `NULL`. 이후 각 기관 연차보고서의 **새 판본 발견 절차**를 독립 검증해 승인된 자동 조회 계약에 추가할 수 있다. 단, 발표 주기가 연간인 자료에 일간 수치 생성·보간을 요구하지 않고, 사용자의 별도 승인 없이 G/D/M 가중치나 종목·주문 기능을 연결하지 않는다.
