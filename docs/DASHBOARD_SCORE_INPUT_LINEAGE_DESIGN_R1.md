# ZGMINI 68개 점수 — 입력 변경 감지·일별 사건 보존 설계 R1 (운영 미적용)

- 작성: 2026-11-10 KST.
- 개발 기준: `ansqhd5774-Choi/zgmini` 최신 `main`의 source(본 문서 조사 시점)와 사용자 승인 공통 기준 `docs/DASHBOARD_SCORE_DAILY_UPDATE_STANDARD_R1.md`.
- 계획·보고용 브랜치: `codex/ui-improvements`. **본 문서는 구현/운영 설치/DB/API 계약 수정 승인이 아니며 코드·예약·DB·배포 쓰기 0건**.
- 대상: D27·S11·T30=68개 논리 콘텐츠. 68개를 동일한 업데이트 주기나 동일한 계산기로 통합하지 않는다.

## 1. 확인된 구현상 문제와 영향 범위

1. `worker/market-operational-store.mjs`의 `writeScore`는 새 원자료 여부와 별개로 `market_public_snapshots_v1`의 동일 UTC 일자 및 `current`를 `stored_at=now`로 갱신할 수 있다.
2. `worker/projection-checkpoint-r52.mjs`의 `readCoreCheckpoint`는 위 공개 `current.stored_at`을 `core:<stored_at>` 및 `sourceStoredAt`으로 사용한다. `run-local.mjs`의 상세점수 rebuild 비교도 이 버전·시간을 확인한다. 따라서 **공개 결과 저장 사건을 새 원자료 사건으로 오인할 가능성**이 있다. 이는 소스 수준의 구조적 위험이며 실운영 과다 계산 건수는 아직 UNKNOWN이다.
3. `worker/projection-source-r52.mjs`는 상세점수별로 다른 원천을 읽는다. `recession=macro+credit+rates`, `creditRisk=macro+credit`, `debtRisk=macro+credit+bisDsr+bisTc`, `supplyShock=macro+supply`, 인플레이션은 PIT/PC1, 실적침체는 별도 E1 출력, 한국 공포탐욕은 별도 history. 따라서 68개 전체를 단일 공개 current 시각으로 판정할 수 없다.
4. `scripts/pc-writer/progressive-publication.mjs`의 보조 체크포인트는 제한된 보조 입력에 대한 것으로, 모든 원지표의 전역 변경 여부가 아니다.
5. 기존 테스트 `tests/projection-checkpoint-r55.test.mjs`는 문자 그대로 `core:123` 형식을 기대한다. `sourceVersion` 계약을 바꾸면 이 테스트만 고치는 것으로 충분하지 않고 기존 소비자/Writer/운영 source에 대한 호환 판단이 필요하다.

## 2. 최소 이중 시계 설계 — 적용 전 계약 승인 필요

| 사건 | 실제 의미 | 업데이트 판단에서 사용 | 신규 공식 원관측으로 간주? |
|---|---|---|---|
| SOURCE_OBSERVED | 공급자/원지표의 관측일·발표/개정 시점 | 입력 적격성·현재 이용 가능한 vintage 판단 | 해당 원자료 계약상 신규/정정이면 예 |
| SOURCE_STORED | 실제 원자료를 로컬 저장·재조회한 시점 | 원장 증명·입력의 사용 가능 시점 | 저장시각만으로는 아니오 |
| INPUT_EFFECTIVE_CHANGED | 점수에 실제로 사용되는 입력 본문/공식 revision/필수 구성, 유효기간·READY 변동 | 해당 scoreId의 재계산 필요성 | 입력 변경의 사유를 별도 식별 |
| SCORE_CALCULATED | 기존 승인 산식으로 저장 입력을 계산한 시점 | 사건별 결과 이력·방법론 SHA | 아니오 |
| PUBLICATION_VERIFIED | 로컬 결과→D1 개별 key readback 일치 | 공개 시점/전파 지연 계측 | 아니오 |
| DAILY_FINALIZED | 승인된 날짜 경계에 속한 마지막 유효 계산/게시 사건 확정 | 당시 일별 차트 원본 보존 | 아니오; 일별 점수 확정≠월/분기 원지표 확정 |

