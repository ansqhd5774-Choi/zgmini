# 실적 침체 정보성 지표 추가 — BLS 서비스 생산자물가 WPSFD42

- 작업일: 2026-10-27
- 저장소: `ansqhd5774-Choi/zgmini`
- **지정 전용 브랜치: `codex/api-site-integration-r1-20261026`**. 신규 브랜치 생성 없음.
- 목표: `https://zgmini.kr/earnings-recession/`에 실적 비용 압력의 별도 원본 `WPSFD42`를 추가한다. **기존 E1-R4 위험 점수 4요소·가중치·과거 결과·원장·기존 BLS 5행은 변경하지 않는다.**

## 1. 확인된 실제 BLS 공급 원본

| 항목 | 값 |
| --- | --- |
| 정식 BLS 시계열 | `WPSFD42` — Final demand services, seasonally adjusted PPI |
| 공급자 | U.S. Bureau of Labor Statistics (BLS), https://data.bls.gov/timeseries/WPSFD42 |
| 무키 공식 API 검증 | `https://api.bls.gov/publicAPI/v1/timeseries/data/WPSFD42` — `REQUEST_SUCCEEDED` |
| 공식 API 실측 시각 | 2026-10-27의 공개 질의. 실행 PC 수집 시각과 혼동하지 않는다. |
| 2026-09 지수 | **157.666**, 최신 응답에는 preliminary 주석 |
| 2026-08 지수 | 156.387, 최신 응답에는 preliminary 주석 |
| 2025-09 지수 | 150.273 |
| 새 표시 행 1 | `bls_ppi_services_index`: BLS 원시 지수 157.666, INDEX |
| 새 표시 행 2 | `bls_ppi_services_yoy_sa`: **자체 파생** 월별 지수의 동일월 전년 대비 **4.919712789389985%** (`100 × (157.666 / 150.273 - 1)`) |
| 실적 해석 | 서비스 비용 압력의 참고값. 기업 전체 이익/순익 변화를 직접 측정한 지표가 아니므로 실적 침체 위험 점수에 무단 가산하지 않는다. |

BLS 원본의 발표일은 응답 필드로 수신하지 못했으므로 `releaseDate=null`을 유지한다. 조회 당시 2026-09 preliminary 및 현재 수정 가능성 때문에 역사적 PIT 빈티지라고 표시하지 않는다.

## 2. 수직 연결 코드 및 상태

1. 기존 `EARNINGS_R3C_BLS_STORE_ONCE.mjs`를 확장했다. 기존 **3종 기본 호출은 보존**한다. 신규 `--services-only --dry-run`은 **WPSFD42 하나만** 공인 BLS API v2에서 읽고 정규화/기존 원장 스키마·출처를 검사하며 원장·D1을 수정하지 않는다. `--services-only --apply --confirm-service-sqlite-append`는 사용자의 **명시적 승인 후** PC 기존 SQLite에 단일 원본을 append-only + 트랜잭션 재검증/readback한다.
2. 신규 CMD는 `EARNINGS_BLS_SERVICE_R1_PREFLIGHT.cmd`(기본 읽기 검사)와 `EARNINGS_BLS_SERVICE_R1_APPLY.cmd`(추가 승인 입력 필요)이다. 각 결과 TXT는 CMD/MJS와 같은 디렉터리에 생성된다. 기존 E: 운영 경로·Node·SQLite를 보존하며 새 테이블·마이그레이션·스케줄러는 만들지 않는다.
3. `EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs`에서 WPSFD42의 기존 계약형 해시·메타데이터 검증을 재사용 가능하게 공개했다. 원래 3종의 완료된 동일 수집 묶음 검증 `analyze(db)`는 그대로다.
4. `EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs`는 원래 3종으로 5행을 생성하고, **별도로 검증한 최신 WPSFD42 snapshot이 있을 때에만** 추가 2행을 생성한다. 두 공급 응답을 허위로 하나의 cohort라 표기하지 않고 각 행에 별도 `retrievedAt`을 보존한다. 비교월 없으면 YoY는 `null`, 산식은 기존 지수 YoY 계산과 동일하다.
5. Worker의 시계열 검증 allowlist에 `WPSFD42`를 추가했으나 GET은 저장된 D1만 읽는다. UI의 신규 2개 라벨은 **실제 API 행이 있을 때만** 나타난다. 미게시 시 기존 BLS 5행만 유지한다. 새 행의 시계열/단위/원출처 위조 방지 검사도 추가했다.

