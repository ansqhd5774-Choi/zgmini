# AI 자동 투자 봇 · R13 FDA 차기 연도 공식 목록 확인과 불완전 연도 차단

검증일: 2026-10-25 KST. 개발 브랜치 `codex/investment-15-stage-m2-r25-20261025`; 연구용 **읽기 전용** Stage04. G/D/M 가중치·랭킹·ETF·상업화 권리·운영 사이트·주문은 변경하지 않는다.

## 왜 추가했나

FDA 공식 [Novel Drug Approvals at FDA](https://www.fda.gov/drugs/development-approval-process-drugs/novel-drug-approvals-fda) 연도 목록은 현재 **2026년 목록**과 **2025년 목록**을 함께 제공한다. 2026-10-25 기준 2026년은 아직 끝나지 않았다. 이 사실만으로 2026년 전체 확정 연간 승인 건수나 2026년판 완성 연차보고서를 확보했다고 주장할 수 없다.

기존 FDA 2025 확정 보고서의 **연간 신약 승인 46건**을 진행 중인 2026년 목록과 단순 비교해서 YoY, 가속도 또는 투자 점수로 바꾸면 연도 분모가 달라지는 오류가 난다.

## 실시간 지정 매체 조회 계약

1. 매 실행 FDA 공식 연도 목록 URL 하나를 **직접 HTTP GET**한다. URL/페이지 제목/CDER 출처/연도 링크의 주소와 본문 연도를 검증한다. 공식 페이지 구조가 바뀌면 `UNVERIFIED`로 처리한다.
2. 오늘이 2026년이고 목록에 2026년이 등장하면 `NEWER_CURRENT_YEAR_PARTIAL_LISTING_NOT_ANNUAL_REPORT`를 반환한다. 2025년 확정 연간 보고서 수치 **46건을 그대로 보존**한다.
3. 2027년처럼 2026년이 이미 끝난 시점에 2026년 목록이 확인되더라도 그것만으로 확정 연차 보고서 내용·수치를 확인한 것은 아니다. `NEWER_COMPLETED_YEAR_LISTED_ANNUAL_REPORT_REVIEW_REQUIRED`로 별도 검토를 요청한다.
4. 접근 실패/경로 변경/링크 연도 불일치/미래 연도가 나오면 `UNVERIFIED`와 실패 코드만 보고한다. **이전 목록 HTML을 캐시해 현재 판정에 재사용하지 않는다.**
5. FDA 연도 목록은 기존 **FDA CDER 2025 보고서와 별개의 판본 감시 신호**다. 9개 테마 산업 원천 7/9에 새로운 1개로 더하지 않는다.
6. 실행 코드·테스트·이 보고서만 개발 브랜치에 보존한다. FDA 목록 HTML/PDF 원본·대량 누적 수집물은 GitHub에 저장하지 않는다.

| 항목 | R13 직접 조회 결과 | 사용 범위 |
|---|---|---|
| FDA 공식 연도 목록 | 2026, 2025 등 공식 연도 링크 검출 | 판본 알림만 |
| 마지막 완성 역년 | 2025 | 2026 연간 성장률 계산 금지 |
| 기존 검증 보고서 | FDA CDER 2025, 46건 | 기존 연간 원값 보존 |
| FDA 2026 신약 승인 수 | `NULL` | 연간 집계로 자동 승격 금지 |
| 목록의 2026 vs 2025 연간 성장률 | `NULL` | 진행 연도/완성 연도 직접 비교 금지 |
| 최신 완성 연차보고서 자동 검증 | `false` | 링크 존재와 보고서 검증 구분 |

## 실제 통합 검증

- 개발 측 2026-10-25 HTTPS 직접 통합 실행: `INVESTMENT_BOT_STAGE04_INPUT_GATE_R13`, `LIVE_INPUT_PARTIAL_INDUSTRY_UNRANKED`.
- 기존 9개 테마 공포·탐욕 입력 **F 9/9**, 지정 공식 산업 원천 **7/9** 성공. 바이오·신약 F **2026-10-23 잠정 22.63294**, FDA 2025 보고서 46건. 이 값은 당일 조회 출력일 뿐 후속 실행의 현재 숫자로 고정하지 않는다.
- `officialIndustry.fdaEditionCatalog`에 2026년 목록 발견과 *불완전 연도* 알림 기록. `sourceVintageAudit` FDA 행에 `newerPeriodCatalogAlert` 및 `CURRENT_YEAR_LISTING_FOUND_PINNED_REPORT_STILL_LAST_VALIDATED` 출력.
- `sourceVintageAudit.automaticLatestEditionClaims=0`. FDA 외 **IFR·IEA·ENISA 차기 연차판**은 신뢰할 공식 동일 종류 목록 검출기를 아직 확인하지 못했으므로 **최신 판본 확인이라고 표시하지 않는다**.
- 미연결 2/9: IAEA PRIS 원본 Excel HTTP 403(우회 금지), SIPRI 파생 상업 사용권 미확인. 기존 9 테마를 실패 판정하거나 대체하지 않는다.
- 자동 테스트 **47/47 PASS**(8개 테스트 파일). 실패 응답, 타 출처 리다이렉트, 부정확 연도·문서, 연도 경계, 원자료·투자 점수 미변경 검사.
- **G/D/M·랭킹 `NULL`, 주문 0건, 자동매매 OFF**. 사용자 Windows CMD 실기기 검증은 하지 않았음. `main`/Cloudflare/DB/Provider/스케줄러/DNS 미변경.

## 변경된 파일

- 신규 `stage04/fda-edition-catalog-readonly.mjs`: 공식 FDA 연도 목록 직접 조회·유효성 검사·발행 연도 경계 판단.
- 신규 `stage04/fda-catalog-r13.test.mjs`: 실시간 파서 계약의 오판·변경 방어 테스트.
- 수정 `stage04/investment-bot-gate-readonly.mjs`: 기존 산업 7개 조회와 **독립적·실패 격리된** FDA 연도 목록 조회 결합.
- 수정 `stage04/source-vintage-audit-readonly.mjs`: FDA 판본 알림을 시점 감사에 분리하여 표시.
- 수정 `stage04/investment-bot-gate.test.mjs`: 2026년 미완료 목록이 2025년 확정 연간 수치/기존 9개 F·7개 산업·주문 금지에 영향을 주지 않는지 확인.
- 수정 `README.md`, `STATUS.md`, `ARTIFACT_INDEX.md`: 재개 기준 갱신.

## 다음 작업

IFR·IEA·ENISA는 검증 가능한 **동일 종류의 공식 연차판 목록**이 확보될 때에만 차기 판본 알림을 붙인다. 매체 검색 결과·페이지 갱신일만으로 새 연간 관측값을 만들지 않는다. IAEA 403/SIPRI 사용권은 승인 전 `NULL`; 투자 점수 산식의 미승인 가중치·실제 주문 연결은 계속 보류한다.
