# Earnings Recession — BEA 제조업 기업이익 R1 준비 검증 (비게시)

- 기준일: 2026-10-28 KST
- 기존 자료 출처: BEA NIPA Table 6.16D, `N400RC` (FRED 공개 CSV 미러 `N400RC1Q027SBEA`)
- 목적: 기존 S6 전체 기업이익 YoY와 구별되는 **제조업 이익 YoY 참고 행** 후보
- 상태: **로컬 읽기 전용 파서·테스트 검증 단계**. PC 원장에 같은 원본이 존재하는지 미확인, D1 저장·공개 GET·UI·스케줄러 연결 미실행.

## 수집·산식 계약

- 직접 원천 호출은 FRED의 BEA 시계열 공개 CSV이며, Census API/ZIP은 사용하지 않는다.
- BEA 원천은 'corporate profits with inventory valuation adjustment'이며 **세후이익/마진이 아니다**.
- 원자료 단위는 **십억 달러, 계절조정 연율(SAAR)**. 비교는 같은 원천·같은 정의의 전년 동기.
- 정보성 YoY는 `(현재 분기 이익 / 전년 같은 분기 이익 - 1) × 100`이며 전년 기준값이 `<=0`이면 숫자 생성 금지.
- FRED의 현재 빈티지 값을 사용한다. 발표 당시 PIT/공식 releaseDate는 추정하지 않는다.
- 원본에는 SHA256 및 실제 PC 최초 저장 체크포인트를 붙이고, 다섯 연속 분기만 정보성 행에 투영한다.
- E1-R5의 13개 S지표, 기존 S6, 기존 BEA 단위이익, BLS, QFR 보류 파일, 점수 산식은 무수정.

## 읽기 전용 확인 증거

1. 2026-10-28 공개 `https://zgmini.kr/api/earnings-recession-detail` 응답의 기존 S6 (`BEA NIPA A051RC`)는 READY였다. E1-R5 13개 행도 READY.
2. 공개 `https://zgmini.kr/api/earnings-recession-bea-unit-profit` 응답은 `STORED_PROJECTION_PENDING`이므로 별도의 기존 BEA 단위이익 게시 문제를 이 작업의 성공으로 오인하지 않는다.
3. 최신 GitHub `main`의 코드 검색에서 `N400RC` 및 `T61600D` 수집기 식별자를 확인하지 못했다. 이는 **PC 원장 미존재의 증명은 아니다**.
4. FRED 공개 CSV의 2026-Q2=1053.304, 2025-Q2=681.285 (십억 달러, SAAR); 파생 YoY는 약 **+54.605488%**. 표본 기준일의 실데이터로 신규 순수 파서를 검산했다.

## 운영 전 필수 다음 단계

1. 승인된 PC 운영 checkout의 기존 원장/원시 파일에서 `N400RC` 또는 동등한 원천·단위·빈티지 자료가 이미 있는지 **읽기 전용 조회**한다. 있으면 중복 수집 금지.
2. 없는 경우 기존 PC 원본 저장 계약을 재사용할지 설계·검증한다. 새 원본을 저장하더라도 기존 SQLite 테이블·원본을 덮어쓰지 않는다.
3. 별도 D1 키/스키마/저장 전용 reader 및 UI 노출은 추가 코드·운영 검증 후 진행한다. 이번 R1 순수 파서만으로 게시/자동수집 성공을 선언하지 않는다.
4. GitHub migration/analysis branch 전체 merge 금지. 최신 main에 올릴 경우 경로별 선별 변경, CI, Cloudflare Git 통합 배포 및 공개 런타임을 각각 검증한다.

## 증거와 보고

- 기동 파일: `lib/market-score/earnings-bea-manufacturing-profit-source-r1.mjs` (순수 함수)
- 테스트: `tests/earnings-bea-manufacturing-profit-source-r1.test.mjs`
- `LIVE_SOURCE_PARSE=PASS`, `LOCAL_UNIT_TESTS=4/4`, `PC_LEDGER_N400RC=UNKNOWN`, `D1_WRITE=NOT_RUN`, `PUBLIC_GET=NOT_RUN`, `DEPLOY=NOT_RUN`.
- 출처: https://www.bea.gov/data/income-saving/corporate-profits 및 https://fred.stlouisfed.org/series/N400RC1Q027SBEA

## R2 — PC 중복 수집 예방용 읽기 전용 재고 검사

- `scripts/pc-writer/EARNINGS_BEA_MFG_PROFIT_R2_PC_INVENTORY_READONLY.mjs`는 승인 PC 루트의 `raw/`, `manual-input/`에서 최대 3,000개의 작은 CSV/JSON을 제한적으로 검사한다.
- 일치하는 FRED 시계열 헤더 또는 메타데이터만 탐지한다. 비밀값/원문 내용을 출력하지 않으며, 원본 파일·DB·Git·D1에 쓰지 않는다.
- `storage/core.sqlite` 및 `history.sqlite` 파일의 존재만 확인하고 내용을 조회하지 않는다. Excel과 기타 원장도 미검사다.
- 따라서 `NO_MATCH_IN_BOUNDED_TEXT_SCAN`은 원본 **부재의 증거가 아니다**. `safeToAutoCapture=false`를 강제하며 자동 수집·저장하지 않는다.
- 실제 PC에서 승인된 원본 저장 여부가 확인될 때까지 상태는 `PC_LEDGER_N400RC=UNKNOWN`이다.
- R2 로컬 테스트 4/4 PASS. 실제 PC 실행 및 운영 저장·게시 전환은 미실행.
- `RUN_BEA_MFG_PC_INVENTORY_READONLY.cmd`는 Windows의 승인된 Node와 PC 루트로 R2를 실행하고 바탕화면에 TXT 보고만 남기는 1회성 수동 실행기다. 원본을 수집하거나 저장하지 않는다.

