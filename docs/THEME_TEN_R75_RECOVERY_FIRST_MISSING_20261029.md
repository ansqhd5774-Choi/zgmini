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


## R79 후속 — 바이오 R8 이후 R54 단독 재동기화 패키지

- 근거: R78 실제 PC에서 R54 직후 `modelRevision=THEME_LEGACY_NINE_R37_PUBLIC_V1`, 이어진 바이오 R8 갱신 직후 `modelRevision=null`이었다. 이 두 단계의 시계열은 **R37 레코드가 기존 공개 잠정 sidecar와 정확히 일치해야 한다는 가드**와 일관된다. D1 raw readback을 생략한 추론이므로 결론은 재검증 후 확정한다.
- 원 브랜치에 `scripts/pc-writer/THEME_TEN_R79_R54_ONLY_ONCE.cmd`, `scripts/pc-writer/theme-ten-r79-r54-resync.mjs`, `tests/theme-ten-r79-r54-resync.test.mjs` 등록. 별도 배포/개별 테마 추가는 없다.
- 1회용 ZIP `THEME_TEN_R79_R54_ONLY_ONCE_R2_20261030.zip`은 CMD·도우미·한국어 안내 3개 파일. PC의 새 독립 폴더에서 CMD를 1회 실행한다. R79는 기존 **R54만** 호출하고 바이오 R8을 다시 호출하지 않는다.
- 실행 게이트: 한국시간 10:55~14:35 예약 보호, 공개 `READY`·기존 10개 테마, 확정일과 승인 R48 개인 후보 정확히 일치, R54 기존 동의 파일, 개인 수집 lock 없음, PC에 설치된 R78 R51/R37 두 SHA 정확히 일치. 이미 R37 버전이면 D1 쓰지 않고 종료.
- R54 종료 코드 0과 별개로 다시 공개 API `modelRevision=THEME_LEGACY_NINE_R37_PUBLIC_V1` 및 확정일 일치 재확인. 완료 상태도 `NEXT_REGULAR_PENDING`으로 명시하여 정규 실행 검증과 구분한다.
- 우주·위성/데이터센터·전력은 원본 10/27 수집 누락이 먼저이므로 R79에서 **어떤 원자료·전용 계산·D1 게시도 시도하지 않는다**. 전용 Windows 작업 실제 실행 경로·승인 collector 확인 후 별도 최소 복구한다. 다음 정규 실행 로그와 실제 화면 날짜까지 확인하기 전 운영 복구 완료 판정 금지.


## R79 실제 PC 실행 — D1 readback 통과, 공개 Reader 미채택 (2026-10-30 KST)

