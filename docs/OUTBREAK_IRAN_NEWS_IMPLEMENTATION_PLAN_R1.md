# 이란 전쟁 주요 뉴스 — 구현 작업 계획 R1

- 계획일: 2026-10-26 (KST)
- 상태: **코드 1차 반영 / 실 PC 실행·수집 연동·배포 전**
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
| D1 뉴스 전용 게시 | `scripts/iran-progress/news-display-publication-r1.mjs` |
| payload·14일 검증 | `lib/iran-progress/news-display-r1.mjs` |
| 저장형 GET | `worker/iran-news-display-public-r1.mjs`, `app/api/outbreak-news/iran/route.ts` |
| 기존 뉴스 UI 연결 | `app/outbreak-beginner-iran-r54.tsx`, `app/outbreak-news-r57.tsx` |
| GOV.UK 후보 발견(읽기 전용) | `scripts/iran-progress/news-display-discover-r1.mjs` |
| PC 독립 정리/게시 실행기 | `scripts/iran-progress/news-display-maintenance-r1.mjs` |
| PC 확인용 CMD | `scripts/iran-progress/IRAN_NEWS_R1_READONLY_CHECK.cmd` |
| 자동 테스트 | `tests/iran-news-display-r1.test.mjs` |

기존 수집기·runner·게시기 변경은 승인 경로에서 **필요한 최소 범위**로만 적용한다. 새 파일명과 전용 키는 후보이며 실제 참조 관계 검사 후 확정한다.

## 4. 이번 요청의 완료 기준

- [x] 14일 표시/30일 PC 표시용 자동 삭제/원장 보존 정책을 6단계 개발 계획으로 구체화
- [x] 기존 수집·저장·배포 소스에서 수정 후보와 필수 검증 Gate 정리
- [x] 뉴스 전용 캐시·만료 필터·D1 게시 함수·읽기 전용 API·UI 연결의 **독립 코드** 구현
- [x] GOV.UK 후보 발견 미리보기 구현(기사별 표시권리 미승인 상태 유지)
- [x] 14/30일 경계·피드 발견·권리 차단·캐시·D1/API 단위 테스트 11개 PASS
- [ ] 기존 PC runner에 표시 전용 수집/정리/게시 연결(운영 환경 점검 선행)
- [ ] 실제 뉴스 수집·PC 표시 캐시 정리 실행
- [ ] 뉴스 D1 게시·공개 UI·Cloudflare 배포

**진행 이력:** 최초에는 계획서만 저장했다. 2026-10-26 현재 독립 구현 파일과 UI/API 연결 코드가 브랜치에 추가되었다. 그러나 기사별 검증과 자체 요약·영향 분류, PC 원본 수집기와의 런타임 연결, PC 실제 30일 정리 실행, D1 실제 게시, PR/main 반영, Cloudflare 배포는 **미실시**다. 11개 테스트 PASS는 단위 테스트 결과이지 운영 PASS가 아니다.

## 5. 운영 PC 첫 확인 절차 (미실행)

- 승인된 PC의 실제 소스 SHA와 이란 운영 홈(`ZGMINI_IRAN_HOME`)을 먼저 확인한다. 작업 브랜치가 그 PC에 반영되지 않았다면 운영 스케줄러나 기존 코드를 덮어쓰지 않는다.
- 새로 추가한 `scripts/iran-progress/IRAN_NEWS_R1_READONLY_CHECK.cmd`는 **읽기 전용** GOV.UK 후보 조회와 **dry-run** 30일 정리 미리보기만 실행한다. `--apply`·`--publish` 및 점수 원장 변경 없음.
- 결과는 CMD 파일 옆의 `IRAN_NEWS_DISCOVERY_R1_RESULT.txt`, `IRAN_NEWS_RETENTION_R1_RESULT.txt` 두 파일에 기록한다. 임시 폴더 및 E: 새 대용량 저장소를 만들지 않는다.
- 첫 결과를 통해 피드 HTTP·원본 발행 시각·GOV.UK 개별 권리 검증 대상·30일 만료 대상·운영 경로를 확인한 뒤에만 실제 저장/게시 및 기존 PC 실행 경로와의 연결을 검토한다.
- 지금까지 자동 검증은 로컬 Node 11/11 PASS. **Windows CMD 실행, 실제 PC 파일 적용, 실 기사 이용권 판정, D1/Cloudflare 공개 검증은 아직 PASS가 아니다.**
