# Iran R4 V9 — 2026-10-05~18 사건 후보 재조정

**상태: 연구용 / 검증 입력 미승인 / 운영 점수 미변경.** 기존 R3·R4 산식·가중치, D1, PC SQLite, 스케줄, TTL 및 배포 방식 유지.

## 작업

V8 외부 조사에서 정리한 공개 메타데이터 **20건**을 날짜별로 재분류한다.

- 사건·해상 사고 **후보** 16건, 외교·평가·조건부 지원 4건.
- 사건일 **미확정 2건**은 발표일을 사건일로 대체하지 않는다.
- 사건일 뒤늦게 발표된 **5건**은 당시 날짜의 선행지식으로 소급하지 않는다.
- 10/05 UKMTO #156과 *On Peace*는 동일 사건 가능성이 있어 중복 가감점 보류.
- 10/10~11 리야드 공항은 독립 사건 여부 확인 전 합산 금지.
- 10/13 *GFS PRIDE*와 10/14 *GFS GISELLE*는 서로 다른 선박. 10/13 건의 보도일은 10/14.
- 10/09 유엔의 **전면전 전황 평가**는 신규 10/09 공격 1건이 아니다.
- 카타르의 10/06 중재 발표는 휴전 발효가 아니다.
- 이집트의 10/17·18 지원 의사 발표는 실제 군사 참전이 아니다.
- 해상 피격에서 공격 주체가 미확정이면 자동으로 IRN_USA/IRN_ISR 직접 공격으로 처리하지 않는다.

## 확인한 공개기관 근거

- 10/05~07 UKMTO 사고 날짜: https://www.ukmto.org/recent-incidents
- 10/06 카타르 중재 발표: https://mofa.gov.qa/en/qatar/latest-articles/latest-news/details/2026/10/06/foreign-ministry--mediation-efforts-between-washington-and-tehran-continue
- 10/08 공격·10/09 사우디 GACA 발표: https://www.spa.gov.sa/en/w2697151
- 10/09 유엔 예멘 특사: https://dppa.un.org/en/news/yemen-has-returned-to-full-scale-war-special-envoy-warns
- 10/13·14 싱가포르 선박 피해와 10/14 발표: https://www.mpa.gov.sg/media-centre/details/two-singapore-registered-vessels-struck-in-strait-of-hormuz

**공개기관 보고 내용 확인과 운영 PC R4 검증 원장에 기록된 사건 검증은 구별한다.**

## 2가지 14일 이력 모드

- **사후 재구성 EVENT_DATE_RETROSPECTIVE:** 늦게 발견한 사건을 실제 발생일에 배치하되 당시 확인했던 것처럼 주장하지 않음.
- **당시 확인 이력 KNOWN_AS_OF_DAY:** 출처가 당시 **로컬 DB에 저장·검증된 날짜(sourceStoredAt,verifiedAt)**까지 반영해 사용. 보도일만으로 당시 확인 완료 간주 금지.

## 구현

`scripts/iran-progress/v9-reconcile-r4.mjs`: 외부 메타 CSV만 읽는 연구용 순수 함수. 비인가 사건 승인·저장·계산·게시 없음. `tests/fixtures/` CSV는 가공한 공개 연구 후보이며 원문/개인정보/Provider 비밀 자료가 아니다. `tests/iran-r4-v9-reconciliation.test.mjs`는 날짜/중복/외교 상태/결측/허위 신뢰상태를 검사한다.

## 잔여 핵심 Gate

V5~V8 로컬 진단에서 PC 검증 사건 0건, R4 날짜별 독립 입력 0/14를 확인했다. 현재 코드만으로는 **실제 R4 점수 14개를 계산할 수 없다.** 다음 작업은 근거별 원문 확인, 공격자·발생 시점·중복 판정, 9/07부터의 28일 관측 완전성, 군사·휴전·해상·핵 자료별 검증 입력 작성이다. 그때만 R4 Shadow 함수를 날짜별 재계산한다.

산식·점수 구간·가중치 변경이나 분석가 잠정 18점에 맞춘 역산 금지. 검증 안 된 날짜는 `score:null`. 공개 전환·별도 출처 수집·실데이터 게시에는 각각 필요한 승인/검증 Gate 유지.