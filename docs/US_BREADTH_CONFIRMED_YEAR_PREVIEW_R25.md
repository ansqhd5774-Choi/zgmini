# 미국 등락 지수 R25 — MarketParquet 전체시장 250거래일 미리보기

기준: 2026-11-01. 저장소: `ansqhd5774-Choi/zgmini`. 기존 브랜치: `codex/us-breadth-public-r1-20261031`.

## 목적과 고정 규칙

- 사용자 요청은 신규 MarketParquet **전체시장 약 6,500종목**의 1년 차트를 실제로 계산·검토하는 것이다. 사용자가 승인한 전일 가격 미확보의 **보합 간주** 및 `imputedUnchangedCount` 별도 집계를 유지한다.
- Alpaca IEX 약 503종목 장중 잠정치(15분)는 완전히 독립이다. 잠정치에 확정치 98% 기준이나 방향 일치율 검증을 요구하지 않는다.
- 기존 R1 확정치/250거래일 이력/공개 키, Windows Core·Korea 작업, D1/Cloudflare 설정을 건드리지 않는다. R25에는 PC/원격 쓰기·게시·새 스케줄러가 전혀 없다.

## 신규 읽기 전용 진입점

Windows CMD에서는 먼저 [R24 문서의 R26 Node·현재 프로젝트 루트 확인](US_BREADTH_CONFIRMED_PROVIDER_PROVENANCE_R24.md#windows-cmd-실행-전-확인-r26-2026-11-01)을 완료한다. bare `node`가 잘못된 `nvm4w` 실행기를 가리키거나 프롬프트가 `C:\Users\...>`라면 실행하지 않는다. `E:\ZGmini\runtime\node.exe`가 존재하며 Node 24 이상이고 **실제 승인 source에 이 R25 파일이 있는 경우에만**, 해당 프로젝트 루트에서 다음 명령을 실행한다.

```cmd
dir "scripts\pc-writer\us-breadth-confirmed-year-preview-r25.mjs"
"E:\ZGmini\runtime\node.exe" "scripts\pc-writer\us-breadth-confirmed-year-preview-r25.mjs" --preview-only
```

E: 경로는 현 운영 PC의 문서화된 전용 Node 위치이며, 현재 프로젝트 및 PC 운영 승인 SHA를 확인했다는 뜻이 아니다. Node 자체가 실행되지 않으면 R25/MarketParquet/251파일 장애로 분류하지 않는다. R25는 251개 공급자 원본을 새로 조회할 수 있으므로 R24 `--inspect`의 실제 PC 결과를 먼저 검토한다. 기존 Node/PATH/작업/원본/DB를 바꾸지 않는다.

1. [R24 공급자 교차검증](US_BREADTH_CONFIRMED_PROVIDER_PROVENANCE_R24.md)의 251개 로컬 파일/감사 기록 검증을 먼저 실행한다. 인증된 공급자 manifest와 **서명 URL에서 다시 받은 전체 원본의 바이트·크기·SHA**가 로컬 파일에 일치해야 한다. 공급자 manifest에 SHA가 있다는 뜻이 아니다.
2. `PROVIDER_BYTES_MATCHED_ALL_DATES`와 정확히 251개 후보가 확인된 경우에만 **동일 프로세스 메모리**에서 R21 계산기를 명시적으로 호출한다. 보안상 원본·토큰·서명 URL·종목별 가격은 결과에 넣지 않는다.
3. R21 계산은 인접 거래일 251개에서 **신규 시계열 250포인트**를 만든다. 상승/하락/실제보합/미확보 보합 및 비율을 거래일별로 반환한다. 기존 이력에서 값을 가져오지 않는다.
4. 251개 전체를 한 번에 메모리에 올리지 않도록 **최근 두 거래일의 파싱 결과만 캐싱**해 각 Parquet 날짜 파일을 원칙적으로 한 번씩 파싱한다. 원본 파일과 해시 검사는 계속 R20/R21에서 다시 수행한다.
5. 모든 성공 결과에는 `publicationStage=PREVIEW_ONLY`, `publicationAllowed=false`, `manualReviewRequired=true`를 남긴다. 이 결과는 공개 확정치, 운영용 승인 manifest, 실제 1년 차트 게시 증거가 아니다.

## 검증 결과 해석

| 결과 | 의미 | 이후 조치 |
| --- | --- | --- |
| `PREVIEW_PROVIDER_NOT_VERIFIED` | PC 251일 파일/공급자 바이트 검증 불충족 | 운영 PC 인벤토리와 무료 1년 제공 범위 확인 |
| `PREVIEW_SOURCE_ROOT_NOT_APPROVED` | 원본 일부가 현재 승인된 데이터 루트 밖에 있음 | 실제 운영 소스/경로 승인 상태 확인, 임의 복사 금지 |
| `PREVIEW_HISTORY_NOT_READY` | R20 파일·날짜·가격·중복 검증 또는 R21 계산 실패 | 실패 거래일과 출처 검증, 기존 이력은 보존 |
| `YEAR_PREVIEW_READY_UNPUBLISHED` | 검증된 공급자 사본으로 메모리 250포인트 계산 | 이상치·보합 간주 비율을 사용자에게 보고하고 추가 승인 전 게시 금지 |

2026-11-01 기준 예상 251일은 `2025-10-31`부터 `2026-10-30`까지다. 무료 API의 롤링 1년 경계가 가장 오래된 거래일을 제외할 수 있다. 파일이 하나라도 없으면 기존 250일 차트로 조용히 대체하거나 가격을 생성하지 않는다.

## 현재 상태

R25 코드는 모의 저장 Parquet·공급자 승인 결과에 대한 단위검사만 통과했다. 실제 Windows PC의 데이터·공급자 계정·251개 원본 재다운로드, 250개 실측 차트, D1 발행, Cloudflare 배포는 **아직 실행·검증하지 않았다**.

공식 근거: [MarketParquet API 문서](https://marketparquet.com/documentation), [데이터 품질/일별 스키마 변경](https://marketparquet.com/data-quality).
