# W05 D1 정확 5키 보호 내부 비교 — 12차 사전 작업

## 목적과 실제 완료점

기존 W05 5키 의미 비교기(R60) + 10차 동시 관측 가드(#1071) + 11차 테마 seed 결속(#1072)을 재사용한다. 세 기능을 다시 구현하거나 원담당의 장기 브랜치를 main에 병합하지 않는다.

**새 소스 준비:** `scripts/api-site/five-key-inplace-readback-prework-r12.mjs`의 `collectFiveKeyInPlace`는 사용자가 승인한 보호 실행 환경에서 이미 제공하는 D1 바인딩 `db`와 공개 API JSON 조회 callback `readApi(slot)`를 **인수로만 받는다**. 자체 credential 획득, 네트워크 호출, Controller/Runner/Workflow 등록, SQL DDL/DML, 파일 기록, 배포 동작은 하지 않는다.

## 고정 읽기 계약

정확히 다음 다섯 public storage row만 SELECT한다. SQL/table/key/배치가 사용자 입력으로 바뀌지 않는다.

| slot | table | exact key |
| --- | --- | --- |
| inflation19 | market_public_snapshots_v1 | detail:inflation-causal-public-19:r1 |
| inflation7 | market_public_snapshots_v1 | detail:inflation-causal-candidates-7:r1 |
| calendar | public_feed_snapshots_v1 | kind=output, feed_key=release-calendar, snapshot_key=current |
| theme | market_public_snapshots_v1 | public:theme-etf-only:r1 |
| employment | market_public_snapshots_v1 | detail:employment-r6:one-year:v1 |

각 slot: D1 첫 SELECT → callback로 공개 API 관측 → 같은 D1 row 두 번째 SELECT → 원문 body와 stored_at의 전후 일치 및 시계 순서 → 기존 `comparePublicReadback`를 **내부 메모리**에서만 호출 → 허용한 상태·시각·SHA-256 메타만 반환한다. 다른 키 실패는 각 slot에 `D1_READ_UNVERIFIED`, `PUBLIC_API_READ_UNVERIFIED`, `D1_RECHECK_UNVERIFIED`, `SOURCE_DRIFT_UNVERIFIED`, `OBSERVATION_ORDER_UNVERIFIED` 또는 `COMPARISON_UNVERIFIED`으로 따로 남긴다. 예외 문자열·토큰·원본 D1 JSON·공개 HTTP body·헤더는 결과에 포함하지 않는다.

## 승인된 Owner 연결 절차 — 현재 실행 승인 아님

- 기존 승인된 D1 소유자가 **실제 바인딩과 정확한 실행 권한**을 확인한다. 본 소스의 존재나 GitHub PR 병합은 실행 승인이 아니다.
- 그 보호 환경 안에서 `collectFiveKeyInPlace({db, readApi})`를 호출한다. `readApi(slot)`는 승인된 정해진 URL에서 얻은 JSON을 `{statusCode,body}`로 반환하는 외부 제공 함수이며, 이 모듈이 URL/토큰을 받거나 생성하지 않는다. 본 사전 작업에는 실제 API 연결 함수가 없다.
- 원격 인계에는 결과의 `schema`, 슬롯별 `status`, `d1StoredAt`, `d1BodySha256`, `d1ReadAt`, `apiObservedAt`, `httpStatus` 등 **허용 메타만** 보낸다. 실물 GitHub Actions Run/Job, host, 인증된 현재 Controller/source, Cloudflare Production deployment ID/SHA, 운영 안전 서명 및 보고 출처를 별도 연결해야 한다.
- `LOCAL_STRUCTURAL_MATCH_OWNER_ATTESTATION_PENDING`은 운영 검증이 아니며 `ownerAuthorizationVerified=false`, `deploymentIdentityVerified=false`, `runtimeVerified=false`는 원본 함수에서 항상 고정이다. 테마는 seed와 첫 7개 identity가 맞아도 **rolling/sidecar 원본을 읽지 않았으므로** `SEED_READBACK_ONLY_COMPOSED_UNVERIFIED`; 이 5키 결과만으로 테마 전체 PASS를 만들 수 없다.
- 두 SELECT 사이 row가 바뀌면 반드시 UNVERIFIED. 전후 동일한 ABA 변경/Writer가 업데이트 시각·본문을 그대로 되돌린 경우까지 원자적 트랜잭션으로 증명하지는 않는다. 증거 시간구간과 sourceVersion/checkpoint/Deployment provenance 추가 대조를 승인된 담당자가 수행한다.

## 이전 격리 시험 (초기 버전 — 최신 결과 아님)

`node --test tests/api-site-five-key-inplace-readback-r12.test.mjs` — **Node v22.16.0, 11/11 PASS, fail 0**. 본 시험은 정확 SQL·바인딩, 5키 순서, 두 번 읽기, 저장 후 변조/삭제, 시계 역행, 일부 slot 실패 격리, 비밀 문자열 제거, 입력 데이터 크기·형식, 무권한 호출 방지 등 11개 합성 사례. **시험 시 기존 W05 comparator를 동일 export 형태의 테스트 shim으로 대체하여 어댑터 제어 흐름만 Node에서 실행했다.** 이것은 기존 실제 comparator의 Node 통합 시험이나 운영 D1/API readback이 아니다. 10차/11차 기존 격리 V8 comparator 15/15·19/19은 별도 증거로만 재사용하며 이 시험의 11개와 더해 운영 PASS로 계산하지 않는다.

## 범위와 다음 행동

본 PR은 10→11차 stacked Draft 위에 **신규 코드+시험+이 문서 3개 파일만** 추가한다. 기존 원담당 W05 브랜치/main/운영 D1·SQLite/Worker/Controller/Runner/Task/Cloudflare/예약 변경 0.

**W05 Owner에게 바로 넘길 사항:** (1) 10차 #1071 → 11차 #1072 → 본 12차 stacked PR 순서로 선택적 통합 검토, (2) 아래에 실제 Node 13/13 통합 시험을 재사용하고 GitHub 정규 CI/리뷰를 별도 완료, (3) 정규 승인된 기존 D1/Cloudflare 소유자가 현장 보호 실행 경로를 확보할 때만 실제 5키 비교 결과 회수. 단순 source PASS로 기존 W05 75% 또는 실D1 0/5를 변경하지 않는다. 단순 대기·재조사 대신 다른 독립 구현을 이어가야 한다.

## 추가 통합 사전검증 — 실제 W05 원본 함수 재사용

지원 브랜치의 원격 Git blob을 다시 읽어서 `collectFiveKeyInPlace`와 기존 W05 `comparePublicReadback` **실제 두 소스 함수를 같은 V8 격리 실행**에 연결했다. 암호 해시 함수와 deep-equality에만 결정론적 대역을 주고, D1/HTTP는 합성 fixture를 사용했다.

- 정확 5키 SELECT 총 10건(키당 전/후 2회); 다른 테이블/임의 키 호출 없음.
- 실제 비교 출력 순서: inflation19 `STRUCTURAL_MATCH_NOT_RUNTIME_PROOF`, inflation7 동일, calendar 동일, theme `SEED_READBACK_ONLY_COMPOSED_UNVERIFIED`, employment `STRUCTURAL_MATCH_NOT_RUNTIME_PROOF`.
- 공개 theme의 Rolling 소스 버전은 seed와 달라도 첫 7개 ETF identity가 일치하면 합성의 무검증 상태를 유지했다. 원본 `seed-v1` 문자열이 외부 반환에 나타나지 않고 owner/deployment/runtime 인증 비트는 모두 false.
- **실 D1/API, 정규 Node 통합 CI, Cloudflare 배포, 기능 운영 5/5 PASS를 주장하지 않는다.** 이것은 원본 함수의 V8 합성 연결 실험이며 Node 11/11 어댑터 단독 시험과 구별된다.
- 이 보고서의 GitHub 코드는 로컬 Node v22.16.0 테스트 파일과 `git hash-object`로 **정확 blob 일치** 확인: 어댑터 `5c91acf1ff0f0325323165bd22ef2ef479e10b4c`, 시험 `42bc5d18dddc8877e3ecbf985ade253aa3e156d9`.

원담당이 읽을 마지막 유효 단계: **#1071 동시 관측 → #1072 테마 identity → 본 #1073 5키 보호 실행 선행 코드**, 읽기 전용·권한 있는 D1 환경/정확 Production deployment provenance는 별도 운영 실행으로 남는다.

## 2026-11-15 사전 작업 품질 감사 — 선행 100% 완료 보고 정정

**중요 정정:** 이전 12차 `11/11 Node PASS`는 실제 W05 `comparePublicReadback`이 아닌 로컬 shim을 사용한 **어댑터 제어 흐름 시험**이었다. 이 실험을 실비교기 통합 PASS 또는 운영 적용 준비 100%로 표현하는 것은 부정확하다. 전체 운영 진척 0/5는 그대로다.

현재 지원 브랜치 코드·시험에서 **재현하고 바로 수정한 결함 3건**:

1. 호출자가 `compare` 테스트 대역을 건네면 임의 상태를 만들 수 있었음 → 현재 내보낸 어댑터는 원본 W05 import 비교기만 실행하며 `compare/sql` 등 알 수 없는 인수는 `W05_UNSUPPORTED_OPTION`으로 거부.
2. 본문 크기 제한이 JavaScript 문자열 문자 수 기준 → 현재 `Buffer.byteLength(body,'utf8')` 기준 1,800,000바이트 상한. 다중 바이트 UTF-8 반례 추가.
3. 두 번째 D1 조회가 120초를 초과해도 첫 조회와 API 호출 시각 차이만으로 통과할 수 있었음 → 전체 첫 D1 수신부터 재조회 완료까지 `MAX_PUBLIC_READBACK_SPAN_MS=120000`을 넘어가면 `OBSERVATION_WINDOW_UNVERIFIED` 반환.

**확인한 테스트 오류 1건도 수정:** 새 옵션 허용목록 가드를 추가했는데 기존 fixture의 `seen/counts`를 `...fixture`로 퍼뜨려 13건 중 10건이 `W05_UNSUPPORTED_OPTION`으로 실패하는 것을 확인. 지금은 owner 제공 값 `db/readApi`와 `clock`만 전달하고, 임의 비교기·SQL 전달 거부를 별도로 부정 시험한다.

**검증:** 원격 GitHub의 실제 W05 comparator + 실제 adapter + 최종 13개 테스트를 동일 격리 V8에서 평가. 결정론적 crypto/deepEqual/Buffer 대역만 적용해 `13/13 PASS` 기록. **이 V8 13/13은 GitHub 정규 Node CI가 아니다. 아래에서 실제 Node 13/13을 별도 수행했다.** 기존 로컬 Node 11/11 shim 결과와 합산하거나 100% 배포 준비 판정으로 승격하지 않는다.

**아직 해결되지 않은 의존성:** 승인된 D1 바인딩과 API callback 실행 환경·자격, 공개 API의 실제 response 소스/URL·캐시 정책 및 Cloudflare deployment SHA, 출처 서명/원본 원자적 스냅샷 및 ABA 재기록 검증. 이 코드 단독으로는 실제 `5/5` 판정과 live readiness를 증명할 수 없다. 실행 전 원담당의 **실제 comparator Native Node 통합 결과 재사용 후 GitHub 정규 CI/선별 검토 + 허용된 Windows/Cloudflare 환경 확인**이 필수다.

**운영 권한:** 이 수정은 독립 지원 Draft #1073 내부 2파일 수정과 문서 정정만 수행했다. Watchdog #1385 오류 수정과는 별개이며 원담당의 병합·운영 실행/예약/PC/DB/D1를 변경하지 않는다.

## 최종 소스 검증 — 정확한 GitHub 3개 blob의 Native Node 통합

앞서 기록한 테스트 대역 기반 Node 11/11, V8 13/13과 구별하여 **실제 원본 모듈 3개를 로컬 Node v22.16.0으로 가져와** 아래를 수행했다. 반영 전 GitHub의 `fetch_file` 현재 branch 값과 로컬 `git hash-object`를 정확히 비교했다.

| 실제 모듈 | Git blob SHA-1 (원격과 로컬 완전 동일) |
| --- | --- |
| `scripts/api-site/compare-five-public-readbacks-r1.mjs` | `0d565f4587eb1a37ea020a97f68d97ef518a0090` |
| `scripts/api-site/five-key-inplace-readback-prework-r12.mjs` | `089d98b1e6759e79051cae24aea6b8e46298bbf4` |
| `tests/api-site-five-key-inplace-readback-r12.test.mjs` | `b27f6f7251171ded486eef750b43aa61a442c1e3` |

`node --check`로 어댑터·테스트 파일 문법 확인 후 `node --test tests/api-site-five-key-inplace-readback-r12.test.mjs` 실행. **Node v22.16.0 13/13 PASS, 0 FAIL, 0 SKIP**, 실제 Node `crypto.createHash`, `util.isDeepStrictEqual`, `Buffer.byteLength`를 사용했으며 **테스트 shim을 사용하지 않았다**. 동일 원본 5키×D1 두 번/HTTP 합성, row 변조, 저장 시각 드리프트, 시계 역행, 120초 경계, UTF-8 바이트 초과, 임의 비교기 주입 차단, 503 우선 등 부정 회귀를 포함한다. **실제 D1/공개 HTTP 연결을 실행한 것이 아니며 GitHub Actions CI는 시작되지 않았다.** 운영 승인과 W05 0/5 현행 결과는 달라지지 않는다.

**수정의 적용 범위:** 본 수정은 지원 브랜치의 기존 #1073 Draft 변경 두 코드 파일·테스트·문서에만 해당. 이전 12차 `100%`는 사전 작업 초안의 산출물 작성률일 뿐 운영 준비 완료율이 아니다. 향후에는 실제 Node 통합 증거와 합성/실운영 증거를 구분해 보고한다.
