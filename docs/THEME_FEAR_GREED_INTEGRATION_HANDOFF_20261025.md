# 테마 공포·탐욕 통합 개발 브랜치 — 작업 원장 / 인수인계

- 작성일: 2026-10-25
- 저장소: `ansqhd5774-Choi/zgmini`
- 통합 브랜치: `codex/theme-fear-greed-integration-20261025`
- 생성 기준 최신 main SHA: `f9312d5069754dc82b4d5a93cc7712dbdac4b640`
- 상태: `SELECTIVE_PRIVATE_SOURCE_RECOVERED / FIXTURE_TEST_PASS / PC_SPY_RAW_SHA_VERIFIED / CI_PASS / PRIVATE_SPACE_REAL_PRICE_AUDIT_PENDING / NOT_MERGED / NO_RUNTIME_CHANGE`
- 저장소 `delete_branch_on_merge=false` 확인(2026-10-25). 병합 완료 후에도 작업 브랜치를 **보존**한다.
- 본 문서는 읽기 전용 감사에 근거한 인수인계다. 설치·PC 데이터 변경·D1 게시·main 병합의 증거가 아니다.

## 목적과 작업 지속성

기존 9개 테마, 10번째 데이터센터·전력, 신규 우주·위성 후보를 동일한 **테마 공탐 작업 원장**에서 관리한다. 채팅이 바뀌어도 기준/완료 SHA/검증 증거/남은 작업을 추적한다. 운영 중인 기존 9개 테마의 계산·원자료·게시·스케줄러를 변경하지 않는다.

완료 흐름: `통합 브랜치에서 최소 변경 → 테스트·PC 독립 검증 → PR → main 병합 → 브랜치 보존 → 원장 갱신`.

## 2026-10-25 GitHub 읽기 전용 감사 결과

### main이 이미 포함한 승인 기준

1. `AGENTS.md`: 최신 main 우선, 마이그레이션/분석 브랜치 전체 병합 금지, 필요한 파일만 선택적으로 회수.
2. `config/theme-data-registry.json`: 기존 7개 legacy 파이프라인이 `SPY`를 기준 자산으로 등록. raw manifest 미등록 항목은 존재/재사용을 단정할 수 없다.
3. `lib/market-score/theme-etf-provisional-score.mjs`: 7개 테마의 R158 기준 종목 `['SPY','BOTZ','ROBO','SKYY','CLOU','DRIV','NLR','URA','ITA','SHLD','FINX','ARKF','CIBR','BUG']` 및 기준가격 `SPY` 사용.
4. `docs/THEME_DATA_OPERATIONS.md`: 독립 manifest / 원본 SHA256 / 가격모드 / 관측일 / 권리검증. 다른 테마의 SPY를 공유하는 경우 **공유 원본을 별도 등록하고 승인된 어댑터로 참조**하도록 규정. 점수 역산/무근거 단순 복사 금지.
5. `docs/THEME_ETF_ADAPTIVE_OR_R2_20261025.md`: 사용자 승인 `WORK_RULE_APPROVED / GITHUB_POLICY_ONLY`. 신규 선정은 기존 경로 **OR** 신규 혁신 경로, 40/377/628일 경계, R188 축 T40/R20/V40, 장기/단기 70:30→50:50, 1년 252거래일 표시. 기존 9개는 재선정·재계산하지 않음.

### 관련 작업 브랜치 / 회수 분류

| 출처 브랜치 | 최신 main 대비 감사 시 | 회수 분류 |
| --- | --- | --- |
| `codex/theme-data-contract` | ahead 3 / behind 168 | 데이터 등록부·운영 문서는 main에 이미 존재하므로 동일 내용 중복 이식 금지; 변경점만 검토 |
| `codex/theme-fear-greed-r2-shadow-20261023` | ahead 24 / behind 191 | **미승인 실험**. AUM 비중 등 최신 10/25 승인 OR R2와 충돌할 수 있어 산식 전체 병합 금지; 무해한 진단 도구만 검토 |
| `codex/data-center-power-r1-20261024` | ahead 7 / behind 22 | 10번째 테마 private 검증·manifest·SPY 수집 방식의 작업 증거; 출시·스케줄러 변경 여부는 별도 gate |
| `codex/space-satellite-selection-r4-20261025` | ahead 23 / behind 2 | 우주·위성 40/377/628 적응형 후보 코드·R5 진단. 부분 회수 후보, R6 SPY 재수집은 보류 |

