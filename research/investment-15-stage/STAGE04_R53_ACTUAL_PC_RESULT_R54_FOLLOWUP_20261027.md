# Stage04 R53 PC 실측 판정과 R54 조치 (2026-10-27)

## PC 결과 요약

사용자 제공 `R53_TOPIC03_04_PARALLEL_RESULT.txt/.json/_HISTORY.ndjson` 원본 기준. 연구·측정 로그이며 운영 반영이 아니다.

| 항목 | ③ 임의소비재(경기소비재) | ④ 산업재 |
|---|---|---|
| 실제 병렬 진입 | YES | YES |
| 워밍업 소요 | 13,483ms | 7,252ms |
| 3회 측정 | 5,274 / 4,165 / 4,112ms | 5,593 / 6,151 / 5,419ms |
| 중앙값 | 4,165ms | 5,593ms |
| 최대 편차 / 기준 25% | 26.6% / 미달 | 10.0% / 통과 |
| 매체별 3회 결과 | TBRC·SkyQuest·Precedence 모두 미발견, 상태 재현 | TBRC 6.9%, SkyQuest 4.2% 재현; Precedence 미발견 |
| 판정 | `UNSTABLE_DIAGNOSTIC_SPEED` | `PARTIAL_RESEARCH_REVIEW_REQUIRED` |
| GICS 섹터 전체 CAGR | NULL | NULL |

- 워밍업을 포함한 각 라운드의 ③·④ **동시 실행 겹침**: 7,253 / 5,272 / 4,164 / 4,111ms.
- 사용자 제외 BRI HTTP 요청 **0건**. 로컬 Ollama 단일 공유 큐 유지. 코드·DB·스케줄러·산식·자동배포 변경 없음.
- ④의 6.9%(TBRC, 2026–2030), 4.2%(SkyQuest, 2026–2033)는 **산업기계 시장 대용 자료**. 실제 페이지에서 재추출되고 기간이 다르며, 전체 산업재 연평균 성장률은 아니다. SkyQuest는 R53에서 `NOT_AUDITED`로 표기됨.
- ③의 `NO_REPORT_DISCOVERED`는 **없는 자료가 아니다**. Google 검색 응답은 `JS_REQUIRED`, Bing은 추출 링크 0, 공식 목록도 해당 링크 0으로 나왔다. 자동 링크 발견 실패를 보고서 부재와 구분해야 한다.
- ④도 자동 신규 보고서 링크 0건으로, R35의 기존 URL 2개만 조회했다.
- 원본 TXT 시작에 `STATUS=RUNNING`이 남아도 맨 끝의 `STATUS=FINISHED_RESEARCH_ONLY` 및 완성 JSON을 최종 상태로 본다.

## 보완: R54 공식 출판사 URL 재관측

R53 병렬 처리 구조는 유지하고, 공개 원문 페이지가 확인된 출판사 URL만 정적 앵커로 추가한다. 수치는 하드코딩하지 않고 매 실행 시 PC가 원문을 GET하여 재추출·검산한다. JS 검색엔진의 0-result 경로는 이번 실험에서 생략하지만 신규 자동 검색 기능이 복구됐다고 주장하지 않는다.

| 주제 | TBRC | SkyQuest | Precedence |
|---|---|---|---|
| ③ 경기소비재(승용차 하위시장) | `passenger-car-global-market-report` | `passenger-cars-market` | `passenger-cars-market` |
| ④ 산업재 | `industrial-machinery-global-market-report` | `industrial-machinery-market` | `machine-tools-market` |

- ③ 승용차는 전체 경기소비재의 하위시장이다. 각 기관별 전망기간과 시장 가치 정의를 확인하기 전 평균하지 않는다.
- ④ 공작기계는 산업기계와도 범위가 같지 않을 수 있다. 기관이 다르다는 이유만으로 산식을 일괄 평균하지 않는다.
- TBRC 승용차 원문은 2026년 1,749.76 billion → 2030년 2,325.31 billion에 대해 본문 예측 CAGR **7.4%**를 제시하나, 하단 보고서 속성표에는 **6.4%**라는 다른 표기가 있어 본문·속성표 상충 가능성이 있다. R54 숫자 결과는 소스 감사 로그까지 검토한다.
- R54 또한 1회 워밍업+3회 반복, 주제별 HTTP 작업 병렬, Ollama 단일 공유 큐, BRI 차단 유지, 공개 운영 미반영.
- R54 추가 테스트 5건을 포함한 전체 7개 테스트 파일(정의된 테스트 총 58건) 로컬 통과.

## 판정

**병렬 동시성 검증 PASS, 산업재 속도 검증 PASS, 경기소비재 속도 검증 미달, 신규 자동 링크 발견 양쪽 모두 미달.** 즉 R53은 알고리즘과 작업분리 진전의 증거지만 섹터 성장률 확정 근거는 아니다. R54는 자동 링크 탐색의 재시도나 접근 제한 우회가 아닌 공식 보고서 URL 기반 재측정이다.
