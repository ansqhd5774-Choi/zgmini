# PC 저장 데이터 계산기

사용자 승인: 기존 PC에서 무거운 계산을 실행하고 Cloudflare는 수집·저장·공개 조회를 담당한다. 산식, TTL, Cron 시간표, DB 스키마는 유지한다.

- `ZGMINI_COMPUTE_TARGET=pc`: 기존 Cron은 원자료 수집까지만 수행한다. 전체 시장 계산, 한국 전체 이력 계산, 새 projection 작업 enqueue를 생략한다.
- PC 실행: `node scripts/pc-writer/run.mjs --publish`. 기본 실행은 원격 쓰기 없는 검증이다.
- `%USERPROFILE%\.zgmini\pc-writer\config.json`: account/core/history 식별자, 승인 source SHA, enabled. 인증정보는 넣지 않는다.
- 기존 Wrangler 로그인 또는 프로세스의 CLOUDFLARE_API_TOKEN만 사용한다. 만료된 기존 로그인 갱신은 공식 Wrangler whoami로 수행하며 출력은 공개하지 않는다.
- 입력·결과·마지막 실행 보고서·publication ledger는 같은 PC 폴더에 저장한다. 저장된 한국 이력은 검증한 단위로 재사용하고 새로운 구간만 받는다. 원자료를 Git에 올리지 않는다.
- 시장 계산은 기존 30분 공개 TTL 안에서 20분 간격으로 재계산한다. 입력별 기존 유효기간 검사 및 PARTIAL 상태는 보존한다. PC 작업은 5분마다 확인한다.
- 시장 계산/저장은 기존 pipeline lease를, 한국 계산/저장은 기존 Rev7 lease를 공유한다. 중복 실행을 막고 원격 저장 후 결과를 다시 읽어 확인한다.
- 상세 projection은 기존 builder, fixed key, sourceVersion/sourceStoredAt 계약으로 하나씩 저장한다. envelope READY와 payload PARTIAL은 서로 다른 상태이며 후자를 정상 데이터 완비로 보고하지 않는다.
- 저장 결과가 불명확하면 재전송 전에 read-back한다. 미확정 ledger는 자동 재쓰기하지 않는다.
- 설치: 승인 SHA에서 수동 publish VERIFIED 후 `node scripts/pc-writer/install.mjs`. 기존 같은 이름의 작업은 덮어쓰지 않는다. 작업명 `ZGMINI-PC-Writer`.
- 실행 조건: 해당 Windows 사용자가 로그인했고 PC와 네트워크가 켜져 있어야 한다. 절전·전원 설정은 변경하지 않는다. PC가 중단되면 기존 TTL에 따라 STALE/503이 될 수 있으며 날짜를 조작하지 않는다.
- 중단: `schtasks /Change /TN ZGMINI-PC-Writer /DISABLE`. 기존 Worker 계산으로 돌아가려면 compute target을 되돌리는 Git Integration 배포가 필요하다. 이전 Worker CPU 한계가 다시 발생할 수 있으므로 자동 fallback은 하지 않는다.

검증 구분: 로컬 계산/재현, D1 read-back, 예약 작업 실행, 정확한 Cloudflare 배포 및 Cron Runtime은 각각 별도 확인한다. DNS 전환은 기존 Cutover Gate가 모두 통과한 후에만 가능하다.

REST SQL 형식 근거: https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/
