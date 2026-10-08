# Ollama 근거 분석 연결 R1.4 — 2026-10-09

실행 전 실제 SQLite에서 모델 digest를 포함한 분석 decision은 0개였다. Ollama 서버와 모델 목록 조회는 HTTP 200이었다. PC 예약 launcher는 collect-r14.mjs만 실행하며 기사 분석 자동화가 활성화된 상태는 아니었다. 기존 run.mjs의 --ai 경로는 IAEA RSS 일부와 발견 기사 제목만 처리하며, GDELT 구조화 행에는 원문 제목이 없어 분석을 보류한다.

analyze-receipts-r14.mjs는 기존 불변 source ledger의 원문 발췌와 해시를 검증하여 최대 3건씩 모델에 전달한다. 원문 없는 기사나 임의 생성 텍스트는 사용하지 않는다. 모델 이름이 중복되면 digest identity가 모호하므로 실행을 거부한다. 결과는 모델·digest·프롬프트 버전·추론 설정·출처·원문 해시와 함께 불변 decisions에 저장하고 재조회한다. 동일 identity는 재사용한다. 원문에 없는 인용·schema 오류는 저장하지 않는다. 분석 결과는 CANDIDATE_ONLY/PENDING이며 사건 검증·점수 입력·관측 범위·공개 게시를 변경하지 않는다.

실제 qwen3:4b 실행에서 초기 기본 설정으로 유효 결과를 저장하지 못했다. 추론 비활성화 진단 요청은 정상 JSON을 반환했지만 기사 요청은 schema 검증에 실패했다. think:false와 명시적 JSON schema를 함께 사용한 후 일본 외무성·미국 재무부·UKMTO 156-26의 기존 원문 발췌 3건에서 각각 후보 1건을 생성하고 실제 저장·재조회를 확인했다. 오류를 피하기 위해 사실 검증 조건을 낮추지 않았다. format schema와 think 설정은 Ollama 공식 generate API 문서를 확인했다: https://docs.ollama.com/api/generate

이는 EXCERPT_ONLY 분석이며 전체 기사 분석 또는 모델 가중치 재학습 완료가 아니다. 프롬프트·schema의 실행 계약을 개선한 단계다. 검토자의 확정·정정 근거를 이용한 사례 평가와 전체 원문 수집/이용 조건 확인, 예약 수집 후 bounded 기사 분석 연결은 후속 작업이다. 현재 수집 예약은 그대로 유지했다. 모델을 실행했다고 자체 VERIFIED나 READY를 생성하지 않는다.

실행 예시:

```text
node scripts/iran-progress/analyze-receipts-r14.mjs --model=qwen3:4b --source=<기존 source receipt id>
```

DB schema·산식·가중치·UI·D1·배포 변경 없음. 새 계정·모델 다운로드·유료 API 이용 없음.

## 전체 본문 분석과 예약 연결 — 후속 구현·운영 검증

`article-text-r14.mjs`는 일본 외무성 보도자료 및 GOV.UK의 공식 news/speeches/statements HTML 본문을 처리한다. 승인된 HTTPS host/path만 허용하고 인증 정보·query·redirect·임의 host를 거부한다. 공개 목록에서 관련 URL을 발견하되 전체 기사·사건 관측 범위가 완전하다고 간주하지 않는다. body container가 없거나 100~60,000자 범위를 벗어나면 제목·첫 부분으로 대체하지 않고 보류한다. 모델의 요청당 12,000자 제한은 유지한다. 긴 본문은 최대 6부분으로 나누고 전체 텍스트가 보존되는지 검사한다. 부분별 분석을 불변 원장에 저장하여 중단 후 재사용하며, 모든 부분이 완료돼야 전체 본문 분석으로 저장한다. 메뉴·스크립트·이미지·관련 링크는 제외한다. 별도 PDF 첨부 문서까지 분석했다는 의미는 아니다.

