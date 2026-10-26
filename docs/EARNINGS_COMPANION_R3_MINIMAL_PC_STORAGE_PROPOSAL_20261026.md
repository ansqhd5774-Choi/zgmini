# ZGMINI 실적 침체 정보성 분석 지표(C) — R3 최소 PC 원자료·가공 설계안

- 작성: 2026-10-26 KST
- 상태: **PROPOSAL_ONLY / 사용자 승인 전 구현 금지**
- 저장소/작업 브랜치: `ansqhd5774-Choi/zgmini` / `codex/earnings-api-site-integration-plan-r1-20261026`
- 원 계획: `docs/EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md`
- 근거: `docs/EARNINGS_COMPANION_R2_CODE_MAPPING_PC_AUDIT_20261026.md` (11절)
- R3-A 사용자 PC 실측 결과: `docs/EARNINGS_COMPANION_R3A_PC_LINEAGE_REVIEW_20261027.md`
- 작업 경계: 기존 E1-R4 점수 A(4개 구성요소), 별도 12대 실적 B, 신규 정보성 C를 **분리**. C 지표 개수는 유동적이며 기존 산식/과거 이력에 영향 없음.
- 소스 확인 시점: GitHub 비교 `main...` 대비 작업 브랜치 `ahead=20/behind=3` (2026-10-26). **main과 병합/리베이스/복구를 자동 수행하지 않고**, 구현 직전 최신 source drift를 파일 단위로 재검사한다.

## 1. R2에서 실제 통과한 지표와 R3 우선순위

| 원천 | 정보성 C 행 후보 | R2 최신 기간 / 실제값·정의 | R3 행동 / 재사용 |
|---|---|---|---|
| 기존 PC Growth Census M3 | 제조업 전체 신규주문/출하/미이행주문/재고 | `G010/G013/G015/G016`: 2026-08, 저장 메타 실측 | **기존 저장 참조** 우선, M3 중복 수집기 금지. `G017/G018`은 원자료보다 오래된 파생본이므로 **revision parity 확인 전 C 재사용 HOLD** |
| 기존 PC E1-R4 | S&P500 EPS/매출/마진 기존 집계의 **정보성 표기 후보** | 2026Q2, 발행사 500, EPS420/Revenue409/Margin319 개수 메타 | **기존 비공개 저장/개수 메타 참조**만 검토. 기업별 구체값·SEC 현금흐름 신규 확보가 검증되지 않았으므로 가정 금지. E1 점수·공개 계약 불변 |
| BEA `NIPA/T11200/A051RC` | 미국 총 기업이익·동기 증가율 | 2026Q2 `4,709,453` 백만 USD, 4,709.453십억 USD/SAAR | **실제 시리즈 PASS**, 기존 PC 저장 중복 여부 확인 후 필요 시 1개 신규 원천. `A051RC`의 line 13/41 같은 값 **분기당 1번만 저장/파생** |
| BLS `WPSFD4` | PPI 최종수요 전체 지수·YoY | 2026-09 `159.780`, 계절조정 | **실제 시리즈 PASS**, 기존 `market-data` fallback의 원 출처·저장 증빙부터 확인; FRED 간접 재배포를 새 정보성 C의 자동 권리로 보지 않음 |
| BLS `WPSFD41` | PPI 최종수요 재화 지수·YoY | 2026-09 `162.341`, 계절조정 | **실제 시리즈 PASS**, 기존 전체 FD4와 같은 지표로 합산하지 않음 |
| BLS `PRS85006111` | 비농업 단위노동비용 YoY | 2026Q2 `1.4%` **전년 동기 대비** | **실제 시리즈 PASS**, 전기 대비 연율 `1.2%`와 다른 지표; 변환하지 않음 |
| Census MTIS `IR/TOTBUS/yes` | 전체 사업체 재고/매출 비율 | 2026-08 `1.33`, 계절조정 | **실제 시리즈 PASS**, 기존 범용 snapshot에 없다면 최소 신규 수집 후보; M3 제조업 재고/출하 `1.48`로 대체 불가 |
| Census QFR `101/104/115` | 산업별 매출/영업손익/세후손익 및 수익성 변화 | 2026Q2, 단위 백만 USD, 테스트된 API 행은 비계절조정 | **실제 코드 PASS**, 비교할 2025Q2 같은 산업/단위/조정 값 검증 전 YoY·margin breadth 생성 HOLD |
| SEC E1-R5 Shadow CFO/FCF, 추가 기업 지표 | 조건부 후순위 연구 | R2 공식 데이터값/기업별 커버리지 미검증 | **R3 초기 편입 보류**, R4 점수나 12대 실적과 결합 금지 |

