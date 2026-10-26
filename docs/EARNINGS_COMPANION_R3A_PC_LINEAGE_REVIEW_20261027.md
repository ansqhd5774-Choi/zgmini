# ZGMINI 실적 침체 정보성 C — R3-A PC lineage 실측 검토

- 작성: 2026-10-27 KST
- 기준 로그 1: `EARNINGS_R3A_PC_LINEAGE_RESULT_20261026-155138Z.txt` (UTC 2026-10-26T15:51:38Z)
- 기준 로그 2: `EARNINGS_R3A_PARITY_REUSE_RESULT_20261026-160134Z.txt` (UTC 2026-10-26T16:01:34Z)
- 상태: **R3-A PASS / R3-B USER_APPROVED_WITH_FRED_RIGHTS_HOLD / R3-C NOT_APPROVED**
- 저장소 기존 단일 브랜치: `ansqhd5774-Choi/zgmini` / `codex/earnings-api-site-integration-plan-r1-20261026`
- 원래 계획: `docs/EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md`
- R3 제안: `docs/EARNINGS_COMPANION_R3_MINIMAL_PC_STORAGE_PROPOSAL_20261026.md`

## 1. 실측된 PC current/history

| 후보 | 관측 기간 | current retrievedAt(UTC) | current recordHash가 최근 8개 history에 존재 | 판정 |
| --- | --- | --- | --- | --- |
| G010 신규주문 | 2026-08 | 2026-10-15T12:15:05Z | YES | 기존 원장 읽기 재사용 후보 |
| G013 출하 | 2026-08 | 2026-10-15T12:15:05Z | YES | 기존 원장 읽기 재사용 후보 |
| G015 미이행주문 | 2026-08 | 2026-10-15T12:15:05Z | YES | 기존 원장 읽기 재사용 후보 |
| G016 재고 | 2026-08 | 2026-10-15T12:15:05Z | YES | 기존 원장 읽기 재사용 후보 |
| G017 신규주문/재고 | 2026-08 | 2026-10-02T14:20:53Z | YES | 10/15 원자료 대비 계산 parity 필요; C 재사용 HOLD |
| G018 출하/재고 | 2026-08 | 2026-10-02T14:20:53Z | YES | 10/15 원자료 대비 계산 parity 필요; C 재사용 HOLD |

- **6/6 current recordHash가 history에 존재**: 기존 이력이 고아 레코드라는 증거 없음.
- 이전 R3-A CMD의 `LATEST_HISTORY_*`는 `observation_date DESC, available_at DESC` 순서의 첫 레코드이다. `retrieved_at` 최신순을 뜻하지 않으므로 **10/08 행과 current 10/15 불일치만으로 무결성 실패 판정 금지**.
- G017/G018은 구성 원자료보다 수집일이 13일 이르지만 같은 관측 월이다. 날짜만으로 값 불일치를 추정할 수 없음. 기존 소스의 공식 연산은 `G017 = G010 / G016`, `G018 = G013 / G016`; **같은 관측일·단위에서 저장 숫자의 허용오차 parity 검증 필요**. 기존 Growth 점수/원장 변경 금지.

## 2. 기존 소스 스냅샷·범용 원장

| 관측 | 실측 현황 | 의미 |
| --- | --- | --- |
| Census M3 `MTM`/`MDM`/`NXA` | 각 3개 스냅샷, 최신 `2026-10-08T12:45:03Z` | M3 중복 신규 수집기 금지. 다른 경로의 current 10/15와 동일 revision인지 데이터별 확인 필요 |
| Census M3 `MTU` | 1개 스냅샷, 최신 `2026-10-01T20:50:30Z` | 참고 메타, 기타 코드 대신 사용 금지 |
| `api_history_snapshots_v1` | PC SQLite에서 테이블 존재 확인 | `provider/dataset/retrieved_at` 메타로 실제 시리즈 존재 검사 필요. 테이블 존재만으로 특정 지표 보유 단정 금지 |
| `c1_r3_source_snapshots_v1` | 테이블 존재 | 기존 소비 관련 수집 정보로서 C 소스 사용 자동 승인 아님 |
| BEA/BLS/QFR/MTIS 전용 테이블 | 이름 검색으로 미확인 | 범용 이력/스냅샷 가능성을 배제하지 않으므로 데이터 부재 판정 금지 |

