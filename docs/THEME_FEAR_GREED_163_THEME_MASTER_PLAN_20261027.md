# ZGMINI 테마별 공포·탐욕 163개 구축 — 최상위 목표·누적 노하우·실행 계획
- 작성일: 2026-10-27 (사용자 확인: 163개 테마를 인기가 높은 순서부터 낮은 순서까지 확대하며, 개발 과정에서 지속 개선·보완)
- 저장소: `ansqhd5774-Choi/zgmini`
- **전용 작업 브랜치: `codex/theme-fear-greed-integration-20261025` (작업자 임의 신규 브랜치 생성·전환 금지)**
- 상태: `PROGRAM_CHARTER_RECORDED / R57_PRIVATE_PC_INSTALLED / R48_R54_INVOKED / CLOUDFLARE_MAIN_BUILD_PASS / R51_DATE_UNALIGNED / R32_D1_NOT_PUBLISHED / NOT_163_THEMES_IMPLEMENTED`
- 효력: **범위·목표·작업 연속성 및 인수인계 규칙을 문서화**한다. 기존 산식·선정·공개·DB·예약 작업·배포 승인 계약을 변경하지 않는다.

## 2026-11-09 사용자 확정: 상위 4단계 우선순위 1 → 4 → 2 → 3

163개 전체 구축에는 장기간이 걸릴 수 있으므로, **기존 공개 콘텐츠를 방치하거나 163개 완성 시점까지 운영 안정화를 유예하지 않는다.** 이전에 보고한 4단계를 다음 순서로 실행한다.

1. **1단계 — 기존 공개 10개 정상화·통합:** 현재 공개 이력과 확정/잠정 정책을 보존하며 승인된 R32 전환, 수집·계산·D1 readback·API/UI 표시를 실제로 완성한다. 오래된 Reader/503을 포함한 실제 공개 차단부터 해결한다.
2. **4단계 — 현재 공개 콘텐츠의 지속 운영 안정화:** 163개 완성을 기다리지 않고 **지금 운영 중인 테마부터** 최신 관측일·결측·확정/잠정·화면을 정상 제공하고, 게시 이후에도 콘텐츠가 유지되도록 한다. 여기서 '전체'는 **그 시점까지 공개 승인된 테마 전체**를 뜻하며, 미구축 163개 전체의 운영 완료를 선행조건으로 삼지 않는다. 미래 자연 예약 갱신의 최종 사후 검증은 관련 기능 작업 완료 뒤 분리한다.
3. **2단계 — 신규 추가를 위한 공통 자동화 완성:** 기존 V2 등록·수집·계산·게시·Reader를 재사용해 다음 승인 테마가 별도 테마별 프로그램/예약 없이 연결되도록 검증한다. 기존 사이트 게시를 이 단계 완료까지 일괄 보류하지 않는다.
4. **3단계 — 인기순 163개 순차 확대:** 인기도 근거와 승인 ETF/원자료·권리를 검증한 테마부터 **기본 한 건씩 즉시 공개·운영에 편입**한다. 추가할 때마다 1·4단계의 공개·안정화 기준을 반복 적용하며 163개 완성 후 일괄 공개하지 않는다.

이 우선순위는 **사용자 확정 163개 최종 목표, 산식·가중치·선정·권리·DB/TTL·배포 승인 계약을 변경하지 않는다.** 아래 S0~S10은 기술 단계와 완료 증거를 보존한 세부 체크리스트이며, S10 운영 안정화를 S9 전체 163개 완료 이후에만 시작한다는 뜻으로 해석하지 않는다.

### 세부 실행 계획 — 증거·담당·완료 기준 (2026-11-09)

아래 `P1 → P4 → P2 → P3`는 **163개 프로그램의 상위 우선순위**다. 기존 [공통 운영 전환 5단계](THEME_SCALE_AND_METHODOLOGY_WORKFLOW.md)의 `T1~T5 (20%→40%→65%→85%→100%)`는 **현재 10개 통합 작업만의 기술 진행률**이다. 20%를 163개 전체 진행률로 보고하지 않는다.

| 세부 ID·담당 | 다음 실제 실행 | 완료 판정에 필요한 증거 | 상태 |
| --- | --- | --- | --- |
| **P1-01 · 테마 원담당** | 기존 공개 10개 ID/표시 순서, R32 연구 교집합 8개, 독립 우주·데이터센터, 공통 R37/R88 물리 feed를 매핑한다. | 10/10 책임·입력/산식/Reader 매핑; 기존 T1 연결 명세 | **DONE — 기존 T1 20% 증거 재사용** |
| **P1-02 · 테마 원담당** | 실제 PC L7/R181 설치 source·최초 실패 코드·저장 GMH 원본 SHA/관측일·R178 rolling 원장/checkpoint 및 D1/API 현상태를 승인된 A급 조회로 확인한다. | 실행 ID, 설치 SHA, LAST PASS/FIRST FAIL, Reader READY 또는 정확한 503·STALE 사유 | **PARTIAL — PC source·원장·공개 STALE 확인, R178 정확 조회 A 부재 확인; 첫 HTTP 실패·원본·R178 저장/D1는 미확인. 동일 A 반복 금지** |
| **P1-03 · 공통 총괄 / 테마 원담당** | 공유 Controller lock은 공통 단일 담당이 소유자·stage·원장·백업을 읽기 전용으로 확인·정규 복구한다. 테마 담당은 복구 후 필요한 Reader 실행만 재개한다. 이미 성공한 R181 B/A 설치를 무조건 반복하지 않는다. | 요청별 terminal JSON/TXT, 설치 소스/복구 증거, 승인 작업 claim 가능 상태 | **Controller #996/#917 `RECOVERY_REQUIRED` 유지 — 공유 설치만 조건부 BLOCKED. 별개 Writer B #1063의 #1087 복구 PASS를 Controller 복구와 혼동 금지; 독립 테마 조회·소스 작업은 계속** |
| **P1-04 · 테마 원담당** | 승인 GMH 확정 원자료의 실존·가격 모드·ETF/SPY 거래일을 검증하고 기존 R181→R178 경로에서 계산·로컬 저장→rolling D1 CAS/write/readback을 수행한다. 기존 seed는 덮어쓰지 않는다. | 원본/계산 SHA, observationDate·storedAt·checkpoint, `theme-etf-only-rolling` 재조회와 공개 Reader READY | P1-02 완료와 승인 운영·공개 권리 확인 후. R178 4개 hard gate 우회 금지 |
| **P1-05 · 테마 원담당** | 확정 R32 8개와 독립 우주(R32 변형)·데이터센터(PAIR50)를 동일 저장 입력으로 shadow 검산한다. 기존 20논리 단계→6물리 키·게시 전 Reader 안전 검사를 재사용한다. | 10개별 승인 버전·252일/가용일·결측·원값 동등/승인된 차이, 게시 전 6키 중복/부분쓰기 방지 | 기존 공통 27/27 + 비공개 8+2 실 L7 validator 연동 13/13 = **40/40 PASS**. 비공개 합성 테스트이며 실제 PC 8+2 운영 검증 0; 만료 seed 공개 복구 아님, 실제 6키/권리·잠정 검산 필요 |
| **P1-06 · 테마 원담당** | 확정/잠정 입력의 출처와 공개 권리를 feed별 판정한다. 무료 MarketParquet EOD 파생 공개는 불허, 무료 익명 GMH의 신규 공개 파생권은 문의 배달 실패로 미확인이다. 로컬 확정치 검산과 신규 공개 권리 판단은 분리한다. | feed별 권리 근거·승인 입력·허용/차단 코드, 기존 최종 유효값 불변 | **PARTIAL — MarketParquet 무료 RIGHTS_BLOCKED, GMH 익명 UNKNOWN; R178 4개 권리·정합 hard gate 미충족. 기존 R37 위험수용 경로를 신규 승인으로 확대 금지** |
| **P1-07 · 테마 원담당** | 필요한 범위만 정규 B manifest·해시·백업으로 설치하고 승인된 owner 6키 중 **권리 충족 feed만** 단일 CAS 게시한다. D1 readback→API→PC/모바일 UI를 확인한다. | owner별 설치 SHA·JSON/TXT, D1 key/sourceVersion/storedAt/관측일, 공개 목표 10/10의 유효/결측 상태·정렬·차트 | 실제 쓰기/공개 미완; 현재 STALE seed로 6키 공통 게시기 안전 중단, R178 권리와 Reader 기준점 선행 |
| **P4-01 · 테마 원담당** | 기존 공개 테마의 안정적인 콘텐츠를 운영 증거가 확보되는 즉시 제공한다. 최신일·확정/잠정·결측/STALE·252일 이력·마지막 차트 점과 모바일/PC 표시를 검증한다. | 공개 10개 목표 대비 실제 상태별 개수, API/UI 같은 날짜·점수, 이전 정상 이력·방법론 보존 | P1 정상화 건부터 **즉시 병행**, 163 전체 대기 금지 |
| **P4-02 · 테마 원담당** | 실제 게시 로그·원장·checkpoint와 이력 갱신, 테마별 실패 격리·복구를 점검하고 신규 출시 때마다 운영 목록에 편입한다. | ID별 성공/대기/차단·첫 실패, 로컬→D1→공개 lineage 일치; 미래 자연 예약 최종 검증은 기능 완료 뒤 후속 | 기존 공개부터 계속 |
| **P2-01 · 테마 원담당** | 기존 10개+새 V2를 공통 등록·실행·Reader 동적 목록으로 연결한다. 공유 6키는 물리 소유자별 1회만 게시하고 테마별 CMD/예약/계산기 복제를 금지한다. | 공개 ID 중복/누락 0, 기존 산식별 버전 분리, 다수 등록 pagination·checkpoint·실패 격리 | 기존 공통 코드 활용, 운영 안정화 뒤 확장 |
| **P2-02 · 테마 원담당** | 저장 자료 기반 shadow→기존 결과 비교→비공개 신규 정의 1건 안전 실증으로 설정형 확장을 검증한다. 필요한 변경만 테스트·승인 설치한다. | 입력 재수집 0, 기존 데이터/공개 10개 무변경, 등록 정의만으로 실제 실행·저장·Reader 발견 가능 | 미완 |
| **P3-01 · 테마 원담당** | 그때 가장 인기 있는 차기 후보 **한 건**을 비교·선정한다. ETF 후보별 3가지 O/X 기준(보유 공개·실수집·운용사 C 이상), 실제 ETF/SPY 자료·기준일별 공식 AUM·권리를 확인한다. | 선정/제외 근거, 공개 승인·권리 SHA, 실제 원자료와 승인 R25/R32 적용 가능성 | P2 공통 경로 실증 후 반복 |
| **P3-02 · 테마 원담당** | 승인 한 건의 수집→로컬 저장→계산·검산→D1 CAS/readback→API/UI를 완료하고 즉시 P4 운영 대상에 추가한다. | 신규 공개 ID 1건+기존 정상 ID 모두 유지, 관측일·결측·이력·PC/모바일 화면 일치 | 한 건씩 163 목표까지 반복 |

