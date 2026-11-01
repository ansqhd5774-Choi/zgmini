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
