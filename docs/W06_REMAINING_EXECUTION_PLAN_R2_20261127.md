# ZGMINI W06 잔여 실행계획 R2 — 실제 CNN 관측값 종단 완료

기준일: 2026-11-27 KST  
상태: **R2-01 SQLite·D1·observations API 기준점 PASS / R2-02 신규 읽기 확인 SOURCE_UNCHANGED / 운영 종단 0/1**  
담당: W06 — 미국 CNN 공포·탐욕지수 60초 수집·저장·공개·화면 연동  
기능 저장소: `ansqhd5774-Choi/zgmini`  
계획·진행 원장 브랜치: `codex/w06-cnn-1min-intraday-20261124`  
기존 정본: [W06 실행계획 R1](W06_CNN_1MIN_INTRADAY_EXECUTION_PLAN_R1_20261124.md)  
기존 증거 원장: [W06 진행 원장 R1](W06_CNN_1MIN_INTRADAY_PROGRESS_LEDGER_20261124.md)  
운영 제어 저장소: `ansqhd5774-Choi/zgmini-pc-control`  
이 문서는 R1의 1~6단계를 재시작하지 않고 **3·5단계의 미입증 부분과 7단계**를 끝내기 위한 잔여 실행 문서다. 설치·병합·검사만으로 종단 완료를 선언하지 않는다.