일본 외무성의 [Legal Notices](https://www.mofa.go.jp/about/legalmatters.html) 및 [PDL1.0](https://www.digital.go.jp/en/resources/open_data/public_data_license_v1.0), [GOV.UK 이용 조건](https://www.gov.uk/help/terms-conditions) 및 [OGLv3](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)을 확인했다. PC 직접 HTTP 조회는 모두 200이었다. 웹 도구에서 OGL 원문이 403이었던 결과와 PC 정상 조회를 구분한다. 텍스트 재이용·출처/가공 표시 범위만 사용하며 제3자 권리 표시는 보류한다. 원문 text·HTML hash·원래 발표일·이용 조건 receipt를 PC SQLite에 먼저 저장·재조회한다. 원문 전체를 Git·D1·공개 응답에 보내지 않는다. 이용 조건은 최대 7일 cache 후 재확인하며 변경·접근 실패 시 보류한다.

`article-analysis-r14.mjs`는 저장된 본문 전체를 로컬 qwen3:4b에 전달한다. 모델이 직접 인용을 재작성하던 실제 실패를 확인한 뒤 R1.4.1 프롬프트에서 원문 블록 번호를 선택하도록 변경했다. 프로그램이 선택된 원문을 그대로 인용에 연결하며, 블록 번호·분류·완료 응답·원문 일치를 검사한다. 국가 표기는 선택된 원문의 명시적 문자열만 추출하고 사건 발생 시각은 null로 유지한다. AI 분류·ASSERTED/DENIED/PROPOSED/UNKNOWN은 검토 후보의 의미이며 사실 VERIFIED가 아니다. 협상과 휴전, 부정문, 공격 주체 불명, 출처 속 명령을 구분하는 예시를 프롬프트에 추가했다. 이는 모델 가중치 재학습이 아니다.

입력 원문·model digest·prompt version·추론 설정을 기록한다. 기존 유효 분석은 재사용하고 새 분석 identity는 저장 원문에서 재개할 수 있다. 아직 분석하지 않은 URL은 유지한다. 429는 해당 site의 나머지 요청을 중단하고 cooldown을 보존한다. 401/403·권리 예외·본문/layout 문제는 반복 요청하지 않고 보류한다. 새로운 parser version이 관련 layout 문제를 해결한 경우에만 재검토한다. GOV.UK 뉴스의 원래 발표일이 time element 대신 govuk:first-published-at metadata에 있는 실제 사례를 수정·재검증했다. updated-at을 발표일이나 사건 발생일로 사용하지 않는다.

`evaluate-article-ai-r14.mjs`의 5가지 합성 시나리오를 실제 같은 qwen3:4b/digest/R1.4.1 프롬프트로 실행·저장·재조회해 모두 PASS했다. 협상≠종전, 명시적 휴전 부정, 공격 주체 불명, 무관 기사 제외, 외부 지시 무시를 검사한다. 합성 평가 결과는 시장 사건·점수 원장과 분리한다. 5개 사례 통과는 모든 기사에서의 정확도 보장이 아니다. 예약 분석은 동일 model/digest/prompt의 불변 PASS 평가 receipt를 확인하며 모델/프롬프트 변경 시 평가 없이 진행하지 않는다.

`collect-r14.mjs --analyze-articles`는 기존 lease 안에서 수집 후 최대 2개 기사를 처리한다. 예약 태스크 ZGMINI-PC-Iran-Progress-R13은 기존 설정을 비공개 XML로 백업하고 run-articles.vbs로 변경·재조회했다. KST 00/06/12/18, IgnoreNew, WakeToRun=false를 유지하며 publish flag가 없다. 새 task나 self-hosted GitHub runner는 만들지 않았다. 저장·태스크 등록과 실제 정기 trigger 실행은 구분한다. 태스크 등록 후 정기 trigger 도래 결과는 아직 확인하지 않았다.

수동 bounded 실행 `collect-r14.mjs --max=1 --analyze-articles`에서 원자료 수집·새 GDELT archive checkpoint 전진·기사 본문 분석·실제 저장 재조회를 확인했다. `run.mjs --ai`도 동일 본문 분석 모듈로 변경해 게시 단계에서 제목 분석으로 돌아가지 않도록 했다. 실제 run 실행은 PENDING/null, D/C/M/H/N 미충족, publication=NOT_SUBMITTED였다. UKMTO 목록 403은 source 접근 제한으로 보존했고 우회하지 않았다. 이번 단계의 D1 게시·main 병합·Cloudflare 배포는 미실행이다.

초기 공개 목록의 23개 URL을 bounded chunk로 처리했다. 실제 공식 HTML 본문 23건·전체 분석 decision 23건·검토 후보 136건을 저장·재조회했다. 후보 인용 전체가 부모 원문에 존재하며 모든 후보는 PENDING_REVIEW/verified=false였다. 기사 23건 또는 후보 136건을 물리적 사건 수로 해석하지 않는다. 긴 기사 3건은 12,266/17,031/19,826자이며 각각 2부분을 모두 처리했다. 이 목록의 미시도·현재 보류 기사 0건을 확인했지만, 검색 밖 기사나 전체 교전 관측 범위가 완전하다는 증거는 아니다.

검증: `node --test tests/iran-progress*.test.mjs` 137 PASS/0 FAIL. 전체 원문 보존, 부분 재개, 원래 발표일과 수정일 구분, 불완전 응답 거부, 미평가 model/prompt의 예약 분석 차단을 포함한다. 실제 모델의 5개 합성 사례 PASS와 실제 기사 저장·수동 경로 실행을 fixture 검사와 구분한다. 중요한 사건 보류 3건/VERIFIED 사건 0건, D/C/M/H/N 입력 미충족과 AIS 권리·품질 미충족은 유지된다. 분석 후보의 사건 중복·독립 근거·귀속·강도 및 관계별 실제 상태 검증이 다음 단계다.
# 기사 범위 검증 보완 — 2026-10-09

- 전체 저장 후보 136개 검토에서 일반 정책·다른 분쟁의 문장이 이란 관련 후보로 섞이는 문제를 확인했다. 검토 결과는 PC 내부 원장에만 보존했다.
- 프롬프트 R1.4.4는 이란 교전 관계, 호르무즈와 바브엘만데브, 가자 휴전, 일반 대리세력 지원을 구분한다. 관련성 없는 문장은 선택하지 않도록 안내한다.
- 실제 긴 기사에서 가자 휴전 오선택이 재현되어, 이란 언급 없이 가자 휴전만 다루는 CEASEFIRE 후보를 별도 제외 기록으로 보존하는 검사를 추가했다. 원문·이전 분석을 삭제하지 않는다. 분할 기사 전체의 제외 기록도 최종 분석에 합친다.
- 실제 qwen3:4b 동일 digest의 합성 검사 12/12 PASS. R1.4.2의 해역 구분 실패와 R1.4.3의 긴 기사 오선택은 이전 원장에 보존했다. 검사 기대값은 낮추지 않았다.
- 저장된 G7 발표와 Israel/Palestine 연설 2개를 R1.4.4로 재분석했다. 후보는 각각 MARITIME 1개, DIPLOMACY 1개이며 원문 일치·PC 저장 재조회 확인. 가자 휴전은 최종 후보에서 제외됐다. 후보는 여전히 PENDING_REVIEW/verified=false다.
- 회귀 검사: 21개 파일 138 PASS / 0 FAIL. 모델 가중치 학습은 없으며 프롬프트·출력 범위 검사 보완이다.
- 현재 공식 사실·관측 범위·AIS 상위 이용 근거 및 일별 품질 검증은 미완료다. 점수/산식/가중치/원격 DB/UI/배포 변경은 없다. 실제 Production PENDING/null 증거는 기존 검증을 재사용한다.
# AIS 관측 기록 및 전체 기사 재개 — 2026-10-09

- R1.4.4로 기존 공식 기사 23개 전체를 저장 원문에서 재분석했다. 후보 63개(외교 12·군사 5·해상 4·핵 32·기타 10), 후보 없는 기사 5개, 가자 휴전 제외 기록 1개. 후보/제외 기록의 원문 일치 및 모든 후보 PENDING_REVIEW 확인. 이전 136개 분석 원장은 유지하며, 후보 감소를 사실 정확도나 사건 수로 해석하지 않는다.
- 파나마 해사청의 On Peace(IMO 9893204) 발표를 실제 HTTP 200으로 읽고 최소 사실 후보·문서 해시를 PC에 저장·재조회했다. 발표는 10월 5일 19:30 UTC, 부상 12명·이송 10명을 설명하지만 공격 주체는 미상이다. UKMTO 156/157과의 사건 매칭·이란 연관성·재이용 조건은 미확정이다. 독립 VERIFIED 사건이나 추가 사건 건수로 승격하지 않았다.
- 출처: https://www.amp.gob.pa/noticias/notas-de-prensa/amp-informa-sobre-el-incidente-sufrido-por-la-nave-on-peace/
- 기존 PC 수집에 hormuz.now /api/health의 최소 feed 표본을 추가했다. 타일·성공/실패·누적 poll·마지막 정상 시각만 저장하며 PortWatch/config 등은 제외한다. 원격 DB나 산식에는 연결하지 않는다. 현재 누적 횟수·표본을 과거 일별 coverage로 변환하지 않으며 서버 재시작으로 누적 수가 줄어도 이전 품질을 조작하지 않는다.
- 수동 실제 PC 실행: health HTTP 200 → 최소 receipt 저장 → read-back 확인. qualityVerified/coverageVerified/upstreamTermsVerified 모두 false 유지. 정기 trigger의 새 health 수집은 아직 미검증이다.
- 회귀 검사: 관련 22개 파일 141 PASS / 0 FAIL. 승인된 산식·가중치·UI·원격 DB·배포 변경 없음. AIS 상위 이용 근거와 일별 품질, 사건 귀속·강도·관측 범위는 여전히 미완료다.
