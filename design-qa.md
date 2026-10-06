# 모바일 대시보드 디자인 검증

## 현재 적용 기준: 550px 이하

사용자 추가 요청에 따라 전용 모바일 배치의 경계를 600px에서 550px으로 변경했다. 아래 최초 600px 검증은 이전 배포의 기록이다.

- 변경 기준 main: `09a167d01346ca4598c4fd4f429445d17a1a2d4e`.
- 실제 로컬 브라우저 440 / 550px: 새 모바일 배치, 카드 76px, 베타 문구 숨김.
- 551 / 600px: 기존 배치, 베타 문구 표시.
- 네 크기 모두 가로 넘침 0. 관련 기존 테스트 9/9 PASS.
- 이 경계 변경의 Hosted Build / Production 검증은 배포 후 별도 확인한다.

## 최초 600px 구현 기록

- 기준: 사용자가 제공한 모바일 대시보드 이미지의 화면 영역. 기기 프레임, 상태 표시줄, 신규 하단 메뉴는 구현 대상에서 제외했다.
- 작업 기준 main: `1ca922e5bb875640f2ba66a6946f18d221b5232e`.
- 범위: 대시보드의 600 CSS px 이하 배치와 모바일 베타 문구 숨김. 601px 이상 기존 스타일, 데이터 계약과 계산 로직은 변경하지 않았다.

## 구현 및 조정

- 공탐: 게이지 / 비교 수치·관측일 / 차트의 3열 배치, 상단 가로 기간 버튼.
- 종합 점수: 숫자와 0/50/100·날짜 축이 있는 차트, 아래 위험 지표 2열.
- 세부지표: 12개 카드 2열, 지표명 옆 상태 배지, 점수와 미니 차트, 기존 안내 기능 유지.
- 초회 화면에서 발견한 기간 버튼 축소를 수정했다. 360px에서도 각 버튼 폭이 32px 이상이다.
- 축소된 게이지와 점수가 겹치지 않도록 SVG 높이를 조정했다. 세부 미니 차트의 작은 숫자 축은 숨겼다.
- 이미지의 비례를 참고하되 작은 글자와 터치 영역을 그대로 축소하지 않았다. 카드 최소 높이 76px, 제목 13px, 점수 28px, 안내 버튼 40px 영역을 사용했다.

## 실제 브라우저 검증

- Codex in-app browser, CSS viewport / deviceScaleFactor=1.
- 360 / 390 / 440 / 550 / 600 / 601 / 768 / 1280 / 1440px: 문서 가로 넘침 0.
- 600px 이하 세부지표 2열, 카드 높이 76px. 601px 이상 기존 배치로 전환.
- 미국 공탐 기간 전환, 종합 기간 전환: 선택 상태 변경 확인.
- 전체 펼침 / 접기: expanded 상태 변경 확인.
- 물가 산출 근거: 키보드 Enter로 aria-expanded=true 확인.
- 검증 화면 콘솔 error 0.
- 사용자 원본 이미지와 440px 스크린샷을 함께 열어 비교했고 360px / 1440px 화면도 육안 확인했다.
- 스크린샷 및 viewport JSON은 로컬 `mobile-final-{360,440,600,1440}.png`, `mobile-viewport-evidence.json`으로 보관했다.

## 데이터 증거 구분

- 공탐은 공개 사이트의 저장 API 응답으로 표시했다.
- 공개 `/api/market-score`는 점검 시 HTTP 503이었다. 정상 데이터 UI 검증은 **로컬 전용 fixture**로 수행했다. 해당 fixture, API 프록시, Node 미리보기 설정은 제품 변경 및 Git 커밋에 포함하지 않는다.
- fixture 점수·추이는 Production 데이터 증거가 아니다. 실제 결측 화면은 임의 숫자로 채우지 않는다.

## 검사 결과

- `node --test tests/market-score-mini-chart-ui.test.mjs tests/k1-shared-shell.test.mjs`: 9/9 PASS.
- `vite build --config vite.candidate-prerender-r7.config.ts`: PASS. 기존 deprecated middleware 및 ineffective dynamic import 경고가 남았다.
- `git diff --check`: PASS.
- 디자인 및 로컬 상호작용: PASS.
- Hosted Build / exact Deployment / Production UI: 미검증. 이 문서는 배포 완료 증거가 아니다.
