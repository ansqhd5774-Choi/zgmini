# ZGMINI API–사이트 연결 — 전용 브랜치 현행 작업계획 및 최종 완료 기준 (2026-11-14 KST)

> **계획·현행 상태 문서, 운영 승인이나 배포 지시가 아님.** 기존 승인된 계약·원자료·산식·DB·TTL·주기·권리·DNS·Cloudflare 배포 경로는 변경하지 않는다. 이 문서의 source 검증 PASS를 운영 성공으로 승격하지 않는다.

## 1. 대상 브랜치·기준·원계획과 현행 업무의 분리

- 저장소: `ansqhd5774-Choi/zgmini`.
- 지정된 유일한 **전담 작업 브랜치**: `codex/api-site-integration-r1-20261026`.
- 이 계획 작성 직전 전담 HEAD: `f16a9f58d86a39032d64bd4d385b17f587526fdc`.
- 작업 기준 `zgmini/main=643b7c7c4372ffad552443fc312c6cb1b944e2fc`; 제어 `zgmini-pc-control/main=69e25a08a903dc8e52ef1093ec15837de4c20858` (해당 조회 시각 한정).
- 확인한 병행 분기 상태: main 대비 **ahead 276 / behind 554 / diverged** (이 문서 작성 전). 전용 브랜치 전체를 main에 병합·rebase·reset하지 않고, 실제 수정 필요 시 **승인된 최소 파일**만 별도 검토·PR.
- **A. 현재 중앙에서 지시한 주업무**: 물가 19+7, 시장 일정, 테마, 고용 공개 API **5개 정확키의 D1→API→Production 동치 증거 확보**. 최신 [중앙 65차 지시](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6866393700). 이 범위의 기존 단계 기준 **75% (3/4)**.
- **B. 역사적 원래 브랜치 과제**: [실적 침체 분석 지표 API↔사이트 연결 R1~R6 원계획](EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md), [브랜치 이력·계획 이탈 감사](EARNINGS_API_SITE_BRANCH_ALIGNMENT_AUDIT_R1_20261027.md). 기존 E1-R4 4요소 점수는 변경하지 않으면서 **허가된 정보성 지표를 개수 제한 없이 추가**해 `/earnings-recession/`에 연결하는 과제. 현행 5키 75%를 이 원계획 전체 구현률로 오인하지 않는다. 후속 독립 실행은 최신 중앙 우선순위·승인 범위에서만.

## 2. 최종 목표 — 사용자에게 제공해야 할 실제 결과

**승인된 공급자 API 수집 → 운영 PC 원자료 SQLite 저장·재조회 → 저장 자료만 사용한 계산 → 로컬 결과·원장 보존 → 승인된 공개 결과를 D1에 게시하고 읽기 재검증 → 저장형 Production API → 사이트 PC·모바일 실제 데이터·시각·결측 표시**가 연결되고, 다음 정상 발표·수집/계산/게시 주기에서 갱신이 관측되는 상태다.

완료의 최소 판정 조건:
1. **기능별 실제 원본**: 승인된 원자료·sourceVersion/sourceStoredAt/checkpoint·수집/계산/게시 증거를 구분한다. 타 기능의 진행 문제는 해당 원담당이 처리하며 이 브랜치에서 Collector·점수 산식·Writer를 임의 교체하지 않는다.
2. **D1 정확키별 독립 증거**: 아래 5개 row의 `exists/stored_at/원본 body SHA256`, 실제 발행 버전·관측/게시 일자를 승인된 **읽기 전용** 경로로 확인. 데이터가 미발표·결측이면 상태를 보존하여 실제로 존재하지 않는 값은 통과시키지 않는다.
3. **원본 JSON의 의미 비교**: 보호된 환경에서 저장 `body`와 Public API JSON을 정확한 Reader 변환 계약대로 비교. 물가 `{payload,projection}`의 외부 노출은 `payload`; 시장/고용 직접 본문; 테마는 기초 seed와 실제 적용 rolling/sidecar를 **각기** 판정. D1 전체 body hash와 Public API JSON hash의 단순 동일성을 강요하지 않는다.
4. **배포 동일성·현장 출력**: GitHub 적용 source SHA와 Cloudflare Git Integration **exact Production Deployment ID/SHA**를 구분해 연결, 실제 API HTTP/status/값·관측일·신선도를 확인. 담당 UIUX의 PC 1440px·모바일 390px 화면에서도 단위·날짜·결측·stale·차트/마지막 점이 정상이라는 별도 실제 증거를 인계받는다. 공개 GET 200이나 build 성공만으로 완료를 선언하지 않는다.
5. **운영·오류 보호**: 미발표, `0`, `null`, `PENDING`, `STALE`, `UNAVAILABLE` 구별, 마지막 유효 결과 보존, 갱신 후 source/version/checkpoint 전진. 불일치가 발생하면 LAST PASS/FIRST FAIL과 기능 소유자를 특정해 **관련 최소 코드만** 승인·회귀·선별 PR. 승인 없는 쓰기·배포 금지.

