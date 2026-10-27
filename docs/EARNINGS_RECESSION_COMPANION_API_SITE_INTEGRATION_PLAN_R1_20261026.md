# ZGMINI 실적 침체 분석 지표 — 공공 API ↔ 사이트 연결 계획 R1

- 작성일: 2026-10-26 (KST)
- 상태: **PLAN_ONLY / 구현·수집·배포 미실행**
- 저장소: `ansqhd5774-Choi/zgmini`
- 작업 브랜치: `codex/earnings-api-site-integration-plan-r1-20261026`
- 계획 기준 `main` SHA: `972a5da9deae1a4a2f12b042f66e3bdfd72ef977`
- 대상 공개 화면: `https://zgmini.kr/earnings-recession/`
- 승인 필요 단계: 새 저장 키·공개 응답 계약·UI 변경의 최종 반영 및 Production 병합
- 목표: **권리 검증된 API 데이터**로 실적 침체 분석 지표를 필요한 만큼 확장하되, 기존 점수 산식과 공개 이력을 유지한다.

## 0. 절대 변경 금지 / 설계 경계

1. 이미 운영 중인 **8대 위험 지표 '미국 실적 침체 방어' E1-R4 점수**의 4개 구성요소, 가중치, 정규화, 결측 정책, 과거 점수, 공식 계산과 `/api/earnings-recession-detail` 응답 계약을 임의로 변경하지 않는다.
2. `/economic-indicators/earnings/`의 **12대 기업 실적 도메인**, 별도 E1-R5 **승인된 Shadow 연구**와 혼합하지 않는다. `docs/EARNINGS_E1_R5_FORWARD_R2.md` 및 Readiness R3 기준으로 R5는 Production 활성화 대상이 아니다.
3. **화면의 분석 지표 행 수를 4개·12개·20개 등으로 고정하지 않는다.** 단지 현재 점수 산식의 위험요소 4개가 존재할 뿐이다.
4. 데이터 공급 실패나 미발표/미수집 상태를 0, 중립값, 미래 예측, 가공된 관측일로 대체하지 않는다. 원자료 값, 공개용 파생 수치, 점수는 구분한다.
5. 기존 **PC SQLite 원자료 → 저장 자료만 계산 → 승인된 결과 게시 → Cloudflare D1 읽기 → 사이트** 흐름을 따른다. 공개 페이지의 GET에서 외부 API 호출/계산/쓰기 금지.
6. **무단 변경 금지:** 운영 산식, PC SQLite/D1 테이블·키 계약, 스케줄러, 기존 D1/Queue/Cloudflare Cron, TTL, 설정값, 배포체계, DNS. 새 공개 결과 키·검증 스키마는 설계상 제안일 뿐 별도 승인 전 적용 금지.
7. API 요금, 호출 할당량, 상업적 재이용, 파생 공개, 원자료 저장 권한에 하나라도 미확인이 있으면 **HOLD**. 승인 없는 결제/유료 서비스 사용 금지.
8. Production은 `main → Cloudflare Git Integration → Build → exact Deployment → 공개 HTTPS 검증`만 사용한다. 계획 브랜치에 저장하는 것은 **배포가 아니다**.

## 1. 현재 저장소에서 확인한 연결 경로