- 사용자 결과 `THEME_TEN_R79_R54_ONLY_RESULT_27032_29404.txt` (`inspectedAt=2026-10-29T15:50:14.845Z`) 확인. 신규 테마·산식·작업·원본 대체 0. 사전 공개 `READY`, 확정 10/27, 10개, `modelRevision=null`, 27일 R48 후보 일치, 게이트 통과.
- R54 1회 실행 종료 코드 1. 실제 세부 로그 파일명은 `E:\\ZGmini\\data\\pc-writer\\theme-nine-r54\\logs\\THEME_NINE_R54_CYCLE_27035_7384.txt`, 핵심 상태는 `D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH`. **D1 검증은 수행·통과했으나 공개 API 반영은 검증하지 못한 중간 단계**로 기록. R79 helper 자체는 D1 추가 쓰기 0이고 R54 내부에서 승인 D1 게시가 있었다.
- 브라우저 독립 공개 API 재조회에서 기존 `methodologyVersion=ETF_ONLY_T40_R20_V40_PAIR50`, R37 `modelRevision` 없음(즉 `null`). 바이오·신약 27일, 우주·위성/데이터센터·전력 23일. 바이오 27일 잠정 점수 36.25595와 나머지 기존 잠정 26/28일 행 그대로 보존.
- GitHub `main`과 기존 작업 브랜치의 `worker/theme-nine-r37-public.mjs` blob SHA는 모두 `406e3d78008090d4b0093898718dfe2d112d7699`로 동일. **GitHub 파일 불일치는 관측되지 않았지만 실제 production Worker/D1 binding의 정확한 원인까지 증명된 것은 아님**.
- R54는 D1 readback 뒤 `addVerifiedNineR37`로 서버 시뮬레이션하고 공개 API 이력·잠정 scores의 정확한 일치를 한 번 검사한다. 종료 코드 1이 바로 원본 수집 실패라는 의미는 아니다. **R54를 재실행하지 말고 기존 세부 로그 단일 파일** `THEME_NINE_R54_CYCLE_27035_7384.txt`의 `publicDateMatched`, `publicScoresMatched`, `publicProvisionalScoresMatched`, `dbStatus`, `d1Writes`를 확인한다. 비밀 토큰/원본 데이터 없이 상태 필드만 전달하면 된다.
- 원인 분리: (a) 한 번의 검사 시점에서 공개 API 아직 갱신되지 않은 지연, (b) R37 공개 eligibility의 D1/public sidecar 불일치, (c) Worker D1 binding/배포 반영 미일치. 위 로그와 날짜별 공개 readback으로 구분할 것. R37 정확 일치/권리/시간 가드를 임의 완화하거나 기존 정상 7개/두 전용 수집 경로를 변경하지 않는다.
- 기존 우주·위성/데이터센터·전력 PC 10/27 원본 누락은 여전히 별도 복구 과제. 공개 10테마 자동 갱신 및 다음 정규 실행 성공 판정 금지.


## R80 — R79 원인 확정과 동일 날짜 잠정치 CAS 최소 복구 (2026-10-30 KST)

