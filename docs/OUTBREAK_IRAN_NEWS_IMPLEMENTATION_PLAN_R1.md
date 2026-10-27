# 이란 전쟁 주요 뉴스 — 구현 작업 계획 R1

- 계획일: 2026-10-26 (KST)
- 상태: **GOV.UK 첫 1건 PC·D1·웹 공개 검증 완료 / R13 정상 예약 실행·뉴스 표시 캐시 갱신 1회 검증 완료 / 신규 기사 자동 공개 미승인**
- 작업 브랜치: `codex/outbreak-iran-news-retention-r1-20261026`
- 선행 승인: `docs/OUTBREAK_IRAN_NEWS_RETENTION_R1.md`
- 기준: 사이트 최근 14일 표시, PC **표시 전용 뉴스** 최근 30일 보관 후 자동 삭제
- 소스 조사 당시 `main`: `72e7fd9cde33643ad1915f594e8227432a81dadb`; 구현 직전 최신 main과 실제 PC 운영 SHA를 새로 확인한다.

## 1. 현재 확인된 구조

| 구분 | 현재 상태 및 코드 |
| --- | --- |
| UI | `app/outbreak-news-r57.tsx`에 주요 뉴스·전체/긍정/부정 필터·건수·원문 링크가 구현됨 |
| 화면 연결 | `app/outbreak-beginner-iran-r54.tsx`가 `<OutbreakNewsUI eventId="iran"/>`만 호출해 전달 기사 0건 |
| PC 뉴스 | `scripts/iran-progress/continuous-news-r3.mjs`가 RSS를 수집하고 R3 원장과 연결 |
| 원장 | `scripts/iran-progress/store.mjs`의 sources·decisions·calculations·publications·checkpoints 등에서 참조됨 |
| PC 실행 | 기존 `run-reference-flow-r3.mjs` 및 `ZGMINI-PC-Iran-Progress-R13` 실행 경로 |
| 게시 | `scripts/iran-progress/publication.mjs`가 기존 D1 `market_public_snapshots_v1`에 게시 후 read-back 검증 |
| API | `app/api/iran-progress/route.ts`는 공개 저장자료만 조회함 |

**원칙:** 표시용 뉴스와 점수 산출 근거는 분리한다. 기존 R3/R5 뉴스 원장·사건·체크포인트를 30일 만료라는 이유로 삭제하지 않는다.

## 2. 작업 6단계

### ① 운영·참조 관계 확인

1. 최신 main, 본 브랜치, 실제 PC 승인 SHA, E: 운영 저장 경로를 각각 확인한다.
2. R3/R5 수집·저장·점수·게시·checkpoint의 참조 관계를 읽기 전용으로 검사한다.
3. 표시 전용 삭제 가능 대상과 절대 삭제 금지 대상을 키/파일 기준으로 문서화한다.

**통과:** 기존 점수 재현에 필요한 기록·checkpoint를 하나도 만료 처리하지 않음.

### ② 뉴스 출처 및 이용권 O/X 검증

1. 기존 GDELT 및 승인된 R3 RSS부터 실제 수집 가능성을 확인한다. 추가 API는 우선 사용하지 않는다.
2. 소스별 **무료 사용 / 상업 이용 / 제목 재공개 / 직접 작성 요약 공개 / PC 저장 30일 / 원문 링크·출처 표기** 각각 O/X/확인 필요 표를 만든다. 공식 약관 URL과 확인 날짜를 남긴다.
3. GDELT의 `seendate`는 최초 발견일이지 기사 발표일이 아니므로 `publishedAt`으로 대체하지 않는다.
4. 권리 불명확한 BBC·알자지라 등 기존 수집 대상은 기존 R3 점수용 수집과 분리하여 **표시 후보에서 보류**한다. 기사 전문·사진은 재게시하지 않는다.

**통과:** 출처별 이용권과 실제 발행일을 확인한 자료만 공개 후보에 포함. 후보가 0건이어도 임의 기사 생성 금지.

### ③ 기사 표시 전용 가공·검증

1. R3 점수 변동이나 사건 점수를 역산하여 뉴스를 생성하지 않는다. 허용된 기사 메타데이터만 별도 변환한다.
2. UI 계약 `id, source, publishedAt, title, summary, impact, sourceUrl` 유지; 내부에는 `collectedAt`, 검증·권리 근거 및 원본 참조 ID를 별도로 보관한다.
3. HTTPS 원문 URL, 발행일, 출처, 허용된 자체 작성 요약, 이란 관련성, 중복 URL을 검증한다.
4. `impact`: 긍정=종전/휴전 진전, 부정=확전/악화, 중립=판단 불명확. 점수 변동·기사 감정으로 분류하지 않는다.
5. 동일 기사의 중복만 제거하고, 다른 매체의 독립 보도는 사실 확인 없이 강제 합치지 않는다.

**통과:** 잘못된 날짜/미래 날짜/유효하지 않은 URL/저작권 미확인 항목이 공개 목록에 들어가지 않음.

### ④ PC 30일 보관과 자동 삭제

1. 기존 이란 PC 데이터 디렉터리 내 **뉴스 표시 전용 경량 파일 캐시**를 우선 검토한다. 신규 DB 테이블·SQLite TTL·기존 원장 DELETE 없이 구현할 수 있는지 확인한다.
2. **KST 날짜 기준 기준일 포함 30개 날짜**를 보관한다. 예: 10/26 실행 시 9/27~10/26만 보관. 재수집일이 바뀌어도 발표일 만료를 연장하지 않는다.
3. 기존 승인된 PC 수집/게시 사이클에만 정리 처리를 추가한다. 새 스케줄러, Cloudflare Cron, 원격 계산 작업 금지.
4. 대상·참조·경로·복구 가능성을 먼저 검증하고 `dry-run`에서 후보를 확인한 뒤 **표시 전용 파일만** 원자적으로 정리한다. 기존 R3 DB·checkpoint·점수 기록과 E: junction 손대지 않는다.
5. 로그에는 기준일, 전/후 건수, 만료/삭제/보류 건수, 처리 오류만 기록한다. 원문·키·개인정보 저장 금지.
6. 실패하거나 PC가 꺼져도 공개 API는 **현재 조회 시각 14일 필터**로 만료 기사의 재등장을 막는다. 캐시 실패가 기존 R3 점수 게시를 중단시키지 않도록 분리한다.

**통과:** 31일 이전 표시 전용 기록은 제외/삭제, 기존 원장 및 최근 30일 자료 보존, 반복 실행도 동일 결과.

### ⑤ 공개 저장·API·이란 뉴스 카드 연결

1. 캐시에서 최근 **14개 KST 날짜**의 유효 기사만 최신순으로 읽어 뉴스 전용 공개 payload를 구성한다. 개수는 고정하지 않는다.
2. 기존 D1 `market_public_snapshots_v1`의 별도 뉴스 키(후보 `public:iran-progress:news:iran:r1`)로 게시하고 **write/read-back 일치** 확인. 기존 점수 공개 키와 충돌 금지.
3. 저장된 공개 뉴스만 읽는 API(경로 후보 `/api/outbreak-news/iran`)를 만든다. Worker/API 단계에서도 이용권·14일 기간·payload 유효성을 재검사한다. 서버에서 기사 API 직접 호출 금지.
4. `app/outbreak-beginner-iran-r54.tsx`에서 데이터 조회 후 기존 `OutbreakNewsUI`의 `items`에 전달한다. 뉴스 건수/필터/출처/날짜/링크/반응형 디자인 유지.
5. **정상 0건 / 수집 지연 / API 오류** 상태를 혼동하지 않는다. 날짜 누락·허위 요약·가공 점수는 채워 넣지 않는다.

**통과:** 실제 뉴스 연결, 14일 만료 숨김, 긍정/부정 필터 동기화, D1/API/UI 결과 건수 일치.

### ⑥ 검증·전환

