# 실적 침체 — Census QFR 제조업 이익률 별도 D1 투영 R4 초안 (미게시)

- 기준일: 2026-10-28 KST
- 저장소: `ansqhd5774-Choi/zgmini`
- **유일한 작업 브랜치**: `codex/api-site-integration-r1-20261026`
- 상태: **2026-10-28 사용자가 독립 D1 키·스키마 설계를 승인하여 수동 게시기 코드·로컬 검증까지 진행**, 실제 PC D1 쓰기/키 등록/Worker 공개 GET/UI/자동 게시 `NOT_RUN`.
- 기존 점수 **E1-R4**, 기존 BLS C 기본 5행/서비스 2행, BEA 데이터/키 및 과거 공개 이력 **변경 금지**.

## 통과 증거 및 데이터 성격

1. Census QFR 공식 ZIP R2 실제 PC SQLite append/readback 통과: `EARNINGS_CENSUS_QFR_R2_STORE_RESULT_20261027T145211Z.txt`.
2. 같은 원본의 R3 실제 PC 저장자료 전용 검산 통과: `EARNINGS_CENSUS_QFR_R3_STORED_RESULT_20261027T150635Z.txt`.
3. 2026-Q2 제조업 비계절조정 세후이익률: `370082/2372409×100 = 15.599418144173285%`. 직전 2026-Q1은 `287262/2046451×100 = 14.03708175763798%`, 전기 대비 `+1.5623363865353053%p`. Census의 제조업 **단일 원천 1종**으로 파생한 **정보성 행 1개**, 별도 점수나 Census 자체 발표 마진이 아님.
4. Census 2026년 2분기 계절조정 발표문의 매출·이익과 이 QFR ZIP **비계절조정** 집계를 혼용하지 않는다. 공식 발표일은 현 저장 원문에서 PIT 증거로 제공되지 않아 `releaseDate=null`로 둔다.

## 승인된 공개 계약 — D1 실제 저장·등록은 별도 미실행

| 요소 | **승인된 값** | 원칙 |
| --- | --- | --- |
| D1 별도 키 | `detail:earnings-recession-indicators:census-qfr-mfg-margin:v1` | 기존 BLS 기본 `detail:earnings-recession-indicators:v1` 및 WPSFD42 서비스 키 무수정 |
| 새 형식 | `earnings-companion-c-qfr-r1-v1` | 기존 BLS 전용 `earnings-companion-c-r4-v1` validator에 Census 행을 억지로 섞지 않음 |
| 지표 ID | `census_qfr_manufacturing_after_tax_margin_nsa` | 범주 `PROFITABILITY`, `DERIVED`, 단위 `%`·변화 `%p`, 주기 `QUARTERLY`, 비계절조정 `NSA` |
| 원천 버전 | PC R3 검증 snapshot SHA (`0cf9d0e4...`는 **당시 관측된 값**, 하드코딩 금지) | 관측/수정본별 불변 식별자. ZIP SHA도 payload에 별도 표시 |
| 원본 체크포인트 | PC 청크 `first_seen_at` Unix ms (`1793112733108`은 증거값, 상수 아님) | 실제 원본 최초 기록 시각을 새 버전으로 속여 재게시 금지 |
| 이력 | 저장된 분기 5개 `[period,value]` | 원시 ZIP 전체 및 불필요한 대용량 내용은 D1에 게시하지 않음 |
| 발표/빈티지 | `releaseDate=null`, `officialVintageId=null`, `CURRENT_RETRIEVAL_NOT_PIT` | 확인 없는 일시·발표 당시 PIT 시계열 생성 금지 |
| 공개 연결 | 승인 후 별도 저장 전용 reader/Worker 계약 검증과 사이트 정보성 등록기 연결 | 현재 BLS GET의 `rows[]` 스키마 및 기존 점수 응답 불변. 기존 UI 디자인은 사용자 승인 후 적용 |

## 현재 개발 코드

`scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_PROJECTION_DRAFT_READONLY.mjs`의 `draftQfrPayload(preview,{generatedAt})`는 R3 **검증 완료 형태**를 유일한 입력으로 받는 **순수 함수**다. 버전/직전값/분기 연속성/원시 분자·분모·파생 이익률/출처/저장 시각을 검사하고, 제안 key + payload + checkpoint + SHA를 반환한다. D1 API/SQLite/네트워크 접근·파일 기록이 전혀 없다. `approvedForD1Write=false`, `workerRegistered=false`, `siteDeployed=false`를 명시한다.

### 2026-10-28 승인 이후 구현: 수동 D1 쓰기 및 정확한 재조회

사용자는 위 **독립 D1 키, 스키마, 원본 sourceStoredAt 체크포인트**에 동의했다. 이에 따라 다음 코드만 지정 브랜치에 추가했다.

