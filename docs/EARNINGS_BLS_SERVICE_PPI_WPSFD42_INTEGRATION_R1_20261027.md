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
6. **기존 체크포인트 충돌을 코드 단계에서 해결:** 기존 3원천·5행은 기존 D1 키 `detail:earnings-recession-indicators:v1`에 그대로 두고, 신규 서비스 1원천·2행을 `detail:earnings-recession-indicators:bls-wpsfd42:v1`에 별도로 기록하도록 확장했다. 이들은 **별개 산식이 아니라 동일 정보성 C 지표의 출처별 저장 체크포인트**다. Worker GET은 두 저장 본문을 각각 검증한 뒤 5+2행을 합치며, 서비스 키가 없거나 위조·손상된 경우 기존 5행을 표시한다. 서비스 GET에는 `x-earnings-c-service=READY|NOT_PUBLISHED|READ_UNAVAILABLE|INVALID`가 부가된다.
7. 기존 두 PC D1 게시 스크립트는 명시적으로 `includeServices:false`를 사용해 **새 원본이 있어도 기존 키에 7행을 쓰지 못하도록** 분리했다. 서비스 원장만 검증한 2행 payload는 `buildServiceSourcePreview()`가 원본 `first_seen_at`과 SHA로 생성한다. 신규 `EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs` 및 `EARNINGS_BLS_SERVICE_R1_D1_PREFLIGHT.cmd`/`_APPLY.cmd`는 승인된 운영 checkout·PC 설정·main 코드 출처를 게이트로 검사하고, 사용자 확인 전에는 원격 요청도 없는 드라이런이다. 로그 TXT는 실행 CMD가 있는 폴더에 생성한다. 스케줄러 등록·원본 PC SQLite 수정은 없다.

## 3. 검증과 명시적 미완료 사항

| 단계 | 상태 | 근거 |
| --- | --- | --- |
| BLS 원본 HTTP 실측 | PASS | 2026-09 157.666 / 2025-09 150.273, 계절조정 시계열 `WPSFD42` |
| 신규 수집·원장 검증 코드 | 구현·로컬 코드 검사 | 기존 SQLite를 사용자 PC에서 실제 읽거나 쓰지 않음 |
| PC SQLite WPSFD42 기록·readback | NOT_RUN | 승인된 PC에서 프리플라이트→명시적 APPLY 필요 |
| 5→7행 저장 데이터 미리보기 | 로컬 메모리 DB 테스트 PASS | 3종 미변경, 분리 수집, 누락, 위조 시나리오 검증 |
| Worker/API 저장 결과 | 출처별 키 분할·합성·오류 시 기본 5행 유지까지 로컬 테스트 PASS | 승인 D1 게시와 실제 readback 미실행 |
| 기본 5행 Production GET (2026-10-27) | HTTP 200·5/5 READY 확인 | `sourceStoredAt=1793034173996`·이전 sourceVersion 유지. 서비스 키 미게시 |
| 실제 Production 페이지에서 신규 2행 | **NOT_READY** | 브랜치 소스 구현 ≠ Production 배포 |
| 다음 정규 자동 수집·갱신 | NOT_RUN | 기존 스케줄러를 무단 변경하지 않음 |

### 중요: D1 기존 checkpoint의 후속 Gate

기존 `earningsCompanionWriter`는 `sourceStoredAt`을 가장 이른 원본 `first_seen_at`으로 유지하고, **기존 게시본과 동일한 `sourceStoredAt`에 다른 `sourceVersion`을 쓰지 못하게 한다.** 따라서 뒤늦게 받은 서비스 자료를 기존 키에 7행으로 게시할 때 **동일 시각 버전 충돌**이 발생할 수 있었다. 이는 원본 수집/파생 실패와 다르며 승인된 checkpoint 안전 계약이다.

- 원본·미리보기는 안전하게 준비하되, **별도 허가 없이 기존 writer의 단조 증가·충돌 방지 정책을 완화하거나 신선도 시각을 조작하지 않는다.**
- **코드 설계상 해결:** 별도 `WPSFD42` D1 키를 선택했다. 기존 5행 게시 경로는 5행만 기록하고 서비스 신규 키는 2행만 기록한다. 신규 서비스의 출처 시각을 가공하지 않고 기존 단조 증가·동일시각 충돌 금지를 양쪽 키에 그대로 적용한다.
- **운영 Gate 미해제:** 별도 키를 실제로 생성하거나 D1에 쓰지 않았다. 적용 전 사용자 승인과 PC 서비스 수집, 승인된 게시자 코드 main 반영, Worker 배포가 필요하다. 따라서 코드/로컬 테스트 PASS는 **신규 2행 운영 게시 완료가 아니다**.

## 4. 작업 이어가기

1. WPSFD42 `PREFLIGHT.cmd` 실행 결과 TXT를 받아 정확한 PC 원본 수신·기존 스키마 조건을 판단.
2. 승인된 PC 출처/원본 확인 후에만 `APPLY.cmd`로 append-only 저장, R4 읽기 전용 preview 7행·SHA/lineage 확인.
3. 신규 `EARNINGS_BLS_SERVICE_R1_D1_PREFLIGHT.cmd`로 원장 저장값과 별도 키 게시 소스를 읽기 전용 점검. 기존 공개 5행 체크포인트를 재작성하지 않는다.
4. 운영 검증 및 명시적 승인 후에만 새 Worker GET 결합 코드 배포 → `EARNINGS_BLS_SERVICE_R1_D1_APPLY.cmd`로 **서비스 전용 D1 키만** 쓰고 정확한 readback 확인. 실행 순서와 배포 권한은 별도 승인 필요.
5. 공개 API 7행/실화면/모바일/다음 실제 관측 갱신 검증. 지표 추가 시 source별 체크포인트로 확장하되 기존 점수식·기본 5행·타 작업 브랜치를 변경하지 않는다.

추후 더 많은 정보성 지표를 추가해도 한 번에 전체 연구를 재시작하거나 새 개인 브랜치를 만들지 않는다.