- 테스트: 14·15일/30·31일 경계, KST 자정, 월말, 중복, 미확인 날짜, 원문 링크, source 실패, 캐시 재시도, dry-run과 실제 대상 일치.
- 보존 회귀: 기존 SQLite 원장·checkpoint의 참조 무결성, R3/R5 점수·이력, 기존 6시간 작업 주기, 금리 심리·기타 이벤트/UI 불변.
- 단계 검증: **PC 수집 → 전용 캐시 read-back → 허용된 D1 게시/read-back → 저장형 API → 웹·모바일 14일 표시**.
- 운영 PC는 승인 source/launcher를 먼저 확인하고 최신 개발 main이라는 이유만으로 덮어쓰지 않는다.
- PR/CI 후 허용된 코드만 main에 반영하고 Cloudflare Git Integration의 exact deployment SHA 및 Runtime/D1/API/실제 UI를 각각 검증한다. direct Wrangler Production deploy, Sites 배포, DNS 변경 금지.
- 수집·삭제·게시·사이트 표시가 모두 검증되기 전 완료/PASS를 주장하지 않는다.

## 3. 구현 예정 파일 (확정 전 후보)

| 용도 | 파일 |
| --- | --- |
| PC 표시 계층·30일 삭제 | `scripts/iran-progress/news-display-r1.mjs`, `scripts/iran-progress/news-display-io-r1.mjs` |
| D1 뉴스 전용 게시 | `scripts/iran-progress/news-display-publication-r1.mjs`, `scripts/iran-progress/news-display-publish-once-r4.mjs` |
| payload·14일 검증 | `lib/iran-progress/news-display-r1.mjs` |
| 저장형 GET | `worker/iran-news-display-public-r1.mjs`, `app/api/outbreak-news/iran/route.ts` |
| 기존 뉴스 UI 연결 | `app/outbreak-beginner-iran-r54.tsx`, `app/outbreak-news-r57.tsx` |
| GOV.UK 후보 발견(읽기 전용) | `scripts/iran-progress/news-display-discover-r1.mjs` |
| PC 독립 정리/게시 실행기 | `scripts/iran-progress/news-display-maintenance-r1.mjs` |
| PC 확인용 CMD | `scripts/iran-progress/IRAN_NEWS_R1_READONLY_CHECK.cmd`, `scripts/iran-progress/IRAN_NEWS_R2_PREFLIGHT.cmd`, `scripts/iran-progress/IRAN_NEWS_R3_APPLY.cmd`, `scripts/iran-progress/IRAN_NEWS_R4_D1_PUBLISH.cmd` |
| 자동 테스트 | `tests/iran-news-display-r1.test.mjs` |

기존 수집기·runner·게시기 변경은 승인 경로에서 **필요한 최소 범위**로만 적용한다. 새 파일명과 전용 키는 후보이며 실제 참조 관계 검사 후 확정한다.

최초 GOV.UK 기사 검토 근거와 PC R2 실행 절차: `docs/OUTBREAK_IRAN_NEWS_GOVUK_PILOT_RIGHTS_R2.md`. 추가 표시용 매체는 현 단계에서 도입하지 않는다. 점수용 기존 6개 기관·7개 피드는 그대로 유지한다.

## 4. 이번 요청의 완료 기준

- [x] 14일 표시/30일 PC 표시용 자동 삭제/원장 보존 정책을 6단계 개발 계획으로 구체화
- [x] 기존 수집·저장·배포 소스에서 수정 후보와 필수 검증 Gate 정리
- [x] 뉴스 전용 캐시·만료 필터·D1 게시 함수·읽기 전용 API·UI 연결의 **독립 코드** 구현
- [x] GOV.UK Atom의 수정일·공식 Content API 최초 발행일 분리 수집 구현(기사별 표시권리 미승인 유지)
- [x] 14/30일 경계·피드 발견·권리 차단·캐시·D1/API 단위 테스트 13개 PASS
- [x] 사용자 Windows PC의 GOV.UK 읽기 전용 조사 결과 확인: 피드 20건, Content API 20/20 성공, 30일 후보 16건, 14일 내 7건. 실제 적용/게시 없음. 상세: `docs/OUTBREAK_IRAN_NEWS_PC_LOG_REVIEW_R1_20261026.md`
- [x] GOV.UK 첫 기사 1건의 텍스트 이용권 범위·사실 관계·한국어 자체 요약·중립 분류 검토. **개별 검토만 승인, 전체 GOV.UK 기사 자동 승인 아님.**
- [x] 권리 검증 입력 수용 및 Windows R2 읽기 전용 dry-run CMD 실행·실제 PC 로그 PASS: `FINAL_STATUS=PASS_READ_ONLY_REVIEWED`, `received=1,accepted=1,after=1,written=false`.
- [x] R2 결과 Gate를 포함한 Windows R3 첫 승인 기사 전용 캐시 apply/read-back CMD 구현·브랜치 저장. **PC 실제 실행 및 캐시 기록은 아직 대기.**
- [ ] 기존 PC runner에 표시 전용 수집/정리/게시 연결(운영 환경 점검 선행)
- [x] PC 표시 전용 캐시 최초 승인 기사 1건 적용/read-back: 2026-10-27 R3 로그 `PASS_PC_CACHE_APPLIED_NOT_PUBLISHED`.
- [ ] 기존 승인 runner에 향후 기사 검토 및 30일 정리 연결(새 스케줄러 없음)
- [x] 뉴스 D1 게시·read-back: 2026-10-27 R4B PC 로그 `PASS_D1_NEWS_ONLY_PUBLISHED`, `D1_PREFLIGHT_GATE=PASS`, `D1_PUBLISH_READBACK=PASS`, `itemCount=1`, `scoreLedgerChanged=false`
- [x] 뉴스 공개 API/UI 및 Cloudflare Git 배포: PR #794 병합, `main` 배포 커밋 `41d96e979e514a937a813d273466a7ac547622a5`, Cloudflare 공식 Build 성공, API/UI 실제 1건 및 이란 7.1점 유지 확인.

**진행 이력:** 최초에는 계획서만 저장했다. 2026-10-26 현재 독립 구현 파일과 UI/API 연결 코드가 브랜치에 추가되었다. 그러나 기사별 검증과 자체 요약·영향 분류, PC 원본 수집기와의 런타임 연결, PC 실제 30일 정리 실행, D1 실제 게시, PR/main 반영, Cloudflare 배포는 **미실시**다. 13개 테스트 PASS는 단위 테스트 결과이지 운영 PASS가 아니다.

## 5. 운영 PC 첫 확인 절차 (읽기 전용 실행 확인)

- 승인된 PC의 실제 소스 SHA와 이란 운영 홈(`ZGMINI_IRAN_HOME`)을 먼저 확인한다. 작업 브랜치가 그 PC에 반영되지 않았다면 운영 스케줄러나 기존 코드를 덮어쓰지 않는다.
- 새로 추가한 `scripts/iran-progress/IRAN_NEWS_R1_READONLY_CHECK.cmd`는 **읽기 전용** GOV.UK Atom 피드 및 공식 Content API 최초 발행일 조회와 **dry-run** 30일 정리 미리보기만 실행한다. `--apply`·`--publish` 및 점수 원장 변경 없음.
- 결과는 CMD 파일 옆의 `IRAN_NEWS_R1_RESULT.txt` 한 개 TXT 파일에 기록한다. 다운로드한 CMD 한 개만으로 실행되도록 필요한 읽기 전용 모듈을 GitHub의 고정 커밋에서 별도 경량 폴더에 받는다. 임시 폴더 및 E: 새 대용량 저장소를 만들지 않는다.
- 첫 결과를 통해 피드 HTTP·원본 발행 시각·GOV.UK 개별 권리 검증 대상·30일 만료 대상·운영 경로를 확인한 뒤에만 실제 저장/게시 및 기존 PC 실행 경로와의 연결을 검토한다.
- 로컬 Node 단위 테스트는 13/13 PASS, **Windows 읽기 전용 CMD는 사용자 제출 로그로 PASS**. 하지만 실 PC 캐시 쓰기·만료 삭제, 개별 기사 이용권 판정, D1/Cloudflare 공개 검증은 아직 PASS가 아니다. 2026-10-26 재실행 로그에서 피드 20건·Content API 20/20 성공·30일 후보 16건을 확인했으며, 14일 창 후보 7건 중 직접 관련 2건·배경/영향 2건·부적합 3건을 예비 판별했다. 관련성 분류는 자동 게재 허가가 아니다.

