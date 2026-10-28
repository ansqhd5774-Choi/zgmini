# ZGMINI 시장 캘린더 R26 — 미국 재무부 국채 입찰 일정 공식 XML

## R25 PC 설치 확인 (2026-10-28)

- 사용자 `MARKET_CALENDAR_R25_CFTC_APPLY_RESULT.txt` 직접 확인:
  - `decision=R25_CFTC_CALENDAR_INSTALLED_NO_FORCED_COLLECTION`, `phase=INSTALLED`.
  - PC Core source `b8204432cea18f62eb34eb8d08dcfe61717a448d` → `724bbbf4407363f1f091567ed196cc0bf554bb5e`.
  - 변경 파일은 기존 `lib/release-calendar.mjs`, 신규 `lib/cftc-calendar.mjs`, 기존 `scripts/pc-writer/release-calendar.mjs` 정확히 3개.
  - `backupCreated=true`; GitHub push, 강제수집, 게시·SQLite·예약 작업 변경 없음.
- R25 CFTC 파서·수집기 **PC 코드 설치만 성공**. 자연 예약 수집·실제 SQLite 저장·Cloudflare/main 배포·웹 노출은 미확인. 이러한 미관측 상태는 다음 공식 소스 조사 선행 차단조건이 아니다.

## R26 공식 소스 선정

