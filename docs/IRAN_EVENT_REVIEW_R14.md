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

## 최근 공식 경보 추가 대조 — 2026-10-09

UKMTO WARNING 158-26 원본 PDF를 공식 웹 도구로 읽었다. 문서에는 2026-10-07 19:00 UTC, Qatar Madinat ash Shamal 북쪽 51 NM, 유조선의 복수 발사체 피격 보고, 사상자 보고, 조사 진행이 명시되어 있다. 공격 주체·사상자 수·선박 피해 정도는 명시되지 않는다. 다른 기사와 게시 날짜가 달라도 사건 발생일은 10월 7일로 구분한다.

공식 PDF: https://www.ukmto.org/-/media/ukmto/products/20261007-ukmto_warning_158-26.pdf?rev=3df160b409f54ef4bedbbd2c0ac535fc

PC에서 해당 원본 다운로드를 1회 시도한 결과 HTTP 403이었다. 웹 도구의 원문 열람 성공과 PC 자동 수집 제한을 구분하며 재시도·접근 우회는 하지 않았다. PC 원본 PDF를 저장했다고 보고하지 않는다. 공식 보고의 구조화 날짜·위치·보고 내용·짧은 발췌·출처·발췌 해시를 SQLite source receipt에 저장하고 재조회했다. 이 기록은 사건 VERIFIED나 전체 관측 범위를 대신하지 않는다.

해당 사건을 별도 PENDING_REVIEW 원장에 저장하고 재조회했다. 이란 연관성·공격 주체·피해 강도·호르무즈 평가 범위 연관성이 미확인이다. 호르무즈 material 보류 표시는 평가에서 누락을 막는 보수적 관련성 후보이며 실제 위치를 호르무즈 해협 내부라고 확정한 것이 아니다. 관련성을 확정하거나 제외할 때 revision으로 정정해야 한다. 현재 중요한 보류 사건 2개, VERIFIED 사건 0개다. 저장된 입력 계산은 PENDING/null, D/C/M/H/N 미충족을 유지한다.

외교 관련 추가 검색에서 10월 6일 Qatar 중재자 발언의 재인용 보도는 찾았으나 해당 날짜의 공식 원문을 확보하지 못했다. 6월 공식 Qatar 문서를 10월 현재 상태로 적용하지 않았다. UN의 과거 휴전 환영 발표도 최근 실제 이행을 증명하지 않는다. 핵 협상은 기존 공식 9월 자료와 재인용 기사만으로 승인된 최신 단계 점수를 확정하지 않는다.

이번 추가 대조는 데이터 원장·문서 변경이며 검증 코드 변경이 없다. 동일 코드에 대한 109개 회귀 PASS 증거를 재사용했다. 실제 신규 사건 저장 및 로컬 계산 실행은 별도 확인했다. 공개 게시·main 병합·Cloudflare 배포는 미실행이다.

## 공식 재료 추가 검증 — 2026-10-09 후속

- UKMTO WARNING 156-26 공식 PDF에서 10월 5일 16:37 UTC 호르무즈 해협 내 유조선 피격·기관실 화재 보고를 확인했다. 발행 당시 사상자·환경 피해가 보고되지 않았다는 문구는 피해 없음 확정이 아니다. 공격 주체·이란 연관성·피해 강도·다른 경보와의 사건 중복은 미확인이다. 웹 PDF 원문 열람 결과를 구조화 receipt로 저장·재조회했다. PC 다운로드는 이번 문서에 대해 시도하지 않았으며 원본 PDF를 로컬 저장하지 않았다.
- 일본 외무성 10월 1일 이란 외무장관 전화 회담 발표를 PC에서 HTTP 200으로 내려받아 미국–이란 간접 대화 진행 문구를 대조했다. 짧은 발췌·본문 해시·발표일을 불변 문맥 receipt로 저장·재조회했다. 과거 대화 진행은 현재 협상 단계·상호 종전 합의·실제 휴전 이행의 확정 근거가 아니므로 현재 입력과 신선도를 갱신하지 않았다.
- 미국 재무부 10월 1일 sb0643 발표를 PC에서 HTTP 200으로 내려받아 미국 군사 해상 봉쇄 언급을 대조했다. 짧은 발췌·본문 해시·발표일을 불변 문맥 receipt로 저장·재조회했다. 이란 관련 봉쇄 언급만으로 호르무즈 전체 폐쇄나 승인된 통항 제한 단계를 확정하지 않았다.

공식 원문:

- https://www.ukmto.org/-/media/ukmto/products/20261005-ukmto_warning_156_26.pdf?rev=300523122300421a82d029ca830b6a16
- https://www.mofa.go.jp/press/release/pressite_000001_02695.html
- https://home.treasury.gov/news/press-releases/sb0643

156-26 사건을 `PENDING_REVIEW`로 저장·재조회했다. 실제 중요 보류 사건은 3개, VERIFIED 사건은 0개다. 경보 식별자가 다르다는 사실만으로 서로 다른 물리적 공격 사건이라고 확정하지 않는다. 실제 로컬 계산과 입력 audit는 PENDING/null, D/C/M/H/N 미충족을 확인했다. 기존 부분 관계 입력은 존재하지만 전체 READY 조건을 충족하지 않는다. 관측 범위·AIS upstream 이용 근거·일별 품질 조건도 미충족이다.

157-26 공식 PDF 열람은 접근 실패, CENTCOM 공식 보도 목록은 HTTP 403으로 각 1회 종료했다. mirror를 공식 원문 검증으로 승격하거나 접근을 우회하지 않았다. 최근 핵 협상 보도의 상충·익명 인용만으로 N 단계 점수를 생성하지 않았다. 검색에서 근거를 찾지 못한 사실은 협상·공격이 없다는 증거가 아니다.

이번 변경은 검증 기록 문서만이며 계산 코드·가중치·schema 변경이 없다. 동일 코드의 기존 121개 회귀 PASS 증거를 재사용했다. 신규 receipt·사건 저장 재조회, 실제 로컬 계산·audit 실행은 별도로 확인했다. Production 재조회·D1 게시·main 병합·배포는 이번 단계에서 실행하지 않았다.
