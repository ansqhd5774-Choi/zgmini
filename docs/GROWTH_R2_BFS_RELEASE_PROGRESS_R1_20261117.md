# Growth R2 BFS 월간 CSV 갱신 R1 — 진행 기록

기준: `fix/growth-r2-bfs-release-aware-chart-20261117` / `docs/GROWTH_R2_BFS_RELEASE_EXECUTION_PLAN_R1_20261117.md`

## 2026-11-17 최초 실행
- ① 원본 확인: Census 공식 10월분 11월 12일 발표, 운영 PC CDN last2xx=2026-11-03T21:00Z, 웹 D1 forward 관측월 2026-10.
- ② **실제 원격 D1 chart 직접 조회 미완료**: 현재 제공된 인증된 도구에는 D1 데이터 조회 연결이 없음. 공개 Growth READY/forward 최신월을 chart의 readback으로 대신하지 말 것.
- ③ D1 `growth_r2_feature_history_v1` 구조와 `pit_eligible=1` forward vs `pit_eligible=0` chart 분리 확인.
- ④ SELECT-only BFS 3개 저장 공식월 Reader 구현 (`readGrowthR2VerifiedBfsForwardMonth`).
- ⑤ 불일치·미증명·당월 자료는 no-fetch.
- ⑥ 24지표 원래 결측복구 경로는 유지하되, 이미 READY라면 3개 BFS만 최신 release 월 검사.
- ⑦ 12MiB 크기 검증 / CSV 3시리즈 해당월 확인 / 1회 GET 신규 Reader 구현.
- ⑧ 기존 `persistGrowthR2ChartHistory`로 3시리즈만 저장 경로 구성.
- ⑨ 재현/회귀 테스트 `tests/growth-r2-bfs-release-aware.test.mjs` 작성.
- ⑩~⑫ **미완료:** GitHub CI, 병합 여부, 실제 D1 readback, 수동 B/PC/웹 최종 확인을 각각 완료 시 기록해야 함.

### 안전 계약
- 원본 PC 수집기/예약/Cloudflare Cron/DB 테이블/산식/Runner/Controller **변경 없음**.
- 권한 없는 remote D1 조회 시도를 성공으로 선언하지 않음.
- 리포트·검증 증거는 커밋/CI/원장 링크로 기록한 뒤에만 해당 단계 완료 처리.

## 소스 구현/CI 검증 업데이트 (2026-11-17)

- PR: https://github.com/ansqhd5774-Choi/zgmini/pull/1191
- 정확한 PR CI: https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43898408752
- `Node.js CI`: **COMPLETED / SUCCESS** (빌드·타입 검사·전체 회귀검사).
- 신규 5개 회귀시험 모두 PASS: (1) D1 고정 SELECT / 세 forward 월 동기화, (2) 공식 October release의 BFS 단일 요청/저장, (3) 미검증/최신 동일월 no-fetch, (4) CSV 일부 누락 시 무저장 실패, (5) 미래월·초과 바이트 차단.
- 출처/산식/기존 24개 Growth 차트 경로: 이 커밋에서 변경 없음. 변경 파일: D1 SELECT-only Reader, BFS-only CSV Collector, `ensureGrowthR2ChartHistoryR1` 분기, 신규 시험, 이 계획과 진행 기록.
- **절대 완료로 쓰지 말 것:** 실제 원격 D1 chart 저장월 조회, 운영 PC용 신규 소스 설치, 공급자 요청을 동반한 수동 B, D1 readback, `cdn.www.census.gov` PC 실제 HTTP 200, 사이트 HTTP 32/32.
- 소스 병합 여부는 PR #1191 / `main` SHA로 추가 확인. CI=PASS는 운영=PASS가 아님.

## 병합/클라우드 빌드 최종 영수증
- PR #1191: https://github.com/ansqhd5774-Choi/zgmini/pull/1191 — **MERGED**.
- 병합 `main` SHA: `0a786bd69c7dc815d296143021473d8f6bf7a118`.
- PR 원본 Node.js CI #43898408752: SUCCESS; 진행 기록까지 포함한 HEAD CI #43898968489: SUCCESS.
- Git 연동 `Workers Builds: zgmini-migration-candidate-r5`: SUCCESS. **이것만으로 운영 PC의 새 소스 설치나 신규 CSV 수집, 원격 D1 저장을 입증하지 않는다.**
- 기존 공개 연결 상태 최종 증거: API 14/14, HTTP 31/32, 마지막 CDN PC 2xx 2026-11-03T21:00:36Z. 자동으로 32/32로 올리지 않음.
- **잔여 작업:** 실제 D1 `pit_eligible=0` chart G060-G062 latest월 SELECT-only; 변경된 PC 소스/승인 수동 B 실행/최대 1회 CSV 통신/저장/원격 D1 재조회, 정규 스케줄 생성 금지. 본 기록을 기준으로 다음 담당자가 계속 실행할 것.
- 근거 저장 기준: 작업계획 `docs/GROWTH_R2_BFS_RELEASE_EXECUTION_PLAN_R1_20261117.md`; 구현 `lib/market-score/growth-r2-{d1-store-r1,chart-history-r1,worker-domain-r1}.mjs`; 테스트 `tests/growth-r2-bfs-release-aware.test.mjs`.
- 최종 단계 집계: 12개 중 ①·③~⑪ = **10개 소스/검증/병합 단위 완료**, ② 원격 D1 실측 및 ⑫ 운영 수동 B 종단 검증 **미완료**. 성공률 예측치가 아닌 실증 완료 항목 기준.
