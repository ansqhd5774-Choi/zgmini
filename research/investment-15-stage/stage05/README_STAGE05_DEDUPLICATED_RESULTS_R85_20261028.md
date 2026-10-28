# R85 — 5단계: 기존 1~4단계 확정 결과 재사용 (2026-10-28)

- **고정 전용 브랜치**: `codex/investment-15-stage-m2-r25-20261025` (새 브랜치 없음).
- **수정 범위**: Stage05 계산·전달·Ollama 입력 계약만 변경. Stage01~04 코드·산식·원본 파일, 운영 프로그램·사이트·예약·주문은 그대로 유지.
- **핵심 정정**: Stage05에서 ETF 가격 상대강도/추세 또는 Stage04의 `G1/G2/F → G/D/M4`를 다시 계산하던 R78/R84 방식은 폐기한다. 그 요소는 앞 단계 결과에서 이미 처리되므로 Stage05에서 다시 가중·재조사할 수 없다.

## 단계별 책임

| 공급 결과 | 5단계에서 할 일 | 5단계에서 하지 않을 일 |
|---|---|---|
| Stage01 시장 위험 | 기존 결과를 경고·맥락으로 전달 | 시장 위험 점수 재산출 및 순위 가산 |
| Stage02 섹터 최종 점수 | 확정된 섹터 연결·점수 전달 | 상대강도 가격 수집·재계산 |
| Stage03 테마 최종 점수·통과 여부 | 통과한 테마만 후보화하고 점수 전달 | ETF 추세 계산·테마 재심사 |
| Stage04 확정 매력도 `M4` | 완료 점수를 **그대로** 연구 우선순위로 사용 | 산업 성장·괴리 산식 재산출, R77 CAGR을 M4로 대체 |
| Ollama | 1~4단계 결과 전체를 읽고 **직접** 테마 선정·핵심 기술 및 관련 기업 조사 | 새 점수·테마 선정 이유 임의 수치화·매수/주문 |

## 점수 처리 원칙

- `stage05S5 := stage04.M4`는 **기존 확정 점수의 전달값**이다. 신규 산업 점수, ETF 점수, 재가중된 5단계 점수가 아니다.
- Stage02/03의 완료 점수는 투자심리·시장 관점 설명에 **별도** 제공하며 `M4`에 다시 더하지 않는다. 동일한 `M4` 값의 순서는 고정 ID로만 결정한다.
- R78/R84 `S5 = .8*M4 + .2*(.5*RS + .5*Trend)` 및 70/80/90 민감도는 **현행 5단계 중복 계산으로 사용하지 않는다**. 과거 설계 기록은 삭제하지 않는다.
- 5단계는 프로그램으로 숫자·상태를 전달하고, Ollama가 후보를 선정한다. `selectedThemeId`는 프로그램이 미리 지정하지 않는다.
- R77 전망 11.285%는 향후 연구 참고 맥락일 뿐 확정 `M4`나 `S5`가 아니다.
- 누락값은 `null`; 보존된 이력값이나 가상 테스트 숫자로 대체하지 않는다.

## 완료 결과 입력 계약 V2

`stage05-fusion-core.mjs`가 받는 **Stage05 전용 정규화 입력**이다. 아래는 구조 예시이며 값은 전부 가상이다.

```json
{
  "schemaVersion": "STAGE05_COMPLETED_STAGE_RESULTS_V2",
  "snapshotDate": "2026-10-28",
  "stage01": {"status":"READY","date":"2026-10-27","risk":"CAUTION"},
  "stage02": {"status":"READY","sectors":[{"id":"sector-a","score":65}]},
  "stage03": {"status":"READY","themes":[{
    "id":"approved-12","name":"로봇·자동화","sectorId":"sector-a",
    "approved":true,"score":73
  }]},
  "stage04": {"status":"READY","themes":[{
    "id":"approved-12","status":"QUANTIFIED","M4":81,
    "scoreKind":"STAGE04_M4_FINAL","scoreValidation":"VERIFIED",
    "validatedDate":"2026-10-27"
  }]}
}
```

- `stage02.score`, `stage03.score`, `stage04.M4`는 **앞 단계에서 이미 완료·확정된 값**이다. `score`는 앞 단계 출력의 필드명을 변경하라는 지시가 아니라 Stage05 전달 JSON의 표준 필드명이다.
- `--handoff-input`의 Stage03 승인 테마에는 기존 테마명(`name`)이 있어야 한다. 완료 입력은 기존 결과 파일을 5단계 표준 필드로 매핑한 것이며, 5단계에서 1~4단계 원본이나 R17 보존 문서를 열어 다시 심사하지 않는다.
- `stage04.scoreKind`/`scoreValidation`은 이전 단계의 확정된 M4임을 표시하는 **전달 계약 상태**이지 5단계에서 이전 단계를 재감사하라는 뜻이 아니다.
- 직접 계산 확인: `node stage05-fusion-readonly.mjs --input 기존_결과_연결.json` (실제 시장 데이터가 아닌 한 가상 테스트 숫자를 운영 선정으로 표시하지 않는다).
- Ollama용 전달: `node stage05-fusion-readonly.mjs --handoff-input 기존_결과_연결.json`.
- Ollama는 기존 승인 후보 **9개 전부의 완료 점수가 연결된 경우에만** 호출할 수 있다. 단일 테마 예시는 입력 구조를 보일 뿐 Ollama 실행 조건을 채우지 않는다.
- 5단계가 자동으로 과거 Windows PC 파일을 찾아보거나 Stage01~04를 다시 실행하지 않는다. 실제 파일을 Stage05 전용 JSON에 연결하는 작업은 기존 산출물의 위치와 형식이 알려져야 한다.

## 기존 출력과의 호환 경계

- 입력 스키마: `STAGE05_COMPLETED_STAGE_RESULTS_V2`.
- Ollama 전달 버전: `STAGE05_VERIFIED_RESULTS_HANDOFF_R85`.
- 기존 `STAGE05_01_04_V1` / `STAGE05_VERIFIED_RESULTS_HANDOFF_R81`은 80:20 중복 계산을 전제한 **구버전 계약**이므로 R85에 자동 승격하지 않는다.
- 기존 R77 저장 결과 브리지는 그대로 별도 연구 문맥으로 연결하며 성장 점수로 변환하지 않는다.
- 테스트: `node --test research/investment-15-stage/stage05/*.test.mjs`.

**범위 경계:** 5단계 코드·모의 테스트 통과는 Stage01~04의 실제 Windows 출력에서 9개 M4 실측값이 연결됐거나, 사용자 PC Ollama가 실제 조사까지 완료했다는 뜻이 아니다.
