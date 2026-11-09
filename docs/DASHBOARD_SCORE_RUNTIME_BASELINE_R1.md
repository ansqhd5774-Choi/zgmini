# ZGMINI 68개 대시보드 — 실제 공개·PC 원장 갱신 기준선 R1

- 관측일: 2026-11-10 KST, 공개 API/홈 약 05:40–06:00 KST. 모든 수치는 해당 시점의 일회성 스냅샷.
- 대상: docs/DASHBOARD_SCORE_68_CONTENT_CONTRACT_INVENTORY_R1.md의 D27+S11+T30=68개 논리 콘텐츠.
- 범위: 기존 실PC pc-job 결과 **7건 재사용** + 실제 공개 API **11개 경로** 및 홈 UI 읽기 전용 관측. 신규 PC Issue·수집·재계산·D1 쓰기·예약·Cron·배포 0건.
- 주의: 공개 HTTP 응답은 자체 표시값 및 오류의 실측이지 D1 row 직접 readback/PC 원자료 이력의 검증이 아니다. PC source SHA, releaseAt/availableAt, observationAt, calculatedAt, storedAt, publishedAt, UI 시간은 별도 증거로 연결해야 한다.

## 1. 공개 API/화면의 실제 기준선

| 영역·읽은 경로 | API 관측상태 / 값 | 원자료·점수 기준 관측 | 갱신/저장 시각 (KST 변환) | 확인된 차이와 판정 |
|---|---|---|---|---|
| 미국 공포탐욕 /api/fear-greed | verified, 31.8857 | CNN observedAt 2026-11-10 05:45:26 KST | PC 계산/게시/d1 시각 별도 미확인 | **CNN 원관측시각 확보**, PC 방문/점검시각과 혼동 금지 |
| 경제12+CM-R1 /api/market-score | SUCCESS, 전체 12/12 READY, 100% 가중치, raw 47.3157879843, 화면 40.6 | asOfDate 2026-11-09(UTC기준), historyMode CURRENT_VINTAGE_ONLY, lookAheadSafe=false | API updatedAt 2026-11-10 05:52:30 | **저장된 종합 스냅샷 갱신 ≠ 12개 원자료 모두 신규 관측**. 화면값은 승인 3.5배 표시 민감도 |
| 한국 공포탐욕 /api/indicators/korea-funds | profile ZGMINI_KR_FG_REV7, 홈16.7 | 관측 거래일 2026-11-06 | snapshotGeneratedAt 2026-11-07 09:37:27 | 과거 RECONSTRUCTED_CURRENT_VINTAGE는 당시 확정 PIT 이력 아님 |
| 미국 등락 확정 /api/market-breadth?market=usa&phase=confirmed-r2 | FULL_MARKET_STALE_OBSERVATION | 홈 과거 저장 비율: 2026-10-30, 상승26.4%·보합5.8%·하락67.8% | 최신 확정 게시시각 직접 미확인 | **확정 API에서 stale**; 홈은 'R2 이력·10.30' 날짜를 명시한 과거 fallback. 11/10 신규 확정으로 세지 않음 |
| 한국 등락 / 홈 | 연결 예정, 수치 없음 | 원천·기준일 확인 불가 | N/A | 현재 점수/비율 공개 PASS 아님 |
| 섹터11 /api/sector-fear-greed | CONFIRMED, 11/11 점수 노출 | confirmedObservationDate 2026-11-06, 252거래일 기반 | sourceGeneratedAt 2026-11-07 09:02:27, updatedAt 09:02:40 | API 필드상 생성→갱신 **13.192초**. 단, 이것만으로 PC 로컬→D1 readback/최신 원자료 확정 아님 |
| 테마30 /api/theme-fear-greed | UNAVAILABLE, STORED_DATA_STALE, themes=[] | 카탈로그30/등록10/미등록20 | 유효 게시시각 없음 | 현재 공개 점수 **0/30** |
| 금리심리 /api/rate-sentiment | READY, 76.29, RATE_SENTIMENT_R1_RESEARCH | observationDate 2026-11-05 | sourceStoredAt 2026-11-10 04:58:03 | 최근 저장시각만으로 11/10 신규 H.15 관측이라 주장 불가; FedWatch 확률 아님 |
| 이란 진행 /api/iran-progress | UPDATE_DELAYED, 36.4 | asOfDate 2026-11-04, lastSignalDate 11-03 | collectionCheckedAt 2026-11-04 12:00:03, publishedAt 12:00:19 | **게시 지연 표시 상태 자체를 존중**; 승인 제거된 R13 예약을 임의 복원하지 않음 |
| 자산버블 /api/asset-bubble-detail | READY, 22.5732; currentQuarterStatus PARTIAL | **scoreObservationQuarter 2026-Q2**, diagnosticQuarter 2026-Q4 (미완성) | sourceStoredAt 2026-11-10 04:47:02 | asOfDate 11-09와 2026-Q2 **최종 완료 분기** 구분. 최근 저장된 자료를 Q4 확정점수라고 오인 금지 |
| 스태그플레이션 /api/stagflation-risk-detail | READY, 별도 S21, 70.3579(상세 API) | observationMonth 2026-09-01, 13개월 공통 월별 | 공개 계산/게시 시각 미제공 | HISTORY_POLICY CURRENT_VINTAGE_RECONSTRUCTION_NOT_PIT, 원관측월과 표시 점수의 날짜 분리 |
| 인플레이션 위험 /api/inflation-detail | READY, 58.9488 | 상세 내부 features 일부 observationDate 2026-09-01 | 상세 updatedAt 2026-11-07 01:50:07 KST | trend 마지막 label **2026-11-30**은 11/10 당시 미래 월말 표기. 실제 11/30 신규 확정 관측이라고 간주 금지 |