**점수 산식과 무관한 정보성 리스트**로 운영하며, 해당 행이 늘어도 E1-R4 총점의 구성요소·정규화·가중치는 유지한다.

## 2. R3 구현 전 읽기 전용 게이트 (재사용 확인)

1. 현재 승인 PC 운영 소스/설정/SQLite 경로를 다시 확인한다. **main 최신 SHA와 PC 운영 `config.source`가 다를 수 있어 무단 교체하지 않는다**.
2. `growth_r2_feature_history_v1/current_v1/provider_snapshots_v1`의 G010–G018 원자료와 파생치가 동일 수정본인지 **허용된 범위에서 read-only 검증**한다. 날짜만 같으면 불충분.
3. `market-data`의 `WPSFD4` 실제 원천을 판별한다. BLS 직접값인지 FRED fallback인지, 기존 raw/meta가 PC에 실제 있는지 본다. 단지 코드상 route 존재만으로 중복 수집을 만들거나 공개 재사용을 확정하지 않는다.
4. 기존 SQLite의 공급자별 generic snapshot/비공개 원장을 조사해 `A051RC`, QFR, MTIS, `PRS85006111`의 **정확한 시리즈 데이터가 이미 존재하는지** 확인한다. 전용 table 이름 미발견을 데이터 부재로 오판하지 않는다.
5. QFR `2025Q2`와 `2026Q2` 동일 산업·동일 기준 비교 및 중첩 산업 계층의 독립 단위 목록을 먼저 검증한다. 별도 산업 breadth는 미검증이면 **HOLD**. SEC 신규 현금흐름 대량 호출 금지.
6. 저장/상업 파생/공개권은 공식 BEA/BLS 공공통계 범위 및 Census API 조건에 따라 **행별 승인**. Census 비후원·비식별, BLS 조회일·파생 비보증·BEA 출처를 R4/R5에 반영할 계획만 세운다.

## 3. 제안 PC 원자료 계약 (신규 테이블 승인 전 확정 금지)

R1 계획상 원자료는 반드시 **PC SQLite에 먼저 저장**하고, 가공은 DB에 저장된 데이터만 이용한다. 기존 범용 원장으로 lineage 요건을 충족하면 재사용을 우선한다. 새 테이블 명·스키마·보존기간은 **지금 승인/적용하지 않음**.

필드 후보 (실제 저장 구조와 중복 제거 후 최소화):
`provider, dataset, seriesId, observationPeriod, observationDate, periodType, seasonallyAdjusted, unit, rawValue, releaseDate, availableAt, retrievedAt, vintage, sourceURL, rawHash, status`.

필수 정합성:
- 동일 원시 시리즈의 멱등키는 최소 `provider + dataset + seriesId + observationPeriod + adjustment + vintage`를 바탕으로 제안. BEA line 13/41 중복 경제값을 서로 다른 시리즈로 집계하지 않는다.
- `rawValue` 원문 보존, 지수·전기/전년 성장률·단위 규모·계절조정 여부·SAAR 여부 별도 메타 필드로 관리.
- 공급 실패면 기존 성공 원본/이력을 보존하고 상태만 `SOURCE_FAILED/STALE/UNAVAILABLE` 등 승인 계약에 맞게 기록. NULL을 0으로 치환 금지.
- API 키·인증 헤더·raw URL query key·과도한 원시 응답을 로그나 공개 D1에 저장 금지.
- PC 저장량/최소 보존기간은 **기존 정책 조사 후** 승인, E: 불필요 대용량 저장 금지.

