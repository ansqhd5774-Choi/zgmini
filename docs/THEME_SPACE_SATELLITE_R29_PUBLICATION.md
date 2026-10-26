# 우주·위성 ETF R29 — 신규 공개 Reader 및 독립 저장 키

- 기존 아홉 테마, 기존 ETF 산식·원자료·수집 주기·D1 키는 수정하지 않는다.
- 승인된 우주·위성 ETF 명단은 `theme-space-satellite-r26-approved-roster.json`: UFO, NASA, WARP, ROKT. 고정 최대 종목 수 없음.
- ETF 개별 점수는 승인된 적응형 R2 T40/R20/V40이며, 세 종 이상이면 발행사 증거의 **현재** AUM 비중으로 정규화한다. 신규 AUM API는 추가하지 않는다.
- R28은 PC 저장 원자료 및 SPY의 SHA를 검증하고 실제 252개 관측 점수를 생성한다. 원자료 누락을 0점이나 가상값으로 채우지 않는다.
- R29는 신규 `public_feed_snapshots_v1` 항목 `theme-space-satellite-r1` **하나만** CAS 후 정확하게 재조회한다. 사용자는 프로젝트 전용 PC CMD를 실행한다.
- 방문자 `/api/theme-fear-greed/` GET은 신규 저장 키가 없다면 기존 테마를 그대로 출력한다. 키가 있어도 점수, 소스 SHA, 252개 이력, 날짜, 시각, 승인 목록 검증에 실패하면 기존 출력은 그대로 유지한다.
- 과거 252일은 **현재 ETF 구성 및 현재 AUM 가중치를 소급 적용해 비교한 점수**이며 과거 각 날짜의 AUM을 재구성한 값으로 설명하지 않는다.
- R29 첫 공개 시 상태는 `PUBLIC_API_VERIFIED`여야 한다. `D1_VERIFIED_PUBLIC_API_PENDING`은 D1 저장과 사이트 노출을 구분한 상태이며 공개 완료로 보고하지 않는다.
- CMD 결과는 CMD 위치 `SPACE_SATELLITE_R29_PUBLICATION_RESULT.txt`에 저장된다. `E:\ZGmini\data`에는 SHA 검증한 계산 파생 파일만 저장된다. `%TEMP%`를 사용하지 않는다.
- 새 ETF 수집/스케줄러의 반복 운영은 이 R29 배포가 자동으로 활성화하지 않으며 별도로 검증해야 한다.
