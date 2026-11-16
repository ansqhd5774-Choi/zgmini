# Growth R2 Census BFS 월간 CSV 이력 갱신 R1 — 2026-11-17

## 확정 목표
2026-11-12 발표된 2026-10 BFS G060/G061/G062 자료를 **이미 D1에 저장된 공식 forward 발표월**로 식별하고, 차트 16개월 이력과 비교하여 필요한 경우 `cdn.www.census.gov`의 공식 CSV를 **단일 요청**으로 보완한다. 현행 14/14 API 및 31/32 HTTP 진단을 임의로 32/32로 승격하지 않는다.

## 원본 사실/권리 경계
- 공식 발표: Census 2026-10 BFS 발표 2026-11-12. https://www.census.gov/econ/bfs/release_schedule.html
- 공개 API `https://zgmini.kr/api/market-score` G060/G061/G062: observationDate 2026-10-01, availableAt 2026-11-12T16:57:41.159Z. 이는 D1 **forward** 공개값이지, 16개월 `pit_eligible=0` chart 전체 이력월의 직접 조회는 아님.
- 운영 PC A #1781 / Run 43893942654: HTTP 31/32, 실패 0, `cdn.www.census.gov`는 2026-11-03T21:00Z 이후 PC 실측 없음. 클라우드 CDN HTTP 200만으로 PC 통신 판정 불가.
- 기존 `ensureGrowthR2ChartHistoryR1`는 전 지표의 2개월 전 이력이 충족되면 READY를 반환, 이후 발표월의 BFS CSV 이력은 독립 확인하지 않음.
- **수정 제한:** 수집 예약, 14/14 공개 API, 산식, 원본 D1 스키마, 기존 21개 Growth 지표, 승인 R10 Alpaca 제외, Controller/6 Runner, Cloudflare Cron, DNS, quota 보호 방식 변경 금지. 이미 승인된 PC 출처와 인가 범위의 단회 수동 수집만 별도 검증 후 수행.

## 세부 작업 12개
1. 운영 PC HTTP 실측/사이트 공개 BFS/공식 발표 대조
2. 현재 D1 chart 저장월에 대한 직접 원격 읽기 가능 여부 판별 — 접근 권한 없으면 미확인 유지
3. 기존 24지표 D1 chart/forward 저장 테이블 및 복수 vintage 계약 확인
4. D1 `pit_eligible=1` + `provider='Census BFS'`의 G060·G061·G062 월 일치 확인용 **SELECT-only** Reader 구현
5. 공식 forward 월 미확인/서로 불일치/현재월이면 no-fetch
6. 완료된 24지표 chart에서 BFS 3개가 official forward보다 뒤처졌을 때에만 보완
7. 신규 1-GET CSV Reader/16개월 이하 바이트·월·시리즈·중복 검증
8. 기존 D1 `pit_eligible=0` history에 BFS 3개만 원본 vintage·해시를 유지해 idempotent 저장
9. 5개 이상 회귀/시뮬레이션: 발표 확인, 동월 재호출 없음, 부분 CSV 거부, provider quota·size guard, 다른 21개 불변
10. CI/빌드/기존 Growth 1년 차트 테스트
11. 소스 PR 검토/병합, 사용자 승인 수집 주기 변경 금지
12. 실제 D1 chart SELECT-only 증거 + PC 승인된 수동 B 1회 + D1 readback + 공개 HTTP 재검증 — 실행 못 한 단계는 완료로 기록 금지

## 설계상 잔여 위험
- CSV 발표 이후의 최근 16개월만 다룸. Census의 5년 연례 소급 수정까지 모두 반영한다고 주장하지 않음.
- 정상 scheduled job 자체가 실행되지 않으면 소스 수정만으로 신규 수집이 이루어지지 않음.
- 실제 D1 접근/배포/PC 설치가 없는 CI PASS는 운영 완료와 다름.
