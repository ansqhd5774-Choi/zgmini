# 4단계 R78 — 기수립 올라마 조사 기준 복구·유실 방지 (2026-10-29)

## 상태와 수정 경계

- **전용 기존 브랜치만 사용:** `codex/investment-15-stage-m2-r25-20261025`. 새 브랜치 생성하지 않는다.
- 목적은 이미 수립·반복 시험한 4단계의 **조사 과정과 공식 출처 주소 연결을 복구**하는 것이다. 산업·테마 선정, 1~3단계 재평가, 5단계 신규 선정 산식 작성, 기존 평균의 임의 재산출이 아니다.
- 기수립 근거 파일은 제거하거나 덮어쓰지 않는다. 최종 점수, 5단계 테마/기업 선정, 매매·배포에는 변경이 없다.
- R63의 **21개 주제·공식 보고서 주소 60건**은 당시 연구 기록으로 남아 있다. 그 주소만 자동 수집의 *미검증 후보*로 재사용한다.

## 과거 확정 기준(변경 금지)

| 세부 역할·판정 | 원문 기준 파일 | R78 적용 |
|---|---|---|
| 사용자 승인된 역할 분리: 수집 코드→로컬 올라마 추출→결정론적 검증→2개 이상 독립 발행사 평균 | `STAGE04_OLLAMA_AUTONOMOUS_PROCESS_CONTRACT_20261027.md` | 그대로 유지 |
| R37 공식 보고서 *주소만* 발견 힌트로 사용하고 저장된 수치·통과 표시 미사용 | `stage04/stage04-four-publisher-r37-readonly.mjs` | R78 주소 힌트 연결로 복구 |
| R45/R48 모델 후보·원문 대조와 1개 주제 반복 실측, R58 PC 반복 실측 | `stage04/stage04-topic01-r45-readonly.mjs`, `stage04/stage04-topic01-r48-repeat.mjs`, `STAGE04_R58_PC_VERIFIED_TOPICS05_07_20261027.md` | 기존 파일 보존; **R78이 PC 반복 실측 완료를 의미하지 않음** |
| R49 공식 3사만 허용. BRI HTTP 403 제외 | `STAGE04_R49_BRI_EXCLUSION_POLICY_20261027.md` | TBRC·SkyQuest·Precedence만 |
| R63 21×3 공식 주소 원장 및 과거 성장률 기록 | `recovered-cagr-r63-r66/CAGR_R63_21_SOURCE_MATRIX_20261027.md` | **주소만** 별도 R78 모듈에 복구. 기록의 과거 성장률은 코드에 연결하지 않음 |
| R67 2개 이상 독립 발행사 평균, 기간·범위 주의 | `stage04-r67/STAGE04_R67_TWO_SOURCE_MEAN_AND_SENTIMENT_IMPLEMENTATION_20261027.md` | 기존 집계기 유지 |
| R70~R77 공식 발행사 현재 조회·시장 범위 일치·전망기간·원문 내 수치 충돌·올라마 범위 판정 | `stage04/ollama-forecast-pipeline-r70.mjs`, `stage04/official-publisher-ollama-adapters-r71.mjs`, `STAGE04_R77_OFFICIAL_SITEMAP_FROM_R76_PC_20261028.md` | 검증·NULL·2사 게이트 유지 |

**구분:** R63의 21/21 과거 *연구 평균*을 R77의 21/21 현재 올라마 검증 결과로 간주할 수 없다. R63 기록 자체의 모델 교차검증은 0건으로 표기돼 있으며, R77 PC 로그에서는 21건 중 평균 계산 가능한 항목이 8건이었다. 출처별 실제 검증 수준이 다른 기록을 하나로 합치지 않는다.

## R78 구현

