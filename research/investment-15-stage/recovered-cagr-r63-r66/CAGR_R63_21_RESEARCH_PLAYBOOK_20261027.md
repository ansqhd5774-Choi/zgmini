# ZGMINI 산업·테마 성장률 조사 R63 — 21건 병렬 실행·원문 검증 운영 기준

- 확정 기록: 2026-10-27 KST
- 적용 범위: 산업 11개 + 테마 10개 = 총 21개 주제의 시장조사기관 CAGR 조사
- 전제: 본 문서는 **연구 실행 기준과 Evidence**만 정한다. GICS 섹터 산식·시장 심리지표·D1·배포·PC 스케줄러 변경을 승인하지 않는다.
- 기준 소스: `ansqhd5774-Choi/zgmini` GitHub 최신 `main` 및 사용자 승인 연구 계약. 주제별 구버전 로그와 원문 Evidence 보존.

## 1. 작업 결과의 정확한 의미

R63은 **21개 주제를 동시에 착수**하고 공식 발행사 HTTP GET 최대 4개 동시 실행으로 60개 보고서를 가져온 연구 실행이다.

| 항목 | 확인된 상태 |
|---|---:|
| 연구 주제 | 21/21 동시 착수·종료 |
| 전체 매체 칸 | 63 = 21×3 |
| 적합한 공식 보고서 선정 | 60 |
| 첫 번째 실시간 원문 HTTP GET 성공 | 60/60 |
| 수치 + 전망 기간 + 보고서 범위 검증 | 58/63 |
| 미확정 | 5/63 = 공식 보고서 미선정 3 + 원문 내부 충돌 2 |
| R63 이전 최초 확인 | 52/63 |
| 본 차수에서 복구한 보류 칸 | 6 |
| PC Ollama 검증 | **0 — 이 실행 환경에서 연결 불가** |
| R63 시차 반복 측정 | **미실시 — 실시간 원문 한 차수만** |
| GICS 섹터 확정 CAGR 산출·배포 | **0 — 연구 데이터와 구분** |

**절대 금지:** 58건 검증을 ‘21개 섹터·테마 통합 CAGR 확정’ 또는 ‘PC Ollama까지 검증 PASS’로 표현하지 않는다.

## 2. 수집 출처와 실행 경계

1. 사용 출처: The Business Research Company(TBRC), SkyQuest, Precedence Research. Business Research Insights(BRI)는 해당 조사에서 사용자가 제외하였으므로 요청하지 않는다.
2. 공식 출처는 확인된 `https` 호스트와 보고서 URL 경로로만 이동한다. 보고서 인덱스·타 출처로의 redirect는 거부한다.
3. 주제 단위는 `Promise.all(21 topics)`으로 함께 시작한다. 공식 출처 GET은 네트워크 최대 동시 4개 제한으로 발행사에 부담을 줄인다. **‘21개 주제 동시 착수’와 ‘외부 GET 21개 동시 연결’은 다르다.**
4. 401/403/429 응답 시 해당 출처 반복 공격·차단 우회·무제한 재시도 금지. `SOURCE_BLOCKED`로 남긴다.
5. 실제 원문을 이번 실행에서 다시 취득해야 수치를 승인한다. 과거 R59/R60/R61/R62 JSON은 비교·회귀 진단용일 뿐, R63 실시간 수치 대체 소스가 아니다.
6. `URL`, `시장 범위`, `원문 수집 UTC`, `원문 SHA256`, `문서 표제`, `발행사`, `성장률`, `전망 기간`, `인용 문맥`, `판정 상태`를 각 칸에 기록한다.
7. 유료 서비스·PC 운영·GitHub main·D1·Cloudflare·배포에는 어떤 write도 하지 않는다.

## 3. 성장률 추출 원칙

### 3-1. 공통 우선순위

- 목표는 **global / worldwide 전체 보고서 시장의 미래 전망 CAGR**이다. 지역(미국 포함), 과거 기간, 부분 세그먼트, 최고 성장 하위시장의 CAGR은 제외한다.
- `NULL`, 실제 0%, 미수집, 아직 미선정은 완전히 다른 상태다.
- 전망 기간은 원문에서 직접 확인한다. 제목·표·본문 기간이 충돌하면 계산으로 단정하지 않는다.
- 발행사 본문의 수치·전망 기간이 검증된 경우에도 해당 수치를 GICS 전체 섹터 값으로 자동 승격하지 않는다.
- CAGR 계산 확인식: `100 * ((future_value / base_value) ** (1 / (future_year - base_year)) - 1)`. 유사 범위 반올림의 검증 오차 범위 내에서만 통과를 검토하며, 계산으로 원문 충돌을 덮지 않는다.

### 3-2. TBRC 전용

