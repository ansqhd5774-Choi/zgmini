# R10 R49: PSKY → SKYD 발행사 공시 증빙 (연구 검토용)

검토일: 2026-11-02  
상태: `ISSUER_TICKER_CHANGE_CONFIRMED / R10_B_AUTO_PROMOTION_NOT_AUTHORIZED`

## 직접 확인한 발행사 원문

1. 2026-10-02 Paramount Skydance 발행사 공시: 기존 Nasdaq의 동일 Class B 보통주를 NYSE로 이전하면서 2026-10-06부터 종목 기호를 `PSKY`에서 `SKYD`로 바꿀 *예정*임을 설명한다. 원문: https://ir.paramount.com/static-files/36b6ca19-67e4-4787-94ee-8c4c1373e0ac
2. 2026-10-13 Skydance Corporation 발행사 보충 FAQ: 2026-10-06 NYSE 상장 및 동 Class B 보통주 기호 `PSKY` → `SKYD` 변경이 *실제로 이루어졌음*을 설명한다. 원문: https://ir.paramount.com/static-files/65495267-8319-42e3-9b30-4c869fb355fb

## 좁은 결론

- 발행사 수준에서 2026-10-06의 `PSKY` → `SKYD` 기호 변경은 해당 **Class B 보통주**를 대상으로 발생한 것으로 확인할 근거가 있다.
- 이 사실만으로 개별 날짜의 공식 S&P 500 PIT 편입 원장, 제공업체의 거래 종목/가격 ID, 기업행위 소급 조정, `PARA` → `PSKY` 이전 증권 교환을 동일 가격 시계열로 자동 승격할 수는 없다.
- `asset-r10-pit-identity-audit-r1.mjs`의 기존 연구용 `canPromote:false` 판정과 승인 R10 산식은 그대로 유지한다.

## 남은 증빙

1. 독립된 공식 501거래일 S&P 500 일자별 PIT 원본과 해시를 승인 PC 저장본과 대조.
2. `PARA`/`PSKY`/`SKYD` 각 보통주 클래스, 기업행위 적용일, 공급업체 원본 종목 ID 및 `asof`/split-adjusted 가격의 연속성 검증.
3. 200거래일 가격·최소 252개 유효 쌍·98% 유효 커버리지·월말 3개 점수 및 기존 5개 분기 고정 이력 재현 확인.
4. 원천 이용조건과 비공개 PC 저장·공개 가능한 집계 결과 경계 확인.

위 항목이 끝나기 전에는 신규 B 값을 임의로 생성하거나 Release, D1, 운영 PC에 쓰지 않는다.
