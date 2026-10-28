# R82 — 5단계 Ollama 테마·핵심 기술·관련 기업 조사 실행기

- 고정 브랜치: `codex/investment-15-stage-m2-r25-20261025` (새 브랜치 생성 금지).
- **Stage05만 구현**. Stage01~04 파일·산식·운영 자료 재조회/재검증/수정 없음.
- 입력: 기존 Stage05 계산기에서 발행하는 `STAGE05_VERIFIED_RESULTS_HANDOFF_R81` JSON. 9개 테마의 이미 계산된 `E/T/S5`가 있어야 시작한다. 과거 F 또는 CAGR을 임의로 점수로 승격하지 않는다.
- 출력: **Ollama가 선택**한 테마와 선정 이유, 해당 테마의 핵심 기술 수요·상용화·대체 기술, 관련 기업 후보/사업 노출, 원문 URL 및 한계. 기업 재무점수·매수/매도·주문 없음.

## 실행 구조

1. **프로그램**이 전달된 Stage05 점수 JSON의 구조와 이미 확정된 산식 `S5=0.8E+0.2T` 일치 여부만 확인한다. 다른 단계의 산식을 재평가하지 않는다.
2. **Ollama**가 9개 후보와 계산된 점수를 읽어 유망 테마를 **직접 선정**한다. 프로그램은 테마를 선제적으로 골라 주지 않는다.
3. **Ollama**가 선택된 테마만 웹 검색(`web_search`)하고 필요 원문을 요청(`web_fetch`)한다. 프로그램은 허용된 도구 요청만 실행하며, 검색·자료 해석을 임의로 대신하지 않는다.
4. **Ollama**가 기술과 관련 기업을 조사·설명한다. 프로그램은 승인 테마 ID와 원문을 실제 읽은 URL인지 기계적으로 검사하고 결과를 JSON으로 출력한다. URL 검사는 사실 자체의 독립 검증이 아니다.

## 명시 실행

```text
STAGE05_OLLAMA_RESEARCH.cmd STAGE05_HANDOFF.json EXISTING_OLLAMA_MODEL
```

또는:

```text
node stage05-ollama-research-cli.mjs --input STAGE05_HANDOFF.json --model EXISTING_OLLAMA_MODEL
```

- 기존 Ollama가 PC에서 실행 중이어야 하며 로컬 채팅 주소는 기본 `http://127.0.0.1:11434/api/chat`다. 기존에 명시적으로 설정된 `OLLAMA_HOST`도 지원한다.
- 웹 검색·원문 제공은 Ollama 공식 API를 호출한다. 기존에 설정된 `OLLAMA_API_KEY`가 없으면 추가 권한/가입·결제를 시도하지 않고 `AUTOMATION_BLOCKED`로 종료한다. API 검색 기능은 [공식 문서](https://docs.ollama.com/capabilities/web-search)를 따른다.
- 출력은 표준 출력 JSON이며 실행 시 자동 파일 덮어쓰기·예약·사이트 배포·주문을 하지 않는다. 점수 미완료는 `BLOCKED_INPUT_NOT_READY`, 종료 코드 2, Ollama 호출 0회다.
- 안전 상한은 연구 도구 요청 20회, 모델 연구 라운드 12회다. 해당 상한을 넘으면 임의 재실행 없이 오류를 남긴다.

## 개발 검증과 남은 Gate

- R82 모의 모델·검색/원문 도구 회귀 테스트: 결측시 모델 호출 0, Ollama 테마 선정 유지, 무관 테마 삽입 차단, 미열람 URL 허위 인용 차단, 무선정 허용, 중복/누락 점수 차단, 도구 요청 상한 차단.
- **Windows PC Ollama 실제 실행, 검색 API 인증/요금 상태, 실시간 근거 품질, 최종 테마/기술/기업 선정 성능은 아직 검증하지 않았다.** 가상 모의 테스트를 실제 선정 성과로 표현하지 않는다.
- 현재 사용 가능한 R81 입력 상태는 최종 점수 0/9이므로 아직 모델 조사를 시작할 조건이 아니다. **이는 이번 R82에서 1~4단계를 재점검할 이유가 아니며**, 사용자가 제공하거나 기존 시스템이 산출한 완결 결과를 받으면 본 실행기가 그대로 소비한다.
- 원칙적으로 원문을 얻지 못하면 `NO_FETCHED_PRIMARY_EVIDENCE`이며, 숫자나 기업을 임의 생성하지 않는다.

## R83 — 이미 완료된 R77 사용자 PC 결과의 Stage05 연결 (2026-10-28)

- **기존 Stage04 재실행 없음.** Stage04 R72/R77 Windows 실행기가 이미 저장한 `../stage04/R72_OLLAMA_FORECAST_PIPELINE_RESULT.json`을 Stage05에서 직접 읽는다.
- Stage05 전용 `stage05-r77-result-bridge.mjs`는 완료 상태·5개 원본 주제·발행사별 보고서 URL·CAGR·경고·평균을 읽기 전용으로 전달한다. Stage04 원본 파일·Ollama·공식 사이트를 호출하거나 재검증하지 않는다.
- 기존 `stage05-fusion-readonly.mjs`에 `--handoff-r77` 옵션을 추가했다. `--output-dir` 지정 시 기존 디렉터리에 중복되지 않는 `STAGE05_R83_SAVED_R77_HANDOFF_*.json` 결과를 새로 기록하며 덮어쓰지 않는다.

Windows에서 **기존 Stage05 폴더**를 현재 디렉터리로 연 상태라면:

```bat
STAGE05_FUSION_READONLY.cmd --handoff-r77 --output-dir .
```

R77 결과 JSON이 다른 위치에 보존되어 있다면:

```bat
STAGE05_FUSION_READONLY.cmd --handoff-existing --r77-report "R77_기존_결과_파일.json" --output-dir .
```

나중에 **이미 계산·검증된** 01~04 점수 스냅샷이 별도 제공되면 같은 저장된 R77 자료를 함께 전달할 수 있다:

```bat
STAGE05_FUSION_READONLY.cmd --handoff-input "EXISTING_SCORES.json" --r77-report "R77_기존_결과_파일.json" --output-dir .
```

- R77 `mean_pct`는 **연구용 전망 성장률**로 보존한다. `M4`, `E`, `T`, `S5`로 변환하지 않으며, 미산출된 4개 주제는 `null` 그대로 유지한다.
- 원본 R77만 연결한 경우 `SCORED=0/9`, `status=BLOCKED_STAGE01_04_SCORES`, 종료 코드 2다. 이는 Stage05 실제 점수·Ollama 테마 선정 완료가 아니다.
- 점수까지 준비된 경우 R77 자료는 **Ollama 참고 문맥**으로 전달되며, 테마 선택과 핵심 기술·기업 조사 판단은 Ollama에 남긴다.
- 개발 환경에서는 원본 R77 형식의 **가상 입력**으로 연결과 NULL 유지가 확인됐다. 사용자 PC의 원본 JSON을 실제 연결·실행한 기록은 아직 없다.
