# ZGMINI D05 진행 원장 R1

기준일: 2026-11-24 (KST)
- 저장소: `ansqhd5774-Choi/zgmini`
- 전용 브랜치: `codex/d05-dedicated-20261124`
- 실행계획: [D05 실행계획 R1](D05_EXECUTION_PLAN_R1_20261124.md)
- 원장 착수 HEAD / 계획 반영 커밋: `e70c27b6bd56bd130c643c0baea4bc1326fac769`
- 목적: 기존 시장·업종·테마 최종 계산값의 로컬 저장 → D1 → API → 이력·차트 → 실제 화면 연결.
- 소스 변경 범위: D05 전용 브랜치. PC 제어 저장소는 공통 지원 증거 조회 및 필요한 인계에 한정한다.

## 1. 현재 판정

1·2단계 소스 조사를 진행했다. 시장 27개 정적 ID와 업종 11개 등록 ID를 연결했다. 운영 등록 테마 목록 및 최신 로컬·D1·API·화면 증거는 미확보다.
기존 86%는 역사적 보고치이며 현행 기능 진행률로 사용하지 않는다.
기능 완료율은 대상별 실제 증거와 검증 범위 확정 후 판단한다. 단계 개수로 단순 환산하지 않는다.
원장 생성이나 과거 영수증 재조회는 신규 운영 완료가 아니다.

## 2. 단계별 진행

| 단계 | 작업 | 상태 | 현재 증거 / 남은 조건 |
| --- | --- | --- | --- |
| 1 | 실제 대상·최초 미완료 연결 | 진행 중 | 시장 27개 정적 ID·업종 11개 소스 ID 확인. 테마 운영 등록·승인 ID는 PC 원본 조회 필요 |
| 2 | 계산 사건·저장시각 계약 | 진행 중 | 시장 Writer는 사이클 시작 `now`를 계산 후 로컬 저장·D1 게시에 사용. 실제 계산 완료시각으로 인정 불가; 운영 영수증 미확인 |
| 3 | 시장·업종·테마 로컬 결과 | 미착수 | 기존 업종·테마 영수증 재사용; 최신 대상별 사건 및 저장 확인 |
| 4 | 로컬 → D1 → API | 미착수 | 업종 과거 동일 사건 일치 증거 보존; 최신 사건 및 기타 대상 비교 |
| 5 | 날짜별 이력·차트 | 미착수 | 실제 저장 이력과 공개 시작·종료 날짜, 점 수, 마지막 점 비교 |
| 6 | PC·모바일 | 미착수 | 1440px / 390px 실제 값·날짜·단위·결측·차트 확인 |
| 7 | 변경 통합·운영 완료 | 미착수 | 필요한 변경만 시험·PR·승인 적용; 실제 결과 확인 후 종결 |

상태: 미착수 / 진행 중 / 완료 / 해당 범위 차단.
정상·결측·지연·불일치·미검증은 대상별 결과 분류이며 단계 상태와 구분한다.

## 3. 대상 범위 및 초기 집계

| 대상 | 알려진 범위 | 신규 검증 완료 | 확인된 신규 결함 | 정상 대기 | 현재 한계 |
| --- | --- | --- | --- | --- | --- |
| 시장 공통 | 13개 논리 ID (D05 + D14~D25) | 0 | 미확인 | 미확인 | 정적 ID·소스 경로 확인; 최신 사건·저장·공개 대조 필요 |
| 시장 별도 | 14개 논리 ID (D01~D04, D06~D13, D26~D27) | 0 | 미확인 | 미확인 | 정적 ID 확인; D27 현행 별도 대상, 각 기능의 운영 계약·증거 필요 |
| 업종 | R3 소스 등록 11개, 운영 승인 상태 미확인 | 0 | 미확인 | 미확인 | #3128 과거 동일 사건 PASS; 최신 등록·사건별 검증 필요 |
| 테마 | 과거 영수증상 공개 10개 / 대시보드 목표 30개 | 0 | 미확인 | 미확인 | 현재 공개 승인 목록 및 최신 D1/API/UI 확인 필요 |

