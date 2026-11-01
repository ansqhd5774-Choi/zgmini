# 미국 등락 지수 — IEX 장중 잠정치 R17

## 독립 계약

- **확정치:** 기존 MarketParquet, 기존 98% 소스 감사, `public:market-breadth-r1:usa` 및 일별 250거래일 이력을 그대로 사용한다. R17은 이 코드·키·원자료를 수정하지 않는다.
- **잠정치:** 기존 저장된 직전 정규장 S&P 500 구성 명단을 사용하되, 가격 비교 양쪽은 **Alpaca IEX의 분할 보정(`adjustment=split`)** 자료로 한정한다. 직전 거래일 `1Day` 종가와 당일 마지막 완료 `15Min` 종가를 비교한다. MarketParquet 확정 가격이나 방향 일치율을 참조하지 않는다.
- 잠정치 집계는 관측·비교 가능한 종목만 `상승/보합/하락`으로 분류한다. `관측 = 상승+보합+하락`, `미관측 = 전체-관측`. 전일 IEX 종가가 없거나 당일 IEX 15분봉이 없으면 미관측이다. 당일 가격 관측 수, 전일 기준가격 관측 수, 최근 30분 관측 수도 각각 보관한다.
- `98%`는 잠정치 적격성 기준이 아니다. 100/503만 비교되면 그 100종목의 집계와 미관측 403을 그대로 게시한다. 단일 거래소 IEX의 일부 관측값을 미국 전 거래소의 전체 시세로 주장하지 않는다.

## 수집·저장·계산

1. 기존 PC Core 예약 실행기(기본 5분)를 재사용한다. 뉴욕 정규장 영업일의 09:46~16:14 사이, **완료된 15분 구간당 한 번만** 수집한다. 구간 종료 후 1분의 정착 여유를 둔다. 휴장·개장 전·장 마감 후 신규 잠정치 수집은 없다. 조기 폐장은 이 최초 계약에서 별도 거래소 캘린더가 없어 정규 시각대로 처리하므로, 실제 조기폐장 자료는 마지막 관측 시각을 통해 식별해야 한다.
2. 기존 `core.sqlite`의 직전 완료 거래일 S&P 500 구성 목록을 **읽기 전용**으로 조회한다. 이전 IEX 1Day 봉은 같은 거래일·구성 목록이고 페이지 완결이면 다음 15분 갱신에 재사용한다.
3. Alpaca IEX `1Day`/`15Min` API에서 `next_page_token`을 끝까지 추적한다. 한 구간 최대 **24회** 공급자 요청을 공유하고 재시도 없이 종료한다. 남은 페이지가 있으면 공개 결과에 `collectionStatus=INCOMPLETE_PAGINATION`을 기록한다. 이 상태는 수집 편향 가능성을 뜻하며, 미관측 종목을 임의 분류하거나 완전 수집으로 표시하지 않는다.
4. PC 로컬 단일 지속 파일 `local-us-breadth-iex-provisional.json`에 **IEX 원자료 최신 종목봉을 먼저 저장·재조회**하고, 저장 자료에서 잠정치 집계·검증 후 같은 파일의 `output`을 원자적으로 갱신한다. 반복 실행마다 결과 파일을 추가 생성하지 않는다. 수집 실패 시 마지막 유효 output을 보존하고 해당 15분 구간 내 반복 호출을 막는다.
5. 계산기 `run-local.mjs`는 공급자 네트워크 접근을 계속 차단한다. 최신으로 검증된 잠정치 집계만 기존 D1 `market_public_snapshots_v1` 테이블의 **별도 현재 키** `public:market-breadth-provisional-r1:usa`에 게시하고 본문을 재조회한다. 원시 가격·구성 명단은 D1에 보내지 않는다. 잠정치 과거 일별 키나 250거래일 이력은 생성하지 않는다.

## 공개 Reader와 UI 경계

- 기존 `/api/market-breadth?market=usa`는 **확정치 전용**으로 유지한다.
- 신규 `/api/market-breadth?market=usa&phase=provisional`은 저장된 잠정 집계만 반환한다. 현재 뉴욕 장중 수집 창과 맞지 않거나 마지막 구간에서 30분 이상 경과하면 HTTP 503(신선도 부족)을 반환하며, 오래된 잠정치를 최신인 것처럼 내보내지 않는다.
- 잠정 응답: `phase=PROVISIONAL`, `source=ALPACA_IEX_15MIN_SPLIT`, `referenceSource=ALPACA_IEX_1DAY_SPLIT`, `observationDate`, `slotEndUtc`, `collectedAt`, `counts`, `expectedCount`, `observedCount`, `missingCount`, `sessionPriceObservedCount`, `referenceObservedCount`, `freshWithin30m`, `collectionStatus`.
- 공개 화면의 `잠정`, 관측/전체·미관측·뉴욕 기준 시각 표시는 UI 전용 기존 브랜치 `codex/ui-improvements`에서 별도로 구현한다. 현재 브랜치의 API 준비가 곧 UI 배포 완료를 뜻하지 않는다.

## 검증/설치 경계

- 테스트는 가짜 API 응답으로 페이지 종료·미완결·100/503 관측·실패 보존·15분 동작·별도 키 readback·확정치 회귀를 점검한다.
- 실제 Windows PC의 E: 원자료·운영 SHA·등록 작업·Alpaca 인증·D1 게시와 Cloudflare Production 동작은 **아직 검증되지 않았다.** GitHub 브랜치 커밋 자체는 설치·예약 갱신·공개 배포가 아니다.
- 새 DB 스키마·Cloudflare Cron·추가 예약 작업·새 유료 API·대량 원자료 공개·일회성 로그 축적을 하지 않는다.
