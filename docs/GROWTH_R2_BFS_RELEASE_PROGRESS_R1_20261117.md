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
