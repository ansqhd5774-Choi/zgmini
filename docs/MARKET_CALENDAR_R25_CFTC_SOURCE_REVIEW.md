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

## R25 실제 PC 공식 원문 확인 및 수집 연결 준비 (2026-10-28)

- PC 결과 `MARKET_CALENDAR_R25_CFTC_SOURCE_EXPORT_RESULT.txt`: `decision=CFTC_HTML_CAPTURED_READONLY`, HTTP `200`, 원문 **47,894바이트**, SHA256 `bb3f01f89084d039bc3c40c5061e223eb7f89e3a7a785028e7f3dbbaee6ba792`. 결과 TXT에 첨부된 Base64를 다시 바이트로 변환하여 원문 크기와 SHA256 일치 검증 PASS.
- 원본 HTML에서 `<h3><strong>2026 Release Schedule</strong></h3>` 다음 `table.table` 아래의 각 월별 `<tr><td>Month</td>...` 날짜표를 확인했다. 실제 HTML 직접 파싱 결과 **연간 52건**, 2026-10-28 이후 **9건**, 휴일 지연표시 3건(11/16, 11/30, 12/28). 스크린샷·추정 요일·저장 샘플 대신 PC에서 받은 공식 원문을 근거로 검증했다.
- `staging/market-calendar/r25-cftc/lib/cftc-calendar.mjs`: 연도별 공식 일정 제목 및 12개월 행 검증, 실제 날짜값과 `*` 지연 표시 추출, 연도·월·일·중복 검사. 웹에 표시되지 않는 2027년 날짜나 금요일 규칙을 임의 생성하지 않는다. 기존 이벤트 계약의 **`id/date/title/source/sourceUrl` 5개 필드**를 유지한다.
- `staging/market-calendar/r25-cftc/lib/release-calendar.mjs`: 기존 R24 공급원 선언을 모두 유지하고 CFTC 한 공급원만 추가한다. `staging/market-calendar/r25-cftc/scripts/pc-writer/release-calendar.mjs`: `release-calendar:cftc` 키에 CFTC 실제 원문을 저장 후 저장 원문에서 다시 파싱하고, 연도별 이전 이력 보존 및 출처 오류 시 이전 CFTC 일정 보존·`SOURCE_FAILED` 처리. 기존 6시간 주기 가드·락·게시·스키마는 변경하지 않는다.
- 코드 테스트: R25 파서 4/4, 수집 3/3, 설치기 4/4 PASS. 실제 PC 설치 이전이므로 정규 수집·게시 데이터가 추가됐다고 주장하지 않는다.
- `scripts/pc-writer/market-calendar-r25-cftc-apply.mjs`: R24 PC 성공 SHA `b8204432cea18f62eb34eb8d08dcfe61717a448d`, Core ID `d0a4b3cb8b95`, 기존 EIA/USDA 파일 무결성, parser/collector 정확한 SHA, config.source/락/dirty 확인 후 **3개 파일만** 로컬 백업·적용·커밋. 강제 수집, SQLite, 정규 예약, 게시, GitHub push, main/Cloudflare 배포 없음.
- 설치기 후보 SHA: parser `480184533c696e42606cb8811aaedeef438119fadab03b27d0ebe1afd94fc90e`, CFTC `61ac33217c742672038e5209c8dccf11935db80d088c354f51785afe61cb4bd5`, collector(LF) `00167aa1d6b8970f1b618d8f09a26138f6f57f8ac294eb42d24fb3c2bf7e2d2d`, collector(설치 CRLF) `9a8de4ff89780bb0ed8dcc08365382c75ef8c1b9fdc2597585a104486073d2d8`.
- 다음은 안전 설치 ZIP을 PC에서 한 번 실행하고 결과 로그를 받아 `phase=INSTALLED` 여부만 판정한다. 설치 이후 정규 데이터 수집과 공개 사이트 반영은 별개 상태다.
- 최종 검증: 신규 R25 파서 4/4·수집기 3/3·설치기 4/4 **11/11 PASS**, 기존 R24 USDA collector 3/3 및 R23 EIA collector 9/9 **12/12 PASS**, `npm run typecheck` PASS. Windows CMD ASCII+CRLF, ZIP 7파일 무결성 PASS.
- 사용자 전달 ZIP: `MARKET_CALENDAR_R25_CFTC_PC_INSTALL_20261028.zip`, SHA256 **`413f9584295448542842bdc3e65be366f77ac01080ccb6d242dc8ffc347c74a5`**. 실행 CMD는 `MARKET_CALENDAR_R25_CFTC_APPLY.cmd`, 출력은 `MARKET_CALENDAR_R25_CFTC_APPLY_RESULT.txt`.

## R25 표시 연결 및 검증 보강

- 같은 작업 브랜치의 `app/market-calendar/market-calendar-client.tsx`에 `cftc-cot`/`CFTC` 분류·표시를 최소 추가했다. 기존 배치·필터 구조·다른 이벤트 화면 변경 없음.
- 공식 15:30 미국 동부 현지 발표시각을 기존 5필드 API를 확장하지 않은 상태에서 `lib/market-calendar-cftc-time.mjs`로 `America/New_York`(서머타임 적용) 시각 → KST 표시 날짜·남은시간으로 변환한다. 예: 2026-10-30 미국 15:30 EDT → 2026-10-31 한국 04:30, 2026-11-06 미국 15:30 EST → 2026-11-07 한국 05:30. 공휴일 지연 표시도 유지한다.
- 시간 변환/비정상 날짜 차단 테스트 3/3 PASS. R25 전체 신규 테스트는 파서·수집·설치·표시 시각 **14/14 PASS**. 이 결과는 개발 코드 및 공식 원문 적합성 검증이며 사용자 PC 설치 완료나 웹 배포를 의미하지 않는다.
