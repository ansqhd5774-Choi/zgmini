# R44 — 기존 MarketParquet-ETF 정규 작업의 실제 실행 소스 확인

- 전용 브랜치 `codex/theme-fear-greed-integration-20261025` (새 브랜치 금지).
- R43 결과: `r181-primary.mjs`의 고정 14개 심볼(승인 ETF 13개+SPY), `r171-core.mjs`의 고정 7개 공개 테마/14심볼/기준 날짜 2개. **R32 9개×252일·63개 ETF를 이 레거시 7개 모듈에 직접 확장하는 방식은 기존 공개 계약을 손상할 수 있어 금지**한다.
- R39 MarketParquet EOD 실PC 54/63종은 레거시 13종 원가격 경로와 별개다. R41의 `ZGMINI-PC-MarketParquet-ETF` Task XML은 기존 `r181-primary-cycle.mjs`·`r179-publish-core.mjs`를 직접 참조하지 않았다.

## 실행 필요성

별도 공급자 요청이나 기존 7개 소스 변경 없이, 54종 실제 저장 작업의 **등록된 실행 소스만** 특정해 R32 비공개 계산기와 안전하게 연결할 위치를 찾는다. 이것은 R39~R43의 반복 진단이 아니라 기존 미확인 Task 엔트리포인트 추적이다.

## 사용자 실행

1. `THEME_NINE_R44_MARKETPARQUET_TASK_WINDOWS.zip`의 3개 파일을 모두 같은 폴더에 압축 해제한다.
2. `THEME_NINE_R44_MARKETPARQUET_TASK.cmd`를 **한 번만** 더블클릭한다.
3. 생성된 `THEME_NINE_R44_MARKETPARQUET_TASK_RESULT_*.txt`를 확인해 제출한다. `STOP_*`이면 재실행하지 않고 그대로 제출한다.

## 안전·판정 계약

- `schtasks /Query /TN ZGMINI-PC-MarketParquet-ETF /XML` **읽기만**. R41 검증된 원래 action SHA256 `34e1822ad9ac91972a9b6eabad42202cac6d488ebed99410763625697f900e56`와 다르면 중지한다.
- Task XML·원래 실행 명령/인수·계정/SID·환경변수·원자료·원본 JavaScript 내용은 TXT에 포함하지 않는다. 유일하게 승인된 `E:\ZGmini\data\theme-market-history-r131` 하위의 실행 소스와 정적 상대 JS 참조만 최대 8개·개당 64KiB 읽는다. 파일명·SHA·참조 목록·문자열/주석/숫자 및 인증 식별자가 가려진 비실행 구조만 출력한다.
- CMD wrapper 자체는 원문 구조를 출력하지 않는다. 예상 경로 밖의 실행기·변경된 Task 액션·읽기 권한 제한 시 `STOP`으로 구분하고 우회하지 않는다.
- 공급자 API 호출 0, 기존 데이터/DB/D1/예약 작업/공개 점수 쓰기 0, 산식/가중치/가격 모드 변경 0.
- 성공 판정은 **소스 구조 확인**까지만이다. 실제 63개 자동 수집·R32 반복 계산·게시 완료가 아니다. 관련 코드 최소 수정은 결과를 받은 후에만 수행한다.

## R44 실PC 제출 결과 — 2026-10-28 확인 완료

- 실PC 결과: `THEME_NINE_R44_MARKETPARQUET_TASK_RESULT_20261028015722_2876.txt`.
- `STATUS=R44_MARKETPARQUET_TASK_SOURCE_SHAPE_RECORDED`, `R41_ACTION_SHA_MATCHED=true`, `SOURCE_GRAPH_TRUNCATED=false`, `ERROR=NONE`.
- 실제 작업 실행 진입점은 PC 경로 `E:\ZGmini\data\theme-market-history-r131\marketparquet-r167\r167-cycle.mjs`이며 SHA256 `4cad9645ff306cc5d2ea9f86fb8922f78f4b19dd706d6386ec01b0bbabe0b673`.
- 읽기 전용으로 추적한 종속 파일 5개: `r170-repo.mjs`, `r167-core.mjs`, `r184-retry.mjs`, `r159-readonly.mjs`, `r159-axes.mjs`. 원본 전체 내용·개인 설정·비밀값을 제출하지 않았다.
- `r167-cycle.mjs`는 일별 **전체 ETF Parquet 원본 파일**을 별도 `marketparquet-r165` 아래 저장·조회하며, `r167-core.mjs`의 14개 심볼 고정 선택기와 `safeAudit`는 기존 7개 운영 계산 경로에만 적용한다. 기존 sidecar가 14개만 담고 있다는 사실은 원본 Parquet 자체가 14개만 담고 있다는 뜻이 아니다. R39/R40은 원본에서 연구 ETF 54개를 이미 실측했다.
- `r159-readonly.mjs`의 기존 7개 축 및 권리 제약은 **R32 9개 ETF 산식으로 바꾸지 않는다.** 기존 운영 파일·작업·게시기를 직접 수정하지 않는다.
- 정확한 다음 연결은 **원본 Parquet에서 승인 ETF 63개와 SPY만 별도 비공개 시계열로 추출**하는 [R45 독립 입력 어댑터](THEME_NINE_R45_PRIVATE_EOD_INPUT_20261028.md)다. 이 추출은 별도 EOD 가격 모드를 그대로 보존하므로 R23/R32 원가격 1시간봉을 잇거나 점수를 산출·게시하지 않는다.
