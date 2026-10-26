# 우주·위성 ETF R29 — 신규 공개 Reader 및 독립 저장 키

- 기존 아홉 테마, 기존 ETF 산식·원자료·수집 주기·D1 키는 수정하지 않는다.
- 승인된 우주·위성 ETF 명단은 `theme-space-satellite-r26-approved-roster.json`: UFO, NASA, WARP, ROKT. 고정 최대 종목 수 없음.
- ETF 개별 점수는 승인된 적응형 R2 T40/R20/V40이며, 세 종 이상이면 발행사 증거의 **현재** AUM 비중으로 정규화한다. 신규 AUM API는 추가하지 않는다.
- R28은 PC 저장 원자료 및 SPY의 SHA를 검증하고 최근 **252거래일 날짜 축**의 산출 가능 점수만 생성한다. 원자료 누락은 `null`로 보존하며 0점이나 가상값으로 채우지 않는다.
- R29는 신규 `public_feed_snapshots_v1` 항목 `theme-space-satellite-r1` **하나만** CAS 후 정확하게 재조회한다. 사용자는 프로젝트 전용 PC CMD를 실행한다.
- 방문자 `/api/theme-fear-greed/` GET은 신규 저장 키가 없다면 기존 테마를 그대로 출력한다. 키가 있어도 점수, 소스 SHA, **252개 날짜와 실제 점수 개수**, 시각, 승인 목록 검증에 실패하면 기존 출력은 그대로 유지한다.
- 2026-10-26 실 PC 검증: 총 252개 날짜 중 실제 점수 105개, 산출 불가 147개, 최신 2026-10-23 점수 44.65075. 결측은 차트에서 선을 연결하거나 0점으로 표시하지 않으며 9개 기존 테마의 252개 확정 점수는 그대로 유지한다.
- 과거 252일은 **현재 ETF 구성 및 현재 AUM 가중치를 소급 적용해 비교한 점수**이며 과거 각 날짜의 AUM을 재구성한 값으로 설명하지 않는다.
- R29 첫 공개 시 상태는 `PUBLIC_API_VERIFIED`여야 한다. `D1_VERIFIED_PUBLIC_API_PENDING`은 D1 저장과 사이트 노출을 구분한 상태이며 공개 완료로 보고하지 않는다.
- CMD 결과는 CMD 위치 `SPACE_SATELLITE_R29_PUBLICATION_RESULT.txt`에 저장된다. `E:\ZGmini\data`에는 SHA 검증한 계산 파생 파일만 저장된다. `%TEMP%`를 사용하지 않는다.
- 새 ETF 수집/스케줄러의 반복 운영은 이 R29 배포가 자동으로 활성화하지 않으며 별도로 검증해야 한다.

## R31: 신규 우주·위성 전용 PC 인증 연결 수정

- R30 실 PC 결과는 105개 실제 점수·147개 결측 검증에 통과했고, D1 작업 직전에 `PC_WRANGLER_REAUTH_REQUIRED`로 중단되었다. 이 코드는 신규 D1 writer가 기존 7개 테마 인증 체인이 아닌 구형 optional 단독 Wrangler 탐색기를 잘못 호출했기 때문이다.
- R31은 기존에 검증된 `theme-optional-cycle.mjs`의 `aiApprovedSevenTokenR1`과 동일한 **원래 7개 테마 PC 소스 선택 → 선택된 소스의 `scripts/pc-writer/d1.mjs`의 `credential(root)`** 인증 체인만 우주·위성에 연결한다.
- `r179-publish-core.mjs`의 승인된 SHA와 기존 `pc-writer/config.json` 운영 소스를 확인한다. 비밀번호·토큰을 새로 발급하거나 기록하지 않고, 7개 테마 게시기를 실행하지 않는다.
- 승인 원본의 인증도 유효하지 않으면 `SPACE_R31_APPROVED_SEVEN_CREDENTIAL_FAILED`로 멈추고, 원인을 이용권 또는 ETF AUM 문제로 잘못 분류하지 않는다.
- `SPACE_SATELLITE_R29_PUBLICATION_RESULT.txt` 출력 파일명과 사용자 CMD 경로는 이전과 동일하며, R31은 기존 9개 테마의 계산·저장·배포 설정을 변경하지 않는다.

## R32 1년 차트 복구

2026-10-26 사용자 지적에 따라 기존 UFO의 실측 252일 점수가 신규 ETF NASA(105일)·WARP(79일)·ROKT(133일)에 의해 잘리지 않게 했다. 자세한 규칙은 `docs/THEME_SPACE_SATELLITE_R32_HISTORY_CONTINUITY.md`. 기존 R1 점수 원장은 보존하고 R2 신규 키를 사용한다.