| 위치 | 현재 확인된 의미 | 향후 작업 시 원칙 |
|---|---|---|
| `app/earnings-recession/earnings-risk-only-panel.tsx` | `ids = [epsGrowth, margin, revenueGrowth, earningsGrowthBreadth]` 네 가지 위험 점수 구성요소를 고정 출력; 제목은 '실적 침체 분석 지표' | 네 요소의 점수 계약은 보존. 별도 확장형 분석 목록 UI를 설계 |
| `/api/earnings-recession-detail` | `PUBLIC_PROJECTION_KEYS.earningsRecession`을 통한 저장 Projection의 읽기 전용 공개 응답 | 기존 점수·히스토리 응답을 덮어쓰지 않음 |
| `worker/market-public-projection-store.mjs` | `detail:earnings-recession:v1`이 등록된 허용 키 | 신규 지표 데이터를 기존 키에 무단 주입하지 않음 |
| `worker/projection-runtime-r52.mjs` | GET/HEAD가 기존 D1 공개 Snapshot만 읽고 stale/status를 검증 | 신규 리더도 read-only 및 stale/출처 검증 |
| `worker/public-feed-store.mjs` | 별도 허용 목록·입출력 검증을 갖춘 D1 공개 feed 테이블 | 허용 키/검증 없이 임의 저장 금지 |
| `docs/PC_WRITER_R2.md` | PC 수집·SQLite 저장·저장 데이터 계산·결과 게시·readback의 운영 계약 | 이 계약에 부합하도록 별도 수집/변환 Stage 제안 |
| `docs/EARNINGS_E1_R5_FORWARD_R2.md` | E1-R5 forward는 Shadow-only; R4 Production 유지 | Shadow 데이터를 공개 확정 산식처럼 표시하지 않음 |
| `app/data-sources/page.tsx` | 데이터 출처·관측일·가공/점수 차이를 설명하는 공개 페이지 | 출처 고지 위치를 신규 UI와 연동 검토 |

**중요한 설계 구분:**
- A = 현재 승인 **위험 진단 점수의 4개 입력**.
- B = 현재 별도 **12대 기업 실적 도메인**.
- C = 이번 대상인 **정보 제공용 실적 침체 분석 지표 목록(개수 제한 없음)**.
- C는 A·B의 산식 입력으로 편입되지 않으며, 동일 수치가 이미 있으면 중복 수집하지 않는다.

## 2. 공개 사용권을 확인한 공급자와 지표 후보

다음은 *공개 가능성 관점의 소스 후보*다. **정확한 API 변수/시계열, 값 수신 성공, 결산기준·수정치 여부 및 누락률은 미검증**이므로 아직 Production READY가 아니다.

| 공급자 | 사용할 수 있는 분석 지표 후보 | 권한·주의 | 공식 근거 |
|---|---|---|---|
| **BEA** | 미국 전체 기업이익 및 세후이익 증가율, 산업별 기업이익 증가율, 이익 감소 산업 비중(파생) | 별도 표시 없는 BEA 자료는 퍼블릭 도메인; 원출처 표시 | https://www.bea.gov/help/faq/147 |
| **Census QFR** | 산업별 매출 성장률, 순이익률 및 산업별 수익성 악화 폭/비율 | API 서비스 사용 허용. 파생값은 Census 공식 발표치인 것처럼 오표기하지 않음; 비보증 고지 | https://www.census.gov/data/developers/about/terms-of-service.html |
| **Census M3** | 제조업 신규주문, 출하 증가율 | 위 Census 조건 동일, 표본·계절조정 여부 구분 | https://api.census.gov/data/timeseries/eits/m3.html |
| **Census MTIS** | 재고/매출 비율 | 위 Census 조건 동일, 발표월/수정치 확인 | https://api.census.gov/data/timeseries/eits/mtis.html |
| **BLS** | 단위노동비용, 노동생산성, PPI(생산자물가) | BLS 공개 통계는 원칙상 퍼블릭 도메인; 조회일·파생 분석 책임·출처 고지 | https://www.bls.gov/opub/copyright-information.htm · https://www.bls.gov/developers/termsOfService.htm |
| **SEC EDGAR/XBRL** | 기업별 EPS/매출/마진, 영업현금흐름·잉여현금흐름, 적자 기업·악화 기업 비율(파생) | 공개 EDGAR 데이터 재이용 허용. 공시별 XBRL 항목·기간·단위·수정치·중복·User-Agent·호출제한 점검 | https://www.sec.gov/about/webmaster-frequently-asked-questions |

