# R43 — 실PC 레거시 소스의 최소 구조 인계

- 브랜치: `codex/theme-fear-greed-integration-20261025`만 사용. 신규 브랜치 생성 금지.
- 목적: R42에서 이미 존재·해시를 확인한 `r181-primary.mjs`, `r171-core.mjs` 두 소스의 **원문이 아닌 비실행 구조 형태**를 안전하게 인계하여 기존 13종/MarketParquet 54종 경로의 실제 접점을 식별한다.
- R42 실측 SHA256·크기를 고정하므로 최신 PC 소스가 바뀌었다면 수정·추측하지 않고 `STOP`한다.

## 실행

1. `THEME_NINE_R43_SOURCE_SHAPE_WINDOWS.zip`을 풀어 `THEME_NINE_R43_SOURCE_SHAPE.cmd`, `theme-nine-r43-source-shape.mjs` **2개를 같은 폴더**에 둔다.
2. Windows CMD 파일을 더블클릭해 **한 번만** 실행한다. 일반적으로 1초 내 종료한다.
3. CMD 옆에 생성된 `THEME_NINE_R43_SOURCE_SHAPE_RESULT_*.txt`를 개인 인증값·경로가 없는지 **간단히 검토한 후** 제출한다. STOP이어도 그대로 제출하고 재실행하지 않는다.

## 엄격한 안전 범위

- PC 읽기 경로: `E:\ZGmini\data\theme-market-history-r131\marketparquet-r167` 아래 정확히 두 파일만. 각 SHA·크기 검증, 해당 디렉터리 밖 파일 및 symlink 접근 금지.
- 결과는 JavaScript **문자열·숫자 리터럴·템플릿·정규식 본문·주석 및 인증 관련 식별자 일부가 가려진 비실행 구조**다. 원본 파일 복사·ZIP 포함·원본 명령 인수·환경변수 값·API 키·원자료 출력 금지.
- 정적 가림은 형식상 구조 인계를 위한 도구이며 보안 검토를 100% 대체하지 않는다. TXT 제출 전 사용자가 확인한다. **원본 2개 `.mjs`는 제출하지 않는다.**
- 공급자 GET 0, 로컬 운영 원자료·DB·D1 쓰기 0, 예약 작업 변경 0, 산식·공개 점수 변경 0.

## 판정

- 구조 출력은 코드·시험 자료이며 실제 PC 자동 수집 및 S3/S4 통과 증거가 아니다.
- 보고서에서 호출·수집 분기를 특정할 수 없으면 같은 정적 진단을 더 반복하지 않는다. 그때는 사용자가 승인한 로컬 PC Codex 환경에서 **원본을 외부 유출 없이 직접** 확인하고 최소 수정한다.
- R39~R42 실측, R32 2,268건 및 R33 2,016건을 재실행하지 않는다.

## 2026-10-28 실PC 제출 결과

- 원본 결과명: `THEME_NINE_R43_SOURCE_SHAPE_RESULT_20261028014926_33320.txt`.
- 상태: `REDACTED_SOURCE_SHAPE_CREATED_MANUAL_REVIEW_REQUIRED`; 두 파일 원래 SHA256·크기는 R42 증거와 **각각 일치**. 실행 로그 기준 API 호출 및 운영 쓰기 **0**.
- `r181-primary.mjs`: 고정 `SYMBOLS` 14자리(기존 승인 13종+SPY로 해석), NY 15시 시간봉 대용 종가 선별, 무료 1h URL/겹침 검사. R32 승인 63종을 이 목록에 단순 추가할 근거가 없음.
- `r171-core.mjs`: `THEMES` 고정 7자리, `SYMBOLS` 14자리, `DATES` 2자리, 기존 private/public 점수 검증과 라이선스·게시 권리 심사. R32 9개 테마×252일 전체 산출용 모듈이 아님.
- 가린 숫자 및 문자열 값은 원본 미제출이므로 개별 날짜·상한·버전값을 복원하지 않는다. **정적 구조 확인과 실제 정상 실행은 별개**다.
- 결론: 기존 7개 공개 경로에 63종을 강제 편입하지 않는다. R39의 MarketParquet EOD 54종 실제 보유는 별도 수집 경로로 보존한다.
- 다음 필요한 실제 접점은 R41에서 액션 해시가 확인되었으나 이름·소스가 아직 특정되지 않은 `ZGMINI-PC-MarketParquet-ETF` 작업. [R44 단일 Task 실행 소스 감사](THEME_NINE_R44_MARKETPARQUET_TASK_SOURCE_20261028.md)를 사용한다. 중복 R43 실행 불필요.
