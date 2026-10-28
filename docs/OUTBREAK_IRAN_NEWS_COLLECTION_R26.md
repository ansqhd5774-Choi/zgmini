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

## 16. R31 FIX2 — 실제 PC 결과 로그의 파일 쓰기 오류 개선

- 사용자 제출 `IRAN_NEWS_R31_LAUNCH_RESULT.txt` 내용: `R31_LAUNCH_BEGIN`, `R31_TOOL_AND_NODE_FOUND`, `R31_REPORT_WRITE_FAILED`, `FINAL_STATUS=STOP_R31_OBSERVATION_REQUIRES_REVIEW`. 따라서 **실행기 시작·모듈/Node 발견은 확인**, 결과 파일 저장은 실패. 구버전이 파일 쓰기 예외의 OS 오류 코드를 기록하지 않아 실제 Windows 오류 종류는 아직 미확정이다.
- 설계상의 유력 원인: CMD는 디렉터리 문자열 `%~dp0`가 끝나는 백슬래시(`\`)까지 인용부호 안에 넣어 Node에 전달했다. Windows 명령행 인자 해석은 인용부호 직전의 홀수 백슬래시를 일반 문자로 해석하지 않는다. **경로 인자 전달을 완전히 제거**하고, Node가 자신의 모듈 경로 `scripts/iran-progress/`에서 ZIP 루트(두 단계 상위)를 직접 계산하도록 한다.
- 새 패키지: `IRAN_NEWS_R31_FIX2_CYCLE_READONLY_PACKAGE.zip`, SHA-256 `68acb309067ed8578daa9fca9b7499e1e46a7db13c427217466b6038296aa0c6`. 압축 해제 후 기존 이름 `IRAN_NEWS_R31_CYCLE_READONLY.cmd`를 실행한다. FIX1과 달리 CMD 인자에 `%~dp0` 자체를 넣지 않는다.
- 파일 저장이 다시 실패하더라도 `R31_REPORT_WRITE_FAILED_<OS_ERROR_CODE>`와 제목/URL 없는 `R31_FALLBACK_SUMMARY`를 기존 `IRAN_NEWS_R31_LAUNCH_RESULT.txt`에 남긴다. 보고서 작성 실패의 exit code `2`를 의도적으로 보존하여 정상 완료로 오인하지 않는다.
- 자료 파일·수집기·작업 스케줄러·뉴스 후보·SQLite·D1·점수·UI/번역에 쓰지 않는다. 본 패키지의 관측 대상은 **R29가 과거에 남긴 파일**이며 R29 자동 수집 성패는 여전히 실제 정규 회차 증거가 있어야 판정한다.

## 17. R31 FIX2 사용자 PC 첫 수집 출력 관측 — 2026-10-28 12시 회차

- 사용자 제출 `IRAN_NEWS_R31_LAUNCH_RESULT(1).txt`: `R31_RESULT_FILE=...`, `R31_STATUS=R31_SINGLE_CYCLE_OBSERVED`, `FINAL_STATUS=PASS_R31_RECENT_OUTPUT_OBSERVED`. **결과 TXT 저장 문제는 이 사용자 PC 실행에서 해결됨**.
- 결과 `IRAN_NEWS_R31_CYCLE_READONLY_RESULT_20261028140821_722.txt`: `observationAtKst=2026-10-28 12:02:36`, 12시 6시간 구간, 조회 시 데이터 연령 126분, `taskPresent=true`, `cacheCoherent=true`, `statusFresh=true`, `isolationMaintained=true`.
- R29 개인 뉴스 후보: `collectorStatus=PRIVATE_COLLECTION_PARTIAL`, `sourceCount=7`, `sourcesFailed=0`, `articleFailures=4`, `candidatesSaved=28`, `verifiedCandidateCount=28`, `newCandidates=1`; R28 기존 저장 27건과 구분해 **실제 새로운 후보 1건이 R29 상태 파일에 기록된 사실**을 보존한다. 다만 R31 요약 로그만으로 그 신규 건의 원문 URL·제목·발행일은 독립 검증하지 않는다.
- `rightsUnverified=true`, `operationalFilesWritten=false`, `collectionExecuted=false`, `schedulerModified=false`. R31 도구 자체는 읽기 전용이고 D1/공개 뉴스/점수 게시 근거는 아니다. `taskPresent=true`는 Windows 작업 **존재** 확인일 뿐 이 로그 하나로 작업 실행 이력을 독립 증명하지 않는다.
- **현재 Gate: 1회 신선한 R29 출력 관측 PASS / 서로 다른 정규 2회 확인 PENDING**. 사용자 제출 결과가 명시적으로 `automaticScheduleTwoCyclesVerified=false`이므로 다음 정상 6시간 회차의 별도 관측 시각과 실제 예약 작업 기록을 확인하기 전 `PC_AUTO_COLLECTION_VERIFIED`라고 선언하지 않는다. 수동 강제 실행·추가 설치 불필요.

## 18. R32 실패 출처 3개 직접 과거 기사 재시도 — 예약과 무관한 원문 검증

- **사용자 판정 기준:** 7개 피드를 읽었다는 것만으로 7개 기사 연결 완료가 아니다. R28 실제 PC 저장 자료의 7개 source ID 중 4개만 적격 기사 1건 이상 보관했고, `iaea-news`, `iaea-statements`, `aljazeera`는 0건이었다. 과거 기사 재시도에는 예약 주기 대기가 필요 없다.
- **수정 전 직접 실측 (2026-10-28):** 세 공식 과거 URL 모두 HTTP 200으로 읽혔으나 R25 검증기는 `aljazeera`에 `ARTICLE_BODY_UNVERIFIED`, IAEA 뉴스에 `ARTICLE_BODY_UNVERIFIED`, IAEA 성명에 `FIRST_PUBLICATION_UNVERIFIED`를 반환했다. 실제 DOM에는 `<article>` 없이 알자지라 `wysiwyg--all-content`, IAEA `news-story-body` / `statement-body`에 본문 문단이 있었고, IAEA 성명은 일치하는 `dcterms.date`와 `<time datetime>` 날짜를 노출했다. 특정 원문 페이지의 응답 접근성은 시간·PC 네트워크에 따라 달라질 수 있다.
- **R25 최소 보완:** 위의 정확한 발행사 본문 컨테이너 내부 문단만 깊이 제한·크기 제한을 두고 검사한다. IAEA 날짜는 발행사 `dcterms.date`와 표시된 `<time datetime>` 날짜가 일치하고 시간대가 명시된 경우만 발행사 표시 날짜로 사용한다. 발표일 독립 검증이나 원문 저작권 승인으로 취급하지 않는다. 다른 발행사의 본문/날짜 규칙은 바꾸지 않는다.
- **직접 원문 재검증 (2026-10-28, 읽기 전용):** 알자지라 [2026-10-21 이란 농축우라늄 기사](https://www.aljazeera.com/news/2026/10/21/irans-enriched-uranium-re-emerges-as-point-of-contention-in-us-talks): `ARTICLE_METADATA_REVIEWED`, 본문 7,519자, **30일 이내**. IAEA 뉴스 [2025-09-08 이란 사찰 기사](https://www.iaea.org/newscenter/news/restoring-iaea-inspections-in-iran-would-create-promising-ground-for-wider-progress-says-director-general-grossi): 본문 853자, `OUTSIDE_30_DAY_WINDOW`. IAEA 사무총장 [2025-06-22 이란 유엔 안보리 성명](https://www.iaea.org/newscenter/statements/iaea-director-general-grossis-statement-to-unsc-on-situation-in-iran-22-june-2025): 본문 4,112자, `OUTSIDE_30_DAY_WINDOW`. **세 출처 모두 과거 기사 원문·날짜·본문은 확인했지만 IAEA 둘을 현행 30일 캐시에 저장한 것은 아니다.**
- **R24 발견 범위 보완:** `aljazeera` 기존 RSS의 짧은 목록에 더해 발행사 공식 [이란 뉴스 목록](https://www.aljazeera.com/where/iran) HTML에서 `/news/YYYY/M/D/slug` 형식 기사 URL만 후보로 추가한다. 7개 기존 source ID 및 R3 점수 피드 레지스트리는 그대로다. 공식 목록의 URL·분류는 원문 확인이 아니므로 R25가 발행일·본문·주제를 모두 재검증하며, 기사 저작권 승인도 여전히 별개다.
- **공식 목록 실측 (2026-10-28):** 알자지라 RSS+이란 목록 2/2 URL 정상, 원문 후보 15개, 그중 30일 내 발행일·본문·주제 검증 통과 **10개**, 기사 HTTP 실패 0개. 동영상/라이브블로그/30일 초과 자료는 임의 통과 처리하지 않았다. IAEA `topnews` 최신 피드 15개 중 승인 주제 일치 0개, `dgstatements` 피드 일치 4개는 장기간 이전 성명이다. **현재 수집 저장 계약을 완화하지 않는 한 IAEA 2개 source ID의 최신 30일 후보 0건을 성공으로 보고할 수 없다.**
- **PC 반영을 위한 최소 패키지:** `IRAN_NEWS_R32_HISTORICAL_RETRY_PACKAGE.zip` (SHA-256 `8cd2c6ce123b4eb643fb6d9a4bf1f604a12f1308b709105767f4cd062f271403`), 6개 파일. `IRAN_NEWS_R32_RETRY_INSTALL.cmd`를 ZIP 전체 압축 해제 후 실행한다. 작업 PC의 기존 R29 설치 runner/VBS 해시를 읽기 전용으로 확인하고, R28 당시 정확한 파일 해시로 남아 있는 R24/R25 **2개 모듈만** 원본 백업 후 원자적 교체한다. 예약 작업 조회·변경·강제 실행, 데이터/원장/D1/번역/UI/공개 뉴스 쓰기는 없다. 설치 완료 직후 고정 과거 공식 URL 3개를 **1회 읽기 전용 재시도**하며 결과는 CMD와 같은 폴더 `IRAN_NEWS_R32_RETRY_INSTALL_RESULT.txt`에 남긴다. 실패·부분 설치에서는 백업을 보존하고 자동 재시도하지 않는다.
- **버전 구분:** 기존 R28/R29/R30 역사 ZIP과 해시 승인 원장은 수정하지 않는다. R28 테스트는 현재 발전된 소스 폴더 대신 **역사 R28 ZIP 내 원본 코드**를 검증한다. 코드 회귀 테스트 `node --test tests/iran-news-*.test.mjs`에서 총 29개 파일 통과. R32 패키지는 아직 사용자 PC에 설치됐다는 증거가 없으므로 `PC_R32_INSTALLED`는 **PENDING**이다. 본 실측 결과는 개발 환경의 HTTP 응답이며 사용자 PC 성공과 동일하지 않다.

## 19. R32 후속 출처별 기사 실측과 R26/R29 보고 정확성 보완 — 개발 브랜치

- **2026-10-28 개발 환경 재조회, 읽기 전용:** R24 기존 승인된 3개 source ID의 공식 feed URL만 사용했다. `iaea-news` 피드 1/1 성공·15개 엔트리·승인 주제 일치 0개, `iaea-statements` 피드 1/1 성공·15개 엔트리·관련 후보 4개·30일 내 원문 검증 0개(4개 모두 과거 발행), `aljazeera` RSS+이란 목록 2/2 성공·관련 후보 13개·원문 본문/발행일/주제/30일 통과 10개·기사 HTTP 실패 0개. 동일한 공개 피드의 시점별 스냅샷이며 사용자 PC의 성공을 증명하지 않는다. IAEA 두 출처는 **피드 접속 성공 / 현재 30일 적격 후보 0건**으로 구분한다. 적격 뉴스가 없다는 관측은 미래 기사 생성이나 수집기 영구 고장을 뜻하지 않는다.
- **R26 개발 코드 보완:** 기존 `sourceCount=7`은 등록된 출처 수, `sourcesFailed=0`은 피드 단계 오류 0만 나타낸다. 실제 기사 수집 범위를 숨기지 않도록 `articleCoverage`를 추가하여 정확한 7 source ID별 `verifiedThisRun`, `retained30DayCandidates`, 7개 중 이 회차 확인된 매체 수와 30일 비공개 후보가 남아 있는 매체 수·누락 ID를 구분한다. 과거 기사 직접 읽기 성공은 이 30일 수치에 합산하지 않는다.
- **R29 개발 코드 보완:** 예약 후행 상태 JSON에 위 30일 개인 후보 범위의 출처별 집계 요약을 별도 보존한다. 7개 출처의 순서·건수·누락 ID가 불일치하면 성공 상태로 기록하지 않는다. `PRIVATE_COLLECTION_READY/PARTIAL`은 여전히 **수집 작업 상태**이지 7/7 매체별 기사 확보 선언이 아니다. 새 상태 필드로 기존 27→28 PC 개인 후보와 기존 공개 10건을 혼동하지 않도록 한다.
- **불변 계약:** 14일 사이트 노출, 30일 개인 후보 보존, 기사 재사용권(`rightsVerified:false`, `displayEligible:false`), PC 후보 데이터 형식, 점수 원장·D1·공개 캐시·스케줄러·번역·UI 및 R28~R32 역사 ZIP은 변경하지 않는다. 소스 변경만으로 PC 운영 코드가 업그레이드되지는 않는다. 이 후속 R26/R29 개발 코드를 사용자 PC에 적용할 때는 R32 설치 상태와 해시를 먼저 확인하는 **별도 안전 설치 Gate**가 필요하다.
- **현재 분리된 미완료:** R32 PC 설치·과거 3개 출처 직접 재검증 결과 TXT 확인, 서로 다른 정상 6시간 R29 회차 2회 확인, 신규 개인 후보의 기사별 이용권 승인과 D1/API/화면 반영은 모두 PENDING이다. 30일 내 IAEA 기사 0건을 누락 실패와 동일하거나 억지로 PASS로 표시하지 않는다.

## 20. R32 사용자 PC 결과 — 모듈 설치 확인, IAEA 원문 HTTP 403

- **사용자 제출 증거:** `IRAN_NEWS_R32_RETRY_INSTALL_RESULT(1).txt` (2026-10-28 접수). 사전 검사와 설치 단계가 모두 `R32_ALREADY_INSTALLED`, `moduleCount=2`, R24/R25 두 파일 모두 승인된 R32 `after` SHA에 일치함. 이번 실행이 두 파일을 **새로 교체한 것은 아니며**, 이미 설치된 R32 소스를 확인했다. 기존 Windows runner/스케줄러/D1/점수 원장/공개 캐시/번역 변경이 없다고 도구가 보고했다.
- **PC 원문 직접 조회 1/3:** `aljazeera` 2026-10-21 기사는 `ARTICLE_METADATA_REVIEWED`, 공식 발행일·본문 접근·30일 범위 검증 성공. `iaea-news` 2025-09-08 기사와 `iaea-statements` 2025-06-22 성명은 **둘 다 `ARTICLE_FETCH_FAILED`, `httpStatus=403`**. `FINAL_STATUS=R32_INSTALLED_HISTORICAL_PROBE_PARTIAL`, 원문 확인 `verified=1`이다. HTTP 거부로 IAEA 두 원문은 R25 본문·날짜 파서에 도달하지 않았으므로 이 PC 결과를 파서 실패·원문 부재·기사 없음으로 오판하지 않는다.
- **성공 범위 구분:** R32 과거 기사 조회는 읽기 전용이며 `pcCacheWritten=false`, `d1Written=false`, `scoreLedgerModified=false`, `schedulerModified=false`, `translationModified=false`였다. 알자지라 1건의 PC 원문 검증 성공을 신규 후보 실제 저장·기존 사이트 공개 10건 증가·IAEA 30일 기사 확보로 계산하지 않는다. R28 PC 저장 실측에서 4/7 source ID만 적격 기사가 저장됐던 상태를 이 로그만으로 7/7 저장 성공으로 변경할 수 없다.
- **권한/접근 STOP:** 개발 환경에서는 같은 IAEA 공개 원문에 접근했지만, 사용자 PC의 직접 HTTP 요청은 403이었다. 403의 구체 원인(사이트 정책, PC 네트워크, 요청 환경 등)은 현 로그로 특정할 수 없다. User-Agent 위장, 프록시 회전, 차단 우회, 반복 설치·반복 자동 요청을 하지 않는다. 다음 최소 진단은 **동일 PC의 일반 브라우저에서 공식 IAEA 원문 두 URL이 정상 열리는지** 사용자가 확인하는 것이다. 브라우저조차 403이면 게시자 접근 허용 또는 공식 제공 경로 확인이 선행되어야 한다. 브라우저만 열리더라도 자동 수집 허용을 추정하지 않는다.
- **현재 Gate:** `PC_R32_MODULES_PRESENT=PASS`, `PC_R32_DIRECT_HISTORICAL_ALJAZEERA=PASS`, `PC_R32_DIRECT_HISTORICAL_IAEA_NEWS=HTTP_403`, `PC_R32_DIRECT_HISTORICAL_IAEA_STATEMENTS=HTTP_403`, `SEVEN_SOURCE_HISTORICAL_PC_GATE=FAIL`. R29 서로 다른 2회 정규 실행 검증과 R26/R29 후속 보고 코드의 사용자 PC 설치는 별도 PENDING이다.

## 21. IAEA 사용자 브라우저 원문 접근 사진 확인 — 자동 HTTP 접근과 분리

- **2026-10-28 사용자 제출 화면 2장:** IAEA 공식 뉴스 2025-09-08 원문과 IAEA 사무총장 2025-06-22 성명이 각각 일반 브라우저에 제목·발행일·본문 문단·사진과 함께 표시됐다. 브라우저 화면에서 두 원문이 존재하고 **시각적으로 접근 가능**한 사실을 확인했다. 브라우저 번역 표시가 있어 화면의 한국어 문구를 원발행사의 한국어 공식 게시물로 간주하지 않는다.
- **실패 경계 확정:** 같은 두 URL에 대한 사용자 제출 R32 자동 HTTP 검사에서는 둘 다 `ARTICLE_FETCH_FAILED` / `httpStatus=403`이었다. 따라서 `PC_BROWSER_IAEA_PAGE_VISIBLE=PASS`와 `PC_AUTOMATED_IAEA_ARTICLE_FETCH=HTTP_403`을 동시에 유지한다. 브라우저 접근은 자동 프로그램의 접근 허가, 사이트 전체 네트워크 장애의 해소, 본문 파서 통과를 증명하지 않는다. 서버가 자동 요청을 거부한 정확한 이유는 현 증거로 특정할 수 없다.
- **후속 범위:** 공식 IAEA [RSS](https://www.iaea.org/feeds)는 새 글의 발견 경로로 유지하되, 피드 접속과 원문 본문 확인을 분리한다. 정상 브라우저의 쿠키·세션 추출, User-Agent 위장, 네트워크 회전 등으로 HTTP 403을 우회하지 않는다. 허용된 공식 기계 접근 수단이 확인되지 않으면 해당 PC의 자동 원문 검증은 ACCESS_DENIED로 남기고, 별도 사람 확인 증거와 30일 자동 후보 수집 성공을 혼동하지 않는다. 과거 2025년 자료는 30일 캐시 대상이 아니다.
- **현 시점 판정:** `IAEA_HISTORICAL_BROWSER_VISIBLE=2/2`, `IAEA_HISTORICAL_PC_AUTOMATED_FETCH=0/2`, `R32_THREE_HISTORICAL_PC_AUTOMATED_GATE=1/3`. 실제 사용자 PC 7/7 출처 자동 수집 완료, R29 정상 예약 2회, 공개 권리 승인 및 D1/API/UI 갱신은 미완료다. 기존 R32 설치기 재실행 불필요.
