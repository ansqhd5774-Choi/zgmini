# 15단계 04단계 — 잠정치 우선 실시간 F 입력기 R6 실측

> 기준일: 2026-10-25 KST  
> 상태: `READER_CODE_PRESENT / UNIT_TEST_5_OF_5_PASS / LIVE_F_9_OF_9_HTTP_PASS / READ_ONLY / NO_TRADE`  
> 목적: 저장된 과거 공포·탐욕 점수를 현재 F로 오인하는 회귀 오류를 차단.

## 1. 실제 코드와 검증

- `stage04/latest-f-readonly.mjs`: 유일한 공개 GET `https://zgmini.kr/api/theme-fear-greed`을 실행하며 콘솔에만 결과를 출력. 로컬 쓰기, DB, 스케줄러, 사이트, 주문, 지수산식 변경 없음.
- `stage04/latest-f-readonly.test.mjs`: Node 직접 실행으로 **5/5 PASS**:
  1. 최신 바이오 잠정 22.63294 선택, 10/21 확정 29.03175 비교용 분리.
  2. 응답 전체 `phase=PROVISIONAL`이 다른 8개 테마를 자동 잠정으로 만들지 않음.
  3. 관측일이 같으면 유효 잠정치를 선택.
  4. 미래 날짜·잘못된 날짜·범위를 벗어난 점수는 배제.
  5. 유효하지 않은 기본 점수는 `null/UNAVAILABLE`로 보고, 0점으로 만들지 않음.
- 실제 API 호출 **PASS**: 2026-10-25T10:33:36.811Z 실행 `status=LIVE_F_OBSERVED`, 9/9 테마 값 존재, `sourceStoredAt=2026-10-25T05:00:27.721Z`, 관측일은 10/23.
- 이 개발 실행 환경은 HTTPS 프록시가 있으므로 **직접 Node fetch 시 `fetch failed`**, 환경 프록시를 명시한 `NODE_USE_ENV_PROXY=1 node ...`로 실제 GET/파싱 PASS. 이는 **개발 호스트의 프록시 설정 차이**이며 사용자 Windows Node 성공을 의미하지 않는다. Windows 실행은 별도 실측 대상. 사용자 PC 설정을 변경하지 않았다.

## 2. 결과 계약

각 테마: `currentInput`(0..100 실수 또는 `null`), `observationDate`, `phase`(`PROVISIONAL`/`BASE_OBSERVED`/`UNAVAILABLE`), `priorBaseForComparison`, `sourceObservationMayLag`.

- 동일 테마가 기본 관측과 잠정 관측을 모두 가지면 **날짜가 최신인 유효값**을 선택한다. **같은 날짜에는 잠정 우선**.
- 잠정이 최신이면 이전 기본값은 `priorBaseForComparison`에만 저장. 기본 상태가 최신이면 그 관측일을 있는 그대로 표시한다.
- API 마지막 관측일과 GET 실행일이 달라 표시되는 `sourceObservationMayLag`는 **단순 시간 차이**, 거래일 주말을 고려한 자동 실패나 임의 신선도 임계값이 아니다.
- 상위 응답의 `sourceStoredAt`은 자료 저장시간이지 F 시장 관측일이 아니다.
- API 실패·누락에서는 절대로 전날 저장 파일·상수 점수를 가져와 `LIVE_F_OBSERVED`라고 보고하지 않는다.
- **이 실행기는 F 입력 검사만** 수행한다. 04단계 G/D/M 산출·테마 매력 순위·산업 통계 입력은 하지 않는다. `m2/M2_STAGE4_SELECTION.json`을 덮어쓰지 않는다.

## 3. 앞으로의 진행

1. R6 검사기로 최신 테마 F를 가져온 다음 R4의 9개 산업 공식 관측 데이터 계약과 **관측일별로 독립 연결**한다.
2. 역사 정규화/가중치가 미승인인 04단계에서는 **D/M/정식 선정 결과를 출력하지 않는다**.
3. 증거 검증: `node research/investment-15-stage/stage04/latest-f-readonly.test.mjs` (오프라인 테스트), `node research/investment-15-stage/stage04/latest-f-readonly.mjs` (사용자 환경에서 네트워크가 정상일 때만 읽기 전용 실행).
4. 기존 03단계 통과 ETF 9개, 공탐 데이터·산식·DB, GitHub main, Cloudflare, 운영 스케줄러, DNS, 주문 기능 모두 불변.
