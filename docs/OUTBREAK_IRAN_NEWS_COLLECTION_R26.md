# 이란 전쟁 뉴스 수집 복구 R26 — 다중 출처 후보 PC 계층

- 날짜: 2026-10-27
- 작업 브랜치: `codex/outbreak-iran-news-retention-r1-20261026`
- 책임: **뉴스 수집·원문 확인·부분 실패·PC 후보 기록**. 한국어 번역과 뉴스 카드 UI는 UI팀 작업이다.

## 1. R16 첫 정규 실행 사실

사용자 제출 `IRAN_NEWS_R16_SCHEDULE_READONLY_RESULT(2).txt`:

| 증거 | 결과 |
| --- | --- |
| 첫 설치 후 정규 예약 실행 | `2026-10-27 18:00:01 KST` |
| R15 완료 및 PC 캐시 갱신 | `2026-10-27 18:01:24 KST` |
| R15 뉴스 상태 | `PUBLISHED_D1_VERIFIED` |
| R15 D1 처리 결과 | `VERIFIED` (**R15 기록에 대한 R16 감사**) |
| 기존 PC 뉴스/공개 기사 | 10 / 10 |
| **해당 회차 새 기사** | **0** |
| R16 최종 상태 | `PASS_R16_FIRST_NORMAL_R13_NEWS_D1_VERIFIED` |

이는 예약 작업·R15 후행 실행·뉴스 전용 D1 게시 기록 정상성을 증명하지만 R16 자체가 원격 D1을 독립 조회한 것은 아니다. **새 기사 0건은 수집 장애의 확정 증거가 아니다**. 현재 운영 표시 뉴스 수집은 GOV.UK 4개 검색 피드에 한정되어 있어 타 출처 뉴스가 후보로 반영되지 않는 구조적 제한이 있다.

## 2. 신규 후보 수집 R26의 구현 범위

- `news-display-source-registry-r26.mjs`: 기존 R3 7개 승인 피드 URL·종류의 뉴스 전용 레지스트리. **R3 점수 코드 변경 없음**. 단위 테스트에서 `R3_FEEDS`와 매핑 정확히 비교한다.
- `news-display-multisource-audit-r24.mjs`: 뉴스 전용 레지스트리를 읽어, GOV.UK 4개 주제 Atom + 나머지 6개 출처 피드인 **총 10개 피드**를 독립 조회한다. 한 출처 실패를 숨기거나 다른 출처의 성공을 폐기하지 않는다.
- `news-display-article-audit-r25.mjs`: 4개 주제 OR·실제 본문·발행사 표기 발행 시각을 확인한다. 최초 발행일 미확인·동영상·본문 불충분은 구분하고, 기사 전문을 저장하지 않는다.
- `news-display-collection-r26.mjs`: R24/R25 검토 결과를 별도 PC `news-display-candidates-r26.json`으로 제한적으로 합친다. 동일 원문 URL 해시로 중복을 제거하고 **발행일(KST) 기준 30개 날짜**만 보유한다. 이전 후보를 보존해 일부 소스 장애 시 정상 항목이 사라지지 않도록 한다. 제한된 본문 검증 예산 70개는 저장 이력이 없는 URL에 우선 배정한다.

## 3. 안전 제약