## R2 PC 실제 실행 결과와 R3 다음 읽기 전용 검사

- 실제 PC 실행 보고 `BEA_MFG_PC_INVENTORY_29114_26237.txt`, `BEA_MFG_PC_INVENTORY_29287_6078.txt`를 2026-10-28에 수신했다.
- 두 번 모두 `RUNNER_EXIT_CODE=0` / `WRAPPER_RESULT=COMPLETED_READ_ONLY`, 각 `filesVisited=1498`, `matchCount=0`, `scanLimited=true`, `sqlWrites`/`d1Writes` 및 `localWrites=0`이다.
- 두 보고 모두 `core.sqlite`와 `history.sqlite`가 존재함을 확인했으나, **SQLite 내부는 미검사**였으므로 여전히 `safeToAutoCapture=false`이다.
- 후속 `EARNINGS_BEA_MFG_PROFIT_R3_SQLITE_READONLY.mjs` 및 `RUN_BEA_MFG_SQLITE_READONLY.cmd`는 해당 SQLite 2개만 열어 100개 테이블 × 20,000행 × 24개 문자 열까지 `N400RC` 식별자를 검색한다.
- DB는 `readOnly:true` 및 `PRAGMA query_only=ON`; 원본 행 내용은 출력하지 않는다. 검사 범위 제한, 조회 실패, 런타임 SQLite 미지원은 성공이나 원본 부재로 간주하지 않는다.
- `safeToAutoCapture=false` 계속 유지한다. XLSX와 기타 원본 저장소는 여전히 미검증이다.
- R3 로컬 SQLite fixture 테스트 4/4 PASS; 실제 PC R3 실행, 원본 재수집, D1 저장, GitHub `main` 반영 및 배포는 미실행.

## R3 실제 PC 결과 — 불완전 원장 검사 / R4 압축 원본 점검

- 실제 PC 보고 `BEA_MFG_SQLITE_READONLY_32713_8964.txt`는 정상 종료 코드 0으로 확인되었다.
- `core.sqlite` 39개 테이블, `history.sqlite` 5개 테이블을 검사했고 두 DB 모두 `matchCount=0`, `rowsLimited=true`였다. 20,000행 상한 초과가 있어 **원본 부재를 확정하지 않는다**.
- GitHub `main` 운영 코드의 `worker/market-operational-store.mjs`에는 `market_input_batches_v1.body`가 `gzip:` 접두어와 base64로 압축되어 저장되는 계약이 있다. R3 일반 문자열 검사만으로는 이 내용을 탐지할 수 없다.
- R4 `EARNINGS_BEA_MFG_PROFIT_R4_COMPRESSED_STORE_READONLY.mjs`는 기존 `market_input_batches_v1`의 최근 macro/BEA/earnings 키 본문을 읽어 압축 해제 후 `N400RC` 존재 여부를 확인한다. `api_history_chunks_v1`, `api_history_snapshots_v1`의 dataset 식별자도 직접 확인한다.
- R4 역시 검색 표본에 상한이 있으며 `safeToAutoCapture=false`로 신규 캡처를 자동 승인하지 않는다. 실제 PC 실행 미확인, 로컬 테스트 3/3 통과, 운영 데이터 수정·D1·배포 미실행.

## R4 PC 결과 및 R5 분리 보관 후보

- `BEA_MFG_COMPRESSED_READONLY_1186_30127.txt`에서 실제 PC R4가 `RUNNER_EXIT_CODE=0`으로 완료됐다.
- `core.sqlite` 최근 입력 153개(`latestRowsChecked=45` 포함)와 API 이력 식별자에서 `N400RC`를 찾지 못했고, `history.sqlite` 역시 알려진 이력 저장소 일치는 0건이었다.
- 다만 `PREFIX_SAMPLE_LIMIT`, `LATEST_SAMPLE_LIMIT`이 있어 **기존 원본의 전역 미존재는 증명되지 않았다**. 기존 DB 자동 보완/삭제/덮어쓰기 금지.
- R5는 이 불확실성에서 기존 원장을 수정하지 않도록 `raw/earnings-recession/bea-manufacturing-profits-r5/`라는 신규 전용 경로에 FRED 현재 빈티지 CSV를 SHA256 이름으로 append-only 보관하는 별도 단계다.
- 동일 SHA가 있으면 원문을 검증 후 재사용하고, 내용이 충돌하면 정지한다. 메타데이터는 최초 캡처 시각을 보존한다.
- 실행기는 Windows에서 새 원본 파일 생성 전 Y/N 확인을 표시한다. R5에 의한 새 원본 저장은 **기존 전체 원본의 부재 입증을 뜻하지 않는다**.
- R5 로컬 테스트 4/4 PASS. 승인 PC 실제 수집·원본 생성, D1 저장, 공개 API, UI 및 배포는 실행 전까지 미확인/미실행이다.
