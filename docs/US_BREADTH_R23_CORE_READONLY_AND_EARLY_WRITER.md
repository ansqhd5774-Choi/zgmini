# 미국 등락 지수 R23 — 기존 Core 기반 IEX 조기 게시 및 읽기 전용 운영 검증

기준: 2026-11-01. 작업 브랜치: `codex/us-breadth-public-r1-20261031`.

## 적용 계약

- GitHub `main`의 `AGENTS.md` §20-1 및 `docs/PC_CORE_5MIN_CONFLICT_RUNBOOK.md`가 Core 충돌 대응 권위이다. **PC 승인 source는 현재 `config.json`·실제 Task Action/launcher·실행 기록에서 별도로 확인한다.**
- Alpaca IEX 잠정치는 기존 약 503종목 중 관측된 가격만 사용한다. 미관측은 미관측이며, R2 확정치의 보합 간주·98% 기준·방향 일치율 검증을 적용하지 않는다.
- MarketParquet 신규 확정 R2는 별도 전체시장 약 6,500종목, 가격 미확보 보합 간주를 독립적으로 다룬다. 기존 확정 R1·250거래일 키/행은 어떤 경로에서도 수정하지 않는다.

## R23 코드 변경

1. 기존 `local-cycle.mjs`의 Core 수집 직후, 수집 성공 또는 15분 슬롯 중 이미 수집된 결과가 있으면 `run-local.mjs --publish --us-provisional-only`를 호출한다. `--korea` 및 비게시 실행에서는 호출하지 않는다.
2. 조기 Writer는 기존 `run-local.mjs --publish`의 승인 `config.source`·Git 비교·clean 검사 이후에만 실행한다. 정상적인 전체 Writer의 SQLite 계산·market lease·공통 ledger를 건드리지 않고 **잠정치 전용 D1 key만** 검사·게시·재조회한다. 비밀값이나 개별 가격을 상태 출력에 넣지 않는다.
3. 조기 게시 성공/실패는 `local-us-breadth-provisional-early-last-run.json` 및 `local-cycle-last-run.json`의 `usProvisionalEarlyPublication`에 보조 상태로 남는다. 실패는 기존 Core/확정치 게시를 차단하지 않는다. 정규 Writer의 재게시 시도는 기존 slot 동등성 검증으로 중복 쓰기를 피한다.
4. 새로운 전체시장 확정 R2 reader는 `current`와 같은 거래일 `daily`의 **본문·저장시각 일치**를 추가 요구한다. 부분 D1 게시·원장 충돌은 503으로 보존한다. R2 final write는 여전히 기본 OFF이며, 기존 R1을 R2로 자동 교체하지 않는다.

## PC 사전 점검 (현재 코드만으로 운영 완료 판정 불가)

PC의 현재 승인 source와 Task 등록 실행기를 **읽기 전용으로 먼저 확인**한다. 아래 경로는 R3의 역사적 경로이지 현재 경로의 증명이 아니다.

```cmd
schtasks /Query /TN "ZGMINI-PC-Local-Core" /FO CSV /V
schtasks /Query /TN "ZGMINI-PC-Local-Core" /XML
git -C "E:\ZGmini\projects\zgmini-earnings-history-pc-release" rev-parse HEAD
git -C "E:\ZGmini\projects\zgmini-earnings-history-pc-release" status --porcelain
```

등록 Task Action이 VBS/wrapper일 수 있으므로 XML에 기재된 실제 launcher와 이어지는 dispatcher를 확인한다. R7의 기존 보조 wrapper는 제거/재등록하지 않는다. `local-cycle.lock`·`quota-runner.lock`을 삭제하거나 PID를 종료하지 않는다. `install-local.mjs`로 현재 Task를 덮어쓰지 않는다.

현재 설치된 승인 소스에 R23을 **선별 적용하고 검증할 수 있는 환경에서만** 다음 진단을 실행한다. 코드가 PC에 설치되지 않았다면 실행했다는 의미가 아니다.

```cmd
node scripts\pc-writer\us-breadth-core-readonly-r23.mjs --inspect
node scripts\pc-writer\us-breadth-core-readonly-r23.mjs --inspect --d1-readback
```

- `--inspect`: Task XML(`PT5M`, `IgnoreNew`), source SHA·dirty 건수, Core 소요시간 근사치, 수집/조기 게시 상태, 관측/미관측 수만 표시한다. 원자료 심볼·가격·키·전체 설정·Task XML은 출력하지 않는다.
- `--d1-readback`: 위 읽기 전용 점검에 **잠정 전용 D1 key SELECT**를 추가한다. D1 쓰기는 발생하지 않으며, 저장 결과/슬롯/시각만 요약한다. `D1_READBACK_UNAVAILABLE`은 게시 실패의 확정 증거가 아니다.
- `actionChainVerified=false`는 도구가 Task XML만으로 VBS→dispatcher→Core 연결을 추론하지 않는다는 뜻이다. 실제 launcher 체인을 별도 대조해야 한다.

## 반드시 남은 실제 운영 Gate

1. PC source·등록 Task·실제 launcher 체인·잠금 진행 상황 읽기 전용 증거 확보.
2. 실제 뉴욕 장중 **자연 실행 3개 연속 15분 슬롯 이상**에서 `LOCAL_READY` → 조기 게시 `VERIFIED`/`ALREADY_VERIFIED` → D1 동일 slot readback → 공개 API의 `slotEndUtc` 전진 확인. 단일 마지막 실행 JSON은 연속성 증거가 아니다.
3. 기존 Core 소요시간이 15분 이상이면 `IgnoreNew`로 누락 슬롯이 생길 수 있다. 조기 Writer만으로 15분 SLA를 보증하지 않고, 현행 실행기/dispatcher의 승인된 변경 필요성을 실제 PC 증거로 재평가한다. 새 예약 작업을 만들지 않는다.
4. MarketParquet 신규 확정 R2는 251거래일 원자료와 독립 공급자 원장 확보가 먼저다. R2 staging/final D1 쓰기, default API 전환, PR 병합/Cloudflare 배포는 해당 Gate 뒤에만 진행한다.

**현재 입증 범위:** R23은 코드와 모의 테스트 및 Linux 읽기 전용 명령 검사까지. PC 실제 실행·D1 결과 게시·3개 슬롯 연속성·Cloudflare 배포는 아직 확인하지 않았다.
