# ZGMINI R66 — 21개 산업·테마 CAGR 출처의 시장경계·기관 독립성 판정

- 조사 기준: **2026-10-27 KST** · 브랜치 연구 문서 전용 · 원본 R63/R64B/R65 변경 없음
- 조사 범위: **21개(산업 11 + 테마 10), 기존 원문 60건 + R65 신규 5건 = 공식 보고서 URL 65개**를 웹 검색서비스의 1차 발행사 페이지 `open`으로 다시 열어 확인. 시장 정의 발췌는 `find` 수행.
- 원본 63칸/확인된 미래 글로벌 CAGR 인용치 58개를 그대로 보존. 새로운 직접 HTTP GET·PC Ollama 실측·모델 3회 반복은 **0회**.
- **R66은 시장 비교가능성 판정 단계:** 성장률 평균, 신뢰도 재가중, GICS 섹터 합성 CAGR, 사이트·DB·산식 변경은 하지 않음.
- 수치 불일치는 그 자체로 보고서 배제 사유가 아님. 시장 구성, 가치분모, 지역, 전망 기간, 기관/원자료 중복 가능성을 구분.

## 1. 가장 중요한 결론

1. 발행사 브랜드는 TBRC·SkyQuest·Precedence·Global Growth Insights **4개**를 각 공식 About/Methodology 페이지에서 구분했다. 그러나 별도 도메인/발행사 표기만으로 **실제 계열·재판매·공통 원자료·예측모형의 통계적 독립성**이 증명된 것은 아니다.
2. GICS 공식 정의는 **상장기업의 업종 분류**다. IT 서비스·소매은행·승용차·SMR·FMCG 등 특정 시장의 매출 전망을 그대로 GICS 섹터 전체 성장률로 명명할 수 없다. [GICS 공식 정의](https://www.spglobal.com/spdji/en/landing/topic/gics/).
3. 세부 판정은 `CANDIDATE_SCOPE_OVERLAP` 10건, `DEFINITION_SPLIT` 8건, `VALUE_BASIS_CONFLICT` 3건이다. 이 판정은 **R64B A7/B11/C3 등급 자체를 변경하지 않는다**. 어느 부류도 자동으로 평균 편입 PASS는 아니다.
4. 특히 원자로 제조제품 vs 가치분모 미확정인 다른 SMR 보고서, 금융 블록체인 106.81배 규모 차이, 위성 제조 vs 통신·운용 수익은 **각각 분리**한다.

## 2. 조사기관별 출처 독립성 Gate

| 발행사 | 공식 자체 식별·조사 방식 | 발행 주체 식별 | 법인/원자료/예측모형 독립성 |
|---|---|---|---|
| [TBRC](https://www.thebusinessresearchcompany.com/about-the-business-research-company) | 자체 Global Market Model, 1차·2차 자료와 모델링 방법론 공표. [연구방법론](https://www.thebusinessresearchcompany.com/research-methodology) | 별도 브랜드·공식 발행사 확인 | **공개자료로 별도 정밀 검증 필요** |
| [SkyQuest](https://www.skyquestt.com/about-us) | 자체 시장조사·컨설팅 서비스. 개별 보고서에 시장 구분·보고서 ID/일부 방법론 표시 | 별도 브랜드·공식 발행사 확인 | **공개자료로 별도 정밀 검증 필요** |
| [Precedence Research](https://www.precedenceresearch.com/about-us?search=2025) | 자체 보고서·분석 서비스, 개별 보고서에 작성자/검토자 표시 | 별도 브랜드·공식 발행사 확인 | **공개자료로 별도 정밀 검증 필요** |
| [Global Growth Insights](https://www.globalgrowthinsights.com/aboutus) | 시장조사 보고서와 공개된 자료수집/연구 프로세스 | 별도 브랜드·공식 발행사 확인 | **공개자료로 별도 정밀 검증 필요** |

**Gate 해석:** 네 매체를 네 개의 *발행처*로 기록할 수 있으나, 서로 독립적인 원천모형 네 개라고 단정하거나 동일 데이터 재발행을 무조건 별도 표본으로 가중해서는 안 된다. 원문 보고서 출처/원천 데이터·재판매 여부 확인은 후속 Gate다.

## 3. 21개 시장 정의별 Gate

| # | 섹터/테마 (R64B 등급) | R66 분류 | 보고서간 주요 경계 / 남은 검증 |
|---:|---|---|---|
| 1 | 정보기술 (C) | 시장명·주력 범위 겹침(평균 보류) | 신규 TBRC IT 서비스는 HW 지원·소프트웨어/BPO·클라우드를 포함하며 SkyQuest는 IT 서비스 관리·컨설팅 중심이다. 2025 규모 1.80배 차이. IT HW·반도체 포함 GICS 정보기술 전체와는 별개다. |
| 2 | 커뮤니케이션 서비스 (B) | 포함 시장이 달라 보류 | TBRC 통신시장에는 전화기·방송 및 무선 통신장비 제조사 출고가와 회선서비스가 동시 포함된다. GICS Communication Services는 미디어·엔터테인먼트까지 포함한다. |
| 3 | 임의소비재 (A) | 시장명·주력 범위 겹침(평균 보류) | TBRC는 픽업트럭·미니밴도 포함하는 제조사 출고가. SkyQuest는 미니·컴팩트·SUV·럭셔리와 딜러/온라인 유통 분류. 차종·판매단계 매출을 통일해야 한다. |
| 4 | 산업재 (B) | 포함 시장이 달라 보류 | TBRC는 식품·반도체·제지·인쇄·섬유·플라스틱용 산업기계 전체의 제조사 출고가이고, Precedence는 공작기계 하위시장이다. |
| 5 | 금융 (A) | 시장명·주력 범위 겹침(평균 보류) | SkyQuest는 주로 개인·가계 금융과 NBFC를 분류하고 Precedence 정의는 개인 및 소기업 은행업무를 포함한다. 둘 다 소매금융 대분류이나 동일 수익 분모는 아직 불명확. |
| 6 | 유틸리티 (A) | 시장명·주력 범위 겹침(평균 보류) | 송배전 인프라·장비·관리 서비스가 포함되나 전력 판매 매출과 전력망 설비/서비스 매출을 분리해야 한다. Precedence는 요약 카드 기간 2026~2035, 본문·시장규모는 2026~2034 충돌. |
| 7 | 헬스케어 (B) | 포함 시장이 달라 보류 | TBRC는 의료·진단검사·치과·간호·정신건강 시설 등 의료서비스, Precedence는 병원서비스 하위시장. Precedence 글로벌 성장률 5.84/5.99 불일치 원장 보존. |
| 8 | 소재 (B) | 시장명·주력 범위 겹침(평균 보류) | TBRC 첨단소재는 나노소재·플루오로폴리머·웨어러블·유연 배터리 및 임플란트 등 제조출고가. Precedence는 CAGR 6.21/6.27 내부 충돌, 원문 수치를 임의 선택하지 않음. |
| 9 | 에너지 (B) | 시장명·주력 범위 겹침(평균 보류) | 동년 TBRC/SkyQuest 규모는 근접하지만 TBRC는 원유·천연가스·정제제품·아스팔트·윤활유·그리스의 제조사 출고가를 포함한다. 같은 가치사슬 범위인지는 미확인. |
| 10 | 필수소비재 (C) | 포함 시장이 달라 보류 | SkyQuest FMCG 제품군에는 신발·액세서리도 있으나 Global Growth Insights의 FMCG 구분은 식품·음료·개인관리·건강관리·홈케어. GICS 필수소비재 전체(유통업 포함)와도 다르다. CMI 4.1% 수학 충돌 계속 제외. |
| 11 | 부동산 (B) | 포함 시장이 달라 보류 | TBRC는 임대업·개발업·관리업·중개·감정 등 서비스 매출을 광범위하게 포함. 다른 기관의 거래액/부동산 가격을 같은 매출 분모로 취급할 근거 부족. |
| 12 | 로봇·자동화 (B) | 포함 시장이 달라 보류 | TBRC 로봇·자동화에는 시스템 통합, 컨설팅, 관리 서비스 및 산업·서비스 로봇 제조 매출 포함. SkyQuest는 산업/서비스/이동 로봇의 HW·SW·서비스 분할. 자동화 장비의 분모가 다를 수 있다. |
| 13 | 클라우드·SaaS (A) | 시장명·주력 범위 겹침(평균 보류) | 세 출처 모두 클라우드컴퓨팅이지만 TBRC는 DBaaS·FaaS·보안관리뿐 아니라 컴퓨팅 시스템·부품 판매를 포함. SaaS-only 성장률로 표시하면 오류. |
| 14 | 자율주행 (B) | 포함 시장이 달라 보류 | SkyQuest는 SAE 레벨1 운전자 보조~레벨5를 명시. TBRC는 완전·부분자율차량 제조사 출고가. Precedence는 TBRC 2026 규모 대비 3.53배로 범위 검증 선행. |
| 15 | 원전·SMR (C) | 시장가치 분모 충돌 | 신규 TBRC SMR은 원자로 모듈·제어계통·연료집합체 등 제조사 출고가. SkyQuest/Precedence SMR은 2025/2026 기반 8.17/8.16bn 규모지만 동일 연도 비교가 아니다. TBRC vs SkyQuest 2025 12.19배, TBRC vs Precedence 2026 9.71배. |
| 16 | 방산 (B) | 시장명·주력 범위 겹침(평균 보류) | TBRC 전체 방산은 항공·해상·육상 장비와 군용 위성·레이더를 포함해 제외. SkyQuest는 항공·해상·육상·우주 플랫폼별 전자전/통신/C4ISR/레이더 중심, Precedence 동명 후보. |
| 17 | 핀테크 (A) | 시장가치 분모 충돌 | TBRC+SkyQuest 금융 블록체인 플랫폼 하위시장은 후보. TBRC는 지갑 하드웨어·거래 플랫폼 매출도 일부 포함. Precedence는 2026 1.02조달러로 TBRC 2026 95.5억달러의 106.81배; 동일 시장이라고 인정 불가. |
| 18 | 사이버보안 (A) | 시장명·주력 범위 겹침(평균 보류) | 3발행사 모두 글로벌 사이버보안 제품·서비스 대분류. 그러나 관리보안(MSS)·하드웨어·클라우드 보안 묶음이 다를 수 있고 TBRC/SkyQuest 2025 규모 1.26배 차이. |
| 19 | 바이오·신약 (B) | 포함 시장이 달라 보류 | TBRC biotechnology services는 외부 바이오 연구·실험개발 서비스 매출. SkyQuest는 의료/농업/산업/환경 바이오기술 총시장, Precedence도 동명 총시장. 바이오 신약 개발만의 성장률과도 별개. |
| 20 | 데이터센터·전력 (A) | 시장명·주력 범위 겹침(평균 보류) | TBRC는 콜로케이션·하이퍼스케일·엣지의 HW/솔루션/서비스, SkyQuest·Precedence는 시설·서비스 등 다른 구성. TBRC/SkyQuest 동년 2025 규모 1.88배. 데이터센터 발전/전력 판매는 범위 밖. |
| 21 | 우주·위성 (B) | 시장가치 분모 충돌 | TBRC satellites는 위성 시스템/전력원 제조출고가와 보증기간 정비 서비스. SkyQuest는 통신·관측·항법·군수 응용, Precedence 2026 규모는 TBRC 2026 대비 14.79배여서 같은 시장가치로 병합 불가. |

### 보고서가 다르면 평균 전에 무엇을 통일해야 하나?

- **모집단:** 제품·서비스·구매자·GICS 산업/테마 전체인지 특정 하위시장인지
- **시장가치:** 공장도 출고가(factory-gate), 제조사 매출, 서비스 매출, 유통 최종판매액, 총거래액 중 무엇인지
- **기간:** 2026–2030 / 2026–2033 / 2026–2035 등 전망 구간을 유지해서 공개; 기간이 다르다는 이유만으로 CAGR 폐기하거나 동일한 기간 예측치처럼 명명하지 않기
- **기관:** 발행처 이름 4개 확인과 예측 데이터 독립 검증을 구분. 통상 매체간 숫자 차이는 정상적인 전망 오차이며 자동 실패 아님
- **수치 기준:** 2025 vs 2025, 2026 vs 2026만 같은 기준년 규모 비교. 전년·다음해 숫자를 단순 대조해 동등성 PASS 주지 않기

## 4. 이번 R66에서 추가로 드러난 주의 신호

1. **승용차:** [TBRC](https://www.thebusinessresearchcompany.com/report/passenger-car-global-market-report)는 픽업트럭과 미니밴도 포함한 공장도 가격; [SkyQuest](https://www.skyquestt.com/report/passenger-cars-market)는 차종과 딜러/온라인 유통 차원을 표기한다. 같은 이름이라도 매출 단계가 아직 맞지 않는다.
2. **필수소비재:** [SkyQuest FMCG](https://www.skyquestt.com/report/fmcg-market) 구분에는 신발·액세서리가 포함되지만 [GGI FMCG](https://www.globalgrowthinsights.com/market-reports/fast-moving-consumer-goods-fmcg-market-109277)는 홈케어를 포함한다. GICS Staples와도 경계가 다르다.
3. **자율주행:** [SkyQuest](https://www.skyquestt.com/report/autonomous-vehicles-market)는 자율화 레벨1~5를 포함하고 [TBRC](https://www.thebusinessresearchcompany.com/report/autonomous-vehicle-global-market-report)는 완전·반자율 차량의 제조사 출고가로 정의한다.
4. **소형모듈원자로(SMR):** [TBRC](https://www.thebusinessresearchcompany.com/report/small-modular-reactor-global-market-report)는 부품/원자로 제품의 공장도 시장. 2025 TBRC 0.67bn vs [SkyQuest](https://www.skyquestt.com/report/small-modular-reactor-market) 8.17bn = **12.19배**. [Precedence](https://www.precedenceresearch.com/small-modular-reactor-market)의 2026 8.16bn과 TBRC 2026 0.84bn은 **9.71배**.
5. **금리 아닌 송배전 보고서 기간 표기:** [Precedence Power T&D](https://www.precedenceresearch.com/power-transmission-and-distribution-market) 페이지 카드에 `2026–2035`지만 본문 종점이 **2034**. 371.77bn→505.28bn의 8년 CAGR은 **3.910%**, 9년이라면 **3.468%**. *3.91이라는 숫자만으로 2035 기간 승인 금지*.
6. **위성:** [TBRC](https://www.thebusinessresearchcompany.com/report/satellites-global-market-report)는 위성 본체·전력원 출고가와 제조자 보증수리, [SkyQuest](https://www.skyquestt.com/report/satellite-market)는 다양한 통신·관측·항법 응용시장. [Precedence](https://www.precedenceresearch.com/satellite-market)의 2026 규모는 TBRC 대비 **14.79배**.
7. **기존 원장 유지:** 핀테크 Precedence/TBRC 2026 가치 **106.81배**와 전망 기간 충돌, CMI Staples의 수학적 CAGR 불일치, Advanced Materials 6.21/6.27 및 Hospital Services 5.84/5.99 충돌은 수정·폐기하지 않고 보류한다.

## 5. 후속 R67 승인 전 실행 순서

1. 같은 보고서명 2~3곳이라도 **판매 매출의 단계와 모집단**이 같은지 확인: 제조사출고/서비스매출/프로젝트총액/유통 최종판매의 대응표 작성.
2. 독립 발행처 식별은 완료했으므로, **원천 예측모형과 재판매/공통 출처 여부는 미확인**으로 남기고 확인 가능한 출처공개만 추가 조사. 확인 불가하다고 모든 언론사 CAGR를 0으로 만들지 않기.
3. 비교 가능한 공통 하위시장 그룹만 `AVERAGE_CANDIDATE`로 분리하고 본래 21개 섹터·테마 전체 CAGR과 다른 라벨을 사용한다.
4. 별도 사용자의 집계 산식 승인 전까지 평균·가중치·정규화·웹 표시 변경 없음. PC Ollama는 후보 선별 재검토에만 쓰고 새로운 발행사 숫자 제안 금지.

## 6. 출처 목록·재현성

- 기계가독 21개 원장: [`CAGR_R66_PERIMETER_ISSUER_GATE_20261027.json`](./CAGR_R66_PERIMETER_ISSUER_GATE_20261027.json). 각 주제마다 63개 원본 칸의 기존 수치/기간, 실제 연 공식 URL 60건 + 신규 5건, R66 판정, 주요 인용 ref를 보존.
- 웹 검색 서비스에서 **공식 발행사 URL 65개** 개별 오픈; HTTP 원문 바이트·SHA256을 새로 저장한 것은 아님. 4개 조사기관 About과 GICS 원문은 추가 확인.
- 원래 원문의 세계시장 미래 CAGR 값과 R63 당시 판정은 그대로 유지. GICS 섹터/테마 전체 평균 PASS = **0/21**, R66 하위시장 최종 평균 계산 = **0건**.
- 운영 변화: `GitHub main / PC writer / Cloudflare / D1 / 산식 / 사이트 = 변경 없음`.