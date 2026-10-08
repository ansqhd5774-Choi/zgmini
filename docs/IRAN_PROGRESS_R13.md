# 이란 종전 진전도 R1.3 — 구현과 운영 준비 상태

## 추가 구현·검증 — 2026-10-09 KST

- GDELT DOC 기사 발견을 bounded chunk/checkpoint로 추가했다. 250건 포화 구간은 범위를 줄이고 최소 구간도 포화되면 관측 공백을 기록한다. 발견 시각을 사건 발생 시각으로 사용하지 않는다.
- 실제 DOC 조회는429로 종료됐으며 cursor는 전진하지 않았다.429 처리에는 Retry-After와 최소6시간 대기 기록을 추가했다. 해당 수정의 검증은 fixture이며 공급자 재조회는 하지 않았다.
- 후보 원문 인용·해시, 독립 출처, 고정 규칙으로 검증된 구조화 사실, 사건 귀속 및 피해 강도 검증 인터페이스를 추가했다. Ollama 해석만으로 VERIFIED를 생성하지 않는다. 운영 공급원별 사실 파서는 아직 연결되지 않았다.
- 관련 테스트49개 통과(기존 저장 조회 회귀3개 포함). 기존 Candidate build 증거는 재사용하며 PC 수집 변경 후 배포 build를 재실행하지 않았다.
- PR179의 기존 커밋 GitHub CI 성공을 확인했다. 이번 추가 변경의 CI 결과와 구분한다.
- UKMTO 주소를 공식 `/recent-incidents`로 수정했지만 실제 직접 조회는403이다. warnings 경로도403이다. 브라우저 수집 화면의0건은 완전한 사건 관측으로 인정하지 않았다.
- 사용자는 광고 또는 유료 기능이 있는 상업 운영이라고 확인했다. IMF 공식 조건은 잠재적 상업적 재이용에 `copyright@imf.org` 허가 요청을 안내한다. 로컬 요청 초안만 작성했으며 발송·허가·상업 게시 모두 미실행이다.

IMF 공식 조건: https://www.imf.org/en/about/copyright-and-terms
GDELT DOC 규격: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/amp/

## 승인 계약

진전도 0~100점이며 확률이 아니다. IRN_ISR/IRN_USA 독립 평가, D/C 관계별 min, M 직접2축/연계1축 min, D/C/M/H/N 가중치30/25/20/15/10을 사용한다. 기존 금융·Korea 계산, DB 및 예약 작업을 변경하지 않는다.

최근7일 A와 이전21일 B의 하루 평균 사건 강도로 추이를 계산한다. A의 절대 상한은 0→100, (0,1)→60, [1,3)→40, [3,10)→25, [10,∞)→10이다. 사건 강도10이 최근7일에 있으면 최대25. H는 해상안전60/통항회복40을 유지하되 공격 A>0이면 min(H,50,U(A)).

핵심 구현: `lib/iran-progress/r13.mjs`. SQLite, 후보 해석, 원천 조회, 게시, 실행 및 설치 코드는 `scripts/iran-progress/`에 분리했다. 저장 전용 API는 `app/api/iran-progress/route.ts`이며 Candidate App Router에 포함된다. 기존 금융 API/UI는 수정하지 않았다.

## 검증 증거 — 2026-10-08

- 새 계산/관측/정정/저장/API/게시/기준값 고정/신규 보류 표시 시험33개 통과. 기존 저장 전용 조회 회귀3개 포함36개 통과.
- `node node_modules/vite/bin/vite.js build --config vite.candidate-r52.config.ts` 성공. 전체 Cloudflare 배포용 shell 생성·배포 검증을 수행한 것은 아니다.
- 컴파일된 Candidate의 로컬 `/api/iran-progress`는503, `x-iran-progress-source: STORED`, `STORED_READ_FAILED`를 반환. 새 로컬 D1에 결과 테이블이 없기 때문이다. 경로가404가 아니라 저장 전용 handler에 도달했음을 확인했다. 실데이터 API 정상 증거는 아니다.
- 설치된 workerd는2026-05-22까지만 지원한다. Production 설정2026-09-01은 수정하지 않고 로컬 검증에만 CLI 날짜 override를 사용했다. Production 동일 환경 검증은 미실행.
- 전체 `tsc --noEmit` 실패. 변경 전과 변경 후108개 출력 행이 동일하며 신규 진단 없음. 전체 타입 검사 PASS가 아니다.
- 로컬 Ollama `gemma3:4b` JSON 후보 생성 및 원문 인용 검증 인터페이스 시험 성공. 공식 UN 문구의 짧은 발췌를 사용했으며 이란 사건 사실 검증이나 운영 점수 산출 시험은 아니다.
- PC의 별도 `.zgmini/iran-progress-r13/iran.sqlite`에서 원천 메타데이터·계산·checkpoint·lease 저장을 실제 확인. 실자료 계산은PENDING/null이며 공개 게시하지 않았다.

## 무료 공급원 실측

| 원천 | 직접 조회 | 이번에 확인한 범위 | 미확인/제약 |
| --- | --- | --- | --- |
| IMF PortWatch ArcGIS | 200 | chokepoint6=Strait of Hormuz, date/n_total, 일별 통항 횟수 | 최신2026-10-04. 승인된3일 신선도 초과. 이용 조건 확정 필요 |
| GDELT lastupdate | 200 | 15분 자료 목록 접근 | 사건 파일의 전체 수집/파싱/원문 검증 및28일 coverage 미구현 |
| UKMTO recent-incidents | 403 | 직접 무인 수집 실패 확인 | 서비스 전체 장애로 판정하지 않음. 공식적으로 허용된 수집 경로 필요 |
| IAEA Iran 웹페이지 | 403 | 직접 페이지 접근 실패 | RSS와 구분 |
| IAEA Top News RSS | 200 |15개 항목 다운로드 | 이번 feed에Iran 항목 없음. 관련 자료 전체 확보의 증거가 아님 |

