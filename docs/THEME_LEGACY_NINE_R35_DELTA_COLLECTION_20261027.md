# 기존 9개 테마 R35 — 실제 PC 비공개 증분 원가격 수집

## 작업 조건과 승인 경계

- 단일 작업 브랜치: `codex/theme-fear-greed-integration-20261025`.
- R34 실제 PC 검사: `121/121` 기존 R23 원가격 페이지 SHA 검증, SPY 포함 `64/64` 완료, 실제 최신 SPY NY 거래일 `2026-10-23`, R20 로스터 SHA256 `e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c`.
- 이번 목표는 **공식 무료 1h 원가격의 별도 비공개 추가 수집만**; 새 점수 계산, R23 기록 수정, 기존 9개 테마 공개·D1·Cloudflare·작업 스케줄러 변경은 승인 범위 밖이다.
- ETF 63종/64 편입 자리, 기존 R2/R25·R32 점수 산식 및 AUM 기준일은 변경하지 않는다. 새 ETF 추가·후보 제외·가중치 변경도 수행하지 않는다.

## 1. 실제 실행 설계

| 항목 | 확정 구현 |
| --- | --- |
| 사용자 다운로드 | `scripts/pc-writer/THEME_NINE_R35_DELTA_COLLECTION.cmd` 단일 파일 |
| 추가 원가격 수집기 | `scripts/pc-writer/theme-nine-r35-delta-collect.mjs` |
| 코드 SHA·한 파일 묶음 생성 | `scripts/pc-writer/build-theme-nine-r35-delta-collect.mjs` |
| 읽기 전용 원본 | `E:\ZGmini\data\themes\legacy-nine-r23` (수정 0건) |
| 새 비공개 수집 저장소 | `E:\ZGmini\data\themes\legacy-nine-r35-delta` (R35가 실제 신규 관측을 찾았을 때만 생성) |
| 기준 창 | NY 날짜 `2026-10-23`~`2026-10-26` (기존 실측 마지막 날 1일 겹침) |
| 신규 관측 판단 | SPY 무료 소스가 기존 `2026-10-23`보다 뒤의 유효 관측 NY 거래일을 제공하는지 확인 |
| 요청 상한 | 최대 4 GET/배치, 배치 사이 60초 간격, 실행당 최대 64배치 |
| 요청 경로 | `https://getmarkethistory.com/api/v1/bars/stocks/{symbol}/1h` 무료 단일 종목 원가격 |
| 중간 보존 | 별도 R35 `raw-manifest.json`(SHA256), 날짜 창별 checkpoint, 신규 JSONL 원자료 |
| 저장 없는 대기 | 새 SPY 관측이 없으면 1 GET 후 `WAIT_SOURCE_NO_NEW_VERIFIED_SPY_SESSION`, R35 E: 원자료 폴더 생성 안 함 |
| 오류 처리 | 429/HTTP 에러·네트워크·타임아웃·잘못된 시세는 `STOP` 후 재시도하지 않음. 미확인 응답의 재시작은 별도 검토 |
| 사용자 로그 | CMD와 **같은 위치** `THEME_NINE_R35_DELTA_COLLECTION_*.txt` 및 `*.json` |

유효 1h OHLCV와 확인 가능한 실제 거래일만 저장한다. 마지막 값 복사·가상 시세 보간·임의 기준일 갱신은 없다. 기존 공개 테마 점수는 R35에 의해 변하지 않는다. 신규 원자료는 원본 재배포 가능하다고 주장하지 않으며 계속 비공개 연구 목적으로만 보관한다.

## 2. 검증과 실제 PC 상태

- 테스트: `tests/theme-nine-r35-delta-collect.test.mjs`의 5개 시나리오: SPY 지연 시 1회 요청·저장 0건, 최대 4회 배치 및 이어받기, 64개 티커 64회 요청 및 반복 없음, HTTP 429 무재시도, 비정상 OHLCV 무저장.
- R35 코드/단일 CMD 빌드의 로컬 테스트는 통과했지만, 이는 실제 PC의 GetMarketHistory 공급자 응답이 아니다.
- **실제 PC R35 1차 실행: 정상 대기** (`2026-10-27` 제출 TXT·JSON 일치).
  - 실행: Windows Node `v24.19.0`, 묶음 코드 SHA `BUNDLE_SHA_VERIFIED=YES`.
  - 상태: `WAIT_SOURCE_NO_NEW_VERIFIED_SPY_SESSION`; 공급자 GET `1회`, SPY NY 실측 최신일 `2026-10-23`(R34와 동일).
  - 새로운 원가격 저장 `0건`, 완료 종목 `0/64`; 이번 창 `2026-10-23`~`2026-10-26`에 최신 SPY 거래일의 증가 없음.
  - 기존 원자료, DB, D1, 스케줄러, 공개 변경 `0건`; 코드 설계상 신규 데이터가 없어 별도 E: delta 수집 경로 생성 안 함.
  - **에러 또는 수집 실패가 아니다.** API 신규 실측 공급을 기다리는 상태이며, R36의 실제 원가격 연결 판정은 유보한다. 실제 저장소 존재 여부는 별도 PC 파일 검사를 수행하지 않았으므로 로그와 코드 경로에 기반한 판단이다.

## 3. PC 실행/결과 제출

1. 지정 브랜치의 `scripts/pc-writer/THEME_NINE_R35_DELTA_COLLECTION.cmd`를 한 파일만 다운로드한다.
2. 사용자 Windows에서 실행한다. 로컬 Node는 우선 `E:\ZGmini\runtime\node.exe`, 없으면 환경의 `node` 사용. `%TEMP%`를 이용하지 않는다.
3. 코드 3개를 CMD 옆 별도 임시 스테이지에 SHA 검증 후 잠깐 풀고, 작업 종료 시 **그 스테이지만** 삭제한다. 신규 원자료가 있는 경우 R35 전용 E: 경로에 보존한다.
4. CMD 파일 옆에 생성된 TXT와 JSON 두 개를 제출한다. `WAIT_SOURCE_NO_NEW_VERIFIED_SPY_SESSION`이면 기존 데이터 문제로 판정하지 않고 실제 소스 데이터 갱신을 기다린다.

## 4. 이어서 진행할 작업

- 같은 R35 CMD를 공급자 신규 거래일 관측 이후 재실행해 새 원가격 파일 수·SHA·마지막 NY 관측일 및 기존 R23 불변 확인. **이번 첫 실행의 빈 결과만을 이유로 API·산식·ETF를 변경하지 않는다.**
- 다음 별도 비공개 검증 단계 R36: 겹치는 R23/R35 실제 원가격 충돌 여부 확인, 읽기 전용 시계열 입력으로 **기존** R2/R25 점수 함수와 R32 AUM 가중치 함수 재사용. 현재 코드와 자동 스케줄러는 여기에 연결하지 않음.
- 다회 실측 반복 검증 이후 사용자 승인 없이는 스케줄러 연결·DB/D1·공개 화면 변경 금지.

## 5. 공급자 안내

- [GetMarketHistory API 무료 요청 제한](https://getmarkethistory.com/docs/limits)
- [GetMarketHistory 무료 1h 예제](https://getmarkethistory.com/docs/quickstart)
- [GetMarketHistory 이용 조건](https://getmarkethistory.com/docs/terms)
