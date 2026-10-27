# Earnings Companion 정보성 C — R3-D PC 검증 결과

- 검증일: 2026-10-27 KST
- 검증 출처: 사용자 PC에서 생성한 `EARNINGS_R3D_STORED_BLS_CALC_RESULT_20261026-182033Z.txt`
- 검증기 구현 커밋: `23a09c5457fa6d2d0510bfba651deb856342b753`
- 유일 작업 브랜치: `codex/earnings-api-site-integration-plan-r1-20261026`
- 결론: **PASS_R3D_STORED_ONLY_CALCULATION**. 정보성 C 원본 계산 검증 완료. R4/R5 미승인.

## 1. 실제 PC 판정

| 저장 출처 | 관측기간 | 관측 개수 | 결측 | 최신 값 | 전년 대비 | 유효 YoY 쌍 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| BLS/WPSFD4 최종수요 계절조정 PPI | 2025-01 ~ 2026-09 | 21 | 0 | 지수 159.780 | **+6.346301% (자체 파생)** | 9 |
| BLS/WPSFD41 최종수요 재화 계절조정 PPI | 2025-01 ~ 2026-09 | 21 | 0 | 지수 162.341 | **+9.772194% (자체 파생)** | 9 |
| BLS/PRS85006111 비농업 단위노동비용 | 2025-Q1 ~ 2026-Q2 | 6 | 0 | +1.4% | **+1.4% (공식 API 원본 YoY)** | 해당 없음 |

- `SNAPSHOTS_HASH_VERIFIED=3`, 세 계열의 snapshot/content hash 모두 `YES`.
- `DATA_COHORT_CONSISTENT=YES`, `NEWER_INCOMPLETE_COHORT=NO`.
- 저장 원본 BLS 응답 조회시각 UTC: `2026-10-26T17:02:53.996Z`.
- 검증기 실행시각 UTC: `2026-10-26T18:20:33.046Z`.
- `API_REQUESTS=0`, `SQLITE_WRITES=0`, `D1_WRITES=0`.
- `RAW_UNMODIFIED=YES`, `EXISTING_SCORE_UNMODIFIED=YES`, `SCHEDULER_CHANGED=NO`.
- `REVISIONS=UNDETERMINED_NO_OFFICIAL_VINTAGE`: 공식 개정 횟수·실제 데이터 vintage는 추정하지 않는다. 저장 snapshot은 각 1건이다.

## 2. 독립 공개자료 대조 (정확히 같은 개념인 경우만 비교)

| 항목 | PC 계산 | BLS 2026년 공식 발표 | 결론 |
| --- | ---: | ---: | --- |
| 9월 최종수요 PPI 전년 대비 | 계절조정 지수로 자체 계산 **6.346301%** | 비계절조정 공식 YoY **6.3%** | 1자리 반올림 수치 일치. **계절조정 여부가 달라 동일계열 직접 검증 아님** |
| 9월 최종수요 재화 PPI 전년 대비 | 계절조정 지수로 자체 계산 **9.772194%** | 비계절조정 공식 YoY **9.8%** | 1자리 반올림 수치 일치. **계절조정 여부가 달라 동일계열 직접 검증 아님** |
| 2026-Q2 비농업 단위노동비용 전년 동분기 대비 | **1.4%** (API 원본) | **1.4%** (공식 발표) | 동일 정의의 원시 값 일치 |

공식 근거:
- 미국 노동통계국 2026-10-15 PPI 발표: https://www.bls.gov/news.release/archives/ppi_10152026.htm
- 미국 노동통계국 2026년 2분기 생산성/비용 개정치: https://www.bls.gov/news.release/prod2.t02.htm
- API 원본 year/period/value 정의: https://www.bls.gov/developers/api_signature_v2.htm

## 3. 범위 확정 및 다음 승인 단계

- R3-D는 저장된 BLS 3종만 대상으로 한 **정보성 C read-only 검증** 단계로 종료한다.
- 현재 자료만으로 게시용 read-model, 정책적 점수 또는 종합 실적 침체 점수를 만들었다고 주장하지 않는다.
- 독립 정보성 C의 지표별 표시 구조 및 기존 공개 항목과의 역할 분리(R4 설계)가 다음 승인 대상이다.
- 신규 BLS 호출·PC SQLite 쓰기·DB 스키마·TTL·스케줄러·기존 E1-R4/E1-R5 계산·D1·사이트·main 수정은 **없음**.