- 사용자 세부 로그 `THEME_NINE_R54_CYCLE_27035_7384.txt`의 `D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH`, `d1Writes=0`, `dbStatus=UNCHANGED`, `publicDateMatched=true`, `publicScoresMatched=false`, `publicProvisionalScoresMatched=true`, `rawFilesShaVerified=245`, `themesValidated=9`를 근거로 확인했다. R79는 성공으로 판정하지 않는다.
- 최초 원인: 승인 기존 `theme-nine-r48-d1-publication.mjs`의 동일 확정 관측일 분기가 `themes`만 같으면 즉시 `UNCHANGED`를 반환했다. 바이오 R8 뒤 공개 기존 잠정 sidecar가 바뀌어도 D1 R37 행의 `provisionalLineage`를 최신 실제 공개 잠정치로 CAS 갱신하지 못했다. 공개 R37의 엄격한 완전 일치 가드가 정상적으로 채택을 거부한 것이다.
- 최소 보수: 같은 관측일에 `themes` 확정 이력과 나머지 불변 기록이 정확히 같고, 기존/신규 모두 `EXISTING_PUBLIC_PROVISIONAL_AS_PUBLISHED`인 경우에만 이미 승인된 공개 잠정치의 정확한 재동기화를 허용한다. `eligibleNineR37`가 먼저 실제 공개 날짜·점수·권리·신선도·테마 구성을 검증하고 기존 CAS 기대 스탬프/본문 조건 및 readback은 유지한다. 확정값·원자료 해시·ETF·산식·권리·로스터 불일치나 동일 잠정치는 각각 STOP/NOOP. 가짜 점수/날짜 없음.
- 기존 작업 브랜치 소스 커밋: 게시기 `acdc16f4b565adde9de7e855b446c84b54edca38` 및 회귀 테스트 `57fcc1e6fdecca38158bfbb04afdc7b4c5c93a5d`. 기존 승인 source SHA `d6391dd2653889e5e72dcac42c0503ef9064d85c714f53be6e8021eada80d1f9` → 수정 SHA `7a10fe41710dbc1a21c9f3e343c538cd96b6c5695b683f04dce48af85ede6e7e`. 관련 회귀 테스트 파일 4개 통과.
- PC 패키지 `THEME_TEN_R80_PATCH_R54_ONCE_20261030.zip` (SHA-256 `fa1612630734d253427a7904518ba835a843de9b798cc5fac5b6259581581fa8`): `THEME_TEN_R80_PATCH_R54_ONCE.cmd`, `theme-ten-r80-rebase-once.mjs`, 정확히 위 SHA 게시기 단일 파일, `README_KO.txt`. 원 브랜치 보조 실행기·CMD·테스트 등록: `6d2b684a8c2c2105f784f3911c365de42a0b6d83`, `6814a053220f42c6abd2dd45f33324bf56aa7512`, `5bf1fb9020cbd936135af49fd4db60df0e763062`.
- 한국시간 10:55~14:35 기존 작업 보호 구간 외에서 Windows PC 새 폴더에 압축을 풀고 CMD **정확히 1회 실행**한다. 설치된 R78 R51·R37 SHA, 공개 READY/10개/확정 10/27, 해당 R48 후보, 기존 동의·잠금·게시기 SHA를 모두 검사한다. 승인 이전 파일을 `.R80_BACKUP`으로 보존, 승인된 R54만 1회 호출. 바이오 R8 재실행·원자료 수집·예약 변경 없음.
- 원래 R54는 D1 기록을 쓴 후에도 공개 캐시 갱신 대기 시 종료 코드 1을 반환할 수 있다. R80은 새 R54 로그/실제 D1 쓰기/공개 R37 revision·확정일·10개를 함께 확인하며, 공개 반영을 확인하더라도 상태를 `R80_PUBLIC_R37_VERIFIED_NEXT_REGULAR_PENDING`으로 기록한다. 실제 사용자 PC 결과 전에는 설치·D1·공개/UI 성공으로 보고하지 않는다.
- **별도 미완료:** 우주·위성 및 데이터센터·전력 10/27·28 전용 원본 수집→계산→D1→공개 차트, 기존 예약 작업의 다음 정규 실행 로그와 재조회. R80은 이 두 경로를 임의로 변경하지 않는다. 10/28 공급자 원본 부재는 사용자 원본 재수집 검증 전까지 보정 금지.


## R80 PC 1회 실행 결과 — 설치 성공, R54 단계 차단 (2026-10-30 KST)

- 사용자 실PC 결과 `THEME_TEN_R80_PATCH_RESULT_31676_10982.txt`: 시작 `2026-10-29T16:13:59.214Z`, 공개 READY·기존 10개·확정 10/27·R37 revision null. R48 dated 후보 일치로 게이트 허용.
- `patch.status=R80_ONE_FILE_INSTALLED_SHA_VERIFIED`, `changed=1`: 기존 R54 PC에 승인된 동일 날짜 잠정치 CAS 수정 파일 **실제 설치 및 SHA 검증 성공**. 작업·산식·신규 테마·원시값 대체 0.
- 같은 실행에서 기존 R54 종료 코드 `1`, 새 실제 로그 `E:\\ZGmini\\data\\pc-writer\\theme-nine-r54\\logs\\THEME_NINE_R54_CYCLE_31692_31956.txt` (`newLogVerified=true`). 해당 로그의 내부 상태는 `STOP_R54_PUBLIC_CONNECTION`, 상세 error는 **R80 요약에 포함되지 않아 아직 불명**. `dbStatus`/D1 write 결과도 미확정이므로 코드 게이트 실패 여부·D1 CAS 실패 여부를 추정으로 확정하지 않는다.
- 공개 after READY·10개·확정 10/27·revision null, 바이오 이력 10/27 및 우주/데이터센터 이력 각 10/23으로 실행 전과 동일. `status=STOP_OR_PENDING_REVIEW_EXISTING_R54_AND_PUBLIC_READBACK`; 운영 복구 및 다음 정규 실행 완료로 선언 금지.
- **다음 최소 조치**: R54 재실행·R80 재설치 금지. 위 기존 `THEME_NINE_R54_CYCLE_31692_31956.txt` 원본을 1개 확보해 내부 `error` 코드를 확인한 뒤 해당 최초 STOP 조건만 검증/수정한다. 데이터·권리·확정값·정상 7개 및 기존 예약 설정 보존.


