# 이란 뉴스 — R41 자동 한국어 평가·해석 R1 (2026-10-29)

## 목적과 담당 영역

- 기존 **R41 뉴스 API 연결 및 메타데이터 수집 담당**: 변경하지 않는다.
- 본 기능: 공개 R41 기사 ID·원문 URL·제목·게시일을 **읽기 전용**으로 확인하고, 기사 원문 근거가 검증되는 경우 로컬 Ollama로 한국어 요약·해석·잠정 영향도를 자동 생성한다.
- R26 기사별 사람의 편집·권리 검토 워크플로는 그대로 둔다. `AI 잠정 평가`는 `rightsVerified` 또는 `displayEligible` 승인이 아니며 공식 R26 검토 완료를 의미하지 않는다.
- **이란 R5 전쟁 심리 점수·뉴스 중복 가중치·기존 14일 차트에는 분석 결과를 투입하지 않는다.**

## 독립 데이터 흐름

1. PC `news-r41-auto-interpret-r1.mjs`가 `GET /api/outbreak-news/iran/r41`을 읽는다. R41 DB 테이블 또는 수집 스케줄을 변경하지 않는다.
2. 기사 URL을 SHA-256 ID로 검증하고 원문 제목·발행시각을 대응시킨다.
3. GOV.UK 및 Tasnim은 기존 출처별 원문 검증 함수를 사용한다. 다른 5개 출처는 기본적으로 `SOURCE_RIGHTS_RESTRICTED`; 허가 증빙이 있는 별도 evidence bundle에만 제한적 입력을 허용한다.
4. 기사 본문 근거가 있는 경우에만 로컬 Ollama `gemma3:4b`로 한국어 제목·요약·해석과 완화(positive)·악화(negative)·중립(neutral) 잠정 평가를 생성한다. 원문에 존재하는 지원 인용문과 숫자를 검증한 뒤 인용문 및 본문은 공개 JSON에 포함하지 않는다.
5. PC 개인 캐시 `news-analysis-r1-cache.json`에서 기사별 본문 해시·모델 다이제스트·프롬프트 버전을 검사해 중복 AI 추론을 피한다. 원문·모델이 바뀌면 해당 기사만 다시 분석한다.
6. 검증된 잠정 결과를 `news-analysis-r1-public-staged.json`으로 원자적 저장한다. 분석할 수 없는 기사는 `pending`으로 보존한다.
7. 독립 게시기가 승인된 PC 계정의 **CORE D1** `market_public_snapshots_v1`에서 **단 하나의 신규 키** `public:iran-progress:news:analysis-provisional:r1`만 갱신한다. 갱신 전후 정확한 readback과 중복/신규 데이터 보호를 수행한다.
8. 공개 `GET /api/outbreak-news/iran/analysis-r1`이 이를 읽고 기사 ID와 URL이 일치하는 `READY` 결과만 R41 카드에 연결한다. 평가는 **AI 잠정 평가**, 없는 기사는 **분석 대기**라고 표시한다. 원문 링크·무료 제목 번역·뉴스 더보기는 유지한다.

## 운영 PC의 독립 10분 예약 실행