1. 수집 후보는 모두 `rightsVerified:false`, `displayEligible:false`. BBC·알자지라·IAEA·UN·Tasnim 등의 원문 제목을 **공개 뉴스 키로 자동 게시하지 않는다**. 사용자 사이트 신규 공개 건수는 R26 구현만으로 증가하지 않는다.
2. 저장 레코드는 URL, 출처 ID, 공식 원문 제목·발행사 발행일·검증 상태와 SHA-256 ID만 포함한다. 기사 본문·이미지·번역 결과를 저장하지 않는다.
3. PC 운영 SQLite `iran.sqlite`는 존재 표식만 검사하며 열거나 수정하지 않는다. 기존 `news-display-r1.json`, D1 뉴스 키, R3/R5 점수 원장, Windows 예약작업, Cloudflare Cron, UI는 변경하지 않는다.
4. 외부 요청이 전부 실패하면 `R26_ALL_FEEDS_FAILED_PRESERVE_CACHE`로 중단하고 저장된 후보를 변경하지 않는다. 개별 실패나 기사 미확인은 `PARTIAL_COLLECTION_REVIEW_REQUIRED`로 구분한다. `0 신규`와 `수집 실패`는 다른 상태다.
5. `--dry-run`은 파일을 쓰지 않는다. 실제 `--collect`는 기존 PC 홈 및 `iran.sqlite` 존재와 `ZGMINI_IRAN_NEWS_R26_APPROVED=YES` 확인 후에만 후보 **별도 파일 1개**를 생성/교체하며, 읽기 재확인으로 일치 검증한다. 기존 기사 표시 캐시를 수정하지 않는다.

## 4. 검증·운영 적용 경계

- 로컬 모의 수집 테스트에서 출처 7개·피드 10개, 두 매체 원문 발행일/본문 검사, 부분 실패, 전면 실패 보존, 신규/중복/30일 만료, SQLite·공개 캐시 불변을 검증한다.
- 운영 PC의 승인 SHA·Windows 스케줄러·모듈 설치 상태가 별도이므로 이 브랜치의 코드 완성을 곧바로 PC 운영 반영이라고 부르지 않는다.
- 다음 단계: **R26 읽기 전용 PC 실제 7개 출처 실측** → 출처별 HTTP/파싱/본문·날짜 유효 건수 검증 → 승인된 기존 6시간 후행 경로와 격리 설치 → 정규 2회 실측 → 권리 확인된 기사만 기존 D1 표시 키로 연결.
- 사용자에게 전달할 출력은 출처별 성공/부분 실패/실패, 원문 검증 수, 신규 후보 수, 30일 PC 후보 수, 저장 여부만 포함한다. 비밀번호·토큰·기사 본문은 기록하지 않는다.

## 5. 관련 공식 근거

- GOV.UK Content API는 `first_published_at`와 `public_updated_at`를 구분한다: https://content-api.publishing.service.gov.uk/reference.html
- GOV.UK OGL 재사용은 조건 및 제3자 콘텐츠 예외 확인이 필요하다: https://www.gov.uk/help/reuse-govuk-content

## 6. 현재 상태

- R16 첫 정규 작업: **사용자 PC 실측 PASS**.
- R26 2026-10-27 22:33 KST 사용자 PC 읽기 전용 실측: **7/7 출처·10/10 피드 접근 정상**, 후보 56개 발견, 원문 52개 검사, 원문 검토 통과 28개, 기사 단계 실패 4개, 새 보관 후보 28개. `PARTIAL_COLLECTION_REVIEW_REQUIRED`는 피드 실패가 아니라 **기사 원문 검증 일부 실패**다. `written:false`이므로 PC 후보 파일 저장은 이 시점에 미실행이다.
- 운영 뉴스 신규 공개: **현재 R15 당회 신규 0건**, R26에서 새 언론사 자동 게시 **0건**.

## 7. 운영 PC 읽기 전용 실측 CMD

