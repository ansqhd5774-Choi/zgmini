# R75 — 기존 공개 10개 테마 10/27·28 원자료–계산–D1–API 갱신 복구

작성/확인: 2026-10-29 23:24 KST. 원래 작업 브랜치 `codex/theme-fear-greed-integration-20261025`에서 진행. 새 테마 추가 **보류**.

## 현재 독립 관측

- 공개 `https://zgmini.kr/api/theme-fear-greed/?r37verify=20261029T1440`는 `READY`, 공개 10개, `confirmedObservationDate=2026-10-27`, `phase=PROVISIONAL`, `modelRevision=null`, `methodologyVersion=ETF_ONLY_T40_R20_V40_PAIR50`, 데이터 `sourceStoredAt=2026-10-29T05:20:26.017Z`이었다.
- 공개 7개 기본 테마: 이력 마지막 2026-10-27, 잠정 2026-10-28. 바이오·신약, 우주·위성, 데이터센터·전력: 이력 마지막 2026-10-23, 잠정 2026-10-26. 기존 이력/잠정 수치는 수정하지 않았다.
- GetMarketHistory 무료 `stocks/{ticker}/1h?start=2026-10-27&end=2026-10-29&format=jsonl` 직접 GET: SPY 27일 16행, UFO 8, NASA 14, WARP 7, ROKT 10, IBB 13, XBI 14, DTCR 15, GRID 11행. **9개 모두 27일 자료는 있었고 28일은 0행**. `SPY X-Data-Through=2026-10-27T23:59:00Z`.
- 위 9개 원자료 관측은 *공개 공급자의 이용 가능성*이지 PC 기존 원본/manifest 저장 완료 또는 종가 15시간 정합성 완료 증거가 아니다. 28일은 공급자가 아직 공급하지 않아 결측 임의 보정 불가. 공식 [Reference](https://getmarkethistory.com/docs/api/reference), [Reliability](https://getmarkethistory.com/docs/reliability/).
- 기존 PC의 가장 최근 R73 결과와 R74 원인 분석: 완료 조회 종료일 `2026-10-28`을 실제 데이터 `lastVerifiedSpyNYDay=2026-10-27`로 오인해 재조회 0회(`WAIT_WINDOW_ALREADY_CHECKED`)가 발생했다. R74 수집기에서 이 결함을 수정·테스트했으나 **실제 PC 설치는 미검증**. [R74 정본](THEME_NINE_R74_SOURCE_LATE_RECHECK_20261029.md).
- R37 Reader는 공개 확정 기준일과 D1 R37 레코드 관측일을 **정확히 일치**시켜야 한다(`eligibleNineR37`). 10/29 실 API `modelRevision=null`이므로 *현재 R37가 반영되지 않은 결과*는 확인됐지만, **D1 행의 정확한 버전·관측일·권리 게이트 중 첫 실패는 R75 읽기 전용 D1 조회가 필요**하다. 7개 신규 확정일로 D1 기존 R37 행의 기준일이 어긋났을 가능성은 코드로 추론되며 아직 운영 D1로 증명되지 않았다.
- 우주·위성은 별도 D1 `theme-space-satellite-r2`, 데이터센터·전력은 `theme-data-center-power-r1`, 바이오·신약은 `theme-biotech-optional-r2`와 R37 집계 경로가 공존한다. R47의 63개 ETF 원본이 보완되었다는 이유만으로 별도 2개 sidecar의 실게재를 성공이라 하지 않는다. **각 전용 PC 원시매니페스트·후보·D1 행을 별도로 추적**한다.

## 이번 단계에서 확인된 마지막 PASS / 첫 FAIL

| 경로 | 마지막 PASS | 첫 FAIL / 미확정 |
|---|---|---|
| 10/27 원자료 | 공개 공급자 9개 벤치마크·대표 ETF 실제 존재 | PC 원본 SHA/각 27일 보관·계산 여부 미확정 |
| 10/28 원자료 | HTTP 200 공급자 조회 | 28일 전 종목 0행 → `SOURCE_PENDING` (PC·D1에 추정값 쓰기 금지) |
| R47 반복 계산 | R74 소스·fixture 회귀 검증 | PC 승인 SHA 설치 및 해당 정규 실행 미확정 |
| R37 게시·Reader | 공개 10개 READY | 공개 `modelRevision=null`; D1 현행 행·날짜 가드 판별 필요 |
| 세 개 별도 sidecar | 23일 확정·26일 잠정 API 보존 | 27일 개별 PC 결과/D1 확인 전에는 최초 실패 지점 미확정 |
| 실제 화면/정규 일정 | 공개 API 접근 가능 | 27·28일 문제 3개 화면 갱신 및 **다음 정규 11:30/13:30 동작 미확인** |

## R75 PC 1회 실행 패키지

`scripts/pc-writer/` 다섯 파일을 같은 폴더로 묶어 실행한다.

1. `THEME_TEN_R75_RECOVERY_ONCE.cmd` (단일 실행, `RUN` 명시 확인).
2. `theme-ten-r75-install-r74.mjs` — 기존 R47의 알려진 승인 R57/구버전 SHA만 허용, 검증된 R74 SHA로 교체, 기존 파일 `.R75_BACKUP_*` 보존, 실제 lock 및 기존 예약 시간대 차단. **다른 파일/작업은 설치하지 않는다.**
3. `THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd` — 이미 R74 테스트한 개인 PC R47 단일 번들. SHA `2e0fc3e358feff70103d1e9025ce0944132b7b10a2159900f9479b9860550888`.
4. `theme-ten-r75-audit.mjs` — 기존 R48 한 번 실행 뒤 원본 manifest 메타데이터, R47/R48 산출물 날짜, 4개 기존 작업 존재/트리거, 9개 심볼 27·28일 무료 원천 조회, 기존 PC 인증을 이용한 **D1 SELECT만**, 공개 API 10개 마지막 이력/잠정 일자를 요약. 원시 가격·자격증명·D1 body 출력 금지.
5. `THEME_TEN_R75_README_KO.txt`.

R75는 기존 R48을 **한 번** 호출하며 R48 종료 0을 점수/운영 갱신 성공으로 간주하지 않는다. D1/공개 쓰기는 R75에서 하지 않는다. 원래 **13:30 R54**는 승인된 산식·원본·권리·CAS와 readback의 모든 게이트를 통과해야 한다. D1 현행 레코드가 기준일 불일치로 거부될 경우 원자료 계산 후보부터 교정·검산하고 해당 승인 게시기를 재실행해야 하며, Reader의 날짜 가드를 무조건 완화하지 않는다. 이후 **다음 기존 11:30 수집 + 13:30 게시**, 새 D1 readback, 공개 API 및 실제 UI를 독립 검증한다.

## 금지/기다림

- 신규 테마/산식/ETF 명단/예약 작업/배포 트리거 임의 변경 금지.
- 10/28 없는 바를 10/27 복사, 보간, 0 대체, 과거 날짜 재라벨 금지.
- R75 패키지·코드 테스트만으로 **PC 설치 성공·공개 차트 갱신·운영 연결 완료 주장 금지**.
- 실제 PC 접근은 기존 정책상 이 실행 환경에서 불가. 사용자 R75 결과 로그와 다음 정규 운영 시각 로그를 확인하는 후속 게이트가 필요하다.

## R75 실제 PC 결과 수신 — 2026-10-29

- 사용자 결과 2개 중 첫 파일은 헤더 3행만 있어 실행 입증 불가. 두 번째 `THEME_TEN_R75_RECOVERY_RESULT_13585_4266.txt`는 전체 JSON 및 종료 상태가 포함된다.
- PC R74 승인 SHA `2e0fc3e...` 설치 확인(`ALREADY_R74_SHA_VERIFIED`). 기존 R48 비공개 1회 실행 종료 0, R47 9개 테마 확정 2026-10-27, R48 비공개 후보도 2026-10-27. 이 단계는 D1 게시가 아니다.
- 우주·위성: 공개 공급처 UFO·NASA·WARP·ROKT 27일 행 모두 있음. **PC 우주 매니페스트의 4개 ETF는 23일이 마지막**. 첫 누락은 전용 PC 원자료 수집 단계에서 확인. 28일은 공급처 행이 없음.
- 바이오·신약: PC IBB·XBI·SPY 매니페스트가 27일까지 확인. R48 공통 후보는 27일이지만 전용 바이오 계산/게시 성공 증거는 없다. 전용 D1 `theme-biotech-optional-r2`는 23일. 최초 미확인 구간은 전용 계산·게시 단계.
- 데이터센터·전력: 공개 공급처 DTCR·GRID 27일 행 모두 있음. **PC 데이터센터 전용 매니페스트의 SPY·DTCR·GRID는 23일이 마지막**. 첫 누락은 전용 PC 원자료 수집 단계에서 확인.
- D1 읽기 성공: `theme-legacy-nine-r37` 26일, 우주·위성 23일, 바이오·신약 23일, 데이터센터·전력 23일. 27일 R48 후보가 있어도 R37 게시가 26일에 멈췄다. 공개 API의 R37 `modelRevision=null` 및 세 개 23일 이력과 일치한다.
- 4개 Windows 예약 작업 `schtasks /Query /XML`은 모두 존재, `CalendarTrigger` 1개 및 실행 동작이 있다. R75의 단순 `/<Enabled>true<\/Enabled>/` 검사가 전부 `false`를 반환했으나, **XML에서 `<Enabled>` 생략은 명시적 비활성화가 아니므로** 이 값만으로 작업이 실제로 꺼졌다고 단정하지 않는다.
- `SPY` 공급처 실시간 조회는 PC R75에서 1회 `FETCH_OR_PARSE_FAILED`였으나, PC 저장 원본은 27일까지 있고 외부 독립 조회에서도 27일 16행이 확인됐다. 1회 재조회 실패로 27일 원본이 없다고 판정하지 않는다.
- 다음 R76 점검은 **읽기 전용**으로 예약 작업 `<Settings>`·`<CalendarTrigger>`의 명시 상태, R54 게시 동의 파일의 존재 및 최근 로그, 바이오 R8/데이터센터 R2·R5/우주 R14 로컬 로그의 상태 코드만 수집한다. 스케줄 작업·산식·원자료·D1·배포 변경 0. 이 결과를 받은 뒤 기존 3개 전용 경로별 최소 복구를 결정한다.

## R76 실제 PC 결과 및 R77 기존 승인 게시기 1회 재실행

- R76 보고 시각 `2026-10-29T14:51:29.275Z`. 기존 네 개 Windows 작업은 모두 발견, 설정·트리거의 `Enabled` 값은 `UNSPECIFIED`, `Exec` 존재. **비활성화가 확정된 것이 아니며 예약 설정은 수정하지 않는다.**
- R54 승인된 자동 게시기/동의 파일 존재. `2026-10-29T04:30:19.561Z` 로그는 `PUBLIC_API_VERIFIED`. 이는 **27일 R47 비공개 점수 생성 시각인 `07:49:14.691Z`보다 이전 실행**이므로, R54 종료 0을 27일 D1 게시 증거로 재사용할 수 없다.
- 바이오 R8 예약 로그는 `2026-10-29T05:01:14.038Z` `R7_CONFIRMED_STAGE_STOPPED / BIOTECH_R7_PUBLIC_BASE_NOT_READY`. 공개 7개 기본 기록 `sourceStoredAt=05:20:26.017Z`가 이보다 늦어 해당 시점의 베이스 준비 여부가 원인 후보로 강하게 지지된다. R7가 비교하는 `candidate.observationDate <= base.observationDate` 게이트를 낮추지 않는다.
- R54의 28일 과거 로그 중 `D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH`, `MAIN_CLOUDFLARE_PRODUCTION_BUILD_NOT_VERIFIED`도 구분해 보존한다. 29일의 최신 로그는 R54 `PUBLIC_API_VERIFIED`이므로 과거 오류를 현재 오류로 과장하지 않는다.
- 데이터센터 R2/R5와 우주 R14의 일반 Desktop 예상 파일은 `NOT_FOUND`였지만, 실제 예약 실행 파일 위치가 다를 수 있으므로 **예약 실패 확정 증거가 아니다**. 해당 두 테마의 27일 원본 미수집은 R75 manifest로 확인됐다.
- 신규 R77 패키지는 **이미 승인된 R54와 바이오 R8만** 기존 PC 소스로 한 번 실행한다. 실행 직전 현재 공개 기준일과 R48 비공개 후보 관측일의 일치, 기존 동의 파일, 개인 수집 lock, 11:15~14:15(KST) 기존 예약 보호 구간을 검사한다. R54 게시 이후 공개 Reader가 정확히 R37 날짜와 revision을 표시할 때만 기존 바이오 R8을 호출한다. 산식·ETF·예약·다른 원자료·승인 키 변경은 하지 않는다. 실행 자체로 운영 성공을 주장하지 않고 별도 D1/API/readback 검증한다.
- 우주와 데이터센터는 R77에서 실행하지 않는다. 원자료 복구와 해당 전용 게시기가 검증될 때까지 `23일 확정` 유지가 올바르다. 28일 공급자 결측을 27일 복제로 보정하지 않는다.
