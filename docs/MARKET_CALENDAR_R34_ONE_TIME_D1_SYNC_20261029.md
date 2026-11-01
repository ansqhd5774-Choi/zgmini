# Market Calendar R34 — 기존 PC 표시본 한 건만 D1에 동기화

## 사용자 승인 및 분리

- 확인된 PC R33 결과: `READY_CACHED_DISPLAY`, `recordCount=2609`, provider API 호출 `0`.
- 이것은 PC SQLite에 저장된 사실의 증거이며 D1에 게시했다는 증거가 아니다.
- `main`에는 `/api/earnings-calendar-display` 공개 읽기 라우트가 이미 있다. GitHub의 Cloudflare Workers Builds 연결에서 `main` 변경을 빌드·배포한다.
- **일회성 D1 동기화와 Cloudflare 코드 자동배포는 별개 작업**이다. D1 데이터만 쓰기 위해 Worker를 다시 배포할 필요는 없다.

## 이번 구현

`scripts/pc-writer/market-calendar-r34-earnings-sync.mjs`와 동봉 CMD는 기존 승인 PC의 `core.sqlite`에서 **`kind=output, feed_key=market-calendar:earnings-display-html, snapshot_key=current`만** 읽는다.

1. 등록된 `ZGMINI-PC-Local-Core` 작업의 프로젝트 위치·식별자, PC 승인 HEAD 및 설정 출처를 확인한다.
2. 기존 `local-cycle.lock` 획득을 최장 20분 동안 10초 간격으로 시도한다. 타 작업 잠금 삭제·강제 실행·작업 등록 변경은 없다.
3. HTML-only 표시본의 14일 범위, 반환 불가한 원문/JSON 분리, 건수, 원자료 시각, 크기를 검증한다.
4. PC의 기존 Cloudflare 인증을 통해 **승인된 D1 공개 테이블 단일 키**를 읽고, 원격보다 새 표시본인 경우에만 갱신한다.
5. D1에서 같은 키를 다시 읽어 `body`, `stored_at`이 로컬과 동일한지 검증한다.
6. `R34_D1_SYNC_VERIFIED` 또는 `R34_D1_ALREADY_SYNCED`일 때만 데이터 게시 성공을 표시한다.

EarningsAPI 호출·신규 원자료 수집·계산·다른 feed 게시·신규 스케줄러·직접 Wrangler 배포·DNS 변경·Git push는 CMD 작업에 포함되지 않는다.

## 배포·상태 근거

- PC R33 로그: `MARKET_CALENDAR_R33_PC_APPLY_RESULT.txt`에서 로컬 2,609건 확인.
- GitHub `main`의 `app/api/earnings-calendar-display/route.ts` 존재 확인.
- 기존 `main` commit의 GitHub check run `Workers Builds: zgmini-migration-candidate-r5` 결론 `success` 확인. 특정 R34 커밋의 배포 성공을 대신하는 근거가 아니다.
- R34 PC 동기화는 실제 CMD 결과에서 D1 readback 증거가 나올 때까지 `미실행`으로 보고한다.
- 사용자 사이트 모니터링 계약대로 신규 예약/감시 작업을 설치하지 않는다.