- 실행 파일: 저장소 루트 `IRAN_NEWS_R26_COLLECTION_READONLY.cmd`.
- 실행기 고정 소스: `9560b41942a414896420b7a413de0dac49bb9048` (R26 구현 코드 커밋). 이 코드는 운영 PC의 기존 프로젝트 소스·R15 설치 파일을 교체하지 않고 CMD 옆에 격리 다운로드하여 검사 후 본인이 만든 보조 파일만 정리한다.
- 로그 파일: **CMD와 동일한 폴더**의 `IRAN_NEWS_R26_COLLECTION_READONLY_RESULT.txt`. 출력에는 7개 출처의 피드 읽기 상태·후보 건수·기사 원문 메타데이터 통과 수·부분 실패·이미 저장된 PC 후보 수, 게시 미승인 여부를 기록한다.
- 자동 수집 실행이나 글 발행 작업이 아니다. `--dry-run`만 실행하며 `ZGMINI_IRAN_NEWS_R26_APPROVED` 환경변수를 설정하지 않고, D1·수집 후보 파일·뉴스 표시 캐시·기존 R3 원장에는 쓰지 않는다.
- 새 결과를 확인한 뒤에만 기존 PC 승인 경로에 **뉴스 표시 후보 파일 1개**를 수집 후행으로 연결하는 최소 설치를 설계한다. 저장 파일 실측과 게시 권리 검증 전에는 자동 사이트 반영을 시행하지 않는다.

## 8. R27 운영 PC 후보 보존·기사 실패 상세 분석

- 고정 소스: `39b0642d35a255561722dac6bcd3126f6d177749` (기존 R26 수집기 + 기사별 상태 상세 집계).
- CMD: 저장소 루트 `IRAN_NEWS_R27_COLLECTION_APPLY.cmd`, ASCII/CRLF, 실행 결과는 **같은 폴더**의 `IRAN_NEWS_R27_COLLECTION_APPLY_RESULT.txt`.
- 실측에서 확인된 28개 승인 대기 기사를 수집할 수 있도록 기존 7개 출처를 새로 조회하고, R25 기사 본문·원 발행일·4개 주제 OR 필터를 통과한 메타데이터만 PC 격리 파일 `news-display-candidates-r26.json`에 원자적으로 저장/read-back한다. 데이터는 30개 KST 날짜 범위 내 URL·출처·원문 제목·발행사 표기 일시·검증 상태·ID에 한정하며 본문·사진·번역은 저장하지 않는다.
- 기사 원문에서 검토를 통과하지 못한 건은 `articleOutcomes`에서 **매체 ID·사유·건수**를 확인한다. 실제 가져오기/형식/캐노니컬 오류는 `failedArticles`에 허용된 공개 링크 경로, HTTP 코드와 통제된 오류 코드만 남긴다. 이 자료로 R26의 기사 단계 실패 4개를 세분화한다.
- 첫 실행에는 별도 PC 후보 파일 한 개를 만들거나 기존 파일만 검증된 방식으로 갱신하며, 인증정보·D1·공개 뉴스 캐시·점수 원장·예약 작업·UI·번역에 쓰지 않는다. `--collect`는 명시적 승인 환경변수로만 실행하며 CMD가 그 실행 중에만 값을 설정한다. 이미 존재하는 보조 폴더에는 덮어쓰지 않는다.
- 한 매체/기사 실패는 보고서 `PARTIAL_COLLECTION_REVIEW_REQUIRED`로 남기되, **검증된 나머지 후보는 보존**한다. 전 출처 실패 시 변경하지 않고 중단한다. 실행 오류 또는 read-back 불확실 상황에서는 재실행을 요구하지 않고 보존 상태를 확인한다.
- **중요:** PC의 개인 후보 저장 성공은 자동 6시간 수집 연동, 신규 기사 사이트 공개·D1 게시의 성공이 아니다. R27 실측 후 운영 R15 승인 해시·기존 후행 runner를 재확인하고, 후보 수집만 별도 실패 격리된 후행 경로로 설치할 계획이다. 승인되지 않은 매체의 공개 게재는 별도 권리 Gate까지 차단한다.

## 9. R28 파일 다운로드 오류 대응 — 오프라인 코드 묶음