위 표는 실측한 **11개 독립 API 경로**(한국 등락은 별도 호출이 아닌 홈 표시)와 홈 대조다. 모든 68개 항목의 독립 API/Runtme PASS를 의미하지 않는다. 텍스트/필드 구조를 브라우저 번역 확장이 일부 가공할 수 있어, 판정은 코드에서 확인한 영어 필드명과 시각·수치 또는 원문이 유지된 짧은 응답을 기준으로 제한했다.

## 2. 기존 PC 실행 결과 — 원본 7개 조회

| PC 요청(원본) | 실측 결과 | 신뢰 가능한 범위 / 제약 |
|---|---|---|
| zgmini-pc-control #1128, 2026-11-10 05:08 | A core-status, CORE_READONLY_DIAGNOSIS PASS. 수집 COMPLETE(04:58), Writer VERIFIED(05:03), Core 마지막 COMPLETE(05:07) | **Core 전체가 멈췄다는 주장은 반증**. 실제 각 68개 개별 점수 D1 게시 완료 증거 아님 |
| #1136, 11/10 05:32 | A readonly 고정 checkout HEAD=approvedConfigSource=checkpointSource 70d2d1dbd8180255133bdd7fc925ae07bb8d6cc9 | 11/10 05:03 #1127의 승인 source 4273137a85adcc90c863a27f703baa749b05cb64보다 최신 승인 판본. 모두 runtimeSourceVerified:false, 현재 실행 프로세스 SHA는 UNKNOWN |
| #1067, 11/09 21:37 | 자산버블 R10 저장자료 재계산/Writer VERIFIED | PREVIOUS_RELEASE_PRESERVED, d1 readback=false. **신규 공개 점수 게시 성공 아님** |
| #1033, 11/09 18:58 | 테마 R181 수집기/R179 게시기 설치 기록 | R181 ledger STOP, R179 PUBLIC_API_ROLLING_MISMATCH. 점수 공개 0개 원인과 연결, 기능 원담당이 오류 단계 확인 |
| #613, 11/07 05:31 | CNN SQLite/현재·이력 조회 | HISTORY_DIVERGENCE, sidecar UNATTESTED. 당시 관측 근거이며 11/10 지연시간 현재값 대체 불가 |
| #772, 11/08 05:40 | 물가 19개 별도 projection readyCount19 | stagingOnly=true, Writer SKIPPED_METADATA_ONLY, D1 쓰기 0건. **대시보드 물가 전체 게시 PASS 아님** |
| #654, 11/07 12:22 | 섹터 실행 정적 source trace | STATIC_LAUNCHER_TRACE_ONLY, runtimeSourceVerified:false. 섹터 11개 로컬→D1 전량 증거 아님 |

