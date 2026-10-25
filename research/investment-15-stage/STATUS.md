# 15단계 상태 · 2026-10-25

상태값: `EXISTING_INPUT` 기존 ZGMINI 입력, `DESIGNED` 설계 보관, `CODE_PRESENT` R25 코드 보관, `PARTIAL` 외부 원문/실행 검증 일부 완료, `NOT_VERIFIED` 본 브랜치에서 검증하지 않음.

| 단계 | 작업 | 현재 확인 가능한 근거 | 상태 |
|---:|---|---|---|
| 01 | 시장 분석 | ZGMINI 기존 시장 지표를 활용하도록 계획 | EXISTING_INPUT |
| 02 | 섹터 분석 | ZGMINI 기존 ETF 섹터 공탐 활용 계획 | EXISTING_INPUT |
| 03 | 테마 분석 | 기존 통과 ETF 테마 9개 유지; 재검증 금지 | EXISTING_INPUT |
| 04 | 매력 테마 선정 | R7 읽기 전용 AI 봇 입력 게이트: 기존 공탐 F 9/9·실시간 산업 원자료 2/9(FedNow·Eurostat); G/D/M·순위 NULL | CODE_PRESENT / PARTIAL |
| 05 | 성장 산업·기술 선정 | M2 R25 로봇 실측 코드 및 선택 JSON | CODE_PRESENT / NOT_VERIFIED |
| 06 | 수혜 기업 발굴 | M2 R25 기업 노출·미국 유니버스·로봇·제품 조사 코드 | CODE_PRESENT / NOT_VERIFIED |
| 07 | 기본 지표 분석 | M2 R25 재무·공식 기업 실적 확인 코드; R24 실측 2/4 부분 확보 | PARTIAL |
| 08 | 15대 점수 | M2 R25 원본 계산기 코드, 원본 PDF 15건 SHA256 보존. 직전 실측 평가 0/60 | CODE_PRESENT / PARTIAL |
| 09 | 우수 기업 선정 | 최신 15단계 계획서 | DESIGNED |
| 10 | 매수 매력 정밀 분석 | 최신 15단계 계획서 | DESIGNED |
| 11 | 목표가 | 최신 15단계 계획서 | DESIGNED |
| 12 | 분할 매수·매도 설계 | 최신 15단계 계획서 | DESIGNED |
| 13 | 사용자 매수 | 수동 주문 원칙만 확정, 실행 없음 | DESIGNED |
| 14 | 보유·재평가 | 최신 15단계 계획서 | DESIGNED |
| 15 | 분할 매도 | 최신 15단계 계획서 | DESIGNED |

## 04단계 입력값 사용 규칙 — 사용자 정정

1. F는 **관측일이 가장 최근인 유효 잠정치**를 우선 읽는다. 현재 유효 잠정치가 없으면 그 사실을 구분하여 보고하고 이전 확정치를 현재 F로 가장하지 않는다.
2. 2026-10-25 R3 조사에서 바이오·신약 현재 F는 **2026-10-23 잠정 22.63294**, 2026-10-21 확정 **29.03175는 이력 비교용**이었다. 이것도 고정된 최신 숫자가 아니다. 다음 실행마다 실제 공개 런타임을 다시 조회한다.
3. 승인된 03단계 ETF 테마는 다시 평가하지 않는다. 04단계는 산업 실측 원자료와 해당 시점 F의 괴리를 조사한다.
4. G1/G2/G 및 M의 60/40·70/30 가중치는 제안이므로 사용자 승인 전 투자 점수·순위를 확정하거나 운영하지 않는다.

## 가장 최근 M2 패키지 R25 진척

- 원본: `INVESTMENT_M2_R25_NASDAQ_EARNINGS_REPAIR_20261025(1).zip` (원본 SHA256은 `ARTIFACT_INDEX.md`).
- R24 Windows 로그: 시장·섹터·테마 `READY/PASS`, 제품 원문 4/4, PDYN 실적 PASS, SERV 실적 403, 원본 PDF 15/15 PASS, 평가 0/60. 이는 **R24 실측**이다.
- R25 수정: SERV 실적 원문의 다른 허용된 Nasdaq 게시 주소로 교체. 개발 측 HTTP 200·문구 검증. **Windows R25 실측 로그는 아직 확인되지 않음**.
- R25 README의 `STAGE7_ALLOWED_EARNINGS_OBSERVED=2/4` 등은 **예상 출력**이므로 PASS로 기록하지 않는다.
- R25의 `M2_STAGE4_SELECTION.json`은 **2026-10-23 잠정 F=20.79167에 기초해 로봇·자동화를 05단계 조사 대상으로 택했던 당시 스냅샷**이다. 현재 04단계 9개 산업의 신규 G/M 정량 순위 확정이나 오늘의 최신 F가 아니다. 기존 선택 기록은 보존하되 새 조사·운영 결과와 혼동하지 않는다.
- RR·VHUB 실적 원문은 미확보. 누락을 0점 또는 회사 실패로 바꾸지 않는다.

## 2026-10-25 R4 실측 기록 (새 브랜치 커밋)

