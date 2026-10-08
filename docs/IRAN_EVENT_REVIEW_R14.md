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

관련 회귀 검사 105개 통과. 실제 검토 목록 저장과 MARAD 문맥 수집을 확인했다. D1 쓰기·점수 계산·main 병합·Cloudflare 배포는 이번 단계에서 실행하지 않았다.

VERIFIED 사건과 READY 점수는 아직 생성하지 않았다. 군사·해상 사건별 발생일/귀속/강도를 독립 근거로 검증하고, 외교·휴전·핵 협상 관계별 공식 입력 및 관측 범위를 완성해야 한다. AIS upstream 이용 근거·일별 품질 미충족도 유지된다. 현재 자료만으로 점수를 생성하거나 공격 0건으로 채우지 않는다.
