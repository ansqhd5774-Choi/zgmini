# R41 원문 기사 → 로컬 Ollama 영문 사건 검증 → 기존 R5 입력 (단계적 전환)

## 사용자 승인 범위

- 사이트 한국어 번역 및 UI는 **다른 작업자 담당**. 이 작업에서 변경하지 않는다.
- Ollama는 번역하지 않고 **영어 기사 원문에 명시된 사건의 사실성·단계만 검증**한다.
- 최종 목표는 검증된 사건을 기존 R3_5 분류 규칙 및 R5 계산에 반영하는 것이다.
- 승인된 R5 영역 비중, 점수 가감점, 민감도, 14일 차트·공개 API 스키마는 변경하지 않는다.

## 현재 구현된 안전 연결

1. `news-r41-english-score-evidence-r1.mjs`: 기사 ID, 제목, URL, 발행일, 출처별 이용권한을 검사한다. 라이선스 범위가 영문 점수 심사에 맞지 않는 매체는 원문 본문을 추론에 넘기지 않는다.
2. 승인된 본문이 있을 때에만 로컬 `127.0.0.1:11434`의 Ollama에서 **영문 근거 검토 JSON**을 생성한다. 한국어 출력 필드·번역 작업은 없다.
3. AI가 제시한 문장은 원문 본문에 **문자 그대로 존재**해야 한다. 그 문장과 기존 원문 제목이 각각 동일한 R3 규칙에 일치하고, 사건 발생/진행 상태가 부정·조건·계획이 아니며, 행위자·장소가 충돌하지 않을 때만 `EVIDENCE_CONFIRMED`가 된다. 원문 인용문은 결과에 저장하지 않고 SHA-256으로 기록한다.
4. `published-news-score-input-r1.mjs`의 `REQUIRE_VERIFIED_ENGLISH_EVIDENCE` **명시적 선택 모드**에서만 확인된 기사 사건이 기존 `planScoreNewsInput` 원장·중복·게시일·R5 계산 경로로 들어간다. 같은 사건에 이중 가점이 부여되지 않도록 기존 중복 규칙을 그대로 사용한다.
5. 과거 점수 입력이나 체크포인트를 지우지 않는다. 새 출처를 이유로 이전의 승인 7개 출처 정책을 확장하지 않는다.

## R41 출처 수 변경

- 과거 `sourceCount===7` 고정 조건은 현재 11개 설정 중 최근 14일 실제로 보이는 8개 출처를 놓친다.
- `status=READY`, 실제 배열 수, 실제 고유 출처 수, 14일 범위를 함께 검증한다.
- Reuters·AP·Arab News·Anadolu Agency는 공개 뉴스 목록에 있어도 기존 R5 출처 승인이 없으므로 `SOURCE_NOT_APPROVED_FOR_R5`로 보류한다. 필요하면 후속 승인·근거 검토를 통해 추가한다.
- 빈 응답, 미승인 출처만 존재하는 응답, 잘못된 항목, 오래된 기사에서는 이전 점수 입력을 보존한다.

## 아직 운영 반영되지 않은 부분

- 코드 기본 모드는 `LEGACY_TITLE_ONLY`다. 운영 PC의 기존 점수 계산 및 공개 점수에는 이번 영문 Ollama 검증이 **아직 자동 활성화되지 않는다**.
- `runEnglishScoreShadow`는 read-only·`SHADOW_ONLY`·`r5ScoreChanges=0`이다. 운영 PC에서 직접 확인한 원문 본문과 AI 결과를 동일 실행 흐름에서 대조한 후에만 명시 모드로 전환한다.
- 운영 PC에서는 기존 승인 Node·Ollama 설치를 그대로 사용하여 CMD에서 다음을 실행할 수 있다. 현재 공개 R41을 읽고 이용 가능한 원문만 추출·검증한다. 결과는 콘솔 집계이며 자동 게시나 기존 Windows 예약 작업 변경이 없다.

```cmd
node scripts\iran-progress\english-score-preview-r1.mjs --preview
```

