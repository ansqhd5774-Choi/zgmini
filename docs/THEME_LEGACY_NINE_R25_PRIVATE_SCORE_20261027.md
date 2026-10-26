# 기존 9개 테마 R25 — 3단계 ETF 개별 점수 계산 (비공개)

- 적용 브랜치: `codex/theme-fear-greed-integration-20261025`만 사용.
- R22 승인 6단계 중 **3단계** 도구 구현. 사용자 PC 실행과 결과 검증은 별개이며 아직 수행하지 않았다.
- 실행 파일: `scripts/pc-writer/THEME_NINE_R25_INDIVIDUAL_SCORES.cmd`
- 제공 스크립트: `theme-nine-r25-individual-score.mjs`, `build-theme-nine-r25-score.mjs`
- 검사: `tests/theme-nine-r25-individual-score.test.mjs` (64종 모의 원본·SHA·R24 감사·R2 산식 연계 PASS)

## 적용 계약

1. **승인 R20 후보 63종(9개 테마의 편입 위치 64개)을 그대로 유지**한다. 상장 기간이나 관측치 부족을 이유로 승인 후보를 삭제하지 않는다.
2. R23 실제 1시간봉 원본·SHA manifest와 체크포인트를 **R24 기존 감사기로 다시 검증**한다. 각 원본 페이지 SHA도 재검증한다. 이 단계는 API를 호출하지 않는다.
3. 종가 대용 가격은 기존 `theme-space-satellite-adaptive-r2.mjs`의 **`selectRealHourlySessions` 원문 함수**를 추출해 사용한다. NY 오후 3시 봉, 조기폐장일 NY 12시 봉으로 선택한다. 이 값은 공식 종가가 아니라 `RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE`다.
4. 점수는 기존 `theme-optional-adaptive-r2.mjs`의 **`scoreAdaptiveTimeline` 원문 파일**을 그대로 실행한다. T40/R20/V40, 252세션·적응형 R2·장기 호환 지위를 변경하지 않는다.
5. SPY 실관측 거래일 전체 시간축에 ETF 실관측 종가 대용만 맞춘다. ETF/해당일 봉이 없으면 `null`이며, 전일 가격 사용·보간·가상 0점 금지. 유효 실관측 40세션 이전 날짜는 점수를 사용하지 않는다.
6. 해당 날짜별 개별 ETF `score`, `status`, `realSessionCount`, `activeMetrics`, `samples`를 보존한다. R24 원시 거래일 존재와 R25 승인 프록시 종가 존재는 서로 다른 상태일 수 있다.
7. 단계 3은 **ETF 개별 점수만** 계산한다. R32 테마 가중 합산(5단계), AUM 조사(4단계), 공개 점수 변경은 하지 않는다.

## 원본 코드 연결 증거

| 기존 브랜치 파일 | Git blob SHA | 추출·실행 방식 |
| --- | --- | --- |
| `scripts/pc-writer/theme-optional-adaptive-r2.mjs` | `a07a15bdc4bc01567a686f6b68cd4b520e0c457f` | 원본 파일 전체를 CMD에 SHA-256 검증 포함해 번들 |
| `scripts/pc-writer/theme-space-satellite-adaptive-r2.mjs` | `bcf72a9e72eeb081dfbb9150b3e55b5cd832e33f` | 기존 `EARLY_CLOSE`, `check`, `ny`, `selectRealHourlySessions` 코드 조각을 문자 변경 없이 자동 추출 |

CMD는 다섯 구성요소(3단계 계산기·R20 로스터·R24 감사기·승인 R2 점수 파일·승인 NY 선택 함수)를 자체 포함한다. 실행 전 각각 SHA-256을 검사하며, 실행 후 임시 파일을 제거한다.

## 사용자 CMD 실행·파일 경로

1. CMD 파일을 **Windows 바탕화면 등 원하는 폴더**에 다운로드하고 더블클릭한다. Node.js는 기존 `E:\ZGmini\runtime\node.exe`가 있으면 사용하고 아니면 `node` 명령을 사용한다.
2. R23 원자료는 `E:\ZGmini\data\themes\legacy-nine-r23`에서 읽기만 한다.
3. CMD와 같은 폴더에 요약 로그 `THEME_NINE_R25_INDIVIDUAL_SCORES_RESULT.txt`, **전체 252일 ETF 개별 결과** `THEME_NINE_R25_INDIVIDUAL_SCORES_<난수>.json`이 생성된다. JSON은 새 이름으로 생성하고 기존 JSON을 덮어쓰지 않는다.
4. TXT 파일을 ChatGPT에 제출한다. 상세 개별 점수 날짜를 검토할 때는 같은 폴더 JSON도 제출할 수 있다.

## 오류·운영 경계

- 기존 수집기, D1, DB, Cloudflare, GitHub 자동배포, 스케줄러, 산식 원본을 변경하지 않는다.
- 오류 시 `STOP_R25_PRIVATE_SCORE`로 종료하고 원자료나 이전 공개 점수를 조작하지 않는다.
- 무료/유료 API 호출 모두 **0회**. 원본 저장 경로 쓰기 **0회**. 임시 스크립트는 CMD 파일 옆 임시 하위 폴더에 만들었다가 작업 종료 후 제거한다.
- 사용자 PC 수행 전: `IMPLEMENTED_LOCAL_TEST_PASS / PC_RUN_PENDING / NO_PUBLICATION`.
