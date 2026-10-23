# 양자컴퓨터 QTUM 신규 테마 — E: 보존 및 게시 전 단계 R1

## 판정

GitHub 코드 준비 단계. **PC 설치·정기 작업·Cloudflare D1 게시·공개 UI·다음 정규 실행은 미검증**이다.
기존 7개 테마, AI·반도체, 바이오의 수집·계산·작업·D1 키·산식·가격을 수정하지 않는다.
R9에서 확인한 QTUM 단일 ETF(기준 SPY) 및 기존 R158의 T40/R20/V40만 사용한다.
한 테마 실패가 다른 테마를 차단하지 않게 독립 데이터 홈과 향후 독립 작업을 쓴다.

## 운영 파일 위치

| 구분 | 영구 위치 / 계약 |
|---|---|
| 코드 | GitHub `scripts/pc-writer/theme-quantum-stage.mjs` |
| PC 원자료 | `E:\ZGmini\data\themes\quantum-computing\raw\` |
| 원자료 목록 | `E:\ZGmini\data\themes\quantum-computing\raw-manifest.json` |
| 비공개 후보 | `E:\ZGmini\data\themes\quantum-computing\derived\` |
| 체크포인트/잠금 | `E:\ZGmini\data\themes\quantum-computing\state\` |
| 증거 | `E:\ZGmini\data\themes\quantum-computing\evidence\` (향후) |
| 제안 정규 작업 | `ZGMINI-PC-Theme-Quantum-ETF` — **미설치**, 시간·주기 승인 보류 |
| 공개 D1 예약 키 | `public_feed_snapshots_v1`, `kind=output`, `feed_key=theme-quantum-optional-r1`, `snapshot_key=current` — **미기록** |
| 공개 경로 | `/api/theme-fear-greed` — **미연결** |

원자료 경로는 `ZGMINI_DATA_ROOT=E:\ZGmini\data`로 전달한다. Desktop/ZIP/임시 파일은 입력 수단일 수 있으나 원자료의 운영 사본이 아니다. `raw-manifest.json`은 **실제 수집·저장 후에만** 작성되며 파일별 상대경로·SHA256·출처·수집 시각·관측 시작/끝·가격 모드·스키마를 기록한다. 빈 manifest, 가짜 가격 또는 과거 D1 결과를 원자료로 재구성하지 않는다. 기존 경로/junction을 지우거나 C: 대체 데이터베이스를 만들지 않는다.

## 코드 기능 및 제한

`theme-quantum-stage.mjs`는 외부에서 이미 획득한 JSONL 1시간봉을 E:에 불변 파일로 가져오는 `--ingest`와 기존 R188 방식으로 **비공개** 252점 후보를 계산하는 `--prepare`를 제공한다. 자동 다운로드, 스케줄러 설치, API/D1 쓰기, 운영 배포를 수행하지 않는다.

현재 받아들이는 원자료 모드: `RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE`; 스키마 `GMH_NDJSON_1H_COLUMNS_V1`. QTUM/SPY 두 파일과 최소 628개 정렬된 공통 실제 거래일이 없으면 252개 **완성 점수 후보**를 만들지 않는다. 이전 R9의 92개 미성숙 점수는 0이나 완성 점수로 채우지 않는다. 기존 R158 마지막 3점 재계산 차이가 `1e-9`를 넘으면 중단한다.

현 R188 조기폐장 달력은 과거 범위만 검증됐으므로, 신규 실행 전 거래소 달력의 미래 적용 범위를 별도로 검증한다. R10에서는 2026-10-19~21 QTUM/SPY 종가 대용값 6개가 참조 종가와 달랐으며, R11 민감도 분석도 공식 종가 검증을 대체하지 않는다.

GetMarketHistory 원문 약관: https://getmarkethistory.com/docs/terms
무료 비로그인 빠른 시작: https://getmarkethistory.com/docs/quickstart
QTUM 발행사: https://www.defianceetfs.com/qtum/

**무료 조회 가능, 계정 조건의 라이선스, 상업적 파생 배포 권리는 서로 다른 판정**이다. 비로그인 파생 배포 권한은 독립적으로 확인되지 않았다. 가격 품질·이력·권리 확인 전 `publicationAuthorized=false`이며 공개 게시기·Reader를 연결하지 않는다.

## PC 적용 단계(향후 승인/권리·가격 게이트 통과 후)

1. GitHub 최신 `main`과 PC 승인 실행 SHA를 비교하고, E: 데이터 루트의 실제 위치/권한을 확인한다. 승인되지 않은 코드 교체 금지.
2. 입수한 QTUM/SPY 각각의 정렬 JSONL에 원본 URL 및 UTC 수집 시각이 있을 때만 CMD로 아래를 실행한다. 비밀 키는 GitHub/manifest/로그에 넣지 않는다.

   ```cmd
   set "ZGMINI_DATA_ROOT=E:\ZGmini\data"
   node scripts\pc-writer\theme-quantum-stage.mjs --ingest QTUM "<승인된 QTUM 원본 파일>" "<실제 출처 HTTPS URL>" "<실제 ISO UTC 수집 시각>"
   node scripts\pc-writer\theme-quantum-stage.mjs --ingest SPY "<승인된 SPY 원본 파일>" "<실제 출처 HTTPS URL>" "<실제 ISO UTC 수집 시각>"
   node scripts\pc-writer\theme-data-inventory.mjs --data-root "E:\ZGmini\data"
   node scripts\pc-writer\theme-quantum-stage.mjs --prepare
   ```

   `<...>`는 **예시 자리표시자**다. 파일 존재·출처 권리·시간이 확인되기 전 실행하지 않는다. `--prepare`는 결과를 E: `derived/`에 저장하지만 공개하지 않는다.
3. 원자료 manifest의 해시를 검산하고, R9·R10 가격 기준 및 기존 R158 겹치는 날짜 점수를 재계산한다. 차이가 있으면 원인/영향 범위를 기록하고 **공개 점수를 보존**한다.
4. 무료 상업적 파생 라이선스 증거·종가 모드·조기폐장 달력·252일 과거·확정/잠정 규칙을 확정한 뒤에만 독립 publisher/Reader를 별도 검토한다. 기존 7개 정규 작업에 끼워 넣거나 한 테마 예외를 전역 FAIL로 승격하지 않는다.
5. D1에 승인된 **파생 점수만** 쓰고 같은 `feed_key/snapshot_key`를 readback한다. 공개 API 응답의 관측일·점수·phase, PC/모바일 1년 차트를 검사한다. **다음 정규 Windows 작업 1회**에서도 수집→계산→게시가 실제 호출되는지 확인한다.

## 지금 남아 있는 실행 증거

| Gate | 상태 |
|---|---|
| GitHub 코드 및 단위 테스트 | 준비/검증 진행 |
| PC E: 실제 원자료·manifest 생성 | `NOT_EXECUTED_FROM_THIS_ENVIRONMENT` |
| 원자료 권리(무료 상업 파생 배포) | `UNCONFIRMED_ANONYMOUS_SCOPE` |
| QTUM/SPY 비교 종가·조기폐장 달력 | `PRICE_MODE_NOT_RECONCILED` |
| PC 승인 SHA·정규 작업 이름/주기·실행 | `NOT_INSTALLED_OR_VERIFIED` |
| D1 publish/readback | `NOT_EXECUTED` |
| API/UI 및 다음 정규 실행 | `NOT_EXECUTED` |

상기 항목 미통과 상태를 `운영 완료`로 보고하지 않는다.
