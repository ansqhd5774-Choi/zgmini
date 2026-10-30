# 2026-10-30 실PC 원자료·R32 복구 및 Reader 역전 원인

> 2026-10-31 정정: 이 문서의 10개 날짜·점수 공개 성공은 10개 모두 R32 전환 성공을 의미하지 않는다. 공통8개와 우주9개는 기존 확인을 유지하며 데이터센터는 PAIR50 경로였다. 데이터센터 공개 갱신 승인은 2종 구성/PAIR50 최종 승인이 아니다. R18~R33은 같은 프로젝트다. 현재 공통 운영 기준은 [THEME_PLATFORM_STANDARD.md](THEME_PLATFORM_STANDARD.md)를 참조한다. 아래 로그/커밋은 당시 증거로 보존한다.

## 현재 상태 — 29일 R32 잠정 연결

### 최종 실PC 실행 증거 (2026-10-30 20:03 KST)

- source `813538a92ac6ef3d7c32432d7fade080db6eb79e` 고정 runtime 71파일 설치 완료. 기존 task XML SHA 전후 동일, 예약 설정 변경 0건.
- 기존 `THEME_NINE_R54_PUBLIC_CYCLE.cmd`를 수동으로 1회 실행해 정상 종료했다. 선행 R54는 `PUBLIC_API_VERIFIED`, D1 쓰기 1건 및 정확한 readback을 확인했다.
- 후행 공통 단계는 `TEN_PUBLIC_API_VERIFIED`. DC 확정·우주 확정·8개 R32 잠정·우주 잠정·DC 잠정의 5개 lane 전부 통과했다. 이 후행 단계는 provider 호출 0/D1 쓰기 0으로 동일 입력의 중복 게시를 방지했다.
- 실행 로그: `E:\ZGmini\data\pc-writer\theme-nine-r54\logs\THEME_NINE_R54_CYCLE_23213_8005.txt`. 후행 결과: `THEME_TEN_R88_RESULT_1793358189518.json`.
- 공개 10개 전부 10/28 확정 252점 이력과 10/29 잠정 점수의 실제 산출물 대조 및 브라우저 tooltip 검증 완료. 기존 승인 다중 ETF 산식과 구성 유지. 두 API의 가격 모드와 결측 기여자 구분을 유지하며 확정 원자료에 보조 가격을 혼합하지 않는다.
- 화면 증거: `E:\ZGmini\analysis\theme-ten-28-confirmed.png`, `E:\ZGmini\analysis\theme-ten-29-provisional.png`.
- 설치/동일 진입 명령의 수동 Runtime 성공은 확인했으며, 다음 자연 예약 트리거에 의한 실행은 아직 미관찰이다. 아래 준비·보류 기록은 각 과거 시점의 기록이다.

- PR899 main `f58ed3c15b2a8b0e87fdaaaddbc012e4bcb665a0`와 PR901 main `cc4f1fd9a4f58f5e4cbb4dbaa8f7476116efa329`의 Cloudflare Git Build 성공 및 실제 공개 API 검증 완료. 10개 전부 10/28 확정 252점 이력을 실제 사적 산출물과 완전 대조했고 10/29 잠정 점수도 전부 일치한다. 결과 `THEME_TEN_R88_PUBLIC_RESULT.json`.
- R88은 새 확정일 이후 잠정 입력이 부족할 때 기존 2-ETF 잠정치로 회귀하지 않는다. 확정 이력과 정상 optional 테마를 유지한다. PC R54의 실제 API 대조도 동일 R88 sidecar를 읽어 정상 신규 점수를 실패로 오인하지 않도록 수정했다.
- 기존 R54 실행기 후행 단계용 `theme-ten-r88-auto.mjs`를 준비했다. 현재 공개 R32 확정일을 기준으로, 필요할 때만 기존 DC 3종(기준 SPY 포함)·우주 승인 4종을 최대 7 GET으로 증분 수집한다. 기존 R25/R32 및 optional 승인 산식으로 확정·잠정 계산/키별 CAS/readback/10개 API 대조를 연결한다. source별 가격 모드·원자료 SHA·기여자/결측은 보존한다. 새 태스크나 시각 변경은 없다.
- 새 공통 실행의 실제 저장 원본 비공개 검증은 5개 lane 전부 통과, provider 0/D1 쓰기 0. 설치·동일 정규 entry의 수동 Runtime 검증은 아직 대기다. 우주 관련 14개 기존 모듈은 승인된 최신 main `f58ed3c`의 바이트를 그대로 재사용했으며 새 산식 개발이 아니다.

