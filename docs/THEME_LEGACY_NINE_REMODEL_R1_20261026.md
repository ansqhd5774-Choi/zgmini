# 기존 9개 테마 전면 개편 — R1 독립 브랜치 작업 계약

- 착수: 2026-10-26, 사용자 승인: "브랜치에 대대적인 개편 작업을 저장하고 진행"
- 대상 브랜치: `research/theme-nine-r2-shadow-20261026`
- 기준: GitHub `main` SHA `0f0228cb5082ff3c852e00b28303e8594456cf80`
- 진행 상태: **RESEARCH_AND_READ_ONLY_IMPLEMENTATION**. 이 문서·브랜치에 있는 분석 도구의 테스트 PASS는 PC 실측, D1 반영, 공개 개편 완료를 뜻하지 않는다.
- 범위: 등록부에 존재하는 **기존 승인 9개**만. 데이터센터·전력, 우주·위성, 향후 11번째 테마는 본 개편 작업 대상에서 제외한다.

## 1. 개편의 목적과 불변 기준

기존 9개는 사전에 승인된 ETF 2종씩 `ETF_ONLY_T40_R20_V40_PAIR50`을 사용한다. 10개 구축 과정에서 정립된 신규 ETF 선정 OR, 적응형 R2, 우주·위성 R32의 252일 이력 복원 원칙, ETF 순도·중복·공식 AUM·권리 증거, 자동 운영 검증을 **별도 개편 후보**로 평가한다. 해당 기준을 무조건 기존 9개에 소급하지 않는다.

1. 원본 가격·기존 확정 점수·잠정 점수·D1 키·과거 공개 이력은 변경/삭제/재작성하지 않는다.
2. 운영 `main`의 기존 계산기·스케줄러·Cloudflare/D1/DB/API는 본 브랜치 작업으로 변경하지 않는다.
3. 9개 각각 **구버전 점수 / 같은 입력으로 재현한 R188 점수 / 적응형 R2 후보 점수**를 252거래일 동일 날짜 축에서 비교한다.
4. 종목 구성과 날짜·가격모드·벤치마크·권리의 증거가 없는 차이는 성과 개선이라고 표현하지 않는다.
5. 원가격은 사용자의 승인된 PC 저장소에서 읽으며, 누락 관측 가격·거래일·점수·AUM을 만들지 않는다. 모델이 수집·저장·게시 기능을 자동 획득해서는 안 된다.
6. 기존 9개 공개값을 신규 산식으로 전환하는 행위에는 **별도 비교 결과 제시 및 사용자 승인**이 필요하다.

## 2. 현재 GitHub 등록부 기준 고정 코호트

| 기존 테마 | ETF | 현재 등록 산식 | 운영 검토 포인트 |
| --- | --- | --- | --- |
| 로봇·자동화 | BOTZ / ROBO | T40/R20/V40 + 50:50 | BOTZ가 자율주행에도 포함됨 |
| 클라우드·SaaS | SKYY / CLOU | 동일 | ETF 순도·중복 보유종목 검토 |
| 자율주행 | DRIV / BOTZ | 동일 | BOTZ 중복·목적 적합성 검토 |
| 원전·SMR | NLR / URA | 동일 | 원전·우라늄의 테마 정의 차이 검토 |
| 방산 | ITA / SHLD | 동일 | 개별 산업/테마 비중 검토 |
| 핀테크 | FINX / ARKF | 동일 | 종목 중복·테마 범위 검토 |
| 사이버보안 | CIBR / BUG | 동일 | 동일 기초종목 중복 정도 검토 |
| AI·반도체 | SMH / SOXX | 동일 | 별도 수집·계산·게시 자동화 연결 검증 |
| 바이오·신약 | IBB / XBI | 동일 | 과거 점수 불일치 원인·운영 컷오버 검증 |

**증거 경계:** 표의 ETF/방법/운영 상태는 `config/theme-data-registry.json`에 기록된 값이다. 현재 ETF 편입 종목, AUM, 수집 성공, PC 승인 SHA 및 시장가격은 이 표에서 검증되지 않았다. 등록부에 남은 7개 기본 테마의 `LEGACY_CODE_NOT_FULLY_ARCHIVED_IN_REPOSITORY`·`RAW_MANIFEST_NOT_REGISTERED`도 별도로 해소해야 한다.