## R81 — R80 실PC 최초 FAIL 인증 출처 및 기존 7개 승인 경로 재사용 (2026-10-30 KST)

- 실제 R80 세부 로그 `THEME_NINE_R54_CYCLE_31692_31956.txt`: `STOP_R54_PUBLIC_CONNECTION`, `PC_WRANGLER_REAUTH_REQUIRED`, `stage=NO_NEW_D1_WRITE_UNLESS_OUTCOME_UNKNOWN`. R54는 R80 D1 CAS 코드를 실행하기 **전** 인증 출처에서 중단. R80 D1 수정 설치는 성공했으나 D1 재게시·공개 R37 갱신은 확인되지 않았다.
- 이전 정상 바이오 R8 인증 파일 `theme-biotech-seven-auth-r8.mjs` SHA `9b1f952f720abe0d6e631ad8fac908cfd51b00575690e9abea8cd09f1a6a4bd3`는 기존 승인된 원래 7개 테마 `r179-publish-core.mjs` SHA `f9ea0a1bfaf52909b7a434b65ba93887f56660bc979a3cb7e0992597bc9f3b68`의 운영 소스 선택기와 `d1.credential`을 이용한다. 새 키·권한·로그인·7테마 게시기 실행 없이 이 **기존 경로를 인증 함수로만** 재사용한다.
- 기존 `theme-nine-r54-public-connect.mjs`의 구형 R7 Wrangler 인증 조회 대신, `approvedNineR54SevenToken` 비동기 함수를 추가하여 승인 R8 인증 파일의 실제 경로·비심볼릭·SHA를 검증 후 토큰을 **메모리에서만** 기존 동기 D1 query 콜백으로 전달한다. 권리·원본 SHA·공개 Reader 배포·D1 CAS/readback/날짜 게이트는 그대로다. 이전 소스 SHA `195332100e32473c59c4820d8961de2dd7cac978b7f87b782cfa968c737f6b77` → R81 `e65bb10399acc5dc017f5241624a2fa29c82c34b42f4424dbfb3cf04a9c0e55b`, 원래 작업 브랜치 커밋 `95824d67282505152d8f9c1e95e90b6f5fd5cd4d`.
- 사용자 실행용 `THEME_TEN_R81_R54_APPROVED_SEVEN_AUTH_ONCE_20261030.zip` SHA-256 `1ac01fe18682c29af7cfffa0fc7096f00d879fc2d7bf791beacdeb5c1123fdd2`. 포함: R54 수정 파일, 현재 설치된 R80 D1 게시기 파일(검증용), 기존 R80 도우미, R81 일회성 도우미, CMD, README. 기존 R80 D1 게시기 **재설치 없음**.
- 보호 조건: 한국시간 10:55~14:35 실행 금지, 공개 10테마 READY·R48 개인 후보 일치·기존 R54 동의 및 잠금·기존 승인 R51/R37/R80/R54 실행 SHA·R8·원래 7개 core SHA 확인. 인증 자체를 먼저 **읽기 중심으로** 확인하고 실패하면 R54 파일조차 수정하지 않는다. 통과하면 기존 R54 1개만 `.R81_BACKUP` 후 교체, 승인 R54 **1회** 게시, D1/공개 읽기 확인한다. 인증 정보는 출력·저장·전송하지 않는다.
- 관련 테스트 6개 PASS: `tests/theme-nine-r81-approved-seven-auth.test.mjs`, `scripts/pc-writer/theme-ten-r81-seven-auth-once.test.mjs`, R54/R48 D1/R51/R37 관련 테스트. 원래 작업 브랜치에 소스·테스트·CMD·절차 등록.
- **검증 상태: R81 ZIP 준비·테스트·브랜치 등록까지. Windows PC 설치 / 승인 R54 실행 / D1 새 write / 공개 API R37 revision / 실제 UI / 다음 정규 예약 모두 아직 미검증.** 실제 결과 `THEME_TEN_R81_AUTH_RESULT_*.txt` 한 개로 후속 판정한다. 신규 테마·ETF·산식·기존 정상 7개·예약 작업·원본 임의보정 0. 우주·위성/데이터센터·전력 전용 10/27·28 수집 누락은 별도 미완료.


