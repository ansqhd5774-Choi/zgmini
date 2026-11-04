# 테마 공통 운영 기준 (2026-10-31)

## 테마 확장·산식 일괄 관리 최신 지침 — 2026-11-03

[THEME_SCALE_AND_METHODOLOGY_WORKFLOW.md](THEME_SCALE_AND_METHODOLOGY_WORKFLOW.md)를 함께 따른다. 신규 테마는 설정으로 추가하고 산식은 공통 버전 바인딩으로 전체/선택 적용한다. 테마·ETF 수량 상한과 테마별 파이프라인 복제는 두지 않는다. 아래 운영 상태·개수·미완료 항목은 각 기록 시점의 snapshot이며 현재 완료 상태를 취소하거나 재작업을 요구하는 기준이 아니다.

## 목적과 범위

신규 작업 실행·기존 승인 재사용·장벽별 대응은 [THEME_ONBOARDING_PLAYBOOK.md](THEME_ONBOARDING_PLAYBOOK.md)를 따른다. 위임 정책은 `theme-platform-policy.mjs`가 판단하며 기술 검증이나 실제 서비스 권한을 우회하지 않는다.

앞으로 추가될 테마와 산식 변경을 공통 등록·실행·검증·게시·진단 체계로 관리한다.
데이터센터 R32 전환은 이 기반이 검증된 뒤 별도로 수행하는 기능 작업이며, 이번 구조 개선의 목적이나 완료 조건이 아니다.
테마 수와 ETF 후보 수에 사업상 최대/목표 개수를 두지 않는다. API 호출 예산·페이지 크기·실행 시간은 자원 제한이며 전체 테마 수 제한으로 사용하지 않는다. bounded chunk와 cursor로 전부 처리한다.

## 용어 정정 — 현재의 우선 기준

- PAIR50: `ETF_ONLY_T40_R20_V40_PAIR50`, ETF 2종 고정 50:50 구버전.
- R32: `ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_DATED_ISSUER_AUM_R32`. 승인된 적격성·적응형 개별 점수·날짜별 AUM 집계 규칙. 실제 2종인 날짜도 승인 R32 분기를 사용할 수 있다.
- R18→R19→R20→R23→R25→R26→R32→R33은 같은 R32 개편 프로젝트의 연속 단계다. 또 다른 신규 산식 완성본을 찾지 않는다.
- R20 연구 9개는 공통8개+AI·반도체. 현재 공개10개는 공통8개+우주·위성+데이터센터. 공개 R32 적용 확인9개는 공통8개+우주다.
- 63종 후보와 날짜별 실제 기여자 수를 구분한다.
- 데이터센터 공개 갱신 승인은 PAIR50 또는 DTCR·GRID 구성의 최종 승인이 아니다. 데이터센터는 R32 전환 누락이며 승인 미확인 범위 제외 기록이 존재한다.
- 기존 10개 날짜·점수 공개 성공을 10개 모두 R32 전환 완료로 보고했던 설명은 정정한다. 실제 공개 성공 증거는 보존하되 버전 일치와 별도로 기록한다.

## 등록과 버전

단일 등록 계약은 id/label/공개여부/승인 ETF/승인근거 SHA/산식 버전/확정·잠정 입력 정책/게시 key를 담는다. 실제 상태는 실행 증거이며 등록 설정에 성공을 수기 기입하지 않는다.
산식은 코드 바인딩 레지스트리로 선택한다. 입력 JSON이 실행 파일 경로나 임의 코드를 지정하지 않는다.
구버전 등록 계약은 역사 자료로 보존한다. V1 2종 계약을 단순 완화해 R32로 표기하지 않는다.

## 공통 실행과 장애

