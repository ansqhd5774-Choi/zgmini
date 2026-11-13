# ZGMINI UIUX — 62차 종합점수 이력 날짜·마지막 점 결함 수정

**기준:** 2026-11-14 KST · UIUX 담당 `codex/ui-improvements-2` · 전체 화면 검증 **25% → 25%**  
**62차 공식 원문:** [제어 #68 / 댓글 6865704255](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6865704255)  
**기능 main:** `643b7c7c4372ffad552443fc312c6cb1b944e2fc`. 기존 60차 [Draft PR #1066](https://github.com/ansqhd5774-Choi/zgmini/pull/1066)의 날짜 미니차트 수정 및 [Node CI 43513217850](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43513217850) 성공은 재사용했고 이번에 재실행하지 않았다.

## 1. 실제 신규 FIRST FAIL — 종합점수 차트의 별도 날짜 경로

`app/economic-indicators/economic-detail-panel.tsx`의 `dated()`는 단순 `YYYY-MM-DD` 정규식과 `!Number.isNaN(Date.parse(...))`만 검사했다. Node.js 실제 입력에서 `2026-02-31`은 `2026-03-03`으로, `2026-11-31`은 `2026-12-01`로 자동 정규화되어 **무효 날짜를 유효한 것으로 받았다**.

이 `dated()` 함수는 `normalizeTrend()`와 `indicatorTrend()`가 호출한다. `normalizeTrend()`가 `domain.trend` 저장 이력을 정렬하여 점수 차트 X축·최신점 `chart.at(-1)`·기간 비교의 원천을 정하므로, 불가능한 날짜가 마지막 관측점에 나타날 수 있었다. 이는 이전 60차 **공용 미니차트** 수정과는 다른 경로이며, 실제 Production 공개 원본에 불가능 날짜가 존재한다는 증거는 아니다.

## 2. 실제 최소 수정과 보호된 계약

원본 UI 전용 브랜치 `codex/ui-improvements`에:
- `lib/economic-score-trend-date.mjs` **신규**. `YYYY-MM-DD` 및 실제 Gregorian UTC 동일 날짜 정합성을 검사하는 `isRealEconomicScoreDay()` export. 무효 월/일·윤년·시간 문자열·날짜 정규화 허위값 거부.
- `app/economic-indicators/economic-detail-panel.tsx` **2곳만 수정**: 위 순수 함수 import, 기존 `dated()` 본문을 해당 함수 호출로 교체. 원자료 `YYYY-MM`은 `indicatorTrend()`의 **별도 기존 월별 경로**로 그대로 유지.
- `tests/economic-score-trend-calendar-day-r62.test.mjs` **신규 7건**: 윤년/월말, 불가능 날짜·형식, 마지막 유효점 보존, 실제 panel wiring, 월별 원자료 보존, 저장된 READY 점수/값 계약 유지.

현재 원본 UI 브랜치의 다른 사용자·작업자 변경, 60차 mini-chart 소스, 계산/가중치/API/DB/D1/운영 PC/Cloudflare 배포 등은 변경하지 않음.

## 3. 최신 main 선택적 PR 및 검증 증거

브랜치 전체 병합 대신 정확한 main SHA로 [선택적 Draft PR #1068](https://github.com/ansqhd5774-Choi/zgmini/pull/1068) 별도 생성:
- 전용 PR 브랜치 `codex/uiux-r62-economic-trend-real-dates-20261114`
- **PR HEAD:** `b46e82bfaa2ed64dfee7892d918d6a2cfb17d32c`
- 변경 **3개 파일**, main 대비 ahead 3/behind 0. 전체 UIUX branch merge/reset/rebase 없음.
- GitHub 저장 파일의 readback 성공. 원본 UI 브랜치에 동일 helper/test blob 동치, panel은 분기상 다른 기존 줄이 있으므로 두 줄만 선택 적용.
- [Node CI Run 43514709527](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43514709527), Job `132193589102`: **completed/success**. Build PASS, Type check PASS, Regression **4,185 tests/4,176 PASS/0 FAIL/6 SKIP/3 TODO**. 신규 7개 모두 PASS. PC publication recovery tests 11/11 PASS, Cloudflare candidate read contracts 69/69 PASS.
- PR은 **OPEN/Draft**, main 미병합/Production 미배포. CI는 실제 배포/원자료 게시 성공 증거가 아니다.

## 4. LAST PASS / FIRST FAIL / 남은 장애

**LAST PASS:** 이번 62차 Node CI #43514709527의 4,176회 회귀 PASS(신규 7/7 포함)와 Build/Type check PASS. 기존 60차 별도 #1066 PASS는 재사용.

**FIRST FAIL — 소스 단계에서 해결:** 원래 `dated()`가 JavaScript Date.parse의 자동 정규화를 허용하여 유효하지 않은 점수 관측일과 마지막 점을 수용한 문제.

**여전히 미완료:** 정규 Production 4개 화면 × PC 1440px·모바일 390px 실증 **0/8 신규 PASS / 8/8 UNVERIFIED**. 동시 공개 API 원문 5개, 실제 모바일 가로 overflow·기준 관측일·게시일·`sourceStoredAt`·차트 마지막 점 일치 미검증. 과거 무료 브라우저 호스트/SOCKS/DNS/credit 장애는 62차에 재시도하지 않았다. `AUTOMATION_BLOCKED(PRODUCTION_BROWSER_OR_PUBLIC_READ_ACCESS)`는 UI 라이브 실증만 제한한다.

**전체 기능 검증률:** 실제 Production 완료 전이므로 **25% → 25% 유지**.

**다음 필수 작업 하나:** [선택적 Draft PR #1068](https://github.com/ansqhd5774-Choi/zgmini/pull/1068)의 3개 변경을 승인된 코드 통합 소유자가 리뷰하고 main 통합 GO/NO-GO를 확정. 기존 Draft #1066과 독립적인 수정이며 무단 main 병합/배포/Runner 실행/RDC 금지. 승인된 배포 후 무료 라이브 브라우저 정상화 증거를 얻은 경우에만 Production 화면/API 동시 검증으로 이어감.
