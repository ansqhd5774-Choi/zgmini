# ZGMINI 시장 캘린더 R22 — 연준 발표 일정 확대 후보와 원문 검증

## 상태 (2026-10-28)

- **현재 단계: R22 공식 연준 수집기 사용자 PC 설치 완료(설치 로그 검증).** 실제 정규 주기 수집과 공개 사이트 반영은 별도 미확인이다.
- 기존 PC R21 설치 증거: `phase=INSTALLED`, `decision=R21_CENSUS_YEAR_INSTALLED_NO_FORCED_COLLECTION`, HEAD `b5e860d09ac87087e158193613425b146fa9a1e5`.
- 고정 작업 브랜치: `codex/zgmini-gpt-workspace-20261025`. 다른 브랜치·main 반영·PC 운영 코어 변경 금지.


## 사용자 PC R22 설치 완료 증거 (2026-10-28)

- 사용자 제출 단일 파일: `MARKET_CALENDAR_R22_FED_APPLY_RESULT.txt`; `mode=EXPLICIT_APPLY`, `phase=INSTALLED`, `decision=R22_FED_CALENDAR_INSTALLED_NO_FORCED_COLLECTION`. 로그 시각 `2026-10-28T02:08:12.277Z`.
- 승인 이전 PC Core source `b5e860d09ac87087e158193613425b146fa9a1e5` → **새 로컬 Core HEAD `a50ac307d8d0849ca2800b3c4df4cd6daaba3b1e`**. 작업 나무 ID `d0a4b3cb8b95` 일치.
- 정확히 두 파일 `lib/release-calendar.mjs`, `scripts/pc-writer/release-calendar.mjs` 변경. 후보 파서 LF SHA256 `ede3d4e1a95eb0f9bde1a1ad3f42812cf090a9821a2e7af517638fb928d6704b`, 설치 수집기 CRLF SHA256 `2ecac6ac7c16c6a06ca81b67feb32f4342f1b2b89163b5531f0f6bb90d622388` 일치.
- `backupCreated=true`, 백업 ID `r22-20261028020813808-b0e16243`. `gitPushed=false`, `publisherExecuted=false`, `forcedCollection=false`.
- 설치 로그 자동 비교 항목 10개 전부 PASS. **확정: 설치 및 Core config.source 전환. 미확인: 이후 예약 수집 성공·실제 발표 건수·공개 배포/readback.** 이들을 자동으로 PASS 처리하지 않는다.

## 공식 출처·범위

- `https://www.federalreserve.gov/newsevents/calendar.htm`: 연준 발표 일정 통합.
- `https://www.federalreserve.gov/newsevents/2026-october.htm?view=calendar`, `.../2026-november.htm?view=calendar`: 월별 공식 목록에는 FOMC 회의/의사록/기자회견, Beige Book, G.17, G.19, H.4.1, H.6, H.8, H.15, Z.1(발표 월에 한함), SLOOS 등이 존재한다.
- `https://www.federalreserve.gov/data/releaseschedule.htm`: 통계 공표 일정.
- `https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm`: FOMC 연간 회의 일정, 향후 연도 잠정일. 사이트 기존 FOMC 수동 일정 중복 처리 주의.
- `https://www.federalreserve.gov/disclaimer.htm`: 별도 표시 없는 연준 공식 웹 콘텐츠는 공개 복제·배포 가능. 제3자 자료는 제외.
- 기존 `RELEASE_SOURCES.fed`는 `https://www.federalreserve.gov/releases/g17/`에서 **G.17만** 파싱한다. 기존 ID `industrial-production` 및 BLS·BEA·Census 출력, Core schedule/cache/lease 계약을 보존한다.
- `app/market-calendar/market-calendar-client.tsx`는 현재 Fed의 일반 `fed-...` ID를 렌더링하지 않는다. 추가 Fed 이벤트를 수집하더라도 UI 조건을 별도로 갱신하지 않으면 표시되지 않는다.

## 2026-10-28 실제 PC 수신 원문 확인

- `MARKET_CALENDAR_R22_FED_SOURCE_EXPORT_RESULT.txt`로 월별 3개(2026년 10·11·12월), 통계공표 일정, FOMC 공표 일정 **5개 모두 HTTP 200** 및 비어 있지 않은 원문 Base64·SHA256 확보.
- 실제 `cal-nojs`의 월 제목(`October 2026` 등), 섹션(`FOMC Meetings`, `Beige Book`, `Statistical Releases`), 3열 행(미국 현지시각·발표명·일)을 근거로 파서를 개발했다. 수신 문서와 월 제목이 달라지거나 발표행이 없으면 실패 처리한다.
- 보관된 원문을 메모리에서만 읽어 검증한 추출 후보: **10월 62개·11월 58개·12월 64개, 총 184개 일정 행**. 이는 정규 PC DB 또는 공개 사이트의 수집 건수가 아니라 **R22 로컬 파서 검증 결과**다.
- G.17(`industrial-production`)는 기존 `fed` 제공 일정과 중복되므로 제외한다. FOMC 기준금리 결정과 기자회견은 기존 수동 일정과 중복되므로 제외한다. FOMC 의사록·베이지북 및 기타 별도 통계 일정은 새 `fed_calendar` 출처에 남긴다.
- 공식 사이트가 `approximate`로 표시한 G.20 등은 **발표일 잠정**으로 구분한다. 시각이 확인되지 않은 UI 일정에 시간을 추정해서 생성하지 않는다.

