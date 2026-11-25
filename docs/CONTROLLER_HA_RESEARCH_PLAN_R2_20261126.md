# ZGMINI Controller HA 정밀 벤치마킹 및 실행계획 R2

- 기준일: 2026-11-26 KST
- 총괄 책임: 프로세스 총괄
- 계획·진행 원장 저장소/브랜치: `ansqhd5774-Choi/zgmini` / `codex/controller-ops-lessons-20261105`
- 구현 코드 정본: `ansqhd5774-Choi/zgmini-pc-control` / 신규 개발 전용 브랜치(기존 담당 소스 변경·병합 이력 보존)
- 상태: 벤치마킹·현재 소스 분석·기술 계획 작성 완료, 소스 구현/실PC 전환/운영 적용 미실시
- 운영 변경: 없음. 신규 서버·서비스·요금제·Runner·Cron·인증·DB·D1 변경 승인 아님.
- 대체 문서: 같은 대화의 추상적인 R1 초안을 대체하며 이전의 유효한 운영 완료 증거를 초기화하지 않음.

## 0. 요구사항과 결론

요구: 단일 Controller 장애가 발생했을 때 원인 분석·복구·대기열 적체 때문에 승인된 업무가 중단되는 시간을 줄일 것. 목표 후보는 Active 1 + Standby 2지만, **인스턴스 3개라는 숫자는 완료 조건이 아니다.** 장애 영역 독립성, 실행 권한 fencing, 영속 원장 인계, 운영 PC의 실제 로컬 작업을 수행할 수 있는지 입증해야 한다.

**우선 권고:** 기존 Watchdog/Guardian/독립 유지보수기의 고장 복구 지점부터 계측하고 그 결함을 고친다. 병목이 실제 존재하면 기존 구조를 보존하면서 한 대의 Standby부터 격리 구현한다. 2번째 Standby는 보완 효과와 독립 장애 도메인이 확인된 뒤 적용 여부를 판단한다.

**필수 안전성:** 단일 유효 쓰기 주체, stale leader 차단, 원장 유실/허위 PASS 없음, 비멱등 외부 호출 자동 재실행 금지. 불확실하면 fail-closed하되 무관한 A급 읽기/독립 기능까지 전역 차단하지 않는다.

## 1. 벤치마킹 — 공식 설계 및 오픈소스 참고 코드

| 벤치마크 | 실제 메커니즘·핵심 코드 | ZGMINI 채택 원칙 | 그대로 복사 불가 이유 |
|---|---|---|---|
| Kubernetes kube-controller-manager | 여러 후보가 Coordination Lease에 경쟁. 리소스 버전 CAS. https://kubernetes.io/docs/concepts/cluster-administration/coordinated-leader-election/ | 주 실행 1개, 후보 Standby·renew·lost leader 처리 | Kubernetes API/리더 선출 인프라가 현재 PC에 없음 |
| Kubernetes client-go leader election | https://github.com/kubernetes/client-go/blob/master/tools/leaderelection/leaderelection.go 와 예제 https://github.com/kubernetes/client-go/blob/master/examples/leader-election/main.go | acquire→renew→stop leading 콜백 및 불확실 상태 중단, CAS 경합 회귀시험 | 공식 패키지 자체도 fencing을 보장하지 않음: https://pkg.go.dev/k8s.io/client-go/tools/leaderelection |
| etcd Raft | 3-member quorum=2, 1 장애 허용. https://etcd.io/docs/v3.5/faq/ ; election 소스 https://github.com/etcd-io/etcd/blob/main/client/v3/concurrency/election.go | 진짜 3노드 합의가 필요한 경우 quorum·epoch·majority 유지 | 물리 PC 2대에 논리 프로세스 3개는 독립 3노드가 아님. 신규 인프라는 별도 승인 |
| HashiCorp Consul | Sessions + KV lock, TTL/lock-delay, 공식 https://developer.hashicorp.com/consul/docs/automate/session / https://developer.hashicorp.com/consul/docs/automate/application-leader-election | 세션 만료/통신 장애 시 안전한 승격 금지와 재획득 설계 참조 | 일방적인 lock holder 주장만으로 외부 DB·Provider에 대한 fencing 불충분 |
| Azure Leader Election | Azure Blob lease 기반 leader election 패턴: https://learn.microsoft.com/en-us/azure/architecture/patterns/leader-election | 장애 조치 vs 단순 공유 자원 조정 구분, 원래 버전 존속·lease 분리 | Azure Blob, 네트워크, 계정·요금·보안 권한의 신규 사용이 필요할 수 있음 |
| GitHub Actions concurrency | https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency | 같은 Issue/Workflow 중복 실행·경합 억제용 기존 설정 보존 | workflow concurrency는 운영 Windows 프로세스 사이의 fencing/분산 합의가 아님 |