- 미국 재무부 TreasuryDirect 공식 [Auction Announcements](https://www.treasurydirect.gov/auctions/auction-announcements/)에서 **Treasury CUSIP Release, published weekly → XML format** 링크 제공.
- 정확한 원본 XML: https://www.treasurydirect.gov/xml/TreasuryCUSIPRelease.xml
- 같은 공인 페이지에는 별도 **Tentative Auction Schedule, published quarterly** XML도 있으므로, R26에서는 공식 주간 CUSIP XML **한 소스**만 검사한다. 장기 잠정표를 확정 발표로 혼합하지 않는다.
- TreasuryDirect는 경매 발표에 매물 유형·발표일·입찰일·발행일을 기재하며, 단순 반복 요일 패턴은 확정 일자가 아니라고 설명한다.
- 원문 XML의 실제 요소 이름/날짜 필드/예정-확정 상태/갱신범위는 **2026-10-28 현재 PC 실측 전**. 이를 확인하기 전 임의 이벤트를 생성하거나 Core에 연결하지 않는다.

## 1단계 — 읽기 전용 원문 확보

1. `scripts/pc-writer/market-calendar-r26-treasury-source-export.mjs`는 위 단일 URL에 HTTP GET 한 번만 보내고, 200 응답의 XML 적합성·바이트 수·SHA256을 확인한다. 원본 Base64를 포함한 진단 JSON TXT 작성 외 운영 Core에 접근하지 않는다.
2. 사용자는 `MARKET_CALENDAR_R26_TREASURY_SOURCE_EXPORT_20261028.zip` 전체를 PC 새 폴더에 풀고 `MARKET_CALENDAR_R26_TREASURY_SOURCE_EXPORT.cmd` 한 번 실행한다.
   - ZIP 3파일 무결성 검사 PASS, SHA256 `a90823333bb0a7ce4ea37e1729665495f3bf00b038c47f43a11ae3e7e146c242`.
   - CMD ASCII+CRLF 확인, R26 조회기 4/4 및 직전 R25 조회기 4/4 테스트 PASS.
3. `MARKET_CALENDAR_R26_TREASURY_SOURCE_EXPORT_RESULT.txt`를 제출하면 Base64 역산·SHA 검증→XML 필드 구조 분석→명시된 확정 일정만 파서 후보 개발→기존 R25 PC Core 안전 무결성 검증→최소 3파일 설치 순서로 진행한다.
4. 유효한 원문이 없으면 실패로 보고하며 다른 도메인 재시도·추정 일자 생성·운영 경로 강제 변경 금지.

## 작업 경계

- 브랜치 `codex/zgmini-gpt-workspace-20261025` 하나만 사용. 신규 브랜치·main 병합·운영 배포 없음.
- R25 승인 PC source `724bbbf4407363f1f091567ed196cc0bf554bb5e`를 **다음 안전 설치 시점의 초기 기준 후보**로 기록하되, 다른 작업 전진 시 실제 HEAD/config/source 및 보호 파일 drift를 읽기 전용으로 확인한다.
- 기존 발표 일정 5필드(`id/date/title/source/sourceUrl`) 계약, 저장 원본 후 재파싱, 예약 수집·업데이트 통제, 기존 경제·실적 이벤트를 보존한다.
- R26 단계는 **READ_ONLY_SOURCE_EXPORT_READY**. R26 일정 파서/PC 설치/자연 수집/게시/웹 공개까지 됐다고 보고하지 않는다.

## 2단계 — 사용자 PC 공식 XML 실측 및 R26 연결 준비 (2026-10-28)

- 실제 제출 `MARKET_CALENDAR_R26_TREASURY_SOURCE_EXPORT_RESULT.txt`: `decision=TREASURY_XML_CAPTURED_READONLY`, HTTP `200`, `contentType=text/xml`, 원문 **4,746 bytes**, SHA256 **`a746a0555acd80d07eea66a25b64e4a26ae5de6af05db1fb88b46205adf62c5e`**. Base64 디코드 후 바이트 길이·SHA256 완전 일치 확인.
- 정확한 `<Data><TreasuryCUSIPRelease>` 행은 **6개**. `SecurityDescription`/`CUSIP`/`SecurityType`/`Reopening` 및 공식 `<Dates>` 하위 `AnnouncementDate`, `CompetitiveAuctionCloseDate`, `IssueDate`, `OriginalIssueDate`를 확인했다. 원문 대상: 4·6·8·13·17·26주물 국채. 26주물의 공고 2026-10-29, 입찰 2026-11-02, 발행 2026-11-05.
- 발표 캘린더에 반영할 공식 이벤트는 **공고일 6 + 경쟁입찰일 6 = 총 12건**. `IssueDate` 6건은 결제/발행 원자료로 보존하되 별도 발표 이벤트를 만들지 않는다. 2026-10-28 이후(당일 포함) 9건. **XML에는 입찰 시각이 명시되지 않아 추정 시간·KST 카운트다운을 생성하지 않는다.** 분기 잠정 일정은 섞지 않는다.
- R26 스테이징 `staging/market-calendar/r26-treasury/`에 신규 `lib/treasury-calendar.mjs`와 기존 R25 기반 `lib/release-calendar.mjs`, `scripts/pc-writer/release-calendar.mjs` 3파일 구성. PC 수집기는 실제 원문을 `release-calendar:treasury`에 먼저 저장한 뒤 저장 원문을 재파싱한다. 공식 주간 XML이 다른 CUSIP으로 교체되어도 과거 이력과 이전 주의 다른 미래 CUSIP 보존, 동일 CUSIP의 새 입찰일은 미래 이전값 대체. 실패 시 이전 Treasury 이벤트 및 체크시각 유지·`SOURCE_FAILED`.
- 별도 브랜치 UI `app/market-calendar/market-calendar-client.tsx`는 `treasury-auction-{cusip}`, `treasury-announcement-{cusip}`만 공식 Treasury 이벤트로 인식하여 **국채** 분류·미국 재무부 출처를 표시하도록 최소 수정했다. 기존 출처 조건의 `item.source='bls'` 대입 오타를 `item.source==='bls'` 비교로 함께 고쳤다. 화면 배치·스타일·검색 메타·기존 일정을 변경하지 않는다.
- R26 PC 안전 설치기는 마지막 사용자 PC R25 성공 SHA **`724bbbf4407363f1f091567ed196cc0bf554bb5e`**를 엄격 고정하고, Core ID `d0a4b3cb8b95`, `config.source`, lock, Git dirty, EIA/USDA/CFTC 기존 해시 및 parser/collector 일치를 검사한다. 정확히 parser/신규 treasury 모듈/collector **3파일만** 백업·로컬 커밋·config.source readback. 다른 작업 HEAD 전진 시 `PC_SOURCE_CHANGED_STOP`; 우회 실행 금지.
- 후보 SHA256: parser `432354b0e87ab7735330e9b29396a14fd14ee218cd0daa016ab93fb59b6d080f`, Treasury 모듈 `0eb744d67fc2d82cbba1bf7b578503dcdfe6a609df557c8666517fc1c91f9c36`, collector(LF) `47416512698f8f4b184a6a4c32128a1256b6b6a010d1932a0e69d2612472cca6`, collector(PC CRLF) `a931267b84a6a8a7c2289e4daea5630b257bf30463e58f14b4ad2b5266828f1c`.
- R26 테스트 parser 4/4, collector 3/3, installer 4/4 **11/11 PASS**. 이전 R25 CFTC collector 3/3, R24 USDA collector 3/3, R23 EIA collector 9/9 **15/15 회귀 PASS**. 로컬 `npm run typecheck` PASS. Windows CMD ASCII+CRLF, ZIP 7/7 PASS.
- 안전 설치 ZIP **`MARKET_CALENDAR_R26_TREASURY_PC_INSTALL_20261028.zip`**, SHA256 **`4dd2f5b8aef361e26520af828067cac9500c3e4c14c71b054c99a5f4d8476833`**. 사용자 PC에서 ZIP 전체 압축 해제→`MARKET_CALENDAR_R26_TREASURY_APPLY.cmd` 1회 실행→`MARKET_CALENDAR_R26_TREASURY_APPLY_RESULT.txt` 업로드.
- **현재 상태**: 공식 XML 실측·코드/테스트/안전 설치기 준비 완료. **PC 실제 설치 로그 미확인**이며 자연 예약 수집, DB 저장, GitHub main/Cloudflare 배포, 공개 웹 노출도 미실행·미확인. 지정 브랜치 외 신규 브랜치 생성/병합/강제수집/배포 없음.
