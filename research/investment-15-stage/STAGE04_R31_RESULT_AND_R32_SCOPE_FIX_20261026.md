# Stage04 R31 실제 재조사 판독 및 R32 검색 대상 동일성 교정

2026-10-26. **개인 연구용, 투자 점수·ETF 산식·DB·사이트·자동 배포 및 매매와 무관.**

## R31 실행 결과 (사용자가 제공한 Windows CMD 로그)

- 공개 API: 섹터 **11개**, 테마 **10개(우주·위성 포함)**, 총 21개. 누락된 공개 범주 없음, API 오류 없음.
- 공식 검색 21회, 보고서 GET 20회, Ollama 호출 16회. 원문 전망 CAGR 및 산식 검증 성공 **16개**, 보류 **5개**.
- 검증 성공은 **'선택한 보고서 내부의 해당 시장 수치가 맞음'**이지 **'섹터/테마 전체 시장 성장률과 같음'**을 뜻하지 않음.
- 보류: 임의소비재(매칭 보고서 없음), 금융·방산(선택 보고서의 구형 기간/헤더 형식), 유틸리티(발표기간 간 불일치), 에너지(전망 문단 없음).
- 부적절한 하위시장 자동 선택이 확인됨: 커뮤니케이션→무선통신 서비스, 에너지→에너지 저장장치, 필수소비재→주식 아닌 기본 식료품, 핀테크→핀테크 블록체인, 사이버보안→항공우주 사이버보안. 이 숫자는 전체 범주의 성장률이 아님.
- 검색 키워드부터 부분 프록시인 사례: 산업재→산업용 기계, 소재→첨단 소재, 헬스케어→의료 서비스, 원전·SMR→원자로, 바이오·신약→바이오테크 서비스, 데이터센터·전력→데이터센터, 클라우드·SaaS→클라우드 컴퓨팅 등. 이 경우에도 해당 하위 시장 CAGR만 설명 가능.

### R31 숫자 검증과 범위의 분리

| 항목 | 검색된 공식 보고서 CAGR (2026→2030) | 범위 판정 |
|---|---:|---|
| 정보기술 | 8.3% | 정보기술 시장 보고서, GICS IT 직접 측정 아님 |
| 커뮤니케이션 | 5.4% | 무선통신 서비스 일부만 — 전체값 사용 불가 |
| 임의소비재 | NULL | 공식 보고서 미발견 |
| 산업재 | 6.9% | 산업용 기계만 — 부분 프록시 |
| 금융 | NULL | 공식 보고서 구조 확인 보류 |
| 유틸리티 | NULL | 보고서 내부 전망기간 검증 보류 |
| 헬스케어 | 4.9% | 의료 서비스 부분 프록시 |
| 소재 | 8.1% | 첨단 소재 부분 프록시 |
| 에너지 | NULL | 에너지 저장 시장 선택, 성장률 검증 보류 |
| 필수소비재 | 6.1% | 기본 식료품만 — 전체값 사용 불가 |
| 부동산 | 7.2% | 부동산 시장 자료, ETF 직접 측정 아님 |
| 로봇·자동화 | 21.0% | 로봇·자동화 시장 자료, ETF 직접 측정 아님 |
| 클라우드·SaaS | 15.6% | 클라우드 컴퓨팅 부분 프록시 |
| 자율주행 | 28.1% | 자율주행차 시장 자료, ETF 직접 측정 아님 |
| 원전·SMR | 5.5% | 원자로 부분 프록시 |
| 방산 | NULL | 구형 보고서 구조 확인 보류 |
| 핀테크 | 42.3% | **블록체인 하위시장** — 전체값 사용 불가 |
| 사이버보안 | 9.5% | **항공우주 보안 하위시장** — 전체값 사용 불가 |
| 바이오·신약 | 12.4% | 바이오테크 서비스 부분 프록시; 10.1%는 과거 CAGR |
| 데이터센터·전력 | 9.2% | 데이터센터 부분 프록시; 8.2%는 과거 CAGR |
| 우주·위성 | 5.5% | 인공위성 시장 부분 프록시 |

## R32 교정

- `keyword-growth-speed-r25-readonly.mjs`: R32에서만 `strictMarketScope: true` 옵션. 첫 검색결과의 단어 포함 여부가 아닌 **보고서 제목의 `... Market` 이전 시장명 자체**가 요청 주제와 동등한지 검사. `Cybersecurity`/`Cyber Security`, `Satellite`/`Satellites`, `Services`/`Service` 등의 철자 차이는 정규화.
- **정확한 시장명으로 식별되는 2026년 보고서 우선**. 하위시장만 발견되면 `SEARCH_SCOPE_NO_DIRECT_MARKET_REPORT`, CAGR `NULL`, Ollama 호출 0. 더 좁은 보고서로 임의 대체 금지.
- R25~R31의 실행 기본 동작은 변경하지 않고 R32에서만 강제 적용. 공식 검색 1회·일치 보고서 GET 최대 1회·Ollama 최대 1회, 항목당 20초, 중간 결과 저장.
- `stage04/keyword-growth-all-r32-readonly.mjs`, `stage04/STAGE04_ALL_SECTOR_THEME_R32_READONLY.cmd`를 Windows에서 실행하고 **같은 폴더의 `R32_ALL_SECTOR_THEME_GROWTH_RESULT.txt`** 제출.
- 이 검증은 *선택 시장명*을 바로잡는 작업. 정확히 선택한 시장도 해당 ETF 섹터/테마 전체 매출과 같다는 뜻이 아니다. R32의 `GROWTH_PCT`는 **보고서 해당 시장의 전망 CAGR**일 뿐 ETF 매수 신호, 전체 테마 성장률, ZGMINI 심리 점수로 사용하지 않는다.

공식 보고서: [핀테크 블록체인](https://www.thebusinessresearchcompany.com/report/fintech-blockchain-global-market-report), [범용 사이버보안](https://www.thebusinessresearchcompany.com/report/cybersecurity-global-market-report), [항공우주 사이버보안](https://www.thebusinessresearchcompany.com/report/aerospace-cyber-security-market-report), [바이오테크 서비스](https://www.thebusinessresearchcompany.com/report/Biotechnology-Services-Global-Market-Report), [데이터센터](https://www.thebusinessresearchcompany.com/report/data-center-global-market-report).
