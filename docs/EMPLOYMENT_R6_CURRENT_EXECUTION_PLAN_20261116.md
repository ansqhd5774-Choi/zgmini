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
- **잔여 PIT 10단계:** `2/10` DONE(20%). `PIT-03`은 메모리 안전 조건으로 BLOCKED. 이를 기존 5단계 운영 진행률의 분모에 합산하지 않는다.
- 이번 문서 작성/관리만으로 PIT 단계·운영 사이트 수치를 진척 처리하지 않는다.

## 6. 역할·공유 자원

W04 원담당이 기능 로직·실제 수동 검증·DB 이력·저장 자료 계산·게시를 담당한다. 동일 Core/DB/Controller에 겹치는 쓰기만 기존 중앙 자원 조정 및 보호 B로 직렬화한다. 다른 기능의 동시 독립 읽기/소스 개발은 중단시키지 않는다. 기존 `zgmini-pc-control/main`의 `AGENTS.md`, `docs/PC_AUTOMATION_STANDARD.md`, `docs/GENERAL_CHAT_START.md` 최신 계약이 실행 시 우선한다.
