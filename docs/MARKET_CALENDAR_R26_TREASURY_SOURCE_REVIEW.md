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
