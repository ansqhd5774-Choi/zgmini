# FSC 제한형 지표 계약

로컬 구현 기준: 50bb546b6be494831c652f692770bbe8f608008b. UI 변경 없음.

기존 `/api/internal/phase2-korea-history-check`만 서버에서 FSC_SCOPED_INDICATORS_V1 / fsc-scoped-1을 실행한다. query는 400, POST는 405, 만료 2026-10-11T00:00:00Z부터 410을 유지한다. 15분 isolate 캐시·동시 요청 제한은 기존대로이며 전역 rate limit이나 인증 검증을 의미하지 않는다.

`runHistoryResearch`는 그대로 보존되어 fixture 회귀가 가능하지만 HTTP 분기로 복귀할 입력은 없다. 새 handler 클로저 캐시에는 새 allowlist 출력만 저장하고 profile/version을 검사한다. 다른 source cache를 삭제하지 않는다.

| 출력 | 계약 |
|---|---|
| profile / analysisVersion | 서버 고정값 |
| indicators.credit | LEV_BLEND20_60, 20/60 변화 percentile의 0.6/0.4 혼합; 최소 312 관측 |
| indicators.capital | 경계 이후 L3 후행 평균, 252 percentile; 최소 254 관측; 높을수록 압력 높음 |
| score | 최신 입력일 계산이 가능하고 source fetch complete인 경우만 number; 아니면 null |
| status | WARMUP / MISSING_WINDOW / SOURCE_INCOMPLETE / CALCULATION_READY |
| unit / unitSource | null; 금액 단위 추정 없음 |
| sourcePublishedAt | null |
| fetchedAt | operation 원자료 수신 완료 시각; 수신이 없으면 null |
| calculatedAt | 계산 실행 시각; 캐시 읽기로 변경하지 않음 |
| historyMode | RECONSTRUCTED_CURRENT_VINTAGE |
| pointInTimeVerified / historicalVintageVerified | false |
| compositeScore / finalWeights | null |
| compositeStatus | NOT_IN_CURRENT_SCOPE |
| rightsAllowedForSelectedSource | 기존 FSC 공식 카탈로그 근거; 제외된 BOK 권리 판정과 분리 |
| scopeImplemented | true |
| calculationReady | 두 최신 지표의 수학적 계산 가능 여부 |
| runtimeVerified / releaseReady | false; 이번 로컬 검증이 변경하지 않음 |

출력에는 전체 원자료·전체 점수 이력·BOK 파생 결과·상관·grid가 없다. 코드 `SCOPED_COPY`가 향후 UI 설명 계약이며 화면에는 연결하지 않는다. 개별 점수의 min/max 요약만 제공하고 원자료 분포 값은 노출하지 않는다.

파서는 기존 analyzeSeries를 재사용한다. 파서가 제거하는 알려진 결측·충돌 날짜를 null 슬롯으로 복원해서 rolling 창이 건너뛰지 않도록 한다. 정의 경계는 이 단계 전 적용한다. 원래 연구 파서와 연구 함수는 변경하지 않는다. 날짜가 없는 원자료로 공식 캘린더 결측을 만들어내지 않는다.

상승·하락 단조 fixture의 마지막 rank=100/0, 상수 rank=50을 독립 기대값으로 확인한다. 253/254 경계, pre-cutoff 불변성, 알려진 결측, 중복·충돌, 미래 관측, BOK 미호출, 출력 allowlist, 캐시·method/query/만료도 검사한다. 기존 HTTP fixture의 요청 기대치만 3→2로 바꾼다(CMA 제외).

기존 V69/V70 회귀·UI HTML workerd 검사를 유지한다. 실제 금융 API·운영 endpoint 호출, push·배포·외부 시스템 변경은 이 작업에서 수행하지 않는다.

검사 결과 (2026-09-11): 기존 276 + 신규 24 = 300/300 PASS. vinext build, TypeScript --noEmit, 변경 Worker 구문 검사, 전체 Worker entry esbuild route compile, git diff --check 통과. 명시 파일의 credential 패턴 검사 발견 없음; fixture에서 원자료·비밀값·전체 이력 미노출 확인. 테스트는 outbound stub을 사용하며 금융 API runtime 검증이 아니다. 빌드의 기존 middleware deprecation 경고는 변경하지 않았다.