**핵심 차이:** leader election ≠ fencing ≠ 영속 작업 인계. 별개 계약으로 구현한다. 고가용성은 모든 장애 무중단 보장이 아니며 공통 GitHub API 장애, 데이터 보관 PC 전원 상실, 외부 Provider 실패는 별도 대응이다.

## 2. ZGMINI 실제 운영·소스 대조

**2026-11-26 06:22:53 KST 실PC 인벤토리 #3737 / Run 45703624999:**
- 운영 호스트 `PC`, `zgmini-pc-03` 실행; 등록 운영 Runner 6/6 Online, 1개 busy. 해당 관측의 runtimeState=HEALTHY, operationalWrites=0.
- 관측된 실제 Controller 실행 SHA `53fe24e22446d21a9fd4ee308d12b7cba7f37e25`; 이는 조사 당시 설치본이지 이 문서가 고정하는 배포 목표가 아님.
- 최상위 `maintenance.status=STATE_UNKNOWN` 은 별개의 복구 증거 미확인 포함; 해당 상태를 운영 Controller 전체 장애·HA 구축 선행 전역 BLOCKER로 해석하지 않음.
- 원본: https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3737 , https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45703624999
- #2353 HTTP403 해결은 GitHub CLI 인증 범위 수정과 Runner 목록 GET 성공이며 HA 실증 아님: https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2353

**기존 구현(읽은 최신 main 기준):**

| 파일 | 관찰 사실 | 새 설계 시 영향 |
|---|---|---|
| `controller/supervisor.mjs` | `leases/supervisor` 단일 mkdir lease, 프로세스 owner, 여섯 Runner 실행, DRAIN 확인, 각 Seat 제한적 재시작 | 동일 호스트 상 실행 소유권 보존; 임의 Supervisor 복제·동시 spawn 금지 |
| `controller/common.mjs` | `exclusive` 는 로컬 파일시스템 `mkdir` 원자성. owner PID/nonce/boot 기록 | 호스트 간 합의/epoch이 아님. 새 Cross-host HA가 필요하면 별도 검증된 권위 저장소 필요 |
| `tools/runner-watchdog.mjs` | 45초 미만 heartbeat + owner PID 확인. owner 생존·불명확 시 `BLOCKED_LIVE_OR_UNKNOWN`. 입증된 사망만 archive 후 복구 | Watchdog을 지우거나 무조건 강제종료해서 Failover를 만들지 말 것 |
| `docs/RUNNER_RECOVERY.md` | 시간당 최대 3회 재시작; PAUSE/DRAIN/install lease/작업 lease/Workflow 영향 시 복구 유보 | HA 새 경로와 상호 배타적이어야 함 |
| `controller/engine.mjs` | `ledger/<requestId>.json` 결과 재사용, request/seat/heavy 리소스 lease. Worker 종료 미확인 시 `STATE_UNKNOWN` 및 lease 보존 | 원장 reconciliation이 반드시 선행. 로컬 원장만 복제하여 외부 호출 재실행 금지 |
| `controller/entry.mjs` / `controller/common.mjs` | 고정 7키 요청 schema 및 승인된 source·operation 검증 | 기존 Issue 계약을 확장·완화하지 말 것 |
| `.github/workflows/pc-job.yml` | self-hosted 운영 6좌석 고정, Github Issue 기반 단일 이벤트, 현재 concurrency group | 이미 있는 concurrency를 사용. 추가 Controller 경합 안전의 대체가 아님 |
| `tools/maintenance-agent.mjs` / `docs/CONTROLLER_AUTO_UPDATE.md` | 독립 Receiver, 승인 manifest/설치 SHA/backup/CAS/lease·사후검사 | 새 HA 경로는 정규 B 유지보수기를 우회하거나 자신을 스스로 교체할 수 없음 |
| `docs/PC_OPERATING_SYSTEMS_CANONICAL.md` | 운영 PC는 로컬 E:·DB/Writer 기능, 별도 격리 PC `DESKTOP-N62L0NG`는 GitHub metadata/CI 중심 | 격리 PC는 현재 운영 데이터/승인 Writer/Controller takeover 권한과 E: 운영 원본이 없음 |

