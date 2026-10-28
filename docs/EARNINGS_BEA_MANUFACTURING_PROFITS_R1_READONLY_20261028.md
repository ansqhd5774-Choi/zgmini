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
