# 스태그플레이션 S2.1 Shadow 계산 계약

독립 순수 계산 모듈 `lib/diagnostic-layer/stagflation-s21.mjs`는 저장된 월별 원자료를 입력받는다. 네트워크·DB 쓰기·스케줄러·공개 결과 연결은 없다. 운영 유동성 위기 및 12대 유동성 계산은 변경하지 않는다.

## 입력과 출력

`calculateStagflationS21({series, observationMonth?, sourceHash?})`.
series는 각 계열 ID별 `{observationDate: 'YYYY-MM-01', value: number}[]`이다. 저장 배치의 동일 CURRENT_VINTAGE 자료를 전달한다. 호출자는 sourceHash와 배치 이력을 관리해야 하며 함수 자체가 원자료의 provenance를 인증하지 않는다.

계열: PCEPI/PCEPILFE/INDPRO/DPCERA3M086SBEA/DSPIC96/PAYEMS/EXPINF5YR/MCOILWTICO.

출력은 방법론 버전, 재구성 정책, 기준월, 13개월 history, 최신 score, READY/PARTIAL, reasons다. READY는 해당 입력의 계산 완전성이며 Production 활성화·예측력 검증을 뜻하지 않는다. history 중 하나라도 계산 불가이면 최상위 score는 null이다. 결측 보간·가중치 재배분 없음. raw와 각 위험축, 절대 감소 여부를 별도로 반환한다.

## 산식

YoY=100×(X[t]/X[t−12]−1), 3개월 연율=100×((X[t]/X[t−3])^4−1).

- 물가축 I: 전체 PCE YoY 25%, 근원 YoY 35%, 근원 3개월 연율 40%. 각각 위험=100×clip((물가율−2)/4,0,1).
- 실물축 R: 생산 35%, 실질소비 40%, 실질소득 25%. 각각 3개월 연율의 이전 120개월 대비 하방 위험.
- 고용축 L: 고용 3개월 연율 70%, 최근 3개월 연율−직전 3개월 연율 30%, 모두 하방 위험.
- E: 기대인플레이션과 WTI YoY 상방 위험 50:50. 기대는 clip((수준−2)/2,0,1)을 곱하고 유가는 YoY≤0이면 위험 0.
- P=이전 120개월에서 현재값의 동률 중간 백분위. 하방 위험=100×clip((50−P)/40,0,1), 상방=100×clip((P−50)/40,0,1).
- D=.65R+.35L, J=min(100,sqrt(I×D)×(1+E/1000)).
- 안전 점수=100−(13J[t]+J[t−1]+J[t−2])/15. 높을수록 스태그플레이션 동시 위험이 낮음.

2~6% 경계·비중은 ZGMINI의 설계 기준이다. 공식 경제 위기 경계나 위기 확률이 아니다. 증가는 둔화와 공존할 수 있으므로 하방 위험을 수축이라고 표시하지 않는다.

## 기간·안전성

최신 공통 관측월 또는 명시한 과거 월까지만 계산한다. 월별 1년 재구성은 13점이며 120개월 정규화·변화율 lag·지속성 준비기간을 포함한 최대 147개월 원자료를 요구한다. 현재 개정치 재구성이지 과거 발표 당시 PIT 점수가 아니다. 과거 관측치가 개정되면 재구성 값도 바뀔 수 있다.

별도 Shadow 검산으로 실제 PC 저장 배치와 비교한다. 순수 모듈 추가만으로 운영 게시나 UI 전환은 실행되지 않는다. 현재 공개 `/api/market-score`의 overall은 CM-R1 12개 영역 가중합이며 구 진단 모델의 riskOverlay 최종값을 사용하지 않는다. 이번 독립 위험 카드 교체는 종합점수·12대 유동성 비중을 바꾸지 않는다. 구 riskOverlay 코드 존재만으로 현재 공개 감점이 적용된다고 해석하지 않는다.

## 공개 연결 준비와 활성화 조건

`worker/stagflation-projection.mjs`는 저장 macro 입력으로 별도 `detail:stagflation-risk:s21` 초안을 만들며 publicationAuthorized=false다. 기존 유동성 위기 key·이력에는 쓰지 않는다. 이 함수는 운영 writer/scheduler에 등록되지 않았고 D1 게시도 실행하지 않는다.

`/api/stagflation-risk-detail`은 해당 별도 key의 승인된 저장 결과만 읽는다. 방법론·13개월 연속성·범위·최신성 검사를 통과해야 한다. 공개 응답은 점수·축·감소 여부만 허용하며 raw 배열·hash·내부 오류는 공개하지 않는다. 조회 실패 시 새 지표 UI는 숫자를 거두며 옛 유동성 점수로 대체하지 않는다.

대시보드·위험 목록·신규 상세·기존 URL 리디렉션·사이트맵의 교체 코드는 준비 단계다. **현재 브랜치를 그대로 배포하면 새 저장 결과가 없어 대기 표시가 되므로 배포 금지.** 활성화 전 필요한 조건은 승인된 PC writer의 별도 key 게시·read-back과 배포환경 Runtime 검증이다. 별도 감점 정책 결정은 현재 공개 CM-R1 경로의 필수조건이 아니다. 기존 12대 유동성은 별도 key·페이지·산식 그대로다.

## PC 게시 연결 구현

`scripts/pc-writer/stagflation-publication.mjs`와 run-local의 opt-in 호출을 준비했다. `config.stagflationS21Publication===true`인 경우만 계산·게시 후보를 준비하며 기본은 DISABLED다. 현재 운영 config·source·scheduler를 변경하지 않았다. 새 코드를 배포하는 것만으로 PC 실행 코드가 갱신된다고 가정하지 않는다.

준비 함수는 최신 저장 macro 배치를 읽기만 하고 파생 13개월 점수·위험축·최소 메타데이터만 반환한다. 원자료 배열은 게시하지 않는다. 원격 게시 함수는 별도 key에 한 번만 제출하고 read-back하며, timeout 때 재제출하지 않는다. compare-and-swap 조건으로 동시 갱신을 보존한다. 신규 지표 준비/게시 실패는 독립 보고하고 기존 시장/Korea 게시를 막지 않는다.

로컬 실데이터에서 prepare 함수의 PREPARED, 13개월, 2026-08 점수 75.0673을 읽기 전용으로 검증했다. 이 검사에서 실제 config 활성화·DB 쓰기·원격 게시 없음.

컴포넌트 렌더링은 실제 소스와 저장 Shadow 결과를 사용한 분리된 Vite client preview에서 PC 1440/모바일 390을 확인했다. 양쪽 차트 1개, JavaScript 오류 0, document 폭과 viewport 폭 일치. 전체 Next/Cloudflare SSR preview는 별도 실행환경 오류·timeout이 남아 있으며 컴포넌트 확인을 SSR/Production PASS로 확대하지 않는다.
