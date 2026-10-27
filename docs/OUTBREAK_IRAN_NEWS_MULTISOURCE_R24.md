# 이란 아웃브레이크 뉴스 수집 전담 — 기존 7출처 수집 검사 R24

- 조사·구현일: 2026-10-27 UTC
- 목표: 기존 이란 R3 산식용 6개 기관·7개 피드를 재활용하여 **표시용 기사 검토 후보**를 수집할 수 있는지 별도 검사한다.
- 범위: 외부 공개 뉴스 피드 읽기·메타데이터 추출·관련 키워드 탐색·동일 URL 중복 제거·출처별 부분 실패 탐지.
- 금지: 번역, 카드/UI 변경, 산식/R3 원장·체크포인트 변경, D1 게시, 기존 Windows 작업 수정, 자동 발행, 권리 미확인 기사의 공개.
- GitHub main 작업 시작시점: `f93355a8d4d8a592318fa301845e0aef45259b61`.
- 작업 이력: 초기 R24 조사 시 별도 임시 브랜치를 사용했으나, 2026-10-27에 R23·R24·R25 검증 코드를 전용 `codex/outbreak-iran-news-retention-r1-20261026` 브랜치에 선별 통합했다. 임시 브랜치는 후속 작업 기준으로 사용하지 않는다.

## 1. 실제 HTTP·파싱 확인

2026-10-27 11:02 UTC 무렵 7개 출처의 **공개 엔드포인트 10개**를 읽었다. GOV.UK는 Iran, Saudi, Yemen, Houthi 4개 Atom 키워드를 사용한다. `curl` GET을 통과한 본문을 R24 검사기에 넣은 실측 결과다.

| 출처 | 엔드포인트 | 원시 항목 | 정상 추출 | 제목/설명/URL 주제 후보(중복 제거 후) |
| --- | ---: | ---: | ---: | ---: |
| Tasnim | 1 | 20 | 20 | 11 |
| GOV.UK | 4 | 80 | 80 | 19 |
| IAEA 뉴스 | 1 | 15 | 15 | 0 |
| IAEA 성명 | 1 | 15 | 15 | 4 |
| BBC 중동 뉴스 | 1 | 26 | 26 | 6 |
| 알자지라 | 1 | 25 | 25 | 3 |
| UN 중동 뉴스 | 1 | 30 | 30 | 11 |
| **합계** | **10** | **211** | **211** | **54** |

검사기의 반환 상태는 `CANDIDATES_REQUIRE_REVIEW`, `sourcesRead=7`, `sourcesFailed=0`, `candidatesFound=54`였다. 이 수치는 실행 시점의 공급 목록에 대한 **1차 발견 건수**다. `publishedAt`이 확인된 최근 14일 공개 가능 기사 수, 전체 전 세계 언론 보도 수, 수집 완전성의 증명은 아니다.

## 2. 실제 발견한 자료 형식 차이

1. **IAEA RSS**: 공식 제공 링크가 `http://www.iaea.org/...`이고 일부 `pubDate`가 `26-10-27 07:29` 형식이다. 정확히 `www.iaea.org`인 공식 링크에 한해서만 HTTPS로 정규화한다. 날짜가 표준 ISO 또는 RFC 형태가 아니면 임의 시간대를 붙여 원문 최초 발행 시각으로 만들지 않는다.
2. **Tasnim**: HTML에 정상 `<!DOCTYPE html>` 선언이 있어 XML과 같은 DTD 금지 규칙을 적용하면 오탐지된다. `/en/news/YYYY/MM/DD/...` 링크를 수집하되 **URL 슬러그를 실제 기사 제목으로 둔갑시키지 않는다**. 최초 발행 시각과 실제 제목은 기사별 별도 확인이 필요하다.
3. **BBC/알자지라**: RSS URL에 `at_medium`, `at_campaign`, `traffic_source` 등 추적 쿼리가 있을 수 있다. 키를 제한하여 제거하고 동일 원문 링크 중복만 줄인다. 영상 링크는 별도 확인 대상으로 식별한다.
4. **GOV.UK**: 4개 키워드 첫 페이지를 모두 읽고 URL 중복을 제거한다. R23의 2페이지 이상 검사는 별도다. Atom의 수정일은 최초 발행일로 취급하지 않는다.

## 3. 권리와 공개 사이의 경계

- **기사 발견 허용**과 **사이트에 제목/요약을 재게시할 권리**는 별개다. R24 후보는 항상 `rightsVerified=false`, `displayEligible=false`, `originalPublicationVerified=false`, `scopeVerifiedFromArticle=false`다.
- 영문 피드 원문 제목은 `feedTitle`로만 기록한다. Tasnim은 실제 제목을 수집하지 못했으므로 `feedTitle=null`이다.
- 피드 설명에 키워드가 등장해도 기사 본문 관련성·발행일·휴전/확전 분류를 자동 확정하지 않는다.
- GOV.UK 저작물 재사용은 OGL 및 개별 콘텐츠 예외 확인을 따른다: https://www.gov.uk/help/reuse-govuk-content
- BBC는 비즈니스 RSS 사용에 허가/비용 요건이 있다: https://downloads.bbc.co.uk/usingthebbc/bbc_terms_of_use_19September2022english.pdf
- AP Media API와 Reuters Connect는 라이선스 계약 경로가 있으므로 무료/미승인 상태에서 새 공개 매체로 간주하지 않는다: https://api.ap.org/media/v/docs/Getting_Started_API.htm · https://www.reutersconnect.com/
- UN도 뉴스 재사용에 출처 표기·통지 등 조건이 있어 자동 공개하지 않는다: https://www.un.org/en/about-us/copyright/

## 4. 실행·테스트

기존 프로젝트 실행 환경과 Node가 준비된 경우 읽기 전용으로 다음을 실행한다.

```cmd
node scripts\iran-progress\news-display-multisource-audit-r24.mjs --probe
```

- `--probe`만 허용하고 JSON을 표준 출력으로 반환한다. 저장·게시·스케줄러 변경을 수행하지 않는다.
- 일부 원본 실패 또는 일부 파싱 누락 시 `PARTIAL_SOURCE_FAILURE`와 종료 코드 2를 반환한다. 정상 0건과 실패를 혼동하지 않는다.
- 자동 테스트: `node tests/iran-news-multisource-audit-r24.test.mjs`.
- 별도의 기존 산식 테스트와 TypeScript/ESLint 회귀는 실행 기록으로 검증한다.

## 5. 다음 운영 단계 — 미실행

1. 기사마다 실제 제목·본문 접근성과 최초 발행일을 확인한다. 단순 RSS 날짜·HTML 경로 날짜만으로 14일 게시 대상을 판정하지 않는다.
2. 추가 매체별 제목·본문 기반 수집권과 ZGMINI 표시권을 구분한다. 비허가 후보도 원본 링크 중심으로 내부 발견 기록에만 남긴다.
3. 필요한 뉴스 표시 후보만 **기존 PC 승인 경로**의 별도 뉴스 자료에 통합하고 읽기 검증한다. R3 뉴스 점수·원장·번역 처리와 합치지 않는다.
4. 라이선스 및 원문 검증이 끝난 개별 기사만 기존 표시 캐시 → D1 → API → 사이트 검증 절차를 밟는다. 별도 명시 없이는 새 매체의 자동 공개를 시행하지 않는다.

**현재 단계: 7개 출처 검토 후보 탐색 코드와 수집 테스트 준비. PC 운영 연결·공개 게시·번역은 미실행.**
