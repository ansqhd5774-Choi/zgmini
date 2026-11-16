# ZGMINI R4 75단계 — 실제 수행 원장 (2026-11-16 KST)

> **현재 즉시 상태 (2026-11-17 KST): 12/75 (16.0%), 잔여 63개.** #34의 60초 자동 갱신·늦은 응답 차단은 기존 공통 구현의 소스/모의시험으로 DONE. #28 저장자료의 방법론/모델 버전은 일별 snapshot 원본에 남지만 차트/계산점 평면 이력에서는 추적 불가해 PARTIAL, #29 미래 날짜 혼입 source 결함을 재현해 Writer 원담당 보완 필요. **다음 독립 실행은 W06 #35**. 운영 PC/Production 종단 완료 주장은 하지 않는다.

## 현재 인계 정본 — 다음 담당자 첫 읽기 (2026-11-16 KST)

> **이 절만 현재 진행 상태의 단일 정본이다.** 아래의 2/75·4/75·8/75·10/75 기록과 예전 '다음 작업'은 당시 수행 이력으로 보존한 것이며 **재개 지시가 아니다**. 다음 실행 후 반드시 이 절과 맨 아래 새 수행 기록을 **함께** 갱신한다. 기록 기준은 [R4 계획서의 '작업 실행·진행 기록·인계 의무 기준'](DASHBOARD_INPUT_EVENT_SCORE_TREND_EXECUTION_R4_20261116.md#r4-작업-실행진행-기록인계-의무-기준-본-계획의-필수-절차)을 적용한다.

| 필드 | 현재 확정 값 |
|---|---|
| 저장소 / 원장 브랜치 | `ansqhd5774-Choi/zgmini` / `codex/ui-improvements` |
| 계획 / **지정 진행 기록** | `docs/DASHBOARD_INPUT_EVENT_SCORE_TREND_EXECUTION_R4_20261116.md` / **`docs/DASHBOARD_INPUT_EVENT_SCORE_TREND_R4_PROGRESS_20261116.md`** |
| 진행 (단계별 소스·fixture·설계 통과) | **12/75 (16.0%), 잔여 63개** |
| DONE 단계 (중복 없음) | **#04, #05, #08, #10, #21, #22, #23, #24, #26, #27, #33, #34** |
| #34 60초 화면 갱신·역행 차단 | **DONE (현재 main source/fixture)**. `live-refresh.mjs` 60초 주기, `dashboard-ui.tsx`·`use-stored-index.ts` 수용/역행 보호 경로 확인. 신규 유효값·0·PARTIAL 및 낡은 관측·게시 응답 판정 7/7, UI 연결 소스 4/4 PASS. Production 유저 육안 검수는 최종 단계 |
| 단계 증거 범위 | #24는 **기존 저장 JSON 활용·Draft 설계/회귀 PASS**까지의 설계 DONE. 실제 15분 보존 정책 수정·PC 설치·D1 반영은 **미완료** |
| PARTIAL — 실제 작업 이력 존재, 계획 완료 조건 미충족 | #01, #03, #07, #09, #11, #12, #13, #14, #15, #16, #28, #29, #35. #28 방법론 공개 이력 구간 분리, #29 Writer 현재 날짜 안전성은 원담당 범위의 실제 보완 미완료 |
| 다음 단 하나의 실행 | **#35 (W06 독립 작업)** 기존 PR #1177·#1182·#1189가 연결한 현재 카드 점수와 1D~1Y 차트 끝점을 실제 공개 source 계보·시각·단위·표현변환별로 대조. 진짜 불일치만 최소 수정하고 신규 저장 계약·가짜 점을 만들지 않는다. 원담당 #28·#29 보완은 독립 진행을 막는 Gate가 아님 |
| 다음 담당·대상·입력 | W06 UI 원담당, 최신 `main`의 `app/dashboard-ui.tsx`, `lib/market-score/composite-observed-display-r1.mjs`, `lib/market-score/published-domain-trend-r4.mjs`, `lib/market-score/live-refresh.mjs`, `components/use-stored-index.ts` 및 기존 1D~1Y fixture. 타 담당자 source 병합/PC 설치 없이 검증 가능한 화면 점수 연결부터 수행 |
| #35 통과 조건 | 카드와 실제 확정/실계산 차트 마지막점의 시각·원점수와 표시 점수(기존 3.5 표시 민감도 포함)를 구분해 일치 여부 확인. 1D~3M 실제 게시점·6M/1Y 확정 일간 이력·결측/0/시간 역행 보호. 근거 없는 모든 화면 완료 주장 금지; 실제 Production/user 육안 검수는 기술 작업 종료 후 별도 |
| 이후 후보(이번 실행에 혼입 금지) | #28 모델/방법론 계보 공개 이력의 원담당 변경 범위(현행 일별 snapshot에 modelVersion 저장됨, 평면 chart/observed archive에는 없음); #29 기준일 이후 미래 snapshot 표시 결함/동일시각 정정 (Writer 원담당). D01~D27 실제 미연결 작업, Draft #1181·#1185 승인 대기. 비차단 작업은 계속 |
| 최근 R4 기능 병합 증거 | PR [#1177](https://github.com/ansqhd5774-Choi/zgmini/pull/1177), [#1180](https://github.com/ansqhd5774-Choi/zgmini/pull/1180), [#1182](https://github.com/ansqhd5774-Choi/zgmini/pull/1182), [#1184](https://github.com/ansqhd5774-Choi/zgmini/pull/1184), [#1187](https://github.com/ansqhd5774-Choi/zgmini/pull/1187), **[#1189](https://github.com/ansqhd5774-Choi/zgmini/pull/1189)** = `main` 병합. 최신 R4 기능 병합 SHA **`1c0dd6587d76ef1051196251a06beed58ce36d6f`** |
| 미병합 원담당 검토 | [Draft #1181](https://github.com/ansqhd5774-Choi/zgmini/pull/1181) Collector의 관측일 역행 차단 (#11), [Draft #1185](https://github.com/ansqhd5774-Choi/zgmini/pull/1185) Writer의 15분 이내 변경점 영구 기록 (#24 설계 이후 구현). 두 건 모두 CI 성공이나 **원담당 적용 승인·main 병합·PC 설치 없음** |
| PC Runtime·SQLite→D1 실제 게시 | **미확정**. #13 임시 SQLite 통합시험 및 source 연결 PASS만 보유. 기존 운영 PC A급 #1737은 당시 `STATE_UNKNOWN`; 해당 고유 요청 중복 실행 금지 |
| Cloudflare/공개 화면 | PR #1189 병합 SHA `1c0dd658…`의 GitHub `check`·`verify`·`notify`·Workers Builds 모두 **SUCCESS**. **exact Production Deployment ID/SHA 및 사용자 화면 육안 확인은 여전히 미확정** |
| 소유·보호 조건 | UI는 기존 전용 브랜치·선별 PR 원칙. 수집·계산·Writer/15분·100개 보존 정책·DB·TTL·스케줄은 별도 원담당/승인 없이 수정·병합·설치 금지. R13 이란 퇴역 예약 복원 금지 |
| 전후 검증 원칙 | source/CI/로컬 fixture와 실PC/D1/Production을 분리. 사용자에게는 전체 기술 구현 이후 홈페이지 최종 육안 확인 요청 |

**다음 작업자 필수 수행 순서:** 본 계획서 75개 → 위 정본 → #35 관련 기존 근거만 확인 → 실제 #35 실행/검증 → **이 표 상태 수정 및 최신 수행 기록 추가 → 지정 원장 커밋 → 원격 내용 재조회 PASS → 최종 보고**. 지난 대화를 요청하거나 과거 성공 작업을 모두 재실행하지 않는다.

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
