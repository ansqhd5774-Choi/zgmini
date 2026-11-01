# 이란 전쟁 주요 뉴스 — PC 확인 로그 및 원문 검토 R1

- 확인일: 2026-10-26 (KST)
- 작업 브랜치: `codex/outbreak-iran-news-retention-r1-20261026`
- 입력 증거: 사용자가 제공한 두 번째 `IRAN_NEWS_R1_RESULT(1).txt`
- 실행 코드 고정 SHA: `f81416f2519633d2dae1a9ed9efa1c6607ef6a32`
- 범위: 후보 검색·읽기 전용 캐시 검사·개별 뉴스 관련성 예비 검토. **실제 수집 저장, 삭제, D1 게시 및 사이트 공개는 아직 실행하지 않음.**

## 1. 사용자 PC에서 확인한 실제 결과

| 필드 | 확인값 | 해석 |
| --- | ---: | --- |
| `feedEntries` | 20 | GOV.UK Atom 조회 성공 |
| `apiChecked` | 20 | GOV.UK Content API 최초 발행일 검사 |
| `apiFailed` | 0 | API 실패 없음 |
| `old` | 4 | 최초 발행일이 최근 30 KST 날짜 밖 |
| `count` | 16 | **30일 기사 검색 후보**. 관련성·재게시 권리를 통과한 개수가 아님 |
| `DISCOVERY_EXIT` | 0 | 읽기 전용 검색 명령 성공 |
| 캐시 `before/received/after` | 0/0/0 | 표시 전용 캐시가 비어 있고 승인된 신규 투입도 없음 |
| `RETENTION_DRY_RUN_EXIT` | 0 | 삭제/쓰기 없이 30일 보존 로직 실행 |
| `FINAL_STATUS` | `PASS_READ_ONLY` | Windows 읽기 전용 검사만 PASS |

- 기존 R3/R5 원장·점수·체크포인트를 건드리지 않았다.
- 후보 16건 전부 `rightsVerified:false`, `displayEligible:false`인 채 반환되었으며 자동 게시되지 않는다.
- `2026-10-26` 기준, 사이트의 **최근 14개 KST 날짜는 10/13~10/26**이다. 검색 후보 16건 중 해당 날짜에 최초 발행된 것은 **7건**이고, 나머지 9건은 PC 30일 창 안이지만 공개 14일 창 밖이다.
- 검색 결과는 `first_published_at`을 이용하여 구분하므로 수정일/발견일을 기사 발행일로 바꾸지 않았다.

## 2. 최근 14일 후보 7건 — 개별 원문 관련성 검토

판정은 **뉴스 표시 관련성만** 검토한 것이며, 저작권 최종 승인/PC 저장/게시 승인과 다르다.

