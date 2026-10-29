# Stage04 R84 — 3회 반복 회귀 검증 및 R82 결과 독립 검산 (2026-10-29)

**결론:** 기존 투자 프로세스 브랜치의 15개 테스트 파일을 R63 원장 경로까지 연결하여 **117개 테스트 × 3회 = 351개 PASS, FAIL 0, SKIP 0**. 별도로 사용자 제공 R82의 JSON 파일에서 **21개 연구 전망 평균을 3회 독립 재계산해 21/21 일치**. **실제 Windows Ollama 신규 3회 수집 실행은 수행하지 않음**. **4단계 최종 테마 확정/M4 출력은 아직 이 검증의 PASS 범위가 아님**.

- 저장소: \`ansqhd5774-Choi/zgmini\`
- 검증 브랜치: \`codex/investment-15-stage-m2-r25-20261025\`
- 검증 대상 커밋: \`da5fe2897fda93611e29d5b2b162c5933b3efd84\` (R83 선정 규정 저장 포함)
- 수행 환경: 별도 임시 경로에 해당 브랜치 **얕은·희소 복제** 후 Node.js \`v24.22.1\` 사용. 저장소/원격 소스 및 사용자 원본 데이터 수정 없음.
- 범위: Node mock/로컬 회귀 검증, 보존 R63 연구 원장 기반 비교, 사용자 제출 R82 개인 JSON의 **읽기 전용 독립 검산**.
- **수행하지 않은 작업:** 실시간 공식 웹 출처를 Ollama로 다시 수집, Windows CMD 실행, 실거래, Stage04 M4 신규 산출, 최종 테마 확정, main 병합, Cloudflare 배포.

## 1. 반복 실행 결과

| 세트 | 단위 | 1회차 | 2회차 | 3회차 | 결과 |
|---|---|---:|---:|---:|---|
| Stage04 R70/R71/R72/R78 실행기·매체·평균 | 테스트 파일 5종 | PASS | PASS | PASS | 3회 모두 0 실패 |
| Stage04 R67/R68/F 연동·기존 F/산업 대조 | 테스트 파일 5종 | PASS | PASS | PASS | 3회 모두 0 실패 |
| Stage05 기존 자료 교량·선정 점수 가드 | 테스트 파일 5종 | PASS | PASS | PASS | 3회 모두 0 실패 |
| **R63 원장 전체 연결 통합 실행** | **117개 세부 테스트** | **117 PASS** | **117 PASS** | **117 PASS** | **351 PASS / 0 FAIL / 0 SKIP** |
| 사용자 R82 JSON 독립 평균 재계산 | **21개 주제** | **21/21** | **21/21** | **21/21** | **63개 평균 대조 일치** |

초기 실행은 \`R63_MATRIX_PATH\`가 없어 일부 R67/R68 테스트 5개가 \`SKIP\`였으므로 **최종 판정에 그 실행을 사용하지 않았다**. 이후 실제 브랜치의 \`CAGR_R63_21_SOURCE_MATRIX_20261027.md\`를 지정해 117개가 모두 실행되도록 조정한 다음 **전체 3회 새로 실행**했다. 로그상 최종 3회 모두 \`tests 117; pass 117; fail 0; skipped 0\`이었다.

**재현 명령 개요 (복제된 브랜치의 루트에서):**

\`\`\`bash
R63_MATRIX_PATH=research/investment-15-stage/recovered-cagr-r63-r66/CAGR_R63_21_SOURCE_MATRIX_20261027.md \
node --test --test-isolation=none \
  research/investment-15-stage/stage04/ollama-forecast-pipeline-r70.test.mjs \
  research/investment-15-stage/stage04/ollama-forecast-r71-runner.test.mjs \
  research/investment-15-stage/stage04/official-publisher-ollama-adapters-r71.test.mjs \
  research/investment-15-stage/stage04/run-ollama-forecast-r72-safe.test.mjs \
  research/investment-15-stage/stage04/stage04-r78-criteria-regression.test.mjs \
  research/investment-15-stage/stage04-r67/forecast-sentiment-r67.test.mjs \
  research/investment-15-stage/stage04-r67/live-f-adapter-r67.test.mjs \
  research/investment-15-stage/stage04-r68/stage04-r68-matrix.test.mjs \
  research/investment-15-stage/stage04/latest-f-readonly.test.mjs \
  research/investment-15-stage/stage04/sentiment-industry-contrast-r17.test.mjs \
  research/investment-15-stage/stage05/stage05-fusion-core.test.mjs \
  research/investment-15-stage/stage05/stage05-existing-evidence-bridge.test.mjs \
  research/investment-15-stage/stage05/stage05-verified-results-handoff.test.mjs \
  research/investment-15-stage/stage05/stage05-completed-files.test.mjs \
  research/investment-15-stage/stage05/stage05-r77-result-bridge.test.mjs
\`\`\`

## 2. 사용자 R82 실측 자료 읽기 전용 재검산

입력 자료: 사용자가 제출한 \`R72_OLLAMA_FORECAST_PIPELINE_RESULT(20261028-182231).json\`, \`STAGE04_R82_21_LAUNCH_10121_8060.txt\`, \`R82_EXECUTION_DIAGNOSTIC.txt\`.

- 사용자 Windows R82 로그 자체: \`RUN_STATE=COMPLETED\`, \`TOPICS_TOTAL=21\`, \`TOPICS_DONE=21\`, \`MEANS_CALCULABLE=21\`, \`NODE_EXIT_CODE=0\`, \`HISTORICAL_CAGR_IMPORT=DISABLED\`.
- JSON 상태: \`run_state=COMPLETED\`, \`topics_total=21\`, \`topics_done=21\`, \`means_calculable=21\`, \`historical_cagr_used=false\`.
- 출처 셀 **63개(21개 주제×3개 매체)** 중 **PASS 58개, FAIL/미확정 5개**.
- 매체 **2개 평균 적용 항목 5개**, **3개 평균 적용 항목 16개**. 21개 전 항목 독립 매체 2개 이상 충족.
- 각 항목에 대해 \`PASS\` 매체의 \`growth_pct\`를 직접 산술평균하고 JSON의 \`mean_pct\`와 **절댓값 오차 0.000001 미만**인지 확인; 21/21 정확히 일치, 3회 동일.
- 서로 다른 매체명 중복이 없고 TBRC/SkyQuest/Precedence의 공식 도메인, \`FORECAST_CAGR\` 메트릭, 결측 \`growth_pct=null\`, 원출처 URL과 관측시각을 점검.
- 모든 21개 주제에 **경고 최소 1개 존재**. 그중 16개 주제는 \`R63_REFERENCE_REPORT_MARKET_NOT_GICS_SECTOR_CAGR\` 경고가 존재한다. 연구용 하위시장 전망을 전체 GICS 실현 성장이라고 위장하면 안 된다.

### 미확정 5개 매체 셀

| 연구 주제 | 발행사 | 기록된 실패 사유 | 평균 영향 |
|---|---|---|---|
| information technology | Precedence | \`SUBMARKET_OR_PROXY_REPORT_EXCLUDED\` | TBRC+SkyQuest 2개 평균 가능 |
| energy | Precedence | \`SUBMARKET_OR_PROXY_REPORT_EXCLUDED\` | 다른 2개 평균 가능 |
| consumer staples | Precedence | \`REDIRECT_OUTSIDE_PUBLISHER\` | 다른 2개 평균 가능 |
| autonomous vehicle | SkyQuest | \`SUBMARKET_OR_PROXY_REPORT_EXCLUDED\` | 다른 2개 평균 가능 |
| nuclear reactor | Precedence | \`SUBMARKET_OR_PROXY_REPORT_EXCLUDED\` | 다른 2개 평균 가능 |

**판정:** 사용자가 명시한 "대략 5개 누락 허용, 항목별 2개 이상 유효 평균" 조건을 이번 **R82 보존 실측 데이터에서는 충족**한다. 실패한 5개를 0으로 평균에 넣거나, 정상 21개 주제를 통째로 버리지 않는다.

## 3. 최종 테마 선정 규정 R83과 실행 코드의 간극

| R83 필수 요구 | 이번 검증에서 확인한 범위 | 현재 판정 |
|---|---|---|
| 21개 섹터·테마 연구 성장률, 매체당 별도 기록 | R82 JSON에서 21/21, 58/63 | **R82 이력 검증 PASS** |
| 항목마다 유효 매체 2개 이상 평균 | R82 21/21, 재계산 21/21 | **R82 이력 검증 PASS** |
| 전체 시장 점수 + 전체 시장 F | R82 연구용 CAGR JSON에서는 두 값 미출력 | **이 JSON만으로 미검증** |
| 11개 섹터 F 및 10개 테마 F의 현재 데이터·최신성 | R67/F 테스트 및 기존 코드만 회귀 PASS, 최신 API 재조회 없음 | **라이브 현재값 미검증** |
| 섹터/테마별 실제 산업 성장·수익화 근거 | R82는 공식 리서치 전망 CAGR이며 실제 YoY가 아님 | **별도 실측/연결 필요** |
| 기존 Stage03 승인 목록 기반 최종 테마 비교·확정 | R67/R68 및 Stage05 이력·보호 테스트 PASS. R82 CAGR JSON에는 \`selection_state\` / \`M4\` 없음 | **정식 선정·M4 완료로 판정 불가** |
| 최종 매력도 수식 승인 및 다음 단계 확정 전달 | 기존 R85는 검증된 \`STAGE04_M4_FINAL\`만 전달하고 CAGR을 M4로 위장하지 않음 | **Gate 동작 테스트 PASS / 실제 확정 입력 연결 미검증** |

**주의:** \`R82 JSON에 final selection 필드가 없다\`는 사실은 **R82가 전망 자료 조사기**라는 범위상 자연스러운 결과다. 이를 전체 투자 프로그램에서 기능이 없다는 단정으로 확대하지 않는다. 다만 이 파일 단독으로 \`최종 테마 확정 완료\`를 주장할 수는 없다.

R85는 과거 R78/R84의 Stage05 중복 합산 로직을 폐기하고 **이미 검증된 Stage04 M4를 다음 단계로 그대로 전달**하도록 교정했다. Stage05에서 CAGR나 F를 다시 혼합해 새 M4를 발명하는 방식은 금지된다.

## 4. 다음 검증 단계 (실시간 Windows 실행이 필요한 영역)

1. 사용자 Windows의 기존 \`STAGE04_R82_21_TOPICS_VALIDATE.cmd\` 및 완전한 패키지로 **새 수집 실행**. 이 CMD는 R77 복사본을 새 격리 폴더에 만들기 때문에 원본과 이전 결과를 덮어쓰지 않는다.
2. 각 새 실행의 런처 TXT, 회귀 테스트 TXT, 결과 JSON/TXT, 실행 진단 TXT를 확보한다. **요청한 반복성**을 실제 수집기까지 검증하려면 동일 21개 주제로 최소 2개의 **독립된 새 실행**이 필요하며, 각 실행에서 2개 매체 Gate 및 누락 사유를 비교해야 한다.
3. Stage01 전체 시장 점수/전체 시장 F, Stage02 섹터 F, Stage03 테마 F·승인 목록을 독립 시점·최신성 필드와 함께 읽는 **통합 결과 계약**을 검증한다.
4. R83 Stage04 최종 후보 선정 규정의 실구현 유무와 R85 Stage05의 \`M4\` 검증된 전달 입력 파일을 **실제 코드·PC 출력에서 확인**한다. 누락 항목은 승인된 산식 불변을 지킨 채 추가한다.
5. 사용자 승인 없는 임의 가중치·임계값·\`M=100-F\`·최종 투자매력 순위·실주문·배포 없음.

**상태:** \`READONLY_REPEAT_REGRESSION_PASS\` / \`R82_HISTORICAL_JSON_RECALC_PASS\` / \`NEW_LIVE_WINDOWS_OLLAMA_RUN_NOT_EXECUTED\` / \`FINAL_THEME_SELECTION_NOT_VERIFIED\`.
