# Iran 뉴스 R26 후보 → 승인 데이터 자동 연결 R1

## 목적과 범위

- 저장소: `ansqhd5774-Choi/zgmini`; 변경 브랜치: 기존 `codex/ui-improvements`만.
- 다른 담당자의 R26 API 수집기, 30일 원자료 보존, PC 스케줄러, 점수 산식, D1 스키마 및 공개 Reader 변경 **없음**.
- 새 `scripts/iran-progress/news-r26-reviewed-link-r1.mjs`는 R26 **비공개 후보**와 별도로 작성된 `IRAN_NEWS_REVIEWED_INPUT_R1` **기사별 승인 입력**을 자동 대조한다. 일치한 승인 기사만 기존 PC 표시 캐시/게시기로 넘긴다.
- **자동 연결과 자동 공개 승인은 다르다.** `rightsVerified:false`를 자동으로 `true`로 바꾸지 않고, 기사 본문을 보지 않은 상태에서 요약이나 영향도를 창작하지 않는다. 수집기와 검토자 사이의 자동 원문·한국어 요약 검증 단계는 별도로 필요하다.

## 실제 R26 후보 파일 검산 (사용자 첨부 2026-10-28)

| 출처 | 후보 수 |
| --- | ---: |
| GOV.UK | 7 |
| Tasnim | 8 |
| UN | 9 |
| BBC | 4 |
| **합계** | **28** |

- 총 28건 중 KST 최근 14일 표시 창은 16건, 표시 창 밖이 12건이다.
- 실제 28개 후보는 모두 `rightsVerified:false`, `displayEligible:false`다. 현행 R26 캐시는 기사 본문을 포함하지 않는다.
- 28건은 원래 주장된 27건보다 1건 많으며 GOV.UK가 6건 → 7건으로 변경되었다. 수집 기준과 원본 메타데이터를 임의로 교체하지 않는다.
- 기사 제목 키워드 일치는 28/28이지만, 이것이 원문 사실검증·저작권 승인·상세 요약 통과를 뜻하지 않는다.

## 게이트와 호출 계약

1. **R26 후보 확인**: 기존 `ui-news-publication-gate-r1.mjs`의 엄격한 스키마/식별자/시간·URL 검증 재사용.
2. **별도 승인본 확인**: 기존 `parseReviewedNewsInput` 및 `toDisplayNewsItem`을 재호출해 한국어 제목·요약·영향도·출처별 권리 증명을 검증한다. BBC와 UN의 별도 증명 조건을 우회하지 않는다.
3. **정확한 결합**: R26 `sourceUrl`, 출처 ID 매핑, `publisherDeclaredPublishedAt`가 승인본과 동일해야 수용한다. 중복 승인·다른 기사로 바꿔치기·불완전한 승인 기록은 전체 실행을 중단한다.
4. **검증 후 자동 연결**: 기존 `runIranNewsDisplayMaintenance`에 승인 레코드를 전달한다. `--mode=dry-run`은 읽기 전용, `--mode=apply`는 PC 표시 캐시만, `--mode=publish`는 기존 승인된 D1 게시기를 이용한다.
5. **공개 창 및 보존**: PC 30일 후보/표시 캐시와 사이트 KST 14일 공개 창을 보존한다. 14일 밖 기사는 승인되더라도 웹 화면에 자동 노출하지 않는다.
6. **안전한 실행**: `publish`는 사전 dry-run 검증을 거친 뒤에만 PC용 D1 설정을 읽는다. 승인 입력이 없으면 `apply`와 `publish`가 거부된다. 후보 파일을 수정하거나 Git에 승인본을 저장하지 않는다.

## PC 실행 예시 (실행 전 운영 경로·승인본 확인)

아래는 운영 PC에서 사용할 경로 예시다. 이 문서의 존재는 PC 작업 등록이나 실제 게시가 완료됐다는 뜻이 아니다.

```cmd
node scripts\iran-progress\news-r26-reviewed-link-r1.mjs --candidates=E:\ZGmini\data\iran-progress-r13\news-display-candidates-r26.json --mode=dry-run
node scripts\iran-progress\news-r26-reviewed-link-r1.mjs --candidates=E:\ZGmini\data\iran-progress-r13\news-display-candidates-r26.json --reviewed=E:\ZGmini\data\iran-progress-r13\news-reviewed-approved-r1.json --mode=dry-run
node scripts\iran-progress\news-r26-reviewed-link-r1.mjs --candidates=E:\ZGmini\data\iran-progress-r13\news-display-candidates-r26.json --reviewed=E:\ZGmini\data\iran-progress-r13\news-reviewed-approved-r1.json --mode=apply
node scripts\iran-progress\news-r26-reviewed-link-r1.mjs --candidates=E:\ZGmini\data\iran-progress-r13\news-display-candidates-r26.json --reviewed=E:\ZGmini\data\iran-progress-r13\news-reviewed-approved-r1.json --mode=publish
```

PC 운영에서 `ZGMINI_IRAN_HOME`은 실제 승인된 데이터 디렉터리를 가리켜야 한다. 예시 실행 전 현재 운영 원장·캐시·작업 등록 상태를 확인한다. `--apply`와 `--publish`는 하나의 실행에서 자동 재시도하지 않는다.

## 출처별 기사 검증 원칙

| 출처 | 연결 가능 조건 | 자동 승인 여부 |
| --- | --- | --- |
| GOV.UK | OGL 적용·제3자 예외·한국어 원문 기반 요약 확인 | 별도 기사 검증 필요 |
| Tasnim | 자체 기사 CC BY 4.0, 저작자/링크/개작 표시·원문 기반 요약 | 별도 기사 검증 필요 |
| UN | UN 뉴스 사용 범위·출처·통지 기록·한국어 요약 확인 | 통지 확인 전 보류 |
| BBC | BBC 텍스트를 복사하지 않은 독립 사실 작성·별도 근거 URL | 독립 검증 전 보류 |

- GOV.UK 이용약관: https://www.gov.uk/help/terms-conditions
- Tasnim 사이트 라이선스: https://www.tasnimnews.ir/en
- UN 뉴스 이용 조건: https://www.un.org/en/about-us/copyright/
- 한국저작권위원회의 외국 기사 번역 안내: https://www.copyright.or.kr/customer-center/faq/list.do?counselfaqno=44187&searchcounselfaqno=44187

## 현재 실제 운영과의 경계

- 이번 모듈은 실행 가능한 연결 코드이지만 PC에서 R26 수집 직후 자동 호출하도록 **작업 스케줄러를 수정하지 않았다**.
- 기사별 승인본 생성기와 PC 실행 여부는 별도 검증이 필요하다. 따라서 이 변경만으로 28건이 자동 공개되었다고 보고하지 않는다.
- 테스트는 합성 승인 데이터가 정확히 연결되는지 확인하며, 실제 28건의 권리 승격은 수행하지 않는다.
