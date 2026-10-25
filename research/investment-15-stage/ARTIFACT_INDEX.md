# 투자 프로그램 파일·원본 보존 색인

이 GitHub 저장소는 **공개**이므로, 실행 코드·승인된 설계·비밀이 없는 연구 보고서만 보존한다. 사용자 개인 키·외부 이용권 미확인 자료·원본 평가 PDF 15건·개인 PC 수집 로그는 이 브랜치에 게시하지 않는다. 원본은 사용자가 보유한 ZIP 또는 개인 ChatGPT Library에서 확인한다.

## 기준 파일

| 파일 | 이 브랜치 보존 경로 또는 원본 |
|---|---|
| 15단계 최신 정량 설계 R2 | `INVESTMENT_PROCESS_15_STAGE_PRECISE_IMPLEMENTATION_PLAN_R2_QUANT_20261025.md` |
| 15단계 04단계 인수인계 | `INVESTMENT_15_STAGE_HANDOFF_20261025.md` |
| 04단계 단일 판본 검산 R3(v2) | `STAGE04_SAME_VINTAGE_VALIDATION_R3_20261025.md` |
| 04단계 실측 자동 입력 최신 R8 | `STAGE04_INVESTMENT_BOT_R8_FDA_CPUC_LIVE_EVIDENCE_20261025.md`; FDA/CDER와 CPUC 공식 사이트를 **실행마다 조회**, 원본 PDF/ZIP은 GitHub에 저장하지 않음 |
| 04단계 실측 자동 입력 최신 R9 | `STAGE04_INVESTMENT_BOT_R9_IFR_LIVE_EVIDENCE_20261025.md`; IFR 2026 PDF 해시 검증을 추가하여 산업 입력 **5/9**, 원본·유료 IFR 데이터베이스는 GitHub에 저장하지 않음 |
| 04단계 실측 자동 입력 최신 R10 | `STAGE04_INVESTMENT_BOT_R10_IEA_LIVE_SOURCE_20261025.md`; IEA 공식 2026 HTML에서 2025 데이터센터 485 TWh·공표된 반올림 +17%를 **실행 중 직접 파싱**하여 산업 입력 **6/9**. 페이지 원문은 미보관 |
| M2 최신 실행 코드 | `m2/` (R25 ZIP에서 복구한 텍스트 원본) |
| M2 R25 ZIP 전체 | [개인 Library R25 원본](https://chatgpt.com/library?file_id=libfile_cb913f8bf4788191b9a20355b30bab06&account_id=personal), SHA256=`a6e7187e85633f04ed216dcdc0b8ad704564d957c798d0ebaf1c7ddd6e6ea4e9` |
| M2 R25 원본 PDF 15개 | 위 ZIP의 `scorecards/standards/`; [개인 Library R20 원본 포함판](https://chatgpt.com/library?file_id=libfile_95e62486eaa88191be6b3e4802e43f32&account_id=personal), **GitHub 미게시** |

## R25 PDF 기준 해시

`m2/m2-stage8-scorecard-bridge.mjs` 안의 기준 파일명·SHA256 15개가 원본 PDF 검증 계약이다. 작업자가 가진 R25 ZIP의 PDF와 해당 SHA256이 정확히 일치해야 한다. 다른 PDF나 재생성 파일로 대체 금지.

## 이전 버전 원본

R10/R11/R13/R14/R15/R16/R17/R18/R19/R20/R21/R22/R23/R24 ZIP들이 이전 대화 첨부·개인 Library에 보존되어 있다. 코드를 구성할 때 임의로 오래된 버전을 섞지 않는다. **R25를 기준점으로 사용하고, 선행판은 변경 이력·회귀 증거로만 대조**한다. 별도 원본 필요 시 정확한 ZIP과 SHA를 먼저 확인한다.

### 첨부 원본 SHA256 (중복 업로드는 동일 해시)

| 원본 버전 | SHA256 |
|---|---|
| R10 | `9064eb033cc78fb052d1ac13f7bee7e2398b9d335856adf7df4b8118ee4a5bdf` |
| R11 | `57f64c209d4d6b0bee2488c5cd2dfa45a8d2d0d9b2ab60cf4cd240c8a9069ff1` |
| R13 | `823d504d6999e85bb504e595c15b901ad1f609734bc4ce357c70ad6c66bc826a` |
| R13.1 | `1d9341dc5d3c701b3310ed34c2fb1af386b46a28e65f96a8be61e7b5a1d680df` |
| R14 | `5399b2cf5873a40a449eacf10ec157e999309eb21ff3baf5773a2cd9e0f21673` |
| R14.1 | `cc208ad8e01082dca1006260690ed9fb37098973059397b22fef0c1c6292eddb` |
| R15 | `1c2b25abf92712a1a0b982a35f634385ff0cf17f360413f4af2306475051fe98` |
| R16 | `ea3074a0264aa2d324c984a3446c8ce1f4666ccf41f7ba253f9bb6c4353be93b` |
| R17 | `9ba8d21d62dee98c5dd847d750a33ef5b63d0d1e5403f87c8fcc01b3f9e0026b` |
| R18 | `4cbb1c47337d32ee4ef37921826444a3d1d927cd867dd9386900e17b898575c8` |
| R19 | `d62954285216170a2bf2ec7cfdfd0fbe979a1a23291ab5dba42b98636d04f324` |
| R20 | `e907f8a53584a754176d62f1f1c4addead3c0c5ffb0b0548e1dff6fb9fda2244` |
| R21 | `4feb809a25ae11391471db2930d07d5c05f96f01dec688c333708fbfe2b7ec7c` |
| R22 | `49ec13213610c1fd765b22e3dc0bb689432992420bb39b07b0541e1715ef19de` |
| R23 | `1e3d59a137db820cd8f156a0cd94a9552295b1bea63e23bbb6fa59ef1f81cc60` |
| R24 | `5729f6f50e467df738f0315d5f5355f11ae91c5194ebe71c966b8f5661d90f23` |
| R25 | `a6e7187e85633f04ed216dcdc0b8ad704564d957c798d0ebaf1c7ddd6e6ea4e9` |

## 재개 기준

1. `README.md`와 `STATUS.md` 읽기.
2. R25 README 및 코드 직접 확인. 없던 파일·로컬 경로·원본을 추정 생성하지 않기.
3. R3의 최신 유효 잠정 F 우선 정정 준수. 오래된 확정 F를 현재값으로 대체 금지.
4. 실제 실행·API 증거는 날짜·관측일·잠정/확정·소스 버전 구분.
