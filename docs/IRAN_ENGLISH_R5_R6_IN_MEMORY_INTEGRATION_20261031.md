# 이란 영문 뉴스 R5 안전 연결 R6 — 수동 메모리 프리뷰

## 원본 브랜치와 작업 범위

- 지속 개발: `codex/outbreak-iran-news-retention-r1-20261026`.
- 이전의 임시 배포 브랜치에서 개발하지 않는다. 기존 R51~R55 뉴스 수집·게시·R3/R5 원장·사이트·Windows 작업은 보존한다.
- R5 점수 산식·비중·민감도·앵커·중복 조건·독립 확인 요건과 `R5_SOURCE_COLLECTION_UNREADY`를 변경하지 않는다.
- **이 단계는 실제 점수 적용이 아니다.** 영문 근거 검증 결과를 같은 R5 계산기에 입력했을 때의 차이만 메모리에서 계산한다. D1, SQLite, 체크포인트, 자동 게시에 쓰지 않는다.

## 연결 과정

1. 사이트에 공개된 `R41 READY` 뉴스 스냅샷을 읽는다. R1 자동 대체 및 출처·게시일·URL·기사 ID 무결성 오류는 차단한다.
2. 종전 승인된 7개 R5 기사 출처 중 원문 영문 근거를 사용할 권리가 명시적으로 확인된 기사만 검사한다. 기타 매체는 보류한다. R5 프리뷰의 제목 사건 선별, Tasnim HTML 본문 확보, 원문 인용문 선별, Ollama 단일 사건 규칙 검증을 재사용한다.
3. `REQUIRE_VERIFIED_ENGLISH_EVIDENCE` 모드로 원문 제목·원문 인용 SHA·R3 규칙·발행일·기존 URL 중복을 다시 검사한다. 확인되지 않은 기사는 모두 보류한다.
4. 원본 R5 계산기의 7개 R3 수집 경로에 대한 최근 24시간 성공 및 동일 분류 버전 게이트를 **먼저 통과**해야 한다. 불일치 시 점수를 계산하지 않는다. 신규 기사도 별도 수집 성공으로 위장하지 않는다.
5. 기존 원장을 기준으로 `baselineScore`를 계산하고, 적격 신규 기사만 **메모리에서** 추가하여 같은 R5 계산기에 `previewScore`를 산출한다. 기존 중복·긍정 사건 독립 확인·옛 기사 보류·사망자 수정 검토를 유지한다. 공개 점수 변경 수는 항상 `r5ScoreChanges=0`이다.

## 이전 개발본의 안전 수정

기존 `applyPublishedNewsInput(...,{dryRun:false})`는 `news-metadata:*` 저장소에 직접 기록할 수 있었다. 이 저장소를 R5 운영 계산기가 신뢰하기 때문에, 영어 근거를 검증했는지 뒤따르는 R3 수집 후 구별할 수 없는 문제가 있었다.

R6에서는 이 직접 쓰기 경로를 `IRAN_PUBLISHED_NEWS_OPERATIONAL_WRITE_NOT_APPROVED`로 닫았다. 이후 별도의 기사별 검증 출처·승인된 저장 게이트를 설계하고 검증하기 전에는 이를 활성화하지 않는다. 읽기 전용 `planPublishedNewsInput`의 기존 보류·중복·시점 판단은 재사용한다.

## 수동 PC 확인

기존 운영 프로젝트에서 최신 승인 소스를 확인한 후, Windows CMD 파일 하나를 수동으로 실행한다.

`scripts\iran-progress\IRAN_ENGLISH_R5_R6_IN_MEMORY_PREVIEW.cmd`

로그: `scripts\iran-progress\IRAN_ENGLISH_R5_R6_IN_MEMORY_RESULT.txt`.

- `FINAL_STATUS=ENGLISH_R5_R6_IN_MEMORY_NO_PUBLISH`: 모든 **프리뷰 게이트**를 통과함. 실제 새 점수 게시·자동 실행 완료가 아니다.
- `FINAL_STATUS=BLOCKED_NO_SCORE_OR_TASK_CHANGE`: Ollama·R41·R3 수집 상태·기존 원장·기사 증거 중 검증에 실패. 이를 성공으로 취급하거나 이전 점수를 덮어쓰지 않는다.
- 로그에는 기사 본문·모델 인용문을 기록하지 않고 기사 수·모델 호출 수·보류 사유·차이 점수만 남긴다.
- 로그가 `ENGLISH_R5_R6_IN_MEMORY_NO_PUBLISH`인 경우에도 `candidateCount=0`이면 신규 영문 검증 사건이 없다는 뜻이다. 모델 호출 성공과 기사 확정을 구분한다.

## 후속 운영 전환의 필수 게이트

- 실제 PC의 R5 원클릭 프리뷰 결과와 R6 수동 비교 결과 제출.
- 기사별 원문 발행일·이용권·동일 사건 중복·이전 원장 보존을 대조한다.
- 누락된 수집 데이터는 더 많은 기사로 보충하거나 기존 24시간 게이트를 완화하여 해결하지 않는다.
- 사용자가 별도로 승인한 뒤에만 검증 근거별 저장 승인 경로, PC 자동 실행 및 공개 R5 적용·D1 readback을 설계한다.

## 테스트

```bash
node --test tests/iran-english-r5-published-preview-r6.test.mjs tests/iran-published-news-score-input-r1.test.mjs tests/iran-r5-publication-reality-guard.test.mjs
```