## R81 실PC 결과 및 독립 운영 API readback — 2026-10-30 KST

- 사용자 원본 `THEME_TEN_R81_AUTH_RESULT_1729_24261.txt` (`inspectedAt=2026-10-29T16:28:20.399Z`), `THEME_NINE_R54_CYCLE_1876_16419.txt` 확인. 기존 보호 게이트 허용, 확정 2026-10-27 R48 후보와 공개 날짜 일치.
- 승인된 7개 테마의 기존 자격증명만 메모리에서 확인: `R81_SEVEN_AUTH_MEMORY_ONLY_VERIFIED`, 비밀 기록/출력 0. 기존 R54 파일 1개만 `.R81_BACKUP` 보존하여 설치 및 새 SHA 확인: `R81_R54_ONE_FILE_INSTALLED_SHA_VERIFIED`, `changed=1`. 앞선 R80 D1 수정은 `R80_PATCH_ALREADY_VERIFIED`, `changed=0`.
- 기존 R54 명령 1회 실행 `exit=0`, 상세 `PUBLIC_API_VERIFIED`, D1 `d1Writes=1` 및 `WRITTEN_AND_READBACK_VERIFIED`, 원본 SHA 검증 245건, 테마 검증 9개, 확정 10/27. 기존 공개 잠정치 날짜 10/26·10/28의 값은 복제/보간/재라벨 없이 그대로 검증. `publicDateMatched=true`, `publicScoresMatched=true`, `publicProvisionalScoresMatched=true`, `otherFeedsChanged=false`, `providerCalls=0`.
- 사용자 실행 직후 공개 API는 `READY`, 10개, `modelRevision=THEME_LEGACY_NINE_R37_PUBLIC_V1`, 확정 10/27, `R81_PUBLIC_R37_VERIFIED_NEXT_REGULAR_PENDING`. 바이오·신약 10/27, 우주·위성/데이터센터·전력 각각 10/23 이력 유지.
- 별도 읽기 전용 HTTPS 요청으로 공개 `https://zgmini.kr/api/theme-fear-greed/?r81_verify=20261030T020000` 독립 재확인: `READY`, 10개, 확정 10/27, R37 revision 존재. 방법 식별자 `ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_DATED_ISSUER_AUM_R32`는 기존 `worker/theme-nine-r37-public.mjs`의 `THEME_NINE_R37_METHOD`와 일치한다. 바이오 10/27(점수 34.68369), 우주 10/23(44.65075), 데이터센터 10/23(12.32143). 최신 수치/모델은 운영 readback이며 기존 원시값을 임의로 고친 증거가 아니다.
- **완료한 범위:** R54 인증 + D1 1회 쓰기/readback + 공개 R37 재채택. 변경 신규 테마 0, 산식 0, 예약 0, 원시값 재기입 0.
- **미완료 별도 경로:** 우주·위성 4개 ETF 및 데이터센터·전력 3개 전용 PC 원시매니페스트의 10/23 이후 수집→해당 기존 승인 계산→전용 D1→공개 차트. 먼저 예약 실행의 **실제 승인 PC 경로·실행 로그·공급자 10/27/28 현재 제공 여부**를 읽기 전용으로 추적하고, 원본이 존재하는 날짜만 보수 복구한다. 다음 기존 11:30 수집/13:30 게시 정규 실행 결과도 별도 확보. 그 전 **10개 테마 일괄 매일 갱신 완료를 선언하지 않는다**.


