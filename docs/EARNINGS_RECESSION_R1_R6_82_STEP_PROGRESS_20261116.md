# ZGMINI W05 실적 침체 — R1~R6 전체 82단계 진행 기록

- 기준일: **2026-11-16 KST**
- 저장소: `ansqhd5774-Choi/zgmini`
- 작업 브랜치: `codex/api-site-integration-r1-20261026`
- [82단계 작업계획서](EARNINGS_RECESSION_R1_R6_82_STEP_EXECUTION_PLAN_20261116.md)
- 기존 [14단계 종단계획](EARNINGS_RECESSION_14_STAGE_HISTORY_PUBLIC_CODE_REMEDIATION_R1_20261116.md)
- 과거 [실제 성공·실패·연동 노하우](EARNINGS_API_SITE_WORKING_KNOWHOW_R1_20261027.md)

## W05 진행 기록 계약 — 단일 인계 정본 (2026-11-16 확정)

**이 파일은 W05의 유일한 현행 진행·인계 기록 정본이다.** 별도 계획서, 실험 보고서, PR, 제어 저장소 중앙 #68 댓글은 관련 원본 증거이지만 이 파일의 최신 작업 상태를 대신하지 않는다. 어떤 대화·예약·다음 작업자가 시작하더라도 지정 전담 브랜치의 **최신 HEAD에 있는 이 파일**에서 마지막 완료 지점과 다음 실행을 이어받는다.

### A. 작업 시작 시 단 한 번 수행

1. 저장소 `ansqhd5774-Choi/zgmini`, 전담 브랜치 `codex/api-site-integration-r1-20261026` 최신 원격 HEAD, 이 진행 파일 및 [82단계 계획](EARNINGS_RECESSION_R1_R6_82_STEP_EXECUTION_PLAN_20261116.md)의 **해당 작업 ID**를 확인한다. 다른 병렬 소스 브랜치/PR은 효과·SHA를 구분한다. 본 대화에서 이미 확인한 상태는 source drift·모순 발생 때만 재확인한다.
2. 아래 **인계 스냅샷 → 82개 단계별 상태표 → 최신 작업 원장** 순으로 읽고 마지막 유효 PASS의 증거를 재사용한다. 이전 작업자의 실제 종료 후속 실행 **하나**를 정해, 승인된 업무부터 바로 수행한다. 지난 대화 전체 복원, 예전 작업 중복 진단, 모든 82항목의 추가 조사를 현재 작업의 선행조건으로 만들지 않는다.
3. 권한·설치·운영 효과는 [제어 저장소 최신 공통 정본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/AGENTS.md)과 관련 승인 manifest·실제 등록·Runtime이 우선한다. 이 기록은 **새로운 B 게시 승인/설치 명령이나 D1 쓰기 승인 자체가 아니다**.

### B. 진행 중과 사용자 보고 전 필수 처리

1. **의미 있는 작업 단위가 끝날 때마다**, 조사·설계·시뮬레이션·소스 수정·PR·CI·PC 수집/계산·D1 게시·API/UI·BLOCKED를 포함해 **이 동일 파일**의 (a) 해당 82개 ID 상태·증거, (b) 최신 작업 결과 원장, (c) 아래 인계 스냅샷의 마지막 유효 완료/다음 한 작업을 **같은 갱신에서** 반영한다. 각각의 코드 변경·CI 결과마다 불필요한 새 문서나 별도 이슈를 만들지 않는다.
2. **반드시 사용자 최종 보고 전에 GitHub 반영 커밋과 지정 브랜치 파일 내용 재조회까지 확인**한다. 파일만 생성·링크만 연결·#68 댓글만 작성·계획서만 변경한 것은 `진행 기록 반영 완료`가 아니다.
3. 기록 항목 최소치: **KST 관측시각**, 작업 ID, 실제 대상/입력, 수행 작업·변경파일, 저장소/브랜치/전후 HEAD·적용 SHA, PR/Issue/requestId/CI Run·TXT/JSON·D1/API/UI 원본 링크, LAST PASS/FIRST FAIL·실제 성공/실패/미실행, 소스·운영 영향과 승인 범위, 남은 정확한 조건, **바로 이어서 수행할 다음 한 작업과 담당·성공 조건**. 없는 값은 `NOT_VERIFIED`로 기재하고 추정하지 않는다.
4. **실행 결과의 상태와 문서 기록 상태는 분리한다.** 실행이 성공했지만 GitHub 파일 갱신이 실패했다면 `실행 성공 / 진행기록 미완료`라고 보고한다. 갱신이 실패했다고 실행 결과를 다시 수행·리셋·삭제하거나 안전 거부를 우회하지 않는다. 먼저 해당 파일의 최신 SHA를 재조회해 자신이 담당한 기록만 충돌 없이 반영한다.
5. `DONE`은 **작업 ID의 완료 기준**에 필요한 실제 증거가 존재할 때만 사용한다. `SOURCE_READY`/`SOURCE_CI_PASS`/부분 검증/ `RUNNING`/`BLOCKED`/`STATE_UNKNOWN`/`DEFERRED`는 각각 분리한다. CI PASS는 PC 설치·D1 원격 readback·Production 성공을 의미하지 않는다. 완료 증거가 불충분하면 완료율 분자를 임의로 늘리지 않는다.
6. 한 실행의 결과가 길면 전체 비민감 요약·정확한 원본 링크·핵심 해시만 남기고, 전체 로그·API 원자료·비밀키·설정·인증 URL은 이 파일에 복사하지 않는다. 유효한 예전 증거는 보존하되 반복 문구를 추가하지 않는다.

### C. 인계 스냅샷 (매 의미 있는 작업 종료 시 갱신)