참고 PR: [#692](https://github.com/ansqhd5774-Choi/zgmini/pull/692) 데이터센터·전력 / [#711](https://github.com/ansqhd5774-Choi/zgmini/pull/711) 우주·위성.

### SPY 재수집 판단 오류

우주 R5가 기록한 `SPY=0`은 `E:/ZGmini/data/themes/space-satellite/raw-manifest.json`이라는 **우주 테마 한정 위치**의 값이다. PC 전체나 기존 9/10번째 테마의 SPY 원본이 없다는 증거가 아니다. R6의 NASA+SPY 신규 수집기는 **실행 중지 유지**한다.

10번째 데이터센터·전력 R4 PC 비공개 검증은 `DTCR/GRID/SPY` 원자료로 관측일 2026-10-23, 점수 12.32143을 산출한 기존 기록이다. 이후 2026-10-25 PC read-only 검증으로 **SPY만** 실원본 SHA·가격모드·관측일을 확인했다. DTCR/GRID 원본·R4 점수 재계산 일치까지 검증한 것은 아니다. 기존 SPY를 같은 관측/가격 계약으로 비공개 참조하므로 SPY 신규 GET을 실행하지 않는다.

## PC 제출 SPY 원본 증거 (2026-10-25)

사용자 제공 `THEME_SPY_SHARED_R1_RESULT.txt` 실제 실행 결과: `RESULT=PRIVATE_SPY_SOURCE_VERIFIED_NO_PROVIDER_CALL`, `status=PRIVATE_SPY_RAW_SHA_VERIFIED_ONLY`.

| 검사항목 | PC 확인값 / 해석 |
| --- | --- |
| 원본 테마 | `data-center-power` (Space 자체에 SPY 0개여도 PC 전체 부재가 아님) |
| manifest SHA256 | `76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e` |
| SPY 원본 | SHA256 검증된 5개 manifest 파일, 파일별 실제 바 무결성·시간 정렬·중복 충돌 검사 PASS |
| 실제 고유 시간봉 | `11295`개, `2024-01-02T09:00:00Z` ~ `2026-10-23T23:00:00Z` |
| 모드 | `RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE` (공식 일간 종가 아님) |
| 권리 | `rightsVerified=false`, `publicationAuthorized=false`; 별도 검증 전 공개·운영 사용 금지 |
| 부작용 | `providerCalls=0`, `d1Writes=0`, `publicWrites=0`, `schedulerWrites=0` |

검증 완료 범위는 **SPY 비공개 저장원본 존재와 무결성**뿐이다. 252개 일별 benchmark 값, UFO/NASA와 겹치는 실거래일, R188·신규 OR 점수, 10번째 R4 parity, 법적 권리·자동 게시 정상은 아직 실측되지 않았다. 결과 파일에는 저장 가격·비밀값이 없다. 같은 SPY read-only CMD를 다시 요구하지 않는다.

## 실제 코드 통합 결과 (2026-10-25)

- `main` 직접 확인: `scripts/pc-writer/theme-data-center-power-r1.mjs` 및 `tests/theme-data-center-power-r1.test.mjs`는 이미 **동일 원본 SHA로 존재**. 중복 이식 대신 현재 `main` 소스를 계승한다. 기존 등록부·collector·reader의 최신 main 코드도 우선한다.
- 우주 브랜치 #711의 검증된 **비공개 신규 테마 계산 모듈** 3개와 테스트 2개를 파일별로 선택 이식했다.
  - `scripts/pc-writer/theme-optional-adaptive-r2.mjs`
  - `scripts/pc-writer/theme-optional-pair-weight-r3.mjs`
  - `scripts/pc-writer/theme-space-satellite-adaptive-r2.mjs`
  - `tests/theme-optional-adaptive-r2.test.mjs`, `tests/theme-optional-pair-weight-r3.test.mjs`
- 추가 구현: `scripts/pc-writer/theme-shared-spy-readonly-r1.mjs`. 기존 **데이터센터·전력 또는 AI/바이오**의 저장된 SPY manifest와 raw 파일을 SHA256·출처·가격 모드·시간 정렬·실제 bar 검증 후 **비공개 분석에서만** 참조한다. 가격 복사·신규 ETF GET·D1·스케줄러 쓰기 없음. source manifest/원본은 절대 수정하지 않는다.
- 우주 비공개 검산기는 인수 `sharedSpyThemeId:'data-center-power'`를 **명시했을 때만** SPY를 참조한다. 우주 폴더 자체 SPY와 중복되면 실패하며, 합성 700거래일의 원래 독립 SPY 점수/전체 이력과 0차이 검증. 기존 기본 인수 동작은 유지. 공유 SPY 조합의 `sourceVersion`은 두 manifest provenance가 포함된 별도 해시이며 권리·공개 승인 false.
- 새로운 테스트 `tests/theme-shared-spy-readonly-r1.test.mjs`과 기존 R2 테스트 확장. 로컬 Node v24에서 `node --test tests/theme-optional-adaptive-r2.test.mjs tests/theme-optional-pair-weight-r3.test.mjs tests/theme-shared-spy-readonly-r1.test.mjs` **3개 테스트 파일 PASS**. 이것은 **합성 fixture 결과**이며 실제 사용자 PC SPY 유효성/권리/운영 PASS가 아니다.
- **완료된 CMD:** 2026-10-25 사용자 Desktop `THEME_SPY_SHARED_R1_RESULT.txt` 제출, 데이터센터·전력 SPY 5개 원본 SHA / 11,295 실제 1시간봉 무결성 PASS. 실행 코드는 고정 커밋 `614168b14b547977d335ce90097535a0932d80fc`, 원래 검사 코드 SHA256 `663d3414fc49231b93f7f42071d8b2e9d219e11f8e50385d63066790e2db6f1d`. 재실행 금지(새 원본 갱신 시 별도 변경 근거 필요).
- **GitHub CI PASS:** 통합 브랜치 커밋 `0ea30a1596c660a003f0aada8e9fe657fe0c508d`의 Node.js CI run [#40184047498](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/40184047498) `completed/success`. 이 후 원장 변경으로 커밋 SHA가 바뀌면 새 HEAD 기준 검증을 다시 구분한다.
- **미완료:** 우주 UFO/NASA 실데이터와 공유 SPY의 일별 겹침·점수 검증, NASA 권리 검사, 우주 최종 선정, 공개 feed/D1, 기존 9개 PC runtime 비회귀 검사 및 main 병합. 현재 PR [#714](https://github.com/ansqhd5774-Choi/zgmini/pull/714)은 Draft.

## 통합 실행 작업 순서 (미완료)

- [x] 기존 테마·10번째·우주 및 Shadow 브랜치 범위를 GitHub에서 비교
- [x] 최신 main 승인 기준/등록부/운영 문서 조사
- [x] 전용 통합 브랜치를 최신 main에서 생성
- [x] 통합 작업 원장에 근거 및 미완료 게이트 보존
- [x] 승인된 R2 비공개 계산기와 우주 후보 계산기·테스트 선택 이식
- [x] SPY 원본 공유 read-only 어댑터·테스트·Desktop CMD 제작 (fixture PASS, PC 미실행)
- [x] 10번째 데이터센터·전력의 SPY 실제 PC SHA/원본/모드/관측일 확인 (5개 SHA-verified, 11,295 hourly); 재사용 비공개 후보 확보
- [ ] 기존 7개 legacy, 8번째 AI, 9번째 바이오의 SPY 등록·실원본 경로 및 재사용 현황 표 보강 (이미 운영하는 9개 수정 금지)
- [x] 기존 manifest SHA를 검사하는 공통 SPY read-only **비공개** 참조 어댑터 설계 및 fixture 테스트 (기존 데이터 변경 0); 운영 등록/승인은 미완료
- [ ] 우주 후보 NASA/기타 ETF 가격 확보 **전** 원본 reuse/rights 검증, NASA만 필요한지 결정
- [ ] 10/25 승인 OR R2와 비교하여 우주 브랜치의 필요한 구현만 선택적으로 이식하고 경계 테스트
- [x] 통합 PR Node.js CI run #40184047498 PASS (당시 HEAD `0ea30a1`)
- [ ] 공유 SPY + 우주 UFO/NASA 실제 PC 일별 유효 세션·score read-only 실측 (추가 SPY GET 금지)
- [ ] 기존 9개 결과와 PC 원본·D1·스케줄러 영향 0 검증; 신규 테마 실제 PC 결과 검증
- [ ] 최종 GitHub PR + CI/사용자 승인 gate 통과 후 **main 병합**
- [ ] 병합된 exact SHA 기록 및 **통합 브랜치 보존** 확인, 이후 새 작업을 같은 원장에 이어서 기록

## 절대 금지

- 이전 개발/분석 브랜치 **전체 일괄 병합**, 임의 산식/가중치/공급원/DB/스케줄러 변경.
- 미관측 데이터를 0이나 과거 점수로 채우거나 지연 자료를 오늘 관측으로 둔갑시키기.
- 원본 SHA·가격 모드 검증 전 SPY 재수집을 정당화하거나 재사용 성공으로 단정하기.
- PC 원본, 키, 개인정보를 GitHub에 올리기.
- 통합 브랜치의 검사 성공을 main 병합·Cloudflare 생산 배포 완료로 보고하기.

## 다음 대화 시작점

1. 이 브랜치의 **최신** 원장과 main SHA를 읽고 drift 확인.
2. 위 체크리스트 중 첫 미완료 단계부터 진행.
3. 각 단계에서 승인/실행/검증/실패를 나누어 갱신. 이전 성공 증거를 불필요하게 반복하지 않는다.
4. 사용자에게 CMD 실행이 필요한 경우에만 Windows CMD 파일 또는 정확한 명령과 저장 위치를 안내. 기존 데이터·운영 작업은 임의 초기화 금지.

## 2026-10-25 추가 — 9개 ETF 전수 조사 및 R7 NASA 전용 수집 준비

- 조사 문서: `docs/THEME_SPACE_NINE_ETF_SCREEN_R7_20261025.md`. NASA/UFO/WARP/ORBX/MARS/ARKX/ROKT/DIPR/WSPC를 발행사 규모·호가·순도·이력·중복과 권리로 비교. **초기 2개 티커 선정은 확정 조건이 아니며**, NASA는 자료상 최우선 **실가격 수집 검증 후보**. NASA 2026-10-23 보유자료 SpaceX 약 27.98% 집중도 확인. 최종 ETF 조합 미확정.
- 기존 PC UFO **656일** 보존, 데이터센터·전력의 기존 SPY 원본 SHA 검증 11,295 1시간봉 재사용. **UFO/SPY Provider 재수집 금지**. 기존 R6 NASA+SPY 수집 CMD 실행 중지 지속.
- 안전 대체 코드: `scripts/pc-writer/theme-space-satellite-r7-nasa-only.mjs`, `.cmd`, `tests/theme-space-satellite-r7-nasa-only.test.mjs`, `tests/theme-space-satellite-r7-launcher.test.mjs`. NASA만 수집(`2026-03-30`~`2026-10-23`), 사용자 CMD 명시 실행, 최대 4 GET/회, 별도 R7 checkpoint, 이미 있는 NASA raw나 오류 시 자동 중단, raw+manifest SHA 저장만 허용. CMD와 같은 Desktop 위치 `SPACE_SATELLITE_R7_NASA_RESULT.txt` 로그.
- 로컬 Node `node --test` **R7 2개 파일 PASS**(NASA만 요청/비회귀/402 재요청 차단/기존 NASA 존재 차단/4 GET pagination, CMD ASCII+CRLF+SHA). 실제 Windows PC 테스트·실물 NASA 가격 획득이 **아님**. JS 소스 SHA256 `d7346a52898b2c57d612d5b9ce11e7721dc45ab718ff1e883fba47281027877e`; CMD 해시 검증. GitHub에 신규 5개 파일 별도 commit 반영.
- 다음 사용자 작업: R7 Desktop CMD 직접 실행 → `SPACE_SATELLITE_R7_NASA_RESULT.txt` 제출 → 실제 NASA 원봉·UFO/SPY 공통 뉴욕 세션 N·정합성·보유 중복·권리 판정 → 조합 승인 여부 결정. 결제/제한 HTTP 402 시 STOP; 무단 반복 금지. D1/배포/운영과 메인 병합 모두 미실행, PR #714 Draft 유지, 브랜치 보존.

## 2026-10-25 사용자 PC R7 성공 및 R8 비공개 감사 준비

- 사용자 제출 `SPACE_SATELLITE_R7_NASA_RESULT.txt` 확정 결과: `PRIVATE_NASA_RAW_COLLECTION_COMPLETE`, **NASA API 1회/원본 1개 파일/1페이지**, `complete=true`, D1·공개·scheduler 쓰기 0. 이는 **NASA 실제 유효 거래일 N 검증이 아님**.
- R7 선택된 NASA의 신생 자료만 PC에 저장됨. 기존 UFO 656일 및 데이터센터·전력 공유 SPY 11,295 1h bar 재수집 금지 유지. 9개 ETF 비교 문서 `docs/THEME_SPACE_NINE_ETF_SCREEN_R7_20261025.md`에 PC 결과 반영.
- R8 신규 파일 `scripts/pc-writer/theme-space-satellite-r8-real-audit.mjs`, `.cmd`, `tests/theme-space-satellite-r8-real-audit.test.mjs`, `tests/theme-space-satellite-r8-launcher.test.mjs`. 이미 통합 브랜치에 있던 검증된 R2 계산기/공유 SPY 판독기를 호출하는 **읽기 전용** 엔트리. 저장된 NASA/UFO + 데이터센터 SPY SHA/세션 N/최신 시점/252 표시/비공개 점수만 출력. 단독 NASA 수집처럼 Provider 0, D1 0, Scheduler 0.
- 로컬 R8 및 원래 산식/공유 SPY 관련 **Node 테스트 5파일 PASS**. R8 Desktop CMD는 소스 6개 SHA256 고정/ASCII+CRLF/기본 E: 경로. Windows PC 실데이터 실행 **미실시**, 현재 `PC_R8_REAL_N_PENDING`, `FINAL_ETF_PAIR_NOT_APPROVED`, `PUBLICATION_NOT_AUTHORIZED`.
- 다음 작업은 R8 CMD 실제 사용자 실행 후 `SPACE_SATELLITE_R8_REAL_AUDIT_RESULT.txt` 수령. 통과하면 ETF 종목 편중·중복 실증검토 → 최종 조합 승인 → 권리·공개 게이트. PR #714 Draft 유지, main·운영 배포·D1 변경 0, 통합 브랜치 삭제 금지.

## 2026-10-25 R8 PC 실제 우주·위성 계산 및 발행사 holdings 중복

- 사용자 제공 `SPACE_SATELLITE_R8_REAL_AUDIT_RESULT.txt`: 실제 SHA 검증 로컬 가격을 읽어 **UFO 656 / NASA 144 / SPY 706 유효 거래일**, 세 ETF 공통 **144일**, 모두 2026-10-23 최종 관측일. 공유 SPY 11,295 실제 1h 바 재사용. Provider/D1/공개/Scheduler 변경 0.
- **현재 날짜의 비공개 ADAPTIVE_R2 점수 39.95701**, UFO 63.828% / NASA 36.172%, `isCurrent=true`, `PRIVATE_PRIORITY_PAIR_READY`. 최종 편입/권리/게시 승인 **아님**. 252 표시 구간 중 실제 점수 **29일**, 결측 **223일**. 결측/구간은 임의 채우지 않는다. 한 해 차트 완성 게이트 미통과.
- 2026-10-23 동시점 공식 보유공시 비교: NASA/UFO 상위 10개 모두에 SpaceX, RocketLab, AST SpaceMobile, Viasat 4종 공통. 4종 한정 `sum(min(UFO_NAV%,NASA_NAV%))=27.57%p` **전체 중복 하한**. 현 가중치의 SpaceX 환산 노출 약 20.219%. NASA는 SPV를 통한 비상장 SpaceX 일부 지분을 원가로 평가할 수 있음. 출처 https://temaetfs.com/nasa , https://www.procureetfs.com/ufo/ .
- `docs/THEME_SPACE_NINE_ETF_SCREEN_R7_20261025.md`에 PC R8 수치와 4종 교집합, 제한/권리/차트 결측 기록. 기존 산식·가중치·9개 운영 점수/DB·스케줄러 변경 없음.
- 통합 브랜치 R8 계산기/검증테스트 커밋 `7500fa8a9be23616dda5f7a81d532b22234012fe`의 Node.js CI [#40186637867](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/40186637867) `completed/success`. 이후 문서 커밋의 CI는 별도 구분.
- 다음 단계: 기존 29/252만 실제 점수인 이유에 대해 UFO-SPY 628일 경계/첫 유효 점수 날짜를 **추가 Provider 없이 저장 데이터로만 확인**. 현재 1년 이력 게이트와 원가격/파생 공개 권리 검증 전 main merge/생산 배포 금지. ETF 최종 조합은 사용자 승인 필요. Draft PR #714 및 통합 브랜치 **보존**.

## 2026-10-25 최신 사용자 정정 — 1년 차트 부분 이력 정상, 미충족 판정 취소

- **최신 사용자 확정**: `1년 252거래일`은 차트 **표시창 우선**을 뜻한다. 최근 1년의 가격/점수가 부족하면 **628 미만 ETF에 승인된 적응형 R2 산식**을 그 당시의 실제 ETF·SPY 공통 거래일 N으로 사용하고, **신생 테마는 ETF 상장일부터 실제 확보된 이력만 그린다.** 초반 N<40에 계산 불가능한 점수는 결측, 상장 전/미관측 데이터를 만들지 않는다.
- R8 `29/252`만 산출됐다고 **'1년 완성 차트 실패' 또는 오래된 ETF 재선정 필수**로 판단한 이전 보고를 명시적으로 철회한다. NASA144일 등 신생 ETF의 부분 시계열은 정상이고, 252점 채우기 목표가 아니다. 이 원칙을 `docs/THEME_ETF_ADAPTIVE_OR_R2_20261025.md` 8절 및 `docs/THEME_SPACE_NINE_ETF_SCREEN_R7_20261025.md`에 영구 기록.
- **남은 실질 구현 쟁점**: 기존 R3 혼합 함수의 `장기 한 ETF N>=628` 조건 때문에 628 도달 이전의 날짜에는 각 ETF R2 점수가 존재해도 두 ETF 합성 테마 점수가 비어 있다. 사용자 최신 정정은 **ETF별 R2 적용**을 확정했지만, 기존 문서 4절이 명시적으로 미승인한 '두 ETF 모두 N<628인 당시의 쌍 혼합 비중'은 수치가 특정되지 않았다. 가중치를 자의적 50:50/70:30/100:0으로 가정하지 않고 별도 승인 후 구현한다.
- 기존 9개 테마 변경 0, UFO/NASA/SPY 실원본 보존, PR #714 Draft, Cloudflare/D1/운영 배포 0, 통합 브랜치 보존.

## 2026-10-25 사용자 최신 원칙 — 상대 신뢰도·ETF 수 확장

- **ETF 2개 사전 고정 금지**. 테마에서 조사·선정한 적격 ETF 수에 맞춰 2개, 3개 이상도 상대적으로 평가. 2년·1년·29일인 셋의 동일 1/3 가중치는 부적절하고, **29일짜리의 비중은 더 낮아야 함**. 같은 기간 29일 ETF 둘은 **서로 같은 50:50 상대 비중**이 합리적임.
- 기간/산식의 실제 점수 가용성과 상대 가중치는 구별. **N<40 점수 결측 기존 산식 유지**(29일에는 혼합 비중 원칙만 판단할 수 있고 실제 공탐 점수 산출은 불가). N40 이상과 점수 실측이 있어야 테마 혼합 점수에 반영.
- **숫자 미정**: 3개 이상 상대 비중 함수, 두 단기 ETF의 동적 혼합, ETF별 역사 시작일이 다른 날짜의 처리. 승인된 R3 2개 장단기 70:30→50:50 유지; 임의 1/n 또는 100:0 fallback 금지. 후속은 일반화된 비중 함수 숫자 제안→사용자 승인→비공개 검증→새 차트.
- 신규 테마만 해당, 기존 9개·공개 D1·스케줄러·main 변경 금지. 최신 확정 문서는 `docs/THEME_ETF_ADAPTIVE_OR_R2_20261025.md` 9절.

## 2026-10-25 추가 확정 — 세 ETF 비중 40:40:20 또는 50:40:10은 모두 예시

- 사용자가 명시한 세 ETF의 **40:40:20 및 50:40:10은 고정 비중이 아니라 실제 관측기간/산식 가용성에 따라 나올 수 있는 예시**이다. 날짜별 같은 상대 신뢰도 함수로 산출하며, 같은 데이터 길이/점수조건의 ETF 둘에는 동등 비중을 주어야 한다.
- 신규 테마의 적격 ETF 수는 2개 고정이 아니다. 숫자 함수 미승인이므로 기존 70:30→50:50을 함부로 일반화해 배포하지 않는다. 최소 점수 N40은 별도 승인 전 유지.
- `docs/THEME_ETF_ADAPTIVE_OR_R2_20261025.md` 9~10절 확인. 기존 9개/원가격/D1/Cloudflare/main/스케줄러 변경 없음.

## 2026-10-25 R4 상대 성숙도 계산기 비공개 작업

- **신규 파일만** 추가: `scripts/pc-writer/theme-optional-relative-weight-r4.mjs` 및 `tests/theme-optional-relative-weight-r4.test.mjs`. R3 및 현재 R8/UFO+NASA/SPY 원가격 코드 불변. 로컬 기존 테스트 포함 5파일 PASS. GitHub CI와 PC 실측/공개 결과는 별개.
- 구현된 **제안 수식**: `a_i=.30+.20*(min(N_i,377)-40)/337; c_i=a_i/(1-a_i); w_i=c_i/sum(c)`. 2종 long+short 구 R3와 일치; 모든 ETF 점수 실측 N>=40/parity 확인 후에만 합산. 두 120일 ETF=50:50; 세 ETF 700/252/40=46.079/34.172/19.748; UFO700+NASA144=63.828/36.172.
- **완료 아님**: 가중치의 3종 확대 숫자는 미승인. 50:40:10 등의 범위까지 구현되었다고 주장하지 말 것(기간 단독 제안 함수의 한계). 사용자 숫자 승인 후 비공개 R9 연결/PC 재검증 및 퍼블리시 권리 별도 조사 필요. R8 기존 29일 제한은 **아직 그대로**다.
- 통합 브랜치 Draft PR #714 유지, main/D1/스케줄러/기존 9개 변경 없음.

## 2026-10-25 R4 비중 민감도 선택 대기

- GitHub 코드 R4는 기본안 A(`w∝c_i`)만 비공개 후보로 구현. 사용자 예시 50:40:10까지 반영 가능한 대안 B(`w∝c_i²`)는 **수치 비교만** 하고 코드·운영 미적용.
- N=700/252/40에서 A=46.08/34.17/19.75, B=57.68/31.72/10.59. N=700/326/40에서는 B=50.80/39.87/9.33. B의 2종 R3 호환을 위해 ETF 수별 지수 분기 필요 → **사용자 선택/승인 대기**.
- 자세한 기준 및 한계: `docs/THEME_ETF_ADAPTIVE_OR_R2_20261025.md` 11~12절. Space R8 기존 29일 점수 제한은 아직 해결/PC 검증되지 않았다.

## 2026-10-25 사용자 정정 — ETF 조합 개수 상한 금지

- **최대 3개 금지**: 4개·5개·그 이상도 동일한 일반 함수로 처리. 3 ETF 비중 예시만으로 테마당 ETF 수를 제한하거나 코드에 3종 전용 분기를 넣지 않는다.
- 실제 R4 A는 배열 기반 n≥2(상한 없음), 4/5/10 ETF fixture 보강했고 기존 R2/R3/R8/공유 SPY 포함 5 테스트 파일 PASS. n=5 동등 이력 20%씩, 정상화 100%, 입력 순서 무관.
- 이전 ‘3개일 때만 차등 강화 B’ 제안은 **미승인/보류**. 정확한 다수 ETF 상대 신뢰도 함수 선정은 모든 n에서 일관되는 정량 설계가 필요. 원장/브랜치에는 이 제약을 기록하고 기존 R3·R8·기존 9개·main·운영을 변경하지 않았다.


## 2026-10-25 R9 비공개 실데이터 상대비중 Shadow 준비 및 원본 R8 보존

- 신규 파일만 4개 추가: `scripts/pc-writer/theme-space-satellite-r9-relative-audit.mjs`, `.cmd`, `tests/theme-space-satellite-r9-relative-audit.test.mjs`, `tests/theme-space-satellite-r9-launcher.test.mjs`. 기존 R2/R3/R4/R8 원본과 R8 SHA-pinned Desktop CMD는 **무변경**; 기존 9개 테마, data-root, feed, D1, scheduler, DNS, main 변경 0.
- R9는 사용자가 이미 확보한 UFO/NASA + data-center-power SPY 원자료를 SHA256로 다시 확인하고 **Provider 0회**로 R8 기존 일별 결과와 R4-A 제안형(ETF 개수 N≥2, 상한 없음)을 날짜별 비교. 기존 R8에서 계산된 날짜는 R4 점수와 오차 0.00001 이내 100% 일치하지 않으면 실패 처리. 새 R9는 N<40과 관측일 미일치 점수를 계속 결측으로 둔다. 사용자가 승인한 252거래일은 **표시창**이며 상장 전/결측 점수를 임의 생성하지 않는다.
- **합성 fixture 성적만**: UFO 656일 + NASA 144일 + SPY 656일로 R8 **29점 → R9 105점**, 새 실측 가능 일자 76점 증가, 기존 R3 유효 29점 전부 점수 일치. 새 2·3·4·5·10종 ETF 일반형 테스트. 이는 실제 사용자 PC 결과를 의미하지 않으며 실제 데이터 결측·장중 proxy 차이로 숫자가 달라질 수 있다. Node 테스트 총 8개 파일 PASS (R2/R3/R4/R8/SPY/R9).
- R9 단독 CMD는 기존 E: 경로를 **읽기만** 하고, SHA-pinned 8개 JS 전체가 같은 Desktop 압축해제 폴더에 있어야 실행된다. 로그는 CMD 폴더 `SPACE_SATELLITE_R9_PRIVATE_SHADOW_RESULT.txt` 생성(가격 원본/민감 정보 출력하지 않음). ZIP `SPACE_SATELLITE_R9_PRIVATE_SHADOW_CMD.zip` 압축 9파일 무결성 테스트 PASS. 사용자는 Windows CMD만 실행.
- R4-A는 최종 상대비중 확정/배포 **미승인**, ETF 최종 편입·보유종목 중복·라이선스/파생 공개 권리 **미확정**. R9 PC 실측 로그 수령·수치검토 이후 별도 승인 게이트. PR #714은 Draft 보존, main 병합 및 Cloudflare 자동배포 **불가**.


## 2026-10-25 R9 실데이터 BLOCKED 분석 및 비공개 패치

- 사용자 PC 제출 `SPACE_SATELLITE_R9_PRIVATE_SHADOW_RESULT.txt`: `status=BLOCKED`, `reason=THEME_R4_SCORER_PARITY_NOT_VERIFIED`. 소스 파일 SHA 검사 단계는 지나갔으며 Provider GET 0, 공개/D1/Scheduler 쓰기 0. **실데이터 105일 점수 검증 PASS로 보고하면 안 됨**. 원본 재수집·R8 재실행도 불필요.
- 코드에서 확인한 원인: 초기 R4가 `N < 377 ⇒ ADAPTIVE_PROVISIONAL, N ≥ 377 ⇒ R188_COMPATIBLE`을 강제했으나, 실제 R2의 R188 동등성은 **각 세부 지표의 252 유효 관측값 충족**으로 판정된다. 실제 결측/ETF-SPY 기준일 차이 때문에 N과 산식 동등성 상태가 서로 달라질 수 있다. 이것은 가격/점수 자체가 틀렸다는 증거가 아니라 **과도한 인터페이스 검증 조건**의 문제다. 사용자의 가격파일 내용과 첫 불일치 날짜는 제공받지 않았으므로 임의 추정 금지.
- 비공개 수정: `theme-optional-relative-weight-r4.mjs`에서 수치식·실제 가격·각 ETF 점수는 **그대로**, R2가 실제 출력한 유효 상태 `ADAPTIVE_PROVISIONAL` 또는 `R188_COMPATIBLE`만 받아들인다. `N≥40`, 점수 0–100 실제 존재, 중복 티커 차단, 미확인 상태 거절 등은 유지. 현존 테스트에 N600인데 잠정 상태인 결측 ETF 사례 및 N370이지만 점수 호환인 사례를 추가했다.
- R9 결측 UFO 데이터 합성 케이스, 기존 R3 long+short 비중 불변, R8 비회귀, 2/3/4/5/10 ETF 배열 공통 가중치 확인. 로컬 Node 테스트 8파일 **PASS**. 기존 승인/생산 파일 R8, R3, R2와 9개 공개 테마 변경 0. R9 CMD의 R4 SHA pin만 갱신한 **R9 재검증 ZIP** 필요. GitHub CI와 실제 PC 재검증은 별도.
- 다음 사용자가 직접 실행할 작업: 최신 R9 ZIP의 Windows CMD로 기존 저장 UFO/NASA/SPY를 읽는 감사 1회 재실행 후 `SPACE_SATELLITE_R9_PRIVATE_SHADOW_RESULT.txt`만 전달. 재수집/새 Provider 호출 금지. R4 함수 자체는 3개 이상 비중 최종 승인 전이며 main/D1/publication/Cloudflare 변경 금지, PR #714 Draft 유지.


## 2026-10-25 R9 수정본 실제 사용자 PC SHA 검산 PASS

- 사용자가 제출한 `SPACE_SATELLITE_R9_PRIVATE_SHADOW_RESULT(1).txt` 실제 PC 로그: `RESULT=R9_PRIVATE_SHADOW_REPORTED_NO_DATA_CHANGE`, `status=PRIVATE_ONLY_NOT_APPROVED_FOR_PUBLICATION`. 이번 결과는 합성 fixture가 아니라 **사용자 PC의 저장된 실가격 원본 SHA 검증 후 산출한 비공개 실측**. 로그 원본·가격·키는 GitHub에 올리지 않고 집계값만 보존.
- sourceVersion: `GMH_PRIVATE_COMBINED_MANIFEST_SHA256_5dbec845c99b29527d77c9525feb08c99e9e8223b5b4585271e7d96f03d3ec6e`, 기존 `data-center-power` SPY 공유, `sourceLastDatesAgree=true`, 원가격 모드 `UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12`.
- 확인된 실거래일: **UFO 656일/원본 2파일, NASA 144일/원본 1파일, SPY 706일/원본 5파일**, 세 티커 최신 관측 **2026-10-23** 동일.
- **1년 표시창 252일** 가운데 기존 R8 **29개 실제 점수** → 제안 일반화 R4-A 기반 R9 **105개 실제 점수** (**+76개**, 결측 147개는 그대로 결측, 보간·가공 과거 점수 0). 첫 R9 점수 날짜 **2026-05-27**, 최종 2026-10-23. 252개 점수 충족을 출시 조건으로 삼지 않는다.
- 최신 비공개 테마점수 **39.95701**, UFO **63.828%** / NASA **36.172%**; `latestScoreMatchesApprovedR3=true`. 기존 R3에서 실제 산출된 역사적 **29개 날짜 모두** R4-A 제안형 점수와 0.00001 이내 일치(`historicalSessionsMatchingApprovedR3=29`). 이는 기존 산식과 공통 구간 비회귀 검증이지만 R4-A 전체 구간의 투자 적합성 승인으로 확대하면 안 된다.
- `providerCalls=0`, `historicalSeriesWritten=false`, `publicWrites=0`, `d1Writes=0`, `schedulerWrites=0`, `rightsVerified=false`, `publicationAuthorized=false`, `finalBasketSelected=false`. GitHub Node.js CI run #40191243921 **completed/success** (당시 코드). 기존 9개 운영 테마/main/D1/Cloudflare 수정·게시·PR 병합 없음.
- **다음 게이트**: (1) ETF 최종 조합 2개 고정 없이 후보의 편입 순도·중복(이미 NASA/UFO SpaceX 등 중복 주의)을 재검토, (2) R4-A 임시 상대성숙도 가중식 vs 사용자 기대 비중을 날짜별 정량 검토 후 승인, (3) 데이터 권리·실제 공개 파생허용·업데이트 지연 검증 후 공개 여부 결정. R9가 PASS 했다는 이유만으로 자동 게시하지 않는다. Draft PR #714 및 통합 작업 브랜치 보존.


## 2026-10-25 R10 발행사 9종 재확인·N종 비중 불변식 검산 (브랜치 비공개)

- 상세 근거: `docs/THEME_SPACE_BASKET_WEIGHT_R10_REVIEW_20261025.md`. 공식 ETF 발행사 9종 UFO/NASA/WARP/ORBX/MARS/ARKX/ROKT/DIPR/WSPC의 우주 순도·관측일별 AUM/스프레드/상장 기간/미검증 상태를 분리. **후보 수=편입 수가 아니며 ETF 2종 또는 3종 상한 없음**.
- 2026-10-23 발행사 **동일일 상위10 holdings 4종 교차 중복**: NASA/UFO **27.57%p**, NASA/ORBX **54.30%p**, NASA/DIPR **28.48%p**, UFO/ORBX **34.13%p**, UFO/DIPR **43.09%p**, ORBX/DIPR **38.12%p**(확인된 교집합 기업의 min 비중 합계 하한; 전체 중복률 아님). **NASA↔ORBX 확인 기업 7개에 대한 중복 경제노출 하한 54.30%p** (SpaceX 25.64, Rocket Lab 9.03, AST SpaceMobile 5.50, Viasat 4.49, MDA 3.14, Firefly 3.52, Intuitive Machines 2.98%p). R8 NASA↔UFO 상위10 공유 4개 하한 27.57%p는 **coverage가 달라 전체 중복률 절대 비교 금지**. ORBX와 NASA를 동시 편입하는 판단에 집중 리스크 반영 필요. 종목 주가 산식 입력 없음.
- 실제 사용자 PC R9 상태 **보존**: UFO656/NASA144/SPY706, 252일 창 R9 105개 실제 점수, 최종 39.95701/UFO63.828%·NASA36.172%, 기존 R3와 29일 비회귀. WARP/ORBX/MARS 등은 발행사 정보만 확인했으며 **실제 ETF 점수/가격 N 미측정**.
- R4-A 변경 없이 합성 수식표로 n=2/3/4/5/10/20 검산. n=3에서 N700/377/40은 41.176/41.176/17.647%; k종에서 N40 한 종의 최소 비중은 `3/(7k−4)`, 즉 n3=17.647%, n4=12.500%, n5=9.677%. **50:40:10은 예시지 강제 목표가 아니며**, 3종 특례/미승인 지수강화 금지.
- 새 독립 테스트: `tests/theme-optional-relative-weight-r10-invariants.test.mjs`. 2·3·4·5·10·25·100 ETF로 정상화·순서독립·대칭성/기간우위 검증, 승인 2종 R3=70:30 보존, N39·ETF 1개 임의 점수 생성 차단. R2/R3/R4/R10/공유 SPY/R8/R9 **7개 Node 테스트 파일 로컬 PASS**. 이것은 **합성 유닛 테스트이지** 다수 ETF 실가격 확보가 아님.
- [GetMarketHistory 약관 5절](https://getmarkethistory.com/docs/terms)에는 raw bars bulk 재배포 금지 및 원시열 복원이 불가능한 파생 지표의 조건부 배포 근거가 있으나, 실제 사용 데이터셋별 권리 확인 게이트는 `rightsVerified=false`로 유지.
- **다음:** 발행사 동일일 전체 holdings 기반 ETF끼리의 경제노출 중복 지도 → 필요 ETF만 PC 실측 → 2개 이상 가변 basket과 상대비중 함수 명시 승인 → 권리 확인. 한 종만 유효한 날짜 처리도 별도 승인. 기존 9개/main/D1/Cloudflare/Scheduler·PR #714 병합·공개 게시 **0**.


## 2026-10-25 R11 사용자 직접 정정 — **ETF 2종 고정 아님 / 데이터 수집 가능성이 선정 기준**

- **최우선 최신 기준:** `docs/THEME_SPACE_DATA_AVAILABILITY_UNLIMITED_R11_20261025.md`. UFO+NASA는 R9 당시 **실측 가능한 2종**이었을 뿐 사용자가 ETF 수를 2종으로 제한한 적 없다. 3종 상한도 없다. **무료·허용 데이터 확보 가능하고 테마 관련성/PC 실측이 검증된 모든 ETF**를 개수에 관계없이 가변 후보로 평가한다.
- 9개 발행사 ETF 후보 전부 유지. **UFO/NASA만 R9 실측 N/점수 검증**; 나머지 WARP/ORBX/MARS/ARKX/ROKT/DIPR/WSPC는 미검증으로 보존하고 무료 카탈로그/기존 manifest·가격 실측부터 확인. 원가격 미수집을 영구 탈락으로 취급하지 않는다.
- 발행사 AUM·스프레드·SpaceX 중복 지표는 **경고 자료**. 정식 제외 근거/기준 승인 없이 높은 중복을 이유로 ORBX 등 임의 자동 제외 금지. 모든 가격 수집 가능한 적격 ETF는 평가 대상으로 남긴다.
- **새 순수 분류기** `scripts/pc-writer/theme-space-satellite-r11-universe.mjs`와 `tests/theme-space-satellite-r11-universe.test.mjs`: 후보 수 0·1·2·3·4·5·9·10·25·100 모두 입력 길이 유지, `CATALOG_LISTED`와 실제 `SCORE_PASS` 구분, N39 결측 및 위조 상태 차단. R11/R10/R4/R9 테스트 4파일 로컬 PASS. API GET/파일/D1/스케줄러 쓰기 0.
- **중요 코드 경계:** 기존 R4-A 합성기는 사전 승인 2종 R3·PC R9 SHA 재현을 위해 **무변경**. R4-A가 `n>=2`만 계산한다는 사실은 **ETF 선정 기준이 아니다**. 한 ETF만 실제 점수 가용인 날짜의 점수 게시 방식은 별도 승인; 점수 결측이나 R9 최신값 소급 생성 금지.
- [GetMarketHistory 공식 Coverage](https://getmarkethistory.com/docs/coverage)/[API](https://getmarkethistory.com/docs/api/reference): 미국 ETF 대상이라도 백필은 기호별 부분적, 무료 카탈로그만으로 전 기간 수집 성공을 단정 금지. 데이터는 통상 48시간 지연으로 당일값 위장 금지. 라이선스/권리 `false`, PR #714 Draft 및 main·D1·Cloudflare·기존 9종 운영 무변경.
- **다음 단계**는 수집 가능성 확인을 실제 후보 전체에 적용하고, 기존 데이터 재사용 후 부족한 후보만 최소 원봉 실측하는 것. **두 ETF를 선정하고 조사 종료하는 경로 금지**.


## 2026-10-25 R12 — ETF 수 제한 없는 7종 실공급원 조회 확인

- **최신 사용자 규칙 재확인:** ETF 개수 2개 고정 없음. 수집·검증 가능한 모든 ETF를 구성 대상에 포함한다. 임의 2/3개 slice 금지. R11 기준 유지.
- **실제 GetMarketHistory GET 실시:** 심볼 색인은 저장 원본 `1m`로 호출(잘못된 `1h` 색인 404 확인 후 수정). 새 ETF 7종 **WARP/ORBX/MARS/ARKX/ROKT/DIPR/WSPC** 모두 카탈로그 HTTP 200 + 무료 `1h` 실제 2026-10-23 비결측 가격봉 HTTP 200/심볼 일치 확인. 기존 UFO/NASA는 R9 PC 실측 보존.
- **새 5종 무료 1시간봉 UTC 관측일:** WARP **118**, ORBX **134**, MARS **162**(부분 페이지 159일+새 3일), DIPR **92**, WSPC **49**. 이 수치는 공급원 날짜 수이고 **SPY 공통 유효 N/R2 점수 통과 아님**. 특히 WSPC·DIPR은 저유동성 및 빈 거래일 별도 검증.
- **ARKX·ROKT**는 10/23 최근 샘플은 확인했지만 PC 기존 manifest 원본 항목이 있으므로 전체 과거 데이터를 다시 받지 않고 먼저 SHA 검산한다.
- 신규 증거: `docs/THEME_SPACE_LIVE_PROVIDER_AVAILABILITY_R12_20261025.md`. 안전한 재실행: `scripts/pc-writer/theme-space-satellite-r12-provider-probe.mjs` (`--probe` 전에는 무네트워크), 단위검증 `tests/theme-space-satellite-r12-provider-probe.test.mjs`.
- R12/R11/R10/R9 테스트 4개 파일 로컬 PASS. 기존 산식·승인 이력·원본/운영 9개 테마·D1·Cloudflare·Scheduler·main 변경 0. `finalBasketSelected=false`, `rightsVerified=false`, `publicationAuthorized=false`.
- **다음 Gate:** 기존 PC raw-manifest의 ARKX·ROKT SHA 읽기 전용 확인 → WARP·ORBX·MARS·DIPR·WSPC의 결측 기간만 제한적으로 PC 수집 → 저장된 원봉 SHA+SPY 공통 N+R2 실제 검산 → 승인 후에만 최종 가변 ETF 바스켓 산출 및 게시 검토.
- 2026-10-25 확인된 원격 main은 `7e0c05e8b1ba8c6a23fc1aa583938a35bbb1b92c` (작업 시작 브랜치와 8커밋 분기). 현재 브랜치만 수정, main drift 해소 없이 전체 PR 병합 금지.


## 2026-10-25 R12 NY15 추가 + R13 PC 전종목 원본 SHA 감사 준비

- R12 무료 공급원 1시간봉을 실제 기존 R2의 **뉴욕 15시 프록시** 기준으로 재검산: WARP 118일, ORBX 130일, MARS 162일, **DIPR 28일, WSPC 15일**. DIPR/WSPC의 전체 거래일 92/49를 점수 적격 N으로 오인하지 않는다. **두 ETF는 수집 가능 후보로 계속 유지**, 현재 승인 R2 40일 미만이므로 점수 편입 금지. SPY 교집합/로컬 SHA 검증 전 다른 3종도 PASS 아님. 참조: `docs/THEME_SPACE_LIVE_PROVIDER_AVAILABILITY_R12_20261025.md` 5절.
- 신규 R13 범용 **9종 전원 기존 PC 원본/manifest SHA** 읽기 전용 감사기: `scripts/pc-writer/theme-space-satellite-r13-local-universe-audit.mjs`, 테스트 2개, 7종 소스 SHA가 고정된 Desktop Windows CMD. 기존 `theme-space-satellite-adaptive-r2.mjs` NY15 함수 및 `theme-shared-spy-readonly-r1.mjs` SPY manifest 재사용. **임의 ETF 수 2/3개 상한 없음.**
- 개인 PC 실행용 `SPACE_SATELLITE_R13_EXISTING_RAW_AUDIT_DESKTOP_20261025.zip` (8파일 무결성 압축 검증), `scripts/pc-writer/theme-space-satellite-r13-local-universe-audit.cmd`. 로그는 CMD 옆 `SPACE_SATELLITE_R13_EXISTING_RAW_RESULT.txt`. 사용자 PC에서는 아직 실행 확인 없음.
- 단위 Node R13/R12/R11/R9 + R13 CMD 5개 테스트 파일 로컬 PASS. R13 PC READ_ONLY 이외 GET/저장/점수 계산/게시/스케줄러/운영 산식 변경 0. 근거 문서: `docs/THEME_SPACE_PC_MANIFEST_R13_20261025.md`.
- **다음 실행:** 사용자 Windows CMD에서 R13 전종목 read-only audit 결과 제출 → ARKX/ROKT 기존 원본 SHA 상태와 추가 5종 누락 범위 확인 → 필요한 무료 원본만 한정 수집/저장 SHA → SPY 공통 N과 R2 실제 점수 검증. 본 단계에서는 ETF 최종 개수/점수/가중치 또는 배포 승인하지 않는다.

## 2026-10-25 R13 PC 실증 → R14 누락 구간만 추가 수집 준비

- 사용자 제출 R13 실측 PC 로그: `PHASE=ALL_CODE_SHA256_VERIFIED`, `PRIVATE_READ_ONLY_SHA_AND_COMMON_DATES_ONLY`, provider 0, PC data writes 0. 소스 manifest SHA `b4f628d734e61f239c83ebd77c32c3c73e7eaaaf7c09bf260351e730cb861b38`, 공유 SPY SHA `76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e`.
- **ETF 조합 수량 상한 없음.** 9개 모두 후보로 유지; R14의 **6개는 최종 ETF 수가 아니라 R13에서 실제 발견한 누락 원본/기간 수집 대상 수**.
- 기존 UFO 656 / NASA 144 / ROKT 446 SPY 공통 15시 NY 거래일 SHA 확인 및 2026-10-23까지 일치. **절대 재수집 금지.**
- ARKX는 494일 보유하나 마지막 2025-12-18: 이후 2025-12-19~2026-10-23만 수집. WARP(5/7~), ORBX(4/15~), MARS(3/5~), DIPR(5/6~), WSPC(7/9~) 원본 없음 → 새 원본 수집. 각 시작일은 R12 실제 무료 API 샘플에서 확인한 기간이다.
- DIPR 28 / WSPC 15의 R12 실측 NY15 세션은 승인 40일 경계 미달. **데이터 수집 후보 유지**, 점수 미산출/결측 표기. 628일/40일 OR 경로 및 상대 AUM 가중치 **변경 없음**.
- 새 문서: `docs/THEME_SPACE_R14_MISSING_ONLY_COLLECTION_20261025.md`. 새 안전 도구: `scripts/pc-writer/theme-space-satellite-r14-missing-only.mjs`, `.cmd`; tests R14 collector+launcher. 시작 전 R13 전체 원본 SHA와 공유 SPY SHA 검사, 안전 잠금·별도 체크포인트·호출/원본 크기 제한·402/429 즉시 중단, SHA 고정 CMD. 1회 최대 6개 무료 1h GET, 의도적 수동 실행만; 원시 가격 GitHub 미업로드.
- 로컬 Node 테스트 관련 **7개 테스트 파일 PASS**; CMD 8개 소스 SHA 일치·CRLF/ASCII 검증 및 Desktop ZIP 9파일 무결성 PASS. **사용자 PC R14 실수집 아직 미실행**.
- 다음 사용자 작업: R14 ZIP을 Desktop 폴더에 전개 → R14 CMD 수동 실행 → Desktop의 `SPACE_SATELLITE_R14_MISSING_ONLY_RESULT.txt` 제출. `STOP_*` 또는 `BLOCKED`는 이유 확인 전 다시 실행 금지. `CHECKPOINT_READY_TO_MANUALLY_RESUME`이면 같은 CMD만 명시 재실행. 이후 **R15 read-only 9개 후보+공유 SPY 거래일·비공개 점수** 검증을 별도로 개발·판정.
- 상태: `R14_SOURCE_TEST_PASS / PC_R14_PENDING / NO_FINAL_BASKET_COUNT_CAP / rightsVerified=false / publicationAuthorized=false / NOT_MERGED / NO_PUBLIC_WRITES`. 기존 9개 운영 테마·신규 10번째 점수/가중치/산식/D1/DB/스케줄러/Cloudflare 변경 0. PR #714 Draft, main 병합 금지.

## 2026-10-25 R14 실측 성공 → R15 — 9개 후보 전수 개별 점수

- PC 사용자 첨부 `SPACE_SATELLITE_R14_MISSING_ONLY_RESULT.txt` 실측: `PRIVATE_MISSING_ONLY_RAW_COLLECTION_COMPLETE`, Provider GET 6, raw 파일 신규 6, WARP/ORBX/MARS/ARKX/DIPR/WSPC 모두 완료, pending 0, manifest 기존 5→11, 기존 파일 덮어쓰기 0. public/D1/scheduler writes 0. **실 PC 수집 성공**이지만 `r2ScoresVerified=false`, `rightsVerified=false`다. 반복 수집 금지.
- 차기 단계 R15는 9개 ETF를 전수 검사하고 개별 저장원본의 SHA, 공유 SPY, 뉴욕 15시 세션 수, 기존 R2 점수, 최근 252거래일 내 실제 점수·결측일을 **읽기 전용**으로 산출한다. ETF를 2개/3개/9개로 제한하는 조건은 없음; 기본 후보만 현재 실측 9개다.
- **현재 점수는 SPY와 마지막 동일 실측일에 실제 산출된 경우에만** 제공한다. 과거 점수는 현시점으로 대입 금지. 40일 미만은 watch/null. 기존 ETF R188/적응형 R2 산식 40:20:40 불변.
- 추가 구현 파일: `scripts/pc-writer/theme-space-satellite-r15-all-etf-score-audit.mjs`, 동일 이름 CMD, `tests/theme-space-satellite-r15-all-etf-score-audit.test.mjs`, `tests/theme-space-satellite-r15-launcher.test.mjs`, `docs/THEME_SPACE_R15_ALL_ETF_REAL_SCORE_AUDIT_20261025.md`. Node 관련 8개 테스트 파일 PASS; R15 Desktop ZIP 9개 SHA 고정 파일 무결성 PASS.
- **합성 fixture 검증과 실제 PC 가격 점수 검증은 다름**. R15 PC 실행·실측 로그 아직 없음. 소프트웨어는 `aggregateScore=null`, `aggregateWeights=null`, `aumWeightsVerified=false`, `publicationAuthorized=false`를 출력한다. 신규 테마 9개 개별 점수를 무근거 동일가중 평균으로 합치지 않으며, 다음 단계에서 최신 AUM·권리·방법을 별도 확인한다.
- 사용자 다음 동작: Desktop 새 폴더에 `SPACE_SATELLITE_R15_ALL_ETF_SCORE_DESKTOP_20261025.zip`을 해제한 뒤 `theme-space-satellite-r15-all-etf-score-audit.cmd`를 직접 실행. CMD 옆 `SPACE_SATELLITE_R15_ALL_ETF_SCORE_RESULT.txt`를 제출한다. 네트워크 0/PC 데이터 쓰기 0.
- 상태: `R14_PC_PRIVATE_COLLECTION_SUCCESS / R15_SOURCE_TEST_PASS / R15_PC_PENDING / NO_FINAL_BASKET_CAP / PR_714_DRAFT_NOT_MERGED / NO_RUNTIME_CHANGE`. 메인 병합·운영 배포·D1·DB·스케줄러 변경 0.

## 2026-10-25 R15 PC 9개 실점수 확인 → R16 결측 원인 전수 진단

- 사용자 제출 R15 실측 로그: `PHASE=ALL_CODE_SHA256_VERIFIED`, `PRIVATE_INDIVIDUAL_SCORES_ONLY_NOT_WEIGHTED_NOT_PUBLISHED`, `candidateCount=9`, `currentScoreCount=6`, `watchOrStaleCount=3`, source manifest SHA `1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b`, shared SPY SHA `76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e`. 네트워크·원본·운영 쓰기 0.
- 2026-10-23 실값: UFO 656일/34.88492 (R188), NASA 144/48.90703, WARP 118/60.5265, MARS 162/47.76741, ARKX 706/31.69048 (R188), ROKT 446/44.09211. 신규 ETF는 사용자 승인 R2 적응형 provisional.
- ORBX 130일·최근 ETF 원본 10/23인데 현재 점수 **null**; 유효 과거 마지막 9/02 **66.99047은 현재 점수로 사용 금지**. DIPR 28일·마지막 10/08, WSPC 15일·마지막 10/16: 40일 미달로 null. 원본 수집 성공과 현시점 R2 점수 가능성을 구분한다.
- R16 새 안전 코드 `scripts/pc-writer/theme-space-satellite-r16-gap-forensic.mjs`, CMD, 합성 테스트 2개, 문서 `docs/THEME_SPACE_R16_PC_GAP_FORENSIC_20261025.md`. 현존 R2 산식과 사용자 기준 변경 **0**. 뉴욕 15시 유효일의 결측 위치, 최근 21/61/125 관측일 완성도, 잔존 3축 지표와 표본, 시간대별 다른 봉의 존재만 조사. 출처 SHA가 R15 스냅샷과 다르면 BLOCKED; 값 대체/보간/추측 불허.
- R16 관련 Node 8개 테스트 파일 PASS, Desktop ZIP 9개 파일 SHA·ASCII/CRLF 체크 PASS. **사용자 PC R16 아직 미실행**. 최종 ETF 편입 수 무제한(현재 9개 후보), `aggregateScore=null`, `aumWeightsVerified=false`, `rightsVerified=false`, `publicationAuthorized=false`.
- 다음 순서: R16 CMD PC 직접 실행 → `SPACE_SATELLITE_R16_GAP_FORENSIC_RESULT.txt` 제출 → ORBX/DIPR/WSPC의 실제 누락 원인 판정 → 별도 최신 ETF AUM·구성 순도·권리 검증 후 최종 조합 가중 적용 검토. GitHub PR #714 Draft 유지, 기존 9개 운영 테마/main/D1/DB/스케줄러/Cloudflare 변경 0.

## 2026-10-25 R16 PC 실측 통과 → R17 동일시간 ETF/SPY 봉 가능성 진단

- 사용자 제출 `SPACE_SATELLITE_R16_GAP_FORENSIC_RESULT.txt`의 `PHASE=ALL_CODE_SHA256_VERIFIED` / `RESULT=PRIVATE_GAP_CAUSES_AUDITED_NO_SCORE_CHANGES` 확인. 사용자 PC의 SHA-verified 기존 9개 ETF/공유 SPY 원본 그대로 검사, Provider GET·원본/D1/공개/스케줄러 쓰기 **0**.
- 기존 SPY 마지막 2026-10-23, 9종 중 6종 현시점 개별점수 정상; ORBX/DIPR/WSPC만 기존 산식상 현시점 점수 결측. ORBX는 마지막 10/23의 실제 15시 봉이 있으나 9/03·9/14·10/02 세션의 15시 누락(그 세 날 **다른 시간봉 있음**) 때문에 최근 R2 세부 축 0. 과거 9/02 점수 66.99047 재사용 **금지**. DIPR(15시 28일·최근 45일 결측 41/그중 다른 시간봉 26), WSPC(15시 15일·최근 45일 결측 38/다른 시간봉 21)은 40일 미달. ROKT도 9/02 15시 누락 1회 존재하나 승인 R2가 실제 이용 가능한 세부 지표로 현재 점수 정상 생성하므로 전 지표 일치 강제 **금지**.
- 분석·신규 안전 진단 R17: `scripts/pc-writer/theme-space-satellite-r17-hour-coverage.mjs` 및 `.cmd`, 합성 테스트 2개, `docs/THEME_SPACE_R17_SAME_HOUR_FEASIBILITY_20261025.md`. 동일일 ETF와 SPY **양쪽에 실제 존재**하는 뉴욕 14/13/12/11/10시 봉의 교집합 수와 14시↔15시 실측 가격 및 ETF/SPY 상대가격 차이 분포를 정량화한다. 숫자는 **대체 사용 승인이나 점수 오차 추정이 아니다**.
- 로컬 Node R13/R15/R16/R17 및 R2/R3/SPY 관련 테스트 **8개 파일 PASS**; R17 Desktop ZIP 8개 MJS+CMD **9개 파일 무결성 PASS**, CMD SHA 핀·ASCII·CRLF 확인. **R17 실 PC 실행 결과는 아직 없음**. 원본 저장 데이터/산식·가중치/기존 9개 운영·D1/DB/스케줄러/main/Cloudflare 변경 0. Draft PR #714 유지, 원본·권리 미확정, 브랜치 보존.
- 다음 단계: 사용자가 Desktop `SPACE_SATELLITE_R17_HOUR_COVERAGE_DESKTOP_20261025.zip`을 같은 폴더에 해제, `theme-space-satellite-r17-hour-coverage.cmd` 직접 실행 → `SPACE_SATELLITE_R17_HOUR_COVERAGE_RESULT.txt` 제출. 결과를 보고 합법적인 같은시간 프록시 변경의 실익/왜곡/승인 필요성을 판단. **최종 ETF 수 상한 없음**, 정량 증거 없는 결측 채우기·단순 2종 고정 금지.