## 6. 2026-10-26 PC R2 검증 이후 진행

- 사용자 첨부 `IRAN_NEWS_R2_PREFLIGHT_RESULT.txt`: GOV.UK 최초 발행일 확인 20/20 API 오류 0, 최근 30일 후보 16, R13 작업 `TASK_QUERY_EXIT=0`, Reviewed 1/1, `FINAL_STATUS=PASS_READ_ONLY_REVIEWED`.
- 실제 최초 캐시 파일은 아직 없음(읽기 전용 확인만 통과). `IRAN_NEWS_R3_APPLY.cmd`에서 R2 로그·기존 R13 작업·운영 DB 표식·기존 뉴스 캐시 부재·dry-run 예상 건수 일치 조건으로 최초 `news-display-r1.json`만 생성하고 다시 읽어 검증한다.
- D1 별도 뉴스 키 게시, 기존 runner 자동 연계, 필요한 변경의 PR/main 반영과 Cloudflare Git 배포는 R3 PC 결과 검증 이후 추진한다. 기존 R3/R5 점수, 원장, 스케줄러 불변.

## 7. 2026-10-27 R3 PC 캐시 적용 검증 및 R4 단계

- 사용자 PC 로그 R3: `R2_GATE=PASS`, `TASK_QUERY_EXIT=0`, `CACHE_ABSENT=PASS`, `DRY_RUN_GATE=PASS`, `written=true`, `visibleCount=1`, `NEWS_CACHE_READBACK=PASS`, `FINAL_STATUS=PASS_PC_CACHE_APPLIED_NOT_PUBLISHED`.
- R3는 뉴스 전용 JSON 캐시 최초 1회 저장 성공이며 D1 게시·사이트 공개는 여전히 미실행이다. 기존 R3/R5 점수 원장·스케줄러는 유지했다.
- 브랜치에 `news-display-publish-once-r4.mjs`와 2건의 원격 모의 테스트를 추가했다. 기존 13건+R4 2건 **총 15/15 PASS**. 새 게시기는 정확한 승인 기사 1건, 14일 노출 범위, 기존 뉴스 전용 D1 키 부재를 검증한 다음 **그 키만** 1회 게시하고 read-back 한다.
- 사용자용 `IRAN_NEWS_R4_D1_PUBLISH.cmd`에는 R3 결과 Gate, D1 read-only preflight, 안전한 게시·원격 재검증과 불확실한 쓰기 결과 재실행 금지를 구현했다. 실제 D1 변경은 사용자의 PC 실행 전까지 미실시.

## 8. 2026-10-27 R4B 원격 뉴스 단독 게시 PASS

- R4 최초 CMD는 같은 폴더에 위치할 것을 요구한 과거 R3 TXT 확인 게이트에서 중단: `STOP_NO_D1_WRITE_ATTEMPTED`.
- R4B는 지난 TXT 위치 의존을 제거하고 승인된 운영 PC 표시용 캐시 기사 1건의 내용·원 발행일·중립 분류·14일 범위를 직접 검사한다.
- 사용자 제출 `IRAN_NEWS_R4B_D1_PUBLISH_RESULT.txt`: `R3_LOG=FOUND_OPTIONAL`, `D1_PREFLIGHT_GATE=PASS`, `remoteKey=ABSENT`, `itemCount=1`, `publication=VERIFIED`, `D1_PUBLISH_READBACK=PASS`, `FINAL_STATUS=PASS_D1_NEWS_ONLY_PUBLISHED`.
- 쓰기 대상은 오직 `public:iran-progress:news:iran:r1` 뉴스 전용 D1 행 1건이다. 이는 실제 D1 저장·read-back PASS이며 공개 API/프런트 배포 또는 6시간 자동 운영 PASS는 아니다.
- 다음 Gate: 기존 브랜치의 뉴스 API·UI·검증·운영 도구 변경만 `main`과 비교·PR 검증 후 회수한다. 최신 main SHA에 연결된 Cloudflare Workers Builds 체크, 배포 SHA 및 공개 API/UI를 각각 확인한다.

## 9. 2026-10-27 첫 뉴스 실제 공개 및 R13 후속 검증