## 3. 버전 분리 및 정량 비교

| 후보 | 목적 | 무조건 바꾸지 않는 것 |
| --- | --- | --- |
| R188 기준 재현 | 628개 이상 실제 공통 가격에서 252점 계산 | 기존 공개 D1 점수 |
| 적응형 R2 | 40~376일 ETF의 측정 가능한 지표만 평가. 377일은 당일 R188 동등, 628일은 252점 전체 동등 | 상위 축 40:20:40 및 내부 지표 비율 |
| 기존 50:50 바스켓 | 같은 날짜 ETF 두 개 모두 유효할 때만 구버전 바스켓 복원 | 미측정 ETF를 0점/무게 100%로 대체하지 않음 |
| 후보 ETF 교체·확장 | 현재 테마 순도·규모·중복을 실증으로 검토 | 공개 로스터·비중·권리 상태 |
| 공식 AUM 가중 | AUM 유효일·발행사 증거 확보 후 별도 민감도 분석 | 기존 두 ETF 50:50을 즉시 폐기하지 않음 |

**핵심 동등성 검사:** ETF별 검증된 동일 가격·SPY·가격모드·뉴욕 날짜를 사용하고 최근 628 공통 관측값이 충분하면, 적응형 R2와 R188의 마지막 252점은 기계 오차 범위에서 같아야 한다. 모두 장기 ETF인 기존 테마에 단순히 R2 함수 이름을 적용했다고 점수가 달라지는 것은 개선 근거가 아니다.

**우주·위성 R32 교훈:** 짧은 ETF의 출시일 때문에 기존 장기 ETF의 실제 252일 점수를 잘라서는 안 된다. 다만 R32의 단독 ETF 선택/3종 이상 상대 AUM 혼합은 기존 9개의 2종 50:50 승인과 다른 계약이므로 이번 단계에서 자동 소급하지 않는다. 날짜별 적격 ETF가 1종인 경우 어떻게 공개 바스켓 점수를 처리할지는 별도 설계와 승인 사항이다.

## 4. 구현된 비공개 검증 도구 R1

- `config/theme-nine-remodel-scope-r1.json`: 기존 9개 고정 ID와 등록부 메서드 불변 경계.
- `scripts/pc-writer/theme-nine-baseline-r1.cmd`: 승인 PC의 기존 파일/해시 검사기와 관련 Windows 작업 4종에 대한 **읽기 전용** 점검. 같은 CMD 폴더에 `THEME_NINE_BASELINE_R1_RESULT.txt` 출력. 기존 등록부 전체를 스캔하되, 개편 판정 대상은 고정 9개만이다. 미등록 manifest는 실제 가격이 존재하지 않는다는 증거가 아니다.
- `scripts/pc-writer/theme-nine-shadow-r1.mjs`: 별도 저장 가격 JSON을 이용한 **읽기 전용** R188/R2 날짜별 비교·기존 공개값 대비 차이 분석. 공급자 GET, D1/DB 쓰기, 스케줄러 편집, GitHub 업로드 없음.
- `tests/theme-nine-shadow-r1.test.mjs`: 동일 628+ 가격의 R188=R2, 조기 상장·결측, 등록부 드리프트·출처 불명 및 9개 커버리지 테스트.

입력은 다음 형태의 **이미 수집/저장/검증한 가격 수출본**이어야 한다. ETF/벤치마크 티커는 등록부와 대조하며 이 문서의 예시는 실제 가격이 아니다.

```json
{
  "contractVersion": "THEME_NINE_SHADOW_R1",
  "themes": [
    {
      "id": "robotics",
      "priceMode": "<approved PC raw price mode>",
      "sourceEvidence": "<local verified raw-manifest SHA / verification log>",
      "rows": [
        {"date":"2024-01-02","SPY":100,"BOTZ":50,"ROBO":60}
      ],
      "published": [{"date":"2024-01-02","score":50}]
    }
  ]
}
```

