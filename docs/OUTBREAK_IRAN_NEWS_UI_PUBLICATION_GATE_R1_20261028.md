# 이란 뉴스 27건 → 공개 뉴스 전환: UI 사전 검증 R1

- 작업 브랜치: `codex/ui-improvements` (다른 뉴스 수집 브랜치 변경 없음)
- 대상: `/outbreak/?event=iran` 주요 뉴스
- 목적: PC 비공개 후보 27~28건을 기존 공개 9건과 혼동하지 않고, 실제 공개 조건을 확인하는 읽기 전용 검증

## 코드 확인 결과

1. UI `app/outbreak-news-r57.tsx`는 공개 API에서 받은 유효 기사 목록의 건수를 9개로 고정하지 않는다. 화면 너비에 따라 처음 3~4건만 접어 보여주고 나머지는 `뉴스 더보기`로 표시한다.
2. 공개 리더 `lib/iran-progress/news-display-r1.mjs`는 현재 GOV.UK만 허용한다. 공개 데이터는 최근 14개의 KST 날짜로 필터링된다.
3. 수집 담당 R26 비공개 후보 파일은 30개 KST 날짜 보관용이며, `rightsVerified:false`, `displayEligible:false`로만 저장된다. 이 상태의 후보를 임의로 공개 승격하면 안 된다.
4. PC 후보 메타데이터에는 공개용 `summary`, `impact`, 기사별 이용권 승인 영수증이 없다. 제목에 네 키워드가 등장하지 않는다고 본문 검증을 실패했다고 단정할 수도 없다.

## 추가된 읽기 전용 도구 및 검토 단계

- `scripts/iran-progress/ui-news-publication-gate-r1.mjs`: 사용자 PC의 원래 R26 후보 JSON을 **변경하지 않고** 요약 집계한다.
- `tests/outbreak-news-publication-gate-r1.test.mjs`: 비공개 27개 후보의 공개 차단, 14일/30일 차이, 필드 위조·오래된 날짜·무결성 오류 차단, 원본 파일 불변을 테스트한다.
- 파일 이름과 절대 경로를 명시한 경우에만 실행한다. 입력 파일 경로는 사용자 PC의 승인된 뉴스 홈을 기준으로 확인해야 한다.
- `--review` 옵션을 추가해 기사별 발행일, 최근 14일 포함 여부, 원문 URL, 출처별 이용권 검토 경로, 남은 확인 항목을 출력한다. 내용·요약·영향도·권한을 새로 만들거나 승인하지 않는다.

실행 예시(PC에 승인된 해당 소스가 준비된 경우에만):

```text
node scripts/iran-progress/ui-news-publication-gate-r1.mjs --input=E:\ZGmini\data\iran-progress-r13\news-display-candidates-r26.json
node scripts/iran-progress/ui-news-publication-gate-r1.mjs --input=E:\ZGmini\data\iran-progress-r13\news-display-candidates-r26.json --review
```

출력에는 기사 제목·URL·본문·토큰을 포함하지 않는다. 다른 PC 운영 파일, D1, 공개 뉴스 캐시, 스케줄러, 원장에 쓰지 않는다. 이 도구 자체의 통과는 신규 기사 공개 승인이 아니다.

`--review` 모드는 검토자가 원문을 열 수 있도록 **제목과 원문 URL을 출력**한다. 이를 공개 원고로 취급하거나 게시 도구에 입력하지 않는다. 기본 집계 모드는 기존처럼 기사별 제목·URL을 출력하지 않는다.

### 출처별 권한 확인 (2026-10-28 공식 정책 기준)

| 출처 | 확인 근거 | 사전 검토 사항 |
| --- | --- | --- |
| GOV.UK | https://www.gov.uk/help/terms-conditions | OGL 적용 여부와 제3자 자료 예외를 기사마다 확인 |
| IAEA 뉴스/발언 | https://www.iaea.org/about/terms-of-use | IAEA 자체 작성물인지 확인하고 출처 표기·제3자 저작물 제외 |
| UN | https://www.un.org/en/about-us/copyright/ | 뉴스 관련 자료 조건에 맞는 출처 표기 및 UN 통지 여부 확인 |
| BBC | https://downloads.bbc.co.uk/usingthebbc/bbc_terms_of_use.pdf | 별도 사용 허락 또는 허용 가능한 독립 사실 보도 범위 검토 |
| Al Jazeera | https://terms.aljazeera.net/ | 콘텐츠 재사용 허락 여부 별도 확인 |
| Tasnim | 공식 원문의 현재 이용권 표시 직접 확인 필요 | 과거 CC BY 4.0 표기가 알려져 있어도 최신 기사·제3자 자료까지 일괄 승인 금지 |

모든 유형의 기사에서 원문 사실 확인과 독립적인 한국어 요약 작성, 참고 영향 분류를 별도로 완료해야 한다. 키워드 검출과 뉴스 저작권은 무관하다.

## UI 확장 표시

- 공개 API에 실제로 검증된 뉴스 27건이 제공되면 9건으로 잘리지 않는다. 3건(모바일) 또는 4건(넓은 화면)씩 추가 열람하고, `공개 뉴스 n건 중 m건 표시`를 안내한다.
- 형식적인 “상세 내용은 원문에서 확인” 요약을 사실 요약인 것처럼 표시하지 않고 `기사 핵심 요약 미제공 · 원문 확인 필요`로 표시한다. 번역은 화면에 표시된 항목만 시도하고 원문 링크·날짜·영향 분류는 보존한다.

## 공개 전 남은 Gate

1. 실제 R26 후보 파일의 승인된 전달 또는 사용자 PC 읽기 전용 실측.
2. 원문별 발표일·본문 중심성·중복·14일 노출 범위 검토. 키워드 일치만으로 공개 승격하지 않는다.
3. 매체별 및 기사별 재사용권 근거 확인. 승인된 기사에 대해 독립 작성한 한국어 요약과 종전 진전 영향 참고 분류 생성.
4. 승인받은 출처만 공개 데이터 모델과 PC 게시 경로에 추가. 다른 담당 뉴스 수집 브랜치와 작업 충돌 없이 사전 협의.
5. 기존 UI 작업 브랜치에서 회귀 테스트 후 PR 승인·Cloudflare 연동 자동배포·운영 API/UI 조회.

**현재 상태:** UI 사전 점검 코드만 준비. 새로운 기사 공개 0건, 운영 배포 0건. 기존 공개 9건 보존.
