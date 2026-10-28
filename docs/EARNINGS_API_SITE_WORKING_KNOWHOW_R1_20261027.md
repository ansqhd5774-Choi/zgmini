# ZGMINI 실적 침체 분석 지표 — API↔사이트 작업 노하우·인수인계 R1

- 작성일: 2026-10-27 (KST)
- 저장소: `ansqhd5774-Choi/zgmini`
- **유일한 후속 작업 브랜치:** `codex/api-site-integration-r1-20261026`
- **기본 목표:** API와 사이트 지표를 **연결하고, 새로운 유효 지표를 추가하며, 정확성·갱신·안정성을 지속 보완**한다.
- 이 문서는 **작업 과정에서 실제로 확인된 재사용 가능한 지식과 남은 미검증 경계**를 보존한다. 과거 작업 브랜치와 당시 문서 머리말은 역사적 출처이지 향후 작업 지시가 아니다.
- 계획: `docs/EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md`
- 병합·이탈 감사: `docs/EARNINGS_API_SITE_BRANCH_ALIGNMENT_AUDIT_R1_20261027.md`
- 이 문서는 **확인 단계별 증거**로 구현 상태를 표현한다. 2026-10-27 공개 GET 재검증과 지정 브랜치 UI 수정은 수행했지만, **BEA D1 쓰기·readback 및 신규 Production 배포는 수행하지 않았다.**

## 1. 다음 작업자가 첫 5분에 확인할 사항

1. `ansqhd5774-Choi/zgmini`의 지정 **기존 브랜치**와 그때의 실시간 HEAD를 확인한다. 임의 새 브랜치 생성·작업 위치 변경 금지. 다른 작업자가 동시에 진행한 변경은 SHA 차이를 확인하고 덮어쓰지 않는다.
2. 원 계획(R1~R6), 본 노하우, 병합·이탈 감사, `AGENTS.md`를 **함께** 읽는다. 계획 파일의 과거 `PLAN_ONLY` 문구·옛 브랜치명은 2026-10-26 최초 스냅샷 설명이지 2026-10-27 현재 상태가 아니다.
3. 실제 운영 소스 SHA(사용자 PC 승인 config/작업 등록/실행 기록), GitHub 작업 HEAD, main, Cloudflare 배포 SHA를 별도로 적는다. 같다고 추정하지 않는다.
4. 목표를 **실제 지표 증가/연동/품질 개선**으로 정의한다. 브랜치 병합, 검증 절차, 문서작업은 재작업 방지 수단이다. API 후보 하나가 HOLD라도 다른 통과 후보 작업을 계속한다.
5. 기존 증거가 유효하고 소스/시계열/계약이 그대로라면 재수집·반복 CMD 실행을 시키지 않는다. 검증이 필요한 지점만 추가 확인한다.

### 보고 템플릿(매회 필수)

- 저장소 / **실제 작업 브랜치** / 작업 전후 HEAD
- 목적(어떤 API와 어떤 화면 지표를 연결·추가·개선했나)
- 변경 파일·지표 ID·데이터 출처·관측일·원본값/파생값
- 증거 단계: SOURCE / PC_API / PC_SQLITE / LOCAL_CALC / D1_WRITE / D1_READBACK / PUBLIC_GET / UI / PRODUCTION / NEXT_SCHEDULE
- 각 단계의 **PASS / FAIL / NOT_RUN / HOLD**, 마지막 확정 PASS, 첫 실패 지점, 후속 작업
- 임시 브랜치 삭제는 사용자가 직접 하기로 했으므로 **삭제하지 않는다**.

## 2. 범위와 불변 계약 — 가장 많이 혼동된 부분

| 구분 | 역할 | 변경 허용 범위 |
| --- | --- | --- |
| A | 기존 E1-R4 실적 침체 위험 점수 4개: `epsGrowth`, `margin`, `revenueGrowth`, `earningsGrowthBreadth` | 가중치·점수 산식·정규화·과거 결과·기존 `/api/earnings-recession-detail` 변경 금지 |
| B | `/economic-indicators/earnings/`의 별도 12대 기업 실적 도메인과 E1-R5 Shadow | 이번 C 작업과 섞지 않는다 |
| **C** | 실적 침체를 이해하는 **정보성 참고지표 목록** | 권리·정의·실측이 확인되는 만큼 **개수 제한 없이 동적 확장**. 기존 점수에는 무단 합산하지 않음 |

- 목표 사용자 화면: `https://zgmini.kr/earnings-recession/`.
- 유지할 흐름: **원 공급자 API → 사용자 PC SQLite 원자료 → 저장된 자료만 계산 → 승인된 D1 공개 Snapshot → 읽기 전용 Worker API → 페이지**.
- HTTP GET은 실시간 BEA/BLS 호출, PC 원장 접근, 계산, D1 쓰기를 수행하지 않는다. 실패한 C가 정상 A 점수 패널까지 망가뜨려서는 안 된다.
- `0`은 유효한 숫자, `null`은 결측, `STALE`은 오래된 관측이다. 공급 실패 시 임의 값/관측일/공식 발표일 생성 금지.
- 공식 제공 원시 시계열과 당사 파생 YoY의 정확한 정의·단위·관측주기·출처를 반드시 분리한다. 현시점 조회 수정본은 **발표 당시 PIT 빈티지와 다르다**.

## 3. 실제로 통과한 것과 아직 통과하지 않은 것 (2026-10-27 체크포인트)

| 경로 | 확인된 내용 | 아직 주장할 수 없는 것 |
| --- | --- | --- |
| BLS 원자료 | 공인 시리즈 `WPSFD4` 21건, `WPSFD41` 21건, `PRS85006111` 6건. PC 수동 호출 1회, snapshot/chunk 각 3건, 원장 readback 3/3. **2026-10-27 공개 BLS GET `READY` 5/5 확인** | 다음 정규 자동 실행, 해당 브랜치 UI의 Production 배포 |
| BLS 파생 | PC 저장 원본으로 정보성 **5행** 로컬 미리보기 검증(READY 5/5), SHA/cohort 검증 | 5개 **독립** 원천 아님. 2개 PPI 계열의 index와 YoY는 각각 같은 원천 |
| BEA 법인이익 | 화면용 S6 연결 코드/데이터 읽기 경로 존재 | 그 코드 존재만으로 실제 최신 API/화면 READY·주기 갱신 PASS 아님 |
| BEA 비금융 단위이익 | PC read-only preflight `PASS_BEA_UNIT_PREFLIGHT_ONLY`; 최신 0.250, 직전 0.231(달러/실질 GVA 단위), 당시 `D1_WRITES=0`, `SQLITE_WRITES=0` | D1 게시, 원격 readback, 실제 브라우저 최신 값 확정 아님 |
| Worker/D1 C 코드 | 저장 전용 writer 및 GET/HEAD 읽기 전용 경로 구현. **공개 API BLS 응답을 실제 읽고 `READY` 5/5 확인** | D1 내부 직접 readback 증거, BEA 단위이익 D1 게시, exact 배포·다음 정규 실행은 별도 증거 필요 |
| 사이트 | 기존 점수 4행 + BLS 5행 + BEA 참고 2행 계열 유지. **지정 브랜치에서 BLS 유효 `rows[]` 동적 매핑 완료**; 실 API 대조 5/5 및 단위검사 5/5 PASS | 브랜치 수정분의 Production 빌드·배포·실화면 검증은 미완료. 11행이 독립 원천 11종이라는 뜻은 아님 |
| Census/SEC | 공식 후보 및 권리/기술 조사 항목이 계획에 있다 | QFR/M3/MTIS/SEC의 원하는 지표별 실 API 수치·저장·게시를 일괄 PASS로 선언 금지 |

