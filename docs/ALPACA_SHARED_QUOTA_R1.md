# Alpaca Basic 공통 요청 예약 — R1 운영·연결 계약

## 목적과 고정선

- Alpaca Market Data Basic: 분당 200회. 이 계정의 30%를 보호한다.
- 동일 PC의 공유 원장에 참여한 호출의 **최근 60초 상한은 140회**, 120회부터 주의한다.
- 서버 응답의 `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`을 추가 보호 신호로 사용한다. 잔여 60회 또는 서버 한도의 30% 이하일 때 새 예약은 중단한다.
- 기존 Core 5분 시작 주기, 수집기별 캐시·최대 120회 실행 상한, 점수 산식·원자료·게시·D1 계약은 변경하지 않는다.
- 실제 **계정 전체**의 30% 보호는 동일 API 계정을 쓰는 모든 수집기가 같은 공유 예약 원장에 참여할 때만 보장할 수 있다. 독립 외부 프로세스의 미참여 호출은 헤더로 사후 감지·감속할 수 있어도 사전에 차단할 수 없다.

## 공통 연결 방식 (다른 콘텐츠 담당자에게 전달)

1. 모든 Node 프로세스에서 **동일한 승인 PC 데이터 루트**를 `base`로 사용한다. 기본 경로는 기존 `ZGMINI_PC_HOME` 운영 설정이 결정한다. 각 수집기 고유 폴더·개별 임시 경로를 `base`로 넘기면 계정 단위 합산이 깨진다.
2. Alpaca 요청은 `scripts/pc-writer/quota-fetch.mjs`의 `createQuotaFetch({base,originalFetch:fetch,mode:'enforce'}).fetch`를 통해 실행한다. 기존 `collect-local.mjs`가 설치한 `globalThis.fetch`를 호출하는 수집기는 **중복으로 감싸지 않는다.**
3. `PROVIDER_QUOTA_GUARD`는 다음 수집 기회로 이월한다. 같은 실행 내에서 즉시 반복 호출하거나 page_token을 임의로 건너뛰지 않는다. 429도 이월한다.
4. API 키, 헤더 원문, 원자료, URL의 쿼리/토큰, Windows 개인 경로를 운영 결과 보고에 기록하지 않는다.
5. 예제:

```js
import {createQuotaFetch} from './quota-fetch.mjs';
const quotaFetch=createQuotaFetch({base,originalFetch:fetch,mode:'enforce'}).fetch;
try {
  const response=await quotaFetch(alpacaUrl,{headers:credentialsInMemory});
  if(response.status===429)return {status:'DEFERRED_QUOTA'};
  // Existing response validation and complete next_page_token traversal.
} catch (error) {
  if(error?.code==='PROVIDER_QUOTA_GUARD')return {status:'DEFERRED_QUOTA'};
  throw error;
}
```

## 분리된 운영 상태

- `quota-ledger.json`: 기존 공급자 원장(변경 없음).
- `alpaca-quota-ledger.json`: Alpaca 전용 60초 예약·서버 잔여 기록. 비밀값이나 원자료 없음.
- `alpaca-quota-reservation.lock`: Alpaca 전용 아주 짧은 예약 잠금. 기존 `local-cycle.lock`, Task, PID, 예약 주기와 무관하다. 잠금 소유 PID가 종료됐음이 확인되고 5분 이상 오래된 경우만 회수한다. 상태가 불명확하면 요청을 중단한다.
- `asset-r10-alpaca/incremental-progress.json`: R10의 미완료 페이지 이어받기용 로컬 전송 제어 파일. 확정 점수의 입력이 아니며, 전체 유효 그룹을 완료하기 전 `incremental-checkpoint.json`의 `through`를 전진시키지 않는다.

## 현행 호출 경로 분류 (2026-11-02 읽기 전용 조사)

| 경로 | 이 변경 후 상태 | 담당 범위 |
|---|---|---|
| `alpaca-incremental.mjs` | 공통 quotaFetch 연결됨 | 자산 R10 작업 |
| `sector-fear-greed-r3-etf-incremental.mjs` | 기존 `collect-local.mjs`의 래핑된 fetch를 받는 경로에서는 등록 정책 적용 | 섹터 담당, 직접 수정 없음 |
| `sector-provisional-cycle.mjs` | 별도 프로세스에서 직접 Alpaca fetch; **연결되지 않음** | 해당 담당자가 같은 `base`로 quotaFetch에 연결 필요 |

## 검증 및 단계 구분

- 오프라인: 기존 quota 회귀시험과 Alpaca 독립 1/2/3프로세스 부하시험, 429·서버 헤더·120페이지 이후 121페이지 재개를 모두 검증한다.
- GitHub 작업 브랜치 커밋만으로 실제 Windows PC 코드가 교체되거나 Alpaca 계정 잔여가 보호됐다고 판정하지 않는다.
- 다음 승인된 PC 적용·원격 연결 후에는 API 호출량/잔여 헤더, 60초 원장, 확정 원자료 보존, 기존 Core Task 주기, 다음 정규 실행을 분리 검증한다.

공식 출처: [Alpaca Basic Market Data](https://docs.alpaca.markets/us/v1.1/docs/about-market-data-api), [Historical Stock Bars](https://docs.alpaca.markets/us/reference/stockbars).
