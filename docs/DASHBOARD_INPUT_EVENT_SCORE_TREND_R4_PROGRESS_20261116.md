# ZGMINI R4 75단계 — 실제 수행 원장 (2026-11-16 KST)

> **현재 즉시 상태 (2026-11-17 KST): **14/75 (18.7%), 잔여 61단계**. #44 D09 신용 위험 UI 세 파일 선택 수정·신규 10개 회귀·[#1199](https://github.com/ansqhd5774-Choi/zgmini/pull/1199) CI PASS, `main@e9d212660dfa9955fd3370de5cd68e856f84d093` 병합 완료, 실PC 신규 단일 입력→D1/GET 검증은 PARTIAL. **#45 D10 실적 침체 확정 4요인 R4·경제 13요인 E1-R5·별도 잠정 E1-R4/R30 공개 계약과 화면 분리 소스/기존 회귀 확인**, 실제 신규 완료분기 저장·점수/게시/차트 동치 미확정으로 PARTIAL. #36~38·#40~43 운영 종단도 별도. 다음 독립 실행 **#46 D11 자산 버블 R9/R10 모델 분리**. main SHA의 GitHub `check`/`verify`/`notify`/Cloudflare Workers Builds **4/4 SUCCESS**까지 검증. exact Production Deployment ID/SHA·공개 신규 데이터 갱신은 별도 미확인.

## 현재 인계 정본 — 다음 담당자 첫 읽기 (2026-11-16 KST)

