# 04단계 R19 — ZGMINI 산업자료 단일 조회 계약 준비

작업일: 2026-10-26 (KST). **개발 브랜치만 / 운영 API 신설 없음 / DB·스케줄러·산식 변경 0 / NO_TRADE**.

## 이번 변경의 실제 범위

1. `stage04/unified-industry-series-readonly.mjs` 신규: ZGMINI 공통 산업자료 피드의 **검증·연간/분기 YoY 계산 계약** 구현.
2. `stage04/common-source-gate-readonly.mjs` 확장: 기존 ZGMINI F 호출은 그대로 유지. **향후 승인된 단일 산업자료 URL을 명시적으로 제공할 때만** 1회 추가 GET을 허용. 매체를 테마별로 변경하는 분기 없음.
3. `stage04/unified-industry-series-r19.test.mjs` 신규: 9개 후보(및 다른 후보 수로 확장 가능), F + 공통 피드 2회 조회, 성장/가속도, 다른 자료 정의 차단, 권리 미검증, 미래 발표·중복 기간·누락 데이터, 무순위·무주문 검증.

## 향후 ZGMINI에서 제공할 계약 (아직 운영하지 않음)

- 제안 주소: `https://zgmini.kr/api/investment/stage04/industry-demand`
- 버전: `ZGMINI_STAGE04_INDUSTRY_DEMAND_V1`
- 테마별 자료: `theme`, `metricId`, `definitionId`, `vintageId`, `unit`, `region`, `frequency`, `metricKind`, `scope`, `source`, `observations[]`
- 반드시 검증할 사항: 공식 출처 URL·기관·재사용 권리·계절/지역/정의·동일 보고판본·발행일·측정기간. 검증되지 않으면 해당 테마만 `NULL`, 테마 자체 탈락 금지.
- `LEVEL`: 전년 같은 기간 수치가 있을 때만 YoY %, 3년치 같은 기간 수치가 있을 때만 YoY 가속도 %p.
- `ADOPTION_SHARE_PCT`: **보급률 차이 %p**를 계산하고 상대 성장률 %와 혼합 금지.
- 산업별 원 단위·기관이 달라도, 동일 테마의 과거·현재 수치 **정의는 동일**해야 한다. 독립된 산업 점수 정규화·가중치는 기존 사용자 승인 대기.
- `G1/G2/G/D/M/공식 순위`: 입력 수치가 충분해도 **현재는 NULL**. 승인 전 새 랭킹 발행 금지.

예상 입력 예시 (시험용 숫자, 실제 산업 관측 아님):

```json
{
  "status": "READY",
  "schemaVersion": "ZGMINI_STAGE04_INDUSTRY_DEMAND_V1",
  "sourceVersion": "ONLY_AFTER_REAL_SOURCE_APPROVAL",
  "sourceStoredAt": "2026-10-26T00:00:00Z",
  "themes": [
    {
      "theme": "테스트 테마",
      "metricId": "OFFICIAL_METRIC_ID",
      "definitionId": "SAME_DEFINITION_V1",
      "vintageId": "OFFICIAL_RELEASE_EDITION_ID",
      "unit": "COUNT",
      "region": "GLOBAL",
      "frequency": "ANNUAL",
      "metricKind": "LEVEL",
      "scope": "DIRECT",
      "source": {
        "institution": "OFFICIAL_INSTITUTION",
        "url": "https://example.org/official-data",
        "reuseRights": "VERIFIED_FOR_ZGMINI_DERIVED_PUBLIC_USE"
      },
      "observations": [
        {"period":"2024","value":100,"definitionId":"SAME_DEFINITION_V1","vintageId":"OFFICIAL_RELEASE_EDITION_ID","publishedAt":"2026-10-01T00:00:00Z","phase":"FINAL"},
        {"period":"2025","value":110,"definitionId":"SAME_DEFINITION_V1","vintageId":"OFFICIAL_RELEASE_EDITION_ID","publishedAt":"2026-10-01T00:00:00Z","phase":"FINAL"}
      ]
    }
  ]
}
```

위 `reuseRights`는 **상위 수집기의 검증 완료 표시를 요구하는 계약**이지, 테스트가 원기관 라이선스를 법적으로 입증한다는 뜻이 아니다. 실제 사용 전 개별 원기관의 권리 증거를 별도로 보존·감사한다. `example.org`와 숫자들은 테스트 전용이다.

## 실제 미해결 입력 항목 (사용자에게 계속 보고)

| 항목 | 운영 실측 상태 | 후속 조치 |
|---|---|---|
| 기존 공포·탐욕 F | R17까지 9/9 확인 이력. 이번 클라우드에서 실시간 조회 DNS `EAI_AGAIN` | Windows CMD 직접 검증 전 R19 실측 주장 금지 |
| 9개 테마의 실물 산업 X 현재·전년·과거 | 공통 조회 경로에서 **미확보** | ZGMINI의 원천별 적법 수집·주기·매핑 구현 필요 |
| 성장률 g·가속도 a | **계약·가상 수치 테스트만 통과**, 실제 9/9 산출 아님 | 검증된 실물 시계열만 인입 후 실측 |
| G1·G2·G·D·M·공식 순위 | 사용자 승인 전 보류 | 원시 데이터 확보, 표본·민감도·가중치 승인 후 별도 구현 |
| 원본 권리 증명 | 공식 기관별 파생 공개·보관 권리 미검증 존재 | 승인 없는 점수 공개·DB 적재 금지 |

검토 근거: [OECD STAN 상세 소개](https://www.oecd.org/en/data/datasets/structural-analysis-database.html), [BEA 산업통계](https://www.bea.gov/industry/industry-economic-accounts-information-guide), [미 Census QSS 범위](https://www.census.gov/services/qss/about_the_survey.html). 표준 통계의 범위와 개별 신생 테마의 실제 수요 범위가 다르므로 매핑 검증이 먼저 필요하다.

## 운영·개발 구분

**새로운 API는 제안형 계약으로만 존재**하며, 사이트 `zgmini.kr`에 아직 이 URL이 제공된다고 주장하지 않는다. PC 수집기·D1·Cloudflare·자동주문은 건드리지 않았다. `STAGE04_BOT_READONLY.cmd`는 안전한 R18 경로를 계속 사용하며, R19 신규 피드 조회는 명시적으로 지정하지 않으면 실행되지 않는다.