- source `022910aa89fe5c913c96307910b50676abc07e1a`의 71파일 고정 runtime을 설치했다. 기존 R54 task XML SHA `ffe2e89bf2c2b0914a64465e653da794df81b856529052020a779a2114586da9` 전후 일치. 설치 후 실제 저장 원본 사전 실행 5개 lane 모두 검증, provider GET 0/D1 쓰기 0. 자연 예약 실행 성공과 구분한다.
- 후속 검토에서 DC/우주의 동일 기준일 manifest가 정상 append로 바뀌면 기존 writer가 `UNCHANGED`로 끝내 출처 SHA가 이전 상태로 남고, 새 잠정 replay가 막힐 수 있음을 확인했다. 확정 이력·점수·산식·구성 전체 동일성 검사는 유지하면서 출처/candidate SHA만 달라진 경우 CAS 메타데이터 갱신을 허용한다. 변경 없는 입력은 계속 0쓰기, 과거 점수 변경은 여전히 차단한다. 관련 독립 fixture 4개 통과.

- 최신 사용자 지시: 공개 10개 전체의 28일 확정·29일 잠정 반영. 데이터센터도 기존 DTCR/GRID 2종을 유지한 공개 갱신 대상으로 명시 승인했다. 아래 최초 데이터센터 보류 기록보다 이 최신 승인이 우선한다. 권리 불확실성이 해소됐다고 인증하지 않으며 예약 실행기는 변경하지 않는다.
- R88 Reader의 기존 PC optional staging 의존성 1개도 manifest에 추가했다. 실제 staged cycle import를 포함한 회귀 검사 5개가 통과했다.

- PR #897, main `d6e3039c8f196f02eb508970cf6ac5141cca16f4`, Cloudflare `a5ff3798` 배포 완료. 기존 R54 실제 CAS/readback 및 공개 API에서 8개 R32 테마의 10/28 확정 이력을 사적 원본과 전부 대조했다. 우주 4종의 10/28 확정 50.83655도 실제 게시·API 검증 완료. 데이터센터 R6 공개 보류는 유지한다.
- 사용자는 10/30에 **28일 확정 + 29일 잠정**을 재확정하고, 저장된 보조 API의 가격 차이·결측 처리를 검증한 뒤 R32 잠정 게시를 명시적으로 승인했다. 구산식 페어 점수로 되돌리지 않는다.
- GMH 29일 1 GET: HTTP 200, 0행, data-through 28일. 기존 MarketParquet 28·29일 파일은 감사 SHA 일치, 29일 54/63 ETF+SPY 존재. 확정 원가격에 덮어쓰지 않는다.
- R88은 기존 SHA 검증 R47 세션, R25 개별 계산, R32 공식 AUM reducer를 그대로 재사용한다. 28일 8×252 확정 점수 전체 replay 일치, 사용 ETF의 28일 동시 관측 가격 차이 최대 0.005158184319119741(약 0.52%). 기존 우주 R8의 5% 비교 상한을 재사용한다. 동시 관측·40회 관측·실제 29일 값이 없는 ETF는 결측으로 남기고 공개 잠정 기여자/결측 명단을 분리한다. 모든 8개 테마는 3종 이상 AUM 다중 ETF 방식이다.
- 저장 전용 새 D1 키 `theme-nine-r32-provisional-r88`만 CAS로 게시하도록 준비한다. 확정 252점·기존 키·R6·예약 설정은 수정하지 않는다. 원가격과 EOD가 동일하다는 권리/가격 인증을 만들지 않으며 `sourcePriceReconciled=false` 및 별도 provisional price mode를 유지한다.
- 우주 기존 R8: 29일 잠정 53.03499, 별도 키 실제 D1 1쓰기·정확한 재조회, 실제 공개 API에서 28일 50.83655/29일 53.03499 확인 완료. R88 8개는 비공개 계산 완료이며 웹 Reader 배포·D1 게시·화면 검증이 남았다.

