# ZGMINI — 테마 확장 및 산식 일괄 관리 작업 지침

## 1. 목적과 적용 범위

향후 추가될 모든 테마를 설정과 공통 엔진으로 관리한다. 특정 테마 복구가 이 구조 작업의 목적이 아니다. 테마 수와 ETF 후보 수에 사업상 최대·최소·목표 개수를 두지 않는다. 실행 동시성·배치 크기·API 예산은 자원 정책이며 cursor/checkpoint로 전체 대상을 처리한다.

기존 THEME_PLATFORM_STANDARD.md와 THEME_ONBOARDING_PLAYBOOK.md를 재사용한다. 이 문서는 공통 구조의 실행 계획이며 코드 구현·설치·기존 테마 이관이 완료됐다는 새 증거가 아니다. 과거 완료된 계산·게시·화면 증거는 보존한다. 과거 snapshot에 적힌 9개·10개·등록0 등의 숫자를 현재 개수나 코드 제약으로 사용하지 않는다.

## 2. 공통 엔진과 테마 설정의 경계

테마는 고유 ID·표시 정보·선정 근거·승인 ETF·공식 AUM 근거·방법론 버전·확정/잠정 입력 정책·공개 상태를 가진 등록 데이터다. 산식은 버전별 공통 계산기 바인딩이며 JSON에 임의 실행 경로·코드를 넣지 않는다.

수집·증분 저장·적격성 검증·계산·게시·readback·Reader·차트·예약·진단은 공통 경로로 처리한다. 신규 테마마다 CMD·예약 작업·API·D1 테이블·Reader·차트를 복제하지 않는다. 기존 운영 어댑터는 정상 결과를 보존하며 공통 계약에 연결한다. 실제 입력 계약이 다른 경우 최소 어댑터만 두고 전체 파이프라인을 복제하지 않는다.

공급처·티커·가격 모드·기간·조정 정책이 같은 입력은 공유 수집한다. ETF/SPY를 테마마다 재수집하지 않는다. 서로 다른 원천/가격 모드는 섞지 않고 provenance를 유지한다.

## 3. 산식과 날짜 계약

R18→R19→R20→R23→R25→R26→R32→R33은 같은 R32 프로젝트다. 기존 승인된 R32 계산기를 재사용하며 새 산식 연구를 기본 단계로 추가하지 않는다. PAIR50으로 회귀하지 않는다. 실제 적격 ETF가 2종인 날짜도 R32 분기를 쓸 수 있으므로 ETF 수만으로 버전을 판정하지 않는다.

확정·잠정은 각각 저장된 실제 원천·기준 거래일·가격 모드·입력 SHA·계산 버전으로 관리한다. 두 API의 승인된 지연 정책을 적용하되 휴장·시간대·공급처 실제 제공일을 고려하고 달력 날짜를 기계적으로 채우지 않는다. 결측을 구버전 점수나 임의 값으로 대체하지 않는다.

## 4. 신규 테마 추가 절차

1. 기존 등록·조사·AUM·원자료·승인 결과를 찾아 재사용하고 빠진 입력만 준비한다.
2. 기존 3조건과 후속 적격성 기준으로 후보를 검증한다. 수량을 먼저 정하지 않는다. 티커 조회와 충분한 가격 이력 확보는 구분한다.
3. 기존 V2 등록 명세에 실제 근거와 SHA를 연결한다. 테마 ID와 revision을 검증한다.
4. 공통 planner가 필요한 공유 입력·저장 자료·증분 수집을 계획한다. provider 예산 부족은 resume으로 처리한다.
5. 기존 공통 계산기를 저장 입력으로 실행하고 날짜별 기여자·결측·AUM·가중치·방법론을 검증한다.
6. 기존 업무 승인과 공통 상시 승인 범위에서 설치·등록·게시를 진행한다. 기술 manifest는 작성하되 같은 필수 절차를 기능마다 재승인받지 않는다.
7. CAS 게시→정확한 D1 readback→공개 API→공통 화면을 연결한다. 정상 기존 테마의 결과를 보존한다.
8. 정규 자동 갱신 증거는 해당 실행 때 기록한다. 신규 등록이 공통 경로에 포함되는지 확인하고 테마별 예약을 추가하지 않는다.

## 5. 새 산식 도입과 일괄 전환

새 산식이 업무상 승인된 경우 공통 버전 바인딩을 한 번 추가한다. 적용 대상은 등록된 ID 집합으로 선택하며 전체/선택 실행·dry-run·bounded batch/resume을 기존 공통 실행기에 연결한다. 해당 기능이 미구현이면 공통 기능으로 구현하고 테마별 실행기를 만들지 않는다.

동일한 불변 입력으로 기존/신규 shadow 결과를 비교하고 의도된 차이·계산 방향·가중치·이력 영향을 기록한다. 대상 전체에 대한 누락/중복/버전 불일치를 검사한 뒤 검증된 결과를 단계적으로 전환한다. 미검증 결과를 공개하지 않고 이전 정상 결과와 provenance를 보존한다. 롤백은 검증된 버전/입력/결과 묶음으로 수행하며 조용한 구버전 fallback으로 구현하지 않는다.

## 6. 실패 격리와 운영 진단

테마별 실패는 해당 테마·날짜·모드에 한정한다. 공용 저장/인증/잠금의 실제 장애는 영향을 받는 범위를 기록한다. 상태 불명확한 쓰기는 원장·CAS/readback으로 확인하고 무조건 재실행하지 않는다. 정상 테마까지 전체 중단시키지 않는다.

