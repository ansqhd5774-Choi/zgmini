# ZGMINI W05 실적 침체 R1~R6 — 전체 82단계 세부 실행계획 (2026-11-16)

> **상태: 사용자 확인 82단계 계획을 W05 지정 브랜치에 문서로 확정.** 이 문서는 개발·실행 작업 목록이며 단계 자체의 실제 PC/D1/Production 완료를 증명하지 않는다. 82개는 **기본 범위**이고, 미래 추가 적격 정보성 지표 수는 제한하지 않는다.

- 저장소: `ansqhd5774-Choi/zgmini`
- 기준 작업 브랜치: `codex/api-site-integration-r1-20261026`
- 계획 확인 당시 W05 HEAD: `9cb3516257965e10811c25b9a67a382df1be9574` (실제 이 문서 커밋은 이후 변경)
- 상위 원본: [R1~R6 역사적 계획](EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md)
- 현행 후속: [기존 14단계 원인·실행계획](EARNINGS_RECESSION_14_STAGE_HISTORY_PUBLIC_CODE_REMEDIATION_R1_20261116.md) · [14단계 선행조건](EARNINGS_RECESSION_14_STAGE_CONTRACT_SIMULATION_20261116.md)
- 마지막 관련 수정: 제어 Draft [#1698](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1698) (결과 검증 두 파일), 앱 Draft [#1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175) (QFR source 3-pin), 제어 Draft [#112](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/112) (B 게시 실행 제안)

- **독립 진행 원장:** [W05 실적 침체 82단계 진행 기록](EARNINGS_RECESSION_R1_R6_82_STEP_PROGRESS_20261116.md). 계획 단계와 실제 Source/CI/PC/D1/Production 증거를 분리해 기록한다.

## 0. 작업 수·범위·판정

| 상위 단계 | 실행 항목 수 | 범위 |
|---|---:|---|
| R1 | 10 | 기존 API·원자료·운영 자산 전수 조사 |
| R2 | 13 | 공급자 API·사용 권리·시계열 검증 |
| R3 | 16 | 운영 PC 원자료 수집·저장·계산 |
| R4 | 16 | D1 게시기·공개 API 연결 |
| R5 | 12 | 사이트 UI·차트 연결 |
| R6 | 15 | 관련 검증·GitHub 통합·Production |
| **합계** | **82** | **기존 14개 종단 작업은 아래 항목에 중복 없이 포함** |

- **전체 82단계는 2026-11-16에 사용자가 지정한 새로운 상세화 기준**으로, 최초 R1~R6 문서가 역사적으로 82개를 열거했다는 뜻이 아니다.
- **현재 순차 완료 수·현재 단계의 유일한 현행 정본은 [지정 진행 기록](EARNINGS_RECESSION_R1_R6_82_STEP_PROGRESS_20261116.md)의 ‘0-A. 고정 순번·실제 진행률’과 82개 상태표다.** 계획서에는 변동하는 진행률 숫자를 반복 고정하지 않는다(2026-11-17 최초 정정 시 1/82였으며 이후 진행 기록에서 계속 갱신). 기존 QFR SQLite 저장·계산, BLS 기본 5행, QFR Reader/UI 소스 등 유효 증거는 재사용하되 미대조 단계를 실패 또는 DONE으로 임의 변환하지 않는다.
- 기존 **14개 종단 단계의 실증 완료 판정은 0/14**이며, 마지막 #14 자연 갱신 관찰은 현재 구현을 막는 Gate가 아닌 후속 `DEFERRED`다.
- M3·MTIS·SEC의 **개별 수집·게시·표시는 공식 endpoint, 권리, 사용 한도와 실데이터가 적격할 때만 수행하는 조건부 범위**다. 부적격 후보는 `HOLD/NOT_APPLICABLE`로 기록하고 다른 적격 지표 작업을 계속 진행한다. 개수 확대를 위해 부적격 API를 사용하지 않는다.
- 변경 보호: E1-R4 4요소·산식·가중치·결측·기존 점수·차트·D1 키, E1-R5 Shadow, 별도 12대 기업 실적 도메인, 승인된 DB/TTL/예약/DNS/배포 경로 불변. 방문자 GET는 **D1 저장 결과만 읽기**. SQLite 전체 원본·토큰·키·비공개 원자료를 D1/GitHub에 올리지 않는다.
- 운영 효과는 반드시 **기존 등록 A급 또는 정확히 승인된 정규 B급 경로**로만 수행. 공유 DB/D1 쓰기는 단일 Owner·lease에 따라 직렬화하고, 독립 소스·테스트 작업은 병렬화할 수 있다. 임의 Windows CMD/새 Scheduler/권한 우회·직배포·승인 없는 병합 금지.

## 0.1 계획 실행 순서와 진행률 고정

**현재 사용자 지적에 따른 순서 복원 (2026-11-17):** 이 계획은 단순한 체크리스트가 아니라 **R1-01부터 R6-15까지 순번대로 완료를 판정하는 실행 기준**이다. 작업 중 우연히 뒤 단계의 코드를 수정했거나 CI가 통과했다고 해당 뒤 단계로 현재 순번을 점프하지 않는다.

1. **순번:** R1-01=1, R1-10=10, R2-01=11 … R4-06=45, R6-04=71, R6-15=82. 이후 변경·추가 단계는 사용자 승인 없이 끼워 넣거나 재번호를 매기지 않는다.
2. **현재 순차 단계:** 지정 [진행 기록](EARNINGS_RECESSION_R1_R6_82_STEP_PROGRESS_20261116.md)의 82개 ID 상태표에서 **앞에서부터 완료 기준을 충족한 연속 구간 다음 첫 단계**다. `SOURCE_READY`·`CI_PASS`·`EXISTING_EVIDENCE`·`NOT_MAPPED` 등은 해당 단계의 **전체 완료**가 아니다. `DONE`은 계획서 오른쪽 열의 완료 조건에 실제로 부합하는 증거가 있어야 한다.
3. **계획 진행률:** `연속 확정 완료 단계 수/82`를 표시하고, **개별 완료 합계**도 별도로 산출한다. `71/82`처럼 뒤 단계에서 작업했다는 이유로 선행 70개가 완료된 듯 보고하지 않는다. 미증거 단계는 완료로 추정하지 않는다.
4. **작업 순서:** 해당 순차 단계의 기존 유효 증거를 **먼저 재사용해 판정**하고 부족한 실행 하나만 수행한다. 선행 단계가 실제로 막혀도 원인·담당·다음 실행을 기록한다. 독립 기능의 이미 승인된 소스·조회·테스트는 병렬 진행할 수 있지만 **선행 단계의 완료로 위장하거나 현재 순번을 옮기지 않는다**. 필요한 의존성이 실제로 막힌 경우만 BLOCKED로 판정한다.
5. **조건부·장기 항목:** M3·MTIS·SEC 적격성의 `HOLD/NOT_APPLICABLE`은 공급자·권리 등 명시된 판정 근거를 기록하고, 필수 아닌 효과를 강제하지 않는다. R6-15의 미래 자연 관찰 `DEFERRED`는 현재 구현 완료를 막는 필수 Gate가 아니다. 예외가 필요하면 원인과 승인된 범위를 **현재 단계 기록에 명시**하고 다음 수행 가능 작업을 하되 순번은 허위 변경하지 않는다.
6. **인계와 보고:** 사용자에게 작업 결과를 보고하기 **전**, 지정 진행 기록의 **순차 단계 번호·완료 수·해당 ID 상태·LAST PASS/FIRST FAIL·다음 필수 실행**과 원장을 함께 갱신해 GitHub에서 재조회한다. 별도 문서·이슈·PR은 증거일 뿐 지정 진행 기록의 대체물이 아니다.

## R1. 기존 API·원자료·운영 자산 전수 조사 (10단계)

- 담당: W05 / 기존 PC 수집·제어 담당
- 완료 기준: 각 정보성 지표에 대해 공급자→수집기→PC 원본→계산→D1 키→공개 GET→사이트의 경로와 승인·실행 SHA를 추적한다. 미확인은 UNKNOWN, 이전에 성공한 저장·계산은 기존 증거를 재사용한다.

| 작업 ID | 구체적 실행 | 완료 증거·판정 기준 |
|---|---|---|
| R1-01 | 앱·제어 `main`, W05 브랜치 및 개발·운영·배포 SHA 구분 | 저장소별 SHA·확인시각 및 Production과 다른 상태를 표기 |
| R1-02 | 실 PC 승인 `config.source`, 수집기·계산기·게시기·작업 등록·Runner 매핑 | 실등록 operation·권한·source 및 체크아웃 각각 확인 |
| R1-03 | 운영 SQLite 원자료 테이블·checkpoint·append-only 이력 파악 | 테이블·원본 저장 경로·보존 및 readback 방식 기록 |
| R1-04 | 기존 BLS 3개 원천과 공개 5개 정보성 행 계보 조사 | 시계열 3개와 파생 행 5개의 관계·기존 키 명시 |
| R1-05 | BEA 단위이익·제조업의 수집기, CSV/메타 및 실제 저장 여부 조사 | 기존 원본·archive가 있는지 확인, dry-run과 저장 구분 |
| R1-06 | Census QFR·M3·MTIS 기존 수집 코드·ZIP·저장 위치 조사 | 원문 SHA·데이터 경로·재수집 필요성을 각기 판정 |
| R1-07 | SEC CompanyFacts/XBRL 수집 코드·종목 매핑·저장 경로 조사 | 이미 승인된 소스와 미구현 후보 구별 |
| R1-08 | 기존 D1 키·Worker GET·Writer·게시 원장 조사 | 각 키의 존재·readback·API 노출 상태를 분리 기록 |
| R1-09 | 기존 점수 A·기업실적 B·정보성 C API/UI 계약 분리 | E1-R4 4요소·기존 12대 실적 도메인 불변 범위 확정 |
| R1-10 | 지표별 수집 중복·마지막 유효 완료점·첫 미완료 항목을 통합 인벤토리화 | indicator_id·source·collector·storage·latest·public·gap 작성 |

## R2. 공급자 API·사용 권리·시계열 검증 (13단계)

- 담당: 각 원천 담당 / W05 공개 적격성 검토
- 완료 기준: 실제 endpoint·series·table·관측치, 측정 정의·기준일·재사용 권리·무료 한도 등 항목별 증거를 모은다. 한 후보 HOLD는 독립 후보의 진행을 막지 않는다.

| 작업 ID | 구체적 실행 | 완료 증거·판정 기준 |
|---|---|---|
| R2-01 | BEA 공식 NIPA 기업이익·단위이익 시계열 및 단위 확인 | 원본 Table/Line/Series·기간·단위·수정치 근거 확보 |
| R2-02 | FRED 배포 BEA 단위이익 CSV와 공식 BEA 원본의 정의·권리·개정 비교 | FRED API와 CSV를 구분하고 사용권·계보 판정 |
| R2-03 | BEA 제조업 기업이익 산업 분류·명목/실질·분기·YoY 기준 확인 | 원본 Series·산업 범위·동기 비교 기준 고정 |
| R2-04 | Census QFR 공식 ZIP/API 경로와 제공 데이터 구조 확인 | 실제 자료의 공급자 출처·ZIP 버전·테이블 필드 확인 |
| R2-05 | QFR 세후이익/매출 분자·분모·산업 표본·비교 분기 정합성 검사 | 계산 항목·모집단 및 분기 연결 검증 |
| R2-06 | Census M3 신규주문·출하 공식 변수·단위·조정 정의 확인 | 공식 변수·관측 주기·계절조정 자료 확보 또는 HOLD |
| R2-07 | Census MTIS 재고/매출 비율 변수·관측월·개정 내역 확인 | 공식 자료·기간·비율 정의 확보 또는 HOLD |
| R2-08 | BLS 기본 3원천 `WPSFD4`, `WPSFD41`, `PRS85006111` 정의 확인 | 시계열 ID·원자료와 공개 5행 파생 규칙 일치 |
| R2-09 | BLS 서비스 PPI `WPSFD42` 정의·관측월·YoY 계산 검증 | 월간 지수와 전년동월 계산을 발표 월간 변화와 구분 |
| R2-10 | SEC CompanyFacts/XBRL 엔드포인트·User-Agent·쿼터 확인 | 공식 API 한도·접근·재사용 가능성 입증 또는 HOLD |
| R2-11 | SEC 기업별 회계항목·회계기간·중복·표본 커버리지 검사 | fiscal period·단위·개정·기업별 비교 가능성 판정 |
| R2-12 | 공급자별 발표일·관측일·수집일·수정본·계절조정·지연 구별 | 날짜·vintage·release lag 기준과 출처 명시 |
| R2-13 | 공급자별 재사용권·무료 한도·저장·파생·공개 허용/보류 판정 | LICENSE/API/HTTP/SERIES/COVERAGE 별도 READY/HOLD 영수증 |

## R3. 운영 PC 원자료 수집·저장·계산 (16단계)

- 담당: 기존 공급자별 수집·계산 Owner / W05 계보 점검
- 완료 기준: 공급자 원문→승인된 SQLite 저장·이력→재조회→저장 자료만 이용한 계산을 입증한다. 결측을 임의 0으로 바꾸지 않고 기존 E1-R4를 변경하지 않는다.

| 작업 ID | 구체적 실행 | 완료 증거·판정 기준 |
|---|---|---|
| R3-01 | 공통 원자료 저장 계약의 provider·series·period·vintage·SHA 확인 | 원본 필수 필드와 sourceStoredAt 계보 확인 |
| R3-02 | SQLite append-only·개정본·중복·checkpoint 구조 재사용/최소 보완 | 실제 운영 schema 무단 변경 없이 저장 무결성 유지 |
| R3-03 | 기존 BLS 3원천 저장·계산 PC 실측 증거 재사용 | 기존 Run·SHA 유효 시 중복 공급자 호출·수집 생략 |
| R3-04 | WPSFD42 승인 수동 수집 후 SQLite 원본·SHA·시각 재조회 | 허용 수집 결과의 원문 1건 이상과 checkpoint 증거 |
| R3-05 | WPSFD42 저장자료로 서비스 PPI·YoY 정보성 2행 계산 | 동일 월·이전 12개월·단위·파생 계산 일치 |
| R3-06 | Census QFR 기존 ZIP 저장 경로·SHA·분기·원장 재조회 | R2/R3 유효 기존 PC 증거 재사용 및 소스 변경 감지 |
| R3-07 | 저장 QFR로 제조업 세후이익률 현재·직전·변화폭 계산 | 기존 저장자료 계산과 분기·퍼센트포인트 값 일치 |
| R3-08 | BEA 단위이익의 기존 저장 원본 탐색, 필요 시 승인 1회 수집 | 원본 실제 저장 및 최초 reader·메타 원장 증거 |
| R3-09 | BEA 단위이익 CSV·메타·SHA를 하나의 고정 버전에 결속 | raw·metadata·version·기간 일치, 반쪽 archive 안전 거부 |
| R3-10 | BEA 단위이익 계산기에서 공급자 호출 분리 | 계산·게시 시 providerCalls=0, 저장 SHA로만 계산 |
| R3-11 | BEA 제조업 CSV·메타 archive의 SHA·행 수·기간 직접 PC 재조회 | R6 archive reader 실물 PASS; 과거 보관 보고만으론 불충분 |
| R3-12 | BEA 제조업 유효 저장 원본으로 분기·YoY 계산 및 이력 보존 | 원자료 시점·단위·변동률·로컬 결과 일치 |
| R3-13 | 적격 판정 시 기존 경로로 Census M3 원자료 저장·재조회 | 해당 지표 READY일 때만 실행; 미승인 후보는 HOLD |
| R3-14 | 적격 판정 시 기존 경로로 Census MTIS 원자료 저장·재조회 | 해당 지표 READY일 때만 실행; 미승인 후보는 HOLD |
| R3-15 | 적격 판정 시 SEC XBRL 원자료 저장·기간 정규화·중복 제거 | 권리·범위·호출 한도가 준비된 경우만 실행 |
| R3-16 | 저장자료 계산 결정성·SHA 계보·결측·0·개정·stale 검증 | 동일 원본 재계산 동치, E1-R4 원점수 변경 0 |

## R4. D1 게시기·공개 API 연결 (16단계)

- 담당: W05 / 중앙 승인 게시 Owner / Cloudflare 코드 Owner
- 완료 기준: 정확한 승인 key에만 일회 게시하고 실제 D1 body·stored_at·sourceVersion·sourceStoredAt을 재조회한다. GitHub CI·HTTP 200을 쓰기 성공으로 대신하지 않는다.

| 작업 ID | 구체적 실행 | 완료 증거·판정 기준 |
|---|---|---|
| R4-01 | C 전용 독립 D1 키·허용목록·공개 데이터 계약 확정 | 승인된 exact key만 사용, 기존 점수 key 불변 |
| R4-02 | 기존 승인 공통 B 경로 확인 및 QFR·BEA 단위이익 exact-key 연결 | 현재 설치된 승인 scope·manifest·Runner source 확인 후 최소 통합 |
| R4-03 | 제어 실행기 key·MODE·원본·D1 결과 검증 결함 수정 및 BEA 회귀 | 현재 PR #1698 두 파일의 수정 증거 재사용, 실제 Node 집중 PASS 필요 |
| R4-04 | QFR preflight의 sourceVersion·ZIP SHA·sourceStoredAt을 apply까지 고정 | 현재 앱 PR #1175 선별 반영, 원본 drift는 D1 접근 전 STOP |
| R4-05 | PC 저장 QFR 계산으로 경량 Snapshot 구축·스키마 검증 | sourceVersion·sourceStoredAt·observedThrough·coverage 및 행 구조 유효 |
| R4-06 | 승인 QFR 단일키 D1 게시·실제 body/version/stored_at readback | 정확키 `detail:earnings-recession-indicators:census-qfr-mfg-margin:v1` 동일 |
| R4-07 | BEA 단위이익 게시 중 공급자 재호출 제거·원본 SHA 고정 | 저장자료만 이용하는 게시기 및 preflight/apply 동일 원본 |
| R4-08 | 승인 BEA 단위이익 key D1 게시 및 실제 시각/버전 비교 | 신규 READBACK_VERIFIED 또는 진짜 ALREADY_STORED 증거 |
| R4-09 | WPSFD42 독립 Publisher·Worker·테스트를 current main 기준 선별 통합 | 다른 기능 보호, 별도 서비스 key와 합성 GET 계약 준비 |
| R4-10 | WPSFD42 전용 D1 키에 2행 게시·기존 BLS 5행 key 보호 | 서비스 단독 key readback 및 base5 checkpoint 불변 |
| R4-11 | BEA 제조업 별도 게시 키·승인 효과·archive SHA 결속 | QFR/BEA unit 권한을 우회하지 않는 정확 키 계약 |
| R4-12 | BEA 제조업 독립 D1 게시 후 body/version/time readback | 유효 archive 기반 현재 분기 key 입증 |
| R4-13 | 적격 M3·MTIS 게시 필요 시 승인된 독립 키·Writer 최소 연결 | 원본·권리 적격 조건 충족 시만 수행 |
| R4-14 | 적격 SEC 게시 필요 시 승인된 파생 key·Worker 계약 연결 | 기업별 민감 원자료 공개 금지, 적격 결과만 제공 |
| R4-15 | 공개 API를 D1 저장형 GET/HEAD로 구현·freshness/status 제공 | 방문자 요청당 공급자 API·계산·PC/D1 원자료 쓰기 0 |
| R4-16 | 단조 checkpoint·멱등성·부분실패 UNKNOWN·중복 방지 및 원장 검증 | 정확키 재조회, 요청별 ledger, 예상치 못한 실패는 자동 재게시 금지 |

## R5. 사이트 UI·차트 연결 (12단계)

- 담당: W05 / UI Owner
- 완료 기준: 승인 지표는 API 데이터가 있을 때만 표시하고 별도 정보성 C 영역을 기존 4요소 위험 점수 A와 12대 기업실적 B와 혼합하지 않는다. PC·모바일의 날짜·단위·결측·차트 정합성을 확인한다.

| 작업 ID | 구체적 실행 | 완료 증거·판정 기준 |
|---|---|---|
| R5-01 | 기존 E1-R4 방어 점수·1년 차트·4요소 보존 | 기존 수치·정규화·차트·점수 API 변동 없음 |
| R5-02 | 정보성 C 영역을 기존 점수 A 및 기업실적 B와 명확히 구분 | UI 정보 구조와 제목·데이터 계층 분리, 사용자 디자인 승인 보존 |
| R5-03 | 고정 배열 대신 API rows/registry 기반 지표 수 동적 표시 | 인정된 신규 항목 추가 시 개수 고정으로 가려지지 않음 |
| R5-04 | 기본 BLS 3원천의 기존 공개 5행 보존 | 공개 행 값·단위·출처·원본 checkpoint 일치 |
| R5-05 | WPSFD42 READY 시 신규 2행 합성 7행, 미제공 5행 유지 | 정상 7·결손 5, 0/null 변조·기존 원장 변경 없음 |
| R5-06 | Census QFR 제조업 세후이익률 현재·직전·변화폭 표시 | 실제 게시된 동일 원본 분기와 값·단위 일치 |
| R5-07 | BEA 단위이익 값·직전값·USD_PER_REAL_GVA_UNIT·분기 이력 표시 | 공개 GET 값·단위·5분기 이력 매칭 |
| R5-08 | BEA 제조업 분기·YoY·출처와 정보성 성격 표시 | 실제 저장된 본문과 관측일·파생률·주의 구분 |
| R5-09 | 적격 M3/MTIS 신규주문·출하·재고/매출 정보 확장 | 조건부 READY 지표만 표시, 원본 정의 보존 |
| R5-10 | 적격 SEC 기업 커버리지·기간·지표 정의 표시 | 적격 집계값만 표시, 모집단·결측 설명 제공 |
| R5-11 | 현재/이전값·단위·관측/수집/게시 시각·stale·차트 정합성 보완 | 차트 결측을 연결하지 않고 없는 값은 — 표시 |
| R5-12 | 390·768·1440·1920px 반응형/접근성·오류 영향·출처 페이지 확인 | 기존 점수 보존, 실제 PC/모바일와 data-sources 출처 연결 |

## R6. 관련 검증·GitHub 통합·Production (15단계)

- 담당: W05 / 원 기능 Owner / 승인 배포 Owner
- 완료 기준: 소스·CI, 실제 PC Runtime, D1 row, Production Deployment와 공개 API/UI를 구분해 검증한다. 사용자에게는 모든 구현이 끝난 뒤 화면 확인을 요청하고, 미래 공식 발표 관찰은 별도 DEFERRED로 둔다.

| 작업 ID | 구체적 실행 | 완료 증거·판정 기준 |
|---|---|---|
| R6-01 | 변경된 수집·계산·게시·Worker·UI의 관련 Node 테스트 실행 | 변경 영향 범위의 실제 Node 명령·CI 결과 PASS |
| R6-02 | SHA 변경·중복·단위·기간·결측·개정본 회귀검증 | 가짜 0·잘못된 기간·원본 변조 반례 모두 거부 |
| R6-03 | API 403/429/500·D1 timeout·결과 누락·잘못된 key/version 검증 | STATE_UNKNOWN·기존 결과 보존·무조건 재실행 차단 |
| R6-04 | 승인 B 작업의 실제 Windows Runner·manifest·SHA·Issue/Run 확인 | 정확 승인 요청 및 설치 실물 SHA/PC 실행 영수증 확보 |
| R6-05 | QFR 실제 D1 body/version/sourceStoredAt/stored_at 검증 | 해당 키의 로컬 결과·원격 D1 완전 일치 |
| R6-06 | QFR 공개 GET·PC·모바일 화면 값·출처·분기 확인 | 해당 운영 시점의 Production 값·관측일 일치 |
| R6-07 | BEA 단위이익 저장 원본·D1 중복·source SHA 검증 | 실제 저장자료와 게시 원본 버전 동치 |
| R6-08 | BEA 단위이익 GET·5분기·단위·화면 확인 | Stored-only 공개 응답과 UI 정확 일치 |
| R6-09 | WPSFD42 D1 게시 및 기존 BLS 5행 checkpoint 보호 | 기존 base5 소스·D1 키·원장 손상 0 |
| R6-10 | WPSFD42 정상 7행/결손 5행 API·UI 검증 | 상태별 정확한 지표 개수와 신선도 표시 |
| R6-11 | BEA 제조업 archive SHA와 D1 게시 원문·기간·시각 확인 | 독립 readback과 실제 게시 값 일치 |
| R6-12 | BEA 제조업 GET·YoY·분기 이력·UI 확인 | 해당 기간의 실제 게시값과 화면 일치 |
| R6-13 | 기존 E1-R4 4요소·가중치·이력·TTL·별도 12대 도메인 회귀 | 사용자 승인 없이 기존 계약·점수·차트 변경 0 |
| R6-14 | 관련 PR·CI·main 통합→Cloudflare Git Integration→정확 배포 SHA→공개 확인 | 각 기능 사전 선별 source 통합 재작업 금지, Production ID/값 확인 |
| R6-15 | 다음 공식 발표 이후 자연 수집·checkpoint·D1·UI 실제 전진 관찰 | DEFERRED: 신규 발표 후 별도 검증, 현재 구현 완료 Gate 아님 |

## 7. 원래 14단계 후속 실행계획과의 관계 (중복 합산 금지)

| 원 14단계 | 이 82단계의 관련 작업 |
|---:|---|
| #1 | R4-02~03; R6-04 |
| #2 | R3-06~07; R4-04~06; R6-05 |
| #3 | R5-06; R6-06 |
| #4 | R2-01~02; R3-08~09 |
| #5 | R3-10; R4-07~08; R6-07 |
| #6 | R5-07; R6-08 |
| #7 | R2-09; R3-04~05 |
| #8 | R4-09~10; R6-09 |
| #9 | R5-04~05; R6-10 |
| #10 | R3-11~12 |
| #11 | R4-11~12; R6-11 |
| #12 | R5-08; R6-12 |
| #13 | R6-01~03; R6-13~14 |
| #14 | R6-15 (DEFERRED) |

14단계는 QFR·BEA unit·BLS WPSFD42·BEA 제조업 **4개 수직 종단**을 묶은 우선 실행 순서다. R1~R6는 공통 인프라·추가 적격 후보·UI·통합까지 포함한 상위 전체 범위다. 따라서 **82+14=96으로 산정하지 않는다.**

## 8. 실행 우선순위·현재 증거·다음 필수 행동

1. **첫 필수 연결 R4-02~04, R6-01·04:** 제어 B 승인 exact-key/manifest/실제 설치 유효 범위 점검. 최근 제어 Draft #1698의 게시 결과 파서/BEA 회귀 수정은 branch 소스 반영 완료, V8 fixture 확인만 있으므로 **실제 Node CI PASS와 운영 B 설치 완료는 아직 주장하지 않는다**. 앱 Draft #1175의 QFR preflight/apply 원본 3-pin은 최신 main 선별 반영 전이다. 제어 Draft #112는 main에 없는 비활성 제안이며 단독 PR 성공이 운영 허가가 되지 않는다.
2. **QFR 우선 R4-05~06, R6-05~06:** 현재 저장된 QFR ZIP/PC 계산 결과 재사용→승인된 QFR 한 개 키에 명시 게시→실제 D1 `body/stored_at/sourceVersion/sourceStoredAt` 확인→Production API/UI. 예전 원본 저장을 무조건 다시 실행하지 않는다.
3. **독립 소스 개선 R3-08~12, R4-07~12:** BEA 단위이익의 실시간 재fetch 게시구조를 저장형으로 분리, WPSFD42 첫 승인 수동 저장/2행 독립 키, BEA 제조업 아카이브 SHA 직접 재조회/독립 게시. 원 담당과 승인된 공통 실행기를 재사용한다.
4. **필요한 시점의 선별 소스·UI 통합 R4-09, R5-01~12:** WPS Publisher/Worker/UI가 게시 전에 필요하면 관련 최소 파일을 먼저 선별 통합. 13번째 종단 단계까지 무조건 기다리지 않는다. UI 디자인은 사용자 승인된 범위만 적용한다.
5. **R6-13~14:** 관련 회귀→원격 `main`→Cloudflare Git Integration→정확한 Deployment ID/SHA→4군 API/PC·모바일 화면 결과 확인. 기존 점수·정규 계산·원본 이력 변경 0 검증.
6. **R6-15:** 다음 정규 신규 발표 후 사용자가 원하는 시점에 자연 갱신 관찰; **현재 구현 DONE의 필수 Gate가 아니다**.

### 상태 판정 증거 우선순위

- `DONE`: 해당 항목에 필요한 실제 PC 저장/readback·D1 원격 조회·Production 증거를 확보한 경우만.
- `SOURCE_READY/CI_PASS`: 소스·테스트는 준비됐으나 운영 해당 효과 미완료.
- `STATE_UNKNOWN`: 원격 게시 결과/원장 불명확. 임의 재실행·lease 해제 금지, 기존 requestId/checkpoint/D1 재조회 우선.
- `BLOCKED`: 현재 필수 실행을 실제로 막는 정확한 권한·등록·데이터 불일치. 미래 발표·다른 기능 대기는 `DEFERRED`.
- **모든 단계의 DONE 개수는 명시된 실증 결과를 연결한 다음에만 계산**하며 임의 진척률을 생성하지 않는다.

### 최소 다음 행동

**QFR 정확키 게시를 담당하는 기존 승인 B 실행 경로의 운영 등록·manifest·실소스 SHA 확인과 제어 Draft #1698 관련 Node CI → 필요한 범위의 source 통합/승인 → QFR D1 단일키 게시 및 실재조회.** 기존 QFR 수집·계산 성공 증거 재사용. 새로운 지표 수집이나 자연 예약 검증을 QFR 완료의 임의 선행조건으로 만들지 않는다.

## 9. 82단계 실행 원장 — 2026-11-16 최초 실행

> 이번 작업은 **소스 선택적 통합**이며, PC/D1/Production 운영 효과 **0건**. 아래 단계의 `SOURCE_READY`는 `DONE`이 아니다.

| 작업 | 상태 | 확인된 원본 증거 | 실제 남은 종료 조건 |
|---|---|---|---|
| R4-02 | **SOURCE_READY** | 제어 최신 `main`에서 7개 파일을 선택적 이식한 [Draft PR #1762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1762), head `b3293b02d4eed527d120a7dd76a2e816a1d8d609`; 기존 #112 브랜치 전체 병합/리베이스 없음 | 본선 CI·승인 소스 통합, 운영 PC 정확키 B scope·설치 SHA·승인 manifest 실제 확인 및 인가 |
| R4-03 | **SOURCE_READY / TEST_PENDING** | 기존 #1698의 수정된 `tools/publication-executor.mjs`·`tests/publication-executor.test.mjs` blob SHA 일치 상태로 #1762에 포함, 기존 V8 모의 10/10 + QFR 반례 12/12 | **실제 Node 집중 테스트/CI** 통과. 현 #1762 PR CI [run 43882681762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43882681762)는 최초 조회 때 `queued`, PASS 아님 |
| R4-04 | **SOURCE_READY / MAIN_PENDING** | W05 브랜치 QFR Publisher·Test blob `fc406ee9b22aba86549e2140910f9d54db41262a`, `7d524176cf3323bee49948767f224ee94c6d178a`; 앱 [Draft #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175)와 동일 | 앱 최신 `main`으로 필요한 세 파일 선별 반영, 승인된 운영 원본·SHA preflight/apply 실증 |
| R6-01 | **SOURCE_TEST_PENDING** | 제어 #1762 테스트 2파일 포함; V8 실행과 실제 Node/CI 별도 | 정확한 GitHub Actions 단계의 실제 Node test 결과 확인 |
| R6-04 | **NOT_RUN** | 제어 일반 Writer B의 파일 overlay 허용은 `allowD1Writes=false`; 별도 QFR 게시 인가 manifest/설치 영수증 없음 | 정확한 단일키 승인 B 운영 경로와 Windows 실제 실행 ID/원장 |
| R4-06 / R6-05~06 | **NOT_RUN** | QFR 기존 PC 원자료 수집·계산 성공은 재사용 가능. 이번에 실 D1·공개 UI 결과 없음 | 승인된 단일키 실제 D1 게시·body/version/time 재조회·Production GET/UI |

**다음 순차 실행 찾기:** [진행 기록](EARNINGS_RECESSION_R1_R6_82_STEP_PROGRESS_20261116.md)의 **현재 순차 단계·LAST PASS/FIRST UNFINISHED·다음 필수 실행**을 먼저 읽고 해당 ID의 여기 완료 조건에 맞춰 수행한다. 앱 QFR PR #1175와 제어 B PR #1762의 `main` 병합·CI는 재사용할 후행 소스 자산이며 71번째 R6-04를 현재 진행 순번으로 오인하지 않는다. QFR 정확키 D1 쓰기는 별도 B effect 승인 전 금지하고 자연 예약 관찰을 필수 완료 Gate로 만들지 않는다.

## 10. 82단계 실행 원장 — 집중 Node CI 및 BEA 저장형 소스

> 운영 PC/D1/Production 작업 0건. 실운영 데이터 없이 CI·소스 완료를 운영 DONE으로 집계하지 않는다.

| ID | 이번 실제 완료 증거 | 현재 판정 | 남은 운영 조건 |
|---|---|---|---|
| R4-03 | 제어 [PR #1762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1762) 소스에서 실제 격리 Windows Node 22 테스트 [Run #43883643669](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43883643669) **21/21 PASS, 0 FAIL**. 정확키·QFR 3핀·D1 결과·BEA 회귀 검사 | **SOURCE_CI_PASS** | 제어 `main` 소스 승인 통합·실제 B 설치는 별도 |
| R6-01 (게시기 관련) | 위 제어 focused CI는 실제 Node 명령의 통과 증거. 동일 PR의 기본 C996 read-only 소스 검사 [#43883643183](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43883643183) PASS | **TARGETED_CI_PASS** | 전체 W05 기능의 모든 회귀가 완료된 뜻은 아님 |
| R4-02 | 제어 #1762는 기존 B 제안 7파일+별도 격리 CI 1파일의 **Draft 8파일**, disabled feature flag 유지, `mergeable=true` | **SOURCE_READY** | 승인된 공통 B exact-key 권한·실제 PC 설치·manifest/운영 SHA 검증 |
| R3-10, R4-07 | W05 저장형 BEA publisher `ca9a6e9754456925dd5578d00fb4a0ab5dbbfe42` 및 immutable raw helper `812266af97836edf9e06bae679e363e6546168fb`를 앱 최신 main 기반 [Draft PR #1183](https://github.com/ansqhd5774-Choi/zgmini/pull/1183)로 **4파일 선별 반영**. 저장 원본 SHA의 reader 및 공급자 재호출 없는 D1 게시 코드 | **SOURCE_READY / APP_CI_PENDING** | 앱 Node CI·승인 원본 아카이브 capture/readback·실제 B D1 게시 |
| R3-09 | 새 archive 단위시험 5개를 기존 `node --test tests/*.test.mjs` CI glob에 연결하는 source-only 테스트 파일을 W05 브랜치와 #1183에 반영 | **TEST_SOURCE_READY** | 실제 GitHub Node CI 및 PC 저장 원본 readback |

BEA #1183 최신 App CI [Run #43884699372](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43884699372) 최초 조회 기준 `pending/in_progress`로 확인돼, 이 문서 작성 시에는 PASS를 주장하지 않는다. 앱 QFR 3-pin 관련 기존 [PR #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175)의 과거 Node CI [#43863499821](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43863499821)는 `success`이지만 `main` 병합·실PC 설치·D1 write는 별도다.

**NEXT:** BEA CI와 QFR 실증 증거의 마지막 유효 상태를 회수하고, 정확 승인 B 단일키 Scope를 정규 Owner에서 확정→선별 source main 반영·실제 Windows 설치와 승인 QFR 한 키 게시·D1 본문 readback. BEA 원자료가 실제 PC에 없다면 기존 승인 Collector 경로로만 최초 저장하고, 공급자/권리 확인 전 수집을 임의 실시하지 않는다.

### 2026-11-16 BEA 실제 Node CI 완료 증거

- 앱 저장형 BEA 단위이익 source-only [Draft PR #1183](https://github.com/ansqhd5774-Choi/zgmini/pull/1183), head `fa59e002e27c8936537b2e2eff8b9ecc1ec46cd8`, **4개 파일만 변경**. 실운영 Publisher 파일 교체 아님.
- 실제 앱 Node 24 GitHub Actions [Run #43884699372](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43884699372): `completed / success`. `npm run build`, `npm run typecheck` 성공. `node --test tests/*.test.mjs` **4,471 total / 4,461 pass / 0 fail / 10 skipped**, 그중 신규 BEA immutable archive 5개 테스트 **5/5 PASS**. 게시 복구 추가 11/11, 후보 Worker D1 읽기 계약 추가 69/69 PASS.
- 의미: **R3-09·R3-10 및 R4-07의 소스/테스트 완료 확인**. 아직 유효 공식 원천 권리·운영 PC 원본 보관 실물·B exact-key 승인·게시·D1 readback은 별개 **NOT_RUN/UNVERIFIED**. R6-01 중 해당 영향 범위의 CI만 완료.
- 실운영 E:\\ZGmini 원자료·DB·D1·Cloudflare·Task·config·scheduler 쓰기 **0건**. 전담 브랜치·기존 main 원본 데이터 보존.

**다음 실행:** 이미 완료한 Native Node CI를 다시 돌리지 않고, 승인된 QFR 정확키 B 실행 경로/운영 설치·source SHA/manifest를 확인하여 필요한 선별 main 통합 후 기존 QFR 저장 원본으로 단일키 D1 게시→직접 재조회. BEA는 별도 승인된 저장 원본 확보 후에만 실제 게시.
