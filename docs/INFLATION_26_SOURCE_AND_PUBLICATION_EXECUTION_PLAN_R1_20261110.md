# ZGMINI 물가지표 — 26개 원자료 확보·공개 완료 실행계획 R1

- 작성: 2026-11-10 KST
- 작업 브랜치: `fix/economic12-inflation-legacy4-r35-20261021` (`ansqhd5774-Choi/zgmini`)
- 개발 정본: `zgmini` 최신 `main` (계획 작성 시 확인 SHA `643b7c7c4372ffad552443fc312c6cb1b944e2fc`)
- 운영 절차 정본: 비공개 `zgmini-pc-control` 최신 `main`의 `AGENTS.md`, `docs/GENERAL_CHAT_START.md`, `docs/PC_AUTOMATION_STANDARD.md`, 공용 인계·자원 수명주기 계약
- 근거: 기존 [미등록 11개 검토](INFLATION_MISSING11_REGISTRATION_REVIEW_R2_20261108.md), 제어 PR #1205/#1211/#1212, 소비된 B #1177, 기존 PC A #830, 사용자 제공 물가지표 최종 인계
- **시작/계획 반영 종료 전체 기능 진행률: 42% → 42%.** 문서·소스 검증을 실제 수집·게시로 산입하지 않는다.


## 0. 2026-11-13 현행 작업 재개 기준 — #996 전역 차단 정정

> **진행률은 실제 물가지표 작업 42%, 원자료 23/26·공개 4/7로 유지한다.** 아래 §7·§8의 2026-11-10 당시 `#996 복구 완료 전 모든 물가지표 A/B 신규 작업 금지` 표기는 **현행 범위에 적용하지 않는 과거 대기 판정**이다. 2026-11-12 운영 PC 실제 R10 Writer B 설치·A readback 성공, 설치 Controller의 4개 기존 기능 A allowlist, 최신 제어 `main`/프로젝트 R6.0의 위험도별 구분에 따라 수정한다. 단, #996의 C급 유지보수 원본 잠금·공유 Controller 설치에 대한 NO-GO는 **그 자원만** 유효하며 허가 없는 우회·직접 수정은 금지한다.

