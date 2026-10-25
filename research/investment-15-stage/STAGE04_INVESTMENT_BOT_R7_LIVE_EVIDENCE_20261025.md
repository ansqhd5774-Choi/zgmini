# AI 자동 투자 봇 — 04단계 자동 원자료 접속 R7

기준일: 2026-10-25 (KST)  
개발 브랜치: `codex/investment-15-stage-m2-r25-20261025`  
상태: `READ_ONLY / LIVE_INPUTS_2_OF_9 / F_9_OF_9 / UNRANKED / NO_TRADE`

## 목적과 현재 구현 위치

최종 목표는 **시장 → 섹터 → 테마 → 산업 성장·괴리 → 기업 → 15대 기준서 → 투자 계획 → 보유 재평가**를 순서대로 자동 조사·판단하는 **AI 자동 투자 봇**이다. 이 R7은 **04단계 입력자료 자동 연결기**이며, 15단계 완제품이나 자동 주문기가 아니다. 문서의 기존 13단계 수동 주문 게이트는 그대로 유지한다. 실제 거래 API 연결과 자동집행은 별도 명시 승인·위험 한도 설계 전까지 금지한다.

### R7 구성물

| 파일 | 기능 | 금지 사항 |
|---|---|---|
| `stage04/latest-f-readonly.mjs` | R6의 기존 ZGMINI 9개 테마 F 현재 유효 잠정치/기본 관측 자동 선택 | 기존 ETF·공탐 산식·DB 수정 없음 |
| `stage04/fednow-official-readonly.mjs` | 공식 FedNow 페이지에서 최신 ASCII 링크 **매번 발견** → 건수 파싱·분기/동일 분기 YoY 검사 | 오래된 파일 URL에 자동 폴백 없음 |
| `stage04/eurostat-cloud-readonly.mjs` | 공식 Eurostat JSON-stat API 동일 판본·고정 범위 → 유료 클라우드 채택률의 2년 창 변화 계산 | 누락 연도 보간·연간 YoY 날조 없음 |
| `stage04/investment-bot-gate-readonly.mjs` | F와 공식 원자료 2개 자동 조회·합치기·9개 테마 기계 판독용 상태 JSON 출력 | G·D·M·순위·주문 없음 |
| `stage04/investment-bot-gate.test.mjs` | 정규 파싱·원자료 오류·시간 누락·허위 폴백·거래 차단 자동 회귀 검사 | 임의 숫자 대체 없음 |
| `stage04/STAGE04_BOT_READONLY.cmd` | Windows CMD용 수동 실행기. 우선 기존 E: Node, 없으면 PATH Node | 스케줄러 설치·자동 실행 설정 없음 |

## 2026-10-25 외부 원문 연결 실측

- 실행: `NODE_USE_ENV_PROXY=1 node research/investment-15-stage/stage04/investment-bot-gate-readonly.mjs` (개발 환경 전용 HTTPS 프록시 사용).
- 종료 코드 **0**, `LIVE_INPUT_PARTIAL_INDUSTRY_UNRANKED`, `inputContractValid=true`.
- **F 9/9 HTTP 원자료 검증**: `sourceStoredAt=2026-10-25T05:00:27.721Z`; 9개 최신 점수 관측일 2026-10-23, 바이오 F **22.63294 잠정**(과거 기본 29.03175와 구분). 실행일과 관측일은 별개.
- **자동 공식 산업 원자료 2/9**:
  - 핀테크: Federal Reserve Financial Services, 2026 Q3 결제 **6,376,467건**, 전년 Q3 2,506,002건, 전년동기 +**154.4478%**, 직전 분기 동기성장률과 차이 +**19.9067%p**, 역사 성장 N=6·가속 N=5. 실물 기준은 **FedNow 결제망에 한정**, 전체 핀테크 산업이 아님.
  - 클라우드·SaaS: Eurostat ISOC_CICCE_USE, EU27·10인 이상·비금융 기업의 유료 클라우드 사용 비중 **2021 40.97% → 2023 45.32% → 2025 52.74%**. 각 2년 창 +4.35%p → +7.42%p, 변화 가속 **+3.07%p**. 2022·2024 미관측·누락. 1년 YoY나 산업 매출 증가율로 변경하지 않음.
- **나머지 7/9**: 공식 산업 시계열 실시간 자동 연동 **미구현**, 해당 성장 원값·G·D·M 필드 `null`. 04단계 ETF 통과 실패나 투자 부적격 판단이 아니다.
- 모든 9개 테마 `officialRank=null`, `approvedAttractivenessM=null`, `automatedTradeEnabled=false`, `orderRequests=[]`.