| 필드 | 마지막 확인 상태 |
|---|---|
| 최종 목표 | 82단계 R1~R6로 적격 실적 침체 정보성 지표의 PC 원자료 저장→계산→승인 D1 게시→Production API/UI를 완성. 기존 E1-R4 점수/산식·기타 12대 기업실적은 보호 |
| 현재 관련 단계 | R4-02~04 및 R6-04: QFR exact-key B 게시 경로·원본 3핀 |
| 마지막 검증 완료점 | 앱 QFR [PR #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175) main 병합 faa89cfbe8b2aeabcbd8b8e9747cc07620f9eff4; 제어 B [PR #1762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1762) main 병합 8c67a6c9e9e778278259593d0eb35b2b0e2a05ea. 앱 CI #43892753705 4483 PASS/0 FAIL, 제어 CI #43892670904 22/22 PASS 및 C996 PASS. BEA #1183 CI 별도 PASS/미병합. 운영 B 승인·PC 실행·D1 원격 게시·UI 실증은 미완료 |
| 재사용할 기존 근거 | QFR 원자료 ZIP의 PC SQLite 저장·계산 기존 유효 증거; 앱 QFR 3-pin [PR #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175) 소스/CI 완료, `main` 미병합 |
| 현재 최초 실제 미완료 조건 | **순차 최초 미완료 R1-02:** PC 승인 source와 수집기·계산기·게시기·작업 등록·Runner의 완전한 관계 표가 미입증. **후행 별도 병목 R6-04:** QFR B exact-key 승인 manifest/owner 승인/실제 PC B 원장·D1 readback 미확보. QFR 앱/제어 `main` 소스는 병합 완료. 두 상태를 구분한다 |
| 다음 필수 실행 하나 | **순차 2/82 R1-02:** 과거 PC #1709 `config.source`·운영 checkout SHA는 재사용하고, 승인된 Controller operations/실제 Task·Runner·수집/계산/게시 경로 매핑의 **누락분만** 확인해 R1-02 완료 증거를 남긴다. 이후 첫 미완료 순번 순으로 이어간다. 뒤쪽 R6-04 QFR 정확키 B manifest/PC 승인은 독립 후행 병목으로 보존하되 현재 순차 번호로 보고하지 않는다 |
| 현재 완료율 증거 | **순차 1/82 DONE (약 1.2%)**, 현재 R1-02(2/82). 뒤쪽 SOURCE/CI 성공 항목은 계속 추적하되 전체 DONE으로 승격하지 않음. 기존 14단계 종단 완료는 마지막 확인 0/14, R6-15는 DEFERRED |
| 최종 갱신 식별 | 이 문서의 **최신 원격 브랜치 HEAD 및 Git blob SHA를 재조회**해 근거로 보고한다. 고정된 과거 SHA를 현행값으로 복사하지 않는다 |
| **순차 포인터·완료율** | **현재 R1-02 = 2/82**, 완료 확정 R1-01 **1/82 (약 1.2%)**. 이전 71/82 현재 단계·11단계 잔여 주장은 정정·철회 |

### D. 다음 작업자 재개 순서 및 변경 충돌

- 다음 대화 담당자는 **위 스냅샷과 본 파일의 최신 원장만으로** 담당 작업을 선택하고, 상세 증거가 필요할 때만 링크된 원본 PR/Run/Issue를 조회한다. GitHub 댓글은 다른 대화의 자동 수신이 아니며, 진행 파일 갱신도 운영 PC 설치가 아니다.
- 다른 작업자가 동시에 진행했다면 원격 최신 Blob SHA를 재조회하고 **자신이 변경한 ID 행과 작업 원장만 선택적으로 병합**한다. 타 담당자의 기존 기록·실행 상태 삭제/덮어쓰기, 무승인 reset/rebase/force push 금지.
- 보고 시 최소 **작업계획 파일/진행 기록 파일/브랜치 HEAD/이번 반영 커밋/실제 검증/첫 미완료/다음 실행**을 표기한다. 기록이 안 됐으면 기록 성공을 주장하지 않는다.
- 이 계약은 **보고 누락 방지·업무 인계 품질 기준**이지 매 작업 전 82개 전수재검사, 신규 Controller, 예약 검증, 별도 승인·새 기능 Gate를 추가하는 근거가 아니다.

## 0-A. 고정 순번·실제 진행률 (2026-11-17 KST 바로잡음)

**82단계 실행계획의 순번을 고정한다.** 이전 `71/82` 보고는 R6-04(목록의 71번째) 관련 소스·권한을 *먼저 조사한 순번*이었고, R1~R6 선행 70개를 통과한 진행 단계가 아니다. 이를 완료율·현재 실행 위치로 사용하지 않는다.

| 판정 항목 | 실제 상태 |
|---|---|
| **순차 완료 확정** | **1/82개 (약 1.2%)** — R1-01만 본 계획 완료 조건을 증거로 기록함 |
| **현재 순차 진행 단계** | **2/82 = R1-02** (실 PC source·수집/계산/게시/작업·Runner 매핑) |
| **82개 중 개별 완료 확정** | **1개**; 그 외 SOURCE/CI·기존 성공 증거는 해당 단계 기준과 대조 전이므로 자동 완료 처리하지 않음 |
| **71번 R6-04** | **후행 소스 선행 작업·현재 운영 승인 미해결**, 순차 71단계에 도달한 것이 아님 |
| **72~82단계 11개 남았다는 이전 보고** | **철회** — 실제 전체 잔여 완료 단계는 81개(기존 유효 소스·운영 증거는 재사용)이며 신규 실행 81회라는 뜻은 아님 |
| **다음 실제 수행 하나** | R1-02의 기존 GitHub/PC 승인 원장·운영 source·Controller/Runner 등록 정보를 **필요 범위만** 대조해 누락된 매핑을 완성; 지난 유효 #1709 source 조회 재실행 금지 |

**순서 운용:** 다음 번호로 넘어가는 기준은 해당 단계의 **계획서 완료 조건 + 근거 링크**이며, 뒤 단계에서 미리 통과한 PR·CI는 계획 순번을 바꾸지 않는 선행 자산으로 유지한다. 사용자 승인 없이 순번이나 완료 기준을 수정하지 않는다. 조건부 HOLD·장기 DEFERRED는 계획서대로 처리하며 다른 독립 승인 작업의 수행을 중단하는 새로운 Gate가 아니다.


## 0. 82개 작업별 진행 상태 (실증·소스 분리)

> **2026-11-17 KST 상태 재판정 기준.** 아래 82개 ID는 각각 한 번씩 등록되어 있다. `DONE`은 현재 **R1-01 하나(1/82)**만 증거 확정했으며, 현재 순차 작업은 **R1-02(2/82)**다. `EVIDENCE_NOT_MAPPED`는 미착수/실패가 아니라 유효 과거 실증 대조 전 상태다. 소스·CI 통과만으로 PC/D1/Production 종단 DONE을 주장하지 않는다.

| 작업 ID | 실행계획 작업 | 현재 증거 기반 상태 | 마지막 확인 증거·남은 조건 |
|---|---|---|---|
| R1-01 | 앱·제어 `main`, W05 브랜치 및 개발·운영·배포 SHA 구분 | `DONE` | **순차 1번 완료:** 2026-11-17 KST GitHub 재조회 앱 `main=af2f963659f15e016a64be1132d4cdec9af0d9c6`, 제어 `main=40a0767ec48829360a0b47a2b37e499d59944a05`, W05 전담 브랜치 확인 시 `e6694ddbd4d01826d8802be355bc671b4e53cd8c` (이번 문서 커밋 후 HEAD 전진). PC 승인 체크아웃은 기존 #1709 A 관측(2026-11-16 12:23:09 UTC) `7afe6b0bcaa74d622ada9190fdc9fcc7fd4d5f10`; **LIVE Core 실행 SHA는 미검증**. Cloudflare Production exact Deployment SHA는 `NOT_VERIFIED`. 개발·PC 저장소·공개 배포를 동일 성공으로 간주하지 않는 서로 다른 상태로 구분·기록함. Production 실제 검증은 R6-14 별도 미완료 |
| R1-02 | 실 PC 승인 `config.source`, 수집기·계산기·게시기·작업 등록·Runner 매핑 | `PARTIAL_SOURCE` | 기존 PC 승인 A 조회 #1709 / Run 43866041104 PASS: PC config.source=7afe6b0bcaa74d622ada9190fdc9fcc7fd4d5f10, QFR 게시기 관련 6개 대상 파일 중 5개 ABSENT·d1.mjs만 PRESENT. A 해시 조회는 파일 설치/B effect 승인이 아님 |
| R1-03 | 운영 SQLite 원자료 테이블·checkpoint·append-only 이력 파악 | `EXISTING_EVIDENCE` | 기존 QFR SQLite 저장/checkpoint 성공 이력 재사용. 전체 원자료 테이블 조사 완료는 미입증 |
| R1-04 | 기존 BLS 3개 원천과 공개 5개 정보성 행 계보 조사 | `EXISTING_EVIDENCE` | BLS 기본 3원천·5행 관련 과거 PC/GET 증거 존재, 최근 운영 상태는 미재검증 |
| R1-05 | BEA 단위이익·제조업의 수집기, CSV/메타 및 실제 저장 여부 조사 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R1-06 | Census QFR·M3·MTIS 기존 수집 코드·ZIP·저장 위치 조사 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R1-07 | SEC CompanyFacts/XBRL 수집 코드·종목 매핑·저장 경로 조사 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R1-08 | 기존 D1 키·Worker GET·Writer·게시 원장 조사 | `PARTIAL_SOURCE` | 기존 QFR/BEA Writer·Worker/D1 키 소스 확인; 실 D1 게시 키 상태는 미확정 |
| R1-09 | 기존 점수 A·기업실적 B·정보성 C API/UI 계약 분리 | `SOURCE_REVIEWED` | 원래 점수 4요소/정보성 지표 분리 계약 문서 확인; UI 실제 동치 검증 별도 |
| R1-10 | 지표별 수집 중복·마지막 유효 완료점·첫 미완료 항목을 통합 인벤토리화 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R2-01 | BEA 공식 NIPA 기업이익·단위이익 시계열 및 단위 확인 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R2-02 | FRED 배포 BEA 단위이익 CSV와 공식 BEA 원본의 정의·권리·개정 비교 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R2-03 | BEA 제조업 기업이익 산업 분류·명목/실질·분기·YoY 기준 확인 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R2-04 | Census QFR 공식 ZIP/API 경로와 제공 데이터 구조 확인 | `EXISTING_EVIDENCE` | 기존 Census QFR 2026Q2 원본 ZIP 저장·구조 검증 이력 |
| R2-05 | QFR 세후이익/매출 분자·분모·산업 표본·비교 분기 정합성 검사 | `EXISTING_EVIDENCE` | 기존 QFR 저장자료 기반 세후이익률 계산 검증 증거; 현재 개정판 재대조 필요시 별도 |
| R2-06 | Census M3 신규주문·출하 공식 변수·단위·조정 정의 확인 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R2-07 | Census MTIS 재고/매출 비율 변수·관측월·개정 내역 확인 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R2-08 | BLS 기본 3원천 `WPSFD4`, `WPSFD41`, `PRS85006111` 정의 확인 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R2-09 | BLS 서비스 PPI `WPSFD42` 정의·관측월·YoY 계산 검증 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R2-10 | SEC CompanyFacts/XBRL 엔드포인트·User-Agent·쿼터 확인 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R2-11 | SEC 기업별 회계항목·회계기간·중복·표본 커버리지 검사 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R2-12 | 공급자별 발표일·관측일·수집일·수정본·계절조정·지연 구별 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R2-13 | 공급자별 재사용권·무료 한도·저장·파생·공개 허용/보류 판정 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R3-01 | 공통 원자료 저장 계약의 provider·series·period·vintage·SHA 확인 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R3-02 | SQLite append-only·개정본·중복·checkpoint 구조 재사용/최소 보완 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R3-03 | 기존 BLS 3원천 저장·계산 PC 실측 증거 재사용 | `EXISTING_EVIDENCE` | 기존 BLS 3원천·공개 5행 유효 증거 재사용, 재수집 금지 |
| R3-04 | WPSFD42 승인 수동 수집 후 SQLite 원본·SHA·시각 재조회 | `NOT_RUN` | WPSFD42 실제 운영 PC 저장·SQLite readback 증거 없음 |
| R3-05 | WPSFD42 저장자료로 서비스 PPI·YoY 정보성 2행 계산 | `SOURCE_READY` | WPSFD42 2행 계산 브랜치 구현 존재, 실제 운영 저장원본 입력 증거 미확정 |
| R3-06 | Census QFR 기존 ZIP 저장 경로·SHA·분기·원장 재조회 | `EXISTING_EVIDENCE` | QFR R2 PC SQLite ZIP 저장·SHA/checkpoint PASS 이력 재사용 |
| R3-07 | 저장 QFR로 제조업 세후이익률 현재·직전·변화폭 계산 | `EXISTING_EVIDENCE` | QFR R3 stored-only 계산 PASS 이력 재사용 |
| R3-08 | BEA 단위이익의 기존 저장 원본 탐색, 필요 시 승인 1회 수집 | `SOURCE_READY` | BEA 저장 원본 capture helper 구현·CI PASS, 실제 PC 저장본 확인 안 됨 |
| R3-09 | BEA 단위이익 CSV·메타·SHA를 하나의 고정 버전에 결속 | `SOURCE_CI_PASS` | 앱 PR #1183 저장 CSV+meta SHA 보관 5/5 Node fixture PASS, 실PC 아카이브 검증 미완료 |
| R3-10 | BEA 단위이익 계산기에서 공급자 호출 분리 | `SOURCE_CI_PASS` | 앱 PR #1183 provider-fetch-free 게시/계산 준비 및 Node CI 성공, 운영 원본 미검증 |
| R3-11 | BEA 제조업 CSV·메타 archive의 SHA·행 수·기간 직접 PC 재조회 | `NOT_RUN` | BEA 제조업 현장 아카이브 CSV/meta 직접 SHA readback 미확보 |
| R3-12 | BEA 제조업 유효 저장 원본으로 분기·YoY 계산 및 이력 보존 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R3-13 | 적격 판정 시 기존 경로로 Census M3 원자료 저장·재조회 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R3-14 | 적격 판정 시 기존 경로로 Census MTIS 원자료 저장·재조회 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R3-15 | 적격 판정 시 SEC XBRL 원자료 저장·기간 정규화·중복 제거 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R3-16 | 저장자료 계산 결정성·SHA 계보·결측·0·개정·stale 검증 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R4-01 | C 전용 독립 D1 키·허용목록·공개 데이터 계약 확정 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R4-02 | 기존 승인 공통 B 경로 확인 및 QFR·BEA 단위이익 exact-key 연결 | `SOURCE_MAIN_CI_PASS` | 제어 B 게시 실행기·승인 검증·비활성 workflow 8파일 [PR #1762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1762) main 병합 SHA 8c67a6c9e9e778278259593d0eb35b2b0e2a05ea. Node CI #43892670904 22/22 PASS·C996 PASS. QFR 10파일 SHA-256 source evidence 고정 app commit 0a786bd69c7dc815d296143021473d8f6bf7a118 (§6); 승인 manifest/별도 owner 승인·PC 실효과는 없음 |
| R4-03 | 제어 실행기 key·MODE·원본·D1 결과 검증 결함 수정 및 BEA 회귀 | `SOURCE_MAIN_CI_PASS` | 제어 B 계약·QFR source pin·readback·요청별 결과 처리 코드 main 소스 병합. Executor blob 1cc9088a3d025b6b8185d13c932f3538c81b2954, Windows Node CI 22/22 PASS. 운영 실행은 별도 |
| R4-04 | QFR preflight의 sourceVersion·ZIP SHA·sourceStoredAt을 apply까지 고정 | `SOURCE_MAIN_CI_PASS` | 앱 QFR 3-pin·per-request output [PR #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175) main 병합 SHA faa89cfbe8b2aeabcbd8b8e9747cc07620f9eff4, publisher blob f2b78e7d806ee9792e19a6a12636f547849026fd, Node CI #43892753705 4483 PASS/0 FAIL. D1은 미게시 |
| R4-05 | PC 저장 QFR 계산으로 경량 Snapshot 구축·스키마 검증 | `SOURCE_READY` | 기존 QFR one-shot Publisher와 Reader 소스 존재, 운영 적격 payload preflight 필요 |
| R4-06 | 승인 QFR 단일키 D1 게시·실제 body/version/stored_at readback | `BLOCKED_PUBLISH_SCOPE` | 제어 main에 게시 소스는 있으나 승인 manifest approvals/publications/<requestId>.json 부재, 별도 owner B 승인 Issue/PC 실제 효과·원격 D1 readback 없음. 실제 게시 NOT_RUN |
| R4-07 | BEA 단위이익 게시 중 공급자 재호출 제거·원본 SHA 고정 | `SOURCE_CI_PASS` | 앱 PR #1183 stored-only BEA Publisher source+Node CI #43884699372 PASS; 운영 raw/D1 없음 |
| R4-08 | 승인 BEA 단위이익 key D1 게시 및 실제 시각/버전 비교 | `NOT_RUN` | BEA 단위이익 실제 B D1 게시/readback 증거 없음 |
| R4-09 | WPSFD42 독립 Publisher·Worker·테스트를 current main 기준 선별 통합 | `SOURCE_BRANCH_ONLY` | W05 브랜치의 WPSFD42 독립 2행 Publisher/Worker 소스는 main 미반영. 기존 결과 TXT의 checkout 내 저장 문제를 요청별 `ZGMINI_EARNINGS_C_LOG_DIR`·기존 수동 HERE fallback으로 보완. 순수 helper blob ff5e616593ec… 및 테스트 1eebf1152d82… exact Git SHA 확인; 격리 Node22 지역 fixture **4/4 PASS**(WPS 게시기 전체 파일은 경로 부분만 재현하여 end-to-end CI 미확인). R4-09의 main 선별 통합과 실제 D1 2행 쓰기는 미완료 |
| R4-10 | WPSFD42 전용 D1 키에 2행 게시·기존 BLS 5행 key 보호 | `NOT_RUN` | WPS 서비스 전용 D1 2행 실게시·기존 5행 원장 불변 미실증 |
| R4-11 | BEA 제조업 별도 게시 키·승인 효과·archive SHA 결속 | `PUBLISH_SCOPE_UNVERIFIED` | BEA 제조업 전용 B 게시 effect/manifest 미확정 |
| R4-12 | BEA 제조업 독립 D1 게시 후 body/version/time readback | `NOT_RUN` | BEA 제조업 D1 단일키 실제 게시·재조회 미실증 |
| R4-13 | 적격 M3·MTIS 게시 필요 시 승인된 독립 키·Writer 최소 연결 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R4-14 | 적격 SEC 게시 필요 시 승인된 파생 key·Worker 계약 연결 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R4-15 | 공개 API를 D1 저장형 GET/HEAD로 구현·freshness/status 제공 | `PARTIAL_SOURCE` | 기본 BLS 5행 및 QFR/BEA Worker stored-only 구현은 존재, 전체 지표 운영 GET 증거 미완료 |
| R4-16 | 단조 checkpoint·멱등성·부분실패 UNKNOWN·중복 방지 및 원장 검증 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R5-01 | 기존 E1-R4 방어 점수·1년 차트·4요소 보존 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R5-02 | 정보성 C 영역을 기존 점수 A 및 기업실적 B와 명확히 구분 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R5-03 | 고정 배열 대신 API rows/registry 기반 지표 수 동적 표시 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R5-04 | 기본 BLS 3원천의 기존 공개 5행 보존 | `EXISTING_EVIDENCE` | BLS 기본 5개 정보행 공개 GET 과거 PASS 이력, 전체 UI 현재판 불변은 미확정 |
| R5-05 | WPSFD42 READY 시 신규 2행 합성 7행, 미제공 5행 유지 | `SOURCE_BRANCH_ONLY` | WPS 서비스 5+2 동적 7행 UI/Reader 일부 브랜치 준비, main 미반영 |
| R5-06 | Census QFR 제조업 세후이익률 현재·직전·변화폭 표시 | `SOURCE_MAIN_READY` | QFR API·UI PR #958 main 반영 이력, 실제 현재 D1 값 없어 종단 미완료 |
| R5-07 | BEA 단위이익 값·직전값·USD_PER_REAL_GVA_UNIT·분기 이력 표시 | `SOURCE_MAIN_READY` | BEA 단위이익 정보성 UI/GET 소스 준비, 운영 D1 값 미실증 |
| R5-08 | BEA 제조업 분기·YoY·출처와 정보성 성격 표시 | `SOURCE_MAIN_READY` | BEA 제조업 Worker/UI 준비 소스 존재, 운영 D1 값 미실증 |
| R5-09 | 적격 M3/MTIS 신규주문·출하·재고/매출 정보 확장 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R5-10 | 적격 SEC 기업 커버리지·기간·지표 정의 표시 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R5-11 | 현재/이전값·단위·관측/수집/게시 시각·stale·차트 정합성 보완 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R5-12 | 390·768·1440·1920px 반응형/접근성·오류 영향·출처 페이지 확인 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R6-01 | 변경된 수집·계산·게시·Worker·UI의 관련 Node 테스트 실행 | `TARGETED_CI_PASS` | 기존 QFR 제어 Node 22/22, QFR 앱 4,483 PASS·0 FAIL 및 BEA CI 성공 유지. 별도 WPSFD42 결과 디렉터리 helper+테스트 원문 Git blob 일치, 로컬 격리 Node22 fixture 4/4 PASS(전체 게시기·전체 앱 CI는 이번 소스 변경 후 미실행). PC/D1/Production 종단 검증 제외 |
| R6-02 | SHA 변경·중복·단위·기간·결측·개정본 회귀검증 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R6-03 | API 403/429/500·D1 timeout·결과 누락·잘못된 key/version 검증 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R6-04 | 승인 B 작업의 실제 Windows Runner·manifest·SHA·Issue/Run 확인 | `BLOCKED_PUBLISH_SCOPE` | 제어 source main 통합 완료. 정확키 B 승인 manifest·별도 owner 승인 Issue 및 실제 Windows 두 checkout/config SHA·게시 실행 미입증. PC #1709은 A 읽기 전용, 일반 Writer B는 D1 쓰기 금지 |
| R6-05 | QFR 실제 D1 body/version/sourceStoredAt/stored_at 검증 | `NOT_RUN` | QFR D1 실제 body/version/timestamp readback 없음 |
| R6-06 | QFR 공개 GET·PC·모바일 화면 값·출처·분기 확인 | `NOT_RUN` | QFR 실제 배포 SHA·현재 Production API/UI 값 일치 미확인 |
| R6-07 | BEA 단위이익 저장 원본·D1 중복·source SHA 검증 | `NOT_RUN` | BEA 저장 원본→D1 단일키 실게시/원문 비교 미완료 |
| R6-08 | BEA 단위이익 GET·5분기·단위·화면 확인 | `NOT_RUN` | BEA 운영 GET/5분기/UI 동치 미완료 |
| R6-09 | WPSFD42 D1 게시 및 기존 BLS 5행 checkpoint 보호 | `NOT_RUN` | WPS 2행 D1 실게시·base5 체크포인트 보호 미실증 |
| R6-10 | WPSFD42 정상 7행/결손 5행 API·UI 검증 | `NOT_RUN` | WPS 실제 Production 7행/5행 상태 검증 미실증 |
| R6-11 | BEA 제조업 archive SHA와 D1 게시 원문·기간·시각 확인 | `NOT_RUN` | BEA 제조업 현장 archive SHA→D1 실게시 미실증 |
| R6-12 | BEA 제조업 GET·YoY·분기 이력·UI 확인 | `NOT_RUN` | BEA 제조업 운영 API/UI 일치 미실증 |
| R6-13 | 기존 E1-R4 4요소·가중치·이력·TTL·별도 12대 도메인 회귀 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R6-14 | 관련 PR·CI·main 통합→Cloudflare Git Integration→정확 배포 SHA→공개 확인 | `IN_PROGRESS_SOURCE` | 앱 QFR main SHA faa89cfbe8b2aeabcbd8b8e9747cc07620f9eff4, 제어 B main SHA 8c67a6c9e9e778278259593d0eb35b2b0e2a05ea 개발 통합, 관련 CI PASS. 실제 PC/D1/Cloudflare 정확 Deployment/API/UI 검증 미완료 |
| R6-15 | 다음 공식 발표 이후 자연 수집·checkpoint·D1·UI 실제 전진 관찰 | `DEFERRED` | 다음 실제 공식 발표 후 자연 갱신 확인; 현재 구현 STOP Gate 아님 |

**상태 집계(82개 정확히 1회씩):** `DONE` 1개 · `PARTIAL_SOURCE` 3개 · `EXISTING_EVIDENCE` 8개 · `EVIDENCE_NOT_MAPPED` 36개 · `SOURCE_REVIEWED` 1개 · `NOT_RUN` 13개 · `SOURCE_READY` 3개 · `SOURCE_CI_PASS` 3개 · `SOURCE_MAIN_CI_PASS` 3개 · `BLOCKED_PUBLISH_SCOPE` 2개 · `SOURCE_BRANCH_ONLY` 2개 · `PUBLISH_SCOPE_UNVERIFIED` 1개 · `SOURCE_MAIN_READY` 3개 · `TARGETED_CI_PASS` 1개 · `IN_PROGRESS_SOURCE` 1개 · `DEFERRED` 1개. 각각의 상태는 최종 운영 완료율이 아니다.

## 1. 현재 확정 가능한 진행 상태

| 기준 | 실제 상태 |
|---|---|
| 전체 계획 | **R1 10 + R2 13 + R3 16 + R4 16 + R5 12 + R6 15 = 총 82단계** |
| 82단계 실제 완료 수 | **1/82 확정 DONE (R1-01)**. 81개 단계는 기준에 맞춘 개별 완료 미확정이며, 미완료 81회 재실행을 의미하지 않음. 현재 순차 2/82 R1-02 |
| 기존 14단계 실제 종단 완료 | 마지막 확인 기준 **0/14** — 소스·테스트 PASS는 별도 |
| QFR 원자료·계산 | 2026-10-27 운영 PC의 기존 유효 저장·계산 성공 증거 재사용 |
| QFR B 게시기 코드 | 제어 [PR #1762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1762) 8파일 main 소스 병합 8c67a6c9e9e778278259593d0eb35b2b0e2a05ea. 독립 B Workflow는 vars/manifest/owner 댓글 필요, 실제 승인·게시 없음 |
| QFR B 게시기 실제 Node CI | 최신 [Run #43892670904](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43892670904) **22/22 PASS, 0 FAIL**. 변경 전 [#43883643669](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43883643669) 21/21 PASS는 이력으로 유지 |
| QFR 원자료 3핀 | 앱 [PR #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175) main 병합 faa89cfbe8b2aeabcbd8b8e9747cc07620f9eff4; CI 4483 PASS/0 FAIL. 운영 D1 게시 전 |
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
| R4-02 | **SOURCE_MAIN_CI_PASS** — 제어 8파일 main 병합 PR #1762, Node CI 22/22 PASS·C996 PASS | QFR B 정확키 manifest·별도 owner 승인·실제 PC/D1 실행 미완료 |
| R4-03 | **SOURCE_MAIN_CI_PASS** — 제어 계약·readback·요청별 로그 source main 병합 | B 실제 실행 승인·검증은 별도 |
| R4-04 | **SOURCE_MAIN_CI_PASS** — 앱 QFR 3-pin source main 병합 #1175, 4483 PASS | 실제 게시·D1/readback은 미실행 |
| R6-01 (제어 게시 관련) | **TARGETED_CI_PASS** — 제어 B Node 22/22, 앱 QFR 4,483 PASS·0 FAIL, 기존 BEA CI PASS | 다른 운영 범위 실증·PC/D1/Production은 별도 |
| R3-09~10 | **SOURCE_CI_PASS / PC SOURCE UNVERIFIED** — BEA CSV+메타 불변 저장 라이브러리·시험 PASS | 공식 공급자 원본/권리 확인, 승인된 PC Collector의 실제 저장·SHA 재조회 |
| R4-07 | **SOURCE_CI_PASS / D1 NOT_RUN** — BEA 저장형 게시기는 수집과 분리되고 공급자 재호출 없음 | 실제 BEA 저장 원본 확보, 승인 B 효과, 원격 게시·재조회 |
| R6-04 | **NOT_RUN** | 실제 승인 manifest·운영 설치·고유 Issue/Run/JSON/TXT |
| R4-06 및 R6-05~06 | **NOT_RUN** | 승인된 QFR 정확키 D1 게시, body/version/timestamp 재조회, Production GET/UI 확인 |
| 기타 R1~R6 항목 | **NOT_YET_MAPPED** | [82단계 계획서](EARNINGS_RECESSION_R1_R6_82_STEP_EXECUTION_PLAN_20261116.md)의 각 ID에 과거 유효 증거를 연결한 다음 DONE/READY/HOLD/DEFERRED 확정 |

## 3. 실제 첫 병목과 다음 실행

**FIRST BLOCKER(현재 순서):** R1-02의 PC 승인 source 및 공통 수집기·계산기·게시기·등록 Task·Runner 전체 매핑 증거 미완료. **후행 QFR B 게시 차단(R6-04/R4-06)**은 main 소스 통합과 별개로 정확키 승인 manifest·owner 별도 승인·운영 runtime pin 미확보이며 임의 우회하지 않는다. 후행 소스·CI 성공을 현재 순차 단계 71 진입으로 보고하지 않는다.

**다음 필수 실행:** **R1-02(계획 2/82)** 기존 승인 PC/Controller 원장·등록 Runner·실제 작업 source 증거에서 수집기·계산기·게시기 매핑을 정확히 정리한다. 필요하지 않은 PC 재진단·새 예약·미승인 D1 게시를 하지 않는다. 이 단계 완료 증거를 지정 파일에 반영한 다음 R1-03으로 이동한다.

정규 예약의 다음 자연 발표 관찰(R6-15)은 **DEFERRED**이며 현재 기능 완성의 강제 완료 Gate가 아니다.

## 4. 다음 업데이트 기록 규칙

각 실행마다 `관측시각(KST) / 작업 ID / LAST PASS / FIRST FAIL / requestId·Issue·Run / 실행 PC·실제 source SHA / 저장·D1·UI 증거 / 새 상태 / 다음 필수 행동`을 누적한다. 이전 성공을 근거 없이 재실행하지 않고, Source/CI 준비 상태만으로 운영 DONE을 주장하지 않는다.

## 5. 최신 작업 결과 원장 — 후속 채팅 종료 전 반드시 기록

| 관측 기준(KST) | 작업/실제 결과 | 근거(실제 변경·검증) | 누락된 종료 조건 |
|---|---|---|---|
| 2026-11-16 23:14경 | R4-02 제어 B 게시 경로 소스 7파일 선별 통합 | [Draft PR #1762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1762), 최신 main에서 별도 분기. 실제 운영 변경 0건 | 해당 B exact-key 승인 manifest/실PC 설치·D1 게시 |
| 2026-11-16 23:17경 | R4-03 게시 결과 검증 Node 집중시험 **21/21 PASS** | [Run #43883643669](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43883643669), Windows 격리 CI. 0 FAIL | 제어 main 선택적 통합·설치·운영 검증 |
| 2026-11-16 23:22경 | R3-09~10/R4-07 BEA 저장형 게시기·불변 archive Node CI **PASS** | [Draft PR #1183](https://github.com/ansqhd5774-Choi/zgmini/pull/1183), [Run #43884699372](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43884699372), 4471 total/4461 pass/10 skip/0 fail, 원본 archive 5/5 | BEA 공식 자료·권리·PC 실제 저장·D1 readback |
| 2026-11-16 23:35~23:36 | 82단계 독립 진행 파일 생성·계획서 링크 | 기존 커밋 [68913de6](https://github.com/ansqhd5774-Choi/zgmini/commit/68913de6a85cfdf7e74e0e0622c6d8b6f86aa859), [9caeb69b](https://github.com/ansqhd5774-Choi/zgmini/commit/9caeb69bb457ea5d0c08177ac1358401b04817f3) | **당시에는 82개 개별 상태 표와 실행순서별 원장이 없어 ‘진행 기록 완료’라고 말하면 안 됨** |
| 2026-11-16 최신 확인 | 사용자가 지적한 진행 기록 누락을 인정하고 82개 ID별 상태·마지막 작업 타임라인 보완 | **이 파일의 현재 변경 커밋을 GitHub에서 직접 재조회하여 최종 확정** | 미대조 항목의 실제 과거 증거 매핑 및 현재 우선 B 운영 effect 검증 |

| 2026-11-16 KST | W05 기록·인계 기준 확립: **82단계별 상태→작업 이력→인계 스냅샷을 항상 동일 파일에 갱신**하고 사용자 보고 전에 원격 재조회. 규칙 자체도 이 기록에 반영 | 진행 기록 [변경 커밋 `8255c6968da72e6a658ecc04f546a04649cd1188`](https://github.com/ansqhd5774-Choi/zgmini/commit/8255c6968da72e6a658ecc04f546a04649cd1188), 브랜치 [`AGENTS.md` `3b8b67c807e80e635f3dc636535a4509f3a01c07`](https://github.com/ansqhd5774-Choi/zgmini/commit/3b8b67c807e80e635f3dc636535a4509f3a01c07), 과거 인계 노하우 [`37d898d3b12f4c5d6ea3c0f1d993adb08a041834`](https://github.com/ansqhd5774-Choi/zgmini/commit/37d898d3b12f4c5d6ea3c0f1d993adb08a041834) | 기록 규칙 문서 반영 **DONE**, 기능 운영 QFR B exact-key 승인·설치·D1 게시·Production은 이전과 같이 별도 **미완료** |

| 2026-11-17 00:08 KST (2026-11-16 15:08 UTC) | **R4-02~04/R6-01**: QFR B 요청별 결과 TXT가 소스 checkout에 남던 문제를 수정. W05 게시기+테스트, 앱 #1175 및 제어 #1762 소스/테스트 연계 수정·실제 CI **PASS** | W05 `984e145cd33d30577229825959cef4540490c266` + `54117e382964e1860770156cc6d9ce809b6cfedd`; 앱 PR #1175 head `f4e158a87ea89a936e09160ff568ce79954e7de8`, [Run #43892753705](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43892753705) 4,483 PASS/0 FAIL; 제어 PR #1762 head `b679638d7f5c0eb7daff1b3bdafeaddf0fb2b7d7`, [Run #43892670904](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43892670904) 22/22 PASS. [운영 PC 기존 #1709](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1709) 6파일 중 5파일 ABSENT, 승인 A 조회만 PASS | Source/CI **DONE** · 실제 QFR D1 B 승인/설치/게시 **NOT_RUN**. 다음 필수: R4-02/R6-04 정확키 B effect 승인·설치 근거 확보/정규 연결, 그 뒤 D1 단일키 원격 readback |

| 2026-11-17 KST · W05 후속 작업 | **R4-02/R6-04 승인·실제 설치 범위 확정 조사**: control 최신 main에는 `pc-publication-b.yml`·`approvals/publications`·QFR B 게시 Executor가 없고, 기존 QFR #1709은 A급 읽기 전용(운영 6파일 중 5파일 ABSENT). 승인 없는 D1 게시 요청 0건. 병렬로 **R4-09 WPSFD42 게시기 로그 경로 소스 수정**: W05 브랜치에 helper·테스트 신규, Publisher 변경 | 승인 검사: [control main](https://github.com/ansqhd5774-Choi/zgmini-pc-control/tree/main), [운영 A #1709](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1709). WPS 소스 커밋: `b72589c8d538fb455691d23f8aa5833c3c96f7db`, `cc79b4bc80178de07ff76220afc778`, `401dd40057aef41e19a4d05422cb75938541a77d`; helper blob `ff5e616593ec946aca3c963b770f3fd9a778f0de`, test blob `1eebf1152d822c28efd08fae82e0747697d8dabf`, publisher blob `609008dabd0ba04c827ec8df1573dc34949f70da`; 격리 Node22 local fixture **4/4 PASS**, 두 Git blob SHA 동치. 이번 Node 검증의 publisher는 경로 코드만 재현한 부분 fixture여서 **W05 전체 CI PASS 주장 금지** | **첫 차단 R4-02/R6-04:** QFR 정확키 B 승인 manifest·독립 workflow/main 통합·운영 설치 SHA 부재. 다음 필수 실행: 정규 Owner의 정확키 B 승인 효과·main 선별 통합·설치 조건 결속 후 기존 저장 QFR 원본 단일키 게시·D1 재조회. 독립 WPS는 main 선별 통합/실수집/게시 후속, 신규 스케줄·운영 쓰기 0 |

| 2026-11-17 KST · W05 정확한 B 경로 소스 재판정 | **R4-02/R6-04 원인 정정:** 기존 운영 PC #1709에서 QFR 6파일 중 5파일 없음은 사실이나 독립 B 게시기 `validatePcSources`는 그 5파일의 운영 설치를 요구하지 않음. 승인된 운영 source/checkout 무결성과 별도 `main` publisher/정확키 B manifest가 핵심 조건임을 확인. 불필요한 운영 PC Writer 파일 설치를 강제 Gate에서 제외 | [제어 executor source](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/fix/w05-qfr-b-publication-selective-20261116/tools/publication-executor.mjs) · [앱 dual-source gate](https://github.com/ansqhd5774-Choi/zgmini/blob/main/scripts/pc-writer/EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs) · [PC A #1709](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1709) · 제어 `main` 승인 dir/workflow 목록 | 소스 검증 확정. 다음 필수: 승인된 단일키 B source/`main`/manifest 통합·활성 조건 이행 후 QFR 기존 저장분 1키 실제 게시·D1 readback. 이번 PC·D1 운영 쓰기 0 |

| 2026-11-17 KST · W05 연속 실행 | **R4-04 앱 QFR 3-pin 게시기 소스 main 병합**: Draft #1175를 CI·변경 3파일·병합 가능 확인 후 ready 전환, exact head `f4e158a87ea89a936e09160ff568ce79954e7de8`으로 squash merge. `main` 게시기 blob 재조회 PASS. | [PR #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175), 병합 `faa89cfbe8b2aeabcbd8b8e9747cc07620f9eff4`; 사전 Node [Run #43892753705](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43892753705) 4,483 PASS/0 FAIL. 개발 main source만 변경. | 앱 R4-04 **SOURCE_MAIN_CI_PASS**; PC 설치·실 D1·Prod 검증 미실행. 다음: 제어 PR #1762 실제 승인/disabled flag/manifest 점검 후 안전한 source-only main 통합 여부 결정 |

| 2026-11-17 KST · W05 소스 통합 완료 | **R4-02~04/R6-14:** 앱 QFR pin PR #1175를 main에 squash 병합 faa89cfbe8b2aeabcbd8b8e9747cc07620f9eff4, 제어 승인 검증 및 기본 gated B workflow PR #1762를 제어 main에 squash 병합 8c67a6c9e9e778278259593d0eb35b2b0e2a05ea. 사전 CI 앱 4483 PASS, 제어 22/22 PASS·C996 PASS | [앱 PR #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175) / [제어 PR #1762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1762). 앱 main Publisher blob f2b78e7d806ee9792e19a6a12636f547849026fd; 제어 main Executor blob 1cc9088a3d025b6b8185d13c932f3538c81b2954. Workflow gate vars.ZGMINI_B_PUBLICATION_APPLY_ENABLED 이며 스케줄 0, approvals/publications 디렉터리 부재. repo 변수 실값은 조회 불가 | **SOURCE_MAIN_CI_PASS / D1 NOT_RUN**. 실제 B급 승인 manifest/별도 owner Issue·PC 이중 source 증거가 다음 필수 조건; 운영 원자료·DB·D1 쓰기 0건 |

| 2026-11-17 KST · QFR 게시기 10파일 원본 고정 준비 | **R4-02/R6-04**: 제어 B contract가 요구하는 앱 `main` 10파일의 raw UTF-8 SHA-256을 고정 commit `0a786bd69c7dc815d296143021473d8f6bf7a118` 기준 수집·검산. 해시 알고리즘은 알려진 벡터 2개와 과거 PC #1709 승인 파일 원문 해시 교차검증 PASS | 동일 파일 §6 목록, 제어 허용 목록 `tools/publication-contract.mjs`, GitHub 앱 SHA `0a786bd69c7dc815d296143021473d8f6bf7a118`. 실물 PC 운영 checkout 최근 재조회는 하지 않음 | **SOURCE_HASH_EVIDENCE_READY / B APPROVAL_MISSING**, D1 writes 0. NEXT: 운영 `config.source` 실시간 값과 manifest/owner 승인·feature flag 확인; 정확키 승인 후 단회 게시·remote readback |

| 2026-11-17 KST · 사용자 순서 변경 지적에 따른 82단계 진행률 정정 | **R1-01 자료 구분 단계 완료**, 계획의 단계 순서 유지. 이전 `71/82 현재 작업`·`11단계 남음` 보고는 무효화. R6-04 후행 소스·승인 조사와 실제 현재 순차 단계 분리. 82단계 계획서에 순차 승인·진행률 기준 추가 | 앱 `main=af2f963659f15e016a64be1132d4cdec9af0d9c6`, 제어 `main=40a0767ec48829360a0b47a2b37e499d59944a05`, W05 관측 HEAD `e6694ddbd4d01826d8802be355bc671b4e53cd8c`; 운영 PC 과거 [#1709](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1709) 체크아웃 `7afe6b0bcaa74d622ada9190fdc9fcc7fd4d5f10` (live runtime source NOT_VERIFIED), Production exact SHA NOT_VERIFIED. 계획 규칙 커밋 `89ce90046ee453cdc95bab16b8ed638b963ca3e1` | **연속 확정 완료 1/82, 현재 2/82 R1-02**. 다음: 기존 운영 source·등록 작업·Runner 매핑 누락만 채워 R1-02 완료 증거 작성. 후행 미승인 QFR D1 변경 0건 |

### 필수 기록 종료 규칙

1. 작업을 수행했다면 **보고 전에 이 진행 기록에 수행 ID·커밋/PR/Issue/Run·실제 PASS/FAIL·당시 상태·남은 필수 실행을 먼저 반영**한다. 로그 반영 불가능하면 `기록 미완료`로 보고한다.
2. 새 작업 결과는 바로 위 최신 작업 원장에 추가하고, 해당 **82개 ID 상태와 근거를 같은 커밋에서 갱신**한다. 기존 DONE·영수증을 삭제하거나 소스/CI를 운영 DONE으로 승격시키지 않는다.
3. 새 테스트·PR·선별 main 반영은 설치/게시 완료가 아니다. QFR 관련 먼저 해야 할 실행은 B 승인 exact-key effect/실설치 확인→기존 저장 원본 기반 QFR D1 1키 게시→독립 D1 readback→Production API/UI 확인이다.
4. 종료 보고에는 **W05 전담 브랜치의 실제 최신 HEAD와 이 파일 GitHub 재조회 여부**를 명시한다. 자동화나 다른 채팅이 문서 변경을 알아서 받아간다고 가정하지 않는다.

## 6. QFR 정확키 B 원본 의존성 해시 — 읽기 전용 증거

**성격:** 제어 `tools/publication-contract.mjs`의 `census-qfr-margin-once` 10파일 허용목록을 앱 `main`의 고정 SHA에서 재조회해 계산한 raw UTF-8 **SHA-256 자료**. **승인 manifest·게시 requestId·owner 승인 댓글을 생성한 것이 아니며, D1 쓰기 권한은 0이다.**

- 출처: `ansqhd5774-Choi/zgmini` / 고정 Git commit `0a786bd69c7dc815d296143021473d8f6bf7a118` (이 시점 `main`으로 확인). 향후 `main`이 이동하면 현재 HEAD로 다시 승인 고정해야 한다.
- 독립 해시 검증: SHA-256 자체 알려진 빈 문자열/`abc` 기준 통과; 제어 GitHub `approvals/writer-preimage/w05-qfr-publisher-6-readonly-20261116.json` 실제 바이트 해시 결과 `842a337a41f28eb08fd40d97154a7a0045ebf2142ba44e2c9a94754c8839d85c`가 PC #1709에서 사용한 승인 원문 해시와 일치.
- 정확 공개 키: `detail:earnings-recession-indicators:census-qfr-mfg-margin:v1`; 승인 operation: `census-qfr-margin-once`; 저장 원본만 사용(`STORED_SQLITE_ONLY`), 허용 D1 key 최대 1개, 자동 재시도 0회.

| 승인 필요 게시기 파일(고정 앱 commit) | SHA-256 |
|---|---|
| `scripts/pc-writer/EARNINGS_CENSUS_QFR_R1_READONLY.mjs` | `5286287be8773dd8d2d4bdc943e7ee40131d88669c1ec981f4be68a34025879a` |
| `scripts/pc-writer/EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs` | `9d3cd0296d41baa9d6deb12897b164fe13115eada4df17ed14196d89ed9273d0` |
| `scripts/pc-writer/EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY.mjs` | `4119bba808819a71f58b6d76ccb3872b5151c7c80df666b483f4f871bc075933` |
| `scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_PROJECTION_DRAFT_READONLY.mjs` | `59e4303e2135bfad20b9e51c6e48763be655fad5d2f00eb1e9d50b5cb0e3c002` |
| `scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs` | `7b08d799dfce2c5ab720dd69791d727834c2c5c83ed365c39fd89cd3c7853005` |
| `scripts/pc-writer/EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs` | `db4c14f28c7eb196136e431cc51680542f8846e6b183e0aa7d5b3307b27fcb5b` |
| `scripts/pc-writer/d1.mjs` | `267fb175386fa007bd74b255d922fba9ee6fe71ffe953f94970beb8ba9d9ff87` |
| `scripts/pc-writer/d1-transient.mjs` | `f912c335675481f8646380feaebb6241ec0d877b78dbd6fa165e208fdc6d457e` |
| `scripts/pc-writer/d1-diagnostics.mjs` | `2e9ea54661c51d86798800e532edb10c6796694d3049844ef8b283b7ad6dfe5f` |
| `worker/earnings-companion-c-qfr-r1.mjs` | `a66b60a751b9ec9a0a6379027c2b4785c20a4c4a693be72a9398dbc0da32dbd7` |

**실행 전 남은 인증:** `publisherSha`는 위 Git SHA로 후보 고정만 가능하다. `operationalSha`는 별도 **현재 PC config.source/operational checkout clean HEAD 실측** 후 확정(마지막 확인 #1709의 `7afe6b0b...`를 현재라고 간주 금지). `requestId`·승인용 Issue/owner 정확 댓글·`approvals/publications/<requestId>.json`·활성 변수의 실제 값은 미확정. 부재 시 `AUTOMATION_BLOCKED`로 보존하고 미승인 게시를 시도하지 않는다.