- 사용자 보고: R27 실행/수령 시 **"다운로드 실패"**. 원인이 채팅 첨부 다운로드인지 PC `curl`/GitHub RAW 요청인지 해당 로그를 받기 전에는 확정하지 않는다. 코드 다운로드 의존성을 제거한 보조 경로를 제공한다.
- 실행 경로: 저장소 루트의 `IRAN_NEWS_R28_OFFLINE_PACKAGE.zip` (23KB, SHA-256 `b2ab208f9ef7a499232719dc4fab235ba1dc0dc3bd9210993676009c49347c8d`). 여기에는 `IRAN_NEWS_R28_OFFLINE_APPLY.cmd` 및 `scripts/iran-progress/news-display-offline-bundle-r28.mjs`와 의존 모듈 7개가 모두 있다. ZIP 전체 압축 해제 후 CMD 하나를 실행한다. **런타임 GitHub 다운로드가 없다.** 다만 라이브 기사 검색을 위해 기존 언론사 HTTPS 접속은 필요하다.
- 실행 전에 7개 모듈의 저장소 SHA-256 해시와 실제 로컬 바이트를 비교한다. 하나라도 누락/변경/심볼릭 링크이면 데이터 수정 없이 중단한다. 의존성 무결성 확인 후 기존 R26의 `--collect`에 해당하는 별도 PC 후보 저장/read-back만 수행한다.
- 로그: **CMD 옆** `IRAN_NEWS_R28_OFFLINE_APPLY_RESULT.txt`. 정규 6시간 작업·D1·공개 뉴스 캐시·R3/R5 점수·사이트는 변경하지 않는다. 기록 실패/PC 후보 저장 결과 불확실은 자동 재시도하지 않는다.
- R28 ZIP은 새 데이터 소스나 새 산식이 아니라 이미 **R26 PC 실측에서 7개 출처 접근에 성공한 동일 버전**의 수집 소스를 통째로 전달하는 포장 변경이다. 다음 Gate는 실제 PC의 후보 저장/read-back 확인이며, 이후 기존 R15 후행 운영 연결 및 개별 기사 권리 검증은 여전히 미완료다.

## 10. R28 사용자 PC 실측 — 27건 후보 저장 성공

- 증거: 사용자 제출 `IRAN_NEWS_R28_OFFLINE_APPLY_RESULT.txt`, 완료 관측 `2026-10-27T14:11:25.726Z` (`2026-10-27 23:11:25 KST`). 실행 로그의 `PASS_R28_OFFLINE_MODULE_INTEGRITY`, 검증 모듈 7개, `FINAL_STATUS=PASS_R28_PRIVATE_NEWS_CANDIDATES_SAVED` 확인.
- 새 라이브 수집: **7/7 출처, 10/10 피드 성공**, 발견 55 URL, 원문 확인 52건, `ARTICLE_METADATA_REVIEWED` 27건, 신규 27건, 30일 후보 파일 저장 27건. `written:true`, `dryRun:false`; 소스 코드 자체의 다운로드 실패는 재발하지 않았다.
- 기사의 세부 결과: BBC 4건, GOV.UK 6건, Tasnim 8건, UN 9건이 메타데이터 확인을 통과했다. 알자지라 3건은 `ARTICLE_BODY_UNVERIFIED`, 1건은 동영상 별도 검토; BBC 동영상 2건, GOV.UK 13건과 UN 1건은 30일 범위 밖; Tasnim 3건 및 UN 1건은 주제 범위 밖.
- 원문 가져오기 실패 4건은 모두 `iaea-statements`의 `HTTP 403`이며 다른 6개 출처 성공을 막지 않았다. 이는 **원문 접근 거절 결과**만 증명한다. 서버 정책이나 일시 장애 등 403의 근본 원인은 확인되지 않았다. 기록된 URL의 연대가 대체로 오래되었더라도 피드 날짜만으로 원문 최초 발행일을 확정하거나 다른 기사에 대해 생략 조건을 신설하지 않는다. 차단 회피·무단 미러링을 시도하지 않는다.
- `status=PARTIAL_COLLECTION_REVIEW_REQUIRED`는 실패 4건이 있는 투명한 부분성공 상태이다. `publication=NOT_AUTHORIZED`, `rightsVerified=0`, `displayEligible=0`, `scoreLedgerModified=false`, `publicCacheModified=false`, `d1Written=false`, `schedulerModified=false`, `translationModified=false` 유지.
- **복구 진행도:** PC 다중 출처 후보 수집·검증·격리 저장은 실측 PASS. **기존 R15 6시간 자동 후행 연결 / 2회 정규 관측 / 기사별 재사용권 / D1 공개 게시 / 실제 UI는 미실행·미검증**.
- **즉시 다음 Gate:** PC에서 기존 R15 운영 프로젝트 HEAD, R13 작업 XML·launcher·runner SHA, 후행 호출 위치, 후보 파일 27건의 읽기 검증, 보조 모듈 설치 경로를 **읽기 전용**으로 확인한다. 차이가 있으면 설치하지 않는다. 이후 해당 승인 source에서 R26 후보 수집만 독립 실패 격리 후행 처리하도록 최소 연결하고, 정규 2회 관측으로 완료를 판정한다.

