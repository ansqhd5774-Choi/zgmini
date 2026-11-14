# ZGMINI API–사이트 연결 — 실제 병목 근본 원인 분석 (2026-11-14 KST)

> **확인 근거**: GitHub 최신 `zgmini/main 643b7c7c4372ffad552443fc312c6cb1b944e2fc`, `zgmini-pc-control/main 69e25a08a903dc8e52ef1093ec15837de4c20858`, 본 전용 브랜치 직전 HEAD `ec14386eacc3e56039301a7e32c3313628391571`, 중앙 #68 65차 [6866393700](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6866393700) 및 #1351 실행 Job. 소스/기존 로그의 **관측 범위**에서만 확정. 임의 PC·SQL·Cloudflare 운영 조회/변경 없음.

## 1. 결론: P0는 권한 부족 한 문장이 아닌 '데이터 증거 회수 계약의 부재'

**즉시 정체 원인**: 현재 API 5개 공개 Reader와 D1 정확키 사이의 의미 동치 판정에 필요한 **인증된 실 D1 readback + 동시점 API/배포 증거**가 원담당에게 전달되지 않았다. 비교기·11개 합성 fixture는 작성됐지만 그 **입력 원본을 생성·전달할 승인된 fixed-key 원격 D1 검사 경로가 연결되지 않았다**.

**근본 구조 원인**: (A) 기능별 Writer는 일부 게시 직후 자체 readback이 가능하지만 (B) 공통 운영 A/호스트 원장에 현재 5개 원격 D1 저장본의 고정 읽기와 안전한 변환 비교를 책임지는 **설치·허용목록·결과 반환 계약/운영 소유자**가 지정·실증되지 않았다. 게시 성공·옛 영수증·GitHub CI·공개 GET은 별도의 현재 D1 증거를 대신하지 못한다.

