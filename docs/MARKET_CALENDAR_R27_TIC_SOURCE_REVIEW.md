# ZGMINI 시장 캘린더 R27 — 미국 재무부 국제자본거래(TIC) 발표 일정

## R26 사용자 PC 설치 확정 (2026-10-28)

- 사용자 `MARKET_CALENDAR_R26_TREASURY_APPLY_RESULT.txt` 실측: `decision=R26_TREASURY_CALENDAR_INSTALLED_NO_FORCED_COLLECTION`, `phase=INSTALLED`.
- 승인된 PC Core source `724bbbf4407363f1f091567ed196cc0bf554bb5e` → **`c948f2485a55ed24a3b47f42e6c070af8b1f5a62`**. Core worktree ID `d0a4b3cb8b95` 일치.
- 변경 정확히 3개: `lib/release-calendar.mjs`, `lib/treasury-calendar.mjs`, `scripts/pc-writer/release-calendar.mjs`. 기존 EIA/USDA/CFTC 변경 없음. `backupCreated=true`, `gitPushed=false`, `publisherExecuted=false`, `forcedCollection=false`.
- R26 PC **소스 설치 완료**와 실제 다음 정기 수집·SQLite 저장·운영 웹 공개는 구분한다. 자연 수집 관측이 없다고 다음 소스 개발을 막지 않는다.

## 신규 공식 출처: Treasury International Capital (TIC)

- 공식 발표 일정: https://home.treasury.gov/data/treasury-international-capital-tic-system/release-dates-of-tic-data
- 정부 원문 표는 2026·2027년 **월간 자본흐름, 분기 비금융·파생상품 통계, 분기 대외부채, 연간 외국인 미국증권 보유, 연간 미국인 외국증권 보유**를 서로 다른 열로 제공한다.
- 발표 시각은 미국 워싱턴 D.C. **16:00(동부시간)**. 연방정부 사무소 휴무 등으로 발표일이 바뀔 수 있다고 공식 주의를 명시한다.
- 2026-10-16 미국 재무부 보도자료도 다음 월간 TIC 발표를 2026-11-18로 확인한다: https://home.treasury.gov/news/press-releases/sb0662/
- 검색으로 파악한 날짜와 실제 PC HTML을 구분한다. 2026·2027 공식 표의 월별 행·열 구조를 PC 원본에서 검산하기 전 일정 파서·수집기 설치를 하지 않는다. 임의 11영업일 규칙으로 날짜 생성 금지.

## R27 1단계 — 읽기 전용 공식 HTML 수신

1. `scripts/pc-writer/market-calendar-r27-tic-source-export.mjs`는 정확한 공식 URL에 GET 단 1회, 유효한 200 HTML의 원문 Base64·바이트 수·SHA256·Content-Type을 기록한다.
2. `MARKET_CALENDAR_R27_TIC_SOURCE_EXPORT.cmd`와 README·테스트를 함께 ZIP으로 제공한다. PC Core·스케줄러·SQLite·GitHub 소스·게시기는 열거나 변경하지 않는다.
3. 사용자 PC에서 새 폴더에 ZIP 전체 압축 해제→CMD 한 번 실행→`MARKET_CALENDAR_R27_TIC_SOURCE_EXPORT_RESULT.txt` 업로드.
4. 원본 수신 후 2026·2027 실제 HTML 표 기반 날짜/분류 파싱, KST 시간 변환을 검증한다. R26 승인 PC 소스·그사이 다른 작업자 변경을 안전 재조회한 후 최소 파일 설치 패키지를 작성한다.
5. 읽기 전용 신규 조회기 4/4 및 직전 R26 조회기 4/4 테스트 PASS. Windows CMD ASCII+CRLF, ZIP 3파일 무결성 검사 PASS.
6. ZIP `MARKET_CALENDAR_R27_TIC_SOURCE_EXPORT_20261028.zip` SHA256 **`8df80cf19155762ce2301bb029e116ff62b37a3c550562e522d8fcafae27bf3b`**.

## 안전 경계

- 기존 지정 브랜치 **`codex/zgmini-gpt-workspace-20261025`** 한 개만 사용. 신규 브랜치·main 병합·배포 금지.
- R27은 **READ_ONLY_SOURCE_EXPORT_READY** 단계. PC 소스 설치, 정규 수집·DB 저장, 사이트 반영은 전부 미실행.
- 기존 지표·실적 이벤트와 5필드 캘린더 계약을 보존하며 저장 원본을 재파싱한다. 공휴일 변경 가능성·연간 5가지 통계 유형을 구분한다.

## R27 2단계 — 실제 PC 공식 원문 검산과 안전 설치 파일 (2026-10-28)

