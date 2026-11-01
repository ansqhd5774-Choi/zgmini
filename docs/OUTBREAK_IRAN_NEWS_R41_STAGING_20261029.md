# R41 — 39건 개별 저장·14일 공개 API 사전검증 (운영 미적용)

## 대상과 보존 조건

- 개발 브랜치 **`codex/outbreak-iran-news-retention-r1-20261026`만 사용**.
- R40 실제 수집 기록의 적격 **39건**을 별도 R41 metadata 테이블에 저장할 준비.
- 기존 R1 `market_public_snapshots_v1`의
  `public:iran-progress:news:iran:r1` 원문 JSON과 PC R3/R5 계산·예약·Cron·Queue는
  **수정하지 않는다**. 기존 게시기와 새로운 기사별 저장기는 서로 다른 테이블을 쓴다.
- 사용자가 지정한 이란/후티/사우디/예멘 및 전쟁/합의/휴전/협상/진전
  **2단계 키워드** 이외에 내용에 관한 주관적 통과 필터는 없다.
- 저장·표시 데이터는 **기사 ID, 매체, 실제 원문 제목, 발행일, 원문 URL**로 제한한다.
  원문 본문, 임의 생성된 요약, 기사 영향 점수는 저장하거나 공개하지 않는다.
- 뉴스 목록 게시 결정은 사용자에게 있고, 수집 모듈은 재사용 허가나 사실 확인을
  독립적으로 증명했다고 주장하지 않는다.

## 구현 및 검증

1. **스키마**: `db/migrations/iran-news-r41/0001_article_metadata.sql`
   - `iran_news_article_metadata_r41` 테이블에 기사별 기본키·원문 URL UNIQUE.
   - 기존 스냅샷 테이블 접근 SQL이 포함되지 않는다.
2. **저장 준비**: `scripts/iran-progress/news-metadata-stage-r41.mjs`
   - R40 검증 결과만 인정하고 39건을 SHA-256 원문 URL ID로 변환.
   - [`IRAN_NEWS_R41_STAGING_ROWS_20261029.json`](./IRAN_NEWS_R41_STAGING_ROWS_20261029.json)
     을 생성했다. 재생성 시 덮어쓰지 않도록 `wx`로 보존한다.
   - `stageIranNewsMetadataR41(db,rows)`는 20건 이하 D1 batch UPSERT와
     **각 배치별 read-back**을 강제한다.
   - 같은 URL 재입력은 갱신 확인 시각이 뒤처지면 기존 데이터 유지.
   - 배치 중간 실패 시 삭제·재생성하지 않고 에러로 중단하며, 멱등성을 활용해
     재처리 여부를 판단할 수 있다.
3. **별도 공개 API**: `GET /api/outbreak-news/iran/r41`
   - 기존 `/api/outbreak-news/iran` R1 API는 변형하지 않는다.
   - 최근 14일 원문 제목·매체·발행일·URL만 반환. 39개 저장 표본 중 **35건**.
   - 7개 매체 모두 당일 14일 적격 기사가 있어야 `READY`.
   - R41 테이블 미설치/접근 장애는 `503`, 기사 없음은 `PENDING`으로 구분.
4. **UI 준비**: `app/outbreak-news-container-r1.tsx`가 R41 `READY`·7매체·유효
   목록인 경우만 `app/outbreak-news-metadata-r41.tsx`를 표시한다.
   이 조건이 충족되지 않으면 **기존 R1 GOV.UK 목록으로 즉시 대체**한다.
   목록은 10개 우선 표시하고 **더보기 버튼**으로 나머지 25개를 확인할 수 있다.

## 실제 검증과 미실행 단계

- R40 원문 실조회: 80개 후보 중 39개 적격, 7개 매체 14일 적격 확인.
- R41 39건 매니페스트: 생성 **완료**, 전 매체 포함, 기사 본문/요약/점수 미포함.
- 메모리 SQLite에 실제 테이블 생성·39개 UPSERT·중복 재실행·오래된 업데이트
  차단·기존 스냅샷 보존·35개 API 조회 테스트 **통과**.
- `npm run typecheck`: **통과**.
- `npm run build`: **통과** (로컬 빌드이며 Cloudflare 배포 아님).
- D1 원격 테이블 생성·39건 실제 원격 저장·운영 reader·실제 UI는 **미실행**.
- R41의 서버 정기 수집·갱신은 **별도 다음 단계**. 한 번의 과거 자료 검사로
  운영 자동화가 완료되었다고 선언하지 않는다.

## 운영 전환 STOP 게이트

1. Cloudflare Git 연결 및 실제 쓰기 대상 D1 binding/DB ID를 읽기 검증한다.
   원본 R1 키·현재 운영 목록을 백업하고 정확한 읽기 결과를 기록한다.
2. 승인된 migration을 전용 R41 테이블에만 적용. 테이블 구조를 read-back한다.
3. R41 39건 업서트 이후 실제 D1에 39개 행이 있는지 확인하며, 14일 결과가
   35건인지와 **7개 출처 여부**를 검증한다. 실패 시 R1 UI는 그대로 둔다.
4. 기존 R1 공개 스냅샷의 body/stored_at 전후 일치를 확인한다.
5. 브랜치 전용 작업 지시를 유지한다. Production이 GitHub `main`을 바라보므로
   **다른 브랜치로 변경할 별도 명시 승인 없이는 main 배포하지 않는다**.
   연결·빌드·D1·UI의 PASS 여부를 각각 검증한 후에만 운영 완료로 보고한다.