## 11. R29 기존 6시간 R13/R15 후행 뉴스 후보 자동 수집 연결

- 배포 대상은 PC만이다. 새 Windows 작업, Cloudflare Cron, R3/R5 점수·원장·기존 공개 뉴스 키·번역·UI의 변경 없이 **활성 R15 runner 후행 코드에 별도 비공개 후보 수집 R29를 추가**한다. 기존 R15에서 D1 게시가 실패해도 R29 후보 수집은 별도 프로세스로 이어지며, R29 실패가 R3/R5/legacy 점수 종료코드에 전파되지 않는다.
- R29 수집기 `news-display-auto-candidates-r29.mjs`는 R26의 다중 출처 수집을 그대로 사용하며 검증된 개인 후보 파일 `news-display-candidates-r26.json`만 갱신한다. 요약 관측 결과는 별도 `news-display-candidates-auto-r29-status.json`에 저장한다. 공개 표시 권리 없는 새 제목·기사 본문·이미지·번역은 D1/사이트에 쓰지 않는다.
- 설치는 오프라인 코드 ZIP의 `IRAN_NEWS_R29_AUTO_CONNECT.cmd`만 실행한다. 설치 프로그램 `news-display-install-hook-r29.mjs`는 **쓰기 전** 기존 R13 task XML(0/6/12/18시)·VBS·R15 runner SHA `db0040ef...`·R7/원본 복구 사본·기존 R15 모듈·7개 수집 모듈 SHA·PC 격리 후보 파일/권리 상태를 검사한다. 정규 작업이 실행 중이거나 예정 시각 전후 25분이면 설치를 중단한다. PC HEAD는 관측치로만 기록하며 다른 작업의 Git checkout을 임의 교체하지 않는다.
- R29 배포 ZIP: `IRAN_NEWS_R29_AUTO_CONNECT_PACKAGE.zip`, SHA-256 `c49d0601ba0e91ea1b030d22c0dec057706b7e05999214aba9705e1768d1033a`, 총 13개 스크립트/실행 파일 포함. ZIP 전체 압축 해제 뒤 **한 번만** CMD 실행. 해당 ZIP을 풀기만 해서는 운영 PC 프로젝트가 변경되지 않는다.
- 기존 `sources.mjs`, `news-display-discover-r1.mjs`, `lib/iran-progress/news-display-r1.mjs`는 검증 후 **그대로 유지**한다. R24/25/26·소스 레지스트리·R29 실행 모듈 총 **5개 신규 파일**만 추가한다. 활성 R15 runner의 기존 내용을 검증하고 원본을 `.before-iran-news-r29`로 **배타적 백업**한 뒤 오직 후행 R29 블록만 붙인다. task·VBS·기존 R15 모듈은 수정하지 않는다.
- 설치 전후 파일 해시 불일치, `.next`·백업 중복, 작업 실행 중, 저장 실패는 `STOP`으로 분리하고 **자동 재설치·무단 rollback·광범위 삭제를 하지 않는다**. 특히 설치 결과 불확실은 사용자의 로그 검토까지 멈춘다.
- **현재 검증 경계:** 브랜치의 코드/회귀 테스트/ZIP 검증과 **실제 사용자 PC의 설치·정규 실행 성공은 별개**다. 사용자가 `IRAN_NEWS_R29_AUTO_CONNECT_RESULT.txt`를 확인하고, 다음 서로 다른 정규 2회에서 R29 상태 파일과 개인 후보 파일의 업데이트를 검증해야 PC 자동 수집 PASS가 된다. 기존 R16 검증기는 R15 runner 해시용이므로 R29 runner에 적용해 거짓 이상으로 해석하지 않는다.

