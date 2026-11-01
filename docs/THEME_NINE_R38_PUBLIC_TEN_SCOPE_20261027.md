# R38: 공개 10개 테마 보존과 R32 ETF 확대 연결 경계 (2026-10-27)

## 기준과 진행 상태

- 공개 API의 현재 테마 수는 **10개**다. 원본 7개 테마에 바이오·신약, 데이터센터·전력, 우주·위성이 포함된다. 2026-10-23 공개 기준 포착본 `THEME_NINE_R33_PUBLIC_BASELINE_28856_6920.json`으로 순서와 ETF를 확인했다.
- 비공개 R32 계산 대상은 **9개**로, 이 중 공개와 겹치는 것은 **8개**다. 별도 `AI·반도체`는 연구 대상이지만 현재 공개 10개 테마에는 없다.
- 비공개 R32 로스터: 9개 테마, ETF 편입 자리 64개, 서로 다른 ETF 63개, 과거 252일. 2026-10-23 원가격 기준 비공개 계산이며 **현재 공개 수치가 아님**.
- 공개 10개 ETF 로스터를 R32 후보로 대비하면 공개 공통 8개 테마의 후보는 53자리다. 나머지 2개 테마는 별도 R8: 우주·위성 4종, 데이터센터·전력 2종. **후보 ETF 전부가 당일 점수에 기여하는 것은 아니다.**
- 공급자 공식 이용 약관은 대량 원가격 재배포를 금지하지만 원자료를 대량 복원할 수 없는 파생 지표 배포를 조건부 허용한다. 실제 계정·원출처·시세 검산을 별도로 확인해야 하므로 공개 승인 플래그를 추측해서는 안 된다.
- 공급자 `stocks` 데이터는 공식 안내상 적어도 48시간 지연되며 R35 PC 실행 당시 2026-10-23 이후 새 검증 SPY 거래일이 없었다. 기존 2026-10-26 잠정치를 2026-10-23 R32 이력으로 덮어쓰지 않는다.

## 공개 10개 테마와 개선 후보 명세

| 공개 순서 | 테마 | R32 개선 ETF 후보 또는 별도 운영 ETF | 후보 수 | 상태 |
|---:|---|---|---:|---|
| 1 | 로봇·자동화 | BOTZ ROBO ROBT ARKQ HUMN RBTX CBOT | 7 | R32 비공개 연구 |
| 2 | 클라우드·SaaS | SKYY CLOU WCLD FCLD CLOD | 5 | R32 비공개 연구 |
| 3 | 자율주행 | DRIV BOTZ IDRV HAIL CABZ KARS | 6 | R32 비공개 연구 |
| 4 | 원전·SMR | NLR URA URNM NUKZ URNJ URAN | 6 | R32 비공개 연구 |
| 5 | 방산 | ITA SHLD XAR PPA NATO WR | 6 | R32 비공개 연구 |
| 6 | 핀테크 | FINX ARKF IPAY BPAY KYC LATR | 6 | R32 비공개 연구 |
| 7 | 사이버보안 | CIBR BUG HACK IHAK WCBR SPAM PSWD XA | 8 | R32 비공개 연구 |
| 8 | 바이오·신약 | IBB XBI BBH PBE GNOM ARKG SBIO FBT GNMX | 9 | R32 비공개 연구 |
| 9 | 데이터센터·전력 | DTCR GRID | 2 | 별도 R8 운영 |
| 10 | 우주·위성 | UFO NASA WARP ROKT | 4 | 별도 R8 운영 |

### 아직 공개 목록에 없는 R32 제9테마

`AI·반도체`: SMH SOXX SOXQ XSD ARTY AIQ CHAT PSI EUV DRAM LLMA (11개 후보). 공개 11번째 테마로 신설하는 것은 별도 결정 사항이다.

## R38에서 수정한 공개 reader의 불변조건

1. `worker/theme-nine-r37-public.mjs`: 기존 공개 목록과 순서, 개수를 보존하고 그 목록에 이미 있는 R32 테마만 교체한다. **후보 R32의 AI·반도체가 자동 공개되지 않는다.**
2. 잠정 점수 병합에서는 기존 데이터센터·전력 / 우주·위성 수치를 유지하고, 공개되지 않은 AI·반도체 점수 키를 제거한다.
3. R37의 엄격한 `READY`, 가격정합·원본 SHA·재현성·약관 확인·동일 확정 관측일·잠정 일자 검증은 그대로 유지한다. 현재 준비되지 않은 R32 후보는 여전히 공개로 승격되지 않는다.
4. 신규 수집 일정·PC 스케줄러·D1 게시·과거 공개 이력 수정은 0건이다.

## 미완료인 정규 데이터 연결

- 실제 PC 정규 계산기(`r181-primary-cycle`, `r179-publish-core`, `r171-publish`)의 설치 파일과 호출 관계는 아직 확인되지 않았다. GitHub `main`에는 이 이름의 소스 파일이 없어 추측으로 갈아끼우지 않는다.
- 확정 거래일의 9개 테마 252일 결과와 1~2일 잠정 점수의 **동일 기준 데이터**를 기존 PC 게시 과정에서 생성해야 한다.
- 새 R37 D1 `theme-legacy-nine-r37/current`에 정상 게시와 조회 후 검증이 이루어지면 reader가 자동으로 공개 10개 중 공통 8개에 대해 개선된 ETF 점수를 표시한다. 그 전에는 기존 자료를 유지한다.

## 공식 자료

- https://getmarkethistory.com/docs/terms
- https://getmarkethistory.com/docs/reliability/
- https://developers.cloudflare.com/d1/worker-api/prepared-statements/
