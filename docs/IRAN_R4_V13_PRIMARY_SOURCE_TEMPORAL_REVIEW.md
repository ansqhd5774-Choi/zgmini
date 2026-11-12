# Iran R4 V13 — 공개 1차 출처 사건일·발표일·PC 저장일 분리

**범위**: 2026-10-05~18 14일. 과거 관측 근거 시작일 2026-09-07. 연구용 원장만 생성. 운영 R3, 기존 R4 산식·가중치·단계, PC SQLite, D1, cron/scheduler, Cloudflare Production 변경 금지.

## V12 실제 PC 근거
- `ZGMINI_IRAN_R4_V12_RESULT.txt` 읽기 전용 최종 EXIT=0.
- AI 판단 127건 중 검토 후보 9건(모두 기사 발표일 10/12); 25건 모델/프롬프트 버전 불일치.
- 9건의 source hash/rights/quote는 연결되지만 실제 사건일·주체·심각도 검증은 전부 없음. **검증 사건 0 / R4 점수 0/14.**
- 따라서 Ollama 무차별 16만 후보 처리를 다음 필수 작업으로 삼지 않음.

## V13 1차 출처 연구 (2026-10-19 조회)
- 카타르 외교부 10/06: 미-이란 중재 지속. 휴전 이행으로 환산 금지. PC source 10/08 저장.
- 사우디 GACA via SPA 10/09: 10/08 리야드 공항 시설과 Saudia 항공기 **각각 별개** 공격 2건. 10/08 PC 지식으로 소급 금지.
- UN DPPA 10/09: 예멘이 *최근 몇 주 동안* 전면전에 다시 돌입했다고 평가. **10/09 새 공격 1건 아님.**
- UN DPPA 10/11: 리야드 국제공항 공격을 10/10(토요일) 상황으로 인용. 10/11 새로운 사건으로 중복 가산 금지. 해당 UN 보도는 이전 SPA 10/08 공격과 독립 사건인지 추가 확인.
- 싱가포르 MPA 10/14: GFS PRIDE 10/13 피격 후 침몰, GFS GISELLE 10/14 피격 후 안전. 서로 다른 선박. **공격 주체 미확정**.
- MARAD 2026-011 9/09 및 2026-013 9/23: 각각 호르무즈·홍해 항행위험 경보. **일별 신규 공격이 아님**, 28일 전선별 공격 완전성 증거도 아님.

## 소스 링크
- https://mofa.gov.qa/en/qatar/latest-articles/latest-news/details/2026/10/06/foreign-ministry--mediation-efforts-between-washington-and-tehran-continue
- https://www.spa.gov.sa/en/w2697151
- https://dppa.un.org/en/news/yemen-has-returned-to-full-scale-war-special-envoy-warns
- https://dppa.un.org/en/news/these-attacks-must-cease-immediately-guterres-condemns-deadly-houthi-strike-on-riyadh
- https://www.mpa.gov.sg/media-centre/details/two-singapore-registered-vessels-struck-in-strait-of-hormuz
- https://www.maritime.dot.gov/msci/2026-011-persian-gulf-strait-hormuz-and-gulf-oman-iranian-attacks-commercial-vessels
- https://www.maritime.dot.gov/msci/2026-013-red-sea-bab-el-mandeb-strait-gulf-aden-arabian-sea-and-somali-basin-houthi-attacks

## 안전 계약
`lib/iran-progress/r4-primary-source-temporal-review-v13.mjs`은 공개 연구 메타데이터만 담는 순수 코드다. **수집/DB조회/변경/게시 없음.** 기록에는 `publicationDate`, `eventDate`, `sourcePCStoredDay`, `checkedByResearchOn`을 분리한다. 공식 출처 내용을 10/19 확인해도 10/05~18 과거 PC 검증으로 소급하지 않는다.

`sourcePCStoredDay`가 알려진 카타르 사례만 로컬 출처 존재 후보로 표시한다. **PC 원문 해시·독립 검증 사건 원장 증거와 별개다.**

검증 전 `independentlyVerifiedR4Event=false`, `scoreEligible=false`, 일별 `r4Score:null`, `full28DayCoverageVerified=false` 유지. 이 연구 원장은 28일 전선별 관측, 휴전, 해상, 핵 입력을 만들지 않으며 Production R4 검증 점수도 아니다.

## NEXT
실제 PC 원장/인허가된 저장 경로의 확정된 독립 1차 출처부터 source receipt/사건일/주체/중복 판정·28일 coverage를 개별 검증. 추후 14일 `rebuildVerifiedR4DailyHistory`는 **각 날짜로 소급 가능한 실제 verifiedAt·sourceStoredAt** 입력이 확보된 뒤 실행. 사후 재구성과 당시 확인 이력을 혼동하지 않는다.
