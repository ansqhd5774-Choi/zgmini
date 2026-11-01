# 미국 등락 지수 R29 — MarketParquet 전체주식 251거래일 제공 가능 범위 검사

대상: `ansqhd5774-Choi/zgmini` / `codex/us-breadth-public-r1-20261031`.

## 필요성

- R28 실제 PC 결과: 2025-10-31~2026-10-30의 251개 **기존 검색 경로상** `stock_daily` 파일 `localFound=0`, `localAuditShaMatched=0`, 공급자 호출 0. 이는 E: 전체에 원본이 없다는 뜻은 아니다.
- 기존 PC MarketParquet 저장 증거는 주로 `etf_daily`이며, R20에서 5개 `stock_daily` 원본은 별도 임시 Linux 공간에서 시험했다. ETF를 전체주식 약 6,500개와 동일시하지 않는다.
- [MarketParquet 공식 API 문서](https://marketparquet.com/documentation): `GET /api/v1/manifest/stock_daily?start&end` 한 번에 최대 400개 날짜, 무료 키 60요청/분. 공급자 manifest는 날짜·파일명·크기·서명 URL만 제공하며 검증 SHA는 없다.
- [공식 무료 1년 안내](https://marketparquet.com/guides/free-historical-stock-data): 무료 계정 접근 범위는 최근 1년으로 제한된다. 가장 오래된 2025-10-31이 실제로 제공되는지는 계정 응답에서만 알 수 있다.

## 실행과 안전 계약

독립 패키지 `ZGMINI_US_BREADTH_R29_MANIFEST_PROBE.zip`을 다운로드 폴더에 **완전히 압축 해제**하고 최상위 `US_BREADTH_R29_MANIFEST_PROBE.cmd`를 실행한다.

1. E: 전용 Node `E:\ZGmini\runtime\node.exe`만 사용한다. 기본 PATH/nvm-windows를 변경하지 않는다.
2. 실행 프로세스의 `ZGMINI_PC_HOME`은 문서화된 `E:\ZGmini\data\pc-writer`로 정한다. 기존 `MARKETPARQUET_API_KEY` 환경변수 또는 그 경로의 `providers.env`를 메모리에서만 읽는다. **키를 입력받거나 새로 저장하지 않는다.**
3. `--probe-only`는 **공식 HTTPS manifest 조회 1회**만 시도한다. 접근 가능한 251개 날짜와 누락 개수·최초 누락 날짜를 계산한다. 인증 401/403·429·HTTP/JSON 실패는 구분한다.
4. 서명 URL은 검증에만 메모리로 사용하고, 보고서에는 키·URL·인증 헤더·종목별 가격·파일 경로를 포함하지 않는다. **공급자 파일 다운로드 0, E: 쓰기 0, D1/원격 쓰기 0, 예약 작업 변경 0.**
5. 결과 TXT는 `다운로드\US_BREADTH_R29_MANIFEST_PROBE_...txt` 또는 폴더가 없다면 `%TEMP%`에 저장되며 메모장으로 열린다. ZIP 및 로그는 E:에 설치·저장하지 않는다.

## 다음 단계 분기

- `PROVIDER_YEAR_AVAILABLE`: 필요한 251일 원본 날짜가 모두 계정에 제공된다. **파일 내용·종목수·SHA를 아직 검증한 것이 아니며**, 별도 신규 R2 전용 원본 취득·보관·readback 계획부터 진행한다.
- `PROVIDER_YEAR_PARTIAL`: 부족한 실제 거래일 수/최초 날짜를 보고한다. 부족한 **전체 일봉 파일을 보합으로 만들지 않는다.** 사용자의 전일 개별종목 가격 미확보 보합 처리와는 다른 문제다.
- `PROVIDER_API_KEY_NOT_CONFIGURED` 또는 인증 실패: 무료 계정 구성과 제공 범위를 확인하되, 키를 채팅·로그에 공유하거나 무단 가입·구독·재시도하지 않는다.
- 어떤 결과도 신규 R2 발행, 운영 승인 manifest, 기존 R1/250거래일 이력 변경, Alpaca IEX 약 503종목 잠정치에 대한 검증 기준 변경을 허가하지 않는다.
