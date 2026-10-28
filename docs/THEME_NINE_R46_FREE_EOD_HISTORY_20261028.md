# R46 — 무료 MarketParquet 일별 ETF 과거 구간 비공개 백필

## 목적 / 확인 사실

- 163개 최상위 목표 중 **기존 연구 9개(S3)** 원가격·자료 연결 단계다. R45 실PC는 7거래일 EOD, 최신 54/63 ETF, SPY 보유, 40일 이상 ETF 0종으로 확정했다.
- MarketParquet 공식 ETF 페이지는 **무료 계정의 최근 1년 일별 EOD 자료**와 다운로드 수 무제한을 안내한다. 공식 API 문서는 `GET /api/v1/manifest/etf_daily?start=YYYY-MM-DD&end=YYYY-MM-DD`, 무료 60요청/분, 한 매니페스트 최대 400일 파일, 60분 유효 서명 URL을 설명한다. 기존 로컬 7일이 그 공급 가능한 전체 무료 기간을 뜻하지 않는다.
- 공식 문서: [ETF 무료 범위](https://marketparquet.com/data/etfs), [REST manifest·파일 API·날짜별 스키마](https://marketparquet.com/documentation), [라이선스](https://marketparquet.com/license).
- **실PC 공급자 인증·다운로드는 미실행**. 코드+모의 응답 테스트 통과만으로 1년 이력 확보를 주장하지 않는다.

## 구현·실행

- 단일 전용 브랜치 `codex/theme-fear-greed-integration-20261025`; 새 브랜치/원래 R167 예약 작업 수정·별도 자동 스케줄러 생성 금지.
- 코드: `scripts/pc-writer/theme-nine-r46-free-eod-backfill.mjs`; CMD: `scripts/pc-writer/THEME_NINE_R46_FREE_EOD_BACKFILL.cmd`. 동명 ZIP 내 파일 2개를 한 폴더에 압축 해제 후 CMD 1회 실행.
- 현재 날짜 기준 **최근 360일**만 무료 백필 후보로 요청한다. `etf_daily` 전용, 공식 `manifest` 한 번, 응답 파일 날짜/이름/크기/서명 URL 도메인 확인. 기존 정규 `marketparquet-r165`/`r167` 원본·audit이 유효하면 중복 다운로드하지 않는다.
- 신규 자료는 **별도 전용 비공개 위치** `E:\ZGmini\data\themes\legacy-nine-r46-eod-history\raw`와 `audit`에만 보존한다. 내려받은 Parquet SHA/일자/출처를 기록하고, 재실행 시 기존 보존 자료를 검증 후 건너뛴다. 원본 R167 수집/선택기/잠금/공개 D1/원가격 R23/R35/R32/R33·기존 10개 공개 값 수정 0.
- 예기치 않은 서버·HTTP 401/403/429, 다운로드 크기·파일 포맷·audit 불일치는 재시도·우회 없이 STOP; 이미 성공한 전용 비공개 파일은 보존한다. 최소 1.2초 간격으로 요청해 무료 API 제한에 보수적으로 대응한다.
- 결과 보고서는 CMD 폴더에 `THEME_NINE_R46_FREE_EOD_BACKFILL_*_RESULT.txt` 한 파일로 남기며 **TXT만 제출**한다. 계정 키·서명 URL·원본 가격은 TXT에 출력하거나 GitHub에 올리지 않는다. 무료 계정 API 인증이 필요하면 Windows 환경변수 `MARKETPARQUET_API_KEY`에만 설정한다. 이 키를 채팅에 보내지 않는다. 미설정 시에도 익명 접근이 허용되는 경우에 한해 정상 동작하며 401/403이면 STOP한다.
- Parquet `PAR1`·SHA·크기 검사는 **전송 무결성 검증**에 해당한다. 전용 audit은 `transportComplete=true`, `schemaValidated=false`로 보존한다. 날짜·심볼·실제 SPY/ETF의 내용 검증은 다음 R47 데이터 리더가 수행한다. 이 전송 파일을 기존 R167의 14개 심볼 `complete=true` audit과 혼동하지 않는다.
- 특히 공식 문서는 **2026-03-27 이전 일별 파일은 `date` 대신 `timestamp` 컬럼**을 사용한다고 명시한다. R47은 두 시대의 날짜 스키마를 명시적으로 통일해야 한다.

## 계산·권리 차단선

- 이 단계가 확장하는 것은 `DAILY_SPLIT_ADJUSTED` **같은 가격 모드의 실제 입력 기간**뿐이다. 기존 R23/R32 `RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE`와 혼합하지 않는다.
- 40/377/628일 적응형 R2 경계를 만족하더라도 **가격 모드 정합·실제 ETF/SPY 공통일·원본 계정 권리 및 승인 산식 적용 검증 전 R32 계산 차단**. R46 결과에 `r32CalculationAuthorized=false`, `publicationAuthorized=false`를 유지한다.
- 원본 Parquet 대외 재배포/사이트 공개 금지. 공개 파생 점수의 라이선스 허용 범위는 계정 계약·실제 파생 형태를 별도로 확인해야 한다.
- 무료 범위 인증이 막히면 `STOP_R46_FREE_SAMPLE_ACCOUNT_ACCESS_REQUIRED` 및 필요한 최소 계정 설정만 보고하고, 유료 구매·타 공급자 우회·키 추출하지 않는다.

## 다음 단계 / 완료 판정

1. **현재 R46 상태:** 코드·테스트 PASS, Windows CMD 제공. 실PC 결과 TXT 및 다운로드 실제 수는 PENDING.
2. 실PC에서 무료 manifest 접근 가능하면 기존 7일을 제외한 과거 EOD만 독립 보존·SHA 기록. 401/403이면 인증 문제로만 판정하고 데이터 결측으로 오판 금지.
3. R47에서 기존 R45 저장 EOD + R46 과거 EOD를 **동일 일자/동일 split-adjusted EOD 모드로만** 일관되게 결합하고, 2026-03-27 구스키마 날짜 정규화·ETF/SPY 결측·40/377/628 실측을 검증한다.
4. 그 다음에도 기존 승인 R32의 원가격 1시간봉에 끼워 넣는 방식은 금지. 원가격 연속 관측을 별도 확보하거나, EOD 기준 변경을 사용자에게 명시적으로 검증·승인받아야 한다. 기존 운영 7개와 공개 10개는 유지한다.

## 2026-10-28 최초 실PC 결과 — 계정 인증 Gate

- 실PC TXT: `THEME_NINE_R46_FREE_EOD_BACKFILL_20261028022430_36828_RESULT.txt`.
- `STATUS=STOP_R46_FREE_EOD_BACKFILL`, `ERROR=R46_FREE_SAMPLE_ACCOUNT_ACCESS_REQUIRED`.
- 다운로드·manifest·실제 이전/신규 R46 저장 건수는 STOP 객체의 `NONE`이며 **0건 신규 파일이 생성됐다는 실파일 검증과는 구별**한다. `ORIGINALMARKETPARQUETWRITES=0`, `DBWRITES=0`, `D1WRITES=0`, `SCHEDULERWRITES=0`.
- 공식 문서상 무료 sample manifest는 계정 API 키로 인증한다. 익명 접근 401/403은 63종 미보유/이력 미존재나 API 유료화의 증거가 아니다.
- **다음 작업은 무료 계정의 API 키를 사용자 자신의 Windows CMD 세션 환경변수 `MARKETPARQUET_API_KEY`에 메모리 전용으로 설정한 뒤 기존 동일 CMD를 실행**하는 것이다. 키 자체를 TXT·GitHub·채팅에 기록하지 않는다. 계정이 없거나 인증을 원하지 않으면 사용자의 선택을 기다리며, 다른 계정 사용·키 탐색·유료 접근·우회 API는 금지한다.
- 이 단계에서 R46 파일/스케줄러/산식의 추가 코드 수정은 필요하다고 입증되지 않았다. 인증 후에만 기존 원본 재사용 건수·다운로드 실제 건수 및 2026-03-27 이전 스키마의 후속 R47 검증을 진행한다.
