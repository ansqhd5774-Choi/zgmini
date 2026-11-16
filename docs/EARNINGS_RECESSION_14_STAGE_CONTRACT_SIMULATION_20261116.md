# ZGMINI 실적 침체 R1~R6 — 14단계 작업·선행조건 시뮬레이션 (2026-11-16 KST)

> 사용자 직접 지시: "14단계 작업 시뮬레이션해서 결함 찾아라." **실제 Runtime 14단계 실행 아님**. 기존 GitHub 코드/승인 계약/과거 PC 영수증으로 만든 **결정론적 단계 선행조건 시뮬레이션**. 금번 기능/운영 변경 0, 문서 1파일. 본 14단계는 현재 확보된 4개 정보성 지표군의 완료 계획이며 신규 공급자 개수 제한 없는 R1~R6 전체가 14단계로 종료된다는 뜻 아님.

## 1. 현재 확인된 원본과 재사용 범위
- 전용 branch `codex/api-site-integration-r1-20261026` 작업 시작 SHA `39a72229f2b737580b1072db645e274d3f7fae93`.
- 조사 중 `zgmini/main` HEAD `a165cdf36b9f1235b2e5a8acc5431e34f87652cd`, 제어 `zgmini-pc-control/main` `4655ebe18e975f85c87faa01c8efbcc595292ce3` (특정 조회 시점 한정; 각각 빠르게 바뀔 수 있음).
- 원계획 [R1~R6](EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md), [작업 노하우](EARNINGS_API_SITE_WORKING_KNOWHOW_R1_20261027.md), [Census R5 선별 main](EARNINGS_CENSUS_QFR_R5_SELECTIVE_MAIN_RECOVERY_20261028.md), [BLS WPSFD42](EARNINGS_BLS_SERVICE_PPI_WPSFD42_INTEGRATION_R1_20261027.md), [BEA 제조업 R6](EARNINGS_BEA_MANUFACTURING_PROFITS_R1_READONLY_20261028.md).
- 기존 실제 PASS 재사용: BLS 원천 3개→정보성 5행 2026-10-27 공개 GET READY; Census QFR ZIP PC SQLite append/readback + 2026-Q2 원본 계산 15.599418144173285%, 2026-Q1 14.03708175763798%, +1.5623363865353053%p; QFR 관련 15개 main source 선별 반영; QFR UI/Reader PR [#958](https://github.com/ansqhd5774-Choi/zgmini/pull/958) merged; BEA 제조업 2026-Q2 원본 CSV 2파일 append-only PC 실행 **보고**; BEA unit PC read-only preflight (원자료 독립 원장 저장/게시 아님); control B 게시기 기존 fixture 16/16.
- 실운영 GET 새 관측: `/api/earnings-recession-indicators`, `/api/earnings-recession-census-qfr-margin`, `/api/earnings-recession-bea-unit-profit`, `/api/earnings-recession-bea-manufacturing-profit` 4 URL 모두 현재 web 도구에서 `URL_NOT_ACCESSIBLE_VIA_TOOL`. **이것은 서버 HTTP 오류 증거가 아니다. 동일 무료 GET 반복하지 않음**.

## 2. 14단계 dry-run 선행조건/첫 미충족

| # | 기존 단계 | 기존 완료점 재사용 | 첫 미충족 Gate (실제 오류로 가장 금지) | 판정 |
|---|---|---|---|---|
| 1 | BEA/QFR 공통 게시 경로 | PR #77/#112 격리 코드/16/16 | [control PR #112](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/112) `draft=true,merged=false,mergeable=false`. 기존 정규 Writer B exact scope/운영 설치·실source/manifest 확인 전 미승인 적용 불가 | **BLOCKED_PUBLISH_LANE** |
| 2 | Census QFR D1 게시·readback | PC SQLite/계산, main Publisher/Reader 존재 | 현행 게시기 clean publisher main/운영 root `config.source` gate + 권한, QFR 정확키 D1 실제 쓰기/readback 미실증 | **READY_SOURCE, NOT_RUN_RUNTIME** |
| 3 | QFR Production API/UI | main Reader+UI 선별 병합 #958 | 현행 D1 row/정확 Production deployment SHA/브라우저 값 미검증. D1 row 없으면 Reader는 `STORED_PROJECTION_PENDING` 503(조건부, 실제 현재 HTTP 상태 아님) | **DEPENDENT** |
| 4 | BEA 단위이익 원천 확인 | 이전 FRED CSV dry-run + 0.250/0.231 시점값 | 이 원천을 SQLite/불변 raw lineage 저장→재조회한 적격 영수증 없음. BEA official API 대신 FRED 미러/권리·개정·단위 provenance 별도 확인 | **GAP_SOURCE** |
| 5 | BEA unit D1 게시 | main Publisher/Worker 있음 | `EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs`의 apply가 **실시간 `fetch(UNIT_PROFIT_CSV)`**→raw 파일 쓰기→같은 프로세스 계산→D1 게시. 승인된 '원자료 사전 저장→저장 자료 계산→승인 게시'로 분리되지 않음; 기존 BEA/QFR B 계약 외 실제 게시 미확인 | **DESIGN_DEFECT** |
| 6 | BEA unit API/UI | main stored-only Reader/UI 있음 | 실제 D1 readback/공개 GET/UI 없음; FRESH 여부도 현재 미확인 | **DEPENDENT** |
| 7 | BLS 서비스 PPI WPSFD42 PC 저장 | 2026-10-27 공식 공개 API v1 원값·분리 Collector/계산 source branch 구현 | 기존 운영 PC 승인된 services-only 실제 수집→SQLite append/readback 결과 없음 | **NOT_RUN_PC** |
| 8 | WPSFD42 2행 D1 게시 | 전용 branch `EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs`와 별도 checkpoint 구현·격리 검사 | 현재 **main에서 Publisher 파일 404**, `worker/earnings-companion-c-r4.mjs`에는 서비스 snapshotKey/Reader 없음. 별도 키 운영 승인·WPS 전용 publisher 허용 범위·PC stored raw 확보 필요 | **BLOCKED_SOURCE_INTEGRATION** |
| 9 | WPSFD42 API/UI 7행 | 브랜치에는 서비스 합성 Reader/라벨 구현 | 현재 main UI `costIndicators`가 기존 5개 정적 배열이고 Worker도 3개 series만 허용. **D1만 쓰면 7행 화면이 자동으로 나오지 않음** | **BLOCKED_MAIN_UI_READER** |
| 10 | BEA 제조업 이익 archive readback | PC archive `APPEND_ONLY_SOURCE_STORED` 보고와 SHA · R6 읽기 코드 있음 | 코드가 실제 PC archive CSV/JSON을 열어 SHA·metadata·rowCount·freshness 검증한 현행 영수증 없음. 과거 PC 저장 **보고**≠R6 독립 readback | **NOT_RUN_READBACK** |
| 11 | BEA 제조업 이익 D1 게시 | `main`에 R6 one-shot Publisher/Worker 및 별도 키 있음 | #112 B 계약은 이 키를 지원하지 않음. 별도 정확키 Writer B 승인/기존 공통 게시기 재사용 범위+R6 archive readback 필요 | **BLOCKED_PUBLISH_SCOPE** |
| 12 | BEA 제조업 API/UI | main stored-only Reader·화면 포함 | 실제 D1 /현행 API status / exact Cloudflare source SHA/브라우저 UI 미검증 | **DEPENDENT** |
| 13 | 전체 회귀·선별 통합·배포 | QFR main reader/UI source 존재, E1-R4 점수 불변 | '13단계에 모아서 main 통합' 순서는 WPS의 8/9 단계 전제와 역전. **WPS Reader·게시기·UI는 해당 D1 이전 선별 CI/합법 배포** 필요. 정확 Production Deployment 별도 검증 | **ORDERING_DEFECT** |
| 14 | 다음 자연 갱신 관찰 | 기존 예약 흐름 보존 | 공급자 실제 신규 발표가 발생해야만 관측 가능. 사용자·프로젝트 R6 지침상 **모든 현재 구현을 먼저 완료**하고 별도 자연 갱신 검증으로 두며 당일 완료의 허위 STOP/Gate로 만들지 않음 | **DEFERRED_FOLLOWUP** |

**판정 용어:** `BLOCKED` = 현행 해당 실행의 승인·소스·운영 필수 전제가 없음; `DEPENDENT` = 전 단계 실데이터/배포의 결과 대기; `NOT_RUN` = 실제 실행·검증 자료가 없음. `DESIGN_DEFECT` = 실제 코드 순서의 아키텍처 불일치. 실운영 수집 실패 코드나 API 503을 새로 '관측'했다고 주장하지 않는다.

## 3. 핵심 구조 결함 6건과 최소 해법

1. **C1 (P0):** #112 `draft/open/mergeable=false`; 구 16/16 fixture는 실제 Windows B 설치·승인/manifest가 아님. **기존 설치된 정규 Writer B 범위 확인 → 없다면 2-key exact scope를 기존 공통 계약으로 최소 선별 등록**, 운영 변경 승인은 중앙 원본으로 판단. #112 무조건 전체 merge 금지.
2. **C2 (P0):** `scripts/pc-writer/EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs` apply가 저장 자료만 읽는 순수 게시기가 아니라 공급자 CSV를 다시 **fetch**해 곧바로 raw→calc→D1. 저장형 수집기와 계산/게시 책임 분리가 필요. 비밀·원자료·SQLite 변경은 사전 승인 없이 하지 않으며 BEA 원천/FRED 미러 적격성도 확인. BEA unit preflight만으로 PC 저장 원자료 PASS 주장 금지.
3. **C3 (P0):** WPS 서비스 전용 게시기(브랜치 있음)가 `main`에 **없음**; Worker의 원래 main blob은 3개 BLS Series만 허용. WPS 2행 실게시 전에 **기존 branch 정확 source 2+관련 테스트/승인 계약을 선별 통합**, 전체 장기 브랜치 병합 금지.
4. **C4 (P1):** WPS main `app/earnings-recession/earnings-risk-only-panel.tsx`의 `costIndicators` 고정 5행. Reviewer 승인 선별 UI와 Worker 합성 적용 후 실제 7개 확인 필요.
5. **C5 (P1):** #112 B 게시 정확 대상은 **BEA unit + Census QFR 두 키뿐**. WPS·BEA 제조업은 다른 키, 이 경로에 편승/우회 금지. 기등록 공통 사용 가능 범위 확인 후 각 exact key 승인/manifest 및 독립 readback.
6. **C6 (P2):** 원계획 #13 '전체 선별 main 통합'을 마지막으로 배치한 순서 오류. WPS의 #8/#9 이전에 최소 source main 통합+Cloudflare Git Integration 배포 확인이 필요할 수 있음. #14 다음 정규 갱신은 사용자 요청 기능 구현을 막는 영구 Gate가 아니라 후속 자연 실증으로 구분.

**중요 미확정:** PC 운영 root/config와 Writer installed source, DB/D1 원문, Cloudflare Production deployed SHA, BEA unit 공식 원천 계약/권리, WPS 별도 D1 게시 권한, BEA 제조업 archive 직접 readback. 해당 미확정 항목은 결함/오류 확정이 아니다.

## 4. 결정론적 3시나리오 선행조건 시뮬레이션

- **A 현재 관측만:** 14/14 단계가 적어도 하나의 *아직 미충족된 종료 요건*을 갖고 있음 (미완료 상태에 대한 Boolean gate 평가이지 14개 실패가 실제 발생했다는 뜻 아님). #1 실행 입구 `B-WRITER-APPROVED/INSTALLED` 미확인. **현재 직접적인 FIRST BLOCKER는 #1의 게시 범위·설치 증거 부재**.
- **B 게시 2-key 경로만 승인·설치된 가정:** #1 선행조건만 채워짐. QFR #2의 D1 실제 결과, BEA unit 원자료 계보, WPS source main 반영, 제조업 archive proof 등이 계속 비어 있어 **'게시자만 활성화하면 전부 끝난다' 주장은 반증**.
- **C 게시 2-key + WPS source 선별 반영·서비스 키 승인까지 끝난 가정:** #1 선행조건과 #8/#9 **코드 통합 항목만** 충족. 여전히 WPS Windows 실제 SQLite 저장, QFR/BEA/QFR의 D1 실readback, 제조업 범위 승인, 현재 API·배포·실화면 증거가 없어 14단계 전체 완료는 아님.

한 단계가 다음 단계를 막는 구조이므로 `14/14`는 단계별 **종료 요건 미충족 개수**다. 성공률이나 코드 실행 실패율로 계산하지 않는다. 현재 14개 각각의 PC 실작동을 모의 재현·확인한 것은 아니다.

## 5. 수정된 실행 순서 (원래 14단계 번호 보존, 내부 선행조건 선제 배치)

1. **우선 QFR 경로:** `#1` 기존 공통 Writer B 기등록·승인·실소스/실설치 여부를 확인하고, 있으면 바로 재사용. 없으면 정확히 QFR+BEA unit에 한정한 기존 승인 수신 경로의 최소 조정. 그 다음 `#2` QFR 원문 저장 기반 D1 readback, `#3` 공개 GET/화면. **다른 소스의 수집과 Reader 개발은 병렬 독립 가능**.
2. **BEA 단위이익:** `#4` 확인된 BEA 단위이익 원본을 공식/미러 provenance와 저장 계보로 확정. 게시기 `#5`는 재fetch 단일 명령 경로를 그대로 쓰지 않고 승인 원자료 저장→저장자료 계산/공개 게시로 분리. `#6` 실API/UI 값.
3. **WPS 서비스:** `#7` 첫 허용 PC 수집/저장 → **#8에 앞서 누락된 main publisher/Worker+UI 소스 선별 통합·관련 테스트·승인** → 이 키의 별도 Writer 허용 범위 확인 후 #8 D1 독립 게시 → #9 API에서 기본5+신규2 및 화면 실제 7행.
4. **BEA 제조업:** `#10` 기존 E: archive 파일/메타 SHA direct readback → #11 전용 키 승인된 B scope/게시 및 정확 재조회 → #12 API/UI. FRED CSV 2026-Q2 정보성 PIT가 아님.
5. **통합·운영:** `#13`에는 이미 선행한 최소 source merge를 재실행하지 않고 남은 Production deployment identity·모바일·4요소 불변·결측/stale·버전/갱신 회귀만 집계. `#14`는 독립 **DEFERRED** 자연 발표·갱신 관측. 구현 완료 후 사용자가 원하는 시점에 검증.

## 6. 종료 상태
- 코드·실행 상태 변경: 0. 신규 Runtime 실패: 0 observed. 이 보고서로 운영 미완료 상태를 0%/100%라고 임의 환산하지 않는다.
- **LAST PASS:** QFR PC SQLite 저장·stored calculation, 기존 BLS 5행 과거 GET READY, QFR reader/UI main, BEA MFG PC raw archive 보관 보고, #112 격리 fixture 16/16.
- **FIRST FAIL (실제 이번 작업):** 없음. **FIRST BLOCKER (다음 실행):** #1 exact-key 보호된 B 게시 경로의 승인·실설치 증거 미확보.
- **다음 필수 실행 하나:** 중앙 승인된 운영 Writer Owner가 **기존 공통 B 게시기/정확 2키(QFR+BEA unit)의 허용목록·실제 PC 설치 SHA·승인 manifest·source binding**이 유효한지 재사용 가능한 기존 영수증으로 확인하고, 그 결과에 따라 QFR 1키 게시의 정확 최소 실행 계약을 확정. 새 workflow/CMD/Runner/임의 SQL/D1 apply는 수행하지 말 것.

> 결과는 시뮬레이션/인계 문서이며 타 일반챗 자동 수신/실PC 게시 성공 증거가 아니다.
