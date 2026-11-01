# CNN 실제 재확인 시각 아카이브 R9 (2026-10-31)

## 배경과 승인 범위
R8 PC 실증: 미국 공포·탐욕지수는 원본 CNN `observedAt=2026-10-30T23:59:48Z`가 유지되어 1개 관측만 기록됐지만 PC의 저장 시각은 2026-10-31T11:50:04Z까지 갱신됐다. 종합 시장 점수는 15분 간격으로 5개 계산 기록 누적, D1/API 일치 확인. **원본 CNN 관측과 PC가 실제로 다시 확인한 시각을 구분**하여 같은 점수라도 새 성공 확인이 있으면 보관한다.

## 별도 공개 결과 계약
- 기존 `fear-greed-observed` / `CNN_OBSERVED_ARCHIVE_R1`와 `observations[].observedAt`은 원본 관측의 실제 시각으로 **변경·덮어쓰기 금지**.
- 새 별도 `public_feed_snapshots_v1`의 `kind=output, feed_key=fear-greed-verified-checks, snapshot_key=<UTC checkedAt 날짜>`; 새 테이블/원자료 업로드 없음.
- 저장 body: `{version:'CNN_VERIFIED_CHECKS_R1',date,checks:[{checkedAt,sourceObservedAt,score,sourceStoredAt}]}`. **checkedAt = 실제 성공한 PC CNN current snapshot의 `stored_at`**, sourceObservedAt=원본 CNN 제공 시각, sourceStoredAt=PC 저장 Unix 밀리초. 체크값을 CNN 새 발표로 표기 금지.
- verified 점수 0~100, 최근 확인된 current, 실제 새 `stored_at` 및 지난 체크보다 **15분 이상 경과**한 경우에만 append. 동일 current 재조회나 원본 점수 변경 없는 중간 시간에 가짜 샘플을 채우지 않는다. 공급자 호출·조회 주기 증가 금지.
- 새 별도 공개 점수만 D1 단조 저장 및 정확한 body/시간 **readback**. 원본 `current`·관측 이력·종합 점수·Korea·지표 산식·TTL 유지. D1 current가 뒤처져 있으면 공개 게시 대기.
- API `/api/fear-greed/observations?period=1D|1W|1M|3M|6M|1Y`: 기존 `points`는 **원본 관측만**; 신규 `checkedPoints`, `verifiedCheckCount`, `checkTimeMeaning:'PC_VERIFIED_STORED_AT'`를 추가한다. 새 키가 없으면 `checkedPoints:[]`로 기존 API 결과 유지.
- 기존 미국 CNN 차트 기간바 `1D` 버튼은 유지. 실제 성공 확인 기록이 2건 이상일 때 PC 확인 시각의 같은 점수 두 점을 표시한다. 기존 CNN 일별 이력은 보존하고 원본 CNN 날짜로 확인 시각을 위조하지 않는다.

## PC 적용과 Gate
1. 기존 R7 PC 승인 SHA `43e0ffa392a9e655bcb4ca7b151c26ad43567e14`, source clean, Core `PT5M` 활성, R7 wrapper, 기존 `VERIFIED` writer/ledger를 재확인.
2. R7 `archive-run.mjs` exact SHA와 `archive-core.mjs` exact SHA 확인. R7 파일 백업 후 독립 `verified-checks-r9.mjs`를 staging하고 기존 archive-run에 선택적인 R9 후속 단계를 연결. Core 작업 등록/주기/원본 승인 source/config 변경 금지.
3. 실제 성공한 PC current의 15분 간격 신규 `stored_at`가 없으면 `UNCHANGED`; 초기 검증/설치는 후속 실제 자연 주기 재확인을 대체하지 못함.
4. SQLite 새 별도 체크 내역 재조회 → D1 본문·시각 재조회 → API `checkedPoints`와 기존 `points` 비교 → PC/모바일 차트 표시 확인.
5. `STOP`, `UNKNOWN`, `SUBMITTING`이면 잠금/DB/예약 작업/원본 파일을 임의 삭제·종료·재실행하지 않음. 설치 패키지는 1회 실행; 결과 보고서를 보고 후속 조치를 결정.

관련 근거: [R7 최초 게시](https://github.com/ansqhd5774-Choi/zgmini/pull/916), [Core 5분 충돌 Runbook](PC_CORE_5MIN_CONFLICT_RUNBOOK.md), [종합 시장 점수 기록 PR #918](https://github.com/ansqhd5774-Choi/zgmini/pull/918).

**검증 범위:** GitHub PR 테스트·빌드와 PC 실제 R9 설치 및 자연 재확인은 별개이다. R9 PC 실제 결과를 받기 전 설치/누적 PASS로 기재하지 않는다.
