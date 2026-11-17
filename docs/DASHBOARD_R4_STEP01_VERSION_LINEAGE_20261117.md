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
