# ZGMINI 시장 캘린더 R23 — EIA 공식 발표 일정 연결

## 현재 상태 · 2026-10-28

- **공식 공급원 조사 및 읽기 전용 PC 원문 확보 도구 CODE_READY.** EIA 파서·정규 수집기·UI 운영 연결은 아직 미구현이다. 이 단계를 데이터 자동 수집·사이트 게시 성공으로 표기하지 않는다.
- 작업 대상: 승인 기존 브랜치 `codex/zgmini-gpt-workspace-20261025`만. 별도 브랜치·main 병합·배포 없음.
- 기존 PC Core R22 설치 확인: 사용자 PC `a50ac307d8d0849ca2800b3c4df4cd6daaba3b1e`, 사용자 로그 `R22_FED_CALENDAR_INSTALLED_NO_FORCED_COLLECTION`.

## 공급원 심사

| 공식 출처 | 대상 | 수신 검토 | 무료·공개 재사용 | 주의사항 |
| --- | --- | --- | --- | --- |
| `https://www.eia.gov/reports/upcoming.php` | EIA 발표 주기·발표 종류 | HTML 원문 확보 전 | EIA 공식 재사용 정책상 허용 | 월간·분기 날짜는 잠정일 수 있음 |
| `https://www.eia.gov/petroleum/supply/weekly/schedule.php` | 주간 석유재고(WPSR) 휴일 예외 일정 | HTML 원문 확보 전 | 동일 | 통상 수요일 미 동부 10:30, 예외 반영 필요 |
| `https://www.eia.gov/petroleum/supply/weekly/` | WPSR 공식 다음 발표일 | HTML 원문 확보 전 | 동일 | 다음 실제 공시일과 관측시각 분리 |
| `https://ir.eia.gov/ngs/schedule.html` | 주간 천연가스 저장량(WNGSR) 휴일 예외 | HTML 원문 확보 전 | 동일 | 통상 목요일 미 동부 10:30, 휴일 예외는 별도 |
| `https://www.eia.gov/outlooks/steo/release_schedule.php` | 단기 에너지 전망(STEO) 발표 정책·변동 | HTML 원문 확보 전 | 동일 | 예외·변경 공지 때문에 날짜 임의 확정 금지 |
| `https://www.eia.gov/outlooks/steo/` | STEO 다음 발표일 | HTML 원문 확보 전 | 동일 | 실제 공식 발표일만 수록 |

### 확인된 정책과 출처

- 발표 일정: EIA 정기 공표 안내와 WPSR/WNGSR 공식 휴일 일정, STEO 발표 안내를 우선한다.
- 저작권: `https://www.eia.gov/about/copyrights_reuse.php`는 공공 EIA 자료 배포·이용을 허용하며 출처와 발표일 표기를 권장한다. 원문·출처·관측일 보존.
- 접근 안전: `https://www.eia.gov/about/privacy_security_policy.php`는 과도한 자동 수집 및 접근제어 우회를 금지한다. 공개 공식 페이지별 1회 일렬 요청, 요청 사이 1.2초 간격. 차단/403 발생 시 우회·재시도 루프 금지.
- 기존 PC `release-calendar`의 BLS, BEA, Fed G.17, Fed monthly, Census, 5-field 일정 계약을 변경하지 않는다.

## R23 1차 구현 · 공식 원문 확보

- `scripts/pc-writer/market-calendar-r23-eia-source-export.mjs`: 승인된 EIA URL 6개만 허용하고, 상태/해시/공식 HTML(Base64)을 단일 TXT에 기록하는 1회 읽기 도구. PC Core·config·SQLite·Windows 작업·Git·Publisher를 읽거나 변경하지 않는다.
- `tests/market-calendar-r23-eia-source-export.test.mjs`: 고정 공식 URL, 순차 조회·대기, 원문 바이트 무결성, 부분 실패, 비승인 URL·리다이렉트·거짓 HTML·크기 제한을 5개 테스트로 검사.
- `MARKET_CALENDAR_R23_EIA_SOURCE_EXPORT.cmd`: Windows용 ASCII+CRLF 명령, 실행 디렉터리에 `MARKET_CALENDAR_R23_EIA_SOURCE_EXPORT_RESULT.txt` 생성.
- `README_R23_EIA_SOURCE_EXPORT.txt`: 사용자에게 전체 ZIP을 풀고 CMD만 실행하도록 안내. 로그에 Core 원장·경로·기밀정보를 포함하지 않는다.