## 12. R30 기존 PC 표시 라이브러리 해시 호환 — 자동 수집만 설치

- **운영 증거:** 2026-10-28 사용자 PC의 R29 사전 검사는 일정 보호 시간 밖에서 `R29_EXISTING_DEPENDENCY_DRIFT`로 중단. 기존 운영 소스 `bc7bd678...`와 R15 뉴스 표시 라이브러리에는 후속 번역 필드 검증 변경이 없다. 패키지의 최신 파일에만 `titleEn/summaryEn`, `titleKo/summaryKo`, `translationReviewed` 검증이 추가된 실제 코드 차이이며 단순 개행 차이가 아니다. PC 파일·스케줄러·D1·점수·개인 후보는 수정되지 않았다.
- **최소 수정:** R29 설치기의 기존 의존성 일치 검사에서 `lib/iran-progress/news-display-r1.mjs`에 한해 SHA-256 `d960d1d1a5cd4a8642ff1a196a991f4e2a9efa244475df752367a629765f88ce` (R15 당시 번역 이전 라이브러리)를 최신 `abe67381029f802119f5fa3c7796002baea69395da86633c076019ee4f76bd65`와 함께 허용한다. 그 외 다른 해시·임의 개행 변경·다른 모듈의 차이는 계속 중단한다.
- R26은 해당 라이브러리에서 `kstDayWindow`, `kstNewsDay`, `NEWS_PC_RETENTION_DAYS`만 사용한다. 기존 모듈을 복사하거나 덮어쓰지 않으며, 번역/UI/기존 공개 카드 게시를 실행하지 않는다. R28 오프라인 패키지 자체의 7개 모듈 SHA 검증도 변경하지 않는다.
- **새 CMD:** ZIP `IRAN_NEWS_R30_COMPAT_INSTALL_PACKAGE.zip` (SHA-256 `00aa5c48db0ee0b93045068e6df94a44cd87a7dd9565b834d31dc968f3b36e3b`) 전체 압축 해제 후 `IRAN_NEWS_R30_COMPAT_INSTALL.cmd`를 실행한다. 결과는 CMD 옆 `IRAN_NEWS_R30_COMPAT_INSTALL_RESULT.txt`. 기존 시간대 ±25분 검사, 작업 실행 중 검사, VBS/R15 runner/복구 해시, PC 후보, 신규 5모듈 검증과 한 번의 후행 연결 설치는 R29와 동일하다. 이전 R29 로그들은 `STOP_R29_BEFORE_INSTALL`여서 설치 전 중단되었다.
- **검증 경계:** 브랜치 테스트 성공은 PC 설치 완료와 다르다. 새 CMD 설치 결과를 확인하고 다음 2회 정상 예약 수집의 개인 후보 갱신은 사용자 검증이다.

## 13. R30 사용자 PC 설치 완료 증거 — 정규 수집 검증 전

