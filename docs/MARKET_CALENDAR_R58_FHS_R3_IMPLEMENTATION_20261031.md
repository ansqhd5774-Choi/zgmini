# ZGMINI-FHS-R3 R58 적용 — 승인 산식 PC 비공개 파일럿

- 작업 저장소: ansqhd5774-Choi/zgmini, 기존 브랜치: codex/ui-improvements.
- 사용자 명시 승인: 2026-10-31 ‘일단 이렇게 적용해보자’ — 직전 FHS-R3의 20/15/25/40 점수와 위험상한/결측/업종 제외.
- 현행 실적 중요도 ★★★·★★·★와 **다른 개념**인 자체 ‘재무건전성 등급’. 기존 페이지의 중요도 별표를 덮어쓰지 않는다.
- 공식 SEC API: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- CFA 재무분석: https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/financial-analysis-techniques

## 산식 계약

- 배점: 유동비율 20, 현금비율 15, 총부채/총자산 25, 연간 OCF/평균총자산 40, 합 100.
- 구간: 유동비율 [1.5,1.0,0.75]→[20,15,8,0], 현금비율 [0.5,0.25,0.1]→[15,10,5,0], 총부채/총자산 [≤0.5,≤0.75,≤0.9]→[25,17,8,0], OCF/평균총자산 [≥0.08,≥0.03,≥0]→[40,25,12,0].
- 총점 ≥80 3성, ≥50 2성, 미만 1성. 2년 OCF 적자 최대 2성; OCF 적자+현금소진 <12개월 최대 1성; 자산초과부채+OCF 적자 최대 1성.
- 전년도 비교는 총자산과 OCF 모두 존재해야 한다. 결산일 차이는 300~430일, 회계기간 흐름 320~400일, 최신 연차말은 평가일 기준 550일 이내.
- 현금/자산/부채 값은 USD; 금융회사·은행·보험·리츠·BDC·SPAC은 일반기업 산식 제외.
- 데이터 결측·0 분모·충돌·미래 공시·기간 불일치 시 미평가. 누락을 0으로 채우지 않는다. 특히 총부채가 없으면 자산−자본으로 보충하지 않는다.

## PC 파일럿 경계

R57 기존 SEC ZIP·SEC 매핑·SQLite 캘린더를 읽기 전용으로 재사용한다. 섹터 분류와 가용현금 제한이 아직 검증되지 않아 산출되는 R58 점수는 `PROVISIONAL_UNVERIFIED`이며 공식 신용등급이 아니다. 자료와 기간 요건까지 충족한 후보 숫자를 알아보기 위한 1회 검사다.

단일 회사에 복수 티커가 있으면 동일 기업 점수(동일 SEC CIK)를 적용하되 티커 기준 횟수도 보존한다. 임시 JSON에는 원재무수치 없이 기업별 잠정 점수·별표·비공개 상태·위험신호만 저장한다. **PC 바깥 반출·공개 금지**. 사용자에게는 집계 TXT만 업로드받는다.

공급자 요청 0, SQLite/D1 원본 쓰기 0, 공개 게시/스케줄러/GitHub 운영 SHA/Cloudflare/DNS 변경 0. R57 유효 PC 결과로 2,634개·SEC ZIP 매핑 2,594개(2026-10-31)를 확인했으나, **R58 본 검사 PC 런타임은 미실행**이다.

## 검증

- 오프라인 점수/추출 단위 테스트 18/18 PASS (모의 SEC 자료).
- 모의 PC SQLite + SEC mapping JSON + companyfacts ZIP 실경로 R58 실행 PASS: 잠정 1, 확정 0, API 0, DB 0, D1 0.
- 기존 R57 ZIP CRC 검사 및 읽기 전용 DB 코드 재사용. 기존 R57 helper는 2개 함수를 명시 export한 것 외에 동작 변경 없음.
- 실제 PC 2,634개에 대한 R58 1회 실행, 소스 진입 계약 및 운영 SHA, 업종·현금 제약 검증, 스코어 적합성·분포 검토는 미완료. R58 결과 보고 이후 다음 범위 결정.

사용자 PC 실행: 새 폴더에 ZIP 해제 → `MARKET_CALENDAR_R58_FHS_R3.cmd` 한 번 실행 → `MARKET_CALENDAR_R58_FHS_R3_RESULT.txt` 한 개만 첨부. `PRIVATE_SHADOW.json`은 PC 보관. 오류 시 재실행·삭제 금지.
