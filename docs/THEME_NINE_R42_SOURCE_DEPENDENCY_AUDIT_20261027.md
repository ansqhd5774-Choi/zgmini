# 기존 9개 테마 R42 — 정규 수집 소스 참조 경로 확인

- 전용 브랜치 `codex/theme-fear-greed-integration-20261025` / 신규 브랜치 생성 금지.
- 상태: `R42_REAL_PC_STATIC_AUDIT_COMPLETE / RUNTIME_63_COLLECTION_UNKNOWN / NO_PUBLICATION`.
- 직전 실PC 결과: R41 기존 설치 소스 3개 SHA 검증, ETF 정적 직접 언급 0종, 두 예약 작업 XML 조회 가능. 0종은 실제 수집 부재 판정이 아니라 정적 직접 텍스트 검사 범위 한계다.

## 실행 방법

`THEME_NINE_R42_SOURCE_DEPENDENCY_WINDOWS.zip` **3개 파일을 모두 압축 해제해 같은 폴더**에 놓은 다음 CMD를 더블클릭한다.

1. `THEME_NINE_R42_SOURCE_DEPENDENCY.cmd`
2. `theme-nine-r42-source-dependency-audit.mjs`
3. `theme-nine-r20-approved-candidates.json`

결과: CMD 옆의 `THEME_NINE_R42_SOURCE_DEPENDENCY_RESULT_*.txt` 한 건. 오류는 STOP으로 보고하며 재시도하지 않는다. R39~R41 검사와 원본 재수집을 되풀이하지 않는다.

## 안전 범위와 판단 기준

- 승인 R20 63종 SHA를 먼저 검증한다. 기존 PC `r181-primary-cycle.mjs`, `r179-publish-core.mjs`, `r171-publish.mjs`에서 시작한다.
- 같은 `marketparquet-r167` 하위의 **정적으로 명시된 상대 소스 파일**만 최대 30개, 각 최대 1MiB 읽는다. 절대 경로·부모 폴더 탈출·외부 symlink는 따라가지 않는다. 다른 운영 데이터나 키 파일을 재귀 탐색하지 않는다.
- 출력은 상대 파일명·크기·SHA256·승인 ETF 정적 언급과 파일 간 참조·동적 import/read 함수 건수뿐이다. 원본 소스 줄·명령 인수·환경변수·토큰·비밀번호·운영 원자료는 출력하지 않는다.
- 사용자가 제출한 TXT만으로 소스의 **정적 참조**를 확인한다. 호출되는 함수·실제 활성 소스·수집 범위·실제 API 응답은 런타임 증거 없이 PASS 판정하지 않는다.
- 모든 호출·기록·산식/원자료/D1/예약 작업·공개 점수 변경 0. 기존 공개 10개, R32 2,268/2,268, R33 2,016/2,016을 보존한다.

## 결과 이후 작업

기존 PC 수집기가 어떤 내부 설정 또는 모듈에서 대상 ETF를 결정하는지 식별한다. 필요하면 **확인된 유효 설치 소스의 최소 변경만** 제안·승인 범위에서 연결한다. 데이터 가격 모드 불일치·최근 7개 EOD만으로 신규 R32 점수를 산출하거나 미발견 9종을 삭제하지 않는다.

## R42 실PC 제출 결과 — 2026-10-27, 증거 기록

- 제출 결과: `THEME_NINE_R42_SOURCE_DEPENDENCY_RESULT_20261027145941_18972.txt`.
- 상태 `SOURCE_DEPENDENCY_AUDITED_RUNTIME_COVERAGE_UNKNOWN`, 검사 소스 **12개**, 해결되지 않은 정적 상대 참조 **0개**. R20 승인 ETF 로스터 SHA256 `e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c` 일치.
- `r181-primary-cycle.mjs`가 참조하는 `r181-primary.mjs`(SHA256 `da433fe2febea455343b66424b2b6e9d6680575f21f2552fc0be8d3bd95aa5c9`, 4,328바이트)는 승인 ETF 중 13종을 정적으로 언급한다.
- `r179-publish-core.mjs` → `r179-engine.mjs` → `r171-core.mjs`(SHA256 `9133c68549eb2a235a28dba2ccd4ba832968c1a6819f86dd05a183072b1f7480`, 7,796바이트)도 동일한 13종을 언급한다.
- 정적 공통 13종: `ARKF, BOTZ, BUG, CIBR, CLOU, DRIV, FINX, ITA, NLR, ROBO, SHLD, SKYY, URA`. 나머지 승인 **50종은 위 두 레거시 모듈의 직접 텍스트 언급에서 확인되지 않았다**. 다른 설정·간접 입력·MarketParquet 경로의 수집 부재를 뜻하지 않는다.
- 이 검사에서 공급자 API 호출, DB/D1 쓰기, 예약 작업 변경은 **각 0건**. 정적 소스의 범위만 확인되었으므로 실제 정규 API 호출 성공/최신 관측일/63종 자동 갱신은 **여전히 미확인**이다.

### 즉시 다음 필수 작업 — S3 기존 경로 최소 연결

1. **별도 재수집 없이** 위 2개 PC 설치 소스의 실제 ETF 목록 생성·가격 모드·입출력 분기를 확인한다. 이 두 파일의 원문은 현재 GitHub 소스에 없으므로 추측 코드를 작성하지 않는다. 코드를 받거나 해당 PC에 접근 가능한 승인된 개발 환경에서 직접 확인할 때에는 키·개인 경로 등 민감 내용을 외부 기록에 남기지 않는다.
2. 기존 GetMarketHistory 레거시 13종 경로와 **R39 MarketParquet 저장 EOD 54/63종 경로를 구분**한다. 50종을 일괄 신규 API GET 대상이라고 판단하지 않는다. 두 경로의 목록/수집 정책과 승인된 호출 한도를 비교한 뒤 실제 미연결 항목만 최소 수정한다.
3. 먼저 검증된 원자료에서 **가격모드/ETF–SPY 공통일/발행사 AUM 기준일** 계약을 충족하는 연결을 만들고 R32 비공개 9개 신규 관측일만 검산한다. 공개 점수, D1, 원자료 DB, 예약 작업은 본 단계에서 건드리지 않는다.
4. R39/R40/R41/R42 및 R32/R33 완료 증거를 다시 수집·계산하는 것을 다음 단계의 완료 조건으로 삼지 않는다.
