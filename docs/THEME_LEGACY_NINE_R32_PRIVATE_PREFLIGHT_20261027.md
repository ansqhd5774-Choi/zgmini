# 기존 9개 테마 R32 — 5단계 읽기 전용 사전점검

- 기준 브랜치: `codex/theme-fear-greed-integration-20261025` (다른 브랜치 생성/변경 금지).
- 기존 R22 승인 5단계의 **PC 가중 합산 이전** 입력·결측 검증만 수행.
- 상태: `PRECHECK_IMPLEMENTED / MOCK_CONTRACT_TEST_PASS / UPLOADED_R25_JSON_PREFLIGHT_PASS / WINDOWS_CMD_RUN_PENDING / NO_AGGREGATION / NO_PUBLICATION`.
- 실행 담당: **사용자 Windows PC CMD**. 이 파일의 작성자는 사용자 PC를 직접 실행했다고 주장하지 않는다.

## 1. 원본 조사 및 입력 구분

| 입력 | 상태 | 주의 |
| --- | --- | --- |
| R20 후보 | 9개 테마·64개 편입 위치·고유 63 ETF **고정** | 후보 변경·교체 불가 |
| R23 원본 | 121개 원본 manifest SHA 기준 | 원자료를 추가 다운로드하지 않음 |
| R25 개별 점수 | 사용자 PC 검증 완료·252일·최신일 **45/63** | 최신일 **18/63은 null** |
| R26 공식 AUM | **63/63** 공식 출처·수치·기준일 확보 | 2026-10-23과 같은 날짜 **42종**, 더 이른 날짜 **21종**. 최신 AUM 입력 전체 확보는 아님 |
| R32 가중치 | 미계산 | AUM의 '현재' 기준과 실측 점수 결측 처리를 허가 없이 결정하지 않음 |

R26의 발행사 출처·원문·반올림 상태는 [기존 R26 조사](THEME_LEGACY_NINE_R26_OFFICIAL_AUM_RESEARCH_20261027.md)와 `config/theme-nine-r26-official-aum-evidence.json`에 **연구 증거**로 보존한다. 이 JSON은 정규 수집기나 운영용 AUM 데이터로 등록하지 않는다. 특히 1월·3월·6월·9월 공시를 10월 값으로 다시 날짜 붙이지 않는다.

## 2. 구현

| 경로 | 목적 |
| --- | --- |
| `scripts/pc-writer/theme-nine-r32-readonly-preflight.mjs` | R20/R25/R26 출처 검증, 252일·63 ETF 점수 검사, 각 테마에서 0/1/2/3개 이상 실측 점수가 있는 거래일 수 확인 |
| `scripts/pc-writer/build-theme-nine-r32-preflight.mjs` | 3개 근거 파일을 SHA256 검증 가능한 단일 CMD로 패키징 |
| `scripts/pc-writer/THEME_NINE_R32_PREFLIGHT.cmd` | 사용자 PC에서 복사·실행하는 CMD, **실제 가격 파일·원장·D1·스케줄러를 읽거나 수정하지 않음** |
| `config/theme-nine-r26-official-aum-evidence.json` | 발행사 공식 AUM 63개, USD/기준일/URL/정밀도·시차 포함 |
| `tests/theme-nine-r32-readonly-preflight.test.mjs` | 독립된 모의 구조 입력의 계약 검사 4종. 실점수 PASS 증거가 아님 |

R32 사전점검은 **합산 점수·AUM 비중·252일 종합 시계열을 계산하지 않는다**. 10번째 우주·위성 R32 합산을 기존 9개로 적용하는 단계는, 결과 및 공식 AUM 시차를 점검한 다음에만 진행한다.

## 3. Windows CMD 절차

1. `THEME_NINE_R32_PREFLIGHT.cmd`를 **R25 전체 점수 JSON**이 있는 폴더로 다운로드한다. 예시 파일명: `THEME_NINE_R25_INDIVIDUAL_SCORES_2665_21261.json`.
2. 해당 R25 JSON이 한 개면 CMD를 **더블클릭**한다. 2개 이상이면 사용할 JSON 파일을 CMD 아이콘 위로 **끌어다 놓기** 한다. 입력 JSON을 GitHub에 업로드하지 않는다.
3. 같은 폴더에 `THEME_NINE_R32_PREFLIGHT_RESULT_숫자_숫자.txt`가 생성된다. 이 TXT를 ChatGPT에 제출한다.
4. `STOP_R32_PREFLIGHT`가 나오면 그 원인만 확인한다. R25 JSON·E: 원가격·checkpoint를 삭제하거나 수정하지 않는다.

CMD 내부의 임시 실행 파일은 **CMD가 위치한 폴더의 고유한 작업 하위 폴더**에 생성·SHA 확인 후 제거한다. `%TEMP%`, PowerShell, WSL, 유료 API, 추가 수집 요청을 사용하지 않는다.

## 4. 검증 및 다음 단계

- Node v24 로컬 모의 계약 검사 4/4 PASS; 단일 CMD 원문 역추출 3개 구성 파일 SHA 일치 PASS.
- 사용자 제출 R25 JSON `THEME_NINE_R25_INDIVIDUAL_SCORES_2665_21261.json`을 **읽기 전용으로 재검증 PASS**: 252거래일, ETF 점수 10,842개, 최신일 45종, 해당일 AUM 42종, 이전 날짜 AUM 21종. 입력 R25 SHA256 `12544ebc141148e7fbe61765670f9807520d87de7e9b14e4f41ec85e973f0987` — 원본은 GitHub에 올리지 않음. **Windows 실제 CMD 실행은 PENDING**.
- R25 파일은 승인 manifest SHA, R20 로스터 SHA, 뉴욕 프록시 모드, 252 날짜, 각 ETF 점수 범위·실측 40세션·상태를 검증한다.
- R26은 63 ETF/양수 AUM/공식 URL/기준일/표시 정밀도 검증 후, *같은 날짜 42종 vs 이전 날짜 21종*을 나눈다. 공식 검색 색인 추출값과 과거 공시의 품질 구별을 유지한다.
- 결과에 공식 AUM 21종 시차와 최신 점수 18종 결측을 **명시적 차단 사유**로 기록한다. 이것은 ETF 승인 후보 자격 취소를 뜻하지 않는다.
- 테스트 완료 후에도 `R32_STAGE5_CALCULATED` 또는 `R32_STAGE6_252D_PASS`로 표시하지 않는다. 별도 사용자 승인 없는 공개 배포·D1 쓰기·운영 산식·스케줄러·DB 변경을 금지한다.
