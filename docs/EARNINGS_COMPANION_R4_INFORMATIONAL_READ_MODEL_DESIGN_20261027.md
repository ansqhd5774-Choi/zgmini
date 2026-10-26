# ZGMINI 실적 침체 — 정보성 C R4 공개 read-model 설계안

- 작성일: 2026-10-27 KST
- 저장소 / **유일한 작업 브랜치**: `ansqhd5774-Choi/zgmini` / `codex/earnings-api-site-integration-plan-r1-20261026`
- 상태: **R4_DESIGN_ONLY / IMPLEMENTATION_NOT_AUTHORIZED / PUBLICATION_NOT_AUTHORIZED**
- 근거: `docs/EARNINGS_COMPANION_R3D_PC_RESULT_VERIFIED_20261027.md` (`PASS_R3D_STORED_ONLY_CALCULATION`)
- 상위 계획: `docs/EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md`의 R4.
- 불변: 실적 침체 E1-R4 위험 점수 4개 입력·가중치·과거이력·기존 API, E1-R5 Shadow, 12대 기업 실적 B, 다른 위험 점수, PC SQLite/D1 schema·TTL·scheduler·D1/Cloudflare 배포·main.

## 1. 범위 — 세 원천에서 다섯 정보성 행만 설계

R3-D 로그의 3개 공식 BLS 시계열에서 **RAW 3행 + DERIVED 2행**을 산출한다. 정보성 C는 0–100점 진단, 매수·매도 신호, 실적 침체 발생 확률이 아니다.

| 표시 순서 | `indicatorId` | 표시 이름 제안 | source | 유형 / 단위 | 실측 최근 값 |
| ---: | --- | --- | --- | --- | ---: |
| 1 | `bls_ppi_final_demand_yoy_sa` | 최종수요 생산자물가 · 전년 대비 | WPSFD4 | DERIVED / % / 월 | +6.346301% (2026-09) |
| 2 | `bls_ppi_final_demand_index` | 최종수요 생산자물가 · 지수 | WPSFD4 | RAW / 지수 / 월 | 159.780 (2026-09) |
| 3 | `bls_ppi_goods_yoy_sa` | 재화 생산자물가 · 전년 대비 | WPSFD41 | DERIVED / % / 월 | +9.772194% (2026-09) |
| 4 | `bls_ppi_goods_index` | 재화 생산자물가 · 지수 | WPSFD41 | RAW / 지수 / 월 | 162.341 (2026-09) |
| 5 | `bls_unit_labor_cost_yoy` | 비농업 단위노동비용 · 전년 대비 | PRS85006111 | RAW / % / 분기 | +1.4% (2026-Q2) |

- 행 1·2는 **같은 WPSFD4** 원본을 두 방식으로 설명한다. 행 3·4도 같은 WPSFD41 원본이다. **독립 경제증거 5개로 계산하거나 합산하지 않는다.**
- 이 목록은 `indicatorId` 기준의 동적 registry에서 출력한다. 다섯 항목은 **이번 R4의 검증된 시작 범위**이지 앞으로의 전체 C 지표 수 제한이 아니다.
- BEA 기업이익·Census QFR/MTIS/M3·SEC·Growth 재사용 항목은 별도 검증된 계약/공개 승인 이후에만 추가한다. 원천을 BLS 3종으로 대체하거나 임의 수치를 만들지 않는다.

## 2. 후보 공개 인터페이스 — 기존 점수 API와 분리

| 항목 | R4 설계안 | 현재 실행 여부 |
| --- | --- | --- |
| GET endpoint | `/api/earnings-recession-indicators` | **미등록** |
| D1 공개 snapshot 키 | `detail:earnings-recession-indicators:v1` **후보** | **미등록** |
| 별도 D1 테이블 | **추가하지 않는 안 우선**: 현 `market_public_snapshots_v1`의 기존 허용목록 구조를 검토 | **변경 없음** |
| 기존 점수 GET | `/api/earnings-recession-detail` | **계약·값 그대로 유지** |
| 게시 주체 | 승인된 PC 저장 데이터로만 생성한 경량 payload를, 추후 승인된 writer로 게시 | **미구현** |
| GET 동작 | D1 저장된 별도 snapshot을 검증한 뒤 읽기만 함. GET에서 외부 API 조회·변환·쓰기 금지 | **미구현** |