## 다음 구현 게이트

1. 사용자 PC의 정확한 공식 HTML 원문을 확보한다. HTTP 200이어도 일반 오류/차단 페이지면 파서 대상으로 인정하지 않는다.
2. 원문에서 **명시된 다음 발표일과 공개된 휴일 예외**만 수집한다. 정책에 기반한 미래 요일 계산은 별도 `policy` 성격으로 구분해야 하며, 근거 없는 확정 일자를 생성하지 않는다.
3. EIA 이벤트 ID 독립 네임스페이스, 기존 5필드 스키마, 날짜/중복/재발행·정정/이력 보존, 미발표 시간은 미확정 처리. 시간값 연동은 기존 계약 범위에서 검토한다.
4. 로컬 테스트로 원문 구조와 예외, 기존 5개 소스의 회귀를 확인한 후 승인 R22 PC Core source 고정 설치 패키지를 별도 작성한다. 수집·게시·예약 실행은 강제하지 않는다.

## 공식 PC 원문 실측 · 2026-10-28 추가

- 사용자 PC `MARKET_CALENDAR_R23_EIA_SOURCE_EXPORT_RESULT.txt`: 6개 공식 URL 모두 HTTP 200, `capturedCount=6`, `EIA_HTML_CAPTURE_COMPLETE_READONLY`. 각 Base64 원문과 SHA256의 바이트 일치를 검산했다. 이 단계는 **읽기 전용 소스 확보**이며 PC Core 설치나 수집 성공이 아니다.
- WPSR: 휴일 예외 표에는 2026-11-12(목, 미 동부 12:00)가 명시되어 있다. `https://www.eia.gov/petroleum/supply/weekly/`의 다음 발표일 `<span>`은 빈 상태이며, JS가 공식 공개 `./includes/wpsr-calendar.json`을 추가 요청한다. 일반 HTML만으로 정기 다음 발표일을 확인했다고 주장하지 않는다.
- WNGSR: 공식 휴일 예외 표에 2026-11-13(금 10:30 ET), 2026-11-25(수 12:00 ET)가 명시되어 있다.
- STEO: 공식 `release_schedule.php` 표에 2026·2027 연간 24개 월간 날짜가 직접 명시되어 있으며, 2026-10-28 이후 14건이다. 다음 발표일인 2026-11-10은 별도 공식 STEO 홈 화면에서도 교차 확인된다. EIA가 일정 변경 가능성을 밝히므로 이후 정규 수집 때 확인된 변경을 적용한다.
- 위 실측 HTML 4종의 독립 파서는 `staging/market-calendar/r23-eia/lib/eia-calendar.mjs`에 추가했다. `fromDate=2026-10-28` 검산: WPSR 1건, WNGSR 2건, STEO 14건, STEO 다음 발표일 1건(동일 11-10). 결과는 기존 5개 필드(`id,date,title,source,sourceUrl`), 독립 ID(`eia-wpsr`, `eia-wngsr`, `eia-steo`). 임의 정기 요일 확정 생성 없음.
- WPSR의 공식 JS 참조 JSON **한 파일만** 추가로 검증하기 위한 별도 단발성 읽기 전용 도구 `market-calendar-r23-eia-wpsr-json-export.mjs`와 CMD를 작성했다. 기존 6개 HTML은 다시 요청할 필요가 없다.

### 남은 연결 경계

1. WPSR 공개 JSON의 실제 응답 구조를 수신해 명시된 정기 발표일을 검증하고, 휴일 예외 일정과 중복 없이 병합한다. EIA 접근 실패/403 시 우회하지 않으며 해당 출처만 `SOURCE_FAILED`로 표시하고 기존 공식 값은 보존한다.
2. R22 PC Core의 기존 저장 원문→저장값 재파싱→통합 결과 계약에 독립 EIA 소스로 최소 연결한다. 새로운 DB/스케줄러/공개 산식은 추가하지 않는다.
3. 기존 5개 소스와 EIA의 유효·중복·실패/이력 보존 회귀를 점검한 후 승인된 R22 설치 SHA 기준의 안전한 설치 도구를 제공한다. 지금 단계에서는 아직 미설치·사이트 미반영이다.

## R23 공식 JSON 확보 및 연결 후보 · 2026-10-28

