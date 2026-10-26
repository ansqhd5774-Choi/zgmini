# 이란 전쟁 주요 뉴스 — GOV.UK 단일 출처 첫 운영 검토 R2

- 작성/원문 재확인: 2026-10-26 (KST)
- 작업 브랜치: `codex/outbreak-iran-news-retention-r1-20261026`
- 사용자 방향: **표시용 신규 출처는 GOV.UK 1곳부터 운영하고, 다른 출처 추가는 후속 작업으로 보류.**
- 점수용 기존 R3의 6개 기관·7개 수집 경로는 유지. **본 검토는 뉴스 카드 표시 전용이다.**
- 공개 기사 수를 고정하지 않으며, 개별 권리 및 관련성 검증을 통과한 기사만 적재한다.

## 1. 첫 운영 입력의 개별 권리·팩트 체크

| 항목 | 증거/판정 |
| --- | --- |
| 원문 | [Chief of Defence hosts tenth Dragon Group meeting in London](https://www.gov.uk/government/news/chief-of-defence-hosts-tenth-dragon-group-meeting-in-london) |
| 발행 | 2026-10-23T13:30:50.000Z (GOV.UK Content API `first_published_at`, 2026-10-26 PC 로그 재확인) |
| 작성·제공 기관 | UK Ministry of Defence, GOV.UK 공식 뉴스 스토리 |
| 라이선스 | [GOV.UK OGL 재사용 안내](https://www.gov.uk/help/reuse-govuk-content), [GOV.UK 일반 약관](https://www.gov.uk/help/terms-conditions), [OGL v3](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) |
| 본문 저작권 예외 | 텍스트 본문에 별도 제3자 권리 표시는 발견하지 못함. 원문 페이지의 일반 OGL 고지 확인 |
| 제외 | **원문 사진·초상·브랜드 이미지·로고·제3자 자료 일절 재게시하지 않음** |
| 기사 관련성 | 영국 국방참모총장 주재 다국적 회의에서 미·이란 분쟁 및 후티 공격 확대를 논의함 |
| 자체 작성 한국어 제목 | 영국 주재 중동 국방 수뇌부 회의에서 미·이란 분쟁 논의 |
| 자체 작성 요약 | 영국 국방참모총장이 런던에서 걸프·중동 지역 국방 수뇌부 회의를 주재했다. 영국 국방부 발표에 따르면 참석자들은 미·이란 분쟁과 사우디아라비아를 향한 후티 공격 확대 등 지역 안보 현안을 논의했다. |
| 영향 분류 | `neutral`. 회의에서 현안 논의는 확인되나 휴전 합의 또는 새로운 확전 조치를 기사에서 확인하지 못함 |
| 표시용 권리 플래그 | 텍스트·자체 작성 요약 범위에 한해 `rightsVerified:true`로 시험 입력에 부여. **GOV.UK 모든 기사에 일괄 권리 승인하지 않음** |

- 다국가 공동 작성인 [2026-10-24 이스탄불 R4 공동 발표](https://www.gov.uk/government/news/joint-press-release-on-the-r4-ministerial-meeting-in-istanbul)는 권리 범위를 추가 확인할 때까지 `rightsVerified:false` 유지.
- 원문이 발행 이후 수정되더라도 발행일을 수정일로 교체하지 않는다.
- GOV.UK 공공기관 발언은 정부 발표의 존재·내용을 검증한 것이지 독립 현장 사실 확인이나 이란 종전 판정이 아니다.
- 위 검토는 법적 보증이 아니며, 원문에 제3자 권리 표시 또는 이용조건 변경이 확인되면 공개 제외한다.

## 2. 운영 실행 순서와 현 상태

1. **완료:** 사용자 PC의 GOV.UK Atom/Content API 읽기 전용 확인. 피드 20/Content API 20, 오류 0.
2. **완료:** 첫 GOV.UK 본문 1건의 개별 권리 범위 및 자작성 요약/영향 분류 예비 검토.
3. **완료:** PC 캐시 유지관리 CLI에 `--reviewed-input=<절대 경로>` 추가. `rightsVerified`/URL/발행일 검증을 통과하지 않는 입력은 쓰기 전 거부. 기존 산식·DB 불변.
4. **완료:** Windows 1파일 `IRAN_NEWS_R2_PREFLIGHT.cmd` 구현. 승인된 코드 SHA에서 읽기 전용 도구 다운로드, 공식 피드 조회, 1건 검토 입력으로 **dry-run만** 실행. 결과는 CMD 옆 `IRAN_NEWS_R2_PREFLIGHT_RESULT.txt`.
5. **대기:** 사용자 PC에서 R2 CMD 실행과 TXT 로그 제출. 반드시 `received=1,accepted=1,after=1,dryRun=true,written=false`인지 확인.
6. **대기:** 운영 승인 SHA·예약작업 경로 재확인 후 PC 표시 전용 캐시 최초 `--apply` 및 read-back. 별도 승인 없이 기존 R3/R5 원장·스케줄러 변경 금지.
7. **대기:** 뉴스 전용 D1 키 게시·read-back, 브랜치 변경 내용의 필요한 파일만 main 반영, Cloudflare Git Integration exact 배포, 공개 API/UI 확인.

**주의:** 이 문서나 CMD의 존재 자체는 실 PC 수집/게시가 이루어졌다는 뜻이 아니다. GOV.UK의 다음 기사도 자동 `rightsVerified:true`로 승인되지 않는다.
