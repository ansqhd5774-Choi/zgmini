# ZGMINI W04 고용지표 R6 — 최신 실행 계획 (2026-11-16)

> 상태: ACTIVE / 운영 연결 완료, `STATE_CLAIMS_BREADTH` PIT 이력 복구 미완료  
> 저장소: `ansqhd5774-Choi/zgmini` · 담당 브랜치: `codex/employment-1y-reader-r1`  
> 개발 기준: **항상 최신 `main`**; 이 문서는 전담 브랜치의 추적 문서이며 현재 기능 코드/운영 source를 의미하지 않는다.  
> 기존 상세 원안: [EMPLOYMENT_R6_DELIVERY_PLAN.md](EMPLOYMENT_R6_DELIVERY_PLAN.md). 해당 문서의 2026-11-08 진행률·차단 설명은 **당시 증거**로 보존하고 최신 상태는 이 문서와 [진행 원장](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)을 우선한다.

## 1. 완료 목표와 운영 계약

- 공식 BLS/DOL 고용 29개 지표(기존 구분 BLS 24 / DOL·ETA 5): 공급자 API → 승인된 PC Core 수집 → 원자료·관측일·출처·PIT 이력 SQLite 보존 → **저장 자료로만** 승인 산식 계산 → 로컬 결과 → 승인된 D1 공개 → `/api/employment-r6/observations` → `/economic-indicators/employment/` 화면.
- 사용자 요청의 범위는 기능의 실제 종료다. 코딩/CI/문서만 완료로 보고하지 않으며, Core 최신 source SHA·DB/원장·D1 공개 시각·Production API/UI를 구분한다.
- 결측·시차·PIT 부족을 정직하게 `STALE/PARTIAL_HISTORY/UNAVAILABLE`로 남긴다. 자료가 입증되지 않으면 29/29 점수 READY를 강제하지 않는다. 차트 1년 READY와 산식에 필요한 10년 PIT 점수 READY는 서로 다른 기준이다.
- 승인 없는 산식·가중치·PIT 정의·DB/D1 스키마·TTL·수집 주기·예약·배포·DNS 변경 금지. 이미 저장된 공식 51지역×600주 원자료의 대량 재수집과 신규 공급자 전환을 기본 후속 작업에 넣지 않는다.

## 2. 최신 완료 지점 — 2026-11-16 KST

