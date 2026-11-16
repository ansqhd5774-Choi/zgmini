# ZGMINI W05 — 실적 침체 14단계: 과거 이력·공개 전문가 코드 비교·근본 해결 계획 (2026-11-16 KST)

**지정 전용 브랜치:** `codex/api-site-integration-r1-20261026`. **사용자 요청:** "해당 문제에 대해서 과거 이력, 공개저장소 전문가 코드, 해결 방안 수립해라." 본 문서는 연구·계획 완료 증거이며 운영 변경 승인이나 실제 게시·실패 재현 결과가 아니다.

## 0. 범위·기준/금지사항
- 원래 W05 목표: 기존 E1-R4 점수의 **4개 요소·산식/가중치·진단 이력 불변**, 실적 침체 **정보성 C 지표**를 승인 공급자의 실제 자료로 개수 제한 없이 확장. 흐름: PC 수집→SQLite 불변 원본·이력→저장 자료 재계산→로컬 결과→승인 D1 exact-key 게시·readback→저장형 Production API→`/earnings-recession/` PC·모바일 표시.
- [원계획 R1~R6](EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md), [노하우](EARNINGS_API_SITE_WORKING_KNOWHOW_R1_20261027.md), [14단계 선행조건 시뮬레이션](EARNINGS_RECESSION_14_STAGE_CONTRACT_SIMULATION_20261116.md)에서 **이미 성공한 PC 저장·계산·source 병합 근거를 재사용**. 현재 14단계는 확보된 BLS/Census QFR/BEA unit/BEA manufacturing 4개군만의 잔여 수직 구현 계획이며 추가 C 후보는 필요·권리 기준으로 계속 확장한다.
- 조회 시 전용 작업 브랜치 최초 SHA `94d101cca891f895c5f89c8432dfabc0a3f3dbd6`, 기능 `zgmini/main=06f73bcf29a0af8fe2a7341b60ab6da8305a03e6`, 제어 `zgmini-pc-control/main=3ee701c3a6be8b3de895a7fac68e89b75568be4d`. 이 HEAD는 관측 시점만 유효. `main`과 PC 설치·Cloudflare Production SHA는 **별도 식별자**. 교체·merge 전에 최신 SHA를 최소 범위 재확인.
- 신규 SQL/조회·PC Runner/CMD·Writer/Controller 설치, raw DB/D1 쓰기, Cloudflare 배포·DNS 변경, 공급자 호출, 유료 도구·지속과금 **이번 조사에서 0건**. 타 원담당 작업 범위 변경·소스 전체 브랜치 병합/리베이스·force push 금지.

## 1. 과거 이력 검증: 완료 지점을 새 Gate로 만들지 않는다

