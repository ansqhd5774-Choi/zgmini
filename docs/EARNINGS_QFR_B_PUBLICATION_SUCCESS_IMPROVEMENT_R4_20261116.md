# W05 QFR B 게시 성공률 보완 조사 R4 — 2026-11-16

대상: `codex/api-site-integration-r1-20261026`. 조사 및 메모리 시뮬레이션만 수행. PC 원본, Controller, D1, Cloudflare 실제 변경 **0건**.

## 1. 새로 확인한 결함/진행 차단
1. **P0 승인된 QFR B 게시 경로 미확정.** 제어 GitHub 현행 `main`에 `.github/workflows/pc-publication-b.yml` 및 `approvals/publications/`이 각각 404. [제안 Draft #112](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/112)와 [수정 Draft #1698](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1698) 미병합. 일반 `approvals/writer-updates/` 86파일명에 QFR 전용 없음. **다른 기등록 동등 B 경로 존재 여부는 미확인**이고 현행 일반 source overlay는 `allowD1Writes=false`: 게시 권한과 구분할 것.
2. **P1 결과 파서 누락 7반례.** 실제 `tools/publication-executor.mjs` blob `c5773e35...`의 `parsePublisherLog`는 QFR 실제 키, MODE, source gate, source HTTP/SQLite writes, D1_RESULT↔RESULT 조합 미검증. 이후 `validatePublicationReadback`에 검증된 실제 키 대신 기대 키를 대입한다. 기존 [R3 42사례 시뮬레이션](EARNINGS_QFR_B_PUBLICATION_SIMULATION_R3_20261116.md)에서 추가 반례 12개 중 7개 비정상 수용. 메모리 검증 조합을 추가하면 12/12 예상 판정. 잘못된 실제 D1 쓰기의 증거는 아님.
3. **P1 제어 소스 테스트 1개 현재 반드시 불일치.** 제어 fix branch `tests/publication-executor.test.mjs`에서 오래된 assertion `/phase\.phase==='APPLYING'\?'UNVERIFIED':'STOP'/`은 현재 실행기가 지원하는 `noWriteVerified?'NO_WRITE_STOP':'UNVERIFIED'` 분기를 반영하지 못함. 실제 파일 원문 패턴 21개 JS 평가 **20/21 일치**. 기존 안전 기대를 세부 세 조건으로 **강화하는 메모리상 테스트 수정** 후 23/23 일치. 관련 정식 Node CI는 별개이며 미검증. assertion 삭제/완화 금지.
4. **P1 앱 main source SHA 이동.** 이전 조회 `2ab848de...`→현행 조회 `455ec124...`, B approval 계약의 `publisherSha=publisherHead=originMainHead`가 시점 불일치 시 안전 거부. 승인·checkout·실행을 연결한 직전 동일 SHA 확인을 하고 drift 시 미승인 재시도 금지. 앞선 [앱 Draft #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175)의 3필드 PIN은 아직 main 미반영(실제 조회 QFR 게시 파일 blob `4667e39...`; fix branch `fc406ee...`).
5. **P1 게시 가능 원본 수명.** 현재 PC 저장 2026Q2 원본(2026-10-27 검산)의 165일 관측일 규칙을 변경하지 않으면 `2026-12-13T00:00Z`부터 관측 만료. [Census 공식 2026Q3 QFR 발표 예정: 12월 7일](https://www.census.gov/econ/qfr/release_schedule.html). 다음 발표를 새로운 필수 선행조건으로 삼지 않고 현재 Q2를 먼저 출처 검증/게시. 실 PC에 더 최신 저장본이 있는지는 별도 런타임 증거로 판정.
6. **P1 D1 불명확 응답 뒤 무조건 재실행 위험.** B 실행기 상태 `STATE_UNKNOWN`와 per-request lease 기록을 사용하고, 승인된 단일키 readback + owner ledger 검증 전 lease/원장 삭제·재시도 금지.

## 2. 성공률 보완 우선순위
- **소스 먼저**: 제어 `tools/publication-executor.mjs`에 실제 QFR snapshot key·모드·SOURCE_GATES·source HTTP/SQLite 0·D1_RESULT/RESULT 동일 의미 쌍 검사 추가. 검증된 키를 `validatePublicationReadback`에 전달. `tests/publication-executor.test.mjs`의 stale assertion 수정 및 7반례 추가. BEA 정상/안전 거부 유지.
- **실제 Node 집중 시험**: `node --test tests/publication-contract.test.mjs tests/publication-executor.test.mjs`와 관련 CI (B 실행기는 현재 Draft/미설치). 메모리 23/23을 실제 Node PASS와 혼동 금지.
- **승인 경로 재사용**: 현재 기등록 QFR 정확키 B operation/manifest/런타임 소스를 먼저 확인, 없다면 기존 승인 B 공유 admission/lease/영수증 기반 exact-key 단발 adapter 확장. QFR용 새 Runner/예약/무제한 shell 금지.
- **원본·체크아웃 고정**: QFR PIN 3필드 sourceVersion/rawZipSha256/sourceStoredAt를 앱 main에 선별 통합, main publisher와 approved operation checkout의 SHA를 각각 확인, 저장형 read-only preflight 수행. 운영 수집 checkout의 QFR 파일 5 ABSENT를 일괄 복사하지 않음.
- **실제 B 게시/재조회**: 전용 snapshotKey 1개만 CAS/idempotent D1 write→body/storedAt/sourceVersion 대조; 통신 불명확 상태는 state unknown; API/UI는 Cloudflare 정확 Production SHA 후 최종 확인.

## 3. 성공률 계산 (통계가 아닌 명시적 주관 가정)
| 조건 | 곱한 가정 | QFR D1 전망 |
|---|---|---:|
| 기존 R3 | .92×.85×.96×.95 | **71.3%** |
| 결과검증+테스트만 수정, B 미확정 | .98×.85×.96×.95 | **76.0%** |
| 코드·실제 승인 B·두 SHA·원본·D1 readback 조건 모두 확보 | .98×.95×.98×.98 | **89.4%** |
조건 충족 뒤 QFR Production API/UI에 .94를 추가 가정하면 **84.0%**. 기존 BEA .80×WPS .79×제조업 .82×최종 .93 독립 가정 유지 시 14단계 최초 일괄 통과 약 **40.5%**(기존 31%). 원본 운영 성공 표본은 없어 통계적 확률/보증이 아님. **결과 검증을 엄격히 하는 것 자체는 허위 PASS를 줄이지만 실제 D1 게시 성공률을 자동으로 높이지 않는다.**

## 4. 판정 및 다음 필수 실행
- LAST PASS: #1709 실제 Windows A점검/JSON·TXT 재조회, app PR #1175 기존 CI PASS, 제어/앱 소스 계약 검증, 새 정적 21회 비교, 메모리 대조 23/23.
- FIRST FAIL(소스): B 결과 로그 실제 key·모드·원본검사 누락, 제어 테스트 stale assertion. 실제 D1 실패/Windows B 실패는 새로 관측되지 않음.
- NEXT (원담당 W05): 제어 Draft executor+test **정확 2파일 최소 수정**과 집중 Node 시험, 기존 B 승인 설치 조사 읽기 전용 병행. 운영 수집/정규 갱신 추가 실행은 필수 아님.
- 14단계 실제 운영 DONE **0/14** 유지. 8단계 복구계획은 [R2](EARNINGS_QFR_B_PUBLISHER_DUAL_SOURCE_ROOT_CAUSE_PLAN_R2_20261116.md) 참조.