등록→입력→계산→payload→D1→Reader→API→UI 순서에서 처음 불일치한 지점을 찾는다. 운영 상태 조회는 등록 목록에서 동적으로 전체를 순회하고 실제 입력일·계산일·게시일·방법론·실패 단계·증거 링크를 제공해야 한다. 기능 수를 하드코딩한 진단을 만들지 않는다.

기존 검증된 PC/Git/D1/API 증거는 원본·관측시각·적용 범위를 확인해 재사용한다. Reader 선택 오류를 산식 오류로, 도구 접근 제한을 서비스 장애로 판정하지 않는다. 관련 없는 전체 Core 조사나 완료된 테마의 재작업을 새 선행 조건으로 추가하지 않는다.

## 7. 구현 작업 순서와 보호

### 운영 전환 5단계 실행 계획 (2026-11-07 확정)

이 계획은 기존 공통 플랫폼을 실제 공개 테마 운영 경로에 연결하는 작업이다. 각 단계의 누적 진행률은 **실제 완료 증거**가 있을 때만 인정하며, 계획서 작성·소스 테스트·PC 설치·D1 게시·공개 반영은 서로 구분한다. 아래 10개는 현재 공개 목표 목록이지 플랫폼의 최대 등록 수가 아니다.

| 단계 | 누적 진행률 목표 | 최소 실행 범위 | 단계 완료 증거 |
| --- | ---: | --- | --- |
| 1. 운영 연결 명세 확정 | 20% | 기존 공개 10개·연구용 테마를 구분하고 승인 ETF/산식/확정·잠정 입력/PC 저장/게시 key/Reader를 한 장의 연결 매니페스트에 매핑 | 대상 공개 ID 10/10, 누락·중복·승인 버전/운영 연결 불일치의 정확한 위치 |
| 2. 공통 실행 엔진 연결 | 40% | 이미 구현한 `theme-platform.mjs`의 동적 등록·`runThemeBatch`와 기존 PC V2·레거시 수집/계산/게시 어댑터를 필요한 최소 연결점에서 결합 | 신규 테마별 CMD·예약·계산기·Reader 없이 등록된 전체 ID 처리 가능 |
| 3. 저장 입력 기반 shadow 검증 | 65% | 보존된 원자료로 등록 전체를 한 배치에서 검산; 날짜·확정/잠정·기여 ETF·산식 버전·결측·실패 격리·resume 대조 | 승인 기존 결과 동등 또는 승인된 차이 설명, ID별 단계·버전 증명, 기존 이력 무변경 |
| 4. 승인된 실제 운영 전환 | 85% | 필요한 변경 파일만 정규 B 경로로 PC 반영, 기존 D1 CAS/write/readback 및 공개 Reader/API/UI에 연결 | 실제 PC 계산·D1 readback·공개 10개·모바일/PC 결과 및 관측일 일치 |
| 5. 설정형 확장 실증 | 100% | 미승인 공개 없이 추가 테마를 비공개 시험 정의로 등록·발견·계산 흐름 검증; 기존 정규 실행의 포함 여부 확인 | 테마 개수 하드코딩 없음, 테마별 운영 파일·예약 추가 0건, 정상 결과 보호 |

#### 즉시 다음 실행은 1단계만

- 아래 `기존 공개 테마 이관 입력과 게시 경로` 표는 **소스 기반 매핑 초안**으로 재사용한다. 이를 새 문서나 테마별 파일 10개로 나누지 않는다.
- GitHub 최신 `main`, 해당 전용 브랜치의 현재 코드, 실제 공개 API 및 이미 확보한 PC·D1 실행 증거를 대응시킨다. 현재 관측 공개 개수와 목표 10개를 분리 기록하며, 7개만 반환한 과거 fallback을 목표 명단에서 제외했다는 뜻으로 해석하지 않는다.
- 공개 10개는 **기존 7개 + 바이오·신약 + 데이터센터·전력 + 우주·위성**이다. 연구용 `ai-semiconductor`를 공개 10개로 승격하지 않는다. 기존 `config/theme-data-registry.json`의 연구/공개 혼합 목록을 그대로 운영 등록부로 사용하지 않는다.
- 단일 매니페스트의 필수 필드는 `id, label, public, approved ETFs/AUM SHA, methodologyVersion, confirmed/provisional adapter·priceMode, PC source/result, D1 feed key, Reader route, first missing integration`이다. 새 운영 데이터가 필요한 경우 승인된 A급 조회를 필요한 범위에서 한 번 사용한다.
- 특히 `runThemeBatch()`의 운영 호출 부재, 기존 V2 신규등록 순회에서 레거시 7개 누락, 기존 공개 Reader와 설정형 Reader 사이의 미연결을 **확인된 코드 갭과 운영 미확인 사항으로 분리**한다. 실제 버전이 다른 데이터센터 등을 승인 없이 R32로 재표기하지 않는다.
- **1단계 종료 조건:** 공개 대상 10/10에 대해 원본→계산→게시→공개의 책임 경로가 명시되고, 2단계에서 수정할 최소 어댑터/파일만 결정된 상태. 이 단계에서는 PC B 설치·Controller 교체·신규 예약·D1 쓰기·새 산식 개발을 하지 않는다.

