# 시장폭 구현 경계

근거: 사용자 제공 FORMULA_REFERENCE 총람, 4-3절, 세부37~40,
시장폭 Top4 비교, 10-6절, 11절. 과거 배포 SHA/Version은 현재 상태로 재사용하지 않는다.

## 공개 B1

`100 * (0.60 * AdvanceRatio + 0.40 * AdvanceValueShare)`를 유지한다.
AdvanceRatio는 `(UP + 0.5*FLAT)/ValidReturnCount`이며 누적 A/D line이 아니다.
AdvanceValueShare는 동일 관측일 종가×거래량 대용값의 상승/보합 비중이다.
종목 weight는 linked coverage에만 사용한다. 종합 가중치8, 재가중 없음.
return/value coverage 98%, linked weight coverage99%, 미연결 종목 분모 유지.

## Top4는 B1의 네 구성 점수가 아니다

| 번호 | 표시 원자료 | 현재 연결 | 필요한 근거 |
|---|---|---|---|
|37|200DMA 상회 비율 %|PARTIAL/null|당일 complete PIT, 동일 가격 기준 200관측, coverage 계약|
|38|상승 종목 비율 %|검증된 READY B1의 AdvanceRatio ×100|B1 전체 검증 통과. 누적 A/D line으로 표시 금지|
|39|52주 신고가−신저가 종목수|PARTIAL/null|종가/장중, 52주/252관측, 동률 정의 및 이력|
|40|동일가중/시가총액가중 지수 비율|PARTIAL/null|승인 지수쌍, 동일 price/total-return 기준|

Top4 normalized score는 미승인이다. raw 값에 0~100 점수 게이지를 붙이지 않는다.
limit5로 200DMA/52주 이력을 만들지 않는다. RSP/SPY 자동선택 금지.

## 수집 및 권리

Free의 일부 API 접근 가능 여부와 공개 B1 활성화는 별개다.
총람은 PRO 설정과 key 존재 전 호출0, Free/Plus/Pro 미입증 PARTIAL/null을 명시한다.
quota100000은 공개 이용권 자체의 증거가 아니다. 키 값은 기록하지 않는다.
max4 index pages, linked 종목별 prices limit5, 기본 concurrency12.
503회는 예시 1회 수집 비용이며 하루 수집 횟수가 아니다.
현재 PIT 없는 과거 backfill/future-fill 금지. 최대 lag2 completed US sessions.
분할 기준 불명확 종목은 유효성에서 제외하고 coverage를 통과해야 한다.
Data by Equibles 출처를 유지하고 원자료 bulk를 공개하지 않는다.

## 진단 분리

공개 B1로 `breadthScoreRows` 또는 자산버블 진단의 역사 PIT
`breadthDivergence`를 채우지 않는다. 기존 진단 경로를 보존한다.

## 검증 상태 구분

Top4 표시 연결/fixture 테스트는 실제 네 지표 수집 완료가 아니다.
운영 Pro 권리, 장기 PIT 가격 이력, #39/#40 정의가 확보되기 전 실제 값 완료로 보고하지 않는다.