- `What Is The ... Market Growth Forecast?`의 **미래** 전망 본문에서 CAGR을 고른다. 직전 2025→2026년 역사적 성장률을 미래 예측치로 사용하지 않는다.
- 실제 시장 규모·기간·메타데이터 세 요소의 부합 여부를 감사한다. 과거 CAGR이 메타데이터 미래 항목에 재사용됐음을 과거 규모 산식으로 **독립 입증**할 때만 `RESOLVED_HISTORIC_RATE_MISLABEL`로 구분한다.
- 유틸리티 R57 예외: 공식 본문과 2026→2030 규모 산식은 6.1%를 뒷받침하나 표에 2035년 종점과 과거 CAGR 5.5%가 섞인다. 별도 입증 후 `NARRATIVE_VERIFIED_METADATA_CONFLICT`로 기록하고 편집 오류 표시를 지우지 않는다.

### 3-3. SkyQuest 전용

- 먼저 `Global <market> Market` 본문의 미래 CAGR와 기간을 확인한다.
- 그 형태가 누락되었을 때만 **`Region: Global`** 메타데이터 + `Market Insights`의 동일 시장 이름 + `market size was valued` 후 `growing at a CAGR ... forecast period (2026–2033)`를 조합해 검증한다.
- `&ndash;`·`&mdash;` 등의 HTML 엔티티와 긴 대시를 정규화한다. 엔티티 때문에 기간 파싱이 실패한 것을 ‘수치 없음’으로 판정하지 않는다.
- 자율주행 원문 표제 `Autonomous/Self Driving Vehicle Market`은 정확히 해당 주제에 대해서만 동의어로 인정한다. 무관 시장으로 확대 적용하지 않는다.
- `Region: Global`이 없거나 하위 지역 문장이라면 후보를 채택하지 않는다.

### 3-4. Precedence 전용

- `global <market> market`의 보고서 단위 미래 CAGR와 근접한 전망 기간을 확인한다. 2026→2035년이 일반적이지만 사전 가정으로 채우지 않는다.
- 복수 글로벌 수치가 상충하면 자동 평균·선택 금지. 예: 병원서비스 5.84%와 5.99% → `GLOBAL_CAGR_CONFLICT`.
- 같은 46.31%가 2025→2034 및 2026→2034에 붙는 핀테크 원문 → `GLOBAL_RATE_CONFIRMED_PERIOD_CONFLICT`. **비율 일치만으로 기간을 확정하지 않는다.**
- 위성 원문: `What is the Satellite Market Size?`의 주시장 7.97%(2026→2035)를 특정하고, `What is the U.S. Satellite Market Size?` 하위 절에서 나타나는 8.24%를 **별도 문맥**으로 분리한다. 이 하위 절에 'global'이라는 잘못된 단어가 포함된 충돌 사실을 반드시 주석에 남긴다.
- 사이버보안은 글로벌 12.37%와 미국 12.97%를 구분해야 한다. 지역 CAGR를 글로벌값으로 승격하지 않는다.

## 4. 대상 시장 일치성·평균 계산 제한

조사기관의 CAGR 전망치 차이는 즉시 오류가 아니다. 다만 서로 **동일한 정의의 시장**에 대한 전망인지 먼저 확인해야 평균을 해석할 수 있다.

- ① GICS 정보기술 vs IT 서비스, ② GICS 커뮤니케이션 서비스 vs 통신, ③ 임의소비재 vs 승용차, ④ 산업재 vs 산업기계/공작기계, ⑤ 금융 vs 소매금융, ⑥ 유틸리티 vs 송배전, ⑦ 헬스케어 vs 병원서비스 등은 비교 대상이 다르다.
- ⑨ 에너지 vs 석유·가스, ⑩ 필수소비재 vs staple food/FMCG, ⑫ 로봇·자동화 vs 로봇·로봇기술, ⑮ 원전·SMR vs 원자로/원전 건설/원자력 발전, ⑯ 방산 vs 방산 전자장비, ⑰ 핀테크 vs 핀테크 블록체인, ⑲ 바이오·신약 vs 바이오 서비스, ⑳ 데이터센터·전력 vs 데이터센터, ㉑ 우주·위성 vs 위성 시장을 명확히 표시한다.
- 동일 시장명이더라도 시장 크기/기준 연도/미래 연도가 크게 다르면 `COMPARABILITY_REVIEW`로 보류한다. 발행사별 서로 다른 미래 구간(2026–2030/2033/2035)을 단순 동일 척도로 가정하지 않는다.
- 사용자 승인 목적은 다양한 독립 보고서 전망치의 평균 비교이지만, **분모가 되는 시장 정의가 다르면 평균은 목표 주제 CAGR이 아니다.** 동일 시장 그룹, 전망 기간 차이, 지역, 신뢰도를 확인하고 별도 승인된 집계 단계에서만 산출한다.

## 5. 최종 오류 분류 및 복구 절차

### 실시간 R63에서 해결한 6개

