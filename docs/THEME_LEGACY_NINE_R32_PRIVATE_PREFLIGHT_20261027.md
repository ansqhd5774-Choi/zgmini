# 기존 9개 테마 R32 — 5단계 읽기 전용 사전점검

- 기준 브랜치: `codex/theme-fear-greed-integration-20261025` (다른 브랜치 생성/변경 금지).
- 기존 R22 승인 5단계의 **PC 가중 합산 이전** 입력·결측 검증만 수행.
- 상태: `PRECHECK_IMPLEMENTED / MOCK_CONTRACT_TEST_PASS / UPLOADED_R25_JSON_PREFLIGHT_PASS / WINDOWS_CMD_PREFLIGHT_PASS / NO_AGGREGATION / NO_PUBLICATION`.
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

## 4. 업로드된 R25 실측 점수 조합 검증

| 테마 | 최신일 유효 ETF / 전체 | 252일 중 3종 이상 | 2종 | 0~1종 |
| --- | ---: | ---: | ---: | ---: |
| 로봇·자동화 | 5/7 | 252 | 0 | 0 |
| 클라우드·SaaS | 4/5 | 252 | 0 | 0 |
| 자율주행 | 3/6 | 183 | 69 | 0 |
| 원전·SMR | 5/6 | 252 | 0 | 0 |
| 방산 | 4/6 | 252 | 0 | 0 |
| 핀테크 | 3/6 | 230 | 22 | 0 |
| 사이버보안 | 5/8 | 252 | 0 | 0 |
| AI·반도체 | 10/11 | 252 | 0 | 0 |
| 바이오·신약 | 7/9 | 252 | 0 | 0 |

※ 최신일 테마별 위치 합계 46개는 `BOTZ`가 2개 테마에 편입된 1개 중복 위치를 포함한다. **고유 ETF 점수 45개**와 모순이 아니다. 이 표는 사용자가 제출한 **실제 R25 JSON의 점수 존재 여부만 계산**한 결과이며, 가중치·최종 테마 점수·배포는 전혀 실행하지 않았다.

## 5. 검증 및 다음 단계

- Node v24 로컬 모의 계약 검사 4/4 PASS; 단일 CMD 원문 역추출 3개 구성 파일 SHA 일치 PASS.
- 사용자 제출 R25 JSON `THEME_NINE_R25_INDIVIDUAL_SCORES_2665_21261.json`을 **읽기 전용으로 재검증 PASS**: 252거래일, ETF 점수 10,842개, 최신일 45종, 해당일 AUM 42종, 이전 날짜 AUM 21종. 입력 R25 SHA256 `12544ebc141148e7fbe61765670f9807520d87de7e9b14e4f41ec85e973f0987` — 원본은 GitHub에 올리지 않음. **Windows 최초 CMD 실행은 `STOP_R32_PREFLIGHT/ENOENT`였지만, 경로 인수를 수정한 개정 CMD로 사용자 PC에서 재실행한 실제 TXT 로그가 PASS**임을 확인했다. 합산 계산은 여전히 미실행이다.
- R25 파일은 승인 manifest SHA, R20 로스터 SHA, 뉴욕 프록시 모드, 252 날짜, 각 ETF 점수 범위·실측 40세션·상태를 검증한다.
- R26은 63 ETF/양수 AUM/공식 URL/기준일/표시 정밀도 검증 후, *같은 날짜 42종 vs 이전 날짜 21종*을 나눈다. 공식 검색 색인 추출값과 과거 공시의 품질 구별을 유지한다.
- 결과에 공식 AUM 21종 시차와 최신 점수 18종 결측을 **명시적 차단 사유**로 기록한다. 이것은 ETF 승인 후보 자격 취소를 뜻하지 않는다.
- 테스트 완료 후에도 `R32_STAGE5_CALCULATED` 또는 `R32_STAGE6_252D_PASS`로 표시하지 않는다. 별도 사용자 승인 없는 공개 배포·D1 쓰기·운영 산식·스케줄러·DB 변경을 금지한다.

## 6. Windows PC 실제 실행 오류·재발 방지 (2026-10-27)

