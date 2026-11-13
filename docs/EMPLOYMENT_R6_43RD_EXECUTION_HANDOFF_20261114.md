<!-- employment-r6-48th-primary-status-20261114 -->
## 48차 최신 실행 결과 (2026-11-14 KST · 아래 43차 기록은 당시 이력)

- **기능 완료율 87.5%=7/8 유지**, 이전 D1 28/29 scored READY 재사용. 이번에 실제 PC 수집/계산/게시·D1 쓰기 0건.
- 48차 지시 [공통 #68 원본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863150401) 중 고용 원담당 범위 확인; 같은 운영 단계를 막연히 재검증하지 않고 **수집기 source 결손 실제 수정**.
- 전용 브랜치 `codex/employment-1y-reader-r1` 수정: `lib/market-score/employment-r6-provider.mjs`의 기존 DOL BACKFILL 530→**600주**(기존 다른 브랜치/승인된 계약과 일치); `lib/market-score/employment-r6-store.mjs` 마지막 `BACKFILL` 모드 전용 run 조회; `lib/market-score/employment-r6-collector.mjs` 600주 실제 요청 provenance `DOL_ETA539_600_WEEKS_V1` 및 동일 UTC일 중복 수집 방지/기존 600주 SUCCESS 재실행 방지; `tests/employment-r6-backfill-600w-resume.test.mjs` **7건** 신설.
- 정확한 전용 브랜치 순차 커밋: provider `96ad08e59a6dee6e4093679ea4ff1c9a50552d0c`, store `367c86bb017edfa385160a796c0a0495c27dae6a`, collector `274ac3b6374b8b85e55d9963be56fefc2516d1c7`, test `e262fb3fefcdf751cf6a0e1a4ac485efcf1ccc6d`.
- 현재 main 기준 **3파일만** 분리한 [Draft PR #1064](https://github.com/ansqhd5774-Choi/zgmini/pull/1064), HEAD `3cc193e4695f1c610a8bb24e7cbab123726dcd10` (provider·collector·test; main store에는 기존 mode-specific 조회 있음). [CI #43496830194](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43496830194) **SUCCESS**, 신규 7/7 PASS, 전체 **4,185건/4,176 PASS/0 FAIL/6 SKIP/3 TODO**, 별도 회귀 11/11, 공개 경계 관련 69/69 PASS. `main` 병합이나 PC 설치는 진행하지 않음.
- 기존 [Draft PR #1062](https://github.com/ansqhd5774-Choi/zgmini/pull/1062)의 빈 ETA539 c3 결측→가짜 0 수정/4회 회귀 PASS도 **별도 SOURCE_ONLY** 증거로 유지. 두 PR을 실제 600주 운영 설치·첫 DOL 결손 해결 증거로 사용하지 않음.
- 공식 DOL 실제 첫 결손 주·지역: 여전히 **UNKNOWN**(운영 raw 600주·SQLite 577연속주×51지역 readback 없음). 단순 요청 WINDOW가 600이라는 사실은 실제 577주 완전성 증명이 아님. 이전 #1169 PARTIAL/기존 28개 유효 결과 보존.
- 운영 차단: 마지막 Controller 설치 관측 `badad912…`의 신규 `employment-r6-collection-evidence-readonly` 미등록. 공통 Controller 적용 41차 13파일 source-only 후보는 [기존 #68 인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6862442751) 그대로이며, 겹치는 공유 설치 쓰기만 Controller Owner가 담당. [#1351/Run #43429486924](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43429486924) 마지막 조회 `queued`/Runner 미배정, 같은 requestId 재실행 0.
- **다음 필수 실행 하나:** Controller/Runner 단일 Owner가 **기존 #1351 Runner 배정·PC 실제 source/lease/Controller 허용목록을 승인된 읽기로 검증하고 신규 R6 정밀 A 등록의 정규 적용 증거**를 고용 담당자에게 전달. 그 뒤 고용 원담당이 저장된 DOL 최초 결손을 단회 읽기→정확한 보완 B→29/29 로컬·D1·API/UI 확인. 승인 없는 운영 source/DB/D1/Controller 변경, RDC, 자연 예약 검증 0.

---

# ZGMINI 고용 R6 — 43차 프로세스 총괄 복귀 전달문

**기준일 2026-11-14 KST · 담당 원대화 `codex/employment-1y-reader-r1`.**
**목표:** 승인된 DOL 51지역×10년 역사에서 `STATE_CLAIMS_BREADTH` 정확한 결손 위치를 읽어 공식 자료로 보완하고 기존 28개 유효 점수를 보존하면서 29/29 실제 계산·저장·D1·API/UI 검증.
**진행률:** 시작 7/8=87.5% → 종료 7/8=87.5%; 최근 실측 D1 R2 점수 28/29 READY, 미평가 1/29(2025-07-19 마지막 *게시 관측일*). 8단계 운영 세부 0/5, 정적 개발·CI만으로 완료율 가산 없음.

## 이번 정적 결함과 정확한 변경
- **정적 결함 확정:** `lib/market-score/employment-r4-shadow-provider.mjs`의 ETA539 `c3` 파서가 `Number('') === 0` 성질 때문에 빈 필드 또는 공백 셀을 실제 0건으로 취급. 51지역 완전주 선정에서 가짜 값을 유효로 승인할 수 있음. **실제 원본 CSV/PC SQLite의 이 결함 발생 여부는 확인되지 않았으며 #1169의 원인으로 단정하지 않음.**
- **1파일 최소 수정:** `c3` 값을 trim하여 공란이면 해당 지역-주 관측을 제외한 후 기존 숫자 파싱. 정상 공급자 `0`은 유효. 기존 산식/가중치, 데이터 계약, source hash, 저장 방식, D1, 수집 주기 변경 없음.
- **테스트 1파일 추가:** `tests/employment-r6-eta539-missing-claim.test.mjs`; 공란/공백 제외, 명시 0 보존, 최신 51지역 불완전주보다 마지막 완전주 보존 총 4시나리오.
- **원작업 브랜치 커밋:** 파서 `801cddf2e34c0a763f4a7c259e5a3d3d88e8d329`; 테스트 `924e40e38c0e28fac011b012e395f5f74a12cb9e`. 지정 `codex/employment-1y-reader-r1` 브랜치는 main 대비 60 ahead/93 behind (대조시점); 전체 병합·reset/rebase·강제 정리 없음.
- **CI 검증용 선택적 Draft:** [PR #1062](https://github.com/ansqhd5774-Choi/zgmini/pull/1062), `fix/employment-r6-eta539-missing-c3-20261114` → `main`에 **동일 2파일만** 제안, HEAD `039a512a8e48fef4eefc9d71da9c07e089b57063`. [Node CI #43489515759](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43489515759) `completed/success`; **신규 테스트 4/4 PASS**, 전체 회귀 **4182 tests / 4173 pass / 0 fail / 6 skip / 3 todo**, 게시 후보·Cloudflare read 계약 69/69 PASS. CI는 **SOURCE_ONLY**; main 병합/PC 운영 배포/공급자 수집 0건.

## 현재 DOL 데이터의 엄격한 판정
- 기존 운영 게시 `STATE_CLAIMS_BREADTH`: `PARTIAL_HISTORY`, 점수 `null`, 관측일 2025-07-19. 다른 28/29 D1 유효 점수는 보존.
- 승인 계산은 현재 포함 10년 참조 521주 + 4주 전년 비교에 필요한 선행 55주 + 현재 1주, **최소 577 연속 완전주 × 51지역 = 29,427 지역-주 관측**을 요구. 이 계약의 수학·산식 변경 없음.
- 기능 GitHub `main@643b7c7c4372ffad552443fc312c6cb1b944e2fc`과 **지정 브랜치** 모두 DOL BACKFILL 530주; 별도 `feat/bls-registered-v2-20261109`에는 이미 승인된 600주 수집기 후보. 해당 브랜치 전체 병합 금지. 운영 PC 최신 provider/collector 파일 SHA·snapshot의 530/600주 판정은 아직 **UNKNOWN**(과거 #1040 공급자 600주 설치 이력은 현재 source 고정 증거 아님).
- **실제 최초 누락 주/지역, ETA539 600주 원자료 snapshot, SQLite checkpoint 최신값: 이번에 실증하지 못했음(UNKNOWN).** 2025-07-19는 최초 누락 날짜가 아님. 공식 자료의 발표/정정 여부와 파서 변환·DB 저장 문제를 단회 읽기 전 구분하지 않는다.

## Controller A 등록 — 총괄 41차 통합 후보와 명시 연결
- 마지막 실운영 확인 Controller `badad9124157879d7a645b64f2768113d632355b` allowlist **31개 A**, `employment-r6-collection-evidence-readonly` **미등록**. 제어 `main@69e25a08a903dc8e52ef1093ec15837de4c20858` **37개 A**, 위 신규 operation 포함. 신규 Reader의 소스 정적 테스트 13/13 PASS(기존 증거)이지 PC 실설치 증거 아님.
- [공통 41차 인계 정본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/codex/controller-ops-lessons-20261105/docs/CONTROLLER_READER_A_SOURCE_DIFF_PREFLIGHT_20261114.md): 14 Git 파일 diff(비배포 테스트 1) → **배포 후보 Controller 런타임 12 + config 1 = 13파일**. `controller/operations.mjs`의 static import 때문에 Reader 파일만 임의 복사/등록 불가. **원담당 필요 효과는 단 하나: `employment-r6-collection-evidence-readonly` 등록 및 실제 A로 DOL 최초 결손을 비민감 집계 readback**, 총 13파일 전부 설치를 일괄 요구하지 않음. 설치 전 실제 PC source/maintainer/lease/approval/해시/기존 31 A 보호는 Controller 단일 적용 Owner가 판단.
- **총괄 수신 원장:** [#68 인계 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6862442751). 이는 단지 GitHub 원장으로, 다른 ChatGPT 자동 수신·설치 성공 아님.
- #1217/#1227 `PC_JOB_INTAKE_NOT_OBSERVED` / 기존 requestId 소비 보존. 별도 단일 A [#1351](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1351), [Run #43429486924](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43429486924) **queued / Runner 미배정 / 결과 JSON·TXT 없음**(이번 재조회). 재실행하지 않음. #996 C NO-GO는 실제 공유 설치 쓰기에만 영향.

## 남은 필수 실행 하나
**Controller/운영 PC Owner:** 기존 #1351의 Runner 배정·원본 결과 JSON/TXT 2/2 및 현행 운영 Controller 설치 source/lease의 읽기 전용 증거를 먼저 회수한다. 해당 원본이 확보되고 통합 13파일 설치가 정규 승인·해시·공유 lock 조건에서 가능하면 `employment-r6-collection-evidence-readonly`만 필요한 효과로 설치·등록한 증거를 고용 원담당에 전달한다. #1351 재발행·임의 CMD/Remote Desktop·C 복구 우회 금지.

**이후 원담당 실행 경로:** 등록된 A 고유 요청 **1회** → 첫 불완전 주·지역 / `DOL_ETA539:530w|600w` snapshot / SQLite raw 577주 연속성 판정 → 승인 600주 provider/collector 현재 PC SHA가 OLD인 경우에만 정규 B 최소 적용 → 필요한 공식 원자료 수집·SQLite 재조회 → 승인 R2 저장자료 계산 → 로컬 결과/ledger → D1 버전·stored_at/readback → Production API/UI **29/29 READY**. 원자료 불충족 시 `PARTIAL_HISTORY` 그대로 보존.

**제외:** 자연 예약 검증, 새 scheduler, 임의 provider 재호출, 작업용 RDC, 신규 C·Runner/ZIP/우회 경로. 실제 운영/DB/D1 쓰기 **0건**.