1. `stage04/stage04-r63-official-address-hints-r78.mjs`에 당시 21개 주제별 TBRC·SkyQuest·Precedence 공식 도메인의 URL 60개를 읽기 전용으로 고정한다. 존재하지 않았던 3개는 `null`로 보존한다. BRI·제4매체·새 URL·성과 수치·시장 추정치를 추가하지 않는다.
2. `stage04/official-publisher-ollama-adapters-r71.mjs`의 **SkyQuest/Precedence** 수집기가 해당 주제에 이전 공식 주소 힌트가 있을 때 먼저 **현재 공식 홈페이지 GET**을 시도한다. 주소가 없거나 무효·403·시장 명칭 불일치·기간 누락 등으로 실패하면 기존 공식 카탈로그·사이트맵·검색 절차를 계속 사용한다.
3. 예전 주소도 예외 없이 `officialReportUrl` 검사를 받는다. 실제 GET을 통과해도 현재 보고서 제목과 대상 시장이 같지 않은 하위 시장·대체 지표는 제외한다. 올라마의 `DIRECT` 선택·원문 CAGR 숫자·기간·원문 내 상충 검증을 생략하지 않는다. 충돌은 `SOURCE_CONFLICT`/NULL로 남긴다.
4. 기존 **TBRC R25/R30 수집 경로는 수정하지 않는다**. TBRC의 과거 URL 21건은 R78 원장에 보존하지만 R25 수집기를 우회하는 수동 직접 조회로 간주하지 않는다. 따라서 이번 변경의 실시간 URL 힌트 우선 시도는 SkyQuest/Precedence에 한정된다.
5. 기존 2사 평균 집계기는 그대로 사용한다. 과거 평균·성장률을 R78 코드로 로딩하거나 누락을 0으로 보정하거나 과거 값을 현행 값처럼 반환하는 경로는 **없다**.

## 재유실 방지 검증

- 테스트: `node --test stage04/ollama-forecast-pipeline-r70.test.mjs stage04/ollama-forecast-r71-runner.test.mjs stage04/official-publisher-ollama-adapters-r71.test.mjs stage04/run-ollama-forecast-r72-safe.test.mjs stage04/stage04-r78-criteria-regression.test.mjs` (현재 디렉터리: `research/investment-15-stage`).
- 회귀 테스트는 **21개 주제/60개 주소**, 발행사 3사 화이트리스트·BRI 제외, 공식 GET 403이면 NULL, 과거 대체 시장 제외, 재조회한 실제 2사 수치만 평균 계산, 이전 R71/R77 공식 사이트맵 재사용 흐름을 고정한다.
- 다른 개발에서 주소 목록이나 힌트/검증 연결이 삭제되면 테스트 실패로 드러나도록 같은 전용 브랜치에 저장한다.
- `stage04/STAGE04_R78_21_TOPICS_VALIDATE.cmd`는 기존 PC R77 폴더를 새 작업 폴더로 복사하고 R78의 **두 소스 파일만 새 폴더에 교체**한 후, 명시된 21개 키워드를 1회 실행한다. 원본 R77 폴더 및 과거 로그를 수정하지 않는다.
- 실제 Windows PC R77 ZIP은 변경되지 않는다. R78 프로그램을 PC에서 별도 실행하고 JSON·TXT·실행 로그를 다시 제출하기 전까지 **새로운 21/21 결과나 PC 실측 완료를 주장하지 않는다**. `RUN_STATE=COMPLETED`는 21개 실행 종료만 의미하며, 검증된 성장률 21/21을 뜻하지 않는다.

## 남은 사실

R78은 분실된 **공식 출처의 연결과 기수립 조사 계약**을 보존·복구한 것으로, 과거의 좁은 하위 시장 보고서를 현재의 넓은 21개 섹터 전체 CAGR로 자동 인정하는 기능이 아니다. 해당 시장이 다른 경우 현재 검증 코드의 미산출 처리를 그대로 보존한다. 과거 21/21 연구 평균과 현재 검증 수가 일치하지 않더라도 신규 산식·점수·선정 기준을 만들지 않는다.