**중요한 기존 코드 제약:** `worker/market-public-projection-store.mjs`는 `PUBLIC_PROJECTION_KEYS` 화이트리스트 밖의 키를 거부한다. `worker/projection-runtime-r52.mjs`는 현재 모든 위험 상세 projection에 공통 `PUBLIC_DISPLAY_MAX_AGE_MS`를 적용한다. 후보 키·라우트·validator·발표주기별 freshness 처리는 **사용자 구현 승인 전에 수정하지 않는다**. 월간 PPI와 분기 ULC에 현재의 단일 점수 신선도 규칙을 무조건 재사용하지 않는다.

## 3. 제안 데이터 계약: payload와 기존 projection envelope 분리

```ts
type CRowStatus = 'READY'|'PENDING'|'PARTIAL'|'STALE'|'SOURCE_FAILED'|'UNAVAILABLE';
type EarningsCompanionCRow = {
  indicatorId: string;             // registry의 고유 ID, 중복 금지
  name: string;
  category: 'COST_PRESSURE';       // 당장은 5개 모두 보조적인 비용 압력 정보
  kind: 'RAW'|'DERIVED';            // SCORE 금지
  value: number|null;             // READY면 유한 실수, 실제 0 허용
  unit: 'INDEX'|'PERCENT';
  frequency: 'MONTHLY'|'QUARTERLY';
  adjustment: 'SA';
  observationPeriod: string;       // YYYY-MM 또는 YYYY-Qn; 조회·게시 시각 아님
  previousPeriod: string|null;    // 실제 연속 관측이 있을 때만
  previousValue: number|null;
  change: number|null;            // RAW 지수: index point, YoY %: percentage point
  changeUnit: 'INDEX_POINTS'|'PERCENTAGE_POINTS'|null;
  releaseDate: string|null;       // 검증된 원자료/공식 발표일 없으면 null
  nextReleaseDate: string|null;   // 실제 공식 스케줄 매핑 승인 전 null
  retrievedAt: string;            // PC의 원본 BLS API 수신 시각 ISO UTC
  provider: 'BLS';
  seriesId: 'WPSFD4'|'WPSFD41'|'PRS85006111';
  publisher: 'U.S. Bureau of Labor Statistics';
  sourceURL: string;              // 인증값 없는 BLS 공식 출처 URL
  method: 'SOURCE_INDEX'|'YOY_SA_T_MINUS_12'|'SOURCE_YOY';
  status: CRowStatus;
  history: Array<{period:string;value:number|null}>; // 실제 관측만, 구멍은 null
  historyCoverage: {actualPoints:number;expectedPeriods:number;complete:boolean};
};

type EarningsCompanionCPayload = {
  schemaVersion: 'earnings-companion-c-r4-v1';
  status: CRowStatus;
  sourceVersion: string;           // 정렬된 원본 3개 snapshot SHA를 묶은 결정적 digest
  sourceStoredAt: number;         // PC 검증 원장에 기록된 시각, UTC epoch ms
  generatedAt: string;            // 실제 PC payload 생성 시각 ISO UTC
  historicalMode: 'CURRENT_RETRIEVAL_NOT_PIT';
  observedThroughBySeries: Record<string,string>; // 월간+분기 혼합 단일 날짜 금지
  coverage: {configured:number;ready:number;partial:number;unavailable:number};
  rows: EarningsCompanionCRow[]; // registry 기반 가변 길이
};
```

- 추후 기존 D1 projection envelope와 결합할 때 `projection.sourceVersion`, `projection.sourceStoredAt`, `expectedSourceVersion`, `expectedSourceStoredAt`, `stored_at`의 현행 검증을 **하향하지 않는다**. 이 TypeScript 모형은 API 확정 schema가 아니라 승인용 제안이다.
- `sourceVersion`은 고정 정렬한 3개 `seriesId|snapshotSha256` 및 schema version의 SHA256으로 구성한다. 사용자가 제출한 R3-D TXT에는 **snapshot SHA 원문이 출력되지 않아** 현재 확정된 `sourceVersion` 값은 없다. 임의 생성 금지.
- `sourceStoredAt`도 실제 저장 row의 `first_seen_at` 등 승인된 원장을 읽어서 정한다. R3-D TXT의 `retrievedAt`이나 문서 작성시간을 확인 없이 대신 기입하지 않는다.
- 동일 payload/해시를 재실행했다는 이유로 `sourceVersion`을 바꾸거나 `sourceStoredAt`을 현재 시각으로 갱신하지 않는다. 이는 운영 freshness를 허위 연장할 위험이 있다.
- 인증 키, BLS 응답 원문, footnotes의 전체 payload, FRED cache, 기존 위험 점수 원장, 개별기업 정보는 브라우저용 응답과 D1 payload에서 제외한다.

