# 고용 R6 2026-11-10 수동 BACKFILL 실증 및 잔여 실행 계획

> 작업 정본: `feat/bls-registered-v2-20261109` (Draft PR #1036). 기존 산식·가중치·TTL·DB 계약은 임의로 수정하지 않는다. **자동 수집/정규 예약 검증은 기능 완료 후 후속이며, 수동 검증에 날짜·60초·24시간 같은 내부 대기 Gate를 새로 만들지 않는다.** 공급자 호출량·공유 Writer 안전 보호는 별개로 보존한다.

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