기존 `worker/api-history-store.mjs` 소스는 FRED 기반 `PPIFIS`(BLS `WPSFD4` 대응)와 `PRS85006111`를 후보 목록에 포함한다. 다만 **코드에 포함되었다는 사실 ≠ 사용자 PC에 저장되었다는 사실**. `WPSFD41`, BEA `A051RC`, Census MTIS/QFR 실저장은 아직 불확정.

## 3. R3-A 마무리 읽기 전용 통합 검사

R3-A 초회 로그에 부족한 정확한 수치 대조와 재사용 확인을 별도 저장소 신규 작업 분기 없이 아래 두 파일로 보완한다.

- `scripts/pc-writer/EARNINGS_R3A_PARITY_REUSE_READONLY.cmd`
- `scripts/pc-writer/EARNINGS_R3A_PARITY_REUSE_READONLY.mjs`

검사 내용:
1. `growth_r2_feature_current_v1` **6개 행만** 조회. G017/G018을 같은 관측일의 구성 원자료로 재계산해 **허용오차 내 일치 / 실제 차이 / 결측·단위 오류**를 구분한다.
2. `api_history_snapshots_v1`의 정확한 `provider+dataset` 존재를 `PPIFIS/WPSFD4/WPSFD41/PRS85006111/A051RC/IR/TOTBUS/yes`로 제한하여 확인한다. **원문 payload/키/URL 조회·노출 금지**.
3. API/DB/D1/스케줄/기존 점수 변경 0. 사용자 PC에서 생성되는 TXT를 받아 리뷰하고 R3-A 종료 여부를 결정한다.

검사에서 특정 시리즈가 보이지 않아도 **모든 DB 경로의 부재가 증명된 것은 아니다**. 신규 수집기·스키마 결정은 R3-B 계약 및 승인 후.

## 4. R3-A 후속 실측: 비율 값 및 FRED 원장

- `G017` 구성 원자료 최신 계산 `G010/G016=0.6823357487`, 저장된 `G017=0.6823357487` (**PASS**).
- `G018` 구성 원자료 최신 계산 `G013/G016=0.6773284573`, 저장된 `G018=0.6773284573` (**PASS**).
- 두 비율 모두 실수 허용오차 내 차이 `0.0000000000` (출력 정밀도 10자리). **수집 시점이 오래됐어도 값의 불일치는 검출되지 않음; Growth 계산/원장 변경 없음.**
- 기존 `api_history_snapshots_v1` 실제 키: `FRED/PPIFIS` **2개**, 최종 조회 `2026-10-15T16:45:04Z`, 마지막 관측 `2026-09-01`.
- 기존 `FRED/PRS85006111` **1개**, 최종 조회 `2026-09-24T06:40:51Z`, 마지막 관측 `2026-04-01` (=2026Q2).
- 이번 한정된 `provider/dataset` 검색에서는 직접 BLS `WPSFD4/WPSFD41`, BEA `A051RC`, Census `IR/TOTBUS/yes`가 검출되지 않았다. **다른 범용/전용 원장까지 부재가 증명된 것은 아님.**
- 조회된 것은 snapshot **메타데이터**다. 실제 `api_history_chunks_v1` payload/hashes 검증·공개권 및 전송 경로 검토는 R3-B 계약의 조건으로 남는다.
- 검사 결과 `API_REQUESTS=0`, DB/D1 쓰기 0, 스케줄러/점수 변경 0.

## 5. R3-A 게이트 판정

| 게이트 | 상태 |
| --- | --- |
| R3-A 기존 Growth current/history 대조 | **PASS (6/6 current hash present)** |
| R3-A G017/G018 최신 구성요소 수치 parity | **PASS (두 값 10자리 일치); 기존 Growth 저장 참조 허용 후보** |
| R3-A 정확한 FRED/BLS/BEA/Census 원장 중복 여부 | **FRED PPIFIS/PRS85006111 보유 확인; 새 원천 저장 여부는 R3-B 조건부** |
| R3-B 신규 저장·재사용 계약 확정 | **설계 승인됨, 단 FRED API 캐시 재사용 HOLD·PC 쓰기 별도 승인 필요** |
| R3-C PC 신규 수집·영구 저장 | **NOT_APPROVED** |
| R3-D DB 저장값 파생 | **NOT_APPROVED** |
| R4–R6 공개 모델·UI·배포 | **NOT_APPROVED** |

변경되지 않은 범위: E1-R4 점수, 실적 B 12개, 기존 Growth 산식 및 SQLite 값, D1, PC 스케줄러, 웹 공개, `main`.