운영 경로: `E:\ZGmini\data\iran-progress-r13\`, Node `E:\ZGmini\runtime\node.exe`(기존 승인 구성 우선). 새로운 예약 작업만 생성하며 기존 `ZGMINI-PC-Iran-Progress-R13`, `ZGMINI-PC-Local-Core`, `ZGMINI-PC-Local-Korea`를 변경하지 않는다.

1. 프로젝트의 최신 승인 소스가 운영 PC에 준비되어 있는지 확인한다. 이 채팅에서는 운영 PC의 파일·Ollama·계정에 직접 접근할 수 없으므로 설치나 실행 성공을 주장하지 않는다.
2. `scripts\iran-progress\IRAN_NEWS_ANALYSIS_R1_INSTALL.cmd`를 **한 번만** 실행한다. `news-analysis-schedule-r1.mjs`가 새 작업 `ZGMINI-PC-Iran-News-Analysis-R1`을 10분 주기로 등록하거나 동일한 기존 설정만 검증한다. 충돌하는 동명 작업은 덮어쓰지 않는다.
3. `scripts\iran-progress\IRAN_NEWS_ANALYSIS_R1_RUN_NOW.cmd`로 한 주기를 수동 검증할 수 있다. 실행 결과는 CMD와 같은 폴더에 TXT, 개인 이란 데이터 폴더의 `news-analysis-r1-last-run.json`에 기록한다.
4. 자동 주기: `news-analysis-scheduled-r1.mjs` → 분석 → 게시 전 검증 → D1 게시 및 읽기 검증. 동시 실행 금지, 구독/유료 서비스 추가 없음. PC·로그인 세션·인터넷·E:·로컬 Ollama가 필요하다.

## 결측·실패의 정확한 의미

| 상태 | 해석 |
| --- | --- |
| `READY` | 확인된 기사 근거로 AI 잠정 평가 생성 완료 |
| `ARTICLE_BODY_EVIDENCE_UNAVAILABLE` | GOV.UK·Tasnim 중 원문·메타데이터 검증 실패 또는 본문 없음 |
| `SOURCE_RIGHTS_RESTRICTED` | 출처별 승인된 자동 본문 이용 경로 없음; 기사 자체의 수집 실패는 아님 |
| `ANALYSIS_BACKLOG` | 정해진 한 주기 처리량을 초과, 다음 주기 재시도 |
| `STALE` | D1 공개 잠정 분석 스냅샷이 48시간 이상 갱신되지 않음 |
| `PENDING` | 아직 공개된 잠정 분석이 없음. 원문 링크는 계속 제공 |

## 출처 권리 검토

- R41의 일곱 출처: GOV.UK, Tasnim, The Guardian, DW, BBC, Al Jazeera, UN News.
- GOV.UK·Tasnim 외 다섯 매체를 제한된 무인 원문 수집 대상으로 본다. **RSS에 기사가 있다는 사실은 본문 AI 분석 허가가 아니다.**
- The Guardian 약관: https://www.theguardian.com/help/terms-of-service
- BBC 약관: https://www.bbc.com/pages/terms-of-use
- Al Jazeera 약관: https://www.aljazeera.com/terms-and-conditions/
- DW 콘텐츠 이용: https://amp.dw.com/en/benefit-from-smart-content-made-in-germany/a-19470839
- UN 저작권: https://www.un.org/en/about-us/copyright/
- 정책 코드 `news-r41-source-rights-r1.mjs`는 **허가를 부여하지 않는다.** 추가 매체에 자동 원문 AI 분석을 허용하려면 실제 허가와 매체별 계약 검토가 선행되어야 한다.

## 배포·검증 구분

- 공개 사이트 코드 적용: `codex/ui-improvements` 작업 브랜치 → 필요한 파일만 목적 제한 PR → GitHub `main` → Cloudflare Git integration 자동 빌드·배포. `main` 전체 병합/다른 담당자의 변경 섞기 금지.
- PC의 독립 예약 작업은 **별도**다. 클라우드 UI 배포만으로 Windows 주기 실행이 설치되지 않는다.
- 테스트: 뉴스 분석/권리/게시/공개 reader/UI 계약/스케줄러 단위 검사. 실제 운영 완료는 GitHub main SHA, Cloudflare 빌드·정확한 배포, PC 작업 실행, D1 독립 키 readback, 공개 API 및 뉴스 카드 검증을 각각 확인해야 한다.
- 실패 시 원본 수집기·R5 점수는 그대로 둔다. 신규 작업만 비활성화해 원인 분석하고, 신규 D1 스냅샷의 마지막 검증값은 보존한다.

## 실행 방식 및 R3.1 인수인계 (2026-10-29)

### 기준과 승인 범위

- 공통 실행 방식 선택 기준은 **별도 중앙 원본** `codex/theme-fear-greed-integration-20261025:docs/CMD_EXECUTION_PLAYBOOK.md`를 참조한다. 이 문서는 이란 뉴스 분석 **작업별 명세**이며 중앙 지침을 복제하지 않는다.
- 작업 저장소/브랜치: `ansqhd5774-Choi/zgmini` / `codex/ui-improvements`. PC 운영 승인 checkout `E:\ZGmini\projects\iran-news-analysis-r1-56eec668`, 데이터 `E:\ZGmini\data\iran-progress-r13`는 **R3 사용자 실행 로그에서 관측한 경로**이며, 개발 브랜치의 최신 SHA가 그대로 설치되었다고 추정하지 않는다.
- 허용 목표: 이미 게시된 AI 잠정 분석 보존, 검증 가능한 추가 기사 분석, 독립 D1 키 readback. 원문 이용권한 해제, R41 수집기 변경, R5 심리 점수 변경, 작업 스케줄러 수정, Cloudflare 배포·main 병합은 이 실행 승인에 포함되지 않는다. **기사 분석 완료 후 자동화 개선을 별도 작업**으로 진행한다.

### 이미 존재하는 명령·도구 재사용

| 역할 | 기존 파일·실제 확인된 CLI |
| --- | --- |
| Node 환경 | `scripts/resolve-local-node.cmd` (로컬 `%NODE%` 지정) |
| 예약 작업 상태만 확인 | `node scripts/iran-progress/news-analysis-schedule-r1.mjs --inspect` |
| 분리된 분석·캐시 미리보기 | `news-r41-auto-interpret-r1.mjs --mode=cycle --feed-url=https://zgmini.kr/api/outbreak-news/iran/r41 --cache=<개인 임시 캐시> --output=<개인 임시 결과> --model=gemma3:4b --max-new=16` |
| 결과 검증 | `news-analysis-r3-pc-check.mjs preview <기존 stage> <새 stage>` |
| D1 쓰기 전 검사 | `news-analysis-publication-r1.mjs --input=<검증된 stage> --mode=dry-run` |
| 승인된 신규 자료 게시와 결과 재확인 | `news-analysis-publication-r1.mjs --input=<검증된 stage> --mode=publish`, `news-analysis-r3-pc-check.mjs publish <게시 로그> <기대 READY 수>` |

