# ZGMINI R4 #01 — 개발·승인 PC·실설치·Production 버전 증거 분리

- 관측일: 2026-11-17 19:21 KST 이후, 증거/운영 상태별 관측시각 구분.
- R4 계획 #01의 정확 완료 조건은 **GitHub 최신 main·W06 브랜치·PC 승인 Writer 버전을 분리하고 정확 SHA 기록; 개발/설치/배포를 같은 SHA로 오인하지 않는 기준표**.
- 작업: W06 직접 승인 범위 **GitHub/기존 PC 결과 읽기 전용**. Windows 운영 파일·Controller/Writer·배포 변경 없음. #74 Writer 원장 확인 요청과 겹치는 재요청 없음.

| 층위 | 직접 확인된 값 | 관측 경로·시각 | 판정과 제약 |
|---|---|---|---|
| 제품 개발 `zgmini/main` | `2aa9cd28053c03be8fb34cbc87794e59f566cbde` | GitHub git/ref/heads/main (이번 조사) | **CONFIRMED source HEAD**. PC 설치나 Production 활성 확인과 별개 |
| W06 개발·기록 브랜치 | `2dd0cd8c53d9738ff550249fccea95220de839e2` (이번 시작) | GitHub git/ref/heads/codex/ui-improvements | **CONFIRMED W06 work HEAD**, 이전 #03 기록까지. 실배포 SHA로 사용 금지 |
| 공통 제어 저장소 `zgmini-pc-control/main` | `e717f388a51ac48b0e27001ce4c443e5acfa6b15` | GitHub git/ref/heads/main (이번 조사) | **CONFIRMED control development HEAD**. PC의 실제 checkout과 다른 계층 |
| 2026-11-17 07:22 UTC 승인 PC A 실행 control source | `384ffd09e80ad769e31596483dfe73e9ee8b6c6a` | Issue [#1927](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1927), Run [44038139955](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44038139955), `results/44038139955-1-seat-6.json` | **CONFIRMED 실행 control source SHA** (`actualExecutionSha=controlSourceSha`). 제품 계산 Writer의 설치 SHA **아님** |
| 동일 PC A의 요청 제품 source SHA | `d4c8f0b7b65e7824d271fc10078981f68e10aa04` | Issue #1927 요청 JSON `requestedSourceSha` | **CONFIRMED request input**일 뿐 운영 Writer 설치/실행 SHA 증거 **아님** |
| 동일 PC A의 운영 승인 SHA 필드 | `2070ff53549e2f9f2cea57d5af7e1d83f9fd7388` | 동일 고유 Runner result `pcOperationalApprovedSha` | **CONFIRMED 승인 포인터 필드**. 구체 `run-local.mjs` / `market.mjs` / `publish.mjs` **설치된 파일별 SHA는 UNKNOWN**. 이 승인 포인터와 설치를 동일시 금지 |
| 더 이른 승인 A 비교용 | `b886a1234a8a728957ab8e73394c5ea12e1b9acc` (2026-11-16 Run 43838924773) | Issue [#1609](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1609) / `results/43838924773-1-seat-2.json` | 다른 시각·operation의 필드이므로 현재 실제 설치 판단에 혼합 금지 |
| PC Writer 운영 실제 설치/실행 정확 파일 SHA | **UNKNOWN** | 위 A 경로가 archive-status/D05 읽기 전용이고 현재 Writer file integrity manifest 미제공 | **#01 FIRST UNVERIFIED**. 운영 설치 검증을 우회해 main SHA를 복제 판정하지 않음 |
| Cloudflare Git Integration 해당 main SHA build | `2aa9cd28053c03be8fb34cbc87794e59f566cbde` / Build ID `04fd804c-59d4-4877-bc87-9d4642b6e0f6` | GitHub commit check-run **Workers Builds: zgmini-migration-candidate-r5**, `completed/success` 2026-11-17 10:13:41Z, [빌드 세부 화면](https://dash.cloudflare.com/6e9b57e718b247330a6efa42a9516e95/workers/services/view/zgmini-migration-candidate-r5/production/builds/04fd804c-59d4-4877-bc87-9d4642b6e0f6) | **CONFIRMED exact Git Integration build success**. 활성 Production Deployment ID, 배포 시각, 현재 API/UI Serving SHA **확정 아님** |
| 같은 SHA GitHub Node CI | `2aa9cd28053c03be8fb34cbc87794e59f566cbde` | check runs `check`, `verify`, `notify` 모두 completed/success | **CONFIRMED CI**. 배포와 구분 |
| 공개 화면 실측·원점수 | 390px/1440px 종합 37.8 / raw `46.500970651971905` | 기존 GitHub Chrome Run [44042680379](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44042680379), 2026-11-17 07:57~08:01 UTC | **기존 Production UI readback PASS**, 그러나 더 최신 10:13Z build의 exact active deployed SHA 검증 아님 |

## LAST PASS / FIRST UNVERIFIED

- **LAST PASS:** 개발 main / W06 branch / control main 3종 SHA, 읽기 전용 A result의 requestedSourceSha·pcOperationalApprovedSha·controlSourceSha/actualExecutionSha 분리, Cloudflare 해당 main SHA 정확 build ID/성공 상태 확인. 동일 SHA를 무근거 복제하지 않음.
- **FIRST UNVERIFIED:** 운영 PC Writer **실제 설치 파일별 SHA 및 승인 매칭**, Cloudflare **현재 활성 Production Deployment ID/SHA**. 둘은 실제 Runtime·배포 증거가 필요한 별도 사실. #01은 이 누락으로 **PARTIAL/STATE_UNKNOWN**, 75단계 DONE 증가 **0**.
- **Owner 경계:** W06이 지금 확보 가능한 GitHub/승인 Runner 결과/기존 공개 UI를 직접 검증했다. Writer 실제 파일 설치 버전 확인은 Writer/승인 A 해당 소유 범위이지 공통 총괄의 새로운 기능 업무가 아니다. Cloudflare 활성 SHA 조회는 W06 통합·사이트 업무로 남는다.
- **프로세스 총괄 신규 인계:** **0건**. 공통 Controller·공통 설치기의 FIRST FAIL 없음. 새로운 승인 요청·Issue·설치·SQL·재실행 없음.
- **다음 W06 독립 작업:** #28 동일일 실제 계산점과 재구성 현재 vintage 역사 및 서로 다른 방법론 차트 연결 방지. #01/74/75의 미확인 사실을 독립 UI 검증의 Gate로 삼지 않는다.

## 후속 source 전진 (2026-11-17 19:30 KST 조사)

- 이번 조사 도중 `zgmini/main`이 `0bef187a1e7ce632ecc15a4724fd24600650859f`로 다시 이동. GitHub compare (`2aa9cd28...0bef187a`) **정확 1커밋**, W01 A4-01 SQLite 읽기 전용 진단 스크립트·그 테스트 **2파일만 수정**. W06 #01/28의 모델·UI source 경로 수정 0.
- 상기 버전표의 `2aa9cd28`은 **당시 main HEAD 및 해당 SHA의 Cloudflare build 성공 증거**로 보존하며, 지금 시점 최신 개발 main은 `0bef187a...`임. 후행 source 변경이 설치나 활성 Production 갱신이라는 뜻은 아님.
- 현재 main에 대한 별도 Cloudflare active Deployment ID/SHA·PC Writer 운영 설치 SHA는 여전히 UNKNOWN. 프로젝트 전체가 갱신될 때마다 근거 없는 PC/배포 자동 일치를 주장하지 않는다.

## W06 #28 소스 반영 후 신규 개발 HEAD 구분 (2026-11-17 19:40 KST)

- `zgmini/main@87d8cff5a5653413b116d45592133fa6359de475` **직접 remote ref 확인**. 이는 W06 [PR #1248](https://github.com/ansqhd5774-Choi/zgmini/pull/1248) 4파일 squash Merge의 새 **개발** source SHA이며, 이전 표에 적힌 `2aa9cd28`/후속 `0bef187a`의 과거 관측 시점도 보존한다.
- 이 main SHA의 GitHub Cloudflare Git Integration Workers Builds 상세 Build ID는 `f4e474f3-e8da-4fb8-aabf-6846082f9a24`. **처음 관측 시 status=in_progress**. GitHub Actions CI 수행/Cloudflare Build 성공/active Production Deployment의 각 층위는 별도. 실서빙 SHA가 변경됐다고 추정하지 않는다.
- PC 운영 승인 A `pcOperationalApprovedSha=2070ff53549e...`는 11/17 이전 실행 원장 증거로만 보존. 위 새 main SHA를 PC 실설치 SHA로 대체하지 않음. 정확 Writer 파일 설치 SHA **UNKNOWN**, Production Deployment **UNKNOWN** → #01 PARTIAL 유지.

## W06 #28 merged source Cloudflare Build result (2026-11-17 19:42 KST)

- `zgmini/main@87d8cff5a5653413b116d45592133fa6359de475`의 Workers Builds 체크 `completed/success`(2026-11-17T10:41:37Z), exact Build `f4e474f3-e8da-4fb8-aabf-6846082f9a24` 재조회 PASS. **Git Integration Build 성공은 active Production Deployment ID/SHA·실서빙 검증과 같지 않음**.
- #01 완료조건인 PC Writer 실설치 파일별 SHA와 active Cloudflare exact Deployment SHA는 계속 UNKNOWN. 승인한 PC A 결과 `2070ff53...`를 실설치 SHA로 보정하거나 GitHub main SHA를 PC 자동 설치 완료라고 기록하지 않는다. #01 PARTIAL/22/75 유지.

## W06 #01 승인 A 단일 조회 — 실제 PC 고정 checkout 파일별 SHA 확보 (2026-11-17 20:56 KST)

- **신규 고유 승인 A Issue:** [#2010](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2010) (`requestId=pc-a637755d-e243-44be-b49a-027f1707a9f8`). 과거 승인 `approvals/writer-preimage/d05-selected7-lineage-20261111.json` 원본 blob `f4960d4e61b365f257eeacc67696f2db0f0df5ae`가 이전 승인 실행 시점과 현재 control main에서 **동일**임을 재조회하고 승인 manifest SHA256 `f4c7110367a582f68c29e1a6e07ff7aaa1ecad757159d9abca67c460cc9efabd`를 재사용. 신규 Controller/manifest/예약/전용 CMD 생성 0.
- **실제 Windows 실행:** [Actions Run 44077954012](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44077954012), `zgmini-pc-04`/seat4, `PASS/WRITER_APPROVED_PREIMAGE_READONLY` (`firstFail=null`); [결과 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/44077954012-1-seat-4.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/44077954012-1-seat-4.txt) 2/2 readback PASS.
- **다른 SHA의 계층:** 요청 GitHub 제품 main `c3f60a3ce2eb1015f91545cbe94745d23c8aef18` (개발 소스); A 실제 Controller 실행 `f7f1559bc0ef15bb9b375982d048369c474c490f` (운영 Controller); PC 승인 포인터=고정 checkout HEAD=config.source=checkpointSource `2070ff53549e2f9f2cea57d5af7e1d83f9fd7388` (제품 PC 승인 source). 이 세 값을 상호 대체하지 않음.
- **현장 해시 확인 (2026-11-17T11:53:09.187Z):** 고정 PC `E:\ZGmini\projects\zgmini-earnings-history-pc-release`의 `scripts/pc-writer/run-local.mjs` 실제 파일 존재·SHA256 `d7f601aaba137de807ef9b065ea9be7ff31a2e7b4fe199452c18cd0b839a8300`; `scripts/pc-writer/market.mjs` 존재·SHA256 `192b4c3aa2e3237ffe73200d0c713e20d7f89ced53e3fb1d156fb857de6925fd`. 둘 다 `trackedDirty=false`; D05 승인 scoped 12파일 **12/12 PRESENT**. 추가 8개 `A` 경로는 이미 존재하므로 `existingAdditionCollision=true`는 조회의 사전 원본 상태이며 신규 설치 거부/충돌 또는 운영 오류로 해석하지 않음.
- **보호/제한:** `protectedStateUnchanged=true`, providerCalls/operationalWrites/d1Writes=0, SQLite 열기 없음. 결과 `evidenceLevel=FIXED_CHECKOUT_NOT_LIVE_CORE_PROCESS`, `runtimeSourceVerified=false`, `coreTaskSourceLinked=false`, `gitTracked=UNKNOWN`. **고정 checkout 파일 해시만 검증**, 현재 가동 Core 프로세스가 그 바이트를 로드했는지는 증명되지 않음. 이번 승인 범위에는 `scripts/pc-writer/publish.mjs` 미포함: 그 파일의 현장 SHA도 **UNKNOWN**.
- **이미 확인된 역사적 설치:** 기존 [Writer B #1234](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1234) / [Run 42926880769](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/42926880769)은 2026-11-10T23:54Z 12개 경로의 `WRITER_B_INSTALLED_VERIFIED`를 입증했으나, 당시 로컬 overlay SHA `d560eb857c0f8a9a53dffbfd899e60ee29c697ab`를 **오늘 운영 source** 또는 현재 `run-local.mjs`·`market.mjs` 개별 SHA와 동일시하지 않음.
- **영향·상태:** #01 제품 PC 승인 checkout 2개 핵심 Writer 해시 증거는 새로 확보, 그러나 `publish.mjs`/실행 중 Core 코드 버전/활성 Cloudflare Deployment exact SHA는 여전히 미증명 → **#01 PARTIAL**, 고유 DONE **22/75(29.3%) 유지**. 공통 Controller/Runner 신규 FIRST FAIL 없고 총괄 신규 인계 **0건**.
- **다음 최소 확인:** 추가 승인 없는 임의 파일 조회·설치/재실행으로 우회하지 않음. 기존 Writer 기능 원담당의 승인된 현재 실행기/파일 무결성 영수증이 확보되면 `publish.mjs` 및 Core 실제 로딩 SHA만 읽어 #01 PC 잔여를 닫는다. W06은 별도 #75 Cloudflare active Production Version/Deployment read-only 대조와 공개 화면까지 직접 책임.
