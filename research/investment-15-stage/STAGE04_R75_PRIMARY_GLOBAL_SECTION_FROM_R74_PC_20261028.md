# R75 — 공식 전체시장 본문 분리 및 기간 충돌 검산

기준일: 2026-10-28 KST  
고정 저장소/브랜치: `ansqhd5774-Choi/zgmini` / `codex/investment-15-stage-m2-r25-20261025`

## 이번 사용자 PC R74 실행 결과

- `RUN_STATE=COMPLETED`, Node v24.19.0, 5/5 주제 완료, 치명 오류 0. 이는 성장률 확보 완료와 다르다.
- 독립 매체 2곳 통과 평균: **0/5**. TBRC 유효 2/5, SkyQuest 유효 1/5, Precedence 유효 0/5.
- Precedence `data center`: 공식 원문 취득 및 모델 선택까지 성공했으나 `SOURCE_FORECAST_VALUES_DISAGREE`로 NULL. R74의 `h1→첫 h2` 접근은 첫 h2가 목차일 때 전체 본문으로 되돌아가 미국 지역값을 전체시장값과 비교했다.
- Precedence `nuclear reactor`: 모델은 실행됐지만 도입부의 CAGR 발췌 안에 직접 표시된 기간을 못 찾아 NULL. 공식 본문에는 전망기간 표기 불일치가 있으므로 숫자만 채워 넣지 않는다.
- 대부분의 나머지 후보 공식 주소는 외부 경로 리디렉션으로 검증 불가. 보안상 해당 리디렉션은 통과시키지 않는다.

## 코드 수정

1. `primaryWholeMarketEvidence(html, keyword)`는 첫 `h2`를 무조건 신뢰하지 않고, 키워드와 전체 시장의 `Market Size/Forecast/Growth/Outlook`가 일치하는 **첫 본문 구획**을 찾는다. `Regional`, `U.S.`, 세부 구성요소 등은 제외한다.
2. 이 구획에서 공식 CAGR 문구를 찾으면 **그 구획만** Ollama 후보로 전달한다. 목차 때문에 CAGR 없는 도입부를 만나도 지역별 CAGR을 포함한 전체 페이지를 바로 비교하지 않는다.
3. CAGR 근처의 숫자와 함께 쓰인 `from USD … in 2026 to USD … by 2034`처럼 **원문에 명시된 시장규모 기준 연도쌍**도 전망기간으로 추출한다. 수치 역산이나 추정 연도 생성은 하지 않는다.
4. 동일 보고서의 도입부와 전체시장 본문이 서로 다른 미래기간·전체시장 CAGR을 명시하면 `SOURCE_CONFLICT`/NULL. 시장의 다른 지역 CAGR은 동일 전체시장 후보 간의 충돌로 취급하지 않는다.
5. 출력에 `evidence_region=PRIMARY_WHOLE_MARKET_SECTION` 등을 기록해 후보가 어디서 왔는지 추적한다. 결과 파일은 기존 R72 이름으로 계속 생성되며 JSON에는 `publisher_adapter_revision=R75_PRIMARY_GLOBAL_MARKET_SECTION`가 표기된다.

## 검증과 경계

- 실행 코드 Node 모의 테스트 **33/33 PASS**: R70 9, 발행사 어댑터 18, 실행기 3, 안전 실행기 3.
- **공식 Precedence 공개 HTML 2건을 직접 취득한 별도 오프라인 재현**: 데이터센터 본문 글로벌 후보만 Ollama 선택 입력에 남아 `PASS` 판정 경로 확인, 핵 원자로 문서의 전망기간 모순은 `SOURCE_CONFLICT`로 검출. 이 재현의 Ollama 선택은 모의 함수이며 **사용자 PC Ollama 실측을 의미하지 않는다**.
- 사용자 PC의 **R75 실전 실행 결과와 2개 출처 평균 성공 여부는 아직 미확인**이다. R75 전체 ZIP을 같은 폴더에 압축 해제하고 `STAGE04_OLLAMA_R72_RUN_AND_DIAGNOSE.cmd`를 실행한다.
- 모든 CAGR은 실행 시 지정 매체 원문을 재조회한다. 수동 수치 보정, 과거 JSON 현재값 투입, 투자 G/D/M 점수/운영 ZGMINI/주문/메인 브랜치 변경은 0건.