## 구현 및 운영 영향

- `staging/market-calendar/r22-fed-calendar/lib/release-calendar.mjs`: 기존 BLS/BEA/G.17/Census 파서를 보존하고 `parseFedMonthlyCalendar`와 `RELEASE_SOURCES.fed_calendar`만 추가한다.
- `staging/market-calendar/r22-fed-calendar/scripts/pc-writer/release-calendar.mjs`: UTC 현재 월과 다음 2개월 공식 월별 달력 URL을 조회한다. 검증된 월만 입력을 저장하고, 한 월의 오류 발생 시 직전 승인 해당 월 자료를 유지한다. **다음 달로 넘어가도 이미 승인된 이전 달 일정의 공개 이력을 유지한다.** 모든 월 오류 시 기존 `SOURCE_FAILED` 이력 보존 흐름을 따른다. 기존 R21 Census 연말 경계 보정 유지.
- `app/market-calendar/market-calendar-client.tsx`: `fed-calendar-*` 출처 ID 렌더 허용, 출처명 `연준`, FOMC 의사록·베이지북 카테고리 부여. 기존 5필드 일정 계약·타이틀·H1·메타·페이지 경로·검색 노출 설정 변경 없음.
- `scripts/pc-writer/market-calendar-r22-fed-apply.mjs`: **기존 PC R21 HEAD에서 2개 Core 파일만** 소스·해시·잠금 확인, 백업 후 로컬 커밋, config.source 업데이트. 운영 작업 강제 실행/게시/DB 수정/예약 변경/GitHub push 없음.
- `MARKET_CALENDAR_R22_FED_APPLY.cmd`와 `README_R22_FED_PC_INSTALL.txt`를 동일 ZIP에 포함한다. CMD는 ASCII CRLF; 성공 또는 정지 사유를 실행 위치의 단일 `MARKET_CALENDAR_R22_FED_APPLY_RESULT.txt`로 출력한다.
- 게이트: 최초 R21 PC source `b5e860d09ac87087e158193613425b146fa9a1e5`; R21 파서 LF SHA256 `20d6c99...`, R21 수집기 PC CRLF SHA256 `8105a292...`; 작업 나무 ID `d0a4b3cb8b95`.
- R22 파서 LF SHA256 `ede3d4e1a95eb0f9bde1a1ad3f42812cf090a9821a2e7af517638fb928d6704b`, R22 PC 수집기 CRLF SHA256 `2ecac6ac7c16c6a06ca81b67feb32f4342f1b2b89163b5531f0f6bb90d622388`.
- 검증: `tests/market-calendar-r22-fed-stage.test.mjs` 7/7 PASS(월 전환 이력 보존 추가), `tests/market-calendar-r22-fed-apply.test.mjs` 4/4 PASS, `npm run typecheck` PASS. 기존 기준 검증은 별도 유지한다.

## 필요한 안전 게이트

1. **R22 사용자 PC 설치 완료**: 아래 검증된 사용자 로그로 판단한다. 정규 수집·공개 노출은 이 로그만으로 PASS 처리하지 않는다.
2. 설치는 R22 전용 패키지의 `MARKET_CALENDAR_R22_FED_APPLY.cmd`를 사용한다. R22 기존 `SOURCE_EXPORT`는 읽기 전용 원문 확보용이며 설치용이 아니다.
3. 잠금이 존재하거나 PC HEAD, config.source, 보호 경로, 후보 SHA가 다르면 **STOP**한다. 일치시키려고 기존 데이터를 삭제하거나 설정을 우회하지 않는다.
4. 정규 주기에서 데이터가 수집되는지 및 공개 UI에 반영되는지는 사용자 사후 확인 사항이다. 강제 수집·게시·예약 작업 변경을 요구하거나 수행하지 않는다.

## 코드와 테스트

- `scripts/pc-writer/market-calendar-r22-fed-source-export.mjs`: 무변경 공개 공식 원문 수집·해시·Base64 단일 TXT 구성.
- `tests/market-calendar-r22-fed-source-export.test.mjs`: 월 경계, 원문 바이트 검증, 미래 달력 결측, 비공식 URL 거절 4개 검사.
- `MARKET_CALENDAR_R22_FED_SOURCE_EXPORT.cmd`, `README_R22_FED_SOURCE_EXPORT.txt`: Windows용 실행·사용법.
- `tests/market-calendar-r22-fed-stage.test.mjs`: 파서·수집·기존 일정 공존·월별 실패·월 경계 이력 보존·임대 잠금 7개 검사.
- `tests/market-calendar-r22-fed-apply.test.mjs`: 설치 전용 검사·정확히 2파일 로컬 커밋·기존 락·출처 변경 감지 4개 검사.
- R22 설치는 사용자 PC 결과 로그로 확정한다. 정상 주기 수집 건수와 실제 공개 페이지 노출은 미확인 상태로 유지한다.
