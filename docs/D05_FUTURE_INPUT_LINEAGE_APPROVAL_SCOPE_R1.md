# ZGMINI D05 미래 계산 사건 입력 계보 — 승인 검토 계약 R1

> 2026-11-10 KST · 상태: **SCOPE_A_DEVELOPMENT_APPROVED / PC_OPERATION_NOT_APPROVED**. 사용자의 "계속해라"에 따라 전용 브랜치의 비운영 코드·fixture 검증을 착수했다. 운영 Writer·Reader·DB·D1·Controller·예약·공개 UI 변경, 정규 B 설치 또는 PC 실행은 승인받지 않았다.

## 목적·현재 근거

- D05 종합점수 CM-R1에서 **실제로 발생하는 미래 계산 사건 1개**의 당시 선택 입력과 로컬 저장 점수·공개 사건을 같은 `calculatedAt`으로 추적한다. 과거 사건의 누락된 원자료 SHA·revision을 최신 데이터로 소급 생성하지 않는다.
- 현행 `composite-observed:UTC-YYYY-MM-DD`에는 `calculatedAt,score,asOfDate,signature`와 로컬 `stored_at`이 있고, D1↔공개 관측 API 사건 **1건/1건 일치**를 읽기 전용으로 확인했다. 출력 FNV32 서명은 **입력 원문 해시가 아니다**.
- 개발 브랜치의 선택형 `onInputEvidence`와 `linkMarketInputEvidenceToStoredArchive`는 사후 7 batch 읽기 증거를 비교한다. 성공 상태는 **`LINKED_SELECTED_7_BATCHES_ONLY` / `LOCAL_PC_ONLY`**이며 12영역 전체 원입력·공식 revision·실효 TTL·게시 D1 결과 증명은 아니다. 기존 `run-local.mjs`에는 미연결이다.
- 기존 `readValidatedInput`의 기본 SQL `SELECT body,stored_at ... LIMIT 10`과 반환 `{body,storedAt}`은 유지했다. 범위 A 개발에서는 **명시적으로 선택한 경우에만** 원래 유효 행 결정 SQL에 `batch_key`를 추가하고 선택 순간 ID·시각을 callback으로 포착한다. 개발 shadow는 여전히 별도 SELECT로 저장행 본문 SHA-256을 재검증한다. 선택 순간 ID와 나중 읽은 행이 불일치하면 `UNPROVEN`이며, 선택 metadata만으로 완전한 인과를 주장하지 않는다.
- `readStoredMarketInputs`는 선택 후 36시간/BIS별 TTL 및 macro `seriesStoredAt` 병합을 적용한다. **선택된 배치=계산에 실제 반영된 원자료**로 단정할 수 없다. SEC 위험, E1-R5 실적, Breadth 및 다른 Reader는 별도로 추적해야 한다.
- 범위 A 개발 전 fixture 기준 **75/75 PASS**, 선택 metadata·불변 사건 후보 판정 및 교차 키 증거 거부 추가 후 관련 회귀 **101/101 PASS**. 실제 Windows Writer·과거 원입력·전체 D1 종단은 미검증. 기존 [공통 #1206](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1206) 마지막 확인 당시 open/댓글 0; #1023의 `OPERATION_NOT_ALLOWED` A는 재실행 금지.

## 최소 승인 대상 — 두 개의 독립 범위

| 범위 | 변경 후보 | 완료 주장 한계 |
|---|---|---|
| **A. 미래 7배치 부분 계보** | 기존 Reader의 유효 행 결정 순간에만 선택형 비민감 metadata hook: 정확한 batch key·원래 저장시각·저장 body SHA-256. 계산 후 TTL·macro series 실효 반영 여부를 별도 판단. 기존 계산·선택 순서·조회 횟수·산식 유지. | 7개 저장 배치의 **부분 인과 증거**. 아직 SEC/E1-R5·Breadth 포함 12영역 완료 아님. |
| **B. D05 전체 동일 사건 계보** | 승인된 독립 SEC/E1-R5·Breadth Reader의 실효 입력 ID·관측일·공식 정정/revision·local checkpoint를 A와 같은 계산 사건에 묶는다. | 필요한 모든 실효 원입력·정정 이력과 원본 해시가 확인된 경우에만 `FULL_INPUT_LINEAGE_VERIFIED` 후보. 증거 부족은 `UNPROVEN` 유지. |

**범위 A의 비운영 개발·시뮬레이션만 승인됐다.** 두 범위 모두 실제 **운영 B 설치·소유권·필드·저장 위치·보존 기간의 사전 승인 필요**. A 개발 승인이 B 개발·운영 승인을 의미하지 않는다.

## PC 전용 원장 저장 계약 초안 — 확정 아님

- 저장 위치 후보: 등록된 실제 PC 지속형 데이터 경로 아래 별도 `score-lineage/d05-composite-events-v1.jsonl` (예시 E: 경로는 실제 Runtime 확인 전 하드코딩 금지). GitHub·Issue·D1·공개 API에는 원본 batch key/SHA·기밀 정보를 올리지 않는다.
- 승인 요청 필드 최소안:
  - `schema=D05_COMPOSITE_INPUT_LINEAGE_LOCAL_V1`, `eventId=D05/CM-R1/<calculatedAt>`(이벤트 고유 키)
  - `calculatedAt`, `asOfDate`, `score`, `outputSignature`(FNV, **출력**) 및 `archiveKey`, `archiveStoredAt`(로컬 archive 저장)
  - `runtimeSourceSha`와 `approvedSourceSha`(각각 실제 실행/승인 정본으로 구분)
  - `inputScope=SELECTED_7_BATCHES_ONLY`, `inputStatus`, `sources[7]`의 `sourceKey,batchKey,storedAt,storedBodySha256` (선택 확인 때만)
  - `effectiveUseVerified=false`, `completeD05InputLineage=false` (12영역 실효 입력 미완료일 때 고정)
  - `recordedAt`, 민감정보 없는 `stableEvidenceDigestSha256` (`recordedAt` 제외한 동일 사건 증거의 안정적 SHA-256), `selectionEvidence` (`DIRECT_ID_AND_EXACT_ROW_MATCH` 또는 `POST_SELECTION_UNIQUE_MATCH`)
- 원장 필드·지속 저장·보존기간(최소 1년 이후 공식 정정 유예 포함 여부)·백업/복원·권한·호환성은 **사용자가 확정하기 전까지 미승인**. 본문 원자료·token·전체 env/SQL 출력·외부 전송을 금지한다.
- **단일 Writer 직렬화/원자적 append 계약도 미확정**이다. 정규 B 설치용 lease가 계산 도중 발생하는 모든 로컬 기록을 직렬화한다는 증거는 없다. append 파일 어댑터·`run-local.mjs` 실행 연결·실제 JSONL 쓰기는 이 소유권 및 부분쓰기 복원 계약 확인 전 구현·실행하지 않는다.

## 이번 범위 A 개발 결과 — 비운영 코드만

1. 기존 Reader `readValidatedInput`와 7개 입력을 읽는 `readStoredMarketInputs`에 **선택형 `onSelection` 관측만 추가**했다. 기본 선택 순서·기본 SQL·입력 반환·TTL·계산 산식은 그대로 유지한다. callback 예외는 유효 입력 선택을 중단하지 않는다.
2. `market-input-observation-shadow-r1.mjs`는 유효 행 선택 순간 `batchKey/storedAt`과 기존 별도 읽기에서 검증한 저장 body SHA-256을 대조한다. 각 입력 ID가 일치한 항목만 `READER_DIRECT_ID`로 표시하고, 조회 중인 키와 다른 callback `sourceKey`·모순·중복은 `UNPROVEN`으로 안전 거부한다. 7개 모두 직접 확인했을 때만 사건 전체를 직접 증명으로 분류한다. `composite-archive-lineage-link-r1.mjs`는 정확한 같은 사건의 `score/asOfDate`를 부분 증거에 포함한다.
3. 신규 순수 함수 `d05-lineage-event-contract-r1.mjs`는 `PREPARED_LOCAL_ONLY` 7배치 부분 사건 후보를 만들고, 기존 JSONL 문자열과 비교해 `APPEND_READY`/`NOOP_SAME_EVENT`/`UNPROVEN`을 판정한다. **파일·DB 읽기/쓰기 기능은 없다.** 동일 이벤트 다른 digest 충돌, 손상/부분 행, 위조 필드를 거부한다. 모든 상태에서 `effectiveUseVerified=false`, `completeD05InputLineage=false`, `publicD1Verified=false`를 보존한다.
4. 관련 fixture/회귀 **101/101 PASS**. 이는 source 개발 검증이며 실제 PC source SHA·정규 B 설치·로컬 원장 append·D1/API 공개 연계·1년 완성 증거가 아니다.

## 승인 이후에만 허용될 실행 순서

1. 실제 승인된 Writer source/설치 SHA와 공용 lease, 로컬 데이터 경로·백업 소유권을 확인한다.
2. 계산을 수행하는 같은 `now`에서 **선택형** 입력 메타를 메모리에 포착한다. 외부 공급자 호출 금지, 기존 저장 입력·계산법 불변.
3. 기존 `writeScore`와 `appendCompositeObservedFromCurrent`가 완료되고 archive가 **`LOCAL_STORED`**인 경우에만 정확한 `calculatedAt,score,asOfDate,outputSignature`를 저장 body와 재조회해 연결한다.
4. 검증된 증거만 승인된 PC 로컬 불변 원장에 **단회 append**한다. 같은 `eventId`·동일 digest는 중복 기록 없이 NOOP; digest 불일치는 `EVENT_ID_CONFLICT`로 원본 보존. 파일 부분쓰기/재시작 불명은 `LINEAGE_RECORD_UNKNOWN`이며 기존 원장 readback 후 판정, 신규 계산/Writer B 자동 재요청 금지.
5. `UNCHANGED`, 15분 억제, archive 부재·입력 불완전·증거 조회 실패는 **신규 입증 사건 0건** 및 `UNPROVEN`으로 기록한다. 정상 점수 계산·게시를 중단시키지 않는다.
6. 동일 UTC 하루의 archive row `stored_at`은 다음 점수 append 시 전진한다. 즉시 readback에서 `stored_at===now`를 확인하되, 후일 점검은 `stored_at>=event.archiveStoredAt`와 정확한 `points[]` 사건 존재를 함께 대조한다.
7. 승인된 최소 Writer B 설치와 실제 Windows 사건 **1건**이 성공한 뒤 원자료→선택/실효 입력→계산→로컬 archive/원장→D1 개별 key→API/UI의 시각·해시·점수를 검증한다. 그 전에는 전체 완료율에 가산하지 않는다.

## 안전·비범위

- **`run-local.mjs`를 `DRY_RUN`으로 직접 실행해 테스트하지 않는다.** `--publish`가 없어도 `writeScore`·archive append가 로컬 SQLite에 쓰기를 수행할 수 있다. 개발 검증은 fixture `node --test`로만 한다.
- 기존 `local-market-ledger.json`/publication ledger/last-run/report/이벤트 원장을 임의 확장하지 않는다. 기존 것은 공개 충돌·복구·실행 보고 계약으로 새 입력 계보용이 아니다.
- 승인 없는 새 DB/D1 table/key·TTL/산식/주기·작업 Task/Controller·Cloudflare 배포·UI 변경 금지. 공통 #996 C 복구에는 개입하지 않는다.
- 당시 확정 이력 1년을 재구성했거나 모든 68개를 처리했다는 주장은 금지. KST 일별 확정 cutoff, 이월·revision/supersedes 공개 계약은 **별도 승인 과제**다.
- 현재 별도 실측: D05 공개 계산 사건 UTC 9일/KST 8일·총 34건; CNN 실제 관측 사건 **5일·108건**. 과거 252세션 재계산 점수는 날짜별 당시 확정 점수와 구분. **68개 실제 1년 종단 PASS=0/68**.

## 승인 결정에 필요한 확인 항목

- [x] 범위 A **전용 브랜치 개발·fixture 시험만** 진행 (운영 효과 제외)
- [ ] 범위 B의 실효 입력/전체 계보 개발 및 운영 승인 여부 결정
- [ ] D05 PC 로컬 불변 메타데이터 원장 신설/필드/실제 경로/보존 기간 승인
- [ ] Reader 선택형 메타 수집·Writer 연결/로컬 append 변경과 정확한 정규 B manifest/백업·재검증 범위 승인
- [ ] 실제 설치 전 운영 source SHA/lease/Reader의 원본 보호 확인

**진행률: 0/68(0%→0%).** 사용자가 허용한 것은 범위 A 개발에 한정한다. 문서·브랜치 코드를 저장해도 나머지 운영 항목이 승인되거나 설치·게시됐다고 처리하지 않는다.