### 실물 증거
- 제어 [`config/operations.json`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/config/operations.json)에는 A/light `writer-publication-evidence-readonly`, `inflation19-runtime-readonly`, `source-inventory-runtime-readonly` 등이 있지만, **5개 원격 D1 exact-key 현재 row 동치 원격 조회 operation은 없음** (소스 등록이지 운영 설치 확인 아님).
- 제어 [`controller/writer-publication-evidence-readonly.mjs`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/controller/writer-publication-evidence-readonly.mjs)는 ER1 월간 output만 SQLite에서 고정 조회하고 과거 Writer ledger의 `d1BodySha256`을 **당시 게시 run**에 한정해 해석한다. 5개 키의 **현재 인증된 D1 SELECT가 아님**.
- 제어 [`r6-registered-data-b/operation.mjs`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/r6-registered-data-b/operation.mjs)는 기존 PC Writer 자격 해석기를 재사용해 `SELECT 1` 인증 preflight를 하는 **B급 별개 경로**가 존재한다. 즉, D1에 기술적으로 접근하는 소스 경로 자체가 없는 게 아니라 **그 자격·실제 운영 사용자에 5키 조회 권한이 있고 등록된 승인 fixed-key 조회가 있는지는 미확인**. 이 B급을 A급 동치 Reader로 전용/우회 사용하지 않는다.
- 기능 [`scripts/pc-writer/independent-publication.mjs`](https://github.com/ansqhd5774-Choi/zgmini/blob/main/scripts/pc-writer/independent-publication.mjs)의 `er1MonthlyD1Readback`은 ER1 월간 feed key regex로만 허용됨. 5키 호출에 재사용하면 false/null (현재 계약상).
- 과거 5 public GET `200/200/200/503/200`(44차)과 최신 무료 공개 GET `DisabledError/URL_NOT_ACCESSIBLE_VIA_TOOL`(58/60차)은 **다른 시각**. 운영 API가 지금 503/오류라고 추론하지 않는다.

## 2. 설계상 추가 병목 두 개 — '영수증 받기'만으로도 완료 불가할 수 있음

### P0-2. 기존 60차 비교기의 입력과 요청한 안전 영수증이 다르다

기능 전용 [`compare-five-public-readbacks-r1.mjs`](../scripts/api-site/compare-five-public-readbacks-r1.mjs)의 `comparePublicReadback(slot,{d1,api})`는 **`d1.body` = 원본 저장 JSON 문자열**, **`api.body` = 파싱된 공개 JSON**, `readAt/stored_at` 등으로 직접 `JSON.parse`·`isDeepStrictEqual` 및 저장 body SHA256을 계산한다.

기존 반복 요청의 비민감 영수증 `key/exists/stored_at/bodySha256/version`만으로는 **실제 JSON 내용의 의미 동치를 계산할 수 없다**. `bodySha256`을 `payload` SHA와 동일하게 비교해도 안 된다 (물가 저장 `{payload,projection}` vs public `payload`). 또 현재 비교기는 matched fixture에 `STRUCTURAL_MATCH_NOT_RUNTIME_PROOF`를 반환하도록 설계돼 **자체적으로 현장 인증을 만들어주지 않는다**.

**최소 해법:** 5개 raw D1 body는 외부 GitHub/chat으로 내보내지 말고, **이미 승인된 권한 소유자의 보호 실행 환경 안에서** exact-key D1 SELECT→원본 해시→동시 API JSON 수신→기존 Reader 변환·전후 버전 확인→비민감 `MATCH/MISMATCH/UNVERIFIED`와 관측·source/deploy 증빙만 돌려준다. 새로운 안전 reader/호출/자격 적용이 필요한 경우 중앙 Owner의 정확 범위 승인·기존 공통 설치 절차를 먼저 거친다.

### P1-2. 테마는 5개 seed key만으로 전체 공개 동치를 검증할 수 없다

기능 [`worker/theme-etf-only-public.mjs`](https://github.com/ansqhd5774-Choi/zgmini/blob/main/worker/theme-etf-only-public.mjs)는 `public:theme-etf-only:r1` seed 뒤에 [`readRollingPublic`](https://github.com/ansqhd5774-Choi/zgmini/blob/main/worker/theme-etf-rolling-public.mjs) 및 승인된 AI/바이오/DC/우주·잠정 sidecar를 **여러 단계 합성**한다. Rolling은 `public_feed_snapshots_v1 / kind=output / feed_key=theme-etf-only-rolling / snapshot_key=current`에서 독립으로 읽는다. 60차 비교기는 테마에 대해 의도적으로 `SEED_READBACK_ONLY_COMPOSED_UNVERIFIED` 반환. **seed row 하나가 있어도 API 10테마의 출처·점수·현재성 검증은 불가**하다.

**최소 해법:** 최초 5키 readback의 theme seed 결과와, 실제 API에서 선택된 rolling·sidecar 각 키의 존재/선택 여부·검증 결과/버전·한정 해시를 분리 기록하고 선택된 변환 경로를 보호된 실행 환경에서 비교한다. 모든 sidecar를 반드시 활성화하라는 뜻은 아니며 승인·실제 적용된 것만 확인한다. Theme API가 503 stale이면 5키 동치와 별개로 **테마 수집·게시 원담당의 첫 실패 원본** 확보 후 정상 게시/권리 검증이 필요하다.

## 3. 운영/프로세스 병목 — 직접 원인과 간접 원인을 분리

| 영역 | 실증 상태 | API 최종 판정에 대한 관계 | 소유자/조치 |
| --- | --- | --- | --- |
| 원격 D1 fixed-key 안전 조회 계약 | 현행 허용 operation 없음/승인 현장 회수 경로 미확인 | **직접 필수 차단 P0** | 중앙 승인 Cloudflare/D1 조회 소유자: 기존 허용 조회 경로 우선 확인. 없다면 정확 고정키/읽기-only/비민감 결과 반환 경로를 기존 공통 계약으로 별도 승인 |
| 원본 JSON을 쓰는 의미 비교와 해시 메타-only 영수증 불일치 | 비교기 원문 입력 계약 직접 확인 | **P0: 해시 영수증만 받으면 '비교기 실행' 불가** | API 원담당 + 승인 조회 Owner: 현장 내부 비교·외부 안전 verdict를 합의 |
| Cloudflare Production Deployment SHA | 현재 정확 Deployment ID/source SHA 미확보 | **현행 코드 vs 실제 배포 동일성 미확정** | 기존 Cloudflare 배포 조회 권한 소유자. GitHub main SHA 대용 금지 |
| 공개 GET 도구 접근 | 58차 URL_NOT_ACCESSIBLE_VIA_TOOL, 60차 보조 DisabledError | 현재 API 본문 확보 차단, **서비스 HTTP 오류 아님** | 승인 무료 read path가 바뀔 때만 1회 사용; 막힌 경로 폴링 금지 |
| 운영 PC #1351 | [Run 43429486924 / Job 131899103441](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43429486924) 여전히 `queued/conclusion=null/steps=null` | **현재 운영 PC A 요청 배정 장애이나 5키 D1 Reader 자체는 해당 Job operation에 포함되지 않음** | 중앙 1명: 등록 label/online/busy/Listener·배정 먼저 판별. API 독립 개발의 전역 Gate 아님 |
| 브랜치 통합 | 기능 main vs 전담 `ahead 276 / behind 554`, diverged (2026-11-14 조회 시점) | 현재 읽기 원본 접근 차단 원인은 아니나 무차별 main merge/충돌 회피 비용 증가 | API 담당: 단일 선별 PR/파일별 독립 검증. main 병합·배포는 승인 통합 Owner |
| 데이터 생산 자체 | 44차 테마 503 stale, 후보 물가 ID22/23/28 PENDING, 고용 28/29 READY 등 **과거 시점** | API byte 동치와 별개로 원 기능 완료의 별도 장애 | 테마/물가/고용 각 원담당의 실제 저장·게시·원자료 수정 후 API/UI 확인. API 담당 임의 Collector 수정 금지 |
| 6개 ChatGPT 일반챗 분리 | GitHub #68 댓글은 타 대화의 실제 수신/작업 시작 아님 | 보고·요청은 누적되지만 실행 소유자가 증거를 직접 인계하지 않으면 진행되지 않음 | 중앙 프로세스 총괄: 한 명의 **결과 회수 책임자**를 기존 7인 안에서 지정하고 확정 ID/Run JSON/TXT/버전으로 인계. 별도 가상 작업자 생성 금지 |

**중요:** #1351의 `operation=core-runtime-source-readonly`는 5키 D1 remote readback operation이 아니다. Queue가 정상화돼도 그것만으로 API 0/5가 해결된다고 결론내리지 않는다. Runner 대기 원인도 label/online/idle 등 현재 상태의 현장 evidence 없이 단정하지 않는다.

## 4. 근본 개선 순서: 새 통제 규칙을 늘리지 않고 최소 기존 경로 고치기

**우선순위 1 — 단일 '현재 D1↔API 증거 영수증' 계약 채택 (중앙 운영 조회 Owner와 API 전담):**

- 기존 Reader/Writer의 실제 Cloudflare/D1 인증 읽기 능력과 설치/허용 범위를 **비밀 없이 조회**한다. 기등록 5키 read 경로가 있으면 그것을 재사용한다.
- 없다면 **고정 테이블·정확키 5개만** 대상으로 읽기-only이고 D1/Worker/Writer/원자료를 쓰지 않는 한정 작업을 중앙 기존 정규 승인 경로에서 검토한다. 새로운 원격 shell/자격증명 출력/일반 SQL 입력/무허가 등록은 금지한다.
- 보호 환경에서 raw body와 public API parsed JSON을 비교한 뒤, GitHub 원장은 `requestId/Run/Job/host/sourceSHA/deploymentSHA/environment/rowKey/readAt/storedAt/bodySha256/apiObservedAt/apiStatus/matchedVerdict/firstFail`와 테마 `appliedOverlayKeys+version`만 비민감으로 반환. **원본 row body는 외부 이관 금지**.
- '동일 시각'은 두 조회 사이의 **유한한 관측 창 + 동일 sourceVersion/sourceStoredAt/checkpoint 확인**으로 구현하고, 갱신 사이에 버전이 바뀌었으면 `SOURCE_DRIFT_UNVERIFIED`로 분리한다. 원자적 동시 조회가 된다고 가정하지 않는다.

**우선순위 2 — 권한 분리된 외부 검증:**

- Cloudflare exact Production Deployment ID/branch/SHA를 실제 권한자로 읽고, 당시 HTTP response version/time을 D1 판정 영수증과 같은 관측 창에서 대조. API 공개 GET이 막혀 있으면 도구 장애와 API 상태를 분리; 승인된 다른 무료 접근에서만 시행.
- theme rolling/sidecar provenance와 필요하면 테마 원담당의 승인 게시 수리 증거를 추가. 최초 5key 판정 통과와 10테마 최종 공개 PASS는 다름.

**우선순위 3 — source mismatch가 확인된 뒤에만 코드 수정·선별 PR/배포:**

- 모든 항목을 '상대가 준비 안 됨'으로 일괄 BLOCK하지 않고 D1의 `exists`, 본문, 시각, API 신선도, 권리/원자료 결손을 구분하여 `VERIFIED/MISMATCH/UNVERIFIED/NOT_READY` per-key verdict 저장.
- mismatch이 실증된 정확 기능·파일만 수정, 관련 회귀 후 별도 main 통합 승인과 exact Cloudflare Git Deployment. 완료 source CI를 반복하지 않음.

## 5. 진행률 및 마지막 유효 증거

- 현행 API 비교 업무 **75%→75%**(4단계 중 소스 계약/과거 공개 HTTP 기준선/fixture 비교기 완료 3/4). 이는 **운영 종단 완료율이 아님**. 실 D1 exact-key **0/5 UNVERIFIED**.
- **LAST PASS:** 60차 기존 비교기 Node22.16 11/11 PASS, 고정 5키·ER1 전용 경로·R6 B credential probe·테마 합성 경로 및 #1351 queued 메타를 **읽기 전용 소스 증거**로 구분 확인.
- **FIRST FAIL (현장 직접):** 5키 원격 D1 인증 결과 회수 경로 **미확보**. 이번 소스 수정/Runtime 실패는 관측되지 않음. 과거 공개 Theme 503/STALE은 옛 시각의 기능 데이터 신선도 이슈.
- **FIRST UNVERIFIED:** D1 row 5개 현행 해시·본문, 동시 API JSON, 테마 활성 sidecar provenance, exact Cloudflare Production source SHA.
- **현재 blocker:** `AUTOMATION_BLOCKED(NO_APPROVED_EXACT_KEY_D1_READBACK_ACCESS)` (마지막 실증 단위만). **비차단:** 브랜치 divergence/다른 기능 조회 지연/일부 기존 mock UI CI.
- **신규 운영 실행/권한·구조 변경**: 0. 본 보고서 이외 기능/API/Collector/Writer/Controller/SQL/D1/Cloudflare/Runner/배포/TTL/승인 주기 변경 0.

### 다음 실제 필수 실행 하나

**중앙의 기존 승인 D1/Cloudflare 조회 소유자가, 현재 이용할 수 있는 fixed-key readback 권한/허용 operation이 존재하는지와 보호된 환경 내 JSON 의미 비교·비민감 결과 인계가 가능한지를 확인하고, 기존 경로가 없을 경우에만 정규 승인으로 해당 5키에 한정된 조회·결과 회수 계약을 마련**한다. 이후 API 전담은 새로운 임의 SQL 없이 실제 영수증을 받아 5키 중 검증 가능한 항목부터 각각 판정한다.
