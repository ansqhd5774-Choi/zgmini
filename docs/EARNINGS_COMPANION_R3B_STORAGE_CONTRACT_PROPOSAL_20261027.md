# ZGMINI 실적 침체 정보성 C — R3-B 최소 저장·재사용 계약 제안

- 작성: 2026-10-27 KST
- 상태: **R3B_CONTRACT_APPROVED / BLS_DIRECT_3_SERIES_APPROVED_20261027 / FRED_CACHE_C_HOLD / R3C_DB_WRITE_NOT_APPROVED**
- 저장소/단일 브랜치: `ansqhd5774-Choi/zgmini` / `codex/earnings-api-site-integration-plan-r1-20261026`
- 상위 승인 계획: `docs/EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md`
- R3-A 실측 증거: `docs/EARNINGS_COMPANION_R3A_PC_LINEAGE_REVIEW_20261027.md`

## 1. 결정: 재사용 우선, 확인되지 않은 원천만 조건부 추가

| 기존/후보 원천 | R3-A PC에서 검증한 상태 | 제안 계약 | 승인 전 상태 |
| --- | --- | --- | --- |
| Growth M3 G010/G013/G015/G016 | current/history 4/4 존재, 2026-08 관측 | **기존 SQLite 읽기 전용 재사용. 신규 M3 수집기·복제 저장 금지** | REUSE_CANDIDATE |
| Growth G017/G018 | 구성 최신값 대비 비율 `0.6823357487`, `0.6773284573` 각각 완전 일치(10자리 출력) | **기존 저장 비율 재사용**. 비율 산식·score 계산 변경 금지 | REUSE_CANDIDATE |
| 기존 E1-R4 | 기존 2026Q2, 500사 집계/커버리지 메타 R2 검증 | 기존 집계의 승인된 정보성 항목만 참조, 개별 SEC 신규 대량 호출 금지 | REUSE_METADATA_ONLY |
| FRED/PPIFIS → BLS 최종수요 PPI | PC `api_history_snapshots_v1` **2개**, 2026-09 관측, 최종 검색 10/15 | **C 신규 데이터는 BLS 직접 API `WPSFD4`를 우선 수집**, FRED 캐시는 신규 C 입력에서 제외. 기존 캐시 읽기/쓰기/삭제 없음 | REUSE_CONDITIONAL |
| FRED/PRS85006111 → BLS 단위노동비용 | PC snapshot **1개**, 2026Q2 관측, 최종 검색 09/24 | 정확한 전년 동기 대비 1.4%, **전기 대비 연율로 오인 금지**. **C 신규 데이터는 BLS 직접 API `PRS85006111` 원천 사용**, FRED 경유 캐시는 신규 C 입력에서 제외 | REUSE_CONDITIONAL |
| BEA NIPA/T11200/A051RC | R2 공식 API `2026Q2 4,709.453십억 USD` 실측, PC 정확한 원장 미확인 | **조건부 신규 공공 원천 1개**. 같은 분기 BEA line 13/41 중복값을 경제값 1개로 저장 | NEW_IF_ABSENT |
| BLS WPSFD41 | R2 공식 API 2026-09 `162.341` 검증, PC 정확한 원장 미확인 | **승인된 BLS 직접 API 3종 통합 요청에 포함**. `WPSFD4` 최종수요 전체 PPI와 `WPSFD41` 재화 PPI를 혼동·합산 금지 | NEW_IF_ABSENT |
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

1. 위의 **기존 Growth·승인된 E1 원장 재사용 우선, 신규 C는 FRED API 캐시 재사용 금지**.
2. 미보유로 판명된 **BEA A051RC / Census MTIS**만 추가 수집 후보로 한정하고, 신규 C의 BLS 3종은 공식 BLS 직접 API를 사용. 동일 BLS 직접 원본이 기존 PC에 검증되면 중복 저장 금지. QFR 동기·산업 기준 검증 전 편입 HOLD.
3. 신규 보존기간·스키마 확정은 PC 실제 원장 재사용 가능성·기존 TTL 확인 결과를 토대로 별도 승인.
4. 이미 존재하는 E1-R4 점수 A 및 12대 실적 B와 분리된 C 레이어만 생성.

