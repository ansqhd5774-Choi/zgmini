# 실적 침체 R2 검증 V4

## 확인한 원인

2026-10-19 공개 화면의 Recharts SVG에서 X축 라벨은 `.recharts-xAxis-tick-labels`에 렌더링된다. 이 레이어는 `.recharts-xAxis`의 자손이 아니므로 V3의 selector가 빈 배열을 반환했다. PC 1440px와 모바일 390px에서 실제 라벨 `25/09, 25/12, 26/03, 26/06, 26/10`을 수집했다. 기존 화면 검증 결과는 유지한다.

`scripts/earnings-ui-chart-gate.mjs`는 새 레이어와 이전 레이어를 모두 지원한다. 라벨 수집 실패는 AUTOMATION_BLOCKED로 구분하며 실제 중복·예상 월 누락은 FAIL이다. 같은 월의 관측점 두 개는 삭제하지 않는다. 저장 관측점 6개와 월 라벨 5개가 다른 것은 정상이다.

V1~V3 파일과 결과는 보존한다. 사용자 제공 V3를 바탕으로 별도 V4 폴더에 CMD·검사 스크립트·공통 gate 모듈을 준비했다. V4 전체 CMD는 재실행하지 않았으며 문법 검사와 공통 gate 회귀 검사를 수행했다. 실제 운영 DOM에서 수집한 라벨로 PC·모바일 gate를 검증했다.

## 메타데이터 경로

로컬 저장 E1-R5 candidate에는 `quality.universeCount=500`이 있으나 공개 domain adapter가 quality를 전달하지 않아 상세 projection에서 잃는다. 모든 quality를 공개하는 대신 명시된 `issuerCount`, `universeCount`, `financialPeriodEnd`만 보존한다.

모집단 기업 수는 모든 요소의 실제 유효 기업 수와 동일하지 않다. 따라서 universeCount를 issuerCount로 대체하지 않는다. 현재 candidate에는 공통 financialPeriodEnd와 issuerCount가 없으므로 이 두 필드는 null을 유지한다. asOfDate를 financialPeriodEnd로 대체하지 않는다. E1-R5는 SEC·BEA·BLS·CFO의 서로 다른 기간 자료를 결합한다.

저장 실데이터로 adapter→projection을 재생한 결과 진단 84.6875점, E1 73.51207667731629점, 지표 13개, 관측점 6개가 유지되며 universeCount만 500으로 전달된다. 원본·산식·가중치는 변경하지 않았다.

## 적용 경계

검사기 수정은 사이트 배포가 필요 없다. 공개 metadata 변경이 실제 API에 도달하려면 수정된 adapter로 생성된 이후 저장 snapshot과 수정된 projection reader가 필요하다. 이 검증에서 PC 운영 source·scheduler·DB·D1·공개 결과의 강제 재생성이나 게시를 실행하지 않았다. 현재 API의 null을 이미 복구했다고 보고하지 않는다.