## R82 — 우주·위성/데이터센터·전력 실제 PC 경로 읽기 전용 진단 (2026-10-30 KST)

- R81로 10개 테마 R37 확정일 10/27 및 D1/공개 재채택은 검증 완료했지만 우주·위성/데이터센터·전력 전용 원자료는 10/23에서 정지되어 있다. 해당 두 테마를 모두 완료 처리하지 않는다.
- 기존 `theme-space-satellite-r14-missing-only.mjs`는 수집 종료 상수 `2026-10-23`을 가진 **수동 누락 복구 경로**로, 10/27·28 전용 원자료의 상시 수집을 입증하지 못한다. 기존 우주 예약 실행기가 있는지 먼저 점검한다.
- 데이터센터 R5는 `ZGMINI-PC-Theme-Data-Center-Power` 기존 예약 작업을 사용하며, 실행 폴더 안에 `DATA_CENTER_POWER_R5_SCHEDULED_RESULT.txt` 로그를 남기는 구조다. R76의 Desktop 기본 경로 `NOT_FOUND`는 실제 예약 실행 파일의 중단을 의미하지 않는다. 작업 XML의 Action 경로를 해석해 실제 adjacent 로그와 실행기 SHA를 조사한다.
- R82는 위 두 전용 경로와 기존 R47·R54·바이오 예약 작업의 `schtasks` XML/요약, 경로 존재/파일 SHA, 전용 원자료 manifest 최종 관측일, 상태 checkpoint의 오류 코드만 **읽기 전용**으로 추출한다. 원시 가격·인증·DB 본문 및 전체 PC 작업 목록은 출력하지 않는다. 스크립트 `scripts/pc-writer/theme-ten-r82-optional-runtime-readonly.mjs`, 실행기 `scripts/pc-writer/THEME_TEN_R82_OPTIONAL_RUNTIME_READONLY.cmd`, 안내 `docs/THEME_TEN_R82_OPTIONAL_RUNTIME_READONLY_KO.txt`, 테스트 `tests/theme-ten-r82-optional-runtime-readonly.test.mjs`를 기존 브랜치에 등록했다.
- 사용자가 새 폴더에서 3파일 ZIP 압축 해제 후 CMD **한 번** 실행한다. 반환 `THEME_TEN_R82_DIAG_RESULT_*.txt`를 받아 각 경로의 마지막 PASS/첫 FAIL을 확정한다. 진단기는 공급자 조회·원자료 수집/계산·D1 게시·스케줄 변경 모두 하지 않는다. 다음 정규 11:30/13:30 검증도 별도 단계다.
- `node --test tests/theme-ten-r82-optional-runtime-readonly.test.mjs` PASS, ZIP `unzip -t` PASS, Windows CMD ASCII/CRLF 확인. 패키지 `THEME_TEN_R82_OPTIONAL_RUNTIME_READONLY_20261030.zip` SHA-256 `54ce1c33fe203c8fa4cdfa63045bd2b856de4dbd48d886db315f3b86e72837e5`, Node 파일 SHA-256 `63c60244b916b8bdcc0c30ad1fa182e8046dec8bc7b0121be6c629fbc319bad8`.
- 상태: **R82 코드/테스트/ZIP/브랜치 등록 완료, Windows PC 진단 실행 미실시**. 기존 10개·ETF·R37 산식·승인 SHA·예약·D1/공개 기록 변경 0. PC 로그 없이 전용 수집 복구 완료 주장 금지.
