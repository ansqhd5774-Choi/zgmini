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

## 실제 격리 시험

`node --test tests/api-site-five-key-inplace-readback-r12.test.mjs` — **Node v22.16.0, 11/11 PASS, fail 0**. 본 시험은 정확 SQL·바인딩, 5키 순서, 두 번 읽기, 저장 후 변조/삭제, 시계 역행, 일부 slot 실패 격리, 비밀 문자열 제거, 입력 데이터 크기·형식, 무권한 호출 방지 등 11개 합성 사례. **시험 시 기존 W05 comparator를 동일 export 형태의 테스트 shim으로 대체하여 어댑터 제어 흐름만 Node에서 실행했다.** 이것은 기존 실제 comparator의 Node 통합 시험이나 운영 D1/API readback이 아니다. 10차/11차 기존 격리 V8 comparator 15/15·19/19은 별도 증거로만 재사용하며 이 시험의 11개와 더해 운영 PASS로 계산하지 않는다.

## 범위와 다음 행동

본 PR은 10→11차 stacked Draft 위에 **신규 코드+시험+이 문서 3개 파일만** 추가한다. 기존 원담당 W05 브랜치/main/운영 D1·SQLite/Worker/Controller/Runner/Task/Cloudflare/예약 변경 0.

**W05 Owner에게 바로 넘길 사항:** (1) 10차 #1071 → 11차 #1072 → 본 12차 stacked PR 순서로 선택적 통합 검토, (2) 원본 comparator와 이 어댑터를 한 프로세스로 가져오는 정규 Node 회귀 시험, (3) 정규 승인된 기존 D1/Cloudflare 소유자가 현장 보호 실행 경로를 확보할 때만 실제 5키 비교 결과 회수. 단순 source PASS로 기존 W05 75% 또는 실D1 0/5를 변경하지 않는다. 단순 대기·재조사 대신 다른 독립 구현을 이어가야 한다.

## 추가 통합 사전검증 — 실제 W05 원본 함수 재사용

지원 브랜치의 원격 Git blob을 다시 읽어서 `collectFiveKeyInPlace`와 기존 W05 `comparePublicReadback` **실제 두 소스 함수를 같은 V8 격리 실행**에 연결했다. 암호 해시 함수와 deep-equality에만 결정론적 대역을 주고, D1/HTTP는 합성 fixture를 사용했다.

- 정확 5키 SELECT 총 10건(키당 전/후 2회); 다른 테이블/임의 키 호출 없음.
- 실제 비교 출력 순서: inflation19 `STRUCTURAL_MATCH_NOT_RUNTIME_PROOF`, inflation7 동일, calendar 동일, theme `SEED_READBACK_ONLY_COMPOSED_UNVERIFIED`, employment `STRUCTURAL_MATCH_NOT_RUNTIME_PROOF`.
- 공개 theme의 Rolling 소스 버전은 seed와 달라도 첫 7개 ETF identity가 일치하면 합성의 무검증 상태를 유지했다. 원본 `seed-v1` 문자열이 외부 반환에 나타나지 않고 owner/deployment/runtime 인증 비트는 모두 false.
- **실 D1/API, 정규 Node 통합 CI, Cloudflare 배포, 기능 운영 5/5 PASS를 주장하지 않는다.** 이것은 원본 함수의 V8 합성 연결 실험이며 Node 11/11 어댑터 단독 시험과 구별된다.
- 이 보고서의 GitHub 코드는 로컬 Node v22.16.0 테스트 파일과 `git hash-object`로 **정확 blob 일치** 확인: 어댑터 `5c91acf1ff0f0325323165bd22ef2ef479e10b4c`, 시험 `42bc5d18dddc8877e3ecbf985ade253aa3e156d9`.

원담당이 읽을 마지막 유효 단계: **#1071 동시 관측 → #1072 테마 identity → 본 #1073 5키 보호 실행 선행 코드**, 읽기 전용·권한 있는 D1 환경/정확 Production deployment provenance는 별도 운영 실행으로 남는다.