- 사용자 PC 결과 `MARKET_CALENDAR_R23_EIA_WPSR_JSON_RESULT.txt`: 공식 `https://www.eia.gov/petroleum/supply/weekly/includes/wpsr-calendar.json` 1회 HTTP 200, 26,381바이트, SHA256 `b6293ef1109b2cfeb667b0cb5c6d585c5c6f1dfbaa38b953aed6c4e1a539d7b7`, JSON 110개 항목, 유효 날짜 110개. Base64 원문과 SHA256 자체 검산 PASS. Core·config·DB·스케줄러·Git·Publisher 변경 모두 `false`.
- 실제 원문에는 `data_for_date`, `release_date`, `next_release_date`, `holiday_delayed`, `holiday_name`, `release_time`, `blackout_minutes` 필드가 있다. WPSR 정기·휴일 일정은 105건(2026년 10월 28일 이후 63건)이며, 과거 비정규 추가 게시 5건은 비표준 발표 시각으로 구분하여 정규 경제 캘린더에서 제외한다. 비정규 게시 사실 자체를 지우거나 조작하지 않는다.
- 2026-11-12 WPSR 휴일 대체일/12:00 ET는 공식 JSON과 별도 공식 휴일 일정표가 일치한다.
- `staging/market-calendar/r23-eia/lib/eia-calendar.mjs`에 정기 WPSR JSON 파서를 추가하였다. 인위적 요일 계산이나 확정되지 않은 미래 날짜의 생성은 없다.
- 별도 R23 PC Core 후보 `staging/market-calendar/r23-eia/lib/release-calendar.mjs` 및 `scripts/pc-writer/release-calendar.mjs`에 독립 `eia` 출처가 추가되었다. 현행 BLS/BEA/G.17/Fed monthly/Census 동작과 기존 `release-calendar` 5필드 결과 계약을 보존한다. EIA 원문을 먼저 기존 SQLite input 저장소에 기록한 뒤 저장 원문으로 파싱하고, 각각 `wpsr-json`, `wngsr-schedule`, `steo-schedule`을 수집한다. 첫 번째/세 번째 소스 실패 시 EIA 공식 예외 표/다음 발표일만 추가 조회하여 부분 복구하고, 직전 공식 관측 이벤트는 지우지 않는다.
- UI 브랜치 `app/market-calendar/market-calendar-client.tsx`에서 `eia-wpsr`, `eia-wngsr`, `eia-steo` ID 3개만 통과시키고 `EIA` / `에너지`로 표시한다. 기존 중요도·선택일·디자인·SEO 메타·다른 출처 표시를 유지한다. **아직 main 반영/사이트 배포는 하지 않았다.**
- PC 설치기 `scripts/pc-writer/market-calendar-r23-eia-apply.mjs` 및 `MARKET_CALENDAR_R23_EIA_APPLY.cmd`는 설치 전 R22 승인된 PC source `a50ac307d8d0849ca2800b3c4df4cd6daaba3b1e`, Core worktree identity, 승인된 R22 2파일 해시, R23 후보 3파일 해시, 기존 Core cycle lock, dirty source, config.source 확인을 모두 요구한다. 신규 EIA 모듈 1개와 기존 파일 2개만 백업/로컬 커밋하며 수집·게시·예약 실행과 GitHub/main/Cloudflare 배포는 강제하지 않는다.
- 로컬 EIA 파서·collector·installer 신규 테스트 및 기존 R22 회귀 테스트 PASS. CMD ASCII+CRLF, ZIP 무결성 PASS. 사용자 전달물 `MARKET_CALENDAR_R23_EIA_PC_INSTALL_20261028.zip` SHA256 `31056df32b0f1bb54cec6f5b2116ad851f224bc55e479d2ae629920d4741ed08`.

### 정확한 다음 상태

R23 연결 소스 및 UI 브랜치 반영, R23 Windows PC 설치 패키지 CODE_READY. **사용자 PC R23 설치와 사이트 정규 수집/공개 확인은 미실행**. 사용자는 ZIP 전체 압축 해제 후 CMD 1회 실행, `MARKET_CALENDAR_R23_EIA_APPLY_RESULT.txt` 한 파일만 전달하면 된다. 소스가 다르거나 설치 안전 조건이 실패하면 덮어쓰지 않고 STOP한다. R22 운영 소스 보존.
