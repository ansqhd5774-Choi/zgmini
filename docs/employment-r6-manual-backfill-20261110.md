# 고용 R6 2026-11-10 수동 BACKFILL 실증 및 잔여 실행 계획

> 작업 정본: `feat/bls-registered-v2-20261109` (Draft PR #1036). 기존 산식·가중치·TTL·DB 계약은 임의로 수정하지 않는다. **자동 수집/정규 예약 검증은 기능 완료 후 후속이며, 수동 검증에 날짜·60초·24시간 같은 내부 대기 Gate를 새로 만들지 않는다.** 공급자 호출량·공유 Writer 안전 보호는 별개로 보존한다.

## 실제 완료 근거

- 전체 기능 완료 **6/8 = 75.0%**; 수동 데이터 수집·게시 단계는 **PARTIAL**, 100% 완료로 계산하지 않는다.
- 제어 PR #1158 main 병합: B 승인 수동 실행의 재호출 보호를 날짜 단위에서 **고유 requestId** 단위로 교정. 기존 일일 claim·소비된 requestId 보호 및 총 호출 상한 유지. 관련 테스트 29/29 PASS.
- 수동 BACKFILL #1165 (Run 42709699561): `R6_B_INSTALLED_SOURCE_STOP`; PC source 이동으로 preflight STOP, provider/SQLite/D1 쓰기 0. 기존 ID 재실행 금지.
- 읽기 전용 PC 진단 #1167 (Run 42709978452): 설치 source/config/승인 source = `144f3b8f673cc3d18f004ddd65f6920d450f0ea6`; 기존 13개 overlay 13/13 SHA 일치·tracked dirty 0. 다른 담당자 Writer 설치로 인한 source 이동을 보호 기준에서 정확히 구분.
- 제어 PR #1168 main 병합: V3 승인 파일의 `installedSourceSha` 필드만 위 실제 승인 source에 고정; manifest SHA256 `8c84c1ab63e8501e10083b1945accdc76c8692bb11d27edab766e32f34b64aae`. DB/source/예약 변경 없음.
- **실제 수동 BACKFILL #1169** requestId `a4e1dc0d-f7ef-4ff8-80df-9ce56ad3d796`, Run 42710641027: BLS 14회+DOL 2회, 로컬 SQLite 저장 후 D1 게시 및 readback 검증, `PARTIAL/R6_B_PARTIAL_PUBLISH_VERIFIED`. GitHub JSON/TXT 2/2; 동일 ID 재실행 금지.
- #1169 6개 그룹: `BLS_EMPLOYMENT_SITUATION`, `BLS_JOLTS`, `BLS_ECI`, `BLS_STATE_MSA` 4개 SUCCESS; `BLS_BED`와 `DOL_UI_WEEKLY_CLAIMS` 2개 `SERIES_PARTIAL`. 게시 `sourceStoredAt=1794262879306`.
- 실제 공개 `https://zgmini.kr/api/employment-r6/observations`: 위 `sourceStoredAt` 일치, 29/29 source feature 존재, **24/29 scored** (이전 22/29), **18/29 recently scored** (이전 17/29), 22/29 chart READY. 고용 공개 UI `/economic-indicators/employment/`에서 평균 시간당 임금 전년 대비 **48.3점**을 확인. `AHE_YOY` READY, `BED_BIRTH_DEATH_NET` 점수 READY(8.75점)이지만 최신 자료 부족으로 1년 차트 UNAVAILABLE.

## 미완료 5개와 원인·담당 경계

1. `U3_UNEMPLOYMENT`, `U6_UNEMPLOYMENT`, `LFPR`, `EPOP`: 공식 BLS에서 발표하지 않은 **2025-10 CPS 1개월** 때문에 엄격한 120개월 참조가 불가능. 사용자 승인 범위는 이 **4개 지표만 실제 119개월** 허용하는 R2 예외, 값 생성·보간·재가중 없이 그 밖의 창은 현행 엄격 기준 유지. 기능 브랜치에 R2 소스와 격리 테스트가 있으며 **운영 source 설치·R2 쓰기/게시·실제 웹 배포 미완료**.
2. `STATE_CLAIMS_BREADTH`: 공개 최신 2025-07-19, score `PARTIAL_HISTORY`. 공식 ETA539 이후 자료는 존재하므로 DOL fetch/parse/snapshot/SQLite 51지역 완전주/특성 계산 중 **최초 결손 위치 미확정**. #1169의 DOL 호출 2회 결과는 `SERIES_PARTIAL`일 뿐 원인을 특정하지 않음.
3. BED 그룹 `SERIES_PARTIAL`: BED 114개 series를 2015–2025와 2026 두 구간으로 조회할 때 미발표 2026 분기 항목이 누락으로 잡혔을 가능성 높음. **원본 missingSeries 없이 확정 금지**. 과거 10년 점수 READY와 최신 1Y 차트 부족은 양립하며 재수집을 일률적으로 요구하지 않음.

## 다음 필수 실행 (필요한 것만)

1. **DOL/BED 원본 누락 원인 1회 확인:** 기존 승인된 A 37개 중 R6 `run.detail_json.missingSeries`, ETA539 `parserMeta.latestCompleteWeek`, SQLite `STATE_INITIAL_CLAIMS` 51지역 최신 분포를 조회하는 기능은 없음. 공통 Controller 작업자와 조정하여 정확한 **0쓰기·0 공급자 호출·0 D1 쓰기, 비민감 집계값만** 조회하는 최소 A 범위/승인을 마련하기 전에는 우회 SQL이나 새 B 재수집을 실행하지 않음. 원장 조회에서 실제 최초 결손이 밝혀지면 그 한 곳만 수정·검증.
2. **R2 예외 PC 적용:** 다른 기능/공통 Writer source 변동을 역검증하고, R2 변경 파일의 정규 원본 hash/overlay manifest/실제 승인 설치 경로로 반영. 승인 없는 운영 source 자동 교체, 광범위 PR #1036 무검토 main 병합, 임의 Cloudflare 직접 배포는 금지. 기능 담당이 수행.
3. **저장→D1→API/UI 최종 대조:** 실제 R2 methodology/formula hash, 29개 관측일·점수·차트·원자료 수·sourceStoredAt·결측/지연을 각각 확인. 실패 지표를 0이나 가짜 관측으로 채우지 않는다. 기능이 충족된 뒤에만 예약 자연 갱신 검증 후속.

**현재 판정:** 6/8(75.0%), `PARTIAL`; 자동 수집 선행 조건 없음. 승인 권한 밖 Controller 변경은 총괄의 독립 작업과 충돌하지 않도록 직렬 조정한다.