- 허가 확인은 위 공공기관이 직접 발표하는 **공개 통계·공시 원자료**에만 적용. 타사 로고/사진, 외부 공급사 가공본, 비공개 미시자료, 제3자 저작물이 섞인 자료는 대상에서 제외한다.
- **FRED API**는 제3자 시계열 권리가 일괄 보장되지 않으므로 본 연결용 직접 공급원에서 제외한다. 원천이 BEA/BLS/Census인 자료는 가능한 한 원천 공식 API에서 직접 받는다. https://fred.stlouisfed.org/docs/api/terms_of_use.html
- **FactSet** EPS 예상치 변경·컨센서스·서프라이즈는 자동 수집·재배포 권한을 확인하지 못했으므로 **HOLD**. https://www.factset.com/legal
- 이후 신규 공급자는 품질/무료/저장/파생/공개/상업적 이용 Gate를 모두 충족하면 개수 제한 없이 후보에 추가할 수 있다.

## 3. 단계별 실행 계획 및 완료 Gate

### R1. 기존 API·원자료 인벤토리 (READ ONLY)

- PC 운영 승인 SHA와 실제 Windows 작업/승인 config/SQLite 테이블을 읽기 전용으로 확인한다. 채팅 환경에서 PC를 직접 온라인 호출하려고 하거나 RDC 연결을 요구하지 않는다.
- BEA/BLS/SEC/Census별 기존 수집기, 로컬 저장 변수, 관측값·출처, 결산기간, 발표일, 이미 공개 중인 파생값을 매핑한다.
- 같은 지표가 운영 중이면 **중복 API 수집/저장 경로를 만들지 않는다**. E1-R5 Shadow에만 있는 자료는 Published Ready로 간주하지 않는다.
- 산출물: `indicator_id | candidate_source | existing_collector | existing_storage | latest_observed | existing_public | gap` 인벤토리.
- Gate: 경로·소재·기존 유효 Evidence 확인. 알 수 없는 곳은 `UNKNOWN`, 직접 수신/저장하지 않았으면 `NOT_TESTED`.

### R2. 실사용 API 수신·권리·시계열 검증 (공개 없음)

- **BEA**: NIPA의 정확한 기업이익 시계열/산업 내역·단위·분기·조정 전후·확정/수정치 확인.
- **Census QFR/M3/MTIS**: 공식 `variables`·`examples`·인증 요구를 확인하고 시계열별 실제 HTTP 응답/자료값 확인. QFR의 산업 범위와 SEC/S&P500 모집단을 동일시하지 않는다.
- **BLS**: `series_id`, 실제 관측치, 계절조정, 개정 내역, API v1/v2 사용 한도 확인.
- **SEC**: CompanyFacts/XBRL 실제 수신, fiscal period·가중 표본·회계정책 차이·무형자산 등의 데이터 정의를 검증한다. SEC는 느린 전수 처리 위험 때문에 보조/후순위로 시행한다.
- 소스별 `LICENSE_OX`, `API_EXISTS_OX`, `HTTP_OBSERVED_OX`, `SERIES_MATCH_OX`, `COVERAGE`, `RELEASE_LAG`, `LATEST_OBSERVATION`을 **각기 별도** 기록한다.
- Gate: 실제 수치·시계열 확인 + 권리 적합 + 서비스 이용한도 적합. 하나라도 실패하면 개별 행만 HOLD하고 전체 작업을 중단시키지 않는다.

### R3. PC 원자료 저장/가공 파이프라인 (아직 게시 없음)

