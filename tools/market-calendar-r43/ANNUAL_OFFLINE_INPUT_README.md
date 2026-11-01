# R43 연 1회 수동 입력 준비기 — 오프라인 전용

**상태:** 코드·합성 테스트는 검증. 공식 무료 Parquet **단일일(2026-10-29) 6,473행**은 `hyparquet@1.31.2`로 직접 디코딩 PASS. 사용자 PC의 실제 21거래일 변환, 2,634개 내외 승인 발행사 확보 및 공개 게시는 `NOT_VERIFIED`. 이 코드는 다운로드/수집/게시/스케줄러 실행을 수행하지 않는다.

## 입력 경로 A — 이미 저장된 R45 비공개 JSON 21거래일

```js
import {readStoredR45ToR43Annual} from './R43_ANNUAL_OFFLINE_INPUT.mjs';

const input = readStoredR45ToR43Annual({
  pcHome: 'E:\\ZGmini\\data\\pc-writer',
  universeFile: 'E:\\ZGmini\\data\\pc-writer\\local-market-calendar-r43-reviewed-issuers.json',
});
// Private in-memory only. Do not print rows or commit/upload the input.
console.log({asOf: input.asOf, count: input.rows.length});
```

`pcHome/market-calendar-r45-marketparquet/stock_daily_YYYY-MM-DD.json`에서 최신 21개를 읽는다. **현재 PC 진단은 이 폴더의 관측일 0개**라고 보고했으므로, 현재 상태에서 실행하면 차단된다.

## 입력 경로 B — 연 1회 수동 확보한 21개 Parquet

```js
import {readManualParquetToR43Annual} from './R43_ANNUAL_PARQUET_OPTIONAL.mjs';
const input = await readManualParquetToR43Annual({
  manifestFile: '/absolute/private/annual-parquet-manifest.json',
  universeFile: '/absolute/private/local-market-calendar-r43-reviewed-issuers.json',
  parquetDir: '/absolute/private/parquet-files',
});
console.log({asOf: input.asOf, count: input.rows.length});
```

- 21개 파일명은 `YYYY-MM-DD.parquet`이며 날짜별 SHA256, `PAR1` 파일 시그니처, 날짜/종목/가격/거래량을 검증한다.
- Parquet 디코더는 실행 시에만 `hyparquet`를 불러온다. 프로젝트 의존성은 `hyparquet@1.31.2`이다. 2026-11-01 검증에서 공급자 공개 `stock_daily/2026-10-29.parquet`(231,871바이트, 6,473행)를 해당 버전으로 직접 읽었고 `date`는 정상 `Date`, `asset_type='Stock'`, `close/volume`은 숫자로 반환됐다. **이 단일 파일 실측은 PC Windows 환경의 21일 전체 변환·권리 승인·D1 게시 PASS를 뜻하지 않는다.** 원시 표본은 저장소에 추가하지 않는다.
- `manifest` 필수: `version:1`, `method:'R43_MANUAL_MARKETPARQUET_21DAY_R1'`, `source:'MARKETPARQUET_FREE_SAMPLE'`, `licenseUrl:'https://marketparquet.com/license'`, `manualCollection:true`, `derivedStatisticsAllowed:true`, `redistribution:false`, 동일 권리 검토 참조 `rightsReviewReference`, `files:[{date,file,sha256}]` 정확히 21개.

## 승인 발행사 목록 요구 사항

`local-market-calendar-r43-reviewed-issuers.json`은 기존 R57 승인 membership 형식에 다음을 **추가**한다.

- `rightsReviewReference`: 파생 통계 공개권을 검토한 실제 내부 참조문자열 (12자 이상). 단순 `true`가 법적 권리를 자동 부여하지 않는다.
- `expectedEligibleIssuers`: 검증된 전체 적격 발행사 수(예: 2,634). 실제 수와 일치해야 한다.
- `members`: 모든 티커에 `eligible` 불리언; 적격 기업은 검토한 `issuerId` 필수. 중국 본사/OTC 등은 사전 검토해 `eligible:false`로 둔다.
- `marketSessionsReviewed:true`, `reviewedTradingSessions:[...]`: **최신부터 과거로 21개의 실제 미국 거래일**을 날짜순으로 기록. 주말·이상 공백·R45 파일 날짜와 불일치하면 차단한다. NYSE 휴장일 판정은 본 변환기가 자동으로 승인하지 않는다.
- BRK, ARM, ANET, SHOP, DE 다섯 검토 발행사가 빠지면 차단한다. `BRK.A/BRK-A` 등 동일 주식 종류 중복도 차단한다.
- EPS/배당/EPS 성장 값은 별도 검증된 경우에만 전달한다. Parquet에 이 값은 없으므로 기본은 `null`이다. 미검증 보조값을 추정해서 채우지 않는다.

산출값은 개인 PC에서만 사용하는 `local-market-calendar-r43-input.json` 내용과 호환하며, `expectedEligibleIssuers` 및 `approvedUniverseSha256`을 함께 보존한다. 실제 게시기는 이 승인 roster를 별도로 다시 읽어 무결성과 권리를 재검증해야 한다. **변환 도구 자체는 파일도 저장하지 않는다.** 수동 보안 저장 및 R43 D1 게시에는 별도 승인된 사용자 동작이 필요하다.

기존 PC Core 5분 주기/Writer/FHS 연 1회 수동 수집은 불변이다. 원본 MarketParquet OHLCV 파일과 생성된 PC 비공개 입력 JSON을 GitHub, D1 공개 데이터 또는 사이트에 업로드하지 않는다. 공개 가능한 것은 허용된 비가역 파생 결과(선정 발행사/★★★)뿐이다.

## R43 수동 게시의 실행 진입점

최신 R43 `local-market-calendar-r43-input.json`과 별도로 검토한
`local-market-calendar-r43-reviewed-issuers.json`을 승인된 PC 비공개 Writer 폴더에
보관한 **이후에만** `R43_MANUAL_RUN.mjs`를 실행한다. 이 명령은 정규 Core,
Windows 예약 작업, 기존 FHS 점수 또는 시가총액 API를 변경하지 않는다.

Windows CMD에서 (실제 승인된 repo 경로에 맞게 수정):

```cmd
"E:\ZGmini\runtime\node.exe" "E:\ZGmini\projects\zgmini\tools\market-calendar-r43\R43_MANUAL_RUN.mjs" --preflight --pc-home "E:\ZGmini\data\pc-writer" --repo-root "E:\ZGmini\projects\zgmini"
```

`R43_LOCAL_PREFLIGHT_READY_NOT_PUBLISHED`가 나와도 **D1에는 아무것도 게시되지 않는다.**
실제 게시가 승인된 경우에만 동일 명령에서 `--preflight`를
`--publish --confirm-r43-once`로 교체해 **한 번만** 실행한다. 게시기는
PC 승인 SHA·권리 참조·모집단 서명·R43 공개 Reader·개별 잠금·D1 재조회를
다시 확인한다. R43 키 이외에는 쓰지 않고, 기존 FHS ★ 등급은 변경하지 않는다.

**현재 PC 관측일 0일·승인 발행사 목록 미확보 상태에서는 preflight가 STOP하는
것이 정상이다.** 이 경우 승인 없는 가짜 입력, 외부 종목 리스트나 임의 점수로
우회하지 않는다. 파서의 실제 무료 Parquet 1일 표본 디코딩 여부와 운영용
전체 21거래일 수집·게시 완료 여부는 별도로 기록한다.