근거 문서:
- BLS 원장 저장: `docs/EARNINGS_COMPANION_R3C_BLS_MANUAL_STORE_IMPLEMENTATION_20261027.md`
- BLS 계산 원칙: `docs/EARNINGS_COMPANION_R3D_STORED_DATA_CALCULATION_CONTRACT_20261027.md`
- BLS 실측 검증: `docs/EARNINGS_COMPANION_R4_PC_RESULT_VERIFIED_20261027.md`
- 정보성 C D1 코드·신선도: `docs/EARNINGS_COMPANION_R4_D1_PUBLIC_READ_MODEL_PHASE2_20261027.md`
- 복구·미진행 Gate: `docs/EARNINGS_API_SITE_BRANCH_ALIGNMENT_AUDIT_R1_20261027.md`

### 2026-10-27 공개 API·페이지 연동 실증 (추가 체크포인트)

- `https://zgmini.kr/api/earnings-recession-indicators`: HTTP 200, `schemaVersion=earnings-companion-c-r4-v1`, `status=READY`, `coverage.ready=5/5`, `historicalMode=CURRENT_RETRIEVAL_NOT_PIT`; 시리즈 `WPSFD4`, `WPSFD41` 관측 2026-09, `PRS85006111` 관측 2026-Q2. 실제 공개 JSON으로 새 UI 매핑 함수를 호출한 호환성 검사 5행/5행 통과.
- `https://zgmini.kr/api/earnings-recession-bea-unit-profit`: **HTTP 503 / `status=unavailable` / `reason=STORED_PROJECTION_PENDING`**. preflight 값 0.250 / 0.231만으로 게시 완료라고 해석하지 않는다. 인증·승인된 Windows 수동 D1 게시 및 정확한 readback은 아직 필요하다.
- A 점수 API `/api/earnings-recession-detail`은 별도로 `READY`, 기존 4요소, 진단 점수 84.6875를 확인했다. **C 원자료 추가로 A 산식·점수는 수정하지 않았다.**
- 지정 브랜치 신규 파일: `app/earnings-recession/earnings-cost-indicator-list.mjs`, `app/earnings-recession/earnings-cost-indicator-list.test.mjs`. 패널에서 해당 등록기를 사용하도록 수정. 5개 테스트 `PASS`(결측, 기존 데이터/순서, 유효 신규 행, 위조/중복 차단, 미지원 스키마). **브랜치 코드 검사와 공개 GET 대조는 Production 화면 렌더링 확인이 아니다.**
- UI 컴포넌트 반영 커밋: `b4c3f7536d5817e3eb403c6fca50bf6c52d053f6`. 지정 브랜치에서만 수정함; main 병합·배포, 새 브랜치 생성, 삭제는 진행하지 않음.

**바로 다음 단계:** (1) 사용자가 승인한 Windows 원장·D1 수동 게시 경로에서 BEA 단위이익 `--apply --confirm-bea-unit-d1-write` 게이트를 충족할 때만 게시 및 readback, (2) 새 UI branch 결과를 안전한 빌드/모바일 검증 후 승인된 main 배포, (3) 신규 유효 정보성 지표 소스별로 같은 수직 경로 확장. BEA가 HOLD인 동안 BLS 등 통과한 지표의 UI 개선을 중단하지 않는다.

### 2026-10-27 BEA 미게시 원인 확인 및 BLS 매핑 검증 추가

- BEA 단위이익은 **운영 API route 자체의 404/코드 누락이 아님**. 최신 `main`과 전용 브랜치의 `scripts/pc-writer/EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs`, `EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs`, `worker/earnings-bea-unit-profit-r1.mjs` GitHub blob SHA가 동일하고, `main`의 `worker/candidate-r52.ts`에도 route가 존재한다. 운영 공개 GET은 503 `STORED_PROJECTION_PENDING`으로 **게시된 snapshot이 없다는 단계**까지 구분한다. 공개 GET을 D1 직접 SELECT 증거로 대체하지 않는다.
- 이미 `scripts/pc-writer/EARNINGS_BEA_UNIT_PROFIT_R1_APPLY.cmd`가 존재하므로 불필요한 새 실행기를 만들지 않는다. PC에서 실행하려면 승인된 publisher checkout(main clean + origin/main 일치), `ZGMINI_EARNINGS_C_OPERATIONAL_ROOT`, 운영 승인 SHA/config, 실제 PC 런타임 및 write 확인이 필요하다. 여기서 **PC 작업을 실행하거나 D1에 쓰지 않았으며, 게이트를 우회해서는 안 된다.**
- BLS 페이지 동적 목록은 `indicatorId`만 일치시켜 데이터를 배정하면 공급 시리즈를 바꿔치기해 오표시할 수 있다. 등록된 5개 ID별 `seriesId/kind/unit` 일치 검사, 허용 단위·변동 단위·출처·범주 검사 추가. 로컬 테스트 **7/7**, 실제 공개 BLS API와 5/5 호환 검사 PASS. 강화 커밋 `4878baf1c2645248a76c9e38552804c971d48b3a`, 테스트 커밋 `6c3eaf374e2764637c4afd5efd3db55e73668266`.
- **확장 시 남은 기술 경계:** UI 매핑은 신규 검증 BLS `rows[]`를 표시하지만, 현재 `worker/earnings-companion-c-r4.mjs`의 원천 `SERIES` allowlist는 `WPSFD4/WPSFD41/PRS85006111`의 3개뿐이다. 새 지표가 자동으로 수집·저장·D1 게시되는 것은 아니다. 추가 시 공급자 계약/PC 저장/Worker 검증 allowlist/게시/readback을 한 소스씩 통과시켜야 한다.
- Census QFR은 공식 API 데이터셋이 있으나 공식 예제에 **API 키 필수**라고 명시돼 있다. 공개 자료·권한 검증 후 후보로 유지하고 임의 무키 호출이나 제공받지 않은 키를 추정하지 않는다.

