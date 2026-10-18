# ZGMINI Iran R4 — V22 GDELT 기사 의미 검토 (2026-10-19)

## V21 PC runtime 증거

`ZGMINI_IRAN_R4_V21_RESULT.txt` 실행 EXIT=0: GDELT 원본 일별 아카이브 3개, 전체 315,492행. CAMEO 전선 코드 조합·충돌 후보 491행, 언론사 URL 필터 통과 31행, 보고서 출력 공개 URL 19개.

**실제 검증 사건 0건 / 28일 독립 관측 미검증 / R4 14일 점수 전부 null.** GDELT CODE와 언론사 호스트는 사건·주체·충돌 발생시각의 독립 확인이 아니다.

## V22 외부 공개기사 원문 검토

원문 링크 19개 중 11개 유형을 재검토했다. 실제 전투사실의 추가 확인 가치가 있는 링크는 3개, 서로 다른 작전으로 취급 가능한 잠정 검토 클러스터는 **최대 2개(9/7 예멘 보도, 10/5 정부군 공세)**. 이 숫자는 검증된 사건 수가 아니다.

| 보도 | 성격 | R4 처리 |
|---|---|---|
| [Anadolu: 러시아의 이란 걸프 안보체제 참여 제안](https://www.aa.com.tr/en/eurasia/russia-calls-for-iran-to-be-included-in-a-gulf-security-system/4050090) (9/7) | 외교 제안 | 신규 이란–미국 공격 아님 |
| [Al Jazeera: 예멘 정부군 후티 진지 공습](https://www.aljazeera.com/news/2026/9/7/yemen-govt-forces-launch-air-strikes-on-houthi-targets) (9/7) | 군사행동 주장 | 발생일·주체·독립 출처 추가 검증 |
| [Al Jazeera: 메카 방위동맹](https://www.aljazeera.com/news/2026/10/5/mecca-alliance-agrees-to-activate-collective-deterrence-measures) (10/5) | 병력 제공 합의 | 신규 공격 아님 |
| [JPost/Reuters: 예멘 정부군 공격](https://www.jpost.com/middle-east/article-910640) + [Guardian: 같은 공세](https://www.theguardian.com/world/2026/oct/05/saudi-forces-recapture-key-areas-strait-houthis-yemen) (10/5) | 같은 대규모 공세의 별개 보도 | 단일 임시 중복 묶음, 공격 수 가산 금지 |
| [Arab News: 레바논 점령 위협](https://www.arabnews.com/middle-east/israel-threatens-to-seize-more-territory-in-southern-lebanon-if-hezbollah-joins-iran-war-3006288) (10/14) | 조건부 위협 | 이란–이스라엘 신규 군사공격 아님 |
| [Arab News/Reuters: 선제공격하지 않겠다는 발언](https://www.arabnews.com/middle-east/netanyahu-says-he-is-not-seeking-to-attack-iran-again-before-israel-election-3006313) (10/14) | 선제공격 부정 | 신규 공격 아님 |
| [DW: 미국–러시아 디젤 계약](https://amp.dw.com/en/how-trumps-diesel-deal-with-russia-will-impact-the-united-states-and-ukraine/a-79658596) (10/14) | 미·러 경제/에너지 | 이란–미국 새 공격 아님 |
| [JPost: 후티 미사일 개발](https://www.jpost.com/international/article-911636) (10/14) | 군사 역량 개발 | 이란–미국 새 공격 아님 |
| [JPost: 이란 지도부 미국 재공격 우려](https://www.jpost.com/middle-east/article-911729) (10/14) | 향후 공격 예측 | 발생 확정 안 됨 |
| [Arab News: 사우디 국민 정신 칼럼](https://www.arabnews.com/opinion/saudi-arabias-national-spirit-in-the-face-of-houthi-attacks-3006284) (10/14) | 과거 공격 논평 | 신규 공격 아님 |

나머지 8개 표본은 **UNREVIEWED**. GDELT 데이터가 갖는 `sqlDate`와 `gdeltFirstSeenDate` 및 10/19 기사 원문 검토 시점을 구분. 특히 9/7 게재된 예멘 공습 보도에 등장하는 이전 일자 사건을 임의로 9/7 신규 공격으로 기록하지 않는다.

[GDELT 원본 데이터 설명](https://gdeltproject.org/data.html): 2013년 이후 1.0 일별 파일은 실제 발생일이 아니라 뉴스에서 처음 확인된 날짜 기준; [이벤트 코드북](https://data.gdeltproject.org/documentation/GDELT-Event_Codebook-V2.0.pdf)도 사건 날짜, 수집 시각, URL을 구별한다.

## 구현 및 안전

`lib/iran-progress/gdelt-story-relevance-v22.mjs`: 입력 기사 URL/기사 발견일/사건일 후보/검토일/작전 중복 키를 명시적으로 구분. 기사 2개가 같은 작전이면 뉴스 링크만 중복 보존하고 공격 건수는 부풀리지 않는다. 위협, 역량, 외교, 논평은 군사 공격으로 자동 승격하지 않는다. 검증 전 `pcReceiptVerified=false`, `actorVerified=false`, `scoreEligible=false`, `r4Score=null`.

`tests/iran-r4-v22-gdelt-story-relevance.test.mjs`는 사용자 PC 로그의 공개 URL 19개를 **합성 이벤트 ID fixture**로 구성한 순수 테스트다. PC 실제 원문·키·저작권 보호 콘텐츠 포함 없음. DB·D1·수집·Ollama·배포·산식·가중치·TTL·스케줄 변경 없음. Draft PR은 운영 배포 승인 아님.

## 다음 필수 작업

외부 조사에서 구체적 사건 단위를 검증한 후 PC 원장에 허가된 source receipt로 연결해야 한다. 먼저 10/5 예멘 작전과 9/7 공습 주장 발생일·중복을 대조하고 UKMTO/MPA 해상 사건을 별도로 유지. **9/7~10/18 전체 관측과 IRN_USA/IRN_ISR/YEMEN_HOUTHI/N/H 증거가 확보되지 않으면 일별 R4 점수를 계산하지 않는다.**