PortWatch 카탈로그가 아니라 실제 FeatureServer를 조회했다. `n_total`을 그대로 사용하며 선종별 필드를 다시 더하지 않는다. 응답 한도 초과/중복 일자는 기각한다. UKMTO Warning은 자동 공격 건수로 바꾸지 않는다.

공식 참고:

- PortWatch 데이터: https://portwatch.imf.org/datasets/3da2b9ca97684916b75c4013f95d18ab_0/about
- 서비스 metadata의 이용 조건 링크: https://www.imf.org/external/terms.htm (이번 조회403, 조건 확정 미완료)
- UKMTO 재이용 조건: https://www.ukmto.org/terms-and-conditions (Open Government Licence 명시. 접근 성공과 별개)
- GDELT 원천 문서: https://gdeltproject.org/data.html
- 기준일 후보 근거: https://turkiye.un.org/en/310903-bombing-iran-and-retaliatory-strikes-%E2%80%98-grave-threat-international-peace-and-security%E2%80%99

사용자가2026-02-28을 기준일로 확정했다. 직전2026-01-31~2026-02-27의28일 실자료를 별도 불변 기록으로 보존했고 하루 평균은78.75회다. 반복 수집 또는 과거 자료 개정으로 기준 기록을 교체하지 않는다. 이는 기준값 확보 증거이며, 이용 조건이나 최신 H의READY 증거는 아니다. 관측 실패를 공격0건으로 보정하지 않는다.

## 실행과 게시 계약

```
node scripts/iran-progress/run.mjs
node scripts/iran-progress/run.mjs --ai
node scripts/iran-progress/run.mjs --discover --ai
node scripts/iran-progress/run.mjs --publish
```

기본 실행은 원천 확인과 로컬 저장만 수행한다. `--discover`는 GDELT DOC 발견 후보를 재개 가능한 큐에 저장한다. `--ai`는 확보된Iran 관련 RSS 또는 발견 기사 제목1건을 후보로 처리하며 결과를 자동 VERIFIED로 승격하지 않는다. 제목 해석은 원문 검증을 대체하지 않는다. 동일 sourceHash의 처리 완료 후보는 checkpoint로 재사용한다. 현재 RSS는 전체 이란 자료 감시를 대체하지 않는다.

계산 입력은 로컬 `verified-input` checkpoint와 immutable event_revisions다. **검증된 입력 생성·사건 귀속/중복 확인을 끝까지 자동 수행하는 운영 단계는 아직 연결되지 않았다.** 수집 HTTP 성공만으로 이 checkpoint나 coverageThrough를 생성하지 않는다. 영향 영역의 중요한 미해결 후보만 READY를 차단한다.

`--publish`는 READY 점수만 기존 PC Writer의 인증·D1 client로 전용 snapshot key에 게시하고 재조회한다. PENDING은 별도 상태 key에 게시하며 마지막 정상 점수를 덮어쓰지 않는다. API는 더 최근의 보류 상태가 있으면 기존 점수를 최신 정상값처럼 반환하지 않는다. 원격 timeout 뒤 중복 쓰기를 하지 않는다. 기존 core/korea snapshot key는 변경하지 않는다. 새로운 원격 DB 스키마는 필요하지 않다. 이번 작업에서 원격 D1 쓰기는 실행하지 않았다.

API는 기본24시간 정상, 이후72시간까지 갱신 지연, 이후 주점수null을 반환한다. 만료 기준은 observationAt/lastVerifiedAt이며 저장·계산·게시 시각으로 재설정하지 않는다. 공개 payload는 계산 영역·관계 상태·최대14일 게시 이력만 포함한다.

원자료 이용 조건 미확정 상태에서는 기사 전체를 지속 저장하지 않는다. 현재 runner는 원천 메타데이터/해시/구조화 통항 자료를 저장한다. 180일 원문 보관 및 자동 삭제 정책은 활성화하지 않았다.

## 예약·운영 출시의 미완료 조건

`install.mjs`는 실제 READY 계산 및 VERIFIED 공개 게시 이후에만 별도Windows 예약 작업을 등록한다. KST00/06/12/18, 절전 해제false, 중복 실행IgnoreNew, 누락 실행1회 복구, 기존 작업 수정 없음. 현재는 등록하지 않았다.

남은 필수 실행:

1. 이용 조건 및 공급 지연 계약 확인. 기준일과28일 기준 자료는 확보 완료.
2. 필수 원천의 무인 접근과28일 사건 관측 확보, 근거 검증·중복/귀속 판단을 고정 규칙으로 연결.
3. 실자료5영역 READY 계산, D1 게시·재조회.
4. 이란 카드의 확률 표기를 진전도로 연결하고PC/모바일 실제 렌더링 검증.
5. 기존 Git integration을 통한 배포와 별도6시간 예약 등록. 현재 초안PR를 운영 완료로 취급하지 않는다.

UKMTO 직접 접근 및 검증된 사건 입력 부족은 실점수 산출 단계의BLOCKED다. 로컬 compatibility 제약은AUTOMATION_BLOCKED이며 Production 장애 증거가 아니다. 나머지 계산 코드와 검사 결과는 이 제약 때문에 무효화하지 않는다.