## 3. 5개 정확키/Reader 검증 범위

| 슬롯 | 저장 테이블·정확키 | 공개 API | 저장→응답 비교의 필수 특성 |
| --- | --- | --- | --- |
| 물가 기본 19 | `market_public_snapshots_v1` / `detail:inflation-causal-public-19:r1` | `/api/inflation-causal-inputs` | `{payload,projection}` 저장, API는 검증된 `payload`; 각 버전·sourceStoredAt·projection builtAt |
| 물가 후보 7 | `market_public_snapshots_v1` / `detail:inflation-causal-candidates-7:r1` | `/api/inflation-candidate-inputs` | 상동; ID22/23/28 결손을 0·READY로 꾸미지 않음 |
| 시장 달력 | `public_feed_snapshots_v1` / `kind=output,feed_key=release-calendar,snapshot_key=current` | `/api/release-calendar` | 직접 body; `sources.*.checkedAt/updatedAt`·Treasury 365일은 별도 원담당 검증; 모든 feed에 sourceVersion 필수라고 가정하지 않음 |
| 테마 공포탐욕 | `market_public_snapshots_v1` / `public:theme-etf-only:r1` | `/api/theme-fear-greed` | seed 1키만 확인해 합성 결과 동치 통과 금지; 선택 rolling/sidecar와 승인 공개권·freshness 별도 |
| 고용 R6 | `market_public_snapshots_v1` / `detail:employment-r6:one-year:v1` | `/api/employment-r6/observations` | 저장 body 직접; 29개 행 제공과 29개 유효 점수 구분, `formulaHash/methodologyVersion/sourceStoredAt/asOfDate`, 8일 freshness 확인 |

**모든 행 현행 실D1 동치 = `UNVERIFIED` (0/5)**. 44차의 역사적 Public API 실측 200/200/200/503/200을 **현재 응답으로 재사용하지 않는다**. 과거 테마 `503 STORED_DATA_STALE`은 당시 freshness 판정이며 최신 API Reader 오류가 확정됐다는 뜻이 아니다. 구 #296 물가 D1 readback·#757 PC/API 버전 비교는 시점·버전이 다른 영수증이다.

## 4. 완료 3단계/미완료 1단계 — 실제 계획

| 순서 | 단계 | 확인된 완료·증거 | 남은 작업 및 완료 Gate | 소유자 |
| --- | --- | --- | --- | --- |
| 1 | **API·D1 저장/조회 코드 계약** | 5 라우트·고정키·결측/버전 기준 소스 감사 완료. [증거감사](API_SITE_R1_PRODUCTION_LINK_AUDIT_20261114.md) | Source drift가 있으면 변경된 범위만 재검증 | API 전담 |
| 2 | **공개 API HTTP/JSON의 과거 기준선 확보** | 44차 실제 HTTP 관측 4×200+1×503 기록. **새로운 현재값 아님** | 현행 실측은 승인된 무료 GET 경로 정상화 및 해당 시각 영수증 확보 후만 수행 | API 전담/승인 조회 소유자 |
| 3 | **독립 저장→API 변환 비교 계약·회귀** | [비교기](../scripts/api-site/compare-five-public-readbacks-r1.mjs) + [11개 회귀](../tests/api-site-five-public-readback-r60.test.mjs), Node22.16 **11/11 PASS**, 전용 SHA `f16a9f58...` | 이 source-only 시험을 실제 D1 조회로 오인 금지; 완료 검사 반복 금지 | API 전담 |
| 4 | **현행 운영 D1↔API↔배포 SHA 최종 동치** | **0/5, 미실증**; 현재 `AUTOMATION_BLOCKED(NO_APPROVED_EXACT_KEY_D1_READBACK_ACCESS)` | 같은 관측 회차 5키 실제 D1 저장 row·Public API 원문·Cloudflare exact deployment/source SHA → 보호 환경에서 Reader 기준으로 비교 → 수치/시각/결측/화면 증거 연결. 필요한 최소 수리와 정상 재검증 후만 최종 PASS | 기존 승인 현장 D1/Cloudflare 조회 소유자(증거 회수) → API 전담(동치 판정) → 관련 기능/UIUX 원담당(실제 수리/화면) |

