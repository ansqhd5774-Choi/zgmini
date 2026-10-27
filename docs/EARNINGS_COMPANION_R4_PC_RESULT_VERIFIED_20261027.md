# 실적 침체 정보성 C — R4 1차 PC 실측 결과 검증

- 검증일: 2026-10-27 KST
- 저장소/유일한 작업 브랜치: `ansqhd5774-Choi/zgmini` / `codex/earnings-api-site-integration-plan-r1-20261026`
- 실행 코드: R4 1차 `08801e7edfb1d1b593ad0076548c1dfa337e94db`
- 사용자 PC 제출 근거: `EARNINGS_R4_C_READ_MODEL_PREVIEW_RESULT_20261027-061308Z.txt`, 동일 stem `.json`
- 검증 판정: **PASS_R4_PC_LOCAL_READ_MODEL_VERIFIED**
- 한계: **로컬 JSON/TXT 미리보기 검증. Cloudflare/D1/공개 API/UI 배포 승인 또는 검증 아님.**

## 1. 원본 저장 계보

| 항목 | 제출·대조 결과 |
| --- | --- |
| PC 결과 | `PASS_R4_LOCAL_PREVIEW_READY` |
| R3D 재검증 | `PASS_R3D_STORED_ONLY_CALCULATION` |
| BLS snapshot SHA 검증 | 3/3 PASS |
| response cohort | 2026-10-26T17:02:53.996Z 동일, 새 불완전 cohort 없음 |
| snapshot/chunk 원본 관측수 | WPSFD4=21, WPSFD41=21, PRS85006111=6 |
| 누락 기간(저장 원본 전체) | 0, 0, 0 |
| `sourceVersion` | `d7db335939bbdf07272f2467f8ad8239b01304727174ee606bc2db23324bb2af` |
| `sourceStoredAt` | `1793034173996` = 2026-10-26T17:02:53.996Z, 실제 3종 `first_seen_at` 일치 |
| 생성 시각 | `2026-10-27T06:13:08.700Z` (`generatedAt`, 신선도 근거로 재사용 금지) |
| 시계열 해석 | `CURRENT_RETRIEVAL_NOT_PIT` (역사적 실제 발표 당시 vintage 아님) |
| 로컬 출력 | JSON + TXT, 추가 API 0, SQLite/D1 쓰기 0 |

세 원본의 snapshot SHA:

- `WPSFD4`: `66ce1d9b07e17a1e81d301a96a1d9188d49539c14f5d698571d2ad8547d386a7`
- `WPSFD41`: `eb6da69b83c67c9771f26395de5eb13cbbd7d2154707fe9e53d2bb5caf9e54fb`
- `PRS85006111`: `4399164b8679f259229dd5a16c974945a9cde0222ed903465e10578671351390`

제출 JSON과 TXT 외에 `schemaVersion`, 정렬된 3개 `seriesId|snapshotSha256`를 직접 SHA256으로 재계산해 `sourceVersion` **일치 PASS**. JSON 내 각 행의 이전값/변화량, history의 기간·실측 개수·마지막 값, 발표일 null, 유효 상태를 독립 재검산해 **PASS**.

## 2. 정보성 행 5개, 실측값

| 지표 | 관측기간 | 실측 최근 값 | 이전 관측값 | 변화 | 1년 이력 |
| --- | --- | ---: | ---: | ---: | ---: |
| 최종수요 PPI YoY (월간 SA 지수 파생) | 2026-09 | 6.346301041632008% | 5.581709938591151% | +0.764591103040857%p | **9/13** |
| 최종수요 PPI 지수 (SA 원본) | 2026-09 | 159.780 | 157.662 | +2.118 지수포인트 | 13/13 |
| 재화 PPI YoY (월간 SA 지수 파생) | 2026-09 | 9.772194010372637% | 7.627868361597301% | +2.144325648775336%p | **9/13** |
| 재화 PPI 지수 (SA 원본) | 2026-09 | 162.341 | 158.157 | +4.184 지수포인트 | 13/13 |
| 비농업 단위노동비용 YoY (원본) | 2026-Q2 | 1.4% | 0.4% | +1.0%p | 5/5 |

기술 판정: `configured=5`, `ready=5`, `partial=0`, `unavailable=0`.

- PPI YoY 9개는 2026-01부터 2026-09까지 실제 index[t]와 index[t−12] 비교쌍을 갖춘 값만 계산했다. 1년 창의 2025-09..12에는 필요한 2024년 비교 원본이 없어 `null` 4개를 유지했다. **최근 수치 READY와 차트 historyCoverage 불완전은 양립한다.**
- PPI 원본 지수와 해당 YoY 파생값은 동일 원천을 공유한다. 다섯 행을 독립적인 5개 경제증거라고 간주하거나 합산하지 않는다.
- 소수 부동소수점 표현의 작은 잔차(`2.117999999999995`, `0.9999999999999999` 등)는 JSON 내부 계산 정밀도에 따른 것이며 사이트 R5에서 표시할 때만 단위별 반올림한다. **원본값·내부 산식은 변경하지 않는다.**
- 자료에서 확인되지 않는 `releaseDate`, `nextReleaseDate`는 전 행 `null`이다. 관측일과 취득시각을 혼동하지 않는다.

## 3. 단계 통과와 다음 승인 경계

| Gate | 결과 |
| --- | --- |
| R3D 원본 계보 → R4 1차 read-model 독립 대조 | **PASS** |
| 3개 원본 / 5개 정보성 행 / 결측·단위 보존 | **PASS** |
| PC 로컬 JSON/TXT 생성 | **PASS** |
| Cloudflare D1 신규 공개 snapshot 키·validator·GET reader·writer | **NOT_IMPLEMENTED / 승인 필요** |
| 월간/분기별 공용 freshness/TTL 합의 | **미확정** |
| R5 별도 UI·메인 점수와 격리 | **NOT_IMPLEMENTED / 승인 필요** |
| R6 배포·주기 자동수집·D1 readback | **NOT_IMPLEMENTED / 승인 필요** |

**권장 다음 작업:** R4 2차의 D1/Worker/PC 게시 경로는 기존 public projection key whitelist·sourceVersion/sourceStoredAt 엄격성·발표주기별 freshness를 따로 설계 검증하고, 사용자 별도 승인을 받은 뒤 구현한다. 현재 R4 PASS를 웹페이지에 공개되었다고 보고하지 않는다.
