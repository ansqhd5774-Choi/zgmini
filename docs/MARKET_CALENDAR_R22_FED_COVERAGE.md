# ZGMINI 시장 캘린더 R22 — 연준 발표 일정 확대 후보와 원문 검증

## 상태 (2026-10-28)

- **현재 단계: 공식 출처 범위 조사 + 읽기 전용 원문 구조 확보 패키지 CODE_READY.** PC 설치·수집·게시 성공이 아니다.
- 기존 PC R21 설치 증거: `phase=INSTALLED`, `decision=R21_CENSUS_YEAR_INSTALLED_NO_FORCED_COLLECTION`, HEAD `b5e860d09ac87087e158193613425b146fa9a1e5`.
- 고정 작업 브랜치: `codex/zgmini-gpt-workspace-20261025`. 다른 브랜치·main 반영·PC 운영 코어 변경 금지.

## 공식 출처·범위

- `https://www.federalreserve.gov/newsevents/calendar.htm`: 연준 발표 일정 통합.
- `https://www.federalreserve.gov/newsevents/2026-october.htm?view=calendar`, `.../2026-november.htm?view=calendar`: 월별 공식 목록에는 FOMC 회의/의사록/기자회견, Beige Book, G.17, G.19, H.4.1, H.6, H.8, H.15, Z.1(발표 월에 한함), SLOOS 등이 존재한다.
- `https://www.federalreserve.gov/data/releaseschedule.htm`: 통계 공표 일정.
- `https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm`: FOMC 연간 회의 일정, 향후 연도 잠정일. 사이트 기존 FOMC 수동 일정 중복 처리 주의.
- `https://www.federalreserve.gov/disclaimer.htm`: 별도 표시 없는 연준 공식 웹 콘텐츠는 공개 복제·배포 가능. 제3자 자료는 제외.
- 기존 `RELEASE_SOURCES.fed`는 `https://www.federalreserve.gov/releases/g17/`에서 **G.17만** 파싱한다. 기존 ID `industrial-production` 및 BLS·BEA·Census 출력, Core schedule/cache/lease 계약을 보존한다.
- `app/market-calendar/market-calendar-client.tsx`는 현재 Fed의 일반 `fed-...` ID를 렌더링하지 않는다. 추가 Fed 이벤트를 수집하더라도 UI 조건을 별도로 갱신하지 않으면 표시되지 않는다.

## 필요한 안전 게이트

1. 공식 연준 실제 HTML 레이아웃을 먼저 확보한다. 로컬 작업 환경에서는 외부 직접 HTTP의 DNS 조회가 실패했으므로 임의 HTML 템플릿만으로 운영 파서를 설치하지 않는다.
2. `MARKET_CALENDAR_R22_FED_SOURCE_EXPORT.cmd`는 5개 공개 공식 URL을 1회 읽고, 수신 원문을 Base64로 `MARKET_CALENDAR_R22_FED_SOURCE_EXPORT_RESULT.txt` **한 파일**에 담는다. 스크립트는 Core/DB/scheduler/Git/publisher를 읽거나 실행·수정하지 않는다.
3. 원문을 기반으로 경계·시간·동일행 중복·전월/차월·미발행 미래연도·잠정 일정 구분 검증 후 staged parser/collector 구현. 존재하지 않는 날짜·시간은 생성하지 않는다.
4. 연준 산업생산 G.17 중복, FOMC 기존 고정 일정과 중복, 실패 시 마지막 승인 이력 보존을 필수 회귀 항목으로 한다.
5. PC 운영에 적용할 단계에서는 실제 승인 R21 PC collector CRLF 원본/HEAD/설정/source를 기준으로 단일 변경 범위를 명시한 별도 패키지·검증 절차를 만든다. 본 R22 read-only 패키지는 운영 파일 설치용이 아니다.

## 코드와 테스트

- `scripts/pc-writer/market-calendar-r22-fed-source-export.mjs`: 무변경 공개 공식 원문 수집·해시·Base64 단일 TXT 구성.
- `tests/market-calendar-r22-fed-source-export.test.mjs`: 월 경계, 원문 바이트 검증, 미래 달력 결측, 비공식 URL 거절 4개 검사.
- `MARKET_CALENDAR_R22_FED_SOURCE_EXPORT.cmd`, `README_R22_FED_SOURCE_EXPORT.txt`: Windows용 실행·사용법.
- 원문 확보 전 파서 또는 UI를 설치했다고 보고하지 않는다. 기존 R21 정규 수집 여부는 사용자의 사후 관찰 대상이며 R22 소스 개발 선행조건은 아니다.