> 실행 기록 (2026-11-27 KST): [제어 Issue #4047](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4047) / [Run #45876724451](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45876724451) `PASS/CNN_SQLITE_D1_API_1D_1W_MATCHED`. SQLite·D1·공개 observations API 1D/1W 동일 원본 시각과 정밀 점수 일치, JSON/TXT 2/2 직접 확인. CNN 원본 `2026-11-26T01:59:59.000Z`, 점수 `14.9967450271248`로 이전 #3989 대비 미변동. 실제 공개 브라우저의 CNN 카드 **15.0점·관측일 2026-11-26**은 같은 원본의 표시값과 일치했으나, 별도 `/api/fear-greed` JSON 현재값 GET 및 실제 신규 원본의 Production 무새로고침 자동 반영은 아직 직접 확인하지 않았다. 실제 비교·다음 상태는 [기존 진행 원장](W06_CNN_1MIN_INTRADAY_PROGRESS_LEDGER_20261124.md)의 20-32에 기록했으며 같은 A 요청을 반복하지 않는다.

> R2-02 실제 운영 확인 (2026-11-27 KST): [Issue #4053](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4053) / [Run #45877652042](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45877652042) `PASS/FEAR_GREED_ARCHIVE_READONLY_DIAGNOSIS`, 실제 원본 `observedAt=2026-11-26T01:59:59.000Z`, `score=14.9967450271248`로 #4047 대비 미변동. 구형 Core Archive Sidecar의 별도 `BLOCKED` 진단은 원인 미확정이며, 승인된 설치 SHA가 구형 진단 allowlist에 없는 문제와 W06 독립 `--cnn-minute` 경로를 분리했다. 신규 관측 전파 미확인은 유지하고 기존 성공 진단을 반복하지 않는다. 자세한 대상별 근거는 [진행 원장 20-33](W06_CNN_1MIN_INTRADAY_PROGRESS_LEDGER_20261124.md)에 기록.

## 1. 목적·승인 범위·확정된 기준

### 1.1 최종 목표

실제 CNN이 새 `observedAt`으로 발표한 **표시 점수 변화** 한 건 이상을 기존 정상 수집 경로에서 자연 취득하고, 아래 각 단계가 **동일한 원본 관측시각·원본 점수**를 가리키는지 입증한다.

```text
기존 CNN PT1M Task/수집 → 로컬 SQLite 원본·관측 이력
→ 기존 게시기 → D1 공개 projection
→ 저장 전용 API (/api/fear-greed 및 /api/fear-greed/observations)
→ zgmini.kr PC 1440px·모바일 390px 최신 점수/선형 차트 자동 반영
```

`checkedAt`은 **PC가 확인한 시각**, `observedAt`은 **CNN이 제공한 원본 관측시각**이다. 이 둘을 같은 신규 차트 관측으로 취급하지 않는다. 동일 점수 재확인이나 CNN 원본 미변동은 정상일 수 있다.

### 1.2 다시 하지 않을 이미 완료된 업무

| 완료 증거 | 현재 유효 범위 | 다시 실행하지 않는 작업 |
| --- | --- | --- |
| 제어 Issue [#3985](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3985) / Run 45863542119 | 정규 Writer B의 CNN 1파일 설치 성공 | 실패 #3969 재실행·기본 Writer 재설치 |
| 제어 Issue [#3998](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3998) / Run 45865681482 | 설치 후 HTTP 10/10 정상, 9개 간격 중앙값 60초·최대 71초 | 같은 간격 진단의 무의미한 반복·추가 Task |
| 제어 Issue [#3989](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3989) / Run 45864401383 | 당시 SQLite↔D1↔API 1D/1W 일치 | 이를 신규 관측값 전파 성공으로 오해 |
| 본체 PR [#1707](https://github.com/ansqhd5774-Choi/zgmini/pull/1707), [#1714](https://github.com/ansqhd5774-Choi/zgmini/pull/1714), [#1716](https://github.com/ansqhd5774-Choi/zgmini/pull/1716), [#1720](https://github.com/ansqhd5774-Choi/zgmini/pull/1720) | 사용자 승인 차트 UI·툴팁·기간별 밀도·왼쪽 시작 수정과 관련 CI/배포 | 추가 버튼·설명·스타일 변경, 기존 수정 재작업 |
| 본체 `main` 병합 `7b29bd8dad6635cfa20ed26e11ad890b9f205c3d` | 마지막 확인된 차트 소스·Cloudflare Git 빌드 성공 및 Production 경로 검사 | 소스 병합을 실데이터 관측 성공으로 간주 |

기존 #3989 시점의 마지막 확인 원본은 **`observedAt=2026-11-26T01:59:59Z`, `score=14.9967450271248`**이다. 이는 그 영수증의 역사적 기준값으로만 사용한다. **현재 최신 원본이라고 가정하지 않는다.** 브랜치 및 배포 SHA 역시 조사 때 최신 실제 상태와 비교하되 정상 완료 증거를 초기화하지 않는다.

### 1.3 확정 차트 계약

| 기간 | 표시 간격 | 필수 동작 |
| --- | --- | --- |
| 1D | 실제 원본의 1분 집계 | 별도 '확인 이력·1/5/10/30분' 버튼 없음 |
| 1W | 실제 원본의 30분 집계 | 7개 데이터로 제한하지 않음 |
| 1M | 실제 원본의 5시간 집계 | 30개 데이터로 제한하지 않음 |
| 3M·6M·1Y | 뉴욕 관측일 기준 일 단위 | 실제 장중 관측 없는 날만 기존 일별 데이터 사용 |

전체 기간에서 원본 없는 분·일에 값 복제/보간·가짜 점수 생성 금지. 기존 선형 차트, 요청된 기간 버튼, 간결한 툴팁, 사용자가 확인한 **실제 첫 점부터 왼쪽 시작**을 보존한다. 0·null·missing·stale을 혼동하지 않는다.

## 2. 남은 실행 순서 — 각 단계에서 증거를 회수하고 계속 진행

### R2-01. 현재 읽기 기준점 확정 — 신규 원본이 없어도 즉시 실행 가능

**실행:** 최신 운영 체크포인트/기존 read-only 영수증과 현재 `main`·Production의 실제 적용 버전을 대조한다. 공개 API를 신규 수집 없이 GET으로 읽는다. 마지막 유효 원본 `observedAt`·정밀 점수, `checkedAt`·HTTP 확인, D1 공개 저장일·게시 시각(실제 제공되는 필드만)을 분리 기록한다.

- 공개 `GET /api/fear-greed`의 실제 값·시각을 읽는다.
- 공개 `GET /api/fear-greed/observations?period=1D` 및 `1W`의 `status`, `range`, `availableDays`, `totalObservedPoints`, `sampled`, `points[{observedAt,score}]`, `verifiedCheckCount`, `checkedPoints[{checkedAt,sourceObservedAt,score}]`을 대조한다.
- 필요할 때만 `1M` 이상을 읽어 `sampled`와 마지막 실제 관측 시각이 유지되는지 확인한다. 공개 라우트는 저장형 D1 조회이며 **원 공급자 호출을 하지 않는다**.
- 현재 배포 버전은 기존 Cloudflare Git 빌드 결과, Production 경로 검사, 실제 활성 버전이 더 필요할 경우 기존 허용 `w05-cloudflare-deployment-readonly` 단회 A 조회로 확인한다. 이미 유효한 자료라면 재조회하지 않는다.
- 원본 변화가 없는 동안에도 UI의 기존 최신값·기간 선택·첫 점 좌표·툴팁 읽기 점검은 독립 수행할 수 있다. 사용자가 확인한 같은 UI 동작을 이유 없이 반복하도록 요구하지 않는다.

**결과:** 기준 원본의 시각·정밀 점수·최신 확인시각·가용 범위·API 메타필드·활성 화면/배포 버전과 조회 시각을 기존 W06 원장에 기록. **첫 신규 원본이 아직 없다면 `SOURCE_UNCHANGED`이지 수집 장애나 DONE이 아니다.**

### R2-02. 정상 자연 실행에서 첫 실제 변화 관측 — 신규 원본 발생 조건부

**선행:** R2-01의 기준 원본 확보. 기존 PT1M Task는 그대로 사용한다. 새 수집·감시 예약, 새 공급처 호출, 임의 재실행은 하지 않는다.

**실행:** 기존 승인 수집의 최신 이력에서 원본 `observedAt`이 이전 기준과 달라졌는지, 원본 점수와 소수점 첫째 자리 표시값이 달라졌는지 별도로 확인한다.

- `observedAt`이 동일하고 `checkedAt`만 증가 → **정상 재확인**, 원본 신규 점/새 표시값으로 계산하지 않고 R2-01의 독립 조회를 계속할 수 있다.
- `observedAt`은 새롭고 원본 점수가 같거나 표시값이 같음 → **신규 원본 저장 경로 검증은 가능**하지만 R1에서 요구한 '실제 표시 점수 변화'의 종단 완료 증거와 구별한다.
- `observedAt`도 새롭고 표시 점수가 실제 바뀜 → 해당 **자연 관측 한 건**을 종단 검증 대상으로 고정한다. 이후의 수정 없이 같은 점수·시각으로 R2-03~05를 진행한다.
- 과거 시각에 늦게 도착한 원본 또는 동일 시각 정정 → 기존 충돌/정정 규칙대로 보존·판정. 늦은 자료를 현재 최신으로 소급하거나 훼손하지 않는다.
- 시장 휴장/공급처 미발표 시에는 **원본 미변동만 기록**한다. 임의 완료일·다음 날 재진단·반복 A 요청을 새 완료조건으로 만들지 않는다.

**결과:** 자연 관측 `observedAt`, 원본 `score`, 표시 점수, 수집 `checkedAt`, 관측/수집/게시 시각의 의미를 갖춘 **하나의 고정 비교 대상**. 실제 관측이 없으면 해당 부분만 PENDING으로 남긴다.

### R2-03. 로컬 SQLite 원본·관측 이력 확인 — 가장 이른 불일치 지점 분리

**실행:** R2-02의 대상 값에 대해 기존 설치된 읽기 전용 PC 조회 기능과 과거 [#3989](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3989)의 승인된 조회 경로를 우선 재사용한다. 현행 설치 schema·허용목록에 맞는 단회 고유 `pc-job`만 필요 시 발행한다. `requestId`별 실제 Issue/Run·실행 SHA·JSON/TXT readback을 회수한다.

1. 저장한 `observedAt` 및 원본 정밀 `score`가 로컬 SQLite에 실제 존재하는지 확인한다.
2. 동일 시각의 중복, 동일 `checkedAt`과의 혼합, 관측 날짜(UTC/뉴욕), 0/null/missing 구분을 확인한다.
3. 최신 관측 전후의 기존 유효 이력이 유지되는지 확인한다. 데이터 손상·임의 정정·가짜 채움을 허용하지 않는다.
4. 자연 수집은 성공했으나 원본 저장이 비어 있으면 수집 성공과 원본 저장 실패를 분리해 그 단계의 기존 실패 로그·checkpoint·조건만 분석한다.

**결과:** 원본과 SQLite 관측 행의 정확한 `observedAt`·`score` 일치 여부 + 실제 저장/조회 실행 증거. 단순 행 수/HTTP 200으로 PASS 처리하지 않는다.

### R2-04. D1 공개 결과·저장 API 일치 확인 — 저장과 게시 분리

**실행:** 로컬에서 확인한 동일 관측을 승인된 기존 공개 게시 결과에서 읽어 대조한다. D1 공개 `public_feed_snapshots_v1`의 기존 CNN 관측 archive와 공개 점수 projection, API 결과를 구분한다. **조회 때문에 새 공급처 수집이나 D1 쓰기를 트리거하지 않는다.**

1. 로컬 SQLite 원본과 D1 공개 관측값의 `observedAt`·원본 정밀 점수·날짜 키(저장된 그대로)를 대조한다.
2. D1에서 값이 확인되면 `GET /api/fear-greed`의 최신값·시각과 `GET /api/fear-greed/observations?period=1D`, `1W`의 동일 `points`를 비교한다. 필요할 때 `1M`·`3M`도 조회한다.
3. 공개 관측 API는 `Cache-Control: public, max-age=60, must-revalidate` 계약이다. 실제 응답 관측 시각·캐시 조건을 기록하고 아직 합리적 캐시 구간인 응답을 즉시 게시 장애로 단정하지 않는다. 반대로 60초 설정만으로 API 최신성을 보증하지 않는다.
4. `1M` 이상 응답의 `sampled=true`와 `totalObservedPoints`를 보존해 보고한다. 기존 bounded sampling 때문에 새 원본이 응답에 누락되는 것이 실증되면 **현재 사용자 승인 범위의 마지막점/기간별 집계 정확성에 직접 영향을 주는 경우에만** 기존 API/집계 연결에서 최소 수정 후 관련 시험·실결과를 검증한다. 무조건 보관 정책·D1 계약·TTL을 바꾸지 않는다.
5. `checkedPoints`는 `verifiedCheckCount`와 별개로 검사하되 PC 확인을 새 CNN 관측 `points`로 대체하지 않는다.

**결과:** SQLite↔D1↔API 간 **동일 대상의 `observedAt`·`score`·기간·샘플링 여부**를 포함한 대조표와 실패한 경우의 최초 불일치 경계.

### R2-05. 실제 공개 PC·모바일 차트와 새로고침 없는 반영 확인

**실행:** 기존 생산 배포에 대해 공개 페이지 `https://zgmini.kr/fear-greed/usa/`를 읽기 전용 Chromium/Playwright 계약으로 검사한다. 격리 fixture PASS와 실제 Production 데이터 검증을 별도 기록한다.

- PC 1440px, 모바일 390px에서 **사용자가 승인한 기존 UI**를 검증한다. 6개 기간 버튼 외 추가 분봉 메뉴·설명 문구가 없어야 한다.
- `1D`의 실제 1분 관측점과 `1W` 30분·`1M` 5시간·`3M/6M/1Y` 뉴욕 일 단위 차트에서 마지막 점의 실제 원본 시각·표시 점수가 공개 API와 일치해야 한다.
- 첫 실제 관측점은 왼쪽 그래프 경계에서 시작하고, 선은 저장된 관측 사이를 기존 디자인대로 연결한다. 선 시작·끝에 점수를 만들거나 기존 정상 화면을 임의 재설계하지 않는다. 사용자가 직접 확인한 왼쪽 정렬은 변경 증거가 없는 한 기존 확인을 재사용한다.
- **해당 화면을 열어 둔 상태**에서 기존 자동 저장형 조회에 의해 새 원본이 들어온다면 페이지 새로고침 없이 카드 현재값과 해당 1D 차트 마지막점이 함께 바뀌는지 실증한다. 변경이 발생하지 않은 동안에는 자동 갱신 경로의 격리 시험 PASS와 실제 종단 미관측을 분리한다.
- 휴장·동일 `observedAt`·빈 구간에서 가짜 1분 점/구간 마감 텍스트/동일 점수 재확인 점이 추가되지 않아야 한다.
- 브라우저 오류·응답 순서 역전·저장 API 일시 실패 때 마지막 정상값 보존과 지연 표시의 기존 계약을 유지한다.

**결과:** PC/모바일 화면에서 실제 공개 값·날짜·툴팁·첫/마지막 점의 근거를 포함한 시험 증거. **공개 HTML 200, SEO 검사 또는 mock 화면 PASS만으로 실관측 UI 종단 PASS를 주장하지 않는다.**

### R2-06. 실패 조건만 최소 수정·검증·최종 종결

**실행:** 위 작업에서 **최초 불일치가 재현된 대상만** 수정한다. 수정이 필요 없으면 PR·재설치·새 Task를 만들지 않는다.

| 확인된 실제 증거 | 해당 범위 가설/진단 | 다음 정규 행동 |
| --- | --- | --- |
| HTTP 자연 실행 정상, CNN 원본 `observedAt` 불변 | 공급처 미변동/휴장 | 정상 확인 유지. 신규 점수 강제 생성 금지. 원본 변경 입증만 PENDING |
| 원본은 새롭지만 SQLite 관측 누락 | 수집 결과↔저장 경계 | 기존 Writer/Sidecar 원장·관련 저장 코드의 실제 실패 조건 특정 후 최소 수정 |
| SQLite 정확, D1에 원본 누락/오래됨 | 기존 게시/checkpoint 경계 | 승인된 게시 결과·계약 조회 후 해당 기능만 복구, 읽기 요청으로 쓰기 유발 금지 |
| D1 정확, 공개 API 구버전/미포함 | 공개 reader·캐시·기간·표본 추출 | 응답 헤더·시각·`sampled`로 원인 분리 후 필요한 부분만 수정 |
| API 정확, PC/모바일 최신점 불일치 | UI 조회/기간 집계·응답 순서 | `cnn-panel.tsx`·집계/refresh 연결의 실제 실패 입력으로 수정 및 원본 재검증 |
| 공유 Runner/Controller/승인 경로의 실제 오류 | 공통 실행 자원/계약 | 정확한 Issue·Run·firstFail·원본 JSON/TXT를 총괄 범위와 연결, 독립 조회/화면 검증 계속 |
| 대상 자체가 조회 불가 | 도구/권한 관측 한계 | 기존 정상 공식 읽기 경로 확인. 미확인을 기능 장애나 전역 차단으로 확대하지 않음 |

코드 변경은 실제 `main`에서 해당 최소 파일만 별도 전용 브랜치로 수정해 관련 회귀시험, 정확 HEAD PR·병합·Cloudflare Git Integration 빌드 및 실제 API/UI readback 순서로 확인한다. PC 운영 쓰기는 기존 B 승인 manifest·파일 해시·원본 CAS·lease·백업/복구를 따른다. **무승인 SQL/쉘·직접 Wrangler 배포·DB 초기화·Task 중복·강제 복구 금지.**

## 3. 증거 수집 계약과 완료 판정

### 3.1 최종 원장에 남길 실제 값

| 계층 | 필수 비교 정보 | 근거 |
| --- | --- | --- |
| CNN/PC 수집 | `observedAt`, 원본 `score`, 자연 확인 `checkedAt`, 요청 결과 | 기존 Task/HTTP/Writer 운영 영수증 |
| SQLite | 동일 원본 시각·원본 정밀 점수·저장 여부 | 승인된 고정 읽기 원본 JSON/TXT |
| D1 | 공개 관측 archive의 동일 원본·점수, 실제 게시 시각/버전이 제공되면 그 값 | D1 readback 및 기존 게시 원장 |
| API | `/api/fear-greed`, `/api/fear-greed/observations` 각 기간의 값·시각·`sampled`·조회시각 | 공개 GET 응답 |
| UI | PC 1440px·모바일 390px 현재값·마지막점·기간·자동 반영 | 실제 Production 동적 렌더링 결과 |
| 적용 버전 | 실제 사용된 source/설치/배포 SHA와 각 시험 결과 | GitHub·기존 Runner/Cloudflare 읽기 영수증 |

기록 위치는 **기존** `docs/W06_CNN_1MIN_INTRADAY_PROGRESS_LEDGER_20261124.md` 및 해당 PC 원본 Issue/Run으로 충분하다. 매번 별도 진단 프로그램·승인 Gate·새 보고서를 만들지 않는다.

### 3.2 완료 분기

1. **DONE (W06 종단 1/1):** 자연 실행으로 확인된 CNN의 진짜 **표시 점수 변경** 관측과 그 정밀 원본·시각이 SQLite, D1, API, PC·모바일의 최신 표시까지 한 체인으로 일치한다. 새로고침 없는 갱신이 실제 관측되었거나 기존 동일 버전·조건의 유효한 실증 증거로 직접 충족된다. 기존 이력·다른 기간·원본 보존·차트 스타일에 관련 회귀가 없다.
2. **PARTIAL / SOURCE_UNCHANGED:** 60초 HTTP·기존 데이터 일치·API·정상 화면은 확인됐지만 진짜 CNN 표시 점수 변화 자체가 아직 없어 신규 변동 전파를 입증하지 못했다. 이는 수집 실패나 총체적 BLOCKER가 아니다. **운영 종단 0/1 유지.**
3. **RUNNING:** 기존 batch/원본 checkpoint·관측시각이 실제 전진 중이면 실행 중으로 유지하고 인위적 timeout으로 FAIL 판정하지 않는다.
4. **FAILED / BLOCKED:** 수집·DB·D1·API·UI 중 구체적인 현재 실패 조건 또는 승인/자원 충돌이 실제로 종단 행동을 막는 경우만 그 지점을 명시한다. 무관한 다른 프로젝트/PR·누락된 과거 증거는 NON_BLOCKING으로 분리한다.

### 3.3 진행 순서 요약

```text
[지금]  R2-01 기존 최신 read-only 증거 + API/Production 실제 상태 대조
   ├─ 새 observedAt 없음 → 원본 미변동 기록, 독립 검증 계속; 억지 반복 금지
   └─ 새 observedAt 있음 → R2-02 진짜 표시 변화 확인
                             ↓
                          R2-03 SQLite 원본 readback
                             ↓
                          R2-04 D1 → 저장 API 값/시각 readback
                             ↓
                          R2-05 1440/390 실제 UI 자동 반영
                             ↓
                   일치 → DONE 1/1 / 불일치 → R2-06 해당 경계만 최소 수정
```

**작업 책임:** W06 담당자가 필요한 조회, 결과 회수, 차이 분석, 승인 범위 내 최소 수정, 관련 회귀와 실제 결과 확인까지 직접 수행한다. 유효한 완료 증거는 보존한다. 새 승인·공급자·요금제·저장/게시 정책 변경이 필요한 경우에만 정확한 효과를 구분한다.

**최종 보고 서식:** `운영 진행률 0/1 또는 1/1 | 마지막 실제 observedAt·원본 점수 | 최신 checkedAt | SQLite 일치/불일치 | D1 일치/불일치 | API 일치/불일치 | 1440/390 실제 반영 | PR/설치/배포 SHA | 직접 막는 문제 | 다음 필수 실행`.

본 계획 작성·저장 자체는 **실제 관측/운영 진행률을 증가시키지 않는다**.