승인 후에도 **R3-C PC 수집/쓰기 구현, R3-D 계산, R4 신규 공개 키/read-model, R5 UI, R6 배포**는 각각 계획의 별도 게이트를 준수한다. 승인 전 관련 운영 변경 **0건**.


## 5. 2026-10-27 사용자 승인 기록 및 신규 확인된 FRED 권리 게이트

- 사용자 응답 **“승인”**은 이 문서의 **R3-B 설계·재사용 우선 원칙 승인**으로 기록한다. **R3-C 운영 SQLite 쓰기/신규 테이블/보존기간/스케줄 등록까지 승인한 것이 아님**.
- 조건부 항목 FRED/PPIFIS, FRED/PRS85006111는 PC에 snapshot 메타가 있다는 사실만 확인했다. **공개용 정보성 C가 FRED API를 통해 획득한 캐시를 재사용하는 경로는 HOLD**.
- 이유: 공식 FRED Services Terms의 *Additional Terms of Use for the FRED API / Prohibitions (l)*에는 API를 저장·캐시·아카이브에 이용하는 행위를 금지하는 문구가 명시돼 있다. FRED의 *Public Domain: Citation requested* 표시나 원천 BLS 공공 자료의 저작권 정책만으로 **FRED API 전송·저장 제한이 사라지지는 않는다**. 이는 이 프로젝트의 **원자료 저장·파생 공개 필수 조건**에 직접 영향을 준다.
- 공식 확인 문서:
  - FRED: https://fred.stlouisfed.org/legal/terms/ (API Prohibitions (l); Data copyright labels)
  - BLS: https://www.bls.gov/opub/copyright-information.htm (공표된 통계 공공영역, 출처 표기 요청)
  - BLS API: https://www.bls.gov/developers/termsOfService.htm (조회일/파생 해석 책임·API 한도)
- **권리 검증용 안전한 변경 제안**: 신규 C 원본은 FRED 캐시 대신 **BLS 직접 API**에서 WPSFD4, WPSFD41, PRS85006111를 획득해 PC 승인 저장계약에 따라 관리하는 안을 우선 검토한다. R2 실제 BLS API 조회는 성공했고 WPSFD4=159.780, WPSFD41=162.341, PRS85006111=1.4%를 검증했다. 이 소스 변경안은 이후 사용자 승인으로 확정되었으며, 원격 공급원 계약만 변경한 것이다. 실제 PC 쓰기는 별도 승인 사항이다.
- 기존 운영 PC FRED cache의 삭제·수정·권한 변경을 본 작업에서 실행하지 않는다. 현재 사용 중인 외부 서비스 약관 영향은 별도 운영 검토 사항으로 남긴다.
- 이후 단계: R3-C 운영 PC 저장 및 보존기간/테이블 계약은 **추가 승인 전 실행 금지**; R4–R6도 별도 승인 유지.


## 6. R3-B 사용자 추가 승인: 최종 공급원·운영 설계 (2026-10-27 KST)

