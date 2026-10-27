# 기존 9개 테마 개편 R22 — 확정 6단계 작업 도구 배정

- 확정일: 2026-10-26 (사용자 승인: “브랜치에 반영해라”)
- 적용 브랜치: `codex/theme-fear-greed-integration-20261025`
- 브랜치 통합: 2026-10-26 사용자 지시. 이전 `research/theme-nine-r2-shadow-20261026`는 **과거 연구 이력**이며 이후 신규 작업·수정은 하지 않는다.
- 상태: `TOOL_PLAN_APPROVED / R23_STAGE1_PC_64_OF_64_COMPLETE / R24_STAGE2_PC_AUDIT_COMPLETE / R25_STAGE3_PC_RESULT_AUDITED / R26_STAGE4_OFFICIAL_CENSUS_63_OF_63 / R32_STAGE5_UPLOADED_JSON_PREFLIGHT_PASS / R32_STAGE5_PC_PREFLIGHT_PASS / R32_STAGE5_PC_252D_PASS / R33_STAGE6_PRIVATE_EXACT_REPLAY_PASS / R33_PUBLIC_HISTORICAL_COMPARISON_PENDING / NO_PUBLICATION`
- 최상위 적용: 10번째 우주·위성 R29·R32 기존 계산 계약, R19 3개 O/X 결과, R20 후보 승인 명단. 본 문서는 **도구·실행 담당·작업 순서만 확정**하며 산식 자체를 변경하지 않는다.

## 1. 확정 범위

- 기존 9개 테마 / ETF **고유 63종**, 테마별 편입 위치 **64개**를 그대로 유지한다. ETF 수 하한·상한·목표 없음.
- 후보 선정은 R19의 3개 조건(`구성종목 공개 O AND GetMarketHistory 티커 조회 O AND 운영사 C등급 이상 O`)으로 완료했다. **후보를 다시 심사하지 않는다.**
- 구성종목 중복률, 산업 비중, 테마 순도 수치, ETF 간 포트폴리오 중복, WR 에너지 업종 비중은 **산식 입력·감점·제외·새 승인 게이트가 아니다.**
- 과거 R8의 보유 중복·편중 정량 검사 지시 및 R21의 WR 재검토·55개 추가 평가 지시는 **미승인 범위 확장으로 철회한다.** 관련 R21 원시 조사값은 역사 자료일 뿐 후속 필수 작업이 아니다.
- R20 기계 문서의 과거 `finalFormulaAdmission` 표기 가운데 `THEME_FIT_HOLDINGS_WEIGHT` 부분을 추가 검사 지시로 해석하지 않는다. 확정 후보 목록과 3개 O/X 결과가 우선한다.

## 2. 작업별 도구 / 실행 주체 / 산출 증거

| 단계 | 확정 작업 | 자료·도구 | 실행 담당 | 산출물·완료 증거 |
| --- | --- | --- | --- | --- |
| 1 | 확정 ETF의 **실제 가격 이력 확보** | `GetMarketHistory` 승인 무료 경로 + 기존 PC 원자료 수집기 | **사용자 PC에서 CMD 실행** (코드 준비·검토는 ChatGPT) | 실제 OHLCV 관측값, 원본 출처·관측일·SHA manifest; 티커 카탈로그 검색 O만으로 데이터 수집 성공이라고 판정 금지 |
| 2 | **실제 거래일·원본 무결성** 검증 | 기존 PC Node.js 데이터 검증기, `SPY` 거래일 비교·SHA | **사용자 PC CMD** | ETF별 실제 세션 수·결측·원본 SHA·가격 모드·SPY 날짜 정합성 보고서 |
| 3 | **ETF 개별 점수** 계산 | 기존 승인 `T40/R20/V40`, 적응형 `R2` 계산기 | **사용자 PC CMD** | ETF별 유효 날짜의 0~100 실측 점수 및 40세션/장기호환 상태; 결측은 null |
| 4 | **공식 AUM** 확인 | 각 ETF **발행사 공식 페이지 / 발행사 공개 자료**, 일반 웹 조사, GitHub 연구 기록 | **ChatGPT** | ETF 63종 공식 AUM 값, 기준일, 통화, 원문 URL, 확인 시각; 불명은 PENDING. 별도 유료 AUM API·새 수집기 추가 금지 |
| 5 | **테마별 가중 합산** | 10번째 테마 승인 `R32` 합산 계약, PC Node.js 계산기 | **사용자 PC CMD** | 거래일별 참여 ETF, 공식 AUM 기반 혼합 비율, 종합점수/결측/산출 근거 |
| 6 | **252거래일 비공개 검증** | 기존 PC 검증·비교 스크립트, GitHub 본 연구 브랜치 | **사용자 PC CMD + ChatGPT 결과 검토** | 252일 그림자 결과, 기존 공개 방식과 최신/1M/3M/1Y 및 결측 비교, TXT/JSON 증거. 사용자 공개 전환 승인 전에는 D1·UI 반영 금지 |