**가장 가까운 실제 실행(11/9 재확인):** 이미 완료된 [pc-control #1033](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1033)의 source SHA/세 원장 증거를 재사용한다. **기존 승인 A operation 목록에는 GMH 원본 SHA·관측일, R178 checkpoint 및 D1 `theme-etf-only-rolling/current` 단일 row 메타를 함께 읽는 경로가 없다(원담당 조사 완료)**. 이를 임의 SQL/CMD로 우회하지 않고 비밀값 없는 단일 키/체크포인트 조회 계약만 별도 정규 승인 범위로 제안한다. 공통 총괄은 [#996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/996) 공유 설치 잠금·원장 복구를 단독 담당하고, 이미 main에 병합된 [진단 #1034](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1034)의 실제 승인 설치가 확인된 다음 **R181 읽기 전용 A 1회로 HTTP FIRST FAIL**을 확인한다. 이후 실제 권리·원자료 충족 피드만 수집→계산→로컬 저장→D1/API/UI로 이어간다. 동일 #1033 A·108파일 B 재요청, R178 게시 hard gate 완화, 권리 미확인 신규 게시, #996 잠금 우회 금지.

**11/09 23시 KST 보충:** [pc-control #1087](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1087)의 `WRITER_B_1063_CORE_RECOVERED`/2개 결과 readback은 **고용 Writer B #1063 잠금 복구**만 실증했다. [#996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/996)와 #917 Controller `RECOVERY_REQUIRED`는 별개로 지속되며 PR #1088은 Draft·실PC 미적용, R181 FIRST FAIL 미확보. 본 분리는 신규 PC 실행·공개 Gate 변경이 아니다.

**2026-11-09 R181 신규 호환성 단서(원인 미확정):** GetMarketHistory 공식 [2026-11 API 이전 안내](https://getmarkethistory.com/docs/migrating-2026-11)와 [변경 이력](https://getmarkethistory.com/docs/changelog)에 따라 기존 요청 인수 `symbol/symbols`·`source/sources`는 각각 `ticker/tickers`·`dataset/datasets`로 변경됐고, 구 인수는 HTTP `400/renamed_parameter`, 미지원 인수는 `400/unknown_parameter`가 된다. 다만 R181 실PC 파일 `theme-market-history-r131/marketparquet-r167/r181-primary-cycle.mjs`의 GitHub 정본 경로는 현재 확인되지 않았고, 실제 최초 R181 `HTTP status`·`code`·`request_id`도 미확보다. **이 변경이 R181 STOP 원인이라고 단정하거나 확인 전 수집 URL을 임의 수정하지 않는다.** #996 정규 복구와 진단 #1034의 실제 설치를 확인한 뒤 기존 승인 A로 **제공되는 비식별 HTTP 상태·실패 흐름만** 수거한다. 현재 설치 Controller `badad912...`에는 `safeR181HttpErrorFlow`가 없고, #1034가 병합된 최신 진단 source에도 **R181 URL의 쿼리 파라미터 이름을 반환하는 계약은 없다**. 따라서 기존 A만으로 `symbol/source` 사용 여부까지 확인 가능하다고 가정하지 않는다. 원본 SHA `be0303b1...` 고정 아래 **기존 `theme-l7-runtime-readonly` A의 이름-only 열거 판정(값·URL·토큰·원문 제외)**을 공통 담당과 최소 범위에서 협의·테스트·승인된 정규 설치로 보완한 다음에만 실제 요청 구성과 HTTP status/code를 대조한다. 파라미터 문제가 확인되면 기존 산식·권리·자료 계약·주기 불변의 최소 URL 수정만 승인 source에 적용하고 동일 대상 1회 재검증한다. 기존 다른 GET 수집기 `scripts/pc-writer/theme-optional-collect.mjs`는 경로형 `/api/v1/bars/stocks/{ticker}/1h`를 사용하며, 이 경로형 API는 변경 대상이 아니다.

### 2026-11-10 무료 공급원 14개·NLR 결측 실측 — 운영 복구 아님

- **신규 확인된 범위:** GMH 공식 [미국 주식 종목 카탈로그](https://getmarkethistory.com/api/v1/symbols?dataset=stocks/us&timeframe=1m&limit=20000)에서 총 **15,760개** 목록을 직접 확인했고, 현재 기존 7개 테마에 필요한 ETF 13종 `BOTZ, ROBO, SKYY, CLOU, DRIV, NLR, URA, ITA, SHLD, FINX, ARKF, CIBR, BUG` 및 기준 `SPY`를 **14/14 발견**했다. 종목별 마지막 데이터 날짜는 **2026-11-06~07 UTC**. 이는 **티커·저장 1분 자료 카탈로그 존재 증거**이지 701개의 공통 정규장 종가나 PC 원본·수집 성공 증명이 아니다. [실측 원장 #1009](https://github.com/ansqhd5774-Choi/zgmini/issues/1009#issuecomment-6744604302).
- **정확한 timeframe:** 카탈로그는 `timeframe=1m`로 확인했고 `timeframe=1h` 카탈로그 요청의 `unknown_timeframe`은 **가격 1h 불가 판정이 아니다**. 1분 저장 자료의 1h 리샘플 지원 안내와 *실제 1h 봉 응답·뉴욕 정규장 마지막 봉 검증*을 구분한다. 익명 단일 1h 가격 URL은 브라우저 `ERR_BLOCKED_BY_CLIENT`로 접근이 차단되어 추가 우회·재시도하지 않았다.
- **NLR 최근 갭 분류 정정:** 공식 [NLR 1분 결측 목록](https://getmarkethistory.com/api/v1/stocks/us/NLR/gaps?timeframe=1m)은 전체 기간 `coverage=92.81%` / **174개** 갭이다. 그러나 **2024-01-01 이후 30개**는 토요일 **27개** + 실제 시장 폐장일 **3개**(`2024-11-28`, `2025-01-01`, `2025-01-09`)였다. 마지막 날짜는 [NYSE 공식 특별휴장 공지](https://www.nyse.com/publicdocs/nyse/markets/american-options/rule-interpretations/2025/National_Day_of_Mourning_20250102.pdf)에 부합한다. 따라서 전체 92.81%만으로 **최근 701개 거래 세션이 부족하다**고 판정하지 않는다. 단, 갭 목록이 개별 세션의 **정규장 15시/조기폐장 12시 최종 1h 가격**, 14/14 공통 701일, 분할보정 모드까지 보증하지는 않는다. [실측·정정 원장 #1009](https://github.com/ansqhd5774-Choi/zgmini/issues/1009#issuecomment-6749919676).
- **산식·계약과 권리:** 252점 수학적 warmup **628거래일(125+251+252)**과 기존 `buildPrivateThemeTwoDayCandidate`의 **701일 조건**을 구분하며, 어느 쪽도 실제 14/14 유효 공통일 검증으로 대체하지 않는다. R178 Reader의 `secondarySource=MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED` 하드코딩 및 4개 권리/가격 승인 플래그는 여전히 별개 차단이다. 무료 MarketParquet 공개 불허를 GMH 문자 교체로 숨기지 않는다. **공급원 전환·공개 lineage 계약 변경은 별도 사용자 승인**이 필요하고, 익명 접속만으로 공개 권리·계정 상태를 확정하지 않는다. [공급원 비교 원장 #1009](https://github.com/ansqhd5774-Choi/zgmini/issues/1009#issuecomment-6744486092).
- **현재 공통 장애:** [Controller #917](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/917) 38/38 현행·백업 무결성은 확인됐지만 `RECOVERY_REQUIRED`이며, [Draft #1088](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1088)은 **source 격리 테스트 76/76 PASS, 실제 C급 복구 0회**로 남아 있다. [후속 #996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/996)의 운영 terminal 증거도 미확정. 공통 소유자의 정규 복구 완료 증거 전에는 공유 B 중복 요청이나 R181 정규 A의 불필요한 재실행을 만들지 않는다.
- **다음 한 실행:** #917 단일 담당의 terminal 복구·적용 source SHA를 확인 → 실제 설치된 비식별 R181 A로 **SPY 첫 HTTP status/code 1회** 확보(기존 A에 *쿼리 이름* 출력 계약은 아직 없음) → 기존 PC 저장 원자료·R178 checkpoint·D1 단일키 읽기 경로 확인 → 권리·가격모드 충족된 결과만 승인 게시·API/UI 검증. **T1 20%→20%, 실운영 새 게시 0건, 기존 공개 10개 현재 API 0/10 표시, 자동 예약 추가 0건**. 이 자료 조사는 R181 실PC 오류의 원인 확정 또는 공개 복구가 아니다.

### 2026-11-10 GMH 단독 확정치 비공개 후보 — 기본 비활성, 운영 계약 유지

- **목적·범위:** 기존 공개 10개 정상화를 위한 R178 입력 대안 중 하나를 전용 브랜치에서 **source-only 후보**로 구현했다. [Reader 후보 변경](https://github.com/ansqhd5774-Choi/zgmini/commit/e13e33e108ccb567e5a9be19a78e7d38706f56a1)과 [회귀 테스트 추가](https://github.com/ansqhd5774-Choi/zgmini/commit/2ac4fe68b41e7bf7dacdc8b007c9d585f309b952), 정확히 **2파일**이며 운영 배포·PC 설치·D1 쓰기는 **0건**이다.
- **실제 코드 계약:** `GMH_1H_CONFIRMED_ONLY_R1` 표지가 있는 rolling 결과는 호출자가 `allowGmhOnlyCandidate=true`를 명시할 때만 검증한다. 기존 Reader 호출자는 이 옵션을 전달하지 않으므로 **기본 false·기존 GMH+MarketParquet 계보 유지**다. 허용 후보는 GMH 1시간 확정치, `phase=CONFIRMED`, 잠정점 **0개**, `secondarySource=null`, 기준 SPY/13 ETF, 252일 유효 이력과 불변 seed 해시를 요구한다. 기존 **4개 공개·원천·파생권·가격 정합 플래그가 모두 실제 검증된 true**여야 하며, 미확인 권리를 true로 위조하지 않는다.
- **source-only 테스트 증거:** 기존 7개+신규 2개 **총 9/9 PASS** (Node 격리 인메모리 실행, 실패 0). 후보의 기본 거부/명시적 허용, 공개 반환 score·history 외 비공개 price bar 미노출, 권리·계보·확정/잠정·범위·해시·시각 오류의 안전 거부를 점검했다. 이는 **비공개 합성 테스트**로서 GitHub CI·실제 PC·공개 게시 성공을 의미하지 않는다.
- **아직 미완료:** 운영 GMH 14종은 **티커 카탈로그 14/14 확인**에 그치며, **14/14 공통 정규장 701거래일 가격·가격모드·PC 원자료 저장/재조회·R178 계산·local checkpoint는 미검증**이다. R181의 `HTTP/R181/SPY` FIRST FAIL status/code도 미확정이다. 무료 MarketParquet의 파생 공개 불허 및 익명 GMH 계정·상업적 파생 공개 권리 미확정은 그대로 보존한다. **운영 Reader opt-in, 출처 계약 승인, 배포, D1/API/UI 성공 0건**.
- **다음 필수 실행:** 공통 #917 담당의 실제 복구 증거를 받은 뒤 이미 승인된 비식별 R181 조회로 SPY 첫 HTTP status/code를 **1회 회수**한다. 동시에 가능한 승인 조회로 PC 저장 GMH 원본/정규장 14종 공통 701일, checkpoint 및 D1 1키를 확인한다. 실제 권리·관측·가격모드가 충족되고 별도 출처 계약 변경이 승인될 때만 생산자 연결·Shadow 비교→정규 설치→D1/API/UI 게시로 간다. 예약 작업 신설·반복 자동수집 대기 없음.
- **통합 T1 진행률:** **20% → 20%**, 공개 목표 10개 중 직전 API 정상 **0/10**, 실운영 추가 게시 **0건**. 163개 전체 완료율은 따로 산출한다.

### 2026-11-09 P1-02 실제 PC 증거 — 최종 검증 아님

- **LAST PASS(읽기 전용 조회만):** [#1033 / `results/42597414102-1-seat-3.json`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/42597414102-1-seat-3.json), requestId `pc-c5ff88b8-0e9e-467a-934f-9902f9346234`, job `run-42597414102-1-seat-3`, 완료 `2026-11-09T09:58:36.676Z`(18:58:36 KST), `PASS/L7_RUNTIME_READONLY_INVENTORY`. 이는 **운영 READY와 무관**하며 result의 `operationalReadiness=NOT_ASSERTED`를 따른다.
- **실제 설치 파일:** `r181-primary-cycle.mjs` SHA256 `be0303b112d6f4471137aa134bf98f696a8a8dfe60d1d13502646c5e0b509d62`; `r179-publish-core.mjs` SHA256 `f9ea0a1bfaf52909b7a434b65ba93887f56660bc979a3cb7e0992597bc9f3b68`; `r171-publish.mjs` SHA256 `d6b921acd2b935360a4f1df2ce7329b4fdde0d999dddd5ee3f7f6169c9046ba8`. Controller 실행 SHA `badad9124157879d7a645b64f2768113d632355b`; A 요청의 기능 소스는 `zgmini/main@42817df04b160ad5012e1c2f171aca918491dfba`로 **이 작업 브랜치 HEAD와 다름**.
- **운영 FIRST FAIL(정확 코드 미확인):** `R181_PRIMARY_LAST_RUN.json`는 `STOP`, 갱신 `2026-11-09T05:00:11.212Z`(14:00:11 KST). 안전 신호는 `HTTP/R181/SPY`이나 `safeHttpFailure=null` 및 `firstFail=null`이므로 HTTP 상태 코드나 원인 확정 **불가**. `R179`은 `PUBLIC_API_ROLLING_MISMATCH`(2026-10-28 관측일), `R183`은 `PUBLISHER_CHILD_FAILED_REVIEW`.
- **공개 API 현재 관측:** 2026-11-09 실제 브라우저에서 `https://zgmini.kr/api/theme-fear-greed`를 다시 열어 본문 `{"status":"UNAVAILABLE","reason":"STORED_DATA_STALE","themes":[]}` 확인. 이것은 **실제 현시점 공개 차단**이며 D1의 물리 키/로컬 R178 저장 원인까지 입증한 것은 아니다. 응답 상태 숫자(HTTP 503)는 이 관측에서 별도 확정하지 않음.
- **미증명:** 이 A는 고정 소스·원장·예약 XML 구조만 검사하며 `sqliteOpened=false`, `providerCalls=0`, `d1Writes=0`, `operationalWrites=0`. GMH 원본의 실제 자료·원본 SHA·R178 rolling checkpoint·D1 readback·공개 Reader 최신성 **검증하지 못했다**. [#675 Shadow 10/10 확정·0/10 잠정](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/675)은 당시 공개 가능성 스냅샷이지 저장 증명이 아니다.
- **후속 순서:** ① 권한 내 R178 읽기 경로 확인 및 공개 API 최신 상태 확인 → ② 공통 #896 첫 실패 안전 분류 결과 수신 → ③ R181 실데이터·R178 로컬 저장 검증 → ④ 권리 충족 feed만 승인된 CAS D1 게시·API/UI readback. 공개 Reader 503이면 쓰기 선행검사를 우회하지 않는다.
- **진행률:** 통합 T1 **20% → 20%**, 실데이터 게시 증가 **0건**. 163개 전체 달성률은 운영 검증 완료 신규/전체 ID 수를 미확인했으므로 산출 보류한다. 예약 미래 자연 갱신 검증은 완료 후 후속이다.

**운영·권리 경계:** 2026-11-08 공개 `503/STORED_DATA_STALE`, Shadow 확정 10/10·잠정 0/10은 당시 스냅샷이다. **현재 Reader가 READY인지 먼저 확인**한다. `readPublic`이 503/UNAVAILABLE이면 승인 6키 게시를 시작하지 않는다. 공급자가 승인하지 않은 잠정값·가짜 최신일·0 대체·가격 모드 혼합·데이터센터 미승인 R32 적용·미공개 AI·반도체의 자동 출시를 금지한다.

**진행률 관리:** ① 현재 운영 통합 `T1~T5`는 마지막 유효 20%에서 실증 단계 도달 시에만 40/65/85/100%로 상향한다. ② 프로그램 163개는 `실제 게시·운영 검증 완료 ID 수 / 163`을 별도로 산출하며, 과거 공개 이름 10개만으로 완료 10/163을 확정하지 않는다. ③ 공개 목표 10개와 실제 API 정상/결측/권리차단 개수, 승인 신규 출시 수를 각 보고마다 별도 기록한다. 문서 수정·소스 PASS만으로 운영 진행률을 올리지 않는다.

### 2026-11-09 P1-02 추가 분석 — 공개 STALE의 분기와 실제 승인 조회 범위

1. **Reader 소스 교차 확인:** `worker/theme-etf-only-public.mjs`가 최신 `main` 및 전용 브랜치에서 같은 blob `bb3f56c5f3a62b7dfa4aae19a1b18381611e6335`이다. 해당 코드의 `readThemeEtfOnly`는 기존 `market_public_snapshots_v1`의 `public:theme-etf-only:r1` row를 읽고 `validateThemeEtfOnlyPublic(record)`에 통과한 다음, 사용 가능한 R178 rolling 값이 없고 기본 기록의 날짜/저장 시각 제한이 걸릴 때 `STORED_DATA_STALE`를 반환한다. **실제 배포 SHA는 이번에 별도 검증하지 않았으므로 사이트 응답의 원인 분류는 현재 공개 소스와 응답 일치에 기초한 추론**이다. D1 레코드 전체가 비었다거나 GMH 계정이 차단됐다고 단정하지 않는다.
2. **만료 기준은 8일:** `worker/public-display-freshness.mjs`의 `PUBLIC_DISPLAY_MAX_AGE_MS=8*86400000`; 이 TTL 및 원본·가중치·권리 계약을 임의 확대하거나 오래된 값을 최신으로 표시하지 않는다. 기존 `STORED_DATA_STALE`는 화면 로직 완성이나 단순 UI 오류의 증거가 아니라, **승인된 새로운 저장 결과 확보가 필요한 공개 차단**이다.
3. **R178의 검사 대상:** `worker/theme-etf-rolling-public.mjs`가 D1 `public_feed_snapshots_v1`에서 `kind=output`, `feed_key=theme-etf-only-rolling`, `snapshot_key=current`를 조회하고 권리·252거래일 이력·관측일·시간·baseHash를 검증한다. 해당 특정 row의 존재·만료·검증 탈락 여부는 현재 공개 응답만으로 특정되지 않는다.
4. **승인 A 목록 실제 조사:** `zgmini-pc-control/main/config/operations.json`에 있는 `theme-l7-runtime-readonly`는 세 파일/원장/예약 XML만, `source-inventory-runtime-readonly`는 SQLite 전체 current-output 집계만 조회한다. `r54-sixfile-inventory-readonly`는 파일 inventory, `writer-publication-evidence-readonly`는 별도 ER1, `theme-platform-shadow-readonly`는 공개 shadow만 수행한다. **R178 원본 SHA·관측일·rolling checkpoint·D1 정확한 1키 readback을 검증하는 설치된 A급은 확인되지 않았다.** 이미 완료한 #1033 재요청은 해당 공백을 메우지 못한다.
5. **공통 진단 source와 PC Runtime 분리:** [공통 PR #1034](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1034)는 R181 오류흐름의 안전한 정적 진단 소스 병합 단계에 도달했지만, **실제 PC #1033 Controller SHA `badad9124157879d7a645b64f2768113d632355b`에는 아직 미적용**. 공유 설치 [#996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/996)은 2026-11-09 11:53 UTC 읽기 원장 기준 `STATE_UNKNOWN`, `installLock.held=true`, `recoveryRequired=true`, 소유 요청 미확정. 이 상태는 **공유 설치에만 영향**이며 독립 소스 조사·Reader 조회의 신규 전면 중단 사유가 아니다.
6. **최소 다음 실행:** 테마 원담당은 별도 기능용 승인 범위를 문서화해 고정 R178 1키의 `exists/metadataHash/observationDate/sourceStoredAt/checkpoint/failureCode`만 마스킹해 회수하는 **읽기 전용 경로**를 준비한다(키·전체 원자료 유출, provider/D1 쓰기 0). 공통 총괄만 공유 #996의 소유·원장·백업을 검토해 승인 설치를 조정한다. 원담당은 그 결과와 [#896](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/896)의 R181 실제 FIRST FAIL을 받은 뒤 **기존 수집→저장→계산→D1 readback→API/UI**를 재개한다. 잠정치 공개 권리는 별도 확인하며 권리 미증명 값은 게시하지 않는다.

**P1-06 독립 권리 대조(11/9):** [`zgmini/main/docs/API_SOURCE_RIGHTS_REGISTRY.md`](https://github.com/ansqhd5774-Choi/zgmini/blob/main/docs/API_SOURCE_RIGHTS_REGISTRY.md)에서 MarketParquet 무료 ETF/stock daily 샘플의 비복원성 파생점수 공개는 11/05·11/08 **사람 담당자 불허 확정**이다. GetMarketHistory 무료 익명 1h 샘플 공개 권리 문의는 10/22 발송 후 10/25 최종 **배달 실패**, 답변/라이선스가 없으며 기존 게시 코드의 `publicationAuthorized`, `licensingRiskAcceptedByPublisher` 등 값은 제3자 허가와 구분한다. 새 공급원 호출, 유료 구매, 권한 재문의, 새 점수 게시를 임의 진행하지 않는다. 이미 존재하는 공개 이력의 삭제도 지시되지 않았으며, 로컬 자료 수집·비공개 검산은 공개 라이선스 판정과 별도 경로로 계속 검토한다. **확정 원가격 신규 공개 권리 확보 여부는 아직 미검증**이다.

**2026-11-09 GMH 최신 공식 약관 교차 점검(읽기 전용·재문의 없음):** [2026-10-29 발효 GetMarketHistory 약관](https://getmarkethistory.com/docs/terms) §1은 계정 없는 무료 시간봉 샘플을, §5는 원본 봉 시계열을 대량 복원할 수 없는 파생 신호·지표·차트 배포를 기술하고, §6은 무료 샘플도 같은 약관의 적용 대상이라고 명시한다. 단, §5의 **`while your account is in good standing`** 조건을 **계정 없는 익명 호출**에 어떻게 적용하는지, 제3자 가격 데이터 및 정확한 외부 공개 범위가 모두 확정된 것은 아니다. 10/22 기존 문의는 배달 실패이며 이번에는 새 문의를 발송하지 않았다. 공식 공개 지원 주소 `support@getmarkethistory.com`은 추후 정규 문의 경로 후보일 뿐 실제 권한 허가가 아니다. **MarketParquet 무료 자료의 11/08 명시적 공개 불허는 유지**되며, 현 R178 구현의 GMH+MarketParquet 출처 계보·4개 true 필수조건은 변경하지 않았다. GMH만으로 현 R178을 게시할 수 있다고 가정하지 않고, 실제 원본/권리 및 필요한 데이터 계약 변경의 승인 전에는 신규 D1 게시 0건을 유지한다.

**진행률 판정:** 이번 진단으로 실패 분기는 좁아졌지만 저장·게시·최신화가 회복된 증거가 없어 **T1 20% → 20%**. 공개 목표 10개, 현재 테마 응답 0개(11/9 API 본문 기준), 신규 출시 0개. 미래 예약 자동 갱신 검증은 후속 단계 유지.

### 2026-11-09 P1-05 비공개 확정 8+2 Reader 실모듈 검증 — 공개 미연결

- **변경 범위:** 전용 브랜치에만 `worker/theme-ten-confirmed-seed-reference-shadow.mjs`와 `tests/theme-ten-confirmed-seed-reference-shadow.test.mjs`를 추가. `readThemeEtfOnly`/현행 R178/6키 Writer/공개 API/DB/TTL·산식·배포·PC 운영 source는 **변경 0건**. 최초 소스 커밋 `b11ac3cb7a85aadb910fda98851628e2ba390f66`, 테스트 커밋 `cb92e7bd5a3c10a07e58b1fef3344900a9f7166c`; 실제 L7 validator 직접 연결 `de3a2e29ef87b5c661c3cde5e4f92d8796123b0c`, 통합 검증 및 R1 fallback 테스트 `7f1dce5c84e82447199fcd67d2da540f81cb4590`. GitHub 전용 브랜치만 변경, 실 PC/배포 불변.
- **검증 방식:** 기존 저장된 7테마 seed는 **실제 `validateThemeEtfOnlyPublic` 정본을 직접 import하여 계약·권리 플래그까지 검사한 과거 구조 참조**로만 사용하며, 오래된 seed의 점수·관측일을 공개 후보로 재사용하지 않는다. 실제 `eligibleNineR37`의 `independentAnchor`로 신규 R37 확정 9테마를 검증하고 AI·반도체를 제외한 공개 승인 8개만 지정된 순서로 구성한다. 데이터센터/우주는 **실제 기존** `addVerifiedDcPower`/`addVerifiedSpaceSatellite`(R2 우선, R1 fallback) 검증과 252일 부분 이력·240일 겹침·`delayed` 동작을 재사용한다. R88 및 잠정 피드 합성·게시 금지.
- **검증 결과:** 실제 source 모듈 연동 신규 비공개 테스트 **13/13 PASS** + 기존 물리 게시 안전 테스트 **27/27 PASS** = **40/40 PASS, 실패 0**. 생략 데이터/권리/AUM/날짜/마지막 점/AI 제외/우주 부분 null/데이터센터 null 거부/지연 관측일 및 R2 누락 시 R1 fallback을 분기 검증했다. 실제 L7 승인 7테마/252일 fixture와 권리·버전·ETF 순서·이력·관측일·최종 점수·저장 시각 변조 거부도 검증했다. 외부 provider 호출 0, D1 쓰기 0, Scheduler 변경 0.
- **엄격한 한계:** 이 모듈은 **비공개 독립 R178-rolling 무관 shadow**이지 공개 Reader 대체·10/10 현장 실증이 아니다. 기존의 구조상 유효한 과거 7테마 seed 레코드가 반드시 존재해야 하며, 없거나 validator 실패 시 중단한다(완전 seed-free 아님). 테스트 전용 임의 seed 검증 콜백은 제거하고 기존 `validateThemeEtfOnlyPublic` 정본을 직접 연결했다. 그러나 PC 저장 R37·DC·우주 최신성·권리의 **실운영 증거는 미확보**다. `PUBLIC_READY`가 아닌 `PRIVATE_CONFIRMED_SHADOW_VALIDATED_NOT_PUBLIC_READY`만 반환한다. MarketParquet 무료 게시 불허와 GMH 익명 권리 미확인은 기존 그대로이며 새 원장/공개값은 없음.
- **다음 실행:** **기능 원담당**의 L7 직접 검증·40/40 소스 회귀는 완료됐으며, 다음에는 **공통 단일 담당**의 #996 승인 복구 후 기존 R181 FIRST FAIL 및 저장 1키 조회로 실제 8+2 데이터 존재·권리 여부를 판단한다. 현행 운영 Reader/DB/공개 계약 변경에는 별도 승인 필요. T1 **20%→20%**, 공개 테마 0/10(직전 실조회), 신규 운영 완료 0, 163개 최종 프로그램 완성률 판정 보류.

### 2026-11-09 P1-02/P1-06 독립 감사를 통한 실제 진입 조건 확정

- **공통 설치(운영 실증, 11/9 11:53 UTC):** [pc-control #996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/996) 실제 Controller SHA `badad9124157879d7a645b64f2768113d632355b`, `installLock.held=true`/ownerPid `38632`, `recoveryRequired=true`, `REQUEST_LEDGER_UNAVAILABLE`, `STATE_UNKNOWN`; 영향 범위 `SHARED_INSTALL_ONLY`. Receiver LISTENING, Runner 6개 idle이므로 전체 PC와 독립 조회가 중단된 상태로 확대하지 않는다. PR #1034 source 테스트 21/21 PASS·main 병합이 실PC 설치 완료라는 뜻은 아니다. 공통 담당의 소유자·원장 확인/승인 복구를 기다리되, 기능 브랜치 독립 업무를 진행한다.
- **R178 안전 Reader(전용 브랜치 blob `b755a2d05a92de672cb1dc2b5da483b96b2a3849`):** `publicationAuthorized`, `upstreamCommercialRightsVerified`, `derivedLicenseVerified`, `sourcePriceReconciled` **4개가 모두 true**여야 하며 출처 계보에 GMH 1h와 MarketParquet split-adjusted 일봉을 명시한다. [권리 정본](https://github.com/ansqhd5774-Choi/zgmini/blob/main/docs/API_SOURCE_RIGHTS_REGISTRY.md)은 MarketParquet **무료** 파생 게시 불허 확정, GMH **익명** 공개 권리 불명(문의 배달 실패). `READY` 플래그를 임의로 참으로 만들거나 출처·가격모드를 뒤바꿔 우회할 수 없다. 이 권리 문제는 R181 HTTP 오류를 고쳐도 **별도 신규 공개 Gate**로 남는다.
- **R37/R54 구분:** R37은 내부 `licensingRiskAcceptedByPublisher`와 미확인 flag를 있는 그대로 남기는 별도의 기존 위험수용 기술 경로가 있으나, 공급자 라이선스 허가를 의미하지 않으며 **R178 또는 새 테마 전체에 자동 확장되지 않는다**. 기존 공개 이력·사용자 승인된 잠정치는 임의 삭제하지 않는다. 실제 해당 게시 범위의 사용자가 수용한 위험·출처·원자료 재현성을 먼저 확인한다.
- **정밀 저장 조회 공백:** PC A `theme-l7-runtime-readonly`는 R181/R179/R183, `source-inventory-runtime-readonly`는 키 **총계**만 읽고, R178의 특정 key/body 판정·GMH 원본 SHA/관측일·local checkpoint 재조회는 지원하지 않는다. 다음 기능 담당 source 작업은 **1키·해시·날짜·storedAt·고정 fail enum만 회수하는 최소 읽기 전용 A 계약** 설계/승인 범위 제시다. 통합 T1 **20%→20%**, 신규 D1 게시 0, API 응답 themes=[](11/9 관측), 163개 실운영 달성률은 증거 부족으로 보류한다.

### 2026-11-09 P1-05/P1-07 공개 Reader 의존성 감사 — 기존 10개 우선 복구 판단

- **관측된 현상과 코드상 원인 분리:** 현 공개 응답 `503/STORED_DATA_STALE`은 seed가 없다는 증명이 아니다. 작업 브랜치와 main에 공통인 `worker/theme-etf-only-public.mjs` blob `bb3f56c5f3a62b7dfa4aae19a1b18381611e6335` 92–114행은 seed 검증 후 유효 R178 rolling을 사용할 수 없고 seed 기준 시점이 8일을 넘으면 **R37·바이오·우주·데이터센터·R88 sidecar를 읽기 전에** 503과 `themes:[]`를 반환한다(운영 배포 SHA 동일성 미확정, 현재 응답/소스 대조 추론).
- **기존 게시 독립성의 한계:** `worker/theme-nine-r37-public.mjs` feature blob `797c25c2359b387721c16505c75fb04fbe1cf4e9`는 base `READY` 및 기존 공개 테마명 목록이 있어야 해당 항목만 교체한다. R88은 R37 modelRevision 이후에만 작동한다. R37 8개와 기존 별도 우주·데이터센터 2개를 D1에 따로 갱신하더라도 **현 공개 GET을 독립 정상화할 수 없다**. R37 위험수용 플래그는 R178 무료 MarketParquet 권리의 대체 증빙이 아니다.
- **게시기 안전 의도:** feature `scripts/pc-writer/theme-platform-public-cycle.mjs` blob `be8d2bd37d34fc5410a45b28e6e2887d468e6669` 109–126행은 `readPublic()`가 `READY`가 아니면 6개 공용 D1 feed에 **쓰기 0건**으로 중단한다. 기존 `tests/theme-platform-public-cycle.test.mjs` blob `dfecbc91849b4ac4021fa548870c22152113ef705`에 STALE 거부 검증이 있다. 이 가드만 제거하면 일부 D1 쓰기 후 사이트는 계속 빈 상태일 수 있으므로 우회하지 않는다.
- **최소 복구 선택지와 실효성:** (A) 공급원 이용권·동일 가격모드·저장 근거가 충족된 R178 최신 결과로 현 seed/rolling 경로를 복구한다. 이는 기존 API 계약을 유지하지만 R181 실제 수집 및 R178 권리 검증이 남는다. (B) (A)의 권리·자료 확보가 불가능한 경우, **기존 승인된 10개 물리 결과만** 별도 독립 anchor로 검증하여 읽는 Reader 대안을 설계한다. 다만 현재 R37은 기존 공개 base의 *기존 이름만* 치환하므로 **R37 8개 + 별도 2개를 조합하는 단순 연결만으로는 10개 공개 Reader를 구성할 수 없다**. B는 ① 10개 실제 D1 유효 결과 존재/권리, ② 252일 이력·sourceVersion/관측일/확정·잠정 동등성, ③ 10/10 고정 로스터 및 예외 상태 구분, ④ 503/부분 저장/중복 키 회귀 시뮬레이션, ⑤ 기존 API 계약 변경 시 사용자 명시 승인이 모두 필요하다. 이 증거 없는 새 코드/배포는 실시하지 않는다. 오래된 점수를 최신으로 재표기하거나 보조 R37로 허위 READY를 만들지 않는다.
- **실행 순서 보정:** 공통 #996의 실제 복구와 이미 병합된 #1034 Windows 적용 후 R181 최초 HTTP 실패 1회 회수, 자료/권리 충족 여부를 판단한다. 그 증거가 없으면 R178 D1 1키 진단 확장·6키 게시·새 B 설치를 무조건 선행하지 않는다. 독립 Reader 대안은 권리·계약 범위를 먼저 명확히 하고 source-only 검증할 수 있다. 기능 통합 T1 **20%→20%**, 운영 신규 테마 0, D1/API 게시 성공 0.

### 2026-11-09 P1-05 독립 Reader 구조 실험 — 합성 자료에 한정

- **테스트 소스:** [전용 브랜치 `tests/theme-independent-anchor-feasibility-spike.test.mjs`](https://github.com/ansqhd5774-Choi/zgmini/blob/codex/theme-fear-greed-integration-20261025/tests/theme-independent-anchor-feasibility-spike.test.mjs), blob `8be7bc432d20b57b41774a120eb18c3be06a2b68`, 저장 commit `e87d0cc00411375b404eec83c00a019acf15807c`. Node `--test` **9/9 PASS, 0 FAIL**, 원격 readback 바이트 동등 확인. 이는 실제 Reader 구현·배포가 아니라 **비공개 test-only 구조 가능성 실험**이다.
- **시험 범위:** R37의 기존 공개 8개에서 미공개 AI·반도체 제외, 독립 데이터센터 1개와 우주 1개 합쳐 기존 표시 순서 **합성 10/10** 구성 가능. 독립 feed 누락, 중복, 252개 날짜/점수 오류, 원봉 필드 혼입, 8일 보존기간 초과, 서로 다른 가족별 관측일에서 **안전 거절** 확인. 서로 다른 관측일은 임의 동기화하지 않고 API 계약 검토 상태로 분리한다. `d1Writes=0`, `providerCalls=0`, 공개 권리 `NOT_EVALUATED`, 반환 status는 `PRIVATE_STRUCTURAL_SPIKE_PASS_NOT_PUBLIC_READY`이다.
- **절대 미증명:** 실제 PC 원자료·D1 6개 물리 key의 유효 row, 기존 R37/R88/DC/우주 생산 validator 동등성, SPY 거래일·AUM·원가격모드, 공식 권리·게시자 승인, 현재 공개 API/UI. 신규 확정/잠정 게시나 10개 실제 복구를 **9/9 PASS로 주장 금지**.
- **다음 실제 행동:** 공통 #996 잠금 복구 및 #1034 안전 진단 설치 → R181 FIRST FAIL 확인과 승인 원자료 회수 → R178 권리/실데이터 확보 판단. A 경로가 불가능하고 기존 승인 D1 결과가 증명될 때만 독립 Reader B의 명시적 API 계약/권리 승인 요청 및 실자료 기반 별도 시뮬레이션으로 진입한다. 지금은 운영 Reader 코드를 변경하지 않는다. 기술 통합 진행률 **20%→20%**.

## 2026-10-29 사용자 확정: 다음 작업 고정 및 잠정치 정의 불변

- **현재 목표 한정:** 10번째 우주·위성에서 이미 승인·검증한 R32 산식, 기존 9개 연구 테마(공개 8개 교집합)를 기존 확정치·잠정치 자동 갱신/배포 경로에 연결하고 실제 Cloudflare D1·공개 API까지 게시한다. 완료 판정은 실D1 readback 및 공개 API/UI 검증이다.
- **잠정치 의미 변경 금지:** 공개 2026-10-27 잠정치는 이미 존재하며 정상 운영 중이라는 사용자 증거를 보존한다. R51의 `WAIT_R48_ALIGNED_SNAPSHOTS`는 신규 R32 후보 자료 부재 신호이지 잠정치의 정의 또는 기존 점수의 유효성 부정이 아니다. 사용자가 거부한 '26일 확정만 게시, 27일 잠정치 미제공' 제안은 **철회**, 재제안하지 않는다.
- **즉시 다음 실행:** 기존 우주·위성/기존 공개 잠정치 생성·게시 코드와 R51 연결점을 대조 → 기존 승인 점수 후보의 최소 경로 연결 수정 → R54 D1 CAS/write/readback → 실제 공개 R37 8개 전환·10개 보존 확인. 이 순서를 신규 API 실험·산식 연구·설치/예약 반복보다 우선한다.
- **범위 고정:** GetMarketHistory 승인 가격 기준·R25/R32 산식·ETF 63/64·252일 이력·날짜/표시 계약·운영 브랜치 유지. R58 Alpaca IEX 비교 불일치는 기록만 보존하며 신규 공급원으로 전환하거나 확정/잠정 점수를 혼합하지 않는다. 인증·권리/원시값 부재 시 사실대로 첫 실패 Gate만 보고한다.
- **기준 브랜치:** `codex/theme-fear-greed-integration-20261025`. 임의 브랜치 전환·새 프로젝트 생성·main 전체 병합 금지. [최신 실행 정본](THEME_NINE_LIVE_ARCHITECTURE.md).

## 2026-10-29 최신 운영 아키텍처·API·배포 인수인계 (이전 R45~R48 상태보다 우선)

**반드시 먼저 읽을 정본:** [기존 9개 R32 실제 API·원가격·확정/잠정·D1 게시 구조](THEME_NINE_LIVE_ARCHITECTURE.md). 기존 아래 R39~R48 표·서술은 해당 시점의 이력 증거이며 현 운영 상태와 미완료 항목은 이 최신 구조도 및 최신 PC 실행 로그로 판단한다.

- **확정 산식 유지:** 연구 9개(고유 ETF 63/편입 64), 공개 교집합 8개. 우주·위성 등 기존 공개 10개와 미공개 AI 구분. R32 9×252·R33 8×252 실증 및 기존 R25/R32/공식 AUM 규칙을 다시 만들지 않는다.
- **API 사용 현황:** R32 ETF 1h 가격의 **실제 활성 외부 수집원은 GetMarketHistory 한 곳**. MarketParquet EOD는 기존 원자료 R45 재사용·R46 후보 경로로서 **현재 R32 가격 산식 미연결**. 공개 사이트 날짜 조회(ZGMINI 자체 API), 운영 빌드 검증(GitHub API), 파생 점수 게시(Cloudflare D1 API)는 가격 공급원이 아니다.
- **실PC 배치:** R57 승인 R47 교체 및 백업 성공(SHA256 `5a2149556ab4ebc255ea54a14501d1511a906a2904252cad938f9de0b730a24c`). R55의 R48/R54 호출은 완료됐지만, R51 최신 잠정일 2026-10-27에 정렬된 R48 데이터가 없어 D1 쓰기는 0. **R48/R54 명령 종료 코드 0을 운영 공개 성공으로 표시하지 않는다.**
- **실데이터 증거:** GetMarketHistory SPY 1h 2026-10-27 요청은 `x-row-count:0`, `x-data-through:2026-10-26T23:59:00Z`. 이미 공개된 27일 기존 잠정점수와 새로운 R32 입력은 별개이며 원자료가 없는 날짜를 0점/기존 점수로 대체하지 않는다.
- **배포 증거 구분:** GitHub main `74dc2024719a527d473f249702bdd53b5f3dcbac`의 Cloudflare Workers Production Build는 성공(build `af7548ac-9f2f-4e9f-8d64-796bd43ff681`). 그러나 공개 API는 아직 `modelRevision=null`, `ETF_ONLY_T40_R20_V40_PAIR50`. **소스 빌드 PASS ≠ R32 D1 공개 완료.**
- **이후 첫 작업:** 기존 API 및 저장된 PC ETF 원본에서 27일 R32 가격모드·수집 가능성을 정확히 확인해 R47→R48→R51→R54 **실제 게시**를 완료한다. MarketParquet 일봉을 1h 원가격과 근거 없이 혼합하지 않고, 사용자의 **배포 후 모니터링**을 **첫 게시 생략**으로 오해하지 않는다. 어떤 신규 산식·ETF 재선정·브랜치 변경도 하지 않는다.

## 0. 최상위 목표 — 작업 방향의 기준

**최종 목표는 인기가 많은 투자 테마부터 인기가 적은 투자 테마까지 총 163개 테마 각각의 독립 공포·탐욕 지수를 실제 데이터로 산출하고 ZGMINI에서 안정적으로 제공하는 것**이다.

- 163개는 사용자 명시 **프로그램 목표 수**다. 특정 GICS 163개 하위산업과 자동 동일시하지 않는다.
- **163개 전체 목록을 먼저 완성하거나 한꺼번에 사이트에 반영하는 것은 선행조건이 아니다.** 지금 시점에 인기 있는 차기 후보를 조사·선정하고, 검증을 마친 순서대로 **기본 한 테마씩** 공개·운영 범위를 넓힌다. 기존 소스에 승인된 우선순위 자료가 있으면 참고하되 전체 163개 순위표·정량 인기 산식이 없어도 다음 후보 조사와 기존 기술 개선을 진행한다. 임의 순위나 가상 테마를 확정 결과로 표시하지 않는다.
- 최초 공개 7개, 현재 공개 10개, 기존 9개 개편 및 R32 비공개 연구는 **최종 목표가 아닌 누적 중간 단계**다. 9개·10개에 맞춰 전체 범위를 축소하거나 해당 숫자를 163개 구축 완료율과 혼동하지 않는다. **인기 테마부터 한 단계씩 확대**하며 기존 공개 테마도 지속 개선한다.
- 반복 학습·기술 개선은 163개에 적용할 안정적 방식을 구축하기 위한 과정이다. 새 대화/작업자가 들어와도 최상위 목표, 승인 규칙, 미승인 영역, 마지막 검증 지점을 상실하지 않아야 한다.
- 프로그램 달성은 단순히 페이지에 163개 이름을 노출하는 것이 아니다. **각 테마의 실제 가격 기반 지수, 관측일·결측·확정/잠정 구분, 자동 수집→저장→산출→게시→검증**이 모두 동작해야 한다. 자료 미확보 테마는 `PENDING/UNAVAILABLE`로 정직하게 표시하고 완료로 계산하지 않는다.

## 1. 현재 기준선과 범위 차이 (2026-10-27 확인된 기록)

| 구분 | 현재 근거 | 의미 및 유지 원칙 |
| --- | --- | --- |
| 공개 결과 | 기존 공탐 공개 10개 테마 | 기존 순서·점수·252일 기록·잠정치 보존. 개선 실험으로 덮어쓰지 않는다. |
| 기존 9개 개선 후보 | 승인 ETF 고유 63종, 편입 자리 64개 | R19 O/X·R20 명단 기준. 후보 임의 재심사·수량 상한 신설 금지. |
| 비공개 계산 | R32: 9개×252일 2,268건 / R33: 공개 겹침 8개×252일 2,016건 검산 | 데이터 재현 실증이지 운영 게시·자동 갱신 완료가 아니다. |
| 차이 | 비공개 AI·반도체는 공개 10개에 포함되지 않음; 공개 데이터센터·전력, 우주·위성은 별도 R8 | 검증 없이 11번째 테마 추가하거나 별도 R8 기록을 교체하지 않는다. |
| 최신성 | R35 PC: 실제 최신 무료 원가격 SPY 2026-10-23; 새 자료 0건 | `WAIT_SOURCE_NO_NEW_VERIFIED_SPY_SESSION`은 에러가 아닌 소스 갱신 대기. |
| 저장자료 재사용 | **R39 실PC 2회 동일 결과:** 2026-10-23/26 MarketParquet ETF 54/63종, SPY 양일 보유, 9종 양일 누락 | R39 실측은 완료. EOD split-adjusted와 R32 raw unadjusted 1h **가격모드 정합 미검증**. 45개 기존 R32 유효 ETF는 54개 안에 모두 존재. |
| 연결 | R37 별도 D1 키/reader 후보, 단위 테스트 | 실제 PC 설치 경로·SHA, 출처 권리, 동일 거래일 가격정합, D1 게시·readback·배포는 아직 미완료. |
| 프로그램 전체 | 최종 목표 163개 확정, 전체 인기순 명단은 사전 완성 불필요 | 현재 공개 10개를 유지하면서 그때그때 인기 있는 차기 후보를 한 개씩 검증·추가한다. |

이 표의 날짜·숫자는 이력 기록의 확정 값이지 미래 실행 시점의 라이브 상태를 보장하지 않는다. 다음 실행 직전 PC·GitHub·D1·공개 API의 실제 값을 다시 확인한다.

## 2. 반드시 재사용할 승인된 노하우

### A. 테마 및 ETF 후보 선정
1. 기존 9개 재선정에는 R19/R20의 세 가지 O/X **AND** 계약을 보존: **ETF 구성 종목 공개**, **GetMarketHistory 티커 실수집 가능**, **운용사 신뢰도 C등급 이상**. 모두 만족한 명단을 재심사하지 않는다.
2. 신규 혁신 테마의 진입은 [적응형 OR R2](THEME_ETF_ADAPTIVE_OR_R2_20261025.md)의 **기존 장기 이력 경로 OR 신생 혁신 경로**를 따른다. 후보 ETF 자체의 자료·권리·신뢰도 검증과 '628일 이상 아니면 제외' 판단을 혼동하지 않는다.
3. 테마별 ETF 수량을 2개·4개 등 임의로 고정하거나 상한/최소 수로 강제하지 않는다. 자격 있는 ETF를 필요한 만큼 검토하되 실제 수집·검산이 가능한 경우에만 계산한다.
4. 테마 순도/중복률/특정 산업 편입비율은 승인 없이 추가 탈락 게이트나 벌점으로 만들지 않는다. R21에서 철회한 검사를 다시 요구하지 않는다.
5. 사용자가 말한 '인기도 높은 테마 먼저'는 **실제 순차 개발·공개 원칙**이다. 전체 163개 목록 조사 완료를 기다리거나 일괄 생성·배포하지 않는다. 현재 후보 사이의 인기도 근거를 비교해 다음 우선 테마부터 진행하며, 인기 점수·정렬 함수·163개 확정 명단을 임의로 만들지 않는다.

### B. 가격 데이터와 산식의 정합성
1. ETF만 점수 입력에 사용한다. 기존 각 ETF 상위 점수축 **추세 40% / SPY 상대강도 20% / 변동성 40%**와 승인된 세부지표/정규화 계약 유지. 개별종목이나 뉴스 해석을 공탐 산식에 몰래 추가하지 않는다.
2. 승인 적응형 R2의 **실제 ETF–SPY 유효 공통일** 기준: `N<40` 점수 결측; `40≤N<377` 적응형 잠정 계산; `377≤N<628` 당일 R188 동등성 검증; `N≥628` 기존 252일 이력 재현 경로. 252거래일은 기본 **차트 표시창**이며 상장 전이나 가격 미수집 구간을 만들어 채우지 않는다.
3. 다중 ETF 가중치는 날짜별 실제 유효 데이터 길이·산식 성숙도, 기존 승인된 두 ETF 비중, R32 승인된 역사 날짜별 공식 발행사 AUM 기준을 **적용 범위별로 구분**한다. 미승인 3종 이상 일반 가중치 함수·결측 ETF 처리·R2/R32 결합을 승인된 운영 숫자인 듯 적용하지 않는다.
4. `RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE`와 `split-adjusted EOD`는 서로 다른 가격 모드다. 가격 모드·거래 세션·뉴욕 날짜·DST·조기폐장·SPY 비교 날짜의 동등성 검증 전에 시계열을 연결하지 않는다.
5. 원자료를 저장한 뒤 manifest의 실제 파일 SHA256, 수집 시각, 원출처, 관측일, 가격 모드, 스키마를 검증한다. 원자료를 공개 점수에서 역산하거나 공급자 지연을 최신일로 위장하지 않는다.
6. 공식 AUM은 발행사 자료의 **기준일별 실값**을 사용하고 전 날짜에 같은 '오늘 AUM'으로 소급하지 않는다. ETF 또는 날짜 결측을 임의 0점·동일값·보간값으로 채우지 않는다.

### C. 연구·자동화·공개 게이트
1. `SOURCE/GITHUB`, 로컬 단위 테스트, 실PC 파일/SHA, 비공개 계산, D1 write/readback, 공개 API/UI, 다음 정규 실행, Cloudflare 프로덕션 배포를 별도 상태로 보고한다. 한 단계 PASS를 다음 단계 PASS로 승격하지 않는다.
2. R23·R24·R25 일회성 원가격/검증·checkpoint는 불변이다. 날짜 변경분은 별도 delta 저장·검증 후 겹치는 구간 충돌 검사로 **읽기 전용** 연결한다. R35처럼 공급자가 새 거래일을 주지 않으면 과도 재시도·유료 전환·숫자 보간을 하지 않는다.
3. 기존 Windows PC 원자료·SQLite·계산, Cloudflare D1 공개 결과 및 기존 정규 수집 체계를 존중한다. 새 테마가 운영 목록에 '자동으로 포함'되거나 새 코드를 저장했으니 배포됐다고 추정하지 않는다.
4. 유효 공급자 권리·공개 허가, 별도 feed key, 승인된 공개 시점과 기존 10개 이력 보존을 확인한 후에만 전환한다. 원가격 대량 재배포 또는 실측 없는 공개는 금지.
5. 사용자 Windows CMD는 실행 파일과 같은 위치에 추적 가능한 결과 TXT/JSON을 출력하도록 만든다. 원자료를 Desktop에 임시 운영원본으로 두거나 E: 예상 경로만으로 파일이 있다고 보고하지 않는다.
6. 오류 때는 `LAST PASS → FIRST FAIL → 실제 로그 → 원인 → 영향 → 최소 수정 → 재검증` 순서로 접근한다. 반복 확인한 원본 부재를 무한 재탐색하지 않는다.
7. 작업자가 브랜치를 임의로 신설하거나 다른 전용 프로젝트의 브랜치·계획을 가져와 적용하지 않는다. 특히 이 163 테마 공탐 작업은 시장 캘린더·개별 경제지표 API 연결·이란 뉴스·자동매매 봇 프로젝트와 구분한다.


## 3. 최종 실행 순서 — 기존 9개 R32 전환 먼저, 이후 인기순 163개 확대

**상위 우선순위는 2026-11-09 사용자 확정 `1 → 4 → 2 → 3`이며, 아래 S0~S10은 각 단계의 기술 선후관계와 증거를 보존한다.** 이전 문서에서 '차기 신규 인기 테마 조사(N1/P1)를 가장 먼저'라고 적은 순서는 2026-10-27 사용자 최종 지시에 따라 대체한다. **우주·위성에서 개선한 승인 계산 경로를 기존 9개 연구 테마에 적용하는 중**이며, 이미 확보한 ETF/산식/실측 결과를 다시 조사·설계하지 않는다.

| 단계 | 완료해야 할 내용 | 증거·통과 조건 | 현재 상태 |
| --- | --- | --- | --- |
| S0 | 전용 브랜치·승인 산식·로스터·공개 기준선 고정 | 브랜치, main/브랜치 SHA, R19/R20/R22/R32/R33, 공개 10개 API 및 이전 이력 스냅샷 | 기존 연구 근거 확보 / 실행 직전 live 재확인 |
| S1 | 기존 9개 연구·ETF 자격·공식 AUM 검증 결과 **그대로 인계** | 9테마 / 64 편입 위치 / 고유 63 ETF, 3개 O/X 게이트, AUM 원래 기준일 | 완료. 재선정 금지 |
| S2 | 승인 R32 계산의 PC 재현성과 기존 공개 이력 차이 검사 | 실PC R32 9×252=2,268/2,268; R33 공개 겹침 8×252=2,016/2,016 | 완료. R32 **비공개** 단계만 PASS |
| S3 | 기존 1h 수집·정규 PC 증분 연결 | R23 실PC 64/64종, 원본 121/121 SHA, 10/23 SPY 확인; R35 실PC 10/27 1 GET 정상 대기 | 승인 R32 입력은 GetMarketHistory 1h. R45 MarketParquet EOD 7일·54/63은 다른 가격 모드의 보조 증거이며, R46 EOD 계정 인증은 필수 Gate 아님. 기존 예약 작업 불변. |
| S4 | 신규 자료에 동일한 확정 R32 산식을 적용하는 반복 계산 | 원본 manifest/SHA, SPY 비교일·원가격 모드 정합, 누락 ETF/공식 AUM 원기준일, 날짜별 실측 비중 | 정규 실행 증거 **미확인** |
| S5 | 기존 10개 공개 보존 + 신규 R32 읽기 연결 | 별도 R37 key, 기존 공개 순서·기존 2개 R8 이력/잠정치, 미공개 AI 차단, fallback | R37 개발 브랜치 코드/테스트 PASS / 실제 D1 미게시 |
| S6 | 권리·같은 기준일·실PC 재현·게시 승인 | 원출처 파생 공개 권리, 가격 정합, R37 게이트 실제 근거 및 사용자 공개 승인 | **PENDING**, 임의 true 금지 |
| S7 | 기존 공개 대상의 신규 산식 전환 | 원래 공개 테마부터 개별·소량 검증 후 승인된 공개 단위로 main→Cloudflare, D1 readback/API/UI 검증 | 미공개. **일괄 전환 완료라고 보고 금지** |
| S10 | 기존 공개 테마부터 지속 운영·상태 감시·문서 인수인계 | 실제 공개·관측일·결측·API/UI를 먼저 유지; 정규 갱신 사후 검증은 기능 완료 뒤 분리, 기존 결과/배포 SHA 보존 | 기존 공개 10개 정상화 직후부터 적용, 신규 출시마다 반복 |
| S8 | 미공개 AI·반도체의 **별도 신규 게시** 판정 | 현재 미공개임을 유지하고 등록·수집·권리·기록/자동실행·사용자 승인 확인 | 연구 계산 완료 / 출시 미승인 |
| S9 | 다음 인기 테마부터 163개 목표까지 **기본 1건씩** 확대 | 소수 후보 인기도 근거→ETF 3 O/X→승인된 공통 계산→PC 정규 운영→D1/API/UI→다음 정규 실행 | 기존 테마 전환 경로 확보 후 반복 |

**S10은 S9의 163개 구축 완료를 기다리지 않고 기존 공개 콘텐츠부터 적용한다. 신규 테마는 각 건의 검증 후 즉시 공개·운영에 편입한다.**

**S0~S2를 새 작업으로 되돌리지 않는다.** S3/S4의 현재 운영 연결이 첫 번째 기술 작업이다. 163개 신규 후보 탐색(S9)은 S3의 작업을 대체하는 선행 과제가 아니다.

### 3-1. '기존 9개'와 '현재 공개 10개'의 정확한 교집합

- R32 비공개 **연구 9개** = 로봇·자동화, 클라우드·SaaS, 자율주행, 원전·SMR, 방산, 핀테크, 사이버보안, **AI·반도체**, 바이오·신약.
- R32의 9개 중 **공개 10개와 겹치는 것은 8개**다. AI·반도체는 연구 완료가 자동 공개 승인이라는 뜻이 아니다.
- 현재 공개 10개 중 R32 연구 9개와 겹치지 않는 **우주·위성 / 데이터센터·전력**은 각각 기존 별도 R8 경로를 가진다. 우주·위성의 개선 산식·이력과 데이터센터 기존 기록을 이번 8개 전환 때문에 되돌리거나 덮어쓰지 않는다.
- 따라서 **8개 기존 공개 전환 + AI·반도체 1개 신규 게시(별도 게이트)**가 9개 연구의 실제 사이트 적용 형태다. 공개 10개 전체를 '9개 연구 = 9개 기존 공개'로 혼동하지 않는다.
- 공통 계산 **산식 엔진 재사용**은 최종 아키텍처 목표다. 과거 R8 모듈/별도 D1 키는 전환기 장애 격리·역사 보존 수단으로 이해하며 **새 테마마다 영구히 산식을 복제하지 않는다**. 통합은 기존 결과의 동등성 및 영향 범위 검증 후 별도 게이트로 다룬다.

### 3-2. R20 승인 ETF 로스터 — 다시 선정하지 않는다

| 테마 | 승인 편입 ETF | 자리 |
| --- | --- | ---: |
| 로봇·자동화 | BOTZ, ROBO, ROBT, ARKQ, HUMN, RBTX, CBOT | 7 |
| 클라우드·SaaS | SKYY, CLOU, WCLD, FCLD, CLOD | 5 |
| 자율주행 | DRIV, BOTZ, IDRV, HAIL, CABZ, KARS | 6 |
| 원전·SMR | NLR, URA, URNM, NUKZ, URNJ, URAN | 6 |
| 방산 | ITA, SHLD, XAR, PPA, NATO, WR | 6 |
| 핀테크 | FINX, ARKF, IPAY, BPAY, KYC, LATR | 6 |
| 사이버보안 | CIBR, BUG, HACK, IHAK, WCBR, SPAM, PSWD, XA | 8 |
| AI·반도체 | SMH, SOXX, SOXQ, XSD, ARTY, AIQ, CHAT, PSI, EUV, DRAM, LLMA | 11 |
| 바이오·신약 | IBB, XBI, BBH, PBE, GNOM, ARKG, SBIO, FBT, GNMX | 9 |
| **합계** | **64개 편입 위치 / BOTZ 중복 포함 고유 63 ETF** | **64** |

이는 **승인 후보 로스터**다. 매 거래일 모든 ETF가 유효 점수를 제공한다는 뜻은 아니다. 기존 R25 최신 유효 45종/결측 18종은 보존하고 임의 0점 대체·후보 탈락을 적용하지 않는다.

## 4. 실제 시작부터 공개까지 — 실행자용 세부 절차

### 4-0. 착수 시 확인 (읽기 전용)
1. 지정 브랜치 하나만 사용한다. 작업 전 GitHub 최신 main/작업 브랜치 SHA 및 source drift를 확인한다. 임의 브랜치 생성·전환·전체 병합·사용자 허락 없는 삭제를 하지 않는다.
2. `AGENTS.md`, 본 문서, `THEME_DATA_OPERATIONS.md`, R20/R22/R32/R33/R34/R35/R36/R37/R38/R39/R40를 순서대로 읽는다. 과거 완료 단계의 근거 SHA를 인계하고 당시 결측·대기 상태를 최신 상태로 포장하지 않는다.
3. 실제 공개 `/api/theme-fear-greed`에서 10개 이름/순서/ETF/점수/관측일/phase/252일/잠정치를 확인하고 기존 증거 원본 및 API 스냅샷과 구분 기록한다. 신규 계산이 없어도 기존 서비스를 계속 제공한다.

### 4-1. R39 실PC 기존 저장자료 커버리지 확인 — **실행·실측 기록 완료**
1. 이미 제공된 `THEME_NINE_R39_PARQUET_COVERAGE.cmd` 및 필요한 구성품을 사용해 **기존 E: Parquet 내부 symbol**에서 R20 63 ETF+SPY의 2026-10-23/26 실제 보유 여부만 확인한다. 이 CMD의 실PC 결과 파일이 이미 제출됐으면 그대로 재사용하고 재실행을 강요하지 않는다.
2. 사용자 제출 TXT 2건은 동일한 실PC 결과다. **R39_REAL_PC_COVERAGE=PARTIAL_PASS**: 2026-10-23 및 10-26 ETF 각 54/63종, SPY 양일 있음, 결측 고유 9종 `CABZ,CBOT,GNMX,KYC,LATR,LLMA,RBTX,WR,XA`. 자세한 파일 SHA·테마별 원인은 [R39 실측 기준서](THEME_NINE_R39_SAVED_PARQUET_COVERAGE_20261027.md)에 고정했다. 재실행 요구 금지.
3. R39의 `split-adjusted EOD` 종가와 R32의 `RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE` 가격은 **가공 없이 혼합하지 않는다**. 단순 보유 확인으로 점수·일치성·권리·공개를 통과시키지 않는다.
   - R32의 2026-10-23 최신 개별 유효 ETF는 고유 45종(9테마 편입 46자리)이고, **이 45종이 R39의 양일 파일 보유 고유 54종에 모두 포함됨을 확인**했다. 그러나 파일에 있음과 40일 이상 공통 세션·같은 가격모드 확인은 다르다. R39 양일 보유 자리는 55/64(두 테마 중복 BOTZ 1자리).
4. R35 무료 소스의 마지막 확인일(2026-10-23)과 기존 사이트 공개의 최신 관측일(당시 10-26)은 다른 수집 경로다. 새 소스 자료가 없으면 `WAIT_SOURCE_NO_NEW_VERIFIED_SPY_SESSION`을 유지하고 실측 없는 값을 계산하지 않는다.
5. R36에서 확인한 기존 PC 수집기/예약 작업(기본 7개 등)의 **실제 설치 SHA·실행 경로·수집 목록**을 읽기 전용으로 대조한다. R20 63종 중 미연결 종목만 기존 정규 경로에 추가할 최소 변경을 찾는다. 새 스케줄러·중복 전체 재수집이 기본 작업이 아니다.

### 4-1a. R40 실제 저장 가격모드 비교 — **코드 PASS / 실PC 미실행**
1. 전용 브랜치의 `scripts/pc-writer/theme-nine-r40-price-mode-overlap.mjs`, 기존 R39 SHA 고정 소스, 우주·위성 R25 원가격 선택기를 재사용한다. 배포와 분리된 Windows ZIP/CMD 한 번 실행으로 R23 121페이지 해시·저장 Parquet 감사 SHA·최대 628일 보유 ETF–SPY 유효일 수·실측 가격/수익률 차이를 검사한다.
2. TXT는 CMD와 같은 폴더에 보관한다. **CODE/TEST 4개 파일 PASS**, 실PC 원본 가격 기준 비교는 `PENDING`. EOD 파일 존재만으로 1h 동등성 인정·R32 신규 계산·실사이트 게시를 허용하지 않는다.
3. 9개 기존 결측 ETF를 승인 로스터에서 제거하거나 0점으로 보정하지 않는다. R40 사용 설명·검사 필드·STOP은 [R40 실행 기준서](THEME_NINE_R40_PRICE_MODE_OVERLAP_20261027.md)에 있다.

### 4-2. 기존 9개 R32의 정규 반복 계산 연결
1. 이전 `R23` 원가격 121페이지, `R25` 실점수 10,842건, `R26` 발행사 AUM 증거 및 `R32` 실PC shadow SHA를 **불변 기준선**으로 보존한다. 기존 E: DB/checkpoint·공개 D1을 초기화하거나 대체하지 않는다.
2. 검증된 신규 날짜 입력만 독립 delta로 수집/manifest 해시 검사한 뒤 승인된 겹침 날짜 검산을 거쳐 같은 가격 모드의 연속 시계열로 결합한다. 데이터가 이미 존재하면 추가 GET하지 않는다.
3. 당일 ETF–SPY 공통 유효 일수에 따른 **이미 승인된 R188/적응형 R2** 점수축을 사용한다(추세 40·상대강도 20·변동성 40; 40 미만 결측; 377/628일 경계 유지). 없는 데이터·거래일을 보간하지 않는다.
4. 다중 ETF 테마 합산은 **이미 비공개 실증된 R32 승인 분기** 그대로 사용한다: 3개 이상 유효 ETF일 때 공식 발행사 AUM 기준일을 보존한 상대 정규화, 유효 2종은 승인 R3 적응형 쌍 규칙, 유효 1종은 R32 승인 단독 경로, 유효 0종은 null. 새 50:50/4개 고정/임의 AUM 기간 만료를 만들지 않는다.
5. 매 신규 검증 관측일에 9개 테마의 최근 실제 252거래일 표시창과 가중치 합계·성숙도 경계·소스 날짜를 재검산한다. 단기 ETF로 인해 표시창 왼쪽이 비어도 정상 부분 이력으로 둔다.
6. **기존 PC 정규 실행**의 검증된 최소 확장으로 수집→저장→계산→비공개 비교를 반복 가능하게 하고, 일회성 CMD 성공과 예약 작업 자동 성공을 분리해 기록한다. 원자료/계산은 PC, D1은 승인 공개 결과만 저장한다.

### 4-3. R33 검산 결과 인계 (재실행 요구 금지)
- PC R32 비공개 9×252 = **2,268/2,268 PASS**. 공식 AUM 가중 2,177일 / 기존 R3 2종 혼합 91일. 당일 최신 점수 없는 18종을 0으로 치환하지 않았다.
- 2026-10-23 공개 기준선의 실제 공통 **8×252 = 2,016/2,016 날짜 비교 완료**. 구버전 점수와 신규 R32 점수가 다른 것 자체는 실패가 아니므로 수치 일치를 공개 조건으로 강요하지 않는다.
- 미공개 AI·반도체 252일은 공개 구버전 원본이 없으므로 '비교 미대상'이다. 기존에 게시된 것처럼 기록을 만들어 비교하지 않는다.
- 신규 거래일 이후에는 그 날짜의 정규 재계산·공개 연결만 추가 검증하고, 완료된 2026-10-23 기준 실증 전 과정을 처음부터 재작업하지 않는다.

### 4-4. 별도 결과 키와 공개 reader 준비
1. 기존 `theme-etf-only-rolling/current`, 바이오·데이터센터·우주 각각의 기존 D1 키·이력은 절대 덮어쓰지 않는다.
2. 이미 존재하는 `worker/theme-nine-r37-public.mjs`의 `theme-legacy-nine-r37/current`를 사용한다. 신규 계산기 작성이 아니라 **기존 R32 결과를 정규 출력 형태로 안전하게 연결**하는 작업이다.
3. 현재 R37 reader는 엄격한 **9개 연구 로스터 전체 일치·단일 READY 객체**를 요구하고, 공개 목록과 겹치는 8개만 교체한다. 이것을 '테마 한 개씩 공개 선택 가능'이라고 추정하지 않는다. **개별 순차 공개를 택할 경우** reader의 선택 게이트/스냅샷 단위를 최소 변경·테스트·승인해 지원한다. 산식·R20 로스터·기존 10개 순서는 변경하지 않는다.
4. 미공개 AI·반도체는 R37 연구 산출물에 존재하더라도 별도 정식 공개 승인 전 공개 11번째 테마로 추가하지 않는다. 우주·위성/데이터센터·전력은 기존 운영·잠정 점수·역사 계약을 보호한다.
5. R37의 권리·가격정합·manifest·AUM·비공개 재현·게시 승인 플래그를 **실제 증거 없이 참으로 설정하지 않는다**. 결측/STALE/D1 예외 시 기존 공개 10개로 실패 안전 복귀한다.

### 4-5. 운영 전환·배포의 명확한 게이트
- Gate A **실PC 소스·실계산**: ETF 실제 저장·manifest SHA·가격 모드·SPY 세션·AUM 원일자·R32 재현·과거 이력 보존.
- Gate B **권리·명시적 승인**: 원공급자 계정·파생 공개 조건, 독립 기록·원가격 비공개, 해당 테마/전환 단위에 대한 사용자 공개 승인.
- Gate C **D1**: 분리된 새 키에 승인된 기록만 원자적으로 저장, 정확한 body/stored_at·sourceVersion·observationDate·phase·252/부분 이력 **직접 readback**. 기존 키 불변 확인.
- Gate D **코드 배포**: 지정 브랜치에서 검증한 **필요한 파일만** 최신 main에 선별 반영하고 Cloudflare Git integration의 main→빌드→정확한 배포를 확인. migration 브랜치 전체 병합·Sites 배포·직접 Wrangler Prod 배포 금지.
- Gate E **실제 공개**: `/api/theme-fear-greed`, 웹/모바일 PC 화면, 날짜·시계열·잠정·결측, 공개 10개 순서·미공개 AI 차단 및 기존 두 R8 보호 확인.
- Gate F **자동 운영**: 다음 실제 정규 예약 실행(가능하면 2회 이상 연속)에서 수집·저장·계산·D1/API/UI 갱신을 다시 확인. 빌드 성공/일회성 게시 성공은 자동 운영 완료가 아니다.
- **실패 처리**: 마지막 정상 R2/R32 점수·기존 10개 결과를 보존하고 실패한 대상만 `PENDING/STALE/PARTIAL/SOURCE_FAILED/CALCULATION_FAILED/UNAVAILABLE`로 드러낸다. 허위 날짜 갱신/점수 재게시/무승인 rollback 금지. 첫 FAIL의 정확한 근거만 최소 수정한다.
- 본 기준서 저장은 Gate A~F를 통과시키거나 공개 권한을 자동 부여하지 않는다.

### 4-6. 우주·위성 및 데이터센터·전력 — 공통엔진 확대와 기존 역사 보호
- 우주·위성은 신규 산식의 실증 출발점이다. **개선 코어를 기존 9개 연구에 적용하는 중**이지 우주 테마 산식을 새로 작성하는 작업이 아니다.
- 데이터센터·전력과 우주·위성의 별도 R8은 *현재 운영·검증 단위*다. 앞으로 테마가 늘어날 때 각 테마에 새 산식을 복제하는 영구 전략이 아니다.
- 향후 공통 R32 엔진의 데이터 입력·ETF 구성·검증·출력 **설정 기반**으로 두 테마 및 다음 신규 테마를 수용한다. 단 기존 R8 점수·관측일·잠정/확정·원자료 모드의 동등성/차이를 검증하고 승인된 전환 시점 전까지 현재 공개를 유지한다.
- '공통 엔진으로 이행'은 **구 산식 결과와 반드시 숫자가 같아야 한다**는 뜻이 아니다. 모델 Revision 차이·참여 ETF·AUM 날짜를 기록하고 비교해 사용자에게 표시할 수 있어야 한다.

### 4-7. 163개 테마 — 한 번에 확정·게시하지 않는 반복 루프
1. 기존 공개 현황과 최근 실제 관심 근거에서 **바로 다음 인기 후보 소수**만 조사한다. 163개 전체 명단·순위를 먼저 완성하지 않고, 중복·기존 계획·데이터 접근성과 합리적으로 비교한다.
2. 다음 **1개 테마**를 우선 선정한다(판단이 필요한 후보 간 우선순위만 사용자에게 확인). 이미 선정된 기존 9개 ETF를 같은 이유로 재심사하지 않는다.
3. ETF 후보 수를 제한하지 않는다. 신규 ETF별로 **구성 종목 공개(O), 실제 수집 가능(O), 운용사 C급 이상(O)** 세 조건을 각각 확인한다. 신규 혁신 테마 자격은 승인된 기존 장기 이력 경로 **OR** 신생 혁신 경로로 판단하고 628일 부족만으로 탈락하지 않는다.
4. 새로운 ETF–SPY 원자료·공식 AUM·권리·manifest를 실제로 저장해 검증한다. 40일 미만은 점수 결측이며, 252일은 **차트 표시창**이지 가짜 데이터를 채울 의무가 아니다.
5. 승인 공통 산식의 **적용 가능한 구성**을 그대로 쓴다. 신규 3종 이상 등 현 R32 근거 범위 밖의 입력 조합은 기존 숫자를 억지 확대 적용하지 않고 필요한 *정확한 범위에 한해* 사용자 승인을 받는다. **신규 테마마다 독자 계산식을 만들지 않는다.**
6. 별도 후보 key에서 그림자 계산→과거/부분 이력 검증→권리와 출시 승인→D1 CAS/readback→API/UI→다음 정규 실행까지 완료한 **한 건만 신규 공개 운영 수**에 더한다.
7. 인기와 시장 관심도는 시기에 따라 변하므로 바로 다음 후보를 다시 평가한다. 실패·권리 미확인 테마는 보류해 정상 다음 테마를 막지 않고, 전체 163개 목표를 유지한다.

### 4-8. 일상 운영, 보존, 복구
- 테마별 `theme-id`, display name, 실제 ETF roster 및 유효 참여 ETF, 계산 Revision, ETF 개별 관측일/성숙도, 출처·권리, 원가격 모드, sourceStoredAt/manifest SHA, 공식 AUM 기준일, 확정·잠정, 수집·계산·게시 checkpoint를 기록한다.
- 원자료·R23/R25/R32/R33/기존 API 원장·정규 PC 예약 작업·기존 D1 feed를 원본 그대로 보존하고, 새로운 버전은 별도 기록·sourceVersion으로 추적한다.
- 지표 지연은 마지막 실제 관측일과 함께 표시한다. null/0/자료 없음·단기 부분 이력을 구분하고, 실패한 테마의 오류가 다른 테마의 갱신을 중단시키지 않도록 격리한다.
- 회복 절차는 첫 FAIL 로그와 변경 SHA 확인→권리/원자료/가격모드 재확인→최소 변경→비공개 재검산→승인된 공개 경로 복원이며, 원가격·이력 삭제나 무승인 배포를 사용하지 않는다.

## 5. 작업 보고·브랜치 고정·누적 지식 관리

**반드시 작업 착수와 최종 보고에 아래 필드를 포함**한다.

- 저장소 / **실제 작업 브랜치** / 기준 `main` SHA / 작업 전·후 전용 브랜치 SHA(확인 가능 시)
- 프로그램 전체 목표 `163`; 기존 공개 개수 / 비공개 연구 개수 / 신규 운영 검증 개수(각각 별도)
- 이번 작업이 P0~P6·N1~N3 중 어디에 속하는지, 이전 승인 대비 변경점 및 미변경 보호 범위
- 직접 실행한 테스트·실PC·D1·공개 증거. `PASS/PENDING/FAIL/NO_EVIDENCE`를 사실대로 기록
- 새로 배운 노하우의 **적용 조건·반례·승인/미승인 구분·출처 파일·검증 SHA**, 다음 작업에서 재사용할 위치
- 다음 1개 실행 가능한 작업, 필요한 입력 및 현재 실패·대기 조건

**허용 브랜치는 `codex/theme-fear-greed-integration-20261025` 한 개**다. 작업자가 자의로 새 개인/실험 브랜치를 만들지 않는다. 지정 브랜치의 최신 상태를 재확인하지 못했으면 **작성·배포를 멈추고 상태부터 확인**한다. 다른 브랜치의 과거 실험 자료는 읽기용 Evidence일 뿐, 무분별한 merge/재생성/전용 브랜치 변경의 근거가 아니다. 사용자 지시 없이는 다른 브랜치를 삭제하지 않는다.

새 작업에 들어가기 전 **이 문서 + R22 + 적응형 OR R2 + 테마 운영 기준서 + 해당 최신 R 문서**를 확인하고, 노하우가 추가되면 관련 상세 문서를 갱신한 뒤 본 문서의 상태/다음 작업에도 반영한다. 작업 내용이 9개·10개로 한정되는 경우에도 상위 163개 목표는 유지한다.

## 6. 기존 근거 문서 (원본 보존)

1. [테마 데이터 운영 기준](THEME_DATA_OPERATIONS.md) 및 [등록부](../config/theme-data-registry.json)
2. [기존 9개 R22 단계 확정](THEME_LEGACY_NINE_R22_SIX_STAGE_TOOL_ASSIGNMENT_20261026.md), R19 O/X, [R20 승인 ETF](../config/theme-nine-r20-approved-candidates.json)
3. [신생 ETF 적응형 OR/R2](THEME_ETF_ADAPTIVE_OR_R2_20261025.md)
4. [R34 기존 데이터 불변·증분 준비](THEME_LEGACY_NINE_R34_INCREMENTAL_REFRESH_20261027.md), [R35 실제 소스 지연](THEME_LEGACY_NINE_R35_DELTA_COLLECTION_20261027.md)
5. [R37 연결 및 전용 브랜치 R38/R39 선별 통합](THEME_NINE_R37_READ_SIDE_INTEGRATION_20261027.md)
6. [R38 공개 10개 보호](THEME_NINE_R38_PUBLIC_TEN_SCOPE_20261027.md), [R39 실PC 54/63 커버리지 및 후속 S3 조치](THEME_NINE_R39_SAVED_PARQUET_COVERAGE_20261027.md)
7. [R40 R23 시간봉과 기존 저장 EOD 가격모드 실측 비교](THEME_NINE_R40_PRICE_MODE_OVERLAP_20261027.md)

**중요:** 이 문서는 기존 승인 문서 내용을 덮어쓰거나 과거 단계의 작업 계획을 지우지 않는다. 충돌 시 **최신 사용자 명시 승인과 해당 작업의 승인된 실제 산식·자료 계약**을 확인하고 변경을 중지한다.


8. [R47 기존 9개 비공개 반복 증분·재계산 경로](THEME_NINE_R47_RECURRING_PRIVATE_UPDATE_20261028.md) — 승인 산식·ETF 불변, PC 실운영·공개 미승인

9. [R47 PC 비공개 ETF·9개 테마 제출 원본 독립 검증](THEME_NINE_R47_PC_SHADOW_INDEPENDENT_AUDIT_20261028.md)

## 7. 상태판 — 보고 시 반드시 최신 증거로 갱신

| 구분 | 기존 확보 | 아직 필요한 정확한 다음 증거 | 이 문서 작성 시 상태 |
| --- | --- | --- | --- |
| 연구 ETF 편입 | R19/R20 63 고유·64 위치, 9테마 | 재선정 불필요 | `PASS (연구 로스터)` |
| 비공개 역사 R32 | 실PC 9×252, 합산 2,268/2,268 | 정규 신규 거래일 재계산 | `PASS (2026-10-23 연구)` |
| 신구 공개 이력 비교 | R33 8×252 2,016건 | 다음 신규 날짜 데이터와 비교 | `PASS (겹침 8개, 2026-10-23)` |
| 기존 1h 원가격·증분 | R23 원본 64/64·121페이지, R35 10/27 WAIT 이력; R47 10/28 실제 PC 64심볼 완료·원자료 62파일·최신 SPY 2026-10-26 | 원본 shadow 두 파일 독립 검증, 다음 거래일 R47 2회차와 정상 예약 경로 확인 | `R47_FIRST_PC_COLLECTION_PASS / REPEAT_PENDING` |
| 최신 데이터 가격 모드 | R23/R32 `RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE`; R45 EOD는 `DAILY_SPLIT_ADJUSTED` | R46 EOD를 R32 1h와 혼합하지 않음. 필요 시 독립 연구로만 보존 | `R32_INPUT_1H_PRESERVED` |
| 신규 9개 자동 계산 | R47 실제 PC 신규 1h 수집 및 ETF·9개 테마 JSON 원본 SHA 확인; 기존 R32 순수 함수로 2,268/2,268 날짜 독립 재계산 PASS, 최신 점수 ETF 44/63·결측 19 | 다음 실제 SPY 거래일 R47 두 번째 PC 실행으로 윈도 전진·중복 방지 확인, 이후 승인된 Windows 예약 경로와 D1 별도 게이트 | `R47_PC_SHADOW_AND_RECOMPUTATION_PASS / LIVE_REPEAT_PENDING` |
| 안전 공개 reader | R37 코드·단위 테스트, R38 10개 보존 | 권리·LIVE D1 readback·배포 | `SOURCE_PASS / RUNTIME_PENDING` |
| 기존 8개 실제 신규 점수 공개 | 없음 | 테마별 승인·D1/API/UI 실증 | `NOT_PUBLISHED` |
| 미공개 AI·반도체 | R32 연구 252점 | 별도 신규 테마 출시에 필요한 승인·자동화 | `NOT_PUBLISHED` |
| 163개 신규 테마 | 프로그램 목표와 순차 방식 확정 | 다음 인기 테마 1개부터 반복 | `NOT_163_COMPLETE` |

**가장 가까운 한 가지 다음 작업(2026-10-29 최신):** [실제 R32 아키텍처 정본](THEME_NINE_LIVE_ARCHITECTURE.md)의 R51 날짜 정렬 첫 차단점부터 해결한다. 최신 27일 R48 원가격 계산 후보를 검증된 같은 모드로 확보한 뒤 R54 D1 CAS/readback, 공개 API 모델 Revision/점수 일치를 **실제로 확인해야만 게시 완료**다. 이전의 R46 인증·R47 2차 실행·Task 설치 자체를 다시 최우선 개발 목표로 삼거나 배포 성공이라고 보고하지 않는다.

## 8. 인수인계·완료 판정·변경 금지선

- 이 문서가 최상위 방향과 작업 **순서**의 정본이며 개별 R22/R32/R33/R34/R35/R36/R37/R38/R39/R40 문서는 구체 계산식·증거의 정본이다. 이 문서가 승인 산식을 독자적으로 다시 정의하지 않는다.
- 실제 문서 수정·코드 수정·PC 설치·D1 쓰기·Cloudflare 배포·공개 점수·정규 자동 운영은 **서로 다른 단계**다. 각 단계의 PASS/PENDING과 SHA를 별도로 보고한다.
- 모든 결과 보고에는 `저장소 / 전용 브랜치 / 기준 main SHA / 적용 브랜치 SHA / 이번 Gate / 기존 확보 증거 / 이번 실행의 PASS·FAIL·PENDING / 미완료 / 다음 한 단계`를 반드시 쓴다.
- 승인 없는 분기·개인 브랜치 생성, 승인 산식 수정, ETF 수량 고정·재심사, 임의 가격 보간·결측 0대체, 공개 원장 덮어쓰기, 미공개 AI 자동 편입, 새 예약 작업·유료 수집, 메인 전체 병합, Cloudflare 직접 배포를 하지 않는다.
- 완료 판정은 (1) 기존 8개 공개 전환 결과 및 기존 10개 보존 → (2) AI·반도체 별도 승인 이후 신규 공개(승인된 경우) → (3) 인기순 새 테마 각각의 반복적인 실제 운영 완료로 분리한다. 숫자 '163'은 예정 목록 개수가 아니라 **실제 자동 운영되는 개별 테마 수**의 최종 목표다.
- 실제 운영 전환 요청이 오면 각 Gate 직전 최신 main/PC 설치 SHA/공급원 권리/Cloudflare 연결을 확인한다. 이 문서 반영만으로 자동 배포나 신규 공개가 발생하지 않는다.



## R48 2026-10-28 — 기존 9개 자동 갱신·공개 브리지 구현 (이번 작업)

- 개발 전용 브랜치 커밋: `35eeebf58b891496dc296e220ab9f54e59b6f15a`; 브랜치 `codex/theme-fear-greed-integration-20261025` 유지, 기타 작업 브랜치/운영 main 불변.
- R47 PC 제출 ETF·NINE 원본 2개를 SHA 일치 상태로 읽고, **9개×252일 2,268건**을 기존 R37 출력 형식의 **비공개 후보**로 성공적으로 변환. 산식 R25/R32·ETF 63종/편입 64개 불변.
- R48 PC 연결: `THEME_NINE_R48_PRIVATE_CYCLE.cmd`가 R47 수집→R48 비공개 후보 파일 저장을 순서대로 실행. `theme-nine-r48-private-schedule.mjs --install`은 *사용자 PC에서 직접 실행해야* 신규 단독 예약작업을 만들며, 기존 다른 운영 작업은 수정하지 않음. **이번 채팅에서 실PC 등록은 아직 미실행**.
- R48 분리 D1 writer는 별도 `theme-legacy-nine-r37/current` 키 한정, 기존 공개 10개와 중복 날짜 점수는 불변, CAS 및 정확한 readback 계약. **실 D1 요청·게시 미실행**.
- 기존 공개 R37 reader는 R32 원본 계약을 보존하면서 R47 source 계약을 명시적으로 인식하도록 확장. 6개 공개/권리/가격정합/원본검증 승인 플래그 우회 없음. **Cloudflare production 배포 미실행**.
- GetMarketHistory 공식 2026-10-19 약관 §5에서 원봉을 대량 역복원할 수 없는 신호·지표·차트 파생 작품의 배포를 허용함을 확인(https://getmarkethistory.com/docs/terms/). 해당 일반 허용만으로 사용자 계정·타 기초 권리·가격정합·R26 연구용 AUM의 운영 승인을 자동 통과 처리하지 않음.
- 이번 추가 테스트 및 기존 관련 테스트 **7개 파일 PASS, 0 FAIL**. 실제 R47 원본을 사용한 비공개 파일 저장 시험 PASS. 기존 R37 R32 fixture가 로컬에 없어 그 별도 fixture-dependent 테스트는 이번에 제외(기존 코드 회귀라고 판단하지 않음).
- 이어서 필요한 운영 Gate: **실PC Task Scheduler 등록 및 최초 트리거 확인 → R47 같은 거래일·가격·권리·AUM 게시 승인 → D1 전용 키 CAS/readback → main 필요한 파일만 선별 반영 → Cloudflare exact deployment와 공개 API/UI 검증.** 사용자가 다음 거래일 ETF 결측을 직접 모니터링하므로 그것을 이번 코드 브리지 준비의 선행조건으로 재요구하지 않음.
- 구현 정본: [R48 상세 기준서](THEME_NINE_R48_AUTOMATIC_PUBLICATION_BRIDGE_20261028.md). `R48_CODE_READY`는 `AUTOMATION_INSTALLED` 또는 `PUBLIC_DEPLOYED`가 아님.
