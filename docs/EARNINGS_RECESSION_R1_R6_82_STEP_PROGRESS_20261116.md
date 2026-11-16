# ZGMINI W05 실적 침체 — R1~R6 전체 82단계 진행 기록

- 기준일: **2026-11-16 KST**
- 저장소: `ansqhd5774-Choi/zgmini`
- 작업 브랜치: `codex/api-site-integration-r1-20261026`
- [82단계 작업계획서](EARNINGS_RECESSION_R1_R6_82_STEP_EXECUTION_PLAN_20261116.md)
- 기존 [14단계 종단계획](EARNINGS_RECESSION_14_STAGE_HISTORY_PUBLIC_CODE_REMEDIATION_R1_20261116.md)
- 과거 [실제 성공·실패·연동 노하우](EARNINGS_API_SITE_WORKING_KNOWHOW_R1_20261027.md)

## 0. 82개 작업별 진행 상태 (실증·소스 분리)

> **2026-11-16 KST GitHub 재조회 기준.** 아래 82개 모두 개별 ID를 기재했다. `EVIDENCE_NOT_MAPPED`는 미착수/실패가 아니며 유효 과거 실증을 추가로 연결해야 한다는 뜻이다. 소스·CI 통과 역시 PC/D1/Production 종단 DONE이 아니다. **전체 DONE 비율은 현 근거로 확정하지 않음.**

| 작업 ID | 실행계획 작업 | 현재 증거 기반 상태 | 마지막 확인 증거·남은 조건 |
|---|---|---|---|
| R1-01 | 앱·제어 `main`, W05 브랜치 및 개발·운영·배포 SHA 구분 | `PARTIAL_SOURCE` | 앱/제어 GitHub main·브랜치 SHA는 확인. 실제 PC/Production SHA와 동치 확정 전 |
| R1-02 | 실 PC 승인 `config.source`, 수집기·계산기·게시기·작업 등록·Runner 매핑 | `PARTIAL_SOURCE` | Controller config 등록 대상과 기존 PC #1709 read-only 결과는 확인, 게시기 설치 SHA는 미확정 |
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
| R4-02 | 기존 승인 공통 B 경로 확인 및 QFR·BEA 단위이익 exact-key 연결 | `SOURCE_READY` | 제어 PR #1762 B 게시 실행 7파일+전용 CI 1파일, Draft·본선/운영 설치 미완료 |
| R4-03 | 제어 실행기 key·MODE·원본·D1 결과 검증 결함 수정 및 BEA 회귀 | `SOURCE_CI_PASS` | 제어 집중 Windows Node22 Run #43883643669 실제 21/21 PASS; 운영 배포 미완료 |
| R4-04 | QFR preflight의 sourceVersion·ZIP SHA·sourceStoredAt을 apply까지 고정 | `SOURCE_CI_PASS` | W05 브랜치·앱 PR #1175 QFR preflight/apply 3-pin, Node CI #43863499821 PASS, main 미병합 |
| R4-05 | PC 저장 QFR 계산으로 경량 Snapshot 구축·스키마 검증 | `SOURCE_READY` | 기존 QFR one-shot Publisher와 Reader 소스 존재, 운영 적격 payload preflight 필요 |
| R4-06 | 승인 QFR 단일키 D1 게시·실제 body/version/stored_at readback | `BLOCKED_PUBLISH_SCOPE` | QFR 단일키 B 설치/승인 manifest 불확정, 실제 D1 게시·readback 미실행 |
| R4-07 | BEA 단위이익 게시 중 공급자 재호출 제거·원본 SHA 고정 | `SOURCE_CI_PASS` | 앱 PR #1183 stored-only BEA Publisher source+Node CI #43884699372 PASS; 운영 raw/D1 없음 |
| R4-08 | 승인 BEA 단위이익 key D1 게시 및 실제 시각/버전 비교 | `NOT_RUN` | BEA 단위이익 실제 B D1 게시/readback 증거 없음 |
| R4-09 | WPSFD42 독립 Publisher·Worker·테스트를 current main 기준 선별 통합 | `SOURCE_BRANCH_ONLY` | WPS 서비스 Publisher/Worker 브랜치 코드는 존재하나 main 선택적 통합 미완료 |
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
| R6-01 | 변경된 수집·계산·게시·Worker·UI의 관련 Node 테스트 실행 | `TARGETED_CI_PASS` | 제어 B Node 21/21 및 BEA 앱 Node CI 4,461 PASS; W05 종단 전체 완료 주장 금지 |
| R6-02 | SHA 변경·중복·단위·기간·결측·개정본 회귀검증 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R6-03 | API 403/429/500·D1 timeout·결과 누락·잘못된 key/version 검증 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R6-04 | 승인 B 작업의 실제 Windows Runner·manifest·SHA·Issue/Run 확인 | `BLOCKED_PUBLISH_SCOPE` | QFR exact-key B 승인·현재 설치/manifest·Windows 운영 실행 미확정 |
| R6-05 | QFR 실제 D1 body/version/sourceStoredAt/stored_at 검증 | `NOT_RUN` | QFR D1 실제 body/version/timestamp readback 없음 |
| R6-06 | QFR 공개 GET·PC·모바일 화면 값·출처·분기 확인 | `NOT_RUN` | QFR 실제 배포 SHA·현재 Production API/UI 값 일치 미확인 |
| R6-07 | BEA 단위이익 저장 원본·D1 중복·source SHA 검증 | `NOT_RUN` | BEA 저장 원본→D1 단일키 실게시/원문 비교 미완료 |
| R6-08 | BEA 단위이익 GET·5분기·단위·화면 확인 | `NOT_RUN` | BEA 운영 GET/5분기/UI 동치 미완료 |
| R6-09 | WPSFD42 D1 게시 및 기존 BLS 5행 checkpoint 보호 | `NOT_RUN` | WPS 2행 D1 실게시·base5 체크포인트 보호 미실증 |
| R6-10 | WPSFD42 정상 7행/결손 5행 API·UI 검증 | `NOT_RUN` | WPS 실제 Production 7행/5행 상태 검증 미실증 |
| R6-11 | BEA 제조업 archive SHA와 D1 게시 원문·기간·시각 확인 | `NOT_RUN` | BEA 제조업 현장 archive SHA→D1 실게시 미실증 |
| R6-12 | BEA 제조업 GET·YoY·분기 이력·UI 확인 | `NOT_RUN` | BEA 제조업 운영 API/UI 일치 미실증 |
| R6-13 | 기존 E1-R4 4요소·가중치·이력·TTL·별도 12대 도메인 회귀 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R6-14 | 관련 PR·CI·main 통합→Cloudflare Git Integration→정확 배포 SHA→공개 확인 | `IN_PROGRESS_SOURCE` | 관련 소스 PR·CI 있음, Production exact Deployment·전체 4종 실데이터 미검증 |
| R6-15 | 다음 공식 발표 이후 자연 수집·checkpoint·D1·UI 실제 전진 관찰 | `DEFERRED` | 다음 실제 공식 발표 후 자연 갱신 확인; 현재 구현 STOP Gate 아님 |