## 3. R32 산식 재사용 범위 (수정 금지)

- ETF 자체 점수: 기존 T40/R20/V40·적응형 R2. 실제 가격/관측 세션이 있는 날만 계산. 최소 검증 실세션 40.
- 날짜별 유효 ETF **3개 이상**: 각 발행사의 기준일이 기록된 **현재 공식 AUM** 상대 정규화 가중치 사용. 과거 일자별 실제 AUM을 복원한 것처럼 표현하지 않는다.
- 날짜별 유효 ETF **2개**: 기존 승인 장·단기 70:30→50:50 또는 호환 50:50 조합.
- 날짜별 유효 ETF **1개**이거나 2개 혼합 불성립: 기존 R32의 관측 세션 수·공식 AUM·티커 동률 처리 순서로 유효 단일 점수 사용.
- 날짜별 유효 ETF **0개**: null. 252거래일 전체 시간축 유지, 허구 가격·보간·0점 대체 금지.
- 관측 부족으로 특정 날짜의 점수가 없는 것은 **날짜별 계산 불가**이지 그 ETF의 승인 후보 자격을 취소하는 새 심사 조건이 아니다.

## 4. 데이터·비용·실행 경계

- `GetMarketHistory`: 공식 문서상 무료 접근은 **ETF별 1시간봉(1h)** 경로다. 1d 등 유료 시간봉, 다종목 유료 질의, 유료 결제를 임의 실행하지 않는다. 실제 무료 히스토리 확보 길이와 페이지 접근은 실응답으로 판정한다.
- 가격 데이터 정책은 기존 승인된 이용·저장·공개 범위를 준수한다. 티커 검색 성공이 완전한 가격 이력/배포권 보장이라는 뜻은 아니다.
- PC 원가격은 승인된 원자료 저장 위치와 manifest 정책을 따른다. GitHub에 대용량 가격 원본·비밀키 업로드 금지.
- PC 실행은 **Windows CMD만** 사용한다. CMD와 동일한 위치에 사람이 전달하기 쉬운 TXT 로그를 생성하고, 필요 JSON/CSV도 해당 위치에 생성한다. `%TEMP%` 사용 금지. 무관한 파일을 E:에 추가 생성하지 않는다.
- 단계 1~3·5~6은 **사용자가 직접 PC CMD 실행**하며 ChatGPT가 실제 PC 실행을 했다고 가장하지 않는다. 4단계만 ChatGPT가 웹에서 조사한다.
- 기존 공개 9개 ETF 점수·원장·D1·DB·스케줄러·산식·정규화·Cloudflare·웹 UI는 **변경하지 않는다**. 신규 정규 수집/자동배포/본番 병합은 별도 승인 후에만 진행한다.

## 5. 실행 순서와 승인

1. 최초 R22 확정 시점에는 **도구 배정 문서 반영만** 완료했다. 이후 사용자 승인으로 R23 1단계 수집기 코드·모의 테스트를 준비했다. 2026-10-27 PC에서 R23 단계 1 가격 수집(ETF 63종 + SPY 64/64, 원본 121개)과 R24 단계 2 읽기 전용 감사(428,701개 가격 행, SPY 956세션, 최신 252세션 48/64종 충족)가 완료됐다. 16종은 최신 252세션 중 미관측 날짜가 있고, LLMA(15)·RBTX(3)는 40세션 미달이다. 단계 3 계산기는 기존 R2 산식·NY 종가 대용 선택 함수를 원문 그대로 번들링하여 구현했고, 64종 모의 SHA/R24/R25 연동 테스트를 통과했다. 2026-10-27 사용자 PC R25 계산 결과를 TXT/전체 JSON/R24 원본 요약과 교차 검증하여 PASS 했다(최신일 45/63종 점수, 장마감 프록시 실세션 40 미달 7종). 단계 4 발행사 공식 AUM 출처·수치·날짜 조사는 63/63종 완료했다. 그중 42종만 2026-10-23 기준, 나머지 21종은 과거 날짜다. 2026-10-27 사용자 승인에 따라 이 21종도 **공식 발행사 기준일을 그대로 보존하는 비공개 계산**에 한정해 사용하며, 현재 일자 AUM이라고 재표기하지 않는다. 단계 5의 업로드된 R25 JSON 읽기 전용 사전점검은 PASS(최신 45/63, 전체 실측 점수-날짜 10,842건)했고, 수정된 CMD의 사용자 Windows PC 실제 사전점검도 PASS다. **사용자 제출 R25 실측 파일의 비공개 로컬 252일 합산은 9/9 테마 PASS**, 6개 파일 SHA 검증 단일 CMD 저장 완료. **사용자 Windows PC의 5단계 실행 로그와 6단계 그림자 검증은 PENDING**이다.
2. 단계별 실행은 1→2→3 순으로 원자료와 개별 점수를 검증하고, 공식 AUM 조사(4)를 준비해 5·6에 입력한다. 입력이 부족하면 해당 부분을 PENDING/null로 기록한다.
3. 변경안이나 신규 수집 도구가 필요하면 사유와 영향을 먼저 사용자에게 보고하고 승인받는다. 미승인 작업을 임의로 추가하지 않는다.
4. 단계 6을 검증해도 공개 전환은 별도 사용자 승인 대상이다.