아래 내용은 최초 복구 시점의 과정 기록이며 위 현재 상태보다 우선하지 않는다.

저장소 `ansqhd5774-Choi/zgmini`, 작업 브랜치 `codex/theme-fear-greed-integration-20261025`.
기준 main `1c93f0af02976024d9a54ef1c686d426e0c4e3f7`, 작업 시작 remote `da1678c64c8733dc9f6717154f8c0f6b977b6195`.

## 유지 계약

- 기존 R25/R32 함수·63개 ETF(편입 64자리)·9개 연구 테마·공개 교집합 8개 유지. AI는 새로 공개하지 않는다.
- 우주·위성은 승인 UFO/NASA/WARP/ROKT 4개와 기존 R32 연속성 규칙 유지. 2개 우선쌍 연구기로 되돌리지 않는다.
- 데이터센터는 현재 승인된 DTCR/GRID 구성을 변경하지 않는다. 이번 작업에서 추가 다중 ETF 구성을 만들지 않는다.
- API 2종은 서로 다른 가격 모드다. R32 확정 계산에는 기존 GMH raw 1h만 사용. MarketParquet 일봉을 섞거나 새 산식을 만들지 않는다.
- R6 공개 보류, 예약 작업 설정, 기존 키·이력 보존. 이번 실행 D1 쓰기 0.

## 실제 처음 끊긴 지점

1. 10/30 13:30 R54 로그는 10/27 R32 게시를 `PUBLIC_API_VERIFIED`로 확인했다.
2. 14:20 이후 legacy R179가 10/28로 전진했다. 실제 API는 `ETF_ONLY_T40_R20_V40_PAIR50`, `modelRevision` 없음으로 돌아왔다.
3. 실제 D1의 R32 10/27 항목을 1회 SELECT해 기존 Reader와 수정 Reader에 동일하게 입력했다. 기존은 제외, 수정본은 R32 모델·7/5/6/6/6/6/8/9 ETF 공개 교집합을 유지했다. 우주 4종·데이터센터 2종은 그대로 보존했다. 이는 로컬 실제 저장자료 replay이며 Production 배포 성공이 아니다.
4. 기존 Reader는 legacy confirmed 날짜·달력·provisional sourceVersion과 완전 일치를 요구했고 provisional 최대 2개를 가정했다. 실제 공개 목록은 10/26, 10/28, 10/29 세 날짜다.
5. PC 수집은 아침 조회 후 6시간 cooldown 상태였다. 14:31 1회 공급처 확인에서 SPY 10/28 raw 1h 16행이 제공됐다.

## 실제 비공개 복구 결과

- 기존 R35 bounded collector: 겹침 10/27~10/29, 이전 완료 창 검증, 4GET/batch 및 60초 간격 유지, 64/64 심볼 완료. 기존 기준선 불변.
- PSI HTTP 503에서 중단. 기존 원자료 전체 검증·실행 보호구간 검사·체크포인트 백업 후, 명시적인 503 복구를 1회만 허용해 이어받았다. 같은 체크포인트에 503이 재발하면 두 번째 자동 해제를 금지한다. 기존 502 기본 동작 유지.
- 기존 설치된 R47/R48 CMD로 10/28 9×252=2,268점 생성, 독립 R54 private pair replay 및 raw SHA 305파일 검증.
- 후보 파일 `THEME_NINE_R48_PRIVATE_CANDIDATE_2026-10-28_79b2dc902a695942.json`, SHA `79b2dc902a6959420a987632197f33b7c5ac615326493803ab273f3e512ea8a0`.
- 우주: 4GET append-only 수집. 최신 main의 기존 R28/R32 계산기를 그대로 재사용, 10/28 점수 50.83655, 252/252 점수. 비공개 결과 SHA `5e6a980a177b6bfdf7dac19838ae1da7e073da8c120acf63473f19c8c878e784`.
- 데이터센터: 3GET, 10/28 비공개 계산 252점, SHA `bab6faac6ab4bc8588a1b56efe40648ba27d8525d0e9057f2647595704f0608b`.
- 수정된 R51로 실제 3개 날짜의 기존 잠정치를 그대로 별도 계보로 보존하는 private overlay 생성. `r32ProvisionalScoreCount=0`: 10/29 R32 값을 생성했다고 주장하지 않는다. 기존 잠정치를 R32로 재표기하지 않는다.

