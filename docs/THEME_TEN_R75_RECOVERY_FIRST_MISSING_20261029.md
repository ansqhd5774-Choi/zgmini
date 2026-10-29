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

## R77 실PC 결과 — 확정 기준일 진전과 과거 잠정일의 계약 충돌 (2026-10-30 KST)

- 사용자 제공 `THEME_TEN_R77_APPROVED_PUBLISH_RESULT_17343_22146.txt`: `2026-10-29T15:00:51.285Z` R77 실행, 공개 API `READY`·확정 `2026-10-27`·`modelRevision=null`, R48 사적 `2026-10-27` 후보가 있어서 게시 전제는 `allowed=true`였다.
- 기존 승인 R54 실행 `exit=1`, 최초 실제 실패: `STOP_R54_PUBLIC_CONNECTION` / `THEME_NINE_R51_PUBLIC_LEGACY_PROVISIONAL_CONTRACT`. 따라서 이 호출에서 **D1 게시·바이오 R8 실행은 없었고** 공개 세 테마는 23일 확정 상태이다.
- R51과 R37 공개 Reader의 `PUBLIC_LEGACY_AS_IS` 검사에서 첫 잠정일이 반드시 확정 기준일 이상이어야 한다고 잘못 전제했다. 기존 공개 10개 API는 잠정 `10/26`(세 optional 테마)·`10/27`(7 core 테마)를 별도로 보존하며, 7 core 확정일만 `10/27`로 앞서 갈 수 있다. **기존 점수 자체를 복사·보간하거나 날짜를 다시 지정하지 않고**, 기존 공개 `provisional.points`의 날짜·키·숫자에 대한 완전 일치 및 잠정 포인트 자체의 시간순/중복 금지 검증만 유지한다.
- 최소 수정은 R51 `theme-nine-r51-provisional-overlay.mjs` 및 공개 Reader `worker/theme-nine-r37-public.mjs`의 해당 두 검증 조건뿐이다. `R32_DATED` 원점수 경로의 엄격한 날짜 검사, 원자료 SHA·권리·R54/D1 CAS·readback/동의 게이트는 그대로다.
- R78 회귀에서는 **10/27 확정 앵커 + 10/26·27 기존 잠정치** fixture의 R51 개인 staging→R37 eligibility→공개 재사용 및 순서/값 드리프트 거부를 검증했다. 변경 관련 5개 테스트 파일 PASS.
- `tests/theme-nine-r54-bundle.test.mjs`는 R61에서 이미 4개 파일의 승인 소스가 내장된 옛 R54 번들과 달라져 발생한 **기존 실패**다. 본 R78 이전 코드에서도 재현됐고 이번 변경으로 발생한 실패가 아니므로 구형 R54 번들·해당 테스트를 임의 갱신하지 않는다.
- `THEME_TEN_R78_REPAIR_AND_PUBLISH_ONCE.cmd`는 기존 PC 설치본의 R61 SHA 두 개와 R78 파일 SHA를 검증해 `.R78_BACKUP`을 보존·두 파일만 교체한다. 실행 직전 공개 기준일·R48 후보·기존 승인 동의 및 예약 보호시간을 확인하고, 이미 검증한 R77 R54→바이오 R8 절차를 한 번 이어 실행한다. 모르는 설치본 SHA를 덮지 않는다. **클라우드 공개 Reader는 검증된 최소 단일 파일만 main 반영하고 Git 연동 배포를 확인해야 하며**, 설치·커밋·D1·공개 API/화면·다음 정규 실행을 단계별로 따로 보고한다.
- 우주·위성 및 데이터센터·전력 전용 매니페스트의 27일 미수집은 이 R78 계약 수정과 **별개 미완료**. 10/28 실원자료 부재 시 값 조작 금지. 정상 7개·승인 산식·신규 테마·예약 설정 변경 0.


## R78 실제 PC 복구 실행 및 공개 재확인 — 2026-10-30 KST

- 사용자 제공 `THEME_TEN_R78_REPAIR_RESULT_23492_10771.txt`: `R78_PATCHED_R77_EXECUTED`, 기존 PC R51/R37 승인 SHA 두 파일만 교체·검증 `R78_TWO_FILE_SHA_VERIFIED`, 변경 2건. 신규 테마·산식·예약·원본 임의 보정 모두 0.
- 승인 R54 게시 `exit=0`, 최신 세부 로그 `THEME_NINE_R54_CYCLE_23535_19429.txt`에 `PUBLIC_API_VERIFIED`. **R54 직후** 공개 `READY`, 확정 관측일 `2026-10-27`, `modelRevision=THEME_LEGACY_NINE_R37_PUBLIC_V1`. 바이오·신약 이력 마지막 10/27, 우주·위성/데이터센터·전력 10/23.
- 이어진 기존 바이오 R8 `exit=0`, `R8_D1_READBACK_VERIFIED_API_PENDING`, 내부 R7 `PUBLIC_API_VERIFIED`. **R8 후** 공개 `READY`, 확정 10/27, 바이오 10/27, 다만 `modelRevision=null`로 복귀. 실제 공개 화면에서 바이오·신약 점수 36.3(직전 24.9) 및 27일 이력 반영을 확인.
- 독립 공개 API 재조회 결과 잠정 행은 10/26(우주·위성 47.35703, 데이터센터·전력 14.38294), 10/28(기존 정상 7개와 바이오·신약 36.25595)이다. 기존 7개 확정/잠정·원본 점수 보존. **R54 → 바이오 R8 후 잠정 sidecar 변경으로 R37의 정확한 동등성 검증이 깨졌을 가능성**은 강한 코드상 추론이나, 같은 원문인 D1 R37 행·바이오 신규 잠정 행을 다시 읽어 동등성 원인을 확증해야 한다. 임의로 Reader의 보존/동등성 게이트를 완화하지 않는다.
- R75 원본 대조에서 우주·위성 4개(UFO/NASA/WARP/ROKT) 및 데이터센터·전력 3개(DTCR/GRID/SPY) 로컬 전용 원시매니페스트는 10/23에서 멈췄다. 공급자 10/27 행은 당시 존재했고 **최초 누락은 전용 PC 수집**이다. 10/28 행 0개는 10/29 조회 당시 증거이므로 다음 수집 시 신규 공급 여부를 다시 확인한다.
- **남은 일:** (1) 다음 기존 승인 R54 게시가 바이오 후 갱신된 잠정 sidecar를 정확히 읽어 R37 revision을 재게시할 수 있는지 단 한 번 확인, (2) 우주·위성/데이터센터·전력의 기존 승인 PC 전용 수집 경로·권리·원본 SHA 확인 후 27일 이후 실제 수집, (3) 전용 계산→D1 readback→공개 API/차트→다음 정규 실행 확인. 정규 실행까지 완료했다는 주장은 아직 할 수 없음.
- Windows 작업 `Settings.Enabled`와 `CalendarTrigger.Enabled`의 XML 값 `UNSPECIFIED`는 명시적 비활성 상태가 아니다. 변경 금지. 수집·게시 권한과 승인한 기존 ETF·산식 모두 보존.
