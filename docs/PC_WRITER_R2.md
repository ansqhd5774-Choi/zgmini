# PC 수집·저장·계산 운영 계약

사용자 승인(2026-10-05): API 수집과 원자료 보관 및 계산은 PC에서 수행한다. Cloudflare는 홈페이지와 저장된 공개 결과를 제공한다. 원자료를 다시 Cloudflare로 업로드하지 않는다. 기존 산식·TTL·공개 응답·DNS는 유지한다.

## 로컬 저장
- `%USERPROFILE%\.zgmini\pc-writer\providers.env`: 로컬 전용 키. Git/배포/로그 포함 금지.
- `storage/core.sqlite`: 시장 입력·수집 진행 상태·계산 결과.
- `storage/history.sqlite`: 한국시장 원자료·이력·계산 결과.
- `local-seed-progress.json`: 기존 저장 이력의 초기 복사 재개 지점.
- `local-collection-last-run.json`: 실제 수집 결과와 호스트별 HTTP 상태. 요청 URL/키는 기록하지 않는다.
- `local-writer-last-run.json`, `local-publication-ledger.json`: 계산 및 공개 결과 게시 검증.

## 실행
Node 24 이상을 사용한다. `seed-local.mjs`는 기존 금융 테이블을 읽기 전용으로 초기 복사한다. 개인정보 테이블은 제외한다. 한국시장은 기존 체크섬 검증 캐시를 재사용한다. 일반 운영 중 원격 원자료 읽기는 하지 않는다.

`collect-local.mjs`는 기존 수집기를 로컬 SQLite에 연결한다. 한 번에 public feed 1개 또는 market job 1개이며, `--korea`는 기존 maxDates=1 규칙을 유지한다. 공급자 실패 때 마지막 정상 저장 자료를 유지한다.

`run-local.mjs`는 키 없이 로컬 저장 데이터만 계산한다. 계산 중 네트워크 접근은 차단한다. `--publish`는 활성 설정·clean source와 승인 소스의 게시 계약 호환성을 요구한다. 전체 Git SHA 일치는 요구하지 않는다. `worker/`, `lib/`, 운영용 `scripts/pc-writer/`, package manifest/lock 변경은 검토 대상으로 보호한다. UI·콘텐츠·연구 backfill/backtest 변경은 게시를 막지 않는다. config.source와 로컬 origin/main 양쪽에 대해 게시 관련 파일을 비교한다. 원격 main 조회 실패 또는 로컬 origin/main 갱신 지연은 별도 상태이며 이 비교는 마지막으로 가져온 main 기준이다.

공개 점수, 상세 projection, public feed output, 한국시장 산출 snapshot만 원격에 게시하고 재조회한다. `SUBMITTING`이 남으면 원격 lease와 현재 시장 결과를 읽는다. 활성 게시가 있거나 read-back 실패/충돌이면 보류한다. 조회가 성공하면 기존 기록을 보존한 `READBACK_RECOVERED`로 전환하고 다음 게시에서 각 결과를 조정한다. 이것은 전체 게시 완료를 뜻하지 않는다. 최신 원격 시장/projection/feed는 덮어쓰지 않는다. 성공한 전체 게시만 VERIFIED다.

`publication-events.jsonl`에는 게시 성공·실패·차단 원인과 시각을 누적 보존한다. 차단 시 stderr 경고 및 예약 작업 종료 코드 2를 반환하므로 수집 성공을 게시 성공으로 표시하지 않는다. 외부 알림 서비스는 추가하지 않는다.

한국시장 snapshot은 FK가 참조하는 해당 날짜의 실제 로컬 COMPLETE 확인 메타데이터와 함께 원자적 batch로 게시한다. 원자료 종목 행은 업로드하지 않는다. 확인 메타데이터가 없으면 임의 count/date를 생성하지 않고 실패한다. 기존 날짜 기록은 덮어쓰지 않는다.

`local-cycle.mjs`는 단일 PID 잠금으로 수집과 계산·게시를 순서대로 실행한다. `install-local.mjs`는 같은 SHA의 실제 VERIFIED 결과 이후에만 Windows 예약 작업을 등록한다. core는 5분, Korea는 매시 37분이다. 이전 작업은 삭제하지 않고 비활성화하여 롤백 경로로 보존한다. PC와 로그인 세션 및 인터넷 연결이 필요하다.

## Cloudflare 전환
PC 실제 게시와 D1 read-back 검증 후 Git Integration으로 배포한다. `ZGMINI_COLLECTION_TARGET=pc`는 scheduled handler를 I/O 이전에 종료한다. Cloudflare cron 목록은 비운다. D1 공개 결과 저장소와 HTTP 읽기 계약은 유지한다. direct Wrangler 배포나 DNS 변경은 하지 않는다.

## 검증 구분
로컬 단위검사, 실제 수집·저장, 네트워크 차단 계산, 원격 게시·read-back, 예약 작업, hosted deployment는 각각 별개로 보고한다. 코드 또는 문서 존재만으로 운영 전환 완료를 선언하지 않는다.
