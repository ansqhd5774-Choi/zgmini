# 한국 2요소 베타 검증

- 작업 기준: `6bae262f846f4d96382b97dbe01e1c16fcce7bd6` (사용자가 지정한 V71).
- 별도 worktree `work/kr-2f-beta` 사용. `work/site-v50`의 미커밋 로고·네이버 파일과 현재 V75 checkout은 변경하지 않음.
- 계산: 0.5 × G + 0.5 × (100 − P). G의 기존 내부 60/40 혼합, P의 기존 압력 방향, 원자료 계산과 준비기간은 변경하지 않음.
- 공통 관측일로 결합. 알려진 빈 날짜는 null, 충돌 중복은 무효. 현재·이력에 동일 함수 사용. 표시 1자리 반올림 후 서버 단계 판정.
- 한국 기존 카드와 `/fear-greed/korea/` 상세를 신규 composite로 전환. 같은 문서에서 구성 카드와 모듈 store의 단일 요청 공유. 이전 한국 공급원 fallback 없음.
- 한국 즐겨찾기 전용 소비 경로는 발견되지 않음. 기존 거시경제 한국 지표는 변경하지 않음.
- 미국/일본/영국 API 소스, 공통 page/layout/CSS, FSC 원천 계산 파일은 기준 commit과 내용 동일(줄바꿈 제외). 현재 운영의 후속 UI/중국 숨김 등은 이 V71 기반 commit에 포함되지 않음. 따라서 최신 main에 이 checkout을 배포하면 안 됨.
- 공개 응답 상한은 기존 64 KiB에서 128 KiB로 한정 확대: 최대 366일 종합 이력의 표시점수·단계를 추가하기 위한 것. 원천 이력·인증정보는 추가하지 않음. 원천 요청·pagination 제한 유지.
- 전체 tests 351/351 PASS (기존 315 + 신규 36), Type/Syntax PASS, vinext Build 및 route compile PASS, workerd HTML PASS, diff check PASS.
- Sites build wrapper는 Windows npm 실행 오류로 실패하여 기존 설치 vinext CLI를 직접 사용해 성공. 검사 재실행 전 산출물 부재로 실패한 2개 테스트는 build 후 모두 통과.
- credential 패턴 검사 0건, 기존 응답 whitelist/비밀 미노출 테스트 PASS. 보안 플러그인 전면 감사는 수행하지 않음.
- 로컬 Chromium 360/390/768/1440: overflow 없음, 한국 71.2/탐욕/+21.5 일치, 최초 document 내 공개 API 1회, 이전 KOSPI 요청 없음, 상세 기간 토글 추가 fetch 없음, focus/Enter·hover·tap 확인, pageerror 없음. 외부 요청은 차단하고 fixture만 사용.
- 저장된 `korea-funds-v71.json` SHA256: `83b3c323192fdd417a938a283f49b170d03e437a3480bf9fcdb92da9d75c4b92`.
- 파일 원본 변경 없이 공통 245개 점수 전체 검산. 마지막 20260909: 71.15537848605578, display 71.2, 탐욕, 이전 관측 대비 21.474103585657375. 실데이터 신규 runtime 검증이 아닌 기존 공개 입력의 오프라인 검산.
- 실제 Sites remote main 확인: `bda9767622c9d262b7644cce67b299591a34fb30`. 지정 예상값과 달라 push 중단. force/reset/rebase/stash 없음.
- 사용 도구: 로컬 Git/Node/Python(소스·검사), Miniflare와 Chromium Playwright(외부 차단 fixture QA), Sites get_site/short-lived repository credential(프로젝트와 authoritative remote 확인). 금융·리서치·DB·분석 플러그인 미사용.
- Sites version/deploy, 운영 HTTP, 금융 API 직접 실행: 없음. RUNTIME_VERIFIED = NO.