재사용 성공 사례: [zgmini PR #902](https://github.com/ansqhd5774-Choi/zgmini/pull/902)(동적 Reader·순위/차트), [PR #993](https://github.com/ansqhd5774-Choi/zgmini/pull/993)(3파일 선택 수정·관련 검증), [PR #651](https://github.com/ansqhd5774-Choi/zgmini/pull/651)(기존 저장 원자료 공유). [PR #692](https://github.com/ansqhd5774-Choi/zgmini/pull/692)의 과거 테마별 독립 CMD·예약 증설은 신규 확장의 기본 패턴으로 반복하지 않는다. PC 설치는 실제 변경이 필요한 4단계에서 제어 저장소의 승인 manifest→정확한 설치→결과 TXT/JSON readback 패턴을 따른다.

먼저 현재 공통 코드·V2 등록·운영 어댑터와 실제 연결을 필요한 범위에서 대조한다. 구현돼 검증된 기능은 재개발하지 않는다. 부족한 공통 기능만 목록화하고 영향·우선순위와 연결 지점을 정한다.

### 2단계 공통 연결 중간 결과 — 2026-11-07 (운영 전환 미완료)

- 소스 반영 커밋: `c415b583605c8d00429c083f482f6b84a01958a3`. `config/theme-public-operational-bindings.json` 단일 공개 등록부와 `theme-platform-operational.mjs` 연결부를 추가했다. 공개 10개가 한 번에 발견되고, 향후 등록 테마는 기존 `listRegistered()` 결과로 동일 목록에 동적 합류한다. 10은 현재 공개 목표이지 코드 개수 상한이 아니다.
- R37/R88의 공유 물리 D1 feed key는 8개 논리 테마와 분리하여 각 모드 1개 그룹으로 계획한다(10개 → 물리 6개 feed group). R37 가족의 산식 버전은 테마별 복제가 아닌 단일 family binding에 지정한다. 데이터센터 PAIR50·우주 승인 R32 변형은 별도 가족으로 유지한다. 연구용 AI·반도체는 공개 명단에서 제외한다.
- 기존 `theme-config-tool.mjs --scheduled`는 **현재의 4 GET 예산·기존 비공개/승인 게시 동작을 보존한 채** 통합 등록부를 읽기 전용으로 인식한다. `--platform-plan`은 실운영 쓰기 없는 독립 조회다. `runOperationalPrivateBatch()`에서 공통 `runThemeBatch()` 호출점은 제공하지만 현재 승인된 실제 PC stored source/calculate/validate handlers가 연결된 것은 아니다.
- Node.js 집중 회귀 34/34 통과(10개+164개 등록, R37 공유 키, 혼합 산식, 비공개 batch mock proof, 기존 예약/설치 번들, 무상한·resume·실패 격리). 모의 증거 성공은 실제 PC 원자료 검산·공개 D1 재조회로 간주하지 않는다.
- **2단계 미완:** 기존 R54/optional/V2 저장 산출물의 진짜 SHA·날짜·산식을 검증하는 중앙 stored adapter 및 공통 정규 실행기 실제 호출·checkpoint 연결. 각 공유 source/게시 피드는 1회만 처리하고, 어댑터 결과를 실제 저장 자료로 검산한 다음에만 2단계 40% 완료로 판정한다. 기존 게시 소유권·D1·Reader 전환은 여전히 4단계다.

### 2단계 저장 결과 어댑터 추가 — 2026-11-07 (실제 PC 검증 전)

- `theme-platform-stored-adapters.mjs`에서 기존 R47 연구 9개를 저장 원자료로 **한 번만 재계산**하고 공개 8개에 공유한다. 데이터센터 PAIR50·우주 R32 변형·설정형 테마는 각 기존 계산기를 재사용한다. 각 계산 결과가 기존 로컬 파생 파일의 정확한 SHA·바이트·252개 이력·ETF·방법론과 일치해야 검증 통과한다. 신규 GET·D1 쓰기·테마별 예약은 없다.
- `theme-platform-stored-run.mjs --private`는 **비공개 독립 공통 실행점**이다. 원자료·기존 파생 파일은 변경하지 않지만 `theme-platform/checkpoints`에 신규 실행 원장을 쓸 수 있다. 실행 시각은 R47 마감 기준에 전달하고 실행 기준 UTC 시간대와 원자료 지문을 체크포인트 ID에 묶는다. 기존 완료 기록을 재사용할 때 실제 파생 파일을 재검증한다.
- 역사적 등록부에서 누락된 `space-satellite`도 공통 공개 바인딩을 통해 V2 사칭·중복 등록을 차단한다. 집중 회귀 60/60 통과. 이는 **로컬 source·테스트 결과**로서 실제 E: 저장본을 이용한 PC 실증은 아니다.
- **미완:** 잠정치에는 실제 승인된 공개 확정 레코드가 필요하므로 기본 stored adapter는 이를 임의로 조립하지 않고 `BLOCKED`로 격리한다. 공통 예약 호출·기존 게시 소유권·D1/Reader 연결도 변경하지 않았다. 이후 실제 PC E: readback → 잠정 기준 검증 → 기존 Writer 연계 → 공개 연결 순서로 진행한다.

### 2단계 기존 잠정치 연결부 — 2026-11-07 (소스 검증·PC 미설치)

- `theme-platform-provisional-r88.mjs`는 기존 R47의 한 번 계산한 검증 세션·점수·AUM을 공유하고, 실제 공개 R37 기준값 및 보존된 R88 후보 파일을 기반으로 기존 `calculateNineR88()`을 재생한다. SHA·바이트·Reader 계약을 검증하고 R51의 **레거시 PAIR50 잠정치를 R32로 재표기하는 경로를 차단**한다.
- `theme-platform-provisional-optional.mjs`는 데이터센터·우주의 **기존 D1 확정·잠정 키**를 읽기 전용으로 조회받아 각 기존 R8 계산기로 재생한다. 승인 ETF·산식·252일 확정 이력·출처 SHA·잠정 점수·Reader 신선도를 대조한다. 원자료/파생/D1/예약 변경은 없다.
- `theme-platform-stored-run.mjs --private-public-readback`은 **새 예약이 아닌 명시적 비공개 실행 옵션**이다. R88은 기존 공개 API의 R32 Reader projection을, optional 2개는 기존 승인된 PC D1 클라이언트의 제한된 `SELECT`와 4개 기존 key만 사용하며 각 조회수를 별도로 기록한다. 공개 API 메타데이터를 D1 원본에 임의 합성하지 않는다. 일반 `--private`는 외부 연결 없이 종전처럼 잠정 기준값 부재를 명시한다.
- 기존 V2 `theme-config-tool.mjs --platform-shadow`에 **명시적 1회 실행 경로**를 연결했다. 기존 `--scheduled` 동작·13:00 예약·게시 경로는 변경하지 않는다. `theme-config-install.mjs`는 이 실행점의 JS import 의존성과 승인 JSON 근거를 기존 공통 번들에 포함한다. 이는 소스의 실행·패키징 연결이며 PC 운영 설치를 의미하지 않는다.
- 이 1회 `--platform-shadow`는 체크포인트도 **프로세스 메모리에서만** 관리하여 PC의 E: 원자료·결과·checkpoint에 쓰지 않는다. 기존 `--private` 및 정규 batch의 내구성 있는 checkpoint는 그대로 유지한다. 따라서 이 실행 옵션은 저장자료를 검증하는 일회성 읽기 전용 진단이지 운영 batch의 재개 기록을 대신하지 않는다.
- D1 조회 클라이언트의 설정·인증은 기존 optional 테마의 승인 키를 실제로 읽는 시점에만 초기화한다. 인증 실패가 있어도 R37 확정 등 독립 저장 계산을 시작하지 못하는 전역 Gate가 되지 않도록 그룹별 실패 격리를 유지한다.
- 배치 결과는 공개 10개(`coverage.public`)와 비공개 V2 등록(`coverage.private`)의 확정·잠정 처리 상태를 별도 합산한다. 미승인 비공개 잠정 계산을 성공으로 속이지 않으며, 그 대기만으로 공개 10개 검산을 실패로 보고하지 않는다.
- 기존 optional R8의 정규 최신 잠정 계산은 확정 기준 이후 EOD 후보가 3개를 넘으면 재확정을 요구하는 계약을 보존한다. 과거 게시본의 **비공개 shadow 재생**에 한해 해당 게시본의 관측일까지 입력 날짜를 제한해, 나중에 추가 저장된 날짜 때문에 역사적 재계산이 중단되는 문제를 방지한다.
- 과거 저장 결과의 **SHA·재계산 일치**와 현재 Reader의 **8일 신선도**는 다른 판정이다. 비공개 잠정 리플레이는 당시 시각으로 Reader 형태를 검산하고, 데이터센터·우주는 실제 D1 `stored_at`으로 현재 공개 적격 여부를 `READY/STALE`로 따로 남긴다. R88 로컬 후보의 파일 수정 시각은 D1 게시 시각이 아니므로 `UNKNOWN_D1_STORED_AT_NOT_READ`로 남긴다. 기존 공개 TTL·Worker 판정은 변경하지 않는다.
- **아직 완료로 판정하지 않는 조건:** 전용 브랜치의 소스·모의 검증만 통과했다. 실제 PC 원자료·D1 기준값을 이 연결부로 재조회한 결과, 등록형 V2의 개별 잠정 정책, 신규 출력 저장과 정규 Writer 소유권 이전, API/UI 최종 반영은 미완이다. 기존 예약을 변경하거나 미래 자연 갱신을 이번 구현의 선행 조건으로 삼지 않는다.

### 4단계 앞 실제 공개 Reader 의존성 — 2026-11-08 실측

- 기존 6개 물리 게시기는 R37/R88·데이터센터·우주 피드만 담당하며, **7개 레거시 테마의 기준 seed `market_public_snapshots_v1/public:theme-etf-only:r1` 및 R178 rolling `theme-etf-only-rolling`을 갱신하지 않는다.** 기존 seed는 불변 기준이므로 무조건 덮어쓰지 않는다. 유효한 R178이 있으면 현재 Reader는 그것을 먼저 사용한다.
- D1 읽기 전용 조회: seed 저장 2026-10-21 03:52 KST·관측 10월 16일, R178 저장 10월 30일 14:21 KST·확정 관측 10월 28일·`PROVISIONAL`, 구 잠정치 저장 10월 21일. 11월 7일 밤 공개 API는 `503/STORED_DATA_STALE`이었다. 8일 신선도 만료가 실제 공개 실패이며 D1 레코드 부재나 화면 문제라고 해석하지 않는다.
- 11월 8일 공개 API 재조회도 `503/STORED_DATA_STALE`. [PC Shadow #675](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/675)에서 2026-11-08 00:15 KST 실행한 **공개 확정 10/10 COMPLETE, 잠정 0/10 BLOCKED**를 확인했다. 잠정 8개(레거시 7·바이오)는 `THEME_STORED_PUBLIC_API_UNAVAILABLE`, 데이터센터·우주 2개는 `THEME_OPTIONAL_PROVISIONAL_D1_INVALID`이다. 비공개 `ai-software`의 `THEME_NINE_R25_NON_SPY_DATE`는 별도 0/2 차단으로 공개 10개 결과와 섞지 않는다. 0 provider GET·0 D1 write·보호 상태 불변이다.
- 기존 잠정 생성기 일부는 `publicationAuthorized=true`라도 상업·파생 권리 검증 플래그를 `false`로 기록한다. 기술 Reader의 유효 판정과 실제 무료 공급처 공개 권리는 별도다. 무료 MarketParquet 불허 회신상 **잠정 3개 물리 피드 신규 게시를 허용하지 않는다**. 유효 확정 GMH 데이터의 독립 복구까지 막는 전역 Gate로 확대하지 않는다.
- R88 기존 게시기는 공개 Reader `READY`의 R32 기준 정보를 필요로 한다. Reader가 503인 상태에서 6개 게시기만 실행하면 선행 확정 피드에 일부 쓰기를 한 뒤 R88에서 중단할 수 있다. `theme-platform-public-cycle.mjs`는 제공된 `readPublic` 콜백으로 **쓰기 전 Reader를 조회**해 503/`UNAVAILABLE`이면 6개 소유자 호출 없이 중단한다. 이 안전 경로는 opt-in 소스만 검증됐고 PC에 설치되거나 예약에 연결되지 않았다.
- GetMarketHistory 2026-10-29 발효 약관 §5·§6(https://getmarkethistory.com/docs/terms)은 원자료 대량 복원이 불가능한 파생 지표 배포를 허용한다. **기존 GMH 확정치**는 실제 계정 상태·ETF 커버리지·비복원성 및 승인 입력 동등성을 확인해 독립 복구할 수 있는 후보이다. **MarketParquet 무료 EOD 잠정치**는 2026-11-05 공급자 직접 회신상 공개 파생 점수 권한이 없으므로 기존 D1 `true` 권리 플래그나 과거 게시 성공만으로 재게시하지 않는다. 공급처·가격 모드·산식의 무승인 교체는 금지한다.
- **다음 한 단계:** 원담당이 기존 L7/R178 PC 설치·저장·승인된 GMH 확정 원자료로 유효 rolling을 만들 수 있는지 확인하고, 승인된 경로에서 D1 재조회→공개 Reader `READY`를 확보한다. 그 다음 공통 6개 소유자의 실제 B 설치·검산·CAS/Reader 전환을 진행한다. 잠정치 권리는 별도로 해결하고 **미래 자연 예약 검증은 기능 완료 이후**에 수행한다. 현재 5단계 공식 진행률은 20%로 보존한다.
- **2026-11-08 실PC 조회 보강:** [A #728](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/728)은 운영 파일 변경 없이 PASS했으며, 설치 Writer SHA는 `24c2ff1f3eba73cae8b86f81ce75c6ffacfb497f`로 관측됐다. 목록 288건이 결과 크기 제한으로 생략되어 승인 B의 개별 설치 대상 파일 전후 해시 증명으로 사용할 수 없다. [A #732](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/732)는 R54 고정 6파일의 실제 복사본 SHA를 확인했다. PR #1002 후보와 달라 갱신할 3개와 동일한 3개를 구분할 수 있으나, 복사본 SHA를 운영 B preimage라고 단정하지 않는다.
- [A #733](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/733)은 레거시 L7/R178 실PC 소스 3개 존재와 기존 Collector 예약의 실제 소스 참조를 확인했다. `R181_PRIMARY_LAST_RUN.json`은 2026-11-07 UTC `STOP`이며 사유의 안전한 단축 코드가 없어 원인은 아직 불명이다. R179 마지막 게시 원장은 `PUBLIC_API_ROLLING_MISMATCH`(관측 2026-10-28), R183 재시도 원장은 `PUBLISHER_CHILD_FAILED_REVIEW`로, 유효 rolling 복구가 완료됐다는 증거가 없다. 모든 A 조회는 수집·게시·운영 변경 0이다.
- **권리 분리용 소스 보강:** `theme-nine-r54-public-connect.mjs`에 명시적 `--once --publish --confirmed-only` 경로를 추가했다. 기존 자동 모드는 변경하지 않고, 이 신규 모드는 공개 API가 READY로 바뀌어도 R51 잠정 게시기를 호출하지 않는다. 테스트만 완료했고 **PC 설치·R54 실행·D1 게시·API READY는 아직 아니다.**

### 기존 공개 테마 이관 입력과 게시 경로

아래는 이관에 사용할 기존 경로의 매핑이다. 공통 예약은 등록된 ID를 순회하며 이 표의 개수로 실행 범위를 제한하지 않는다. 공개 이력과 입력 정책은 테마별로 승계한다.

| 기존 공개 ID | 승인 입력 근거 | 현재 게시 경로 |
| --- | --- | --- |
| robotics | R20 로봇·자동화, R32 날짜별 AUM | R54/R37 확정, R88 잠정 |
| cloud-saas | R20 클라우드·SaaS, R32 날짜별 AUM | R54/R37 확정, R88 잠정 |
| autonomous-driving | R20 자율주행, R32 날짜별 AUM | R54/R37 확정, R88 잠정 |
| nuclear-smr | R20 원전·SMR, R32 날짜별 AUM | R54/R37 확정, R88 잠정 |
| defense | R20 방산, R32 날짜별 AUM | R54/R37 확정, R88 잠정 |
| fintech | R20 핀테크, R32 날짜별 AUM | R54/R37 확정, R88 잠정 |
| cybersecurity | R20 사이버보안, R32 날짜별 AUM | R54/R37 확정, R88 잠정 |
| biotech | R20 바이오·신약, R32 날짜별 AUM | R54/R37 및 기존 바이오 어댑터 |
| data-center-power | 현재 공개 Reader의 DTCR·GRID, SPY, PAIR50. R20 연구 명단에는 없음 | `theme-data-center-power-r1` 및 `theme-data-center-power-provisional-r1` |
| space-satellite | 별도 R26 승인 명단과 R23 날짜별 AUM, R32 이력의 날짜별 단일 ETF 처리 정책 | `theme-space-satellite-r2` 우선 및 기존 R1 호환, `theme-space-satellite-provisional-r1` |

- 공통 8개의 후보와 AUM 근거는 `config/theme-nine-r20-approved-candidates.json` 및 `config/theme-nine-r32-dated-aum-approval.json`에 있다. 기존 R37 확정 key는 `theme-legacy-nine-r37`, R88 잠정 key는 `theme-nine-r32-provisional-r88`이다. AI·반도체 연구 결과는 공개 전환 승인 전까지 공개 대상에 넣지 않는다.
- V2 일반 등록은 기존 ID·이름과의 충돌을 차단하며 신규 R32 프로필을 요구한다. 기존 테마에는 현재 방법론과 이력을 보존하는 이관 계약이 필요하다. 특히 데이터센터 기존 PAIR50을 R32로 표기하거나 우주·위성의 과거 기여 정책을 신규 등록 규칙으로 덮어쓰지 않는다.
- 공통 게시 소유권을 넘기기 전에 기존 공개 이력과 shadow 출력, 테마별 게시 key 및 현재 writer를 검산한다. 공통 예약이 해당 ID를 실제 처리하고 D1 재조회까지 확인한 뒤 기존 쓰기 경로를 정리한다. 개발 중인 비공개 테마는 기존 공개 테마 이관의 선행 조건에 포함하지 않는다.

### 1단계 실측 통합 연결 명세 — 2026-11-07

이 표는 **전용 브랜치 HEAD `752f10e1faf112fe27fc91859a918d0ddb2dfe14`의 소스·기존 실PC 증거**와 **2026-11-07 KST의 공개 API**를 대조한 이관 매핑이다. 각 테마의 현재 D1 레코드 존재·PC 파일 SHA/활성 작업은 이번 단계에서 직접 재조회하지 않았으므로 **현행 런타임 확정과 구별**한다. 목표 공개 명단은 10개이며 2026-11-07 실제 `/api/theme-fear-greed/` 응답은 7개(아래 앞 7개)였다. `status=READY`, `version=THEME_ETF_ONLY_R144_252_PUBLIC_V1`, `methodologyVersion=ETF_ONLY_T40_R20_V40_PAIR50`, 확정일 2026-10-28, 잠정일 2026-10-29, `sourceStoredAt=2026-10-30T05:20:23.441Z`. 누락 3개의 D1 부재/Reader 검증 실패 원인은 **실제 D1 조회 전 미확정**이다.

**공통 경로 약어 (원본과 계산의 책임):**

- **L7**: 레거시 7개 `E:/ZGmini/data/theme-market-history-r131`의 R167/R181 원본·파생 및 R179 점수/R171 게시; `market_public_snapshots_v1 / public:theme-etf-only:r1` 기반, rolling/legacy 잠정 별도. 이는 소스 등록부의 과거 경로이며 현재 설치 SHA는 미조회다.
- **N8**: R32 연구 9개 중 공개 교집합 8개. PC `themes/legacy-nine-r23` + `themes/legacy-nine-r35-delta` GMH 1h 원가격 → `themes/legacy-nine-r47-private`의 R25 개별·R32 AUM 집계 → `legacy-nine-r48-private-candidate` → `legacy-nine-r51-private-provisional` → R54 CAS/readback. 확정 `theme-legacy-nine-r37`, 잠정 `theme-nine-r32-provisional-r88`는 **8개 테마가 공유하는 물리적 D1 feed key**다. 확인된 코드에서 R88의 잠정 가격 모드는 GMH 원가격 기준선 + 검증된 MarketParquet split-adjusted EOD **별도 잠정**이며 확정 원본을 덮지 않는다.
- **O**: 독립 optional PC `themes/<id>`의 SHA 원본 및 기존 수집·계산·게시기. 확정 GMH 무보정 시간봉 프록시, 잠정 MarketParquet split-adjusted EOD 보조를 각각 별도 검증한다. 정확한 파일명/작업은 아래 테마별 경로에 적는다.
- **R**: `worker/theme-etf-only-public.mjs`의 기존 7개 Reader → optional 바이오/데이터센터/우주 sidecar → R37(8개 확정치 치환) → R88(8개 잠정치 치환). `app/api/theme-fear-greed/route.ts`에서 호출. 검증 실패 시 기존 응답을 보존해 **공개 10개 목표가 7개로 줄어들 수 있다**.

| 공개 ID · 이름 | 승인/이관 대상 ETF 및 산식 · 확정/잠정 입력 | 기존 PC 결과→D1 확정/잠정 키→Reader | 공통 엔진 첫 미연결 |
| --- | --- | --- | --- |
| `robotics` 로봇·자동화 | N8: BOTZ, ROBO, ROBT, ARKQ, HUMN, RBTX, CBOT / R32; L7: BOTZ, ROBO / PAIR50 | N8 `theme-legacy-nine-r37` / `theme-nine-r32-provisional-r88` → R37/R88; L7 `public:theme-etf-only:r1` → R | N8·L7 단일 ID 이관 정의 및 R37 공유 게시 |
| `cloud-saas` 클라우드·SaaS | N8: SKYY, CLOU, WCLD, FCLD, CLOD / R32; L7: SKYY, CLOU / PAIR50 | N8 R37/R88 공유 키 → R; L7 `public:theme-etf-only:r1` → R | 동일 |
| `autonomous-driving` 자율주행 | N8: DRIV, BOTZ, IDRV, HAIL, CABZ, KARS / R32; L7: DRIV, BOTZ / PAIR50 | N8 R37/R88 공유 키 → R; L7 `public:theme-etf-only:r1` → R | 동일 |
| `nuclear-smr` 원전·SMR | N8: NLR, URA, URNM, NUKZ, URNJ, URAN / R32; L7: NLR, URA / PAIR50 | N8 R37/R88 공유 키 → R; L7 `public:theme-etf-only:r1` → R | 동일 |
| `defense` 방산 | N8: ITA, SHLD, XAR, PPA, NATO, WR / R32; L7: ITA, SHLD / PAIR50 | N8 R37/R88 공유 키 → R; L7 `public:theme-etf-only:r1` → R | 동일 |
| `fintech` 핀테크 | N8: FINX, ARKF, IPAY, BPAY, KYC, LATR / R32; L7: FINX, ARKF / PAIR50 | N8 R37/R88 공유 키 → R; L7 `public:theme-etf-only:r1` → R | 동일 |
| `cybersecurity` 사이버보안 | N8: CIBR, BUG, HACK, IHAK, WCBR, SPAM, PSWD, XA / R32; L7: CIBR, BUG / PAIR50 | N8 R37/R88 공유 키 → R; L7 `public:theme-etf-only:r1` → R | 동일 |
| `biotech` 바이오·신약 | N8: IBB, XBI, BBH, PBE, GNOM, ARKG, SBIO, FBT, GNMX / R32; O: IBB, XBI / PAIR50 | O `themes/biotech`, R7/R8 → `theme-biotech-optional-r2` (R1 보존), `theme-biotech-provisional-r1`; N8 R37/R88 공유 키 → R | R7/R8·N8의 동일 ID/서로 다른 실제 버전과 Reader 우선순위 연결 |
| `data-center-power` 데이터센터·전력 | O: DTCR, GRID / **PAIR50** (R32 전환 미승인); 확정 GMH 1h, 잠정 MarketParquet EOD 분리 | O `themes/data-center-power`, `theme-data-center-power-publish-r3.mjs` / `theme-data-center-power-auto-r8.mjs` → `theme-data-center-power-r1` / `theme-data-center-power-provisional-r1` → R | N8 대상 아님. PAIR50을 R32로 일괄 표시하지 않고 O 통합 |
| `space-satellite` 우주·위성 | O: **UFO, NASA, WARP, ROKT** / `ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_AUM_DATE_ELIGIBLE_SINGLE_R32`; 확정 GMH 1h, 잠정 MarketParquet EOD 분리 | O `themes/space-satellite`, `theme-space-satellite-publish-r32.mjs` / `theme-space-satellite-auto-r8.mjs` → `theme-space-satellite-r2` (R1 호환) / `theme-space-satellite-provisional-r1` → R | 구 `config/theme-data-registry.json`에 ID 자체 없음; O 통합 |

**근거·SHA 및 공개 승인 경계:**

- N8 후보 로스터 기준 SHA-256: `e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c`. `config/theme-nine-r20-approved-candidates.json`의 Git blob SHA `add5136969262157b377fb3034cbc49199ac61ae`, `config/theme-nine-r26-official-aum-evidence.json`의 Git blob SHA `a9422375ecc8a86583c393ad795c6ca6333e34fe`, `config/theme-nine-r32-dated-aum-approval.json`의 Git blob SHA `f08821af8d92995e0335d1fbae1e1291f2481be7`. **Git blob SHA와 SHA-256은 다른 해시**다. R20/R26/R32 JSON은 최초 **연구/비공개 승인**으로, 공개 게시 권리 자체를 단독 승인한 증거는 아니다. 실제 공개는 기존 R54 승인·CAS/readback 및 과거 `THEME_R32_RECOVERY_20261030.md` 실PC 결과로 구분한다.
- 우주 승인 ETF 4개 근거 `scripts/pc-writer/theme-space-satellite-r26-approved-roster.json` (Git blob SHA `9c65aa770eddeed8cf94bd0aa906c1fe69020e25`); R32 날짜별 단일 ETF 이력 연속성은 `worker/theme-space-satellite-r2.mjs`에서 별도 검증. 데이터센터는 AUM 근거가 필요한 R32 대상이 아니라 기존 PAIR50 경로로 보존한다.
- 확정/잠정의 **현재 원자료·승인 SHA/관측일은 D1 및 실제 PC 파일 readback 전 미확정**이며, 과거 실PC 결과를 최신 상태로 재표기하지 않는다.
- 연구 전용 `ai-semiconductor`는 R20/R37 연구 9개에는 있으나 공개 10개에는 포함하지 않는다. `config/theme-data-registry.json`은 AI를 포함·우주를 누락하며, V2 `registerDefinition()`은 레거시 ID 충돌을 의도적으로 거부하므로 이 파일을 운영 등록부로 복사하거나 V2 검증을 무력화하지 않는다.

**확인된 공통 플랫폼 연결 갭과 2단계 최소 수정 목표:**

1. `theme-platform.mjs:runThemeBatch()`는 검증·중복 input 계획·checkpoint/CAS·부분 실패 격리를 제공하지만, `theme-config-tool.mjs --scheduled`는 `listRegistered()`의 V2 신규 등록만 순회한다. 기존 10개를 포함하는 **공통 실행 호출점이 없다**. 실제 PC 설치본은 별도 확인 항목이다.
2. 기존 R37은 8개 테마를 **물리적 D1 키 하나**에 게시하지만 `validateThemeRegistry()`는 각 theme/phase의 publication key를 전역 유일하게 요구한다. 이관 정의에는 **고유 논리 처리 ID ↔ 기존 공유 물리 키/레코드 slot** 매핑을 구현하여 동일 피드를 8회 덮어쓰지 않아야 한다. 현재 `FORMULAS`는 R32만 등록하므로 기존 데이터센터 PAIR50·우주 개별 R32 정책은 실제 승인 계산기에 바인딩하고 일괄 R32 재표기를 막는다.
3. 공개 `/api/theme-fear-greed`는 고정 7개 seed 위 optional/R37/R88을 조건부로 더하지만, 동적 등록 Reader는 별도 `/api/theme-configured`이고 UI에도 별도 섹션이다. 한 공개 목록에서 **정확히 한 번** 노출되도록 합성 Reader/ID 매핑이 필요하다. 기존 `PUBLIC_DISPLAY_MAX_AGE_MS=8일`의 적격성 판정 때문에 optional이 제외될 수 있으나, 이번 7개 관측만으로 D1 데이터 부재·만료 중 특정 원인은 단정할 수 없다.
4. 2단계 구현 후보는 `scripts/pc-writer/theme-platform.mjs`의 공용 key/버전 binding 확장, `scripts/pc-writer/theme-config-tool.mjs`의 공용 예약 호출, **중앙 어댑터 1개**(예: `theme-platform-operational-adapters.mjs`)의 기존 7+N8+O 소스/계산/게시 매핑과 집중 테스트다. `theme-config-registry.mjs`의 신규 정의 충돌 보호를 제거하지 않는다. 공개 Reader 결합은 4단계의 `worker/theme-etf-only-public.mjs`/기존 동적 Reader 및 UI 중복 점검 범위에서 최소 수정한다.
5. 3단계 shadow → 4단계 기존 승인 B 경로 PC 설치 → D1 exact readback/공개 API 10개 → 5단계 추가 비공개 테마의 단일 등록·정규 포함 순서로 진행한다. **현재 단계에서 PC B 설치·D1 쓰기·예약 변경은 0**이다.

### 전체 공개 테마 인식과 갱신 완료 조건

- 기존 공개 테마와 이후 공개 승인된 신규 테마는 같은 등록 계약의 고유 ID로 인식한다. 등록 목록에서 실행·게시 대상 및 API 예상 ID 집합을 동적으로 산출한다. 기존 8개·별도 2개 같은 고정 그룹이나 고정 개수로 실행 범위를 정하지 않는다. 비공개 등록은 내부 처리 상태에 포함하되 공개 집합에는 공개 승인 이후 포함한다.
- 기존 공개 테마는 승인된 입력·방법론·확정/잠정 정책과 공개 이력을 보존해 공통 실행기에 연결한다. 전환 기간에 기존 어댑터를 쓰더라도 전체 등록 목록에서 누락 없이 발견하고, 각 ID의 실행 경로와 전환 상태를 기록한다. 한 테마의 대기·실패는 그 ID에 귀속하고 나머지 처리를 계속한다.
- 공통 변경과 복구는 예상 공개 ID 집합을 실제 실행 결과 및 공개 API와 대조한다. ID 누락·중복, 테마별 확정/잠정 최신 관측일, 원자료 대기 및 실패 단계를 확인한다. 상위 기준일·부분 성공으로 전체 갱신을 판정하지 않는다. **기능 구현·실제 게시·API/UI 검증을 우선 완료하고**, 다음 자연 예약에서의 공통 실행 감시는 그 이후 추가 후속 검증으로 분리한다.

기존 정상 테마는 저장 입력 shadow와 출력 비교를 거쳐 순차적으로 공통 등록 계약에 연결한다. 데이터·이력을 초기화하거나 기존 코드를 일괄 삭제하지 않는다. 전체 이관 전에 옛 경로를 끊지 않는다. 공통 코드 존재와 전체 이관 완료를 구분한다.

PC 실행·상시 승인·공유 설치는 zgmini-pc-control의 docs/GENERAL_CHAT_START.md 및 docs/PC_AUTOMATION_STANDARD.md를 따른다. 공용 설치는 #68에서 조정하며 기능 개발은 병렬, 공유 적용만 직렬로 처리한다. 실행기 검사를 우회하지 않는다.

## 8. 문서와 완료 기준

정본은 이 전용 브랜치의 공통 문서다. 옛 지침은 대체 위치·적용 시점을 명시하고 역사 실행 증거는 보존한다. 모든 브랜치에 사본을 복제하지 않는다. 작업자는 정본 SHA와 작업별 변경·증거만 기록한다.

완료는 신규 테마가 등록 데이터로 공통 수집·계산·게시·조회·화면 경로를 통과하고, 기존 정상 결과를 보존한 실제 증거로 판단한다. 합성 대량 등록 테스트는 임의 상한·pagination·resume 검증용이며 실제 전체 이관이나 Production 게시의 대체 증거가 아니다. 테스트 개수를 새 테마 상한으로 해석하지 않는다.

보고는 구현/검증/설치/게시/공개/정규 실행을 구분하고 전체·성공·대기·실패를 등록 목록 기준으로 집계한다. 현재 개수와 snapshot은 관측시각을 표시한다. 이 문서 저장만으로 미구현 기능이나 운영 이관 완료를 선언하지 않는다.
