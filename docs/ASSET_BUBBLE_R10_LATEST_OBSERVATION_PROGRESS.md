# 자산 버블 R10 최신 개별 관측치 — 목표·단계·진행률 정본

- 기준일: 2026-11-10 KST
- 기능 저장소: `ansqhd5774-Choi/zgmini`
- 원작업 브랜치: `fix/asset-bubble-r10-latest-observations-20261103` (Draft PR #961). 최신 main 선택 통합: [PR #1050](https://github.com/ansqhd5774-Choi/zgmini/pull/1050) 병합 `a34762f…`; Writer 범위 수정 [PR #1055](https://github.com/ansqhd5774-Choi/zgmini/pull/1055) 병합 `c00eeac…`. 다른 오래된 브랜치 전체 병합 금지.
- 공통 실행/승인 정본: `ansqhd5774-Choi/zgmini-pc-control` 최신 `main`의 `AGENTS.md`, `docs/GENERAL_CHAT_START.md`, `docs/PC_AUTOMATION_STANDARD.md`.
- 범위: **기존 승인 산식/가중치/평가분기·기존 R10 결과를 보존하면서 구성 6개 지표의 검증된 최신 개별 관측치만 현재/이전/관측 추이에 반영.**
- 이 문서는 실행·승인·설치 완료 증거가 아니며, 다른 ChatGPT 대화에 자동 전달되는 메시지도 아니다.

## 1. 최종 통과 조건

1. 6개 지표 모두 **공식 발표된 마지막 유효 관측**의 현재값·이전값·실제 관측일/분기를 표시한다. 평가 분기 이후 새로 공개·검증된 관측이 있을 때만 선택적 `latestObservation`을 추가한다. 발표 가능일·월말 완결성·시장폭 자료품질 등 기존 개별 검증을 통과해야 한다. 미발표 분기는 생성하지 않는다.
2. 종합점수 평가 분기는 현재 `2026-Q2`이며 점수 약 `22.6` 및 가중치·산식·scored/raw/history 기존 계약을 임의 변경하지 않는다. 최신 개별 관측치와 점수 평가 분기를 혼동하지 않는다.
3. PC 공급자 수집 → SQLite/로컬 원자료 저장·재조회 → 저장 자료 기반 계산 → 새로운 결과/checkpoint 로컬 저장 → 기존 게시기로 D1 반영 → 공개 API/UI 재조회가 동일 소스/날짜/값으로 연결된다.
4. 동일 sourceVersion/sourceStoredAt을 덮어쓰거나 날짜·결측치를 임의로 채우지 않는다. PC/모바일에서 현재·이전·날짜·차트 마지막 점을 확인한다.
5. 기능 개발·배포를 모두 완료한 **이후**에만 자연 예약 자동 갱신 검증을 후속으로 수행한다. 과거 Controller 복구, 무관한 전체 테스트, 타 기능의 대기 자체를 R10 기능 완료의 Gate로 추가하지 않는다.

## 2. 6단계 진행률 (동일 가중치 · 2026-11-10 실제 검증)

| 단계 | 완료 조건 | 실제 증거 | 판정 |
|---|---|---|---|
| 1 | 6개 source·기존 점수 계약·평가분기 확인 | 원자료 6개, 평가분기 2026-Q2, 22.5732425점 | **DONE** |
| 2 | 최신 개별 관측치·UI 후보 구현 및 회귀 검증 | 선택 PR #1050(6파일) 병합 `a34762f…`, 단일 보존 분기 수정 PR #1055(2파일) 병합 `c00eeac…`, CI 성공 | **DONE** |
| 3 | 승인된 실제 PC Writer source 설치 | B [#1164](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1164), [#1172](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1172) 설치 검증, PC 운영 SHA `48d3478030590ca63aaab2435e88c896608c70d3` | **DONE** |
| 4 | PC 로컬 저장자료로 계산·현재 유효 관측 6개 구성 | A [#1175](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1175) `RECALCULATED_FROM_SAVED_INPUTS` / `projectionStatus=READY`, ledger VERIFIED, 6개 실제 관측 구성 | **DONE** |
| 5 | 기존 게시기 D1 write/readback와 공개 raw/history API 확인 | #1175 Writer 원장 raw `READBACK_VERIFIED` / history `UNCHANGED_VERIFIED`, 오류 0. `/api/asset-bubble-raw` READY·6 factors·Q3 신규 3개, history PARTIAL(정당한 두 분기 결측) | **DONE** |
| 6 | Git Integration 운영 배포·PC/모바일 화면 값·관측일·차트 확인 | Cloudflare `zgmini-migration-candidate-r5` Production 빌드: R10 PR #1050 `3dd521be`, 수정 #1055 `1a3e3002` 모두 READY. 운영 버전 `e32acd3c` (Git SHA `165a0ddb…`)가 `c00eeac…` 후속 1커밋임을 GitHub compare로 검증. PC/모바일 6개 카드의 실제 값·날짜·마지막 점 및 22.6점 확인 | **DONE** |

**이번 실행 시작→종료 전체 진행률 = 3/6 = 50.0% → 6/6 = 100.0% (+50.0%p).** 기능의 이번 승인 범위(최신 유효 관측치 표시, 기존 종합점수 보존, PC→D1→공개 API→화면)는 완료. 장래 공식 발표 이후의 자연 자동 갱신 관찰은 별도 후속 검증이며 완료 Gate가 아니다. **새 자동 수집 예약 0건**, 임의 Controller/DB/산식/가중치/수집주기 변경 0건.

## 3. 실제 통과 증거와 운영상 한계

- **LAST PASS:** Windows Writer 2026-11-10 **07:30:20 KST** 실행(수정 PC source `48d34780…`), 07:36 KST 기록 검증. 독립 읽기 전용 A [#1175](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1175) / Run `42713659986`, `proofStatus=RECORDED_READBACK_VERIFIED`; R10 계산 `RECALCULATED_FROM_SAVED_INPUTS`, projection·sidecar 모두 READY, 2개 공개 키 확인, failures `[]`. A 자체는 D1을 재질의하지 않아 `productionD1Verified=false`이지만, 실제 Writer `publishAssetR10Sidecars`의 운영 원장에 **D1 사전조회·write 후 재조회** 결과가 기록되고 공개 API에서 동일 값이 조회됐다. A의 증거 수준 `LOCAL_WRITER_CHECKPOINT_ONLY`를 독립 D1 조회로 과장하지 않는다.
- **오류 해결:** 이전 A #1170 `PREVIOUS_RELEASE_PRESERVED`는 모든 projection을 가로채던 범위 누락 때문. `id==='assetBubble'`로 국소 수정한 PR #1055와 B #1172 재설치 이후, 동일 Writer 경로에서 READY로 정상 전환. 다른 Writer 기능·공통 Controller에는 변경하지 않았다.
- **실제 공개:** https://zgmini.kr/api/asset-bubble-raw — `asOfDate=2026-11-09`, `scoreObservationQuarter=2026-Q2`, 6개 요인 `READY`, 종합 22.5732425. **새 2026-Q3 최신 관측 3개:** `priceAcceleration=-5.416628` (2026-09-30), `breadthDivergence=8.220065` (2026-09-30), `excessLiquidity=-0.311295` (2026-07-01). `valuationPressure`·`riskAssetShare`·`speculativeFlows`는 Z.1 Q3 공식 미발표로 **기존 2026-Q2 최신 유효값을 보존**. 3/6 Q3 추가와 6/6 최신 유효값 확보를 혼동하지 않는다.
- **원격 역사:** https://zgmini.kr/api/asset-bubble-history — `status=PARTIAL`, 정확히 `breadthDivergence`의 2025-Q2·2025-Q3 두 과거 분기점 결측. 기존 1년 원자료를 임의 보간하지 않는다. history source metadata가 raw보다 하루 오래된 것은 Writer가 내용 동등성을 검증해 `UNCHANGED_VERIFIED`로 유지한 결과이다. 따라서 현재 원자료 값은 동일하지만 remote 두 sidecar의 metadata 문자가 같다고 주장하지 않는다.
- **배포:** Cloudflare 접속한 계정의 Git Integration `zgmini-migration-candidate-r5` Production 배포 목록에서 사이트 계정·GitHub `ansqhd5774-Choi/zgmini` 연결과 실제 두 R10 commit의 빌드 READY 확인. 현재 활성 `e32acd3c`↔Git SHA `165a0ddbc3d8d0b918eee36e63895bd2a65b24fd`; GitHub compare로 R10 수정 SHA `c00eeac3dbda7bb911c6d639216b214c144e9f6e`보다 **1커밋 후속**임을 확인. 생산 사이트 실제 DOM/모바일 화면과 연결.
- **PC/모바일:** https://zgmini.kr/asset-bubble/ 화면 종합 안전점수 **22.6**, 실제 평가 분기 **2026-Q2** 및 진단 **2026-Q4 PARTIAL**, 구성 6개 이전/현재값·실제 날짜·차트 마지막 점 검증. 모바일 viewport 390×844에서는 화면 가로 overflow **0px**(clientWidth 375, scrollWidth 375). R10 Q3 신규 3요인의 현재 칸 값과 소형 차트 마지막 점 날짜는 각각 2026-09-30·2026-09-30·2026-07-01.
- **다음 필수 작업:** 이번 R10 기능의 추가 설치·재수집·재게시 없음. 다른 기능 담당자 작업을 중단시키지 않는다. 추후 공식 신규 분기 발표 뒤 정상 승인된 기존 주기의 자연 갱신은 **별도 후속 검증**에서 다루며, 사용자 금지에 따라 신규 자동 예약/수집을 생성하지 않는다.

- **후속 안정성 검증 A #1182 / Run `42716263752` (2026-11-10 07:56 KST):** 기존 Core Writer의 다음 실제 기록 `runAt=2026-11-09T22:40:46.815Z`, 소스 `48d34780…` 유지, R10 `calculation=RECALCULATED_FROM_SAVED_INPUTS`, `projection=READY`, `sidecar=READY`; raw/history **각각 `UNCHANGED_VERIFIED`**, failures 0, Writer·ledger VERIFIED. **새 R10 sidecar 게시 0건**인 정상 멱등 처리. 읽기 전용 A는 운영 쓰기 0건. 기존 등록 주기를 관측했으며 신규 예약은 만들지 않았다. 이 검증은 공식 신규 관측 발표 시 갱신 검증과 별개다.

## 3A. 2026-11-09까지의 공유 Writer 차단 이력 — 현행 작업 지시 아님

**다음 필수 행동 = 공유 Writer #1063 복구 원장 대조 및 승인된 정상화(공통 단일 복구 담당).** R10 담당은 같은 B #1066을 재접수하지 않는다.

- **기존 증거 재사용:** R10 두 파일 PC 조회 [#1055](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1055) PASS, 현재 관측 시점 HEAD=config.source `825cfbd6…`, 목표/원본 SHA 확정. 기존 공통 범위 승인 파일을 재사용한 의존성 조회 [#1059](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1059) PASS. 시장 달력 import 파일은 존재하며 GitHub LF↔PC CRLF 차이만 확인. JSON/TXT 2/2 회수.
- **기술적 승인 명세:** R10 2파일만 담은 [control PR #1062](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1062) `main` 병합 `19e80d29…`, manifest SHA-256 `f49412ebb8d396197c32e5eadaee21f5ab095a1f9f1d9f8787921865ff22f7cd`. 후보 `zgmini` SHA `f541efbd…`; 산식·DB·Task·D1 변경 승인 없음.
- **실제 안전 중단:** R10 Writer B [#1066](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1066), Run `42617895258`: `WRITER_B_PREFLIGHT_STOP / WRITER_B_SHARED_INSTALL_BUSY_NOOP_STOP`, JSON/TXT 2/2, 설치 완료 증거 없음. 다른 담당 B [#1063](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1063)에서 `WRITER_B_RECOVERY_REQUIRED / WRITER_B_CORE_REENABLE_SOURCE_PAIR_STOP` 확인. [공통 #68 인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6740260933). 안전 거부 우회·같은 요청 재실행 금지.
- **신규 현재 상태 증거(복구 완료 아님):** 공통 인계 [#1068](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1068)와 A [#1074](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1074), Run `42619627581` 실측: PC HEAD=config.source `434f30d2aa221bddacab5afa09241916618d8e22`, checkpoint.source `825cfbd6e2025940e3e48631e7ff1dddf582e75a`, `sourceIdentityConsistent=false`, trackedDirty=false. Core Task Enabled·Writer B lock 소유·#1063 원장/백업 정합은 미확정. 과거 R10 manifest의 base `825cf…`를 그대로 재실행 금지.
- **복구 후 R10 담당의 바로 다음 실행:** 기존 #1063의 백업·lease·원장과 최신 실제 PC HEAD/config.source가 안전하게 정리됐다는 증거를 회수한다. 새로운 변경 기준이 생겼다면 정확한 before SHA/CAS와 R10 2파일 B manifest만 재산출하여 공통 1회 설치한다. 다른 기능 소스/DB는 변경하지 않는다. 그 뒤 **신규 검증 체크포인트 → 로컬 결과 → D1/API → PC·모바일**을 순서대로 확인한다.
- 공유 Writer 실제 쓰기만 직렬화한다. 독립 코드/조회는 병렬 계속. 전용 R10 B receiver 신규 개발, Controller 전체 재설치·전체 PID 추적을 자동 선행 조건으로 만들지 않는다.
- 게시 전에 PR #961이 Draft/미병합인지, 최신 main 대비 변경 파일, 관련 테스트, 배포 승인을 재확인한다. PR 병합·CI는 PC 설치나 Production 게시 증거가 아니다.

### 공식 원자료 발표 시차와 웹 통합 주의

- 2026-11-09 기준 연준 Z.1 최신 공식 자료는 2026-Q2이며 **Q3 발표 예정은 2026-12-10**이다([Federal Reserve](https://www.federalreserve.gov/releases/z1/)). `valuationPressure`·`riskAssetShare`·`speculativeFlows`의 Q3 신규값은 아직 존재하지 않으므로 Q2 실제 관측일을 보존한다. `priceAcceleration`·`breadthDivergence`·`excessLiquidity`의 Q3는 각 PC 원자료·완결성 검증 전에는 READY로 보고하지 않는다.
- R10 raw sidecar는 같은 `sourceVersion/sourceStoredAt`의 내용 변경을 `ASSET_R10_RAW_CONFLICTING_CONTENT`로 안전 거부한다. 보호 규칙을 완화하지 않으며 **새로운 유효 checkpoint**만 게시한다.
- 오래된 Draft PR #961의 전체 diff 병합을 금지하고 최신 main `3910adf7…`에서 **PC raw 생성 1 + raw 검증 1 + UI 2 + 테스트 2 = 6파일만** [선택 통합 Draft PR #1050](https://github.com/ansqhd5774-Choi/zgmini/pull/1050)에 준비했다. 격리 관련 48/48·페이지 동등성 3/3 = **51/51 PASS**, 원격 compare 정확 6파일, HEAD `17c3c0485d30ec59e68f0e70c9472a5b1afab339`. [GitHub CI Run 42620675447](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/42620675447) **SUCCESS** (build·typecheck·regression·PC publication recovery·Cloudflare read contracts 전부 PASS). Draft·미병합, 실제 웹 배포·화면 검증 전이므로 단계6 NOT_DONE 유지.

### 운영 화면 변경 전 기준점 — 실제 PC·모바일 조회 (2026-11-09 KST)

- **읽기 전용 운영 브라우저 검증:** https://zgmini.kr/asset-bubble/ 의 실제 화면은 종합 READY, 안전점수 **22.6**, 평가 분기 **2026-Q2**, 구성요소 진단 **2026-Q4 PARTIAL**, 카드의 저장 데이터 기준일 **2026.11.9**로 표시된다. 이는 기존 공개 점수/기본 관측 카드이며 **신규 R10 latestObservation 게시 완료를 의미하지 않는다**.
- **PC 화면:** 여섯 개 기존 구성 카드 각각의 저장된 이전/현재값·관측일·원자료 출처와 차트가 렌더링된다. 시장폭 괴리는 실제 3분기만, 나머지 다섯 지표는 실제 5분기 이력만 표시한다. 개발중 확장 카드 4개는 결측을 ‘—’로 표시하며 임의 값이 없다.
- **모바일 화면:** 375×812 viewport의 동일 운영 URL에서 종합 22.6, 날짜/평가분기 및 기존 구성 카드 **6/6개**가 DOM으로 확인됐다. `meta viewport=width=device-width, initial-scale=1`, main width 360px / viewport 375px으로 가로 본문 초과 없음. 화면 캡처와 DOM 확인 후 viewport override 원복. 모바일 세부 차트의 새로운 마지막 관측점은 **아직 신규 게시 전이어서 완료 판정 불가**.
- **표본 교차 확인:** 가격가속 현재 **36.508 로그 %p** (관측 2026-06-30), 시장폭 괴리 현재 **28.156 백분위점** (관측 2026-06-30), 과잉유동성 현재 **-1.242 %p** (관측 2026-04-01). 신규 Q3 값으로 오표기되지 않았다.
- 이 검사는 **단계6 새 코드 배포 검증이 아닌 기존 운영 UI 회귀 기준점**이다. 단계별 완료 및 전체 33.3%는 변동하지 않는다. 새로운 PC 체크포인트·D1 게시 뒤 똑같은 카드/점수/날짜/마지막 관측점을 비교한다.

## 4. 모든 R10 작업 보고의 필수 형식

작업 시작과 종료마다 다음 5줄을 **실제 증거 기준으로** 남긴다.

1. **전체 진행률:** 시작 `X/6 = Y%` → 종료 `X/6 = Y%` (변동 0이면 0으로 명시).
2. **현재 단계:** 단계 번호·상태 `DONE/RUNNING/STATE_UNKNOWN/BLOCKED/DEFERRED`; 세부 진행은 별도로 보고.
3. **이번 수행·검증:** 변경 파일, GitHub 커밋 SHA, 실제 PC requestId/실행 SHA, 로컬·D1·API/UI 증거 중 해당 범위만.
4. **실제 문제:** 필수 실행을 막을 때만 BLOCKER; 정확한 LAST PASS/FIRST FAIL/오류 코드/영향/담당/최소 복구. 무관 문제는 NON_BLOCKING.
5. **다음 필수 행동 하나:** 담당·입력·완료 조건을 지정. 기존 요청이 실행 중/불명확하면 원장을 먼저 재조회하고 재접수하지 않는다.

작업 브랜치·main·실제 PC 설치 SHA·웹 배포 SHA를 구분한다. 작업 도중 산식·스케줄·DB·DNS·Source 자동 변경 금지. 작업/프로세스 관리 문서 수정은 기능 진척도에 가산하지 않는다.

## 5. 근거

- R10 개발 Draft: https://github.com/ansqhd5774-Choi/zgmini/pull/961
- R10 최신 main 선택 통합 Draft (정확 6파일): https://github.com/ansqhd5774-Choi/zgmini/pull/1050
- 기존 별도 R10 B 초안(공통 수신기 재사용 시 불필요): https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/238
- 공통 범위형 A 성공: https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/882
- 공통 Writer B 실PC 성공: https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/871
- 공유 Writer 단일 설치 조정: https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68
