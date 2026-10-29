# 시장 캘린더 R51 — 미확보 Alpaca 주가 후보의 제한적 수집

- 저장소: `ansqhd5774-Choi/zgmini`
- 기존 작업 브랜치: `codex/ui-improvements` (다른 브랜치 생성 금지)
- 입력 근거: 2026-10-29 R50 PC 결과 `R50_BULK_AND_PRICE_READONLY_COMPLETE`. 캘린더 2,640티커, 기존 가격 246티커, 미확보 2,394티커, SEC 주식 수 후보와 가격 교집합 230티커.
- 공통 실행 규칙: [공통 CMD 실행 기준](https://github.com/ansqhd5774-Choi/zgmini/blob/codex/theme-fear-greed-integration-20261025/docs/CMD_EXECUTION_PLAYBOOK.md). 본문을 중복 복제하지 않는다.

## 실제 작업과 승인 범위

1. R50에서 검증된 캘린더 SQLite 읽기 전용 계약 및 **기존** `asset-r10-alpaca/incremental` 가격 스캔 함수를 재사용한다.
2. 새 계획 생성은 기존 2,640 티커에서 가격이 확인된 246 티커를 제외해 **PC 내부에만** 누락 티커 목록·SHA-256을 저장한다. PC 결과 수치가 달라지면 현행 실행 상태를 우선하고 STOP 원인을 판단한다.
3. 기존 승인된 `providers.env`를 로컬에서만 읽는다. `alpaca-incremental.mjs`의 Alpaca 인증 헤더·일봉 API·`feed=iex`·`adjustment=split` 계약을 재사용한다. R10 전용 수집기를 직접 호출하지 않아 R10 체크포인트·시계열에 영향을 주지 않는다.
4. 한 번에 최대 120티커(40티커씩 나눔), 최대 12 API 요청. 최근 종료 14일 기준 일봉으로만 조회하며 요청 사이 0.8초 간격을 둔다. 응답별 원본 JSON을 **별도 폴더에 먼저 저장**하며, 페이지 토큰·기존 저장 파일을 사용해 중단 지점에서 재개한다.
5. 응답에 포함된 티커·거래일·양의 종가·거래량·페이지 순환 여부를 검증하고 단일 티커별 가장 최근 일봉 후보를 별도 `rows` 파일에 원자적 신규 저장 후 readback한다.
6. **작업 PC 새 폴더 이외에는 쓰지 않는다.** 기존 R10 파일, PC SQLite, SEC ZIP, D1, 스케줄러, 계산 산식, 시총·별점·공개 UI는 변경하지 않는다. 허용 범위는 R51 원자료 저장 및 집계 결과 TXT 생성이다.

## PC 폴더와 실행 방식

- 승인 Node: `E:\ZGmini\runtime\node.exe`
- PC 원본: `E:\ZGmini\data\pc-writer`
- R51 원자료·이어하기: `E:\ZGmini\data\pc-writer\market-calendar-r51-alpaca\`
- 소스 ZIP에서 `MARKET_CALENDAR_R51_PREFLIGHT.cmd` 1회 실행 → `R51_PLAN_STAGED` 또는 `R51_EXISTING_PLAN_VALID` 확인 → `MARKET_CALENDAR_R51_COLLECT_ONCE.cmd` 1회 실행.
- 수집 성공 상태는 `R51_BATCH_STORED`다. 이는 최대 120티커의 **원본 주가 후보가 저장됐음**을 의미하며, 전체 2,394티커·기업 시가총액·별표 갱신 완료를 의미하지 않는다.
- 다음 chunk 진행은 결과 회수 후 판단한다. STOP 시 반복 실행·잠금 삭제·기존 파일 수정 금지. 단, 이전 원본 페이지가 보존됐음을 확인한 승인된 이어하기는 지원한다.
- 정상 결과 파일은 실행 ZIP을 푼 폴더에 생성되는 `MARKET_CALENDAR_R51_*_RESULT_*.txt`. 이 집계 파일만 대화로 전달한다. 개별 종목 가격 원본과 `providers.env`는 전달 금지.

## 안전/품질 경계

- Alpaca 기본 구독/IEX의 장내 거래 범위 때문에 티커별 가격이 없는 응답이 발생할 수 있다. 데이터 부재를 0달러로 취급하지 않는다.
- 기존 보유 가격을 덮어쓰지 않으며 R51 새 가격은 아직 등급 산정에 연결되지 않는다.
- `SEC CompanyFacts`는 발행 클래스 차원을 충분히 제공하지 않음. 다중 주식 클래스·ADR·분할·기준일 정합성, 시총 및 파생 표시 권리 검증은 다음 게이트로 남긴다.
- 429/403, 응답 스키마·티커·가격 불일치, 기존 계획 해시 불일치, 이전 배치 손상, 중복 실행 락, 누락 의존성은 STOP. 일시 오류에도 저장된 페이지는 삭제·초기화하지 않는다.
- R51은 자동 스케줄러 작업이 아니다. 운영 자동화는 원본 수집·발행 권리·클래스별 시총 연결이 검증된 후 별도 설계한다.

## 공식 근거

- Alpaca 다종목 역사적 일봉 API 및 페이지 토큰: https://docs.alpaca.markets/us/reference/stockbars
- Alpaca 제공 feed/요금제/호출 한도: https://docs.alpaca.markets/us/docs/about-market-data-api
- Alpaca 통합 거래소 시장 데이터 FAQ: https://docs.alpaca.markets/us/docs/market-data-faq
