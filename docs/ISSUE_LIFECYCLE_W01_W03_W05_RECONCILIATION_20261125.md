# W01·W03·W05 관련 Issue·PR 수명주기 대조 기록 — 2026-11-25

## 적용 경계

- 저장소: `ansqhd5774-Choi/zgmini` 및 `ansqhd5774-Choi/zgmini-pc-control`.
- 역할: 본체 Issue·PR 관리자가 확인 가능한 기존 원본을 대조. 원 기능 담당자의 수정·설치·공통 자원 보호 일정 인수 금지.
- 기준: GitHub 원본 Issue/PR 상태, 실제 기존 댓글/실행 증거, 최신 `main` 파일 검색, PR 변경파일 목록 및 `main...head` 비교.
- **수명주기 정리 완료**와 **기능의 실운영 완료**는 별도 상태. 제목/본문 키워드 검색으로 얻은 후보를 해당 W 업무 전체라고 단정하지 않음.

## 이미 실제 종결한 항목

| 원본 | 상태 및 근거 | 완료의 정확한 의미 |
| --- | --- | --- |
| [zgmini PR #983](https://github.com/ansqhd5774-Choi/zgmini/pull/983) | CLOSED / UNMERGED; [결정 근거](https://github.com/ansqhd5774-Choi/zgmini/pull/983#issuecomment-7143992955) | 역사적 R54 source lease PR 원본만 미병합 종료; 공통 보호 완료 의미 아님 |
| [PC Issue #1846](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1846) | CLOSED / not_planned; [정리 근거](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1846#issuecomment-7144150367) | 취소된 고유 단회 조회 request의 수명주기만 종료; 원본 Job completed/cancelled와 원인 미확정은 보존 |
| [zgmini Issue #1577](https://github.com/ansqhd5774-Choi/zgmini/issues/1577) | CLOSED / not_planned; [원본 로그 비교](https://github.com/ansqhd5774-Choi/zgmini/issues/1577#issuecomment-7144194673) | 과거 분기된 HEAD의 구형 breadth UI 대기 셀렉터 2회 타임아웃 추적 건 종료. 현재 main 브라우저 전체 CI PASS 주장 아님 |

## OPEN 원본 분류 — 이름 중복과 기능 소유권 구분

| 항목 | 확인된 현재 상태 | 판정 |
| --- | --- | --- |
| W01 이름으로 검색한 본체 OPEN Issue·PR | 0건 (이번 검색 결과 기준) | 관련 기능 완성/운영 증명과 동치 아님. 오래된 W01 Issue #1330은 소스 수리 종결 뒤 운영 Writer 적용 미확인이라는 별도 증거 경계가 있음 |
| W05 이름으로 검색한 본체 OPEN Issue·PR | 0건 (이번 검색 결과 기준) | 제목에 없는 연구·간접 연계 PR을 빠뜨리지 않도록 별도 관리 |
| [W03 PR #1578](https://github.com/ansqhd5774-Choi/zgmini/pull/1578) | OPEN/Draft, 6파일, 구형 R54 잠금 원본 | [#1580](https://github.com/ansqhd5774-Choi/zgmini/pull/1580)에 선택 계승된 이력. 사용자 별도 일정의 공통 자원 보호 범위이므로 이 담당자가 임의 종결/병합하지 않음 |
| [W03 PR #1580](https://github.com/ansqhd5774-Choi/zgmini/pull/1580) | OPEN/Draft, 8파일, 실제 CI·운영 경합 검증 미완료 | 별도 일정 범위. 완료 주장 및 운영 설치 금지 |
| [PR #488](https://github.com/ansqhd5774-Choi/zgmini/pull/488) | OPEN/Draft, `main` 대비 diverged, head 3 ahead / 1724 behind, 3파일 | ETF 8-theme 비공개 연구용 snapshot; `lib/market-score/theme-etf-shadow-snapshot.mjs` 등 핵심 파일 현 `main` 검색 결과 없음. 원본 명시적으로 운영 미승인/비공개 보존. 중복으로 임의 종결 금지 |
| [PR #219](https://github.com/ansqhd5774-Choi/zgmini/pull/219) | OPEN/Draft, `main` 대비 diverged, head 231 ahead / 2682 behind, 156파일 | E1-R5 연구 Shadow; `lib/market-score/earnings-e1-r5-contract.mjs`, `earnings-e1-r5-shadow-calculator.mjs` 등 핵심 파일 현 `main` 검색 결과 없음. 대형 PR 전체 병합 금지, 연구 산식 승인/운영 적용 주장 금지 |
| [PC #2237](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2237) | OPEN, 과거 Runner Job 취소 원인 미확정 | 공통 프로세스 담당 범위; W03 전용 기능 완료를 가로막는 전역 Gate로 삼지 않음 |
| [PC #1743](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1743) | OPEN, 능동진단 레거시 원장 | 현 `main`의 진단 runner가 원장 OPEN을 참조하므로 자동화 회귀 위험 때문에 임의 종료 금지 |
| [PC #835](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/835) | OPEN | W02 시장 캘린더 ER1 실제 로컬 output·D1 게시 인계, W03 원담당 업무와 혼동 금지 |
| [PC #2426](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2426), [#2427](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2427) | OPEN | 월별 Proactive Diagnostics/Wide Scout append-only 원장; W05 기능 장애가 아님 |

## 이미 종료된 기능 Issue의 실제 증거 경계

- [W03 #1009](https://github.com/ansqhd5774-Choi/zgmini/issues/1009): 기존 원본 최종 댓글에 공개 API READY·10×252·390px 실제 브라우저 success가 기록됨. 원본 과거 stale와 현재 상태 혼동 금지.
- [W01 #1330](https://github.com/ansqhd5774-Choi/zgmini/issues/1330): 소스·CI 수정만 completed. 이전 공개 payload 미래 월말 레이블 오류는 운영 Writer 실제 설치·D1 게시 검증 없이 종단 해결이라 주장 금지.
- [W05/W06 #1467](https://github.com/ansqhd5774-Choi/zgmini/issues/1467): source fix + 실제 Production 390/1440 hydrated UI 검증 기록 확보. BEA unit pending 상태 자체는 별도 미게시 데이터 상태.

## 재작업 금지·종결 판정

1. 현재 진행 중 Draft를 무조건 CLOSE해 숫자를 줄이지 않음. 원본 설계/시험이 현 `main`에 대체됐다는 증거가 없으면 유지.
2. 사용자 별도 일정으로 관리하는 R54/공통 자원 보호는 불필요한 종결 제안·진단 재발행 없음.
3. 최초 실패 원본의 terminal state, 운영 승인 및 공개 API는 각각 별도로 증명.
4. 이번 대조 자체가 전체 W01·W03·W05 기능 완료 증명은 아님. **W01/W05 명시 OPEN 검색 0, 관련 Draft와 공통 원장은 다른 계약에 따라 유지**.
5. 이 문서는 운영 변경·CI PASS·소스 결함 수정 성과로 계상하지 않으며, 기존 이슈/PR의 중복 조사와 잘못된 종료를 방지하는 관리 근거로만 사용.

현재 이번 대조에서 신규 운영 변경 0, 새 GitHub Issue 생성 0.