- `worker/earnings-companion-c-qfr-r1.mjs`: 독립 Census QFR 1행 전용 엄격한 본문 검증, 계절조정/원천/단위/5분기 이력 검사, 재수집 시각과 원본 기록 시각 분리, 165일 운영 신선도, 기존 체크포인트보다 이전 버전 거부, 동일 체크포인트 다른 버전/내용 거부, D1 저장 후 **본문 전체와 stored_at 일치 재조회**. 기존 BLS C 키/서비스 키에 접근하지 않는다.
- `scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs`: R2에 보존된 PC SQLite 원본을 R3으로 재검산한 뒤 R4 순수 투영·Worker validator를 통과시켜 Census 전용 저장기로 전달한다. 실제 수집 HTTP·PC 원장 추가 저장·점수 변경 없음. 기본 `--dry-run`은 D1 원격 접근 0건이며, `--apply --confirm-census-qfr-d1-write`를 명시해야만 수동 D1 쓰기 가능.
- `EARNINGS_CENSUS_QFR_R4_D1_PREFLIGHT.cmd` / `EARNINGS_CENSUS_QFR_R4_D1_APPLY.cmd`는 PC의 `scripts/pc-writer`에 설치하여 사용한다. 결과 TXT `EARNINGS_CENSUS_QFR_R4_D1_RESULT_*.txt`를 같은 폴더에 남긴다. APPLY CMD는 사용자가 추가로 `APPLY`를 직접 입력해야 진행한다.
- 게시기는 기존 `inspectD1Source({publisher:true})`와 `validateD1DualSource`를 **그대로 재사용**한다. 즉 **GitHub에서 승인된 변경을 main에 반영한 뒤**, `origin/main` SHA와 일치하는 **clean main 게시 checkout** 및 `config.source`와 SHA가 일치하는 **별도의 clean PC 운영 checkout**이 필수다. 새로운 CMD를 바탕화면에 따로 압축 해제해 실행하거나 브랜치 파일을 직접 복사한 상태는 D1 게시 권한이 아니다. 필수 신규 소스·CMD 파일도 Git 추적 여부를 추가로 검사한다. 어느 게이트든 실패하면 D1 원격 접근 전에 중단된다.
- 같은 원본 재실행은 `ALREADY_STORED`로 쓰기 0건이고, 새로운 원본은 R2 불변 원장에 새 ZIP 버전이 검증 저장돼야만 `sourceVersion/sourceStoredAt` 변경이 가능하다. 임의 타임스탬프 증가·강제 upsert 금지.
- 로컬 테스트는 신규 Worker 6건, 신규 게시기 연결 3건 및 기존 QFR R4 5건/R3 6건/R2 8건 등 **28건**이다. 결과는 **코드 테스트**이지 PC 게시 또는 실 D1 재조회 성공의 증빙이 아니다.

**미실행 현황:** `PC_QFR_SQLITE=PASS`, `PC_QFR_R3=PASS`, `D1_PREFLIGHT_PC=NOT_RUN`, `D1_APPLY=NOT_RUN`, `D1_EXACT_READBACK_REAL=NOT_RUN`, `PUBLIC_GET=NOT_RUN`, `SITE_UI=NOT_RUN`, `AUTO_UPDATE=NOT_RUN`. 기존 공개 C/BLS/BEA 데이터와 E1-R4 점수는 불변.

### 다음 운영·게시 Gate

1. 현재 지정 작업 브랜치의 코드를 검토·승인한 별도 본선 병합 절차로 `main`에 반영하되 **사용자 추가 지시 없이 merge/deploy 금지**.
2. 승인된 두 Git checkout 및 PC `config.source`가 준비된 후 `EARNINGS_CENSUS_QFR_R4_D1_PREFLIGHT.cmd`의 실제 PC TXT를 보고 source gate·R3·R4 출처·신선도 PASS를 검증한다.
3. 별도 실운영 D1 쓰기 승인을 받아 `EARNINGS_CENSUS_QFR_R4_D1_APPLY.cmd` 실행 결과의 `D1_RESULT=READBACK_VERIFIED` 또는 동일 원본의 `ALREADY_STORED`와 검증된 key/sourceVersion을 확인한다. **새 D1 테이블 생성 금지**.
4. 실제 저장된 경우에만 Worker 저장 전용 read route와 사이트 QFR 한 행을 별도로 연결·검증한다. 기존 BLS 5/7행과 E1-R4 점수·BEA 공개 동작 회귀검사 및 배포 승인 선행.
5. 신규 발표 뒤 정규 PC 수집→원장 버전 보존→D1→UI 자동 갱신은 별도 검증한다. 1회 수동 저장은 자동화 PASS 아님.

출처: https://www.census.gov/econ/qfr/ · https://www.census.gov/econ/qfr/mmws/current/index.html · https://developers.cloudflare.com/d1/worker-api/prepared-statements/
