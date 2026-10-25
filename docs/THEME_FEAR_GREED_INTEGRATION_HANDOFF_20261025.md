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
