# R78 Stage05 01~04 선정 프로그램 (연구 전용)

> **최신 R85 규칙 적용:** 이 문서의 `G1/G2/F` 재계산 및 ETF RS·Trend 80:20 규칙은 과거 구현 기록이며 현재 실행되지 않는다. 현행 입력·산식은 [R85 중복 제거 안내](README_STAGE05_DEDUPLICATED_RESULTS_R85_20261028.md)를 따른다. 기존 1~4단계 자체는 변경하지 않았다.

- 저장소 `ansqhd5774-Choi/zgmini`, 기존 브랜치 `codex/investment-15-stage-m2-r25-20261025` 전용.
- **운영 선정·주문·기존 ETF 산식 변경 없음**. 기존 R25 M2 Runner 및 R77 Ollama와 독립된 실험 코드.
- 01~04단계 검증값만 사용한다. Stage02/03 공포·탐욕 점수 이력을 ETF 가격 상대강도/추세라고 주장하지 않는다. Stage04 R77 전망 CAGR을 실측 G/M으로 대입하지 않는다.

## 코드와 실행

- `stage05-fusion-core.mjs`: Stage01 시장위험 분리, Stage03 승인 후보만 입력, **기존 Stage04 구성값 `G1/G2/F`에서 Stage05가 `G/D/M4`를 직접 계산**, ETF 가격 1년 RS·Trend의 검증·기간 일치, E/T/S5 계산, 70:30·80:20·90:10 민감도, 결측 NULL 유지. 제공된 원본 G/D/M4가 있을 때만 계산값과 일치하는지 확인한다(R84 반영).
- `stage05-fusion-core.test.mjs`: Node 기본 테스트, **완전히 가상의 독립 fixture** 사용. 테스트 통과는 운영 데이터 완전성 통과가 아니다.
- `stage05-fusion-readonly.mjs`: `--audit-live` 기존 M2 공식 공개 피드 3곳을 그대로 조회해 커버리지 진단(HTTP GET만), `--input <json>`은 01~04 확정·검증 스냅샷에 대해 연구식 계산, `--audit-contract` 네트워크 없는 정적 입력 계약 보고.
- `STAGE05_FUSION_READONLY.cmd`: Windows CMD 진단 실행. Node 우선순위 `E:\ZGmini\runtime\node.exe`, 아니면 PATH의 `node`. 읽기 전용이며 비정상/결측 시 자동 재시도 없음. Exit 0=입력 계산 실행, 2=진단만/자료 부족, 1=실행 오류.

### 명령

```bat
STAGE05_FUSION_READONLY.cmd --audit-live
STAGE05_FUSION_READONLY.cmd --input verified-stage01-04-snapshot.json
```

셸에서 테스트: `node --test research/investment-15-stage/stage05/stage05-fusion-core.test.mjs`

## 입력 계약 V1

최상위: `schemaVersion="STAGE05_01_04_V1"`, `snapshotDate="YYYY-MM-DD"`.

| 소스 | 필수 필드 | 강제 조건 |
|---|---|---|
| Stage01 | `stage01.status`, `date`, `risk` | READY, 7일 이내, risk NORMAL/CAUTION/HIGH_RISK/UNKNOWN. 위험은 점수 외 별도 출력 |
| Stage02 | `stage02.status`, `sectors[].id`, `relativeStrength` | READY, 실제 ETF 가격 RS, 1년 가격 기간·ETF·원천·가격 시계열 ID·정규화 규칙·VERIFIED |
| Stage03 | `stage03.status`, `themes[].id`, `sectorId`, `approved`, `trend` | READY, 승인 통과 `true`만 후보, 실제 ETF 가격 추세, Stage02와 동일 비교기간 |
| Stage04 | `stage04.status`, `themes[].id`, `status`, `G1`, `G2`, `F`, `validatedDate`, `observationPeriodEnd` (`G`/`D`/`M4`는 선택) | READY, QUANTIFIED, REALIZED_INDUSTRY_ACTIVITY, VERIFIED/CURRENT, 원문 URL, 7일 이내 검증·미래 관측 금지. 최종 계산값을 미리 요구하지 않음. |

`relativeStrength`/`trend` 형식: `{ "kind":"ETF_PRICE_RELATIVE_STRENGTH" | "ETF_PRICE_TREND", "validation":"VERIFIED", "score":0..100, "etf":"...", "source":"...", "priceSeriesId":"...", "normalizationRuleId":"...", "periodStart":"YYYY-MM-DD", "periodEnd":"YYYY-MM-DD" }`.

Stage04: `evidenceKind="REALIZED_INDUSTRY_ACTIVITY"`, `sourceValidation="VERIFIED"`, `freshnessStatus="CURRENT"`, `formulaId="STAGE04_R2_PROPOSED"`, `sourceUrls:["..."]`, `validatedDate="YYYY-MM-DD"`, `observationPeriodEnd="YYYY-MM-DD"`, 기타 정량 필드 0~100.

연산: Stage05 프로그램이 `G=.6*G1+.4*G2`, `D=max(0,G-F)`, `M4=.7G+.3D`를 직접 계산 → `E=M4`, `T=.5RS+.5Trend`, `S5=.8E+.2T`. 이미 계산한 **최종 점수 JSON을 입력으로 요구하지 않는다.** 단, 실제 구성값 자체가 없는 경우 NULL로 차단. 시장 위험은 점수와 독립. 동일 기간/최신성/중복 ID 오류를 검출.

## 운영 연결 미완료 이유

현재 공개 M2 1~3 피드는 **252개 공포·탐욕 점수 이력**이며 1년 ETF 가격 기반 RS·Trend가 아니고, 승인된 가격 정규화 계약도 확인되지 않았다. Stage04 R70~R77은 **보고서 전망 CAGR** 연구이며 검증된 실측 G1/G2/F/G/D/M4 출력을 제공하지 않는다. 따라서 현재 실제 시장별 S5 및 선정 순위는 계산 불가(`NULL`). 1~4단계 설계 자체를 폐기하는 것이 아니라 **정확한 기존 데이터 필드와 산식 입력이 충족되는지를 먼저 검사**하는 것이다.

가상 테스트 점수는 Windows 실측이나 시장 분석 결과로 인용하지 않는다. 실운영 반영과 User PC Ollama 검증은 별도 단계이며 이번 변경에 포함되지 않는다.