- 사용자 메시지 **“좋은 생각이야 진행해라”**를 직전 검토·추천한 **BLS 직접 API + 기존 원장 재사용 + BLS 공식 발표 교차검증** 방향에 대한 승인으로 기록한다. 이는 앞서 승인한 R3-B 계약의 **공급원·수집 방식 보완**이며, R3-C 실제 PC SQLite 쓰기·신규 테이블/TTL·자동 스케줄 실행·D1/Production 공개를 뜻하지 않는다.
- **신규 C 한정 공급원 확정**: `https://api.bls.gov/publicAPI/v2/timeseries/data/`의 직접 BLS `WPSFD4`(전체 최종수요 PPI, 계절조정 월 지수), `WPSFD41`(최종수요 재화 PPI, 계절조정 월 지수), `PRS85006111`(비농업부문 단위노동비용, 전년 동분기 대비 %, 계절조정 분기)를 직접 수집 후보로 설정. FRED/PPIFIS, FRED/PRS85006111의 과거 API 캐시는 **신규 C의 원본 출처로 사용하지 않음**. 기존 다른 서비스/테이블의 FRED 데이터는 이 작업에서 삭제·변경하지 않는다.
- **최소 호출**: 기존 검증된 무료 BLS API v2 등록키 사용 가능 시 **1회 POST에 3종 seriesid를 묶는다**. R2 v2 실측 성공을 재사용하며 불필요한 반복 API 실험을 피한다. 비등록 v1(무료 25회/일, 한 번 최대 25종, 최대 10년)은 **키 부재 시 별도 동일 데이터 수신·단위 검증 후에만** 후보로 사용. v2의 등록키 신규 발급·갱신을 요구하지 않는다. 5분 PC Core 스케줄의 매 실행마다 새 호출하는 방식은 채택하지 않는다.
- **갱신**: 정기 작업 신규 등록/주기 변경 전에는 release calendar 기준 월간 PPI 및 분기 ULC 발표 후 이벤트성 수집안을 검토. API 성공 후 `seriesID`, `year`, `period`, `value`, `footnotes`를 검증하고 `retrievedAt`, 변경 전후 관측값, `responseHash`, 수정 이력을 보존. 기존 vintage 표지가 없는 BLS 응답에 **허위 공식 vintageId를 만들지 않는다**. 수집 실패 시 이전 값을 최신값으로 재표기하지 않는다.
- **수정본**: BLS PPI는 최근 약 4개월간 재공표·수정 가능하며, 계절조정 과거 5년 재산정도 가능. 따라서 해당 수정 관측월을 재조회·비교하되, 누적 이력 삭제/기존 점수 재계산은 금지. 1년치 월별 YoY를 모두 그리려면 최대 24개월 이상의 기준월 원본이 필요하므로 원장 보존기간/백필은 별도 승인을 받는다.
- **단위·공식 대조**: PPI 원 지수(계절조정)를 기준으로 동일 조정 계열끼리 비교하고 월간 또는 YoY 파생치는 별도 표시. 공식 보도자료의 12개월 비계절조정 변화율과 계절조정 지수로 만든 YoY가 정확히 같아야 한다고 판정하지 않는다. `PRS85006111=1.4%`는 전년 동기 대비로서 보도자료의 전기 대비 연율 `1.2%`와 구분. `WPSFD4`/`WPSFD41`를 합산하거나 중복 지표로 점수에 재편입하지 않는다.
- **교차검증·예비 경로**: BLS 공식 PPI/생산성 보도자료와 기간·계절조정·값을 확인한다. API 장애 시 `https://download.bls.gov/pub/time.series/`의 공식 파일은 예비 조사 후보이나, 파일 포맷·접근권·세부 series 일치 실측 없이는 자동 fallback 구축 금지.
- **기존 원장 재사용**: Growth G010–G018, 승인된 E1-R4 메타는 기존 PC SQLite에서 **읽기 전용 참조**; BEA·MTIS 등은 기존 전용/범용 저장 존재 여부를 먼저 검사. 기존 동일 BLS 직접 출처가 있다면 신규 복제 원장 금지. 기존 FRED 캐시가 있다는 이유로 BLS 직접 source 체크를 생략하지 않는다.
- 공식 근거: https://www.bls.gov/developers/api_FAQs.htm ; https://www.bls.gov/developers/api_signature_v2.htm ; https://www.bls.gov/developers/termsOfService.htm ; https://www.bls.gov/opub/copyright-information.htm ; https://www.bls.gov/ppi/faqs/questions-and-answers.htm ; https://fred.stlouisfed.org/legal/terms/ .

### 6.1. 다음 게이트

1. R3-C 스키마·저장 원장 실태에 대한 **0 API / 0 DB-write의 최소 read-only preflight**.
2. 기존 PC raw 구조에 C의 BLS 직접 출처·raw value·retrieved timestamp·진정한 변경 이력을 기록 가능한지, 새 저장 구조 필요 여부 확인.
3. 사용자에게 **정확한 PC 저장 방법·스키마·보존기간·수집 주기**의 변경/추가 목록을 제시해 **운영 쓰기 승인**을 받은 후에만 R3-C 실데이터 저장.
4. R3-D/R4–R6은 별도 공개/계산/배포 게이트 유지.