| 역사 시점 | 실제 근거 | 지금 재사용 가능한 사실 | 현재 운영 재검증 없이 단정 금지 |
|---|---|---|---|
| 2026-10-27 | [BLS 서비스 PPI 기준서](EARNINGS_BLS_SERVICE_PPI_WPSFD42_INTEGRATION_R1_20261027.md) | 기본 3원천→5개 C정보성 행 과거 Public GET 5/5 READY, WPSFD42 별도 2행 게시기/합성 Reader 작업 브랜치 source 구현 | WPS 전용 PC SQLite 저장·D1/Worker 배포 PASS |
| 2026-10-27~28 | [Census QFR R3](EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_20261027.md) / [R5 main 선별 회수](EARNINGS_CENSUS_QFR_R5_SELECTIVE_MAIN_RECOVERY_20261028.md) | ZIP PC SQLite append+readback, 저장-only 계산 2026-Q2 15.599418144173285%, 2026-Q1 14.03708175763798%, Δ+1.5623363865353053%p, 관련 15파일 main 반영 | 현재 D1 exact row 존재·QFR API·UI 정상 |
| 2026-11-02 | [QFR UI+Reader PR #958](https://github.com/ansqhd5774-Choi/zgmini/pull/958) `merged=true` | Reader와 QFR UI source가 main에 있음; 재구현 금지 | GitHub merge는 Cloudflare exact deployment/현재 사용 데이터 증거 아님 |
| 2026-10-28 | [BEA 제조업 R6](EARNINGS_BEA_MANUFACTURING_PROFITS_R1_READONLY_20261028.md) | PC FRED CSV + metadata append-only `APPEND_ONLY_SOURCE_STORED` 실행 보고, SHA sourceVersion, R6 파일 검증+Writer 소스 존재 | 보호된 실제 E: archive의 현재 직접 readback·D1 게시 |
| 2026-11-03 | control [Draft PR #77](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/77), [#112](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/112) | 두 고정키(BEA unit, Census QFR) 전용 B 발행 제안/격리 suite 16/16 PASS; source code 재사용 가능 | #112 `open/draft/merged=false/mergeable=false`; **운영 설치·권한·manifest·D1 readback PASS 아님**, 기존 공통 Writer B가 이 작업을 이미 지원하는지는 별도 확인 |
| 2026-11-16 | [14단계 정적 계약 시뮬레이션](EARNINGS_RECESSION_14_STAGE_CONTRACT_SIMULATION_20261116.md) | 원래 단계·구현 순서 문제/근본 gap 6개 분리 | "14/14 종료 요건 미충족"을 14건의 실제 PC 오류로 오인하지 않는다 |

## 2. 직접 읽은 공개 오픈소스 전문가 구현 및 차이

**A. Cloudflare 공식 D1 Prepared Statements 코드**
- 실제 오픈소스: [`cloudflare/cloudflare-docs/src/content/docs/d1/worker-api/prepared-statements.mdx`](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/d1/worker-api/prepared-statements.mdx), blob `638421cfc009af829a373e3fe5f60396b83c0691`. 코드 패턴: `db.prepare("SELECT ... WHERE key = ?").bind(value).first()`; `run()`은 write metadata, `first()`는 read row. 공식 설명상 `first()`는 첫 행 또는 null, `LIMIT 1`을 SQL에 명시할 수 있음.
- ZGMINI 비교: `worker/earnings-companion-c-qfr-r1.mjs` Writer는 이미 exact-key `SELECT body,stored_at`→원문 body/시각 readback, conditional `ON CONFLICT ... WHERE` checkpoint를 사용한다. **이를 버리지 않는다**. 오직 승인된 PC 게시 route와 증거 회수를 연결.

**B. Cloudflare 공식 D1 Sessions 예제**
- 실제 오픈소스: [`cloudflare/templates/d1-starter-sessions-api-template/src/index.ts`](https://github.com/cloudflare/templates/blob/main/d1-starter-sessions-api-template/src/index.ts), blob `2b1ac564495a2c4cc814c0b254a181997db8e833`. `env.DB01.withSession(bookmark)`, 응답 `x-d1-bookmark`를 통한 연속 일관성, 쓰기 후 선택 read.
- ZGMINI 비교: 현재 PC Writer가 동일 권한/connection readback을 이미 구현한 만큼 추가 session 기능을 새 필수 Gate로 만들지 않는다. **실제로 D1 읽기 복제본 경로 때문에 다른 version이 관측될 때만** 같은 북마크/primary read 방식 검토.

**C. 공개 D1 실행·조회 테스트 사례**
- 실제 오픈소스: [`MicroAGI-Labs/alchemy-effect/packages/alchemy/test/Cloudflare/D1/d1-worker.ts`](https://github.com/MicroAGI-Labs/alchemy-effect/blob/main/packages/alchemy/test/Cloudflare/D1/d1-worker.ts), blob `ceb1125014455a97e983d314b5f88a5016bb735e`. `INSERT ... bind(...).run()`와 `SELECT ... bind(id).first()` 및 별도 D1 초기화·읽기 경로 구현. 본 연구는 해당 라이브러리/의존성 채택을 권장하지 않고 **쓰기 확인과 선택 row 읽기의 독립 검증 패턴만** 재사용.

**D. Cloudflare 오류/안전한 재시도 코드·운영 문서**
- 실제 오픈소스: [`cloudflare/cloudflare-docs/src/content/docs/d1/observability/debug-d1.mdx`](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/d1/observability/debug-d1.mdx), blob `b443834d4a642561a1a3ff085cdc1df96e39990a`. D1 `run/all/first/batch` 메서드 자체는 AbortSignal/timeout을 받지 않음. `Promise.race`로 응답 대기만 시간 제한하면 **실제 write는 여전히 commit될 수 있음**.
- ZGMINI 비교: 기존 B `STATE_UNKNOWN` 원장·재시도 금지·D1 readback 경로 유지. timeout 뒤 "실패니까 재실행" 같은 정책 도입 금지.

**E. 공식 GitHub Actions 최소 권한**
- 공식 참고: [GitHub Actions workflow permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions), [secure use reference](https://docs.github.com/en/actions/reference/security/secure-use). 필요한 `GITHUB_TOKEN` 권한만 사용하고 credentials/secrets를 채팅/Issue에 노출하지 않는 방식.
- ZGMINI 비교: 기존 제어 `.github/workflows/pc-publication-b.yml`의 고정 actor/label/manifest/최소 결과 업로드 계약을 범위가 맞을 때만 재사용. 공개 sample 워크플로를 복제하거나 `wrangler deploy` 직접 경로를 새로 만들지 않음.

**공개 저장소는 설계 패턴의 비교 근거이지, ZGMINI 운영 환경/PC 권한·실제 D1 실행의 성공 증명이 아님.**

## 3. 직접 재확인한 소스 결함과 영향/원인

### C1 — Draft #112는 운영 게시 권한이 아니다 (P0)
- 실제 [#112](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/112) `draft=true/merged=false/mergeable=false`. 정확 원천 제어 `tools/publication-contract.mjs`는 BEA unit `bea-unit-profit-once`와 Census QFR 두 고정 `snapshotKey`만 허용. `.github/workflows/pc-publication-b.yml`은 `ZGMINI_B_PUBLICATION_APPLY_ENABLED` opt-in default OFF; actor/manifest/source SHA/실PC 원장 검증이 별개.
- **중요 구분:** 이것은 제안 PR의 상태다. 최신 실제 설치된 공통 Writer B가 동일 효과를 이미 지원하는지는 확인 전 `UNKNOWN`; #112를 반드시 병합해야 한다는 뜻도 아니다.
- **수정:** 제어 Owner가 운영 승인된 공통 B 설치·허용 2-key·실 source/approval receipt를 1회 확인 → 지원하면 곧바로 QFR 기존 D1 Publisher로 실행, 미지원하면 #112의 유효 원본 7파일을 최신 control main에 **기존 경로로 선택 적용** (충돌은 최소 파일별 해결). B 게시 효과는 실제 사용자 승인 범위를 정확하게 유지.

### C2 — BEA unit 게시 중 공급자 2회 호출·기존 저장자료 계산 정책 불일치 (P0)
- 기능 main `scripts/pc-writer/EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs`는 **`--dry-run`과 `--apply` 양쪽에서 `fetch(UNIT_PROFIT_CSV)` 실행**, apply 시 raw CSV append→같은 실행에서 `sourceStoredAt=Date.now()`→build→D1 publish.
- 제어 `tools/publication-executor.mjs`는 **같은 request에서 항상 `runFixedChild(...,['--dry-run'])` 다음 `runFixedChild(...,flags)`**를 호출하며 `providerCalls=2`로 명시. 즉 공급자 요청을 일회로 가정한 계획이 실제 구현과 어긋남. dry-run→apply 사이 CSV가 개정되면 사전검증한 raw와 게시 raw의 SHA 자체가 달라질 수 있음.
- **최소 소스 수정:** ① 기등록 PC Collector 또는 승인된 기존 raw 보관 경로에서 **한 번만** 받은 CSV 원바이트/미러·원천 URL/series·retrievedAt/sha256을 불변 저장, 해시 재조회. ② 기존 `buildBeaUnitProfitSource`·validator를 **저장 raw** 입력으로 적용, sourceVersion=raw SHA, sourceStoredAt=원본 최초 저장 시각. ③ 기존 D1 `beaUnitWriter`의 checkpoint 검증·readback 재사용. ④ B preflight/apply 모두 **동일 raw SHA/계보** 입력을 고정해 provider GET=0. 별도 신규 공급자/TTL/DB 키 변경이 필요하면 승인 없이 수행하지 않는다.
- **테스트:** 공급자 최초 저장→원자료 파일/SQLite checksum→dry-run/apply 입력 SHA 동일; 공급자 개정 두 시점; source stale/401/429; 중간 실패 시 old row 보존; `ALREADY_STORED` attempted timestamp를 실제 D1 source timestamp로 오인하지 않음.
- **수정 후 기대:** 해당 B 단발 게시 단계 공급자 호출 **2→0**, 최초 저장 수집은 별도 승인된 기존 Collector **1회** (추정 설계 결과; 아직 적용/실측 아님).

### C3/C4 — WPSFD42의 main Publisher+Worker+UI 수직 통합 누락 (P0/P1)
- 전용 브랜치 `scripts/pc-writer/EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs` 존재, **현재 main 동명 파일 `NOT_FOUND`**. 브랜치 `worker/earnings-companion-c-r4.mjs`는 독립 `EARNINGS_C_SERVICE_SNAPSHOT_KEY='detail:earnings-recession-indicators:bls-wpsfd42:v1'`, base 5+서비스 2 합성/상태 `x-earnings-c-service`를 구현.
- 기능 main의 Worker는 WPSFD4/WPSFD41/PRS85006111 **3개 series만** 허용하고 독립 WPS 서비스 키를 읽지 않음. 기능 main `app/earnings-recession/earnings-risk-only-panel.tsx`의 비용행 `costIndicators` 5개 고정. **D1 서비스 키만 쓰면 7행 게시가 사용자에게 표시되지 않음.**
- **최소 선택적 main 통합**: 해당 브랜치의 PC collector `--services-only`·저장 preview·Publisher + Worker 별도 2키 합성 + UI 서비스 행 2개 + 관련 테스트 중 **현재 main과 실제 차이나는 범위만** 최신 main 기준 선별 PR. 기존 main의 독립 QFR/BEA·다른 기능 변경과 충돌하면 해당 hunk만 수정. 별도 D1 key와 기존 5행 checkpoint 독립 유지. 실제 등록/게시 권한 효과는 scope 승인/Writer B와 분리.
- **테스트:** 기본 5행 유지, 미게시 서비스는 5행 정상, 서비스 2행 존재/READY면 7행, stale/위조/missing 때 서비스만 제외, BLS API 원천 개정/0/null/분기·월 mixed 거부, PC·모바일 수치/단위/관측일/차트 7행. source/CI PASS≠Cloudflare exact deployment.

### C5 — B 게시기 승인 범위와 새 2키가 불일치 (P1)
- 제어 #112 정확키 두 개: `detail:earnings-bea-unit-profit:v1`, `detail:earnings-recession-indicators:census-qfr-mfg-margin:v1`. **WPS** `detail:earnings-recession-indicators:bls-wpsfd42:v1` 및 **BEA 제조업** `detail:earnings-bea-manufacturing-profit:r1`은 포함되지 않음.
- **해법:** 공통 B 기등록 기존 허용범위 확인. 이미 승인된 함수·키면 그대로 사용하고, 없는 키만 기존 등록/manifest 모델로 최소 확장. B를 새로운 범용 SQL·동적 명령 실행기로 만들지 않는다. 각 키 실제 D1 body/stored_at/source readback 독립.
- **추가 주의:** 기존 `publication-executor.mjs`는 QFR과 BEA unit에 대해서만 `parsePublisherLog` 결과·expected status를 해석하므로 허용 목록에 키만 추가해 WPS/제조업을 실행하면 **정상 결과도 FAIL로 오인할 수 있음**. 신규 키가 승인된 경우 같은 공통 **결과 해석기를 최소 확장**하고 각 키 positive/negative 회귀검사를 함께 작성한다.

### C6 — 13단계 소스 통합을 끝으로 미루는 실행 순서 결함 (P2)
- WPS 8단계 D1 게시 코드는 **main의 승인 publisher checkout**을 요구하지만 main 소스 자체가 누락. 13단계 일괄 소스 통합을 기다리면 8단계는 영구 불가능.
- **해법:** 필요한 최소 Worker+Publisher+UI 소스 통합을 WPS의 #8 전에 앞당기고 CI와 Cloudflare Git Integration exact deployment를 각각 확인. 13단계는 최종 리그레션/Production 값·일시·E1-R4 무변화 확인 **집계**만 담당. 14단계는 새 발표 이후 자연 예약 관측으로 `DEFERRED`; 구현 완료의 인위적인 선행 Gate로 두지 않는다.

## 4. 수정된 14단계 실제 실행계획 (기존 번호 유지)

| # | 소유자 | 실행·검증/최소 작업 파일 | 종료 증거 |
|---|---|---|---|
| 1 | 중앙 Writer B Owner | 기존 실PC B 허용 exact-key 2개·manifest/설치 SHA 재사용 가능 판단; 없다면 #112 원본 7파일 최소 편입·승인/설치 | 실제 PC clean source/preflight·정확 승인만 `READY`, 게시되지 않았으면 `DONE` 아님 |
| 2 | W05+승인 게시 Owner | 기존 `EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs` 사용하여 **저장 PC ZIP 재계산** 후 D1 단일 키 게시 | D1 `READBACK_VERIFIED` or 실제 이전 동일 원문 `ALREADY_STORED`; version/stored_at/해시 |
| 3 | W05/UI Owner | QFR stored-only GET, Cloudflare exact Production Deployment, UI 현재/직전 15.5994%/14.0371% (동일 원본 시점 한정) | 그 시점 적격한 원자료 버전 기준 API/PC·모바일 일치 |
| 4 | BEA source Owner | FRED/BEA 승인·series/권리/단위 보존, **기존 저장 원본 우선 조사**, 없으면 승인 Collector 1회 raw append SHA/readback | 원본 유효 `SOURCE_READY` / 공급자 자료 미적격은 분리 |
| 5 | BEA unit+Writer Owner | `EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs`의 fetch 제거·저장된 raw 입력 고정 + 기존 `beaUnitWriter` D1 | preflight/apply 동일 SHA, providerCalls=0 in publication, D1 readback |
| 6 | W05/UI Owner | BEA unit stored-only API/원래 단위 USD_PER_REAL_GVA_UNIT·5분기·관측일 | 정확 API body/PC·모바일 |
| 7 | BLS source Owner | WPSFD42 `--services-only` 승인 수집 후 PC SQLite 최초 append/readback | 한 원천 SHA, 출처·월별 이력·retrievedAt |
| 8 | W05/통합+Writer Owner | **선행: branch WPS publisher+Worker+UI 최소 선별 source/테스트·approved key/scope**, 이후 서비스 단독 D1 | 기존 base5 checkpoint 변경 0, WPS 2행 exact readback |
| 9 | W05/UI Owner | 서비스 5+2 합성과 동적 7행 GET·PC/모바일 표시 | 7행, 서비스 결손은 5행 유지, stale/표시 시각 |
| 10 | BEA manufacturing source Owner | 기존 PC R5 CSV+meta archive의 SHA/rowCount/period 직접 readback 및 `R6` dry-run | `SOURCE_READBACK_VERIFIED`; 보고서만으로 PASS 아님 |
| 11 | BEA manufacturing Writer Owner | 승인 fixed-key B/기존 공통 Writer 범위로 D1 게시·정확 readback | BEA 제조업 고유 키/version/body |
| 12 | W05/UI Owner | stored-only BEA 제조업 공개 API·2026-Q2 정보성 YoY 이력·분기 단위 확인 | PC/모바일 값/관측일/출처·PIT 아님 |
| 13 | W05/CI·Cloudflare 통합 Owner | 변경 관련 회귀; Git main→Cloudflare Git Integration→exact deployment ID/SHA→4종 API/화면 | 진단 점수 4요소/기존 공개 5행 불변, 전 항목별 실데이터 증거 |
| 14 | 사용자 별도 후속/각 원담당 | 다음 정상 발표·정규 실행의 관측일/checkpoint/D1/UI 실제 전진을 결과 검증; **현재 구현의 STOP Gate 아님** | 실제 신규 발표 이후 `NATURAL_UPDATE_VERIFIED`, 발표 전 `DEFERRED` |

각 기능 원담당이 자기 수집/저장/산식/게시를 담당한다. W05는 공개 연결·동치·selective integration 중심이며 실제 설치 Owner 승인·자원 lease를 가로채지 않는다.

## 5. 구현 전 격리 리허설 — 결함 재발을 잡는 12개 시나리오

| 시나리오 | 반드시 만족할 조건 |
|---|---|
| A1 승인 B 없음 | 실제 D1 write 0, 승인 다른 lane 우회 금지 |
| A2 clean source 불일치 | 정확 FIRST FAIL `SOURCE_MISMATCH`, PC 원본 보호 |
| A3 승인 키 외 요청 | `OPERATION_NOT_ALLOWED`, D1 write 0 |
| A4 동일 QFR ZIP 재게시 | `ALREADY_STORED` / 중복 0, 원본 checkpoint 보존 |
| A5 QFR 신규 개정 ZIP | 이전 버전 역행 거부, 새 관측만 합법 publish |
| A6 BEA unit 사전검사 후 소스 변경 | 동일 raw SHA pin 위배 시 apply STOP, 공급자 재호출 0 |
| A7 BEA unit 동일 SHA 재실행 | D1 원본 실제 시각이 진실, attempted `Date.now()` 최신 게시로 표시 금지 |
| A8 WPS 서비스 키 미존재 | 기본 5행 API/UI 유지; 가짜 서비스 데이터 0 |
| A9 WPS 서비스 2행 READY | 정해진 2행만 합성 7개; E1-R4 점수/5행 원장 쓰기 0 |
| A10 WPS 서비스 stale/손상 | 정확 확장 상태 표시; 기존 기본 5행·버전 보호 |
| A11 BEA 제조업 archive byte 변경 | SHA/meta mismatch STOP, D1 write 0 |
| A12 D1 응답 timeout/보고 업로드 실패 | `STATE_UNKNOWN` 원장 유지; 재요청 전 기존 DB/readback 직접 조회, 중복 쓰기 금지 |

**격리 테스트는 실제 운영 적용이나 사용자 수동 검증을 대신하지 않는다.** 기존 유효 fixture/Run을 다시 전체 시행하지 않고 **실제 수정한 대상**의 A1~A12 관련 항목만 targeted test/CI. 승인 범위 밖 재현은 메모리 adapter/모의 저장소에서만 수행.

## 6. 단계별 반영 기준 및 실제 다음 실행 하나

### 기존 완료 재사용 / 중복 금지
- QFR R2 PC 저장·R3 저장자료 계산·관련 main 15파일·UI/Reader PR #958, BLS 기본 5행 기존 공개 GET을 다시 만들지 않는다.
- BEA 제조업 CSV archive 보고를 '현장 파일 직접 readback 완료'로 상향 판정하지 않는다.
- BEA unit 예전 dry-run을 원자료 저장 완료로 상향 판정하지 않는다.

### 첫 실행 우선순위
1. **중앙 기존 승인 Writer B Owner가 QFR 1-key에 대한 현재 기등록 게시 수단과 exact 소스/허용 scope/manifest/PC 설치 SHA·실행 결과 회수 경로를 직접 결속**한다. 이 단계에서 신규 게시 요청/실DB 쓰기는 적합한 기존 승인/실제 권한 증거 확인 뒤에만.
2. 경로가 확인되면 QFR **단일 키** source readback→승인 D1 게시→body/stored_at/version 비교→당시 API/UI 확인까지 끝낸다. 미확정 불필요 조건 때문에 BEA/WPS 별개 소스 작업을 멈추지 않는다.
3. BEA unit FRED 이중 fetch 제거 및 WPS main 선별 통합은 위 공통 lane을 쓰지 않는 **독립 source 개선 작업**으로 병렬 수행 가능. 동일 shared publisher/D1 쓰기는 lease와 단일 Owner로 직렬화.
4. 각 기능 실행 전 해당 exact approval/effect가 미확인일 때만 승인 요청; 이미 공통으로 승인된 동일 효과·절차의 중복 승인을 요구하지 않는다.

### 진척 보고 원칙
- **연구·문서 작업:** 소스/공개 코드 검토·개선안 수립 완료 여부를 별도 표시.
- **14개 실제 종단 기능 단계:** QFR/BLS/BEA 원기록에서 완전히 종료된 단계가 재확인될 때만 개수와 상태를 올린다. 연구·GitHub note·CI PASS만으로 1/14 운영 완료 주장 금지.
- **LAST PASS:** 기존 QFR 저장·계산/PR #958 main 병합, WPS 2행 분리 source, BEA MFG R5 raw archive 보고, B Fixture 16/16, 본 오픈소스 코드 패턴 비교 완료.
- **FIRST BLOCKER:** #1 QFR 승인된 단일키 B 게시자 실PC 설치·현재 source/manifest 적격 여부 미확정. **현재 실운영 신규 에러 자체는 확인 0.**
- **NEXT:** 실제 승인 B 재사용 조건을 중앙 Owner가 1회 결속 → QFR 단일키 실제 게시·D1 readback. 연속된 14단계의 무단 일괄 실행 금지.


---

## 7. 2026-11-16 R1.1 — 두 차례 소스 수정 이후 재조사: 게시의 실제 차단 3개와 해결 순서

> **이 절은 R1 기존 계획을 대체하지 않고, 신규 GitHub 원본/공식 Census 2026-11-16 근거를 추가한 정정이다.** 14개 단계의 개수·원래 E1-R4 점수·승인 데이터 계약은 변경하지 않았다. 이번 조회는 실제 PC/D1 쓰기가 아니다.

### 7-1. GitHub 현재 사실과 과거 인계 차이

| 항목 | 최신 근거(조사 시점) | 올바른 판정 |
|---|---|---|
| 기능 원담당 `zgmini` main | `89f5bda5c291feeb16b1904443e69f51745c819f` | 개발 소스 SHA, 실제 Production 배포/PC 설치 아님 |
| W05 전용 앱 브랜치 | `24aee636aad3d713277820ecc8acac26b8fbd545` | BEA 저장 원본 기반 publisher·raw helper·test **3개 소스 변경 완료**, main에는 helper 없음 |
| control 최신 main | `96b8d456462d5250f84cfee8cbc4ee2de712f4c7` | `pc-publication-b.yml`/ `tools/publication-contract.mjs` **없음 (GitHub 404)**. control `config/operations.json` A 목록에도 QFR 전용 apply operation 없음 |
| B 제안 PR #112 | `draft=true`, `merged=false`, head `c5c00e6f663e20e24231aebadc7a7e6235972aad` | 실제 승인/설치/실행 증거 없음. **원본 GitHub PR 응답은 `mergeable=null, mergeable_state=unknown`**. 이전 단순 `mergeable=false` 판정을 *확정 충돌*이라고 말하면 안 됨 |
| 현재 control main vs B 제안 branch | `compare_commits` 결과 **ahead=2, behind=2947, status=diverged** | 7개 신규 파일의 **현재 main 기준 선택적 통합**이 적합; 오래된 브랜치 전체 merge/rebase/force push 금지 |
| control `r6-registered-data-b/operation.mjs` | `operation=employment-r6-registered-data-once`, scope `EMPLOYMENT_R6_REGISTERED_DATA_SQLITE_D1_ONCE`만 고정 | 이미 설치된 범용 QFR B 게시기가 아님. 고용 전용 승인/manifest를 재활용해 QFR D1 쓰기 금지 |
| 실제 PC QFR 게시 영수증 | 신규 고유 requestId/Run/JSON/TXT/D1 key readback 확인 못함 | `FIRST UNVERIFIED`, 실제 QFR Runtime 실패/403 단정 불가 |

과거 [#77 PR 이력](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/77#issuecomment-6600399624)에서 **실운영 source 진단**은 최초 디렉터리 64개 초과 시 검증 대상 스킵, 다른 #91 결과는 `sourceResolved=false`였다는 한계가 기록돼 있다. 이 결과로 'QFR PC 저장 원본이 없다'거나 'B PC 접근이 불가능하다'고 추정하지 않는다. 현재 installed B 실소스는 중앙 기존 승인 Owner의 고유 실행 원장/확인 결과로만 확정.

### 7-2. 중요한 신규 확인: Census 원자료는 *현재* 신규 발표 대기 불필요

- 미국 Census 공식 [QFR 발표 일정](https://www.census.gov/econ/qfr/release_schedule.html): **2026Q2 발표 2026-09-08**, **2026Q3 발표 예정 2026-12-07**. 2026-11-16 현재 공개 가능한 최신 정규 회차는 2026Q2(공식 현재판). 기존 PC QFR는 2026Q2 원자료 저장·계산 PASS.
- 현행 `worker/earnings-companion-c-qfr-r1.mjs`는 **`FRESHNESS_DAYS=165`**, 관측 분기 말일/원본 수집 시각 둘 다 검사. 2026-06-30→2026-11-16 약 **139일**로 이중 `observation` 창을 아직 넘지 않는다. 다만 실 PC 원본의 실제 `sourceStoredAt`는 기존 R3 원장으로 확인하고, 조회 날짜·발표 주기/공식 개정 내용을 혼동하지 않는다. **이 165일 정책은 기존 승인된 코드이며 무단 연장/축소 금지.** 다음 2026Q3 실제 발표 12/7 이후는 기존 정규 원담당 수집·저장으로 반영하고 현재 2분기 게시를 그때까지 미루지 않는다.
- 초기에 예상한 'QFR 현재 값이 이미 3분기라서 저장 원본 2분기가 공급자 최신과 불일치' 시나리오는 **공식 발표 일정과 맞지 않는다**. 단, 개정된 2분기 원본이 나왔는지는 현재 Runtime 증거 범위 밖.

### 7-3. 공개 전문가 코드에서 실물 확인한 방법·불필요한 변경 구분

1. [Cloudflare 공식 Prepared Statements 실코드](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/d1/worker-api/prepared-statements.mdx): `prepare('SELECT ... WHERE snapshot_key=?').bind(key).first()`로 **쓰기 후 정확키 결과**를 확인한다. 현재 QFR `qfrCompanionWriter`는 이미 이 접근 및 `stored_at`/body 해시·checkpoint 검증과 1키 CAS를 구현. 이것을 다시 개발하거나 별도 새 D1 테이블을 만들 필요가 없음.
2. [Cloudflare 공식 D1 Sessions API 예제](https://github.com/cloudflare/templates/blob/main/d1-starter-sessions-api-template/src/index.ts): primary write→same-session select read-after-write. QFR 기존 단일 key Writer가 실제 일관성을 위반한 **증거 없음**. 세션 API/Cloudflare Cron/Writer 구조 교체는 개선의 선행조건이 아니다.
3. [actions/checkout 공식 실코드](https://github.com/actions/checkout/blob/main/README.md): `persist-credentials: false`와 immutable SHA pin 및 최소 workflow scope. 제어 B `.github/workflows/pc-publication-b.yml`은 checkout 2곳 `persist-credentials:false`, `clean:false`를 이미 지정. 보안 조치를 그대로 유지하고 새 임의 실행기를 만들지 않는다.
4. B 제안 workflow는 `on: issues: types:[opened]`이고 `pc-publication` 라벨을 **open 이벤트 시** 검사한다. 따라서 Issue를 라벨 없이 먼저 생성하고 나중에 라벨만 추가하는 방식은 해당 workflow를 실행시키지 않는다. 정규 승인 Owner가 기존 UI/프로세스에서 **처음부터 정확 라벨로 issue 발행**하는 것으로 해결하고 중복 issue를 자동 생성하지 않는다. 필요하다면 기존 정규 트리거 계약을 소유자가 조정하는 것이지 W05가 직접 우회하지 않는다.

### 7-4. 지금 적용할 최소 경로 — 성공 기준까지 한 번 연결

- **선행 source 준비 (W05·중앙 승인 책임 분리):** 이미 수정한 W05 BEA publisher+raw helper+tests **3개** 및 control B Draft에서 수정된 **7개 경로 중 현재 main에 없는/변경 필요한 최소 바이트**를 각각 최신 main 기준 **선별** CI로 통합. 서로 다른 두 repo의 SHA를 섞지 않는다. 전체 W05/B 브랜치 merge 금지. BEA source를 붙일 때 원래 승인 E1-R4 점수·QFR 기존 Reader/SQLite와 다른 작업자의 변경 보존. BEA 수집은 기존 승인 Collector 경로만 사용한다.
- **QFR 단독 B 연결(중앙 Owner):** 현재 installed 공용 Writer B에 QFR exact-key 허용 scope가 있는지 기존 운영 증거로 1회 확인; 없다면 **필요한 7개 소스/프로그램의 정확 B 승인·manifest·설치**를 기존 공통 정규 경로로 수행. `control/main` 소스 통합만으로 실PC 설치 PASS가 되지 않으며, Draft PR을 승인 manifest처럼 사용하지 않는다. 새로운 기능별 CMD/예약/범용 SQL/무권한 remote script 금지.
- **먼저 단일 QFR 키 실제 게시:** `snapshot_key='detail:earnings-recession-indicators:census-qfr-mfg-margin:v1'`; 기보존 PC QFR ZIP readback→`EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs` 고정 원본 계산→B exact B Issue/actor 승인→1회 D1 게시→D1 동일키 `body/stored_at/sourceVersion/sourceStoredAt` 재조회→공개 API→페이지 확인. 승인 B scope에는 QFR 한 키만. 성공 기록은 실제 고유 Issue/Run/Job/TXT/JSON/D1/Production SHA로 수집.
- **BEA pin 별도:** BEA unit은 신설 `sourceSha256`를 승인 manifest/자식 환경에 전달하는 제어 Draft 소스 완료. **기존 운영 PC에 보관된 CSV+meta SHA의 실제 증거 없음**. 저장과 게시가 분리되어야 하며 최초 수집과 보관은 기존 승인 Collector가 수행. preflight/apply 2회 모두 providerCalls=0; 실제 저장 sha pin·file hash·날짜가 모두 같아야 함. `captureBeaUnitSourceOnce`가 CSV와 JSON을 서로 다른 exclusive file 쓰기로 생성하므로, **중간 실패 시 반쪽 archive가 남을 가능성(설계상)**은 개발단계에서 대상 파일만 점검; 기존 raw/meta는 무단 삭제·자동 치유 금지. 소스 통합 전에 실패 복구 지원을 최소 단위로 검사.
- **QFR 정상 이후 후속:** BEA unit, WPSFD42 5+2 선별 통합, BEA 제조업 CSV readback/전용 키 게시, 마지막 Production PC/mobile 검증 순. 정규 자연 발표 검증은 사용자 방침대로 현재 구현 완료를 막는 Gate로 만들지 않음.

### 7-5. 성공/실패 시뮬레이션 체크포인트 (아직 실제 실행 아님)

| 조건 | 예상 판정 | 대응 |
|---|---|---|
| control main에 B workflow 없음 | `NOT_INSTALLED`/제어 Draft 만 존재 | 기존 승인 B 재사용→없으면 필요한 최소 B 선별 소스/정규 승인 |
| publisher main code SHA와 manifest가 다름 | `SOURCE_DRIFT` 안전 거부 | 실제 현행 main/기존 원본으로 승인 manifest SHA 재결속. 사용자가 승인하지 않은 운영 root 교체 금지 |
| approved PC config.source와 operational checkout 다름 | `OPERATIONAL_SOURCE_MISMATCH` | 기존 적법 등록 상태부터 확인. 무단 config 변경 금지 |
| QFR raw ZIP 저장 증거 R2/R3 PASS | `READY_SOURCE` | 재수집·검산 반복 대신 B 정확키 공개 게시 수행 |
| 2026-11-16 2026Q2 원본 | 정적 코드 신선도 조건에서 유효(관측일 139/165일) | 신규 발표 대기 없이 D1 공개 작업 추진; 원본 시각은 실 PC 재확인 |
| D1 쓰기 후 응답 수신 실패 | `STATE_UNKNOWN` | 기존 D1 row/게시 ledger readback 먼저, 동일 Issue 재생성·중복 게시 금지 |
| API/사이트 HTTP 200 | 필요조건이지만 비충분 | 정확한 QFR 원문 수치·단위·관측일/부재 상태·Cloudflare Deployment SHA 확인 |

**LAST PASS:** QFR PC 원자료 저장/계산의 과거 실제 증거, QFR Source/Reader/UI 본선 코드, BEA stored-only 소스 `24aee636`, B pin 제안 `c5c00e6`, control B Draft 7파일/공개 공식 저장소 3개 패턴/공식 Census 발표 일정 분석.
**FIRST BLOCKER:** 현재 설치·승인된 QFR 단일키 실제 게시 B 경로를 아직 확인하지 못함. 실제 Windows 실행 실패·D1 403 오류를 본 turn에서 관측한 것은 아님.
**바로 다음 필수 실행 하나:** 중앙 기존 B 게시 소유자가 **실제 QFR single-key B 허용·설치 source/manifest+기존 승인 요청 유무를 확정**한 뒤 존재하는 정규 경로로 QFR 게시·독립 D1 readback. W05는 BEA 소스·WPS 선별 통합처럼 독립 승인된 개발을 병렬로 계속한다.
