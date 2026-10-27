# Stage04 R63–R66 외부 연구자료 선별 복구 원장

> **상태: 역사적 연구 근거만 복구. 기존 R45/R53/R56/R58 실행 계획, 판정 게이트, 승인 산식은 변경하지 않음.**

- 복구일: 2026-10-27
- 유일한 작업 브랜치: `codex/investment-15-stage-m2-r25-20261025`
- 원본 연구 브랜치: `codex/cagr-r63-21-source-audit-20261027` @ `28559eb1d814aa862ca50da5230fd8d44436723a`
- 복구 직전 작업 브랜치 HEAD: `f75801d4d76bce22e0b6c4943f87bda9360026dd`
- 복구 방식: 대상 브랜치의 문서/JSON 블롭 10개만 같은 바이트로 가져온 선택적 내용 복구. 잘못된 브랜치의 전체 트리/운영 앱·데이터베이스·빌드·배포 변경을 혼입하지 않음.
- 원본 경로는 `docs/research/`, 복구 경로는 이 폴더. 복구 문서의 과거 경로 링크는 역사 기록으로만 해석함.

## 절대 해석 금지

1. R63의 **21/21 주제 병렬 조사**는 원래 승인된 주제별 단계적 실행(R45 및 이후 2·3개 주제 제한 승인)과 다르다. 기존 실행 계약을 대체·수정하거나 차기 21병렬을 승인하지 않는다.
2. R63 공식 발행사 보고서 63칸 중 58개 전망 수치/기간 확인이라는 기록은 그 실행 시점의 연구 주장이다. 이 복구는 해당 원문을 실시간 재조회한 검증이 아니다.
3. R63 PC Ollama 실측 0회, 예열+3회 반복 측정 0회. R64~R66에서 추가 직접 HTTP GET/PC 실측 0회. 이력 스냅샷을 현재 수치·실측 성공으로 가장할 수 없다.
4. 보고서마다 GICS 전체 섹터와 하위시장 범위가 다르고 가치분모·전망 기간도 상이하므로 `sector_cagr=null`을 유지한다. 평균, 산업 매력도 점수, 실적침체 신호, 기업 추천·주문에 자동 편입하지 않는다.
5. 복구된 JSON은 감사용 역사 증거다. 현재 성장률 자료로 사용하려면 지정 매체의 공식 원문을 **실행 시 재조회**하고 기간·시장정의·원문 수치·모델 반복 검증을 다시 통과해야 한다.
6. 운영 ZGMINI `main`/Cloudflare/DB/산식/PC 작업/주문은 이 문서 복구의 범위 밖이다.

## 복구 파일 대조표

| 원본 파일 (`docs/research/`) | Git blob SHA | 복구 상태 |
|---|---|---|
| [CAGR_R63_21_RESEARCH_PLAYBOOK_20261027.md](./CAGR_R63_21_RESEARCH_PLAYBOOK_20261027.md) | `ac65a8095dabe986f755fe949f3861c2bc570b3b` | 과거 연구 후보·미승격 |
| [CAGR_R63_21_SOURCE_MATRIX_20261027.md](./CAGR_R63_21_SOURCE_MATRIX_20261027.md) | `37db1c4bd8c3b957980dfdd4ed747af67ee8452e` | 과거 연구 후보·미승격 |
| [CAGR_R64B_DEFINITION_RECONCILIATION_20261027.json](./CAGR_R64B_DEFINITION_RECONCILIATION_20261027.json) | `cd35cd15895786f16cea28b24804a6b5c5645e97` | 과거 연구 후보·미승격 |
| [CAGR_R64B_DEFINITION_RECONCILIATION_20261027.md](./CAGR_R64B_DEFINITION_RECONCILIATION_20261027.md) | `26b8d2d9a1502c4c598e6258c76fb93e76e7980e` | 과거 연구 후보·미승격 |
| [CAGR_R64_SCOPE_AUDIT_20261027.json](./CAGR_R64_SCOPE_AUDIT_20261027.json) | `28e4362e44c4ce98052506aa9f8f68ab3355713a` | 과거 연구 후보·미승격 |
| [CAGR_R64_SCOPE_AUDIT_20261027.md](./CAGR_R64_SCOPE_AUDIT_20261027.md) | `b8f117e2aeb703108d23f8d5993d3acbea427bbd` | 과거 연구 후보·미승격 |
| [CAGR_R65_TARGETED_REPLACEMENT_BASELINE_AUDIT_20261027.json](./CAGR_R65_TARGETED_REPLACEMENT_BASELINE_AUDIT_20261027.json) | `3ceb63f002d2951838e86ca164852e1024385ad7` | 과거 연구 후보·미승격 |
| [CAGR_R65_TARGETED_REPLACEMENT_BASELINE_AUDIT_20261027.md](./CAGR_R65_TARGETED_REPLACEMENT_BASELINE_AUDIT_20261027.md) | `9990126832b86c697fd243ffe08432f743255c42` | 과거 연구 후보·미승격 |
| [CAGR_R66_PERIMETER_ISSUER_GATE_20261027.json](./CAGR_R66_PERIMETER_ISSUER_GATE_20261027.json) | `b831e85fbc284bb90e69ff8ee6ea0c86a6659e35` | 과거 연구 후보·미승격 |
| [CAGR_R66_PERIMETER_ISSUER_GATE_20261027.md](./CAGR_R66_PERIMETER_ISSUER_GATE_20261027.md) | `dccc31e0ef97de13229a5d229ead2a28afccce47` | 과거 연구 후보·미승격 |

## 이어서 할 일

- 전용 브랜치의 R58까지의 검증 원장과 R45/R53/R56 계획을 우선한다.
- 08번 이후 주제는 해당 계획의 사용자 승인 범위에서 개별로 진행하며, 최신 공식 원문 검증·PC Ollama·예열 1회+실측 3회·동질성 판정 기록을 별도 생성한다.
- R63~R66 문서를 검토할 때는 R63의 60개 원문 GET과 R64~R66의 검색기반 조회를 구분한다. 저장된 JSON을 조회 시점의 최신 증거로 사용하지 않는다.