출처:
- https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/controller/supervisor.mjs
- https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/controller/common.mjs
- https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/controller/engine.mjs
- https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/tools/runner-watchdog.mjs
- https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/docs/PC_OPERATING_SYSTEMS_CANONICAL.md

## 3. 장애 분류와 해결 범위

| 사건 | 현행 대응 | Standby의 실제 효용 | 전환 금지/제약 |
|---|---|---|---|
| Supervisor PID 종료 확정, 동일 PC 정상 | Watchdog stale owner archive→정규 재시작 | 동일 호스트 Standby 승격은 빠를 수 있으나 추가 복잡성 대비 기존 복구 개선이 우선 | Watchdog과 이중 복구 경합 금지 |
| Supervisor PID 살아 있으나 heartbeat 정지 | 현재 BLOCKED(강제종료 금지) | 적법한 fencing과 실행 소유권 확인이 있을 때만 승격 | heartbeat만으로 구 리더 강제 제외 불가 |
| Watchdog·Guardian 종료 | Guardian/Watchdog 자체 복구 | 독립 감시 이점, 단 동일 PC 전체 정지엔 무력 | 기존 Startup 또는 C급 Windows 서비스 변경 승인 없이 무단 설치 금지 |
| 업무 Worker timeout, 종료 불명 | STATE_UNKNOWN 및 리소스 lease 보존 | 원장 재조회·수리 대기 가시성 개선 | 자동 replay 금지 |
| 운영 PC 전원/Windows/E: 장애 | 운영 로컬 수집·DB·Runner 작업 중단 | 격리 PC의 GitHub 진단/인계는 계속 가능 | 운영 파일 없이 전체 업무 failover 불가 |
| GitHub API 인증 HTTP403/워크플로 장애 | 인증 범위·GitHub 오류 수정 | Controller 복제 효과 없음 | #2353 이미 해결, 재작업 금지 |
| 유지보수 설치 중/lease 복구 불명 | 정규 유지보수기·복구 계약 | 가용한 기존 실행 보존 | PAUSE/DRAIN/install lease 무시 불가 |
| 외부 Provider·DB·D1 실패 | 해당 공급자/Writer/게시기 처리 | 단순 Controller 승격 효과 없음 | 데이터·원천을 Standby 임의 복제 금지 |

## 4. 후보 아키텍처 비교

| 안 | 구조 | 장애 범위/장점 | 기술적 제한·추가 요구 | 판단 |
|---|---|---|---|---|
| A | 현행 Active 1 + Watchdog/Guardian/유지보수기 결함 개선 | 프로세스 크래시·잠금 복구 병목을 최소 변경으로 개선 | PC 전체 장애는 커버하지 못함 | **P1 우선** |
| B | 동일 운영 PC 내 Active 1 + Warm Standby 1~2 | 별도 Controller 프로세스 재기동 지연 단축 가능 | 로컬 PC/파일시스템/Windows/전원 단일 장애. 기존 Watchdog과 기능 중복·리더 이중 실행 위험 | P1 측정상 효용이 있을 때만 격리 시험 |
| C | 운영 PC Active + 격리 PC Standby(제어-plane 제한) | 별도 PC에서 GitHub 메타데이터 인계/관측 유지 | 격리 PC에 운영 E:/DB/Writer·승인 리모트 실행기 없음. 완전 운영 전환은 불가 | 진단·인계 범위부터 가능 |
| D | 독립된 세 장애 도메인 + 검증된 합의/lease Authority + 1 Active/2 Standby | 한 노드 고장에 강한 리더 전환 구성 가능 | 추가 물리/서비스, 인증·통신, 수집/Writer 경계, 지속비용 또는 승인 변경 필요 | **장기 목표. 신규 자원·보안 승인이 있을 때만** |