- **입력 감지 후보:** 각 `scoreId`가 사용한 source key와 실제 원관측일·revision/내용 digest·방법론 버전·입력 완전성/유효 상태·계산 기준일을 포함하는 결정적 입력 서명. 수집 응답 전체/키를 공개 D1에 복제하지 않는다.
- **잘못된 생략 방지:** 동일한 원자료 body라도 TTL 만료, 거래일/휴장·KST 날짜 경계, 신규 완료 관측월/분기, 공식 정정은 계산/상태 판정을 바꿀 수 있다. 따라서 본문 해시만으로 모든 재계산을 차단하지 않는다.
- **버전·시각 분리:** `inputSignature`가 실제 입력 계약의 변화를 나타내고, `calculatedAt/publishedAt`은 산출·공개 사건을 표현한다. 기존 `sourceVersion/sourceStoredAt` 소비자가 요구하는 단조성·과거 판본 비교 보호를 깨지 않는 최소 연결방식을 정한다.
- **현재/일별 원본 분리:** `current` UPSERT는 허용된 현재 게시를 유지하되, 과거 당시 점수는 실제 계산 사건/불변 일별 최종 스냅샷으로 보존. 수정 시 `revision/supersedes`를 명시; 재구성 데이터를 과거 실제 계산으로 표기하지 않는다.
- **일자 정책 미결:** UI 기본 시간대 KST는 기존 승인. 미국·한국별 거래일 소속, 일별 최종 cut-off, 이전 날짜에 늦게 도착한 정정의 표시는 별도 명시 승인 전 확정하지 않는다. 임시로 새 예약을 만들어 일일 확정을 실행하지 않는다.

## 3. 이행 범위와 Gate

1. **계약 검사(읽기 전용):** scoreId별 실제 input table/history, source observation/revision 및 PC 승인·실행 SHA와 공개 버전 대응표. 증거 없는 입력은 UNKNOWN.
2. **개발용 단위 시뮬레이션:** 새 원자료 없음/공개 current 재저장만 있음, 같은 날짜 유효 신규 월간 입력, 미완성 분기, 공급자 정정, TTL 만료, 여러 번 재계산, 미국/한국 날짜 경계, Writer·D1 실패 8개 이상. 기존 산식·READY·출력값 절대 변경하지 않는다.
3. **필요 최소 코딩(승인된 기능 개발 브랜치):** 기존 Writer와 읽기 전용 source reader의 checkpoint 계보를 정교화. 동일 DB/공유 Writer 작업은 단일 담당·lease 보호, 다른 기능 브랜치 소스 전체 병합/덮어쓰기 금지.
4. **계약 변경 승인 Gate:** 새로운 DB 필드·유일 key·D1 projection, 현행 `sourceVersion/sourceStoredAt` 뜻/형식, cutoff/finality, 과거 일별 정정 저장이 필요하면 관련 필드·영향·호환 시험을 명시해 사용자 승인 받기 전 운영 쓰기 금지.
5. **실운영 종단 Gate:** 승인된 단일 신규 실제 입력 한 건 이상에서 원관측→로컬 저장→계산→로컬 결과→D1 값/시각/해시 readback→공개 API/UI를 동일 ID로 검증. 68개 중 검증된 분자만 PASS, 미게시 테마를 이유로 다른 독립 기능 차단하지 않는다.

## 4. 브랜치 충돌 예방 — 실제 확인한 상태

| 파일 | 최신 `main` blob SHA | 기존 `codex/ui-improvements` blob SHA | 판단 |
|---|---|---|---|
| `worker/projection-checkpoint-r52.mjs` | `e1d3a8e340a994be69eebb7727727e6c10aef35a` | 동일 | 원인 확인만, 계약 변경 미승인 |
| `scripts/pc-writer/run-local.mjs` | `9d19ce2b92d61de2fc9dad24d6422a5a077f4ebb` | `a38bf770ec65e2f504145e6a40cda088d0ac8928` | **서로 다름. 기존 UI 브랜치 쪽 공유 Writer 전체 교체 금지** |
| `scripts/pc-writer/progressive-publication.mjs` | `ccc9cc7706962e15224bbaf431467212c2ee093f` | `f0b24ade1ae9b7e22c549ff7c4f83d499cfff991` | **서로 다름. main 최신 보조입력 로직 보호** |
| `tests/projection-checkpoint-r55.test.mjs` | `6180c619b0399b687803b7872d0bdca5caec08a6` | 동일 | `core:<stored_at>` 기존 계약 회귀 보호 |

기존 `codex/ui-improvements`는 GitHub AGENTS.md의 **UI 작업 전용 브랜치**다. 문서/표시계획 정리는 여기서 유지하지만, 공통 Writer·DB·운영 backend 변경을 이 브랜치로 몰아넣지 않는다. 사용자가 지정한 별도 관련 기능 개발 브랜치 또는 승인된 기존 소스 회수 경로를 확인한 다음 해당 최소 파일만 개발·테스트한다. 변경할 파일 경로가 겹치면 GitHub 최신 main과 누적 diff를 먼저 대조한다.

## 5. 진행 판정

- 68개 분모 식별 **68/68**; 공개 API 경로 조사 **11/11**; 재사용 PC 원장 **7건**.
- 인과 chain 완전 실증 **0/68**. 설계 원인과 회귀 범위 식별 완료; **3단계 계약 확정/구현/운영 PASS는 아님**.
- 다음 필수 작업: 실제 PC 승인 source의 score별 원본 체크포인트·현행 소비자 계약 차이를 읽기 전용으로 확인해 최소 수정 파일을 특정한다. 뒤이어 필요한 데이터·이력 계약 승인과 기능 브랜치 경로를 확정한다.