## 코드 수정

- 유효한 게시 R32 확정 이력은 legacy 날짜가 먼저 전진해도 유지하며, 실제 R32 날짜를 그대로 표시한다. 권리·원자료 검증·252점·ETF·freshness 검사는 유지한다.
- PC 게시 전 정렬 검사는 엄격한 날짜 일치를 유지한다. Reader만 기존 검증 R32의 독립 anchor를 허용한다.
- 게시기 입력의 순환 참조를 막기 위해 `?publication-base=1`은 동일 저장 결과의 R32 overlay 이전 날짜·기존 공개 잠정치만 반환한다. 기본 방문자 URL에는 항상 R32 overlay가 적용된다. 외부 provider 호출/계산/쓰기 없음. 게시 후 readback은 반드시 기본 URL로 한다.
- 게시 성공 판단에 실제 `modelRevision` 및 `methodologyVersion` 일치를 추가한다. 값만 우연히 일치하는 경우를 성공 처리하지 않는다.
- R51/R37의 legacy subset 목록은 bounded 32개까지 검증하며 원래 순서·날짜·점수를 변경하지 않는다.
- 우주 수집은 기존 append-only collector를 재사용하되 승인 4종만 읽는다. 신규 등록 테마나 예약 작업을 만들지 않는다.
- 기존 R54 standalone CMD의 15파일 SHA/base64 payload를 현 소스와 다시 맞췄다. 설치·공개 실행은 하지 않았다.

## 검증 / 미완료

- 관련 7개 테스트 파일 39/39 PASS. TypeScript `tsc --noEmit --pretty false` PASS.
- 전체 theme-nine 테스트 실행은 실행환경 세션 중단으로 결과 미확보. 위 38개 결과와 구분한다. 전체 build/CI 미실행.
- 실제 D1 SELECT 1회, D1 INSERT/UPDATE 0. Production Reader 변경/Cloudflare 배포/신규 예약/기존 예약 변경 0.
- 페이지 반영은 아직 미완료. 전용 브랜치 전체를 main에 병합하지 말고 이번 검증된 patch만 선별해야 한다.
- 다음: 선별 통합 경로 확정 → 최신 main 위 검증·PR → Git 자동배포 → 기존 PC 게시 코드의 exact deployed source gate 유지 아래 전환 → 승인 범위의 D1/readback·실제 10개 화면 확인. R6 보류는 별도 유지.
- 과거 R83/R87 진단의 날짜·실행 미완료를 현재 상태로 반복 사용하지 않는다. 이번 실제 checkpoint·산출 파일이 새 비공개 완료 증거다.

### 선별 웹 후보 검증 추가

최신 main 위에 서버 Reader/API 3개·테스트 2개·이 문서만 선별한 6파일 후보를 준비했다. 해당 테스트 16개, TypeScript, 실제 `vinext build`가 통과했다. 기존 브랜치 전체 병합이나 새 브랜치 생성·배포는 하지 않았다. R54 패키지 검사에서는 Windows autocrlf 표현만 Git의 LF 소스로 정규화하며, 실제 포함 payload SHA 및 CMD CRLF 검사는 그대로 유지한다.
