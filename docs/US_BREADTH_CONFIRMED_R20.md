# 미국 등락 지수 — 전체 시장 확정치 독립 스테이징 R20

## 변경 범위

- `lib/market-breadth/us-marketparquet-confirmed-public-r2.mjs`: **새 전체 시장 확정 후보의 집계 전용 D1 계약 검증**.
- `scripts/pc-writer/us-breadth-confirmed-staging-r20.mjs`: PC 기존 저장 Parquet 2개 파일을 직접 **읽기 전용 재확인**하고, 승인된 원자료 manifest SHA-256와 비교한 후 R19 전체 주식 계산기를 호출한다.
- 결과는 집계값, 대상 종목 수, 수집 적격 수, 누락 수, 날짜, 파일 SHA/바이트/행 수 등 원자료 증빙만 포함한다. 개별 종목, 가격, 원본 파일은 공개 결과에 넣지 않는다.

## 분리·보호

- 기존 확정치 `public:market-breadth-r1:usa`, 기존 일자별 키 `public:market-breadth-r1:usa:YYYY-MM-DD`, 250거래일 이력, R17 IEX 잠정 키를 **읽지도 수정하지도 않는다**.
- R20의 별도 스테이징 키는 `public:market-breadth-confirmed-r2:usa:staging` 한 개다. **일자별 기록은 만들지 않는다.**
- `publishFullMarketStaging`은 기본 `stageWriteEnabled=false`이며 호출 자체가 기존 Core/PC schedule에 연결되지 않았다. 사용자 운영 환경의 D1에 쓰기 실행한 적 없다.
- 샘플 503개 제한을 R19에 복제하지 않고 MarketParquet 실측 주식 종목 수를 분모로 쓴다. **98% 기준은 확정치에만 적용**하고 잠정치는 그대로 보존한다.
- 원자료 `manifest.complete=true`, 실제 Parquet 파일의 날짜·경로·SHA-256 재확인, 동일 조정 기준 및 `stock_daily` 출처를 요구한다. `manifest`가 독립적으로 검증된 실제 공급자 원장이라는 점은 별도 PC Gate에서 반드시 확인한다. 단순히 파일에서 계산한 SHA를 검증용 manifest로 복사하는 것은 독립 출처 검증이 아니다.
- `CALCULATED_UNPUBLISHED`인 R19 계산 후보만 스테이징 준비 가능하다. 본 단계는 **실제 원본파일 완전성/상장시장 범위 검증을 대체하지 않는다**.

## 다음 Gate

1. R18 실제 PC 읽기 전용 감사: 승인 운영 source SHA, MarketParquet 전체 stock_daily 파일 두 날짜, SHA 원장, 상장시장 적격성, 실제 종목수.
2. 기존 공급자 자료가 PC에 저장되지 않았다면 저장 위치/파일 보존/수집 주기 승인 범위 내에서 최소 변경 설계. 기존 250거래일 재수집/재작성 금지.
3. 실측 R19 계산과 R20 검증 동작 및 스테이징 D1 readback (사용자 승인·실제 운영 Gate 확인 후).
4. 기존 확정 API/UI의 503개를 수정하는 공개 전환과 잠정치 운영/표시는 별도 승인된 브랜치/배포 절차로 진행한다.

**R20 작성만으로 새 전체 시장 확정치가 실제 PC/D1/사이트에 게시된 것은 아니다.**
