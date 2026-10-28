# ZGMINI 시장 캘린더 R24 — USDA WASDE 발표 일정

## 범위 및 상태 · 2026-10-28

- 유지 브랜치: `codex/zgmini-gpt-workspace-20261025` (**새 브랜치 없음**).
- R23 EIA 사용자 PC Core 설치 성공 SHA `8ff396217c9f84578b37c9d422381644c2b8f0e8` 보존. 정규 수집·공개 사이트 반영은 아직 미검증.
- R24는 공식 WASDE 발표 날짜 수집을 위한 **읽기 전용 원문 확인 + 스테이징 파서** 단계. Core·기존 소스·SQLite·게시기·스케줄러·GitHub main/배포 변경 없음.

## 공식 공급원

- 공식 URL: https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report
- USDA World Agricultural Outlook Board의 월간 *World Agricultural Supply and Demand Estimates* (WASDE) 발표 일정. 농산물·곡물·육류 수급 전망 발표이며 미국 시장·원자재 투자자 대상 일정이다.
- USDA 웹페이지에는 **2026년 12건 및 2027년 12건을 명시적으로 제시**하며 **미 동부 12:00** 발표를 기재한다. 2026-10-28 이후 발표는 2026년 2건 및 2027년 12건이다.
- 2026년 향후: **11월 10일, 12월 10일**. 2027년: **1/12, 2/10, 3/10, 4/9, 5/12, 6/11, 7/9, 8/12, 9/10, 10/8, 11/10, 12/10**.
- 공식 원문에서 명시된 연도·월·일만 이벤트로 변환한다. 임의 매월 계산, 관례적 평일 추정, 가상의 미래 날짜 생성 금지.
- `id=usda-wasde`, `source=usda`, 고정 sourceUrl, 발표일 5필드로 전송할 계획이다. 고유 event ID/날짜 중복 제거, 원문 저장 후 저장 자료에서 파싱하는 기존 PC 계약을 따른다.

## 구현 내용 및 다음 게이트

1. `scripts/pc-writer/market-calendar-r24-usda-source-export.mjs`와 전용 `.cmd`: USDA 공식 페이지 1회 GET, URL/redirect/용량/문서 서명 검증, 원문 Base64+SHA256을 결과 TXT로 출력. PC Core나 운영 정보 읽기·수정 금지. HTTP 오류/차단은 실패 기록만 남기며 재시도/우회 금지.
2. `staging/market-calendar/r24-usda/lib/usda-calendar.mjs`: 공식 2026·2027 텍스트를 기반으로 WASDE 12개월 완결성·실제 날짜를 검증하는 파서. 데이터가 누락되면 추정하지 않고 실패한다. **실제 공식 HTML 원문에 대한 적합성은 사용자 PC 수신 후 확인**.
3. 원문 수신 뒤 관측된 DOM·해시 검증 → R23 Core 위에 독립 USDA 원문 저장/재파싱을 포함하는 최소 스테이징 collector 구현 → 기존 공급원 회귀/이력 보존 → 승인 SHA 고정 PC 안전 설치 패키지 작성.
4. R24 설치 이후에만 정규 수집 결과를 별도 확인한다. 사이트 공개·운영 배포 완료를 미리 주장하지 않는다.

## 재사용 정책 및 안전

- USDA 공식 웹 자료의 사실관계(발표 예정일)를 출처와 함께 최소한의 일정 정보로 인용·정리한다. 공식 미국 정부 자료의 공개 접근을 확인했으나 타 기관 저작권 포함 자료·사진·보고서 전문은 수집하거나 재배포하지 않는다.
- 수집 전송은 출처 URL·관측 시각·원문 해시를 보존한다. 실패가 이전에 관측된 공식 일정 데이터를 지우지 않게 한다.
- 자동 스크래핑 정책이 달라지거나 요청 차단 시 건너뛰고 검토한다. 사용자 PC는 원문 확보 목적의 **단 한 번의 공식 페이지 요청**만 하며 과도한 반복 접근을 하지 않는다.