### 계산·표시에서 체득한 구체적 규칙

- `WPSFD4`와 `WPSFD41`은 월간 **계절조정 PPI 지수**다. 파생 YoY는 `100 × (index[t] / index[t−12] − 1)`; 비교월이 없거나 분모가 유효하지 않으면 `null`. 실측 13개월 UI 이력에서 각 YoY 값은 **9/13**만 유효했고 나머지 4개는 억지로 연결하지 않았다.
- `PRS85006111`은 이미 **전년 동분기 대비 단위노동비용 증가율(%)**이므로 전분기 변화나 연율로 이중 변환하지 않는다.
- 관측기간(`observationPeriod`), 원본 조회 시각(`retrievedAt`), D1 저장 시각(`stored_at`), 실제 발표일(`releaseDate`)은 독립 필드. `releaseDate`가 없으면 `null`; D1 재게시를 신규 관측으로 간주하면 안 된다.
- 검증된 BLS 정보성 C 로컬 `sourceVersion`: `d7db335939bbdf07272f2467f8ad8239b01304727174ee606bc2db23324bb2af`; `sourceStoredAt=1793034173996`. **당시 검증 자료의 식별자**이지 앞으로 수집될 자료에 재사용할 상수가 아니다.
- C read-model의 월간 PPI **75일**, 분기 ULC **165일** 관측 및 원본 취득 신선도 한도는 코드의 *보수적 휴리스틱*이며 BLS 공식 발표일이 아니다. 새 공급자는 주기에 맞는 계약을 별도 검증한다.

## 4. 현재 실제 연결점: 새 작업 전에 코드부터 재사용

| 계층 | 코드/계약 | 재사용 요령 |
| --- | --- | --- |
| 기존 A 읽기 | `/api/earnings-recession-detail`, `detail:earnings-recession:v1` | 절대 덮어쓰지 않는다 |
| C BLS 읽기 | `/api/earnings-recession-indicators`, `detail:earnings-recession-indicators:v1` | `worker/earnings-companion-c-r4.mjs`의 stored-only GET/HEAD, 승인된 writer/readback 경로 |
| C BEA 단위이익 | `/api/earnings-recession-bea-unit-profit`, `detail:earnings-bea-unit-profit:v1` | `worker/earnings-bea-unit-profit-r1.mjs`와 PC preflight를 검토하되 아직 원격 완료 선언 금지 |
| Worker 라우팅 | `worker/candidate-r52.ts` | 보존 중인 BLS/BEA 두 경로 모두 유지; 오래된 브랜치 버전으로 교체하지 않는다 |
| UI | `app/earnings-recession/earnings-risk-only-panel.tsx` 및 `earnings-cost-indicator-list.mjs` | **유효 BLS `rows[]`를 읽는 동적 등록기 구현**. 기존 5개 라벨·순서를 보존하고 추가 BLS 행이 있으면 자동 표시. 다른 공급자·스키마·중복·출처 위조는 제외. 운영 반영은 별도 |
| 기존 D1 저장소 | `market_public_snapshots_v1` | 기존 공개 Snapshot 테이블 재사용; 별도 키만, 기존 점수 키·테이블·TTL 임의변경 금지 |
| Windows BLS | `scripts/pc-writer/EARNINGS_R3C_BLS_STORE_ONCE.cmd` | 이미 성공한 1회 저장을 재실행할 이유 없음. 수정본·신규 관측이 실제 필요한 경우에만 계약 확인 |
| Windows C D1 | `scripts/pc-writer/EARNINGS_R4_C_D1_MANUAL.cmd` | 기본 dry-run. apply/쓰기 여부와 원격 readback을 혼동하지 않는다 |
| Windows BEA | `scripts/pc-writer/EARNINGS_BEA_UNIT_PROFIT_R1_PREFLIGHT.cmd` | dry-run 로그부터 확인. 이 래퍼는 Desktop/OneDrive/Desktop/스크립트 폴더 순 출력 경로를 선택하며, PIN_SHA를 둔 portable fallback은 **최신 HEAD가 아님** |

## 5. 반복 실수·실패 원인 → 재발 방지법

| 실제 발생·식별한 문제 | 다음에는 이렇게 처리 |
| --- | --- |
| 새 개인 브랜치에서 진행하여 최초 6단계 계획/증거 파일 **36개가 전용 브랜치에서 누락** | 지정 브랜치 선확인; 비교 결과 필요한 파일만 회수. 현재 36개 회수 완료. 옛 브랜치 헤더를 현재 작업 브랜치로 오해하지 않는다 |
| 역사적 `worker/candidate-r52.ts`로 파일 전체 교체 시 BEA 라우트 회귀 위험 | 현재 지정 브랜치의 더 최신 구현 보존, 기능 단위 diff 및 회귀검사 |
| 예전 BLS 자료가 이미 존재하는데 다시 수집하려 함 | 원본의 `provider/seriesId/snapshot SHA/cohort` 조회·기존 유효 근거 재사용 후 필요한 신규 관측만 추가 |
| 원본 3종 → 정보행 5개를 5개 독립 지표로 해석 | RAW/DERIVED와 공통 seriesId를 표시; 같은 출처 여러 표현을 점수·독립 증거처럼 합산 금지 |
| BEA 단위이익 preflight 성공을 곧 공개 완료로 오인 | `PASS_BEA_UNIT_PREFLIGHT_ONLY`를 PC 읽기 검증으로만 처리. D1 원격 write/readback, GET, UI를 별개 판정 |
| BEA 수치의 원출처와 전달 경로 혼동 | 현재 단위이익 구현은 `FRED fredgraph.csv / A463RD3Q052SBEA` 배포 시계열 사용. 원래 원칙은 **BEA 공식 원천 API 우선**. CSV 사용을 단정적 금지 위반으로 표현하지 않되 원출처 정의·재이용·개정·직접수집 가능성을 검증 |
| CMD 로그가 보이지 않거나 Node/경로가 맞지 않음 | Windows **CMD 전용**. 승인된 Node·실제 runner 경로·`%~dp0`·Desktop/OneDrive 경로·출력 기록부터 진단. 빈 DB 생성/스케줄 수정 금지; 비밀키/원본 대량 로그 금지. 다음 새 CMD는 실행 파일과 같은 위치 TXT 출력 기본 |
| 화면이 코드상 11행인데 API 데이터 READY가 아님 | 각 행별 PUBLIC_GET status, 출처, 관측 시각과 브라우저 실 렌더링 확인; 소스 구현/로컬 PASS/실제 배포 구분 |
| 우선순위가 조사·차단 심사로만 흐르고 지표 연결이 지연 | 소스별 HOLD로 격리. **유효한 기존 데이터→공개연동, 그다음 유효한 신규 데이터→추가**로 작은 수직 단위 완결 |
| branch GitHub SHA·운영 PC 승인 SHA·main·배포 SHA 혼동 | 각 SHA를 분리해서 기록하고 변경 직전 live 확인. 계획 업데이트는 Production 게시가 아니다 |

