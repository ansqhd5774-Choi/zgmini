# PC 수집 상태 헤더

표시 단위는 개별 API 키/시리즈 수가 아닌 수집 작업입니다. 14개 market job + 7개 public feed + 한국 원자료 1개 + 이란·Alpaca·공급 R10 3개, 총 25개입니다. FRED 42개 시리즈를 42개 API로 표시하지 않습니다.

- 정상: 최근 8일(192시간) 안에 검증된 수집 성공이 한 번이라도 있음. 이후 실패가 발생해도 유효한 마지막 성공이 있으면 정상입니다.
- 실제 요청이 없는 캐시·대기·quota 유예는 성공 시각을 갱신하지 않습니다. 미래 시각 및 정확히 8일이 경과한 성공은 제외합니다.
- 마지막 시도와 마지막 성공 시각을 따로 보존합니다. 최근 시도 실패는 정상 건수와 별도 진단으로 표시합니다. 유효한 성공이 없고 최근 실패가 있으면 실패, 증거가 없으면 미확인입니다.
- 한국 원자료는 COMPLETE/NO_TRADING_OBSERVATION checkpoint의 fetched_at 및 실제 성공 체크를 사용합니다.
- 개별 공급자의 실제 HTTP 성공 여부 및 모든 시리즈 저장 완전성을 이 표시 하나로 보증하지 않습니다.
- 화면은 수집 작업 정상 건수/총수/백분율 및 마지막 집계 시각(KST)을 표시합니다.
- PC run-local이 SQLite에서 집계하여 기존 public_feed_snapshots_v1에 collection-health/output/current 요약을 저장하고 read-back합니다. 기존 공개 출력 게시 루프가 D1에 전달합니다.
- visitor GET /api/collection-health는 요약 fixed key 한 행만 SELECT합니다. Provider 호출, history scan, DDL, 점수 계산은 없습니다.
- 조회 시 각 항목의 8일 만료를 다시 계산합니다. 집계 자체가 8일 지났으면 확인 불가, 요약 없음/오류는 회색입니다. 모두 정상은 초록, 일부 정상은 주황 점멸입니다.
- hover/키보드 focus/mobile tap으로 팝오버를 엽니다. Escape/바깥 터치로 닫힙니다. reduced motion 환경에서는 점멸하지 않습니다.
- 페이지 최초 로딩에서 한 번 읽습니다. 자동 새로고침은 추가하지 않습니다.

배포는 GitHub main -> Cloudflare Git Integration 기존 경로를 사용합니다. PC source 승인 갱신 전 게시가 막히는 기존 보호 절차를 유지합니다.
