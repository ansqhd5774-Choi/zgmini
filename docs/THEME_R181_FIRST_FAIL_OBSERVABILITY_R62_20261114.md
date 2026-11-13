# ZGMINI R181 — 62차 최초 실패 단계·HTTP 관측 경로 판정

## 65차 운영 원본 인계 수신 판정 — 2026-11-14 KST

- **65차 공식 지시:** [제어 #68/6866393700](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6866393700). 64차의 정확한 운영 원본 요청은 [#68/6866167504](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6866167504)에 **이미 한 번 접수**, 기능 원장 [#1009/6866168214](https://github.com/ansqhd5774-Choi/zgmini/issues/1009#issuecomment-6866168214)과 연결됨.
- **이번 새 판단(이력 성공 검증 재수행 아님):** 제어 #68의 64차 요청 이후 65차 지시까지의 실제 댓글, 기능 #1009의 64차 요청 이후 댓글 및 현재 전용 브랜치 ref를 확인. 원본 소스/원장 write-site/현행 SHA/승인 범위에 대한 **중앙 운영 Owner의 신규 원담당 인계 기록 0건**. 중앙 65차 역시 이 단계가 미해결이라고 판정. GitHub 댓글 검색 범위 내 미수신이라는 뜻이며, 운영 PC 실제 source가 소실됐다는 뜻은 아님.
- 기능 HEAD `15bca7f777dea209b75505909e6cfd727fb43872`(본 증거 업데이트 전), 제어 `main@69e25a08a903dc8e52ef1093ec15837de4c20858`, 기능 `main@643b7c7c4372ffad552443fc312c6cb1b944e2fc`. 기존 정확한 운영 수집기 SHA256은 **2026-11-12 당시 관측값** `be0303b112d6f4471137aa134bf98f696a8a8dfe60d1d13502646c5e0b509d62`; 현 시점 설치 동일성/원본 source/원장 수정 범위 **UNKNOWN**.
- **행동 제한:** 기존 R181 STOP 9건 재검토 0, 신규 PC/RUNNER/Provider/D1/SQL/배포 0, 신규 Collector 소스 구현·테스트·CI 0. 공통 Reader에서 임의 HTTP 상태 추정 금지. 이전 R158 Node 5/5와 기존 구조 판단은 완료 증거 그대로 재사용.
- **LAST PASS:** 64차 요청 원장과 65차 중앙 수신 판정 교차 확인. **FIRST FAIL:** 원본 source와 catch/HTTP response/원장 write-site/수정 권한에 대한 실제 Owner receipt 없음 → 현재 R181 오류 계측 최소 코드 수정 **AUTOMATION_BLOCKED(OWNER_SOURCE_HANDOFF_NOT_RECEIVED)**. 기능 T1 **20% → 20%**, 최신 실운영/공개 종단 검증을 새로 수행하지 않아 마지막 공개 0/10, D1 7키 0/7 VERIFIED.
- **다음 한 실행:** 새 요청을 만들지 않고 기존 **64차 #68/6866167504** Owner 인계에서 승인된 읽기 전용 원본·설치 SHA/원장 write-site·변경 권한이 **실제 수신**되면 그 일치하는 수집기 원본에만 `firstFailStage` 및 `httpStatus|NO_STATUS` 최소 수정·회귀시험을 수행. 중앙 Owner의 확인 전에는 문서·테스트 코드로 운영 성공을 주장하지 않음.


- 기준: 2026-11-14 KST; 전담 `codex/theme-fear-greed-integration-20261025`.
- 지시: [공통 62차 #68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6865704255).
- 대상 기능 진행률: **T1 20% → 20%**, 마지막 공개 정상화 **0/10**.
- 이 문서는 **기존 증거를 통해 특정된 관측 설계 결손에 대한 경로 판정**이다. 소스/실PC/런타임 복구 완료 증거가 아니다.

## 1. 실제 확인한 코드·기록 경계

1. 기능 전용 브랜치 `7d4075e9ecc6e12a29ec68b1a7da0e2526206258`의 Git tree(2,278 entries)에서 실제 운영 수집기 이름 `r181-primary-cycle.mjs` 및 대응 R181 원장 작성 모듈 **0개**. 소스 파일 경로는 설치된 PC `theme-market-history-r131/marketparquet-r167/r181-primary-cycle.mjs`에만 존재하며 전용 브랜치로 자동 복제되지 않는다.
2. 기존 승인된 **비식별 소스 구조 진단**은 설치된 R181 원본 SHA-256 `be0303b112d6f4471137aa134bf98f696a8a8dfe60d1d13502646c5e0b509d62` (7,089 bytes)를 검증했고, source **line 88** catch에서 `status.reason`에 오류 문자열을 저장하는 형태임을 확인했다. 정확한 원문 소스·오류 문자열·URL·토큰은 원격으로 가져오지 않았다. 이 구조 증거는 첫 실패 실행 지점 자체를 입증하지 않는다.
3. 제어 `main@69e25a08a903dc8e52ef1093ec15837de4c20858`의 `controller/theme-l7-runtime-readonly.mjs` (Git blob `a841aef7547345090a0af209cd426590ede9b035`) `safeR181HttpCode()`는 기존 `reason`에서 **정확한 `R181_SPY_HTTP_<3자리>` 형식**만 숫자로 분리한다. 임의 HTTP 숫자나 freeform 내용을 반환하면 보안 및 인과 정확도가 깨져 완화 금지. `ledgerState()`는 `resultCode/diagnostic/safeHttpFailure`만 안전 출력한다.
4. 이전 승인 readback의 `reason` 관련 출력은 `diagnostic.values=[]`, `reasonProfiles.fixedSignals=[HTTP,R181,SPY]`, `safeHttpFailure=null`. 이는 정확한 `httpStatus` 또는 내부 `firstFailStage` **미관측**이다. 숫자를 429·403·500 등으로 보간하거나 R181 STOP이 실제 어떤 throw에서 발생했는지 단정할 수 없다. [9개 기존 readback의 이미 완료된 범위](THEME_R181_EXISTING_RUN_EVIDENCE_R59_20261114.md)는 재실행하지 않았다.

## 2. 결과 — 수정 가능성과 실제 차단 지점

**결함 범위:** 기존 PC 수집기의 기록 지점은 legacy freeform reason에 의존하며, 승인된 원격 출력은 단계 enum과 HTTP 숫자를 전달하지 못한다. 안전한 미래 관측을 위해 **해당 수집기**가 실제 stage·원 HTTP response.status를 구조화하여 기존 로컬 원장에 기록하도록 하는 것이 필요하다.

**기능 브랜치 직접 수정 불가:** 실제 `r181-primary-cycle.mjs`가 GitHub 기능 소스에 없으므로, 여기서 원본 없이 가정으로 생성한 동명이인 수집기·새 CMD·새 Controller operation·읽기 parser 완화는 승인된 운영 source의 최소 수정이 아니다. Controller 조회기는 공용 설치·승인 소유 범위이며 이를 기능 전용 브랜치에서 임의 변경하면 운영 효과를 입증하지 못한다. 따라서 **62차 기능 코드 변경 0 / 관련 새 테스트 0** (기존 수집기 소스를 변경하지 않았으므로 PASS로 표시하지 않음).

**미래 정규 적용 시 최소 수정점(설계이며 미승인·미구현):**

- 정확한 PC 기존 source를 단일 설치 소유자가 승인된 비공개 경로에서 검증하고, 수집기 내 **요청/가격검증/로컬저장 등 실제 코드상 단계 진입점**에서만 고정된 비밀 없는 stage enum을 기록. 어느 단계가 최초 실패했는지 실제 throw 당시 상태에서 결정하며 자유 문자열을 enum으로 추측 매핑하지 않음.
- HTTP 응답 객체가 실제 존재할 때만 numeric `response.status`의 정수·범위를 검사해 `httpStatus`를 기록. 네트워크 예외·파싱/파일/검산 실패 등 응답이 없으면 명시적 `NO_STATUS`로 유지. `error.message`에서 임의 숫자 추출 금지.
- 기존 `R181_PRIMARY_LAST_RUN.json` 로컬 원장 원본·실제 저장 갱신 흐름·기존 status/last-good/lock/checkpoint 보존. 최소한 `firstFailStage`/고정 `failureCode`/정수 `httpStatus` 또는 `NO_STATUS`만 추가할 수 있는지 실제 설치 source에서 영향 확인. token, URL, 요청 headers, 원가격, full exception stack은 신규 결과/원격 stdout에 포함하지 않음.
- 해당 구조 필드를 기존 승인된 Controller의 고정 allowlist/원격 JSON·TXT가 읽을 수 있는지 **중앙 단일 Owner**가 source SHA·manifest·출력 범위 대조. 이 작업은 PC의 별도 승인 B 경로를 우회하거나 기존 Writer 25파일 manifest에 편승하지 않음.
- 회귀는 정확한 원본 소스 확보 후 **(a) HTTP 실패 with status (b) no-response timeout -> NO_STATUS (c) pre-HTTP 파싱·파일 실패 (d) 비밀 문자열 비노출 (e) 기존 성공/STOP/원장 보존**을 각각 대상으로 실행. 테스트 통과와 실제 설치/수집 완료는 별개.

## 3. 완료/미완료/다음 한 행동

- **LAST PASS:** 전용 Git tree에 운영 수집기 없음 확인; 설치 SHA와 비식별 catch line/고정 파서 계약 대조; 원인 불확정 상태를 정직하게 보존.
- **FIRST FAIL:** 현 승인된 기능 브랜치에는 R181 원본 collector 수정 지점이 없어 안전한 구조 필드 **실운영 추가·테스트 불가**. 현재 운영 PC 새 source/ledger 정확성 및 실제 HTTP/최초 단계도 미조회로 UNKNOWN.
- **권한 구분:** D1 7키 기존 readback `AUTOMATION_BLOCKED`는 [시장 ER1 #835](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/835) 별도 공용 Writer 단계이며 R181 수집기 관측 설계 결함과 혼동하지 않는다.
- **다음 필수 행동 하나:** 설치된 R181 원본의 **정확 source 소유·승인/해시·원장 쓰기 지점**을 해당 PC 단일 Owner가 비공개 승인 경로로 확인하여, 기존 Collector에 `firstFailStage`와 `httpStatus|NO_STATUS`를 로컬 기록하는 **최소 수정 가능 범위**를 원담당에게 인계한다. 이후에만 실제 원본 기준 최소 수정·회귀·정규 승인 적용. 새로운 pc-job, 원격 shell, SQL, B scope 변경, Runner 재발행 없음.

기존 R158 관련 Node 5/5 PASS는 58차 재사용 증거이며 62차 신규 시험으로 합산하지 않는다. 운영 PC·D1·Provider·배포·예약 변경 0건.