위 옵션은 현재 코드가 실제 지원하는 인수만 기재했다. 새 CMD를 만들기 전에 위 도구를 우선 재사용하고, 복잡한 JSON·해시 검증은 Node helper에서 수행한다. Git 없는 PC용 ZIP을 새로 제공할 때는 **고정 source commit, 파일별 SHA-256 manifest, 모든 정적·동적 의존 코드, 한국어 절차, 결과 파일**을 포함하고 패키지 자체 검산과 승인 소스 대조를 구별한다. 실행 중 작업이나 잠금 상태를 알 수 없으면 임의 종료·삭제·재실행하지 않고 중단해 확인한다.

### 현재 관측 증거, 선택 적용, STOP

- 사용자 제공 `IRAN_NEWS_ANALYSIS_R3_RESULT.txt`: `FINAL_STATUS=R3_READBACK_VERIFIED`, R41 총 **40건**, READY **4건**, pending **36건**(권한 제한 35, Ollama 오류 1). `EXISTING_TASK_VERIFIED`는 **기존 10분 작업의 설정 확인**이지 40건 분석 성공이 아니다. 이 개인 운영 로그·본문·비밀값은 Git에 넣지 않는다.
- R3.1의 **선택 적용 대상은 단 하나**: `scripts/iran-progress/news-r41-auto-interpret-r1.mjs`. 운영 PC의 예상 기존 SHA-256 `2affa5c9ffb31aae2c9ec405a00dbca2adc51cd3289dee186720ee4449bbe333`, 변경 후보 SHA-256 `434c5baa191c32da6bbb1b6e42c4e789bea6ea617e236c1f8a574c3f14d7d711`. 후보 파일의 GitHub 개별 반영 커밋 `f9f9c541af21e8596654b384fda35fbbea927be6`. R3.1 사용자용 실행 CMD 개별 반영 커밋 `f9c4c17c21981280ebc6185a22074226b8028c46`. 서로 다른 커밋과 PC 설치 SHA를 혼동하지 않는다.
- 구버전 해시 불일치, 의존 파일 누락, 기존 READY 유실, 예약 작업 설정 변동, 잠금/동시 실행, 게시 결과 불확실 시 **STOP**. 적용 전 백업과 해시 검증, 검증된 stage와 D1 readback 확인을 우선한다. 원격 쓰기 결과가 불확실하면 즉시 재전송하지 않고 먼저 D1 현재값을 확인한다. 정상 자료를 빈 결과로 덮어쓰지 않는다.
- R3.1 ZIP의 파일 단위 해시 검증은 구현되어 있지만 **고정 source commit + 전체 의존 파일 manifest를 포함한 새 공통 패키지 기준은 아직 별도 검증되지 않았다**. 따라서 R3.1의 GitHub 코드 작성·단위 테스트 통과와 운영 PC 설치·Ollama 처리·D1 게시·공개 반영 성공을 구별한다. 필요 시 기존 실행기의 PRECHECK/APPLY/VERIFY를 나눠 보강하되 설치기만 반복 생산하지 않는다.
- 현재 차단 35건은 보도사 AI 이용권한 문제이며 CMD 전환으로 해제할 수 없다. 별도 승인된 독립 공식출처 사실 분석 또는 매체의 명시적 이용허락 없이 본문 AI 분석을 시작하지 않는다.

### 사용자 실행 및 종료 보고 계약

현재 ZIP의 PC 실행이 필요한 경우, 매번 **실행 목적·준비 상태·열 폴더·정확한 CMD·입력·1회 실행 횟수·정상 결과·STOP 조건·금지행동·다시 보낼 최소 결과 파일**을 빠짐없이 안내한다. 사용자 임의 재시도·다른 CMD 실행·예약 작업 변경을 지시하지 않는다. 결과 보고 시 코드/테스트, ZIP 구성, 실제 PC 설치, 수집/분석, D1 write/readback, 공개 UI, 다음 정규 실행을 독립적으로 표시한다. 전체 뉴스 분석이 실제 검증되기 전에는 자동화 개선 완료를 선언하지 않는다.