**상태 집계(82개 정확히 1회씩):** `PARTIAL_SOURCE` 4개 · `EXISTING_EVIDENCE` 8개 · `EVIDENCE_NOT_MAPPED` 36개 · `SOURCE_REVIEWED` 1개 · `NOT_RUN` 13개 · `SOURCE_READY` 4개 · `SOURCE_CI_PASS` 5개 · `BLOCKED_PUBLISH_SCOPE` 2개 · `SOURCE_BRANCH_ONLY` 2개 · `PUBLISH_SCOPE_UNVERIFIED` 1개 · `SOURCE_MAIN_READY` 3개 · `TARGETED_CI_PASS` 1개 · `IN_PROGRESS_SOURCE` 1개 · `DEFERRED` 1개. 각각의 상태는 최종 운영 완료율이 아니다.

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

## 5. 최신 작업 결과 원장 — 후속 채팅 종료 전 반드시 기록

| 관측 기준(KST) | 작업/실제 결과 | 근거(실제 변경·검증) | 누락된 종료 조건 |
|---|---|---|---|
| 2026-11-16 23:14경 | R4-02 제어 B 게시 경로 소스 7파일 선별 통합 | [Draft PR #1762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1762), 최신 main에서 별도 분기. 실제 운영 변경 0건 | 해당 B exact-key 승인 manifest/실PC 설치·D1 게시 |
| 2026-11-16 23:17경 | R4-03 게시 결과 검증 Node 집중시험 **21/21 PASS** | [Run #43883643669](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43883643669), Windows 격리 CI. 0 FAIL | 제어 main 선택적 통합·설치·운영 검증 |
| 2026-11-16 23:22경 | R3-09~10/R4-07 BEA 저장형 게시기·불변 archive Node CI **PASS** | [Draft PR #1183](https://github.com/ansqhd5774-Choi/zgmini/pull/1183), [Run #43884699372](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43884699372), 4471 total/4461 pass/10 skip/0 fail, 원본 archive 5/5 | BEA 공식 자료·권리·PC 실제 저장·D1 readback |
| 2026-11-16 23:35~23:36 | 82단계 독립 진행 파일 생성·계획서 링크 | 기존 커밋 [68913de6](https://github.com/ansqhd5774-Choi/zgmini/commit/68913de6a85cfdf7e74e0e0622c6d8b6f86aa859), [9caeb69b](https://github.com/ansqhd5774-Choi/zgmini/commit/9caeb69bb457ea5d0c08177ac1358401b04817f3) | **당시에는 82개 개별 상태 표와 실행순서별 원장이 없어 ‘진행 기록 완료’라고 말하면 안 됨** |
| 2026-11-16 최신 확인 | 사용자가 지적한 진행 기록 누락을 인정하고 82개 ID별 상태·마지막 작업 타임라인 보완 | **이 파일의 현재 변경 커밋을 GitHub에서 직접 재조회하여 최종 확정** | 미대조 항목의 실제 과거 증거 매핑 및 현재 우선 B 운영 effect 검증 |

### 필수 기록 종료 규칙

1. 작업을 수행했다면 **보고 전에 이 진행 기록에 수행 ID·커밋/PR/Issue/Run·실제 PASS/FAIL·당시 상태·남은 필수 실행을 먼저 반영**한다. 로그 반영 불가능하면 `기록 미완료`로 보고한다.
2. 새 작업 결과는 바로 위 최신 작업 원장에 추가하고, 해당 **82개 ID 상태와 근거를 같은 커밋에서 갱신**한다. 기존 DONE·영수증을 삭제하거나 소스/CI를 운영 DONE으로 승격시키지 않는다.
3. 새 테스트·PR·선별 main 반영은 설치/게시 완료가 아니다. QFR 관련 먼저 해야 할 실행은 B 승인 exact-key effect/실설치 확인→기존 저장 원본 기반 QFR D1 1키 게시→독립 D1 readback→Production API/UI 확인이다.
4. 종료 보고에는 **W05 전담 브랜치의 실제 최신 HEAD와 이 파일 GitHub 재조회 여부**를 명시한다. 자동화나 다른 채팅이 문서 변경을 알아서 받아간다고 가정하지 않는다.
