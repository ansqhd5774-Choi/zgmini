# R31 기업 실적의 사이트 HTML 표시 연결

## 목적과 경계

- R29: EarningsAPI 14일 수집, PC 비공개 `input` 저장. 사용자가 언급한 2,609건은 확보 결과로 보고되었으나 사이트 DB에 2,609건이 저장됐다고 단정하지 않는다.
- R30: PC의 비공개 실적 정규화. 제공업체 예정일은 기업 확정 일정이 아니며 시각을 임의로 생성하지 않는다.
- R31: 정규화된 비공개 결과를 PC에서 탈식별·HTML 이스케이프된 자체 사이트 표시본으로 변환하고 별도 `output` 키 `market-calendar:earnings-display-html`에 저장한다.
- 사이트 `/api/earnings-calendar-display`는 D1의 별도 표시본을 읽어 `text/html`만 반환한다. 원자료 JSON, API 키, 수치 실적값을 공개하지 않는다.
- 기존 `/api/release-calendar`의 공식 경제지표·국채·TIC 연결과 응답은 변경하지 않는다.
- 표시용 날짜별 건수 헤더를 이용해 기존 주간·월간 날짜 표시와 검색 필터를 연결한다.

## GitHub 자동배포와 PC 역할

- **사이트 코드**: GitHub `main` 반영으로 기존 Cloudflare Git 자동배포를 사용한다. 수동 Cloudflare 배포·Wrangler·새 예약 작업은 없다.
- **실적 표시 데이터**: PC R30 설치본(HEAD `060d5e5fdb15ddfb7161c4d92f8012cd6c2c6192`)에 R31 PC 안전 설치 ZIP을 적용해야 한다. 설치기는 정확히 두 파일만 변경한다.
- 설치 자체는 수집이나 게시를 실행하지 않는다. 이후 성공한 정규 수집이 사이트용 HTML 표시본을 작성하고 기존 동기화가 D1로 운반한다.
- `main` 배포 성공과 **실제 PC 수집·D1 반영**은 별개 상태다. 실적 수치·날짜/건수에 관한 운영 성공 판정은 PC·D1 실측 증거가 있어야 한다.

## 권리·보안·한계

- EarningsAPI 이용약관에 따라 타사 원천 데이터의 재배포/피드 API를 제공하지 않고 자사 사이트의 HTML 표현만 지원한다. 데이터 공급원이 제시한 예정일임을 명시한다.
- 회사명 및 티커는 HTML 이스케이프하며 미확인 시간은 `시각 미정`으로 둔다. 개인 키는 PC 설정에만 둔다.
- 과대 입력은 기존 SQLite/D1 행당 1.8MB 제한과 표시본 건수/길이 검증에서 실패로 처리하고, 이전 공식 일정은 보존한다.
- API 호출수는 증가시키지 않는다. 별도의 자동 검증/감시 예약 작업을 만들지 않는다.

## 검증

- R31 신규 HTML·검색·저장 통합 테스트 통과.
- R29, R30 수집기 회귀검사 통과.
- 타입 검사 및 Vinext 프로덕션 빌드 통과 (실제 Cloudflare 배포 결과와 구분).
- R31 Windows ZIP 압축 무결성 검사 통과. Windows 실제 설치 성공은 사용자 PC 결과 로그가 필요하다.
- SEO: 기존 `/market-calendar` 제목·메타·정규 URL·색인 정책 수정 없음. HTML-only 응답은 `noindex`이며 노출하려는 별도 색인 페이지가 아니다.

## 판정 및 다음 단계

- SITE_CODE: GitHub `main`의 R31 반영 SHA로 판정한다.
- PC_INSTALL: 별도 결과 파일의 `R31_SITE_HTML_DISPLAY_PC_INSTALLED_NO_FORCED_COLLECTION`을 확인해야 설치 판정 가능.
- DATA_READY: 다음 정규 PC 수집 및 D1 출력 동기화 전까지 미확인.
- CLOUDFLARE_DEPLOYED: GitHub ref 성공만으로 완료로 판단하지 않는다.
