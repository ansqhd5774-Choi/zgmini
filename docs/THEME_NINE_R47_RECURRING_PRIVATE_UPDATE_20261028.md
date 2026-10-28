# ZGMINI 기존 9개 테마 R47 — 승인 산식 그대로 비공개 자동 갱신 경로 연결

작성일: 2026-10-28 · 대상: `ansqhd5774-Choi/zgmini`의 **유일한 전용 브랜치** `codex/theme-fear-greed-integration-20261025`

## 1. 범위·상태를 혼동하지 않는다

| 항목 | 상태 |
| --- | --- |
| 기존 9개 승인 ETF | R20 고유 63종·편입 자리 64개 **원본 불변** |
| 10번째 우주·위성에서 확보한 산식 | 적응형 R2 개별 ETF·R3 2종 가중·R32 3종 이상 AUM **정의·가중치 변경 없음** |
| 최초 R23 시간봉 | `E:\ZGmini\data\themes\legacy-nine-r23` **읽기 전용**, 기존 SHA·checkpoint 보존 |
| R35 실제 최초 PC 관측 | 2026-10-27 실행: SPY 2026-10-23까지 확인, 새 자료 0건·`WAIT_SOURCE_NO_NEW_VERIFIED_SPY_SESSION` |
| R47 코드 연결 | **구현·가상 제공자 및 합성 252일 데이터 단위 테스트 통과** |
| Windows PC에서 R47 실실행 | **미실시**; 새 실제 시간봉/9개 점수 산출 확인 전 |
| Windows 예약 작업 등록 | **미실시**; 이 CMD는 작업을 설치·수정하지 않음 |
| D1·사이트 API·공개 10개 지수 | **연결/변경/배포하지 않음**, 운영 승인·권리 확인 별도 |

R47은 **증분 수집 + 기존 함수로 9개×최대 252거래일 비공개 재산출**하는 실행 경로다. 로컬 테스트를 PC의 실제 공급자 관측이나 공개 운영 완료로 승격하지 않는다.

## 2. 고정일자 결함을 수정한 증분 실행 경로

기존 R35 CMD는 수집 창 끝이 `2026-10-26`으로 고정되어 있었다. 그 CMD를 반복 실행하는 것으로는 미래일 데이터가 절대 추가되지 않는다. 또한 R35 체크포인트 키는 `(승인 ETF 명단 SHA, start, end)`의 해시이므로, 진행 중 `end`를 매일 변경하면 이미 끝난 GET를 다시 보내는 **중복 수집 오류**가 생긴다.

R47은 기존 R35 수집기를 호출하되 다음 상태 기계를 사용한다.

1. R34로 R23 121개 원페이지·manifest·R20 명단·SPY 마지막 날짜를 다시 읽기 검증한다.
2. 뉴욕 현재일보다 **하루 전 달력일**까지만 요청 창의 끝으로 선택한다. 미완성 당일 가격을 확정 거래일로 이용하지 않는다.
3. R35 checkpoint가 하나라도 미완료면 시작일·종료일을 **그대로 고정하고 이어받는다**. 앞선 완료 심볼·페이지는 중복 GET하지 않는다.
4. 한 창의 64심볼 수집이 모두 완료되면 원시 파일 SHA, 요청 URL·기간, SPY 실측 NY 날짜를 검증한다. 다음 창 시작일은 **마지막 SPY 실거래일과 겹치게**, 종료일은 이전 창 이후로 앞으로 이동한다(최대 7달력일 단위).
5. SPY에 새로운 검증 가능 거래일이 없으면 `WAIT_SOURCE_NO_NEW_VERIFIED_SPY_SESSION`으로 멈추고 신규 checkpoint/원시 데이터 쓰기를 하지 않는다. 공급자 지연을 API 등록 누락이나 산식 오류로 취급하지 않는다.
6. HTTP 오류·원가격 SHA 충돌·체크포인트 모호성·이전 요청 실패를 자동으로 덮거나 우회하지 않고 STOP한다.

R35의 원자료 가격 모드는 계속 **`RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE`**다. R39/R46 MarketParquet `DAILY_SPLIT_ADJUSTED`는 이 경로의 선행 조건이나 자동 대체 소스가 아니다. GetMarketHistory 1h 공식 문서: https://getmarkethistory.com/docs/quickstart

## 3. 기존 개별 ETF·테마 산식으로 재계산

`theme-nine-r47-private-score.mjs`는 SHA 검증 완료 R23과 **수집이 완료된** R35 창만 읽어 시간봉을 합친다.

