# ZGMINI 실적 침체 정보성 C — R3-B 최소 저장·재사용 계약 제안

- 작성: 2026-10-27 KST
- 상태: **DRAFT_FOR_USER_APPROVAL / NO_DB_OR_COLLECTOR_CHANGE**
- 저장소/단일 브랜치: `ansqhd5774-Choi/zgmini` / `codex/earnings-api-site-integration-plan-r1-20261026`
- 상위 승인 계획: `docs/EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md`
- R3-A 실측 증거: `docs/EARNINGS_COMPANION_R3A_PC_LINEAGE_REVIEW_20261027.md`

## 1. 결정: 재사용 우선, 확인되지 않은 원천만 조건부 추가

| 기존/후보 원천 | R3-A PC에서 검증한 상태 | 제안 계약 | 승인 전 상태 |
| --- | --- | --- | --- |
| Growth M3 G010/G013/G015/G016 | current/history 4/4 존재, 2026-08 관측 | **기존 SQLite 읽기 전용 재사용. 신규 M3 수집기·복제 저장 금지** | REUSE_CANDIDATE |
| Growth G017/G018 | 구성 최신값 대비 비율 `0.6823357487`, `0.6773284573` 각각 완전 일치(10자리 출력) | **기존 저장 비율 재사용**. 비율 산식·score 계산 변경 금지 | REUSE_CANDIDATE |
| 기존 E1-R4 | 기존 2026Q2, 500사 집계/커버리지 메타 R2 검증 | 기존 집계의 승인된 정보성 항목만 참조, 개별 SEC 신규 대량 호출 금지 | REUSE_METADATA_ONLY |
| FRED/PPIFIS → BLS 최종수요 PPI | PC `api_history_snapshots_v1` **2개**, 2026-09 관측, 최종 검색 10/15 | 기존 `api_history_chunks_v1` 원문/해시·BLS 정의·FRED 공개 이용조건 검증 후 **원본 재사용 후보**. 조건을 못 맞추면 직접 BLS 원천 별도 제안 | REUSE_CONDITIONAL |
| FRED/PRS85006111 → BLS 단위노동비용 | PC snapshot **1개**, 2026Q2 관측, 최종 검색 09/24 | 정확한 전년 동기 대비 1.4%, **전기 대비 연율로 오인 금지**. payload/해시/재이용 조건 검증 후 재사용 | REUSE_CONDITIONAL |
| BEA NIPA/T11200/A051RC | R2 공식 API `2026Q2 4,709.453십억 USD` 실측, PC 정확한 원장 미확인 | **조건부 신규 공공 원천 1개**. 같은 분기 BEA line 13/41 중복값을 경제값 1개로 저장 | NEW_IF_ABSENT |
| BLS WPSFD41 | R2 공식 API 2026-09 `162.341` 검증, PC 정확한 원장 미확인 | **조건부 신규 공공 원천 1개**. `WPSFD4`/`PPIFIS` 전체 PPI와 혼합 금지 | NEW_IF_ABSENT |
| Census MTIS IR/TOTBUS/yes | R2 공식 API 2026-08 `1.33` 실측 | **조건부 신규 공공 원천 1개**. 제조업 M3 `1.48`로 대체 금지 | NEW_IF_ABSENT |
| Census QFR 101/104/115 | R2 공식 코드·2026Q2 행 검증, 2025Q2 동기 표본 쌍은 미검증 | 2025Q2/2026Q2 **동일 비중첩 산업·조정·단위 검증 후** 조건부 편입; 성장률·산업 breadth는 선행검증 실패 시 HOLD | HOLD_PAIR_VALIDATION |
| SEC 신규 현금흐름/기업별 확대 | 기업별 실측/커버리지 미검증 | 초기 R3 원천 편입 제외 | OUT_OF_SCOPE |

`api_history_snapshots_v1`에 행이 있다는 사실은 **payload/해시 검증·재이용 허가를 완료했다는 뜻이 아니다**. FRED 법적 고지에 따라 원천 BLS의 공개 통계 권리와 FRED 전송·표기 의무를 각각 확인하며, 표시 시 원 출처/조회일을 기록한다. FRED를 이용했다는 이유만으로 BLS 자료가 독점 저작권 자료로 변하는 것은 아니지만, FRED 전체 사이트·차트/로고의 권한까지 자동 부여되는 것도 아니다.

## 2. PC 저장 계약: 신규 스키마는 이번 문서에서 승인하지 않음

