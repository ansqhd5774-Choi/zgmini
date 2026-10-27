# ZGMINI 시장 캘린더 R20 — Census 공식 일정 확대 및 PC 적용 절차

## 전용 작업 원칙
- 저장소: `ansqhd5774-Choi/zgmini`; 작업 브랜치: `codex/zgmini-gpt-workspace-20261025`. 별도 브랜치 생성·전체 병합 없음.
- R17 BLS 및 R19 BEA 설치 성공 이력을 보존한다. R20은 그 위에 Census 파서 부분만 추가한다.
- 신규 DB/API/수집기/스케줄러/사이트/주기를 만들지 않는다. PC SQLite 원본·게시 원장·6시간 가드·실적 데이터 경로 불변.
- PC 설치 완료, 정규 수집 관측, 공개 페이지 반영은 별도 상태로 보고한다. 현재 R20 단계는 `CODE_READY`이며 PC 설치가 아니다.

## 공식 HTML 실제 조사 (2026-10-27)
- 기존 승인 URL `https://www.census.gov/economic-indicators/calendar-listview-2026.html`: HTTP 200, 실제 HTML 88,192자, `<tr>` 179개.
- 해당 **실제 공식 HTML을 R19 기존 파서와 R20 후보 파서에 직접 입력**하여 비교한 결과:
  - R19 기준 기존 소매판매 `retail` 13건.
  - R20 전체 Census 발표 일정 174건 = 기존 소매판매 13건 + 추가 공식 발표 161건.
  - 기존 소매판매 결과(JSON)가 13건 모두 동일. 동일 `id:date` 중복 0건.
  - 추가 항목: 건설·주택착공, 신규주택판매, 제조업/내구재, 국제무역, 도소매 재고, 기업 설립 등.
- 실데이터를 저장·게시하지 않았고 **로컬에서 공식 페이지를 다운로드하여 파싱·집계한 것**이다. 공개 운영 수집/게시 수량이 아니다.
- 5개 이벤트 필드 `(id,date,title,source,sourceUrl)` 유지. 기존 소매판매 `retail`, 나머지 `census-<title>-<covered-period>` ID. 같은 날 서로 다른 대상 기간도 구분.

## 차년도 URL 주의: 별도 후속 결함으로 기록
- 기존 연도 템플릿 `calendar-listview-2027.html`은 2026-10-27 기준 HTTP 200으로 응답하지만 일정 `<tr>` 0건인 일반 Census 안내 HTML을 반환했다. 이 URL만으로 2027 일정을 정상 수집했다고 표시하면 안 된다.
- 반면 공식 `https://www.census.gov/economic-indicators/calendar-listview.html`에서는 2027 일정 164건을 실제 추출했다(HTML 83,809자, 표 165행).
- 기존 collector `scripts/pc-writer/release-calendar.mjs`는 현재 UTC 연도 하나만 조회한다. 따라서 **2027년 전환 시 연도 템플릿 소프트 실패 위험**이 존재하며 향후/연도 경계 데이터 공급 여부를 별도 개선해야 한다.
- R20 단계에서는 이전 승인 `RELEASE_SOURCES` 주소와 PC collector를 바꾸지 않는다. 차년도 URL 자동 fallback, 복수 연도 조회, 시각/수치 저장은 독립 계약/권리·회귀 검증을 거쳐 추후 구현한다.
- Census 파서는 `<tr>` 없이 안내 페이지만 반환되면 `CALENDAR_EVENTS_EMPTY`를 던져 실패로 구분한다. 기존 collector의 `SOURCE_FAILED` 및 이전 게시본 보존 동작을 유지한다.

## R20 산출물
1. `staging/market-calendar/r20-census/lib/release-calendar.mjs`: 공식 제목·대상 기간별 ID를 추가하고 BLS/BEA/Fed·기존 소매판매 출력을 보존한 **비운영 단계 파일**.
2. `tests/market-calendar-r20-census-stage.test.mjs`: 기존 소스 회귀·중복·ID·UI 연동 계약.
3. `scripts/pc-writer/market-calendar-r20-census-apply.mjs`: R19 승인 PC source 기준 일회 설치기. 기본값은 변경 없는 PREFLIGHT; `--apply`만 실제 설치.
4. `tests/market-calendar-r20-census-apply.test.mjs`: 등록 Core 확인, 단일 파일 로컬 커밋, 원장 보존, 잠금·작업 소스 변경 중단, 실제 Census HTML 행 구조 fixture 검사.
5. `MARKET_CALENDAR_R20_CENSUS_APPLY.cmd`: Windows 사용자 PC 전용 일회 설치. **CMD와 동일 폴더**에 `MARKET_CALENDAR_R20_CENSUS_APPLY_RESULT.txt` 생성.

## R20 적용기 안전조건
- 기존 PC source(`HEAD` 및 config.source): `e4b0624683f29c551df381777dea871d7e3dd266`.
- 기존 R19 파서 SHA256: `9204ab733b45ad3f01a1b8a0754ce8a3f3e3d5feb4245cd01a081a5da838511f`.
- R20 후보 파서 SHA256: `20d6c99cc7621e08c06598e51f4c9dc8a6f945952905351287b46d2c65a1551c`.
- 기존 Core worktree identity: `d0a4b3cb8b95`. 등록 작업 `ZGMINI-PC-Local-Core`의 R38 wrapper→original VBS→기존 Core 경로로 판정.
- 승인 config.source·enabled·collectionTarget 확인, lib/worker/pc writer 보호 경로 dirty 상태 거부.
- 기존 `local-cycle.lock` 독점 생성만 허용; 타 실행 lock을 삭제하거나 우회하지 않음.
- `market-calendar-r20-backups`에 기존 파서·config 백업하고 정확히 `lib/release-calendar.mjs` 하나만 로컬 커밋.
- 커밋의 부모 R19 source와 후보 해시 검증 후 config.source만 새 HEAD로 정렬. 중간 오류 시 커밋 전 복원, 커밋 후 오류는 수동 복구 요구.
- **금지**: 강제 수집·게시, 예약 변경, GitHub push, main 병합, Cloudflare 배포, 새 DB·캐시 덮어쓰기.

## 검증 및 향후 단계
- `node --test tests/market-calendar-r20-census-stage.test.mjs tests/market-calendar-r20-census-apply.test.mjs tests/market-calendar-r19-bea-stage.test.mjs tests/market-calendar-r19-bea-apply.test.mjs` 통과.
- 사용자 PC 결과의 `decision=CENSUS_INSTALLED_IN_EXISTING_PC_SOURCE_NO_FORCED_COLLECTION`과 `phase=INSTALLED`, `newSource` 및 `changedFiles=[lib/release-calendar.mjs]`를 확인하면 **PC 코드 설치**로 분류한다.
- 해당 결과가 나오기 전까지는 `CODE_READY`; 정규 실행·사이트 표시 여부는 별도 판단한다. 기존 6시간 주기를 기다리기 위해 다음 출처 연구를 막지 않는다.
- 차년도 공식 Census URL 경계 처리, Fed 정기·연례 수정 일정, 신규 미국 경제 공식 일정과 기업 실적 공식 사전 일정의 사용권·수집 가능성 조사로 이어간다.
