# ZGMINI 실적 침체 정보성 C — R3-C 준비 / BLS 일괄 수집·저장 게이트

- 작성: 2026-10-27 KST
- 작업 브랜치: `codex/earnings-api-site-integration-plan-r1-20261026`
- 현 상태: **R3-B BLS 직접 3종 방식 승인 / R3-C 운영 DB 쓰기 승인 전 / READ-ONLY PREFLIGHT ONLY**
- 승인 계약: `docs/EARNINGS_COMPANION_R3B_STORAGE_CONTRACT_PROPOSAL_20261027.md` §6
- 기준 main/work source drift: 2026-10-27 조회 `main=41d96e979e514a937a813d273466a7ac547622a5`; 작업 브랜치 `main` 대비 ahead 34, behind 7. **병합·rebase·PR·main 변경 수행하지 않음**.

## 1. 정보성 C 공급원 작업 계약

| C 후보 | 원천 | 정확한 정의 | 수집 방식 |
| --- | --- | --- | --- |
| 최종수요 PPI | BLS `WPSFD4` | 계절조정 월간 지수. YoY는 같은 시리즈 t와 t-12로 오프라인 가공 | BLS 공공 API의 직접 원본 |
| 재화 PPI | BLS `WPSFD41` | 계절조정 월간 최종수요 **재화** 지수. WPSFD4 전체 지수와 별개 | 같은 요청에 포함 |
| 단위노동비용 | BLS `PRS85006111` | 비농업 기업 전체 노동비용의 **전년 동분기 대비 %**. 전기 대비 연율과 구분 | 같은 요청에 포함 |

R2의 공식 BLS API v2 성공을 기존 Evidence로 사용한다. 동일한 3종을 **단일 POST 요청**으로 받아 각 시리즈의 식별자/기간/값/상태를 분리 검증한다. v2 키는 PC에 기존에 있을 경우 메모리로만 읽고, 새로운 키 발급·유료 호출은 하지 않는다. v1 비등록 대체는 실제 시리즈 수신·단위 확인 후에만 허용한다. 기존 운영 5분 스케줄러를 새로운 수집 주기로 오용하지 않는다.

### 추가되는 공식 검증 원칙

1. BLS 응답이 성공이더라도 `seriesID` 3종이 각각 존재하는지, 관측월/분기의 유효성, 소수 값, footnote를 검증한다. 수신 성공과 저장 성공은 구분한다.
2. 신규 C의 저장 출처는 **BLS 직접**으로 표시한다. 기존 PC `FRED/PPIFIS`·`FRED/PRS85006111` 캐시를 가져오거나 그 데이터를 덮어쓰지 않는다.
3. PPI 원자료는 발표 후 수개월 수정될 수 있으므로, 기존 관측월의 값이 수정됐는지 비교하는 이력 모델이 필요하다. 계절조정 연례 개정도 별도 관리한다.
4. 공식 보도자료 숫자와 비교할 때 계절조정 지수와 비계절조정 YoY의 정의 차이를 고려한다. `PRS85006111=1.4% YoY`와 `1.2% QoQ 연율`을 같다고 검증하지 않는다.
5. 원시 응답에서 **진짜 공식 vintage 식별자가 제공되지 않으면 조회시각 및 응답 해시**로 내부 버전을 표시하고 공식 vintage라고 부르지 않는다.
6. 이미 PC에 BLS **직접** 원본 및 수집 원장이 존재한다면 중복 수집기·복제 테이블을 만들지 않는다. 단지 FRED 경유 값과 일치한다고 재사용을 승인하지 않는다.

## 2. 이번 단계 제공한 0-API/0-DB-write 검사기

- `scripts/pc-writer/EARNINGS_R3C_STORAGE_PREFLIGHT_READONLY.cmd`
- `scripts/pc-writer/EARNINGS_R3C_STORAGE_PREFLIGHT_READONLY.mjs`
- Windows CMD에서 같은 폴더에 두 파일을 내려받아 CMD만 실행한다. TXT는 **CMD와 같은 위치**에 자동 생성된다.
- 기존 승인 PC root `ZGMINI_PC_HOME` 또는 `E:\ZGmini\data\pc-writer`의 `storage\core.sqlite`를 **readOnly**로 조회한다.
- 대상 `api_history_snapshots_v1`과 `api_history_chunks_v1`의 최소 schema/행 개수·공급원 식별자만 확인한다. **API 요청, 원문 payload 확인, FRED 캐시 복제, DB 수정, D1 쓰기, 스케줄러 수정, 점수 계산 = 0**.
- 이 검사는 기존 R3-A의 Growth 숫자 parity를 반복하지 않고, R3-C에서 중요한 **raw chunk 구조/직접 BLS 원본 확인**만 확장한다.
- 이 테이블에 직접 BLS 원본이 안 보여도 **모든 PC DB에 없다는 의미는 아니다**. SQLite 테이블 중 후보만 메타로 나열하므로 최종 재사용 여부는 검사 결과 검토가 필요하다.

## 3. R3-C 운영 쓰기 전 추가 승인 필수 목록

| 항목 | 현 상태 |
| --- | --- |
| 직접 BLS 3종/통합 조회·공식 비교 방식 | **R3-B 승인** |
| 기존 직접 BLS 저장 경로/공통 원장 충분성 | **PC 사전검사 필요** |
| 최종 신규 PC table/column 및 멱등키 | **미승인** |
| 공식 수치 vs 파생 수치/수정본 저장·조회 계약 | **구현 전 제안 필요** |
| 최소 저장 기간(1년 YoY 차트/계절조정 변경 고려) | **기존 정책 유지, 변경 미승인** |
| 수동 1회 수집/PC SQLite 최초 쓰기 | **미승인** |
| 월/분기 자동 실행 일정과 기존 운영 스케줄러 영향 | **미승인** |
| R3-D 오프라인 계산 / R4–R6 공개·배포 | **미승인** |

이 단계의 검사 TXT를 받은 뒤, **기존 PC 원장에 안전하게 직접 BLS 데이터를 저장할 수 있는지**를 먼저 판정하고, 저장 방식 변경안을 사용자에게 제출한다. 기존 E1-R4 산식·Growth 산식·12대 실적 B·D1·main·Production 모두 변경하지 않는다.

## 4. 공식 근거

- BLS API 요청 수와 시리즈 일괄 조회: https://www.bls.gov/developers/api_FAQs.htm ; https://www.bls.gov/developers/api_signature_v2.htm
- BLS 공식 통계 재이용과 데이터 출처 고지: https://www.bls.gov/opub/copyright-information.htm ; https://www.bls.gov/developers/termsOfService.htm
- PPI 수정 주기와 계절조정: https://www.bls.gov/ppi/faqs/questions-and-answers.htm
- FRED API 저장/캐시 제한: https://fred.stlouisfed.org/legal/terms/