## 6. 앞으로의 단위 작업 표준: 지표를 실제로 하나씩 늘리는 절차

1. **후보·기존자료 확인:** 사용자에게 유용한 실적 관련 정보성 지표를 고르고 기존 PC 원장·API·사이트 중복 여부 점검. 우선 BEA 기업/산업이익, Census QFR, BLS, M3/MTIS, SEC. 더 좋은 공급원이 나오면 추가 가능.
2. **소스 적합성:** 해당 *정확한* endpoint/series/table/variable, 실 HTTP 관측치, 측정 정의·단위·관측주기·권리/요금/할당량을 기록. 한 후보가 HOLD라도 다른 후보를 진행.
3. **원본 저장:** 승인된 PC SQLite 경로에 원 응답·sourceURL·seriesId·period·unit·adjustment·retrievedAt·SHA를 계약대로 저장. 기존 구조·스케줄러 임의 변경 금지, 중복·개정본·부분 실패 안전처리.
4. **저장 데이터 계산:** 원장만 읽는 결정론적 계산, 원본과 파생 분리, 결측/수정치/시계열 관측범위 테스트. 정상 소수 0은 살리고 결측은 `null`.
5. **D1 projection:** 별도 C 키·검증된 payload와 monotonic checkpoint. 승인된 게시 작업만 쓰기; 같은 자료 재게시로 신선도 부풀리지 않음; write 뒤 **정확한 readback** 검증.
6. **Worker/API:** 기존 점수 route와 분리된 stored-only 공개 GET 및 freshness/status; 값·조회시각·관측기간·출처·방법·히스토리. 공급자 외부 호출 없음.
7. **페이지:** 확장 가능한 registry/`rows[]`로 새 C 지표를 추가하되 A 점수 4요소 보존. 정보성 별도 영역 전환은 사용자 UI 확인 후 진행; 모바일/PC, 유효 데이터·결측·stale·에러 UI 확인.
8. **운영 검증:** GitHub 코드와 PC 실행, D1 write/readback, 공개 GET, Production 빌드·배포, 실제 페이지, **다음 정규 갱신**을 각각 PASS 판정. 현 단계에서 부족한 단계만 마무리한다.

완료 판정 최소 증거표:

| 단계 | 실제 증거 예시 | 없으면 |
| --- | --- | --- |
| PC API 수신 | 정확한 source/series/기간 + HTTP/응답 증거 | `NOT_RUN` 또는 `HOLD` |
| PC 저장/파생 | SQLite 읽기 검증 + hash/cohort + 계산 테스트 | `NOT_RUN` |
| D1 | 새 별도 키의 원격 저장/본문 readback | `NOT_RUN` |
| 사이트 GET | 실제 요청의 상태·rows·freshness 확인 | `NOT_RUN` |
| 사용자 화면 | 실 웹 PC/모바일에서 출처·날짜·값·결측 표출 | `NOT_RUN` |
| 자동화 | 신규 관측 뒤 정규 PC→D1→화면 갱신 확인 | `NOT_RUN` |

## 7. 지금 가장 가치 있는 후속 우선순위

1. **연동 미완료 구간부터 마무리:** 현재 BLS 3원천/5행, BEA 참고 2행에 대해 실제 **D1 readback → 공개 GET → 화면**의 남은 구간을 확인하고 정확한 첫 실패를 해결한다. 기존 BLS 수집·검증을 처음부터 반복하지 않는다.
2. **신규 지표 확장:** BEA 원 API 기업이익/산업이익의 실측 변수 매핑을 진행하고, Census QFR 수익성 데이터의 실제 사용 가능한 시계열을 검증하여 **새 정보성 행**을 추가한다. BLS 3종에만 작업을 가두지 않는다.
3. **동적 확장성 개선:** UI `costIndicators` 하드코딩의 유지보수 한계를 해소하는 registry/응답 기반 설계안과 C 별도 영역 배치를 사용자에게 제시하되, 디자인 합의 전 대규모 변경은 하지 않는다.
4. **지속 운영:** 관측/원본 조회/게시 시각 분리, 발표 지연·429/결측 대응, 기존 E1-R4 회귀검증, 다음 정규 실행 로그까지 연결한다.
5. 같은 증거와 오류를 다음 대화에서 반복하지 않도록 각 신규 지표마다 **원본 출처·seriesId·현재 단계·마지막 PASS·첫 FAIL·정확한 후속 행동**을 이 문서 또는 연계된 기록에 누적한다.

## 8. 원출처 및 규정 참고(실행 시 최신판 확인)

- BEA 공식 API: https://apps.bea.gov/API/docs/
- BEA 공식 자료 권리: https://www.bea.gov/help/faq/147
- BLS 공식 API v2: https://www.bls.gov/developers/api_signature_v2.htm
- BLS API 조건: https://www.bls.gov/developers/termsOfService.htm
- Census 개발자 데이터셋: https://www.census.gov/data/developers/data-sets.html
- SEC EDGAR 접근 안내: https://www.sec.gov/about/webmaster-frequently-asked-questions
- Cloudflare D1 Worker 읽기/준비문: https://developers.cloudflare.com/d1/worker-api/prepared-statements/
- GitHub 브랜치 파일 SHA 기반 수정: https://docs.github.com/en/rest/repos/contents

## 9. 후속 지표 #4 BLS 서비스 생산자물가 — 실제 소스·코드·게시 Gate (2026-10-27)