| 완료 분야 | 실제 완료 증거 | 판정 |
|---|---|---|
| 자동/수동 ONE_YEAR 정책 분리 | 앱 [PR #1176](https://github.com/ansqhd5774-Choi/zgmini/pull/1176) 및 제어 [PR #1721](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1721) merged; 운영 1파일 Writer B [#1729](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1729) verified | DONE |
| DOL National 일시 장애 대응 | 앱 [PR #1178](https://github.com/ansqhd5774-Choi/zgmini/pull/1178), PC 2파일 설치 [#1751](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1751) `WRITER_B_INSTALLED_VERIFIED` | DONE |
| 수동 원자료 확보 | [#1755](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1755): 실제 Windows `SUCCESS`, DOL 2회, National 4/4·376행, 지역 5,712행, SQLite readback | DONE |
| 승인 Core → 저장 자료 계산 → D1 → API | [Writer 원장 #1758](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1758), [공개 API](https://zgmini.kr/api/employment-r6/observations): `sourceStoredAt=2026-11-16T13:55:15.655Z`, 원자료 29/29 | DONE — 공개 연결 범위 |
| 개별 점수·차트 | API: 점수 28/29, 최근 유효 점수 22/29, 1Y READY 22/29, PARTIAL 5/29, UNAVAILABLE 2/29 | PARTIAL — 합법적 결측과 별개로 1개 이력 문제 |
| 마지막 미완료 지표 | `STATE_CLAIMS_BREADTH`: 2025-07-19 원값 54.90196078%, score `PARTIAL_HISTORY`, chart `UNAVAILABLE`, 첫 부족 참조일 2015-07-25 | OPEN |
| Source-only 이력 감사 | [PR #1186](https://github.com/ansqhd5774-Choi/zgmini/pull/1186) `main` merged `f3ddab1f8506ff4ee49189a88c8e2391a040c626`, Node CI PASS | DONE — 운영 DB 수정 아님 |

**상태 해석:** 서비스 전달 경로 5/5 완료 ≠ 개별 계산 상태 29/29 완료. 과거 실PC 진단 [#782](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/782)에서 2026-11-07 Current 7,695키 중 HISTORY 없는 2,880키 및 후보와 겹치는 개정 충돌 2건 확인. 이 숫자는 **오늘의 결손 건수 아님**.

## 3. 다음 필수 작업 — 실행 순서 / 실제 통과 기준

| 번호 | 작업 항목 | 실행 근거·수행 세부 | 통과 조건 | 현재 |
|---|---|---|---|---|
| W04-PIT-01 | 마지막 성공 증거 보존 | #1755 National+state 수집, #1758 공개 갱신, #1186 소스·CI 재사용. 이미 완료된 수집/설치/전체 CI를 새 실행으로 반복하지 않음 | 이전 성공 ID, SHA 및 증거 유효성 보존 | DONE |
| W04-PIT-02 | PIT 누락 판정 함수 구현 | `employment-r6-claims-pit-recovery.mjs`: 지역 51개 고정, 현재/이력·최신 개정·해시/출처/가용 시각 구분 | 읽기 전용·결측/충돌·메타 미확인 분리, 600주 fixture PASS | DONE — PR #1186 |
| W04-PIT-03 | 최신 운영 PIT 분포 회수 | 기존 등록 A `employment-r6-candidate-stage-readonly`, 기존 승인 고정 분석 번들 SHA `afdd8fab1c03b321e4b8b0853bb236c0800a0a14` 사용. `main` SHA를 오용하지 않음 | 실제 SQLite 열림과 CURRENT/HISTORY/후보 충돌 건수·날짜·시각·source 범위 포함 안전 결과 수령 | BLOCKED — 메모리 |
| W04-PIT-04 | Core 원본 계보 분류 | 주별 완전 51지역·53주 비교·제로 분모·sourceHash, `retrieved_at`, `available_at`, 원본 snapshot·latest revision 분리 | 신규 시점에 검증 가능한 키/불가능한 키/상충 2건을 별도 판정 | WAITING PIT-03 |
| W04-PIT-05 | 복구 가능한 최소 범위 및 승인 확인 | 기존 공식 B 경로에 정확한 DB 대상·테이블·원본 보호·동일 자원 lease·manifest SHA·롤백 근거를 명시. `CURRENT`를 `TRUE_PIT`로 소급 승격하지 않음 | 승인된 정확 파일/키/효과와 실패 시 STOP 정의; 미승인 Core SQL 쓰기 0 | WAITING PIT-04 |
| W04-PIT-06 | 격리 회귀·시뮬레이션 | 신규 유효 관측/중복/개정충돌/미래시각/History 누락/저장 원장/계산/차트 조건 | 수정 영향 테스트 PASS; 과거 2건 상충 행은 자동 승격 금지 | WAITING PIT-05 |
| W04-PIT-07 | PC 최소 이력 복구 | 승인된 기존 B 유지보수 경로 한 번, 기존 DB/잠금/작업 보호. PIT 출처 검증 없는 행은 제외 | 실제 `CURRENT`/`HISTORY` 비교 건수·원장 전진/보호 상태 재조회 | WAITING APPROVAL |
| W04-PIT-08 | 저장 자료 재계산 | 공식 산식 및 PIT 시점 변경 없이 Core SQLite 자료만 사용. 공급자 호출 0건 | `STATE_CLAIMS_BREADTH` 최신 관측/score/1Y history와 부족 이유를 정확히 확인 | WAITING PIT-07 |
| W04-PIT-09 | 기존 D1 Writer 게시 | 승인 Core source와 기존 게시기를 재사용, 본문/hash/stored_at/sourceStoredAt 분리 | D1 readback 일치; 실패·timeout 시 이중 게시 금지 | WAITING PIT-08 |
| W04-PIT-10 | Production API/UI 결론 | `GET /api/employment-r6/observations`, 29행·날짜·원값·점수·차트 구분 | 정상 데이터는 갱신, 불충분한 이력은 `PARTIAL_HISTORY`로 정직하게 표시; PC/모바일 UI 확인 | WAITING PIT-09 |

**안전 판단:** 600주 Current raw가 있다는 것만으로 10년간 당시 알려진 `TRUE_PIT` 이력이 있다는 뜻은 아니다. 공식 과거 자료의 수집시각을 과거로 소급하거나 결손 점수를 임의 산출하는 경로는 채택하지 않는다. 검증 가능한 원자료가 부족하면 해당 지표를 정직한 `PARTIAL_HISTORY`로 남기는 것이 승인 계약에 맞는 완료 판정일 수 있으며, 이 경우 계획의 복구 단계는 더 이상 강행하지 않는다.

## 4. 현재 장애와 다음 행동

- 최신 진단 [#1764](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1764)는 잘못 지정된 최신 `main` bundle로 `R6_BUNDLE_NOT_APPROVED`, SQLite 미열림. 원본 요청 재실행하지 않음.
- 고정 번들을 지정한 다음 [#1765](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1765)는 `RESOURCE_WAIT_MEMORY`, SQLite 미열림, 공급자·DB·D1 쓰기 0. 메모리 안전 거부를 다른 비승인 실행/SQL/PC 경로로 우회하지 않음.
- **다음 필수 실행 하나:** PC 메모리 자원이 정상인 시점에 기존 승인 A 고정 번들/새 고유 ID를 사용해 한 차례만 PIT 분포를 회수하고, 실제 누락/개정충돌·PIT 가용성과 10년 산식 참조 창을 매칭. 이후에만 최소 B 범위를 정한다. 반복 예약 확인과 정규 수집은 완료 조건이 아니다.

## 5. 진행률 산정

- **수집 → PC 원자료 저장 → 계산 → D1 공개 → API/UI 전달:** `5/5` 완료(해당 전달 경로에 한정).
- **29개별 점수:** `28/29` (96.6%), 최근 유효 `22/29`, 1Y 차트 READY `22/29` — 각각 다른 지표.
- **잔여 PIT 10개 상위 범주 / 72개 세부 작업:** `14/72` DONE(19.4%), `58/72` 미완료. `PIT-03`은 메모리 안전 조건으로 BLOCKED. 이를 기존 5단계 운영 진행률의 분모에 합산하지 않는다.
- 이번 문서 작성/관리만으로 PIT 단계·운영 사이트 수치를 진척 처리하지 않는다.

## 6. 역할·공유 자원

W04 원담당이 기능 로직·실제 수동 검증·DB 이력·저장 자료 계산·게시를 담당한다. 동일 Core/DB/Controller에 겹치는 쓰기만 기존 중앙 자원 조정 및 보호 B로 직렬화한다. 다른 기능의 동시 독립 읽기/소스 개발은 중단시키지 않는다. 기존 `zgmini-pc-control/main`의 `AGENTS.md`, `docs/PC_AUTOMATION_STANDARD.md`, `docs/GENERAL_CHAT_START.md` 최신 계약이 실행 시 우선한다.


## 7. 72개 세부 실행 항목 — 실제 작업 단위별 확장 (2026-11-16)

> **계수 정정:** 위 PIT-01~10은 상위 범주 10개일 뿐이다. 각 범주를 실행 입력·행동·검증 가능한 산출물 단위로 세분화한 **총 72개 세부 작업**이 실제 계획의 분모다. `PIT-01`과 `PIT-02` 각 7개는 기존 완료 증거를 항목별로 연결해 `DONE`; 나머지 **58개는 아직 운영 실행 완료로 집계하지 않는다**. 문서 작성·CI만으로 DB 복구 완료를 주장하지 않는다.

| 상위 범주 | 세부 작업 수 | 완료 | 미완료 | 현재 상태 |
|---|---:|---:|---:|---|
| PIT-01 기존 운영 완료 증거 확정·재사용 | 7 | 7 | 0 | DONE |
| PIT-02 소스 계보 판정기·격리 회귀 완료 | 7 | 7 | 0 | DONE |
| PIT-03 현재 운영 PC의 실제 PIT 결손 확보 | 8 | 0 | 8 | BLOCKED (RAM 안전 진단) |
| PIT-04 지역별·주별 원자료와 PIT 정합성 분류 | 8 | 0 | 8 | DEFERRED (선행 근거 필요) |
| PIT-05 복구 가능성 판정·최소 운영 승인 설계 | 8 | 0 | 8 | DEFERRED (선행 근거 필요) |
| PIT-06 선별 복구 코드·fixture 회귀·시뮬레이션 | 8 | 0 | 8 | DEFERRED (선행 근거 필요) |
| PIT-07 승인된 PC의 최소 History 복구·원장 | 8 | 0 | 8 | DEFERRED (선행 근거 필요) |
| PIT-08 저장 자료 기반 계산·로컬 결과 재검증 | 6 | 0 | 6 | DEFERRED (선행 근거 필요) |
| PIT-09 기존 D1 게시기와 읽기 결과 일치 | 6 | 0 | 6 | DEFERRED (선행 근거 필요) |
| PIT-10 Production API/UI 검증·종결 판정 | 6 | 0 | 6 | DEFERRED (선행 근거 필요) |
| **합계** | **72** | **14** | **58** | **19.4% · 세부 작업 기준** |

**완료 판정 원칙:** 모든 행에서 입력/실행과 합격 조건을 확인해야 한다. 시뮬레이션과 실제 PC 설치/SQLite 수정/D1 게시를 하나의 완료 증거로 합치지 않는다. 조건 불충족은 STOP/DEFERRED로 유지하며, 예약 자연 검증·임의 데이터 보간·신규 공급자 호출은 잔여 단계에 추가하지 않는다.

### PIT-01 — 기존 운영 완료 증거 확정·재사용 (7개, 모두 DONE)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-01-01 | 기존 승인된 수동/자동 ONE_YEAR 정책 분리 이력 고정 | 앱 PR #1176 · 제어 PR #1721 | 두 PR 병합·영향 범위 기록 | DONE |
| PIT-01-02 | 수동 ONE_YEAR 수집기 PC 설치 증거 확인 | PC #1729 / Run 43871926762 | 1파일 설치 VERIFIED와 당시 로컬 SHA 구분 | DONE |
| PIT-01-03 | DOL National 최소 재시도 코드·2파일 설치 증거 고정 | 앱 PR #1178 · PC #1751 | 2건 상한 유지·2파일 설치 VERIFIED | DONE |
| PIT-01-04 | 공식 원자료 수동 수집 결과 고정 | PC #1755 / Run 43879444100 | National 4계열/376행·지역 5712행·DOL 2회 | DONE |
| PIT-01-05 | PC SQLite 저장·원장 재조회 완료점 보존 | PC #1755 JSON/TXT·COLLECTOR_RECORDED | 원자료 재수집 요구 없이 저장 결과 범위 확정 | DONE |
| PIT-01-06 | Core 계산/게시 경로의 기존 완료 원장 고정 | PC #1758 · D1 Writer VERIFIED | 원자료 저장 성공과 게시 성공을 별도 증거로 기록 | DONE |
| PIT-01-07 | 공개 API 29개 지표 최신 상태와 마지막 결함 식별 | Production API sourceStoredAt 및 29지표 | 29/29 raw, 28/29 score, STATE_CLAIMS_BREADTH만 PIT 누락 | DONE |

### PIT-02 — 소스 계보 판정기·격리 회귀 완료 (7개, 모두 DONE)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-02-01 | Current/History 비교를 읽기 전용 함수로 분리 | 앱 PR #1186 | 운영 SQLite 쓰기 경로 없이 함수 생성 | DONE |
| PIT-02-02 | 51개 공식 지역·주별 관측 키 정의 | 기존 EMPLOYMENT_R4_CORE_STATES | 50개 주+DC만 인정, 관측 날짜 기준 중복 구분 | DONE |
| PIT-02-03 | 원본 공급자·계열·해시·메타 조건 검증 | STATE_INITIAL_CLAIMS / ETA539:C3 | 확인 불가능한 원본은 HOLD로 분리 | DONE |
| PIT-02-04 | 실제 as-of 시점·retrievedAt·availableAt 경계 분리 | 기존 PIT 자료 계약 | 미래 정보로 과거 상태를 소급 충족하지 않음 | DONE |
| PIT-02-05 | 최신 History 개정 충돌 차단 | 추가 latest-revision regression | 이전 일치 개정만으로 최신 충돌을 덮지 않음 | DONE |
| PIT-02-06 | 600주·51지역·결손·중복 회귀시험 완비 | tests/employment-r6-claims-pit-recovery.test.mjs | 정상/결손/불일치의 계산 입력 차이 재현 | DONE |
| PIT-02-07 | 관련 CI와 source main 병합 확정 | PR #1186 / CI 43886125560 | SUCCESS, merge f3ddab1f…; PC 이력 수정 주장 금지 | DONE |

### PIT-03 — 현재 운영 PC의 실제 PIT 결손 확보 (8개, 현재 BLOCKED)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-03-01 | 읽기 전용 분석에 사용할 고정 승인 번들 식별 | 등록 A `employment-r6-candidate-stage-readonly` | 분석 전용 SHA afdd8fab…와 일반 main 구분 | TODO |
| PIT-03-02 | 기존 차단 요청의 원인과 소비된 ID 보존 | #1764 / #1765 JSON·TXT | R6_BUNDLE_NOT_APPROVED와 RESOURCE_WAIT_MEMORY 구분·재사용 금지 | TODO |
| PIT-03-03 | 중량 A 진단의 현 메모리 admission 점검 | 해당 operation 최소 1536MiB와 실제 가용량 | 안전 자원 조건을 충족한 경우에만 요청 | BLOCKED |
| PIT-03-04 | 승인된 A operation을 새 고유 requestId로 단회 접수 | 동일 host·고정 번들·정상 메모리 | 고유 Issue/Run 생성; 우회 셸·DB 쓰기 0 | TODO |
| PIT-03-05 | 실제 Runner/Host·결과 JSON/TXT 2/2 회수 | 해당 고유 Issue·Run·attempt | PASS/WAIT/UNKNOWN, 대상·시간·실행 SHA 확인 | TODO |
| PIT-03-06 | SQLite 실제 열림 및 일관된 PIT 관측 범위 확인 | 실PC 결과 sqliteOpened·snapshot 경계 | WAL/메모리 안전 거부는 DB 실패로 오인하지 않음 | TODO |
| PIT-03-07 | Current·History·후보 누락/충돌 총계 획득 | 당시 asOf와 51개 지역·저장 이력 | 오늘 결손 수치를 11/07 2880건과 구분 | TODO |
| PIT-03-08 | 자료가 부족하면 승인된 기존 A의 최소 메타 조회 적합성 평가 | 기존 A 보고 필드/원장에 한정 | 무근거 B 복구로 전진하지 않고 정확 부족 필드만 기록 | TODO |

### PIT-04 — 지역별·주별 원자료와 PIT 정합성 분류 (8개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-04-01 | Current 관측일·지역별 최신 시각 정렬 | PIT-03 실측 Current metadata | 지역별 최대 관측일 및 51개 완전 주차 도출 | TODO |
| PIT-04-02 | History를 관측일·지역·최신 개정 단위로 정렬 | PIT-03 History revision | latest revision과 이전 revision을 별도로 식별 | TODO |
| PIT-04-03 | Current와 최신 History의 값·sourceHash 정확 대조 | 관측키·원본 해시 | 정확 일치/누락/상충을 독립 버킷으로 분리 | TODO |
| PIT-04-04 | availableAt·retrievedAt·기록 시각의 PIT 적격성 검산 | 공식 관측 시각·DB 메타 | 미래 가용 데이터를 과거 TRUE_PIT로 승인하지 않음 | TODO |
| PIT-04-05 | 저장 raw snapshot 및 요청 원장에 원본 해시 귀속 확인 | 원자료 raw_snapshot·수집 Run | 동일 응답 출처와 기록시각 확인·불명 출처 HOLD | TODO |
| PIT-04-06 | 52주 참조 및 4주 계산에 필요한 주차 실측 | 기존 산식/관측일 일정 | 첫 부족 비교주차·필요 선행 구간 규명 | TODO |
| PIT-04-07 | 지역별 분모 0·null·missing 원칙 확인 | 실제 관측 수·데이터 계약 | 0을 임의 보간하거나 결측으로 둔갑시키지 않음 | TODO |
| PIT-04-08 | 재현 가능한 키·충돌 키·출처 불명 키 분리표 확정 | PIT-04 앞 7개 결과 | 원자료 유효 주차·충돌 건수·복구 제외 키 증거화 | TODO |

### PIT-05 — 복구 가능성 판정·최소 운영 승인 설계 (8개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-05-01 | 과거 공식 자료와 당시 실제 PIT의 입증 가능 범위 구별 | PIT-04 정합성 표 | 사후 수집 자료는 진짜 과거 게시·인지 시각으로 위장 금지 | TODO |
| PIT-05-02 | 복구 불가능한 구간을 정직한 PARTIAL로 남길 조건 확정 | 확정된 참조기간·발표 근거 | 10년 근거가 없으면 무리하게 점수 READY로 전환하지 않음 | TODO |
| PIT-05-03 | 후보 DB의 상충 개정 및 불확실 자료 제외 | 기존 과거 충돌 2건 + 현 실측 | 정확 원본 일치 입증 없는 후보 자동 편입 0 | TODO |
| PIT-05-04 | 변경 목표 테이블·키·필드의 최소 집합 결정 | 공식 Core Current/History·원자료 | 승인 범위 밖 다른 테이블·DB·지표 무변경 | TODO |
| PIT-05-05 | 공통 B 유지보수기의 실제 지원 범위 확인 | 등록 operation·승인 범위·필수 효과 | 일반 임의 SQL·shell 없이 필요한 경우에만 공식 B 검토 | TODO |
| PIT-05-06 | 신규 B 효력에 필요한 승인·manifest·원본 보호 확인 | 정확 소스 SHA·파일/DB 보호·해시 | 미승인 DB 변경은 STOP; 승인 없는 실제 쓰기 0 | TODO |
| PIT-05-07 | 동일 SQLite/Core 공유 쓰기 충돌·lease·백업 조건 정리 | 운영 DB owner·실제 작업 등록 | Core 실행 중 충돌하면 WAIT, 임의 lock 삭제·복원 금지 | TODO |
| PIT-05-08 | 적법하고 의미 있는 복구 후보에 대한 GO/NO-GO 결정 | PIT-05 앞 7개 근거 | GO: 원본+PIT+승인 충족 / NO-GO: 부족 이유 기록 | TODO |

### PIT-06 — 선별 복구 코드·fixture 회귀·시뮬레이션 (8개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-06-01 | 누락 History만 대상으로 하는 수정 설계 고정 | PIT-05 GO 키셋 | Current·기존 History·다른 지표 미변경 | TODO |
| PIT-06-02 | 51개 지역×완전 주차 재검증 fixture 작성 | 기존 공식 주차·지역 코드 | 50+DC 일부 누락 시 완전주 오판 0 | TODO |
| PIT-06-03 | 동일 키 재실행·중복 삽입 거부 검사 | 수정후 동일 스냅샷 시뮬레이션 | 기존 History를 불필요한 신규 revision으로 확대하지 않음 | TODO |
| PIT-06-04 | 서로 다른 최신 개정값 동시 존재 검사 | 상충 2건 동등 fixture | 충돌을 삭제/덮어써 PASS 처리하지 않음 | TODO |
| PIT-06-05 | 원자료 해시·출처/가용일 무결성 검증 | 상응 raw snapshot·PIT metadata | 불명/미래시각/비공식 행 삽입 0 | TODO |
| PIT-06-06 | 부분 실패·lease 거부·중단 상태 복구 시뮬레이션 | 기존 트랜잭션·결과 원장 계약 | 최종 PASS 없이 중간 쓰기를 성공으로 표시하지 않음 | TODO |
| PIT-06-07 | 기존 산식 변경 없는 계산·차트 입력 일치 검사 | selected History as-of fixture | 유효 구간만 계산, 근거 부족은 PARTIAL 유지 | TODO |
| PIT-06-08 | 변경 영향 테스트·CI 및 정확한 소스 범위 확정 | 완성된 최소 패치/PR/관련 tests | CI PASS; CI 성공=PC 적용 성공으로 간주하지 않음 | TODO |

### PIT-07 — 승인된 PC의 최소 History 복구·원장 (8개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-07-01 | 운영용 실제 source/config/DB 대상 SHA 재대조 | 최신 운영 PC 등록·설치 증거 | 개발 main과 실행 소스 및 DB 경로 구분 | TODO |
| PIT-07-02 | 실제 안전 실행 기회 및 Core 자원 보호 확인 | PC Core/SQLite lease·B admission | 공유 쓰기 충돌 시 절차 중단·기존 원장 보존 | TODO |
| PIT-07-03 | 필요 B 승인 manifest와 변경 키 집합 고정 | 사용자 승인 효력·PIT-05 GO 결과 | 정확 승인 범위 외 실행 불가 | TODO |
| PIT-07-04 | 승인된 유지보수기 1회 고유 요청 생성 | 기존 공식 B 절차·고유 requestId | 허용된 변경만 실행, 중복 요청 0 | TODO |
| PIT-07-05 | 수정 전 Core current/history/checkpoint 및 보존 상태 확인 | B preimage·원본 보호 | 복구 근거가 불충분하면 쓰기 전 STOP | TODO |
| PIT-07-06 | 누락된 정당한 이력만 단일 보호 쓰기로 반영 | B 작업 실행·검증된 키셋 | 기존 개정 무삭제·PIT 시각 소급 금지 | TODO |
| PIT-07-07 | 변경 후 History·raw·sourceHash·값 재조회 | B 런타임 JSON/TXT·readback | 승인 행 수·트랜잭션·원본 보호 검증 | TODO |
| PIT-07-08 | 최종 PASS/WAIT/FAIL과 LAST PASS/FIRST FAIL 기록 | 동일 요청 ID·실행 결과 | 실제 DB 성공과 source/CI 결과를 분리 | TODO |

### PIT-08 — 저장 자료 기반 계산·로컬 결과 재검증 (6개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-08-01 | 게시 대상 Core 저장 시점·sourceVersion 확정 | PIT-07 저장 원장과 기존 checkpoint | 관측일/저장일/계산일을 혼동하지 않음 | TODO |
| PIT-08-02 | 승인된 R6 산식으로만 재계산 수행 | SQLite 원자료·PIT History | 공급자 API 호출 0, 가중치·산식 변경 0 | TODO |
| PIT-08-03 | 52주 참조·4주 변화율 분모·지역 51개 검사 | History-asOf의 주차별 완전성 | 부족 자료는 임의 0/보간 금지 | TODO |
| PIT-08-04 | STATE_CLAIMS_BREADTH 실제 값·점수 상태 확인 | 저장 자료 계산 결과 | READY 또는 근거 있는 PARTIAL_HISTORY를 정확 판정 | TODO |
| PIT-08-05 | 1년 차트 포인트 수·날짜·마지막 점 검증 | 로컬 계산 출력·관측일 | 차트 날짜/단위·결측/축 일관성 | TODO |
| PIT-08-06 | 로컬 계산 결과·checksum·원장 재조회 | 기존 결과 저장 경로 | sourceStoredAt/관측일/계산시각 보존 및 최신화 증거 | TODO |

### PIT-09 — 기존 D1 게시기와 읽기 결과 일치 (6개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-09-01 | 기존 공개 key·승인 Publisher·권한 확인 | detail:employment-r6:one-year:v1 | 신규 경로/D1 schema/DNS 임의 생성 금지 | TODO |
| PIT-09-02 | 로컬 게시 후보가 검증된 결과인지 확인 | PIT-08 checksum·sourceVersion | PARTIAL과 READY를 과장하지 않은 본문 | TODO |
| PIT-09-03 | 승인된 동일 Writer 경로로 공개 반영 | 기존 PC 게시기 및 자원 보호 | 저장 자료만 게시, 임의 raw/키 업로드 금지 | TODO |
| PIT-09-04 | D1 body/hash/stored_at 정확 재조회 | 게시 ledger·D1 단일 key | 실제 변경 여부/UNCHANGED/실패 구분 | TODO |
| PIT-09-05 | D1 sourceStoredAt/observedAt/postedAt 날짜 검산 | 스냅샷 메타·원자료 hash | 오래된 내용을 새 관측 결과로 표시하지 않음 | TODO |
| PIT-09-06 | 실패·timeout 시 기존 게시 상태와 중복 게시 방지 | 원장·D1 마지막 유효 결과 | HTTP 200만으로 최신 게시 성공 주장 금지 | TODO |

### PIT-10 — Production API/UI 검증·종결 판정 (6개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-10-01 | Production GET 29개 ID·sourceVersion·원자료 상태 조회 | /api/employment-r6/observations | D1 게시 결과와 29/29 행·시각 일치 | TODO |
| PIT-10-02 | DOL National 4계열 및 STATE_CLAIMS_BREADTH 세부 행 대조 | 각 원값/점수/관측일/sourceStoredAt | 기존 4계열 정상 유지·마지막 지표 상태 확인 | TODO |
| PIT-10-03 | 점수/부분점수/이력 부족 상태 재집계 | API score/scoreStatus | 완료 단언 대신 29/29의 진짜 계산 가능 여부 보고 | TODO |
| PIT-10-04 | 1년 차트 READY·PARTIAL·UNAVAILABLE 점수 구분 | API history/차트 포인트/최종일 | 점수와 차트가 각각 필요한 근거 충족 | TODO |
| PIT-10-05 | PC·모바일 화면의 단위·축·마지막 점 확인 | /economic-indicators/employment/ | 요청 범위 내 표시 정상, 임의 UI 재설계 없음 | TODO |
| PIT-10-06 | 종단 완료 조건 충족 시 종료·미충족 시 원인 기록 | PC B·SQLite·D1·GET/UI 증거 | 기능 DONE/자료 정당 PARTIAL 분리, 잔여 실제 문제만 보고 | TODO |

### 다음 하나의 필수 실행

- **대상:** `PIT-03-03 → PIT-03-04`. 기존 A급 고정 분석 번들만 사용한다. 메모리 admission이 충족된 안전한 실행 시점을 선택하며, 기존 #1764/#1765 requestId 재사용을 금지한다.
- **실제 성공 판정:** SQLite가 열린 동일 시점의 Current/History 총계, 51개 지역·주차와 revision 충돌, 정확한 Issue/Run/TXT/JSON 및 대상 source SHA 확보.
- **안전 대기:** RAM 부족·WAL snapshot 불가이면 해당 A 작업만 `BLOCKED`로 두고 독립 source/fixture 작업을 계속한다. Core 잠금/원장·예약·DB를 임의 수정하지 않는다.
- **복구 전제:** `PIT-05`에서 진짜 과거 PIT가 입증되지 않은 값은 이력 승격하지 않는다. 자료를 정직한 `PARTIAL_HISTORY`로 유지하는 것이 최종적으로 올바를 수 있다.