| 번호/매체 | 실패 원인 | 조치·결과 |
|---|---|---|
| ② SkyQuest | 글로벌 문단 형식·기간 HTML 엔티티 | 6.20%, 2026–2033 검증 |
| ⑤ SkyQuest | Region Global 별도 메타데이터 | 6.70%, 2026–2033 검증 |
| ⑥ TBRC | 과거 CAGR + 미래 메타데이터 종점 오기 | 6.10%, 2026–2030 본문·규모 산식 검증, 충돌 표시 유지 |
| ⑭ SkyQuest | 자율주행 표제의 Self Driving 동의어 | 29.70%, 2026–2033 검증 |
| ⑳ SkyQuest | 글로벌 문단 양식 차이 | 11.51%, 2026–2033 검증 |
| ㉑ Precedence | 글로벌 본문과 미국 하위 절의 ‘global’ 단어 혼선 | 7.97%, 2026–2035 글로벌 본문만 채택, 충돌 표시 유지 |

### 여전히 미확정인 5개

| 번호/매체 | 사유 | 안전한 다음 작업 |
|---|---|---|
| ① 정보기술 / Precedence | 같은 전체 시장의 공식 보고서 미선정 | 시장 범위가 맞는 신규 원문 탐색. 부분시장으로 대체 금지 |
| ⑦ 헬스케어 / Precedence | 글로벌 5.84% vs 5.99% | 원문 정정·규모 일관성을 별도 감사. 확정 전 NULL |
| ⑨ 에너지 / Precedence | 동등한 석유·가스 시장 보고서 미선정 | 공식 글로벌 보고서 재발견 전 NULL |
| ⑩ 필수소비재 / Precedence | FMCG와 동등한 보고서 미선정 | 공식 보고서 범위 확인 전 NULL |
| ⑰ 핀테크 / Precedence | 46.31% 전망 기간 불일치 | 2025–2034 vs 2026–2034 정정 확인 전 NULL |

## 6. 동일 실패의 재발 방지 테스트

필수 자동 시험 항목:

1. 21개 주제 인덱스가 정확히 1–21이고 매체 중복이 없음.
2. 최대 63칸 중 각 칸은 매체 1개·URL 최대 1개를 갖고 미선정은 명시적 NULL.
3. SkyQuest 글로벌 메타데이터가 없으면 opening paragraph의 수치를 사용하지 않음.
4. HTML 엔티티로 표시된 전망 기간을 정상적으로 정규화함.
5. 자율주행 특수 표제는 주제 14에만 인정됨.
6. 미국 하위 절 수치를 글로벌 위성 CAGR로 오인하지 않고 충돌 문구를 남김.
7. 핀테크의 46.31% 기간 충돌은 비율 동일에도 확정으로 승격하지 않음.
8. TBRC 유틸리티 메타데이터 충돌은 과거·미래 규모/기간/증가율을 검산하지 못하면 보류함.
9. 저장된 과거 JSON 값만으로 수집 성공이나 최신 수치를 생성하지 않음.
10. 실제 네트워크 GET·모델 교차검증·반복 측정·Git 반영·운영 배포의 완료 여부를 각각 별도 상태로 기록함.

## 7. 후속 PC Ollama 단계 (R63에서 미실행)

- 기존 PC 기준 `gemma3:4b`와 승인된 CMD/Node 실행 경로를 실제 확인한다. 이 채팅 환경에서 PC Ollama가 보이지 않는다고 PC writer 자체가 OFFLINE인 것은 아니다.
- 공식 GET과 후보 추출은 전체 주제를 함께 시작하되, 모델 선택 요청은 공유한 단일 직렬 큐로 실행해 과부하를 방지한다.
- 모델은 **출처에서 검증된 global CAGR 후보** 중 `candidate_id`와 scope를 교차 점검할 뿐, 숫자를 새로 제안하거나 이미 검증된 원문 수치를 덮어쓰지 못한다.
- 워밍업 1회 + 실측 3회 반복·각 원문 SHA·선택 값·기간·모델 scope를 비교하고, source/model 각각 안정성을 별도로 보고한다.
- 이 단계의 실행 전에는 `OLLAMA_RUNS=0`, `THREE_MEASURED_RUNS=NOT_EXECUTED`로 남긴다. 미래 작업을 이미 완료한 것으로 작성 금지.

## 8. 원문·결과와 변경 범위

- R63 연구 표: `docs/research/CAGR_R63_21_SOURCE_MATRIX_20261027.md`.
- 실행용 전체 보존본: `ZGMINI_R63_21_PARALLEL_OFFICIAL_20261027.zip` (R63 최종 Library 보관). 개별 PC 테스트 코드는 이 문서가 아니라 해당 번들에 있다.
- 공식 출처 대표 링크: [TBRC Utilities](https://www.thebusinessresearchcompany.com/report/utilities-global-market-report), [SkyQuest Advanced Materials](https://www.skyquestt.com/report/advanced-materials-market), [Precedence Hospital Services](https://www.precedenceresearch.com/hospital-services-market), [Precedence Fintech Blockchain](https://www.precedenceresearch.com/fintech-blockchain-market), [Precedence Satellite](https://www.precedenceresearch.com/satellite-market).
- 본 브랜치 반영은 **문서·연구 Evidence 전용**이다. GitHub main 병합, PC 설치, 21건 Ollama 재실행, 사이트 배포, DB·산식 변경은 포함하지 않는다.