시장 27개는 계획상의 논리 ID 범위이며 현재 운영 승인 개수로 확정하지 않는다. 테마 30개는 과거 영수증의 대시보드 목표 수이며 미개발 테마까지 검증 의무로 포함하지 않는다.
D27은 #3094 정적 매핑상 `/api/iran-progress`의 별도 보조 대상이다. 현행 운영 활성 상태는 미확인이다. 제거된 과거 R13 예약은 복원하지 않는다.
미확인 결함·대기를 0건으로 보고하지 않는다.

## 4. 승계할 유효 증거

### 업종 — #3128

- [실제 결과 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3128#issuecomment-7120347538)
- [Run 45313880630](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45313880630)
- [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45313880630-1-seat-4.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45313880630-1-seat-4.txt)
- 2026-11-24T02:38:47.132Z 완료. PASS / SECTOR_R3_PC_D1_API_CONFIRMED_MATCH.
- 증거 수준 SAME_EVENT_DISPLAY_READBACK_ONLY; local PASS, D1/API MATCHED, sameEventVerified=true.
- 관측일 2026-11-20; 로컬 snapshotKey 2026-11-21; 저장시각 1795237518300(ms); API CONFIRMED.
- 로컬·D1·API display digest 일치: 4087e316b6de530ac2f4676683caa60db13431d6ec93e2348a46b64d6e54832e.
- oneYearPitVerified=false, inputLineage=NOT_ATTESTED. 최신 사건 전체, 차트·UI 및 과거 PIT는 이 증거로 완료 판정하지 않는다.
- 실제 Controller 실행 SHA: 4396d2bb326d86b8ce9e27c528519bf0090b8e9e. 요청 앱 SHA: a4065d0e19c74d1730f1ee95c69c31b4cb96ce44. 운영 승인 앱 SHA: acf8ef23e6400a9a07e9897f48005c95bbbc6416. 각각 구분한다.
- providerCalls=0, operationalWrites=0, d1Writes=0.

### 테마 — #3215

- [실제 결과 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3215#issuecomment-7123101400)
- [Run 45334325421](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45334325421)
- [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45334325421-1-operating.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45334325421-1-operating.txt)
- 2026-11-24T05:35:37.088Z 관측, 운영 PC / zgmini-pc-06. PASS / D05_PAID_PUBLIC_FINAL_OUTPUTS_READBACK_VERIFIED.
- 범위 PAID_PUBLIC_FINAL_OUTPUTS_ONLY. 후보 726개 전수 유효, 거부 0, 시각 충돌 0.
- 실제 출력 사건 7,260개; 일별 최종 점 50개; 공개 테마 10개 × 계산일 5일(2026-11-20~24).
- 마지막 계산시각 2026-11-24T05:30:09.817Z; 최신일 테마 10개; currentReceiptMatched=true.
- publicFinalOutputCoverageVerified=true; full30FinalOutputCoverageVerified=false; oneYearComplete=false.
- dailyEventsSha256: 0f081a1759bb2a5e4bdfc17cab8c2c2e4f7856ede5e61081dff9f65c9a88b37a.
- 로컬 계산 후보 및 최종 출력 저장 증거로만 승계한다. 동일 사건의 D1·API·화면과 실제 제공 이력은 추가 검증 대상.
- operationalWrites=0, providerCalls=0, d1Writes=0, automaticRetries=0.

### 시장

- 계획서의 27개 논리 ID / 공통 13개 / 별도 14개를 시작 범위로 승계.
- 실제 매핑 원본 경로와 ID별 영수증을 1단계에서 연결한다.
- stored_at을 계산시각으로 해석하는 계약은 미확인. 2단계에서 Writer 실제 입력과 저장 결과를 대조한다.

## 5. 대상별 상세 원장 — 소스 매핑 진행 중

| ID | 출력 종류 | 계산 소스 | 로컬 저장 | 공개 키 | API | 화면 | 마지막 유효 증거 | 다음 행동 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D01 미국 CNN 공포·탐욕 | 별도 기능 값 | 별도 원본 | 미검증 | 미검증 | /api/fear-greed | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D02 한국 공포·탐욕 | 별도 기능 값 | KR-R7 | 미검증 | 미검증 | 미확인 | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D03 미국 등락 비율 | 별도 기능 값 | 별도 breadth | 미검증 | 미검증 | /api/market-breadth | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D04 한국 등락 비율 | 별도 기능 값 | 별도 breadth | 미검증 | 미검증 | 미확인 | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 기존 화면 counts 연결 결함 확인 |
| D05 미국 종합 overall | 최종 점수 | CM-R1 / market | market_public_snapshots_v1 경로 확인, 실값 미검증 | market_public_snapshots_v1 / current·UTC일 | /api/market-score | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D06 inflationStability | 별도 기능 값 | 별도 위험 projection | 미검증 | 미검증 | 미확인 | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D07 recessionDefense | 별도 기능 값 | 별도 위험 projection | 미검증 | 미검증 | 미확인 | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D08 stagflationSafety | 별도 기능 값 | 별도 위험 projection | 미검증 | 미검증 | 미확인 | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D09 creditRiskDefense | 별도 기능 값 | 별도 위험 projection | 미검증 | 미검증 | 미확인 | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D10 earningsRecessionDefense | 별도 기능 값 | 별도 위험 projection | 미검증 | 미검증 | 미확인 | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D11 assetBubbleSafety | 별도 기능 값 | 별도 위험 projection | 미검증 | 미검증 | 미확인 | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D12 debtRiskSafety | 별도 기능 값 | 별도 위험 projection | 미검증 | 미검증 | 미확인 | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D13 supplyShockSafety | 별도 기능 값 | 별도 위험 projection | 미검증 | 미검증 | 미확인 | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D14 inflation | 최종 점수 | market domains | market_public_snapshots_v1 경로 확인, 실값 미검증 | market_public_snapshots_v1 / current·UTC일 | /api/market-score | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D15 employment | 최종 점수 | market domains | market_public_snapshots_v1 경로 확인, 실값 미검증 | market_public_snapshots_v1 / current·UTC일 | /api/market-score | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D16 rates | 최종 점수 | market domains | market_public_snapshots_v1 경로 확인, 실값 미검증 | market_public_snapshots_v1 / current·UTC일 | /api/market-score | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D17 credit | 최종 점수 | market domains | market_public_snapshots_v1 경로 확인, 실값 미검증 | market_public_snapshots_v1 / current·UTC일 | /api/market-score | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D18 growth | 최종 점수 | market domains | market_public_snapshots_v1 경로 확인, 실값 미검증 | market_public_snapshots_v1 / current·UTC일 | /api/market-score | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D19 consumption | 최종 점수 | market domains | market_public_snapshots_v1 경로 확인, 실값 미검증 | market_public_snapshots_v1 / current·UTC일 | /api/market-score | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D20 earnings | 최종 점수 | market domains | market_public_snapshots_v1 경로 확인, 실값 미검증 | market_public_snapshots_v1 / current·UTC일 | /api/market-score | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D21 liquidity | 최종 점수 | market domains | market_public_snapshots_v1 경로 확인, 실값 미검증 | market_public_snapshots_v1 / current·UTC일 | /api/market-score | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D22 fundFlows | 최종 점수 | market domains | market_public_snapshots_v1 경로 확인, 실값 미검증 | market_public_snapshots_v1 / current·UTC일 | /api/market-score | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D23 breadth | 최종 점수 | market domains | market_public_snapshots_v1 경로 확인, 실값 미검증 | market_public_snapshots_v1 / current·UTC일 | /api/market-score | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D24 dollarFx | 최종 점수 | market domains | market_public_snapshots_v1 경로 확인, 실값 미검증 | market_public_snapshots_v1 / current·UTC일 | /api/market-score | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D25 commodities | 최종 점수 | market domains | market_public_snapshots_v1 경로 확인, 실값 미검증 | market_public_snapshots_v1 / current·UTC일 | /api/market-score | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D26 금리 심리 | 별도 기능 값 | 별도 저장 | 미검증 | 미검증 | /api/rate-sentiment | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| D27 이란 위험 진행 | 별도 기능 값 | 별도 보조 | 미검증 | 미검증 | /api/iran-progress | 미검증 | [#3094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3094#issuecomment-7123924603) 정적 매핑 | 로컬→D1→API 동일 사건 확인 |
| sector:technology | R3 업종 점수 | sector-fear-greed-r3-public | #3128 그룹 사건만 PASS | sector-fear-greed-r3 / current·UTC일 | /api/sector-fear-greed | 미검증 | [#3128](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3128#issuecomment-7120347538) 그룹 증거 | 최신 ID별 로컬→D1→API 확인 |
| sector:communication | R3 업종 점수 | sector-fear-greed-r3-public | #3128 그룹 사건만 PASS | sector-fear-greed-r3 / current·UTC일 | /api/sector-fear-greed | 미검증 | [#3128](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3128#issuecomment-7120347538) 그룹 증거 | 최신 ID별 로컬→D1→API 확인 |
| sector:discretionary | R3 업종 점수 | sector-fear-greed-r3-public | #3128 그룹 사건만 PASS | sector-fear-greed-r3 / current·UTC일 | /api/sector-fear-greed | 미검증 | [#3128](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3128#issuecomment-7120347538) 그룹 증거 | 최신 ID별 로컬→D1→API 확인 |
| sector:industrials | R3 업종 점수 | sector-fear-greed-r3-public | #3128 그룹 사건만 PASS | sector-fear-greed-r3 / current·UTC일 | /api/sector-fear-greed | 미검증 | [#3128](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3128#issuecomment-7120347538) 그룹 증거 | 최신 ID별 로컬→D1→API 확인 |
| sector:financials | R3 업종 점수 | sector-fear-greed-r3-public | #3128 그룹 사건만 PASS | sector-fear-greed-r3 / current·UTC일 | /api/sector-fear-greed | 미검증 | [#3128](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3128#issuecomment-7120347538) 그룹 증거 | 최신 ID별 로컬→D1→API 확인 |
| sector:utilities | R3 업종 점수 | sector-fear-greed-r3-public | #3128 그룹 사건만 PASS | sector-fear-greed-r3 / current·UTC일 | /api/sector-fear-greed | 미검증 | [#3128](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3128#issuecomment-7120347538) 그룹 증거 | 최신 ID별 로컬→D1→API 확인 |
| sector:healthcare | R3 업종 점수 | sector-fear-greed-r3-public | #3128 그룹 사건만 PASS | sector-fear-greed-r3 / current·UTC일 | /api/sector-fear-greed | 미검증 | [#3128](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3128#issuecomment-7120347538) 그룹 증거 | 최신 ID별 로컬→D1→API 확인 |
| sector:materials | R3 업종 점수 | sector-fear-greed-r3-public | #3128 그룹 사건만 PASS | sector-fear-greed-r3 / current·UTC일 | /api/sector-fear-greed | 미검증 | [#3128](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3128#issuecomment-7120347538) 그룹 증거 | 최신 ID별 로컬→D1→API 확인 |
| sector:energy | R3 업종 점수 | sector-fear-greed-r3-public | #3128 그룹 사건만 PASS | sector-fear-greed-r3 / current·UTC일 | /api/sector-fear-greed | 미검증 | [#3128](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3128#issuecomment-7120347538) 그룹 증거 | 최신 ID별 로컬→D1→API 확인 |
| sector:staples | R3 업종 점수 | sector-fear-greed-r3-public | #3128 그룹 사건만 PASS | sector-fear-greed-r3 / current·UTC일 | /api/sector-fear-greed | 미검증 | [#3128](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3128#issuecomment-7120347538) 그룹 증거 | 최신 ID별 로컬→D1→API 확인 |
| sector:realEstate | R3 업종 점수 | sector-fear-greed-r3-public | #3128 그룹 사건만 PASS | sector-fear-greed-r3 / current·UTC일 | /api/sector-fear-greed | 미검증 | [#3128](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3128#issuecomment-7120347538) 그룹 증거 | 최신 ID별 로컬→D1→API 확인 |
| theme:robotics | 확정·잠정 점수 | 유료 공통 Registry; 현행 승인 미확인 | #3215 과거 공개 그룹만 PASS | theme-fear-greed-paid-hourly-v1 후보, 현행 키 미검증 | /api/theme-fear-greed | 미검증 | [#3215](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3215#issuecomment-7123101400) 과거 그룹 증거 | 운영 Registry의 public 승인 및 D1 동일 사건 확인 |
| theme:cloud-saas | 확정·잠정 점수 | 유료 공통 Registry; 현행 승인 미확인 | #3215 과거 공개 그룹만 PASS | theme-fear-greed-paid-hourly-v1 후보, 현행 키 미검증 | /api/theme-fear-greed | 미검증 | [#3215](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3215#issuecomment-7123101400) 과거 그룹 증거 | 운영 Registry의 public 승인 및 D1 동일 사건 확인 |
| theme:autonomous-driving | 확정·잠정 점수 | 유료 공통 Registry; 현행 승인 미확인 | #3215 과거 공개 그룹만 PASS | theme-fear-greed-paid-hourly-v1 후보, 현행 키 미검증 | /api/theme-fear-greed | 미검증 | [#3215](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3215#issuecomment-7123101400) 과거 그룹 증거 | 운영 Registry의 public 승인 및 D1 동일 사건 확인 |
| theme:nuclear-smr | 확정·잠정 점수 | 유료 공통 Registry; 현행 승인 미확인 | #3215 과거 공개 그룹만 PASS | theme-fear-greed-paid-hourly-v1 후보, 현행 키 미검증 | /api/theme-fear-greed | 미검증 | [#3215](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3215#issuecomment-7123101400) 과거 그룹 증거 | 운영 Registry의 public 승인 및 D1 동일 사건 확인 |
| theme:defense | 확정·잠정 점수 | 유료 공통 Registry; 현행 승인 미확인 | #3215 과거 공개 그룹만 PASS | theme-fear-greed-paid-hourly-v1 후보, 현행 키 미검증 | /api/theme-fear-greed | 미검증 | [#3215](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3215#issuecomment-7123101400) 과거 그룹 증거 | 운영 Registry의 public 승인 및 D1 동일 사건 확인 |
| theme:fintech | 확정·잠정 점수 | 유료 공통 Registry; 현행 승인 미확인 | #3215 과거 공개 그룹만 PASS | theme-fear-greed-paid-hourly-v1 후보, 현행 키 미검증 | /api/theme-fear-greed | 미검증 | [#3215](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3215#issuecomment-7123101400) 과거 그룹 증거 | 운영 Registry의 public 승인 및 D1 동일 사건 확인 |
| theme:cybersecurity | 확정·잠정 점수 | 유료 공통 Registry; 현행 승인 미확인 | #3215 과거 공개 그룹만 PASS | theme-fear-greed-paid-hourly-v1 후보, 현행 키 미검증 | /api/theme-fear-greed | 미검증 | [#3215](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3215#issuecomment-7123101400) 과거 그룹 증거 | 운영 Registry의 public 승인 및 D1 동일 사건 확인 |
| theme:biotech | 확정·잠정 점수 | 유료 공통 Registry; 현행 승인 미확인 | #3215 과거 공개 그룹만 PASS | theme-fear-greed-paid-hourly-v1 후보, 현행 키 미검증 | /api/theme-fear-greed | 미검증 | [#3215](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3215#issuecomment-7123101400) 과거 그룹 증거 | 운영 Registry의 public 승인 및 D1 동일 사건 확인 |
| theme:data-center-power | 확정·잠정 점수 | 유료 공통 Registry; 현행 승인 미확인 | #3215 과거 공개 그룹만 PASS | theme-fear-greed-paid-hourly-v1 후보, 현행 키 미검증 | /api/theme-fear-greed | 미검증 | [#3215](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3215#issuecomment-7123101400) 과거 그룹 증거 | 운영 Registry의 public 승인 및 D1 동일 사건 확인 |
| theme:space-satellite | 확정·잠정 점수 | 유료 공통 Registry; 현행 승인 미확인 | #3215 과거 공개 그룹만 PASS | theme-fear-greed-paid-hourly-v1 후보, 현행 키 미검증 | /api/theme-fear-greed | 미검증 | [#3215](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3215#issuecomment-7123101400) 과거 그룹 증거 | 운영 Registry의 public 승인 및 D1 동일 사건 확인 |

시장 27개는 #3094의 정적 논리 매핑이다. D05 + D14~D25만 공통 시장 최종 점수 readback 대상이며 나머지 14개는 고유 계약을 각각 검증한다. 업종 11개는 `lib/market-score/sector-fear-greed-r3-public.mjs`의 소스 등록 목록이다. 테마 10개 ID는 2026-10-27 공개 범위와 기존 자료를 연결한 **역사적 후보 목록**이며 현행 운영 승인 목록으로 확정하지 않는다. `config/theme-data-registry.json`은 우주·위성을 포함하지 않는 과거 상태여서 운영 정본으로 사용할 수 없다. 운영 PC의 `loadPaidRegistry()`와 D1 `expectedPublicIds`를 읽어 행을 교정해야 한다.

각 행의 미검증은 결함 판정이 아니다. 실제 ID별 관측일·계산시각·저장시각·버전·값·상태·이력 점 수는 운영 영수증 확보 후 기록한다.

### 2단계 시간 계약 소스 조사

- [`run-local.mjs`](https://github.com/ansqhd5774-Choi/zgmini/blob/e6ca2cba11382358d1c568cc52f8b0112d14fdad/scripts/pc-writer/run-local.mjs)는 103행에서 `now=Date.now()`를 얻고 118행에서 시장 계산을 시작한 뒤 160행에서 같은 `now`로 `writeScore`를 호출한다. 185~188행 D05 readback에도 이를 `calculatedAtMs`로 전달한다.
- [`market-operational-store.mjs`](https://github.com/ansqhd5774-Choi/zgmini/blob/e6ca2cba11382358d1c568cc52f8b0112d14fdad/worker/market-operational-store.mjs)는 해당 `now`를 `stored_at`과 UTC 날짜 키에 기록한다. [`publish.mjs`](https://github.com/ansqhd5774-Choi/zgmini/blob/e6ca2cba11382358d1c568cc52f8b0112d14fdad/scripts/pc-writer/publish.mjs)는 같은 `now`를 D1 `stored_at`에 사용한다.
- 따라서 이 값은 **사이클 시작 기준 저장 스냅샷 시각**이며 계산 완료시각의 증거가 아니다. 로컬·D1 동일 저장본 확인에는 사용할 수 있지만 `ACTUAL_CALCULATED_FINAL_SCORE` 사건 시각으로 승격하지 않는다. 운영 PC 계산 완료 영수증이 없으므로 현재 시간 계약은 미완료다.

## 6. 차단 및 독립 작업

운영 PC Registry·로컬 SQLite 및 D1 최신 사건에 대한 유효 읽기 증거가 아직 없다. 이는 1~4단계 운영 검증의 현재 미확인 지점이며, 공통 실행 장애의 현행 상태를 이 실행에서 단정하지 않는다.
PR #3239 / 신규 A급 operation은 필요할 때 사용하는 관측 수단이지 전역 선행조건이 아니다.
공통 장애 발생 시 정확한 대상·실행·오류·최소 지원 조치·반환 결과를 기존 공통 담당 경로에 인계하며 독립 D1/API/소스/화면 검증은 계속한다.
추가 Gate, 예약, 진단 체계, 임의 산식/공급자/운영 DB 변경 금지.

## 7. 실행 이력 및 다음 행동

| 날짜(KST) | 수행 | 증거 | 완료 범위 / 다음 |
| --- | --- | --- | --- |
| 2026-11-24 | 실행계획 R1 등록 | e70c27b6bd56bd130c643c0baea4bc1326fac769 | 계획서만 반영 |
| 2026-11-24 | 진행 원장 초기화 및 기존 영수증 확인 | #3128 / #3215 및 상기 링크 | 신규 운영 실행 없음; 다음 1·2단계 |
| 2026-11-28 | 1단계 시장 27개·업종 11개 정적 ID 연결, 테마 과거 10개 후보 분리 | main `e6ca2cba`; #3094; R3 업종 소스 | 1단계 진행 중; 현행 운영 테마 승인 목록·각 사건 미확인 |
| 2026-11-28 | 2단계 시장 시간 계약 소스 추적 | run-local / market-operational-store / publish | 사이클 시작 `now`가 저장시각으로 재사용됨; 계산 완료시각 증거 아님 |

다음 직접 실행:
1. 운영 PC의 설치된 `loadPaidRegistry()` 결과와 D1 `theme-fear-greed-paid-hourly-v1/current`의 `expectedPublicIds`를 읽어 현행 공개 승인 테마 ID를 확정한다.
2. 기존 승인된 읽기 경로에서 시장 `current`·UTC 일별 저장본과 Writer 완료 영수증을 대조해 저장 스냅샷과 실제 계산 완료 사건을 구분한다.
3. 업종 11개·현행 테마 공개 ID의 최신 로컬→D1→API 동일 사건을 비교하고, D04 화면 counts 전달 결함은 별도 담당 경계에 따라 최소 수정 범위를 확정한다.

최종 종료는 계획 R1의 실제 저장·공개·이력·PC/모바일 검증 기준으로 판단한다. 문서 커밋 자체는 기능 완료가 아니다.
