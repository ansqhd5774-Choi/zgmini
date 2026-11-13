# 프로세스 총괄 전달문 — 고용 R6 수동 수집·점수 완성 (2026-11-14 KST)

## 목표와 진행률
- 작업 대화: 고용지표 `codex/employment-1y-reader-r1-4`.
- 최종 목표: 공식 DOL 원자료 기반 `STATE_CLAIMS_BREADTH` READY → 저장자료 계산 → 로컬 결과 → D1 → Production API/UI **29/29 scored 검증**.
- 시작 **7/8=87.5%**, 이번 종료 **7/8=87.5%**. 마지막 8단계 운영 세부 0/5(실측 미완료). 기존 R2 28/29 D1 공개 완료는 소급 무효화하지 않음.
- 계수: **29개 원자료 feature**, 기존 D1 게시 기준 **28개 scored READY / 1개 PARTIAL_HISTORY**, 별도 최근 평가 22/29 및 1년 차트 22/29. **이전 2026-11-10 실측의 유효 범위**이며 2026-11-14 신규 D1 전체 SELECT 성공을 뜻하지 않음.

## 이번 실제 수행과 원본 증거
1. 최신 제어 `main@69e25a08a903dc8e52ef1093ec15837de4c20858`의 `AGENTS.md`, `docs/GENERAL_CHAT_START.md`, `docs/PC_AUTOMATION_STANDARD.md`, `docs/PC_OPERATING_SYSTEMS_CANONICAL.md` 확인. 운영 PC `PC`(6 Runner)와 격리 PC `DESKTOP-N62L0NG`(1 격리 Runner)를 구분. RDC 미사용.
2. 기능 `main@643b7c7c4372ffad552443fc312c6cb1b944e2fc`; 개발 Draft PR [#1036](https://github.com/ansqhd5774-Choi/zgmini/pull/1036)의 기존 브랜치 HEAD는 이 기록 작성 전 `1b3f971f80735e70800342f7c9dd660dde3e8e11`. `main` 공급자 BACKFILL=**530주**, 개발 브랜치=**600주**를 파일 내용으로 재확인. **현재 운영 PC에 어떤 바이트가 설치됐는지는 신규 해시 미회수**, 이전 #1040의 600주 1파일 설치와 혼동 금지.
3. #1217(`pc-8da91b23-f5d6-4a94-bcd5-13b0dfcdee61`)·#1227(`pc-6f7a24d4-823d-4648-b2c3-a645a352bef7`)은 독립 원본 댓글에 `PC_JOB_INTAKE_NOT_OBSERVED`; 원본 requestId 소비·무결과 유지, 재발행/성공 처리 없음. 이후 별도 요청 [#1351](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1351), requestId `pc-8ff3a2e8-1bc9-4470-81ad-7789fc0b2b13`, [Run #43429486924](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43429486924) 현재 `queued`, job 131899103441, Runner 미배정, Windows 결과 JSON/TXT 없음. 추가 PC 요청 0.
4. 실제 운영 Controller 마지막 검증 소스 `badad9124157879d7a645b64f2768113d632355b`의 `config/operations.json`에는 `core-runtime-source-readonly`·`pc-source-preflight`가 **있고**, `employment-r6-collection-evidence-readonly`가 **없음**. 최신 제어 `main`에는 새 A가 등록되어 있으나 **PC 미설치**, 코드 병합을 실행 권한으로 오인하지 않음. `#996` C NO-GO는 공유 Controller 설치 쓰기에 국한하며 고용 개발·공개 조회의 전역 중단 조건이 아님.
5. 기존 운영 A [#1235](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1235) / Run 42927463348 `PASS/CORE_READONLY_DIAGNOSIS`: 2026-11-10T23:57Z 시점 승인 PC source `d560eb857c0f8a9a53dffbfd899e60ee29c697ab`; `local-cycle-last-run` COMPLETE(23:50Z), `local-collection-last-run` COMPLETE(23:55Z), `local-writer-last-run` VERIFIED(23:49Z). **관측 당시 checkpoint**이며 현재 Core live source/저장자료 완전성 증거 아님. 기존 [#1169](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1169) Run 42710641027: BLS 14+DOL 2, 수집 `PARTIAL/SERIES_PARTIAL`, SQLite `COLLECTOR_RECORDED`, D1 `VERIFIED`; 같은 ID 재실행 금지.
6. 공식 DOL [ETA 539 자료 설명](https://oui.doleta.gov/unemploy/DataDownloads.asp): **주간**·주별 청구자료이며 공식 원본 자료는 매일 갱신될 수 있고 주 정부 정정 자료가 다음날 반영될 수 있음. 소스 `employment-r4-shadow-provider.mjs`는 `st`·`c2`(관측주)·`rptdate`(수정판 선택)·`c3`(initial claims)를 이용, 50개 주+DC=51개 지리코드가 있는 주만 채택. **완전한 51개 주 집합과 시간 연속 577주는 다른 조건**. 현재 A 진단은 `knownMissingSeries`, `fullTenYearRawCoverage`/firstFailureWeek/51지역/4주 분모 0을 구분하도록 소스상 구현, 기존 관련 격리 13/13 PASS이나 실PC 실행 0.
7. 추가 코드 감사 주의사항: 현재 `parseEta539ShadowRows`의 `Number(String(raw.c3 ?? '').replace(...))`는 **빈 `c3` 문자열을 0으로 해석할 가능성**이 있다(`Number('')===0`). 이는 원본 빈 필드가 실제 존재하는지 **미확인**, `#1169` 부분 수집의 확인된 원인으로 단정 금지. 공식 0과 미기재값 구분 회귀 범위로 별도 평가하며 산식/원자료 변경이나 신규 완료 Gate로 확대하지 않음.
8. 공개 `https://zgmini.kr/api/employment-r6/observations` 및 UI는 과거 R2 28/29 게시 실증 재사용. **이번 환경의 직접 GET은 접근 불가**였으므로 새로운 D1/API/UI 갱신이나 날짜 전진 주장 금지.

## 지표 29개별 상태 — 기존 검증된 D1 집계의 범위
| 번호 | featureId | 점수 상태 |
|---:|---|---|
| 1 | `U3_UNEMPLOYMENT` | READY · 기존 2026-11-10 D1 집계 대상 |
| 2 | `U6_UNEMPLOYMENT` | READY · 기존 2026-11-10 D1 집계 대상 |
| 3 | `LFPR` | READY · 기존 2026-11-10 D1 집계 대상 |
| 4 | `EPOP` | READY · 기존 2026-11-10 D1 집계 대상 |
| 5 | `PAYEMS_MOM` | READY · 기존 2026-11-10 D1 집계 대상 |
| 6 | `PAYEMS_3M_AVG` | READY · 기존 2026-11-10 D1 집계 대상 |
| 7 | `PAYEMS_ACCEL` | READY · 기존 2026-11-10 D1 집계 대상 |
| 8 | `AVG_WEEKLY_HOURS` | READY · 기존 2026-11-10 D1 집계 대상 |
| 9 | `TEMP_HELP` | READY · 기존 2026-11-10 D1 집계 대상 |
| 10 | `INITIAL_CLAIMS` | READY · 기존 2026-11-10 D1 집계 대상 |
| 11 | `INITIAL_CLAIMS_4W` | READY · 기존 2026-11-10 D1 집계 대상 |
| 12 | `CONTINUED_CLAIMS` | READY · 기존 2026-11-10 D1 집계 대상 |
| 13 | `IUR` | READY · 기존 2026-11-10 D1 집계 대상 |
| 14 | `STATE_CLAIMS_BREADTH` | PARTIAL_HISTORY · 미평가 |
| 15 | `JOLTS_OPENINGS_RATE` | READY · 기존 2026-11-10 D1 집계 대상 |
| 16 | `JOLTS_HIRES_RATE` | READY · 기존 2026-11-10 D1 집계 대상 |
| 17 | `JOLTS_QUITS_RATE` | READY · 기존 2026-11-10 D1 집계 대상 |
| 18 | `JOLTS_LAYOFFS_RATE` | READY · 기존 2026-11-10 D1 집계 대상 |
| 19 | `AHE_YOY` | READY · 기존 2026-11-10 D1 집계 대상 |
| 20 | `ECI_12M` | READY · 기존 2026-11-10 D1 집계 대상 |
| 21 | `INDUSTRY_DIFFUSION_3M` | READY · 기존 2026-11-10 D1 집계 대상 |
| 22 | `STATE_EMP_DIFFUSION_3M` | READY · 기존 2026-11-10 D1 집계 대상 |
| 23 | `MSA_EMP_DIFFUSION_3M` | READY · 기존 2026-11-10 D1 집계 대상 |
| 24 | `BED_GROSS_GAINS_RATE` | READY · 기존 2026-11-10 D1 집계 대상 |
| 25 | `BED_GROSS_LOSSES_RATE` | READY · 기존 2026-11-10 D1 집계 대상 |
| 26 | `BED_NET_GROSS_RATE` | READY · 기존 2026-11-10 D1 집계 대상 |
| 27 | `BED_SMALL_FIRM_NET` | READY · 기존 2026-11-10 D1 집계 대상 |
| 28 | `BED_STATE_BREADTH` | READY · 기존 2026-11-10 D1 집계 대상 |
| 29 | `BED_BIRTH_DEATH_NET` | READY · 기존 2026-11-10 D1 집계 대상 |

**DOL 실제 PC 최초 결손 주·지역:** `UNKNOWN`. 기존 게시 최신 `STATE_CLAIMS_BREADTH` 관측일 `2025-07-19`은 *마지막 게시 관측일*이고 실제 최초 누락 주 또는 결손 지역을 의미하지 않음. 공식 원자료 수급·PC parser/snapshot/SQLite 단계 중 최초 오류를 원격 600주 진단으로 구분해야 함.

## 다음 필수 실행 — 운영 단일 담당과 통과 조건
1. **원담당:** 기존 #1351 / Run 43429486924의 Runner 배정·실행·원격 결과 `results/<runId>-<attempt>-seat-<seat>.json/.txt` 2/2를 추적. queue 지속 시 Runner 실제 Online·session·seat 상태를 승인된 읽기 계약으로 점검, 동일 요청 재시도 금지. 이는 Core source 확인이지 DOL 데이터 진단 자체가 아님.
2. **공유 Controller 담당(정확한 설치 쓰기 때만):** 새 `employment-r6-collection-evidence-readonly` A의 현재 PC 등록/누적 diff/기존 승인 manifest/설치 안전 조건을 정식 조정. `#996` C 원본·lock 우회 금지. 설치가 검증되면 **고용 원담당이** A 단회 조회로 577 연속주×51 지역의 첫 결손·원자료 snapshot·checkpoint 판정.
3. **고용 원담당:** 현재 PC 600주 provider/collector 목표 해시를 실제 preimage·HEAD/config.source·Writer lease와 대조. 이미 TARGET이면 재설치하지 않음. OLD이면 기존 정규 승인 overlay를 적용(실제 자원 경합만 직렬화).
4. **고용 원담당:** 실제 결손이 확인되면 승인된 단회 수동 BACKFILL로 필요한 범위만 보완. BLS/DOL 상한과 원본 원장 보호, 기존 28개 유효 점수 보존. DOL 577 연속주×51=29,427개의 필요한 행·주 단위 공식 정정의 실측.
5. **고용 원담당:** 기존 승인 산식으로 저장 원자료 계산→로컬 결과/ledger→D1 값·`stored_at`·R2 버전→실제 API/UI에서 29/29 scored READY 확인. 공식 결측/불충족이면 PARTIAL을 유지하며 완료율 100%를 주장하지 않음.

**차단 분류:** 새 DOL 정밀 A 실설치 부재는 **그 작업의 BLOCKER**, #1351 Runner 미배정은 **해당 A 요청의 AUTOMATION_PENDING**, #996 C 공유 설치 문제는 **겹치는 Controller 설치에만 BLOCKER**. 다른 기능 검증·R2 기존 28/29 실증 유지. 예약 자동 수집/자연 갱신 검증·인위적 장애 실증은 사용자 금지에 따라 **이번 범위 제외**, 새 예약 0.

**이번 작업에서 PC 운영/공급자/SQLite/D1 쓰기 0회**. 신규 PC Job 0개, 구 requestId 재실행 0건, 외부 Runner/Remote Desktop Commander 사용 0건.
