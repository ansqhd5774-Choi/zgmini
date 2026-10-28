# 이란 뉴스 R37 — 59건 원문·발행일 재검증 (게시 이전 단계)

- 작업 브랜치: `codex/outbreak-iran-news-retention-r1-20261026` (신규 브랜치 없음)
- 기준 원본: 사용자 PC에서 제공된 `news-display-candidates-r26.json`, R36 조사 당시 59건
- 검증일: 2026-10-28 KST
- 실행: `node --use-env-proxy scripts/iran-progress/news-display-publish-evidence-r37.mjs --audit-readonly <후보 JSON의 절대 경로>`
- 별도 게시 승인 지시가 있어도, 이 **증거 생성 명령 자체는 원격 게시기가 아니다**.

## 실행 결과

| 출처 | 30일 비공개 후보 | 공개 UI 최근 14일 후보 | 14일 후보 본문·발행일 재검증 |
| --- | ---: | ---: | ---: |
| Tasnim | 14 | 14 | 14 |
| GOV.UK | 7 | 2 | 2 |
| Guardian | 14 | 14 | 14 |
| DW | 1 | 1 | 1 |
| BBC | 4 | 4 | 4 |
| Al Jazeera | 10 | 10 | 10 |
| UN | 9 | 2 | 2 |
| **합계** | **59** | **47** | **47** |

- 원문 검사 결과 `ARTICLE_METADATA_REVIEWED`: 59/59 (14일 밖 12건 포함).
- 비공개 후보 중 `rightsVerified:true`: 0, `displayEligible:true`: 0.
- 원본 후보 파일 내용 및 해시 보존. 기사 본문은 보고서에 저장하지 않음.
- 기사별 매체 표기 발표 시각은 재확인했으나, 발표 이외 독립적 현장 사실 검증이나 공개 원고 생성까지 완료한 것은 아님.
- 결과 파일은 실행 환경 로컬의 `IRAN_NEWS_R37_ARTICLE_EVIDENCE_<timestamp>.json`이며 원본 URL·제목·메타데이터 검증 상태만 수록한다.
- `pcCacheWritten=false`, `d1Written=false`, `schedulerModified=false`, `scoreLedgerModified=false`, `publicCacheModified=false`.

## 기존 운영과 다음 단계

- 실제 사이트 `/api/outbreak-news/iran`는 2026-10-28 확인 시 HTTP 200, `READY`, 게시 9건, 출처 GOV.UK 하나.
- GitHub `main`의 Cloudflare Workers Builds 체크 성공은 확인됐지만, 이 검증 명령이나 59건에 대한 D1 게시 완료가 아니다.
- 개인 PC의 59건 수집 캐시를 원격 공개 D1으로 자동 복제하지 않는다. 공개용 요약·영향 분류·출처별 재사용/독립 작성 증거를 포함한 별도 기사 입력이 필요하다.
- 기존 공개 항목을 보존하고, 승인된 PC 공개 경로에서 게시 후 D1 read-back과 API/UI 반영을 확인해야 운영 완료다.
- R3/R5 점수·예약 작업·DNS·Cloudflare 원격 수집기는 변경하지 않는다.