## 4. 값 계산·이전값·과거 차트

| 그룹 | 산식 / 원자료 | `previousValue`·`change` 규칙 | 발표 간격 | 1년 차트 조건 |
| --- | --- | --- | --- | --- |
| PPI 지수 (2행) | BLS 월간 SA 지수 원본 | 실측 `t−1월` 있을 때 이전 지수; `현재−이전`은 **지수 포인트** | 월 | 최대 최근 13개 실제 월 관측점 (`t−12..t`) |
| PPI 전년 대비 (2행) | `100×(index[t]/index[t−12월]−1)` | `t−1월` YoY도 실제 `t−13월`과 쌍이 있을 때만 이전 YoY; 차이는 **%포인트** | 월 | 1년 창에서 얻을 수 있는 YoY 점만. R3-D 현재는 **9개/각** |
| 단위노동비용 YoY (1행) | PRS85006111 원본 YoY %, 추가 변환 없음 | 전 분기 YoY가 실제 존재할 때 값 및 **%포인트** 차이 | 분기 | 최근 1년 구간 실제 최대 5개 분기점. 현재 저장 6개 중 조건 충족분 |

1. R3-D PC 관측은 월간 PPI 각각 `2025-01..2026-09` 21개 연속, 단위노동비용 `2025-Q1..2026-Q2` 6개 연속이다. PPI YoY는 2026-01..09의 **9개 점만** 정당하게 계산 가능하다.
2. 원본이 없는 2025-10..12의 YoY 값을 역산·0 처리·보간·다른 원천 대체하지 않는다. **R4 단계에서 추가 BLS 호출/역사 백필은 하지 않는다.**
3. 결측/중간 누락 시 `history`에는 필요한 시간축 슬롯을 null로 남기고 실측 선을 끊는다. 구현 이후의 화면에서 결측 가이드가 필요하면 실제 관측점 간의 단순 연결로 명시해야 하며 추정 점수처럼 표시하지 않는다.
4. 실제로 제공받은 BLS 원시 월지수를 기반으로 한 12개월 변화율은 **계절조정 지수 자체 파생치**다. BLS의 비계절조정 공식 보도자료 YoY와 같은 데이터라고 표기하지 않는다.
5. 저장된 한 번의 현시점 자료 조회로 과거 관측기간을 재구성했을 뿐이다. 과거 그 시점에 공개되었던 수치(PIT/as-of vintage)나 발표당일 수치로 오인하지 않도록 `historicalMode`를 보존하고 차트에 안내한다.

## 5. 상태·신선도·부분 실패의 구분

1. **원본 무결성**: 3개 BLS dataset의 계약, 동일 retrievedAt/response hash cohort, snapshot/chunk SHA, 기간·단위·원시값 검증을 통과해야 READY 후보가 된다. 어떤 신규 행도 기존 score payload에서 가져오지 않는다.
2. **행 상태**: 최신 관측 지수/원본 YoY 또는 12개월 전 쌍이 없으면 `value:null`, `status:'PARTIAL'` 혹은 `UNAVAILABLE` 및 명시적 이유를 사용한다. YoY 과거 차트 9개뿐이어도 최신 YoY가 정상이라면 `value`는 사용 가능하며 `historyCoverage.complete=false`를 별도 표시한다.
3. **게시 상태**: 원본 PASS ≠ D1 게시 READY. 승인된 저장 snapshot 및 readback, sourceVersion/sourceStoredAt이 확인되기 전에는 public API가 `READY`라고 주장하지 않는다.
4. **신선도**는 (a) 원자료 관측기간, (b) 원본 조회시각, (c) 사이트 snapshot 저장·유효기간을 별도 관리한다. 월간과 분기별 고유 발표주기를 고려한 **새 갱신·TTL 정책은 별도 승인 대상**. 추정 발표일·미확인 다음 발표일은 `null`로 둔다.
5. 향후 일부 공급원 소스 실패가 생겨도 다른 유효 C 행은 보존 가능한 `PARTIAL` 모델을 검토하되, 새 cohort를 기존 cohort와 몰래 혼합하거나 stale 자료를 최신으로 위장하지 않는다. 기존 8대 위험 A는 C 실패와 완전히 격리한다.
6. **D1/GET 정책**: 확인된 snapshot이 없거나 저장 freshness 규칙 위반이면 정상 200 READY 반환 금지; 오류 reason은 `STORED_PROJECTION_PENDING`, `STORED_PROJECTION_STALE` 등 기존 승인 어휘와 일관시킨다. 추가 외부 요청·게시 retry는 GET에서 하지 않는다.