- 작업 브랜치는 처음부터 끝까지 `codex/api-site-integration-r1-20261026`이다. 별도 분기·삭제·main 병합·Production 배포 없음.
- **새로운 독립 원본 1종:** 공식 BLS `WPSFD42`(최종수요 서비스 PPI, 계절조정). 공개 BLS v1 HTTP 실제 수신 `REQUEST_SUCCEEDED`. 2026-09 지수 157.666, 2025-09 지수 150.273 → 자체 파생 YoY **4.919712789389985%**. 최신 2026-09은 당시 preliminary였다. 발표일은 API 값에서 추측하지 않는다.
- **추가 표시 행 2개:** `bls_ppi_services_index`(RAW INDEX), `bls_ppi_services_yoy_sa`(DERIVED PERCENT). **2행이지만 독립 원본 1종**이다.
- BLS 기본 3원본 `WPSFD4/WPSFD41/PRS85006111`은 새 서비스용으로 다시 받지 않는다. 기존 `EARNINGS_R3C_BLS_STORE_ONCE.mjs`에 `--services-only --dry-run`(API 조회·검증, DB 0쓰기)과 `--services-only --apply --confirm-service-sqlite-append`(명시 승인 이후 PC 원장 단일원본 append)를 추가했다. 두 개의 전용 CMD는 `EARNINGS_BLS_SERVICE_R1_PREFLIGHT.cmd` 및 `EARNINGS_BLS_SERVICE_R1_APPLY.cmd`, 출력 TXT는 같은 디렉터리.
- 저장된 서비스 원본은 R3D와 R4에서 별도로 SHA/provenance 검증한다. 해당 시계열이 준비됐을 때만 기존 5행을 **7행**으로 확장; R4의 기존 3원본 동일수집 묶음은 유지하고 별도 수집을 동일 응답이라고 꾸미지 않는다. Worker의 WPSFD42 검증, UI의 **게시행 있을 때만 보이는 이름/출처 매칭**을 반영했다.
- 메모리 SQLite 기반 R4 테스트 **13/13**, Worker **9/9**, UI **8/8**, 총 **30/30 PASS**. 7행 저장자료→Worker payload validator→UI 동적 레지스트리 일괄 회귀검사도 포함했다. 이 테스트는 PC 저장·D1·Production PASS가 아니다.
- **남은 핵심 조건:** 기존 D1 공개 C writer는 `sourceStoredAt=OLDEST_FIRST_SEEN_AT`을 유지한다. 기존 5행과 `sourceStoredAt`이 동일한 채 서비스 행을 추가하면 `sourceVersion` 변경을 거부할 수 있다. **기존 checkpoint를 속이는 timestamp 조작·무단 writer 완화 금지**. 실 D1 readback을 확인한 후 별도 게시 checkpoint/key 등의 승인 경로를 결정해야 한다.
- 구체적인 새 파일·코드 지도·공식 실측·실행 방법·게시 제한은 [WPSFD42 서비스 PPI 연동 증거](EARNINGS_BLS_SERVICE_PPI_WPSFD42_INTEGRATION_R1_20261027.md)에 보존했다.
- 진척 판정: SOURCE_HTTP=PASS, SOURCE_CODE/LOCAL_TEST=PASS, PC_SQLITE_WPSFD42_WRITE=NOT_RUN, D1_WRITE/READBACK=NOT_RUN, PUBLIC_GET_7ROWS=NOT_RUN, PRODUCTION_7ROWS=NOT_RUN. 기존 BEA 단위이익의 `STORED_PROJECTION_PENDING`도 별도 진행 과제로 남는다.

## 10. 서비스 PPI 독립 D1 체크포인트 — 다음 작업 때 그대로 사용 (2026-10-27)

**이 절은 위 9절의 미결 checkpoint 문제를 코드 설계 차원에서 갱신한다.** 전용 브랜치는 계속 `codex/api-site-integration-r1-20261026`이며 개인 브랜치·main 병합·Prod 배포 없음.

### 불변 경계

1. 기존 5행 D1 키 `detail:earnings-recession-indicators:v1`은 값/원본 checkpoint를 그대로 유지한다. 원래 `sourceStoredAt=1793034173996`이며 공개 GET HTTP 200, 5/5 READY를 2026-10-27 읽기 전용으로 확인했다.
2. 별도 **서비스 2행 전용 D1 키** `detail:earnings-recession-indicators:bls-wpsfd42:v1`를 **코드로만** 준비했다. 아직 D1 행을 만들거나 쓰지 않았다. 둘은 *서로 다른 산식*이 아니라 **서로 다른 원본 수집 시각/원천 해시에 대한 독립 단조 증가 체크포인트**이다.
3. 기존 D1 게시 스크립트 `EARNINGS_R4_C_D1_MANUAL.mjs`, `EARNINGS_R4_C_D1_DUAL_SOURCE_ONCE.mjs`는 `buildPreview(...,includeServices:false)`를 호출한다. 새 서비스가 PC에 있어도 기존 D1 키에 7행을 밀어 넣는 실수를 방지한다.
4. `buildServiceSourcePreview()`는 저장된 WPSFD42 원본만 서비스 행 2개로 선택, SHA·provenance 검증, 서비스 원본 `first_seen_at`만 사용해 sourceVersion/sourceStoredAt 산출. 원래 3종·5행 sourceVersion을 바꾸지 않는다.
5. 서비스 신규 전용 게시 경로 `EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs`, `EARNINGS_BLS_SERVICE_R1_D1_PREFLIGHT.cmd`, `EARNINGS_BLS_SERVICE_R1_D1_APPLY.cmd`: 기본 드라이런, `--apply --confirm-earnings-c-service-d1-write` 이중 허가, 승인된 운영 checkout/config SHA·clean main publisher SHA 출처 검증, **WPSFD42 전용 키** D1 exact readback. TXT는 CMD/MJS와 같은 폴더. 스케줄러 자동 등록 없음.
6. Worker 공개 GET: 원래 5행 저장 본문이 정상인지 먼저 확인, 추가 서비스 키를 별도로 읽어 검증. 정상일 때만 7행 + 합성 응답 식별 해시, 서비스 미발행/오류 시 기존 5행 유지. 응답 헤더 `x-earnings-c-service`로 네 상태 구분. 공개 GET은 BLS 호출·원본 계산·D1 쓰기 없음.
7. `WPSFD42`의 2026-09 지수 157.666/2025-09 150.273 → *전년 같은 달 대비 파생값* 4.919712789389985%. BLS 2026-09 발표의 서비스 최종수요 **전월 대비** +0.8%와 혼동 금지. 원본 기간·조정·산식·출처의 차이를 반드시 UI와 검증에 보존한다.

### 다음 운영 Gate (미수행은 미완료)

