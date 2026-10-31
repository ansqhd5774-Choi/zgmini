# ZGMINI R58.1 R3 비공개 평가 — 실패 결과 기록 수정

- 저장소 `ansqhd5774-Choi/zgmini`, 작업 브랜치 `codex/ui-improvements`.
- 목적: 사용자가 R58 실행 후 `MARKET_CALENDAR_R58_FHS_R3_RESULT.txt`를 받지 못한 문제 해결.
- 원인 확인: 기존 CMD는 `exit /b`로 종료하며 PAUSE와 기록 파일이 없고, Node runner의 catch는 콘솔에만 STATUS를 표시했다. **실제 사용자 PC에서 어떤 예외가 발생했는지는 불명**.
- 변경 파일: `scripts/pc-writer/MARKET_CALENDAR_R58_FHS_R3.cmd`, `scripts/pc-writer/fhs-r3-private-pilot.mjs`, `scripts/pc-writer/fhs-r3-launch-failure.test.mjs`, 신규 문서.
- 변경: 파일/Node 미존재 시 read-only 오류 보고, Node 예외에서 wx + fail-only TXT, 기존 보고서/비공개 출력 불변, 종료 시 PAUSE.
- 성공 상태 `R58_LOCAL_PROVISIONAL_SCORING_COMPLETE`만 점수 집계 완료 의미. `*_STOP`은 미완료.
- Node 모의 테스트 21/21. Windows CMD 실측 미실시. PC SEC bulk 실데이터의 R58 실행 미확인.
- DB/D1/network/provider/스케줄/배포/공개 중요도 별표 변경 없음.
- 기존 패키지나 파일을 정리/삭제하지 말 것. 기존 실행 중이거나 비공개 JSON이 있으면 재실행 대신 상태 확인.