- 사용자 제출 로그: `IRAN_NEWS_R30_COMPAT_INSTALL_RESULT.txt` (2026-10-28). `--preflight` 결과 `PASS_R29_EXISTING_R15_PREFLIGHT_READ_ONLY`, 실제 `--install` 결과 `PASS_R29_PRIVATE_NEWS_SCHEDULED_HOOK_INSTALLED`, CMD 최종 `PASS_R30_R29_PRIVATE_NEWS_HOOK_INSTALLED`.
- 운영 PC 프로젝트 HEAD `bc7bd6781d1f4083009f1709a3f2e82461c5bfb9` 유지. R13 작업 주기 `[0,6,12,18]` 유지. 활성 기존 runner SHA-256 `db0040ef8f3ce5b7e4cfe2ed8786a87b1f6f0ce6a9b8c6ea0cf379f494e77ae3` → 신규 R29 후행 연결 runner SHA-256 `9cc3a7b9df6a33655321fdcf9565d1e6e5afe8ee6ac88bb6df6b795feda7b3dd`. 기존 runner 백업 해시 검증 `runnerBackupVerified:true`.
- 기존 의존 모듈 **3개 확인**, 신규 비공개 뉴스 수집 모듈 **5개 설치**. 설치 당시 기존 개인 후보 **27건** 검증. `schedulerModified:false`, `vbsModified:false`, `scoreLedgerModified:false`, `publicCacheModified:false`, `d1Written:false`.
- `pcPrivateCollectionExecuted:false`가 명시되어 있다. **설치 PASS ≠ 자동 수집 PASS**. 사용자가 다음 별개의 정상 R13 예약 실행 2회에서 `news-display-candidates-auto-r29-status.json` 생성·관측 시각과 `news-display-candidates-r26.json` 보존·갱신을 확인하기 전에는 운영 자동 수집 성공으로 판정하지 않는다. 추가 수동 예약 실행, 공개 뉴스·번역·점수 변경은 이 단계의 작업이 아니다.

## 14. R31 정규 실행 관측용 오프라인 읽기 전용 도구

- 파일: `IRAN_NEWS_R31_CYCLE_READONLY_PACKAGE.zip` (SHA-256 `43c7ace88351be013357c906c12f77a0898e6fed5ecbf67ea5b224c8c6858cdb`). ZIP 전체 압축 해제 후 `IRAN_NEWS_R31_CYCLE_READONLY.cmd` 실행. 내부 파일은 `scripts/iran-progress/news-display-cycle-verify-r31.mjs` 하나뿐이며, 코드 자동 다운로드와 기사 수집이 없다.
- **사용 시점:** 기존 `ZGMINI-PC-Iran-Progress-R13`의 서로 다른 정상 6시간 예약 회차 이후 각각 한 번씩 실행한다. 설치용 R30 CMD를 다시 실행하지 않는다. R31 CMD는 Windows `schtasks.exe /Query /TN ... /XML`로 기존 작업의 존재만 읽으며 **`/Run`, `/Create`, `/Change`를 사용하지 않는다**.
- 읽기 대상은 현재 PC 승인 뉴스 데이터 홈(기본값 `%USERPROFILE%\.zgmini\iran-progress-r13`, 기존 E: junction 유지)의 `news-display-candidates-auto-r29-status.json`과 `news-display-candidates-r26.json`이다. 각 파일의 형식·수집 시각 일치·후보 개수·해시·8시간 내 관측 신선도, `rightsVerified:false`, `displayEligible:false`, 점수/D1/예약 작업 비변경 상태를 점검한다. 원문 URL·기사 제목은 로그에 출력하지 않는다.
- 결과는 압축을 푼 CMD **옆** `IRAN_NEWS_R31_CYCLE_READONLY_RESULT_날짜시각_밀리초.txt`로 한 번씩 별도 생성한다. `R31_SINGLE_CYCLE_OBSERVED`는 정상 범위의 **최근 R29 출력 파일 1회분을 관측했다**는 뜻이다. 예약 작업으로 실제 실행됐는지에 관한 단독 증거도, **서로 다른 정규 2회 PASS 증거도 아니다**. 반드시 두 로그의 `observationAtKst`가 다른 6시간 회차인지 확인하고, 실제 R13 스케줄러 실행 이력과 함께 대조해야 한다.
- `PRIVATE_COLLECTION_PARTIAL`은 개별 기사 HTTP 403 등 부분 실패가 있더라도 저장 결과가 일관되면 인정한다. `PRIVATE_COLLECTION_FAILED_CANDIDATES_PRESERVED`, 오래된 상태, 파일 시간 불일치, 후보의 공개 권리 드리프트 등은 `R31_CYCLE_NOT_VERIFIED`로 기록한다. R28 당시 27개 후보는 **새 정규 회차가 실행되었다는 단독 증거가 아니다**. 후보 수가 늘지 않아도 최신 관측 시각과 오류를 비교한다.
- 운영 파일·PC SQLite·기존 스케줄러·VBS·R13/R15 runner·공개 캐시·D1·UI/번역을 수정하지 않는다. 결과 TXT 파일만 **CMD의 압축 해제 폴더**에 쓴다. 작업 브랜치는 `codex/outbreak-iran-news-retention-r1-20261026` 유지. 사용자 PC의 정규 2회 결과는 **사용자 검증 대기** 상태다.