> **이 절만 현재 진행 상태의 단일 정본이다.** 아래의 2/75·4/75·8/75·10/75 기록과 예전 '다음 작업'은 당시 수행 이력으로 보존한 것이며 **재개 지시가 아니다**. 다음 실행 후 반드시 이 절과 맨 아래 새 수행 기록을 **함께** 갱신한다. 기록 기준은 [R4 계획서의 '작업 실행·진행 기록·인계 의무 기준'](DASHBOARD_INPUT_EVENT_SCORE_TREND_EXECUTION_R4_20261116.md#r4-작업-실행진행-기록인계-의무-기준-본-계획의-필수-절차)을 적용한다.

| 필드 | 현재 확정 값 |
|---|---|
| 저장소 / 원장 브랜치 | `ansqhd5774-Choi/zgmini` / `codex/ui-improvements` |
| 계획 / **지정 진행 기록** | `docs/DASHBOARD_INPUT_EVENT_SCORE_TREND_EXECUTION_R4_20261116.md` / **`docs/DASHBOARD_INPUT_EVENT_SCORE_TREND_R4_PROGRESS_20261116.md`** |
| 진행 (단계별 소스·fixture·설계 통과) | **14/75 (18.7%), 잔여 61개** |
| DONE 단계 (중복 없음) | **#04, #05, #08, #10, #21, #22, #23, #24, #26, #27, #33, #34, #35, #39** (14개) |
| #34 60초 화면 갱신·역행 차단 | **DONE (현재 main source/fixture)**. `live-refresh.mjs` 60초 주기, `dashboard-ui.tsx`·`use-stored-index.ts` 수용/역행 보호 경로 확인. 신규 유효값·0·PARTIAL 및 낡은 관측·게시 응답 판정 7/7, UI 연결 소스 4/4 PASS. Production 유저 육안 검수는 최종 단계 |
| 단계 증거 범위 | #24는 **기존 저장 JSON 활용·Draft 설계/회귀 PASS**까지의 설계 DONE. 실제 15분 보존 정책 수정·PC 설치·D1 반영은 **미완료** |
| PARTIAL — 현재 미완료 단계 | #01, #03, #07, #09, #11, #12, #13, #14, #15, #16, #28, #29, #36, #37, #38, #40, #41, #42, #43, **#44, #45**. #42 경기침체 PR #1197·#44 신용 PR #1199는 source/CI/merge 완료, 신규 관측의 실PC 저장→D1/공개 API·화면 종단 미확정. #45 실적은 확정 R4/경제 E1-R5/잠정 R30 소스 분리는 확인했으나 실D1 신규 입력 종단 미확정. #43 스태그플레이션 확정/잠정 분리 소스·기존 회귀 확인, 실제 월별 D1/API 미실증. 부분 증거를 전체 완료로 계상하지 않음 |
| 다음 단 하나의 실행 | **#46 (W06 D11 자산 버블)** 활성 R10 후보/확정 점수의 6개 요인·승인 권한 Gate, 이전 R9 자료와의 methodology/history 혼합 위험을 정확히 확인하고, 신규 유효 하나의 자료→동일 R10 current/차트점 연결을 검증. 실제 결함만 W06 UI/Reader 소유 파일에서 최소 수정. 자산 원담당의 R10 Collector/Calculator/Writer/DB·TTL/예약은 승인 없이 변경 금지. #44 신용·#45 실적 원담당의 실제 1개 신규 관측 SQLite→D1→API/화면 실증은 독립 미완료 |
| 다음 담당·대상·입력 | W06 #46: `/api/asset-bubble-detail`, 자산 R9/R10 기존 승인 source/최근 진행 원장, `app/asset-bubble/asset-bubble-panel.tsx`와 8대 위험 대시보드 점수/이력, 확정/후보 status/date/methodologyVersion. #45 소스 `worker/projection-builders/earningsRecession.ts`, confirmed `app/earnings-recession/earnings-risk-only-panel.tsx`/`/api/earnings-recession-detail`, provisional `worker/earnings-risk-provisional-public.mjs` 및 별도 `/api/earnings-risk-provisional`은 기존 source 증거 재사용; W05 실적 운영 증거 미확정 |
| #36 남은 통과 조건 | 공개 GET 소스/CI는 PR #1196 통과. 운영 CNN 현재 원본은 최신이나 원본 observation archive 108점/마지막 11/06 UTC, PC 검증 archive 108점/마지막 11/07 UTC로 10일 이상 정체. 운영 원담당 정상 저장 및 D1 각 날짜 readback과 공개 GET 원본 시각 일치 없이는 #36 DONE 아님 |
| 이후 후보(이번 실행에 혼입 금지) | #28 모델/방법론 계보 공개 이력의 원담당 변경 범위(현행 일별 snapshot에 modelVersion 저장됨, 평면 chart/observed archive에는 없음); #29 기준일 이후 미래 snapshot 표시 결함/동일시각 정정 (Writer 원담당). D01~D27 원담당 미연결 항목, Draft #1181·#1185 승인 대기. 비차단 작업은 계속 |
| 최근 R4 기능 병합 증거 | #1177·#1180·#1182·#1184·#1187·#1189·#1193·[#1196](https://github.com/ansqhd5774-Choi/zgmini/pull/1196)·[#1197](https://github.com/ansqhd5774-Choi/zgmini/pull/1197)·**[#1199](https://github.com/ansqhd5774-Choi/zgmini/pull/1199)** main 병합. #1199 exact base `04cbb286e3b94145bfac95bde927aa32847f1eea`, head `03504b2b8c34a39aa2192b77bd60dee653eef9e8`, merge SHA `e9d212660dfa9955fd3370de5cd68e856f84d093`; 관련 3파일, PR CI SUCCESS; Cloudflare exact Production 및 신규 신용 점수 데이터 갱신 미확인 |
| 미병합 원담당 검토 | [Draft #1181](https://github.com/ansqhd5774-Choi/zgmini/pull/1181) Collector의 관측일 역행 차단 (#11), [Draft #1185](https://github.com/ansqhd5774-Choi/zgmini/pull/1185) Writer의 15분 이내 변경점 영구 기록 (#24 설계 이후 구현). 두 건 모두 CI 성공이나 **원담당 적용 승인·main 병합·PC 설치 없음** |
| PC Runtime·SQLite→D1 실제 게시 | **운영 PC A급 #1806 PASS**, Run `43979172460`, JSON/TXT 2/2 재조회, SQLite opened, writes/provider calls/D1 writes=0. CNN current `31.0190476` / `observedAt=2026-11-16T22:59:30Z`, 원본 archive **108점·lastAt 2026-11-06T23:59:54Z**, PC checked archive **108점·lastAt 2026-11-07T00:30:02.951Z**; 이전 #1337(11/12)과 108·108/마지막 시각 동일. 종합 archive 48→70점 전진. Sidecar source gate `archive-run.mjs CHANGED`, 비인증 Block reason 범주 SOURCE/SHA(확정 원인 아님). CNN archive 새 관측의 D1 게시·공개 GET 실측 **미확인**. 별도 #13 운영 게시 종단 실증 미확정 |
| Cloudflare/공개 화면 | #1196 merge SHA `40d6156a…`의 **Workers Builds/verify/notify SUCCESS**, PR head `check` SUCCESS. **exact Production Deployment ID/SHA·실제 GET 원본 이력 전진·사용자 브라우저 검증 미확정**. 빌드나 PR 성공만으로 실운영 데이터 게시 성공을 주장하지 않음 |
| 소유·보호 조건 | UI는 기존 전용 브랜치·선별 PR 원칙. 수집·계산·Writer/15분·100개 보존 정책·DB·TTL·스케줄은 별도 원담당/승인 없이 수정·병합·설치 금지. R13 이란 퇴역 예약 복원 금지 |
| 전후 검증 원칙 | source/CI/로컬 fixture와 실PC/D1/Production을 분리. 사용자에게는 전체 기술 구현 이후 홈페이지 최종 육안 확인 요청 |

**다음 작업자 필수 수행 순서:** 본 계획서 75개 → 위 정본 → #38 관련 기존 근거만 확인 → 실제 #38 실행/검증 → **이 표 상태 수정 및 최신 수행 기록 추가 → 지정 원장 커밋 → 원격 내용 재조회 PASS → 최종 보고**. 지난 대화를 요청하거나 과거 성공 작업을 모두 재실행하지 않는다.

### 마지막 기록 갱신 — 기준 확립 작업 (기능 75단계 추가 완료 없음)

- 작업: 반복적으로 누락된 인계/완료 보고 순서를 기존 **계획서·진행 기록**에 구체적 필수 계약으로 삽입. 기능 코드·산식·운영 PC·게시 변경 **0건**.
- 검증: 계획서 단계 표 **01–75 연속 75행 유지**, 진행 기록 DONE 번호 **서로 다른 10개**, 잔여 **65개**. 최근 다섯 PR 병합 / 원담당 Draft 두 건 미병합을 기존 GitHub 증거와 구분함.
- 작업 종료 기준: **두 파일이 `codex/ui-improvements` 원격에 실제 존재하며, 새 인계/기록 계약과 10/75·#27 다음 단계가 재조회로 일치**해야 `LEDGER_SYNCED`. 그전에는 `LEDGER_UNVERIFIED`.
- **미완료 사항:** 15분 내 모든 중간 점수 영구 기록, 관측일 역행 수정의 원담당 승인·실제 설치, #13 운영 수집→계산→D1 게시, 전체 27개 기능 및 Production/사용자 검증.
- **다음 필수 실행 1개:** 위 #27 (W06, 기존 차트 병합·기간별 원본 데이터 계약, 1W~1Y 회귀 PASS).

## 2026-11-17 00:08 KST — R4 #27 독립 UI 수정 (PARTIAL, 10/75 유지)

- 시작 정본: 10/75 (13.3%), 다음 #27. W06 기록 브랜치 `codex/ui-improvements`는 오래된 UI 구현이므로 전체 병합/리베이스하지 않음.
- 실제 발견 결함: `mergeCompositeObservedDisplay`의 1W/1M/3M에서 intraday `detail=[]`이면 `return base`로 기간 밖의 일간 확정 이력까지 전부 반환. 실제 데이터가 없는 날짜를 보간하지는 않지만 기간 선택 의미를 위반.
- 독립 최소 변경: 최신 main `f22bfb1df7ff70bf4997117fbc187844a52f5c5c` 기반 `codex/ui-r4-period-window-20261117`, `lib/market-score/composite-observed-display-r1.mjs`와 `tests/composite-current-chart-r4.test.mjs` 2개 파일. 커밋 `5af6fce9be1fe6dc1aedd133f9c3d1f799de2f92`, `02b938093ab00eb9629987472ddaabc5e45bea87`; Draft PR [#1189](https://github.com/ansqhd5774-Choi/zgmini/pull/1189).
- 수정 효과: 관측점 없는 단기 구간의 fallback을 마지막 실제 daily 기준 기간 내의 유효 확정점으로 제한하고 시간순 정렬. 6M/1Y 기존 확정 이력은 변경하지 않음. 테스트에 1W/1M/3M/6M/빈 입력/역순 입력 fixture 추가.
- 검증 상태: 원격 GitHub 파일 2개 커밋·Draft PR 생성 확인. 신규 Node/CI 결과는 **미확정**; 운영 PC/SQLite/D1/Cloudflare/Production 변경 **0건**. #27 전체 DONE 판정 금지.
- LAST PASS: 기존 #26 observed GET 검증 및 #27 단기 무관측 fallback 결함의 최소 수정 커밋.
- FIRST UNVERIFIED: #27 관련 Node/CI 및 실제 archived+daily+current 1W~1Y 전체 회귀; Draft PR 미병합.
- 다음 필수 실행 1개: PR #1189의 Node/CI 결과를 확인하고 동일 기간의 실제 계산점·일별 확정점 병합/마지막점 테스트를 보완해 #27 완료 조건 판정. 승인 없는 main 병합·운영 설치 금지.
- 기능 진행률: **10/75 (13.3%) → 10/75 (13.3%)**, 잔여 65. #27 PARTIAL.

## 이전 기준 판정 — 2026-11-16 KST (보존 이력, 현재 인계 정본 아님)

- **전체 75단계 중 10단계 (13.3%) — 소스/비식별 fixture/설계 종료 기준**. 완료 번호: **#04, #05, #08, #10, #21, #22, #23, #24, #26, #33** (10개, 중복 없음). 이전 2/75·4/75·8/75은 당시의 이력 기록이며 현재 완료율이 아님.
- **근거 확정 반영 PR**: #1177 (종합점수 최신 계산점 UI), #1180 (1개 신규 입력+9개 유효 저장값 회귀), #1182 (경제 12카드 단기 끝점 UI), #1184 (임시 SQLite 저장→재계산→실계산 이력 통합 테스트), **#1187 (실제 관측이력 GET·계산시각 충돌 보호)**. 다섯 PR 모두 GitHub merged. 가장 최근 R4 병합 PR #1187 = `b2ef3a04b940d53fdec61d43ec4f4553bdc83610`; 이후 타 작업과 병행된 현재 `main` HEAD = `f22bfb1df7ff70bf4997117fbc187844a52f5c5c`. PR 병합/CI는 PC 설치나 운영 게시 성공 증거가 아님.
- **미완료(절대 DONE 오표기 금지)**: #13 실제 운영 PC의 1개 신규 입력→재계산→D1 게시·재조회 미확정. #24는 **설계·모의시험까지만 완료**; 15분 이내 실제 계산점 모두 저장하는 운영 기능은 미완료. [Draft #1185](https://github.com/ansqhd5774-Choi/zgmini/pull/1185) Writer 이력 표본 정책 변경과 [Draft #1181](https://github.com/ansqhd5774-Choi/zgmini/pull/1181) Collector 날짜 역행 방지는 검토 대기·미병합·미설치. #35의 점수-차트 표시 개선은 부분 구현일 뿐 27개 전수 운영 완료가 아님.
- **다음 실제 실행**: #27~29 차트 기간별 실제 관측점/일별 확정점·방법론 버전·동일일 중복/정정 보호 → D01~D27 미연결 구간만 수정. 운영 source 변경은 기존 승인/Writer 소유 범위에 따라 수행. 모든 기술 단계 완료 후 사용자가 홈페이지를 직접 확인.
- **인계/보고 계약**: 매 작업마다 `수정 파일/PR/검사 결과/미해결 문제/정확한 다음 단계`를 본 진행 기록에 원격 커밋하고 **재조회로 반영을 확인한 뒤** 해당 작업의 최종 완료 보고. 원장 미반영·검증 중·Draft·설계만 마친 단계는 최종 기능 DONE으로 보고하지 않음.

- **현재 정본:** 맨 위 '최신 완료 판정' 참조. #04, #05, #08, #10, #21, #22, #23, #24, #26, #33 = **10/75 (13.3%)**. #13 운영 완료·#24 운영 적용은 미확정.

> **이력 기록 (해당 시점)**: 아래 2/75 및 4/75 등의 수치는 당시 작업 종료 시점의 스냅샷이며 최신 진행률이 아닙니다. 최신 확정 상태는 문서 맨 위 '최신 완료 판정'이 정본입니다.

- 기준 계획: [75단계 R4](DASHBOARD_INPUT_EVENT_SCORE_TREND_EXECUTION_R4_20261116.md).
- 기록 브랜치: `codex/ui-improvements` (이력/계획 전용). 기능 수정은 `codex/ui-improvements-r4-score-last-point-20261116`에서 최신 `main`을 분기하여 최소 파일만 PR #1177로 병합.
- 기준 Git: 2026-11-16 착수시 `main 455ec124af17e98a6754a9ccadb2df7b8617a7c8`; PR #1177 병합 `main 71ea0b66f67e1b099415ebd814be4b67730af08b`. W06 공용 브랜치는 main 대비 288개 파일/다수 커밋 차이가 있어 전체 브랜치 병합 금지.
- **진도: 근거 있는 R4 고정 과제 2/75 (2.7%).** #04 수집→저장→계산→D1 게시 호출 흐름 source trace, #05 15분 아카이브/1D~1Y API/차트 병합 현재 구조 대조 PASS. 나머지 과제는 소스 부분 조사, 부분 구현, 런타임 미확정 중이며 PR 하나를 R4 전체 완료로 환산하지 않음.
- #01 부분 증거: W06/main/pc-control main SHA 구분. 운영 A 읽기 전용 #1737 (run 43873770008, seat 6)은 `STATE_UNKNOWN / CORE_TASK_RUNNING_INSTANCE_UNOBSERVABLE`, source runtime 확인 실패, providerCalls/d1Writes/operationalWrites=0, JSON/TXT 2/2 readback. 이는 실제 PC 실패를 뜻하지 않으며 새 일반챗 요청으로 같은 issue/requestId 재시도 금지. 다른 작업자 #1726의 `WRITER_FIXED_PREIMAGE_READONLY`는 고정 checkout SHA만 증명, Core 실행 SHA와 혼동 금지. #01 미완료지만 UI 독립 개발은 차단하지 않음.
- #03 부분 증거: `CM-R1` 실제 도메인 12개·가중치 총 100 확인. 사용자의 10개 지표는 개별 산식 예시이며 실제 모든 기능이 10개라는 뜻이 아님. 27개 각각의 지표 수/승인 Gate 전수는 계속 필요.
- #04 PASS: `scripts/pc-writer/collect-local.mjs` -> `local-cycle.mjs` -> `run-local.mjs` -> `market.mjs` -> `publish.mjs`. 기존 승인 수집·로컬 저장·12도메인 계산·결과 저장·D1 게시 읽기 확인 경로 존재; 실제 PC 성공 여부와 구분.
- #05 PASS: `lib/composite-observed-history-r1.mjs`의 15분/일 100점 정책, `composite-observed-archive-r1.mjs` 저장·게시, `app/api/market-score/observations/route.ts`의 1D~1Y stored GET, `composite-observed-display-r1.mjs` UI 병합 확인. 실제 CM-R1 함수 fixture는 12:00 50 → 12:05 50.7 → 12:10 52.7 → 12:17 52.7에서 아카이브 점수가 [50,52.7]만 남음을 확인. 미보존 중간점은 허위로 복원할 수 없음.
- #09~#13 부분: `progressivePublication`는 early Writer를 실행하고 auxiliary checkpoint가 변경될 때만 final Writer를 재실행함. `collectLocal`의 `runMarketOperationalRefresh`는 일부 그룹에서 완전 입력 검증 후 저장; 거부 시 기존 검증된 입력·결과 보존. 개별 1개 새 입력이 기존 나머지 9개와 합쳐지는 조건은 산식/수집기별로 추가 점검 필요. 기존 준비도 Gate를 무단 해제하지 않음.
- #14~#16 부분 fixture: 실제 `buildCompositeMarketScore`에 12 도메인 각 50을 넣으면 50점, 고용 도메인 하나 60이면 50.7, 유동성 하나 70을 이어 바꾸면 52.7. 기존 가중치·12/12 READY로 계산되는 함수는 존재함. 그러나 **개별 산식 요인 1개 → 실제 PC 저장 → 재계산** 전체 성공을 증명한 것이 아니므로 14~16은 미완료.
- **실제 코드 개선 (#35/D05 부분 구현):** PR [#1177](https://github.com/ansqhd5774-Choi/zgmini/pull/1177) `main` 병합 SHA `71ea0b66f67e1b099415ebd814be4b67730af08b`. 바뀐 파일 3개: `lib/market-score/composite-observed-display-r1.mjs`, `app/dashboard-ui.tsx`, `tests/composite-current-chart-r4.test.mjs`. 공개 최신 계산 점수가 15분 아카이브보다 새롭고 값이 달라진 경우에만 1D/1W/1M/3M 차트 마지막 실제 게시점 표시. 동일 값/역행/결측 오표시 방지, 6M/1Y 확정 일간곡선 보존. 기존 15분 저장 계약/산식/DB/TTL/예약/Writer 변경 0.
- **코드검증:** 9개 신규 함수 fixture PASS; PR #1177의 GitHub `check` 및 mocked-browser `ui` 모두 PASS. 초기 TypeScript `TS2345` 실패는 JSDoc 인자 타입으로 수정 후 다시 PASS. 해당 merge Cloudflare Git Integration Workers Builds `zgmini-migration-candidate-r5` SUCCESS (build `4977a9c1-386a-4d49-859e-da5e3fde0009`). 정확한 운영 Production Deployment ID/SHA 및 사용자 화면 검수는 미확정. 빌드=Production 완료로 오인하지 않음.
- #21~#29: 15분 안의 **과거 중간 점수 영구 보존**은 여전히 미완료. 현재 수정은 *가장 최근의 검증된 게시점 표시*일 뿐, 사라진 12:05 중간 이력을 채우지 못함. 별도 저장·공개 계약 변경이 필요하면 원담당 검토와 사용자 승인 후 기존 Writer 저장기 재사용. 신규 DB를 기본 전제하지 않음.
- #34~#35는 D05 종합점수 한정 코드 수정만 반영돼 부분 완료 상태. 다른 위험·경제 점수 27개 전부에 동일한 날짜/점수 변경 처리 완료를 주장하지 않음.

## 다음 실행 우선순위
1. B군 #07~#13: 승인 원자료의 1개 신규 관측/9개 마지막 유효 입력 선택이 실제 Reader/Writer에서 가능한지 기존 저장 fixture로 기능별 구분. 특히 `macroCollectionReadiness`의 전체 입력 SUCCESS Gate와 기존 저장된 이전 정상치 재사용의 호환을 확인; 실자료 부족/부분 실패를 이유로 기존 안전 Gate를 임의 해제하지 않음.
2. D군 #21~#29: 15분 기록 제한 안에 연속 계산점이 있을 때의 손실을 원담당과 최소 저장 계약으로 해결. 기존 아카이브·계산기·게시기 재사용, raw input 공개 금지.
3. 27개 D01~D27은 현행 승인 조건별 `정상 갱신/기간대기/표시 불일치/미연결`을 구분해 실제 결함만 고침. 정상인 기능을 반복 검증하지 않음.
4. 기술 작업·승인된 PC 적용·공개 게시를 끝낸 뒤 사용자에게 홈페이지 직접 최종 확인 요청. 웹디버그 복구 및 정규 예약 자연 검증을 단계에 추가하지 않음.

## 추가 원자료 선택 함수 모의시험 — source-only

- 실제 `worker/macro-result-contract-r61.mjs::mergeSuccessfulMacroCredit`와 `worker/candidate-market-operational-store.mjs::mergeStoredMacro`의 운영 원본 함수를 격리 실행함. `PAYEMS,UNRATE,GDPC1,INDPRO,RRSFS,PCEPILFE,M2SL,DGS2,DGS10,NFCICREDIT` 10개 시리즈 중 2026-11-16 `NFCICREDIT` 한 건만 변경한 경우 9개 값은 이전 저장값과 정확 일치, 이전 `seriesStoredAt` 9건 보존, 신규 `NFCICREDIT`는 새 `storedAt`으로 전진. 사용한 기존 `INPUT_TTL=36h`를 변경하지 않음. 결과: 10/10 최신/유효 시리즈 적격, 신규 변경 1개만 식별, 허용 이월 9개 확인.
- 이 PASS는 **macroCredit 특수 경로의 저장자료 병합 동작**에 한정하며, 월간/분기별 독립 27개 모델 전체, 실제 PC Runtime, 새 공급자 수집 성공을 뜻하지 않는다. 기존 저장 시각이 36h를 넘으면 기존 안전 Gate에 따라 이전 시리즈를 사용하지 않는 것이 정상.
- `worker/macro-result-contract-r61.mjs::macroCollectionReadiness`는 전체 필수 입력 complete 및 공급자 실패 0건일 때만 정상 macro 배치를 교체하도록 보호한다. `tests/macro-result-contract-r61.test.mjs`에서 해당 기존 완전성/부분실패·이월/TTL 동작을 이미 검증하므로 중복 검사를 신규 필수 Gate로 추가하지 않음. **별도 수집기의 1개 신규 관측 + 9개 유효 과거값**의 직접 결합은 Owner별 정확한 소스와 승인 Gate로 후속 분류.
- 최초 PR #1177의 TypeScript `TS2345`는 `currentPublishedPoint`의 JSDoc 인자 타입 명시 후 원격 `check`/`ui` 모두 PASS. 병합 `71ea0b66f67e1b099415ebd814be4b67730af08b`, Cloudflare Git Integration Workers Build PASS. 운영 화면 자체는 사용자 최종 확인 경로, 내부 브라우저 검증 Gate 재설정 금지.


## 후속 실행 — R4 #07~#13 (2026-11-16 KST)

- **현재 보수적 전체 집계 4/75(5.3%).** 기존 #04·#05에 더해 #08 비식별 10개 입력 재현 fixture와 #10 기존 `macroCredit` 단일 입력 변경·9개 유효값 재사용 선택 경로를 소스·실제 로컬 SQLite fixture 기준 PASS로 추가. #10의 이 PASS는 **공통 병합기 macroCredit 범위만** 의미하며, 27개 독립 산식 운영 완료는 F군 #36~#62로 구분.
- **PR [#1180](https://github.com/ansqhd5774-Choi/zgmini/pull/1180) merged** to `main@245b9bea8f3f1773dd12f933ec64e09a6fa5f934`. 변경 1개 `tests/r4-single-input-refresh-regression.test.mjs`, 총 10건 실제 Node 회귀. GitHub `check` PASS(run `43880665155`). 테스트는 공식 등록된 macro series 기반 full-batch READY 유지, 10개 중 `NFCICREDIT` 1개 신규 수집·9개 기존 유효 입력 그대로 이월, 같은날 공식 정정, 0값, 36시간 TTL 초과값 거부, 부분 실패 시 기존값 보호, CM-R1 12도메인 한 개 변경 시 기존 가중치대로 재산출, **실제 임시 PC SQLite 저장→재조회**를 커버. 운영 PC 파일·D1·공급자 호출·예약/가중치 변경 0건.
- **#07 부분:** `seriesId`, `observationDate`, `seriesStoredAt`/그룹 `storedAt`, 공개 `sourceVersion` 식별. 현재 전체 27개별 매핑 미완료. `worker/market-input-validation.mjs`의 per-group validated reader/last-good fallback 계약을 유지.
- **#09 부분:** `local-cycle.mjs`는 Core 수집 뒤 early `run-local.mjs`를 통해 기존 저장값을 계산; 그 뒤 auxiliary 수집에 대해서만 `auxiliaryInputCheckpoint`의 output/supply/alpaca/shadowSp500 변경분이 final 계산을 결정. 기존 `tests/progressive-publication.test.mjs`에서 checkpoint 누락/변경 시 정상 재실행 경로 PASS 이력. 지표별 전 범위 event 감지용 전역 신규 checkpoint를 만들지 않음.
- **#11 재현된 source 결함:** 현재 `mergeSuccessfulMacroCredit`는 저장된 NFCICREDIT 최신 관측일 2026-11-12보다 신규 입력의 마지막 관측일이 2026-11-05로 과거로 돌아가도 수락함. 재현 fixture에서 역행 수락 `true`. 이는 유효값 이월과 별개이며 늦은/잘린 공급자 응답의 자료 역행 가능성이 있음.
- **#11 Owner 검토용 Draft PR [#1181](https://github.com/ansqhd5774-Choi/zgmini/pull/1181)**: 최신 유효 관측일이 명시적으로 후퇴할 때만 `MACRO_CREDIT_OBSERVATION_REGRESSION` 거부, 같은 날짜 공식 정정과 미래 관측은 그대로 허용. 기존 안전 진단 reason allowlist 1종 보강, 추가 3개 회귀(해당 테스트 총 13건), GitHub `check` PASS(run `43881923455`). 변경 후보 `worker/macro-result-contract-r61.mjs`, `worker/market-operational-refresh.mjs`, 회귀시험 1개. **Core 수집기·입력 검증 계약 변경이므로 W06이 직접 병합/PC 설치하지 않고 원담당 확인 범위로 분리함.** 이 Draft는 actual deployed fix가 아님. 다른 W06 독립 영역은 중단하지 않는다.
- **#12 부분:** TTL 초과 9개값 거부/숫자 0 구분/필수 입력 누락·공급자 실패 시 last-good 보존은 fixture PASS. 27개 전체 결측/동일시각 중복 승인판정은 F군에서 별도 점검.
- **#13 부분:** 새 유효 입력 1개를 기존 `marketOperationalStore(db)`가 임시 SQLite에 저장하고 `readStoredMarketInputs`로 조회하는 종단 fixture PASS. 기존 `run-local.mjs`가 저장자료만으로 계산하는 호출 경로는 소스 확인됐으나 **실제 운영 Writer 재계산/게시 성공은 아직 미확정**. 실제 새 Input→PC 실행→D1 readback을 이 결과로 대체하지 않음.

### 재계산·이력 연결의 다음 독립 최소 작업
1. W06 담당 UI에서 D05 외 각 경제 12개 도메인의 카드 현재 점수와 저장된 trend 마지막점을 비교. 불일치가 확인된 항목만 동일 산식·원본 이력 보존 조건으로 표시 보완.
2. 기존 15분 `composite-observed` 간격 안에 바뀐 복수 계산점(예: 12:00 50점, 12:05 53점, 12:10 56점)이 영구 보존되지 않는 #21~#29는 PC Writer 원담당 영역이다. 신규 DB를 일단 도입하거나 15분/100점 제한을 무단 해제하지 않고 기존 운영자료 저장 정책 내 최소 개선·승인 범위를 분리.
3. #11 원담당이 Draft 검토할 때까지 Core 원자료·DB·수집기 운영 변경을 하지 않음. 원담당이 검토 후 승인/적용한 증거가 생기면 해당 단계 상태를 정정.


## 후속 실행 — 경제 12카드 최신 게시점 연결 (#35 부분, 2026-11-16 KST)

- **PR [#1182](https://github.com/ansqhd5774-Choi/zgmini/pull/1182)** → `main` 병합 `73d1b7eeeef23dd69de90c047d8bfdab4c6cb1b2`. 변경 파일 3개: `lib/market-score/published-domain-trend-r4.mjs`(신규 순수 화면 병합), `app/dashboard-ui.tsx`(D14–D25 12개 경제 카드 연결), `tests/published-domain-trend-r4.test.mjs`(회귀 9건). GitHub `check` PASS(run `43883227626`)·`ui` PASS(run `43883227635`).
- 기존 저장 API의 각 도메인 `status=READY`·유효 점수와 시장 현재 게시 `updatedAt`에 한정, 1D/1W/1M/3M의 마지막 곡선점이 `domain.trend`보다 최신이고 점수가 실제 달라진 경우에만 **실제 게시 계산점 1개**를 차트에 덧붙임. 원본 배열/보존 이력·산식·가중치·DB·TTL·Writer/수집 주기·PC 파일 수정 0. 같은 점수 재계산·null·0 미구분·시간 역행·6M/1Y 일별 확정 이력 변조 방지. 0점은 유효값으로 허용. 일부 화면에 기존 이력이 없으면 새 실제 점수 1개만 나오며 과거 변화점은 만들어내지 않음.
- #35 전체 종료는 아님: 12개 경제 카드 **단기 차트 표시 연결** 구현 부분만 완료. 위험 8·공포탐욕·한국 개별 콘텐츠의 실제 게시·이력 경로와 경제12 중 오래된 계산점 영구 보존은 별도 검증 필요. 배포는 기존 `main` 연동 자동 빌드 경로 사용; 정확한 Production Deployment SHA와 실제 브라우저 화면은 아직 미확인(사용자 최종 검수), GitHub merge를 Production PASS라고 오기하지 않음.
- **R4 고정 과제 4/75(5.3%) 유지:** #04, #05, #08, #10의 관련 재사용·수집 입력 fixture 단계는 PASS. #09·#11·#12·#13 및 #35는 부분 진행/원담당 판단이 남음. #35 UI code/CI 완료만으로 전체 R4 단계 또는 27개 콘텐츠 기능 완료율을 인상하지 않음.
- 원담당 검토용 [Draft #1181](https://github.com/ansqhd5774-Choi/zgmini/pull/1181)는 `check` PASS(run `43881923455`)이나 Source/입력 검증 계약의 수정이므로 운영 `main` 미병합/PC 미설치. 다른 UI 개발에 대한 전역 BLOCKER로 확대하지 않음.

### 다음 우선 작업
1. #13: 기존 승인 Writer의 저장 원자료 1건→실제 재계산 결과 및 같은 입력 9개 이월을 운영 source/checkpoint의 기존 증거와 연결. 가짜 숫자/개별 새 예약 금지. 승인 수동 실행·readback 가능한 경우 실제 저장·게시 결과로 검증.
2. #21~#29: 15분 간격 안의 50→53→56 같은 중간 실계산점 보존 누락. 승인된 원담당 경로로 15분/일 100점 계약 변경 여부를 확인하며, 이미 구현한 실게시 마지막점 UI overlay를 실제 중간 이력 보존 완료라고 오기하지 않음.
3. D01~D27: 콘텐츠별 실제 점수와 차트 계약 차이를 좁혀 원담당 계산기/Reader, W06 UI로 수정 주체를 나눔. 사용자는 모든 기술 작업 완료 후 사이트에서 육안 최종 확인.

## PR #1182 병합 이후 Git Integration 빌드 판정

- `main@73d1b7eeeef23dd69de90c047d8bfdab4c6cb1b2`의 GitHub Workers Builds `zgmini-migration-candidate-r5`: SUCCESS, build `c22b0bcb-6e00-40cd-9088-ae2c882846e9`; 연결 `verify`/ `notify`: SUCCESS. 별도 `check`는 조회 시 진행 중; PR head 단계의 `check`와 `ui`는 이미 SUCCESS.
- Git Integration build SUCCESS는 정확한 Cloudflare Production Deployment SHA의 직접 조회나 사용자의 실제 화면 검수와 동치가 아님. 프로젝트에서 삭제된 웹디버그 기능 복구/대체를 종료 Gate로 요구하지 않음.


## R4 #13·#21–24 추가 결과 — 2026-11-16

- **당시(중간 시점) 완료 8/75 (10.7%, 소스/fixture/설계 기준)**: #04, #05, #08, #10, #21, #22, #23, #24. 이후 #26, #33 완료가 후속 절에 반영되어 현재는 10/75. #13 운영 미완료, #24 운영 적용 미완료.

1. **#13 저장→계산→이력 로컬 통합 실증 부분 완료**: [PR #1184](https://github.com/ansqhd5774-Choi/zgmini/pull/1184) 병합 `main fef26ea2e508226c146f68cb30d430c9ddd59011`. 소스 기반 실제 `runMarketOperationalRefresh` 공유 수집 lane, 승인 저장기 `marketOperationalStore`, `readStoredMarketInputs`, 진짜 `buildCompositeMarketScore` 가중합, `appendCompositeObservedFromCurrent`와 임시 SQLite 저장·재조회 연결. 비식별 관측 `NFCICREDIT` 1개 새 값 50→60, 다른 승인 저장 시리즈 값·시각 이월; fixture의 credit-domain test adapter는 **실제 신용 산식을 대체하지 않는 테스트 전용**. 12개 도메인 실제 CM-R1 종합 결과 50→51, 16분 뒤 실제 계산 이력점 [50,51] 저장. 공급자 호출 0. PR CI PASS; 병합된 main의 check/verify/notify/Cloudflare Git Integration Worker Build 모두 PASS. 이는 운영 PC source SHA/실제 수집/실D1 게시의 성공 증거가 아니므로 #13 상태 PARTIAL 유지.

2. **#21 구분 완료(source contract PASS)**: 기존 단일 `market_public_snapshots_v1` 내 `current`와 `YYYY-MM-DD` 일별 점수, 그리고 `composite-observed:YYYY-MM-DD` 같은 날 계산시각별 기록 키가 분리됨. 기존 PC 저장기·공개 D1 경로와 실제 비교했으며 새 DB를 만들지 않음.
3. **#22 연결 완료(source/fixture PASS)**: `run-local.mjs`는 계산·현재점 저장 성공 직후 `appendCompositeObservedFromCurrent`를 호출; PR #1184의 신규 변경 입력에서 실제 다음 계산·저장과 해당 이력점이 이어지는 임시 SQLite 통합 테스트 PASS. 운영 PC/Cloudflare 실증은 별도.
4. **#23 손실 재현 완료(source/fixture PASS)**: 현재 15분 제한이 있으면 12:00 50→12:05 53→12:10 56 중 두 중간 사건은 건너뜀. 1D 화면의 마지막점 overlay #1177은 56을 보여주지만 이전 53점은 복원하지 못함. 저장과 표시에 독립적 결함으로 분류.
5. **#24 최소 설계·검증 완료(승인/적용 미완)**: [Draft PR #1185](https://github.com/ansqhd5774-Choi/zgmini/pull/1185) head `9d7ff5d2cbcba86bf43e1bf9a6d0020bbeee11a4`, `check` PASS(run `43885789199`). `lib/composite-observed-history-r1.mjs` 기존 15분 동일점수/서명 중복 방지는 유지하면서 **실제로 변경된 계산 점수만** 5분 간격으로 보존하는 이벤트 예외 제안. 기존 하루 100점 제한·스토리지 크기 한도·동일 시간 중복 차단·PC/D1 테이블/키/버전 보존. 50→53→56 임시 SQLite 이력 검사, 동일점수 반복, 100점 상한 회귀 통과. 수정은 **15분 표본 간격 승인 계약의 변경**이므로 Writer 원담당 검토·정확한 범위 승인 전까지 Draft로 유지하며 main 병합/운영 설치 금지. 100회 초과/일은 현재 상한으로 막히므로 모든 이벤트 무제한 보존을 보장하지 않음.
6. **원담당 소유 분리**: [Draft #1181](https://github.com/ansqhd5774-Choi/zgmini/pull/1181) 관측일 역행 방지(#11)는 CI PASS지만 여전히 별도 Collector 소유·승인 대상. W06 UI 완료 PR #1177/#1182는 main에 이미 병합됨. 두 Draft는 배포·운영 성공으로 집계하지 않음.

### 다음 작업과 실제 남은 제약
- 독립 W06: 1D 조회 `app/api/market-score/observations/route.ts`가 Draft 이벤트 3점을 시간순 반환하고 잘못된 시각을 거부하는지 기존 source/API 계약에 맞춰 최소 회귀. 그다음 현재 1W/1M/3M 시점 및 방법론 이력 분리(#26~29).
- Writer/Collector 원담당: 실제 설치 source 확인과 기존 승인 수동 검증 경로로 1개 신규 원자료→계산·이력→D1 게시를 실증. 별도 일반챗 #1737의 `STATE_UNKNOWN`만으로 운영 실패라 판정하거나 동일 request 재발행하지 않음.
- 사용자가 기술 작업 완료 후 https://zgmini.kr/에서 육안 확인. GPT에서 제거된 웹디버그를 종료 Gate로 복원하지 않음.


## R4 #26·#33 공개 이력 GET 무결성 — 2026-11-16

- **진도 10/75 (13.3%)**: 기존 #04,#05,#08,#10,#21,#22,#23,#24(8개) + #26(1D 저장 이력 시간순 제공·모순 데이터 보호) + #33(저장 GET source-only 수집/계산/쓰기 금지) 완료. 이 비율은 `SOURCE/TEST/DESIGN` 작업 완료이며 75개 종단 실운영 완료율 아님. #13은 실제 PC 실행과 공개 D1 재조회 미완료로 PARTIAL 유지. #24는 Owner 승인 대기 Draft 설계 PASS만 인정.
- **[PR #1187](https://github.com/ansqhd5774-Choi/zgmini/pull/1187) merged** `main b2ef3a04b940d53fdec61d43ec4f4553bdc83610`. 파일 2개: `app/api/market-score/observations/route.ts` 저장 경로가 동일 계산시각에 상충하는 score/asOfDate가 있는 경우 마지막 행을 무조건 채택하는 기존 동작을 503 `INVALID_STORED_SCORE`로 변경. 동일 timestamp·동일 값의 무해한 재전달은 idempotent하게 1개만 인정. 실제 저장된 원본을 수정하지 않음. `tests/r4-composite-observed-route.test.mjs` 9개 테스트 추가: Cloudflare 실제 GET 구현 소스를 TypeScript transpilation으로 실행, read-only D1 stub에 저장된 50→53→56 (12:00,12:05,12:10)을 시간순 반환, 동일 기록 중복, 충돌, 기준일 충돌, 허용 clock-skew 밖 미래, 불법 점수, empty, invalid period, 1W cross-date 검증. PR `check` PASS(run `43887372204`). 기존 5분 skew 허용·만료·권한·제공 TTL/DB 스키마/원자료/계산/예약 변경 없음.
- **#33 public GET source/fixture PASS**: `/api/market-score`는 기존 Worker `storedMarketResponse`와 `market-operational.test.mjs`의 저장값만 읽는 계약 재사용; `/api/market-score/observations` 실제 GET은 read-only `SELECT` 1건, provider/fetch/쓰기가 없는 것을 PR #1187 fixture로 검증. 운영 사이트 실조회 여부는 별도 사용자 최종 확인 경로.
- **#24 실행과 분리**: 기존 시간별 계산점 3개가 로컬 archive에 실제 보존돼야 API #1187에서 3개를 반환할 수 있음. 아직 owner 검토용 [Draft #1185](https://github.com/ansqhd5774-Choi/zgmini/pull/1185)의 이벤트 저장 후보가 운영 main에 병합되지 않았으므로 운영 50→53→56 보존·표시 완료를 주장하지 않는다.
- **보존 사항**: [Draft #1181](https://github.com/ansqhd5774-Choi/zgmini/pull/1181) Collector 관측일 역행 방지는 별도 owner 검토 대기. 어느 Draft도 승인 없이 main/PC 운영에 적용하지 않음.
- **다음 필수 실행**: 독립 W06 #27~29 및 D01–D27 세부 영역별 현재점/이력점의 날짜·방법론 매핑에서 실제 문제만 수정. Writer #24는 승인된 정확한 15분 보존 계약 범위 확인 후 원담당이 선택 적용; PC 소스 설치·게시 readback은 승인된 경로로 완료. 사용자의 사이트 육안 검수는 그 뒤.


## [2026-11-17 00:13 KST] R4 #27 — 동시 작업 통합 검증·기록 (PARTIAL, 10/75 유지)

- **담당·범위:** W06 기간별 점수 이력 검증. 기준 `ansqhd5774-Choi/zgmini`, 지정 브랜치 `codex/ui-improvements`; 실제 개발 기준 `main@f22bfb1df7ff70bf4997117fbc187844a52f5c5c`. PC 승인 설치·Cloudflare exact Deployment SHA는 이번 실행 미관측.
- **우리 작업 실제 변경:** 지정 브랜치 `tests/r4-period-window-handover-27.test.mjs` 1파일 추가 및 source fixture 기간 부족 예외 수정. 커밋 `dec6aacfabac8dda050ff5e7a8a0fcae4577022f` → `f1c7564008d126f0d5df0c6e2b034178c4adfff4`. 원격 파일 재조회. 기존 `market-trend-window-r1.mjs`는 main/기록 브랜치 blob `f14330390e5e707fee469338917308dc71d1199c` 일치. 계산/수집/DB/D1/Writer 변경 0.
- **검증 A:** 실제 기록 브랜치의 `marketTrendWindowR1` 소스를 실행한 6개 시험 **6/6 PASS**: 1W~1Y 마지막 실제 날짜·오름차순, 기간 전체보다 짧은 정상 저장 기간, 화면 경계 carry-forward와 실제 관측 구분, 내부 무관측 날짜 미생성, 0/null 처리, 빈 시리즈, 입력 불변. 초기 3M 이상 자료가 기간을 모두 채운다는 잘못된 **fixture 기대조건**만 수정한 뒤 6/6 재검증. **GitHub check-runs = 0**이므로 이 신규 브랜치 테스트의 GitHub CI PASS 주장은 하지 않음.
- **검증 B:** active `main`의 실제 `composite-observed-display-r1.mjs`(`040177c4d1941f87c4b65c08a7b83da03b8fde4c`), `published-domain-trend-r4.mjs`(`f3b8e0143d9d8bcb4d4055b37537a7c6a5046985`), `market-trend-window-r1.mjs`, `cnn-observed-sampling-r1.mjs` 소스를 격리 실행해 **14/14 PASS**. 비식별 [11-08=41, 11-12=44, 11-15=48, 11-16=50] 일간 확정 + [11-16 12:00=50, 12:05=53, 12:10=56] 실계산 이력 + 최신 게시 56점 fixture. 1W·1M·3M 내 실제 계산점 시간순·최종점 일치, 6M·1Y 승인 일간 시리즈 보존, 신규 실제 현재점/오래된 현재점·동일값·null/0·빈 이력 판정 정상. **과거 중간 계산점 3개는 테스트 데이터로 제공된 것**이며 실제 PC Writer가 15분 이내 3개를 저장했음을 의미하지 않음(Draft #1185 보호).
- **동시 작업 접합:** 다른 W06 실행자가 2026-11-17 00:08 KST에 `main` 기반 `codex/ui-r4-period-window-20261117`에서 관측 이력이 아예 없을 때 1W/1M/3M에 선택 기간 밖의 daily가 넘어가는 **실제 결함**을 수정하고 [Draft PR #1189](https://github.com/ansqhd5774-Choi/zgmini/pull/1189)를 생성, 지정 브랜치 원장에 PARTIAL로 기록했다. 그 원본 작업·커밋·문서는 삭제/초기화/덮어쓰기하지 않음.
- **검증 C (다른 작업자의 Draft 후보):** PR #1189 head `02b938093ab00eb9629987472ddaabc5e45bea87`, 변경 2파일(`lib/market-score/composite-observed-display-r1.mjs` 및 `tests/composite-current-chart-r4.test.mjs`). GitHub **`check` SUCCESS** ([Run 43893176250](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43893176250)), 후보의 실제 병합 함수에 비식별 1W/1M/3M 무관측 daily fallback, 역순, 빈 기록, 중복, 유효 현재점, 6M/1Y 불변 등을 입력한 **13/13 소스 함수 시험 PASS**. **Draft/미병합/미배포**. UI 전용 브랜치 `codex/ui-improvements`와 별도 branch로 작성돼 있으므로 프로젝트 상시 브랜치 계약과 선택적 PR 적용 범위를 원담당이 정합성 검토해야 함. 오래된 지정 브랜치를 통째로 병합하거나 강제 이동하지 않음.
- **마지막 유효 단계/문제:** #26 저장된 관측 API 완료. #27은 **후보 코드+CI+소스 fixture까지만**, 실제 main 반영과 원본 승인 범위 확인이 남아 **PARTIAL**. FIRST UNVERIFIED = Draft #1189 최종 반영/병합 및 이후 Production/실제 데이터 확인. 부작용이나 PC/DB/D1 변경 증거 없음. 완료 번호 **#04,#05,#08,#10,#21,#22,#23,#24,#26,#33 (10개)**, **10/75 (13.3%), 잔여 65개** 유지.
- **다음 필수 실행 단 하나:** **#27** 담당 W06 — PR #1189 변경 파일 2개와 원래 UI 전용 브랜치 정책·기존 CI 증거를 대조하여 원담당이 승인된 선별 PR/병합 방식을 확정하고, 허용된 실제 소스 반영·대상 검증을 마친 뒤 DONE 여부 결정. 이후 #28 방법론/모델 버전 구간 분리 실행. 다른 원담당 Collector Draft #1181, Writer Draft #1185, #13 실PC→D1 게시 미완료는 본 작업으로 해제되지 않음.
- **진행 기록 반영:** 이 실행 기록과 상단 '현재 즉시 상태', 현 인계 정본의 '다음 단 하나의 실행'을 지정 `docs/DASHBOARD_INPUT_EVENT_SCORE_TREND_R4_PROGRESS_20261116.md`에 함께 커밋하고 원격 재조회. **기록 저장·검증이 끝나기 전 DONE 보고 금지.**


## [2026-11-17 00:29 KST] R4 #27 완료·#28 방법론 이력 계약 조사

- **완료 판정 #27 DONE — source/CI 기준:** 선택 기간 밖의 일간 점수가 1W/1M/3M 무관측 archive fallback에 나타나는 결함을 기존 함수 `lib/market-score/composite-observed-display-r1.mjs`에서 제한하는 2파일 PR [#1189](https://github.com/ansqhd5774-Choi/zgmini/pull/1189) `main` 병합 `1c0dd6587d76ef1051196251a06beed58ce36d6f`. 변경 파일 2개(`lib/market-score/composite-observed-display-r1.mjs`, `tests/composite-current-chart-r4.test.mjs`), GitHub head `02b938093ab00eb9629987472ddaabc5e45bea87`. GitHub `check`, `verify`, `notify` 및 Cloudflare Git Integration Workers Builds 모두 SUCCESS. CI 이전/이후의 지정 브랜치 1W~1Y 기간창 source fixture 6/6 PASS, 실제 최신 main 함수 14/14 PASS, PR 후보 기능 함수 13/13 PASS를 재사용. 6M/1Y 확정 일간 이력·계산 산식·DB·수집주기·PC 운영 source 변경 0건. **PR 병합·빌드 성공을 exact Production Deployment와 사용자 화면 검증 완료로 주장하지 않음.**
- **브랜치 이력/규정:** 실제 PR #1189 head `codex/ui-r4-period-window-20261117`는 기존 작성자의 임시 브랜치로 UI 전용 `codex/ui-improvements` 원칙과 불일치한 이력. 이번 응답은 **임시 브랜치를 새로 만들거나 오래된 W06 브랜치 전체를 main에 병합하지 않고** 기존 CI PASS PR의 **승인된 2파일 최소 범위만 병합**했다. 기존 두 브랜치의 소스·다른 작업자 변경·미병합 Draft는 삭제/초기화하지 않았다. 이후 UI 새 임시 브랜치 생성 금지.
- **#28 PARTIAL — 재현된 방법론 추적성 부족:** 운영 코드 최신 `lib/market-score/composite-model-r1.mjs`는 aggregate `CM-R1` 고정(다른 집계 모델의 운영 전환은 미확인). `scripts/pc-writer/market-snapshot-comparisons.mjs::sameVerifiedLineage`는 도메인 비교 시 명시된 `methodologyVersion`이 다르면 올바르게 제외. 반면 `lib/composite-observed-history-r1.mjs::compositeSampleFromVerified` 저장 필드는 `calculatedAt,score,asOfDate,signature` 4개이며 **aggregate `modelVersion`·도메인의 `modelVersion`은 기록/서명에 포함되지 않음**. 비식별 `CM-R1/RATE_R3 → CM-R2/RATE_R4` (점수·asOfDate 동일) 변경을 주입하면 두 signature가 동일하여 다음 저장 이벤트가 `changed:false`. `worker/composite-history.mjs::mergeStoredCompositeTrend`는 모델 버전이 다른 확정 일별점도 기존 승인 이력 보존 정책으로 하나의 날짜곡선에 유지하며 각 점별 lineage 필드가 없어 **선의 구간 분리 불가능**. 이는 **미래 전환/공식 과거 데이터에 대한 구조적 공백**이며 실제 Production에 CM-R2가 도입됐다는 뜻이 아님.
- **#28 신규 테스트·검증:** W06 지정 브랜치 `tests/r4-methodology-lineage-audit-28.test.mjs` 신규 검사 **4/4 PASS**(현재 계약 진단). 최초 미존재 `lib/composite-observed-history-r1.mjs`를 오래된 W06 브랜치에서 import하려는 테스트를 소스 확인 즉시 수정하여 **불필요한 Writer 코드 복사 없음**. 최종 테스트 파일 commit `054f089937b9a03737d2215fef60cef35f3073e8`; 브랜치에서 실제 함수 소스 격리 시험 4/4 통과, **별도 GitHub CI 미실행**. 최신 main 원본 archive signature 및 mixed-history 함수는 별도 비식별 호출로 재현. 사용자 승인 없는 산식, 보존 정책, 원자료, DB/D1 계약·게시/PC source 변경 없음.
- **LAST PASS/FIRST FAIL:** #27 소스·CI 완료. #28은 이전 도메인별 방법론 비교 규칙 PASS, **현재 종합 이력에는 per-point method metadata 부재** — 실제 사업 운영에서 버전별 곡선 분리까지 완료했다고 주장할 수 없음. #11 Collector 날짜 역행 Draft #1181, #24 Writer 15분 점 저장 Draft #1185, #13 실PC SQLite→D1 검증은 계속 미완료·원담당 범위.
- **진행률:** 서로 다른 DONE 번호 **#04,#05,#08,#10,#21,#22,#23,#24,#26,#27,#33 = 11개/75 (14.7%)**, 남은 **64개**. #28 PARTIAL은 완료 분자 제외. 기존 #24의 DONE은 *설계·fixture 단위만* 의미하며 실제 15분 정책 개선 설치 완료는 아님.
- **다음 필수 실행 단 하나 #28:** W06+계산/Writer 소유자 — 현행 이미 공개된 복수 snapshot의 버전 메타데이터 존재 여부와 연속곡선 비교/분리 가능성을 계약별로 확인. 자료가 없는 과거 구간은 추정 방법론 부여·허위 선 연결 금지. 버전 없는 아카이브에 version 슬롯을 추가하려면 **저장/공개 데이터 계약 변경으로 분리해 정확한 승인 범위 및 최소 영향 회귀시험**을 정한 후 원담당 경로에서만 적용. 독립적으로 가능한 W06 UI 검증은 계속한다.
- **인계 절차:** 이 기록과 현재 인계 정본을 함께 지정 `codex/ui-improvements` 브랜치 `docs/DASHBOARD_INPUT_EVENT_SCORE_TREND_R4_PROGRESS_20261116.md`에 커밋 후 원격 본문·완료 번호·다음 실행을 직접 재조회해 PASS를 확인한 뒤 사용자에게 보고.



## [2026-11-17 KST] R4 #28 방법론 저장계보 심화·#29 보존 위험·#34 소스검증 완료

- **브랜치/기준:** 기록/테스트 `ansqhd5774-Choi/zgmini@codex/ui-improvements`, 현재 기능 코드 기준 최근 `main@0a786bd69c7dc815d296143021473d8f6bf7a118`. 본 절 작성 도중 다른 담당자가 main을 갱신하더라도 이미 확인한 정확한 blob 범위로 증거를 판정. 본 실행의 변경 파일은 `tests/r4-methodology-lineage-audit-28.test.mjs`와 **이 지정 기록**뿐. Writer/Calculator/PC 수집·D1 게시/산식/DB/TTL/수집 주기 원본 변경 **0건**.
- **#28 실제 저장 계약 확정(부분):** `worker/market-operational-store.mjs`의 `writeScore`는 전체 public 계산 body를 JSON으로 기존 `market_public_snapshots_v1` `current`/일자에 저장. `readScoreHistory`는 일별 `body.modelVersion`와 `domains[].methodologyVersion/modelVersion`을 **이미 보존해 반환**. `worker/composite-history.mjs::mergeStoredCompositeTrend`는 이를 단순 `{label,value}` 평면 배열로 바꾸므로 각 점별 provenance가 소실된다. `lib/composite-observed-history-r1.mjs`의 기존 `compositeSampleFromVerified`는 `calculatedAt,score,asOfDate,signature` 네 필드로만 저장하며 aggregate modelVersion/별도 domain modelVersion은 서명에도 포함하지 않음. 공개 `/api/market-score/observations`도 계산점의 버전을 제공하지 않음. **DB 전체 스키마를 바꾸는 것이 필수는 아니며, 기존 원본 일별 버전 데이터는 사용 가능**하나, 공개된 차트/계산시각별 구간 분리를 완료하려면 원담당의 저장/공개 파생 메타데이터 범위 결정이 필요.
- **#28 재현/비교:** `sameVerifiedLineage`는 같은 도메인의 explicit methodology/source 불일치를 올바르게 배제. 반면 같은 inflation method를 유지하되 aggregate modelVersion이 다른 일별 스냅샷은 Writer `run-local.mjs`의 inflation-only 필터를 통과할 수 있음. 메타데이터 없는 legacy/trend의 과거 모델 버전을 현재 버전으로 *추정*해서는 안 됨. `CM-R2`는 순수 fixture이고 실제 생산 운영 변경을 뜻하지 않음.
- **#28 코드/검증:** 지정 브랜치 `tests/r4-methodology-lineage-audit-28.test.mjs`에 기존 4개 진단 외 2개 **임시 SQLite 저장기/원본 버전 유지 테스트**를 추가. 커밋 `fd3dc99284d77686cf41c97e7613724d219bce5c`. 기존 순수 source fixture **4/4 PASS** (이전 근거 재사용). Node v22 `node:sqlite` 실제 임시 메모리 SQL로 `CM-R1`/시험용 `CM-R2` 두 날짜 스냅샷의 `body.modelVersion`·도메인 `modelVersion` **원본 유지 PASS**, 평면 `label/value`에는 버전 없음 확인. 이는 **SQLite 스키마 수준의 비식별 fixture**이며 새로 작성한 `marketOperationalStore` 통합 테스트 2개를 GitHub CI로 실행했다는 주장은 아님. 본 브랜치 workflow/check-runs 자동 실행은 미확인. `#28 PARTIAL` 유지.
- **#29 독립 source 진단(Writer 원담당 PARTIAL):** `lib/composite-observed-history-r1.mjs::mergeCompositeObservedDay`에 실제 비식별 계산점 12:00=50 기준으로 (i) 동일 서명 12:15=50은 변경 없음, (ii) 동일 시각 12:00=53 정정은 보존 이력 추가 없음, (iii) 12:05=53은 기존 15분 정책으로 보존 안 됨, (iv) 12:16=53은 저장, (v) 11:59:59 역행은 `COMPOSITE_ARCHIVE_CLOCK_REGRESSION` 오류. 기존 15분 정책 변경은 별도 [Draft #1185](https://github.com/ansqhd5774-Choi/zgmini/pull/1185) 승인 검토를 유지.
- **#29 새로 재현한 미래 일자 혼입:** 최신 `worker/composite-history.mjs::mergeStoredCompositeTrend`에 `currentDate='2026-11-17'`, 저장 snapshot `date='2026-11-18', score=70`, current=52를 주면 **미래 11-18 점수까지 출력**. 반면 동일 날짜 중복 저장은 늦은 `storedAt`이 우선하고 currentDate의 currentScore=52가 당일점에 우선하는 정상 동작도 확인. 원인은 일별 snapshot 삽입 반복문의 `if(date&&value!==null)`에 `date<=currentDate` 제한이 없는 것. **최소 코드 변경 후보:** 해당 기존 반복문에 `(!validDate(currentDate)||date<=currentDate)` 추가하고 future-date/동일일 정정/중복/역행 fixture 회귀. `marketOperationalStore.writeScore` 로컬 current/day upsert에는 `stored_at` 조건이 없어 **상위 lease/checkpoint**로 역행 쓰기가 불가능한지도 원담당이 확인해야 함. 이 부분은 **실제 운영 사고 증거가 아니라 source-level 재현/영향 후보**. Writer 코드는 W06 권한에서 임의 변경/병합하지 않음.
- **#34 DONE(기존 구현 재사용):** `lib/market-score/live-refresh.mjs`의 `REFRESH_INTERVAL_MS=60000`/단일 inflight/Abort 및 `acceptsStoredUpdate`의 관측일·게시시각 역행 거부, `app/dashboard-ui.tsx`의 `setMarket`·`components/use-stored-index.ts`의 응답 header 최신값 guard·`setPayload` 연결 확인. 같은 관측일 50→51 신규 게시, 뒤늦게 도착한 오래된 게시/관측, 실제 0, 합법적 PARTIAL/null, 동일시각, 유효하지 않은 본문 **순수 source 함수 7/7 PASS**, 관련 UI 호출/60초/기존 회귀 소스 4/4 PASS. 기존 `tests/live-refresh.test.mjs`가 갱신 직렬화·cleanup 보호를 이미 검사하므로 단순 중복 테스트를 새로운 Gate로 만들지 않음. #34 **소스/fixture 범위 DONE** (실제 Production 배포/사용자 육안 검수는 미확정).
- **완료 번호/진도:** #04,#05,#08,#10,#21,#22,#23,#24,#26,#27,#33,#34 = **12개**, **12/75 (16.0%)**, 잔여 **63개**. #28/#29는 원담당 공개/Writer 계약 판단과 코드 수정·실검증 전 **PARTIAL**, 분자 제외. 다른 R4 완료 증거는 재검사하지 않음.
- **다음 필수 실행 단 하나:** **#35, W06**. 현재 `main` 카드 표시점 vs 1D·1W·1M·3M·6M·1Y 차트 끝점의 실제 score/calculatedAt/daily-date, 공개 계보, 표시변환(종합 3.5 민감도) 정밀 검증. 불일치가 *확인된 UI 부분만* 기존 전용 브랜치/선별 PR 규칙으로 최소 수정. **기존 코드/PR 성공 재확인만 반복 금지**, 실제 남은 연결 문제 해결 우선. #28 방법론 파생 메타데이터 및 #29 Writer 미래 시각 문제는 각 원담당 범위로 별도 처리; 독립 UI 개발의 전역 차단 조건이 아님.
- **원장 반영 조건:** 위 인계 정본과 이번 실행기록을 `codex/ui-improvements`에 지정 파일 단위 커밋 → 파일 재조회로 완료번호 **12개**·다음 **#35**·불명확한 CI/운영 구분·남은 실제 문제 확인 후 최종 보고.


## [2026-11-17 KST] R4 #35 — 카드/차트 단기 끝점 실수정 및 PR #1193 병합

- **작업·원본 브랜치:** `ansqhd5774-Choi/zgmini@codex/ui-improvements`. 75단계 전체 계획 `docs/DASHBOARD_INPUT_EVENT_SCORE_TREND_EXECUTION_R4_20261116.md` 변경 없음. 이전 유효 진행 12/75, 다음 #35. 기존 브랜치가 `main` 대비 **412 ahead/624 behind·294파일 차이**였으므로 전체 PR/강제 reset/rebase 금지. 기존 `codex/ui-r4-period-window-20261117` 주체 브랜치의 관련 소스 SHA가 main과 일치한 것을 확인하고, 새로운 브랜치를 생성하지 않은 채 **3파일만 선별 반영**.
- **재현 실결함:** 독립 `/api/market-score`와 `/api/market-score/observations` 읽기 순서가 다르면 현재 승인 시장 카드 `updatedAt=12:10, raw=53`(화면 60.5점)인데 archive `12:20, raw=56`가 먼저 도착해 차트 마지막점이 71점으로 표시될 수 있음. 같은 timestamp 서로 다른 score도 비교가 안 됐음. source-level 실행으로 두 불일치를 재현.
- **최소 구현:** 지정 브랜치에서 `app/dashboard-ui.tsx`의 종합 현재점에 `boundToPublishedCard:true` 명시, `lib/market-score/composite-observed-display-r1.mjs`은 **명시된 카드 렌더링 모드에서만** 현재 카드 계산시각 이후의 이력과 같은 시각 상충 이력을 UI 배열에서 제외. 이력/원자료 미수정. 일반 `mergeCompositeObservedDisplay` 호출의 **기존 최신 archive 우선 규칙은 유지**. `published-domain-trend-r4.mjs`, `cnn-observed-sampling-r1.mjs`은 이미 main 승인된 코드 SHA 그대로 지정 브랜치에 보완하고, 경제 12카드 점수·시각 연결을 복구. `tests/r4-score-card-chart-consistency-35.test.mjs`에 정상/미래·동시각 충돌/0/null/6M·1Y/3.5 표시감도/12 도메인/원본 불변 관련 최종 **14개 시험**.
- **FIRST FAIL, 원인, 수정:** 최초 [PR #1193](https://github.com/ansqhd5774-Choi/zgmini/pull/1193) head `7a42ea0d2d3990cc0b372c36bfe06a36824549fa`의 GitHub `check` [Run 43903875197](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43903875197)는 회귀 1건 FAIL (`tests/composite-current-chart-r4.test.mjs: older current response cannot overtake newer saved observation`). 당초 수정을 모든 호출에 적용해 **기존 계약을 파괴한 것**이 원인. 이 회귀검사를 삭제·완화하지 않고 카드 UI만 opt-in하는 `boundToPublishedCard` 속성을 추가해 해결. 기존 함수의 보관점 우선이 필요한 일반 호출도 그대로 유지.
- **최종 검증:** 지정 W06 브랜치 실제 소스 함수를 실행한 최초 13/13 PASS, 일반 archive 우선 경우를 추가한 최종 14개 fixture 및 기존 회귀 소스 보호. PR #1193 최종 head `089f9e82463de02842d3c229491977ac16b8122f`, 변경 **`app/dashboard-ui.tsx` / `lib/market-score/composite-observed-display-r1.mjs` / `tests/r4-score-card-chart-consistency-35.test.mjs` 3파일뿐. GitHub **`check` SUCCESS [Run 43905120726](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43905120726)**, **mock-browser `ui` SUCCESS [Run 43905120406](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43905120406)**. PR `merged=true`, `main` 병합 SHA `e5dc26582c94dacc1cb41ef39675b812014ce42f`. 실제 설치된 PC Writer SHA·D1 readback·exact Cloudflare Production 배포·사용자의 실제 화면은 이번 시험에서 확인하지 않았으므로 완료 주장 금지.
- **#35 판정:** **DONE(코드 구현·회귀/모의 UI 검증 기준)**. 1D/1W/1M/3M의 실제 현재 게시점 기준 표시, 6M/1Y 기존 일별 확정 이력 유지, 카드는 종합 3.5배 표현변환·경제 12개는 원점수, 숫자 0 합법/결측 그대로, 소스 이력 DB·산식·TTL·수집주기·15분 저장 정책 변경 0건. 복수 API의 배포 환경별 최신 판정은 전체 운영 검증에서 재확인.
- **전체 75단계 진행:** 고유 DONE 단계 `#04,#05,#08,#10,#21,#22,#23,#24,#26,#27,#33,#34,#35` = **13/75 (17.3%)**, 잔여 **62개**. #28 방법론 이력 분리, #29 Writer 미래 관측 스냅샷, #13 실제 PC 원자료→D1 게시, #11 Collector 날짜 역행 및 Writer Draft #1185는 각 원담당 승인·실제 운영 적용 미완료/부분 완료를 보존.
- **다음 단 하나의 필수 실행:** **#36 (W06 D01 미국 공포탐욕)** 실제 CNN 변경 관측 `observedAt` 및 점수가 `lib/cnn-observed-archive-r1.mjs` → `worker/public-feed-store.mjs` 기존 저장 → `scripts/pc-writer/cnn-observed-archive-publication-r1.mjs` 승인 게시 → `/api/fear-greed/observations`로 수렴하는지 로컬 저장·D1 readback/검증 원장으로 확인. `fear-greed-verified-checks`의 PC 점검 시각은 CNN 새 관측 시각과 구분. 신규 실제관측 부재 시 허위값·가짜 점 생성 금지. 타 담당 수집기·DB·스케줄 임의 변경 금지.
- **진행 기록 종료 조건:** 이 절과 상단 현재 인계 정본을 지정 `codex/ui-improvements/docs/DASHBOARD_INPUT_EVENT_SCORE_TREND_R4_PROGRESS_20261116.md`에 **커밋 → 원격 재조회 PASS**한 뒤 단계 완료 보고. 인계 누락 시 LEDGER_UNVERIFIED.


## [2026-11-17 04:04 KST] R4 #36 — CNN 공개 관측 Reader 정합성 소스 조사 (PARTIAL, 13/75 유지)

- 담당·범위: W06 D01 미국 CNN 공포탐욕; 기존 13/75(17.3%) 및 #36 다음 실행을 재사용. 지정 원장 브랜치 `codex/ui-improvements`; main 원격 최신 HEAD는 이번 회차 직접 확정하지 못했으며 기존 병합 `e5dc26582c94dacc1cb41ef39675b812014ce42f`는 과거 증거로만 유지.
- 실제 확인: main의 `lib/cnn-observed-archive-r1.mjs` blob `90bc85af57fde21b2a618b9e1150bdebcf8a96f4`, `app/api/fear-greed/observations/route.ts` blob `67abf4bd27b16437355ad8d3d6bc22ea2edda1f4`, `scripts/pc-writer/cnn-observed-archive-publication-r1.mjs` blob `6a240e7a0d95b9e5dffef56ece0cc1c98b1b490b`, 기존 테스트 `tests/usa-fear-greed-change-only-r10.test.mjs` blob `44bd6df840e9db6dfbcd071f5af36334e84d53e8`.
- 소스 관측: 저장 병합은 timestamp 기준 Map dedupe/공식 정정 overwrite 및 UTC 날짜 유효성 검사를 수행. 게시기는 로컬·D1 stored_at 비교 후 정확한 body/stored_at readback. 공개 GET은 CNN 관측 `points`와 별도 PC 확인 `checkedPoints`를 구분, 원천 수집 호출 없음. 다만 GET의 `byTime.set(key,...)`은 저장된 같은 timestamp에 서로 다른 score가 중복되면 마지막 값을 채택하므로 **상충하는 기존 저장행이 있을 경우 503 무결성 차단 없이 한 값을 노출할 수 있는 소스 위험 후보**. 실제 운영 중복/상충 발생은 미확인. 기존 archive 병합은 정상 입력에서 timestamp별 단일점 생성하므로 현재 장애로 단정 금지.
- LAST PASS: 소스상 저장·게시·공개 GET의 별도 경로와 관측/확인시각 구분 확인. FIRST UNVERIFIED: 실PC 고유 신규 observedAt/score 저장 영수증 및 D1 readback·공개 GET의 동일 timestamp 비교. 소스 위험 후보의 실제 재현 테스트도 미수행.
- 검증 수준: source read-only PASS; 신규 Node/CI 0, PC/SQLite/D1/Production 신규 실증 0, 코드 수정·배포 0. #36 DONE 아님. 중앙 #68의 최근 댓글은 타 담당 결과가 대부분으로 본 작업의 신규 승인으로 해석하지 않음.
- 다음 필수 실행 1개: W06가 현재 main 공개 GET의 상충 timestamp fixture를 기존 route 테스트에 최소 추가해 503 기대조건을 재현하고, 재현될 때만 저장값을 덮지 않는 Reader 최소 수정 및 관련 회귀를 수행. 운영 PC/D1 증거는 별도 승인 Owner 경로로 확보하며 임의 A/B/C 실행 금지.
- 전체: DONE #04,#05,#08,#10,#21,#22,#23,#24,#26,#27,#33,#34,#35 = 13/75(17.3%), 잔여 62. 이번 실행 기능 신규 DONE 0.


## 2026-11-17 05:03 KST — R4 #36 공개 CNN Reader 충돌 경로 정밀 조사 (PARTIAL)

- 담당/범위: W06, D01 CNN 공개 저장 이력 GET만. 시작/종료 단계: **13/75 (17.3%) → 13/75 (17.3%)**. 신규 기능 커밋·운영 실적 0건.
- 실제 확인: `main`의 `app/api/fear-greed/observations/route.ts` blob `67abf4bd27b16437355ad8d3d6bc22ea2edda1f4` 및 `tests/usa-fear-greed-change-only-r10.test.mjs` blob `44bd6df840e9db6dfbcd071f5af36334e84d53e8` 조회. 저장 archive는 관측시각·점수 범위·일자 일치를 검사하지만 `byTime.set(key,...)`는 동일 정규화 관측시각에 상충하는 score가 두 번 등장해도 마지막 값을 채택함. verified checks 역시 `checkedByTime.set` 중복 timestamp 상충 값 검사가 없음. 이는 소스에서 확인한 무결성 위험이며 실제 운영 데이터 손상 발생 증거는 없음.
- 기존 테스트는 같은 원천 timestamp·동일 score의 재검증 건너뛰기와 달라진 점수의 check 추가, composite signature만 다룸. **동일 observedAt에 서로 다른 score가 저장된 공개 archive Reader의 503 기대 회귀는 없음**. 정상 공식 정정은 저장기에서 동일 관측시각의 최신 점수로 정리하는 계약을 보존해야 하므로, 공개 Reader에서 이미 상충한 두 점수가 동시에 존재할 때만 INVALID를 반환하는 방어를 제안.
- 실행 제약: 지정 기록 브랜치 `codex/ui-improvements`에서 해당 두 소스 경로는 404(존재하지 않음); 현재 main의 파일을 오래된 브랜치에 임의 덮어쓰거나 브랜치 전체 병합/리베이스하지 않음. 이 회차 신규 Node fixture 실행·CI·PC SQLite·D1·API 동치·Production 확인 없음. `main` 직접 변경 금지.
- LAST PASS: 최신 main Reader의 상충 timestamp overwrite 최초 위치 및 기존 테스트 공백 특정.
- FIRST UNVERIFIED: 저장 archive 중복 timestamp/상충 score에 대한 실패 fixture 재현, 최소 Reader 보호 코드와 관련 CI, 실PC→D1→공개 API 일치.
- 다음 필수 실행 하나: **#36 W06 — 최신 main과 동일한 선별 소스 변경 경로에서 공개 Reader 상충 timestamp fixture를 실행해 FIRST FAIL을 재현하고, 실제 결함이면 정상 동일점 재전달·공식 정정 보존 조건으로 최소 보호 및 Node CI 수행**. 지정 원장 브랜치는 기록 전용으로 유지; 코드 PR은 전체 브랜치 병합 없이 정확한 파일만 통합.
- 소유/운영: W06 공개 Reader·UI; CNN 저장/게시·운영 PC/D1은 기존 원담당 승인 경계. Draft #1181/#1185, 운영 배포 및 예약 설정 변경 없음.

## 2026-11-17 07:57 KST — W06 R4 #36 상충 관측 방어 실제 소스 수정 (PARTIAL, 13/75 유지)

- 시작: 지정 진행 기록 13/75, #36 FIRST UNVERIFIED는 동일 observedAt 상충 score 회귀 및 운영 PC→D1→API 동치. 기존 검증은 재사용.
- 변경: 최신 main 기준 선별 브랜치 `codex/ui-r4-cnn-reader-conflict-20261117`, Draft [PR #1196](https://github.com/ansqhd5774-Choi/zgmini/pull/1196), HEAD `cbbb9d610e65c4e47ef510aee3a8f97d54c81191`. 변경 파일 정확히 3개: `lib/cnn-observed-reader-integrity-r1.mjs` (신규), `tests/cnn-observed-reader-integrity-r1.test.mjs` (신규), `app/api/fear-greed/observations/route.ts` (선별 수정).
- 실제 개선: 정규화한 동일 observedAt에 상충 점수가 저장되면 공개 Reader가 `STORED_ARCHIVE_INVALID` 503으로 거부. 동일 점수 재전달 및 다른 timestamp는 허용. 공식 정정은 기존 아카이브 Writer 책임으로 유지; Writer·DB·TTL·Collector·운영 설정 변경 0.
- 검증 수준: 원격 3개 소스 커밋 및 Draft PR 생성 확인. **Node CI/회귀 결과 아직 미확정**, 운영 데이터 충돌 존재 미확인, PC→D1→공개 GET 미실증, Production 검증 미실행. #36 DONE 금지.
- LAST PASS: #36 상충 score Reader 방어 source와 3개 회귀 fixture 원격 반영.
- FIRST UNVERIFIED: PR #1196 Node CI 결과 및 실제 CNN 신규 observedAt/score 로컬 저장→D1→GET 동치.
- 다음 필수 실행: PR #1196의 실제 Node CI·검증 결과를 확인하고 실패 시 정확한 3파일만 수정; 운영 실증은 원담당 승인된 기존 A급 경로에서 별도 확인.
- 기능 진행률 **13/75 (17.3%) → 13/75 (17.3%)**, 잔여 62. main 병합·Cloudflare 배포 없음.


## [2026-11-17 08:25 KST] R4 #36 — 공개 CNN 점수/PC 점검 충돌 보호와 실제 PC 이력 정체 확인

- **이번 실제 결과:** 앞선 W06 Draft #1196을 이어받아 `lib/cnn-observed-reader-integrity-r1.mjs`에 PC `checkedAt` 중복 충돌 보호를 추가하고 `app/api/fear-greed/observations/route.ts`에 적용. 같은 `observedAt`의 상충 CNN 점수는 503 `STORED_ARCHIVE_INVALID`, 같은 PC `checkedAt`의 상충 `sourceObservedAt/score`는 503 `STORED_CHECKS_INVALID`. 동일점 재전달 허용·공식 정정은 기존 Writer 권한. **D1 GET은 저장값 SELECT만**, 방문 수집/계산/쓰기 없음.
- **소스/테스트:** 기존 `codex/ui-r4-cnn-reader-conflict-20261117`의 3파일 후보를 4파일 선별 PR [#1196](https://github.com/ansqhd5774-Choi/zgmini/pull/1196)로 확장(함수·route·unit test·실제 route GET source 12 fixture). 단위시험 **6건**, 실제 TypeScript GET 컴파일/readonly D1 stub **12건**, 최종 PR head `8fa4ed62015eaeeb1fa7b4bc9d66833e99f1ffbf`의 GitHub `check` [Run 43978399160](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43978399160) **SUCCESS**. `main` 병합 SHA `40d6156a1144350c3a23a02cb0db26e56bf3adde`, Workers Builds/verify/notify 성공. 정확한 Cloudflare Production Deployment·실제 D1 공개 GET 실측은 **미확인**. 새 임시 브랜치 생성/지정 UI 브랜치 전체 병합 0건. PC 운영/DB·TTL·Cron/공급자 호출·Writer 설치 0건.
- **PC 신규 A-grade 실제 증거:** 기존 설치된 허용 operation `fear-greed-archive-status` 1회만 고유 Issue [#1806](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1806), requestId `pc-a9bdfb0e-4357-42c4-89be-b952e5c5c036`로 요청. 실제 Windows Run `43979172460`, seat 5, `PASS/FEAR_GREED_ARCHIVE_READONLY_DIAGNOSIS`, JSON/TXT 결과 `results/43979172460-1-seat-5.json/.txt` 직접 2/2 readback. `sqliteOpened=true`, `protectedStateUnchanged=true`, provider/operational/D1 writes 0. Source requested `main@40d6156a1144350c3a23a02cb0db26e56bf3adde`; 실제 PC 승인 source `2070ff53549e2f9f2cea57d5af7e1d83f9fd7388`. A급은 설치 소스 SHA 동일성 입증 아님.
- **이전 #1337과 비교:** #1337(11/12 UTC)에서 CNN 현재 `observedAt=2026-11-12T19:26:08Z`, 원본 archive **108점 마지막 11/06 23:59:54Z**, PC checks **108점 마지막 11/07 00:30:02.951Z**, 종합 archive 48점. 신규 #1806(11/16 23:25 UTC)에서 CNN 현재 `status=verified,score=31.0190476190,observedAt=2026-11-16T22:59:30Z`, 원본 archive **108점, lastAt=2026-11-06T23:59:54Z**, PC checks **108점, lastAt=2026-11-07T00:30:02.951Z**, 종합 archive **70점, latest=2026-11-16T22:45:17Z**. 즉 **실제 CNN 최신 현재값은 전진하나 신규 관측 이력/PC 확인 이력은 10일 이상 저장되지 않음**.
- **FIRST FAIL / 원인 후보:** A급 결과 `archiveTrace.alignment=HISTORY_DIVERGENCE`, `cause=UNKNOWN`; `archive-run.mjs` source gate `CHANGED`, wrapper `MATCH`, Sidecar 비인증 원장 `reportedStatus=BLOCKED` 및 `reasonConcepts=[SOURCE,SHA]`, `matchingErrorSite=NOT_CHECKED`. **승인 source/실제 파일 불일치 또는 Sidecar 게이트가 가능한 원인**이나 해당 ledger는 비인증이므로 실제 중단의 단독 인과관계 단정 금지. 공통 publicationLedger `VERIFIED`는 CNN 일별 D1 게시 영수증 아님.
- **판정:** #36 공개 Reader 구현/CI DONE, **실PC 원본 이력 최신화 및 D1 readback 미완료로 전체 #36 PARTIAL**. 전체 완료 고유번호 기존 **13/75 (17.3%), 잔여 62개** 유지. 실제 운영에서 중복/상충 기록이 있었는지도 미확인. 0/null/동일관측 check 구분 유지.
- **원담당 복구 절차:** CNN Collector/Sidecar 담당자가 #1806 실제 승인 source/Sidecar 원본 해시, 설치 manifest, active schedule/current config를 읽기전용 대조 → 정확한 승인 범위의 정규 B 수정 또는 정상 운영 source 확인 → 실제 `fear-greed-observed` 원본 관측일/건수/checkpoint 전진 → D1 날짜별 body/stored_at readback 및 공개 GET `observedAt/score` 동치 확인. 기존 Issue 재시도·우회 실행·임의 새 예약/정규 수집 재실행 지시 금지.
- **W06 다음 독립 실행 1개:** **#37 D02 한국 공포탐욕** KRX 완료 거래일·Rev7 7요인·승인 저장/게시·사이트 차트 끝점의 날짜와 점수를 검사. 위 CNN 운영 복구는 **다른 담당자 소유**, 독립 기능 전체 차단 조건 아님. 기존 #28/#29/#13 미완료 유지.
- **인계 종료 기준:** 이 절 + 상단 정본을 `codex/ui-improvements/docs/DASHBOARD_INPUT_EVENT_SCORE_TREND_R4_PROGRESS_20261116.md`에 커밋하고 13/75·#36 PARTIAL·다음 #37 및 #1196/#1806 링크 원격 재조회 PASS 이후 보고.

## [2026-11-17 08:36 KST] R4 #37 — 한국 Rev7 완료 거래일→공개 점수→UI 이력 source 추적 (PARTIAL / 13/75 유지)

- **시작 기준/경합 보호:** W06, `codex/ui-improvements` 지정 진행기록 최신 SHA `077e4da48c0dfeaf131eaacd6bcd61b46cbaff63`. 기록 작성 중 다른 W06 실행이 먼저 #36 결과를 #1806으로 기록했음을 확인하였으므로 해당 선행 기록·DONE 목록을 보존. 전체 75단계 중 완료 #04,#05,#08,#10,#21,#22,#23,#24,#26,#27,#33,#34,#35 = 13개.
- **#36 보조 검증은 중복 실적으로 취급 금지:** 별도 A급 Issue [#1807](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1807), [Run 43979685725](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43979685725) seat 6, `PASS/FEAR_GREED_ARCHIVE_READONLY_DIAGNOSIS`, 시작 08:29:27 KST, [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43979685725-1-seat-6.json)/[TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43979685725-1-seat-6.txt) **2/2 PASS**. 먼저 완료된 #1806과 동일하게 CNN current 31.019047619점 / observedAt 2026-11-16T22:59:30Z, original 108점 latest 2026-11-06T23:59:54Z, verified checks 108점 latest 2026-11-07T00:30:02.951Z, Sidecar BLOCKED/HISTORY_DIVERGENCE, 원인 UNKNOWN. `protectedStateUnchanged=true`, provider/operational/D1 writes 0. **신규 데이터 전진·새 완료 단계 0건**. #36 담당/원인 확인 및 실제 게시 증거는 기존 #1806 지시를 유지하고 중복 Issue 재실행하지 않음.
- **#37 신규 소스 연결 확인:** 현행 main `worker/korea-rev7-refresh.mjs` blob `e7f7c37c28e013ec4ee6cd5fd8d1bd860f9d79b2`는 기본 1일·최대 2일 전진, KST 18시 이후만 당일 조회, 최근 평일 `NO_TRADING_OBSERVATION` 시 `WAITING_PUBLICATION`으로 저장/계산 대기. 저장 후만 `getLatestCompleteDate → getHistory → calculateRev7 → saveSnapshot`, 계산 관측일/최신 완료일 동일성과 finite 점수를 검사. `worker/korea-rev7-d1.mjs` blob `11a39694fa5ea97bce2bd58945652814e34b95d0`은 완료 거래일만 최신값·저장 이력에 포함하고 `kfg_rev7_snapshots`에 date/Rev7 방법론/7개 요소/계산시각을 저장. `worker/korea-rev7-engine.mjs`의 7요인 동일가중/결측 비재가중은 기존 승인 산식 그대로.
- **공개 Reader·UI 연결:** `worker/korea-funds.mjs` blob `4f284339f9fd87e4207642f12815bcd2a694d997`의 `defaultLoadRows`는 D1 `kfg_rev7_snapshots`를 최신일 역순 조회한 뒤 시간순 반환, `publicSnapshot`은 1030개 성공 거래일 기준 미충족 시 점수를 null로 보존하며 완료된 행에서 최신 유효 점수/날짜와 일별 history/7요인 반환. 공개 GET `/api/indicators/korea-funds`는 SELECT 저장 자료만 읽음. `app/korea-funds-store.ts` → `app/korea-composite-view.tsx` `KoreanCountryCard`가 score/date/history를 동일 응답에서 사용하고 선택 기간별 점수를 카드 관측일 이후로 외삽하지 않음. UI에서 `score=0`도 유효 숫자 경로. `tests/korea-rev7-refresh.test.mjs` 및 `tests/korea-rev7-public.test.mjs`는 저장→계산 순서·미발표·null·0/히스토리 사례를 기존 소스 시험으로 보유함.
- **CI 참조 범위:** `main@40d6156a1144350c3a23a02cb0db26e56bf3adde` [GitHub check 43979083845](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43979083845)의 `Build/Type check/Regression tests` 작업 SUCCESS. 이는 전체 회귀 PASS 단계 증거이며 **이번 회차 새 #37 전용 테스트 실행/실제 KRX 공개일 전진 증거는 아님**.
- **FIRST UNVERIFIED:** 실제 운영 승인 KRX/BOK 일자별 저장·Rev7 계산 `kfg_rev7_snapshots` 최신 신규 완료일의 source/score, 승인 D1 게시 row/date/storedAt와 공개 GET·카드/차트 끝점 동치, exact Cloudflare Production. 이번 실행 새 수집·D1 쓰기·운영 설치/예약 변경 0건, 신규 코드 수정 0건. **#37 PARTIAL**; source 경로 존재만으로 새 KRX 완료 거래일 게시 성공 주장 금지.
- **다음 필수 실행 한 개:** W06 #37의 **실제 저장 완료 거래일 선택적 검증**. 기존 소스/테스트 재실행만 반복하지 말고 승인된 운영/공개 증거에서 Rev7 최신 완료 거래일 한 날짜를 골라 `kfg_rev7_snapshots`의 date/score/calculated_at → 공개 GET `composite.observationDate/score/history[-1]` → 카드와 차트 끝점 원점수를 대조; 공개 자료 접근이 제한되면 해당 단계만 `STATE_UNKNOWN`, 독립 후속 UI 검증은 계속. 미승인 Collector/DB/TTL/수집 주기 변경 금지.
- **진도:** 13/75 (17.3%) → **13/75 (17.3%)**; 잔여 62단계. #36·#37 PARTIAL. 단계 상태와 소스·CI/운영/Production 증거 범위 혼동 금지.


## [2026-11-17 KST] R4 #37 — KRX 완료 거래일·한국 Rev7 7요인/공개 이력 소스 검증 (PARTIAL)

- **시작/종료:** 이전 지정 원장 `codex/ui-improvements` **13/75 (17.3%)**, 다음 #37. 이번 변경은 `tests/r4-korea-rev7-completed-date-37.test.mjs` 1파일 및 이 지정 진행 기록만. **산식·가중치·DB·D1/PC 운영 source·스케줄·Provider 호출 변경 0건.** 실제 개발 main의 확인된 각 source blob: `worker/korea-rev7-engine.mjs@89c9aac25f752b4fc50e32c06afd858382254fde`, `worker/korea-funds.mjs@4f284339f9fd87e4207642f12815bcd2a694d997`, `worker/korea-rev7-d1.mjs@11a39694fa5ea97bce2bd58945652814e34b95d0`, `scripts/pc-writer/korea-publication.mjs@8a14452834097df1a3214e963e1b8f68118b3c56`; 해당 모듈 blob은 지정 브랜치와 main에서 동일.
- **계약 확인:** `REV7_VERSION=kr-fg-cnn-r7-1.0.0`; 정확히 **7요인(momentum,strength,breadth,putCall,volatility,safeHaven,junkBond)**, 평균 가중 `1/7`, 504개 유효 관측창, 미완료/결측 재가중 금지. `kfg_rev7_market_dates.status=COMPLETE`인 KRX 날짜·일치하는 version/checkpoint만 `scripts/pc-writer/korea-publication.mjs::koreaPublicationPlan`의 기존 2개 제한된 D1 INSERT 후보 생성, `NO_TRADING_OBSERVATION`, 날짜 불일치, source 관측일 필드 누락은 거절. `worker/korea-funds.mjs::publicSnapshot`의 성공 거래일 `>=1030` 검증 및 동일 method version의 마지막 유효 READY 일자를 현재 카드·이력에 사용. 후속 미완성 거래일의 null은 최신 계산값이 아님. 통계 과거 이력은 `RECONSTRUCTED_CURRENT_VINTAGE`, `pointInTimeVerified=false`, `researchOnly=true`, `productionEligible=false`로 **공식 PIT/운영 적격 확정이라고 표현 금지**. 이 정책/메타데이터는 변경하지 않음.
- **실제 신규 시험:** 지정 브랜치 `tests/r4-korea-rev7-completed-date-37.test.mjs` 신규 커밋 `ac745f2de70fcf9149a3d2ad943afef82d437cb9`, **12개 시험**, 실제 원본 `publicSnapshot,stageForDisplayScore,koreaPublicationPlan` 함수와 Rev7 상수 source를 비식별 기존 저장 fixture에 주입하여 **12/12 PASS**(7요인, 완료일 최신점·변환, WARMUP 다음 날짜, version 분리, 1030 Gate, 실제 없는 중간 날짜 보간 금지, 0점, STALE, PIT 비검증 표시, 완료일 2개 INSERT, NO_TRADING/버전/날짜/필수 관측일 거부). 초기 순수 소스 시뮬레이션 **9/9 + 5/5 PASS**도 확인; 별개 실행이며 같은 원본 기능을 반복 성과로 이중 계산하지 않음. **GitHub 해당 W06 브랜치 CI 미실행**, 모의 함수 실행은 실D1/실PC/Production 증거 아님.
- **상태/문제:** SOURCE/FIXTURE PASS. **현재 운영 KRX 실제 마지막 COMPLETE 거래일·7요인 score·D1 저장 `kfg_rev7_snapshots` 최신 `date,source_observed_at,calculated_at,methodology_version` 및 공개 `/api/indicators/korea-funds` 점수/차트 일치**는 이 실행에서 실측하지 못함. 전용 A급 `korea`/Rev7 operation은 현재 승인 config의 허용목록에 없음. 미승인 PC shell/DB 조회·원자료 수동 생성·공용 Writer/B 설치로 우회하지 않음. #37 **PARTIAL**, 전체 **13/75 (17.3%), 남은 62단계**.
- **#37 정확한 Owner 후속:** 한국 KRX/Rev7 원담당이 기존 승인 PC/D1 Reader 또는 공개 안전 GET의 실제 관측·이력 근거를 확보해 **마지막 완료 KRX 거래일, 7개 요인 모두 유효/0/null 분리, D1 sourceObservedAt vs calculatedAt, 신규 완료일 게시와 이전 유효점 보존**을 재조회·증명. 그 증거가 확보되기 전 운영 완료로 판정 금지. 추가 서빙 정책 변경·과거 PIT 임의 복원 금지.
- **W06 다음 독립 실행:** **#38 D03 미국 등락** — IEX 승인 임시 phase·상승/보합/하락 3비율, 기존 저장/공개/UI 경계 검사. 폐기 MarketParquet·기타 데이터 무단 대체 및 0–100 새 점수 계산 금지. #36 CNN 원담당 복구와 #37 한국 원담당 관측은 별도 비차단 후속.
- **종료 기록 기준:** 상단 정본 + 본 실행 내역을 `codex/ui-improvements/docs/DASHBOARD_INPUT_EVENT_SCORE_TREND_R4_PROGRESS_20261116.md`에 커밋, 원격 재조회로 **#37 PARTIAL·13/75·다음 #38·12/12 source PASS** 확인 후 사용자 보고.

## [2026-11-17 08:38 KST] R4 #38 — 미국 IEX 잠정 등락 3비율 공개·UI source 연결 조사 (PARTIAL)

- 담당/시작: W06, 지정 원장 codex/ui-improvements. 기존 #36/#37 운영 미완료와 별개의 D03 업무. 진행률 13/75 (17.3%) 시작.
- 소스 실제 확인: main@40d6156a1144350c3a23a02cb0db26e56bf3adde에서 lib/market-breadth/us-provisional-r1.mjs blob 5c46f67cdd941b297f6b68b425de26bfcb13808d, app/api/market-breadth/route.ts blob d070d03824090b9b54779f05f24c46d2ff6f5186, app/market-breadth-strip.tsx blob ede282d5e875ad8b4f7ba4c65d92b8801aaf0fcc, tests/us-breadth-ui-provisional-r22.test.mjs blob 1b39a214720de064fcc557f2911a619e41cf0f7a 확인.
- 현재 구조: 승인 Alpaca IEX 15분 잠정 관측은 이전 장 기준 종목 상승/보합/하락 3건수와 관측 불가 누락 건수를 분리. 공개 파생 비율 risingPct/unchangedPct/fallingPct/unobservedPct는 동일 eligible expectedCount 분모 사용. 방문 API GET phase=provisional은 D1 public:market-breadth-provisional-r1:usa의 저장된 body/stored_at만 SELECT, 스키마·NY 세션/30분 신선도·게시시각 검증 후 숫자/기준일/관측시간 반환. 사용자 카드 컴포넌트는 해당 GET을 정기 읽고 3비율만 표시, 미관측%는 별도 안내, 실수치 없으면 미제공. 0 정상, null/누락 구분, 새 0–100 점수 계산 없음.
- MarketParquet: phase=confirmed-r2는 공급자 제거 코드로 503; 카드에서 과거 확정 이력 fallback 없음. 기존 기본 confirmed R1은 별도 승인 경로. 퇴역 공급자 사용/복구/유료 재구매 금지.
- 검증: 관련 source·기존 테스트 계약 조회 PASS. 이번 회차 새 Node 실행/CI/실D1/실PC/Cloudflare exact Deployment/브라우저 실증 0. 기존 main CI가 PASS라도 실제 신규 비율 게시 성공이 아님. 실제 데이터 없는 시간대에 잠정 점수를 생성하지 않음.
- LAST PASS: 저장된 IEX 잠정 key→공개 read-only GET→미국 등락 카드 3비율 계보 확인. FIRST UNVERIFIED: 동일 관측의 D1 body/stored_at과 GET header+payload, 카드 UI 실제 값 일치 여부. 마찬가지로 승인된 PC 게시 관측 미확정. #38 PARTIAL.
- 다음 필수 실행 1개: W06 #38의 승인된 기존 잠정 게시 영수증/공개 GET에서 기준일·slotEndUtc·상승/보합/하락/미관측 비율을 선택적 비교. 실측 접근 제한 시 해당 운영 조건만 STATE_UNKNOWN; 원담당 수정·DB/주기/예약 변경 0.
- 종료 진행: 13/75 (17.3%), 잔여 62개. DONE 추가 0; 소스 경로 확인을 운영 완료로 확대 금지.

## [2026-11-17 KST] R4 #39 — 한국 등락 counts 미연결 및 향후 완료 거래일 표시 경계 감사 (DONE: UI/설계)

- 담당·범위: W06의 한국 D04 UI 미연결 상태 감사 및 한국 원담당에게 필요한 안전 입력계약 정의. 운영 Collector·Writer/DB·산식 변경하지 않음. 시작 13/75(17.3%).
- LAST PASS(현행 UI 직접 소스 증거): `app/country-fear-greed.tsx` blob `1a7448f627a2c445f1939055dbea7caecbecf477`는 `<KoreanCountryCard/>`로 렌더링, `app/korea-composite-view.tsx` blob `4705fa8b0355e9cdae41b34096adf9ed60dd5e48`는 `showBreadth=false` 기본·`showBreadth && !detail`에만 한국 breadth 스트립을 마운트. 따라서 현재 대시보드에서 한국 등락 별도 3비율을 실제 보유하지 않은 채 표시하지 않음. `tests/public-feed-storage.test.mjs` blob `37e62b8d1df4b407382f62e21944e0b9d1fe352a`는 showBreadth 부재를 명시적으로 보호하고 있으며 main CI 회귀 단계 SUCCESS 기존 증거 재사용.
- 추가 boundary: `app/market-breadth-strip.tsx` blob `ede282d5e875ad8b4f7ba4c65d92b8801aaf0fcc`의 한국 경로는 USA IEX와 분리되어 선택적 `counts`만 `normalizedCounts`로 검증; 총 0건/음수/정수 아닌 값은 미제공이며 연결할 counts 없는 경우 `연결 예정` 문구. 이 컴포넌트의 현재 counts 타입에는 `observationDate`/완료 거래일·sourceVersion·stored_at가 없음. 따라서 **현재 counts-only props를 무조건 연결하면 신규 KRX 완료 거래일 적격성·이전 유효 거래일 이월을 증명할 수 없으므로 그대로 노출하면 안 됨**. 안전 연결을 위해 한국 원담당이 별도 승인 저장 결과에 완료 거래일·건수·저장시각/원천 계보를 포함하고 READY/결측/휴장/STALE을 판정한 후 UI props를 전달하도록 인계. 새 API/점수/중복 Collector를 임의 설계·설치하지 않음.
- 완료 판정: #39는 '현행 미연결 정직한 표시 + 후속 신규 거래일 연결 조건 명시/소유 분리'라는 **감사·경계 설계** 요건 DONE. 실제 신규 한국 등락 counts 수집·D1 게시·공개 표시 DONE이 아니며 그 구현은 한국 원담당의 별도 미완료. 이번 신규 Node 실행·PC 운영/D1 쓰기·Cloudflare Production 확인 없음. 소스·이전 CI 재사용 범위와 운영 적용을 구분함.
- FIRST UNVERIFIED/남은 조건: 한국 원담당이 승인된 COMPLETE 거래일 counts/원천·저장시각 및 독립 표출 계약을 제공하기 전에는 새 UI 비율 표시 불가. 임의 IEX 값 한국 재사용·합성 0~100 점수 생성·가짜 보합 0 불허.
- 다음 단 하나의 실행: W06 #40 미국 종합점수 12도메인 중 유효 입력 1개 변경이 실제 재계산→current→composite-observed 점과 차트에 연결되는지 기존 소스·선택적 유효 자료·fixture 확인. 13/75→14/75 (18.7%), 잔여 61; #36/#37/#38 PARTIAL 계속, 원담당 운영 미완료 차단 확대 금지.

## [2026-11-17 08:52 KST] R4 #40 — D05 실PC 계산 사건 원장·실점수 아카이브 시각 대응 확인 (PARTIAL)

- 담당·시작: W06 #40, 고유 DONE 14/75(18.7%), 잔여 61단계; 현재 main `40d6156a1144350c3a23a02cb0db26e56bf3adde`, 지정 기록 브랜치 `codex/ui-improvements`. 기존 #04/#05/#14~16/#21~27/#35 source/fixture 증거 재사용, 산식/DB/예약/수집기/Writer 변경 0.
- 실제 source 연결: `scripts/pc-writer/run-local.mjs` blob `18a1bbb7f73e8523b5faf0f5c6d12f829e67be3d`는 `calculateMarket`(stored inputs, 공급자 네트워크 차단)→`marketOperationalStore.writeScore` 로컬 current/day→`appendCompositeObservedFromCurrent` 로컬 실계산 archive→`publishMarket` 현재 D1→`publishCompositeObservedArchive` 공개 이력 순서. `scripts/pc-writer/market.mjs` blob `84e346529059149698cd39a6d2c03bdfaa8526ed`는 기존 CM-R1 12도메인 완료 계약. `lib/composite-observed-history-r1.mjs` blob `e1025e47acdec8233c26fb17f7496be02c24698f`는 실제 12개 READY/점수 범위/서명·15분/일100 기존 정책 유지. `scripts/pc-writer/composite-observed-archive-r1.mjs` blob `030d3d5d1a63b21b503459c635ddf469c24b95af`는 same `expectedAt` current 확인 후 local 저장/조회 및 D1 body/stored_at 재조회 경로. 실제 1건 입력 계보를 자동 증명하는 것은 이 코드의 존재만으로 불가능.
- **새 승인 A급 실제 실행:** [PC Issue #1813](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1813) requestId `pc-w06-r4-d05-lineage-20261117-0844-4e7b`, [Run 43982823247](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43982823247) attempt 1/seat 4, `PASS / D05_READONLY_DIAGNOSIS` 2026-11-16T23:51:29Z~23:51:34Z. 실제 Controller SHA `e3a495c97d6b40d6d4eea2ff4f586bef46216eb7`, PC 승인 source `2070ff53549e2f9f2cea57d5af7e1d83f9fd7388`. [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43982823247-1-seat-4.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43982823247-1-seat-4.txt) 2/2 readback PASS, protectedStateUnchanged=true, providerCalls/operationalWrites/d1Writes=0, sqliteOpened=false.
- **신규 실측 비교:** 종전 #1609 (2026-11-16T09:21Z) `eventCount=25`, `currentApprovedSourceEventCount=0`, `distinctCalculatedDates=6`, latestCalculatedAt `2026-11-16T00:00:18.533Z`; 이번 #1813 `eventCount=32`, `currentApprovedSourceEventCount=7`, `distinctCalculatedDates=6`, latestCalculatedAt `2026-11-16T22:45:17.257Z`, latestRecordedAt `2026-11-16T22:45:40.551Z`. 기존 승인 A #1807가 읽은 실제 PC composite archive lastAt도 `2026-11-16T22:45:17.257Z` (70점/15일)로 **시각 동일**, 하지만 독립 결과를 결합한 인과/동일 D1 body 증명은 아님.
- **LAST PASS:** 자체 저장된 D05 계산 사건 원장의 검증 가능한 사건/승인 소스 사건 증가 및 로컬 composite archive 시각 대응 확인. `lineage.evidenceLevel=SELF_CONSISTENT_LOCAL_LEDGER_ONLY_NOT_LIVE_EXECUTION`로 명시됨; `sqliteOpened=false`, A는 입력별 원시 row/checkpoint·local current score·D1 body/stored_at 및 공개 GET을 확인하지 않음. 과거 입력 1개가 실제 신규 유효였는지와 나머지 11개를 정확히 재사용했는지 알 수 없음.
- **FIRST UNVERIFIED:** 신규 입력의 정확한 ID/observedAt/sourceStoredAt→승인 CM-R1 계산 signature/current→composite-observed 점수·calculatedAt→D1 current·observations 공개 API body/stored_at의 선택적 종단 일치. #24의 15분 이내 두 사건 손실·Draft #1185 Writer 정책도 원담당 미완료로 유지; W06가 미승인 보존 정책/산식을 수정하지 않음.
- **#40 판정:** source 경로·실PC 원장/아카이브 전진 유효 증거를 얻었으나 계획 완료 조건까지 증명되지 않아 PARTIAL, DONE 증가 없음. Writer/D05 운영 원담당은 기존 승인 경로의 단일 유효 변경 사건이 있는 경우에만 정확한 저장 checkpoint/score/date 및 D1 readback을 비교. 중복 A 조회·새 예약/추정 자료 생성 금지.
- **다음 필수 실행 하나:** W06 #41 인플레이션 위험 R2 16입력/7축 및 6/7 유효 이월·READY/STALE 조건을 화면·실제 공개 Reader에서 조사, 변경 필요한 UI만 최소 수정. 물가 W01 운영 수집/계산/게시 판단은 원담당 범위. 진도 시작/종료 14/75 (18.7%), 잔여 61.

## [2026-11-17 KST] R4 #41 — 인플레이션 R2 16입력·7축/화면 공개 계약 확인 (PARTIAL)

- 담당·기준: W06, source/UI reader만 조회; 14/75(18.7%) 시작 및 종료, 잔여 61단계. 최신 확인 main SHA `40d6156a1144350c3a23a02cb0db26e56bf3adde`, 코드 수정·DB/TTL/Writer/공급자 호출·예약 변경 없음.
- 소스 진단: `lib/diagnostic-layer/inflation-r2-stored.mjs` blob `d819410f68543ec6cf177311b4d840277c85bae4`는 16 feature의 `availableAt<=asOfDate` 유효 저장값을 선택, 7개 axis 산출의 missing을 검증. **7축 score 합성은 7/7 유효해야 READY**, 단 한 축이라도 missing이면 `status=PARTIAL,score=null`로 fail closed. 일부 입력의 기존 유효값 이월과 7축 READY 조건을 혼동해 6/7 축을 강제로 READY로 만들지 않음.
- `worker/projection-builders/inflation.mjs` blob `aeea00b0bc8d52cbb6d117115186b63946dbcea0`는 저장된 PIT/PC1 status·결측/문제에 따라 별도 PARTIAL 점수 null 응답, 정상 7축 계산/완료시 `score=current.score,status=READY`와 실제 계산 가능한 12개월 월말 trend·비교시각을 생성하며 방문 시 API 재수집 없음. 통상 텍스트의 6/7 이월은 이미 적격 저장값 사용 조건일 뿐 7축 missing을 무시하는 가중치 변경이 아님.
- 공개/화면: `app/api/inflation-detail/route.ts` blob `3dc2ccb71d852aff83e1b1bd9916db01199d6780`은 저장 projection GET만. `app/dashboard-ui.tsx` blob `5ebaf7d0dd932ee5543f6f312b9f1fa4324863ce`의 risk inflation 카드는 `/api/inflation-detail`만 이용하고 `status==='READY'`·유효 numeric score로 표시, 12경제 물가 4요인 카드와 혼합하지 않음. `app/inflation/inflation-panel.tsx` blob `fd2fb09d70d6a8a2e0e18cd413e0c1b525f081fe`도 같은 GET, 7축 배치·이력/기간별 비교 시점 표시. `tests/dashboard-risk-inflation-r2-parity-r42.test.mjs` blob `926698d57b762c87144f5b69324c751d32c03a67`는 동일 endpoint 및 경제12 4요인으로의 잘못된 fallback 금지 단언. main CI 기존 PASS를 재사용(이번 새 Node 테스트 실행 없음).
- LAST PASS: 16 입력/7축 산식 source · 저장 PIT/부분 결측 방어/대시보드-상세 공개 API 일치 경로 확인. FIRST UNVERIFIED: **실제 W01 유효 1개 신규 입력/정정의 식별자·PIT 사용 적격성→각 축 값·7축 READY→D1 원문/stored_at→공개 GET/차트 마지막점 동치**는 이번 W06 Source 조회로 증명 불가. 원담당이 검증한 최신 실제 게시 결과를 사용해야 하며 W06가 기존 Gate를 무단 해제하거나 없는 값 보간하지 않음.
- 상태: 계획 #41 **PARTIAL**; source 일관성만 확인, 실제 운영 PC/D1/exact Production 추가 확인 없음. 전역 BLOCKER 없음; 다음 독립 필수 실행 #42 W06 D07 경기침체 위험 UI/Reader, 원담당 계산·운영은 별도. 진도 14/75(18.7%), 잔여 61.

## 2026-11-17 08:56 KST — R4 #42 D07 경기침체 위험 저장 Reader/UI 소스 추적 (PARTIAL)

- 시작 기준: 원장 14/75 (18.7%), #42 다음 실행. 기존 #36 PR #1196의 GitHub Actions Run 43974966196 check job 완료 SUCCESS(빌드·타입검사·회귀시험 포함). 이는 운영 CNN archive 복구 증거가 아니며 #36 PARTIAL 유지.
- 실제 조회: 현재 기본 브랜치 `worker/projection-builders/recession.ts`, `app/api/recession-detail/route.ts`, `app/recession/recession-panel.tsx`; 원장 브랜치 계획서 #42 완료 조건 확인. 새 기능 코드·PC·DB·D1·배포 변경 0.
- 확인: 7요인 PAYEMS/GDPC1/INDPRO/DPCERA3M086SBEA/UNRATE/RRSFS/DSPIC96을 R13 계산기에 전달. `snapshot()`은 요인별 `observationDate<=asOf` 중 최신 유효 숫자를 개별 선택하며 7개 점수의 승인 계산기를 호출. 월별 이력은 `snapshot(rows,date)` READY·유효 점수만 공개하고 `methodologyVersion=RECESSION_R13_CURRENT_VINTAGE`, `historyMode=STORED_INPUTS_CURRENT_VINTAGE`, `lookAheadSafe=false`를 별도 명시. 공개 GET은 기존 D1 projection 저장값만 읽고 재계산하지 않음. UI는 현재 점수와 trend를 같은 `/api/recession-detail`에서 읽고 7개 요인의 관측일/현재값/이전값을 별도로 표시.
- LAST PASS: 기존 R13 7요인 선택→저장 projection→공개 Reader→상세 카드/차트의 소스 연결 및 current-vintage 구분 확인. FIRST UNVERIFIED: 실제 신규 유효 월/분기 입력 1건이 이전 6개 유효값과 결합되어 운영 PC 재계산·저장·D1 GET·UI 마지막점까지 전진하는 동일 시점 증거. 이력은 lookAheadSafe=false이므로 최초 발표 당시 vintage로 해석 금지.
- 단계 판정: #42 PARTIAL, DONE 추가 0, **14/75 (18.7%) → 14/75 (18.7%)**, 잔여 61. 소스 조회만으로 운영 완료 주장 금지.
- 다음 필수 실행 1개: #42 위험 원담당의 기존 승인 PC R13 저장/게시 영수증에서 신규 유효 관측일·점수 1건을 특정하고, 동일 D1 `/api/recession-detail`의 현재 점수·7개 components·trend 마지막점과 대조. 원본/게시 차이가 실제 확인될 때만 담당 범위 최소 수정. 승인 없는 Writer/산식 변경 금지.
- 원격 인계: 본 파일 갱신 커밋 후 재조회로 확정; Production PC/모바일 신규 실화면 검증 0건, API/UI 동치 미확정.

## [2026-11-17 09:05 KST] R4 #42 — 경기침체 R13 화면 표시 방어 결함 수정, PR #1197 CI 진행 중 (PARTIAL)

- 기준: main `40d6156a1144350c3a23a02cb0db26e56bf3adde`, 기록 전용 브랜치 `codex/ui-improvements`, selective branch는 기존 #1196의 `codex/ui-r4-cnn-reader-conflict-20261117` 재사용(새 브랜치·리베이스·강제 push 없음). 목표는 D07 월/분기 7요인 Current Vintage 공개 점수·일간 차트 충돌 방어. 시작/종료 현재 14/75(18.7%), 잔여 61.
- 확인 소스: `worker/projection-builders/recession.ts@3c2e616b512d01af461f548e1bfc7c8ae0a7107c`의 7요인(고용 25%, GDP 15%, 산업생산 15%, 실질소비 15%, Sahm 10%, 소매판매 10%, 가처분소득 10%), 월/분기 최신 적격값 사용, `RECESSION_R13_CURRENT_VINTAGE`/`STORED_INPUTS_CURRENT_VINTAGE`/`lookAheadSafe=false` 및 재구성 이력으로 명시. `worker/projection-builders/recession-stored-history.mjs@648ea98db5fe4a86db078d0fe4342e9ffc484a4e`의 GDP 분기 레이블·점수 비교는 원본 함수 유지. `app/api/recession-detail/route.ts@e700155b77b56bfa0d8136c8006d3417afce91ec`은 저장 D1 projection GET만. 공개 API 직접 web fetch는 접근 실패, `/recession/` SSR 페이지 반환은 관측됐으나 client 저장 API 정상 수치 증거로 사용 금지.
- **실제 결함:** `app/recession/recession-panel.tsx` 원본에서 `status`가 `PARTIAL`/`STALE`여도 payload.score numeric만으로 카드에 READY 점수 출력; history는 출처/방법론·미래기준일·동일날짜 상충을 제한하지 않고 마지막 이력점을 사용. 새 저장값이 오거나 불일치 응답 순서일 때 카드/차트 기준 불일치 위험.
- **최소 실제 수정:** 신규 pure display gate `lib/recession-stored-display-r4.mjs`와 실제 `app/recession/recession-panel.tsx`만 수정. R13 정확 버전/Current Vintage 표기/READY/status/계산 asOfDate/유효 0~100/미래·동일날짜 충돌/0·결측 구분 강제, 유효 0은 유지하고 불일치 차트점 숨김. 1주/월/분기 기간 비교는 검증 안 된 score면 null만 표시. 기존 7요인, 월/분기 산식, 수집·계산·저장·공개 schema·TTL/주기/15분/100개 보존 변경 0.
- **9개 실제 함수 기반 회귀:** `tests/r4-recession-stored-display-42.test.mjs` 추가; READY 0·100, PARTIAL/STALE 숫자 차단, 버전/빈티지/PIT 혼동, 날짜 유효성, 미래/NULL 이력, 현재 기준일 충돌, 동일날짜 서로 다른 이력, 기존 정상 기록 정렬 및 실제 컴포넌트 연결 assert. 기존 tests/recession-stored-history-r3 등 직접 수정 없음.
- **PR:** [#1197](https://github.com/ansqhd5774-Choi/zgmini/pull/1197) Open, base main, head `0f3f4c33de526981b14f971f99a140ef7b45bcb4`, GitHub REST PR files **정확 3개** 확인(화면 1, helper 1, 테스트 1). [CI run 43984153369](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43984153369)에서 Build/Typecheck SUCCESS, Regression RUNNING (이 기록 당시), 아직 전체 PASS·merge·Production 미판정.
- **LAST PASS/FIRST UNVERIFIED:** 세 파일 원격 재조회, PR diff 범위/Build/Typecheck PASS. 회귀 전체/PC recovery/Cloudflare contracts CHECKING. 운영 신규 7요인 input 선택적 sourceStoredAt/score→local/개별 D1/공개 GET/화면 동치, exact Production Deployment ID 및 사용자 확인 불가. Plan #42 PARTIAL 유지.
- **정확한 다음 단 하나의 실행:** W06 #42 PR #1197 CI 결과 회수 → 실패 없으면 선별 병합 → merge SHA/기능 diff 및 원격 진행기록 readback → #42 source 수정 DONE 범위 판단, 실운영 신규 요인→D1 게시 미완료는 원담당으로 분리. #43 D08 독립 소스 진행을 그 다음 시작.

## [2026-11-17 09:08 KST] R4 #42 후속 — PR #1197 정규 선별 병합 완료, Runtime 종단은 미완료

- 이전 기록의 PR #1197 Open/CI RUNNING은 당시 상태이며 **현재는 PR CI 및 선별 main merge 성공**으로 상단 정본과 이 항목을 우선. 참조: [PR #1197](https://github.com/ansqhd5774-Choi/zgmini/pull/1197), [CI Run 43984153369](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43984153369) `conclusion=success`, Build·TypeCheck·Regression tests·PC publication recovery tests·Cloudflare candidate read contracts **모두 PASS**.
- merged PR exact head `0f3f4c33de526981b14f971f99a140ef7b45bcb4`, base start `40d6156a1144350c3a23a02cb0db26e56bf3adde`, merge commit `04cbb286e3b94145bfac95bde927aa32847f1eea`. PR 변경 파일 오직 `app/recession/recession-panel.tsx`(7 변경), `lib/recession-stored-display-r4.mjs`(33줄), `tests/r4-recession-stored-display-42.test.mjs`(68줄). PR merge 직후 main branch SHA와 표시함수 호출/파일 blob 재조회 **PASS**.
- **실제 수정 증거:** 기존 API `status=PARTIAL`인데 score numeric이 남아 표시되던 문제, R13 이외 방법론·lookAheadSafe 불일치, 미래 날짜/동일날짜 충돌을 정확한 UI Current Vintage 표출에서 걸러냄. 9개 기존 source 함수 기반 fixture 추가(READY의 0/100, PARTIAL/STALE, wrong method/vintage/PIT, null/malformed/future, 충돌·중복 정상점). 원천 7요인 계산·가중치·저장/원자료·PC source/TTL/스케줄·15분 기록 정책 **변경 없음**.
- **현재 후속 검증 범위:** merge SHA 기준 GitHub `check`/`verify`/`notify` 및 Cloudflare Workers Builds 신규 실행은 이후 2026-11-17 KST에 **4/4 SUCCESS**로 직접 readback; 빌드 완료도 exact Production 배포나 실제 API GET·화면 점수 변화 증거가 아님. 공개 `/api/recession-detail`는 웹 조회 도구에서 본문 확보 실패, `/recession/` SSR의 기본 로딩 상태만 읽힘. 실제 live API 실패로 단정 금지.
- **#42 판정:** display source/CI/merge DONE, R4 #42 전체는 여전히 **PARTIAL**(신규 7요인 하나→기존 적격 6요인 이월/점수→실PC SQLite→D1 선택적 readback→공개 GET/차트 일치 미확정). 실제 관측이 생긴 다음 정상 승인 경로를 원담당이 재조회해야 하며 W06 임의 재계산/운영 수정은 금지.
- **다음 필수 실행:** W06는 비차단 **#43 스태그플레이션 확정/잠정 월**의 현재 UI/API 저장 계보 및 잘못된 혼합 표시부터 확인. #42 원담당의 실제 종단 조건은 별도 미완료. **14/75 (18.7%) → 14/75 (18.7%)**, 61개 잔여.

## [2026-11-17 09:12 KST] R4 #43 — 스태그플레이션 완료월/잠정 데이터 공개 계약 분리 감사 (PARTIAL)

- 담당/범위: W06 D08 read-only UI/Reader 비교. #42 PR 병합 결과와 별개. 전체 75 중 고유 DONE 14개 그대로(18.7%), 미완료 61개. 개발 main SHA `04cbb286e3b94145bfac95bde927aa32847f1eea`; 현재 원격 Production Deployment exact SHA는 미확정.
- **확정 월 산출·공개:** `scripts/pc-writer/stagflation-publication.mjs` blob `533fb933f5ad7264d9cb46b5d0c7aaad03db634e`는 저장된 이전 입력·유효 원본/최근성/승인 상태에서만 `prepareStagflation`을 생성, 독립 D1 `detail:stagflation-risk:s21` 게시 후 row readback. `worker/stagflation-public.mjs` blob `a90ba7e7ff0e2e8acc8ce39e6c9f6c93f9f3d1c1`는 승인 S21 방법론, `CURRENT_VINTAGE_RECONSTRUCTION_NOT_PIT`, 정확 13개 연속 완성월/READY, 0~100 score, 마지막월/마지막점 같음·sourceStoredAt 및 표시 freshness를 검증한 경우만 200, 아니면 503/null(오래된 값을 새 확정으로 표시 금지). 별도 1주 비교는 `null`이고 1/3/6/12개월 비교는 실제 저장 이력.
- **잠정 발표 조합:** `scripts/pc-writer/stagflation-latest-publication.mjs` blob `1750f23059b454e674304f8751d8617fa0ed650f`는 승인 8입력의 newestInputMonth가 confirmed.observationMonth보다 미래일 때만 독립 잠정 게시; 동일/이전 월이면 `NO_NEWER_INPUTS` 및 superseded 표기. `worker/stagflation-latest-public.mjs` blob `f42fec698a4462f8bd9cf18da5141e626c77f1c2`는 잠정·확정 키 분리, 유효 승인·갱신 시각·실제 새 발표 월/완성월 도달 여부 검증 및 `PROVISIONAL_SUPERSEDED`면 503으로 숨김. 다른 완료월 지표로 잠정값을 강제 확정하지 않음.
- **화면:** `/api/stagflation-risk-detail`은 확정 Reader만, `/api/stagflation-risk-provisional`은 별도 잠정 Reader만. `app/stagflation-risk/stagflation-panel.tsx` blob `a4914b1ef46b4254d184a5bd34d1fdec3bd8590d`의 확정 카드는 READY score와 월별 1년 차트만, `app/stagflation-risk/stagflation-latest-panel.tsx` blob `719dab69e471d494cd01cfcbfa3c17d62a7bb16a`는 기존 `readyLatestStagflation` 검증 후 **명시적으로 '점 · 잠정'** 및 별도 dashed 차트 표시. 현재 source 상 확정·잠정 화면 점수의 단순 혼합 발견되지 않음.
- **회귀 기존 증거 재사용:** `tests/stagflation-publication.test.mjs` blob `2209c00f7a9b3db45837e86f84f6575094133d72`, `tests/stagflation-latest-publication.test.mjs` blob `d072ecffcd642b392d8ea4429c7a0aae7f8fe371`는 분리 key, 신규 발표 월 확인, 중복 score/오래된 저장·superseded 차단, D1 쓰기 readback을 검증. PR #1197의 main regression CI 단계 PASS(현재 재사용된 기존 테스트이며 이번 회차 새 테스트 작성/별도 실행 없음). #42 병합 SHA Cloudflare Workers Builds/verify/notify SUCCESS, exact Production Deployment/SHA 및 이번 단계의 사용자 API 본문은 미확인.
- **LAST PASS/FIRST UNVERIFIED:** 승인 저장→확정 S21 vs 잠정 R21 별개 저장/API/UI 계약·원본 테스트 source PASS; 실제 신규 저장 이벤트의 관측월/점수·확정 latest 월과 D1 stored_at/readback·공개 각 GET 응답/화면 값 비교 **미검증**. 실제 신규 발표 전까지 기다리는 작업은 Gate 아님. 새 스태그플레이션 Collector/Writer/산식·게시 주기·DB 변경 0. #43 전체 **PARTIAL**, 전체 14/75 (18.7%) 유지.
- **다음 필수 실행:** W06 #44 HY/IG/CMDI/변동성 신용 위험 공개 Reader·UI와 저장 새 입력 연계. 스태그플레이션 신규 월 실제 공개 증거는 원담당이 승인된 최소 D1/GET 계약으로 별도 검증.

**#42 post-merge 최종 CI readback 추가 (2026-11-17 KST):** `main@04cbb286e3b94145bfac95bde927aa32847f1eea` GitHub Checks `check/verify/notify/Workers Builds: zgmini-migration-candidate-r5` **4/4 completed+success**. PR #1197의 별도 기존 head CI도 PASS. Git Integration 빌드 성공은 정확한 Cloudflare Production Deployment ID/SHA/공개 GET·UI 게시 검증과는 구별한다.

## [2026-11-17 KST] R4 #44 — 신용 위험 R1 점수·차트 표시 정합성 결함 재현 및 수정 (PARTIAL: UI 소스/CI/main 병합 완료)

- **실행 범위/계획:** W06 D09. 시작 14/75(18.7%), 종료 14/75(18.7%), 잔여 61단계. baseline main SHA `04cbb286e3b94145bfac95bde927aa32847f1eea`, 마감 main `e9d212660dfa9955fd3370de5cd68e856f84d093`. 지정 원장 브랜치 `codex/ui-improvements`에 원장 업데이트, UI 안전 수정은 이전 #1196·#1197 선별 병합 브랜치 `codex/ui-r4-cnn-reader-conflict-20261117` 재사용.
- **기존 4요인 source:** `worker/projection-builders/creditRisk.ts` blob `2c7e852a97e76639cd1aaaa3d7057b831f869992`에서 승인 HY CMDI 0.35, IG CMDI 0.35, Total CMDI 0.10, 채권 변동성 0.20을 이미 저장된 각자 마지막 적격 row로 계산. `publicDiag`가 READY인 때 score를 승인 current로 사용하고 `recalculated`와 비교한 `scoreMatch`가 true일 때만 `withVerifiedCurrentCreditPoint`를 기존 이력에 추가. 저장된 유효 신규 금리 변동성 1건은 CMDI 최신 유효값 이월 가능하지만 정확한 실운영 source row/checkpoint→D1 원본 매칭은 이번 W06 증거에 없음.
- **LAST PASS = 실제 UI 결함 재현:** `app/credit-risk/credit-risk-panel.tsx` 이전 코드에서 API `status=PARTIAL`/`STALE`, 모델·이력 계보 불일치 또는 `scoreMatch=false`여도 `score` numeric이면 카드 READY처럼 출력, 공개 `trend`의 미래 날짜/중복 상충을 무검증 월별 최신점으로 선택할 위험. `app/api/credit-risk-detail/route.ts` blob `7692c1c1157a0a0ca0f901edaf303fc33ef79894`는 기존 D1 저장 projection GET만; source 결함의 소유는 화면 표시 쪽으로 좁힘.
- **실제 최소 수정:** 신규 `lib/credit-risk-stored-display-r4.mjs`(approved R1/vintage/READY/valid asOf/score 0–100/**scoreMatch=true** 보장, 미래·같은 날짜 상충 및 invalid score 제거, 월별 실제 마지막 관측만 선택), 기존 `app/credit-risk/credit-risk-panel.tsx`는 해당 pure helper를 호출하고 미검증 score의 비교값은 null로 표시. 신규 `tests/r4-credit-risk-stored-display-44.test.mjs` **10개**: READY 0/100, PARTIAL/STALE 숫자, 계산값 불일치, 방법론/vintage, malformed date, missing/null, 미래·충돌, 중복, 월별 최신 및 실제 컴포넌트 연결. 변경 파일 정확 **3개**, 기존 모델/가중치/Collector/Writer/SQLite/D1/TTL/주기/보존 정책 변경 0.
- **GitHub 결과:** [PR #1199](https://github.com/ansqhd5774-Choi/zgmini/pull/1199) 변경 정확 `app/credit-risk/credit-risk-panel.tsx`,`lib/credit-risk-stored-display-r4.mjs`,`tests/r4-credit-risk-stored-display-44.test.mjs`; head `03504b2b8c34a39aa2192b77bd60dee653eef9e8`, [GitHub CI Run 43985578596](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43985578596) **completed SUCCESS**: Build, Type check, 전체 Regression tests, PC publication recovery tests, Cloudflare candidate read contracts 전부 PASS. main 병합 완료 SHA `e9d212660dfa9955fd3370de5cd68e856f84d093`, main `app/credit-risk/credit-risk-panel.tsx` guard 연결 및 신규 10개 테스트 정의 원격 재조회 PASS.
- **공개/운영 구분:** `https://zgmini.kr/credit-risk/` 서버 HTML은 신용 위험 UI 페이지 노출을 확인할 수 있으나 서버 최초 로딩의 `확인 중`·`—`는 client의 실D1 점수 통신 성공/실패를 증명하지 않음. `https://zgmini.kr/api/credit-risk-detail`의 응답 본문은 외부 조회 도구 접근 불가. 운영 PC 승인 A 허용목록에서 이 네 요인의 정확한 SQLite→D1 단일 READ 전용 실행이 없음(공용 조회를 우회하거나 신규 설치·예약/실데이터 변경하지 않음). PR/Build 성공과 exact Production Deployment/실D1 변경은 구분, post-merge Checks는 이 시점 RUNNING.
- **FIRST UNVERIFIED / #44 상태:** 정확한 신규 HY/IG/Total CMDI/국채 변동성 **한 개 실제 source row** 및 다른 3요인 유지→W06 source 승인 점수→로컬 last valid/checkpoint→D1 `detail:credit-risk:v1` stored_at/본문→공개 GET/차트 최종점의 일치 증거가 없어 전체 #44는 PARTIAL. source 수정/CI/merge만 DONE, 단계 DONE 가산 0. 원담당 신용/Writer가 기존 승인 운영 경로에서 선택적 data readback으로 검증할 일이고 W06가 실PC 계산/Writer를 변경하지 않음.
- **다음 필수 실행:** W06 #45 실적 침체 공식 EPS/마진/매출/확산 완료분기·잠정 구분 및 실제 신규 유효 요인 저장→공개 Reader/차트 경계를 검증. 신용 원담당은 #44 실운영 D1/readback 미완료 별도. R4 총 14/75(18.7%) 유지.

## [2026-11-17 KST] R4 #45 — 실적 침체 R4 4요인/경제 E1-R5/잠정 R30 분리 및 분기계보 확인 (PARTIAL)

- 시작/종료 고유 DONE 14/75(18.7%), 잔여 61. W06 담당 UI/Reader·소스/기존 CI 검증. baseline `main@e9d212660dfa9955fd3370de5cd68e856f84d093`. 이 실행에서 신용 PR #1199는 main 병합까지 확인, 정확한 Cloudflare Production Deployment 및 `/api/credit-risk-detail`의 신규 관측 본문은 계속 미확정.
- `worker/projection-builders/earningsRecession.ts@3f910579b924f104cb754c5c88d30f286e3c969e`는 `diagnostics8.earningsRecessionDefense` 승인 4요인 EPS 성장·영업마진·매출 성장·이익개선 확산(가중치 .35/.25/.20/.20)과 경제 지표 E1-R5의 13개 요인을 분리. `riskFactorsSource`가 저장된 E1-R4 replay/legacy인지, 요인점수 가중합=현재 공개 score인지 확인하여 요인 표기를 제한. `riskHistory`는 `E1_R4_STORED_PERIOD_CURRENT_VINTAGE_NOT_PIT` 완료 결산분기 또는 `MATCHED_DIAGNOSTIC_METHOD_STORED_DATES`처럼 출처와 날짜/최종 score가 일치하는 종류만 표시; 당시 최초발표(PIT) 이력으로 오표기 금지.
- `app/earnings-recession/earnings-risk-only-panel.tsx@ef676dda72c2277a06e68bfb109f2ce2f3eee937`는 실제 적용된 8위험 진단 카드(`/api/earnings-recession-detail`)이며 `riskFactorsMethodologyVersion`, `riskFactorsSource`, `riskHistoryKind`, fiscal reconstructed 구분과 raw 4요인 승인 `historyMode= CURRENT_VINTAGE_NOT_PIT`/분기 `riskFinancialPeriodEnd` 검증. `app/api/earnings-recession-detail/route.ts@ff9ed0a2fb89384d02fafaf4a101a93795731953`은 저장 D1 Projection Reader만. 구 `earnings-recession-panel.tsx`의 E1 13요인 경제 상세 화면은 현재 확정 8대 위험 카드의 주체 아님.
- `worker/earnings-risk-provisional-public.mjs@3aaa82c8212ff8611cd9a9d42823f67bfe1d6ee4`는 E1-R4 분기 잠정 actual observations, 승인 R30 버전·sourceStoredAt·issuer coverage·시간순 이력/중복·관측 최신점 일치·30일 공개 freshness 검증 후 별도 D1 key `public:earnings-risk-provisional:r30` GET. `app/earnings-recession/earnings-risk-provisional-panel.tsx@9d1e063fa944e450d0e62339d471087958d5c80d`는 잠정 라벨/선형 차트 전용으로 구현됐지만 `tests/earnings-risk-provisional-panel-visibility-r41.test.mjs`가 확인하듯 현재 R4 확정 카드에 무단 마운트되어 점수를 대체하지 않음.
- 기존 `tests/earnings-risk-production-contract-r3.test.mjs@bacc30001f7ae4c5ef6e7cb992e11d14a2125d33`, `tests/earnings-risk-provisional-public-r30.test.mjs@66830169f3b6d796063e8a0158fc1afaacc26249`, `tests/earnings-risk-provisional-panel-visibility-r41.test.mjs@945c352008498c48ba4847ddeadc6470be92db0d`는 method/분기 확인, 무단 이력 혼합/결측 차단, 분리 Reader/잠정 공개 검증을 포함. 앞선 PR #1199 GitHub CI Run `43985578596` 전체 Regression SUCCESS로 해당 최신 main 회귀를 함께 검증(이번 회차 새 테스트 파일·코드 수정 없음).
- LAST PASS: 소스/기존 자동 회귀에서 4개 공식 위험 진단 요인·E1-R5 경제13요인·잠정 R30 공개를 분리하고 날짜/최신점/버전/결측을 보수적으로 다룸. **FIRST UNVERIFIED:** 원담당 W05가 확보한 신규 공식 EPS·마진·매출·확산 한 요인의 완료 결산분기/공시 저장→나머지 3개 승인 이월→R4 계산/current/관측이력→D1 `detail:earnings-recession:v1` readback→공개 GET 및 실제 위험 카드·차트 최신점 일치. 공유 Controller/PC Writer 변경·원자료 업로드·재예약하지 않음.
- #45 판정 **PARTIAL**, 신규 DONE 추가 0. 무관한 W05 실적 침체 82단계 작업을 W06 대신 수행/중단시키지 않음. 다음 독립 실행 **#46 자산 버블 R9/R10 모델 분리**, 원담당의 실제 신규 공식 분기 실증은 별도 미완료.

**#44 post-merge 4/4 CI 추가 확인 (2026-11-17 KST):** `main@e9d212660dfa9955fd3370de5cd68e856f84d093`의 GitHub Checks `check`, `verify`, `notify`, `Workers Builds: zgmini-migration-candidate-r5`가 모두 `completed / success`로 원격 재조회됨. 신규 PR #1199의 head CI Run `43985578596` SUCCESS와 별개. Cloudflare Workers Git Integration **빌드 성공은 exact Production Deployment와 D1 게시 성공 증명이 아님**. #44·#45 전체 PARTIAL/14/75 유지.