## 4. 정보성 C 오프라인 파생 초안 (제안, 미구현)

| C 지표 | 오프라인 연산 후보 | 검증/보류 |
|---|---|---|
| BEA 기업이익 YoY | 같은 series·분기의 `(2026Q2 / 2025Q2 - 1) × 100` | 같은 SAAR 단위·vintage, 양의 유효 분모 확인. 음수/0 분모 별도 규칙 **승인 전 연산 보류** |
| QFR 산업 매출 YoY | 동일 비중첩 산업·조정 상태의 `101` 동기 비교 | `2025Q2` 같은 원본/분류 없으면 NULL. 산업 breadth 계산은 HOLD |
| QFR 산업 영업/세후 마진 | 동일 산업·동일 분기 `104 / 101`, `115 / 101` | 매출 0/결측, 산업 중첩, 표본 추정치·표준오차 구분 |
| BLS PPI YoY | 같은 BLS id 월 `(index_t / index_{t-12} - 1) × 100` | `WPSFD4`와 `WPSFD41` 정의 구분. 공식 BLS 직접 원천 |
| BLS 단위노동비용 | 원천 `PRS85006111` 전년 동기 대비 비율 그대로 사용 | q/q 연율 1.2%와 혼합·재연율화 금지 |
| MTIS 전체 사업체 재고/매출 | `IR/TOTBUS/yes` 원본 비율 그대로 | 제조업 M3 비율로 대체·합산 금지 |
| M3 제조업 주문/출하/재고 | 기존 Growth PC 저장 실제값을 별도 C read-model에 참조 | revision parity 확인, 기존 Growth 점수·가중치/수집기 변경 금지 |

이 수식들은 C의 **정보 제공용 파생 정의 후보일 뿐**, 기존 점수(A/B) 산식 수정이나 새 영구 DB 계약 승인이 아니다.

## 5. 검증과 승인 구분

| Gate | 근거/동작 | 현재 |
|---|---|---|
| R1/R2 시리즈 실측 | BEA/BLS/Census API 실측, PC Growth/E1 메타 | **핵심 PASS, 단 원시 provenance·QFR 역사값·SEC 추가 HOLD** |
| R3-A 중복·수정본 상세 읽기 | PC 원장 기존값/원천 최소 조회, **쓰기/추가 API 0** | **PARTIAL_PASS: current/history 6/6 일치; G017/G018 계산 parity 및 정확한 시리즈 중복 여부 검증 중** |
| R3-B 저장 계약 확정 | 실제 원장 재사용 vs additive 스키마 설계/보존·수집 주기 | **사용자 별도 승인 필요** |
| R3-C PC 수집·원자료 저장 | 승인된 PC 공간에서만 비공개, 자동 스케줄 등록 금지 | **NOT_STARTED / 승인 필요** |
| R3-D 저장값만 계산/검증 | input lineage/수정본/결측/과거 값 보존·E1-R4 불변 비교 | **NOT_STARTED / 승인 필요** |
| R4 공개 키·read-model | 기존 `/api/earnings-recession-detail`과 분리 | **NOT_APPROVED** |
| R5 UI·R6 PR/Production | 실제 자료/날짜/모바일/권리 고지 및 공개 검증 | **NOT_APPROVED** |

**계획은 기존 작업 브랜치에만 저장한다. 승인 전 운영 PC DB, 수집 스케줄러, 원점수, Cloudflare D1, 공개 응답·사이트, main 변경 없음.**