- 공통 기존 #1127, 2026-11-10 05:03: CORE_NO_ACTIVE_TASK_ENGINE/STATE_UNKNOWN은 **그 시각 활성 프로세스 미포착**. 뒤이은 #1128 완료 checkpoint를 고려하여 장기 장애로 단정하거나 #1127 무조건 재요청하지 않는다.
- 원격 결과 원문 위치: PC 제어 저장소 main/results/42689955371-1-seat-2.json (#1128), 42693903840-1-seat-1.json (#1136), 42618509231-1-seat-5.json (#1067), 42597414102-1-seat-3.json (#1033), 42289043301-1-seat-5.json (#613), 42412198454-1-seat-5.json (#772). #654는 원본 이슈를 근거로 하고 일부 상세 원장 미확정.
- PC 제어 저장소 #68의 Controller #917 RECOVERY_REQUIRED는 실제 Controller 교체/동일 lease에만 관련. 별도 API/Reader/기능 조사 전체 중단 사유가 아님.

## 3. 원자료 체크포인트와 Writer 실행시각의 혼동 — 소스 검증

**실제 자료 변화 감지에 대한 구조적 위험(아직 장애 발생 횟수 미산출)**

1. scripts/pc-writer/run-local.mjs의 공통 시장점수 계산은 기존 로컬 저장자료로 점수를 구한 뒤 marketOperationalStore.writeScore(body,now)를 실행한다.
2. worker/market-operational-store.mjs 및 publish.mjs는 market_public_snapshots_v1.current와 UTC 날짜 키를 UPSERT한다.
3. worker/projection-checkpoint-r52.mjs의 readCoreCheckpoint()는 **현재 market_public_snapshots_v1.current.stored_at**을 core:저장시각의 sourceVersion 및 sourceStoredAt으로 취급한다.
4. 따라서 실제 공급자 관측/원자료 signature가 변하지 않아도 Writer가 current를 다시 저장하면, 일부 위험 projection에 **새 버전처럼 보이는 재계산 트리거**가 발생할 수 있다.
5. 이는 새 공식 자료가 반영되었다는 증거가 아니다. **원자료 observationDate, source checkpoint/signature, PC 계산 사건, D1 게시 버전**을 분리해서 추적해야 한다.

**이력 계약 차이**

- scripts/pc-writer/composite-observed-archive-r1.mjs는 15분 버킷 기반의 계산 사건을 보존하지만 원관측일, carriedForward, finality, revision/supersedes 정보가 충분하지 않다.
- app/api/market-score/observations/route.ts의 timeMeaning PC_CALCULATED_AT은 공급자 원관측일이 아니라 **PC 계산 시각**을 뜻한다.
- lib/market-score/composite-observed-display-r1.mjs는 1D 계산 archive, 1W~3M 혼합, **6M/1Y에는 archive detail을 사용하지 않고 기본 일별 추세**를 반환한다. 당시 실제 계산점과 현재 빈티지 재구성점을 혼동할 수 있다.
- sector-fear-greed-r3-local-cycle.mjs의 SAME_DATE_SCORE_DRIFT는 기존 확정값을 보호한다. 공식 정정은 assertion 삭제 없이 revision 계약으로 다뤄야 한다.
- theme-etf-only-public.mjs는 ETF 권리·252거래일·기준일·8일 freshness Gate를 검사한다. 카탈로그 항목 추가만으로 공개 상태가 READY가 되지 않는다.

## 4. 인과적 갱신 지연시간 판정

각 항목에 대해 다음 원본 필드를 **같은 계산사건/입력 signature**로 연결한 경우에만 실제 지연시간 PASS로 기록한다.

| 단계 | 필요한 시각/식별자 | 현재 원장으로 판정 |
|---|---|---|
| 공급자 원관측 | observationDate, releasedAt/availableAt, provider series, 원천 signature | 일부 API에 날짜 존재. 68개 원본 전체 미검증 |
| PC 수집·저장 | collectedAt, sourceStoredAt, local checkpoint/sourceVersion | 공통 Core 완료는 존재, 개별 연결 미완 |
| PC 계산 | calculatedAt, formulaVersion, input signature, scoreRaw, phase | 종합 일부 archive 존재, 68개 원천 연결 미완 |
| Writer 게시 | localResultVersion, publishedAt, result hash | 일부 개별 기능 기록 존재, 68개 전체 미완 |
| D1 readback | stored_at/version/body hash, matchedToLocal | #943 ER1 **다른 콘텐츠 한 건**만 PASS, 점수 전역 근거 아님 |
| 공개 GET/UI | result version, original observation date, display date/state | 대표 11개 API와 홈 읽기, 개별 PC 원장과 인과 링크 미확정 |

- **지연시간 측정 완료:** 섹터 API 응답 본문 내 sourceGeneratedAt→updatedAt 13.192초(필드 사이 차이). **PC 원자료 수집→D1→UI 전체 지연시간 완료: 0/68개**.
- 정확한 전체 갱신 SLA는 산정할 수 없다. 확정된 시차 데이터 없는 경우 UNKNOWN으로 둔다.
- 새 예약·자동수집 작업 생성 금지. 기존 Reader/Writer/Controller에 확인된 필수 경로를 재사용한다.

## 5. 결론과 다음 필수 실행

- **식별:** 68/68 완료(전수 인벤토리 참조).
- **대표 공개 상태/날짜/이력:** 11개 실제 GET와 홈 상태 실측. 데이터 게시 누락·구시점·재구성의 의미 차이를 발견.
- **PC 런타임 원장:** 신규 작업 없이 기존 7건 재사용. 공통 Core 완료 기록 확인, 기능별 source SHA/실자료 인과 연결은 부분.
- **운영 분모 전체 PASS:** 0/68(동일 checkpoint로 수집→계산→D1→API/UI 전체 입증 기준).
- **계획 배점 판정:** 단계1 운영 기준선 PARTIAL, 단계2 인과 지연 측정 PARTIAL, 단계3 일별 확정 계약 아직 미승인. 이 근거만으로 15%+15%를 완료 처리하지 않음.
- **다음 한 건:** 가장 영향 큰 대표 경로인 CM-R1 시장점수의 실제 **원자료 checkpoint/signature와 current.stored_at을 분리**하는 최소 데이터 계보 설계를 작성하고, 기존 SQLite/Writer 계약으로 가능한지 확인한다. DB·D1 스키마 변경 필요 시 범위를 제시하고 승인 전 쓰기 금지. 원담당 기능 수집/게시와 병렬로 독립 조사 지속.
