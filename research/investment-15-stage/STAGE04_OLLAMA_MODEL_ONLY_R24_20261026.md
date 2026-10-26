# R24: 매체 403과 분리된 로컬 Ollama 독해 속도 실측

일자: 2026-10-26. Stage04 연구용 읽기 전용 독립 시험.

## R23 실제 사용자 Windows 결과

- `STATE=FAILED`, `FAILURE=PUBLISHER_HTTP_403`, `TOTAL_MS=2019`.
- 외부 매체 **1회 조회**, 403 종료. `OLLAMA_GENERATIONS=0`, `OLLAMA_MS=NULL`; 이는 모델 독해 시간 2.019초를 의미하지 않는다.
- 매체를 무단 우회·반복 접근하지 않는다.

## R24 변경점

- 새 CMD: `stage04/STAGE04_OLLAMA_ONLY_R24_READONLY.cmd`.
- 기존 `stage04/market-growth-ollama-r23-readonly.mjs`에 `--ollama-only` 모드를 추가한다.
- 원자력 시장 성장전망을 기술한 **정적 220자 내외의 속도시험 전용 예시 문장**만 이미 설치된 Ollama에 한 번 전송한다.
- **외부 매체 조회 0회**, 전체 20초 제한. 출력 파일 `R24_OLLAMA_ONLY_RESULT.txt`에 `OLLAMA_MS`, `OLLAMA_REPORTED_MS`, `TOTAL_MS`, 성공/실패를 기록한다.
- `SOURCE_MODE=REFERENCE_SAMPLE_NOT_LIVE` 표시. 기존 과거 숫자를 현재 시장 조사·투자 판단·신규 성장 점수로 사용하지 않는다.
- 모델 미실행·미설치·생성 20초 초과는 그대로 실패 보고한다. 모델 설치/변경·서버/스케줄러/DB/산식/공개 배포 없음.

## 실행 방식

두 파일을 같은 Windows 폴더에 둔 뒤 CMD를 더블클릭한다.

1. `STAGE04_OLLAMA_ONLY_R24_READONLY.cmd`
2. `market-growth-ollama-r23-readonly.mjs`

기존 Ollama 모델명을 지정하고 싶으면 CMD에서 첫 인자로 모델명을 넣을 수 있다. 지정하지 않으면 로컬 `/api/tags` 목록에서 첫 비임베딩 모델을 선택한다.

## 검증

- R24 추가 모의 시험 2/2, 같은 파일 전체 7/7 통과. 실제 Windows Ollama 실행 시간은 사용자가 생성하는 결과 파일로 판정한다.
- 전문매체 실제 검색·실측은 R23 HTTP 403으로 별개 미완료이며 R24 모의 문장 측정이 이를 해소하지 않는다.
