# 투자 프로그램 파일·원본 보존 색인

이 GitHub 저장소는 **공개**이므로, 실행 코드·승인된 설계·비밀이 없는 연구 보고서만 보존한다. 사용자 개인 키·외부 이용권 미확인 자료·원본 평가 PDF 15건·개인 PC 수집 로그는 이 브랜치에 게시하지 않는다. 원본은 사용자가 보유한 ZIP 또는 개인 ChatGPT Library에서 확인한다.

## 기준 파일

| 파일 | 이 브랜치 보존 경로 또는 원본 |
|---|---|
| 15단계 최신 정량 설계 R2 | `INVESTMENT_PROCESS_15_STAGE_PRECISE_IMPLEMENTATION_PLAN_R2_QUANT_20261025.md` |
| 15단계 04단계 인수인계 | `INVESTMENT_15_STAGE_HANDOFF_20261025.md` |
| 04단계 단일 판본 검산 R3(v2) | `STAGE04_SAME_VINTAGE_VALIDATION_R3_20261025.md` |
| M2 최신 실행 코드 | `m2/` (R25 ZIP에서 복구한 텍스트 원본) |
| M2 R25 ZIP 전체 | 개인 원본 `INVESTMENT_M2_R25_NASDAQ_EARNINGS_REPAIR_20261025(1).zip`, SHA256=`a6e7187e85633f04ed216dcdc0b8ad704564d957c798d0ebaf1c7ddd6e6ea4e9` |
| M2 R25 원본 PDF 15개 | 위 ZIP의 `scorecards/standards/`, 개인 Library 원본 보존, **GitHub 미게시** |

## R25 PDF 기준 해시

`m2/m2-stage8-scorecard-bridge.mjs` 안의 기준 파일명·SHA256 15개가 원본 PDF 검증 계약이다. 작업자가 가진 R25 ZIP의 PDF와 해당 SHA256이 정확히 일치해야 한다. 다른 PDF나 재생성 파일로 대체 금지.

## 이전 버전 원본

R10/R11/R13/R14/R15/R16/R17/R18/R19/R20/R21/R22/R23/R24 ZIP들이 이전 대화 첨부·개인 Library에 보존되어 있다. 코드를 구성할 때 임의로 오래된 버전을 섞지 않는다. **R25를 기준점으로 사용하고, 선행판은 변경 이력·회귀 증거로만 대조**한다. 별도 원본 필요 시 정확한 ZIP과 SHA를 먼저 확인한다.

## 재개 기준

1. `README.md`와 `STATUS.md` 읽기.
2. R25 README 및 코드 직접 확인. 없던 파일·로컬 경로·원본을 추정 생성하지 않기.
3. R3의 최신 유효 잠정 F 우선 정정 준수. 오래된 확정 F를 현재값으로 대체 금지.
4. 실제 실행·API 증거는 날짜·관측일·잠정/확정·소스 버전 구분.
