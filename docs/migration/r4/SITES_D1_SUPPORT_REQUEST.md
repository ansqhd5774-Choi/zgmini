# ZGMINI Sites Production D1 이전 지원 요청

현재 Sites Production을 유지하면서 사용자 Cloudflare 계정으로 무손실 이전할 수 있는 공식 경로를 확인하려고 합니다. 이번 요청은 정보 확인이며, DB 생성·복제·삭제·쓰기 변경·운영 중단을 요청하는 것이 아닙니다.

대상 Sites project: `appgprj_6a9aab599d64819185bbc870a6e728d7`
Production version: `377` / 배포 성공
Production source: `de0504f191ab2ba5e0bdbdebd312f162f25f035e`
DB binding: `DB`
대상 사용자 Cloudflare account: `6e9b57e718b247330a6efa42a9516e95`

1. Sites project `appgprj_6a9aab599d64819185bbc870a6e728d7`이 실제 사용하는 D1의 `database_id`, `database_name`, owning account를 확인해 주세요.
2. 해당 D1을 위 사용자 Cloudflare 계정에 직접 bind할 수 있나요?
3. 직접 bind가 불가능하면 complete SQL export를 제공할 수 있나요?
4. 제공되는 export에 schema/index/trigger가 포함되나요?
5. 해당 export는 transactionally consistent snapshot인가요?
6. export 중 Production write는 어떻게 처리되나요?
7. export 후 신규 D1에 import하는 공식 절차는 무엇인가요?
