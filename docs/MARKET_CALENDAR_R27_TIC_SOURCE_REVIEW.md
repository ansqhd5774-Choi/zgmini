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