- 승인된 PC 수집 위치·저장 정책 내에서 실제 API 응답을 보존하고 `provider/dataset/seriesId/observationDate/releaseDate/retrievedAt/vintage/sourceURL/unit/period/adjustment/rawValue/status/hash` 기록을 설계한다.
- 공개 분석 행은 `indicatorId/name/category/value/unit/previousValue/change/observationDate/releaseDate/nextReleaseDate/provider/seriesId/sourceURL/coverage/methodology/status`를 기본 제안하되 **기존 스키마 조사 후 최소화**한다.
- 고정 20개 배열이 아닌 지표별 정의 레지스트리로 온·오프/출처·순위·표시 가능 여부를 관리한다. 원자료/수집 조건이 만족되면 행을 유동적으로 추가한다.
- 수치 종류를 `RAW / DERIVED / SCORE`로 구분; 이번 C 목록은 RAW·DERIVED 중심이며 위험 점수에 무단 반영하지 않는다.
- 자료가 없으면 `null`과 `PENDING/STALE/PARTIAL/SOURCE_FAILED/UNAVAILABLE` 등 승인 상태를 사용한다. 0값·미발표·시차·직전 정상값을 혼동하지 않는다.
- 동일 지표 여러 공급원은 표본·계산 정의·주기·결산기간 일치 검사 없이 평균하지 않는다. 연간/분기/월 데이터를 동일 기간의 발표인 것처럼 혼합하지 않는다.
- 승인 없는 운영 SQLite 테이블/보존주기 변경, 새로운 작업 스케줄 등록, Cloudflare 원격 수집·계산 재활성화 금지.
- Gate: 원문→저장→파생 수치 lineage 추적, 재실행 결정성, 허위값 0, 기존 E1-R4 결과 불변.

### R4. 신규 **정보성 공개 read-model** 설계·승인 (게시 전 반드시 승인)

- 제안 URL: `GET /api/earnings-recession-indicators` — 기존 `/api/earnings-recession-detail` 점수 응답과 분리.
- 제안 저장: 기존 D1 공개 Snapshot 저장소의 **별도 이름공간 키**를 검토하되, 키 등록·validator/read-model 변경도 데이터 계약 변경이므로 **사용자 승인 전 생성/쓰기/배포하지 않는다**. 새 D1 테이블·마이그레이션은 원칙적으로 회피.
- PC의 승인 저장 자료로만 공개용 경량 Snapshot 생성. 원자료 전체·API 키·요청 헤더·기업별 민감 데이터는 D1/브라우저로 보내지 않는다.
- snapshot 메타: `schemaVersion`, `sourceVersion`, `sourceStoredAt`, `observedThrough`, `generatedAt`, `rows[]`, `coverage`, `status`; 조회 GET는 저장된 내용만 read-only 반환하고 stale 여부를 판정한다.
- 원격 게시에는 checkpoint/단조 증가/readback/중복 게시 방지/배포 SHA 감사 기록을 적용한다. 기존 점수 Snapshot을 재작성하지 않는다.
- Gate: 서면/채팅 승인된 최소 확장 계약 + readback 실측 + 기존 점수·차트·원장 무변화.

### R5. `/earnings-recession/` UI 연결 (사용자 디자인 확인 후)

- 상단 **기존 8대 위험 실적 침체 점수·1년 차트·4개 점수 구성요소**는 별도로 유지한다.
- 하단의 `실적 침체 분석 지표`는 **API 기반의 개수 제한 없는 정보성 목록**으로 분리한다. 기존 네 요소가 전체 분석 지표 개수의 상한인 것처럼 표현하는 문구를 없앤다.
- 정보성 목록은 지표별 자료 날짜/현재·이전/단위/방향/출처/갱신 상태/미니차트를 실제 값이 있는 항목에만 표시한다. 없는 값은 `—`; 결측 차트를 임의로 잇지 않는다.
- 모바일·PC 기존 반응형 룰/접근성/정렬/행 확장/상태 배지와 즐겨찾기 영향은 사용자 UI 확인 후 설계한다. 신규 API가 실패해도 기존 8대 위험 점수 패널은 정상 유지.
- `/data-sources/`에 BEA/BLS/Census/SEC 출처, Census 비공식 서비스 고지, BLS 파생 분석 주의, ZGMINI 자체 계산 표기를 정확히 연결한다.
- Gate: 390/768/1440/1920 화면에서 실제 항목 수 자동 반영·출처·날짜·오류 상태 PASS, 기존 점수/12대 기업실적 혼동 없음.

### R6. 검증·PR·운영 반영 (현재 단계에서는 수행 금지)