- 사용자 PC 제출 `THEME_NINE_R32_PREFLIGHT_RESULT_12690_21493.txt`: `R32_THREE_COMPONENT_SHA_VERIFIED=YES`, Node v24.19.0, 최종 `STOP_R32_PREFLIGHT` / `ENOENT`. **실제 PC 검사 PASS가 아니다.** 원본 점수·AUM·D1·공개 데이터 쓰기 없음.
- 당시 CMD는 `%~dp0`에서 얻은 뒤에 `\\`로 끝나는 Windows 폴더 경로를 따옴표로 감싸 Node 인수로 넘겼다. Windows 명령줄의 백슬래시·따옴표 해석에 의해 인수가 손상될 가능성이 있다. **로그만으로 원인이 확정되지는 않으므로**, 고친 CMD 재실행으로 판정한다.
- 수정: 폴더·선택 R25 JSON을 `R32_FOLDER` / `R32_SELECTED` 환경변수로 전달하고, Node `--preflight`만 명령줄 인수로 제공한다. 누락 폴더·입력 JSON은 `CMD_FOLDER_NOT_FOUND`, `R25_JSON_NOT_NEXT_TO_CMD`, `R25_SELECTED_FILE_NOT_FOUND`로 구분한다.
- 검증: R25 업로드 JSON을 환경변수 모드로 재검증 PASS(직접 선택/자동 탐색), 모의·오류 계약 테스트 **5/5 PASS**, SHA-verified CMD builder **3종 역추출 PASS**. **Windows 재실행 로그 PASS 확인**.
- 최신 수정 CMD는 이 브랜치의 `scripts/pc-writer/THEME_NINE_R32_PREFLIGHT.cmd`. 같은 폴더의 R25 JSON을 그대로 사용하고 새 TXT 로그만 제출한다. 원자료·이전 결과 삭제 금지.

## 7. Windows CMD 수정본 실제 재검증 PASS (2026-10-27)

- 사용자 제출 로그: `THEME_NINE_R32_PREFLIGHT_RESULT_14715_833.txt`. `REPORT=THEME_NINE_R32_READ_ONLY_PREFLIGHT`, `R32_THREE_COMPONENT_SHA_VERIFIED=YES`, Node `v24.19.0`, `status=PRECHECK_ONLY_NO_AGGREGATE`로 끝까지 정상 완료. 이전 ENOENT는 같은 경로 입력 방식의 수정본 재실행에서 재현되지 않았다.
- R25 입력 SHA256 `12544ebc141148e7fbe61765670f9807520d87de7e9b14e4f41ec85e973f0987` 일치. 9개 테마 / 편입 위치 64개 / 고유 ETF 63개 / 실제 252거래일 / 개별 점수-날짜 10,842건 확인.
- 최신 실측 점수 존재 ETF 45종, 최신 결측 18종(사용자 승인 ETF 지위 유지). 공식 발행사 AUM 증거 63종 중 점수 기준일 2026-10-23과 기준일이 같은 것은 42종, 이전 날짜의 것은 21종.
- 252일 중 실점수 ETF 3개 이상인 날짜: 로봇 252, 클라우드 252, 자율주행 183, 원전 252, 방산 252, 핀테크 230, 사이버보안 252, AI·반도체 252, 바이오 252. 2개만 있는 날짜: 자율주행 69, 핀테크 22. 0~1개 날짜 0.
- 추가 API 호출 0건, 원자료·D1·스케줄러·공개·산식 쓰기 각각 **0건**. 이 결과는 *사전점검 통과*이고 R32 가중치 및 테마 종합점수 계산 성공의 증거는 아니다.
- 미결: 이전 날짜 AUM 21종을 현재 AUM처럼 임의 재표기할 수 없고, 승인되지 않은 시차 허용기준을 신설할 수 없다. 발행사별 실제 최신 기준일이 확인되지 않으면 5단계 가중 합산과 6단계 그림자 검증을 완료 처리하지 않는다. 최신 개별 점수 18종 결측은 승인된 R32 날짜별 선택 계약에 따라 보존하며 0점 대체·승인 후보 재심사를 하지 않는다.
