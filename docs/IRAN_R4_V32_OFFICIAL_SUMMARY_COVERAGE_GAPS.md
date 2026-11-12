# ZGMINI Iran R4 — V32 42일 증거 공백 조사 (2026-10-19)

## 실제 공개 출처 확인

- UKMTO [2026 주간 보고서 목록](https://www.ukmto.org/ukmto-products/weekly-reports/2026)은 이번 웹 열람에서 **No products to display**. 파일이 이 경로에서 표시되지 않는다는 뜻으로, 2026년 원문이 아예 없다는 단정은 하지 않는다.
- UKMTO [일일 Summary Reports](https://www.ukmto.org/ukmto-products/ukmto-summary-reports) 메뉴 자체는 확인. 과거 [2025년 1월 31일 공식 보고서](https://www.ukmto.org/-/media/ukmto/products/20250131_ukmto_summary_report-31jan25.pdf?rev=550622378dd94a4eafe97814066742e5)는 'nil reporting' 포함 일일 요약의 존재를 설명한다. **2026년 9~10월 실제 일일/주간 원문 확보는 미검증**.
- UKMTO [최근 사건 목록](https://www.ukmto.org/recent-incidents)은 직접 페이지 열람에서 '0 reports', 검색 색인/동적 결과에서는 실제 2026년 사건 목록을 표시한다. **0 reports는 사건 0건 또는 완전 수집 인증이 아니다.**
- [최근 사건 색인](https://www.ukmto.org/recent-incidents?gsid=e008ae1b-3fe7-4240-b253-1d403ba3cfcb)에는 2026-10-18 **#177**(Khor Fakkan 부근 예인선 피격 신고)도 포함된다. V30·V31의 21개 고유 번호는 **전체 사건 전수 목록이 아닌 연구 표본**이다.

## V25~V29 실측과 V30~V31 결과

- V25~V29 PC read-only: 저장 출처 4,257, 판단 646, 최신 사건 리비전 3개 **모두 미검증**, R4 전용 checkpoint 없음, 독립 점수 0/14.
- 기존 미분류 3,671건 중 3,661건은 단일 상태 지문/동일 저장 구조. 사건 ID/주체/발생일/관측완전성 없음. 원문으로 간주하거나 3,661건 재검토 대상으로 만들지 않는다.
- V30/31 선별 경보는 사건 번호·보고일·수정/중복 불확실성을 연구 메타데이터로 분리했을 뿐, PC R4 이벤트나 점수로 승격하지 않았다.

## V32 연구용 검사기

`lib/iran-progress/evidence-gap-planner-v32.mjs`: **2026-09-07~2026-10-18 42일**과 5개 독립 검증 lane(`IRN_USA`, `IRN_ISR`, `YEMEN_HOUTHI`, `HORMUZ`, `RED_SEA`)의 후보 문서 존재 구간을 집계.

- 빈 입력이면 **42 × 5 = 210 lane-day 증거 확인 필요 슬롯**. **210개 API 요청/문서가 필요하다는 의미가 아니다**. 진짜 원문 한 건이 여러 날짜를 명시적으로 다룰 수 있다.
- 주간 7일 문서 후보 1건은 해당 항로 **문서 조사 후보일** 7개만 줄인다. 28일 관측 완전성·부재 공격 확인·원문 PC 저장/검증 여부를 자동 입증하지 않는다.
- 경보 여러 개가 같은 날 존재하면 후보 문서가 여러 개여도 **고유 날짜는 1개**. 보고 숫자=공격 건수 금지.
- UKMTO 항로 문서만으로 이란–미국/이스라엘·예멘 후티 **군사 전선의 관측 완전성**을 입증할 수 없다.
- 오늘 웹에 발견된 출처를 10/05 PC 원문으로 소급하지 않는다. 정정 시각 불명인 V31 #165도 마찬가지.
- **출력은 항상 독립 검증 날짜 0, verified 사건 0(이번 검사기에서 승격 0), score=null, productionReady=false**. 0은 현실에 공격이 없었다는 뜻이 아니다. 이 함수는 기존 산식·데이터 계약을 대체하지 않는다.

`tests/iran-r4-v32-evidence-gap-planner.test.mjs`: 11개 범위·출처·날짜·중복·소급 방지 회귀 테스트.

## 다음 수행 순서

1. 기존 PC 원장과 GDELT ZIP 재수집 없이 공식기관에서 접근 가능한 **2026년 해당 날짜 원문/정정 시각/기간 요약**의 실제 URL과 허용된 재사용 조건 확인.
2. 확보한 원문만 기존 승인 PC source receipt 흐름에서 저장·재조회한 후 검토. 웹 조회와 기존 PC 저장일은 반드시 분리.
3. 5개 lane 별 28일 관측 및 3개 전선의 D/C/M, 해상 H, 핵 N 증거를 독립적으로 확인.
4. **출처 증거가 부족한 날짜는 null 유지**. GitHub Draft 연구의 PR/테스트가 운영 승인, 전선 완전성 또는 14일 R4 계산 성공을 뜻하지 않는다.

운영 DB/D1/provider API/산식/가중치/TTL/스케줄/Cloudflare 변경 없음. 승인 없는 결측 0 채우기나 무차별 42일 전체 재수집 없음.
