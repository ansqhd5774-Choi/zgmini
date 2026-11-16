# ZGMINI W05 실적 침체 — R1~R6 전체 82단계 진행 기록

- 기준일: **2026-11-16 KST**
- 저장소: `ansqhd5774-Choi/zgmini`
- 작업 브랜치: `codex/api-site-integration-r1-20261026`
- [82단계 작업계획서](EARNINGS_RECESSION_R1_R6_82_STEP_EXECUTION_PLAN_20261116.md)
- 기존 [14단계 종단계획](EARNINGS_RECESSION_14_STAGE_HISTORY_PUBLIC_CODE_REMEDIATION_R1_20261116.md)
- 과거 [실제 성공·실패·연동 노하우](EARNINGS_API_SITE_WORKING_KNOWHOW_R1_20261027.md)

## 1. 현재 확정 가능한 진행 상태

| 기준 | 실제 상태 |
|---|---|
| 전체 계획 | **R1 10 + R2 13 + R3 16 + R4 16 + R5 12 + R6 15 = 총 82단계** |
| 82단계 실제 완료 수 | **확정하지 않음** — 단계별 기존 PC·원격 D1·Production 증거를 아직 82개 ID 전체에 매핑하지 않음 |
| 기존 14단계 실제 종단 완료 | 마지막 확인 기준 **0/14** — 소스·테스트 PASS는 별도 |
| QFR 원자료·계산 | 2026-10-27 운영 PC의 기존 유효 저장·계산 성공 증거 재사용 |
| QFR B 게시기 코드 | 최신 제어 main 기반 [Draft PR #1762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1762), 운영 main 미병합·설치 미증명 |
| QFR B 게시기 실제 Node CI | [Run #43883643669](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43883643669) **21/21 PASS, 0 FAIL** |
| QFR 원자료 3핀 | W05 전담 브랜치 및 [앱 PR #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175) 준비; 앱 main에 미반영 |
| BEA 단위이익 저장형 게시기 | [앱 Draft PR #1183](https://github.com/ansqhd5774-Choi/zgmini/pull/1183)에서 소스 준비. 임시 원본 아카이브 단위시험 5/5 PASS |
| BEA 단위이익 앱 Node CI | [Run #43884699372](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43884699372) **성공**: 빌드/타입체크 PASS, 회귀 총 4471건 중 4461 PASS·0 FAIL·10 SKIP, 게시 복구 11/11, 후보 공개계약 69/69 |
| B 실제 QFR 단일키 승인·PC 설치 | **UNVERIFIED / NOT_RUN**. 기존 Writer B 파일 overlay 권한은 D1 쓰기 금지 |
| QFR D1 게시·정확키 원격 재조회 | **NOT_RUN**, 성공 영수증 미확보 |
| Production API/UI 최신 실데이터 일치 | **NOT_VERIFIED** |
| 운영 효과 | 이 기록 범위에서 PC 원자료/SQLite/D1/Cloudflare/예약 변경 **0건** |

**원칙:** 코드 완료, CI PASS, 운영 PC 설치, D1 쓰기·실측 재조회, Production UI는 서로 다른 상태다. 과거의 유효한 수집·계산을 반복하지 않으며 미확인 항목을 거짓 DONE 또는 실패 0/82로 표기하지 않는다.

## 2. 작업 ID별 검증된 최신 증거

| 작업 ID | 소스/시험 상태 | 남은 완료 조건 |
|---|---|---|
| R4-02 | **SOURCE_READY** — 제어 Draft PR #1762의 B 게시기 7파일+전용 집중 CI 1파일 | 실제 승인된 B 단일키 사용권·manifest·기등록 Runner 및 운영 PC 설치 SHA 확정 후 올바른 경로 연결 |
| R4-03 | **SOURCE_CI_PASS** — 제어 게시기·계약 실제 Windows 격리 Node 21/21 통과 | 승인 소스 통합 및 필요한 실제 설치 영향 검증 |
| R4-04 | **SOURCE_READY / MAIN_PENDING** — QFR sourceVersion·ZIP SHA·sourceStoredAt 3항목 pin 코드 준비 | 승인된 앱 main 선별 통합 및 운영 원본 preflight/apply 확인 |
| R6-01 (제어 게시 관련) | **TARGETED_CI_PASS** — 제어 Node 21/21, 앱 BEA CI 통과 | 다른 변경 범위에 대한 전체 회귀 여부는 해당 기능 실제 변경 시 평가 |
| R3-09~10 | **SOURCE_CI_PASS / PC SOURCE UNVERIFIED** — BEA CSV+메타 불변 저장 라이브러리·시험 PASS | 공식 공급자 원본/권리 확인, 승인된 PC Collector의 실제 저장·SHA 재조회 |
| R4-07 | **SOURCE_CI_PASS / D1 NOT_RUN** — BEA 저장형 게시기는 수집과 분리되고 공급자 재호출 없음 | 실제 BEA 저장 원본 확보, 승인 B 효과, 원격 게시·재조회 |
| R6-04 | **NOT_RUN** | 실제 승인 manifest·운영 설치·고유 Issue/Run/JSON/TXT |
| R4-06 및 R6-05~06 | **NOT_RUN** | 승인된 QFR 정확키 D1 게시, body/version/timestamp 재조회, Production GET/UI 확인 |
| 기타 R1~R6 항목 | **NOT_YET_MAPPED** | [82단계 계획서](EARNINGS_RECESSION_R1_R6_82_STEP_EXECUTION_PLAN_20261116.md)의 각 ID에 과거 유효 증거를 연결한 다음 DONE/READY/HOLD/DEFERRED 확정 |

## 3. 실제 첫 병목과 다음 실행

**FIRST BLOCKER:** QFR 단일키 B 게시의 **기등록 승인 효과·실제 설치 SHA·manifest** 확인되지 않았음. 제어 Draft PR #1762와 앱 Draft PR #1175는 사용 승인된 운영 B 작업 자체가 아니며, 일반 Writer B 권한으로 D1 게시를 우회할 수 없다.

**다음 필수 실행:** 기존 승인 B exact-key 운영 경로를 실제 PC 등록·원장 기준으로 단회 확인 → 미지원 부분만 정규 Owner 승인 범위에서 최소 소스 통합·설치 → 기존 저장 QFR 원자료로 단일키 `detail:earnings-recession-indicators:census-qfr-mfg-margin:v1` 게시·D1 `body/stored_at/sourceVersion/sourceStoredAt` 재조회 → 공개 API·사이트 일치 확인. 독립 BEA 원본 작업은 필요한 승인 범위 안에서 병렬 진행.

정규 예약의 다음 자연 발표 관찰(R6-15)은 **DEFERRED**이며 현재 기능 완성의 강제 완료 Gate가 아니다.

## 4. 다음 업데이트 기록 규칙

각 실행마다 `관측시각(KST) / 작업 ID / LAST PASS / FIRST FAIL / requestId·Issue·Run / 실행 PC·실제 source SHA / 저장·D1·UI 증거 / 새 상태 / 다음 필수 행동`을 누적한다. 이전 성공을 근거 없이 재실행하지 않고, Source/CI 준비 상태만으로 운영 DONE을 주장하지 않는다.