- `STAGE04_LIVE_F_AND_SOURCE_GATE_R4_20261025.md`: **HTTP 200**, 9/9 공탐 F 관측일·위상 확인. 상단 API `phase=PROVISIONAL`은 테마별 잠정 상태와 별도. 바이오 현재 **10/23 잠정 22.63294**, 10/21 기본 **29.03175는 과거 비교 전용**.
- 9개 공탐 역사 배열(각 252)은 **ETF 심리 이력**이지 공식 산업 성장 비교 표본이 아니다.
- IFR 2026판 설치 시계열은 반올림/2025판 혼합 및 이용권 보류. IAEA 2026 단일 보고서의 1954~2025 *연간 착공 용량*은 새로운 연구 후보일 뿐 기존 *건설 중 총용량*을 무단 대체하지 않는다. SIPRI의 상업 재사용 권리 제약 재확인.
- R1·R2 초기 공식 자료 조사는 `archive/`에 **구판 경고와 함께 보존**. 최신 근거는 R3·R4 우선.
- **04단계 G·D·M 정식 값 및 추천 순위 0건**, 승인 대기. 결측=0/탈락 금지.
- `STAGE04_LIVE_F_READER_R6_20261025.md`, `stage04/latest-f-readonly.mjs`, `.test.mjs`: **잠정치 우선 라이브 F 선택기**, 규칙 테스트 **5/5 PASS**, 개발 환경 프록시 반영 후 실제 API GET **9/9 PASS**. 실행할 때 날짜 비교하여 선택하며 과거 확정은 비교용만 사용. 코드·Windows 실행기·메인과 운영 모두 분리.
- `STAGE04_SENSITIVITY_R5_RESEARCH_ONLY_20261025.md`와 `stage04/quant-sensitivity-readonly.mjs`: FDA·FedNow 공식 동일판본 2개에 한하여 연구용 G1/G2·60:40 후보 민감도 Node 검사 `PASS_RESEARCH_ONLY`. **F·D·M·순위 미계산**, 가중치·최소 N 미승인. FedNow 초기 2개 과거 표본 제외 가정만으로 G 후보 72.00→78.33, 차이 +6.33. 9개 완성/운영 PASS 아님.

## 다음 작업 (사용자 승인 전 서비스 변경 없음)

1. R4의 **오늘 조회한 유효 최신 F 9개**와 각 공식 통계의 정의·판본·원값·표본 수를 대조한다. 새 분석 시 F는 다시 최신 관측일·잠정/확정 상태를 조회한다.
2. 우선 IFR 같은 2026판 반올림 민감도, IEA 장기 원값 확보 가능성, IAEA 기존 stock vs 대안 flow **분리 비교**, ENISA 표본 정의, SIPRI 권리 범위를 검증한다. 미확보 값은 NULL.
3. G1/G2/G/D/M의 최소표본·가중치(60/40, 70/30) **대안별 민감도 표만 제출**. 사용자 승인 전 운영·실제 랭킹 금지.
4. 독립된 R25 검증: Windows `M2_LATEST_STATUS.txt`를 확보하면 SERV 수정/실적 부분충족 및 원본 PDF 15/15을 실제 로그로 검증한다. R25 예상 출력은 PASS로 간주하지 않는다.
5. 기존 9개 ETF·공탐 산식·사이트·운영 DB·Provider·스케줄러·DNS·주문 기능 변경 금지.

## 2026-10-25 R7 자동 투자 봇 입력 게이트 — 실제 검증

- 장기 목표는 **15단계 AI 자동 투자 봇**. 현재 완성 부분은 04단계 **독립 읽기 전용 입력 수집기**, 자동매매 엔진 아님.
- 신규 문서: `STAGE04_INVESTMENT_BOT_R7_LIVE_EVIDENCE_20261025.md` (정확한 실측·권리·에러 기록).
- 실행 코드: `stage04/investment-bot-gate-readonly.mjs` + `fednow-official-readonly.mjs` + `eurostat-cloud-readonly.mjs`; Windows 수동 실행 `stage04/STAGE04_BOT_READONLY.cmd`.
- 신규 단위테스트 **10/10 PASS**; 기존 R6 F 선택 **5/5 PASS**; 연구 R5 수학적 검산 PASS.
- 개발 환경 실제 HTTPS 테스트 `LIVE_INPUT_PARTIAL_INDUSTRY_UNRANKED`: F 9/9, 공식 원자료 2/9, 나머지 7은 결측. FedNow 2026Q3 6,376,467건·YoY +154.4478%, Eurostat 2025 유료 클라우드 52.74%·2년 +7.42%p. 출처·표본·권리 제한 유지.
- 라이브 FedNow 4.05MB 공식 HTML의 초기 상한 실패를 페이지 5MB/ASCII 300KB 분리로 수정 후 PASS. Eurostat 2023 누락 시 과거 추세를 현재로 오판하는 버그를 최신연도 연속창 요구로 수정 후 PASS.
- `main`의 2026-10-25 신규 1커밋은 섹터 UI·테스트 변경이며 R7 경로와 별개; 병합·배포 없음.
- **추가 우선순위:** FDA/CPUC 공식 동적 원자료 → IFR/IEA/IAEA/ENISA/방산 5개 권리·동일판본 → 가중치·최소 N 승인 → 정식 04단계 순위. Windows 실행·주문 시스템 미검증.
- **모든 단계 투자 권고·주문 비활성화**: `approvedAttractivenessM=null`, `officialRank=null`, `automatedTradeEnabled=false`.
