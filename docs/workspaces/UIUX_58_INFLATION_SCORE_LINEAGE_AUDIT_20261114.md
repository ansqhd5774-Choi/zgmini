# ZGMINI UIUX 58차 — 두 물가 점수 출처 분리 실측 감사

- 기준일: 2026-11-14 KST · 담당 `codex/ui-improvements-2`; 전체 진행률 **25% → 25%**
- [중앙 지시 #68/58차](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6864999213)
- 최신 기능 main `643b7c7c4372ffad552443fc312c6cb1b944e2fc`; 착수 UI 브랜치 `9218f032d84aace69d6a90a23376e9f609ec17a6`, main 대비 ahead318/behind468. 직전 55차 커밋 `3e1541ca8c6999719947d3829518872d334de4c8` 이후 이번 착수 HEAD까지 **문서 1개만** 변경, 물가 점수 배선 코드 변경 없음. 강제 merge/rebase 0.

## 이번 실제 새 작업: 최신 main 점수 데이터 계보 감사

GitHub 원문 `fetch_file`로 8개 UI/정본 source를 읽고 V8 내 독립 정적 assertions 및 서로 다른 모의 score 객체 테스트 **16/16 PASS**. 기존 13/13 일반 검증, 로컬 mock/CI 57 PNG, 실패한 public GET은 반복하지 않음.

| UI 위치 | API/score 정확한 경로 | 감사 결론 |
|---|---|---|
| 12대 경제지표 물가 `/economic-indicators/inflation/` | `page.tsx`→`economic-detail-panel.tsx`; `/api/market-score` 응답 `domains.find(id==="inflation")`의 `status==="READY"` 유효 `score` | R2 점수 참조 없음 |
| 별도 Inflation R2 `/inflation/` | `page.tsx`→`inflation-panel.tsx`; `/api/inflation-detail` 응답의 `payload.score` | 12대 score 참조 없음 |
| 대시보드 8대 위험의 인플레이션 | `app/dashboard-ui.tsx` `inflationStability`→`inflationRisk` `/api/inflation-detail`, 링크 `/inflation/` | R2 연결 정상 |
| 12대 경제지표 허브 | `components/economic-terrain.tsx`→`/api/market-score` 도메인 | 12대 연결 정상 |
| 신규 연구 7개 | `app/economic-indicators/inflation-candidate-7-inputs.tsx` `score===null` | 기존 점수 대체 없음 |

독립 모의 객체 테스트: 시장물가 `41.6`, R2 `57.51884273397442`는 각각 **41.6 / 57.5**로 별도 렌더 경로를 사용. 이 둘은 **테스트용 수치**이고 현재 Production 원문이 아니다.

**근거 source blob:** 경제 상세 panel `ad83fdf5e223d4f0bb204b4c7fd1a41acd21d45a`; R2 panel `fd2fb09d70d6a8a2e0e18cd413e0c1b525f081fe`; 대시보드 `f8cee5d7775be52df3035deb5740db1c6f153c24`; 12대 허브 `ed2d98cc563f3992a8fbd359ddc1351f6d2a1ce5`; 12대 page `36c9e85bb8871ed592ab16df20812f9e5675937c`; R2 page `22f098e7fb55da024c88bbb8c2bf8c5a8f2ed78b`; 후보 7 page `5e621cb7638b5cfa7201ef41b0170a24eeee3b54`; 경제 catalog `6e465a5aedf98eabe2e3c173c1ae686c85e87d7e`.

### LAST PASS / FIRST FAIL

- **LAST PASS:** 이번 새로운 main source 경로 검사 16/16 PASS. 오로지 GitHub 정적 코드·서로 다른 mock score 객체의 선택 결과이며 Node CI/Production API/DOM PASS가 아니다.
- **FIRST FAIL:** 기존 51차 실제 Production 라이브 화면 접근시 HTTP 이전 `Extension manifest must request permission to access the respective host` 및 SOCKS/DNS/credits 차단. 금차 같은 실패 재요청 **0**.
- **실제 결함:** 두 점수 원천의 **숫자 혼용 결함 발견 0건**. R2 CSS/class의 공통 사용은 숫자 API 원천 혼용의 증거가 아니며 실제 DOM 색상 검증 없이 이번 범위에서 수정하지 않음.
- **미완료:** 4개 화면 PC1440/모바일390 **8/8 UNVERIFIED**, 동시 API 5개 값·sourceStoredAt/게시일/관측일/overflow/차트 축·끝점 **UNVERIFIED**. 신규 UI 코드 수정/PR/CI/배포/PC·DB/D1·Runner 변경 **0건**. 전체 화면 완료율 **25% 유지**.

**다음 필수 실행 하나:** 기존 **승인된 무료** 브라우저 Host/네트워크 접근 정상화가 실제 확인되면 Production 4개 공식 URL의 PC1440/모바일390 실제 PNG **8개**와 동시 API JSON **5개**를 회수·직접 대조. 확정 UI 결함에만 최소 파일 변경/회귀/선택적 PR. 이전 실패 호출/유료 충전/RDC/승인 없는 배포 금지.
