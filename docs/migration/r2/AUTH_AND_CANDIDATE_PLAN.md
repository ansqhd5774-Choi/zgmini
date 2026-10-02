# R2 인증 및 candidate 쓰기 차단 계획

## 인증 추적 결과
app/chatgpt-auth.ts는 oai-authenticated-user-id와 oai-authenticated-user-email을 읽고, 이름은 oai-authenticated-user-full-name 및 encoding 헤더에서 읽는다. source 내 userId 생성 알고리즘은 없다. Sites gateway가 제공한 opaque ID를 그대로 사용한다. 이메일 hash 또는 새 IdP subject를 기존 ID로 간주하면 안 된다.

/api/session GET은 로그인 여부와 displayName/email을 제공한다. /api/favorites GET/POST/DELETE는 favorite_sentiments.user_id에 이 ID를 bind한다. POST는 UPSERT, DELETE는 삭제다. 내부 canary/repair/refresh/probe API도 getChatGPTUser를 사용한다. operator email 비교가 있는 endpoint도 검증되지 않은 client 헤더만으로는 보호할 수 없다.

비로그인 공개 dashboard는 session user=null에서도 렌더링되며 즐겨찾기 조작은 로그인 사용자에게만 노출된다. 공개 조회는 인증 대체 전에도 검증 가능하지만 회원 로그인/기존 즐겨찾기 연속성은 완료로 간주할 수 없다. /signin-with-chatgpt, /signout-with-chatgpt, /callback은 직접 Worker에 구현된 route가 아니므로 현재 UI의 링크만 복사해도 로그인은 작동하지 않는다.

## 최소 대체 구조 — 설계만, 구현 없음
검증된 IdP의 server-side OIDC callback + 서명된 HttpOnly/Secure 세션 + 기존 opaque userId 매핑을 사용한다. mapping은 기존 Sites에서 확인된 동일 사용자라는 trusted evidence가 있어야 한다. 이메일만 같다는 이유로 기존 favorites에 접근을 허용하지 않는다. 내부 admin은 별도의 검증된 owner identity/audience로 보호한다. 외부 요청의 oai-authenticated-user-*를 제거하고 verified session에서만 사용자 정보를 생성한다.

기존 사용자 매핑/공식 ID 연결 수단이 현재 확인되지 않았으므로 Production 인증 전환 gate는 BLOCKED다. 불가능하다고 확정한 것은 아니며 추가 확인이 필요하다. 기존 user table/즐겨찾기 데이터 재작성, 새 ID 일괄 치환, 인증 구현은 수행하지 않았다.

## Candidate boundary — 배포 준비를 완성하기 전 필수
현재 worker/index.ts를 그대로 실제 DB에 연결하면 안 된다. cron을 비워도 HTTP 내부 collector/repair 경로가 남고, 일부 GET handler의 lazy initialization/cache 경로가 쓰기를 수행할 수 있다. app/api/market-score/route.ts → storedMarketResponse → readScore 경로는 SELECT만 실행하고 init을 호출하지 않는 것을 확인했다. 다만 같은 store의 readInput/claim/writeScore는 init이나 쓰기를 호출하므로 전체 store를 read-only라고 분류하지 않는다. public-feed-store의 public read는 자체 initialize를 호출하지 않는 별도 경로다.

필수 제한:
1. 별도 candidate entrypoint에서 GET/HEAD의 명시적인 public route allowlist만 허용한다. /api/internal/**, favorites mutation, auth callback은 fail-closed한다. 나머지 method는 405/403으로 거절한다.
2. candidate는 cron/collector secret을 받지 않고 scheduled entrypoint를 노출하지 않는다.
3. Production D1 native binding은 SQL read-only 권한이라고 가정하지 않는다. D1 binding은 쓰기도 가능하다. readonly IAM credential을 만들더라도 Worker SQL의 SELECT-only가 자동 보장되는 것은 아니다.
4. 같은 DB가 입증되면 strict SELECT query registry를 가진 read boundary를 설계·검증한다. cloudflare:workers의 env.DB를 직접 import하는 모든 경로까지 검토하며 fetch(request, proxyEnv)만으로 native import를 보호했다고 주장하지 않는다.
5. local mutation tripwire fixture는 run/batch/exec 및 CREATE/INSERT/UPDATE/DELETE/REPLACE/ALTER/DROP을 거절한다. 허용된 GET에서도 write attempt가 있으면 배포 gate를 실패시킨다. 검사 통과를 위해 SQL을 임의 변경하거나 exceptions를 늘리지 않는다.
6. preview host만 구체적으로 허용하며 zgmini.kr route/DNS는 유지한다. 이를 위해 middleware canonical redirect 예외가 필요하지만 실제 host가 확인되기 전 임의 broad bypass는 구현하지 않는다.

source baseline은 확정됐지만 D1 identity가 NOT_PROVEN이므로 위 boundary와 실제 DB 연결 구현은 보류한다. 현재 candidate는 로컬 build/dry-run 수준이며 public read-only runtime이 완성됐다는 뜻이 아니다.

## D1 identity와 계정 이동
현재 계정 6e9b57e718b247330a6efa42a9516e95의 D1 목록은 0개다. Sites DB의 database ID/name/account는 connector env 목록으로 확인할 수 없었다. 정확한 판정은 NOT_PROVEN이다. 실제 export/import는 하지 않는다.

동일 DB 접근이 확인되면 스키마/행 이동 없이 재사용한다. 다른 DB로 입증될 때만 official export/import + final incremental sync + 단일 writer 인계 계획을 확정한다. 현재 데이터 이전 필요 여부는 미확정이다. DB snapshot을 GitHub source로 대체하거나 임의 새 DB를 생성하지 않는다.