## 실제 결함 발견 및 보완

1. **FedNow 공식 HTML이 약 4,053,134 바이트**: 초기 300KB 상한에서 `FEDNOW_SOURCE_TOO_LARGE` 확인. 공식 페이지와 소형 ASCII 파일에 각각 **5MB / 300KB 독립 상한** 적용 후 재실행 PASS. 데이터 손실·추정 폴백 없음.
2. Eurostat 자료가 일부 연도 누락되어 있을 때 **오래된 과거 3개 관측을 최신 추세로 잘못 선택할 위험**을 테스트로 발견. 현재 최고 관측 연도를 끝점으로 하는 2년 간격 연속 3개 값이 없으면 `null`로 처리하도록 수정. 회귀검사 PASS.
3. `main`과 작업 브랜치의 차이: 2026-10-25 비교 시 최신 `main`에는 섹터 차트 UI 테스트 등 **추가 커밋 1건**이 있었으나, R7은 `research/investment-15-stage/`만 변경. 기존 `main`·사이트 자동배포·산식 영향 0.

## 검증 통계

| 검사 | 실제 결과 |
|---|---|
| 신규 공식기관 파싱·실패격리·연동 회귀 | `10/10 PASS` |
| R6 잠정 공탐 선별 독립 회귀 | `5/5 PASS` |
| R5 연구 민감도 기존 수치 회귀 | `PASS_RESEARCH_ONLY` |
| 실제 ZGMINI + FedNow + Eurostat 읽기 전용 통합 | `PASS`, F 9/9·산업 2/9 |
| 사용자 Windows CMD 실측 | `NOT_YET_VERIFIED` |
| 공식 투자 순위 / 자동 매매 | `NOT_APPROVED / NOT_EXECUTED` |

## 라이선스 구분 — 현재 연구와 상업적 운영은 별개

- **Eurostat**: 출처를 표시하면 통계 자료의 상업·비상업 재사용을 허용하되 일부 제3자/비EU 데이터 예외를 둔다. 지금 접근한 것은 Eurostat EU27 자체 데이터이므로 **출처·접근일 표시 정책 유지**. 공식 [저작권·재사용 규정](https://ec.europa.eu/eurostat/help/copyright-notice).
- **FedNow 공식 페이지**: FRFS 이용약관은 허락받지 않은 저작권/상표/독점 콘텐츠의 복제·변형·파생 이용 및 FedNow 상표의 상업적 사용을 제한한다. 사실 관계 검산과 공개 서비스에 점수를 파생·재배포할 권리는 **별도 검토 전 `RIGHTS_REVIEW`**. 지금은 개인 연구용 읽기 전용으로만 연결한다. 공식 [이용약관](https://www.frbservices.org/terms-of-use/).
- IFR·SIPRI 등 기존 R4의 권리 검증 항목은 해제하지 않았다.

## 다음 구현 순서

1. FDA 2025 원본 **한 판본에 수록된 2016~2025 표**의 기계 판독/수정 감지; 현재의 고정 연구 숫자를 미래 발표라고 가장하지 않는다.
2. CPUC 2025~26 월별 사업자·지역별 **유상 무인 운행 합계** 자동 접속: 기존 R3 실측 합산과 동일 방법 사용, 개인 운행 세부정보 금지.
3. 로봇·IEA·IAEA·ENISA·방산 5개는 기존 **계약된 산업 지표 정의 그대로**, 원값의 동일 판본/표본·이용권이 실제로 해결될 때 자동 연결. 원전 `stock → flow` 변경은 승인 전 금지.
4. G1/G2/G/D/M 산식·가중치·표본 최소치의 대안별 민감도를 제출하고 명시 승인 후에만 `stage04` 공식 비교·순위 계산기를 작동시킨다.
5. 15단계 상태 오케스트레이터, 변경분만 재검증, 증거 원장, 실패 재시도 정책은 연구 → 읽기 전용 실행 → 사용자 승인 → 이후 주문 권한의 순서로 별도 게이트를 둔다.

### 공식 원자료 및 이용 규정

- [ZGMINI 현재 테마 F API](https://zgmini.kr/api/theme-fear-greed)
- [Federal Reserve Financial Services — FedNow 통계](https://www.frbservices.org/resources/financial-services/fednow-service-resources/fednow-service-volume-value-statistics/)
- [Eurostat API: ISOC_CICCE_USE](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/isoc_cicce_use?lang=EN&freq=A&indic_is=E_CC&size_emp=GE10&unit=PC_ENT&geo=EU27_2020)
- [Eurostat 공식 API 가이드](https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started/api)
