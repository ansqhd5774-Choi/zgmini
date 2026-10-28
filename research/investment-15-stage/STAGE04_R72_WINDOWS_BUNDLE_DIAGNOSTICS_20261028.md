# R72 Windows 독립 실행 패키지 — 오류·결과 파일 보장

## 왜 R71에서 결과 파일이 생성되지 않았나

R71의 `.cmd`는 같은 폴더의 `run-ollama-forecast-r71.mjs` 등 여러 파일을 전제로 작동한다. `.cmd`만 따로 다운로드했다면 Node는 시작할 JavaScript 파일을 찾을 수 없다. 또한 R71은 import/실행 예외가 파일 생성보다 먼저 일어날 경우 결과 파일을 만들지 못했다. **사용자 PC에서 실제 발생한 오류 문구는 아직 전달되지 않았으므로 이는 확인된 원인이 아닌 재현 가능한 실패 경로다.**

## R72 실행 순서

1. `ZGMINI_R72_OLLAMA_COMPLETE_WINDOWS_20261028.zip` **전체를 압축 해제**한다. 내부 파일 중 `.cmd`만 꺼내지 않는다.
2. `STAGE04_OLLAMA_R72_RUN_AND_DIAGNOSE.cmd` 실행. 인수가 없으면 기존 R30의 5개 검증 키워드를 실행한다. 단일 키워드부터 점검하려면 CMD 창에서 같은 폴더로 이동해 `STAGE04_OLLAMA_R72_RUN_AND_DIAGNOSE.cmd "robotics and automation"`을 실행할 수 있다.
3. 같은 폴더에 아래 세 파일이 생성된다. 수집이 되지 않았더라도 `RUN_STATE`와 `FATAL_ERROR`로 원인을 구분한다.
   - `R72_EXECUTION_DIAGNOSTIC.txt` (CMD 자체가 실행되면 생성)
   - `R72_OLLAMA_FORECAST_PIPELINE_RESULT.json`
   - `R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt`
4. 상태 구분: `COMPLETED`=코드 종료(자료 확보 성공과 다름), `EXECUTION_FAILED`=시작/모듈 오류, `PARTIAL_ERROR`=앞선 일부 항목 보존, `BOOT_FAILED`=Node 또는 실행기 없음.

## 기존 동작·제약

- 실제 데이터 취득은 TBRC/R30 및 SkyQuest·Precedence/R71 공식 URL에 한정한다. 로컬 Ollama `gemma3:4b` 모델을 호출한다. 원문 추출·확인·독립 매체 두 곳 이상 평균 규칙은 R71과 동일하다.
- 모의 Node 테스트 통과는 실제 Windows PC 연결 성공을 뜻하지 않는다. PC에 Node.js 20.3 이상, 실행 가능한 Ollama 및 인터넷 연결이 필요하다.
- 수집 실패·누락·403·출처 내부 충돌은 NULL 처리하며 임의 대체하지 않는다. 이전 R63/R69 CAGR, G/D/M, 투자 매매, 운영 배포 기능은 건드리지 않는다.