## 6. 표시 가이드 (R5 구현은 별도 승인)

- `/earnings-recession/` 상단 **기존 미국 실적 침체 0–100점 / 1년 이력 / 진단 요소 4개**는 그대로 둔다. 기존 `실적 침체 분석 지표` 제목의 4개는 점수용임을 분명히 하고, 신규 C 목록은 **`실적 침체 관련 경제 참고지표`** 같은 별도 영역에 둔다.
- C 목록은 5개 행의 이름/값/단위/관측월·분기/이전값/변화/출처/상태/실측 미니차트만 제안한다. **서로 다른 월·분기의 관측일을 한 시점으로 합치지 않는다.**
- PPI 상향은 **기업 원가 압박을 살피는 참고 정보**이지 자동으로 실적 침체 점수가 하락하거나 특정 기업 이익이 악화했다는 증거가 아니다. `긍정/부정/매수/매도` 판정을 자동 생성하지 말고 `상승/하락/보합/확인 불가`의 **실측 변화 방향**만 표시한다.
- RAW 지수와 DERIVED YoY를 한 단위로 합성하지 않고 그룹 구분을 명시한다. 각 지표 옆에는 `원자료` / `ZGMINI 계산` 표시를 사용한다.
- 숫자 표시는 지수 소수 2~3자리, 변화율 소수 1~2자리(표시만 반올림); 내부 계산·원장에는 반올림 금지. 실제 0은 `0.0`, 미확보는 `—`.
- 1Y 차트에서 PPI YoY 실제 9개만 보유하면 **9개만 표시하며 자료 부족 안내**. 차트 길이 보충을 위해 0으로 채우거나 예전 값을 반복하지 않는다.
- 출처 고지는 `U.S. Bureau of Labor Statistics`, 정확한 BLS 시리즈 ID 및 실제 조회일. `/data-sources/` 변경은 R5 이후 별도 승인 때만 한다.

## 7. R4 설계 수용 Gate / 현재 PASS와 후속 보류

| 검사 | 이번 문서 판정 |
| --- | --- |
| R3-D PC 3종 해시·연속성·계산 PASS 재사용 | **PASS (기존 로그)** |
| A(8대 위험 E1-R4) / B(12대 기업 실적) / C(정보성) 분리 | **DESIGNED** |
| BLS 3개 시리즈 → C 5개 행, 무중복 계산 | **DESIGNED** |
| API 후보와 D1 후보가 기존 key와 충돌하지 않음 | **DESIGNED / 미등록** |
| 기초 원장 snapshot SHA·sourceStoredAt의 실제 full read-model 검증 | **NOT_RUN** |
| 5개 행 전체 역사 `history`를 PC에서 실제 생성·검증 | **NOT_RUN** |
| PC read-model 변환기 구현·테스트 | **NOT_AUTHORIZED** |
| 허용 키·validator·D1 publish/readback | **NOT_AUTHORIZED** |
| 공용 URL / UI / main / 배포 | **NOT_AUTHORIZED** |

**다음 별도 승인 질문:** 이 설계를 바탕으로 R4 구현 **1차(PC SQLite read-only → 별도 로컬 preview JSON/TXT → 오프라인 단위검증)**까지 진행할지. 이때에도 API 추가 호출·PC DB 쓰기·D1 업로드·Worker/사이트 수정·main 병합은 포함하지 않는다. 그 결과를 보고 R4 **2차** 신규 공개 key·reader·writer contract를 다시 승인받는다.

## 8. 공식 소스

- BLS API v2 반환/시계열 원문: https://www.bls.gov/developers/api_signature_v2.htm
- BLS 파생자료와 출처 표현 의무: https://www.bls.gov/developers/termsOfService.htm
- PPI 계절조정·수정: https://www.bls.gov/ppi/faqs/questions-and-answers.htm
- 2026년 9월 PPI 공식 결과: https://www.bls.gov/news.release/archives/ppi_10152026.htm
- 2026년 2분기 단위노동비용: https://www.bls.gov/news.release/prod2.t02.htm
