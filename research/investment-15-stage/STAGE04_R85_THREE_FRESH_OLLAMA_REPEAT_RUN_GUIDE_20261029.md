# Stage04 R85 — Windows Ollama 실제 21개 항목 × 3회 독립 반복 검증

> **상태:** 로컬 코드/모의 입력 회귀 검증 완료. 사용자 Windows PC에서 새 공식 자료 GET 및 실제 Ollama 실행은 **사용자가 CMD를 실행하기 전까지 미완료**. 본 문서 자체는 실행 성공 증거가 아니다.

- 저장소/기존 브랜치: `ansqhd5774-Choi/zgmini` / `codex/investment-15-stage-m2-r25-20261025`
- 기존 R82 CMD: `stage04/STAGE04_R82_21_TOPICS_VALIDATE.cmd` (이전 R82 실행 흐름·점수·매체 정책 불변)
- **새 R85 CMD:** `stage04/STAGE04_R85_3X_OLLAMA_VALIDATE.cmd`
- **새 결과 비교기:** `stage04/stage04-r85-repeat-audit.mjs`
- **회귀 테스트:** `stage04/stage04-r85-repeat-audit.test.mjs`
- 목적: 기존 공식 매체 TBRC / SkyQuest / Precedence Research, 11섹터 + 10테마, 유효 서로 다른 매체 2개 이상 평균 규칙을 **실제 새 조사에서 세 번 독립적으로 확인**한다.

## 사용자 Windows 실행 방법

1. 기존 완전한 **R77 올라마 실행 원본 폴더**와 Node.js/Ollama 실행 환경을 유지한다. CMD는 원본을 삭제·덮어쓰지 않는다.
2. R85 배포 ZIP을 **새 폴더**에 풀고 폴더 안의 **`STAGE04_R85_3X_OLLAMA_VALIDATE.cmd`를 더블클릭**한다. 12개 파일을 같은 폴더에 두며 CMD만 따로 이동시키지 않는다.
3. 기본 R77 위치는 `%USERPROFILE%\Desktop\ZGMINI_R77_OLLAMA_OFFICIAL_SITEMAP_WINDOWS_20261028`이다. 위치가 다르면 CMD에서 `STAGE04_R85_3X_OLLAMA_VALIDATE.cmd "C:\실제\R77\폴더"` 형태로 **따옴표를 포함한 단일 경로 인수**를 전달한다.
4. CMD가 세 번의 R82 실행을 차례로 호출한다. 매번 Windows 바탕화면에 **서로 다른 R82 새 실행 폴더**를 만들고 현재 공식 출처를 조회하고 Ollama 구조화 추출을 진행한다. 동일한 과거 JSON을 세 번 복사하여 PASS 처리하지 않는다.
5. 마지막에 R85 비교기가 세 로그를 독립적으로 읽어 매회 21/21, 매회 2개 매체 Gate, 평균 재검산, 원출처 URL·실제 GET 요청수·Ollama 호출수·시각을 확인한다.
6. 완료 후 CMD 창에 출력된 `SEND_R85_RESULT_JSON`, `SEND_R85_RESULT_TXT`, `SEND_RUN1_CONSOLE`, `SEND_RUN2_CONSOLE`, `SEND_RUN3_CONSOLE` **다섯 파일**을 업로드한다. 실패해도 같은 파일을 제출하면 어느 회차/매체/주제에서 실패했는지 진단 가능하다.

## R85 결과 계약

- 세 회차 모두 `COMPLETED`, `TOPICS_TOTAL=21`, `TOPICS_DONE=21`, `MEANS_CALCULABLE=21`, 각 주제 유효 독립 발행사 2개 이상, 검증 평균 재계산 통과, 출처는 승인된 세 공식 사이트만 허용한다.
- **서로 다른 실행의 같은 발행사 수치는 중복 매체가 아니다.** 회차 간 성장률이 바뀌면 변동 내용을 기록하되 서로 다른 발행사의 원칙을 어기며 모든 3회차를 합쳐 평균 내지 않는다. 조사 수치 차이 자체로 자동 제외하지 않는다.
- 63개 셀 중 약 5개 누락은 각 항목 2개 이상만 충족하면 허용한다. 어떤 항목에서 2개 미만이면 해당 회차 `INCOMPLETE_REVIEW_REQUIRED`; 결측 0% 대체 금지.
- 출력: `STAGE04_R85_REPEAT_..._RESULT.json` 및 `_RESULT.txt`, 3개 원본 R82 Console TXT. 이전 R82 실행·성장률 원장·테마 승인 원장·GitHub/Cloudflare/D1는 변경하지 않는다.
- **R85 PASS는 4단계 CAGR 재조회·검산 통과를 뜻할 뿐**, 실제 전체 GICS 산업 성장·시장 공탐·M4 최종 매력도·테마 확정·Stage05/실주문 성공을 의미하지 않는다.
- Ollama 모델/외부 공식 페이지 가용성에 따른 실행 소요시간은 사전 확정할 수 없다. 세 실행은 동시에 실행하지 않고 순차 실행하여 로컬 자원과 사이트 부하를 제어한다.

## 개발 모의 회귀 검증 증거 (Windows 새 실행과 별개)

- `stage04-r85-repeat-audit.test.mjs`: 독립 3회 성공, 1매체 결측 허용, 2매체 미만 미확정, 성장률 변동 기록, 출처 중복·과거값 거부, 3개 Windows 콘솔 로그 파싱, 동일 실행시각 복제 금지 테스트.
- 기존 R63 원장 환경변수를 지정하고 15개 기존 테스트 파일과 R85 테스트 파일을 동시에 수행한 결과 **124/124 PASS × 3회 = 372 PASS, FAIL 0, SKIP 0** (개발 호스트 Node, 모의·보존 자료 테스트).
- 사용자 직전 R82 원본 JSON 읽기 전용 스모크 테스트: 21개 주제 평균 21개, 유효 매체 58개, 미확정 5개, 새 R85 감사기 단일 회차 감사 PASS.
- 실제 신규 Windows Ollama R85 3회는 **아직 수행하지 않았으며 사용자 PC 결과 제출 시 별도 검증**한다.

## 이전 버전과 호환성

기존 `STAGE04_R82_21_TOPICS_VALIDATE.cmd`의 마지막 `pause`에만 **환경변수 `STAGE04_R85_REPEAT_NONINTERACTIVE=1`인 경우 생략**하는 조건이 추가되었다. R82를 직접 더블클릭하면 **이전과 똑같이 멈춰 결과를 보여준다.** R85 래퍼가 실행할 때만 `pause`를 생략하고 다음 회차로 넘어간다. 사용자 R77 원본 및 기존 R82 결과에는 변경이 없다.

사용자는 실행할 때 비용 발생하는 유료 리서치 API를 사용하지 않는다. R49의 BRI 403 제외 정책과 기존 Ollama 공식 3매체 규칙을 유지한다. 최종 선정 공식·가중치의 신규 승인이나 자동거래·공개 배포는 전혀 포함하지 않는다.
