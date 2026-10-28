# R45 — 기존 MarketParquet 원본의 승인 63 ETF 비공개 입력 분리

- 프로젝트: 인기순 163개 테마 공포·탐욕 개발 중 **기존 9개 연구 R32 전환의 S3**.
- 유일한 작업 브랜치: `codex/theme-fear-greed-integration-20261025`.
- 근거: 2026-10-28 실PC R44 `r167-cycle.mjs`가 원본 ETF 일별 Parquet를 먼저 저장하고, 공개 7개용으로는 고정 14심볼 선택기만 사용한다는 소스 추적 성공.
- 상태: **R45 입력 분리 소스/테스트 작성·CMD 제공**. 실제 사용자 Windows PC R45 실행/비공개 JSON 생성/실데이터 값 검증은 **PENDING**.

### R45 Windows CMD 인수 처리 수정 (2026-10-28)

- 최초 CMD를 실행한 사용자 화면에서 `R45_REPORT_FAILED R45_OUTPUT_DIR_MISSING`을 확인했다. Node에서 `%~dp0` 뒤의 `\\`와 닫는 따옴표가 충돌할 수 있는 CMD 인수 전달 문제다. **원본 Parquet 수집 실패나 ETF 내용 오류라는 증거가 아니다.**
- `--export "%~dp0"`를 **`--export "%~dp0."`로 수정**한다. 끝에 점을 붙여 디렉터리 의미를 유지하면서 Windows 명령행 인수 끝의 역슬래시를 제거한다. 원자료/계산/기존 예약 작업 변경 없음.
- 이 수정 뒤의 실PC TXT는 **아직 제출되지 않았으며**, `R45_OUTPUT_DIR_MISSING` 해소는 Windows 재실행 결과로 검증해야 한다.

## 1. 실제 실행 경로

1. `THEME_NINE_R45_PRIVATE_EOD_INPUT_WINDOWS.zip` 압축을 한 폴더에 푼다. 파일은 CMD·MJS·`theme-nine-r20-approved-candidates.json` 총 3개다.
2. `THEME_NINE_R45_PRIVATE_EOD_INPUT.cmd`를 **한 번만** 실행한다. `E:\ZGmini\runtime\node.exe` 또는 기존 PATH Node를 사용한다. PowerShell·RDC·새 스케줄러를 만들지 않는다.
3. 같은 폴더에 `THEME_NINE_R45_PRIVATE_EOD_INPUT_*_RESULT.txt`와 `THEME_NINE_R45_PRIVATE_EOD_INPUT_*.json` 파일을 만든다. **TXT만** 채팅에 제출하고 JSON은 개인 PC에 보존한다. JSON은 공개 배포용이 아니며 승인 R32 출력도 아니다.
4. `STOP_R45_PRIVATE_INPUT`이면 기존 작업은 그대로 둔 채 TXT만 제출한다. 자동 재실행·재다운로드는 없다.

## 2. 분리되는 데이터의 정확한 의미

- 승인 R20 명단(9개·64편입 자리·63고유 ETF) 파일 **SHA256 `e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c`**를 검사한다. 재선정·수량 제한 변경은 없다.
- 기존 `E:\ZGmini\data\theme-market-history-r131\marketparquet-r165\etf_daily_YYYY-MM-DD.parquet` 중 최신 최대 628개 파일을 읽는다. 동일 일자 `marketparquet-r167`의 sidecar audit 날짜/파일 SHA/원출처/기존 완료 판정을 함께 확인한다. 2026-10-23/26 R39 두 날짜는 알려진 SHA를 별도로 고정 검증한다.
- Parquet 전체에서 승인 **63개와 SPY**만 추출한다. 중복, 원가격이 아닌 0/음수/NaN, 날짜·asset_type 이상은 실패 처리한다. ETF가 없으면 미관측이며 임의 0점·보간·대체값은 만들지 않는다.
- JSON에는 원본 파일별 SHA, 실제 검증 거래일, 각 ETF별 실제 EOD 날짜/가격, SPY 공통일 수, 40/377/628일 임계 달성 여부와 결측 목록을 보관한다. **가격 모드는 `DAILY_SPLIT_ADJUSTED_NOT_R32_RAW_1H`**로 명시한다.
- R45 결과의 `r32CalculationAuthorized=false`, `publicPublishAuthorized=false`는 자료 개수와 관계없이 변하지 않는다. 40일 이상 모여도 **EOD를 R23 원가격 1h와 결합할 수 있다는 허가는 아니다**. 가격 모드·권리·시간/종가 등가성이 확인되기 전에는 기존 R32 계산에 연결하지 않는다.

## 3. 영향 범위 및 다음 단계

- 수정하지 않는 것: 기존 정규 `r167-cycle.mjs`/`r167-core.mjs`/`r159-readonly.mjs`, `r181`/`r171` 기존 7개 소스, PC 예약 작업, 원자료 Parquet/sidecar/원장, 기존 사이트의 10개 공개 테마·D1, R23/R25/R32/R33 승인 산식·기록.
- 새 코드: `scripts/pc-writer/theme-nine-r45-private-eod-feed.mjs` (독립 실행), `scripts/pc-writer/THEME_NINE_R45_PRIVATE_EOD_INPUT.cmd` (Windows 실행), `tests/theme-nine-r45-private-eod-feed.test.mjs`.
- 실제 사용자 CMD 이후 확인할 것: **유효 일별 EOD 입력 경로**에 63 ETF/SPY가 언제부터 지속적으로 보관되는지, 누락 9종의 사유가 원본 공급 자료 미등재인지, 비공개 입력 파일이 후속 계산기에 투입 가능한 구조인지. 기존 정규 작업의 후킹·승인 산식 재계산·공개 게시의 승인은 별도다.
- 기존 R32 원가격(1h)과 EOD의 날짜·수익률 간 등가성 증거가 부족하므로, 다음 단계에서는 **별도 검증된 원가격 증분 경로 사용** 또는 EOD 기반 공통 산식 적용에 대한 명시적 승인/검증을 받는다. 이 둘을 은밀히 섞지 않는다.
