# ZGMINI 실적 침체 분석 지표 — API↔사이트 작업 노하우·인수인계 R1

- 작성일: 2026-10-27 (KST)
- 저장소: `ansqhd5774-Choi/zgmini`
- **유일한 후속 작업 브랜치:** `codex/api-site-integration-r1-20261026`
- **기본 목표:** API와 사이트 지표를 **연결하고, 새로운 유효 지표를 추가하며, 정확성·갱신·안정성을 지속 보완**한다.
- 이 문서는 **작업 과정에서 실제로 확인된 재사용 가능한 지식과 남은 미검증 경계**를 보존한다. 과거 작업 브랜치와 당시 문서 머리말은 역사적 출처이지 향후 작업 지시가 아니다.
- 계획: `docs/EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md`
- 병합·이탈 감사: `docs/EARNINGS_API_SITE_BRANCH_ALIGNMENT_AUDIT_R1_20261027.md`
- 이 문서는 **문서화된 증거**로 현재 구현 상태를 표현하며, 새 API 호출·PC 실행·D1 쓰기·Production 배포를 완료했다고 선언하지 않는다.

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
| BLS 원자료 | 공인 시리즈 `WPSFD4` 21건, `WPSFD41` 21건, `PRS85006111` 6건. PC 수동 호출 1회, snapshot/chunk 각 3건, 원장 readback 3/3, 트랜잭션 COMMIT 증거 | 다음 자동 실행, 원격 D1 게시, Production 최신 반영 |
| BLS 파생 | PC 저장 원본으로 정보성 **5행** 로컬 미리보기 검증(READY 5/5), SHA/cohort 검증 | 5개 **독립** 원천 아님. 2개 PPI 계열의 index와 YoY는 각각 같은 원천 |
| BEA 법인이익 | 화면용 S6 연결 코드/데이터 읽기 경로 존재 | 그 코드 존재만으로 실제 최신 API/화면 READY·주기 갱신 PASS 아님 |
| BEA 비금융 단위이익 | PC read-only preflight `PASS_BEA_UNIT_PREFLIGHT_ONLY`; 최신 0.250, 직전 0.231(달러/실질 GVA 단위), 당시 `D1_WRITES=0`, `SQLITE_WRITES=0` | D1 게시, 원격 readback, 실제 브라우저 최신 값 확정 아님 |
| Worker/D1 C 코드 | 저장 전용 writer 및 GET/HEAD 읽기 전용 경로 구현, 오프라인 단위검사 근거 | 현행 원격 D1 READ/WRITE 확인·exact 배포·다음 정규 실행은 별도 증거 필요 |
| 사이트 | 기존 점수 4행과 BLS 5행, BEA 참고 2행을 **같은 테이블 계열**에 출력하는 구현 존재 | 화면 11행 구성 = 원본 11종/11행 READY 증거가 아니다. 계획상 C 별도 영역·동적 registry와 설계 차이 존재 |
| Census/SEC | 공식 후보 및 권리/기술 조사 항목이 계획에 있다 | QFR/M3/MTIS/SEC의 원하는 지표별 실 API 수치·저장·게시를 일괄 PASS로 선언 금지 |

근거 문서:
- BLS 원장 저장: `docs/EARNINGS_COMPANION_R3C_BLS_MANUAL_STORE_IMPLEMENTATION_20261027.md`
- BLS 계산 원칙: `docs/EARNINGS_COMPANION_R3D_STORED_DATA_CALCULATION_CONTRACT_20261027.md`
- BLS 실측 검증: `docs/EARNINGS_COMPANION_R4_PC_RESULT_VERIFIED_20261027.md`
- 정보성 C D1 코드·신선도: `docs/EARNINGS_COMPANION_R4_D1_PUBLIC_READ_MODEL_PHASE2_20261027.md`
- 복구·미진행 Gate: `docs/EARNINGS_API_SITE_BRANCH_ALIGNMENT_AUDIT_R1_20261027.md`

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
| UI | `app/earnings-recession/earnings-risk-only-panel.tsx` | `costIndicators` 5행 **하드코딩** 존재. C를 제한 없이 확대하려면 검증된 registry/응답 `rows[]` 기준 렌더링 고도화가 필요 |
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
