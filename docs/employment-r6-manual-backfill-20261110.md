# 고용 R6 2026-11-10 수동 BACKFILL 실증 및 잔여 실행 계획

## STATE_CLAIMS_BREADTH 10년 이력-530주 BACKFILL 정합성 확인 — 2026-11-10

- 소스 정합성: `zgmini/main` `employment-r6-provider.mjs`의 ETA539 BACKFILL은 `historyWeeks=530`. 동일 main의 승인 점수 엔진은 `STATE_CLAIMS_BREADTH` 파생값 계산 시 과거 전년대비 4주 비교에 **55주 선행**을 요구하고, 점수 계산 시 현재 이전 **10년 주간 참조 521주** 전부를 요구한다. 최신 2026-10-31 예시 **최소 원자료 577주×51지역=29,427행**. 530 완전주는 파생 475주로 최대 10년 참조 521주 대비 **47주 부족**하므로, 독립적으로 더 오래 보존된 원자료가 없다면 구조적으로 `PARTIAL_HISTORY`만 발생한다.
- 승인된 R2 계산 엔진 원본을 사용한 **실제 격리 시뮬레이션 2/2 PASS**: 합성 51지역×530주 → 파생 475주, `PARTIAL_HISTORY`·점수 null; 합성 51지역×577주 → 파생 522주, `READY`·유한 점수. 공식 공급자 조회/PC/D1 쓰기 **0건**.
- 기존 기능 브랜치에는 ETA539 **600주 BACKFILL**과 구 530주 `SUCCESS`를 갱신 대상으로 처리하는 `BACKFILL_WINDOW_REFRESH_DUE` 및 버전 기록이 이미 구현돼 있다. 그러나 [#1057](https://github.com/ansqhd5774-Choi/zgmini/pull/1057)의 선택적 운영 main 릴리스에는 포함되지 않았다. 대규모 기능 브랜치 전체 병합 또는 승인 없는 운영 소스 변경 금지. 실제 저장 577주 여부·ETA539 공급자 완전주·원본 결손 위치 조회가 필요하다.
- 재발 방지용 530/577주 실제 엔진 회귀시험을 **`tests/employment-r6-dol-10y-window-contract.test.mjs`**로 기능 브랜치 커밋 `9b66b499c2a8f64143076adfe8986544cd1fb067`에 추가. 후속 HEAD `fc22cf6741253841370280cb80f3d0b71de523cd`의 [Node CI Run 42736778895](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/42736778895)은 **SUCCESS**(앞선 42736594246은 새 push로 취소). 산식·가중치·PIT 분류·DB·수집 주기 변경 없음.
- **승인된 경로 재사용:** 제어 `main`에는 provider 600주(`employment-r6-2015-600-onefile-20261109.json`)와 collector 구 530주 성공 재수집 버전(`employment-r6-backfill-window-collector-20261109.json`)의 **각 1파일 승인 B overlay**가 이미 존재하고 `r6-registered-data-b`의 V3 계약에 결합돼 있다. 전체 개발 브랜치를 병합하거나 새 승인·중복 설치를 만들지 말고 **실제 PC 설치 해시/원장**을 대조한다.
- **읽기 전용 진단 확대 완료:** 제어 [PR #1221](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1221)을 `main`에 병합(`f3733a36f6d0db097ade81ac3c9a6a4fc61d58ef`). 최대 **600주** SQLite 집계를 검사하고 실제 10년 요구 **577주×51지역**, 주/지역 결측, 4주 0 기준을 별도 `fullTenYearRawCoverage`로 판정. 격리 13/13 PASS, 공급자/DB/D1/PC 운영 쓰기 0. `RAW_PRECONDITIONS_COMPLETE`는 원자료 전제조건이지 R6 점수 READY/운영 설치 증거가 아니다.
- **다음 필수 실행:** 제어 #996은 2026-11-10T01:36:10Z 별도 Windows 관측에서 `RECOVERY_REQUIRED`, `RUNNER_SET_DRIFT`, `SHARED_INSTALL_ONLY`, Workflow `disabled_manually`로 보고됨(기존 #917 성공과 서로 다른 요청). [공용 #68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68) 단일 담당이 #996 원본·보호 경로를 정리해 승인된 운영 적용이 가능해진 뒤, #1221 A 등록/한 번 조회 → 기존 600주 overlay 설치 여부/해시 확인 → 필요한 1회 수동 BACKFILL → 계산·저장→D1/API/UI **29/29** 검증. 재시도/임의 잠금 해제·타 기능 마이그레이션 병합 금지.

## #917 완료 이후 재개 점검 — 2026-11-10 KST

- **전체 진행률 7/8 = 87.5% → 7/8 = 87.5%**. 승인된 R2 계산·D1/API/UI의 28/29 점수 게시 성공은 유지한다. 유일한 미평가 `STATE_CLAIMS_BREADTH`(DOL ETA539) `PARTIAL_HISTORY`은 아직 미완료이며 보간값/0점 대체 없음.
- 공유 Controller [#917](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/917) 복구는 실제 Windows `RECOVERY_COMPLETED`, 독립 사후 22/22 PASS, 관련 테스트 131/131 PASS로 확인. 운영 Controller 설치 SHA는 여전히 `badad9124157879d7a645b64f2768113d632355b`; 이번 복구가 신규 A 진단 설치를 의미하지는 않는다.
- DOL/BED 원자료 결손을 구분할 **읽기 전용 A 진단 코드**는 최신 제어 main에 [#1218](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1218)로 병합, 제어 commit `2b5f2f5d92210f81ab4db0966721ecc93b8bb621`. 변경 범위 4파일, 격리 fixture 8/8 PASS. 기존 Draft [#1184](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1184)를 재실행하거나 중복 병합하지 않는다. **실제 Windows 등록/실행 0건**.
- 기존 설치된 `core-runtime-source-readonly` A는 고유 요청 [#1217](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1217), requestId `pc-8da91b23-f5d6-4a94-bcd5-13b0dfcdee61`로 단회 접수. 현재 결과 댓글/정확한 실행 증거는 미회수. 요청 중복 생성·무한 재시도 없이 원본 Issue/Workflow/JSON·TXT 확인부터 수행한다.
- 공유 Controller의 별도 과거 승인 설치 [#996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/996)에 최신 원격 결과 `UNKNOWN / RUNNER_SET_DRIFT`, `ACTUAL_CONTROLLER_SHA=badad912...`, `WORKFLOW_ENABLED=false`가 기록됨. 이는 #917 복구와 **서로 다른 요청**으로, #917 성공을 소급 취소하지 않으나 공용 **새 Controller 설치 전** #996 정확한 실제 lease/원장/Workflow 상태 확인이 필요하다. 현재 `badad912...→main` 차이는 누적 다수 Controller/config 변경을 포함해 #1218의 4파일만 선별 허용하는 manifest로 대체할 수 없다. [공용 조정 #68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68) 단일 적용 담당/정확한 승인 범위에 따른다.
- **다음 필수 실행:** #1217 원본 A 실행 유무 및 #996 공유 설치 상태 독립 재조회 → 승인된 누적 delta/공용 Controller B 적용 조정 → #1218 A 실제 등록 후 DOL 51지역/52주 최초 결손 위치·BED `missingSeries` 조회 → 필요한 원본만 승인된 수동 수집·저장자료 재계산 → D1/API/UI 29/29 판정. 예약 자연 갱신은 기능 종료 후.

## 진단 준비 갱신 — DOL/BED 저장자료 A 조회 (2026-11-10 KST)

- 고용 R6 전체 **7/8 = 87.5% 유지**. DOL `STATE_CLAIMS_BREADTH`가 유일한 미평가 항목이며, 실제 결손 위치·재수집·최종 게시는 아직 미완료.
- 제어 Draft [#1184](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1184) 진단이 실제 `main`의 ETA539 BACKFILL **530주** 원본 키를 인식하도록 수정했다(`600주` 후보와 `112주`·`60주` 유지). 진단의 과거 4주 기준도 승인된 R6 산식과 일치시켜 **1주 값 0은 유효, 지역별 과거 4주 합계 0만 제외**하도록 수정했다. SQLite 값/원자료·수집·계산·D1 쓰기 없는 격리 테스트 **8/8 PASS**.
- 진단의 최신 제어 HEAD는 **`7d6da076a88c6a33eef5034c9fab914d541ae721`**. **Draft·미병합·실PC 미설치**이며 CI/실제 DOL/BED readback은 미검증. 공통 Controller [#917](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/917)의 단일 운영 복구 담당이 설치 자원을 사용 중이므로 공유 Controller를 중복 변경하지 않는다. 원격 결과가 확보되면 DOL 최초 결손만 최소 보정하여 29/29 점수 게시 여부를 다시 판정한다.

## 검증된 최신 운영 완료 — R2 D1/API/UI (2026-11-10 KST)

- **프로젝트 진행률 6/8(75.0%) → 7/8(87.5%).** R2 4개 CPS 예외의 정규 PC source 5파일 설치(기존 #1195)·선택 main/Cloudflare Production 배포(643b7c… / ef5e4a8d)뿐 아니라 **Cloudflare D1 저장값 직접 SELECT + 공개 API + 운영 UI** 검증까지 완료했다. 여전히 `STATE_CLAIMS_BREADTH` 점수 미평가 1개 및 DOL/BED 원본 결손 위치 원인은 미완료. 독립 PC 파일의 R2 결과 원장과 Core 실행 source 연결 증거는 추가 확인 여지가 있으나, 이미 검증된 공개 D1 기록을 미게시로 되돌려 보고하지 않는다.
- Cloudflare **실제 D1 `zgmini-core-r42`** `market_public_snapshots_v1`의 `snapshot_key='detail:employment-r6:one-year:v1'`를 **읽기 전용 SELECT**로 검증: `stored_at=1794267318678` = **2026-11-10 08:35:18.678 KST**, `sourceStoredAt=1794262879306` = 2026-11-10 07:21:19.306 KST. `methodologyVersion=EMP-R6-FORMULA-R2-CPS-2025-10` 및 `formulaHash=sha256:04486846cd6063452d1c764116d3a31209f074d23a8764bf5b6ec8467095210e` 둘 다 정본 R2와 일치. 총 29원자료 / 28 평가 READY / 22 최근 평가 READY / 22 차트 READY. `sourceStoredAt`이 R1과 같아도 **동일 승인 저장 원자료를 R2로 재계산·재게시**한 것은 정상이며, D1 `stored_at`은 갱신되었다.
- 별도 D1 `json_each` 읽기 전용 검증: `U3_UNEMPLOYMENT` READY **48.74**(2026-10-31), `U6_UNEMPLOYMENT` READY **42.86**, `LFPR` READY **21.85**, `EPOP` READY **22.69**. 4개 모두 값 생성·보간 없이 기존 **119개 공식 실측 월** 예외만 사용. **유일한 미평가 `STATE_CLAIMS_BREADTH` = PARTIAL_HISTORY, 2025-07-19**, 0점 대체 없음.
- 실제 공개 `https://zgmini.kr/api/employment-r6/observations`는 R2 methodology/formula 및 28/29 결과를 반환(Worker GET은 D1 저장 본문만 조회·반환하는 구현). 실제 `https://zgmini.kr/economic-indicators/employment/`의 29개 표에는 CPS 4개 평가 48.7/42.9/21.8/22.7과 '최근 평가 22/29'가 표시된다. 상단 42.7점은 별도 시장 점수이며 R6 28개 점수의 평균이 아님.
- **남은 1/8 필수 작업:** 저장된 DOL 51지역/52주 `STATE_CLAIMS_BREADTH` 최초 데이터 결손 식별→승인된 범위 재수집/재계산→D1/API/UI 평가 완성. BED 114 series `SERIES_PARTIAL` 및 차트는 DOL과 분리해 정확한 `missingSeries`와 발표 주기 확인 후 필요한 범위만 보정. 기존 Controller #917 운영 담당자와 겹치는 Controller 변경은 직접 실행·우회하지 않음. 신규 자연 갱신 예약 검증은 후속으로 유지.

## 최신 실행 판정 — 2026-11-10 KST / PC R2 설치와 Cloudflare Production R2 코드 검증

> 아래가 이 문서의 최신 상태 정본이며 뒤의 'Draft/미배포/미설치' 표기는 당시 증거에 관한 **과거 이력**이다. 장래 자동 갱신 검증은 여전히 기능 최종 완료의 선행 Gate가 아니다.

- **전체 진행률 6/8 = 75.0%(시작 75.0% → 현재 75.0%)**. 실제 PC R2 5파일 B 설치와 Cloudflare Production R2 소스 배포는 완료. 다만 저장 원자료 기반 R2 계산·로컬 출력·D1 readback·공개 R2 API/UI 전 구간 증거가 없으므로 다음 2개 필수 단계는 미완료.
- 정규 B PC [#1195](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1195) Run **42721416977**, result **WRITER_B_INSTALLED_VERIFIED**, 설치 5/5·보호 확인·고유 JSON/TXT 2/2 원격 회수. 실제 PC 로컬 overlay/source/config **de81749f83c086f5cb0cad7ed1d5cc958de19280**; GitHub SHA와 구분. 소모한 고유 requestId 재실행 금지.
- 후속 읽기 전용 A [#1197](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1197) Run **42721995133** PASS: PC source=config=HEAD 로컬 overlay SHA 일치·필수 6/6·dirty 0. 다만 실행 당시 기존 Writer checkpoint는 R2 B 설치 이전. A [#1199](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1199) Run **42722211137** PASS: Core lock 관측, 로컬 cycle/writer 마지막 확인 시각은 R2 설치 이전. A [#1200](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1200) Run **42722462277** STATE_UNKNOWN/CORE_NO_ACTIVE_TASK_ENGINE: 일회성 PID snapshot 불확정이지 실행 실패 아님. 금지 operation [#1204](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1204) OPERATION_NOT_ALLOWED, 잠금 우회·강제 삭제 금지.
- 승인된 기능 선택 릴리스 [#1057](https://github.com/ansqhd5774-Choi/zgmini/pull/1057) 8파일(기능 5+회귀 3) **main 병합 완료**, commit **643b7c7c4372ffad552443fc312c6cb1b944e2fc**. Node.js CI [42723083286](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/42723083286) SUCCESS, Production SEO [42723083379](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/42723083379) SUCCESS. Cloudflare 연결된 GitHub/Production 배포 내역에서 해당 **동일 main SHA** 빌드 READY(약 1분 29초) 확인, Active Deployment **ef5e4a8d**, Traffic **100%**. GitHub 머지와 Cloudflare 실 운영을 분리 검증함.
- Public API `https://zgmini.kr/api/employment-r6/observations` 브라우저 읽기 확인: 게시 데이터는 아직 `EMP-R6-FORMULA-R1`, `sourceStoredAt=1794262879306`, 29 raw/24 scored/18 recently scored/22 chart READY. 웹 코드 R2 배포를 **데이터 R2 갱신으로 오인 금지**. R2 기대는 승인된 `EMP-R6-FORMULA-R2-CPS-2025-10`/formula hash `sha256:04486846cd6063452d1c764116d3a31209f074d23a8764bf5b6ec8467095210e`; 실제 Runtime 전까지 28 scored라고 주장 금지.
- **다음 필수 실행:** 운영 Core/Writer가 승인된 로컬 R2 source로 실제 stage→저장 결과→D1 publish/readback 수행했는지 기존 원장·checkpoint 우선 조회. 현재 읽기 전용 증거만으로 성공 주장 불가. 공유 Core lock을 강제 해제하거나 임의 새 CMD/B/SQL·중복 provider BACKFILL을 실행하지 않는다. 그 뒤 공개 API/UI R2 버전·29개 관측/점수·last valid 및 결측 1개 대조. DOL/BED 원본 결손은 이미 기획된 안전 A [#1184](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1184)가 공통 Controller 담당의 정규 등록 후에만 별도 진단하며 R2 게시 선행 Gate가 아니다.

> 작업 정본: `feat/bls-registered-v2-20261109` (Draft PR #1036). 기존 산식·가중치·TTL·DB 계약은 임의로 수정하지 않는다. **자동 수집/정규 예약 검증은 기능 완료 후 후속이며, 수동 검증에 날짜·60초·24시간 같은 내부 대기 Gate를 새로 만들지 않는다.** 공급자 호출량·공유 Writer 안전 보호는 별개로 보존한다.

## 2026-11-10 KST R2 5파일 Windows 실제 설치 신규 증거

- 완료 목표 **6/8 = 75.0% 유지**. R2 런타임 설치 자체는 PASS지만, 저장 원자료 재계산 → D1 최신 R2 snapshot → 실제 공개 API/UI 전 구간은 아직 검증되지 않았다. 자동 자연 갱신 검증을 완료 선행 Gate로 삼지 않는다.
- 제어 A 승인 전용 [#1192](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1192) main 병합(승인 5파일 경로만; Controller 변경 없음), 실제 A [#1193](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1193)에서 PC HEAD=config=checkpoint `48d3478030590ca63aaab2435e88c896608c70d3`, R2 5경로 **5/5 원본 SHA256 일치**, tracked dirty 0을 확인.
- 정규 B 승인 manifest `approvals/writer-updates/employment-r6-cps-r2-fivefile-20261110.json`, 원문 SHA256 `dc6b0707ae4778ecf99cdcb186a96a0c64aac9441fd42ec09f509640ee1f325c`. [제어 PR #1194](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1194) main 병합(`3e8a442011209291288c388947ac5bf361febbff`).
- 실제 B [#1195](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1195), requestId `f18e341c-e37e-4975-8a1b-2fa9818b9fae`, Run `42721416977`: **WRITER_B_INSTALLED_VERIFIED/WRITER_B_INSTALL_VERIFIED**, 동일 requestId 원격 `results/writer-b-source-install-f18e341c-e37e-4975-8a1b-2fa9818b9fae.json/.txt` **2/2 readback**, 정확히 5파일 변경. 이전 PC base `48d3478030590ca63aaab2435e88c896608c70d3`, R2 후보 `b37c7c029d36c6d29c50a5173018836918db5c78`에서 로컬 overlay source `de81749f83c086f5cb0cad7ed1d5cc958de19280` 생성. provenance SHA256 `7c30ba7cc6cf59612bfd319a0010ad545edcfbc8174ced7aef25248630c2d0ed`. 이 SHA는 GitHub branch SHA가 아니라 **PC 로컬 커밋**이며 자동 push/Cloudflare 배포되지 않는다. **NO_REEXECUTE**.
- 후속 A [#1197](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1197) 기존 `pc-source-preflight`로 R2 설치 직후 운영 source/checkpoint 읽기 전용 대조 요청(대기/결과 확인 중). Core 실제 주기 출처·R2 게시 완료를 이 A 결과와 혼동하지 말 것.
- 남은 필수 작업: ① 새 로컬 source 기반 Core의 R2 저장 계산·D1 저장/readback 직접 검증 ② Draft 기능 [#1057](https://github.com/ansqhd5774-Choi/zgmini/pull/1057)의 승인된 Cloudflare Git Integration 배포와 Production API/UI R2 formula/methodology 대조 ③ DOL/BED 원본 누락은 별도 안전 A가 실제로 설치될 때만 읽기 전용 결손 확인. 오래된 수동 B 승인 `installedSourceSha=144f...` 또는 과거 #1169 requestId 재사용 금지. 시간/9시/24시간 Gate 금지.

## 실제 완료 근거

- 전체 기능 완료 **6/8 = 75.0%**; 수동 데이터 수집·게시 단계는 **PARTIAL**, 100% 완료로 계산하지 않는다.
- 제어 PR #1158 main 병합: B 승인 수동 실행의 재호출 보호를 날짜 단위에서 **고유 requestId** 단위로 교정. 기존 일일 claim·소비된 requestId 보호 및 총 호출 상한 유지. 관련 테스트 29/29 PASS.
- 수동 BACKFILL #1165 (Run 42709699561): `R6_B_INSTALLED_SOURCE_STOP`; PC source 이동으로 preflight STOP, provider/SQLite/D1 쓰기 0. 기존 ID 재실행 금지.
- 읽기 전용 PC 진단 #1167 (Run 42709978452): 설치 source/config/승인 source = `144f3b8f673cc3d18f004ddd65f6920d450f0ea6`; 기존 13개 overlay 13/13 SHA 일치·tracked dirty 0. 다른 담당자 Writer 설치로 인한 source 이동을 보호 기준에서 정확히 구분.
- 제어 PR #1168 main 병합: V3 승인 파일의 `installedSourceSha` 필드만 위 실제 승인 source에 고정; manifest SHA256 `8c84c1ab63e8501e10083b1945accdc76c8692bb11d27edab766e32f34b64aae`. DB/source/예약 변경 없음.
- **실제 수동 BACKFILL #1169** requestId `a4e1dc0d-f7ef-4ff8-80df-9ce56ad3d796`, Run 42710641027: BLS 14회+DOL 2회, 로컬 SQLite 저장 후 D1 게시 및 readback 검증, `PARTIAL/R6_B_PARTIAL_PUBLISH_VERIFIED`. GitHub JSON/TXT 2/2; 동일 ID 재실행 금지.
- #1169 6개 그룹: `BLS_EMPLOYMENT_SITUATION`, `BLS_JOLTS`, `BLS_ECI`, `BLS_STATE_MSA` 4개 SUCCESS; `BLS_BED`와 `DOL_UI_WEEKLY_CLAIMS` 2개 `SERIES_PARTIAL`. 게시 `sourceStoredAt=1794262879306`.
- 실제 공개 `https://zgmini.kr/api/employment-r6/observations`: 위 `sourceStoredAt` 일치, 29/29 source feature 존재, **24/29 scored** (이전 22/29), **18/29 recently scored** (이전 17/29), 22/29 chart READY. 고용 공개 UI `/economic-indicators/employment/`에서 평균 시간당 임금 전년 대비 **48.3점**을 확인. `AHE_YOY` READY, `BED_BIRTH_DEATH_NET` 점수 READY(8.75점)이지만 최신 자료 부족으로 1년 차트 UNAVAILABLE.

## 미완료 5개와 원인·담당 경계

1. `U3_UNEMPLOYMENT`, `U6_UNEMPLOYMENT`, `LFPR`, `EPOP`: 공식 BLS에서 발표하지 않은 **2025-10 CPS 1개월** 때문에 엄격한 120개월 참조가 불가능. 사용자 승인 범위는 이 **4개 지표만 실제 119개월** 허용하는 R2 예외, 값 생성·보간·재가중 없이 그 밖의 창은 현행 엄격 기준 유지. 기능 브랜치에 R2 소스와 격리 테스트가 있으며 **운영 source 설치·R2 쓰기/게시·실제 웹 배포 미완료**.
2. `STATE_CLAIMS_BREADTH`: 공개 최신 2025-07-19, score `PARTIAL_HISTORY`. 공식 ETA539 이후 자료는 존재하므로 DOL fetch/parse/snapshot/SQLite 51지역 완전주/특성 계산 중 **최초 결손 위치 미확정**. #1169의 DOL 호출 2회 결과는 `SERIES_PARTIAL`일 뿐 원인을 특정하지 않음.
3. BED 그룹 `SERIES_PARTIAL`: BED 114개 series를 2015–2025와 2026 두 구간으로 조회할 때 미발표 2026 분기 항목이 누락으로 잡혔을 가능성 높음. **원본 missingSeries 없이 확정 금지**. 과거 10년 점수 READY와 최신 1Y 차트 부족은 양립하며 재수집을 일률적으로 요구하지 않음.

## 동일 날짜 수동 재시도 잔여 Gate 교정 (개발 완료, 미설치)

- #1158로 공통 B operation의 날짜 단위 claim을 고유 requestId 기준으로 바꿨지만, 기능 `employment-r6-collector.mjs`의 BACKFILL/ONE_YEAR planner에도 `attemptedToday` 조건이 남아 있는 것을 발견했다. 이는 새로운 소유자 승인 수동 요청까지 막을 수 있는 별개의 문제다.
- 기능 브랜치 `lib/market-score/employment-r6-collector.mjs`와 `tests/market-score-employment-r6-collection-integrity.test.mjs` 수정: **승인된 UUID `approvedManualRequestId`가 명시된 B 단발 호출만** 같은 UTC 날짜의 PARTIAL 재시도를 허용하고, 이미 완료된 BACKFILL window와 동일일 ONE_YEAR SUCCESS 그룹은 그대로 SKIP(부분 실행만 재시도). 보통 자동 `RELEASE` 및 requestId 미전달 `ONE_YEAR/BACKFILL`의 기존 방어·실제 BLS 쿼터·Core lock은 모두 유지한다. 잘못된 UUID는 STOP.
- 연결 측은 제어 저장소 기존 브랜치 `fix/employment-r6-active-source-pin-20261110`의 Draft [#1179](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1179), 1개 operation 파일에서 인증된 `auth.request.requestId`만 collector에 전달한다. **양쪽 변경 소스가 모두 실제 승인 설치되지 않으면 운영 수집기에는 아직 효력이 없음**.
- 기능 GitHub [CI Run 42714663526](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/42714663526): Build, Type check, regression, PC publication, Cloudflare candidate read **모두 PASS**. 무승인 main 병합·PC 설치·재수집·Production 배포 없음.
- 다음 실제 실행은 기능 R2 source/B 운영의 정확한 현재 preimage/overlay SHA 및 Controller #917 단일 설치 담당자 조정을 거쳐 정규 반영하고, 새로운 승인 고유 requestId **필요할 때 1회**만 수동 실행한다. 단순 시계 경과 대기는 금지한다.

## CPS 예외 R2의 선택적 반영 범위 (기존 전용 브랜치만 사용)

- 현 기능 PR #1036의 37파일 전체를 그대로 main에 병합하지 않는다. 이 작업과 직접 관련된 diff는 **5개**: `lib/market-score/employment-r6-formula.mjs`(R2 식별자/정확한 4개 범위), `employment-r6-feature-engine.mjs`(2025-10 실측 미발표 한 달만 119개 기준), `employment-r6-one-year-read-model.mjs`(공식 결측 증거 표시), `worker/employment-r6-public-display.mjs`(검증된 R1 공개 결과 읽기 유지), `scripts/pc-writer/employment-r6-one-year-stage.mjs`(R1 게시 선행 이력 비교). 위 파일 외 수집기·예약·R4·Quota·DB·TTL 변경을 R2 릴리스에 묶지 않는다.
- 기존 브랜치 `feat/bls-registered-v2-20261109`에 R2 소스·테스트가 이미 존재. **새 실험 브랜치 생성 없음**. 로컬 격리 재검증 `employment-r6-cps-official-gap.test.mjs` + `employment-r6-one-year-read-model.test.mjs` **20/20 PASS**; `employment-r6-public-display.test.mjs`는 현재 부분 scratch 미러에 `scripts/pc-writer/d1.mjs`가 없어 `ERR_MODULE_NOT_FOUND`로 실행 불가. 이 환경 누락을 소스 회귀 실패나 운영 장애로 오인하지 않음. 기존 완전한 GitHub CI Run 42698723901은 4237/4237, publication 11/11, Cloudflare 후보 69/69 PASS.
- **선택적 릴리스 검증 중(2026-11-10 KST):** `main` SHA `165a0ddbc3d8d0b918eee36e63895bd2a65b24fd`에서 배포 전용 브랜치 `release/employment-r6-cps-r2-20261110`, Draft [#1057](https://github.com/ansqhd5774-Choi/zgmini/pull/1057), HEAD `b37c7c029d36c6d29c50a5173018836918db5c78` 생성. 변경은 **기능 5파일 + 직접 회귀 테스트 3파일 = 총 8파일**, 기존 개발 PR #1036 전체 38파일 제외(main 대비 비교). 격리 관련 테스트 20/20 PASS; 첫 CI [42718590112](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/42718590112)의 Build/Type/게시 복구/Cloudflare 후보 PASS, 웹 라우트 fixture `methodologyVersion` 누락으로 Regression 2건 FAIL. 영향 테스트 1파일만 추가하여 웹 라우트 격리 2/2 PASS, 수정 CI [42719075523](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/42719075523) **SUCCESS**: Build/Type check, Regression 4178건(4169 PASS/0 FAIL/6 SKIP/3 TODO), 게시 복구 11/11, Cloudflare 후보 계약 69/69 PASS. **Draft 미병합·PC 미설치·Production 미배포**.
- 실제 선택적 main 반영은 source 기반 정확 diff/안전 검증 후 **승인된 배포 경로**로만 진행하고, PC R2 운영 Writer는 별도 승인된 정규 설치 preimage/manifest/해시 일치가 먼저 필요하다.

## R2 실제 적용용 5파일 SHA-256 및 Writer 원본조회 (2026-11-10 KST)

- PC Writer B에 필요한 런타임은 **5파일**(웹용 `worker/employment-r6-public-display.mjs`도 `employment-r6-one-year-stage.mjs`에서 직접 import함); 회귀 테스트 3파일은 B 설치 대상 아님. Production Cloudflare 게시에는 별도 같은 Worker 소스 배포/검증 필요.
- 아래 목표 SHA-256은 Draft 릴리스 [#1057](https://github.com/ansqhd5774-Choi/zgmini/pull/1057)의 HEAD `b37c7c029d36c6d29c50a5173018836918db5c78` 내 **Git blob SHA1과 로컬 `git hash-object` 5/5 동일**을 확인한 원본 파일 바이트의 해시다. **PC 운영 beforeSHA 또는 설치 성공이 아님**.

| PC 적용 대상 파일 | R2 목표 afterSHA256 |
|---|---|
| `lib/market-score/employment-r6-formula.mjs` | `9c811f735db664ac6fada79d692a2c9fff244e85b434dfe2a8c4c8ea4211c204` |
| `lib/market-score/employment-r6-feature-engine.mjs` | `49c4f47e5e2fccf541722148752a65bf1d76f19b7a8974d7533e7e983de63294` |
| `lib/market-score/employment-r6-one-year-read-model.mjs` | `45faa17a3306ef5bc6dead703fa64eadb95b53c20e405ea151fab6cb2f00eae2` |
| `scripts/pc-writer/employment-r6-one-year-stage.mjs` | `2c65cf6c1c0564dbead7c8a0ed5b8d5bbce9a80125f54cfc8aa23de9ee232f38` |
| `worker/employment-r6-public-display.mjs` | `2c7110e13f7025dff7c204d8a3727d14c937898e612ed35d38686ef6be88562e` |

- 실제 PC A [#1167](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1167)에서는 당시 제한된 13파일 hash 관측 성공(`144f3b8f...`), 그러나 Core 실행 source 연결 및 writer checkpoint 동일성 미입증. 그 뒤 다른 기능 B 설치로 source 변경됨.
- 더 최근 A [#1174](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1174) `STATE_UNKNOWN/WRITER_PREIMAGE_CHECKOUT_NOT_CORROBORATED`, sourceRoot/head/config 및 위 5파일의 **현재 beforeSHA 불확정**, 운영 쓰기 0. 이전 SHA를 현재 원본으로 승격 금지.
- **이번 신규 A** [#1188](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1188), requestId `pc-4e77ddc4-380a-40a0-a057-0ab11144f872`, 설치된 `pc-source-preflight` 조회 1회 요청. 최신 checkout 식별 문제의 구체 상태 확인용. 중복 재요청 없이 고유 결과/Run으로 상태 판단. Controller #917 복구와 Writer B는 독립 자원이나, 실제 겹치는 Writer 잠금·CAS는 보존.
- 다음 담당(고용 R6 원담당) 필수 행동: #1188 결과로 checkout/승인 source가 신뢰 가능하면 승인된 **5경로** 현재 beforeSHA·lease를 고정한 Writer B manifest 작성, 단회 설치 후 R2 계산·D1·API/UI 확인. checkout이 불확정이면 source 진단의 **최초 실패 조건만** 수정; 승인 없는 원격 shell·DB·재설치 우회 금지.

## 다음 필수 실행 (필요한 것만)

1. **DOL/BED 원본 누락 원인 1회 확인:** 제어 전용 브랜치 `feat/employment-r6-collection-evidence-a-20261110`, Draft [#1184](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1184), HEAD `8b39872b5ebab34c58065657a228612e09ddfebd`에서 기존 Controller 허용목록/dispatch에 최소 A `employment-r6-collection-evidence-readonly` 구현·fixture 5/5 PASS. 해당 A는 `run.detail_json.missingSeries`, ETA539 parser meta, 정확한 51지역/52주 비교 저장 커버리지만 비민감 집계로 조회하며 **공급자 재수집·DB/D1 쓰기 0**. **Draft 미병합/PC 미설치**로 실제 결손은 미확정이다. #917 Controller 복구 단일 담당자의 manifest·원본해시 검증 후 정규 B 설치/등록이 확인되면 새로운 고유 `pc-job` A 요청 1회 실행, TXT/JSON 결과로 최초 결손을 확정한다. 설치 전 우회 SQL·재수집 반복 금지.
2. **R2 예외 PC 적용:** 다른 기능/공통 Writer source 변동을 역검증하고, R2 변경 파일의 정규 원본 hash/overlay manifest/실제 승인 설치 경로로 반영. 승인 없는 운영 source 자동 교체, 광범위 PR #1036 무검토 main 병합, 임의 Cloudflare 직접 배포는 금지. 기능 담당이 수행.
3. **저장→D1→API/UI 최종 대조:** 실제 R2 methodology/formula hash, 29개 관측일·점수·차트·원자료 수·sourceStoredAt·결측/지연을 각각 확인. 실패 지표를 0이나 가짜 관측으로 채우지 않는다. 기능이 충족된 뒤에만 예약 자연 갱신 검증 후속.

**현재 판정:** 6/8(75.0%), `PARTIAL`; 자동 수집 선행 조건 없음. 승인 권한 밖 Controller 변경은 총괄의 독립 작업과 충돌하지 않도록 직렬 조정한다.
