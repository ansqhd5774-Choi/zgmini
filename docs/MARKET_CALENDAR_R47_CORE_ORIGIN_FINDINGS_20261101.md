# R47 — R46 PC 설치 중단 원인 분리 점검

## 실 PC 입력 근거

사용자 제공 `MARKET_CALENDAR_R46_PC_APPLY_RESULT.txt`:

```json
{"audit":"MARKET_CALENDAR_R46_PC_R45_INSTALL","at":"2026-11-01T08:57:02.465Z","mode":"APPLY","phase":"PREFLIGHT","decision":"R46_CORE_ORIGIN_CHANGED_STOP","changedFiles":[],"backupCreated":false,"providerCallsAdded":0,"forcedCollection":false,"published":false,"dbWrites":0,"schedulerChanged":false,"gitPushed":false,"newSource":null,"worktreeId":null,"errorCode":"R46_CORE_ORIGIN_CHANGED_STOP"}
```

작업 브랜치 `codex/zgmini-gpt-workspace-20261025`, R46 설치 코드 기준 `40be0df4f46ac4e4cd46010f33220c620027cce7`.

## 판정

- `worktreeId:null`이므로 R46의 예약 작업→wrapper→origin→Core 프로젝트 경로 추적기가 경로를 산출하지 못했다. **worktree ID가 달랐다고 확인된 것은 아니다.**
- 실패 단계가 `PREFLIGHT`라 실제 소스 변경·백업·Core 잠금 획득 전이다. 추가 API·DB·스케줄러·GitHub push·게시 변경 0.
- 예약 작업의 실행 인자 구조, wrapper 이름/내용, 내부 origin 파일 구조 중 **어느 단계가 달라졌는지는 이 결과만으로 결정할 수 없다.** 무조건 기대 ID를 완화하거나 다른 PC 경로를 추정해 적용하지 않는다.
- 재실행으로 해결되는 일반적인 충돌이 아니므로 같은 R46 CMD 반복 실행은 불필요하다.

## 후속 범위 — 읽기 전용 R47

- `scripts/pc-writer/market-calendar-r47-core-origin-diagnose.mjs`: `schtasks.exe /Query /TN ZGMINI-PC-Local-Core /XML` 한 번 읽고, 그 XML에 정확히 인용된 wrapper/origin 파일만 최대 64KB씩 읽는다.
- 전체 실제 경로·예약 작업 XML 원문·설정/비밀·종목/거래 값은 기록하지 않는다. 확인 단계별 개수/참거짓 및 짧은 worktree ID만 기록한다.
- Windows CMD 단일 실행 파일과 Node helper를 동봉한 `MARKET_CALENDAR_R47_CORE_ORIGIN_DIAGNOSE_20261101.zip`으로 전달한다.
- 합성 구조 4개(기존 R38 wrapper, 변경된 marker, Node 직접 실행, task 조회 오류) 테스트 통과.
- 결과는 CMD와 같은 폴더 `MARKET_CALENDAR_R47_CORE_ORIGIN_DIAGNOSE_RESULT.txt`. 이 결과를 바탕으로 R46의 **실제 승인된 PC 실행 origin 계약만** 최소 수정한다.

현 상태: `R46_PC_INSTALL_STOPPED_UNCHANGED`, `R47_READ_ONLY_DIAGNOSTIC_READY`. R45의 R43 전체 종목 등급·공개 상태는 변경하지 않는다.