1. 사용자 PC의 `EARNINGS_BLS_SERVICE_R1_PREFLIGHT.cmd` HTTP 실측 TXT를 확인하고 명시적 승인 후 `EARNINGS_BLS_SERVICE_R1_APPLY.cmd`로 WPSFD42 원장을 append/readback.
2. 새 Worker GET을 승인된 Git/main·배포 경로로 반영하기 전에 **코드/지정 브랜치 테스트만**으로 준비 완료라고 기록. 사용자 승인 없는 본선 merge/배포 금지.
3. `EARNINGS_BLS_SERVICE_R1_D1_PREFLIGHT.cmd`로 2행 검증 및 source gates 확인. D1 `APPLY.cmd`는 **별도 사용자 승인 뒤에만** 실행. 워커를 배포하지 않은 상태에서 새 서비스 키를 먼저 공개했다고 보고하지 않는다.
4. D1 정확한 readback → 공개 GET 7행/상태/단위/시각 → 웹페이지/모바일 → 이후 신규 BLS 관측 시 정규 갱신 검증을 개별 PASS로 기록.
5. 다음 후보(BEA 기업·산업이익, Census QFR 등)는 위 단계 이후 우선순위 검토. 현재 서비스 2행에 점수 산식 변경·새 창구 개설·개인 브랜치 생성은 불필요하다.

## 11. 다음 정보성 지표 후보 R1 — Census QFR 제조업 세후이익률 (2026-10-27)

- 기존 BEA 단위이익의 공개 GET `https://zgmini.kr/api/earnings-recession-bea-unit-profit`를 같은 날 재확인한 결과 **HTTP 503 `STORED_PROJECTION_PENDING`**. 공개 Worker route 존재와 저장 자료 실제 게시를 혼동하면 안 된다. 기존 사용자 PC preflight의 `CURRENT_VALUE=0.25`, `D1_WRITES=0`은 운영 게시 완료 증거가 아니다. BEA는 기존 별도 게시 승인 단계로 유지한다.
- 다음 독립 원본 후보는 **미국 Census QFR 공식 ZIP**이다. 무료로 직접 다운로드할 수 있는 `https://www.census.gov/econ_getzippedfile/?programCode=QFR`를 사용한다. Census 공식 API `/data/timeseries/eits/qfr` 예시에는 API 키 필수가 명시되어 있으므로 무키 API 호출 성공을 주장하지 않는다.
- `QFR-mf.csv` 데이터에서 `MFG` + `US` + 비계절조정 `is_adj=0` + 매출 `dt_code=101` + 세후이익 `dt_code=115`의 동일분기만 사용. 매출·이익은 **백만 USD 원시 자료**, `100×이익/매출`은 **자체 계산 %**. 총 원본 증거는 Census QFR 1종이다.
- 2026-10-27 공식 ZIP 실측: 2026-Q2 매출 2,372,409, 세후이익 370,082 (백만 USD), 제조업 세후이익률 **15.59941814%**. 2026-Q1은 **14.03708176%**, 차이 **+1.56233639%p**. NAICS 분류 전환·표본오차·비계절조정에 유의하고 제조업 집계를 미국 모든 기업의 이익률로 과장하지 않는다.
- 준비 파일: `scripts/pc-writer/EARNINGS_CENSUS_QFR_R1_READONLY.mjs`, `EARNINGS_CENSUS_QFR_R1_PREFLIGHT.cmd`, `EARNINGS_CENSUS_QFR_R1_READONLY.test.mjs`, `docs/EARNINGS_CENSUS_QFR_MANUFACTURING_MARGIN_R1_20261027.md`.
- 실 ZIP 압축·CRC·메타정보·연속 분기 검증 PASS; 오프라인 테스트 5건 PASS. 이 실행 환경에서 Node fetch 실네트워크는 DNS 차단으로 불확정이며 PC 실제 CMD 확인 필요. **PC SQLite 원본 저장·D1·Worker 공개 API·UI 추가는 모두 NOT_RUN**. 이후에도 동일 지정 브랜치에서 단계별로 연결한다.

## 12. Census QFR 원본 ZIP 버전별 불변 원장 R2 (2026-10-27)

- R1에서 확인한 Census QFR 원본 `QFR-mf.csv`를 다시 설계하거나 새 산식을 추가하지 않고, **공식 ZIP 원문 바이트를 그대로 보존**하는 PC 원장 연결 코드를 추가했다. 저장 시 ZIP 전체 base64와 ZIP SHA-256, 5분기 원시 매출·세후이익 및 자체 파생 이익률을 기존 `api_history_chunks_v1`에 담는다.
- 기존 원장 테이블 2개 재사용, 전용 키 `provider=CENSUS` / `dataset=QFR_MFG_US_NSA_AFTER_TAX_MARGIN`, 계약 `EARNINGS_CENSUS_QFR_MFG_RAW_ZIP_V1`. BLS/BEA·타 네임스페이스 불변. 트리거·PK·열 형식 및 기존 동일 키의 해시/참조를 읽기 전용 확인한다.
- 원본 ZIP의 동일 바이트 재수신 시 수집시각 변경과 관계없이 **중복 삽입 0건**. ZIP 바이트 변경 시 새 source SHA·청크·스냅샷으로 **append-only 개정 보존**. 동일 소스의 원래 5분기 계산값과 ZIP의 검증 관계를 다시 검사한다. retrieval date를 발표일이나 최초 경제적 이용 가능일로 위조하지 않는다.
- `scripts/pc-writer/EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs`는 기본 `--dry-run` 읽기 전용이며, `EARNINGS_CENSUS_QFR_R2_STORAGE_PREFLIGHT.cmd`도 읽기 전용이다. 실제 PC SQLite append는 **별도 명시적 사용자 승인 후**에만 `--apply --confirm-census-qfr-sqlite-append`라는 고정 플래그가 필요하다. 두 INSERT와 재조회는 단일 트랜잭션/오류 시 rollback.
- 메모리 SQLite synthetic **R2 6건** 및 R1 파서 **5건** 검증. 실제 PC `core.sqlite` 접근, live Census R2 재수집, D1 게시, Worker 신규 GET, 사이트 표시, 자동 갱신은 여전히 **NOT_RUN**. 어느 단계도 자동 성공으로 격상하지 않는다.
- 설계·실행 Gate 전문은 [QFR 원본 SQLite 보존 R2](EARNINGS_CENSUS_QFR_RAW_SQLITE_R2_20261027.md)에 있다. 이후 순서는 **PC 읽기 전용 preflight 증빙 → 승인된 append/readback → 별도 D1 체크포인트 설계/승인 → 공개 GET/UI 검증**. 최종 목표는 E1-R4 점수 개조가 아닌 **신뢰할 수 있는 실적 침체 참고 지표의 지속적 추가**다.

