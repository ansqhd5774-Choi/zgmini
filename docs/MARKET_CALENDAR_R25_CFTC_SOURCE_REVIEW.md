# ZGMINI 시장 캘린더 R25 — CFTC COT 보고서 발표 일정

## R24 사용자 PC 코드 설치 확인 (2026-10-28)

- 사용자 제출 `MARKET_CALENDAR_R24_USDA_APPLY_V2_RESULT.txt`를 검토했다.
- `decision=R24_USDA_V2_INSTALLED_NO_FORCED_COLLECTION`, `phase=INSTALLED`, `baseInstallerDecision=R24_USDA_CALENDAR_INSTALLED_NO_FORCED_COLLECTION`.
- R24 이전 PC HEAD `4e2a12ccf486d760a21c3269a9f77a4bfe4f48df`, 새 로컬 HEAD **`b8204432cea18f62eb34eb8d08dcfe61717a448d`**.
- 변경 정확히 3개: `lib/release-calendar.mjs`, `lib/usda-calendar.mjs`, `scripts/pc-writer/release-calendar.mjs`. 백업 생성, 다른 작업이 소유한 5개 파일 보존, 강제 수집·게시·GitHub push 없음.
- 이는 **PC 코드 설치 완료**의 증거이며, 정규 수집·SQLite 반영·사이트 게시 결과는 아직 미관측이다. 사용자 지시에 따라 이 미관측 상태를 다음 공식 공급원 개발의 불필요한 선행 차단조건으로 만들지 않는다.

## 다음 공식 소스 후보: CFTC COT

- 공식 일정: https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm
- 공식 사용 정책: https://www.cftc.gov/WebPolicy/index.htm
- 미국 상품선물거래위원회(CFTC)는 **Commitments of Traders(COT)** 보고서를 통상 금요일 미 동부시간 15:30에 발행한다. 대개 직전 화요일의 포지션 데이터이며, 공휴일에는 1~2일 지연될 수 있다.
- CFTC 2026년 공식 일정표는 실제 월별 날짜와 지연 표시(*)를 제공한다. 2026-10-28 기준 향후 발표는 **10/30, 11/06, 11/16*, 11/20, 11/30*, 12/04, 12/11, 12/18, 12/28*** 9건이다. **2027년 일정은 아직 공식 해당 페이지에서 제시하지 않으므로 가상 생성 금지.**
- CFTC Web Policy는 정부 제작 공개정보가 퍼블릭 도메인이며 재사용 시 출처 표시를 요청한다고 명시한다. 제3자 보호 저작물·CFTC 인장·타 웹페이지 라이선스는 이 근거로 재배포하지 않는다.
- 상품·금융 선물 시장의 주간 포지션 보고서 발표는 경제지표/실적과 함께 투자자가 확인하는 시장 주요 이벤트로 분류 가능하다.

## R25 첫 단계: 공식 HTML 원문 검증

1. `scripts/pc-writer/market-calendar-r25-cftc-source-export.mjs`는 **공식 URL 단 1회 GET**으로 2026년 일정 HTML 원본·SHA256·HTTP 상태를 사용자 PC 결과 TXT에 기록한다. 공인된 URL 외 접근·리다이렉트·과대 응답·일정 페이지 아닌 응답을 거부한다.
2. `MARKET_CALENDAR_R25_CFTC_SOURCE_EXPORT.cmd` 실행 시 결과 파일 `MARKET_CALENDAR_R25_CFTC_SOURCE_EXPORT_RESULT.txt` 생성. Core, Git, config, SQLite, 스케줄러, 게시기 등에는 접근/쓰기 없음.
3. 사용자 실제 공식 HTML 응답을 받은 후 **월별 일정표 파서**를 스테이징한다. 임의 요일 생성 금지. 날짜별 연도, 공휴일 지연 표시, 미 동부 15:30, DST/KST 변환 정책을 검사한다.
4. R24 PC source `b8204432...`과 그사이 다른 작업 변경을 읽기 전용 확인한 후 **정확한 최소 수집/파서 연결 파일**과 백업·검증·로컬 설치 패키지를 준비한다. 기존 수집·게시 이력과 5필드 계약을 보존한다.
5. GitHub 작업 브랜치는 `codex/zgmini-gpt-workspace-20261025`로 고정. 새 브랜치·main 병합·배포·강제 수집 없음.