갱신 복구 시 [현재 운영 공급처와 복구 범위](THEME_NINE_LIVE_ARCHITECTURE.md#현재-운영-공급처와-복구-범위)를 적용한다. 브랜치의 실제 실행 코드, 완료된 실PC 증거, 현재 설치본을 대조한 뒤 첫 미완료 단계부터 재개한다.

source→calculate→validate→publish→readback→public의 동일 단계로 테마와 확정/잠정을 처리한다. private 모드는 validate에서 끝난다.
공유 공급처·가격모드·입력정책·symbol이 같을 때만 수집 계획을 통합한다. 다른 가격모드를 합치지 않는다.
checkpoint는 등록·실행·모드 fingerprint에 묶고 CAS로 저장한다. 검증된 단계를 재실행하지 않는다. 외부 부작용은 stable effectKey와 기존 게시기 CAS/readback으로 중복을 막는다.
테마 한 건 오류는 다른 테마를 막지 않는다. checkpoint 저장 실패는 불확실한 외부 쓰기를 숨기지 않도록 실행을 중단한다.
게시·readback·공개 proof는 정확한 계산 산출물 SHA/등록 SHA/산식 버전에 묶인다. 점수가 우연히 같거나 HTTP200이라는 이유로 성공 처리하지 않는다.
이전 정상 결과의 날짜·산식을 보존하며 구버전으로 조용히 fallback하지 않는다.

## 진단과 전환

설치·계산·게시·공개·자연 예약은 독립 증거다. 현재 공개 명단과 등록 명단을 전수 대조하고 미등록/누락/버전 불일치를 기록한다.
새 버전은 저장 입력으로 shadow 계산→기존 승인 결과 동등성/의도된 차이 검사→선별 전환한다. 기존10개를 삭제·초기화하지 않는다.
새 공통 코드가 있다는 사실을 운영이 연결됐다는 뜻으로 사용하지 않는다. 현재 테마를 bridge하는 실행·게시·Reader 어댑터와 자연 예약 증거가 있어야 운영 통합 완료다.

## 실제 구현·설치 상태 — 2026-11-02

- V2 등록→기존 공통 collector→승인된 scoreOneR25/mixNineR32Date→별도 확정/잠정 CAS 게시→readback 연결을 구현했다. V1은 과거 계약으로 보존한다. 신규 선정·AUM 증거의 SHA를 확인하고 테마/ETF 수의 사업상 상한은 두지 않는다.
- 실제 저장 R20 연구9개×252거래일의 점수·기여자·가중치·AUM이 승인 산출물과 일치했다. 저장 보조 API의 공개8개 10/29 잠정 결과도 기존 R88 결과와 일치했다. 증거: E:/ZGmini/analysis/THEME_PLATFORM_REAL_SHADOW_RESULT.json. 재수집·원자료/D1 변경 없이 검산했다.
- 공통 관련 테스트 87/87 통과. 설치된 불변 bundle의 실제 scorer 재생, 1001개 등록, Reader 501개 pagination, cursor/resume, CAS/readback, 실패 격리, Windows Git-free 패키지를 포함한다. 웹 Reader/결합/기존 화면 23/23 및 TypeScript·vinext build도 통과했다. fixture와 실제 게시 증거를 혼동하지 않는다.
- PC 설치 source: 9cad027530230d5b4f97707a9707ab97866dd1d6, ACTIVE_RUNTIME version: 0b1ed5d35888b0e0. 예약 CMD와 수동3개 entry를 같은 버전으로 갱신했고 기존 Task XML은 동일하다. 실제 THEME_SCHEDULED.cmd 수동 진입 종료0. 등록0이므로 Provider/D1 쓰기0이다. 증거: E:/ZGmini/analysis/THEME_PLATFORM_FINAL_LOCAL_EVIDENCE.json.
- portable ZIP을 생성하고 새 폴더에 압축 해제하여 47개 파일 manifest를 재검증했다. ZIP SHA: 5cc910df992b210df62f30900475631d81df3b8c4820be01f6394cfb09aa1d0a. ZIP은 source SHA와 함께 검증하며 해시 일치만으로 신뢰 원천을 대신하지 않는다.
- 공통 CLI 순환 import에 의한 실제 종료13은 registry 하위 모듈로 목록 발견을 옮겨 해결했고 동일 entry 종료0으로 확인했다. 과거 설치 성공만으로 실행 성공이라 판단하지 않는다.
- 기존 R32 standalone CMD payload/source SHA 불일치 1건은 공통 실행 경로 외의 과거 문제다. 승인 계산기 자체는 변경하지 않았고 실데이터 동등성이 확인됐다. NON_BLOCKING으로 남기며 검사를 약화하지 않는다.
- 웹 선별 PR #902를 main에 병합했다. 병합 SHA: `2b0407f7c87418280b3a2503611c7e578ed89cf7`. Cloudflare Git 자동빌드 `8b3353db-42a5-4034-8121-c99c00e81297` 성공. main AGENTS.md에도 이 전용 브랜치의 공통 기준/실행 지침/위임 정책 참조를 등록했다.
- Production `/api/theme-configured`: HTTP200, R32 및 별도 잠정 지원 정보 확인. 등록0이므로 PENDING/0건이며 실패가 아니다. 기존 `/api/theme-fear-greed`: READY/10개, 배포 직전·직후 themes 전체 객체가 동일했다. 증거: `E:/ZGmini/analysis/THEME_PLATFORM_PUBLIC_BEFORE.json`, `THEME_PLATFORM_PUBLIC_AFTER.json`.
- 실제 Production 390×844·1440×1000에서 기존10개 순위/차트와 동적 공개 개수 표시를 확인했다. 문서 폭은 각각375/1425로 viewport보다 작았다. 임시 크기 override는 복원했다. 화면 증거: `E:/ZGmini/analysis/theme-platform-production-mobile.png`, `theme-platform-production-pc.png`.
- CI 전체 성공으로 보고하지 않는다. 최신 main과 동일한 경제지표 검사2건 실패와, 변경 전 run41440711029에서도 확인된 dashboard-deferred-ui-browser-r1.mjs:93의 등락 SVG 대기 실패를 분리했다. 해당 경제/대시보드 파일은 이번 PR에서 수정하지 않았다. 테마 관련23검사·TypeScript·build 및 실제 테마 화면은 통과했다.

## 완료 범위와 남은 운영 증거

- 신규 테마는 완성된 V2 등록 JSON·선정 근거·AUM을 기존 공통 도구에 전달한다. 새로운 테마별 CMD·예약·API/UI 코드는 기본 요구사항이 아니다. 실제 비용/권리/인증/범위 변경만 별도 결정한다.
- 현재 신규 등록 테마0이다. 임의 테마나 샘플 D1을 만들어 첫 실제 신규 테마 게시 성공을 주장하지 않는다. 첫 승인 테마의 실제 Provider→D1→UI 증거는 해당 등록 때 남긴다.
- 최신 설치 이후 자연 예약 실행은 아직 관찰하지 않았다. 수동 entry 성공과 구분한다. 기존 공개10개의 운영 경로 전체가 V2 등록기로 이관됐다고 주장하지 않는다.
- 현재 지원 산식은 승인 R32다. 다른 새 산식은 명시적 공통 코드 바인딩·동일 입력 shadow·회귀 검증이 필요하다. JSON이 임의 코드를 실행하거나 모든 미개발 산식을 자동 구현하는 구조가 아니다.
- 등록 definition은 불변이다. ETF/AUM/산식 변경은 기존 definition을 몰래 수정하지 말고 명시적인 revision 및 전환 검증으로 처리한다.
- 데이터센터 R32 전환 누락은 이 공통 체계가 갖춰진 뒤 별도 수행한다. 이번 완료를 데이터센터 R32 적용 완료로 보고하지 않는다.

## 과거 자료와 공통 참조

`THEME_R32_RECOVERY_20261030.md`는 당시 실행 증거, `THEME_CONFIG_WORKFLOW.md`는 V1 등록기 개발·설치 이력이다. 그 문서의 과거 준비/미배포/2종 제한/10개 완료 표현을 현재 운영 계약으로 재사용하지 않는다. 현재 공통 작업 기준은 이 문서이며 역사 로그·커밋은 삭제하거나 고쳐 쓰지 않는다.