또는 저장소의 `scripts\iran-progress\IRAN_ENGLISH_SCORE_R1_PREVIEW.cmd`를 실행하면 기존 Node 선택기를 이용하고, 같은 폴더의 `IRAN_ENGLISH_SCORE_R1_PREVIEW_RESULT.txt`에 기사별 검증 상태와 실패 원인을 기록한다. 이 CMD는 예약 작업·D1·PC 원장·공개 점수를 변경하지 않는다. 분석용 기사 본문과 AI 인용문을 결과 파일에 기록하지 않는다.

- 프리뷰 시작 전에 로컬 Ollama의 `gemma3:4b` 설치 상태를 확인하며, 모델이 없거나 서버가 중지된 경우 **성공으로 표시하지 않고 BLOCKED** 처리한다.
- 결과 `evidenceConfirmed`는 **근거 확인 건수**이지 공개 R5 점수 변경 건수가 아니다. `r5ScoreChanges`는 실제 게시 전까지 0이다. 정상 동작이라도 원문 이용권한이 없는 항목은 보류한다.
- 2026-10-31 첫 Windows 실행: R41 67건/8개 출처 중 `evidenceConfirmed=0`, `evidenceHeld=1`, 권리 보류 60건, 원문 본문 확보 실패 6건. GOV.UK 1건은 원문 검증 후 `ORIGINAL_TITLE_NO_APPROVED_EVENT`로 보류됐으므로 **모델이 전혀 호출되지 않았다는 의미는 아니다**. 이 실행으로 R5 점수는 변경되지 않았다.
- 후속 읽기 전용 진단: `modelCallsAttempted`, `modelCallsSucceeded`, `sourceFailureReasons`, 기사별 `sourceFailure`를 추가하여 올라마 추론 성공 여부와 Tasnim 6건의 본문 수집 실패 원인을 분리한다. `sourceFailure`에는 기존 실패 코드만 기록하며 기사 본문·인용문은 포함하지 않는다. 라이선스 보류 60건을 임의로 승인하지 않는다.
- **Tasnim 본문 구조 확인 단계:** 6건 모두 제목 확인 후 `NEWS_R26_TASNIM_BODY_MISSING`으로 멈췄다. 기존 수집기는 JSON-LD `articleBody`가 있어야 하므로, 실제 기사 페이지에서 해당 필드가 누락됐는지 또는 다른 HTML 요소에 들어 있는지를 읽기 전용으로 확인한다. 기존 `scripts\iran-progress\IRAN_TASNIM_HTML_SHAPE_R1.cmd`를 PC에서 실행하고 `IRAN_TASNIM_HTML_SHAPE_R1_RESULT.txt`를 제출한다. 이 진단은 기사 URL, HTML 크기, JSON-LD 기사 개수·제목 일치 건수·`articleBody` 자료형/문자 수, 후보 요소의 태그·클래스·ID, 문단 개수만 기록한다. **본문 문장과 HTML 원문 자체는 출력·저장하지 않는다.** 해당 결과로 안전한 본문 추출 기준을 확인하기 전에는 추출 규칙을 추측하거나 점수 입력을 변경하지 않는다.
- **Tasnim 구조 결과(2026-10-31):** 6/6 HTML 로드·JSON-LD 제목 정확 일치, 6/6 `articleBody` 없음, 6/6 `article.single-news`, `div.story` 등 후보 요소 존재, 문단 6~16개. 따라서 R2에서는 JSON-LD 기사 제목·URL을 기존 R26 방식으로 먼저 검증한 뒤 **유일한 `div.story` 영역의 문단만** 추가로 추출한다. 2개 이상 문단 및 120~18000자 제한을 통과하지 않으면 모델 입력을 보류한다. 기존 R26/한국어 기사 수집기에는 변경을 가하지 않는다.
- **R2 PC 그림자 프리뷰:** `scripts\iran-progress\IRAN_ENGLISH_SCORE_R2_PREVIEW.cmd` 실행 후 `IRAN_ENGLISH_SCORE_R2_PREVIEW_RESULT.txt`를 제출한다. 기존 R1 프리뷰는 그대로 보존하며 R2는 권리·출처·제목 검증을 통과하고 기존 본문 필드만 빠진 Tasnim 뉴스에만 추가 추출을 시도한다. PC에서 실제 본문 회수와 로컬 Ollama 분석이 확인되기 전에는 `R5` 공개 점수 연결을 활성화하지 않는다. 출력에는 기사 본문·AI 인용문을 저장하지 않고 상태와 횟수만 남긴다.
- **R2 PC 실제 결과(2026-10-31):** 공개 R41 67건·8개 출처 가운데 직접 이용 가능했던 7건의 영문 본문은 전부 확보됐다(`sourceUnavailable=0`). Ollama 모델 호출은 7건 시도·2건 JSON 생성 성공·5건 `IRAN_ENGLISH_SCORE_EVIDENCE_MODEL_INVALID`로 보류됐다. 검증된 사건은 0건이고, 나머지 60건은 기존 권리 정책에 따라 보류됐다. 이는 R5 운영 점수 적용 성공을 의미하지 않는다.
- **R3 사건 인식 보완(2026-10-31):** 실제 Tasnim 기사 제목 `At Least 14 Killed in Saudi Strikes on Yemen As Attacks Reach 101 in 24 Hours`는 전형적인 **사망자 먼저 → 공격 나중** 문장이라 기존 R3 공격 정규식에서 빠져 있었다. `lib/iran-progress/reference-flow-r3.mjs`의 기존 `MILITARY_ATTACK` 조건에 이 순서만 추가했다. 기존 범주·가중치·점수(`MILITARY_ATTACK`, `-12`)와 기타 점수 산식은 변경하지 않는다. 미래 가정, 공격 계획, 부정 표현 및 단순 경고는 계속 구분하여 보류하거나 기존 경고 점수만 적용한다. 검증은 *보도된 사실에 대한 원문 증거 확인*이지 사건을 독립적으로 사실 확정하는 과정이 아니다.
- **R3 Ollama 인용 보강:** R3 영문 사건 규칙에 부합하고 원문 본문에 실제 존재하는 영어 문장만 최대 12개 `supportingQuote` 후보로 만든다. 후보가 있으면 Ollama 공식 JSON Schema `enum` 선택값으로 제한한다. 응답은 이 제약과 무관하게 기존 결정론적 R3 근거·행위자·장소 검증을 다시 통과해야 한다. 후보가 없으면 자동 승인하거나 R5로 보내지 않는다. 기존 R1·R2 및 일반 Ollama 코드 경로는 유지된다.
- **R3 PC 그림자 프리뷰:** `scripts\iran-progress\IRAN_ENGLISH_SCORE_R3_PREVIEW.cmd`를 실행한 뒤 **`IRAN_ENGLISH_SCORE_R3_PREVIEW_RESULT.txt`**를 제출한다. 원문 수집 경로는 R2와 같고 영문 점수 근거 선택만 보강한다. 파일에는 본문·인용문 대신 모델 호출 수·확인 상태·실패 코드를 기록하며 `publicWrite=false`, `r5ScoreChanges=0`을 유지한다. 원본 R1·R2 프리뷰와 예약 작업·기존 PC SQLite·공개 API·D1은 변경하지 않는다.
- **R3 PC 실제 결과(2026-10-31):** R41 67건·8개 출처, 허용 원문 7건, 모델 호출 7건 중 구조 검증 통과 3건·`IRAN_ENGLISH_SCORE_EVIDENCE_MODEL_INVALID` 4건, 원문 수집 실패 0건, 권리 보류 60건, `EVIDENCE_CONFIRMED=0`건. 구조 검증 성공한 3건 중 GOV.UK 1건과 Tasnim 1건은 기존 R3 제목에 점수 대상 사건이 없어서 보류, **사망자 우선 표현의 Tasnim 공습 1건은 `EVENT_NOT_VERIFIED_AS_OCCURRED`**로 보류됐다. 해당 기사 한 건도 실제 발생 사실이 독립적으로 증명됐다는 뜻이 아니며, R5 점수는 변경되지 않았다.
- **R4 단계별 개선(2026-10-31):** 기존 R3 제목 분류를 로컬에서 먼저 실행해 사건이 없는 기사는 `ORIGINAL_TITLE_NO_APPROVED_EVENT`로 명시적으로 보류한다. 권리 제한을 풀지 않으며, 사건 없는 기사 본문을 불필요하게 가져오거나 Ollama에 넘기지 않는다. 사건 있는 기사라도 원문에 같은 단계·주체의 직접 인용 후보가 없으면 `NO_MATCHING_EVENT_QUOTE`로 모델 호출 없이 보류한다. 기존 R1·R2·R3 실행 경로 기본값은 변경하지 않는다.
- **R4 보도 단계 정의:** Ollama의 `REPORTED_COMPLETED`는 **출처가 이미 발생한 사건이라고 보도했다는 뜻**이며, 실제 사실을 독립적으로 확정한다는 뜻이 아니라고 명시한다. 사건의 발생 자체를 부정하거나 서로 상충하는 근거가 있는 경우, 계획·가능성·미래 가정과 함께 기존 보류 규칙을 유지한다. 이 조정은 모델 프롬프트의 의미 명확화일 뿐 **기존 R5 점수·가중치·단계 규칙을 바꾸지 않는다**.
- **R4 안전 진단:** 본문·모델 출력·인용문을 저장하지 않고 `screenedOutNoEvent`, `heldNoMatchingQuote`, `inferenceFailureCodes`, 기사별 `diagnosticCode`, `modelStageStatus` 등 **정해진 진단 코드**만 추가로 출력한다. 모델이 없는 경우 기존 `BLOCKED` 게이트를 그대로 유지하고, 인용문이 존재해도 검증 규칙을 우회하지 않는다. 과거 R3 실제 7건 중 로컬 제목 재검사 결과는 **6건 사전 보류 / 공습 1건 모델 대상**이다. 이는 코드상의 선별 결과이며 PC 모델 최종 판정은 R4 실행으로 확인해야 한다.
- **R4 PC 그림자 프리뷰:** `scripts\iran-progress\IRAN_ENGLISH_SCORE_R4_PREVIEW.cmd`를 실행한 뒤 **`IRAN_ENGLISH_SCORE_R4_PREVIEW_RESULT.txt`**를 제출한다. 기존 원장·예약 작업·공개 점수·D1에 쓰지 않으며 `publicWrite=false`, `r5ScoreChanges=0`이다. `FINAL_STATUS=ENGLISH_SCORE_R4_SHADOW_NO_PUBLISH`를 확인하기 전에는 완료를 선언하지 않는다.
- Ollama 실제 모델 설치·실행, 자동 실행 스케줄/PC SQLite/Cloudflare D1 쓰기/공개 점수 반영 검증은 별도 운영 게이트가 필요하다. 테스트 PASS만으로 운영 적용 성공을 선언하지 않는다.
- 일부 매체의 본문 이용 권리가 제한되어 있으므로 **67개 기사 모두의 AI 검증은 보장되지 않는다**. 결측은 중립/완화 점수로 간주하지 않는다.

## 회귀 테스트

```bash
node --test tests/iran-news-r41-english-score-evidence-r1.test.mjs tests/iran-published-news-score-input-r1.test.mjs tests/iran-news-r41-auto-interpret-r1.test.mjs tests/iran-r5-publication-reality-guard.test.mjs tests/iran-score-news-input-r1.test.mjs tests/iran-tasnim-html-shape-r1.test.mjs tests/iran-tasnim-english-body-r2.test.mjs tests/iran-r3-casualty-headline-r1.test.mjs tests/iran-english-bound-quote-r3.test.mjs tests/iran-english-score-preview-r4.test.mjs
```

다음 운영 단계: 최신 `main` 소스와 PC 승인 SHA 비교 → 승인된 영문 본문 수집 경로와 동일 PC 영문 Ollama 프리뷰 연결 → 샘플 기사별 원문·사건·중복·R5 점수 차이 대조 → 별도 운영 승인/검증 후 공개 점수 반영.