1. 단위 검증: 지표 정합성, 소스/분기·개정본 매핑, 결측·0·중복·향후 시각 차단, 원자료 참조, 권한 고지, 라이선스 회귀.
2. 통합 검증: PC 실제 API GET → 원자료 SQLite → 오프라인 파생 생성 → 게시 승인 Snapshot → D1 readback → Public GET → UI. 각 단계 PASS를 별개로 기록.
3. 부정 시나리오: API 429/403/500, QFR 키 없음, SEC 부분 기업, 늦은 발표, 소스 revision, D1 장애, stale 데이터, 분기 불일치. 실패 시 기존 정상값 최신으로 위장하지 않음.
4. 기존 E1-R4 점수, 원본 이력, 별도 12대 기업 실적, 기존 `/api/earnings-recession-detail` payload/TTL/period/차트 회귀 비교. 차이가 있으면 병합 보류.
5. 구현 브랜치 PR과 사용자 승인 후에만 최신 main source-drift 검사 → Cloudflare Git Integration → Build → exact Deployment → 실제 HTTPS API/UI 검증.
6. 운영 다음 정규 PC 실행/실제 자료 새 발표 후 자동 갱신 여부를 별도로 확인. 한 번 수동으로 화면에 나온 것을 자동 운영 PASS라고 판정하지 않음.

## 4. 실행 우선순위 및 근거

| 순서 | 대상 | 선택 이유 | 시작 전 확인 |
|---:|---|---|---|
| 1 | 기존 수집·저장 재사용 (BEA/BLS/SEC 등) | 새 API 비용·중복 작업 최소화 | 실제 운영 경로/관측치 |
| 2 | BEA 기업이익 및 산업별 수익 | 실적 침체 직접성 높음 | 실 series/table 매핑 |
| 3 | Census QFR 매출·순이익률 | 이익·수익성 크로스체크 | 실제 산업별 필드/키/표본 |
| 4 | BLS 비용·생산성·PPI | 이익률 압박의 보조 설명 | 특정 시계열/조정 |
| 5 | Census M3/MTIS 신규주문·재고 | 기업실적의 선행/후행 보조 | 재고/매출 정의·자료시차 |
| 6 | SEC XBRL 분포·현금흐름 | 개별 기업 커버리지·정합성 부담 큼 | 종목 누락률·재무 비교 가능성 |

실제 행 수나 우선순위는 데이터 품질에 따라 가변이고, A·B·C의 점수 산식 재평가 여부는 이 계획 범위 밖이다.

## 5. 다음 차수에 제출할 증거 양식

| indicator_id | Provider | 공식 재사용권 O/X | API 목록 존재 O/X | 실제 HTTP 데이터 O/X/미실행 | 해당 지표 값 O/X | 공개용 유효 관측일 | PC 원자료 중복 확인 | 상태 |
|---|---|---|---|---|---|---|---|---|
| (R1 인벤토리부터 생성) | | | | | | | | |

- **O는 실제 근거를 제시한 경우에만** 기록. 권리 확인 ≠ 데이터 수신 성공 ≠ PC 저장 성공 ≠ D1 게시 성공 ≠ Production 배포 성공.
- CMD 검사기가 필요한 단계에서는 사용자 Windows **CMD 전용**, 실행 파일과 동일한 위치의 TXT 로그를 기본 출력으로 설계하되, 승인 없이 설치나 새 스케줄 등록은 하지 않는다.

## 6. 이번 작업의 범위와 명시적 미실행

**이번에는 계획 문서만 GitHub 작업 브랜치에 저장한다.** API 실제 수집, 로컬 저장·산식·D1·스케줄러·Cloudflare·사이트 UI 편집, PR 병합, Production 배포는 실행하지 않았다.

운영 구현에 들어가기 전 R1 인벤토리와 R2 실제 API/권리 게이트의 증거를 제출하고, 신규 D1 공개 키·read-model 계약과 UI 배치 안을 사용자에게 승인받는다.