**2대의 물리 PC에 3개 Controller 프로세스를 실행하는 것은 3개의 독립적인 노드 장애 도메인이 아니다.** 3인스턴스 프로세스 복구와 3노드 quorum 고가용성을 혼동하지 않는다.

## 5. 기능·보안·불변식 계약

### 5.1 실행 전제

- HA Coordinator가 허용한 하나의 Active만 Runner Supervisor의 새 작업 시작을 제어할 수 있다.
- Leader epoch/term은 재선출마다 **검증된 단조 증가값**으로 생성된다. 분산 환경에서 각 PC가 자체 카운터를 증가시키면 안 된다.
- Authority는 후보 간 CAS/선형화 가능한 승인과 lease 갱신을 제공해야 한다. 불명확·네트워크 분할 시 새 소유권을 발급하지 않는다.
- 변경 효과가 있는 실행 경계는 권위 주체/epoch를 매번 검증한다. 기존 기능 호출이 epoch를 수용하지 못하면 자동 승격 범위에서 제외한다.
- 이전 리더가 실제로 fencing 되었다는 증명 없이는 새 리더를 promote하지 않는다. 리더를 잃었다는 heartbeat 단독 추측은 불충분하다.
- 실제 작업 requestId, 승인 source, 허용목록, seat/resource lease, 로컬 원장을 재검증한다.
- 원장에 미완료/결과 불명 상태가 있으면 해당 requestId를 별도 reconcile하고 외부 Provider/DB/Writer 비멱등 쓰기를 자동 재실행하지 않는다.
- B급 설치·C급 호스트 변경/보안 정책과 기존 승인 manifest는 HA에 의해 승격되지 않는다.
- GitHub Issues/Actions 큐·댓글은 leader Authority의 대체 수단이 아니다.

### 5.2 상태 머신 (제안)

`STANDBY_READY` → `SUSPECT` → `FENCE_PENDING` → `FENCED_VERIFIED` → `CAS_CANDIDATE` → `PROMOTING` → `ACTIVE`

예외/복귀: `HOLD_LIVE_OWNER`, `HOLD_NO_QUORUM`, `HOLD_SOURCE_DRIFT`, `HOLD_MAINTENANCE`, `RECONCILE_REQUIRED`, `RECOVERY_REQUIRED`, `BLOCKED`.

각 전환은 오직 실제 owner/epoch/CAS 성공·부작용 없는 원장 재조회에 근거한다. 상태 문자열만 임의로 성공 변경하지 않는다.

### 5.3 참조 결정 로직 — 격리 시험용 순수 함수

다음 코드는 기존 운영 진입점에 그대로 붙이는 설치 코드가 아니다. P2에서 authority와 프로세스 제어의 실계약을 확정하기 전까지 **의사결정 규칙의 순수 시험 예제**다.

```js
export function decidePromotion({
  ownerAlive, ownerFenced, authorityQuorum, authorityCasReady,
  maintenanceBusy, sourceVerified, requestLedgerVerified
}) {
  if (maintenanceBusy) return 'HOLD_MAINTENANCE';
  if (!sourceVerified) return 'HOLD_SOURCE_DRIFT';
  if (ownerAlive !== false && ownerFenced !== true)
    return 'HOLD_LIVE_OR_UNKNOWN_OWNER';
  if (!authorityQuorum || !authorityCasReady)
    return 'HOLD_NO_QUORUM';
  if (!ownerFenced) return 'HOLD_UNFENCED_OWNER';
  if (!requestLedgerVerified) return 'RECONCILE_REQUIRED';
  return 'ELIGIBLE_TO_ATTEMPT_AUTHORITY_CAS';
}
```

