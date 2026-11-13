# ZGMINI UIUX — 60차 미니차트 잘못된 관측일 최소 수정

**담당:** UIUX 전문가-`codex/ui-improvements-2` · **전체 UIUX 진행률 25% → 25%**  
**공식 지시:** [제어 #68 댓글 6865373693](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6865373693)  
**기준 main:** `643b7c7c4372ffad552443fc312c6cb1b944e2fc`

## 1. 이번 실제 새 FIRST FAIL 재현

미니차트 `app/inflation/inflation-mini-chart.tsx`는 날짜 타입이 string이고 관측값이 finite이면 모든 행을 채택. `2026-02-31`은 JavaScript Date.parse에 의해 `2026-03-03`으로 자동 보정되며, `not-a-date`처럼 파싱 불가능한 문자열도 통과해 X좌표를 배열 index로 대체하므로 실제 시간축·마지막 점 위치가 잘못될 수 있음. 이는 **실제 Node 격리 입력으로 코드 결함 재현**, 실제 Production 원자료에 불량 날짜가 있었다는 증거는 아님.

공유 영향: 12대 경제지표 물가·고용·별도 Inflation R2에서 사용하는 `InflationMiniChart`. 캘린더·테마 자체 차트의 운영 장애로 확대 판정하지 않음.

## 2. 실제 코드 수정 (UI 원담당 브랜치)

- `lib/inflation-mini-chart-geometry.mjs` **신규**: 실제 Gregorian UTC 유효 날짜만 허용. `YYYY-MM`은 축 계산에서만 해당 월 1일로 정규화하고 원래 레이블은 보존. `YYYY-MM-DD`는 보정된 허위 날짜(예 2/31)를 거부. 무효 숫자·날짜 제외, 배열 index fallback 제거, `breakBefore` 명시적 선 단절·유효 0값/음수 유지.
- `app/inflation/inflation-mini-chart.tsx` **최소 변경**: 기존 SVG 레이아웃을 유지하며 검증 가능한 순수 함수 import.
- `tests/inflation-mini-chart-dates-r60.test.mjs` **신규 9개 Node 회귀**.

Git blob SHA-1:
- 순수 계산 `fa3505e0f79926114503ab56b600b171d43d0816`
- 공용 TSX `9a87d90d79af014c13f13b2f1c92253fb58f09ed`
- Node 검사 `f3671af5db0164d274668ef969a065ec9c8d653f`

실제 Node v22.16.0 격리 실행: `node --test tests/inflation-mini-chart-dates-r60.test.mjs` **9/9 PASS, 0 FAIL**. `git hash-object`로 위 3개 저장본과 Node 실행한 로컬 원본의 바이트 동치 확인. TSX 구문 트랜스파일 진단 0. 전체 앱 `tsc` 및 Production 동작은 별도 CI/배포 검증.

## 3. main 기준 선택적 PR

UI 브랜치는 main 대비 크게 분기하여 **전체 병합/리베이스 금지**. 정확한 main을 기준으로 [Draft PR #1066](https://github.com/ansqhd5774-Choi/zgmini/pull/1066) `codex/uiux-r60-mini-chart-valid-dates-20261114`를 별도 생성. 4개 파일만 변경, 운영 PC/공식 수집·산식/API/DB/D1·Cloudflare 배포 0.

첫 CI [Run #43512695837](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43512695837): Build, Type check PASS, Regression **4177 PASS / 1 FAIL**. 원인은 기존 `tests/inflation-research-inline-ui-r1.test.mjs`가 월별 정규화 코드가 항상 **기존 TSX 파일에 직접 있어야 한다**고 검사한 구조 의존 assertion. 기존 월별 레이블/기능 결함이 아님.
- 원 assertion 삭제하지 않고 **새 helper에서 월별 정규화와 날짜 유효성 확인**, TSX 연결까지 검사하도록 이 테스트만 최소 수정.
- 선택적 PR 수정 HEAD `4ad592f1d0a2547a2aadf12641cc4e16d076f5d5` (기존 3개 + 관련 기존 테스트 1개 = **4개 파일만**).
- 두 번째 [Node CI #43513217850](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43513217850) 생성됨. **최종 Run 결과는 아래 새 검증에 따라 완료 판정**.

## 4. LAST PASS / FIRST FAIL / 범위

**LAST PASS:** 이번 새 최소 수정의 동일 바이트 Node 집중 회귀 9/9 PASS, TSX syntax PASS; 첫 CI Build+Type check PASS.  
**FIRST FAIL:** 첫 CI의 기존 월별 정규화 static assertion 경로 변경, 영향 파일 1개 최소 수정 후 재검증 중. 그 전 기존 51차 브라우저 Host permission/SOCKS/DNS/credits 실패는 이번에 재요청하지 않음.

물가와 R2 숫자 점수 출처 분리 기존 58차 PASS 재사용. 테마 Line `connectNulls={false}` 및 calendar source READY/freshness fallback 확인; 현재 직접 Production 렌더링·캡처·동시점 JSON·모바일 overflow **8/8 UNVERIFIED**. 소스 수정만으로 25% 완료율 상승·Production 설치 성공을 주장하지 않음.

**다음 필수 하나:** 선택적 PR #1066의 새 CI 결과를 확정하고, 성공 시 PR을 코드 리뷰·승인된 통합 담당에게 인계한다. 별개로 Production 8뷰 실측은 기존 승인된 무료 브라우저 접근 정상화 이후 실행하고, 금차 배포·D1 쓰기·RDC는 하지 않는다.

## 5. 60차 최종 GitHub CI 실측 — Run #43513217850

- **source SHA:** `4ad592f1d0a2547a2aadf12641cc4e16d076f5d5`, PR #1066는 `OPEN/Draft`. 첫 CI 실패 시 안전하게 재실행한 것이 아니라 **실패 원인 테스트 파일 1개를 실제 수정해 새 커밋으로 자동 신규 CI**를 받음.
- **Run:** [Node.js CI #43513217850](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43513217850), Job `132188445971`, **completed/success**.
- **Build PASS, Type check PASS, Regression tests 4,187개 중 4,178 PASS / 0 FAIL / 6 SKIP / 3 TODO**, 기존 월별 날짜 source guard PASS, 신규 날짜/마지막 점/명시 단절 9개 PASS.
- **PC publication recovery 관련 소스 테스트 11/11 PASS**, **Cloudflare candidate 공개 계약 테스트 69/69 PASS**. CI PASS는 운영 PC에 설치했거나 D1·Production 배포되었다는 증거가 아님.
- 최종 선택적 main 기반 PR은 **4개 파일만**: `app/inflation/inflation-mini-chart.tsx`, `lib/inflation-mini-chart-geometry.mjs`, `tests/inflation-mini-chart-dates-r60.test.mjs`, `tests/inflation-research-inline-ui-r1.test.mjs`. 원래 월별 레이블 보호 검사 삭제 0.
- **최종 LAST PASS:** Node 9/9 + GitHub Run #43513217850 전체 PASS. **최초 FIRST FAIL:** 첫 CI #43512695837 regression 테스트의 기존 source 위치 고정 assertion; 수정 후 해소. 기존 Live 브라우저 권한 장애는 계속 남아 있으며 8/8 화면 실측은 여전히 `UNVERIFIED`.
- **다음 필수 실행 하나:** 최신 main을 기준으로 정리된 선택적 [Draft PR #1066](https://github.com/ansqhd5774-Choi/zgmini/pull/1066)에 대한 **소스 리뷰 및 허용된 main 통합 판단**. PR 통과·main 병합만으로 PC 설치/Cloudflare Production 갱신 완료를 주장하지 않음. 이후 별도 승인된 Production 배포와 무료 라이브 브라우저 8뷰+동시 API 검증으로 종단 완료.
