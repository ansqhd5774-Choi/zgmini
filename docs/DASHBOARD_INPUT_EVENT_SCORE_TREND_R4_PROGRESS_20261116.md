# ZGMINI R4 75단계 — 실제 수행 원장 (2026-11-16 KST)

- 기준 계획: [75단계 R4](DASHBOARD_INPUT_EVENT_SCORE_TREND_EXECUTION_R4_20261116.md).
- 기록 브랜치: `codex/ui-improvements` (이력/계획 전용). 기능 수정은 `codex/ui-improvements-r4-score-last-point-20261116`에서 최신 `main`을 분기하여 최소 파일만 PR #1177로 병합.
- 기준 Git: 2026-11-16 착수시 `main 455ec124af17e98a6754a9ccadb2df7b8617a7c8`; PR #1177 병합 `main 71ea0b66f67e1b099415ebd814be4b67730af08b`. W06 공용 브랜치는 main 대비 288개 파일/다수 커밋 차이가 있어 전체 브랜치 병합 금지.
- **진도: 근거 있는 R4 고정 과제 2/75 (2.7%).** #04 수집→저장→계산→D1 게시 호출 흐름 source trace, #05 15분 아카이브/1D~1Y API/차트 병합 현재 구조 대조 PASS. 나머지 과제는 소스 부분 조사, 부분 구현, 런타임 미확정 중이며 PR 하나를 R4 전체 완료로 환산하지 않음.
- #01 부분 증거: W06/main/pc-control main SHA 구분. 운영 A 읽기 전용 #1737 (run 43873770008, seat 6)은 `STATE_UNKNOWN / CORE_TASK_RUNNING_INSTANCE_UNOBSERVABLE`, source runtime 확인 실패, providerCalls/d1Writes/operationalWrites=0, JSON/TXT 2/2 readback. 이는 실제 PC 실패를 뜻하지 않으며 새 일반챗 요청으로 같은 issue/requestId 재시도 금지. 다른 작업자 #1726의 `WRITER_FIXED_PREIMAGE_READONLY`는 고정 checkout SHA만 증명, Core 실행 SHA와 혼동 금지. #01 미완료지만 UI 독립 개발은 차단하지 않음.
- #03 부분 증거: `CM-R1` 실제 도메인 12개·가중치 총 100 확인. 사용자의 10개 지표는 개별 산식 예시이며 실제 모든 기능이 10개라는 뜻이 아님. 27개 각각의 지표 수/승인 Gate 전수는 계속 필요.
- #04 PASS: `scripts/pc-writer/collect-local.mjs` -> `local-cycle.mjs` -> `run-local.mjs` -> `market.mjs` -> `publish.mjs`. 기존 승인 수집·로컬 저장·12도메인 계산·결과 저장·D1 게시 읽기 확인 경로 존재; 실제 PC 성공 여부와 구분.
- #05 PASS: `lib/composite-observed-history-r1.mjs`의 15분/일 100점 정책, `composite-observed-archive-r1.mjs` 저장·게시, `app/api/market-score/observations/route.ts`의 1D~1Y stored GET, `composite-observed-display-r1.mjs` UI 병합 확인. 실제 CM-R1 함수 fixture는 12:00 50 → 12:05 50.7 → 12:10 52.7 → 12:17 52.7에서 아카이브 점수가 [50,52.7]만 남음을 확인. 미보존 중간점은 허위로 복원할 수 없음.
- #09~#13 부분: `progressivePublication`는 early Writer를 실행하고 auxiliary checkpoint가 변경될 때만 final Writer를 재실행함. `collectLocal`의 `runMarketOperationalRefresh`는 일부 그룹에서 완전 입력 검증 후 저장; 거부 시 기존 검증된 입력·결과 보존. 개별 1개 새 입력이 기존 나머지 9개와 합쳐지는 조건은 산식/수집기별로 추가 점검 필요. 기존 준비도 Gate를 무단 해제하지 않음.
- #14~#16 부분 fixture: 실제 `buildCompositeMarketScore`에 12 도메인 각 50을 넣으면 50점, 고용 도메인 하나 60이면 50.7, 유동성 하나 70을 이어 바꾸면 52.7. 기존 가중치·12/12 READY로 계산되는 함수는 존재함. 그러나 **개별 산식 요인 1개 → 실제 PC 저장 → 재계산** 전체 성공을 증명한 것이 아니므로 14~16은 미완료.
- **실제 코드 개선 (#35/D05 부분 구현):** PR [#1177](https://github.com/ansqhd5774-Choi/zgmini/pull/1177) `main` 병합 SHA `71ea0b66f67e1b099415ebd814be4b67730af08b`. 바뀐 파일 3개: `lib/market-score/composite-observed-display-r1.mjs`, `app/dashboard-ui.tsx`, `tests/composite-current-chart-r4.test.mjs`. 공개 최신 계산 점수가 15분 아카이브보다 새롭고 값이 달라진 경우에만 1D/1W/1M/3M 차트 마지막 실제 게시점 표시. 동일 값/역행/결측 오표시 방지, 6M/1Y 확정 일간곡선 보존. 기존 15분 저장 계약/산식/DB/TTL/예약/Writer 변경 0.
- **코드검증:** 9개 신규 함수 fixture PASS; PR #1177의 GitHub `check` 및 mocked-browser `ui` 모두 PASS. 초기 TypeScript `TS2345` 실패는 JSDoc 인자 타입으로 수정 후 다시 PASS. 해당 merge Cloudflare Git Integration Workers Builds `zgmini-migration-candidate-r5` SUCCESS (build `4977a9c1-386a-4d49-859e-da5e3fde0009`). 정확한 운영 Production Deployment ID/SHA 및 사용자 화면 검수는 미확정. 빌드=Production 완료로 오인하지 않음.
- #21~#29: 15분 안의 **과거 중간 점수 영구 보존**은 여전히 미완료. 현재 수정은 *가장 최근의 검증된 게시점 표시*일 뿐, 사라진 12:05 중간 이력을 채우지 못함. 별도 저장·공개 계약 변경이 필요하면 원담당 검토와 사용자 승인 후 기존 Writer 저장기 재사용. 신규 DB를 기본 전제하지 않음.
- #34~#35는 D05 종합점수 한정 코드 수정만 반영돼 부분 완료 상태. 다른 위험·경제 점수 27개 전부에 동일한 날짜/점수 변경 처리 완료를 주장하지 않음.

## 다음 실행 우선순위
1. B군 #07~#13: 승인 원자료의 1개 신규 관측/9개 마지막 유효 입력 선택이 실제 Reader/Writer에서 가능한지 기존 저장 fixture로 기능별 구분. 특히 `macroCollectionReadiness`의 전체 입력 SUCCESS Gate와 기존 저장된 이전 정상치 재사용의 호환을 확인; 실자료 부족/부분 실패를 이유로 기존 안전 Gate를 임의 해제하지 않음.
2. D군 #21~#29: 15분 기록 제한 안에 연속 계산점이 있을 때의 손실을 원담당과 최소 저장 계약으로 해결. 기존 아카이브·계산기·게시기 재사용, raw input 공개 금지.
3. 27개 D01~D27은 현행 승인 조건별 `정상 갱신/기간대기/표시 불일치/미연결`을 구분해 실제 결함만 고침. 정상인 기능을 반복 검증하지 않음.
4. 기술 작업·승인된 PC 적용·공개 게시를 끝낸 뒤 사용자에게 홈페이지 직접 최종 확인 요청. 웹디버그 복구 및 정규 예약 자연 검증을 단계에 추가하지 않음.