| 최초 발행(KST) | 원문 | 관련성 판정 | 이유 | 공개 |
| --- | --- | --- | --- | --- |
| 10/24 | [이스탄불 R4 외교장관 공동 발표](https://www.gov.uk/government/news/joint-press-release-on-the-r4-ministerial-meeting-in-istanbul) | **직접 관련** | 미·이스라엘·이란 분쟁 및 호르무즈 긴장, 외교적 해법 명시. 다국가 공동발표의 권리 범위 확인 필요 | 보류 |
| 10/23 | [영국 국방참모총장의 Dragon Group 회의](https://www.gov.uk/government/news/chief-of-defence-hosts-tenth-dragon-group-meeting-in-london) | **직접 관련** | 미·이란 분쟁을 회의 논의 사안으로 명시. 전황의 새로운 확전/완화 사실 자체는 발표되지 않음 | 보류 |
| 10/20 | [법무총장 국제법 관련 연설](https://www.gov.uk/government/news/attorney-generals-speech-at-the-london-conference-on-international-law-2026) | 배경·영향 | 이란의 호르무즈 봉쇄와 영국 물가·교역 영향을 설명하나 발행 주제는 일반 국제법. 연설 현장 날짜는 10/1, 페이지 최초 발행은 10/20 | 보류 |
| 10/15 | [유엔 군축위 정보 환경 관련 영국 발언](https://www.gov.uk/government/speeches/we-are-witnessing-an-industrial-scale-assault-by-hostile-actors-like-russia-on-the-information-environment-in-the-uk-uk-statement-at-the-un-first-comm) | 이란 전쟁 주요 뉴스로 부적합 | 이란의 핵 안전조치 이행을 한 차례 언급하지만 핵심 내용은 다국적 안보/정보전 | 제외 권고 |
| 10/15 (KST) | [OSCE 억지력 관련 발언](https://www.gov.uk/government/speeches/deterrence-is-not-a-threat-uk-statement-to-the-osce) | 부적합 | 이란은 러시아-우크라이나 전쟁 지원 맥락에서만 등장 | 제외 권고 |
| 10/14 | [외무장관 세계 금융시스템 연설](https://www.gov.uk/government/speeches/foreign-secretary-ed-miliband-speech-a-global-financial-system-that-works-for-all-action-on-debt-investment-and-resilience) | 배경·영향 | 이란 전쟁으로 인한 식량·연료 물가 영향을 언급하지만 본론은 국제 부채·투자 정책 | 보류 |
| 10/14 | [예멘 주재 대사 교체 발표](https://www.gov.uk/government/news/change-of-his-majestys-ambassador-to-yemen) | **부적합** | 'Iran'은 새 대사의 과거 근무 이력에 등장할 뿐, 전쟁 관련 소식이 아님 | 제외 권고 |

**분류 합계:** 직접 관련 2건 / 배경·영향 2건 / 부적합 3건. 이 수치는 14일 후보에 한정하며, 자동 선정 기준이나 고정 게시 개수를 뜻하지 않는다.

## 3. 상업적 공개 전 확인할 권리

- [GOV.UK 재사용 안내](https://www.gov.uk/help/reuse-govuk-content): GOV.UK 콘텐츠 재사용은 OGL 조건 준수 필요.
- [GOV.UK 이용약관](https://www.gov.uk/help/terms-conditions): 대체로 Crown copyright 및 OGL이지만 제3자/예외 사항은 구분해야 한다.
- [영국 국가기록원 OGL](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/): 허용 범위와 출처·면책 표기를 따라야 한다.
- 외교 공동성명은 영국 정부 사이트에 게시됐다는 사실만으로 다국가 공동 작성 본문의 권리 범위를 자동 확정하지 않는다. 제3자 사진·로고·본문은 모두 제외하거나 별도 확인한다.
- 기사별 검증 완료 전 `rightsVerified:true`를 부여하지 않는다. 한국어 자체 작성 요약과 `impact` 판정도 원문 의미와 대조한 뒤에만 적용한다.

## 4. 다음 작업 및 금지 범위

1. 최근 14일 직접 관련 후보 2건부터 **텍스트 사용권·제3자 권리·한글 자체 요약·영향 중립/긍정/부정**을 기사별로 검토한다. 배경·영향 2건은 '주요 뉴스' 적합성 추가 검토 없이 자동 게재하지 않는다.
2. 검색 중 발견한 부적합 기사 3건은 PC 공개 후보에서 제외할 것을 권고한다. 영국 정부의 발언에 'Iran'이라는 단어가 존재한다는 이유로 게시하지 않는다.
3. 기존 브랜치의 rights gate와 14일 필터를 그대로 유지한다. 필터/산식/DB/스케줄러를 임의 변경하지 않는다.
4. PC 실제 30일 만료 삭제는 **현재 캐시 0건이라 효과 검증이 불가능**하므로, 유효한 표시 전용 데이터가 적재되고 대상이 확인될 때만 건별 dry-run과 read-back 후 시행한다.
5. 운영 PC의 **실제 소스 SHA·정식 실행 경로 확인** 없이 기존 runner/예약 작업을 수정하지 않는다.
6. D1 실제 게시·PR/main 병합·배포는 후속 Gate를 통과하기 전 실시하지 않는다.

## 5. 검증 상태 구분

- GOV.UK 공개 API 응답 확인: **PASS** (사용자 Windows PC 로그)
- 30일 조회/14일 창 계산: **PASS** (후보 목록 및 정책 계산)
- 기사 내용과 이란 관련성: **부분 검토** (최근 14일 7건 수작업 비교)
- 개별 기사 이용권/실제 기사 요약: **PENDING**
- 실제 PC 캐시 저장·30일 삭제: **NOT_RUN**
- D1 read-back / 공개 API / UI / Cloudflare 배포: **NOT_RUN**
