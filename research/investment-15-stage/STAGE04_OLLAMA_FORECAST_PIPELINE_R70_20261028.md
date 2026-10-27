# R70 — R30 Ollama 추출기의 재사용 자동 실행 계층 (2026-10-28 KST)

작업 기준: `ansqhd5774-Choi/zgmini` / `codex/investment-15-stage-m2-r25-20261025`.
R70은 투자 점수/배포가 아닌 **프로그램 개발의 첫 연결 단계**다.

## 구현한 실행 기능

1. 새 `ollama-forecast-pipeline-r70.mjs`가 여러 주제를 반복 실행하며 발행사별 결과를 구조화한다. 채팅 중 사람이 산정한 CAGR이나 R63/R69 캐시를 입력으로 요구하지 않는다.
2. 새 `tbrcR30Adapter()`가 기존 `measureKeyword()`의 공식 TBRC 검색 → 공식 보고서 → R30 JSON 스키마 Ollama → 출처 자체 3중 검증 코드를 **다시 사용한다**. 기존 R30 파일·프롬프트·실행 결과는 수정하지 않았다.
3. 독립 검증 계층은 실제 `PASS`, 공식 URL, `source_audit=CONSISTENT`, `FORECAST_CAGR`, 수치 원문 일치, 출처 속성표 기간 일치를 모두 요구한다. 출처 충돌은 `SOURCE_CONFLICT`/NULL 유지하고 모델 실패와 분리한다.
4. 다른 발행사 어댑터를 끼울 수 있는 인터페이스를 정의했다. **서로 다른 발행사 2개 이상**의 검증된 CAGR이 있을 때만 연구 평균을 계산한다. 단일 TBRC만 연결된 현재 실행에서는 반드시 `mean_pct=null`, `INSUFFICIENT_INDEPENDENT_PUBLISHERS`로 남는다. 모델이 답한 것을 프로그램 완료로 위장하지 않는다.
5. 소스별 출처 URL·연도·조회시각·검증 사유·모델명·측정 시간을 보존하며, 다년 기간 불일치 시 경고를 붙인다. 시장 전체 GICS 성장률/실측 YoY/G/D/M/투자 순위는 산출하지 않는다.

## 개발 검증 / Windows 경로

- `ollama-forecast-pipeline-r70.test.mjs` **9/9 PASS** (개발 Node 모의 검사). 정상 2매체 평균, 3매체 중 충돌 1건, 중복 발행사, 0% 값, 기간·URL·출처 오류, 호출 실패 격리 등을 검사한다.
- `run-ollama-forecast-r70.mjs`의 기본 대표 주제 5개는 기존 R30 목록을 재사용한다. Windows CMD에 `"새 주제 키워드"` 인자를 전달하면 주제 목록을 바꿀 수 있다. 숫자 답은 소스코드에 고정하지 않는다.
- `STAGE04_OLLAMA_PIPELINE_R70_READONLY.cmd`를 **기존 Stage04 파일들과 같은 폴더**에서 실행하면 로컬 PC에서 공식 TBRC→Ollama 경로를 실행하도록 설계했다. 옆 폴더에 `R70_OLLAMA_FORECAST_PIPELINE_RESULT.json/.txt`를 기록한다.
- **실제 사용자 Windows CMD/Ollama 실행은 아직 미실행**이다. 사용자 PC에서 실행하지 않은 모의 검사 통과를 PC 검증으로 표기하지 않는다.

## 아직 필요한 실제 개발

**P1 다음 기능:** 기존 R49~R63 공식 발행사 코드·권리·검색 규칙을 재사용해 SkyQuest·Precedence를 R70 인터페이스에 연결해야 한다. 두 매체의 실제 조회 및 독립적인 Ollama 검증이 동작할 때 비로소 2개 발행사 평균 Gate를 실제로 통과할 수 있다. BRI는 사용자 기존 제외 정책 유지, 별도 요청 0회.

이후 모델 입력/실패 사례 버전관리와 회귀 자동화, 사용자 PC 실행, Stage04→05 전달로 진행한다. R69 과거 표 재실행은 선행 조건이 아니다. `main`·D1·Cloudflare·스케줄러·ETF 공탐 산식·실주문·원본 PDF 변경 없음.
