# 자산 버블 R10 신규 원자료 자동 갱신 — 단계별 검증

## 목표와 범위

승인된 R10 6개 구성요소의 신규 관측을 PC 저장 원장에 수집·검증하고,
기존 R10 산식으로 완료 분기만 계산한 뒤 기존 Writer·D1·공개 API에
연결한다. 원자료·권리·PIT 근거 없이 기존 점수 날짜를 전진시키지 않는다.

## 현재 코드 변경 (운영 적용 전 후보)

- 기존 `collect-sp500-shadow.mjs`를 별도의 24시간/실패 2시간 제한
  `asset-r10-sp500-refresh.mjs`로 정규 Core의 보조 수집 단계에 연결한다.
  동일 값은 저장 시각을 변경하지 않으며, 공급원 관측일이 역행하면
  원래 저장 데이터를 보존한다.
- `progressive-publication.mjs`가 새 S&P 500 가격 저장 체크포인트를
  인식해, Core의 선행 게시 뒤 변경 입력의 최종 계산을 생략하지 않는다.
- B의 새 PIT·증분 가격 입력은 `asset-r10-breadth-incremental.mjs`로
  **읽기 전용 후보 검증**만 한다. 이 모듈은 기존 R10 PIT/가격/점수,
  SQLite, D1을 변경하지 않고 어떤 경우에도 자동 승인하지 않는다.
- R10 Release의 B 월말 성숙 조건은 품질 원장의 해당 월 마지막 거래일
  관측, 최소 252쌍·98% 커버리지, 완료된 3개월을 확인한다.
- R10 Release 재계산 실패 시 이전 저장 Release를 보존하지만
  `READY` 신규 게시·체크포인트 갱신·R10 원자료/이력 재게시를 건너뛴다.

## 미완료: 운영 전환 Gate

1. R7의 공식 PIT(`local-breadth-r7-pit-universe.json`)와 승인된
   R10 PIT의 과거 중복 날짜 구성종목이 정확히 일치하는지 **실제 PC
   저장 파일**로 대조한다. 불일치 시 무단 승격하지 않는다.
2. 신규 S&P 500 편입 종목의 승인 Alpaca IEX/split 가격을 200거래일
   범위에서 제한적으로 수집·검증하고 원본 SHA/충돌 감사 기록을 남긴다.
3. 새 증분 가격을 승인 R10 B 품질 원장·월말 계산에 연결하고
   `alpaca-collected-audit`를 새 자료 범위로 갱신한다. 그 전까지
   `canPromote:false`와 기존 Release 보존을 유지한다.
4. PC 원본으로 기존 2025-Q4, 2026-Q1, 2026-Q2 B·6요소 점수,
   최신 확정 점수 `22.57324252737245`, 5개 분기 이력 및
   2025-Q2/Q3 `null`을 **변경 전·후 정확히 일치** 검산한다.
5. 필요한 파일만 최신 `main` 기준 PR로 검증한 뒤 실제 PC 승인 SHA와
   Task Action→launcher→Core 실행 경로를 확인한다. 예약 주기·잠금·
   DB 구조·산식·원본 출처·권리 계약은 변경하지 않는다.
6. 기존 자연 Core 주기에서 실제 수집→SQLite→계산→D1 readback→
   공개 API/UI를 관측한다. 미발표 분기와 정상 `UNCHANGED`를 실패로
   오판하지 않는다. 실제 새 완료 분기를 확인하기 전엔 AUTO_PASS 금지.

참고: [R10 승인 계약](ASSET_R10_RELEASE_CONTRACT.md),
[B 계산 계약](ASSET_R10_B_OPERATIONAL_CONTRACT.md),
[Core 5분 안전 Runbook](PC_CORE_5MIN_CONFLICT_RUNBOOK.md).
