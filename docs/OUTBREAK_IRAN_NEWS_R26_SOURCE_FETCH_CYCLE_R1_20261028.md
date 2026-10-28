# 이란 뉴스 R26 원문 본문 자동 연결 R1 — PC 초안 일괄 실행

## 변경 범위

- 저장소 `ansqhd5774-Choi/zgmini`, 기존 `codex/ui-improvements` 브랜치만 사용.
- 공개 UI, R26 수집기, 다른 작업자 브랜치, R3/R5 계산, D1, PC 스케줄러는 변경하지 않음.
- 신규 `scripts/iran-progress/news-r26-source-evidence-r1.mjs`는 기존 비공개 R26 후보에서 **최근 KST 14일만** 선택해 원문을 가져온다. Ollama가 생성하는 것은 **공개 승인 전의 한국어 초안**이다.

## 직접 연결 대상

| 출처 | 실제 첨부 R26 최근 14일 | 직접 수집 경로 | 실패 시 |
| --- | ---: | --- | --- |
| GOV.UK | 2 | 공식 Content API `https://www.gov.uk/api/content/...`의 `details.body` | 제목·발행시각·경로·본문 불일치 시 보류 |
| Tasnim | 8 | 기사 페이지의 단일 JSON-LD `NewsArticle.articleBody` | HTTP 403, JSON-LD 부재/중복, 제목 불일치 시 보류 |
| UN | 2 | 별도 본문 증거·출처 표시·UN 통지 확인 필요 | 자동 수집/공개 승인 보류 |
| BBC | 4 | 독립 출처 근거·사실 재작성 확인 필요 | BBC 원문 자동 재게시 보류 |
| **합계** | **16** | **최대 10건 직접 수집 시도 가능** | **6건 별도 증거 경로** |

위 건수는 **수집 시도 가능 수**이지, 성공 수나 공개 허가 수가 아니다. 현재 실행 환경에서는 Tasnim 직접 HTTP 요청이 403으로 거부됐으므로 정상 수집을 입증하지 못했다. 우회 요청/재시도는 수행하지 않는다.

## 안전성

1. URL은 허용된 출처·경로만 허용하고 교차 사이트 HTTP 리다이렉트를 거부한다.
2. 요청당 최대 1.2MB, 20초, 기사당 1회만 요청한다. 공통 PC 수집기·스케줄러 상태는 건드리지 않는다.
3. GOV.UK는 Content API의 실제 본문과 최초 발행시각 및 원제목이 R26 후보와 일치해야 한다.
4. Tasnim은 JSON-LD에 정확히 하나의 기사 본문이 있을 때만 사용한다. 사이트 메뉴·추천 기사·페이지 전체를 본문으로 추정하지 않는다.
5. 수집 실패는 기사별 오류로 기록하며 가짜 본문/요약으로 대체하지 않는다.
6. 원문은 Ollama 요청에만 제공하며 생성 파일에는 본문 전체 대신 SHA-256와 짧은 근거 인용만 포함한다.
7. 출력은 Git 저장소 **밖**의 새 개인 파일에만 저장한다. 모든 초안은 `rightsVerified:false`, `displayEligible:false`이고 공개 API·D1 쓰기는 0이다.

## PC에서 실행하는 방식 (실행하지 않은 예시)

사전 대상 확인 (외부 요청 0건):

```cmd
node scripts\iran-progress\news-r26-source-evidence-r1.mjs --candidates=E:\ZGmini\data\iran-progress-r13\news-display-candidates-r26.json --mode=dry-run
```

PC의 실제 설치된 Ollama 모델로 한 번에 원문 수집·한국어 초안 생성:

```cmd
node scripts\iran-progress\news-r26-source-evidence-r1.mjs --candidates=E:\ZGmini\data\iran-progress-r13\news-display-candidates-r26.json --mode=generate --output=E:\ZGmini\data\iran-progress-r13\news-korean-drafts-r1.json --model=gemma3:4b
```

기존 R26 후보 수집기에서 이미 원문을 저장하는 경우에는 네트워크 재수집 대신 `IRAN_NEWS_ARTICLE_EVIDENCE_R1` 입력을 기존 `news-r26-ollama-drafts-r1.mjs`로 직접 전달할 수 있다.

## 완료 여부

- 소스 정적 검사와 가짜 원문/응답으로 검증한 자동 수집→초안 생성 경로의 테스트는 수행함.
- 실제 PC Ollama 사용, Tasnim 403 해소, UN 통지, BBC 독립 사실 확인, 기사별 승인 파일 생성, PC 스케줄러 등록, D1 공개는 수행하지 않음.
- 이 단계는 기사 본문 자동 연결의 구현이며 **상시 완전 자동 게시 완료**가 아니다.

## 관련 공식 자료

- GOV.UK Content API: https://content-api.publishing.service.gov.uk/getting-started.html
- Ollama 구조화 출력: https://docs.ollama.com/capabilities/structured-outputs
- Tasnim CC BY 4.0 안내: https://www.tasnimnews.ir/en
- UN 저작권: https://www.un.org/en/about-us/copyright/