- 날짜 오름차순의 뉴욕 거래일 **실제 관측 행**을 제공한다. 가격이 없는 칸은 `null`. 최소 252개 날짜가 없다면 `INSUFFICIENT_YEAR_WINDOW`로 분리한다.
- `sourceEvidence`는 provenance를 찾기 위한 **입력 메모**일 뿐이다. 이 도구는 원자료 파일 SHA 또는 권리 증거를 직접 열어 검증하지 않으므로 결과 상태는 항상 `SOURCE_UNVERIFIED_OFFLINE_SHADOW`로 남는다.
- 실가격 저장 데이터 확보 전에는 합성 fixture 테스트를 실제 9개 점수 재계산 성공이라고 주장하지 않는다.
- PC 실행은 설치된 Node에서 `node scripts/pc-writer/theme-nine-shadow-r1.mjs --input <기존 실제 PC 저장자료에서 검증 후 생성한 JSON 경로>`로 한다. stdout에만 결과를 출력한다. 사용자는 이미 승인된 경로의 원자료를 보존한다.
- 편의 CMD `scripts/pc-writer/theme-nine-shadow-r1.cmd "<검증된 입력 JSON 경로>"`는 실행 CMD와 같은 폴더의 `THEME_NINE_SHADOW_R1_RESULT.txt`에 출력한다. **해당 입력 JSON은 아직 자동 생성하지 않는다**. 기존 데이터의 다종 포맷을 확인하기 전까지 추측성 exporter를 제공하지 않는다.

## 5. 필수 실행 단계와 승인 게이트

1. **R1 BASELINE:** 현재 main/실행 PC의 승인 SHA, 9개 ETF, 출처·가격 모드·원자료 SHA·마지막 실제 날짜·기존 252점·자동 작업 상태 확정. 미확인 항목은 `UNKNOWN`; 예전 날짜의 점수를 최신으로 해석하지 않는다.
2. **R2 SHADOW:** PC 원본에 대한 독립 검증 후 9개 × 252일 기준 R188/R2/공개 점수 비교. 최대·평균 오차 및 원인 분해. `R188_COMPATIBLE`과 `ADAPTIVE_PROVISIONAL`은 구분한다.
3. **R3 COMPOSITION:** 9개 조합의 총 18개 ETF 편입 위치(중복 티커 존재)의 발행사 공식 목적, 주요 보유 종목, 중복, 상장일/유효 관측일, 공식 AUM/기준일, 사용권을 최신 외부 자료로 검증. BOTZ 공통 편입 등 교차 테마 중복을 정량화한다.
4. **R4 WEIGHT SHADOW:** 기존 50:50과 다른 비중은 사용자 승인 전에는 **후보 가중치**로만 계산. 2종 AUM, 3종 이상 AUM, 구간별 ETF 수 변동, 과거 AUM look-ahead를 구분한다.
5. **R5 OPS:** 7개 legacy와 AI/바이오의 collector → manifest → scorer → publisher → 정규 작업 → D1 readback·공개 API의 독립 결함 조사. 기존 수집·점수·권리 계약 무단 변경 금지.
6. **R6 DECISION:** 각 테마별 현재 vs 신규 점수(최신/1M/3M/1Y), 계량 차이, 결측, ETF 순도 및 중복, 가중치, 운영 신선도, 원장 보호·롤백 계획 제출. 이 단계에서 사용자가 전환 테마·버전·새 feed key를 승인한다.
7. **R7 STAGED CUTOVER (별도 승인):** 독립 새 D1 키+reader guard, 기존 키 보존, 게시/readback/PC 정규 실행/Cloudflare Production 검증. 승인 없이 main merge나 배포를 진행하지 않는다.

## 6. 절대 금지와 이후 순서

- 원자료·기존 D1 데이터 재작성, 9개 테마 일괄 점수 수정, 생산 스케줄러·DB 스키마·산식/비중의 승인 없는 전환 금지.
- 사용자 PC 접근 불가, 저장 파일 미제공, 원본 인증 실패는 **해당 실측 게이트의 미완료**이지 합성 테스트 실패가 아니다.
- 11번째 테마의 선정·수집·계산은 이 9개 개편의 R6 승인 또는 사용자 별도 순서 변경 지시 이후 시작한다.

## 참조

- `AGENTS.md`, `docs/THEME_DATA_OPERATIONS.md`, `config/theme-data-registry.json`
- `docs/THEME_ETF_ADAPTIVE_OR_R2_20261025.md`
- `docs/THEME_SPACE_SATELLITE_R32_HISTORY_CONTINUITY.md`
- `scripts/pc-writer/theme-optional-score-r188.mjs`, `theme-optional-adaptive-r2.mjs`
