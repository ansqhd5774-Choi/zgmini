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
