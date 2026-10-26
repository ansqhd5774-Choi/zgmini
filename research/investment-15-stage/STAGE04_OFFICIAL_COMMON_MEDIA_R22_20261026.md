# 04단계 R22 — 공식 통계 매체 공통 조회 판정

2026-10-26 KST · 개발 브랜치 연구 전용 · 운영 수집/산식/주문 변경 없음.

## 판정 기준

1. 9→100→1,000개 테마를 개별 순회하지 않고 하나의 공통 목록/배치/증분 경로로 조회할 수 있어야 한다.
2. **각 테마가 공유하는 일괄 조회 1건의 HTTP 연결, 응답 수신 및 파싱 합계는 최대 20,000ms**다. 한 매체의 실패 후 같은 실행에서 재시도·타 매체 자동 전환은 하지 않는다.
3. API 및 메타데이터 카탈로그가 있다는 사실만으로 **해당 테마 실물 산업 수요의 직접적인 관측치, 연속된 전년 값, 성장률·가속도 이력**이 있다고 승인하지 않는다.
4. 무료 접근뿐 아니라 자동 수집·저장·상업 이용·파생 공개의 권리, 직접 범위, 데이터 관측 기간과 개정판을 확인해야 최종 매체로 선정한다.
5. 실패 매체는 **이번 실행에서 정보 미제공**. 값은 `NULL`, 기존 테마 유지, 새 순위 및 주문 없음. DNS 실패는 해당 공급자가 세계적으로 데이터를 제공하지 않는다는 증거가 아니다.

## 공식 문서 기준 매체 판정

| 공식 매체 | 접근/카탈로그 | 9개 테마 직접 산업 수요 공통 소스 | 연구 단계 판정 |
|---|---|---|---|
| 미국 BEA GDP by Industry | API `UserID` 키 등록 필수, 미국 NAICS 산업 | 9개 신산업 테마 직접 관측 동일 수치 아님 | `KEY_AND_SCOPE_GATE_FAIL` |
| 미국 Census QSS | 2026년 API 요청 키 필요, 선별된 미국 서비스업 매출 | 로봇·SMR 등 9개 전 분야 수요 직접 측정 아님 | `KEY_AND_SCOPE_GATE_FAIL` |
| Eurostat | 무료 Catalogue/SDMX/Statistics API, 공식 출처표기 재사용 안내 | EU 통계 전체 카탈로그 존재, 9개 직접 세계 산업수요 수치 확인 안 됨 | `LIVE_QUERY_UNAVAILABLE_THIS_RUN` |
| World Bank Indicators | 인증키 없는 무료 Indicators API, 지표 카탈로그/배치 | 국가 수준 폭넓은 지표 존재, 전 테마 직접 매출/수요 성장 정의 확인 안 됨 | `LIVE_QUERY_UNAVAILABLE_THIS_RUN` |
| 미국 BLS Public API v1 | 무료, 25개 시계열 배치 가능 | 고용은 산업 수요/매출의 직접 관측치가 아님 | `DIRECT_DEMAND_SCOPE_FAIL` |
| OECD STAN | SDMX 공통 산업 데이터 API | 과거 R21 개발 호스트 DNS 실패, 9개 직접 수요 확인 안 됨 | `PREVIOUS_RUN_UNAVAILABLE_NO_RETRY` |

접근 가능성, 법적 재사용권, 실제 테마 직접 수요 범위는 **각각 다른 검증 게이트**다. 키가 필요한 기관에서 무단 키를 생성하거나 지급이 필요한 서비스를 신청하지 않았다.

## R22 실제 요청 기록 (실물 HTTP 성공 0)

개발 실행 환경에서 `stage04/provider-deadline-r21-readonly.mjs`의 **하나의 요청당 20초 전체 제한**으로 매체당 카탈로그 주소 **하나만** 시도했다. 최초 샌드박스가 DNS 실패하여 외부 네트워크 권한으로 동일 조건의 진단 실행 1회를 확인한 다음, 각 매체 재시도를 종료했다. 아래 시간은 **외부 네트워크 권한으로 진단한 최종 실행값**이다.

| 매체/조회 URL | 경과 시간 | 결과 | 카탈로그 값 | 후속 조치 |
|---|---:|---|---|---|
| `https://ec.europa.eu/eurostat/api/dissemination/catalogue/toc/txt?lang=en` | 38ms | DNS `EAI_AGAIN` | 없음 | 이 실행에서 제외, 재시도 없음 |
| `https://api.worldbank.org/v2/indicator?format=json&per_page=100` | 5,007ms | DNS `EAI_AGAIN` | 없음 | 이 실행에서 제외, 재시도 없음 |

- 초기 제한된 실행: Eurostat 50ms `EAI_AGAIN`, World Bank 5ms `EAI_AGAIN`. 네트워크 진단과 본 실행을 구분해 기록했다.
- 조회 대상은 **원천 지표 목록**, 개별 테마 URL/지표가 아니다. World Bank `per_page=100`은 전체 약 16,000개 지표에 대한 범위 검증이 아니라 **접근 확인용 100개 항목 표본 요청**이다. DNS 실패로 표본조차 확보하지 못했다.
- 두 요청 모두 HTTP 본문을 읽거나 9개 테마의 성장률을 산출하지 못했다. **실제 20초 내 정상 수신 PASS는 0**, 기한 초과는 0, 불성공을 정상 제공으로 보고한 건수는 0.
- 개발 호스트가 아니라 사용자 Windows PC의 네트워크에서는 정상일 가능성이 있지만, 현재 실행의 결과를 승격하지 않는다. 설치/재시도 명령을 강제하지 않는다.

## 현재 결정

- `selectedCommonProvider = null`; 9개 테마 직접 동일 정의 수요 관측치 0건 검증.
- 기존 Stage03 ETF 9개 유지, 신규 테마의 소스 조회를 9→100→1,000번 순차 반복하지 않음.
- 제안형 ZGMINI 산업자료 API **미구축**, 공식 G1/G2/G/D/M/순위 **NULL**, 주문 0건.
- R21 단일 요청 하드 타임아웃 코드 유지. 배포·운영 PC·DB·스케줄러·산식 변경 없음.

## 검토한 기관 공식 문서

- [Eurostat API 소개](https://ec.europa.eu/eurostat/en/web/user-guides/data-browser/api-data-access/api-introduction) · [Catalogue API 주소](https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started/catalogue-api)
- [World Bank Indicators API 소개/인증 불필요](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392) · [전체 지표 목록](https://datahelpdesk.worldbank.org/knowledgebase/articles/898599-indicator-api-queries)
- [BEA API UserID 등록](https://apps.bea.gov/api/signup/)
- [Census QSS API](https://api.census.gov/data/timeseries/eits/qss.html)
- [BLS Public Data API](https://www.bls.gov/developers/api_signature_v1.htm)
- [OECD API 안내](https://www.oecd.org/en/data/insights/data-explainers/2024/09/api.html)