- 중복 timestamp의 원시 OHLCV가 정확히 같으면 한 번만 사용하고, 다르면 `MERGED_OVERLAP_PRICE_CONFLICT`로 중단한다. 결측을 전일 값으로 복사하지 않는다.
- 10번째 테마에서 사용한 **실제 15시(뉴욕 현지) 시간봉 / 조기폐장 12시 선택** 함수 `selectRealHourlySessions`를 그대로 호출한다.
- 승인 **`scoreOneR25` + `scoreAdaptiveTimeline`** 함수로 63개 ETF를 계산한다. 추세 40%·SPY 상대강도 20%·변동성 40% 및 40/377/628 이력 분기는 변경하지 않는다.
- `theme-nine-r47-private-theme-aggregate.mjs`가 **`mixNineR32Date` 원본**을 호출해 9개 테마의 실제 유효 날짜별 2 ETF 적응형 가중/3개 이상 공식 AUM 정규화/1개 결측 대체를 처리한다. 서로 다른 테마에서 같은 ETF를 사용하는 것은 허용하되 한 테마 내부의 중복 ETF는 정식 R32 계약에 따라 거부한다.
- R26 공식 발행사 AUM은 기존 실값과 각 `aumAsOf` 날짜를 그대로 유지한다. R32의 **비공개 전용 승인 앵커(2026-10-23)** 이후 후속 계산은 실값을 날짜를 바꿔 표시하지 않은 채 비공개 가중치 입력으로 이어 쓴다. 이는 **새 공식 AUM이 실시간 갱신됐다는 뜻이 아니며**, 향후 발행사별 새 증거 확보·승인·갱신 작업은 별도다. 과거 날짜별 진짜 AUM 시계열로 재구성했다고 표시하지 않는다.

## 4. PC 실행·증거

실행용 단일 파일: `scripts/pc-writer/THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd`

- 생성자: `scripts/pc-writer/build-theme-nine-r47-recurring-private-update.mjs`
- CMD는 **16개 기존·신규 모듈·설정 파일을 Base64 임베드**, 실행할 때 SHA256 일치 검증 후 CMD와 같은 폴더에 임시 스테이지를 만들고 종료 시 그 스테이지만 삭제한다.
- 기존 `E:\ZGmini\runtime\node.exe`가 있으면 사용하고, 없으면 PATH의 `node`를 사용한다.
- 명령 한 번 실행 시 R47 증분 창 계획 → 공급자 요청(최대 4 GET/배치, 60초 간격, 최대 64배치) → R23/R35 SHA/충돌 확인 → R25·R32 비공개 재계산을 순서대로 시도한다.
- 원자료: `E:\ZGmini\data\themes\legacy-nine-r35-delta`에 별도 append/checkpoint.
- 비공개 결과: `E:\ZGmini\data\themes\legacy-nine-r47-private\THEME_NINE_R47_PRIVATE_<관측일>_<SHA>_ETF.json` 및 `_NINE.json`. 기존 동일 SHA 출력은 **재검증 후 무중복**, 상이한 결과는 기존 파일을 덮지 않는 새 증거다.
- PC 실행 로그: CMD와 같은 폴더에 `THEME_NINE_R47_RECURRING_PRIVATE_UPDATE_*.txt`, `*.json`이 남는다.
- Windows Task Scheduler의 등록·수정, 기존 운영 코어/7개 작업, Cloudflare·D1은 **일절 건드리지 않는다**. 예약으로 자동 반복하려면 독립적으로 사전 검증한 동일 CMD 호출을 **사용자가 승인한 기존 PC 예약 경로에 연결**해야 한다.

## 5. 정량 테스트 및 실패 안전

테스트(로컬 Node):

```bash
node scripts/pc-writer/build-theme-nine-r47-recurring-private-update.mjs
node --test tests/theme-nine-r35-delta-collect.test.mjs tests/theme-nine-r32-private-aggregate.test.mjs tests/theme-nine-r47-recurring-private-refresh.test.mjs tests/theme-nine-r47-private-score.test.mjs tests/theme-nine-r47-recurring-bundle.test.mjs
```

검증 시나리오: 64심볼 첫 창·재실행 0 GET·다음 창 64개 요청·후속 SPY 지연 1 GET·미완료 창 날짜 고정·SHA 변조 STOP·252일 데이터로 63 ETF 및 9개×252=2,268 테마 개별 날짜 재산출·단일 CMD 16파일 SHA 정확도·비공개 2파일 멱등 저장.

**직접 검증해야 할 미완료 Gate**:

1. PC에서 CMD 1회 실행 결과와 64심볼 신규 자료 여부, 실제 NY 날짜, 2종 결과 SHA를 확인한다. 공급자 지연 시 정상 WAIT로 기록한다.
2. 2거래일 이상 같은 CMD를 다시 실행해 R47이 후속 날짜로 이동하고 결과가 반복 갱신되는지 실측한다. 현재는 **PC 반복 실증 없음**.
3. R47 비공개 9개 결과·R32 기준선 차이, 공식 AUM 실제 최신 기준일, 원공급자 파생 공개 권리, 사용자 공개 전환 승인 후 **별도 D1 CAS/readback**과 API/UI 검증을 실시한다.
4. 최종 Windows 예약 작업 연결 및 다음 정규 자동 실행 2회 검증은 해당 예약 작업 식별·사용자 승인·실PC 실행 증거 이후 별도 진행한다.

