# 이란 뉴스 R26 기사 본문 → PC Ollama 한국어 초안 단계 R1

## 범위

- 저장소: `ansqhd5774-Choi/zgmini`; **기존 `codex/ui-improvements` 브랜치만** 사용한다.
- 기존 R26 수집 API, 다른 담당자 브랜치, 점수 산식, 스케줄러, D1 및 공개 UI는 변경하지 않는다.
- `news-r26-reviewed-link-r1.mjs`가 받는 최종 기사별 승인 입력과 **별도로** 한국어 검토 초안을 만든다. 이번 단계는 승인·게시 자동화가 아니다.

## 처리 계약

1. R26 후보 `news-display-candidates-r26.json`의 URL·출처·원제목·발행시각을 검증한다.
2. 기사 본문을 확인한 쪽(향후 수집 API 또는 PC 원문 검증 단계)은 **비공개** `IRAN_NEWS_ARTICLE_EVIDENCE_R1` 입력을 제공한다. 이 안의 `items[]`는 `sourceId`, `sourceUrl`, `originalTitle`, `publishedAt`, `articleBody`를 가진다. 본문은 반드시 실제 원문에서 확보해야 하고 120~18,000자 범위여야 한다.
3. URL·출처·원제목·발행시각이 후보와 정확히 일치하고 KST 최근 14일 안에 있는 기사만 로컬 Ollama에 순차적으로 전달한다. 기사 본문이 없으면 요청하지 않는다.
4. `http://127.0.0.1:11434`에서 설치 확인된 모델을 사용한다. JSON Schema로 한국어 제목·실질 요약·영향도 제안·원문 인용 근거 1~3개를 받는다. 90초 제한, 자동 재시도 없음.
5. 한국어 여부, 원문에 실제 포함된 인용, 새 숫자 삽입, 형식적 요약을 검증한다. 실패하면 **초안 생성 실패**로 남기고 가짜 요약을 채우지 않는다.
6. `IRAN_NEWS_KOREAN_DRAFT_R1`의 초안에는 `rightsVerified:false`, `displayEligible:false`, `PENDING_EDITORIAL_AND_RIGHTS_REVIEW`만 기록한다. 원문 전체는 결과 파일에 복제하지 않는다.
7. 검토자가 기사별 내용·권리·영향도를 검증해 별도 `IRAN_NEWS_REVIEWED_INPUT_R1`를 생성해야 기존 R26 연결기에 넘길 수 있다. UN은 통지 확인, BBC는 독립 출처 확인이 필요하다.

## 테스트/실행 예시

```cmd
node scripts\iran-progress\news-r26-ollama-drafts-r1.mjs --candidates=E:\ZGmini\data\iran-progress-r13\news-display-candidates-r26.json --mode=dry-run
node scripts\iran-progress\news-r26-ollama-drafts-r1.mjs --candidates=E:\ZGmini\data\iran-progress-r13\news-display-candidates-r26.json --evidence=E:\ZGmini\data\iran-progress-r13\news-article-evidence-r1.json --mode=dry-run
node scripts\iran-progress\news-r26-ollama-drafts-r1.mjs --candidates=E:\ZGmini\data\iran-progress-r13\news-display-candidates-r26.json --evidence=E:\ZGmini\data\iran-progress-r13\news-article-evidence-r1.json --output=E:\ZGmini\data\iran-progress-r13\news-korean-drafts-r1.json --mode=generate
```

- `--mode=dry-run`은 본문 수, 결손 수와 시간 창만 확인하며 Ollama를 호출하지 않는다.
- `--mode=generate`는 출력 파일이 이미 있거나 Git 저장소 내부일 때 거부한다. 민감한 사설 데이터와 원문을 Git에 커밋하지 않는다.
- 현재 사용자 첨부 R26 후보는 총 **28건**이며 최근 14일 **16건**이다. 첨부 파일에는 기사 본문이 없으므로 실제 Ollama 호출이나 승인본 생성은 0건이다.
- PC 기사 본문 입력 계약과 운영 호출 등록은 다른 담당자의 수집 API·PC 관리 작업과 연계돼야 한다. 이 문서 또는 테스트 통과만으로 운영 자동화 완료라고 간주하지 않는다.

## 공식 근거

- Ollama 구조화 JSON 출력: https://docs.ollama.com/capabilities/structured-outputs
- Ollama `/api/generate` 계약: https://docs.ollama.com/api/generate
- GOV.UK OGL: https://www.gov.uk/help/reuse-govuk-content
- Tasnim CC BY 4.0: https://www.tasnimnews.ir/en
- UN 출처 표시·통지: https://www.un.org/en/about-us/copyright/
