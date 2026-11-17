# ZGMINI R4 #28 — 방법론 전환·결측 기간·실제 관측점 분리 감사

- 기준: `zgmini/main@2aa9cd28053c03be8fb34cbc87794e59f566cbde`, 후속 `main@0bef187a1e7ce632ecc15a4724fd24600650859f`는 W01 A4-01 읽기 전용 정확 2파일만 변경. W06 UI/chart/archive 관련 source 변경 없음.
- 계획 #28: "공통 모델 버전 전환·결측기간·재구성 이력과 저장된 실제 계산점을 분리. 서로 다른 방법론 곡선 연결 및 미관측 날짜 보간 금지."
- 선행 완료: #05 복합 archive / #26 실제 1D 계산점 GET / #27 단기/장기 병합 계약 / #35·#69 화면 회귀. #01 실제 설치/Production 버전은 별도 PARTIAL.

## 관측 가능한 소스 경계

| 계층 | 실소스 확인 | 실제 의미/문제 |
|---|---|---|
| PC 종합 이력 원본 | `lib/composite-observed-history-r1.mjs` | `compositeSampleFromVerified`는 `calculatedAt`, `score`, `asOfDate`, `signature`만 저장. `signature`는 12개 도메인 방법론 이름과 점수 등을 혼합해 fingerprint로 만들지만, **모델 버전만 독립 식별하는 필드가 아님** |
| 공개 1D/장기 관측 API | `app/api/market-score/observations/route.ts` | JSON `points`는 `observedAt`, `score`, `asOfDate`만 반환. 계산점 시각/중복충돌/미래시각은 거부하지만, 각 점의 **methodologyVersion/modelVersion은 공개하지 않음** |
| 재구성 현재 빈티지 이력 | `lib/market-score/composite-model-r1.mjs`, `buildCompositeTrend` | 12개 경제 영역의 **현재 활성** 각 도메인 시계열을 기반으로 과거 점수를 재구성. 과거 실제 PC 계산 사건 자체나 PIT 입증 아님 |
| 차트 입력 정규화 | `lib/market-score/market-trend-normalize-r4.mjs` | 관측시각/범위/READY 검증 후 `{label,value}`로만 전달, 방법론 시대 표시 메타 없음 |
| 단기/장기 표시 병합 | `lib/market-score/composite-observed-display-r1.mjs` | 1D는 실제 저장 calculation 점, 1W/1M/3M은 재구성 일별 이력과 실제 intraday 점 병합, 6M/1Y은 재구성 일별 값만 유지. **방법론 시대가 다른 두 점을 자르거나 선분을 분리하는 명시적 검증 필드 없음** |
| 차트 범위 선택 | `lib/market-score/market-trend-window-r1.mjs` | 2026-11-16 최신점/7일 범위를 표시할 때 관측 없는 경계일(11-09)에 **이전 관측값을 새 날짜의 점으로 생성**할 수 있는 display-only synthetic point 발견 |

## W06 자체 수정 (#28 일부)

- 별도 최신 main 기반 브랜치 `codex/w06-r4-28-strict-boundary-20261117`, [Draft PR #1248](https://github.com/ansqhd5774-Choi/zgmini/pull/1248), HEAD `73952df56062d5b77baf1a1a769446e938188fce`.
- 정확 **4파일만**: `lib/market-score/market-trend-window-r1.mjs`에 선택 옵션 `includeBoundaryCarry=false`; `app/dashboard-ui.tsx`의 **종합점수 시계열 한 곳만** 이 옵션 호출; `tests/r4-methodology-gap-no-synthetic-boundary-28.test.mjs` 신규 회귀 5개; **기존 `tests/r4-publication-bound-trend-29.test.mjs`의 오래된 UI 호출 문자열 assertion을 삭제하지 않고 더 강한 새 옵션 확인 assertion으로 갱신**. 다른 화면 호출은 legacy default 유지.
- 검증 fixture: 실제 10-01=42/11-10=47/11-16=51에서 기존 7일 chart의 허위 11-09=42 점을 제거하고 **실제 관측 11-10/11-16만** 남도록 검사. 30일 cutoff·0/null·기존 domain behavior 보존·UI 호출 경계 테스트 포함.
- PR은 **DRAFT**, main 변경 0·Production 변경 0·Writer archive/API/DB/TTL/산식 변경 0. **첫 Node Run #44065397396**: Build·Type/PC recovery·CF-reader PASS, Regression 4859 중 4848 PASS / 1 FAIL / 7 SKIP / 3 TODO. 정확 실패는 #29의 이전 UI 호출 문자열 literal matcher 한 곳. 재검증을 삭제/skip하지 않고 새 호출·flag를 확인하도록 보완, head `d16eafaf80d0ed5f703f85b510eb415627a366ac`, 새 CI [Node #44065978125](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44065978125) 및 [UI #44065978302](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44065978302) 진행. 최종 결과 확인 전 PASS 주장 금지. 이 한 부분을 고쳐도 #28 전체 완료가 아님.

## LAST PASS / FIRST UNVERIFIED

- **LAST PASS:** 저장된 실제 계산점과 재구성 current vintage 원본 경로를 구분. 실제 개별 방법론 버전 정보가 공개 관측점에서 빠지는 경로를 정확히 특정. W06 범위의 허위 window cutoff 개선 **4파일** PR/소스 diff 반영, 기존 #29 stale assertion은 삭제 대신 동일 의미의 엄격한 새로운 UI 호출 계약으로 조정.
- **FIRST UNVERIFIED:** 방법론 버전 전환이 발생한 실제 과거 계산점과 재구성 곡선을 연결하지 않는다는 실증 **없음**. per-point version 없음 → 구버전/신버전 seam을 무조건 자동 검출하는 UI 검증은 현재 불가능. 생성 signature는 점수 변화에도 달라지므로 방법론 ID 대체 불가. 승인 없는 archive JSON 계약 수정·새 DB·Writer 임의 변경 금지.
- **판정:** 계획 #28 **PARTIAL**, 가중치·계산·실저장/게시·API 계약 변경 0. #01 PARTIAL과 함께 누적 **22/75 (29.3%)** 불변. PR CI PASS여도 경계일 개선 범위만 PASS이며 #28 DONE 아님.
- **담당 분리:** W06 담당 UI gap/세그먼트·차트 검증 및 PR/회귀, Writer/계산 원담당은 필요하면 기존 승인된 version-key 이력 원자료/계약 문제만 별도 처리. **프로세스 총괄 신규 인계 0**: 공통 Controller·정규 설치기/공용 권한 결함 발견 없음. 검증되지 않은 writer schema 변경을 총괄에게 떠넘기지 않음.
- **다음 독립 W06 실행:** PR #1248 CI 결과+3파일 변경 범위 확인. 그 뒤 per-point version 없는 계산점은 UI에서 방법론 확정구간으로 표현하지 않도록 하는 표시/테스트를 W06 범위에서 별도 보완 검토. 필요할 경우에만 Calculator/Writer 원담당에 정확 데이터 계약 변경 범위와 사용자 승인을 구분해 요청한다.