원칙:
1. **기존 승인 PC SQLite 재사용 우선**: `growth_r2_feature_current_v1`, `growth_r2_feature_history_v1`, `api_history_snapshots_v1`, `api_history_chunks_v1`의 실제 값·hash·scope·source를 검증해 읽기 전용 입력으로 사용한다.
2. 기존 원장으로 출처/수정본/수집시점/원시값 필수 항목을 충족할 수 없는 **새 원천만** 신규 additive PC 저장 대상으로 제안한다.
3. 신규 정보성 C가 필요하다는 이유로 기존 점수 입력·테이블·원장/고유키·스케줄러에 ALTER/DELETE/UPDATE를 수행하지 않는다.
4. 제안 테이블 명은 `earnings_companion_c_raw_v1` **후보일 뿐**. 기존 공통 원장이 충분하면 테이블을 추가하지 않는다.

필드 제안(최소 계약, 실제 스키마 확정 전):
`provider, transportProvider, dataset, seriesId, observationPeriod, observationDate, frequency, seasonalAdjustment, annualRateFlag, rawValue, rawUnit, unitMultiplier, releaseDate, availableAt, retrievedAt, vintageId, responseHash, sourceURLWithoutKey, status`.

무결성:
- 동일 관측의 재수집은 `provider+dataset+seriesId+observationPeriod+seasonalAdjustment+vintageId` 기준 멱등 저장. 새로운 진정한 수정본이 발견되면 기존 이력을 유지한다.
- 원자료는 원문·단위를 그대로 보존하고, 백만 USD→십억 USD 변환/YoY/비율은 **저장 원본만 사용한 오프라인 파생**으로 별도 표시.
- BEA A051RC line 13/41이 같은 값이면 1개 지표로 dedup. 수치가 다르면 평균 내지 않고 HOLD.
- 조정여부(`SA/NSA`), `SAAR`, 분기/월, 기준 연도, observation/release/retrieved/vintage는 구별한다.
- `SOURCE_FAILED/STALE/UNAVAILABLE` 발생 시 기존 정상 자료 보존, 결측을 0으로 만들거나 발표일을 추정 금지.
- API 키·원문 비공개 인증 요청 URL·대량 raw payload는 TXT/D1/브라우저에 출력 금지.

## 3. 계산·보존 정책 결정이 필요한 항목

| 항목 | 현 단계 제안 | 미해결/보류 |
| --- | --- | --- |
| BEA 기업이익 | 같은 A051RC SAAR 분기·수정본의 YoY. 2026Q2와 2025Q2 쌍 필요 | 음수·0 분모의 특별 처리 정책 승인 전 HOLD |
| BLS PPI | 동일 시리즈 13개월 이상 관측으로 YoY | 1년 연속 YoY 차트를 내면 추가 과거 데이터 필요 가능 |
| BLS ULC | 원천 `PRS85006111`은 이미 **YoY %**이므로 직접 표기 | 또 YoY 계산하거나 1.2% q/q 연율 혼용 금지 |
| Census MTIS | `IR/TOTBUS/yes` 원본 비율 표기 | M3와 합산·대체 금지 |
| Census QFR | 동일 산업 101/104/115 검증 후 매출 증감·이익률 | 2025Q2 역사값/비중첩 산업 분류 아직 검증 안 됨 |
| 데이터 보존·역사 백필 | 기존 승인 보존주기·용량 정책을 **변경하지 않는다** | 1년 전체 YoY 추세를 위한 역사 원천 기간·새 원장의 TTL은 **사용자 승인사항**. 16개월 보존만으로 1년 기간 전체의 매월 YoY를 보장할 수 없음 |
| 신규 수집 주기 | 최초에는 승인된 PC 공간의 **수동 1회 실행/검증 제안** | 정기 스케줄·호출 주기·자동보관 정리는 별도 승인 필요 |

## 4. 정확한 다음 단계 및 승인 경계

**R3-B 사용자 승인 요청 대상** (모두 설계 승인, 운영 적용 아님):

1. 위의 **기존 Growth·FRED 원장 재사용 우선**.
2. 미보유로 판명된 **BEA A051RC / BLS WPSFD41 / Census MTIS**만 신규 PC 원본 저장 후보로 한정. QFR 동기·산업 기준 검증 전 편입 HOLD.
3. 신규 보존기간·스키마 확정은 PC 실제 원장 재사용 가능성·기존 TTL 확인 결과를 토대로 별도 승인.
4. 이미 존재하는 E1-R4 점수 A 및 12대 실적 B와 분리된 C 레이어만 생성.

승인 후에도 **R3-C PC 수집/쓰기 구현, R3-D 계산, R4 신규 공개 키/read-model, R5 UI, R6 배포**는 각각 계획의 별도 게이트를 준수한다. 승인 전 관련 운영 변경 **0건**.
