# R47 기존 9개 테마 실제 PC 비공개 ETF·테마 결과 독립 검증

- 관측·확인일: 2026-10-28
- 저장소·전용 브랜치: `ansqhd5774-Choi/zgmini` / `codex/theme-fear-greed-integration-20261025`
- 범위: **사용자가 직접 제출한 실제 PC 결과 JSON 두 건의 읽기 전용 검증**. 소스/API·산식·ETF·예약 작업·DB·D1·공개 점수 변경 없음.

## 1. 원본 증거와 실행 보고의 일치

| 파일 | 업로드 원본 SHA256 | R47 실행 보고 SHA와 일치 |
| --- | --- | --- |
| `THEME_NINE_R47_PRIVATE_2026-10-26_3e72c174fd099d24_ETF.json` | `66ff5208ac62db0b881a38ced12f5d848be03bb4837c917df00d3ebad5495d34` | PASS |
| `THEME_NINE_R47_PRIVATE_2026-10-26_3e72c174fd099d24_NINE.json` | `d9f9a3937d59abc4f51a3a97a5c0839bdf574aed3dfc90a1a53bc5eee534b4b8` | PASS |

두 업로드 파일의 `source` 객체는 정확히 일치하며 다음 정본에 대응한다.

- R23 원본 manifest SHA256: `8c6aa292da35310ce37093b73a331177582fb741d16d8a6423bee7413ddbcdb5`, 121페이지.
- R20 승인 명단 SHA256: `e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c`, ETF 고유 63종·64개 편입 자리.
- R35 증분 manifest SHA256: `61f9b0f27f8190b07afe0c65b33bb4ce9973dddd345c2f092207761dd7416290`, 새 1h 페이지 참조 62개.
- 신규 창 `2026-10-23 ~ 2026-10-27`; 최종 **실측 SPY 기준일 `2026-10-26`**, 252개 거래일 범위 `2025-10-24 ~ 2026-10-26`.
- 가격 모드: `RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE`, R46 EOD 혼입 없음.

## 2. 승인 R32 산식으로 전체 날짜 재현

로컬에 있는 변경하지 않은 `config/theme-nine-r20-approved-candidates.json`, `config/theme-nine-r26-official-aum-evidence.json`, `config/theme-nine-r32-dated-aum-approval.json`과 **기존 순수 함수** `mixNineR32Date()`를 사용하여, 제출된 ETF JSON 각 날짜의 실제 점수·관측일수·상태를 다시 입력하고 9개 테마 전체 날짜를 하나씩 재계산했다.

| 검증 지표 | 결과 |
| --- | --- |
| 테마 개수 | 9개 |
| 날짜 수 | 각 252개 |
| **독립 R32 재계산과 제출 결과 대조** | **2,268 / 2,268일 완전 일치 PASS** |
| 실제 유효 테마 점수 | 2,268일 |
| 테마 날짜 결측 | 0일 |
| 최근 유효 ETF 고유 | 44 / 63종 |
| 최근 ETF 점수 결측 | 19종 |
| 가중치 합계의 최댓값 반올림 오차 | `0.000002`%p 이하 |

마지막 점수 결측 ETF 19종의 사유:

- `NO_REAL_CLOSE`: **12종**. 해당 SPY 기준일과 일치하는 유효 ETF 마감 프록시가 없음.
- `INSUFFICIENT_REAL_OBSERVATIONS`: **5종**. 유효한 산식 세부 관측치가 부족함. 반드시 전체 40세션 미만이라는 뜻은 아님.
- `BELOW_40_REAL_SESSIONS`: **2종**. 승인 40세션 하한 미달.

단일 증분 창에서 신규 원자료 62개가 저장된 것과 최신 점수 ETF 44개는 **서로 다른 분모와 검증 단계**다. 2개 원자료 미저장 심볼의 이름은 현재 제출된 JSON 2개만으로 유일하게 식별할 수 없으므로, 19개 결측과 임의로 같은 집합으로 간주하지 않는다.

## 3. 공식 AUM의 원래 기준일 보존

R26 공식 발행사 AUM 63종 중 **42종은 2026-10-23 기준**, **21종은 그 이전 기준**이다. 이번 비공개 점수 기준일 `2026-10-26`보다 **전부 과거**다.

R47은 기존 승인된 날짜별 AUM 사용 정책을 비공개 계산에서 이어 사용하면서 각 ETF의 `aumAsOf`를 보존했다. 9개 테마의 2,268개 날짜 모두 `datedOfficialAumUsed=true`이며, 이것이 **AUM이 매일 최신화되었다는 뜻은 아니다**. 새로운 AUM 연구·증거·운영 공개 승인은 별도 단계다.

## 4. 상태 및 다음 게이트

1. `R47_FIRST_PC_SOURCE_COLLECTION`: **PASS** (사용자 제출 실PC 결과 및 R47 SHA 검증 보고)
2. `R47_PRIVATE_SHADOW_ORIGINAL_SHA`: **PASS** (독립 SHA256 비교)
3. `R47_NINE_X_252_APPROVED_R32_RECOMPUTATION`: **PASS** (2,268/2,268 정확히 일치)
4. `R47_INDIVIDUAL_R2_REDERIVATION_FROM_PC_RAW`: **NOT_INDEPENDENTLY_CHECKED** (개별 원가격 페이지 자체는 제출되지 않았음. 기존 R47 원수집기 내부 검증 결과에 의존)
5. `R47_NEXT_CLOSED_SPY_DAY_SECOND_RUN`: **PENDING** (실거래일이 더 진행된 후 재실행 필요)
6. `WINDOWS_TASK_SCHEDULER_CONNECTION`, `PUBLIC_D1_READBACK`, `API_UI_RELEASE`: **PENDING / NOT_AUTHORIZED**

다음 1개 작업: **다음 실제 새 SPY 거래일 이후 동일 R47 CMD의 두 번째 실행**으로 checkpoint 이전 완료 심볼 재요청 방지·윈도 전진·새 비공개 SHA 생성 여부를 확인한다. 기존 예약 작업·공개 데이터는 그 전에 수정하지 않는다.

전체 수치와 증거 SHA는 작업 판단 이력이며, **비공개 원 JSON 자체를 GitHub에 올리거나 공개 점수로 사용하지 않았다**.
