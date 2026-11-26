# 미국 전체 등락지수 R2 유료 250거래일 종단 실행계획 R2.1

기준일: 2026-11-27 KST
담당 기능 브랜치: `codex/us-breadth-public-r1-20261031`
운영 승인·소스 정본: `main` 및 유효 PC 원장; 오래된 기능 브랜치 자체를 운영 소스라고 가정하지 않는다.
진행 원장: `docs/US_BREADTH_PAID_R2_PROGRESS_20261127.md`
최종 목표: MarketParquet Complete Archive + Keep Current 승인 유료 stock_daily 251개 연속 거래일 → 비교 250개 상승·보합·하락 비율 → private SHA → D1 feed `us-breadth-paid-r2-v1` → Production API/PC·모바일 확인.

## 0. 마지막 유효 완료점 및 진행률
- 종단 기준 8단계 중 5개 완료 = **5/8 (62.5%)**. 코드/CI/병합, Windows Writer B 설치, Controller B 설치 및 자동 사후검사를 재작업하지 않는다.
- 본체 [PR #1702](https://github.com/ansqhd5774-Choi/zgmini/pull/1702) merge `225a0806ce611b370a9fe451cf6c18ab78599af6`. Core 운영 SHA `c8ed53a3991212dd1778742cda8a86ac133e0796`.
- Controller [#4036](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4036): `SUCCEEDED/APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED`, actual SHA `3c7d4cfefacf072fd35cb19706b352c64c5e4fd2`, 보호 상태 불변.
- 자동 사후 A [#4040](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4040), Run `45873869837`: `PASS/CORE_READONLY_DIAGNOSIS`; 실제 원자료 메타데이터 파일 조사 PASS.
- 원자료 영수증: `stock_daily` 30개 (2025-11-19 ~ 2026-11-25), `etf_daily` 29개 (2026-10-16 ~ 2026-11-25); 최근 각 영수증의 메타데이터/원파일 크기/projection 존재 유효, **원파일 SHA 독립 재검산과 거래일 연속성은 미검증**.
- R2 private output: `DIRECTORY_UNAVAILABLE`; 실제 250개 결과·D1 현재값·API/UI는 미검증.
- 설치 JSON: `results/maintenance-pc-update-86b98541-34f9-45f7-bfbb-62d278f00b46.json`; 사후 JSON: `results/45873869837-1-seat-6.json`.

## 1. 잔여 단계 A — 251개 목표 거래일 정확 산정 및 원자료 비교
1. 운영 시점 `latestCompletedSession()`을 기준으로 미국 251거래일(전일 비교 250점) 목록을 `previousMarketSession()`으로 역산한다. 시간대·휴장일·발표일을 혼동하지 않는다.
2. `paidDates(base,'stock_daily')`와 목표 날짜를 정확히 대조하고 기존/누락/누락구간/목표 바깥 보유분을 분리한다. 보유 영수증 30개가 연속이라는 전제 금지.
3. 재사용하는 모든 날짜는 `readPaidDaily()`와 `readPaidProjection()`으로 원파일·projection SHA 재조회 및 split-adjusted close 유효성 확인.
4. 결과는 민감 원자료 없이 목표 범위/누락 날짜/verified 건수/최초 실패 코드로 기록.
**완료:** 목표 251개 명확화와 안전 재사용 가능한 원자료 목록 확보.

## 2. 잔여 단계 B — 누락된 stock_daily만 기존 승인 수집기로 보충
1. `collectPaidCurrent()`는 최신 저장 영수증에서 시작하므로 과거 Archive 초기 backfill을 대신하지 못한다. 동일 주기 반복으로 해결했다고 처리하지 않는다.
2. 이미 승인된 공통 `collectPaidDaily({start,end,maxFiles<=40})` 및 운영 PC 공식 실행 경로를 사용한다. 현 구현은 stock_daily와 etf_daily를 모두 순회하므로 **미국 R2에 불필요한 etf_daily 전체 재수집을 새 필수 조건으로 부과하지 않는다**. 필요시 기존 수집기에 요청 asset type을 선택하는 최소 소스 수정과 관련 테스트를 먼저 수행하고 승인·설치 범위를 분리한다.
3. authorized paid full plan, 원본 수집 권리/계약, 정규 Runner/lease/저장 경로 확인. 실패·부분 처리 시 재요청이 아니라 기존 checkpoint와 실제 완료 일자로 bounded chunk/resume.
4. 기존 유효 파일은 덮어쓰지 않는다. SHA 충돌·중복 영수증·결손은 정확한 파일만 원인 진단. 기존 원본/복구 백업을 보존한다.
**완료:** 필요한 251개의 `stock_daily` 원본·영수증·projection SHA verified, 연속 거래일 PASS.

## 3. 잔여 단계 C — 계산·비공개 저장·D1 CAS
1. 저장된 자료만 `calculateStoredPaidUsBreadthR2()`로 계산. 중간 일별 파일 누락→STOP, 개별 종목 전일 가격 부재에만 승인된 보합 규칙 적용.
2. 기존 승인된 Core `--publish`에서 `runPaidUsR2StoredCycle()` 호출, checkout HEAD == config.source 및 관련 파일 clean 검사.
3. `comparedSessions=250`, `fullYearHistory=true`, 각 point의 비율 합 100%, 날짜 연속성, private 파일 SHA readback 확인.
4. D1 `public_feed_snapshots_v1`의 feed key `us-breadth-paid-r2-v1` 단독 preimage → CAS → readback. 같은 관측일 값 상충·과거 겹침 변조·결과 불명은 blind retry 금지.
**완료:** private SHA, 실제 D1 저장값/시각/버전/250점 일치.

## 4. 잔여 단계 D — Production GET 및 UI 실제 확인
- `GET https://zgmini.kr/api/market-breadth?market=usa&phase=confirmed-r2` 최신 완료 거래일에 `200/READY/CONFIRMED`.
- `GET https://zgmini.kr/api/market-breadth-r2-history?market=usa`에서 실제 250 거래일과 최초·최종 날짜.
- 3개 비율 0~100%, 합계 100%, D1/API/PC·모바일 동일 숫자·날짜·마지막 차트점.
- 실제 관측값은 선분으로 연결하고 가짜 점·데이터 보간 금지. 이력은 과거 관측일을 보존하되 오래된 값 current로 표기하지 않음. 공개 소스가 이미 배포됐으면 데이터 게시만으로 재배포하지 않음.
**완료:** 저장→게시→현재/이력 API→홈페이지 실값 동등성.

## 5. 오류별 처리 및 금지
- `PAID_R2_STORED_SESSION_GAP`: 실제 누락 일자만 수집.
- `PAID_R2_STORED_READBACK_FAILED`: 원파일/Projection SHA 정확 비교, 검사 우회 금지.
- `US_PAID_R2_PC_SOURCE_PIN_STOP`: 운영 HEAD/config CAS와 승인 source 분리 대조.
- `US_PAID_R2_LATEST_SESSION_NOT_STORED`: 현재 완료일 실제 수집 확인 후 게시.
- `US_PAID_R2_D1_OUTCOME_UNKNOWN_NO_RETRY`: D1 저장 결과 먼저 조회, blind retry 금지.
- 공유 lease/lock: 실제 소유자 확인 후 정규 흐름, lock 삭제·강제 프로세스 종료 금지.
- 기존 #4036 단회 설치 요청 재발행 금지; 새 예약/공급자/요금제/Cloudflare 직접 배포/기타 기능 산식 변경 금지. 제외된 무료 MarketParquet·IEX 데이터 대체 금지.
- 기존 정상 Runtime 보호. 작성·CI·병합은 기능 완료가 아니고 실제 수집·계산·게시·UI 증거가 완료조건. 요청하지 않은 예약 미래 검증 추가 금지.
