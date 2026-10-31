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
- Ollama 실제 모델 설치·실행, 자동 실행 스케줄/PC SQLite/Cloudflare D1 쓰기/공개 점수 반영 검증은 별도 운영 게이트가 필요하다. 테스트 PASS만으로 운영 적용 성공을 선언하지 않는다.
- 일부 매체의 본문 이용 권리가 제한되어 있으므로 **67개 기사 모두의 AI 검증은 보장되지 않는다**. 결측은 중립/완화 점수로 간주하지 않는다.

## 회귀 테스트

```bash
node --test tests/iran-news-r41-english-score-evidence-r1.test.mjs tests/iran-published-news-score-input-r1.test.mjs tests/iran-news-r41-auto-interpret-r1.test.mjs tests/iran-r5-publication-reality-guard.test.mjs tests/iran-score-news-input-r1.test.mjs
```

다음 운영 단계: 최신 `main` 소스와 PC 승인 SHA 비교 → 승인된 영문 본문 수집 경로와 동일 PC 영문 Ollama 프리뷰 연결 → 샘플 기사별 원문·사건·중복·R5 점수 차이 대조 → 별도 운영 승인/검증 후 공개 점수 반영.