## 3. 검증과 명시적 미완료 사항

| 단계 | 상태 | 근거 |
| --- | --- | --- |
| BLS 원본 HTTP 실측 | PASS | 2026-09 157.666 / 2025-09 150.273, 계절조정 시계열 `WPSFD42` |
| 신규 수집·원장 검증 코드 | 구현·로컬 코드 검사 | 기존 SQLite를 사용자 PC에서 실제 읽거나 쓰지 않음 |
| PC SQLite WPSFD42 기록·readback | NOT_RUN | 승인된 PC에서 프리플라이트→명시적 APPLY 필요 |
| 5→7행 저장 데이터 미리보기 | 로컬 메모리 DB 테스트 PASS | 3종 미변경, 분리 수집, 누락, 위조 시나리오 검증 |
| Worker/API 저장 결과 | 소스 코드·테스트만 PASS | 승인 D1 게시와 실제 readback 미실행 |
| 실제 Production 페이지에서 신규 2행 | **NOT_READY** | 브랜치 소스 구현 ≠ Production 배포 |
| 다음 정규 자동 수집·갱신 | NOT_RUN | 기존 스케줄러를 무단 변경하지 않음 |

### 중요: D1 기존 checkpoint의 후속 Gate

기존 `earningsCompanionWriter`는 `sourceStoredAt`을 가장 이른 원본 `first_seen_at`으로 유지하고, **기존 게시본과 동일한 `sourceStoredAt`에 다른 `sourceVersion`을 쓰지 못하게 한다.** 따라서 기존 5행 원본을 보존하며 새로운 서비스 자료만 뒤늦게 취득한 뒤 7행을 같은 D1 키에 게시하려면 **동일 시각 버전 충돌**이 발생할 수 있다. 이는 원본 수집/파생 실패와 다르며 승인된 checkpoint 안전 계약이다.

- 원본·미리보기는 안전하게 준비하되, **별도 허가 없이 기존 writer의 단조 증가·충돌 방지 정책을 완화하거나 신선도 시각을 조작하지 않는다.**
- 후속 작업에서 기존 D1의 정확한 `sourceStoredAt/sourceVersion` readback을 먼저 확인하고, 새 소스의 별도 checkpoint/승인된 추가 결과 키 등 **공개 안전 경로를 사용자와 확정**한 뒤 D1에 게시한다. 기존 점수 키와 이전 C 스냅샷은 보호한다.
- 이 제약 때문에 이번 코드/로컬 테스트 PASS를 **신규 2행 운영 게시 완료**로 보고하지 않는다.

## 4. 작업 이어가기

1. WPSFD42 `PREFLIGHT.cmd` 실행 결과 TXT를 받아 정확한 PC 원본 수신·기존 스키마 조건을 판단.
2. 승인된 PC 출처/원본 확인 후에만 `APPLY.cmd`로 append-only 저장, R4 읽기 전용 preview 7행·SHA/lineage 확인.
3. 기존 D1 게시 checkpoint를 read-only로 확인하고 충돌 없는 **추가 지표 확장 계약** 확정 → 승인된 게시 실행 → D1 정확한 readback.
4. 지정 브랜치 소스 검사 후 별도 승인된 main/Cloudflare Git 통합 경로로 배포, 공개 API 7행/실화면/모바일/다음 실제 관측 갱신 검증.

추후 더 많은 정보성 지표를 추가해도 한 번에 전체 연구를 재시작하거나 새 개인 브랜치를 만들지 않는다.