- 제출된 PC `MARKET_CALENDAR_R27_TIC_SOURCE_EXPORT_RESULT.txt`의 `decision=TIC_HTML_CAPTURED_READONLY`, `status=RAW_HTML_CAPTURED_NOT_APPLIED`, HTTP 200, `text/html; charset=utf-8`, 원문 111,191 bytes, SHA256 `d4078362e4746da2f38ffeaab8b8661b973d1484b46a4b1f8d463306ef710486`를 Base64 디코딩한 원문으로 자체 재계산하여 **정확히 일치**. 관측 시각 `2026-10-28T06:28:58.225Z`.
- 실제 HTML 표는 6열(발표일 + 월간/분기 2종/연간 2종), 2026·2027 각 12월 행. 발표 이벤트 **2026년 25건 + 2027년 24건 = 49건**, 총 5개 발표 종류. 연간 잠정/최종 단계와 2026-01-16 분기 대외부채 지연 표기는 원문 그대로 구분. 2026-10-30 미국인 외국증권 연간 최종, 2026-11-18 월간 발표를 검산.
- 신규 `staging/market-calendar/r27-tic/lib/tic-calendar.mjs`는 공식 6열·연도·월·일·stage 값과 실제 날짜 유효성을 엄격히 검증한다. 원문에 없는 발표일/관측치/요일 규칙은 생성하지 않는다. `lib/market-calendar-tic-time.mjs`와 UI는 동부시간 16:00을 IANA `America/New_York` 기준 UTC로 계산하고 KST 다음 날 05:00(EDT)/06:00(EST)에 표시한다. 저장 이벤트는 기존 `id/date/title/source/sourceUrl` 5필드만 사용.
- 신규 R27 후보 수집기 `staging/market-calendar/r27-tic/scripts/pc-writer/release-calendar.mjs`는 공식 HTML HTTP GET 한 번에 `redirect:'error'`와 15초 제한을 사용, DB raw `release-calendar:tic` 먼저 저장→저장 원문 재파싱. 신뢰 가능한 과거/미포함 연도는 유지, 공식 최신 같은 월 발표 변경은 미래 관측을 교체, 출처 실패 시 기존 TIC 이벤트 보존. EIA/USDA/CFTC/Treasury 포함 다른 소스 분기는 R26 후보 그대로 보존.
- PC 설치 전 출처 재확인: 사용자 R26 성공 로그 `R26_TREASURY_CALENDAR_INSTALLED_NO_FORCED_COLLECTION`, `phase=INSTALLED`, PC SHA `c948f2485a55ed24a3b47f42e6c070af8b1f5a62`, Core ID `d0a4b3cb8b95` 검산. R27 설치기는 동일 HEAD/config/source 및 parser/Treasury/EIA/USDA/CFTC/collector SHA, task origin·잠금·dirty 재검증 후 오직 `lib/release-calendar.mjs`, 신규 `lib/tic-calendar.mjs`, `scripts/pc-writer/release-calendar.mjs` 3개만 백업·로컬 커밋. 다른 PC 작업자 SHA가 바뀌었으면 **STOP**, 우회 금지.
- 후보 SHA256: parser `97800cfbe226be56c3f10e9fa4a37a8967a7e84ad5ba2f098477f7fb3447aefe`, TIC module `86a2a62d35f26627f8623ab9002ff56a9c28ed10b1357e2abd3794a1b3d26dae`, collector LF `aa091265aa3a80f2199b3d58258eeabdebd241709a37e034dbd113328b844e00`, collector 설치 CRLF `7ccf0183868fc2f19de5b5f07409383def161a78a1353dba6049299631f31708`.
- R27 신규 parser/UI 4/4 + collector 3/3 + installer 4/4 = **11/11**. R27 exporter 4/4와 R26 및 R23–R25 관련 회귀 포함 총 **41/41** PASS. `npm run typecheck` PASS. Windows CMD ASCII·CRLF·BOM 없음, ZIP 7/7 무결성 PASS.
- 전달 ZIP `MARKET_CALENDAR_R27_TIC_PC_INSTALL_20261028.zip`, SHA256 **`f7a894ac1bfcc40bac2c7af08d492b7fd7196871a3b39f25894e95a257404af8`**. 모든 파일을 새 폴더에 압축 해제→`MARKET_CALENDAR_R27_TIC_APPLY.cmd` 1회→`MARKET_CALENDAR_R27_TIC_APPLY_RESULT.txt` 제출. 강제 수집·SQLite/D1 DB 쓰기/게시·예약 작업 변경·GitHub push·main 병합·Cloudflare 배포는 설치 CMD에 없음.
- 상태: **R27 PC OFFICIAL HTML VERIFIED / PARSER_COLLECTOR_UI_CODE_READY / SAFE_INSTALL_ZIP_READY**. 실제 사용자 PC R27 설치 **미확인**, 정규 예약 수집·사이트 공개 **미검증**. 1단계의 `READ_ONLY_SOURCE_EXPORT_READY`는 과거 시점 기록이다.
