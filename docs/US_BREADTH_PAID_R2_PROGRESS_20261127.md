# 미국 전체 등락지수 R2 진행 원장 — 2026-11-27

- 담당: 미국 전체 등락지수 R2
- 저장소: `ansqhd5774-Choi/zgmini`
- 기능 브랜치: `codex/us-breadth-public-r1-20261031` (기존 원담당 이력 보존; 운영 코드 정본은 최신 main)
- 계획: [US_BREADTH_PAID_R2_EXECUTION_PLAN_20261127.md](US_BREADTH_PAID_R2_EXECUTION_PLAN_20261127.md)
- 기준 관측: 2026-11-27 KST, Windows 실제 #4036 / #4040
- 종단 진행률: **5/8 = 62.5%**, 완료는 실제 운영 단계 기준. 잔여 3/8.

## 완료 및 근거

1. 코드/CI/PR: 본체 [#1702](https://github.com/ansqhd5774-Choi/zgmini/pull/1702) 병합 `225a0806ce611b370a9fe451cf6c18ab78599af6`.
2. 운영 Core Writer B: 제어 [#4008](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4008) 실PC 설치 SHA `c8ed53a3991212dd1778742cda8a86ac133e0796`.
3. Controller 승인·설치: PR #4028/#4031 병합; 원본 B [#4036](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4036) `SUCCEEDED/APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED`, 실제 SHA `3c7d4cfefacf072fd35cb19706b352c64c5e4fd2`, `RECOVERY_SHA=NONE`, 보호 상태 불변.
4. 독립 Windows 사후 A: [#4040](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4040) / Run [45873869837](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45873869837), `PASS/CORE_READONLY_DIAGNOSIS`. 원본 `results/45873869837-1-seat-6.json`.

## 실제 원자료 상태와 제한

| 구분 | 실제 관측 |
|---|---|
| `stock_daily` 영수증 | 30일, 2025-11-19 ~ 2026-11-25 |
| `etf_daily` 영수증 | 29일, 2026-10-16 ~ 2026-11-25 |
| 최근 영수증 메타데이터 유효 | stock 30/30; ETF 29/29 |
| 원파일 SHA 재검증 | 현재 A는 `FILE_METADATA_ONLY`; 별도 완료 전 |
| 거래일 연속성 | 미검증 |
| R2 비공개 결과 | `DIRECTORY_UNAVAILABLE` |
| 250 비교점 | 미확인 |
| D1 `us-breadth-paid-r2-v1` | 실제 값 미회수 |
| 공개 API/UI 실값 | 미확인 |

**최소 221개 날짜가 모자라 보인다는 계산은 30개가 목표 251일에 모두 포함된다는 가정에 한정한 하한이며, 실제 결손 수는 정확한 목표 거래일과 intersection 검증 후 확정한다.**

## 2026-11-27 개발 추가 진행 (운영 완료 아님)

- 최신 main 기준 별도 최소 작업 브랜치 `codex/us-breadth-r2-paid-backfill-20261127` 생성. 원 담당 브랜치는 main 대비 과거 기능 이력 변경이 커 그대로 병합하지 않음.
- [소스 PR #1722](https://github.com/ansqhd5774-Choi/zgmini/pull/1722): 변경 7파일, 기존 공통 `collectPaidDaily`에 선택형 유료 `stock_daily` 수집을 추가하면서 기본 stock+ETF 동작 보존; 새 읽기 전용 `planStoredPaidUsR2Backfill`은 최신 완료일 기준 목표 날짜/결손 영수증을 계산. 기존 Core `--publish` 경로에만 추가하여 현재 stock+ETF 우선 수집 후 한 Core 실행당 총 40파일의 잔여 예산으로 과거 stock-only 누락분을 분할 수집. 기존 source pin 검사를 재사용하며 신규 Task/예약 없음.
- 관련 회귀시험: stock-only vs ETF 경계, invalid type 사전 차단, 목표 거래일 결손/잘못된 인덱스, provider/D1/파일 쓰기 0.
- 운영 소스 `c8ed53a...`는 변경되지 않았고, 이 PR만으로 공급자 수집·backfill·비공개 산출·D1/API 게시를 완료했다고 간주하지 않음. CI exact HEAD 확인 후 **실제 설치 CAS·승인 범위의 선택적 Writer B 적용**이 필요하며, 적용 후에만 기존 Core 자동 갱신으로 bounded backfill이 실행됨.

## 2026-11-27 PR #1722 병합 확인 및 PC 사전조회 준비

- [PR #1722](https://github.com/ansqhd5774-Choi/zgmini/pull/1722): 정확 HEAD `a2ee441ea7d2d696ffdc24105004f911ccfcd48f` Node CI / CodeQL / Secret Scan PASS, GitHub main merge `10be1e52138d5a59b9464e9b04f39d5bdcdcfb32`.
- 승인된 기존 Controller `3c7d4cfefacf072fd35cb19706b352c64c5e4fd2`에서 `writer-install-preimage-readonly` 범위형 A 조회 지원 확인. 4개 대상 Writer 파일 SHA/현재 source/config CAS를 확보하기 위한 제어 [PR #4046](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4046) 진행.
- **GitHub 병합과 원격 조회 범위 등록은 PC 신규 Writer B 설치·원자료 수집·계산·게시가 아니다.** 5/8 유지.
- 완료한 #4008 Writer B, #4036 Controller B는 중복 실행하지 않는다.

## 현재 남은 3개 종단 단계

- [ ] 6/8: 목표 251거래일 도출·유료 `stock_daily` 결손일 bounded backfill·원본/projection SHA 전체 검증. `etf_daily` 전 기간 수집은 미국 R2 완료조건이 아니다.
- [ ] 7/8: Core `--publish` 저장 계산 250점, private 파일 SHA readback, D1 `us-breadth-paid-r2-v1` CAS/readback.
- [ ] 8/8: Production current/history GET과 PC·모바일 표시·수치·날짜 동일성.

## 다음 실제 실행

1. 기존 `paidDates`와 `previousMarketSession` 기준 정확한 251일 집합 확정.
2. 기존 `collectPaidCurrent()`가 현재 저장분 이후만 모으는 한계를 해결할 **stock_daily 선택형 bounded backfill**을 승인된 공통 구조로 연결. 코드 변경이 필요하면 최신 main에서 최소 수정·회귀시험·PR, 정규 승인 설치.
3. 운영 수집/결과/게시/화면 검증까지 순서대로 수행. 새 명령·임의 shell/SQL 다운로드·공급자 권리 확대 금지.

과거 #4036은 재요청하지 않는다. 현재 Controller/Writer 정상 증거를 재사용한다.