## 15. R31 FIX1 — 실행창 즉시 종료·로그 미생성 복구

- 사용자 보고: 이전 R31 CMD를 더블클릭하면 즉시 닫히고 결과 로그가 생성되지 않음. 구버전 CMD는 **패키지 미완전 압축 해제 또는 Node PATH 미인식**과 같은 시작 단계 실패 시 콘솔 `echo` 직후 종료했으며, 이 분기에는 로그 쓰기가 없었다. 어느 원인이 실제 발생했는지는 PC 증거가 없어 아직 미확정이다.
- **기존 R31 ZIP 대신** `IRAN_NEWS_R31_FIX1_CYCLE_READONLY_PACKAGE.zip` 사용 (SHA-256 `98ca9d3bcfa06bbd6112e5a32d1ae9b0d07bd8f759293ad3229639ba13ec6916`). 기존 패키지/코드 파일을 무단 삭제하지 않는다. 새 ZIP 압축 해제 후 동일한 `IRAN_NEWS_R31_CYCLE_READONLY.cmd` 실행.
- CMD 시작 즉시 별도 `IRAN_NEWS_R31_LAUNCH_RESULT.txt`에 실행 시작 표시를 **추가 기록**한다. 파일/Node 미발견, R29 결과 미검증, 성공을 각 `FINAL_STATUS`로 구분하고 모든 경로에서 `pause`를 사용해 콘솔을 유지한다. `where node.exe` 실패 시 운영 계약에 명시된 `E:\ZGmini\runtime\node.exe`만 보조 경로로 검사한다. 다른 디스크 탐색·런타임 다운로드·Node 설치는 하지 않는다.
- Node 검사까지 도달한 경우 기존 시각별 `IRAN_NEWS_R31_CYCLE_READONLY_RESULT_*.txt`도 별도로 생성한다. 파일 미존재의 경우에도 `STOP_R31_PACKAGE_INCOMPLETE`, Node 경로 부재에는 `STOP_R31_NODE_MISSING` 등 정확한 사유가 launcher 로그에 남는다. 압축 해제 폴더가 쓰기 불가이면 콘솔에서 별도 `STOP`을 표시하고 사용자가 경로를 선택한다.
- **정규 수집 검증 자체는 여전히 대기**한다. 보조 CMD를 실행해도 스케줄러를 강제 실행하지 않으며, 기존 사용자 PC의 점수 DB·D1·수집 후보·R15/R29 hook·UI/번역에는 쓰지 않는다.