## 6. 변경 금지 대상

- 전용 브랜치 외 새 브랜치, 임의 PR 병합/삭제, main 수정 금지.
- R23·R24·R25·R32·R33 과거 원본·기존 공개 10개 관측/점수·R8 별도 테마·기존 D1 키·원 정규 예약 작업 수정 금지.
- ETF 2개·4개 고정, 새로운 가중치 규칙·시장가격 가공·임의 공식 AUM 날짜·공급자 요금제 전환 금지.
- 비공개 파일을 게시용 확정 데이터라고 표시하지 않음.

## 7. 2026-10-28 실제 Windows PC 1차 증분·비공개 점수 실행 증거

- 사용자 제출 실행 TXT SHA256: `81d82fc9c02c876178849468619f660829eedcda1d4c36688ce0f77059e0af79`; JSON SHA256: `bf7a48a46b75a3a6d4e199dde853978a6a2ee725a7d2705f039ac54d596e7ad3`. TXT 안의 JSON과 별도 JSON을 파싱 후 **완전 일치** 확인.
- PC Node `v24.19.0`, `BUNDLE_SHA_VERIFIED=YES`; R47 `status=PRIVATE_SHADOW_SAVED_NOT_PUBLISHED`, `stage=COLLECT_MERGE_R25_R32_PRIVATE_COMPLETE`.
- 공급원 요청 `64 GET`, 완료 심볼 `64/64`, 저장 원가격 파일 `62`개. 파일이 없는 심볼 2개가 무엇인지 이 요약만으로 확정하지 않는다. 실제 PC로부터 전체 raw-manifest는 아직 받지 않았으므로 개별 심볼 원자료를 독립 재검증한 것으로 보고하지 않는다.
- 입력 수집창 `2026-10-23 ~ 2026-10-27`, **실제 최종 점수 SPY 거래일은 `2026-10-26`**. 종료일 10월 27일을 점수 관측일로 혼동하지 않는다.
- 계산 보고 `9개 테마, ETF 고유 63종, 위치 64개, 252 거래일`; 프로그램 보고 `formulaChanged=false`, `rosterChanged=false`, `d1Writes=0`, `schedulerWrites=0`, `publicationWrites=0`.
- PC 비공개 산출: `E:\\ZGmini\\data\\themes\\legacy-nine-r47-private\\THEME_NINE_R47_PRIVATE_2026-10-26_3e72c174fd099d24_ETF.json`, `_NINE.json`; 출력 SHA 각각 `66ff5208ac62db0b881a38ced12f5d848be03bb4837c917df00d3ebad5495d34`, `d9f9a3937d59abc4f51a3a97a5c0839bdf574aed3dfc90a1a53bc5eee534b4b8`. **원본 2파일은 아직 업로드/직접 내용 검증하지 않았으므로 개별 점수와 결측 수는 미확인**.
- Gate A 최초 **실PC 수집·비공개 계산 실행 PASS(자체 결과 보고 기준)**. 다음 우선 작업: PC의 `_ETF.json`·`_NINE.json` 두 결과를 독립 검사해 9개 테마 점수·유효 ETF·결측·AUM 원날짜를 확인하고, 다음 새 SPY 거래일 도착 후 동일 CMD의 **두 번째 실제 반복 실행**으로 날짜 전진 및 중복 GET 방지를 실증한다.
- Windows Task Scheduler 자동 등록·반복 2회·D1 CAS/readback·공개 전환·정식 AUM 최신화는 아직 PENDING. 기존 운영 작업 무단 수정 금지.

## 8. 제출 원본 독립 재검증 완료

- 2026-10-28 사용자 후속 업로드 ETF·NINE JSON 두 원본 SHA256은 앞선 PC 실행 보고와 완전 일치한다. 9개×252일 **2,268/2,268건을 변경하지 않은 R32 순수 가중 함수로 재계산·깊은 비교 PASS**했다.
- ETF 최신 점수 유효 **44/63종**, 결측 19종(`NO_REAL_CLOSE` 12, `INSUFFICIENT_REAL_OBSERVATIONS` 5, `BELOW_40_REAL_SESSIONS` 2). 9개 테마 역사 결과는 각 252/252 점수 존재. 승인 날짜별 AUM 원기준일 유지.
- 이 단계의 정확한 SHA·실측·결측·권리 미완료 판정은 [별도 읽기 전용 검증서](THEME_NINE_R47_PC_SHADOW_INDEPENDENT_AUDIT_20261028.md)에 보존했다. **ETF 원가격 페이지 자체 독립 재계산, 두 번째 자동 실측, D1 공개는 아직 완료되지 않았다.**