**원담당이 즉시 실행할 다음 기능 단계 (승인 범위):**
1. 완료된 4/7 공개를 다시 게시하지 않고, **공식 BLS 2개 + Census 1개** 수집에 필요한 PC Task→VBS→Node→공유 `local-cycle.lock`의 *실제 소유·canonical 경로*만 원본 결과에서 정밀 확인한다. 소비된 [B #1177 / Run 42714127327](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1177)은 `INFL_MANUAL_B_CORE_OWNER_NOT_OBSERVED_STOP`, 공식 GET 0·원자료 쓰기 0. 동일 requestId 재실행은 금지.
2. **독립 A 수행과 신규 A 미설치를 구분:** 현재 마지막으로 검증된 운영 설치 Controller `badad9124157879d7a645b64f2768113d632355b`에는 `core-runtime-source-readonly`, `inflation-candidates-runtime-readonly`가 기존 A로 등록되어 있으나, 210초 연속 `inflation-core-lock-observation-readonly`는 최신 control `main`에만 있고 운영에는 **미등록**. 이 미설치 operation만 `AUTOMATION_BLOCKED`. 과거 Core 단발 A Issue 9건 중 **7건은 원본 bot 영수증이 있었으며, 그 7건 모두 `CORE_NO_ACTIVE_TASK_ENGINE`**이었다. 나머지 #1213/#1219는 bot 결과 영수증이 없어 실행 결과 미확인이다. 같은 순간 A 반복은 소유권 증거를 보장하지 않는다. 새 운영 A 등록은 해당 Controller 설치의 정규 Owner·기존 승인/lease·#996 C 범위와 실제 충돌 여부를 **그 설치 효과에만** 적용한다.
3. **정적 수집 경로 대조 완료:** `zgmini/main`의 `scripts/pc-writer/install-local.mjs`는 Core **5분 간격**, Korea **1시간 간격**, 모두 `local-cycle.mjs --publish`(Korea는 `--korea` 추가)로 launcher를 생성한다. `core-runtime-source-wmi.mjs`의 `--publish` allowlist 자체는 이 설치기 계약과 일치하므로 **그 인자를 근거 없이 삭제·완화하지 않는다**. 실제 Windows Task·launcher가 현행 파일과 다를 가능성은 실제 원본 readback으로만 판정. `local-cycle.mjs`는 Core/Korea 공유 `local-cycle.lock`을 사용하지만 Korea가 #1177 실패 원인이었다는 증거는 없음.
4. **공식 자료 확인은 PC 수집이 아님:** [BLS 공식 `cu.data.12.USHousing`](https://download.bls.gov/pub/time.series/cu/cu.data.12.USHousing)은 최신 파일이 약 2.7MB로 승인 8MB 한도 내이고 두 CPI 시계열이 존재. [Census 공식 M3 Total Inventories](https://www.census.gov/manufacturing/m3/historical/timeseries.html)의 링크는 승인된 `naicsinvp.xlsx` 경로와 일치한다. XLSX 내부 시트 `m3-outp-invp`/선택행 `AMTMTI`는 웹 검사로 **미검증**; 실제 승인 PC의 고정 파서가 다운로드 후 검증해야 한다. 파일이 보인다는 이유로 `26/26` 저장 완료를 주장하지 않는다.
5. **안전한 다음 실제 쓰기:** Task/Core 소유권의 인증된 증거·정확한 source/preimage/manifest·기존 Writer/Core 독점 잠금 조건이 모두 통과한 경우에만 기존 승인 범위의 **새 고유 단회 B**로 실제 GET→파싱→기존 PPI 원자료 보존·2개 JSON 저장/원격 결과쌍 재조회→저장 자료 기반 계산→D1/API/UI 7/7을 진행한다. 09:00 실행 시각·새 자동 예약·인위적 B 실패·#996 복구 완료를 별도 선행 Gate로 만들지 않는다. 소유권 증거가 없으면 *그 B 실행만* `BLOCKED`, 독립 공개 브라우저/연결 검증 및 기존 다른 기능 작업은 계속한다.

**원본 진단·정규 인계:** [#1177의 2026-11-13 후속 조사](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1177#issuecomment-6830069503), [공통 #68 원담당 인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6829732572). 이 문서의 source-only 수정은 실제 원담당 일반챗 수신, Controller 설치, PC 수집·게시, C급 복구의 성공 증거가 아니다.

## 1. 목표·분모·현재 상태

원본 후보 31개 = 기존 연구자료 19개 + 신규 수집 대상 7개 + 정의/권리 보류 3개(#15·#17·#30) + #26과 통합 1개(#27) + 제외 1개(#20). **기능의 현재 수집 목표는 중복 없는 26개(19+7)**이며, 보류 3개를 무단 추가하거나 26개 확보의 선행조건으로 삼지 않는다.

| 증거 단위 | 현재 실증 | 최종 목표/해석 |
| --- | ---: | --- |
| 원본 31개 판정 | 31/31 | 확정·보류·제외 구분 유지 |
| 신규 7개 PC source 설치·활성화 | 과거 7/7 | 현행 파일·승인 SHA는 실제 실행 시 좁게 확인 |
| PC 유효 원자료 | **23/26** | **26/26**; 누락 BLS 2 + Census 1 |
| 신규 7개 중 유효 사설 원자료 | **4/7** | **7/7**; 원자료 readback 필수 |
| 신규 7개 Production API·데스크톱 UI 값 공개 | **4/7 직접 확인** | **7/7 실제 값·날짜 검증** |
| 전체 프로젝트 추산 진행률 | **42%** | 현장 증거 확보에 따라 재산정 |

누락: BLS CPI 임대료 `CUSR0000SEHA`(#22), 자가주거비 OER `CUSR0000SEHC01`(#23), Census M3 제조업 총재고 `MTM/TI`(#28). 기존 4/7은 EIA 휘발유, Treasury 관세 순수납, BLS PPI `WPSFD4`, Fed G.17 제조업 생산이다. `INVALID`/`MISSING`을 0이나 추정값으로 대체하지 않는다.

`zgmini/main`에는 신규 7행 공개 validator/reader, 전용 writer, `run-local.mjs`의 `publishInflationCandidates7Auto` 연결, `worker/candidate-r52.ts` GET/HEAD 분기, 물가 상세 UI의 `InflationCandidate7Inputs` 연결이 **source 수준에서 이미 확인**되었다. 오래된 작업 문서의 'main 미회수·라우터/UI 미연결' 표현은 최신 source에 그대로 적용하지 않는다. 이 source 확인만으로는 **설치·Cloudflare Production·D1 실제 값을 입증하지 못한다**. 아래 6절의 별도 실제 공개 관측을 구분한다. 오래된 기능/UI 브랜치 전체 병합 금지.

## 2. 개정 공통 지침의 적용

1. 시작·재개 시 제어 저장소 최신 `main`의 지침 3개와 본 업무 관련 승인/변경 범위를 확인하되 **학습만 반복하거나 전체 Controller 진단을 전역 Gate로 삼지 않는다**.
2. 수리 가능한 **확정 Writer B 실패**만 격리 Windows `zgmini-handoff-ci-isolated`→`agent-handoff`→단일 중앙 ChatGPT→**원본 GitHub Issue** 회신으로 처리한다. 정상 `PASS`, `WAIT_RECORDED`, `STATE_UNKNOWN`을 가짜 수리 장애로 만들지 않는다. 인위적 실패·기존 B #1177 재실행 금지.
3. 원본 Issue 댓글은 이 일반챗의 자동 수신/재개, 운영 PC 설치 또는 원자료 변경의 증거가 아니다. 실제 대화 재개 시 해당 원본 결과를 확인해 기능 작업을 계속한다. 자연 발생 장애 전체 왕복은 **DEFERRED**, 물가지표 기능 완료의 Gate가 아니다.
4. 공유 Controller/Writer/Core source의 **실제 겹치는 쓰기만** 단일 owner·lease로 직렬화한다. 독립 source·read-only 준비와 신규 7행 게시 증거 분석은 계속한다. 공용 원장 #68은 PC 잠금 해제 근거가 아니다.

## 3. 필수 실행계획 — 두 개의 독립 작업 축

### A. 누락 공식 원자료 3개 복구 (실제 PC 실행 축)

| 순서 | 수행 | 정확한 통과 조건 | 실패·대기 처리 |
| --- | --- | --- | --- |
| A1. 현재 운영 입력 확인 | 기존 승인된 A/read-only 경로로 설치된 Controller A operation 존재, 실제 PC source/config/Task·Core/Korea 런타임 경로와 `E:\ZGmini\data\pc-writer\local-cycle.lock`의 **canonical 동일성**을 필요한 범위에서 검증. 예약 Task의 실제 런타임을 Runner 환경으로 추정하지 않음. | 원본 Issue/Run·JSON/TXT의 SHA·관측 시각·출처 및 실제 잠금 소유 근거 일치. 정적·순간 A 관측만으로 B 승인 선언 금지. | A 미설치 또는 소유 미관측이면 `UNVERIFIED`; 새 임의 shell, lock 삭제, Task 정지·경로 추정 금지. 이 축만 대기. |
| A2. 오류에 한정한 수정 | A1로 입증된 **잘못된 검증기 조건만** 최소 수정. 실제 Core/Korea 공유 lock, Writer mutex, CAS·해시·백업 및 fail-closed 보호 유지. | 같은 Windows 경로의 관련 회귀 PASS와 새 입력 manifest/source 검증. | 단지 시간이 지나도록 Core 소유자를 못 본 사실을 잠금 오설정 또는 Core 실패로 단정하지 않음. |
| A3. 공식 수동 단회 B | 기존 승인 `inflation-manual-b`의 고정 BLS flatfile과 Census 공식 원본 **두 GET**을 새 고유 Issue/requestId·현재 해시 manifest로 1회 실행. Core 자연 활동 관측 후 실제 유휴·잠금 안전 확보. | **BLS 2 + Census 1** parse/store 원본 보호·checkpoint/JSON 2파일 재조회·결과 TXT/JSON 2/2 및 실제 원본 Issue 성공 영수증. | **09:00·다음 날·자연 예약 수집 대기 없음**. 안전 중단 시 실제 code/lastPass/firstFail/쓰기를 기록. #1177이나 불명확 요청 재실행 0회. |
| A4. 완전성 검증 | 기존 23개를 보존하며 새 3개가 정확한 series/월/단위·관측일·수집일·source SHA·last-good와 함께 읽히는지 현장 확인. | **26/26 원자료 유효**, 신규 7/7 저장·재조회. PPI 등 기존 정상본 무변경. | 특정 공식 파일에 자료가 실제 없다면 `MISSING`으로 정직하게 보고하고 별도 보류/제외 결정을 사용자에게 요청; 임의 수치 채움 금지. |

`#996` Controller 업데이트는 **별도 원담당이 맡는 공유 설치/복구 자원**이다. #917 과거 완료를 #996 완료로 추론하지 않는다. #996의 C 증거 예외 승인이 존재하더라도 운영 설치·보호/Workflow 복구 PASS까지는 원본 증거가 필요하다. 이 문서의 작성자가 #996 lease·Workflow·backlog·잠금을 바꾸거나 B를 중복 요청하지 않는다. 독립 작업은 계속한다.

### B. 신규 7개 연구자료 공개 (A와 독립적으로 준비·진행)

| 순서 | 수행 | 정확한 통과 조건 | 분리 원칙 |
| --- | --- | --- | --- |
| B1. 정본 source 연결 검토 | 현행 `zgmini/main`의 `run-local.mjs` 7행 sidecar, 기존 공통 Writer 게시 경로, `candidate-r52.ts`, UI 컴포넌트·catalog 실제 연결과 배포 기준 SHA를 확인. 승인된 19행·4축 불변 회귀만 수행. | 현재 main source·테스트·승인된 게시 계약 일치. | 이미 연결된 코드를 불필요하게 재개발·전체 브랜치 병합하지 않음. |
| B2. 저장 기반 계산·정상행 우선 게시 | 실제 PC **저장 자료만** 읽어 7행 `score:null` projection 생성. 기존 유효 4개는 관측·갱신 상태에 맞춰 READY/STALE로 게시하고 누락 3개는 PENDING/기존 유효본이 있다면 원래 날짜를 유지한 STALE. 승인된 기존 Writer B 게시 lane 사용. | 전용 D1 key `detail:inflation-causal-candidates-7:r1`, 기존 19 key/4축 무변경, 공개 7행 전수 상태·값·원래 관측일·`sourceStoredAt` readback. | **26/26 확보 전에도 4/7 기존 유효값을 화면에 표시할 수 있도록** 독립 처리. 실패값 0 치환·마지막 유효 결과 덮어쓰기 금지. |
| B3. 3개 확보 뒤 완성 게시 | A4 성공 후 새 3개 저장 자료를 사용해 동일 기존 계산→Writer→D1 재게시. 공급자 GET을 계산 중 재호출하지 않음. | 7/7 READY 또는 공식 발표·stale 기준에 따른 정직한 상태, D1 값·버전·checkpoint·시각 정확 재조회. | Core scheduler/DB/TTL/가중치/배포 경로 무승인 변경 없음. |
| B4. Production 공개 판정 | GitHub 배포 repo/branch/SHA→Cloudflare Git Integration exact Deployment 확인, `/api/inflation-candidate-inputs` GET/HEAD, 물가 PC·모바일 화면 각 값/단위/날짜/결측/STALE 마지막 점 확인. | D1·API·UI 동일 7행, 관측일·수집일·게시일 구분, 19개·4축 회귀 유지. | HTTP 200·READY 외피만으로 완료 선언 금지. 데이터 게시마다 재배포·Git push 강요하지 않음. |

실행 병렬성: B1/정적 B4 검토는 A1~A3와 독립적으로 수행 가능. **실제 동일 Writer/DB/D1 공유 쓰기**는 owner·lease 승인 순서에 따라 직렬 실행한다. B2는 A4 전에 승인된 PARTIAL 공개 계약으로 실행 가능하며, B3는 A4 완료 후 진행한다.

## 4. 승인·보호·의사결정 경계

- 사용자가 승인한 공개 범위는 **연구자료 별도 7행** 및 기존 D1 key/GET/UI 표현뿐이다. 기존 19개 원자료, 4축 물가 점수, 가중치, DB/TTL, 수집 주기, 예약, DNS, 공개 path의 임의 변경 금지.
- #15 관세율, #17 관세 노출 비중, #30 자체 공급 부족 산식은 **DEFERRED**. 별도 정의·권리·산식 결정 전 공개 점수나 26개 수집 목표에 넣지 않는다. #27은 #26과 원본 중복.
- 공유 운영 설치·잠금·환경·source에 대한 새 범위의 효과만 추가 승인을 확인한다. 기존 동일 보호 목적의 상시 승인을 반복 요청하지 않는다. A급에 B급 쓰기 권한을 넣지 않는다.
- 승인된 BLS/Census 수동 수집에는 **시간대 09:00 Gate, 매일 자동 예약, 새 CMD, ChatGPT 일정**이 없다. 공식 호출량·기존 quota와 원본 파일 크기 제한은 유지한다.
- 원본 키·전량 원자료·환경변수·process 명령행·민감한 운영 경로를 GitHub Issue/댓글/공개 DB/채팅에 올리지 않는다. E: 지속 DB/원본은 보존하고 일회성 출력은 TEMP/승인된 결과 회수 경로 사용.
- 자동 장애 인계의 자연 E2E와 정규 예약 첫 자동 갱신 검증은 **모든 기능 수집·계산·저장·게시·화면 완료 이후 후속 관측**이다. 선행 Gate 아님.

## 5. 다음 실행 하나와 증거 갱신 규칙

**즉시 다음 실행:** 최신 `main`에 이미 존재하는 7행 `run-local`·Worker 라우트·UI 연결의 정본 SHA와 현재 실제 설치/Production 범위를 대조하여 **첫 승인된 기존 Writer 게시 실행에 필요한 정확한 manifest·source/lease 조건**을 고정한다. 이 확인은 읽기/정적 준비이며 #996 복구 담당의 공유 자원에 쓰지 않는다. 동시에 A1 잠금 경로 관측 operation의 현재 Windows 설치 가능 여부만 좁게 확인한다.

그다음 안전하게 실행 가능한 첫 실작업을 선택한다: 게시 B 경로가 준비되면 **기존 유효 4개 READY/STALE + 누락 3개 PENDING(과거 유효본 확인 시 STALE)**의 7행 첫 공개를 수행하고 D1/API/UI를 검증한다. 수동 공식 B의 Core 잠금 소유 증거가 충족되면 **새 단회 요청으로 3개 확보**를 수행한다. 두 축 중 하나가 실제 차단이면 다른 축을 계속한다. 새 정상 실행을 인위적 자동 장애 검증으로 바꾸지 않는다.

모든 단계별 결과는 `DONE / RUNNING / STATE_UNKNOWN / BLOCKED / DEFERRED`, 대상 source SHA, 원본 Issue/requestId/Run, 실제 PC 결과쌍, lastPass/firstFail, 저장·D1·API·UI readback을 분리해 후속 기록한다. 진행률은 **실제 완료한 단계만** 가산하며 문서 작성 후 **42% 유지**. 각 재개 시 이 계획과 마지막 실증 단계에서 다음 실행 하나를 선정한다.

## 6. 실행 개시 후 확인 — Production 4/7 공개 (2026-11-10 KST)

- **실제 조회:** `https://zgmini.kr/api/inflation-candidate-inputs`는 `schemaVersion=inflation-causal-candidates-7-r1-v1`, `status=PARTIAL`, `score=null`, `sourceVersion=INFL7_PRESENTATION_c891b9b21dc39a33c88acd08692bbdc2d9278e32881ec4759b09ec42cbd10231`, 정확히 **7행**을 반환했다. `READY` 4개는 #2 EIA(4.153 USD/갤런, 2026-11-02), #16 Treasury(5,910,402,249.78 USD, 2026-09-30), #24 BLS PPI(159.78, 2026-09-01), #29 Fed G17(99.4361, 2026-09-01). `PENDING` 3개 #22/#23/#28은 `value:null`, `history:[]`, 관측일 null로 유지한다.
- **실제 UI 관측:** `https://zgmini.kr/economic-indicators/inflation/` 데스크톱 화면에서 별도 '추가 물가 관련 연구 원자료 (7개)' 표가 표시됐다. 기존 유효 4개 값/관측일·차트, 미확보 3개 대시(—)/'원자료 게시 대기'가 API와 부합한다. 기존 19행 표와 기존 4축 물가 점수 **54.3**도 별도 표시됐다. 모바일 시각 결과는 미확인이다.
- **저장 계약 근거:** `zgmini/main`의 `readInflationCandidates7PublicResponse()`는 D1 `market_public_snapshots_v1`의 `detail:inflation-causal-candidates-7:r1` 행을 조회·본문과 `stored_at` 일치 검증 후 응답한다. 따라서 공개 API는 저장 D1 projection을 서비스하는 것으로 source와 실응답이 정합한다. 다만 **별도 관리자 D1 직접 재조회/실제 PC Writer ledger·설치 SHA/Cloudflare exact deployment** 증거는 이 관측만으로 확보하지 않았다.
- **조치:** 이미 성공한 첫 4/7 공개를 다시 게시하지 않는다. B2의 최초 부분 공개는 관측 범위에서 **DONE(Production API·데스크톱 UI 4/7)**으로 바꾸고, 남은 필수 작업을 A1~A4의 **3개 원자료 실제 수동 수집**, B3의 후속 7/7 갱신·저장 원장 검증, B4의 **모바일 및 정확한 배포/Publisher/D1 재조회**로 좁힌다. 전체 진행률은 기존 산정 근거가 부족하므로 임의 변경하지 않고 **42% 유지**한다.

## 7. 병렬 독립 검증 및 정확한 재개 지점 (2026-11-10 KST)

> **역사적 기록:** 이 절의 당시 ‘#996 C 복구 → 모든 물가 A/B 재개’ 순서는 현재 §0으로 대체한다. 당시 관측된 오류·미설치 사실은 보존하지만 전역 Gate로 사용하지 않는다.

이번 범위는 **승인된 정규 기능의 실제 26/26 수집과 7/7 공개**로 고정한다. 세 독립 담당은 (i) BLS/Census 공식 수동 입력과 파서, (ii) Controller A 진단 실행 가능 여부, (iii) PC 결과·D1/API/UI 공개 증거를 **읽기 전용으로 병렬 조사**했다. 이 조사는 운영 수집·게시 성공을 의미하지 않는다.

| 독립 작업 | 새로 확인한 결과 | 작업 판단 |
| --- | --- | --- |
| 공식 원본·파서 | 기존 PC #987 / Run `42574375718`의 마지막 관측 `2026-11-08T22:45:02.525Z`: CPI #22/#23 `BLS_CANDIDATE_VALUE_OR_DUPLICATE`, Census #28 `CENSUS_M3_HEADERS_INVALID`. 기존 API 경로 BLS 파서는 날짜 중복·비정상 value·음수 등에서 해당 코드를 낼 수 있어, 원본 payload 없는 상태에서 원인 분기를 단정할 수 없다. | 승인된 `inflation-manual-b`는 실패한 API 요청 경로 대신 공식 BLS `cu.data.12.USHousing` flatfile 1회와 Census `naicsinvp.xlsx` 1회를 고정 GET한다. 공식 파일 존재 확인만 완료; **실제 PC 다운로드·파싱·3개 저장은 미실행**. 해당 다른 API 파서를 추정으로 개조하지 않는다. |
| 코드 회귀 | 기존 수동 공식 경로의 관련 테스트 **29/29 PASS** 및 최신 공개 main 7행 검증·Writer·Core 연결 테스트 **27/27 PASS**. | 두 묶음은 검사 대상·실행 조건이 달라 단일 실행 56건으로 오인하지 않는다. Fixture PASS는 Windows 운영 source/원자료·D1 보장 아님. |
| 공통 PC 접수 상태 | 실제 Controller SHA `badad9124157879d7a645b64f2768113d632355b`에 `inflation-core-lock-observation-readonly` A operation 미설치. 제어 main에 등록 source 존재하나 #996 `INTAKE_PAUSED/RUNNER_SET_DRIFT`·`pc-job` Workflow `disabled_manually`·공유 설치 lock. [#996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/996)에서 18항목 중 16 true/2 unproven, C 증거 예외 동의만 존재. | **A1은 `AUTOMATION_BLOCKED`**, 실제 수집 실패 `RUNTIME_FAILED`가 아니다. #996의 중앙 담당 C 복구 PASS/원장·Workflow 재검증 전 물가 신규 A·B Issue 생성 금지. 이 기능 담당이 공유 lock을 직접 해제하거나 이전 #1177을 재사용하지 않는다. |
| 게시 독립 검증 | [#987](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/987) 원본의 `LOCAL_SNAPSHOT_AND_CHECKPOINT_ONLY` 및 `d1Writes=0` 확인. 실제 공개 API·데스크톱 UI 7행 중 READY 4/PENDING 3, 모바일 카드 DOM 7개·<=767px CSS 있음. | B2의 **이미 이루어진 4/7 부분 공개를 재실행하지 않는다**. D1 **직접 관리자 readback/Writer ledger**, Cloudflare exact Production Deployment SHA 및 390px 이하 **모바일 실화면**은 아직 독립 미검증. 기존 19·4축 보존. |

### 담당·입력·완료 판정이 명확한 다음 실행

1. **공용 Controller 단일 담당 (#996, 물가지표 담당 아님):** 현재 공유 복구 진행을 끝내고 `RECOVERY_COMPLETED`·설치 source SHA·Workflow 활성·설치 lock 상태를 원본 Issue/Windows JSON/TXT로 확인한다. *물가 작업의 다음 원격 실행을 허용하는 실제 외부 의존성*이며, 과거 #917 복구 PASS로 대체할 수 없다.
2. **물가지표 원담당 (A1):** #996 재검증 후 단일 기존 설치 승인 경로로 `inflation-core-lock-observation-readonly` operation의 현장 등록을 확인하고, **새 고유 A 요청 1회**로 Core/Korea 실제 실행 경로·Task/Node/E: 잠금 canonical owner를 JSON/TXT 회수한다. 승인 조건 없는 실행 또는 Source 병합만의 성공 선언 금지.
3. **물가지표 원담당 (A2~A4):** 보호 증거의 **첫 실패 코드가 특정되면 그 조건만 수정**; 기존 Writer lock/CAS 원본 보존. 통과하면 새 고유 승인 B 1회로 위 공식 BLS/Census 2개 GET을 **현재 시각에 수동 수행**하고 SQLite 원자료 3개 readback, 신규 7/7, 전체 26/26 확인. **09:00 예약/기다림 없음**. 실패 시 소비된 요청을 재시도하지 않는다.
4. **물가지표 원담당 (B3~B4):** 저장 자료만으로 기존 계산→Writer→D1 projection을 갱신한다. 실제 D1 값·`stored_at`·sourceVersion·checkpoint, API 7행, 데스크톱/390px 모바일 7행과 기존 19·4축을 동일 원본으로 대조한다. 정확한 Cloudflare 배포 SHA/실제 게시 원장은 **본 게시 범위에서만** 확인하며 A1~A4를 불필요하게 막지 않는다.
5. **후속 관측 (DEFERRED):** Writer B 자연 장애의 격리 인계 E2E 및 정규 예약 자동 갱신은 기능 수집·게시 완료 이후 따로 본다. 정상/안전 대기를 가짜 실패로 만들지 않는다.

**이번 점검 후 전체 기능 진행률: 42% → 42%.** 신규 코드 변경 0건, 새 PC 운영 요청 0건, 운영 데이터·공유 lease 변경 0건. 마지막 실제 원자료 23/26, 공개 값 4/7이므로 완료율을 높이지 않는다. 위 1번의 실제 복구 증거가 나오기 전에는 원담당의 A 실행은 대기하되, 독립 공개 검증·기능 source 작업은 계속 가능하다.

## 8. #996 실제 C 중단 이후 상태 분리 (2026-11-10 KST, 후속 재개)

> **역사적 기록:** 당시 실제 C 중단·안전 경계는 보존한다. 2026-11-13 현행 독립 물가지표 진행·특정 설치 제한은 §0으로 판정한다.

- **사용자가 전달한 총괄 대화 최신 결과:** #996 실제 C 복구가 시작됐다가 `STATE_UNKNOWN_PRESERVE_C_CLAIM_AND_ORIGINAL_LEASE`로 중단. 최초 실패 `C_GITHUB_BACKLOG_PLAN_ORIGINAL_BODY_INVALID`, 단계 `ORIGINAL_JOB_DISPOSITIONS`. Workflow 변경 시도 1회, backlog 종료 시도 1회, lease 보관 시도 0회. **시도 횟수는 실제 상태 변경 성공 여부의 증거가 아니다.** 이 결과는 현재 비공개 원본 #996 Issue의 완결된 Windows 사후 JSON/TXT 검증과 별도로 사용자 전달 관측으로 분류한다.
- **실제로 해야 할 일:** #996 단일 Controller 담당자가 기존 C claim/lease 및 GitHub Workflow·backlog/원본 Issue를 **읽기 전용으로** 회수하고 LAST PASS/FIRST FAIL·부작용·정확한 안전 복구 경로를 입증한다. 동일 CMD 재실행·다른 복구 도구 우회·물가 A/B 신규 요청 금지. 확정된 복구 및 설치 operation 가용 여부가 입증된 시점에만 위 7절의 물가 A1→A4를 재개한다.
- **독립 UI 재조회:** Production 물가 페이지의 현재 1363px 데스크톱에서 원자료 19개, 연구용 7개 중 4개 확보/3개 게시 대기, 기존 점수 54.3 확인. 390px 모바일 실제 렌더/오버플로우는 현 브라우저에서 DevTools 접근 제한으로 **미검증**; 반응형 소스/DOM 확인만으로 실화면 PASS를 선언하지 않는다. 모바일 확인과 D1 관리자 readback·배포 exact SHA는 B3/B4의 공개 검증으로 남겨두며, 현재 수동 수집의 전역 Gate로 삼지 않는다.
- 원자료 **23/26**, 공개값 **4/7**, 프로젝트 전체 **42% → 42% 유지**. 이번 재개에서 기능 원본/운영 데이터 변경·PC 요청·Writer/D1 재게시 0건.
