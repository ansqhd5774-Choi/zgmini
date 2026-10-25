# 우주·위성 R18 실측 → R19 ETF 구성변경 효과 분리 (비공개)

2026-10-25. GitHub 전용 `codex/theme-fear-greed-integration-20261025`, Draft PR #714. **출시/병합 미승인.**

## R18 실제 사용자 PC 검증

- 사용자 제공 `SPACE_SATELLITE_R18_VARIABLE_BASKET_RESULT.txt`: `PHASE=ALL_CODE_SHA256_VERIFIED`, `RESULT=PRIVATE_UNLIMITED_COUNT_BASKET_SHADOW_NO_OPERATION_CHANGE`.
- 원본 9개 ETF manifest SHA `1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b`; 공유 SPY SHA `76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e`.
- `R4-A_RELATIVE_MATURITY_UNAPPROVED`; 최근 252 SPY 관측일 중 **실제 비공개 합성점수 252일**. 원 가격 보간 0·오래된 점수 재사용 0·자료 공급원 GET 0·공개/D1/스케줄러 쓰기 0.
- 252일 날짜별 실제 참여 ETF 수: 2종=98일 / 3종=31일 / 4종=18일 / 5종=40일 / 6종=23일 / **7종=42일**. 날짜별 명단이 가변이며 252일을 동일 구성으로 해석하지 않는다.
- ETF별 실제 점수 기여일: UFO 252, NASA 105, WARP 79, ORBX 49, MARS 123, ARKX 252, ROKT 133, DIPR 0, WSPC 0. **ORBX 과거 49일 참여는 현재 점수로 간주하지 않음**.
- 2026-10-23 **제안형 비공개 점수 42.38768**, 실제 최신 참여 6종: UFO 34.88492 / NASA 48.90703 / WARP 60.52650 / MARS 47.76741 / ARKX 31.69048 / ROKT 44.09211.
- 최신 R4-A *비공개 가중치* 21.3228 / 12.0839 / 11.2953 / 12.6525 / 21.3228 / 21.3228% (상기 동일 순서). `sum(w)=100.0001%`는 네 자리 출력 반올림 차이.
- R18 개인 PC 검산의 시계열 digest SHA `94011b38f4d31cf21b74eac36b988a0a2565c34bf2b2e5522dc27106ac4d1216`. R19가 같은 결과를 강제 확인.

## R19 목적과 정량 분석

날짜별 점수 변화에는 시장 움직임뿐 아니라 **점수 산출 가능한 ETF 구성이 추가/제외되는 효과**가 섞인다. 승인하지 않은 점수를 운영에 넣기 전에 이 둘을 분리한다.

이웃 날짜 `t-1`, `t`에 2종 이상의 공통 ETF `I`가 있으면 다음을 계산한다.

1. 기존 R18 조합 점수 `F(t-1,A)`, `F(t,B)`.
2. 양일 공통 ETF의 **그날 실제 R2 점수**로 각각 `F(t-1,I)`, `F(t,I)`.
3. 공통 ETF 내부 변동 = `F(t,I)-F(t-1,I)` (실제 ETF 점수 변화 + 기존 제안 가중치의 성숙도 변화 포함).
4. ETF 구성변경 효과 = `[F(t,B)-F(t,I)]+[F(t-1,I)-F(t-1,A)]`.
5. 두 효과 합은 원래 날짜간 점수차와 정확히 일치해야 한다. 참가 ETF가 동일하면 구성효과는 0이다.

공통 ETF가 0~1종뿐인 이웃 날짜는 **임의로 단일 ETF 테마점수를 만들지 않고**, 수치 기여 분리 불가로 집계한다. 이 경우 과도한 AND 실패/전체 분석 중단 없이 경계만 알린다.

R19 요약 출력:

- 251개 이웃 날짜의 구성 유지/변경 건수, 겹침 부족 건수.
- 상장/원본 충족으로 새로 들어온 ETF와 빠진 ETF의 실제 날짜별 등장/이탈 횟수.
- 구성변경 효과 절대값 분포(중위/90분위/최대), 공통 ETF 변동 대비 우세 횟수, 상쇄 방향 횟수.
- 가장 큰 이벤트 상위 8건만 날짜/등장·이탈 ETF/분해 수치를 요약. 전체 일별 가격·점수 배열은 출력/저장하지 않음.

## 작업 경계

