# 기존 9개 테마 R42 — 정규 수집 소스 참조 경로 확인

- 전용 브랜치 `codex/theme-fear-greed-integration-20261025` / 신규 브랜치 생성 금지.
- 상태: `R41_PC_SOURCE_PRESENT / R42_CODE_TESTED_REAL_PC_PENDING / NO_63_COLLECTION_CLAIM / NO_PUBLICATION`.
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