**중요:** `ELIGIBLE_TO_ATTEMPT_AUTHORITY_CAS`는 PASS/ACTIVE가 아니다. 실제 단일 CAS 획득, epoch 발급, 작업 실행 경계의 fencing 확인 뒤에만 승격할 수 있다. 특히 `ownerAlive=false`가 곧 `ownerFenced=true`는 아니다.

### 5.4 필수 권위 저장소·쓰기 경계 요구

`readCurrent() -> {leaderId, epoch, expiresAt, version}`,
`compareAndSet(expectedVersion, nextLeader, nextEpoch) -> {accepted, evidence}`,
`renew(leaderId, epoch) -> {accepted, evidence}`,
`assertFence(epoch, targetResource) -> {accepted, evidence}`.

이 API는 **제안 계약**이며 현행 구현·설치 사실이 아니다. timestamp 만료나 GitHub 댓글만으로 CAS를 대체하지 않는다. 쓰기 수신자가 fencing을 검증할 수 없다면 해당 업무는 자동 failover 대상에서 제외한다. 새로운 공개 D1 원장, 무단 공급자 호출, 승인 없는 범용 원격 shell을 사용하지 않는다.

## 6. 실행 단계 및 구체 작업

| 단계 | 작업 내용 / 변경 후보 위치 | 완료 증거 | 운영 효과 |
|---|---|---|---|
| P0. 기준점 확보 | 기존 #3737·#2353·RUNNER_RECOVERY·실제 설치 SHA/원장 대조. #68 공통 공유 자원과 현재 담당 인수 확인 | 원본 Issue/Run/시각·설치 SHA·마지막 PASS·최초 FAIL | 읽기 전용 |
| P1. 실제 병목 계측·RCA | Controller/Supervisor/Watchdog 사건별 failure time, detect time, recover start, 6-seat reconnect, first job PASS. 코드: `tools/runner-watchdog.mjs`, `controller/supervisor.mjs`, `tools/automation-status.mjs`, 기존 복구 결과 | 사건별 RTO, RTO p50/p95, 자동 복구 실패 조건, HA 효과 가능 부분 | 조회·분석 |
| P2. HA 아키텍처·권위 경계 | A~D 중 최소 해결책 선정, 물리 장애 도메인·authority·epoch/fencing·수행 가능한 작업 종류·의존 승인 확정. 설계 파일은 총괄 브랜치. 코드 원본은 보조 저장소 | authority CAS·인계·복구 state machine·기능별 failover 범위·위험 분석 | 설계만 |
| P3. 최소 결함 수정 | P1에서 원인 입증된 현재 Watchdog/Supervisor/상태·원장 결함만 기존 공통 함수로 수정. 필요한 경우 별도 HA 순수 함수·테스트 추가 | 관련 unit/integration/CI PASS, 기존 기능 회귀 PASS | 격리 구현 |
| P4. Standby 1 시험 | 기존 보호를 복제하지 않고 격리 fixture에서 후보 2개 CAS 경합, fencing, 리더 사망, stale leader 재출현 및 원장 reconciliation 검증 | 2주체 경합 시험, 결과 JSON, duplicate side-effect 0, unsafe promotion 0 | 격리만 |
| P5. Standby 2 타당성 판단 | 독립 호스트 확보 여부, 3노드 quorum, 타 장애 도메인, 자원·요금·보안·성능 영향; Standby 1과 비교 | 장애 허용 수학 및 실제 fault domain, 증분 효과 | 의사결정 |
| P6. 승인·단계적 설치 | 기존 정규 B 승인 manifest·source SHA·CAS/lease·백업·사후검사 경로로만 변경. 필요한 C급 호스트·보안 변경은 별도 사용자 직접 단계 | 정확한 승인/설치/실제 실행 SHA·복구 영수증·6 Runner·원장 readback | **운영 적용은 별도 승인 이후** |
| P7. 실PC 고장전환 검증 | 승인한 오류만 한 번씩 주입. 기존 정상 업무·Writer/SQLite/D1 보호, 작업 유실·중복·복귀 확인 | 실제 RTO, failover 성공/보류 코드, 복귀 영수증, 핵심 기능 정상 | 범위 제한 검증 |

