# 04단계 R71 — 세 공식 발행사 × 로컬 Ollama 자동 실행 연결

기준일: 2026-10-28 (KST)  
고정 개발 브랜치: `codex/investment-15-stage-m2-r25-20261025`

## 목적과 이번 구현 범위

이 작업의 주체는 ChatGPT 수동 조사자가 아니라 **실행 중인 연구 프로그램**이다. R70의 독립 발행사·연구 평균 엔진을 유지하면서 기존 R30 TBRC 외 **SkyQuest 및 Precedence**를 공식 HTML 수집 → 수치 후보 추출 → 로컬 Ollama 원문 후보 선택 → 소스 게이트에 연결했다. 과거 R63/R69 CAGR 값을 런타임의 연구 입력으로 넣지 않는다.

## 실행 진입점

- `STAGE04_OLLAMA_PIPELINE_R71_READONLY.cmd`: Windows Node 런타임으로 실행. 특정 항목을 인자로 전달할 수 있고, 미지정 시 R30의 5개 검증용 키워드로 반복한다. 동일 키워드 중복은 제거한다. 이 CMD는 읽기 전용이고 Windows에서 직접 실행해야 하며 ChatGPT가 사용자 PC Ollama를 실행했다는 뜻이 아니다.
- `run-ollama-forecast-r71.mjs`: TBRC(R30 엄격 감사), SkyQuest/Precedence(R71 원문·기간 직접 증거)를 원격 공식 보고서마다 조회한다. 출력은 CMD와 같은 위치의 `R71_OLLAMA_FORECAST_PIPELINE_RESULT.json` 및 `.txt`이다.
- `official-publisher-ollama-adapters-r71.mjs`: SkyQuest 공식 목록과 Precedence 공식 홈페이지를 먼저 탐색하고, 필요한 경우에만 최대 2개 검색엔진을 탐색한다. 공식 HTTPS 보고서 후보 최대 2개까지 검증하며, 해당 발행사 프로세스의 네트워크/모델 호출은 20초 요청 예산으로 묶는다.
- R70 `ollama-forecast-pipeline-r70.mjs`: `CONSISTENT`와 `EXCERPT_PERIOD_VERIFIED` 출처 감사를 명시적으로 분리해서 수용하고, 두 번째 유형의 자료가 평균에 들어가면 `EXCERPT_ONLY_AUDIT_NO_SIZE_TRIANGULATION` 경고를 단다. R71 중간값이 `PROXY`라면 평균에서 제외한다.

## 수치 확정 및 보류 규칙

1. 보고서 링크는 해당 발행사 공식 HTTPS 도메인·허용 경로여야 하고 공식 원문을 이번 실행에서 취득해야 한다. 검색엔진의 미리보기·캐시·외부 도메인 링크 자체는 CAGR 증거가 아니다.
2. 수치 후보는 보고서 본문에 실제 적힌 CAGR 숫자여야 하며, 같은 근거 문장/짧은 발췌 범위에서 **전망 기간 두 연도**를 명시해야 한다. Ollama는 후보 인덱스와 `DIRECT/PROXY` 범위만 선택한다. 새로운 성장률을 만들어내지 못한다.
3. 동일 명시 전망기간에 서로 다른 CAGR 값이 확인되면 `SOURCE_CONFLICT` / 수치 NULL. 접근 403, 날짜 불명, 출처 불명, Ollama 실패도 NULL. 출처마다 부정확한 과거값으로 대체하지 않는다.
4. **최소 서로 다른 두 개의 공식 발행사**에서 게이트를 통과한 값만 단순 산술평균한다. 전망 기간이 다른 두 전망을 합칠 경우 경고를 남긴다. CAGR 평균은 연구용 산출값이며 G/D/M 점수·섹터 선호·기업 선정·매매 신호가 아니다.
5. TBRC의 `CONSISTENT`(R30 규모·본문·속성 검증)와 SkyQuest/Precedence의 `EXCERPT_PERIOD_VERIFIED`는 **같은 증거 등급이 아니다**. 후자에는 규모 수치·원문 표의 3중 대조가 아직 구현되지 않았으므로 경고가 반드시 표시된다.

## 개발 검증과 남은 범위

- Node 기본 테스트: R70 9/9, R71 발행사 테스트 9/9, R71 실행기 테스트 3/3 — **21/21 PASS** (외부 요청은 고정 모의 응답 사용).
- R71 사용자 Windows CMD 실측, 원격 발행사 실제 응답률, 로컬 Ollama 모델 설치 및 실제 평균 성공률: **이번 개발 작업에서 아직 검증되지 않음**. PC 결과 파일에서 확인해야 한다.
- 다음 순서: PC 세 매체 실측 결과를 받아 실수집 장애·모델 추출 실패만 수정 → 실제 2개 이상 자료의 출처 품질을 단계적으로 강화 → 검증된 Stage04 연구 출력의 Stage05 입력 계약 구현. 미승인 투자 점수 및 주문으로 확장하지 않는다.
- 보존: R69 역사 자료, R30 실행·출처 내부 충돌 규칙, R70 단일 매체 실행기, 기존 15단계 원본·G/D/M 미승인 산식·운영 점수·D1·배포·스케줄러.
