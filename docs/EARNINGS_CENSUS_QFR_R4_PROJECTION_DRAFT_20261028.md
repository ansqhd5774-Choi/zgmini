# 실적 침체 — Census QFR 제조업 이익률 별도 D1 투영 R4 초안 (미게시)

- 기준일: 2026-10-28 KST
- 저장소: `ansqhd5774-Choi/zgmini`
- **유일한 작업 브랜치**: `codex/api-site-integration-r1-20261026`
- 상태: **코드·로컬 검증 단계**, 실제 D1 쓰기/키 등록/Worker 공개 GET/UI/자동 게시 `NOT_RUN`.
- 기존 점수 **E1-R4**, 기존 BLS C 기본 5행/서비스 2행, BEA 데이터/키 및 과거 공개 이력 **변경 금지**.

## 통과 증거 및 데이터 성격

1. Census QFR 공식 ZIP R2 실제 PC SQLite append/readback 통과: `EARNINGS_CENSUS_QFR_R2_STORE_RESULT_20261027T145211Z.txt`.
2. 같은 원본의 R3 실제 PC 저장자료 전용 검산 통과: `EARNINGS_CENSUS_QFR_R3_STORED_RESULT_20261027T150635Z.txt`.
3. 2026-Q2 제조업 비계절조정 세후이익률: `370082/2372409×100 = 15.599418144173285%`. 직전 2026-Q1은 `287262/2046451×100 = 14.03708175763798%`, 전기 대비 `+1.5623363865353053%p`. Census의 제조업 **단일 원천 1종**으로 파생한 **정보성 행 1개**, 별도 점수나 Census 자체 발표 마진이 아님.
4. Census 2026년 2분기 계절조정 발표문의 매출·이익과 이 QFR ZIP **비계절조정** 집계를 혼용하지 않는다. 공식 발표일은 현 저장 원문에서 PIT 증거로 제공되지 않아 `releaseDate=null`로 둔다.

## 제안 공개 계약 — 아직 사용자 승인·등록 전

| 요소 | **제안만 한 값** | 원칙 |
| --- | --- | --- |
| D1 별도 키 | `detail:earnings-recession-indicators:census-qfr-mfg-margin:v1` | 기존 BLS 기본 `detail:earnings-recession-indicators:v1` 및 WPSFD42 서비스 키 무수정 |
| 새 형식 | `earnings-companion-c-qfr-r1-v1` | 기존 BLS 전용 `earnings-companion-c-r4-v1` validator에 Census 행을 억지로 섞지 않음 |
| 지표 ID | `census_qfr_manufacturing_after_tax_margin_nsa` | 범주 `PROFITABILITY`, `DERIVED`, 단위 `%`·변화 `%p`, 주기 `QUARTERLY`, 비계절조정 `NSA` |
| 원천 버전 | PC R3 검증 snapshot SHA (`0cf9d0e4...`는 **당시 관측된 값**, 하드코딩 금지) | 관측/수정본별 불변 식별자. ZIP SHA도 payload에 별도 표시 |
| 원본 체크포인트 | PC 청크 `first_seen_at` Unix ms (`1793112733108`은 증거값, 상수 아님) | 실제 원본 최초 기록 시각을 새 버전으로 속여 재게시 금지 |
| 이력 | 저장된 분기 5개 `[period,value]` | 원시 ZIP 전체 및 불필요한 대용량 내용은 D1에 게시하지 않음 |
| 발표/빈티지 | `releaseDate=null`, `officialVintageId=null`, `CURRENT_RETRIEVAL_NOT_PIT` | 확인 없는 일시·발표 당시 PIT 시계열 생성 금지 |
| 공개 연결 | 승인 후 별도 저장 전용 reader/Worker 계약 검증과 사이트 정보성 등록기 연결 | 현재 BLS GET의 `rows[]` 스키마 및 기존 점수 응답 불변. 기존 UI 디자인은 사용자 승인 후 적용 |

## 현재 개발 코드

`scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_PROJECTION_DRAFT_READONLY.mjs`의 `draftQfrPayload(preview,{generatedAt})`는 R3 **검증 완료 형태**를 유일한 입력으로 받는 **순수 함수**다. 버전/직전값/분기 연속성/원시 분자·분모·파생 이익률/출처/저장 시각을 검사하고, 제안 key + payload + checkpoint + SHA를 반환한다. D1 API/SQLite/네트워크 접근·파일 기록이 전혀 없다. `approvedForD1Write=false`, `workerRegistered=false`, `siteDeployed=false`를 명시한다.

### 다음 사용자 승인 Gate

1. 신규 독립 D1 키 및 `earnings-companion-c-qfr-r1-v1` 공개 형식·단조 증가 checkpoint에 대한 설계 승인.
2. 승인 후 기존 D1 테이블 `market_public_snapshots_v1`을 이용하는 writer에 별도 `--apply`/확인 플래그, 승인된 Git/main source SHA·운영 root/config gate, 정확한 D1 저장 본문 readback을 연결. **새 D1 테이블 생성 금지**.
3. D1 실제 게시가 PASS일 때만 Worker 저장 전용 read route와 사이트의 QFR 한 행 연결, 기존 BLS 5/7행 및 E1-R4 점수 회귀검사, 승인된 배포와 실제 공개 GET/UI 검증.
4. 신규 발표 뒤 정규 PC 수집→원장 버전 보존→D1→UI 자동 갱신은 별도 검증. 1회 수동 저장은 자동화 PASS 아님.

출처: https://www.census.gov/econ/qfr/ · https://www.census.gov/econ/qfr/mmws/current/index.html · https://developers.cloudflare.com/d1/worker-api/prepared-statements/
