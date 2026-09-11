# ZGmini 메인 UI 리메이크 검증 보고

## 1–7. 변경 범위와 구조
1. 수정 파일: app/page.tsx, app/globals.css, app/country-fear-greed.tsx. 신규: app/dashboard-ui.tsx. 이 보고서는 docs/ui-redesign-report.md.
2. 기존 구조: 경제 요약 5개 동등 카드 → 국가 → FSC → 원형 섹터/테마 요약 → 전체 경제지표 목록 → 섹터/테마 전체 카드.
3. 변경 구조: 헤더 내비게이션 → 기간/상태 → 국가 → 종합 Master → 물가/고용/금리/유가 → 시나리오 → 섹터/테마 Top 5 → 기존 FSC → footer.
4. 메인에서 제거한 표현: 종합과 하위 지표의 동등 배열, 원형 요약의 반복, 전체 경제지표 표. 원천 데이터와 API는 삭제하지 않았다.
5. 이동: 경제지표 표·필터·상세 차트는 데이터센터 보기, 기존 섹터/테마 필터·정렬·전체 카드는 섹터·테마 보기. 새 API route 없이 같은 페이지 상태 전환을 사용한다.
6. 신규 컴포넌트: CompositeMarketSection, ScoreScale, DashboardTip, Sparkline, ScenarioSection, StrengthPanel.
7. 재사용: CountryFearGreed의 provider fetch, KoreaFunds 전체, PeriodSelector, 기존 경제지표 상세/필터, 기존 섹터/테마 상세, 계정 설정·즐겨찾기, Recharts/Lucide.

## 8–15. 디자인 시스템
8. HEX: page #363636, header #07162D, surface #ECEEF0/#F8FAFC/#FFFFFF, border #D7DCE2, text #172033/#556274, brand #FABC42, positive #0B9F41, warning #E06A00, danger #EF3B3B, neutral #64748B, info #3478D4. 요청된 전체 토큰을 globals.css에 정의.
9. Typography: 종합 48px/모바일40px, 국가38px/모바일36px, 구성30px, scenario34px, section22px/모바일20px, 본문14px, 설명13px, metadata12px. 기존 폰트 스택 유지. 숫자는 tabular-nums.
10. Spacing: 4/8/12/16/20/24px 중심, section24px, card gap12px, padding12–20px. 최대폭1480px, 대형1520px.
11. Radius: 기본3px, scenario4px, country8px, rail999px.
12. Shadow: 기본 카드 없음, 클릭 가능한 국가 hover에 0 3px 10px rgba(0,0,0,.1), tooltip 0 4px 12px rgba(0,0,0,.2).
13. Motion: 120/160/220/280ms 토큰. underline140ms, rail200ms, tooltip130ms. 자동 carousel/countup 없음. reduced-motion 지원.
14. Hover: 국가 watermark .05→.08, 실제 링크만 강조, 구성비중과 하위카드 linked highlight, strength row 배경/rail 강조.
15. Tooltip: 250ms 지연, keyboard focus/tap, ESC, outside pointer 닫기, viewport 안 위치 제한, role=tooltip/aria-describedby. 툴팁 내용을 따라 이동할 수 있다.

## 16–23. 화면 결과
16. 국가: 미국·한국·일본·영국 provider 그대로. 중국은 숫자 없는 미연결 카드. 영국을 유럽으로 잘못 이름 바꾸지 않음. 기간 비교 이력을 현재 국가 API가 공급하지 않으므로 비교 수치를 만들지 않음.
17. 종합: 별도 Master KPI, 기존 score/note/history 사용, 현재 route의 30/30/25/15 비중을 UI에 표시. 계산 자체는 변경하지 않음.
18. 구성: 4개 카드, 상태 텍스트·색·수평 rail·산출 설명·데이터센터 drill-down. 임의 세부 점수 막대 제거.
19. Scenario: 실제 모델 미연결, 기본은 준비 중. 검증된 props를 전달할 수 있는 수동 carousel UI 구현. 테스트용 시나리오만 로컬 QA에서 사용.
20. Strength: 예시 표기 유지, 기존 점수 기반 Top 5. 기간 변화 tooltip·전체보기·로그인 사용자 즐겨찾기 보존.
21. PC: 1920×1080,1600×900,1440×900,1366×768 Chrome 확인. body overflow 없음, 카드 높이 동일. 1440 이상 국가5열.
22. Tablet: 1024×768 확인. 국가3+2, 구성4열. 1023 이하에서는 국가/구성2열, master세로, strength1열 규칙.
23. Mobile: 430×932,390×844 확인. 국가 scroll-snap, 구성/strength1열, nav/period 독립 overflow. 주요 tooltip 40px 터치 목표. 본문 가로 overflow 없음.

## 24–30. 검증과 한계
24. API/계산/캐시/backend/권리 gate/Secret 변경 없음. 기존 fetch 주기·endpoint 보존. 3개월 선택 UI 추가. 원천 API 직접 호출 없음. 로컬 QA는 외부 요청을 차단하고 실패/fixture 응답 사용.
25. Lint: 수정 TSX 파일 오류0, 경고14. 기존 img/미사용 보존 컴포넌트/hook dependency/표현식 경고. 전체 repo lint가 깨끗하다고 주장하지 않음.
26. Typecheck: PASS (tsc --noEmit --incremental false).
27. 기존 tests315/315 PASS. 최종 tooltip 위치 변경 후 Workers HTML test 재실행 PASS. 브라우저7해상도, 기간 변경 추가 fetch 없음, 데이터센터 전환, tooltip focus/tap/ESC. Scenario0/1/4/6개 × 1440/1024/390 =12조합 PASS, 수동 next/previous. QA 데이터는 production에 포함하지 않음.
28. Build PASS. git diff --check PASS. 실제 Chrome screenshot 검토. 전체 테스트 후 마지막 변경은 tooltip 렌더 시 ref 접근을 이벤트에서 계산하도록 바꾼 것; 최종 타입/빌드/HTML/브라우저 재검증.
29. 미완료/제한: 실제 금융 API 및 운영 UI 미검증. 시나리오 실제 모델 없음. 중국/유럽 전체 모델 없음. 국가 기간 history API 없음. 기존 예시 경제/섹터 데이터는 예시로 표시. 가중치 표시는 기존 route에 근거하나 향후 backend 비중 변경 시 UI 동기화 필요. browser QA는 로컬 Chrome이며 실사용 데이터 성능 검증이 아님.
30. 배포하지 않음. commit/push하지 않음. 기존 production Version73 유지. 변경 사항은 work/fsc-mvp에 있음; site-v50의 오래된 미커밋 변경은 덮어쓰지 않음.

## 증거
- .wrangler/redesign-build.log / redesign-type.log / redesign-lint.log / redesign-tests.log / redesign-html.log
- .wrangler/redesign-qa.json 및 redesign-{width}.png
- .wrangler/scenario-qa.json (테스트 시나리오는 ignored .wrangler 파일)
