# ZGMINI W05 — QFR 게시기 B 소스 실함수 기반 42사례 시뮬레이션 R3

2026-11-16 KST. 담당 `codex/api-site-integration-r1-20261026`. 이 문서는 **소스 함수 단위 시뮬레이션 결과**다. 실제 PC, D1, Cloudflare, 공급자 API 접근 또는 게시 **0회**. 임의로 운영 성공을 주장하지 않는다.

## 1. 대상 소스와 기존 증거

- 제어 Draft [#1698](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1698), `tools/publication-executor.mjs` blob `c5773e35bc00726d4ff284a389a7f952e932594b`. 실제 소스의 `parseLogRows`, `validateQfrStoredPreflight`, `validateQfrApplySource`, `validateQfrPinnedNoWrite`, `parsePublisherLog`, `nextLedgerPhase`, `millisecondsToNextUtcSecond`, `publicationCheckpointReport` 순수 코드 블록을 실행.
- 앱 Draft [#1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175), `scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs` blob `fc406ee9b22aba86549e2140910f9d54db41262a`; 실제 `validatePinnedQfrSource` 소스 블록을 실행.
- 원본 QFR 단일키: `detail:earnings-recession-indicators:census-qfr-mfg-margin:v1`; 고정 샘플은 sourceVersion/rawZipSha256 각 64자리, sourceStoredAt `1793112733108`.
- 기존 실PC read-only [#1709](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1709) / [Run #43866041104](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43866041104) 운영 checkout QFR 5/6 ABSENT은 확정이나, 실제 B 설계가 분리 publisher checkout을 사용하므로 **B 게시기 설치 부재를 직접 입증하지는 않음**. #112·#1698 Draft와 제어 main 제안 Workflow 미존재가 현재 명확한 미연결 범위다.

## 2. 실제 실행한 시나리오 및 결과

**기본 함수 계약 30개: 30개 예상 판정.** 소스 SHA·raw SHA·storedAt 3핀의 PASS/DRIFT, 프리플라이트 D1 0건/키 검증/만료/중복 로그 차단, ALREADY_STORED, 원본 일치/불일치, no-write drift vs ambiguous apply, 상태머신 UNKNOWN/BLOCKED, UTC 결과파일 이름 충돌 방지 등. 첫 실행 중 T28은 테스트 하네스에서 `change()`의 인수를 문자열로 잘못 전달하여 1건 실행 오류가 났으며 같은 fixture를 정상 인자로 재실행하여 PASS 확인했다. **이는 제품 결함으로 집계하지 않음.**

**추가 적용 결과 파서 12개: 원본 예상 일치 5/12, 비정상 수용 7/12.**

| 반례 | 원본 파서 판정 | 예상 |
| --- | --- | --- |
| 정상 QFR exact readback | PASS | PASS |
| 다른 `SNAPSHOT_KEY` | **PASS** | REJECT |
| `MODE=READ_ONLY_PREFLIGHT`에서 게시 성공 주장 | **PASS** | REJECT |
| `SOURCE_GATES=FAIL`에서 게시 성공 주장 | **PASS** | REJECT |
| `SOURCE_HTTP_REQUESTS=1`에서 게시 성공 주장 | **PASS** | REJECT |
| `PC_SQLITE_WRITES=1`에서 게시 성공 주장 | **PASS** | REJECT |
| `D1_RESULT=READBACK_VERIFIED`와 `RESULT=PASS_QFR_D1_ALREADY_STORED` 조합 | **PASS** | REJECT |
| `D1_RESULT=ALREADY_STORED`와 `RESULT=PASS_QFR_D1_EXACT_READBACK` 조합 | **PASS** | REJECT |
| `PREFLIGHT_SOURCE_PIN` 변조 | REJECT | REJECT |
| `SOURCE_VERSION` invalid | REJECT | REJECT |
| 정상 `ALREADY_STORED` | PASS | PASS |
| 동일 `RESULT` 키 중복 로그 | REJECT | REJECT |

**개선안 모의반영:** `parsePublisherLog` 앞에 `SNAPSHOT_KEY===expectedKey`, `MODE===APPLY_EXPLICIT`, `SOURCE_GATES===PASS`, `SOURCE_HTTP_REQUESTS===0`, `PC_SQLITE_WRITES===0`, `D1_RESULT`↔`RESULT` 정확 쌍 검사를 둔 순수 JS 조합으로 **12/12 예상 판정**. 이는 **메모리상 시뮬레이션**이며 repo source·CI 변경은 아직 0이다.

## 3. 신규 결함 원인 및 영향

- **새 구조 결함군 1개, 반례 7개**: `parsePublisherLog(text,operation)`가 적용 대상 `SNAPSHOT_KEY`, 실제 MODE, 검사와 no-side-effect 항목, `D1_RESULT`↔`RESULT` 조합을 확인하지 않는다. 이후 `execute()`는 `validatePublicationReadback(validated,{...evidence,key:invocation.snapshotKey})`로 **로그에서 읽지 않은 기대 키를 자체 대입**한다. 결과적으로 이상 로그가 들어와도 성공 판정 가능한 소스 허점.
- 중요도 **P1 / 운영 게시 전 반드시 수정**. 실제 공식 Publisher 스크립트는 정상 로그를 생성하도록 작성되어 있으며, 이 반례는 **실제 운영에서 타 키에 D1 쓰기를 했다는 증거가 아니다**. 다만 신뢰할 수 없는/잘못된 게시 결과를 PASS 처리하는 보고 무결성 결함이다.
- 해결은 `parsePublisherLog`에 예상 키를 전달하여 실제 `SNAPSHOT_KEY` 값을 확인하고, QFR 결과 쌍/모드/원본 무변경을 검사한 뒤 **검사한 실제 키를 반환**하여 `validatePublicationReadback`에 전달하는 것이다. 기존 BEA success 정상 조합에 대한 회귀도 유지한다.
- 기존 QFR 3핀 검사, 165일 freshness, 승인 단일 D1 키, CAS 중복/역행 차단, 저장 원본, 산식, Core Scheduler는 **수정하지 않는다**.
- 새 결함 외 미해결 **실제 게시 경로**: `pc-publication-b.yml`은 현행 제어 main에 없고 [#112](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/112) Draft이다. 일반 `writer-b` source overlay의 `allowD1Writes=false`는 게시 권한이 아니며, 기등록된 등가 QFR B operation·게시 checkout의 실제 설치 여부는 별도 조사 대상.

## 4. 예상 성공률 (주관적 조건부 추정, 통계적 실측 아님)

`현재 미병합 Draft 경로 그대로 실행`은 제어 main에 제안 workflow가 없어 **해당 경로 즉시 실행 가능성 0%**. 이는 기존 다른 B 게시 경로가 전혀 없다는 뜻이 아님.

**비정상 로그 7건을 실제 코드/집중 회귀에서 수정하고 승인된 B 게시 경로가 준비된다는 가정**:
- 소스 2repo 선별 통합·회귀 `0.92`; QFR 정확키 B 승인·기등록 경로/설치 `0.85`; SQLite 저장원본 신선도 `0.96`; D1 단일키 쓰기·readback `0.95`.
- QFR D1 게시 첫 운영 시도: `0.92×0.85×0.96×0.95 = 0.713184`, **약 71%**.
- QFR D1→Production API/UI: 추가 source/배포/데이터 표시 확인 `0.90` → **약 64%**.
- 기존 14단계 전 지표군 최초 일괄 통과: 여기에 BEA `0.80`, WPSFD42 `0.79`, 제조업 `0.82`, 통합 `0.93`을 가정 → **약 31%**.
- B 게시 경로/설치 증거 확보 후 승인·설치 성공 가정을 `0.93`으로 올리면 QFR D1 약 **78%**, QFR Production 약 **70%**, 14단계 일괄 첫 시도 약 **34%**로 변한다. 각 숫자는 독립 사건 가정의 단순 곱이며 경험 표본·통계적 신뢰구간·성공 보증이 **없다**.
- 기존 R2 추정(76/68/33%)보다 기본 추정치가 낮은 것은 추가 결과 검사 결함과 정확키 B 실경로 불명확성을 운영 연결 변수에 반영했기 때문이다. **수정 후 실제 운영에 성공했다는 의미는 아님**.

## 5. 즉시 실행할 다음 작업 (작업순서 4항목)

1. **제어 B 결과 검증 패치**: `tools/publication-executor.mjs` 최소 수정; 실제 snapshotKey와 mode·source gates·provider/SQLite 무변경 증거·status/result 쌍의 불일치 거부. `validatePublicationReadback` 입력은 **검증된 실제 키**. 새 7반례 회귀 추가. BEA 경로 보존.
2. **실제 Node 집중 테스트**: `tests/publication-contract.test.mjs` 및 `tests/publication-executor.test.mjs` 검증과 BEA/QFR 관련 회귀 PASS. 메모리 시뮬레이션 12/12로 대체 금지.
3. **정확 B 경로/승인/두 체크아웃 확인**: 기존 기등록 operation이 있으면 재사용; 없으면 기존 공용 B 계약의 승인된 단일키 adapter만 선별 통합. 앱 Draft #1175의 PIN도 최신 main에 승인된 선택적 통합; 운영 core checkout에 5파일을 무조건 복사하지 않음.
4. **승인 QFR 한 키 D1 게시→실제 readback→Production API/UI**: 본문/버전/시각 동일성 확인. 마감 임의 예약/정규 수집 Gate 추가 금지. 단계 #1/2/3 실제 완료 증거별로만 14단계 DONE에 산입.

이번 시뮬레이션·문서 작성으로 인한 운영 PC, DB/D1, Cloudflare 변경: **0건**. 실적 침체 운영 DONE **0/14** 유지.