## 6. 기준 문서

- [R19 3개 O/X 검증](../config/theme-nine-r19-three-gate-ox-verified.json)
- [R20 사용자 확정 63종 후보](../config/theme-nine-r20-approved-candidates.json)
- [기존 9개 테마 이전 연구 R8 — 본 R22보다 우선하지 않음](THEME_LEGACY_NINE_R8_ELIGIBLE_ETF_UNCAPPED_20261026.md)
- [10번째 테마 승인 R29](THEME_SPACE_SATELLITE_R29_PUBLICATION.md)
- [10번째 테마 승인 R32](THEME_SPACE_SATELLITE_R32_HISTORY_CONTINUITY.md)
- [GetMarketHistory API 공식 문서](https://getmarkethistory.com/docs/api/reference)
- [GetMarketHistory 무료 1h 경로 문서](https://getmarkethistory.com/docs/quickstart)

## 7. 단계 1 실제 구현 상태 — R23

- [63개 ETF 비공개 1h 원가격 수집기 구현·CMD·테스트](THEME_LEGACY_NINE_R23_PRIVATE_COLLECTION_20261026.md)
- 브랜치: `codex/theme-fear-greed-integration-20261025`만 사용. R23 코드 저장과 PC 실제 GET/원자료 검증을 구분한다.

## 8. 단계 3 실행 코드 준비 — R25

- [승인 산식 원문 재사용·비공개 CMD·64종 모의 테스트](THEME_LEGACY_NINE_R25_PRIVATE_SCORE_20261027.md)
- 상태: `PC_RUN_RESULT_INTEGRITY_PASS / R26_OFFICIAL_AUM_SOURCE_CENSUS_63_OF_63 / R32_PREFLIGHT_PASS / NO_PUBLICATION`. [R25 PC 결과 검증](THEME_LEGACY_NINE_R25_PC_RESULT_AUDIT_20261027.md)과 [R26 공식 AUM 전수 조사](THEME_LEGACY_NINE_R26_OFFICIAL_AUM_RESEARCH_20261027.md), [R32 실제 R25 입력 사전점검](THEME_LEGACY_NINE_R32_PRIVATE_PREFLIGHT_20261027.md)를 참고한다.

## 9. R32 PC 사전점검 오류 수정 및 재검증

- 2026-10-27 실제 Windows CMD 로그: 내장 파일 SHA 확인 PASS, 파일 열기 `ENOENT`로 STOP. R32 계산 완료 상태가 아니다.
- `%~dp0` 폴더 인수의 Windows 인용부호/종단 백슬래시 문제 가능성을 제거하기 위해 환경변수로 전달하는 개정 CMD를 해당 브랜치에 반영했다. 수정 후 모의 검증 5/5 PASS, 내장 세 파일 SHA readback PASS. 사용자 PC에서 제출한 개정판 TXT `THEME_NINE_R32_PREFLIGHT_RESULT_14715_833.txt`는 Node v24.19.0 / 내장 SHA PASS / R25 입력 검증 PASS / 읽기 전용 쓰기 0건으로 **정상 완료**했다.
- 기존 ETF 후보, R25 실점수 JSON, 공식 AUM 출처와 기준일, 승인 산식, 원자료·DB·스케줄러·공개 배포를 변경하지 않았다.

- 후속 상태: `R32_STAGE5_PC_PREFLIGHT_PASS / R32_STAGE5_PRIVATE_LOCAL_PASS / R32_STAGE5_PC_SHADOW_PENDING / R32_STAGE6_SHADOW_PENDING`. 공식 AUM 63건 가운데 42건은 2026-10-23 기준, 21건은 더 오래된 발행사 기준일이다. 2026-10-27 사용자 승인에 따라 **날짜 표시 그대로 비공개 가중치에 사용**하되 현재 AUM으로 재표기하거나 30·90일 시차 배제 규칙을 만들지 않는다. ETF 개별 점수 18건 결측은 0점 대체하지 않는다.

## 10. R32 가중 합산 코드·CMD (2026-10-27)

- 5단계 순수 계산 및 승인 2-ETF R3 재사용 코드를 `scripts/pc-writer/theme-nine-r32-private-aggregate.mjs`로 **지정 브랜치에 보존**했다. 정책 설정 `config/theme-nine-r32-dated-aum-approval.json`은 원래 공식 AUM 기준일을 보존해 사용하며 임의 시차 상한 없이 **비공개 전용**으로 적용한다.
- 테스트: 로컬 **9 PASS / 0 FAIL / 1 SKIP**. SKIP 1건은 현재 실행 환경에서 Node 자식 프로세스 생성 `EPERM`으로 실행하지 못한 Windows CLI 경로이며 PC에서 확인할 항목이다.
- 사용자 제출 실제 R25 JSON으로 9개 테마 각각 **252거래일** 비공개 계산 확인(최신값과 근거는 [R32 문서 9절](THEME_LEGACY_NINE_R32_PRIVATE_PREFLIGHT_20261027.md) 참조). 21종 공식 AUM의 과거 기준일을 공개 일자로 바꾼 적이 없다.
- 6개 구성 파일 SHA 검증 내장 단일 `scripts/pc-writer/THEME_NINE_R32_PRIVATE_AGGREGATE.cmd` 저장 완료. 사용자 Windows PC CMD 실행 **미검증**. 5단계 PC 결과 TXT/JSON을 받은 다음 6단계 252일 그림자 비교에 착수한다. 공개 데이터·D1·산식·DB·스케줄러·UI는 변경하지 않는다.


## 11. 후속 실행 체크리스트

1. 사용자 PC의 **R25 전체 JSON** 파일과 `THEME_NINE_R32_PRIVATE_AGGREGATE.cmd`를 같은 폴더에 둔다(복수 JSON이면 사용할 파일을 CMD로 끌어놓기).
2. Windows CMD 실행 후 같은 폴더에 생성된 `THEME_NINE_R32_PRIVATE_RESULT_*.txt`와 `THEME_NINE_R32_PRIVATE_SHADOW_*.json`을 제출한다.
3. TXT의 구성 파일 SHA·R25 입력 SHA·9테마×252일·참여 ETF 수·공식 AUM 기준일·0점 대체/결측 미발생 계약을 대조한다. 실제 PC 실행 전에는 5단계 PC PASS로 표시하지 않는다.
4. 결과가 일치하면 6단계 비공개 그림자 검증(기존 공개 기록과 1M/3M/1Y, 날짜별 가중치·결측·연속성)을 수행한다. 공개 전환, D1, DB, 스케줄러, UI 변경에는 별도의 사용자 승인이 필요하다.


## 12. 실제 PC R32 결과 수령·R33 그림자 이력 재현 검증 (2026-10-27)

- 사용자 Windows PC 결과 TXT/JSON SHA256 일치; 원본 R25 SHA도 기존 검증값 일치. **9개 테마×252일=2,268건 전부 독립 재계산 결과와 동일**, 날짜별 비중합 검사 2,268/2,268 PASS.
- 3개 이상 공식 AUM 가중 합산 2,177일 / 기존 승인 R3 2종 혼합 91일. 더 이른 공식 발행사 AUM의 실제 기준일은 유지했고, ETF 점수 결측 18종은 임의로 생성하지 않았다.
- **6단계 비공개 내부 재현성 검증 PASS**, 7/7 로컬 테스트 PASS. 기존 공개 시계열의 동일 날짜 원본이 아직 없으므로 **과거 공개 방식과 최신/1M/3M/1Y 차이 비교는 PENDING**으로 유지한다.
- 정확한 입력 SHA·비공개 점수 변화표·실행 도구·남은 비교는 [R33 6단계 감사](THEME_LEGACY_NINE_R33_STAGE6_PRIVATE_AUDIT_20261027.md)에 기록한다. 공개 점수·D1·DB·스케줄러·UI는 미변경.
