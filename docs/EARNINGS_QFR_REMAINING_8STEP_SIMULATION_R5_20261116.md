# W05 — QFR 남은 8단계 실행 시뮬레이션 R5

2026-11-16 KST. 본 문서는 **실제 저장소 함수 기반 V8 메모리 시뮬레이션**이다. Node 전체 CI, Windows B 실행, 실제 PC SQLite/D1/Production 접근·변경 **0**. 전체 실적 침체 14단계 운영 DONE **0/14** 유지.

## 기준 소스 및 현재 운영 범위
- 제어 [Draft #112](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/112) (7파일 B proposal) + [#1698](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1698) (source pin 2파일) 미병합. `tools/publication-executor.mjs` Git blob `c5773e35bc00726d4ff284a389a7f952e932594b`; `tools/publication-contract.mjs` blob `2fce231cf3d18cfd2d73a367ad2dc8eb61105c53`.
- 앱 QFR [Draft #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175) 미병합, QFR publisher blob `fc406ee9b22aba86549e2140910f9d54db41262a`; 실제 앱 `main` Worker blob `c9d8679e546413e82c6c7fe6e49082c3668512c6`.
- 제어 `main`에 `.github/workflows/pc-publication-b.yml` **없음 (404)**. 현재 제안 경로의 즉시 B 실행은 불가. 실제 운영 Core checkout에 QFR 5파일 ABSENT라는 [PC #1709](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1709) 결과는 요청별 별도 publisher checkout에 무조건 같은 파일을 설치해야 한다는 의미가 아님. 등가 approved B 경로가 PC에 기설치됐는지는 아직 미검증.
- 기존 QFR 원자료는 2026-10-27 당시 PC 저장·계산 PASS; 당시 2026-Q2 분기 소스에 대한 기존 165일 관측 freshness는 **2026-12-13T00:00Z**에 만료. 현재 실PC 최신 적격 원본은 별도 런타임 조회 필요.

## 46건 실제 코드 함수 시뮬레이션 결과
| 작업 단계 | 실행한 함수/가상 영향 | 예상대로 판정 |
|---|---|---:|
| 1. B 승인·정확키 | `operationSpec`, 승인 댓글 사용자+핀 유효성 | **4/4** |
| 2. 실행기·결과 | publisher digest, `parsePublisherLog`의 정상 및 악성 결과 | **3/9** |
| 3. source 3핀 | `validatePinnedQfrSource` 정상/누락/ZIP·snapshot·timestamp drift | **5/5** |
| 4. 두 Git checkout | `validateSourceCheckpoints`: clean main, drift, 동일 root, dirty | **5/5** |
| 5. 원자료 사전검사 | `validateQfrStoredPreflight`, QFR freshness 정상/만료/무효 | **7/7** |
| 6. D1 정확키/재조회 | 실제 `qfrCompanionWriter` 함수를 메모리 D1 adapter에서 실행: 최초 저장, 멱등 replay, 충돌, 손상, `validatePublicationReadback` | **7/7** |
| 7. 공개 API | 실제 `readQfrCompanionResponse`: 저장 GET, POST 거부, 강제 query 거부, stale 503 | **4/4** |
| 8. 상태/회복 | 실제 `nextLedgerPhase`: ready→applying, timeout UNKNOWN, 입증 no-write BLOCKED, premature READBACK 거부, seconds filename fence | **5/5** |
| **총계** | 코드 함수·메모리 adapter | **40/46** |

Step 2에서 발생한 6개 비정상 허용 사례: (1) 다른 `SNAPSHOT_KEY`; (2) `MODE=READ_ONLY_PREFLIGHT` 위장; (3) `SOURCE_GATES=FAIL`; (4) `SOURCE_HTTP_REQUESTS=1`; (5) `PC_SQLITE_WRITES=1`; (6) `D1_RESULT`와 `RESULT` 의미 불일치. 모두 기존 [R3](EARNINGS_QFR_B_PUBLICATION_SIMULATION_R3_20261116.md)에서 찾았던 **7개 반례 중 6개의 재현**이며 새 독립 결함군은 아님. 나머지 결과 유형 반례도 R3에서 증명됨. 정상 실 D1 키 이외에 실제 다른 키를 썼다는 증거 아님.

**시뮬레이션 한계:** GitHub 소스 순수 함수를 V8에서 실행하고 D1/Response/URL은 메모리 adapter로 대체했음. 실제 Node/Windows/Cloudflare SQL 파서·트랜잭션·원격 readback·Production Deployment는 실행하지 않았으며, 누락된 B Workflow/승인도 모의 생성하지 않음. 따라서 논리 시뮬레이션 기대 일치율 40/46을 실제 운영 성공률 87%라고 표현하지 않음.

## 남은 직접 결함·우선순위
1. **P0 B 실행 미연결:** control `main`에 QFR B Workflow 없음. 기존 등가 공용 B 승인 경로/실제 설치가 있다면 그것을 재사용. 없다면 승인된 shared B 단일 키 효과로 최소 연결. 운영 파일 무단 복제·임의 명령 금지.
2. **P1 결과 검증 누락:** `parsePublisherLog(text,operation)` QFR 분기에서 실제 KEY/MODE/SOURCE_GATES/source provider·SQLite 0 및 D1_RESULT↔RESULT 대응을 검증하고 실제 검증한 key를 `validatePublicationReadback`으로 전달. BEA `MODE=EXPLICIT_APPLY`는 동일 검사로 오작동시키지 않도록 기존 BEA 회귀 보존. **정확히 제어 executor+test 2파일** 수정.
3. **P1 제어 테스트 1개 오래됨:** 기존 `tests/publication-executor.test.mjs` 정적 assertion 21개 중 1개가 현 executor의 `NO_WRITE_STOP` 분기와 불일치. 기존 검사를 삭제하지 않고 `APPLYING` + `noWriteVerified?'NO_WRITE_STOP':'UNVERIFIED'` + `STOP` 정확 분기 보완. [R4](EARNINGS_QFR_B_PUBLICATION_SUCCESS_IMPROVEMENT_R4_20261116.md) 메모리상 23/23 확인, 실제 Node CI는 미완료.
4. **P1 앱 pin 변경 미반영 및 main drift:** 최신 `main` 승인 소스 고정 후 3필드 PIN (#1175) 선별 통합. 승인 manifest의 publisher SHA·operational `config.source`·실제 Git SHA를 실행 직전 대조. 무단 main 자동 교체 금지.
5. **P1 게시 후 결과 불명확:** D1/API 불일치면 기존 원장·해당 키 재조회, UNKNOWN 상태/lease 보존, 같은 요청 자동 재시도 0. 이후 D1/Production API/UI를 사용자 육안 확인 요청 없이 작업자가 먼저 완료.

## 성공률 추정 (주관적 독립 사건 가정, 실증 통계 아님)
| 조건 | 성공률 모델 | 추정 |
|---|---|---:|
| 현재 제안 B Workflow 그대로 즉시 실행 | control main 미설치 | **0% (해당 제안 경로의 실행 가능성)** |
| 코드·테스트만 수정(승인 B 불확실) | 0.98×0.85×0.96×0.95 | **76.0% (조건부 계획 성공)** |
| 코드·승인 B 경로·SHA·원본·정확키 readback까지 해결 | 0.98×0.95×0.98×0.98 | **89.4% (QFR D1)** |
| 위 개선 + Production API/UI 일치 | 앞선 결과 × 0.94 | **84.0% (QFR 게시→사이트)** |
| 14단계 전체 최초 일괄 시도 | 앞선 84.0% × BEA .80 × WPS .79 × 제조업 .82 × 통합 .93 | **40.5%** |

**해석:** 40/46은 예상 판정 일치율이며 운영 실패확률 계산에 넣지 않는다. 위 확률은 실제 실행 성공 표본이 없어 가정을 명시한 엔지니어링 계획값이고, 단계별 수정·진단 후 재시도까지 포함한 최종 완성 확률과도 다르다.

## 다음 필수 실행 순서
1. 제어 Draft `tools/publication-executor.mjs`, `tests/publication-executor.test.mjs`의 **결과 파서 결함과 stale assertion** 수정→정식 Node 집중 테스트·CI. B 관련 기존 변경은 다른 작업자 source 보존.
2. 실제 기등록 B 단일키 게시 op/승인·installed 상태를 1회 읽기 전용 확인. 없으면 기존 공통 B 승인 경로 최소 확장/명시된 B 운영 효과 승인.
3. 앱 #1175 exact PIN 선별 통합, 별도 clean publisher SHA와 운영 checkout config.source 원본 대조, 저장형 QFR preflight.
4. 승인된 QFR 1키 D1 apply/readback → API/UI·Production SHA → 기존 14단계에서 실증된 #1~#3만 DONE 처리. 새 정규 수집/다음 발표 관측은 현재 기능 완료의 무조건 Gate 아님.
