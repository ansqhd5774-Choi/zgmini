# R39: 기존 MarketParquet에 R32 63 ETF가 있는지 1회 검사

## 목적

R35 무료 1시간봉의 최신 NY 관측일은 2026-10-23에서 멈춰 있지만, 별도 R7 실제 PC 결과가 이미 저장된 MarketParquet의 2026-10-26 ETF 종가를 SHA로 검증했다. 따라서 **새 유료 수집이나 중복 재수집 없이**, 기존 10개 공개 테마 중 공통 8개 개선 산식의 2026-10-26 잠정치 계산에 필요한 종목별 자료가 실제 저장되어 있는지 검사한다.

## 실행

`THEME_NINE_R39_PARQUET_COVERAGE_WINDOWS.zip`의 세 파일을 한 폴더에 모두 풀고 `THEME_NINE_R39_PARQUET_COVERAGE.cmd`를 더블클릭한다.

1. `THEME_NINE_R39_PARQUET_COVERAGE.cmd` — Windows CMD, ASCII CRLF.
2. `theme-nine-r39-parquet-coverage.mjs` — Node 순수 읽기 검증.
3. `theme-nine-r20-approved-candidates.json` — R20 원본과 SHA256 일치해야 통과.

출력: 사용자 실제 Desktop 경로 `THEME_NINE_R39_PARQUET_COVERAGE_RESULT_<UTC>_<PID>.txt` 단일 파일. Desktop은 레지스트리 Shell Folders 값 우선, 실제 폴더를 확인한 뒤 사용한다. OneDrive Desktop 경로도 지원한다. 실패 시 가능하면 STOP 보고서를 동일 위치에 생성한다.

## 저장소·검증·비변경 보장

- 읽기 소스: `E:\ZGmini\data\theme-market-history-r131\marketparquet-r165\etf_daily_2026-10-23.parquet`와 `etf_daily_2026-10-26.parquet` 및 각각 대응하는 r167 감사 JSON.
- 두 Parquet 바이트 SHA256을 R7 실제 PC에서 이미 확인된 값과 대조하고, 감사 자료의 `date/source/complete/sha256`을 검증한다.
- 기존 PC에 설치된 `hyparquet` 디코더를 재사용한다. 설치·다운로드·API 요청 없음.
- R20 ETF 64자리/서로 다른 ETF 63개와 SPY를 대상으로 10월 23일/26일의 실측 종가 보유 여부를 확인한다. 누락·중복·날짜 불일치·비정상 가격을 숨기지 않는다.
- 원시 가격값을 공개하지 않고 **종목별 실측 존재 여부**와 누락 ETF만 TXT에 기록한다.
- 대상 자료는 split-adjusted EOD인 반면 R32는 raw unadjusted 1h이므로 **그대로 잇거나 혼합 계산하지 않는다**. 가격 모드 비교·산식 재현 검산은 다음 단계이며 R39은 점수 계산·게시를 승인하지 않는다.
- `E:` 원본 파일, E: DB, D1, GitHub 배포, Windows 예약 작업, 공개 10개 테마와 과거 점수 **변경 0건**.

## 실행 및 코드 검증

- `node --test tests/theme-nine-r39-parquet-coverage.test.mjs`: 정상 63종 + SPY, 실제 결측, 원가격 오류·중복·날짜 불일치 단위테스트.
- 실제 사용자 PC 파일의 현재 상태와 종목별 보유 여부는 사용자가 R39 CMD를 실행해 제출하는 TXT 전에는 미확인.

## 참고

- Market History 공식 운영: https://getmarkethistory.com/docs/reliability/
- 공식 D1 문서: https://developers.cloudflare.com/d1/worker-api/prepared-statements/
