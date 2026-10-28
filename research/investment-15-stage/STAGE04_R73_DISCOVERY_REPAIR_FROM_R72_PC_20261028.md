# R73 — R72 PC 실측을 근거로 공식 보고서 자동 탐색 복구

기준일: 2026-10-28 KST  
저장소: `ansqhd5774-Choi/zgmini`  
고정 브랜치: `codex/investment-15-stage-m2-r25-20261025`

## 사용자 R72 PC 실측 (입력 파일 2건, 실행 시각 2026-10-28 10:58 KST)

- `RUN_STATE=COMPLETED`, Node `v24.19.0`, 항목 5/5 실행, 치명 오류 없음. 연구 평균 가능 0/5.
- TBRC의 공식 출처 `CONSISTENT` 2개 PASS, 2개 `SOURCE_CONFLICT`, 1개 직접 대응 보고서 미발견. R30 기존 격리 기준을 그대로 보존한다.
- SkyQuest 5/5 `NO_VERIFIED_OFFICIAL_REPORT_DISCOVERED`. 다섯 주제 모두 실제 보고서 본문 요청 0회, 모델 호출 0회였다.
- Precedence는 네 주제에서 공식 직접 시장 보고서를 발견하지 못했고, `data center`에서는 `data-center-liquid-cooling-valves-market`라는 하위시장 후보까지 갔다. 전체 시장 CAGR로 사용되지 않아 유효 자료 0개였다.
- 원본 PC JSON·TXT는 브랜치에 복제하지 않고 상기 실행 집계·오류 유형만 기록한다. 수동 시장 성장률 조사나 과거 캐시값 대체를 하지 않는다.

## 수정 사항 — 소스 발견기만 개선

1. 공식 발행사 목록과 검색 HTML을 탐색하되, **해당 토큰이 들어 있는 하위시장 링크만 발견됐다는 이유로 추가 검색을 종료하지 않는다.** 직접시장 식별은 URL의 시장명 토큰 전체 일치로 판정한다.
2. 기존 R37에 도입되어 있는 **Bing RSS 공식 보고서 검색 패턴**을 복원하고, 이어서 Google·Bing HTML 순서로 탐색한다. 직접시장 공식 링크를 발견하면 나머지 검색은 생략한다. RSS·HTML 역시 출처 자료가 아니라 공식 URL 후보일 뿐이다.
3. 실행 시 주제명에서 정해진 형식으로 발행사 공식 URL을 생성해 조회한다. 이는 **미검증 URL 후보 생성**이며, 실제 공식 HTTPS GET·시장명 판정·원문 CAGR·전망기간·Ollama 선택이 모두 통과하기 전까지 성장률 값을 생성하지 않는다.
4. 공식 보고서 제목이 전체 주제와 일치하지 않고 더 좁은 하위시장인 경우에는 `SUBMARKET_OR_PROXY_REPORT_EXCLUDED`로 처리한다. 이는 지역/하위 품목의 CAGR이 전체 산업 평균으로 들어가는 것을 차단한다.
5. 다음 PC 결과에 `DISCOVERY`(카탈로그/RSS/검색 상태), 공식 URL 후보, 검색 요청 횟수·보고서 시도 횟수를 보존해 단계별 수집 실패를 확인한다. 기존 R72 결과 JSON/TXT 이름은 유지하되 `publisher_adapter_revision=R73_OFFICIAL_DISCOVERY_REPAIR`로 실행 버전을 구분한다.

## 검증 범위

- R70 평균·출처 게이트 9/9, R71/R73 발행사 자동화 14/14, R71 실행기 3/3, R72 결과 보존 3/3, 합계 **29/29 Node 모의검사 PASS**.
- 새 ZIP의 내부 파일 연결 검사와 압축 무결성 검사를 통과한 뒤 배포한다.
- **R73의 실제 Windows 수집 성공률은 아직 확인되지 않았다.** 사용자는 새 ZIP 전체 압축 해제 후 `STAGE04_OLLAMA_R72_RUN_AND_DIAGNOSE.cmd`를 실행하고 생성된 R72 JSON/TXT를 제출하면 된다.
- 기존 R30·R69 이력, 투자 산식·G/D/M 점수·주문·운영 사이트·D1·스케줄러는 변경하지 않는다.
