# 2026-10-30 실PC 원자료·R32 복구 및 Reader 역전 원인

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
