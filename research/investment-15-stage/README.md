# 개인 투자 15단계 — 개발 브랜치 작업 원장

기준일: 2026-10-25 (KST)  
브랜치: `codex/investment-15-stage-m2-r25-20261025`  
작업 범위: 연구·정량 검증·읽기 전용 Windows M2 실행 패키지 보존. 운영 ZGMINI 코드 및 주문 기능 변경 없음.

## 다음 대화에서 가장 먼저 읽을 문서

1. `STATUS.md`: 01~15단계별 실제 구현·검증 현황, 최근 실패, 다음 작업.
2. `INVESTMENT_PROCESS_15_STAGE_PRECISE_IMPLEMENTATION_PLAN_R2_QUANT_20261025.md`: 15단계 전체 계획의 최신 설계 기준. 산식·가중치 미승인 부분을 운영 적용하지 않는다.
3. `INVESTMENT_15_STAGE_HANDOFF_20261025.md`: 04단계 이전 대화의 승인·금지·주의사항.
4. `STAGE04_LIVE_F_AND_SOURCE_GATE_R4_20261025.md`: **2026-10-25 현재 공개 HTTP 실측 F 9/9** 및 공식기관 산업 통계·권리·판본 신규 검증. 04단계 최신 실행 위치.
5. `STAGE04_LIVE_F_READER_R6_20261025.md`: 잠정치 우선 최신 F 자동 선택기 및 **오프라인 5/5·실제 공개 API 9/9 PASS**. `stage04/latest-f-readonly.mjs`는 읽기 전용.
6. `STAGE04_SENSITIVITY_R5_RESEARCH_ONLY_20261025.md`: FDA·FedNow 두 공식 시계열의 **가중치·표본 민감도 테스트** 및 승인 전 금지사항. `stage04/quant-sensitivity-readonly.mjs`를 Node로 검사함.
7. `STAGE04_SAME_VINTAGE_VALIDATION_R3_20261025.md`: 앞선 산업 공식 통계 동질성 검산 및 바이오 잠정치 정정.
8. `ARTIFACT_INDEX.md`: R10~R25 압축 패키지 원본 및 15개 PDF의 외부 보존·SHA256.
9. `m2/README_R25_NASDAQ_EARNINGS_REPAIR.md`와 `m2/M2_RUN_READONLY.cmd`: 실제 M2 R25 Windows 읽기 전용 패키지 기준.

## 작업 원칙

- 브랜치 변경은 단위 작업 종료마다 커밋한다. 다음 대화에서 **GitHub 브랜치 최신 커밋·문서부터 확인**한다.
- 모든 단계의 **설계 완료와 실행 코드 검증 완료를 구분**한다. 과거 로그를 현재 실행 성공이라고 하지 않는다.
- 03단계 기존 통과 ETF 9개 및 운영 공포·탐욕 산식은 읽기 전용. **유효한 현재 잠정 공탐 F가 있으면 우선**, 이전 확정 F는 이력 비교에만 쓴다.
- 04단계 산업 성장 G·괴리 D·매력 M 산식의 가중치(60/40, 70/30)는 미승인·미검증 제안이다. 점수를 임의 확정하거나 운영하지 않는다.
- 최초 15개 PDF는 원본 해시를 유지하며 비공개 원본 보관 위치를 `ARTIFACT_INDEX.md`에 기록한다. 공개 GitHub 브랜치에는 원본 PDF, 개인 API 키, 유료 데이터, PC 사용자 데이터·로그를 올리지 않는다.
- 업무상 금지된 자료 출처와 그 복제 경로 사용 금지. 키는 사용자 PC 환경변수만 허용. 자동매매·주문 기능은 범위 밖이다.
- 변경된 개발 브랜치를 `main`에 병합하거나 Cloudflare·PC writer·DB·Provider·스케줄러·DNS를 변경하지 않는다.

## 작업 범위의 경계

- 본 브랜치의 `m2/`는 **원본 R25 ZIP에서 코드 및 비밀이 아닌 텍스트 산출물만 복원한 아카이브**다. 새로운 Windows R25 실행 성공을 뜻하지 않는다.
- `m2/scorecards/standards/*.pdf`는 공개 Git에 포함되지 않는다. 사용자가 보유한 R25 ZIP의 같은 상대경로로 압축 해제해야 15/15 원본 무결성 검사를 실행할 수 있다.
- 다음 작업에서 개인정보·이용권·자격 증명 노출을 피하면서 코드를 선택적으로 갱신한다. `main`의 서비스 기능과 분리한다.

## 이전 산업 통계 이력

- `archive/STAGE04_PRIMARY_SOURCE_RESEARCH_R1_20261025.md`, `archive/STAGE04_OFFICIAL_HISTORY_R2_20261025.md`는 **수정 전 역사 문서**다. R1의 2023 FDA=55 및 +1.09%p 가속은 **혼합 판본 오류로 폐기**되었으며, R3/R4가 현재 진실이다.
- **다음 실행은 R4의 미완료 공식 통계·민감도 검증에서 시작**한다. 저장된 F 스냅샷을 현재값처럼 재사용하지 않고 `/api/theme-fear-greed`를 새로 읽는다.

**실행 경계:** R6 실시간 F 선택기는 G·M·정식 순위를 계산하지 않는다. 다음 대화에서 가중치 승인 없이 R5 연구 출력이나 R25 선택 JSON을 현재 추천 결과로 승격하지 말 것.