- R19는 **R18의 검증된 데이터/점수 시계열을 같은 실행 프로세스 메모리에서만 재사용**한다. R18 CLI 출력은 기존과 동일하고, 추적 자료는 R19 모듈 내부에만 제공한다.
- 9개 후보 전부 유지, ETF 개수 제한 없음, 기존 NY15 또는 승인 조기폐장 NY12 실봉만 사용. 새 Provider 호출/원본 저장 없음.
- `scripts/pc-writer/theme-space-satellite-r19-composition-effect.mjs` 및 Windows CMD와 테스트 추가. R18 내부 비공개 trace 옵션 추가 후 R18 CMD SHA pin도 새 코드로 갱신. 기존 사용자 R18 배포 ZIP 원본은 **그대로**, 과거 실측 digest는 불변.
- Windows Desktop에서 R19 ZIP **11개 MJS + CMD =12파일** 동일 폴더에 해제 후 `theme-space-satellite-r19-composition-effect.cmd` 실행. 로그는 CMD 옆 `SPACE_SATELLITE_R19_COMPOSITION_EFFECT_RESULT.txt`.
- 원가격·R2·R188·R4-A 식·운영 9개 테마·D1·DB·스케줄러·main·Cloudflare **변경 금지**, 사용자 승인 전 게시·최종 편입·선정 점수로 사용 금지.
- 이후 구성변화 효과를 토대로 R4-A 사용자 승인 여부와 ETF 공식 발행사 holdings/AUM/중복 및 원가격 파생 공개 권리를 **별도** 검토한다. `rightsVerified=false`, `finalBasketSelected=false` 유지.

출처: [GetMarketHistory 1h 실관측 봉/갭 정책](https://getmarkethistory.com/docs/api/reference), [NYSE 정규 거래시간](https://www.nyse.com/trade/trading-information), [원시 가격 재배포 제한](https://getmarkethistory.com/docs/terms).

## 2026-10-26 사용자 PC R19 실측 결과 — 실제 완료

- 제출된 `SPACE_SATELLITE_R19_COMPOSITION_EFFECT_RESULT.txt`: `PHASE=ALL_CODE_SHA256_VERIFIED` / `RESULT=PRIVATE_COMPOSITION_EFFECT_ONLY_NO_OPERATION_CHANGE`.
- 9 ETF 원본 manifest SHA `1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b`, 공유 SPY manifest SHA `76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e`, R18 추적 digest `94011b38f4d31cf21b74eac36b988a0a2565c34bf2b2e5522dc27106ac4d1216`가 이전 결과와 **그대로 일치**.
- 252개 비공개 점수의 인접 251일: **전부 정확히 분해 가능**(251/251). ETF 구성이 다른 전이 **8건**, 동일한 전이 **243건**, 최근 21개 전이 중 구성 변경 **1건**. 구성 효과가 공통 ETF 내부 변동보다 절대값상 큰 경우 **0건**. 효과가 서로 반대 방향인 경우 **5건**.
- 구성변경 절대 효과의 중앙값 **0점**, 90분위 **0점**, 최댓값 **4.05108점**. 가장 큰 2026-03-16→17의 ROKT 진입: 구성 −4.05108 / 공통 ETF 움직임 +6.88912 / 실제 총변동 +2.83804점. 2026-09-02→03 ORBX 이탈: 구성 −2.79399 / 공통 +4.89477 / 실제 +2.10078점.
- 구성효과 절대합 15.65385, 공통 ETF 변동 절대합 1102.084, 실제 총변동 절대합 1094.4036. **세 절대합은 항별 방향 상쇄가 있으므로 단순 가산하거나 '구성 1.43% 기여'로 단정하지 않는다.**
- 실제 10/23 비공개 점수 **42.38768**, 기여 ETF 6개, 9개 후보 그대로. 다른 시간봉 보충/보간/재수집 0. `providerCalls=0`, `rawFilesWritten=0`, `d1Writes=0`, `publicWrites=0`, `schedulerWrites=0`.
- **해석 경계:** 이 결과는 관측된 252일에 한정해 날짜별 ETF 진입·이탈 영향이 시장 공통 변동보다 지배적이지 않았다는 증거다. **R4-A 가중치 타당성·테마 순도·ETF 보유 종목 중복·공개 권리**를 검증/승인한 증거가 아니다.
- 다음 R20 발행사 원자료 검토: `docs/THEME_SPACE_R20_ISSUER_HOLDINGS_RISK_20261026.md`. `weightsApproved=false`, `rightsVerified=false`, `finalBasketSelected=false`, `publicationAuthorized=false`.
