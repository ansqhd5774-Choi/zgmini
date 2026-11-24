# ZGMINI D05 진행 원장 R1

기준일: 2026-11-24 (KST)
- 저장소: `ansqhd5774-Choi/zgmini`
- 전용 브랜치: `codex/d05-dedicated-20261124`
- 실행계획: [D05 실행계획 R1](D05_EXECUTION_PLAN_R1_20261124.md)
- 원장 착수 HEAD / 계획 반영 커밋: `e70c27b6bd56bd130c643c0baea4bc1326fac769`
- 목적: 기존 시장·업종·테마 최종 계산값의 로컬 저장 → D1 → API → 이력·차트 → 실제 화면 연결.
- 소스 변경 범위: D05 전용 브랜치. PC 제어 저장소는 공통 지원 증거 조회 및 필요한 인계에 한정한다.

## 1. 현재 판정

원장 초기화 완료. 실행계획 1~7단계의 신규 운영 검증은 아직 착수하지 않았다.
기존 86%는 역사적 보고치이며 현행 기능 진행률로 사용하지 않는다.
기능 완료율은 대상별 실제 증거와 검증 범위 확정 후 판단한다. 단계 개수로 단순 환산하지 않는다.
원장 생성이나 과거 영수증 재조회는 신규 운영 완료가 아니다.

## 2. 단계별 진행

| 단계 | 작업 | 상태 | 현재 증거 / 남은 조건 |
| --- | --- | --- | --- |
| 1 | 실제 대상·최초 미완료 연결 | 미착수 | 시장 27개 논리 매핑과 운영 승인 업종·테마 목록을 실제 ID별로 연결 |
| 2 | 계산 사건·저장시각 계약 | 미착수 | 시장 stored_at의 실제 Writer 호출 및 계산 완료시각 관계 확인 |
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
| 시장 공통 | 13개 논리 ID (overall + 12 영역) | 0 | 미확인 | 미확인 | 실제 ID·사건·저장·공개 연결 필요 |
| 시장 별도 | 14개 논리 ID | 0 | 미확인 | 미확인 | 고유 계약과 D27 현행 대상 여부 확인 |
| 업종 | 현행 승인 목록 수 미확정 | 0 | 미확인 | 미확인 | 과거 동일 사건 PASS; 최신 등록 대상별 검증 필요 |
| 테마 | 과거 영수증상 공개 10개 / 대시보드 목표 30개 | 0 | 미확인 | 미확인 | 현재 공개 승인 목록 및 최신 D1/API/UI 확인 필요 |

시장 27개는 계획상의 논리 ID 범위이며 현재 운영 승인 개수로 확정하지 않는다. 테마 30개는 과거 영수증의 대시보드 목표 수이며 미개발 테마까지 검증 의무로 포함하지 않는다.
D27은 최신 승인·등록 상태 확인 전 미확정으로 남긴다. 제거된 이란 기능 및 예약은 복원하지 않는다.
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

## 5. 대상별 상세 원장 (1단계에서 실제 등록 ID로 채움)

| ID | 출력 종류 | 계산 소스 | 로컬 저장 | 공개 키 | API | 화면 | 마지막 유효 증거 | 다음 행동 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 미확정: 시장 공통 13개 | 점수 등 | 실제 매핑 확인 | 미검증 | 미확정 | 미검증 | 미검증 | 계획 R1 | ID별 행으로 분리 |
| 미확정: 시장 별도 14개 | 고유 출력 | 실제 매핑 확인 | 미검증 | 미확정 | 미검증 | 미검증 | 계획 R1 | 고유 계약과 D27 확인 |
| 미확정: 업종 승인 목록 | 업종 점수 | 기존 R3 | 과거 사건 PASS | 미확정 | 과거 사건 MATCHED | 미검증 | #3128 | 최신 등록 ID별 분리 |
| 미확정: 테마 공개 목록 | 확정/잠정 점수 | 기존 승인 계산 | 과거 공개 10개 PASS | 미확정 | 미검증 | 미검증 | #3215 | 현행 승인 ID별 분리 |

위 4행은 초기 그룹 자리표시자이며 실제 ID별 검증 완료를 뜻하지 않는다. 등록 목록을 읽은 뒤 실제 ID별 행으로 대체한다.
대상별 관측일·계산시각·저장시각·버전·확정/잠정·값/단위·결측/0·이력 시작/끝/점 수·증거 링크를 해당 행 또는 연결된 기존 영수증에 보존한다.

## 6. 차단 및 독립 작업

현재 실제 필수 행동을 막는 신규 차단 증거 없음. 운영 최신 상태 자체는 미검증.
PR #3239 / 신규 A급 operation은 필요할 때 사용하는 관측 수단이지 전역 선행조건이 아니다.
공통 장애 발생 시 정확한 대상·실행·오류·최소 지원 조치·반환 결과를 기존 공통 담당 경로에 인계하며 독립 D1/API/소스/화면 검증은 계속한다.
추가 Gate, 예약, 진단 체계, 임의 산식/공급자/운영 DB 변경 금지.

## 7. 실행 이력 및 다음 행동

| 날짜(KST) | 수행 | 증거 | 완료 범위 / 다음 |
| --- | --- | --- | --- |
| 2026-11-24 | 실행계획 R1 등록 | e70c27b6bd56bd130c643c0baea4bc1326fac769 | 계획서만 반영 |
| 2026-11-24 | 진행 원장 초기화 및 기존 영수증 확인 | #3128 / #3215 및 상기 링크 | 신규 운영 실행 없음; 다음 1·2단계 |

다음 직접 실행:
1. 기존 시장 매핑 원본 및 운영 승인 업종·테마 목록을 확인하여 실제 ID별 원장과 최초 미완료 연결을 작성한다.
2. 시장 Writer 및 최종 출력 readback의 stored_at 계산시각 계약을 확인한다.
3. 기존 정상 경로는 즉시 로컬/D1/API 동일 사건 대조로 이어가고, 결함 범위만 수정한다.

최종 종료는 계획 R1의 실제 저장·공개·이력·PC/모바일 검증 기준으로 판단한다. 문서 커밋 자체는 기능 완료가 아니다.
