# 기존 9개 테마 R34 — 반복 갱신 연결 0단계 (비공개)

- 작업 브랜치: **`codex/theme-fear-greed-integration-20261025` 한 곳만** 사용.
- 상위 승인: R22의 ETF 63종/편입 64자리, R23 실제 1시간봉, R25 기존 R2 개별 점수, R32 공식 AUM 기준일 명시 계산, R33 252일 비교.
- 시작 상태: `R34_OFFLINE_PREFLIGHT_CODE_TESTED / PC_PREFLIGHT_PENDING / DELTA_COLLECTION_NOT_IMPLEMENTED / NO_PUBLICATION`.
- 기존 산식, 기존 9개 테마 공개 이력, R23 원자료, DB/D1, 스케줄러, Cloudflare/사이트는 변경하지 않는다.

## 1. 반복 실행에서 발견한 구조 차이

| 단계 | 이미 검증된 일회성 경로 | 정규 반복 갱신에 필요한 연결 |
| --- | --- | --- |
| 원가격 | R23 `2023-01-01`~`2026-10-26` 고정 창, SPY 포함 64개, manifest 121페이지 | 마지막 검증된 NY 거래일부터 **겹치는 구간**만 독립 수집·추적 |
| 수집 상태 | R23 checkpoint 키는 `roster SHA+start+end`로 고정 | 새 날짜 범위를 기존 R23 checkpoint에 강제로 연결하지 않는다 |
| 검증·ETF 점수 | R24/R25가 R23의 **원래 start/end와 동일**한 manifest·checkpoint만 허용 | 원래 기록은 읽기 전용, 변경분은 별도 검증 후 원가격 연속 시계열로 결합해야 함 |
| 테마 점수 | R32는 R25 전체 252일 배열로 기존 R3/R32 승인 가중치를 적용 | 변경된 R25 실제 252거래일 배열에 **같은 R32 함수** 적용, 결측 보간 없음 |
| 공식 AUM | 공식 발행사 기준일 63개(2026-10-23 기준 42개, 이전 기준일 21개) | 새 공식 확인 시 날짜를 기록; 확인하지 않은 값을 '오늘 AUM'으로 갱신했다고 주장하지 않음 |
| 공개·정규 실행 | R33은 비공개 재현성 2,268건, 과거 공개 2,016건 대조 | 비공개 2회 이상 반복 결과 확보 후 별도 사용자 승인으로 PC 작업·게시기 연결 |

따라서 R23 일회성 CMD를 같은 날짜로 반복하는 것만으로는 자동 갱신이 성립하지 않는다. 날짜 인수를 바꿔 현재 manifest에 추가하면 R24/R25의 기존 검증 계약도 깨진다. **기존 기록을 수정하거나 R24/R25 검증을 완화하지 않는다.**

## 2. 이번 구현 범위: R34 읽기 전용 PC 사전점검

- 사용자 실행 파일: `scripts/pc-writer/THEME_NINE_R34_REFRESH_PREFLIGHT.cmd` (단일 다운로드, Windows CMD).
- 생성기: `scripts/pc-writer/build-theme-nine-r34-refresh-preflight.mjs`.
- 검사 본체: `scripts/pc-writer/theme-nine-r34-refresh-preflight.mjs`.
- 검사: 실제 승인 R20 로스터 SHA, 기존 R23 64/64 완료 checkpoint, manifest 전체 파일 SHA, 원가격 출처·기간·가격 모드, SPY 마지막 실측 NY 날짜.
- 결과: CMD 파일 바로 옆에 서로 다른 이름의 `THEME_NINE_R34_REFRESH_PREFLIGHT_*.txt` 및 `*.json` 생성. PC 원가격이나 state 파일은 읽기만 한다.
- 확인값이 없거나 SHA·원기간이 다르면 `STOP_R34_REFRESH_PREFLIGHT`로 중단하고 기존 파일 삭제·복구·재호출을 시도하지 않는다.
- 코드 단위 테스트: `tests/theme-nine-r34-refresh-preflight.test.mjs` **5/5 PASS**(가상 로컬 원본). 이것은 실제 PC 실행 검증이 아니다.

## 3. 이후 구현 경계 (이 단계에서 실행하지 않음)

1. R34 delta는 **새 별도 PC 원가격 경로**에서만 무료 `1h` 단일 ETF 요청을 4회 이하 단위로 이어 수집한다. 기존 R23 `raw-manifest.json`과 checkpoint는 불변 보존한다. 응답이 지연·429·타임아웃이면 그 상태를 남기고 추가 자동 요청하지 않는다.
2. SPY 마지막 실측 날짜를 **겹침 시작점**으로 사용해 같은 일자의 원가격을 비교한다. 일치하면 중복을 제거하고 변경/충돌 시 중단해 기록한다. 겹침 날짜는 임의로 전일 값으로 채우거나 다시 게시하지 않는다. 상장일 미확인 ETF의 관측 결측은 원본 그대로 유지한다.
3. 독립 delta 검증 후 R23+R34 시계열을 읽기 전용으로 합쳐, 기존 R2 점수 함수·R32 가중치 함수에 입력한다. 원본 파일 병합·산식 변경 없이 비공개 252일과 최신일을 실제 관측점만으로 검증한다.
4. 실제 PC에서 **서로 다른 신규 거래일에 걸친 반복 갱신 성공과 실패 시 기존 점수 보존**을 확인한 이후에만 자동 작업 등록·D1 전환·공개를 별도 승인받는다. 기존 PC 운영 작업이나 발행 계약을 임의 변경하지 않는다.

## 4. PC 실행 요청

1. GitHub 지정 브랜치에서 `scripts/pc-writer/THEME_NINE_R34_REFRESH_PREFLIGHT.cmd`만 다운로드한다.
2. 사용자 Windows PC의 CMD에서 한 번 실행한다. 이 CMD는 데이터 루트 `E:\\ZGmini\\data`를 **읽기만** 하며 `%TEMP%`나 다른 대체 데이터 저장소를 만들지 않는다.
3. CMD 옆에 생긴 `THEME_NINE_R34_REFRESH_PREFLIGHT_*.txt`와 `*.json`을 제출한다. 그 결과에서 실제 **마지막 NY 실측일·원본 SHA**를 확인한 뒤 delta 수집 코드를 작성한다.

## 5. 원본 API 공식 근거

- [무료 1h 단일 티커, 날짜 범위와 페이지 제한](https://getmarkethistory.com/docs/limits)
- [무료 1h 예제](https://getmarkethistory.com/docs/quickstart)
- [내부 저장·파생 지표 및 원가격 재배포 제한](https://getmarkethistory.com/docs/terms)

원본 공급자는 최신성·연속 갱신 시간을 보장하지 않으므로, 신규 거래일이 관측되지 않은 상태를 **정상 갱신**으로 보고하지 않는다.
