# R26 한국어 초안 → 기사별 게시 승인 파일: 안전한 PC 검토 단계

## 적용 원칙

- 저장소: `ansqhd5774-Choi/zgmini`; 작업 브랜치: **기존 `codex/ui-improvements`만**.
- 신규 `scripts/iran-progress/news-r26-editorial-approval-r1.mjs`는 승인자가 따로 작성한 결정 파일을 기존 `IRAN_NEWS_REVIEWED_INPUT_R1` 입력으로 변환한다.
- 후보 수집·키워드 일치·Ollama의 그럴듯한 문장만으로 `rightsVerified`를 높이지 않는다. 기존 수집기, 외부 담당자 브랜치, 산식, D1 및 PC 스케줄러 변경 없음.

## 검토 순서

1. 기사 R26 후보 원문을 확보하고 Ollama 한국어 초안을 별도 사설 파일로 생성한다.
2. `--mode=review-queue`로 각 기사 원본 URL·번역 제목·요약·영향도 제안·변경 감지용 `draftSha256`를 확인한다. 이 모드는 공개 쓰기 0건이다.
3. 사람이 원문 사실·요약·영향도·기사별 이용 허용 범위를 확인하고 **별도** `IRAN_NEWS_EDITORIAL_DECISIONS_R1` 파일에 검토 기록을 남긴다.
4. `--mode=dry-run`에서 결정과 초안의 출처·URL·날짜·본문 SHA·초안 SHA가 일치하는지 검증한다.
5. `--mode=prepare`는 승인된 기사만 포함된 `IRAN_NEWS_REVIEWED_INPUT_R1`를 새 비공개 파일로 작성한다. 기존 PC `news-r26-reviewed-link-r1.mjs`의 `dry-run` → `apply` → `publish` 계약을 그대로 재사용한다.

## 결정 파일 형식

`version="IRAN_NEWS_EDITORIAL_DECISIONS_R1"`, `items` 배열에 기사별로 다음을 포함한다.

- 공통: `id`, `sourceUrl`, `draftSha256`, `status="APPROVE"`, `reviewer`, `reviewNotes`, `reviewedAt`(UTC ISO 밀리초), `originalArticleReviewed=true`, `titleReviewed=true`, `factsReviewed=true`, `editorialSummaryReviewed=true`, `impactReviewed=true`, `rightsReviewed=true`, `impact`(positive/negative/neutral).
- GOV.UK: `oglScopeReviewed=true`, `thirdPartyContentCleared=true`. 기사 자체가 OGL 범위이고 제3자 저작물이 제외됨을 직접 확인한다.
- Tasnim·IAEA: `sourceOriginalContentVerified=true`, `creatorCredit`(실제 저작자/출처 표시). 공개 결과에는 개작 사실을 표시한다.
- UN: 위 검증에 더해 `newsReuseScopeReviewed=true`, `unNoticeConfirmedAt`(실제 통지 확인 기록) 필요.
- BBC: `independentFactsReviewed=true`, `sourceTextReused=false`, `independentKoreanCopyReviewed=true`, **독립적으로 작성한** `independentTitle`, `independentSummary`, 그리고 BBC와 무관한 `corroboratingSourceUrl`이 필요하다. 기존 BBC 문장 번역 초안을 직접 게시 입력으로 넘기지 않는다.
- 명시적 제외: `status="REJECT"`, 상세한 `reviewNotes`. 출력에 포함되지 않는다.

임의로 확인 플래그를 모두 `true`로 채우는 것은 승인 절차가 아니다. 수집·LLM 단계에서 승인 결정 파일을 생성해서는 안 된다.

## PC 명령 예시 (실제 수행 전 승인 파일·운영 경로 검증)

```cmd
node scripts\iran-progress\news-r26-editorial-approval-r1.mjs --candidates=E:\ZGmini\data\iran-progress-r13\news-display-candidates-r26.json --drafts=E:\ZGmini\data\iran-progress-r13\news-korean-drafts-r1.json --mode=review-queue
node scripts\iran-progress\news-r26-editorial-approval-r1.mjs --candidates=E:\ZGmini\data\iran-progress-r13\news-display-candidates-r26.json --drafts=E:\ZGmini\data\iran-progress-r13\news-korean-drafts-r1.json --decisions=E:\ZGmini\data\iran-progress-r13\news-editorial-decisions-r1.json --mode=dry-run
node scripts\iran-progress\news-r26-editorial-approval-r1.mjs --candidates=E:\ZGmini\data\iran-progress-r13\news-display-candidates-r26.json --drafts=E:\ZGmini\data\iran-progress-r13\news-korean-drafts-r1.json --decisions=E:\ZGmini\data\iran-progress-r13\news-editorial-decisions-r1.json --output=E:\ZGmini\data\iran-progress-r13\news-reviewed-approved-r1.json --mode=prepare
```

출력 파일은 기존 파일 덮어쓰기와 Git 저장소 내부 생성을 거부한다. 본문 원본·승인 결정·비공개 결과는 GitHub에 업로드하지 않는다.

## 현재 검증과 미완료

- 합성 검토 기록으로 GOV.UK·Tasnim·UN·BBC의 승인 허용/차단, 지문 불일치, 중복·미승인 처리 테스트 수행.
- 실제 사용자 첨부 R26 파일은 기사별 승인 기록·본문이 없으므로 현재 운영 공개 가능 신규 데이터가 생성되었다고 주장하지 않는다.
- PC Ollama 실운용, 실제 승인, 스케줄러 등록, Cloudflare D1 게시는 별도 운영 검증 단계다.

## 공식 자료

- GOV.UK 저작권/예외: https://www.gov.uk/help/terms-conditions
- Tasnim CC BY 4.0: https://www.tasnimnews.ir/en
- UN 뉴스 재사용 통지: https://www.un.org/en/about-us/copyright/
- BBC 이용약관: https://downloads.bbc.co.uk/usingthebbc/bbc_terms_of_use_31March2022english.pdf
