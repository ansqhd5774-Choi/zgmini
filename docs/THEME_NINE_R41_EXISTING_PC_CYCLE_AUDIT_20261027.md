# 기존 9개 테마 R41 — 정규 PC 수집 작업 재사용 경로 감사

- 저장소: `ansqhd5774-Choi/zgmini`
- 단일 작업 브랜치: `codex/theme-fear-greed-integration-20261025`
- 목적: **기존 승인 ETF 63종을 재선정하거나 신규 수집기를 만들지 않고**, 실제 정규 PC 작업과 보관 자료 범위를 읽기 전용으로 확인한다.
- 상태: `R40_REAL_PC_EVIDENCE_RECEIVED / R41_SOURCE_TESTED / R41_REAL_PC_PENDING / NO_PUBLICATION`.

## R40 실PC 결과 인계 — 재실행 금지

2026-10-27 사용자가 제출한 `THEME_NINE_R40_PRICE_MODE_RESULT_20261027141620_13984.txt`:

- `SOURCE_AUDIT_COMPLETE_PRICE_MODE_BRIDGE_NOT_CERTIFIED`; R23 manifest 및 R39 Parquet SHA 증거 재검증 PASS.
- 확인된 저장 `etf_daily`는 2026-10-16~26 **7거래일**. SPY 7일, 2026-10-26 ETF 54/63종.
- R23와 일치하는 거래일이 한 번 이상 있는 ETF 52종, 두 번 이상인 ETF 50종. SPY 6일 비교, 최대 절대 원가격/EOD 차이 **0.7896bp**, 연속 5구간 수익률 최대 절대 차이 **1.3072bp**.
- ETF 별 공통 날짜 0일 11종: R39 EOD 미발견 9종 `CABZ,CBOT,GNMX,KYC,LATR,LLMA,RBTX,WR,XA` + EOD에 있으나 R23와 공통 날짜 없는 `BPAY,PSWD`.
- 별도 1일만 겹치는 `CLOD,HAIL`; 2일 `SPAM`; 4일 `KARS,URAN`과 다수 6일 종목이 존재. 종목별 분할·기준시간·장기간 수익률 정합성이 자동 확정된 것은 아니다.
- 시험한 **7개 저장 파일 기준** 40/377/628 유효공통일 충족 종목 0. 이는 전체 다른 원자료·미발견 과거 이력·R23 원가격의 부재나 승인 ETF 자격 실패를 뜻하지 않는다.
- `priceModeAlignmentAuthorized=false`, `publicationAuthorized=false`; Provider GET·원자료·DB·D1·스케줄러 쓰기 모두 0.

## R41 실행 파일 및 범위

`THEME_NINE_R41_EXISTING_CYCLE_WINDOWS.zip`의 3개 파일을 **같은 폴더에 압축 해제**한 후 CMD를 더블클릭한다.

1. `THEME_NINE_R41_EXISTING_CYCLE.cmd` — Windows Node 실행 및 결과 보존.
2. `theme-nine-r41-existing-cycle-audit.mjs` — 저장 `etf_daily` 파일명만 집계하고 현재 정규 수집·계산·게시 소스의 존재·SHA와 승인 ETF 이름이 정적 소스에 언급됐는지만 검사.
3. `theme-nine-r20-approved-candidates.json` — R20 승인 로스터 원본 SHA를 고정 검증.

기존 2개 예약 작업 `ZGMINI-PC-GetMarketHistory-ETF`, `ZGMINI-PC-MarketParquet-ETF`의 **작업 XML을 읽기만** 하며, 민감한 명령줄·사용자·계정/SID·키·작업 XML 원문을 TXT로 내보내지 않는다. 각 작업은 조회 가능 여부·활성화 표시·해시·R181/R179 참조 여부만 기록한다.

기존 운영 후보 소스는 `E:\ZGmini\data\theme-market-history-r131\marketparquet-r167`의 `r181-primary-cycle.mjs`, `r179-publish-core.mjs`, `r171-publish.mjs`다. 실제 설치 소스가 없으면 `present=false`로 기록한다. **정적 텍스트에서 ETF 이름이 확인되더라도 실제 API 호출·정규 수집 대상 또는 63종 커버리지 PASS로 간주하지 않는다.**

TXT는 CMD와 같은 폴더의 `THEME_NINE_R41_EXISTING_CYCLE_RESULT_*.txt`로 기록한다. 읽기 전용, 설치·API·R32 재계산·원자료/DB/D1/작업 변경 없음. STOP이 나면 재실행하지 말고 보고서를 제출한다.

## R41 이후 결정

1. 실제 설치된 R181/R179의 SHA 및 등록된 2개 정규 작업 참조와 저장 파일의 날짜 범위를 확인한다.
2. 이미 확인한 R23 121페이지·R32 2,268건을 재수집/재개발하지 않는다. 기존 정규 PC 소스에서 R20의 63개 입력을 별도로 사용하거나 기존 자료를 재활용할 수 있는지 최소 범위로 판정한다.
3. R40 7개 EOD만으로 252/628일 부족을 **ETF 탈락**이라고 판정하지 않는다. 원가격 1h와 split-adjusted EOD를 무검증 연결하지 않는다.
4. 기존 정규 작업에 실제 누락된 ETF만 최소 추가하는 방안은 수집 권리·제공 범위와 현재 설치 소스/작업 액션을 확인한 뒤 작성한다. 승인 없는 수정·수집·게시 없음.

## R41 실PC 결과 수령 — 2026-10-27

실제 사용자 결과 `THEME_NINE_R41_EXISTING_CYCLE_RESULT_20261027145215_10200.txt`:

- `R41_READONLY_SOURCE_AND_TASK_INVENTORY_COMPLETE`; 저장 EOD 7일(10/16~10/26), 승인 63종 동일.
- 설치 소스 실파일 SHA256: R181 `be0303b112d6f4471137aa134bf98f696a8a8dfe60d1d13502646c5e0b509d62`; R179 `f9ea0a1bfaf52909b7a434b65ba93887f56660bc979a3cb7e0992597bc9f3b68`; R171 `d6b921acd2b935360a4f1df2ce7329b4fdde0d999dddd5ee3f7f6169c9046ba8`.
- R181/R179/R171 **세 파일 모두 승인 ETF 티커의 정적 직접 언급은 0개**. 동적 설정/하위 모듈 사용 여부는 아직 미확인이다. **63종 미수집 증거로 사용 금지**.
- 두 예약 작업 모두 `XML_READ`. GetMarketHistory 작업은 R181 스크립트를 참조, MarketParquet 작업은 R181·R179 직접 참조가 확인되지 않았지만 기존 ZGMINI 루트 참조는 확인됐다. 두 작업의 `enabled`는 `null`이므로 활성화 상태 확정 금지. 예약 등록·실제 실행 성공 증거와 구분한다.
- 공급자 GET·원자료/DB/D1·예약 작업 변경 모두 0. 실제 정규 수집 로스터와 시간봉/EOD 자동 갱신 연결은 여전히 미확정.

다음 최소 검사: [R42 저장 소스 참조 추적](THEME_NINE_R42_SOURCE_DEPENDENCY_AUDIT_20261027.md). 기존 세 파일 원문이나 개인정보/토큰을 외부 제출하지 않고, 직접 참조한 상대 경로의 소스 존재·해시·승인 ETF 정적 언급만 검사한다. 기존 R39/R40/R41 실행을 반복하지 않는다.

