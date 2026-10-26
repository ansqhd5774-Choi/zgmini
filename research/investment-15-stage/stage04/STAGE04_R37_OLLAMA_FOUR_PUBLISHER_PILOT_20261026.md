# R37 — 21개 섹터·테마 × 네 기관, Ollama 실제 원문 수집 시험

- 대상: `codex/investment-15-stage-m2-r25-20261025` 연구 전용 브랜치
- 상태: **시험 수집기 추가 / 실제 사용자 PC Ollama 호출은 별도 실행 필요**
- 목표: TBRC, BRI, SkyQuest, Precedence를 모든 행에서 **독립 조사**한다. 먼저 성공한 기관이 있어도 나머지 기관을 건너뛰지 않는다.
- 변경 범위: `research/investment-15-stage/stage04/`의 R37 파일만 추가. 기존 R33/R34, 운영 산식, 스케줄러, DB, 주문, 공개 게시 변경 없음.

## 실행과 로그

1. 사용자 Windows PC에 기존 승인된 Node `E:\ZGmini\runtime\node.exe`와 로컬 Ollama `gemma3:4b`가 실행 중인지 확인한다. 계정·키를 새로 입력하지 않는다.
2. 이 파일과 같은 폴더의 `STAGE04_ALL_SECTOR_THEME_R37_FOUR_MEDIA_OLLAMA_READONLY.cmd`를 **CMD**에서 실행한다. 기본은 **21개 행 × 4기관 총 84회 조사 시도**다. 소규모 확인만 원하면 CMD 파일 뒤에 `PILOT` 인수를 붙여 첫 3개 행 × 4기관으로 제한할 수 있다.
3. **공유할 파일은 CMD 파일 바로 옆의 `R37_FULL_FOUR_MEDIA_OLLAMA_RESULT.txt` 하나**다. `PILOT`이면 `R37_PILOT_3_FOUR_MEDIA_OLLAMA_RESULT.txt`다. TXT는 행을 처리할 때마다 추가되어 중단되더라도 성공·실패·원문·기관별 소요시간이 남는다. 사전 점검에서 중단되면 `R37_CMD_PRECHECK_ERROR.txt`를 전달한다.
4. CSV(`R37_FULL_FOUR_MEDIA_OLLAMA_RESULT.csv`)와 상세 JSON은 별도로 남지만 공유에는 필수가 아니다. CSV는 Excel 2007 인식을 위해 UTF-8 BOM·CRLF로 작성한다. `.progress.json`은 행마다 갱신되며 정상 완료 후 `FINISHED_RESEARCH_ONLY`가 된다. 이전 유효 데이터를 지우거나 기존 운영 프로그램을 실행하지 않는다.

## 연구 처리 단계

1. R35 마크다운에서 **공식 보고서 URL만** 읽는다. 기존 문서의 CAGR 숫자·제외 표식·평균은 수집 결과로 사용하지 않는다.
2. URL이 있으면 해당 기관 공개 페이지를 실시간 재조회한다. URL이 없으면 경기소비재=`consumer discretionary OR consumer cyclicals` 등 확장 동의어로 기관 도메인에 한 번 검색한다. 검색 실패는 `검색결과 없음/접근실패`로 남기고 `시장 전망 없음`이라고 단정하지 않는다.
3. 보고서 HTML에서 문자 그대로 출현하는 CAGR 수치들을 후보로 추출한다. Ollama는 후보 **인덱스와 시장 범위**만 선택한다. 모델이 숫자를 생성하거나 출처 없는 비율을 입력할 수 없다.
4. 네 기관 자료를 행별 병렬로 요청하되, 로컬 Ollama 생성은 한 번에 하나로 제한한다. 기관별 시도, 직접 후보, 대용 시장, 실패, 총/평균 처리시간, 원문 주소, 사유를 기록한다.
5. `DIRECT`만 **잠정 평균**으로 표시한다. `PROXY`는 별도 값으로 보존하되 잠정 평균에서 제외한다. 결측과 수집 오류는 0으로 환산하지 않는다.

## 결과 해석 및 보류 사항

- 수집기 결과의 `CANDIDATE`는 원문 CAGR 표기와 AI 선택이 연결되었다는 의미다. **시장규모 시작/종료 값의 산술 검산은 아직 미구현**이므로 `arithmetic_check=PUBLISHED_RATE_QUOTED_ENDPOINTS_UNCHECKED`로 명시한다. 이 결과를 최종 확정 CAGR이나 투자 점수로 승격하지 않는다.
- `PROXY_ONLY`는 해당 섹터·테마보다 좁거나 인접한 시장이다. 예: 산업재=산업기계, 에너지=석유·가스, 데이터센터·전력=데이터센터. 포함 여부는 시장 정의 비교 후 별도 승인한다.
- 수치가 서로 다르다는 이유로 제외하지 않는다. 페이지의 숫자 불일치, 동일 제공자의 재판매/중복, 기간·시장범위 불일치 검증은 다음 단계다.
- **첫 세 행 테스트의 성공이 21개 전수 수집 성공을 의미하지 않는다.** 결과 CSV에는 예상/가상 CAGR이 없고 실행 시 가져온 숫자만 표시된다.
- 공개 보고서의 원문 전체를 GitHub에 저장하거나 외부에 재배포하지 않는다. 이 프로그램은 운영 데이터 수집이 아닌 제한된 연구 전용이다.

## 로컬 기능 시험

`node --test stage04-four-publisher-r37-readonly.test.mjs`

테스트는 모의 HTML·모의 선택기만 사용한다. 성공해도 **Windows 로컬 Ollama/공급원 실접속 검증과 분리**해 보고한다.