## 13. Census QFR R2 실제 PC 프리플라이트 PASS 및 승인된 원본 저장 1회 CMD (2026-10-27)

- PC 결과 증빙 `EARNINGS_CENSUS_QFR_R2_STORE_RESULT_20261027T141637Z.txt`: `MODE=READ_ONLY_PREFLIGHT`, `RESULT=PASS_QFR_STORAGE_PREFLIGHT_NO_WRITE`, 기존 CENSUS snapshot/chunk **0/0**, ZIP **1,746,726바이트**, SHA-256 `232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654`, 2026-Q2 **15.599418144173285%**. 스키마·직접 HTTP·산식 **실제 PC 프리플라이트 검증 성공**. 데이터 저장이나 웹 게시 성공은 아님.
- 사용자 승인에 따라 `EARNINGS_CENSUS_QFR_R2_SQLITE_APPLY_ONCE.cmd`를 **같은 지정 브랜치에만** 추가. 승인 당시 원본 SHA의 정확한 일치를 요구하며, 변경된 ZIP은 쓰기 전 `QFR_SOURCE_CHANGED_SINCE_PREFLIGHT_NO_WRITE`로 거절한다. `--apply --confirm-census-qfr-sqlite-append --expected-source-sha256 <승인된 SHA>`가 있어야만 기록 가능한 구조다. 고정된 SHA는 **이번 단발성 승인용**으로, 다음 분기에는 새 검증·새 승인 값 필요.
- 원본 저장 후 CMD 옆에 생성되는 `EARNINGS_CENSUS_QFR_R2_STORE_RESULT_*.txt`를 실제로 읽기 전까지 `PC_SQLITE_APPEND=NOT_RUN`으로 둔다. 승인된 수정 범위는 CENSUS 전용 기존 원장 2개 테이블에 **append-only 원문 ZIP 1종**이며 기존 E1-R4 산식·BLS·D1·Production 배포를 변경하지 않는다.

## 14. Census QFR APPLY 압축 누락 사고 및 독립 실행 패키지 수정 (2026-10-27)

- 사용자 스크린샷에서 `ERR_MODULE_NOT_FOUND`, 누락 파일 `EARNINGS_CENSUS_QFR_R1_READONLY.mjs`, 실행 폴더 `C:\Users\...\Desktop\EARNINGS_CENSUS_QFR_R2_SQLITE_APPLY_ONCE_20261027` 확인. 최초 전달한 최소 패키지는 R2 저장기가 import하는 R1 파서를 포함하지 않았다. **Node 모듈 해석 단계에서 실패**한 것이므로 SQLite 기록·D1·점수 변경 0건. 스크린샷만으로 성공/실패 저장 로그를 추정하지 않는다.
- 새 **완전한 독립 실행 압축**에는 R1 읽기 전용 파서 `.mjs`, R2 저장기 `.mjs`, `EARNINGS_CENSUS_QFR_R2_SQLITE_APPLY_ONCE.cmd`, R2 기준서까지 **평면 디렉터리 구조로 4개 파일**을 동봉한다. 원래 기존 PC 스크립트 폴더에 있던 R1 파서를 가정하지 않는다. 사용자도 바탕화면 신규 폴더에서 실행 가능해야 한다.
- APPLY CMD에서 `.mjs` 두 파일을 먼저 검사한다. 누락 시 Node를 호출하지 않고 `EARNINGS_CENSUS_QFR_R2_STORE_RESULT_SETUP_*.txt`에 고정 오류 코드·`SQLITE_COMMITTED=NO`를 남기고 종료한다. ZIP 압축 무결성도 별도 확인한 뒤 배포한다.
- **기존 SHA 검증 게이트·기존 DB 스키마·원장 보존 제약은 그대로 유지**. 사용자 PC 재실행의 실제 `PASS_QFR_SQLITE_APPEND_READBACK` 증거 전에는 `PC_SQLITE_APPEND=NOT_RUN`이다. 잘못된 패키지는 재사용하지 않는다.

## 15. Census QFR 실제 PC SQLite 저장 PASS → 저장 자료만 읽는 R3 (2026-10-27)

- 사용자 전달 `EARNINGS_CENSUS_QFR_R2_STORE_RESULT_20261027T145211Z.txt`로 첫 실제 PC CENSUS 원장 기록이 확정됐다. 승인 ZIP SHA `232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654` 일치, `CHUNKS_INSERTED=1`, `SNAPSHOTS_INSERTED=1`, `SQLITE_COMMITTED=YES`, `RAW_ZIP_ARCHIVED_IN_EXISTING_SQLITE=YES`, `RESULT=PASS_QFR_SQLITE_APPEND_READBACK`. 이번 단계는 **PC_SQLITE_APPEND=PASS**, D1/Score/Web 변경 0건.
- 위 §13~14와 R2 기준서의 옛 `NOT_RUN` 문구는 **해당 PC 로그가 오기 전의 역사적 상태**다. 최신 근거는 이 §15 및 [R3 저장자료 검산 계약](EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_20261027.md)을 우선한다. R2 쓰기 CMD 재실행·공식 Census ZIP 재요청은 불필요하다.
- 다음에는 `EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY.mjs`와 전용 CMD를 사용해 **이미 저장된 원문 ZIP만** 읽어 현재/직전 분기의 자체 파생 세후이익률 및 `%p` 변화폭을 재계산한다. 기존 R2 `checkQfrSchema`를 재사용하고, 별도 실제 PC에서 생성된 `EARNINGS_CENSUS_QFR_R3_STORED_RESULT_*.txt` 증거 전까지 `PC_STORED_CALC=NOT_RUN`이다.
- R3는 D1 키·Worker reader·웹 UI·자동 스케줄과 분리된 로컬 preview다. 독립 CENSUS QFR 원천 1종에서 정보성 행 1개를 도출할 뿐 기존 4개 E1-R4 점수에는 편입하지 않는다. 이후 R3 실측 PASS → 별도 정보성 키/체크포인트 제안·승인 → D1 저장/readback → GET/UI/정규 갱신 순이다.

## 16. Census QFR R3 실제 PC PASS 및 R4 별도 정보성 공개 계약 초안 (2026-10-28)