실제 필요 없는 새 Runner, 예약, 전역 Gate, 외부 서비스, 자체 CMD, 전용 Controller 복제는 만들지 않는다.

## 7. 검증 시나리오 매트릭스

| ID | 조건 | 안전 기대 결과 |
|---|---|---|
| T01 | 주 Supervisor PID 종료가 확인됨 | 기존 Watchdog 복구와 standby 승격이 동시에 작동하지 않음; 승인한 한 경로만 수행 |
| T02 | PID 살아 있고 heartbeat 45초 이상 오래됨 | 강제종료 금지, fencing 미입증이면 승격 보류 |
| T03 | Watchdog Node 종료 | 기존 Guardian의 제한된 복귀 검증 |
| T04 | 운영 PC 전원·디스크 중단 | 격리 PC의 GitHub 수집/인계까지만 가능한 범위에서 정상; 로컬 DB 업무 승격 주장 금지 |
| T05 | 후보 둘이 동시에 CAS | 단일 소유권 허용, 나머지 거부 |
| T06 | 네트워크 분할/권위 저장소 불명 | quorum 증명이 안 되면 새 Active 발급 금지 |
| T07 | 기존 리더 복귀 및 stale epoch | 이전 epoch 쓰기 거부, 자동 선점 금지 |
| T08 | 설치 source 또는 host manifest 불일치 | HOLD_SOURCE_DRIFT |
| T09 | 유지보수 PAUSE/DRAIN/install lease | 설치·전환 중복 금지 |
| T10 | Worker 종료 불명·STATE_UNKNOWN | 기존 원장·lease 보존, replay 금지 |
| T11 | 동일 requestId 중복/내용 차이 | 기존 결과 재사용 또는 payload drift 차단 |
| T12 | GitHub 인증 403 또는 workflow 불활성 | 인프라 오류 분리, HA 성공 주장 금지 |
| T13 | 사용자 로그아웃·Windows 부팅 전 | Startup 의존성 명시, 서비스 자동 복원 보장 금지 |
| T14 | 승인된 B 설치 중 실패 | 원본 backup/rollback contract 유지, 복원 검증 |
| T15 | 독립 읽기 작업이 다른 업무의 RECOVERY_REQUIRED와 공존 | 공유 자원 직접 충돌이 없다면 불필요한 전역 차단 없이 수행 |
| T16 | 결과 GitHub 업로드 실패 | 로컬 결과 영수증 readback/reconcile; 동일 요청 재실행 금지 |

테스트는 unit → 동일 환경 격리 통합 → Windows 제한적 fault injection → 사용자가 승인한 운영 검증 순이다. 운영 상태에서 테스트를 위해 실제 Runner·Core 작업을 임의 종료하지 않는다.

## 8. 성능·신뢰성 측정 계약

*현재 실제 RTO 값은 미측정*이다. 45초는 Watchdog 판단의 heartbeat 기준이지 전체 복구 소요시간이 아니다.

관측 필드:
- `incidentId`, `failureDomain`, `lastHealthyAt`, `firstFailAt`, `detectedAt`, `fenceVerifiedAt`, `leaderAcquiredAt`, `runnerSeatsOnlineAt`, `firstJobPassAt`
- `actualControllerSha`, `candidateSha`, `epoch`, `authorityVersion`, `requestId`, `status/code`, `operationalWrites`, `providerCalls`, `d1Writes`
- 인증 원문·전체 환경변수·기밀 원자료·민감 경로·비밀번호 출력 금지