**진행률 정의:** 75%=현재 API 연결 **검증 준비·기준선 4단계 중 3단계**. 이것을 전체 ZGMINI, 원래 실적 침체 R1~R6, 또는 모든 기능의 운영 종단 완료율로 사용하지 않는다.

## 5. 다음 필수 실행 하나 — 현재 차단 경계

**기존 승인된 운영 D1/Cloudflare 읽기 단일 소유자**가 현행 5개 정확키와 대응하는 API 5응답 및 Production Deployment metadata를 **하나의 관측 회차에** 회수해 API 담당에게 승인된 경로로 인계한다.

필수 비민감 영수증 필드: `host/environment`, `observation window/readAt`, `exact table/key/kind/feed_key`, `exists`, `stored_at`, **전체 저장 body 바이트의 SHA256**, `sourceVersion/sourceStoredAt` 또는 `formulaHash/methodologyVersion`, 공개 API `httpStatus/observationAt/responseVersion`, `Deployment ID/source SHA`, 적용 Writer/Reader source identity, 작업 `requestId/Run/Job`(기존 원장으로 실행했을 때), 실패 코드와 보호 상태. 없는 필드는 명시적 `UNVERIFIED`.

**중요:** 오프라인 비교기의 입력은 **D1 원시 저장 body JSON 문자열 + 공개 API 파싱 JSON**이다. 비민감 `bodySha256`만으로는 의미 동치가 검증되지 않는다. 보호된 권한 환경 안에서 원문을 비교·해시하고 **안전한 판정·최소 메타만** GitHub/#68에 남긴다. 테마 rolling/sidecar는 독립 출처가 없으면 seed-only 미검증 유지.

현장 영수증 전에는 새 `pc-job`, Runner 강제 실행, 임의 CMD/SQL/D1 읽기 우회, 유료 브라우저, Remote Desktop Control, 공통 Controller/Writer 신규 설치·게시, Cloudflare 변경·배포, 기존 실패 GET 반복 금지. 과거 CI 11/11·일반 웹 접근 장애 조사를 재수행하지 않는다.

## 6. 현재 LAST PASS / FIRST UNVERIFIED / 승인 후 분기

- **LAST PASS:** 65차 중앙 원본 확인; 전용 정확 HEAD 확인; 60차 comparer fixture Node11/11 PASS 결과 재사용.
- **FIRST FAIL(새로 실행된 소스/PC):** 없음. 운영에서 확인되지 않은 응답을 새 실패로 만들지 않음.
- **FIRST UNVERIFIED:** 실제 5 D1 body/동일 관측 API/정확 Production Deployment; `0/5`.
- **승인 영수증 수신 후:** (1) 시간/정확키/source가 같은지 감별 → (2) 보호된 현장에서 변환·결측/지연 검증 → (3) `VERIFIED/MISMATCH/UNVERIFIED`를 키별 판정 → (4) **증명된 mismatch만** 원소유자 최소 수리·회귀·승인 선별 PR → (5) 실제 배포 및 API/UI 재조회. 새로운 출처/산식/가중치/권리/수집 주기 변경은 이 계획으로 승인되지 않는다.
- **기존 분기와 배포:** 브랜치만 갱신해도 PC/Cloudflare Runtime은 바뀌지 않는다. `main`의 관련 PR 승인·병합·Cloudflare Git Integration exact Production 확인이 별도 필요하다.

## 7. 원래 실적 침체 분석 지표 과제의 완료 기준 (별도 추적)

이 브랜치에 보존된 2026-10-26 [R1~R6 원계획](EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md)은 **E1-R4 승인 위험 4요소/가중치/원자료/이력 불변**과 **정보성 C 지표는 개수 제한 없이 유효한 것만 추가**가 최종 목표다. 각 공급자(기존 BLS/BEA 재사용 우선, Census/SEC는 적격 시) 권리·실자료 검증 → PC 보존·lineage → 별도 승인된 공개 read-model/D1 readback → `/earnings-recession/` 실제 화면·출처·날짜 → 통합 CI·정규 main 승인·Cloudflare Production·정기 갱신까지 충족해야 종료한다.

[브랜치 이탈 감사](EARNINGS_API_SITE_BRANCH_ALIGNMENT_AUDIT_R1_20261027.md)에 명시한 BLS 3원천 저장/계산·5정보행 근거, BEA preflight 수준과 Production 미증명 차이를 보존한다. **이 별도 R1~R6 종단 완결도는 75%라고 측정한 적 없으며, 중앙 65차의 5키 업무 완료만으로 자동 종료되지 않는다.** 새 정보성 키/스키마·UI·게시가 필요하면 해당 대상에 대한 사전 승인을 거쳐 진행한다.
