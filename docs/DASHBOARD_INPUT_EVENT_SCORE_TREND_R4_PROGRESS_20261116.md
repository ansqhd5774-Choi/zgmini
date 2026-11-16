# ZGMINI R4 75단계 — 실제 수행 원장 (2026-11-16 KST)

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
