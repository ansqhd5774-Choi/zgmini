# 미국 등락 지수 — MarketParquet 신규 1년 이력 원자료 무변경 인벤토리 R22

작업 브랜치: `codex/us-breadth-public-r1-20261031`. 신규 R2 전체시장 확정치 프리뷰 전용 보조 검사이다.

## 목표

기존 확정치 250거래일 기록을 재작성하거나 복제하지 않고, 새 R21 **전체 주식 250거래일 차트**를 계산하는 데 필요한 서로 인접한 MarketParquet 원자료 **251거래일분**이 PC의 승인된 운영 저장 위치에 실제 존재하는지 확인한다.

## PC에서 읽기 전용으로 실행

```cmd
node scripts/pc-writer/us-breadth-confirmed-year-inventory-r22.mjs --inspect
```

- `ZGMINI_DATA_ROOT` 미지정 시 기존 운영 기록의 `E:/ZGmini/data`를 사용하고 `ZGMINI_PC_HOME` 미지정 시 기존 사용자 홈의 `.zgmini/pc-writer`를 사용한다. 환경변수만으로 실제 운영 경로를 확정하지 말고 기존 설정·접합점(junction)을 확인한다.
- 새 폴더, 파일, 로그, DB, 예약 작업, D1, API 호출을 만들지 않는다. JSON은 **표준 출력**으로만 반환한다. 원자료 종목별 가격과 키를 출력하지 않는다.
- 승인된 `theme-market-history-r131/marketparquet-r165`, `-r167`, `raw`, `marketparquet`, `pc-writer`, `ZGMINI_PC_HOME` 등 **기존 운영 경로**에서 날짜별 정해진 `stock_daily` 이름만 검사한다. E: 전체 재귀 탐색은 하지 않는다.
- 뉴욕 시장 달력에서 최근 종료 거래일부터 250개 거래일을 역산해 **251개 날짜**를 생성한다. 휴장일을 누락 파일로 잘못 표시하지 않는다.
- 실제 Parquet 파일이 발견되면 파일 크기·매직 바이트·SHA256 및 기존 날짜별 `.audit.json`의 SHA·source·complete 일치를 확인한다. 감사 파일 부재·파일 손상·SHA 불일치·동일 날짜의 중복 경로를 구분해 보고한다. 루트 경로를 벗어나는 심볼릭 링크는 거부한다.

## 증거 해석

| 결과 | 의미 | R21 전체 1년 계산 승인 여부 |
| --- | --- | --- |
| `LOCAL_YEAR_INVENTORY_INCOMPLETE` | 보관일/감사 기록/로컬 무결성 중 결함 존재 | 불가 |
| `LOCAL_YEAR_INVENTORY_COMPLETE_PROVIDER_UNVERIFIED` | 251일 파일과 기존 로컬 감사 SHA가 모두 일치 | **아직 불가** |
| `providerAuthenticityVerified=false` | 다운로드 공급자·일별 완전성의 독립 원장은 미검증 | 출처 검증 별도 필요 |
| `approvedR21ManifestEntries=null` | 단순 파일 재해시로 R21의 `complete:true` 원장을 생성하지 않음 | 검증된 원장 확보 후 진행 |

핵심: 로컬 파일을 해시하고 바로 그 해시를 새 `complete:true` 원장으로 만드는 방식은 **독립 검증이 아니다**. 기존 `.audit.json`과 해시가 일치해도 MarketParquet 원본 파일의 진위나 251일 전체 다운로드 완전성을 보장하지 않는다. 독립 승인된 공급자 원장이 확인되면 R21의 `prepareFullMarketYearPreview` 입력에 기존 실제 파일 경로·원장 해시를 연결하는 후속 작업을 진행한다.

## 기존 운영 보호

- 기존 `public:market-breadth-r1:usa` 및 `...:YYYY-MM-DD` 250거래일 기록과 R2 staging 키를 읽거나 쓰지 않는다.
- 장중 Alpaca IEX 약 503개 잠정치와 전체 확정치 R2 약 6,500개를 혼합하지 않는다.
- 98% 확보 게이트·잠정/확정 방향 일치율을 잠정치에 강제하지 않는다. 새 R2에서 전일 가격 미확보는 **사용자 승인에 따라 보합 간주**, 그 수는 별도 기록한다.
- 본 검사는 PC 실행 또는 연간 실데이터 확보의 **코드 준비**일 뿐, 실제 PC에서 실행했다고 보고하지 않는다.
