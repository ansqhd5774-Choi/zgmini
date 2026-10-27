# 우주·위성 R15 — 9개 후보 전수 PC 점수 검사 (읽기 전용)

작업일: 2026-10-25. 브랜치 `codex/theme-fear-greed-integration-20261025`, Draft PR #714.

## PC R14 실제 완료 확인

사용자 제공 `SPACE_SATELLITE_R14_MISSING_ONLY_RESULT.txt`: `PRIVATE_MISSING_ONLY_RAW_COLLECTION_COMPLETE`.

- 무료 GET **6회**, 신규 원본 **6파일**, 완료 WARP/ORBX/MARS/ARKX/DIPR/WSPC, 미완료 0.
- 기존 manifest 5개 항목 → 11개; 기존 파일 재작성 **0**. UFO/NASA/ROKT 원본 및 ARKX 과거 이력 보존.
- `publicWrites=0`, `d1Writes=0`, `schedulerWrites=0`, `rightsVerified=false`, `publicationAuthorized=false`, `r2ScoresVerified=false`. 수집 성공은 점수 검증이나 공개 승인과 다르다.

## R15의 목적과 엄격한 경계

1. 후보 9종 UFO/NASA/WARP/ORBX/MARS/ARKX/ROKT/DIPR/WSPC **전부 검사**. 2개·3개 상한을 신설하지 않는다. 코드는 임의 길이의 합법적 ETF 티커 후보 목록도 수용하며, 이 단계에서 최종 바스켓을 선정하지 않는다.
2. R13의 manifest·모든 ETF raw 파일의 SHA, 공유 데이터센터·전력 SPY의 manifest/SHA/뉴욕 15시 거래일을 읽기 전용으로 재검증한다. 두 번의 manifest 변경 검사를 통과해야 한다.
3. 기존 승인 R2 계산기(`scoreAdaptiveTimeline`)를 **변경 없이** 각 ETF별로 SPY와 실행한다. 40/377/628 관측일 경계, R188 추세·상대강도·변동성 40:20:40 축은 고정한다.
4. 차트 표시는 최근 SPY 유효 거래일 **최대 252개**만 유지하되, 신생 ETF의 미관측 날짜를 채우지 않는다. 유효한 스코어 날짜 수/결측 날짜 수·이력 SHA만 출력한다.
5. 최근 ETF 원본이 SPY보다 낡거나 유효 공통 관측일이 부족하면 **현재 점수를 null**로 표시한다. 과거 점수는 `lastHistoricalIsNotCurrent=true`로 분리하며 현재값으로 사용하지 않는다.
6. 자산규모(AUM) 상대 가중치는 별도 최신 소스와 계산 경로 검증 전 **합산하지 않는다**. 이번 결과는 구성 ETF 개별 스코어와 유효성 감사만이며 `aggregateScore=null`, `finalBasketSelected=false`다.
7. GitHub에 PC 원본 가격·키 업로드 금지, 무료/상업/파생 데이터 권리 확인 전 공개 금지. 기존 9개 운영/10번째 산식·D1·DB·스케줄러·Cloudflare·main 변경 금지.

## PC 직접 실행

1. Desktop의 빈 폴더에 R15 ZIP(실행 CMD 1개 + SHA 고정 MJS 8개)을 압축 해제한다.
2. `theme-space-satellite-r15-all-etf-score-audit.cmd`를 직접 실행한다. Node는 `E:\ZGmini\runtime\node.exe`, 읽기 대상은 `E:\ZGmini\data`.
3. CMD 파일 옆 `SPACE_SATELLITE_R15_ALL_ETF_SCORE_RESULT.txt`를 보내준다. 이 로그에는 전체 원본 시세는 포함되지 않으며 개별 점수·날짜·SHA/결측 수만 포함된다.
4. 점검 실패는 `BLOCKED`로 종료하며 SHA 오류, 스냅샷 충돌, 점수 계산 실패의 원인을 확인한다. 원본 재수집·삭제·체크포인트 초기화로 임의 해결하지 않는다.

R15은 네트워크 호출 **0회**, PC data writes **0회**, public/D1/scheduler writes **0회**다. R15 실제 PC 로그가 오면 유효 9개별 N/점수/결측을 검토하고 이후 **AUM 다원 실측·권리 게이트 및 동시점 혼합 방법**으로 진행한다. 점수 전부가 단일 값에 일치할 필요는 없으며, 관측 가능 여부를 각각 판정한다.

공급원 기술 참고: [GetMarketHistory API reference](https://getmarkethistory.com/docs/api/reference) — 무료 1h 분봉에서 얻은 비공식 15시 NY 프록시, 공식 종가와 동일하다고 표기하지 않는다.