지표:
- Detection latency = detectedAt - firstFailAt (정확한 시작시간을 모르면 미측정)
- Failover time = firstJobPassAt - firstFailAt (영향받은 작업 기준)
- RTO p50/p95 = 유효한 동일 조건 시험 집합에서 산출; 표본 수/범위 병기
- RPO = 승인 요청/원장 유실 수 (일반적인 시간형 RPO와 구분)
- Safety = 동시 ACTIVE로 **승인된 실효 쓰기 0회**, stale epoch 승인 0회, 미확인 worker 자동 재실행 0회
- 작업 인계 = 동일 requestId 원장·status·receipt 보존; 로컬만 존재하는 원장의 외부 접근 가능 여부는 미확인 표시

**시험 성능 목표 후보:** P1 기준값 확보 후 사용자 승인된 시험 환경에서 측정. 예시 실험 가설 "단순 프로세스 종료에 대한 P95 120초 이내"는 채택 목표가 아니라 P1에서 비교·조정할 후보 수치다. 전원·네트워크·비멱등 Provider 장애에 무조건 120초를 약속하지 않는다.

## 9. 변경 파일과 책임 매핑

- 총괄 계획·결정·진행 원장: `zgmini` / `codex/controller-ops-lessons-20261105`
- Controller HA 기능 개발 원본: `zgmini-pc-control` 신규 전용 브랜치. 실변경 필요성에 따라 기존 `controller/common.mjs`, `controller/supervisor.mjs`, `controller/engine.mjs`, `tools/runner-watchdog.mjs`, `tools/automation-status.mjs`, `tests/*`, `docs/RUNNER_RECOVERY.md` 등 중 최소 범위만 사용.
- 새 `controller/ha/*` 는 기존 공통 모듈로 해결할 수 없는 실제 분산 조정기 계약이 확정된 경우에만 추가.
- 기존 `pc-job.yml` 의 owner/label/7-key/schema/runner/업로드 계약 유지. 변경 필요한 경우 실제 영향 증거+별도 계획부터.
- 단일 책임자는 **프로세스 총괄**. 다른 담당자에게 구현·시험을 인계할 때 실제 원본 Issue와 인수 증거가 있어야 하며 가상의 "HA 담당자"를 만들지 않는다.

## 10. 중단 조건·롤백·비용

**STOP:** split-brain 가능성, CAS 결과 불명확, leader fencing 미입증, 운영 source SHA 변동, 설치 원장 불명, 보안 범위/권한 부족, 운영 쓰기 보호 실패, 잘못된 호스트 접근, 신규 유료 비용 미승인.

- 격리 개발 단계: 운영 변경 없음. 안전 경로가 없으면 설계 결함으로 남기고 정상 기존 Controller 유지.
- 운영 단계: 정확한 이전 정상 source·manifest·해시·owner·lease·보호 baseline을 기존 정규 유지보수기로 검증한 뒤 승인된 복원 경로 사용. 임의 `reset/clean`·lease 삭제·Controller/Runner 전체 종료 금지.
- 기존 무료 도구/Runner 우선. etcd/Consul/Azure/K8s 및 별도 서버는 벤치마크이지 도입 승인 아님.
- R1 완료 항목/이슈 #2353/#3737 재오픈·재실행하지 않음.

## 11. 완료 정의 및 현재 진척

- 이 문서 R2 연구·계획 작성: **완료**
- 코드 구현, 격리 HA simulation, 실제 failover, 운영 배포: **미실시**
- 최종 HA 완료는 Controller 수량이 아니라 승인된 환경에서 **실제 전환 성공 + 단일 writer 안전성 + 원장/6 Runner/기능 결과 readback**으로만 판정한다.
- 현시점 1 Controller 정상 상태를 유지한다. P1의 원인 입증 없이는 임의로 P2~P7의 새 인프라를 완료 조건에 추가하지 않는다.

**다음 필수 작업:** 프로세스 총괄이 기존 마지막 유효 장애·복구 이력을 기반으로 P1 장애 종류별 RTO·검증 불가능 구간을 먼저 산출한다. 이후 영향과 비용 비교로 최소 아키텍처를 확정한다.
