# Iran R3 V43 — 2차 분류 보정 최소 후보 (Draft / 미배포)

2026-10-19 PC V42 READ_ONLY 검증: baseline **36.3점 / 11신호**, 7개 기사 날짜별 재구성 기록과 영역별 점수 일치. L10 복합 liveblog 보도 1건 검토 보류 **shadow 38.7점 / 10신호**, 군사 4→16, 해상 20 유지. 이는 종전 확률이나 사건 진실 검증이 아닌 **기존 R3 계산식의 변경 영향 비교**다.

## 소스 최소 패치

- `lib/iran-progress/reference-flow-r3.mjs`: `CLASSIFIER_VERSION = IRAN_EVENT_RULES_R3_3`으로 상향하여 기존 불변 R3_2 결정·체크포인트를 덮어쓰지 않고 새 분류 실행을 분리.
- 기존 분류기의 1개 경로에만 **`COMPOUND_LIVEBLOG_REQUIRES_EVENT_REVIEW`** 추가: `Iran war live:`, `Israel war live:`, `Middle East live:` 등 기사 라이브 제목에서 세미콜론/구분 기호로 **별도 사건을 나열한 경우만** 자동 공격 점수 반영 보류.
- 단일 사건 제목, 기본 사건 규칙·단계 `delta`, 지역 판정, 30/25/20/15/10 가중치, 점수·체크포인트·공개 데이터 스키마·스케줄·TTL 유지.
- `L10`의 **Iran 문맥을 실제 선박 공격 주체로 취급**하는 오류를 막는 최소 변경. 기사 발생일, 공격 주체, 침몰 여부는 이 패치로 자동 확정하지 않음.
- `H01` 중복 보류는 보존하고 `L05` Tasnim 선박 침몰 보도와 UKMTO 별개 사고 경보는 검증 전 자동 병합/배제하지 않음.

## 현재 상태와 Production Gate

- PR은 **Draft 후보 코드**, 운영 main에 미병합, Cloudflare/D1/PC에 적용하지 않음.
- 기존 11개 발표일 기반 신호 재현 테스트는 L10만 제외하고 **38.7 후보/10건**. 기존 R3_2 저장 기사 하나를 분리된 R3_3 결정으로 다시 분류하는 in-memory 테스트 포함. 실제 PC의 새 코드 실행/게시 성공을 의미하지 않음.
- 실운영 적용 전: exact 작업 SHA, PC 저장 원장 비교, 기존 정상 게시·기록 보존, 기존 scheduled launcher 경로·수집 주기, 변경된 최소 코드 회귀 검사, 공식 Git Integration 배포, D1 readback, API/UI 검증 필요.
- 새로운 기준은 과거 공개 점수 `AS_PUBLISHED` 이력을 소급 수정하지 않으며, `0`/null/미관측을 바꿔치기하지 않는다.

**승인 없는 Production 배포 또는 정식 score overwrite 금지.** 1차 R3 36.3점은 그대로 유지.

## V45 Source Gate 정정 — Windows CRLF에 의한 false source drift

- PC read-only 진단: 활성 E: 런타임 HEAD `016c6c19ef0b764a280e416f0d579cfc925d839a`, detached, tracked dirty 0, 공식 repo remote 일치, 분류기 R3_2.
- V45 PC raw working-tree Git blob hash: `27f003e2b8e0bad72209c62b9706070e900ddf71`.
- GitHub에서 **정확한 활성 HEAD**의 원본 LF 분류기를 재조회: Git blob `f63b8d63c3383c6b7e33788345d68da378f61bd9`. 현재 main 원본 분류기와 완전 일치.
- 동일 원본을 LF→CRLF로만 변환해 Git Blob SHA-1을 독립 재계산하면 `27f003e2b8e0bad72209c62b9706070e900ddf71`로 **PC 측정값 40자리 완전 일치**. V45의 `SOURCE_DRIFT_REVIEW_REQUIRED`는 정규화 누락으로 인한 **diagnostic false positive**이며, 현재 운영 분류기의 실제 본문 드리프트 증거가 아니다.
- 활성 HEAD 대비 최신 main의 R3 핵심 8개 파일 비교: 7개 완전 동일(분류기, 계산기, R3 wrapper, 게시기, 검증기, 저장소, 기존 runner); 1개 `continuous-news-r3.mjs`는 main에 분류 기사 수/미분류 사유를 보고하는 **8줄 telemetry만 추가**. 점수/분류/수집 주기 변경은 아니다.
- 이전 HEAD라는 이유로 운영 소스를 최신 main으로 pull/overwrite하지 않는다. 새 V43 후보는 별도 Draft SHA `302393b7d1669b49cc2175931c45fc54c8bd5e77`로 여전히 미병합·미배포.
- 향후 source gate에서는 PC working-tree raw SHA와 GitHub LF blob SHA를 직접 비교하지 말고, line-ending 정규화 후 Git blob 또는 Git index blob과 비교할 것.

