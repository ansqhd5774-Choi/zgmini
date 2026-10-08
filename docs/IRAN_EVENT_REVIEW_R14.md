# 이란 사건 검토 R1.4 — 2026-10-09

## 실제 저장 자료 정리

`node scripts/iran-progress/review-queue-r14.mjs`는 기존 SQLite 후보만 읽어 검토 목록을 저장한다. 이란/IRGC 행위자, 이란 지역, 이란·호르무즈·대리세력 URL 단서를 선별하며 선별 밖 후보도 삭제하거나 무관 사건으로 확정하지 않는다.

실제 후보 121,231개 중 11,937개를 선별해 동일 기사 URL 기준 4,772개 묶음으로 저장했다. 반복 기사 행 7,165개를 묶었다. URL이 같아도 사건이 하나라고 판정하지 않으며, 서로 다른 매체가 같은 통신사·대변인을 인용하면 독립 근거로 인정하지 않는다. 발생일·귀속·피해 규모는 계속 미검증이다. 원래 후보 상태와 verified-input은 변경하지 않는다. SQLite 불변 receipt와 checkpoint 저장 후 read-back을 확인했다.

## 공식 자료 확인과 운영 연결

- MARAD 2026-011의 공식 상세 페이지는 Active 상태이며 이란 관련 해상 위험과 GNSS 교란을 안내한다. 경보 내용은 특정 날짜의 공격 건수나 통항 제한 단계 확정 근거가 아니다.
- 기존 수집이 이미 내려받는 MARAD Advisories에서 관련 문서 identity를 추출해 별도 문맥 receipt/checkpoint로 보존한다. 추가 목록 HTTP 요청은 하지 않는다. 실제 HTTP 200 수집에서 관련 문서 3개를 추출했다. Alerts의 활성 항목 없음과 Advisories의 존재를 구분한다.
- 9월 중순 이란 소형 선박 사건의 공개 AP/Axios 보도는 CENTCOM 관계자 발언을 공유한다. 미국 측 설명과 이란 측 어선 설명의 차이를 정리해야 하며, 보도 2개라는 이유만으로 독립된 사실 검증 2건으로 승격하지 않는다. 이 사례는 검토 보류이며 VERIFIED 사건으로 저장하지 않았다.
- UN 사무총장 9월 25일 면담 readout 직접 경로는 브라우저 확인을 요구했다. 우회하지 않았으며 mirror를 공식 원문 검증으로 사용하지 않았다.

공식 위험 경보: https://www.maritime.dot.gov/msci/2026-011-persian-gulf-strait-hormuz-and-gulf-oman-iranian-attacks-commercial-vessels

검토 보도: https://apnews.com/article/98b49e9a5e10452ae8da42191205ab53 , https://www.axios.com/2026/09/15/us-iran-boats-navy-drone-strait-hormuz

## 검증 상태와 다음 필수 작업

### 사건 원장과 계산 연결 — 후속 실행

`event-review-r14.mjs`는 검토 제안이 자기 문서의 사실 검증을 승인할 수 없도록 한다. `FIXED_RULE` 사실 문서가 불변 source ledger의 `fact-assertion:<id>`에 동일 내용으로 존재해야 기존 VERIFIED gate에 사용할 수 있다. 그 외는 후보 문서로 취급한다. 중요한 미해결 문제가 남으면 VERIFIED 쓰기를 거부한다. 동일 검토는 기존 revision을 재사용하고 변경된 검토만 새 revision을 남긴다.

실행: `node scripts/iran-progress/event-review-r14.mjs --review=<PC 검토 JSON 경로>`. 단일 검토 또는 최대 32건 배열, 최대 256 KiB를 허용한다. 각 검토는 proposal(eventId/material/facts/evidence), documents(짧은 발췌·sourceUrl/textHash·출처 속성), holds(보류 사유 코드)를 포함한다. 뉴스 문구는 실행 지시로 처리하지 않는다. lease·불변 원장·저장 재조회 후 기존 입력으로 로컬 계산하며 관측 범위·관계 입력을 승격하거나 D1에 게시하지 않는다. 실제 저장 검토 재입력에서 1건 재사용, 저장 검증, PENDING/null을 확인했다. 관련 회귀 검사 109개 통과.

실제 9월 14일 Larak/Kargan 소형 선박 사건을 Axios 보도와 Mehr의 원래 지방 당국자 보도를 대조했다. Mehr 원문은 어선 공격·실종을 보도하지만 해당 본문 자체에서 미국을 공격 주체로 명시하지 않는다. Axios의 미국 측 설명만으로 이 간극이나 피해 규모를 확정하지 않는다. 원문 전체 대신 짧은 발췌·URL·해시·보류 사유를 저장했다.

이 사건은 `PENDING_REVIEW`, material=true, 발생 시각/강도 null, 관계 단서 IRN_USA, 호르무즈 관련으로 불변 사건 원장에 저장·재조회했다. pending의 verifiedAt은 기존 revision 선택 규격의 검토 순서 필드이고, 사실 검증 성공 시각이라는 의미가 아니다. 실제 VERIFIED 사건 0개, 중요한 보류 사건 1개다. 기존 저장 입력과 원장으로 로컬 계산을 수행하여 PENDING/null, D/C/M/H/N 미충족을 확인했다. 관측 범위나 verified-input을 승격하지 않았다. 공개 게시하지 않았다.

핵 협상도 GOV.UK와 EEAS 공식 9월 성명을 확인했다. 사찰 접근 미확인은 핵 협상의 BREAKDOWN·협상 합의·검증 완료와 동일하지 않으므로 임의로 0 또는 100을 넣지 않았다. 과거 성명을 오늘의 관측으로 갱신하지 않는다.

추가 원문: https://en.mehrnews.com/news/247757/Several-Iranian-fishermen-missing-after-drone-attack-on-boats

공식 핵 관련 성명: https://www.gov.uk/government/speeches/implementation-of-the-npt-safeguards-agreement-in-iran-quad-statement-to-the-iaea-board-of-governors-september-2026

사건 원장 후속 회귀 검사는 중요한 pending 사건이 완전한 coverage fixture에서도 군사 점수를 차단하는지, 신뢰 원장 없는 자체 VERIFIED 주장 기각, 실제 검증 gate 보존, 반복 검토 재사용을 확인한다.

관련 회귀 검사 105개 통과. 실제 검토 목록 저장과 MARAD 문맥 수집을 확인했다. D1 쓰기·점수 계산·main 병합·Cloudflare 배포는 이번 단계에서 실행하지 않았다.

VERIFIED 사건과 READY 점수는 아직 생성하지 않았다. 군사·해상 사건별 발생일/귀속/강도를 독립 근거로 검증하고, 외교·휴전·핵 협상 관계별 공식 입력 및 관측 범위를 완성해야 한다. AIS upstream 이용 근거·일별 품질 미충족도 유지된다. 현재 자료만으로 점수를 생성하거나 공격 0건으로 채우지 않는다.
