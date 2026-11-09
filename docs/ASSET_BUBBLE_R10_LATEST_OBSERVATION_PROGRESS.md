# 자산 버블 R10 최신 개별 관측치 — 목표·단계·진행률 정본

- 기준일: 2026-11-09 KST
- 기능 저장소: `ansqhd5774-Choi/zgmini`
- 원작업 브랜치: `fix/asset-bubble-r10-latest-observations-20261103` (Draft PR #961). 최신 main 선택 통합: `fix/asset-r10-latest-main-slice-20261109` (Draft PR #1050, base `3910adf7…`, HEAD `17c3c048…`).
- 공통 실행/승인 정본: `ansqhd5774-Choi/zgmini-pc-control` 최신 `main`의 `AGENTS.md`, `docs/GENERAL_CHAT_START.md`, `docs/PC_AUTOMATION_STANDARD.md`.
- 범위: **기존 승인 산식/가중치/평가분기·기존 R10 결과를 보존하면서 구성 6개 지표의 검증된 최신 개별 관측치만 현재/이전/관측 추이에 반영.**
- 이 문서는 실행·승인·설치 완료 증거가 아니며, 다른 ChatGPT 대화에 자동 전달되는 메시지도 아니다.

## 1. 최종 통과 조건

1. 6개 지표 모두 **공식 발표된 마지막 유효 관측**의 현재값·이전값·실제 관측일/분기를 표시한다. 평가 분기 이후 새로 공개·검증된 관측이 있을 때만 선택적 `latestObservation`을 추가한다. 발표 가능일·월말 완결성·시장폭 자료품질 등 기존 개별 검증을 통과해야 한다. 미발표 분기는 생성하지 않는다.
2. 종합점수 평가 분기는 현재 `2026-Q2`이며 점수 약 `22.6` 및 가중치·산식·scored/raw/history 기존 계약을 임의 변경하지 않는다. 최신 개별 관측치와 점수 평가 분기를 혼동하지 않는다.
3. PC 공급자 수집 → SQLite/로컬 원자료 저장·재조회 → 저장 자료 기반 계산 → 새로운 결과/checkpoint 로컬 저장 → 기존 게시기로 D1 반영 → 공개 API/UI 재조회가 동일 소스/날짜/값으로 연결된다.
4. 동일 sourceVersion/sourceStoredAt을 덮어쓰거나 날짜·결측치를 임의로 채우지 않는다. PC/모바일에서 현재·이전·날짜·차트 마지막 점을 확인한다.
5. 기능 개발·배포를 모두 완료한 **이후**에만 자연 예약 자동 갱신 검증을 후속으로 수행한다. 과거 Controller 복구, 무관한 전체 테스트, 타 기능의 대기 자체를 R10 기능 완료의 Gate로 추가하지 않는다.

## 2. 6단계 진행률 (동일 가중치, 시작 기준선)

| 단계 | 담당·업무 | 완료 증거/통과 기준 | 2026-11-09 |
|---|---|---|---|
| 1 | R10 담당: 기존 계약·원자료 6개 확인 | `/api/asset-bubble-raw` READY, scoreObservationQuarter=2026-Q2, score=22.57324…, factors=6, 산식 보존 | DONE |
| 2 | R10 담당: 최신 개별 관측치 후보 개발 | 원 후보 PR #961 48/48 PASS. 최신 main 선택 Draft PR #1050 **정확 6파일·51/51 PASS**, diff check 통과. **운영 미반영** | DONE (후보 코드) |
| 3 | R10 담당: 현재 PC source 원본 확인·승인된 Writer 설치 | PC HEAD=config.source·2파일 before/after SHA·의존 파일·원본 보호·lease/CAS, 필요시 공통 Writer B 단회 설치 및 실제 SHA·백업·JSON/TXT 검증 | **BLOCKED** — A 조회 2건 PASS, B #1066 공유 설치 점유 안전 STOP |
| 4 | R10 담당: 새로운 6개 개별 관측치 생성·로컬 저장 | 신규 체크포인트와 로컬 결과·원장에 검증된 최신 관측치 6/6개 존재, 실제 관측일과 원본 일치 | NOT_DONE |
| 5 | R10 담당: 기존 게시기 → D1/API | 승인된 신규 source checkpoint 게시, D1 readback·`/api/asset-bubble-raw`·`/api/asset-bubble-history` 값/버전/시각 대조, 최신 6/6개 공개 | NOT_DONE |
| 6 | R10 담당: 사이트 PR 및 PC/모바일 | 선택 통합 PR #1050의 최종 Git Integration 배포, 화면 현재/이전/관측일/마지막 점 6개 일치, 종합점수 22.6 유지 | NOT_DONE |

**시작→현재 전체 공정률 = DONE 2 / 6 = 33.3% → DONE 2 / 6 = 33.3% (변동 0%p).** 각 단계는 최종 통과 증거가 있어야 100%로 계산한다. 진행 중·일부 통과는 DONE으로 세지 않으며, 세부 진행은 별도 숫자로 보고한다. **새 후속 분기 `latestObservation` 공개 = 0/6 (2026-11-09 최초 브라우저 관측)**. 신규 Q3 관측의 공식 발표 가능 범위는 **최대 3/6**이며, 실제 유효 개수는 PC 검증 전 미확정이다. 운영 원자료가 11월 8일 갱신됐다는 사실만으로 게시 성공으로 보지 않는다.

## 3. 현재 필수 실행 하나와 최소 순서

**다음 필수 행동 = 공유 Writer #1063 복구 원장 대조 및 승인된 정상화(공통 단일 복구 담당).** R10 담당은 같은 B #1066을 재접수하지 않는다.

- **기존 증거 재사용:** R10 두 파일 PC 조회 [#1055](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1055) PASS, 현재 관측 시점 HEAD=config.source `825cfbd6…`, 목표/원본 SHA 확정. 기존 공통 범위 승인 파일을 재사용한 의존성 조회 [#1059](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1059) PASS. 시장 달력 import 파일은 존재하며 GitHub LF↔PC CRLF 차이만 확인. JSON/TXT 2/2 회수.
- **기술적 승인 명세:** R10 2파일만 담은 [control PR #1062](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1062) `main` 병합 `19e80d29…`, manifest SHA-256 `f49412ebb8d396197c32e5eadaee21f5ab095a1f9f1d9f8787921865ff22f7cd`. 후보 `zgmini` SHA `f541efbd…`; 산식·DB·Task·D1 변경 승인 없음.
- **실제 안전 중단:** R10 Writer B [#1066](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1066), Run `42617895258`: `WRITER_B_PREFLIGHT_STOP / WRITER_B_SHARED_INSTALL_BUSY_NOOP_STOP`, JSON/TXT 2/2, 설치 완료 증거 없음. 다른 담당 B [#1063](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1063)에서 `WRITER_B_RECOVERY_REQUIRED / WRITER_B_CORE_REENABLE_SOURCE_PAIR_STOP` 확인. [공통 #68 인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6740260933). 안전 거부 우회·같은 요청 재실행 금지.
- **신규 현재 상태 증거(복구 완료 아님):** 공통 인계 [#1068](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1068)와 A [#1074](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1074), Run `42619627581` 실측: PC HEAD=config.source `434f30d2aa221bddacab5afa09241916618d8e22`, checkpoint.source `825cfbd6e2025940e3e48631e7ff1dddf582e75a`, `sourceIdentityConsistent=false`, trackedDirty=false. Core Task Enabled·Writer B lock 소유·#1063 원장/백업 정합은 미확정. 과거 R10 manifest의 base `825cf…`를 그대로 재실행 금지.
- **복구 후 R10 담당의 바로 다음 실행:** 기존 #1063의 백업·lease·원장과 최신 실제 PC HEAD/config.source가 안전하게 정리됐다는 증거를 회수한다. 새로운 변경 기준이 생겼다면 정확한 before SHA/CAS와 R10 2파일 B manifest만 재산출하여 공통 1회 설치한다. 다른 기능 소스/DB는 변경하지 않는다. 그 뒤 **신규 검증 체크포인트 → 로컬 결과 → D1/API → PC·모바일**을 순서대로 확인한다.
- 공유 Writer 실제 쓰기만 직렬화한다. 독립 코드/조회는 병렬 계속. 전용 R10 B receiver 신규 개발, Controller 전체 재설치·전체 PID 추적을 자동 선행 조건으로 만들지 않는다.
- 게시 전에 PR #961이 Draft/미병합인지, 최신 main 대비 변경 파일, 관련 테스트, 배포 승인을 재확인한다. PR 병합·CI는 PC 설치나 Production 게시 증거가 아니다.

### 공식 원자료 발표 시차와 웹 통합 주의

- 2026-11-09 기준 연준 Z.1 최신 공식 자료는 2026-Q2이며 **Q3 발표 예정은 2026-12-10**이다([Federal Reserve](https://www.federalreserve.gov/releases/z1/)). `valuationPressure`·`riskAssetShare`·`speculativeFlows`의 Q3 신규값은 아직 존재하지 않으므로 Q2 실제 관측일을 보존한다. `priceAcceleration`·`breadthDivergence`·`excessLiquidity`의 Q3는 각 PC 원자료·완결성 검증 전에는 READY로 보고하지 않는다.
- R10 raw sidecar는 같은 `sourceVersion/sourceStoredAt`의 내용 변경을 `ASSET_R10_RAW_CONFLICTING_CONTENT`로 안전 거부한다. 보호 규칙을 완화하지 않으며 **새로운 유효 checkpoint**만 게시한다.
- 오래된 Draft PR #961의 전체 diff 병합을 금지하고 최신 main `3910adf7…`에서 **PC raw 생성 1 + raw 검증 1 + UI 2 + 테스트 2 = 6파일만** [선택 통합 Draft PR #1050](https://github.com/ansqhd5774-Choi/zgmini/pull/1050)에 준비했다. 격리 관련 48/48·페이지 동등성 3/3 = **51/51 PASS**, 원격 compare 정확 6파일, HEAD `17c3c0485d30ec59e68f0e70c9472a5b1afab339`. [GitHub CI Run 42620675447](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/42620675447) **SUCCESS** (build·typecheck·regression·PC publication recovery·Cloudflare read contracts 전부 PASS). Draft·미병합, 실제 웹 배포·화면 검증 전이므로 단계6 NOT_DONE 유지.

### 운영 화면 변경 전 기준점 — 실제 PC·모바일 조회 (2026-11-09 KST)

- **읽기 전용 운영 브라우저 검증:** https://zgmini.kr/asset-bubble/ 의 실제 화면은 종합 READY, 안전점수 **22.6**, 평가 분기 **2026-Q2**, 구성요소 진단 **2026-Q4 PARTIAL**, 카드의 저장 데이터 기준일 **2026.11.9**로 표시된다. 이는 기존 공개 점수/기본 관측 카드이며 **신규 R10 latestObservation 게시 완료를 의미하지 않는다**.
- **PC 화면:** 여섯 개 기존 구성 카드 각각의 저장된 이전/현재값·관측일·원자료 출처와 차트가 렌더링된다. 시장폭 괴리는 실제 3분기만, 나머지 다섯 지표는 실제 5분기 이력만 표시한다. 개발중 확장 카드 4개는 결측을 ‘—’로 표시하며 임의 값이 없다.
- **모바일 화면:** 375×812 viewport의 동일 운영 URL에서 종합 22.6, 날짜/평가분기 및 기존 구성 카드 **6/6개**가 DOM으로 확인됐다. `meta viewport=width=device-width, initial-scale=1`, main width 360px / viewport 375px으로 가로 본문 초과 없음. 화면 캡처와 DOM 확인 후 viewport override 원복. 모바일 세부 차트의 새로운 마지막 관측점은 **아직 신규 게시 전이어서 완료 판정 불가**.
- **표본 교차 확인:** 가격가속 현재 **36.508 로그 %p** (관측 2026-06-30), 시장폭 괴리 현재 **28.156 백분위점** (관측 2026-06-30), 과잉유동성 현재 **-1.242 %p** (관측 2026-04-01). 신규 Q3 값으로 오표기되지 않았다.
- 이 검사는 **단계6 새 코드 배포 검증이 아닌 기존 운영 UI 회귀 기준점**이다. 단계별 완료 및 전체 33.3%는 변동하지 않는다. 새로운 PC 체크포인트·D1 게시 뒤 똑같은 카드/점수/날짜/마지막 관측점을 비교한다.

## 4. 모든 R10 작업 보고의 필수 형식

작업 시작과 종료마다 다음 5줄을 **실제 증거 기준으로** 남긴다.

1. **전체 진행률:** 시작 `X/6 = Y%` → 종료 `X/6 = Y%` (변동 0이면 0으로 명시).
2. **현재 단계:** 단계 번호·상태 `DONE/RUNNING/STATE_UNKNOWN/BLOCKED/DEFERRED`; 세부 진행은 별도로 보고.
3. **이번 수행·검증:** 변경 파일, GitHub 커밋 SHA, 실제 PC requestId/실행 SHA, 로컬·D1·API/UI 증거 중 해당 범위만.
4. **실제 문제:** 필수 실행을 막을 때만 BLOCKER; 정확한 LAST PASS/FIRST FAIL/오류 코드/영향/담당/최소 복구. 무관 문제는 NON_BLOCKING.
5. **다음 필수 행동 하나:** 담당·입력·완료 조건을 지정. 기존 요청이 실행 중/불명확하면 원장을 먼저 재조회하고 재접수하지 않는다.

작업 브랜치·main·실제 PC 설치 SHA·웹 배포 SHA를 구분한다. 작업 도중 산식·스케줄·DB·DNS·Source 자동 변경 금지. 작업/프로세스 관리 문서 수정은 기능 진척도에 가산하지 않는다.

## 5. 근거

- R10 개발 Draft: https://github.com/ansqhd5774-Choi/zgmini/pull/961
- R10 최신 main 선택 통합 Draft (정확 6파일): https://github.com/ansqhd5774-Choi/zgmini/pull/1050
- 기존 별도 R10 B 초안(공통 수신기 재사용 시 불필요): https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/238
- 공통 범위형 A 성공: https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/882
- 공통 Writer B 실PC 성공: https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/871
- 공유 Writer 단일 설치 조정: https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68