이 정정은 PC DB/D1/스케줄/공개 점수/배포를 변경하지 않는다.

## V49 실제 PC Exact-SHA 분류기 Shadow 검증 (2026-10-19 10:27 KST)

- PC 읽기 전용 도구 상태: `V49_EXACT_R3_3_PC_SHADOW_PASS`, `FINAL_EXIT_CODE=0`.
- 소스는 GitHub 고정 commit `99af2b9e5df4e7cc7e4f3aa86d2d0cefc7c9ca27`에서 얻어 SHA 검증한 실제 `reference-flow-r3.mjs` blob `d94f76f55d4649f5fa28ac00afa1eedeab6f60b0`와 기존 고정 weight blob `16e821911ee3951f4a403264889a80c5a336ab46`를 사용.
- 원문 receipts 110개, 최신 고유 URL 108개, 구버전 판단 연결 108/108, **실제 분류 차이 1개(L10만)**. 현재 반영 신호 11→10, 기존 보류 중복 1 유지.
- 기존 저장 점수 36.3 → **Shadow 후보** 38.7 (+2.4), 군사 16·해상 20; 가중치 변경 없음, 재구성 차트 7점, 기존 공개 당시 이력 보존.
- `providerCalls=0`, `dbWrites=0`, `publishCalls=0`, `schedulerChanges=0`, `runtimeSourceChanges=0`. 실제 Production 게시 또는 PC 런타임 전환 아님.
- 원장 관측 범위는 PC 읽기 시점 스냅샷. 후속 뉴스가 실제로 추가·수정되면 실제 게시 점수는 38.7로 고정된다고 보장할 수 없음. 결과·출처 최신성을 게시 시 다시 확인해야 함.

## V47–V48 격리 통합 검증 및 배포 Gate

- V46 R3_2→R3_3 기존 저장 source/decision 보존·반복 실행 무중복·실패 시 last-valid 보존을 in-memory SQLite에서 검증.
- V47 `calculateOperationalR3`가 생성한 실제 R3_3 projection을 공개 유효성 계약으로 검사, mock D1 게시/정확한 재조회, 원격 타임아웃 후 불명확한 결과 차단, 원격 newer snapshot 보존 검증.
- V48 `storedIranProgressResponse`와 `iranView`로 후보 38.7 수신 및 score 변조 시 HTTP 503 fail-closed를 확인. 이는 동일 코드의 **mock D1/API test**이며 실제 Production UI 검증과 구분.
- V48 최종 GitHub CI run `39184781315` **SUCCESS**, 당시 candidate head `99af2b9e5df4e7cc7e4f3aa86d2d0cefc7c9ca27`.

### 실제 다음 필수 절차 (무단 실행 금지)

1. Candidate PR과 *그때*의 최신 `main`, 원격 mergeability, 실제 Production source/authorized SHA를 확인. 다른 주제 PR로 main이 전진했어도 운영 checkout을 강제 교체하거나 자동 병합하지 않음.
2. 승인된 변경 범위에서만 필요한 소스 패치 및 공식 Git Integration deployment exact SHA 검증. 분류기 변경이 공개 Site Worker에 영향을 주지 않는다면 **데이터 갱신용 불필요한 재배포를 강제하지 않음**.
3. PC 예약 작업의 활성 E: 런타임 경로·구버전 R3_2 SHA·등록된 launcher·실행 기록 재확인 후, 사용자 승인 방식으로 **별도 candidate worktree/test→최소 전환**. 기존 실행/저장/복구 자료 보존.
4. 실제 운영 수집·계산·로컬 체크포인트 성공을 확인한 다음 승인된 publish를 한 번만 수행. 결과 불명확할 때 무조건 재실행하지 말고 저장 ledger/D1을 먼저 재조회.
5. 공개 D1 결과의 `sourceVersion/sourceStoredAt`, 게시 시각, API 응답, PC·모바일 UI 값과 날짜를 각각 확인하고, 다음 정규 Scheduler 1회 성공을 별도로 확인.

R4 별도 실증 연구는 2차 R3 MVP 게시의 BLOCKER가 아님. **단독 CI PASS, V49 Shadow PASS는 배포 완료가 아님**.