- **R3 실제 PC 결과 확보**: 사용자 제공 `EARNINGS_CENSUS_QFR_R3_STORED_RESULT_20261027T150635Z.txt`, `RESULT=PASS_QFR_STORED_READONLY_PREVIEW`, 이전 R2 ZIP SHA 일치, snapshot 1건 확인, 2026-Q2 **15.599418144173285%** / 2026-Q1 **14.03708175763798%** / 분기 변화 **+1.5623363865353053%p**. 외부 API 호출/SQLite 쓰기/D1 쓰기/점수 변경/배포 모두 0건. `PC_SQLITE=PASS`, `PC_STORED_CALC=PASS`.
- 위 §15의 `PC_STORED_CALC=NOT_RUN`은 당시의 상태다. 최신 R3 실제 증거를 받았으므로 완료로 갱신한다. **재수집·R2 재저장·R3 반복 검산은 불필요**하다.
- 이어서 작성한 `EARNINGS_CENSUS_QFR_R4_PROJECTION_DRAFT_READONLY.mjs`는 R3 검증 결과를 받아 원시 5개 분기/단위/변화폭·시각·출처를 다시 검사해 하나의 QFR 정보행과 독립 source checkpoint를 **메모리에서만** 생성한다. D1 연결·원격 게시·Worker Route는 없다.
- 기존 공개 C 기본 키와 서비스 키는 모두 BLS 전용 계약을 유지한다. Census를 그 5/7행 validator에 직접 합산하면 `provider=BLS`, `adjustment=SA`, 비용 범주 검사 등에 위배된다. **제안만 한 별도 QFR 키** `detail:earnings-recession-indicators:census-qfr-mfg-margin:v1`, 형식 `earnings-companion-c-qfr-r1-v1`는 사용자 승인 전 D1에 등록/쓰기/배포하지 않는다.
- 후속 [R4 설계·Gate](EARNINGS_CENSUS_QFR_R4_PROJECTION_DRAFT_20261028.md): 사용자 승인 → 별도 안전 writer 및 D1 exact readback → 별도 저장 전용 공개 응답과 사이트 정보행 → 정규 자동 갱신. 기존 E1-R4 점수·산식/추세, 별도 12대 기업실적은 건드리지 않는다.

## 17. Census QFR 전용 D1 계약 승인과 수동 게시기 구현 (2026-10-28)

- §16의 독립 QFR 키 `detail:earnings-recession-indicators:census-qfr-mfg-margin:v1`와 스키마 `earnings-companion-c-qfr-r1-v1`는 **사용자 승인**을 받았다. 앞 절의 '미승인'은 당시 상태이며 D1 등록·실게시 완료를 뜻하지 않는다.
- 새 `worker/earnings-companion-c-qfr-r1.mjs`는 QFR 단일 정보행의 정확한 스키마·이력·원본 시각·출처·비계절조정·빈티지 미확정 상태를 검증한다. D1 저장 시 **이전 체크포인트 역행 방지, 동일 버전의 내용 충돌 차단, 실제 D1 본문·저장 시각 재조회**를 요구한다. 기존 BLS 기본/서비스 C 키, BEA 공개 키 및 E1-R4 점수는 건드리지 않는다.
- `scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs` 및 두 전용 CMD(`..._PREFLIGHT.cmd`, `..._APPLY.cmd`)는 이미 승인·보존된 PC SQLite 원본을 다시 읽고 R3/R4 검산을 거친다. 기존 `EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs`의 clean main 게시 checkout + 별도 PC 운영 checkout + `config.source` SHA 검사 재사용, 새 파일 Git 추적검사 추가. 바탕화면 단독 CMD로 이 승인 경로를 우회할 수 없다.
- `--dry-run`에는 원격 D1 호출이 없다. 실제 쓰기는 clean main 병합·게시 소스 승인 뒤 `--apply --confirm-census-qfr-d1-write`와 CMD 사용자 `APPLY` 입력이 있어야 실행된다. TXT는 파일 옆에 `EARNINGS_CENSUS_QFR_R4_D1_RESULT_*.txt`로 기록한다.
- 신규 Worker 6건 + 신규 게시기 연결 3건 + 기존 QFR R4 5건, R3 6건, R2 8건, 총 **28건** 로컬 회귀검사 PASS. **상태:** `CODE=PASS`, `PC_SQLITE=PASS`, `PC_STORED_CALC=PASS`, `PC_D1_PREFLIGHT=NOT_RUN`, `D1_ACTUAL_WRITE/READBACK=NOT_RUN`, `PUBLIC_GET=NOT_RUN`, `SITE_DEPLOY=NOT_RUN`, `AUTOMATION=NOT_RUN`. 별도 `main` 병합·Production 배포 없음.
- 전체 계약 및 이후 진행 Gate는 [Census QFR R4 기준서](EARNINGS_CENSUS_QFR_R4_PROJECTION_DRAFT_20261028.md) 기준으로 이어간다.

## 18. Census QFR 15개 파일의 main 선택적 반영 (2026-10-28)

- `main`과 지정 브랜치의 이력이 큰 폭으로 갈라진 상태(`main` 기준 ahead 162, behind 40)여서 전체 브랜치 merge/PR을 실행하지 않았다. 기존 main D1 운영 모듈은 같은 SHA이며 QFR 핵심 런타임·CMD·테스트 14개와 문서 1개만 `main`에 없음을 확인했다.
- **사용자가 해당 15개 파일만 선택적 반영 승인**했고, 기준 `main=67c0621bb4ac02963cc847ec28af506885485b04`에서 승인된 15개 blob만 추가해 신규 `main=2f3f07fcc2b9130e4789b31381cc789947a69ba7`로 원자적 fast-forward를 완료했다.
- 비교 검증 결과 **15개 전부 ADDED**, 다른 파일 변경/삭제 0건, 지정 작업 브랜치 내용 무변경. 기존 BLS Worker / E1-R4 점수 / PC config / Cron / D1 키 / DNS 무수정.
- 이 커밋의 GitHub Actions `Node.js CI`는 Build PASS 이후 **전체 실행이 취소**되어 전체 CI 성공 증거가 아니다. 후속 다른 작업자의 `main` 커밋 3개가 앞에 추가됐지만 QFR 커밋은 그 조상으로 보존돼 있다.
- 본선에 파일이 존재한다는 사실만으로 PC D1 게이트나 실제 D1 write/GET/UI가 완료된 것은 아니다. 다음 순서: PC의 clean main 게시 소스·별도 승인 운영 체크아웃 준비 → QFR D1 PREFLIGHT 실제 PC TXT 확인 → 명시 승인 후 D1 APPLY exact readback → 별도 공개 GET·UI 및 자동 갱신 검증.
- 원본 파일/blob SHA, 기존 main 보존과 사후 비교 근거는 [Census QFR R5 선별 회수 기록](EARNINGS_CENSUS_QFR_R5_SELECTIVE_MAIN_RECOVERY_20261028.md)에 기록했다.