- PR [#794](https://github.com/ansqhd5774-Choi/zgmini/pull/794)를 기존 단일 작업 브랜치에서 생성해 CI `check`/`ui` PASS 후 squash 병합했다. 신규 브랜치는 생성하지 않았다.
- 병합된 `main` 커밋: `41d96e979e514a937a813d273466a7ac547622a5`. 공식 Cloudflare Git Integration `Workers Builds: zgmini-migration-candidate-r5` 성공, 같은 커밋의 `check`/`verify`/`notify` 성공을 검증했다.
- 실서비스 `https://zgmini.kr/api/outbreak-news/iran`: `status=READY`, `itemCount=1`, `source=GOV.UK`, `displayDays=14`, 기사 날짜 `2026-10-23`. 화면 `https://zgmini.kr/outbreak/?event=iran`의 주요 뉴스 1건, 자체 요약·원문 링크·OGL 표시가 정상이며 기존 종전 진전도 7.1 및 14일 차트는 유지됐다.
- **운영 범위 정확히 분리:** 첫 승인 기사 1건의 전용 D1 게시·웹 노출 성공은 정기적인 GOV.UK 수집·검토·30일 캐시 정리의 자동 운영 검증과 다르다. GOV.UK 신규 기사 자동 게시 및 추가 뉴스 매체 편입은 승인하지 않았다.
- R13 연결 전 운영 PC 실제 `schtasks` 액션·전용 캐시·원장 존재를 안전하게 확인하도록 `scripts/iran-progress/news-display-runner-audit-r5.mjs`과 `scripts/iran-progress/IRAN_NEWS_R5_RUNNER_READONLY.cmd`를 **같은 기존 브랜치**에 추가했다. CMD는 옆에 `IRAN_NEWS_R5_RUNNER_READONLY_RESULT.txt`를 생성하고 조사 보조 파일을 제거한다. R13 작업·캐시·SQLite·D1에는 쓰지 않는다.
- 다음 Gate: 사용자 PC R5 TXT 결과에서 실제 R13 액션 체인과 표시용 캐시 경로를 확인한 다음에만 기존 6시간 실행 경로에 정리 처리를 최소 범위로 연결한다. 연결 전 자동 운영 완료라고 보고하지 않는다.

## 10. 2026-10-27 R5 Windows 실행 현황 및 R6 실행경로 실측 준비

- 사용자 R5 로그 `IRAN_NEWS_R5_RUNNER_READONLY_RESULT.txt`: `PASS_RUNNER_READ_ONLY_INVENTORY`, `taskName=ZGMINI-PC-Iran-Progress-R13`, 작업 Action은 `wscript.exe`로 확인. 이는 VBS 중간 실행기이므로 `referencesR3Wrapper=false`만으로 R3가 미실행이라고 단정하지 않는다.
- 뉴스 표시 캐시: 1건, 30일 이내 1건, 만료 0건, 날짜 오류 0건, 기존 `iran.sqlite` 존재·미수정. 30일 자동 유지관리의 스케줄 연결은 여전히 미확인이다.
- 저장소의 기존 `scripts/iran-progress/install.mjs`는 R13 실행에 `wscript.exe`+ `run.vbs`를 사용하는 구조다. `install-reference-flow.mjs` 또한 `run.vbs` 또는 `run-articles.vbs`에 Node runner를 연결한다. 다만 실제 PC VBS 내용/실행파일 SHA는 이번 R5 조사 대상이 아니었으므로 추정하여 덮어쓰지 않는다.
- `scripts/iran-progress/news-display-chain-audit-r6.mjs` 및 `scripts/iran-progress/IRAN_NEWS_R6_CHAIN_READONLY.cmd`를 기존 단일 작업 브랜치에 추가. R13 XML → VBS 런처 → Node runner를 **읽기 전용으로만** 따라가 파일 이름·SHA-256·Git HEAD(가능할 때)·기존 4회 실행 시각을 요약하고, 내용·실행 인자·절대 경로·비밀은 로그로 내보내지 않는다.
- 다음 Gate: 사용자 PC `IRAN_NEWS_R6_CHAIN_READONLY_RESULT.txt`에서 실제 runner를 확인한 후, 기존 원장/산식·6시간 주기는 그대로 두고 표시 캐시 정리 hook만 분리·격리한다. 신규 기사 자동 공개는 개별 권리/요약 검토 승인 전까지 차단한다.

## 11. 2026-10-27 R6 파서 중단 및 R6B 수정

- 사용자 R6 로그: `STOP_RUNNER_CHAIN_READ_ONLY`, `reason=LAUNCHER_SCRIPT_AMBIGUOUS`. 이 오류는 R6 조사기가 VBS 내 `.mjs` 경로 **단 1개만** 허용한 자체 판별 가정의 한계이며, 작업 스케줄러나 수집기 실패를 증명하지 않는다. R6 스크립트는 실행 경로를 읽은 후 더 이상 수정하지 않았다.
- R3 wrapper는 실행 대상 외에 `--legacy-runner`, `--collector`의 별도 `.mjs` 경로를 인수로 받을 수 있다. 수정된 `parseLauncherScript`는 정확히 한 번의 `shell.Run`에서 Node 실행 파일 확인 후 **첫 `.mjs`를 진입점**, 뒤따른 파일을 인수 참조로 구분한다.
- 중복 `shell.Run`, Node 실행 파일 부재, 비승인 launcher/실행기, 경로 실체 불일치는 계속 보류한다. synthetic VBS + 2개 인수, 실패 차단, UTF-16 스케줄러 XML·4회 실행 시각 테스트 3/3 PASS.
- 기존 단일 브랜치에 `tests/iran-news-display-chain-r6.test.mjs` 및 `scripts/iran-progress/IRAN_NEWS_R6B_CHAIN_READONLY.cmd` 추가. R6B는 고정 커밋의 검증기만 다운로드하여 실행한 뒤 임시 보조 파일을 삭제하며 결과 TXT는 CMD 옆에 기록한다.
- 운영 R13 task, VBS, PC cache, R3/R5 ledger, D1, 웹 공개 기능은 모두 미수정. 다음 Gate는 사용자 `IRAN_NEWS_R6B_CHAIN_READONLY_RESULT.txt` 확인이다.

## 12. 2026-10-27 R6B 실제 운영 체인 PASS / R7 보수적 설치 준비

- 사용자 PC `IRAN_NEWS_R6B_CHAIN_READONLY_RESULT.txt`: `FINAL_STATUS=PASS_R6B_CHAIN_READ_ONLY`. 실제 기존 작업은 `ZGMINI-PC-Iran-Progress-R13`, `wscript.exe`, 00/06/12/18(한국시간), `run-articles.vbs` SHA-256 `a26e561964a5d4b88a02f81185221c1d3d770541c2cc12d6ceca5898e2228846`로 확인.
- VBS 첫 Node 진입점 `run-reference-flow-r3.mjs`, PC 실제 원본 SHA-256 `cbeff8d254504780c3446bdc7f43484a87306e2163b3687784a10f5b85a4c3b6`, PC Git HEAD `bc7bd6781d1f4083009f1709a3f2e82461c5bfb9`. 원본에 `operate-r3.mjs` 참조는 있고 `news-display-maintenance-r1.mjs` 참조는 없었다. 실제 R13 자동 실행 체인에 뉴스 30일 캐시 유지관리가 아직 연결되지 않은 상태임을 확정.
- GitHub 원본은 LF, 현재 PC Node 원본은 CRLF여서 텍스트 동일해도 SHA-256이 달랐다. 신규 검증기는 **PC 실제 CRLF 원본 SHA를 먼저 검증**한 뒤 비교하는 텍스트 부분만 LF로 정규화하며, 백업 파일은 PC 원본 바이트 그대로 보존한다.
- 지정된 단일 작업 브랜치 `codex/outbreak-iran-news-retention-r1-20261026`에서 기존 Node wrapper **말미에만** 뉴스 캐시 30일 정리 hook 추가. 순서 `R3 → 선택적 R5 → 기존 collector/legacy → 뉴스 캐시 30일 정리`; 뉴스 보조 작업 실패는 R3/R5/legacy의 기존 종료 상태를 바꾸지 않는다. 새 뉴스 자동 수집·D1 게시를 활성화하지 않는다.
- `news-display-install-hook-r7.mjs`는 등록 작업 XML, VBS, PC 실제 CRLF SHA, PC HEAD, SQLite 표식, 뉴스 캐시, 원본과 비교한 정확히 한 블록의 변경, 필수 모듈의 기존 파일 충돌 여부, 백업 경로 부재를 읽기 전용으로 검사한다. 모든 조건 PASS 시에만 별도 승인 환경값을 사용해 새 표시용 모듈 및 승인된 기존 Node wrapper 하나를 설치한다. 기존 wrapper의 원본 바이트는 `.before-iran-news-r7`로 백업하고 신규 파일을 read-back한다.
- 사용자용 `IRAN_NEWS_R7_INSTALL.cmd`는 고정 GitHub 커밋 `4b7667c13f84b362b5144037b7fd5d94de7044a2`의 작은 모듈을 CMD 옆 전용 디렉터리에 가져오고, read-only preflight PASS 후 **딱 1회** 설치를 시도한다. TXT는 CMD 옆 `IRAN_NEWS_R7_INSTALL_RESULT.txt`. 불확실 결과면 자동 재시도 금지.
- R1/R4/R6/R7 테스트 묶음 PASS(총 4개 테스트 파일). **R7의 실제 PC 설치는 사용자 CMD 로그 회신 전까지 미실시**. R7 설치 결과를 검증한 뒤 다음 정상 R13 6시간 주기의 실행과 30일 캐시 갱신을 별도 확인해야 운영 자동화 PASS로 판정. 스케줄러/VBS/점수 산식·원장/데이터베이스/D1/사이트 디자인은 미수정.

## 13. 2026-10-27 R7 PC 설치 PASS / R8 다음 6시간 실행 확인 대기

- 사용자 제출 `IRAN_NEWS_R7_INSTALL_RESULT.txt`: `PASS_R7_NEWS_ONLY_PREFLIGHT`, `READ_ONLY_PREFLIGHT_GATE=PASS`, `PASS_R7_NEWS_ONLY_HOOK_INSTALLED`, `R7_INSTALL_READBACK_GATE=PASS`, `FINAL_STATUS=PASS_R7_NEWS_RETENTION_HOOK_INSTALLED`.
- 원본 PC R3 wrapper SHA-256 `cbeff8d254504780c3446bdc7f43484a87306e2163b3687784a10f5b85a4c3b6`; 새 wrapper SHA-256 `438ac0ad3f5073fbecc0e785c6f8fee19042d6fc8638ece9ef1e5198dd4c1b69`. 승인된 기존 점수 흐름 유지 계약 PASS, 기존 실행기 원본 백업 read-back PASS, 표시용 새 모듈 정확히 5개 생성.
- 설치 중 표시 캐시 read-only dry-run PASS. 설치 보고상 스케줄러/VBS/점수 원장/D1 변경 없음. 기존 자동 게시용 D1 호출이나 신규 기사 자동 검토·승인도 추가하지 않았다.
- 중요한 구분: 이는 **로컬 설치 PASS**이며 정상 R13 6시간 실행 이후 캐시 정리 hook이 실제로 동작했다는 증거는 아직 아니다.
- 동일 브랜치에 `news-display-scheduled-verify-r8.mjs`, `IRAN_NEWS_R8_SCHEDULE_VERIFY.cmd`, `tests/iran-news-scheduled-verify-r8.test.mjs` 추가. R8은 기존 R13 XML·VBS SHA·승인 후 wrapper SHA·원본 백업 SHA·스케줄러 마지막 실행 기록/결과·뉴스 캐시 `updatedAt`과 설치된 wrapper 파일 수정 시각을 **읽기 전용**으로 교차 확인한다.
- 한국어 오전/오후 및 영어 AM/PM 스케줄러 시간, 인용 부호가 포함된 CSV, 정상 성공/다음 실행 전 대기/실패 분기 시험 PASS. 전체 R1/R4/R6/R7/R8 테스트 파일 5개 실행 PASS.
- 다음 Gate: **다음 정상 R13 실행이 끝난 이후** 사용자 PC에서 R8 CMD 1회 실행, 같은 위치의 `IRAN_NEWS_R8_SCHEDULE_VERIFY_RESULT.txt` 확인. `PASS_R8_NEXT_SCHEDULE_CACHE_REFRESH`와 후속 검증을 통과한 경우에만 최초 GOV.UK 뉴스용 30일 캐시 자동 유지관리 검증 완료로 판정한다. 이전 승인 GOV.UK 기사 외 신규 뉴스 자동 수집·게시 기능은 여전히 미승인.

## 14. 2026-10-27 R8 실제 PC 읽기 전용 결과: 아직 자동 실행 PASS 아님

- 사용자 `IRAN_NEWS_R8_SCHEDULE_VERIFY_RESULT.txt`: 새 wrapper·원본 백업·VBS·기존 SQLite 표식 검증 PASS. 단, `status=NEEDS_REVIEW_R8_TASK_LAST_RUN_UNPARSEABLE`, `cacheUpdatedAfterRunnerInstall=false`, `taskRanAfterRunnerInstall=false`, `taskLastResult=1`, `cacheUpdateKst=2026-10-27 00:01:44`. 이는 **R7 설치 자체가 실패했다는 뜻은 아니나**, 설치 이후 R13 정상 실행과 뉴스 캐시 자동 갱신을 입증하지 못한다.
- 마지막 결과코드 `1`은 태스크/기존 점수 작업의 오류 가능성을 의미하나, 마지막 실행 시각을 읽지 못했으므로 R7 설치 전후 어느 회차의 결과인지 구분 불가. 신규 뉴스 보조 작업의 종료값은 기존 R3/R5/legacy 점수 종료코드에 영향을 주지 않도록 설계되어 있어, `1`만으로 뉴스 hook이 원인이라고 판정하지 않는다.
- 원인은 우선 작업 스케줄러 `/V /FO CSV`의 마지막 실행 시각에 대한 지역화 형식/인코딩 식별 실패. 추가 저장소/점수/스케줄러 수정 없이 `news-display-time-probe-r8b.mjs` 및 `IRAN_NEWS_R8B_TIME_DIAG.cmd`를 기존 단일 브랜치에 추가. 출력은 해당 필드의 제한된 문자/코드포인트, 태스크 최종 결과, runner 설치 시각, 캐시 갱신 시각만 허용하며 명령 인자·계정·경로·기사 내용은 배제.
- 다음 Gate: 사용자 PC R8B 읽기 전용 TXT로 지역화 시간 형식과 R7 설치 전후 실제 마지막 실행 여부를 분리. 이후 필요한 경우에만 R8 시간 해석기 보완 또는 기존 R13 회차 로그 자체의 읽기 전용 원인 조사. 무조건 R8 재실행하거나 R3/R5 산식·스케줄러를 변경하지 않는다.


## 15. 2026-10-27 R8B 실 PC 실행 시각 확인 및 R8 판별 오류 수정 — PASS

- 사용자 제출 `IRAN_NEWS_R8B_TIME_DIAG_RESULT.txt`: `FINAL_STATUS=PASS_R8B_TASK_TIME_READ_ONLY`, 원본 스케줄러 마지막 실행 시각 `2026-10-27-화 오후 12:00:01`(KST), 마지막 실행 결과 `0`, 설치된 wrapper 시각 `2026-10-27 03:17:15`, 뉴스 표시 캐시 갱신 `2026-10-27 12:01:13`, 관찰 시각 `2026-10-27 14:06:45`(모두 KST).
- R8 최초 `LAST_RUN_TIME_NOT_PARSED`는 정상 예약 실행이 없다는 증거가 아니라 한국어 `-화` 요일이 끼어든 **Windows `schtasks /V /FO CSV` 시각 형식 미지원**에 따른 검증기 오탐으로 확정. 최초 R8의 마지막 결과 `1`과 설치 전 캐시 시각은 **이전 회차 관찰값**으로 처리하고 R7 훅 실패로 귀속하지 않는다.
- R8 검증기에서 실제 확인된 한국어 요일 포함 형식(정오/자정 포함)을 처리하도록 파서만 수정. 테스트에 R8B 실제 타임스탬프 `03:17:15 → 12:00:01 → 12:01:13` 및 `taskLastResult=0`을 넣어 기존 `evaluateR8Timing` 게이트가 `PASS_R8_NEXT_NORMAL_R13_NEWS_CACHE_REFRESH`로 판정함을 확인. 기존 R1/R4/R6/R7/R8 전체 테스트 파일 5/5 PASS.
- **운영 판단:** R7 설치 이후 12:00 기존 R13 예약 회차가 결과코드 0으로 끝났으며, 약 72초 후 표시 전용 캐시가 갱신됨. 따라서 **기존 예약 체인에 연결된 뉴스 표시 전용 캐시 갱신의 정상 회차 1회**를 검증했다. 30일 초과 기사 실제 삭제는 캐시가 1건뿐이므로 아직 관찰되지 않았으며, 30일 경계·만료 처리의 단위 테스트 증거와 구별한다.
- 작업 범위: 기존 단일 브랜치의 검증 파서·테스트·이 계획서만 수정. **운영 PC R13 작업/VBS/점수 산식·SQLite 원장·뉴스 캐시·D1/Cloudflare 미변경**. 새로운 GOV.UK 기사 자동 수집·검토·게재는 승인되지 않았고 첫 승인 뉴스 1건만 공개 상태를 유지한다. 이번 결과를 위해 추가 CMD 실행은 요구하지 않는다.


## 16. 2026-10-27 사용자 신규 주요 뉴스 4개 키워드 OR 노출 조건

- 사용자 승인 키워드: **이란 / 사우디 / 예맨(통상 표기 예멘) / 후티**. 4개 가운데 **하나라도** 제목·설명·본문에서 일치하면 표시 검토 후보로 채택한다(OR). 영문 GOV.UK의 동등한 표현 `Iran/Iranian`, `Saudi`, `Yemen/Yemeni`, `Houthi/Houthis`와 한국어 표기를 대응한다. 그 외 기존 `Tehran/IRGC/Hormuz`만 일치하는 기사는 이 4개 기준의 독립 키워드 통과로 취급하지 않는다.
- 기존 GOV.UK Atom `keywords=Iran` 단일 검색으로는 다른 세 주제만 언급된 기사를 발견할 수 없으므로, **기존 같은 GOV.UK 공식 검색 엔드포인트**에 `Iran`, `Saudi`, `Yemen`, `Houthi`를 각각 질의한다. 4개 결과를 기사 URL 기준 합집합(중복 1개)으로 만든 뒤, GOV.UK Content API `first_published_at` 및 30일 창/본문 OR 키워드 게이트를 적용한다.
- 4개 피드 가운데 일부만 실패하면 `PARTIAL_REVIEW_REQUIRED`와 `feedFailed`를 반환하며 성공으로 위장하지 않는다. 모두 실패하면 기존 `NEWS_DISCOVERY_SOURCE_FAILED`를 유지한다. 외부 출처 신규 허가·API/DB/스케줄러·기존 R3/R5 점수 산식 변경 없음.
- 이 변경은 **후보 발견/키워드 선택 코드**를 수정한 것이다. 이용권 검증(`rightsVerified`)과 개별 기사 자체 요약·영향 분류 및 별도 D1 뉴스 게시 게이트는 유지한다. 사용자의 키워드 1개 이상이라는 조건만으로 권리가 미확인된 타사 기사까지 자동 게재하지 않는다. 현재 R7 예약 훅은 30일 캐시 정리만 수행하므로 4개 검색 수집·일괄 게재가 운영 PC/사이트에 자동 적용됐다고 보고하지 않는다.
- `tests/iran-news-display-r1.test.mjs`에 4개 OR 매칭·영한 표기·4개 검색·URL 중복 제거·부분 실패·비승인 차단을 추가. 기존 R1/R4/R6/R7/R8 총 5개 테스트 파일 **5/5 PASS**.
- 다음 Gate: 실제 PC GOV.UK 4개 검색 응답·후보 건수 read-only 검증 후, 이용권 확인 가능한 개별 기사만 표시용 캐시와 D1에 넣는 공개 절차를 별도 검증한다. 새로운 기사 자동 수집·자동 게시를 운영 단계에 연결하거나 기존 6시간 작업/점수 흐름을 바꾸는 것은 이번 소스 변경에 포함하지 않는다.

## 17. 2026-10-27 자동 게시 착수 — R9 실 PC 읽기 전용 사전검증

- 사용자 게시 대상: 이란·사우디·예맨(예멘)·후티 중 **한 개 이상** 포함하는 기사(OR). 영어 공식 자료에서는 Iran / Saudi / Yemen / Houthi와 해당 일상 변형을 사용한다. 매칭은 기사 제목·설명·원문에 적용하고, 키워드와 관계없는 주관적 호오 판단으로 자동 제외하지 않는다.
- 기존 R13 00/06/12/18 KST 주기, R3/R5 점수 계산·원장, 30일 표시 캐시 정리 hook은 현 단계에서 변경하지 않는다.
- `news-display-auto-preflight-r9.mjs`는 4개 GOV.UK Atom 피드와 각 첫 기사 공식 Content API의 `first_published_at`, 사용자 PC의 Ollama `/api/tags`를 읽기 전용으로 조회한다. 추측한 기사 발행일이나 존재하지 않는 모델은 사용하지 않는다.
- `IRAN_NEWS_R9_AUTO_PREFLIGHT.cmd`는 코드 SHA `7c2ba05ca8217c0be93966553c10a30ede733af2`에서 검증 모듈 4개를 내려받아 현재 CMD와 같은 폴더에 `IRAN_NEWS_R9_AUTO_PREFLIGHT_RESULT.txt`를 생성한다. CMD는 ASCII+CRLF이며 다운로드 보조 파일만 정리한다. 운영 SQLite·캐시·예약 작업·D1·사이트를 변경하지 않는다.
- R9 단위 테스트와 기존 R1/R4/R6/R7/R8 테스트 **6/6 PASS**. 이는 PC의 실제 뉴스 수집·올라마·자동 게시 성공을 뜻하지 않는다.
- 다음 Gate: R9 실 PC 로그로 검색 4경로 응답·공식 날짜·올라마 모델 가용성을 검증 → GOV.UK 개별 기사 이용권 및 본문 사용 가능 범위 판정 → 올라마 자체 한국어 요약·긍정/부정/중립 구조화 출력 검증 → 표시용 캐시 증분 저장 및 D1 뉴스 단독 게시/read-back을 Shadow 방식으로 점검 → 기존 R13 주기에 뉴스 게시만 격리 연결 → 실제 사이트 14일 노출 검증.
- **현재 신규 기사 자동 게시 미활성화.** 사용자 직접 지정한 4개 키워드 OR 조건은 수집/표시 후보 계약으로 확정하지만 키워드가 존재한다는 이유만으로 권리 검증 없는 전문·사진·기사 요약을 게시하지 않는다.

## 18. 2026-10-27 R9 실 PC 4개 뉴스 경로 및 올라마 확인 PASS / R10 자동게시 모델 검증

- 사용자 R9 파일 `IRAN_NEWS_R9_AUTO_PREFLIGHT_RESULT.txt`: `FINAL_STATUS=PASS_R9_READ_ONLY_READY_FOR_REVIEW`, 공식 GOV.UK 네 검색 경로 **4/4 성공**, 각 검색 20건, 최초 발행일 공식 Content API 표본 **4/4 `REVIEW_REQUIRED`**, 실패 0. 검색 80건은 **중복 제거 이전 피드 엔트리 수**다.
- 사용자 PC Ollama 로컬 `ONLINE`, 모델 `gemma3:4b` / `qwen3:4b` 두 개. R9에서는 모델 추론은 수행하지 않았고 캐시·D1·원장·스케줄러도 쓰지 않았다.
- R10 `news-display-model-shadow-r10.mjs`: 4개 피드의 실제 URL 중복 제거, 공식 `first_published_at`로 30/14일 후보 확인, 최근 기사 최대 2건 본문을 다시 읽고 로컬 Ollama 2개 모델에 동일한 구조화 한국어 요약·영향 3분류를 최대 4회 요청한다. JSON 스키마와 한국어 요약 길이·분류값 검증, 각 모델 속도(ms)와 유효 결과 수를 기록한다. 사용자 OR 조건은 코드에서 확정하므로 Ollama 임의 관련성 판단으로 제외하지 않는다.
- `IRAN_NEWS_R10_OLLAMA_SHADOW.cmd`는 R10 코드 SHA `030c2fc7acdbf41858d7ef8f9e5f8c27e02c9858`에서 검사기를 읽어 실제 PC에서 한 번 실행, `IRAN_NEWS_R10_OLLAMA_SHADOW_RESULT.txt`를 CMD 옆에 출력한다. CMD ASCII+CRLF/BOM 없음. 기존 Windows R13 실행기·스케줄러·D1·SQLite·캐시에 쓰지 않는다.
- R10 단위 테스트 및 기존 R1/R4/R6/R7/R8/R9 통합 **7/7 PASS**. 다만 실제 PC 모델 추론 성능과 80개 피드의 중복·14일 후보는 **R10 실행 전 아직 미확인**이다. OGL 범위 밖 제3자 콘텐츠가 포함되는지 검증할 개별 기사 권리 게이트는 유지한다.
- 다음 Gate: R10 실측의 처리량/유효도 확인 → 전체 갱신 기사에 대한 증분 처리, 기사별 재사용 가능성, 저장 전 상세 검증 → 뉴스 전용 캐시+원격 뉴스 키에만 그림자 게시/read-back → 운영 R13 6시간 종료 후 격리 hook에 자동 뉴스 갱신 연결 → 웹 실제 최신 기사·14일 표시 확인. 현재 자동 사이트 게시는 미가동.

## 19. 2026-10-27 R10 실 PC Ollama 결과 및 R11 관련 문단 집중 검증

- 사용자 `IRAN_NEWS_R10_OLLAMA_SHADOW_RESULT.txt`: `FINAL_STATUS=PASS_R10_READ_ONLY_SHADOW`, 4개 뉴스 검색 Feed 80건 → URL 중복 제거 49건, Content API 49/49 성공, 30일 내 22건, 최근 14일 10건.
- 로컬 모델 2종 × 기사 표본 2개 = 구조화 응답 **4/4 JSON 유효**. 속도: 첫 기사 Gemma 1,862ms/Qwen 11,197ms, 둘째 기사 Gemma 13,364ms/Qwen 11,207ms. 이런 두 건의 작은 표본만으로 모델의 전체 기사 처리 속도/품질 우열은 확정할 수 없다.
- **내용 품질 문제:** 2026-10-23 영국 총리-미국 대통령 통화 발표에는 사우디에 대한 후티 공격 관련 문단이 있음에도, Gemma는 우크라이나 중심 요약으로 `positive`를 반환. Qwen도 우크라이나 중심으로 요약. Qwen의 첫 표본에는 `요emen`과 같은 잘못된 한·영 혼합 번역이 포함됐다. R10의 `validModelCalls=4`는 JSON 구조 유효성이지 의미 정확성 검증 PASS가 아니다.
- 원문 2건 공식 웹페이지를 교차 확인하여 오류 재현: `https://www.gov.uk/government/news/joint-press-release-on-the-r4-ministerial-meeting-in-istanbul`, `https://www.gov.uk/government/news/pm-call-with-president-trump-of-the-united-states-23-october-2026`. 관심 키워드 한 개 이상인 기사 게시 후보 선정 정책 자체는 유지하되, 뉴스의 요약과 영향 분류는 **네 키워드에 관련된 본문 문단 기준**으로만 수행해야 한다.
- R11 관련 문단만 추출하는 `topicFocusedBody`, 모델의 `이란|사우디|예멘|예맨|후티` 요약 언급 조건, 한·영 혼합 번역 탐지, `positive/negative` 실제 분쟁 변화 요건을 추가. 예전 R10 기록의 입력 코드 SHA는 그대로 재현 가능하다. R11은 별도 `news-display-focused-shadow-r11.mjs` 진입점으로 실행한다.
- 기존 R1/R4/R6/R7/R8/R9/R10+신규 R11 **8/8 테스트 파일 PASS**. 단순 모의 검증이며 신규 모델 실 PC 실측 결과는 아직 미확인.
- R11 PC 파일 `IRAN_NEWS_R11_FOCUSED_SHADOW.cmd`는 원본 SHA `6e3bd1b24737c969f033d44c2c7cd005e3677d08`로 고정, 한국어 기사 요약 및 클래스별 수치·문단 발췌 길이만 로그에 출력한다. 여전히 뉴스 캐시·D1·스케줄러·점수 원장 쓰기 금지.
- R11 결과가 의미적으로 타당하고 기사별 GOV.UK OGL 제3자 제외를 확인할 수 있을 때만 다음 단계 캐시 저장+뉴스 전용 D1 게시를 검토한다. **현재 자동 사이트 게시 미활성화**.

## 20. 2026-10-27 R11 의미 정확도와 R12 공개 후보 안전 미리보기

- 사용자 `IRAN_NEWS_R11_FOCUSED_SHADOW_RESULT.txt`: 공식 4/4 피드 성공, URL 중복 후 49, 30일 22, 14일 10, Content API 49/49 성공. 관련 문단 길이 표본 906/184자. Ollama 4/4 구조화 응답 성공.
- 관련 문단 선택 효과: 우크라이나 중심의 완전한 요약 이탈은 줄었으나, **공개 불가능한 오류 지속**. Gemma는 원문에 없는 `호세인 후티`를 생성하고 과거 후티 공격 언급을 현행 `negative`로 분류. Qwen은 첫 기사에 원문 없는 `이스라엘-예멘 갈등`을 덧붙였고, 둘째 기사에서 후티 공격 언급이 사라졌다. Gemma의 일부 비라틴 문자 혼합도 기존 검증기에서 놓쳤다. **R11 4/4 유효는 출력 형식 통과이지 사실 검증 통과가 아니다.**
- 사용자 조건: 이란·사우디·예맨/예멘·후티 중 **하나라도 있으면** 뉴스 공개 후보. 모델의 자유 요약 또는 심리 추정으로 기사를 선별·제외하지 않는다.
- R12 `news-display-safe-preview-r12.mjs`: 현재 14일 기사 각각에 대해 GOV.UK 공식 최초 발행일·원본 URL, `press_release/news_story/statement/speech` 문서형, 영국 정부 기관 발행 링크, 기사 HTML의 OGL 표기, 본문에 별도 제3자 저작권 표시가 없는지 확인한 후 **원문 링크+원 제목+검증된 4개 주제 이름만 이용한 짧은 한국어 설명 및 중립값**을 생성한다. 권리 불명확 기사는 보류한다. 사진·기사 전문을 복사하지 않는다.
- R12는 특정 기사의 정치/군사 상황을 임의로 해석해 `positive/negative`를 생성하지 않는다. 사용자 공개 수집 조건은 유지하며, 모델이 틀리거나 요약 정확도를 증명하지 못할 경우의 저위험 대안을 확인하는 **읽기 전용 예비설계**일 뿐 실제 사용자 사이트에 이런 설명을 채택하기로 확정한 것은 아니다.
- 기존 8개 파일+R12 신규 파일 **총 9/9 테스트 파일 PASS**. `IRAN_NEWS_R12_SAFE_PREVIEW.cmd`는 고정 소스 SHA `fc367e6939ebb0578519de66b10f20a49b3af077`를 사용하여 사용자 PC에서 기재된 후보와 보류 사유를 출력한다. 기존 R13·점수·원장·캐시·D1·사이트 변경 없음.
- 다음 Gate: R12 실 PC 후보별 권리 증거 및 기사 건수 검증 → 승인된 자연어 요약 수준/중립 대체 표시 정책 확정 → 검증된 표시 전용 캐시 증분 반영 + 뉴스 단독 D1 read-back → R13 6시간 hook의 자동 게시 운영 검증.
- **현재 신규 기사 자동 게재는 미가동.** R10/R11 오류를 무시하고 무조건 자동 게시하지 않는다.


## 21. 2026-10-27 R12 실 PC 검증 및 R13 증분 게시 사전 점검

- 사용자 `IRAN_NEWS_R12_SAFE_PREVIEW_RESULT.txt` 실측: 공식 GOV.UK 최근 30일 후보 22건, 최근 14일 게시 후보 10건, 개별 원문 10/10 조회, 발행처/페이지 OGL 문구/본문의 명시적 제3자 저작권 표시 검사 10/10 통과, 보류 0건. `FINAL_STATUS=PASS_R12_SAFE_PREVIEW_READ_ONLY`. 이는 **최소 권리 검사 통과**이지 모든 잠재적인 제3자 재사용권을 절대적으로 보장하는 증거는 아니다.
- 4개 키워드(이란 OR 사우디 OR 예멘·예맨 OR 후티) 중 하나라도 명시된 기사면 후보에 포함한다. 긍정·부정 점수 또는 모델이 임의 요약한 정치적 해석으로 선별하지 않는다. R10/R11의 허위 문구가 있었으므로 R12 중립형 최소 설명을 안전 미리보기로 사용한다. 기사 제목은 현재 공식 영문 그대로다.
- 실제 운영 게시: 이전에 수동 검증된 기사 1건만 D1과 사이트에 공개되었다. R12의 10건 미리보기는 사이트에 **게시되지 않았으며**, PC 운영 캐시·D1·작업 스케줄러·점수 원장 쓰기가 없다.
- R13 `scripts/iran-progress/news-display-incremental-preflight-r13.mjs`는 실 PC `iran.sqlite` 존재 및 뉴스 전용 캐시를 확인하고, 기존 D1 `public:iran-progress:news:iran:r1` 스냅샷을 조회해 일치 여부를 검사한다. 4/4 피드 성공, Content API 실패 0, 14일 후보 전수 확인을 요구한다. 출처 부분 실패 시 게시를 보류한다.
- R13의 증분 계획에서는 기존 캐시의 URL-ID와 중복되는 기사에 자동 생성한 중립 문구를 **덮어쓰지 않는다**. 신규 기사만 예상 증분에 반영하고, 읽기 전용으로 다음 공개 14일 건수와 로컬 30일 보관 결과를 계산한다. 기사별 이용조건이 미확실한 후보는 보류한다.
- 신규 테스트 `tests/iran-news-incremental-preflight-r13.test.mjs`를 포함한 `node --test tests/iran-news-*.test.mjs` **10/10 테스트 파일 통과**(모의 데이터 기반). `IRAN_NEWS_R13_INCREMENTAL_PREFLIGHT.cmd`는 공개 SHA `bffe048c3dc12d270bab82ce22351f0a5c47918c`에서 코드를 고정 다운로드하고, 운영 PC 실제 캐시·D1을 읽기 전용으로 비교하여 `IRAN_NEWS_R13_INCREMENTAL_PREFLIGHT_RESULT.txt`를 남긴다.
- **남은 단계:** R13 실 PC 결과로 기존 수동 1건과 신규 9건(2026-10-27 당시 예상)의 보존·증분을 확인 → 뉴스 전용 캐시 안전 저장 및 D1 **한 번** 게시/read-back → 기존 R13 6시간 정상 작업 종료 후에만 격리된 뉴스 자동 게시 hook 적용 → 후속 2회 정규 실행과 사이트 API/UI·14/30일 만료 확인. 실제 자동 신규 기사 게재는 아직 미가동.


## 22. 2026-10-27 R14 일회 증분 공개 코드 (아직 실 PC 미실행)

- `scripts/iran-progress/news-display-publish-incremental-r14.mjs`은 기존 R13을 실행 직전 재검증한 후에만, 이미 수동 검증된 기사는 그대로 두고 신규 권리 조건 통과 기사만 기존 **PC 뉴스 표시 전용** `news-display-r1.json`에 원자적 저장/read-back한다.
- 게시 직전 D1 뉴스 단독 key를 다시 읽어 변경 감지 시 중단한다. D1에는 **단 한 번** `public:iran-progress:news:iran:r1`만 게시하고 동일 행 read-back으로 `VERIFIED`를 확인한다. 실패/통신 불확실 시 이미 저장한 PC 캐시는 그대로 두며 무작정 재시도하지 않는다. R3/R5 원장·점수·예약 작업은 불변.
- `IRAN_NEWS_R14_PUBLISH_ONCE.cmd`는 고정 SHA `e7fd9814a578412af095ce42fd53d9a982da5ab5`를 다운로드하고 **별도 읽기 전용 R13 Gate → 단 1회 R14 쓰기 → D1 read-back**을 수행한다. CMD 사용자가 명시적으로 실행해야만 쓰기 시작한다. 결과 `IRAN_NEWS_R14_PUBLISH_ONCE_RESULT.txt`를 제출해야 실 운영 증거로 인정한다.
- 이전 10개+신규 R14 테스트 **11/11 파일 PASS**(모의). GOV.UK OGL 안내와 제3자 권리 표기 점검은 계속 요구되며, 자연어 생성 모델 자유 요약은 배포하지 않는다.
- **게시 자동화 상태:** 일회 증분 게시 코드는 브랜치에 준비되었으나 사용자 PC에서 R14 CMD 실측 및 실제 D1/사이트 확인 전이므로 아직 자동 게시 완료가 아니다. 다음 Gate는 R14 일회 게시 검증 후 **기존 R13 00/06/12/18 KST 스케줄의 후행 격리 hook 연결**과 두 차례 정규 실행 확인. 새 작업/별도 타이머/점수 산식 변경은 금지한다.


## 23. 2026-10-27 R14 운영 PC 실제 D1 게시 성공과 R15 자동 실행 준비

- 사용자 `IRAN_NEWS_R14_PUBLISH_ONCE_RESULT.txt`의 실 PC 실행:
  - R13 read-only preflight: GOV.UK 4/4 피드, URL 중복 제거 49, Content API 49/49, 최근 30일 22, 최근 14일 10, 개별 이용조건 최소검사 10/10, 보류 0, 로컬 PC 1건과 D1 1건 일치.
  - R14 실제 쓰기: 신규 9건, 기존 수동 검토 1건 동일 ID·제목·요약 보존, PC 표시용 뉴스 캐시 1 → 10, D1 뉴스 단독 공개 10건, 원격 재조회 `VERIFIED`, `FINAL_STATUS=PASS_R14_PUBLISH_ONCE_D1_VERIFIED`.
  - R14 실행에서 R3/R5 SQLite 원장·점수 산식·기존 R13 작업 스케줄러는 변경되지 않았음. **단, 별도의 웹 API/UI 직접 실측은 아직 미완료**: 외부 웹 조회에서는 `zgmini.kr` 접근을 확인하지 못했으므로 D1 확인만으로 사이트 UI 검증을 통과했다고 기록하지 않는다.
- 추가 사용자 키워드 정책은 **Iran OR Saudi OR Yemen OR Houthi** 한 개 이상이다. GOV.UK 원문 예시 `https://www.gov.uk/government/news/joint-press-release-on-the-r4-ministerial-meeting-in-istanbul`에서 해당 네 키워드가 실제 언급된 내용도 공개 확인했다. 복사하는 것은 공식 제목, 링크, 날짜, 권리 검사 통과 뒤 생성한 중립 주제 라벨 설명뿐이다.
- R15 `scripts/iran-progress/news-display-auto-run-r15.mjs`:
  - **기존** `ZGMINI-PC-Iran-Progress-R13` 00/06/12/18 KST 정규 실행 내에서, 원래 R3→R5→legacy→R7 cache cleanup **모두 종료한 뒤**, 별도 뉴스-only 수집·권리점검→PC display cache 업데이트→D1 news-only key 재조회를 실행하도록 준비.
  - 현재 PC에 이미 존재하는 `scripts/pc-writer/d1.mjs`의 `client`만 사용하고 그 파일은 변경하지 않는다. 비밀 토큰은 운영환경의 기존 토큰만 **읽어** 사용한다. 추가 로그인·권한 취득·기존 인증 파일 수정은 하지 않는다. 만료·부재 시 실패 상태를 기록한다.
  - 실행 결과는 표시용 별도 `news-display-auto-r15-status.json` 단일 파일에 최신 `PUBLISHED_D1_VERIFIED` 또는 `FAILED_SCORE_UNAFFECTED`로 저장하고 기사 수·신규 수·D1 결과만 기록한다. 비밀정보는 기록하지 않는다.
  - R15 뉴스 실패는 기존 점수 러너의 exit-code에 영향을 주지 않는다. 새 Windows 예약 작업, 빈도 변경, VBS 수정, 원장 정리는 없다.
- `scripts/iran-progress/news-display-install-auto-r15.mjs`은 PC 실제 이전 R7 runner SHA `438ac0ad...`와 원본 R7 백업, VBS, 작업 스케줄 XML, PC 운영 Git HEAD `bc7bd678...`을 대조하고, 기존 6개 모듈의 바이너리 동일성 및 새 뉴스 전용 6개 파일의 **부재**를 확인한다. 새 코드만 복사하고 승인된 runner 꼬리 블록만 `db0040ef...`으로 교체한다. 이전 runner의 `.before-iran-news-r15` 별도 백업/read-back을 필수로 남긴다.
- 설치는 `IRAN_NEWS_R15_AUTO_INSTALL.cmd`를 사용한다. 고정 코드 SHA `8813ad6f8e5f396bf05d6db2730efc2b459cf1f9`, CMD ASCII/CRLF, PC 기존 runner 실측 preflight → 한 번의 설치 → read-back, 결과 `IRAN_NEWS_R15_AUTO_INSTALL_RESULT.txt`. R15 전체 뉴스 테스트 **12/12 파일 통과(모의·소스 검증)**.
- **R15 PC 설치와 정규 6시간 자동 실행은 아직 미실행**. 설치 로그 PASS 후 실제 다음 2회의 6시간 예약 실행에 대해 `news-display-auto-r15-status.json`, D1 read-back, 공개 사이트 API/UI 기사 수·시간 및 14일 노출/30일 삭제를 확인해야 운영 완료.
