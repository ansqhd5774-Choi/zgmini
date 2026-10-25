# AI 자동 투자 봇 · 04단계 공식기관 실시간 입력 R11

기준: 2026-10-25 KST. 대상: `codex/investment-15-stage-m2-r25-20261025` 개발 브랜치. 읽기 전용 검증이며 운영 서비스·산식·기존 9개 테마 ETF·DB·Provider·스케줄러·주문 연결은 변경하지 않는다.

## 절대 실행 원칙

사전에 지정한 기관·매체의 **원문을 실행 시점마다 조회**한 뒤 수치와 해당 모집단·시점을 검증한다. GitHub에 방대한 PDF·엑셀·웹페이지·과거 원자료를 적재하여 최신 판단의 대체 입력으로 사용하지 않는다. 저장 범위는 코드, 원문 링크, 테스트, 결측 원인, 최소 검증 기록뿐이다. 실제 조회 오류·판본 충돌 시 이전 수치 캐시로 복구하지 않고 `NULL` 및 오류 코드를 출력한다.

## 신규 연결 — 사이버보안 ENISA

| 항목 | 원문 직접 검증 내용 |
|---|---|
| 기관/원문 | ENISA, [What’s Driving Cybersecurity Investments and Where Lie The Challenges?](https://www.enisa.europa.eu/news/whats-driving-cybersecurity-investments-and-where-lie-the-challenges), 2025-12-08 공식 보도자료 |
| 갱신 | 위 **지정 공식 HTML**을 매 실행 HTTPS GET하고 보도자료 일자·제6판 보고서·원문 문맥·수치 유일성 검증. 원문 HTML 미보관 |
| 조사 범위 | EU 회원국 NIS2 관련 업종 공공·민간 설문; 2025년판 발행일이며 연간 매출의 확정 관측연도라는 뜻이 아님 |
| 설문 기관 수 | **1,080개** |
| 모집단 구성 | 대기업 **83%**, 중소기업 **17%** |
| IT 예산 중 사이버보안 지출 비중 | **9%** — **시장 성장률 아님** |
| 응답 기관의 사이버보안 지출 중앙값 | **€1,500,000** — 기업 평균·시장 전체 매출 아님 |
| 비교 제한 | [ENISA 2024년 공식 보도자료](https://www.enisa.europa.eu/news/navigating-cybersecurity-investments-in-the-time-of-nis-2)를 포함해 판본별 표본·범위가 다를 수 있어 모집단 동질성 미검증. 2025년판 “전년과 유사”라는 표현만으로 연간 증감·가속도 계산 금지 |
| G 입력 성장률 / 가속도 | `NULL` / `NULL` — 통계 구조가 다른 만큼 9%를 시장 YoY로 사용하지 않음 |
| 공식 순위·D·M·매수 주문 | `NULL` / `NULL` / `NULL` / **OFF** |
| 오류 처리 | HTTP·원본 URL 변경·본문 HTML 아닌 응답·서식 변경·반복 수치·문맥 상실·구성 비중 합 오류 시 `SOURCE_FAILED`와 코드, 산업값 `NULL` |

**주의:** ENISA 2025년판 지출 비중은 **조사된 기관이 IT 예산 중 어느 정도를 보안에 배분했는지**라는 정적 관측치다. 산업의 연간 글로벌 매출 성장도, 기업별 실적 증가도, 유효한 정량 투자 매력 점수도 아니다. 표본이 2024년과 다르므로 숫자가 같아도 전년 성장률 0%를 산출하지 않는다.

## 다른 2개 미연결 원천

1. **원전·SMR / IAEA PRIS:** IAEA [*Nuclear Power Reactors in the World* 2026년판](https://www.iaea.org/publications/16058/nuclear-power-reactors-in-the-world)에서 2025-12-31 기준 건설 중 원자로 유형 및 순출력을 제시하는 공식 Table 03 Excel 보조자료 존재를 확인. 자료 주소는 `https://www-pub.iaea.org/MTCD/Publications/SDATA/RDS2_2026/RDS2_2026_Table03.xlsx`. 실제 자동 요청은 **HTTP 403**. 권한 제한을 우회하지 않고 산식 연결·역산·과거값 대체를 중단. `NULL` 유지. 건설 중 설비량은 주식시장 성장률이나 신규 완공 유량과도 구분해야 함.
2. **방산 / SIPRI:** 데이터가 공개적으로 보인다는 사실만으로 상업적 이용·재배포·파생 점수 사용권이 승인된 것은 아니다. 기존 법적/이용권 검토 보류를 유지하고 산업 수치 `NULL`, 순위 `NULL`. 명시적 사용권 확인 전 API·스크레이핑·우회 경로를 새로 연결하지 않는다.

이 두 미연결 산업은 **테마 탈락이나 투자 실패를 뜻하지 않는다.**

## 자동 검증 2026-10-25

- **ENISA 원문 GET 200** → 실제 원문 HTML에서 표본 **1080**, IT 예산 중 **9%**, 지출 중앙값 **1500000 EUR** 추출 통과.
- 개발 측 Stage04 통합 `NODE_USE_ENV_PROXY=1 node` HTTPS 실행: `INVESTMENT_BOT_STAGE04_INPUT_GATE_R11`, `LIVE_INPUT_PARTIAL_INDUSTRY_UNRANKED`; 기존 9개 테마 공탐 F **9/9** 직접 조회, 지정 공식 산업 원천 **7/9** 확인.
- ENISA 포함 총 자동 검증 **38/38 케이스 PASS**, 6개 테스트 파일. ENISA 503 장애 시 결과에서 해당 수치 `NULL`, 기존 F 보존, 전체 상태를 `PARTIAL_OR_FAILED_INPUT_UNRANKED`로 하향시키는 회귀검사 포함.
- 실제 조회 당시 사이버보안 F **62.84921**, 관측일 **2026-10-23**. 이 숫자는 재실행 시 바뀔 수 있는 **당시 관측값**이며 고정 입력 파일이나 투자 추천 아님.
- G/D/M·공식 순위 **전부 NULL**. 증권사 API·주문 요청 없음(`automatedTradeEnabled=false`, `orderRequests=[]`).
- 사용자 Windows PC의 CMD 실행 검증은 **미실행**. 위 값은 개발 측 실제 HTTPS 및 Node 단위 테스트 결과다.

## 새/변경 코드

- `stage04/enisa-nis-official-readonly.mjs`: ENISA 원문 직접 GET, 형식·표본·지출 문맥 검증 후 제한적 aggregate 값 추출.
- `stage04/enisa-nis-r11.test.mjs`: 숫자·기간·모집단·삽입 스크립트·출처 오류 검사.
- `stage04/investment-bot-gate-readonly.mjs`: ENISA 7번째 원천 추가, 가용성·결측 출력 및 순위/주문 차단 유지.
- `stage04/investment-bot-gate.test.mjs`: 9개 F와 7개 원천 연계·ENISA 장애 격리.
- `README.md`, `STATUS.md`, `ARTIFACT_INDEX.md`: 진척과 재개점 갱신.

## 다음 업무

**IAEA 권한 정상화** 및 **SIPRI 상업/파생 이용권 명시 확인** 전 해당 원천 자동산식 연결 금지. 공식 연속 관측치와 모집단·단위 정합성이 확보되고 사용자가 G/D/M 산식·표본 최소 조건·가중치를 명시 승인한 뒤에만 정량 순위 실험으로 이동한다. 자동매매 기능은 별도 승인 전까지 연결하지 않는다.
