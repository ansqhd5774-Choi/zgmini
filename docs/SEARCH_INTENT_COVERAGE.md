# 검색 의도와 페이지 운영 기준

기준일: 2026-10-25. 공개 사이트맵 34개 URL을 점검한 결과를 바탕으로 작성했다. 검색량이나 순위가 검증된 키워드 목록이 아니라, 실제 제공 내용에 대응하는 편집 기준이다.

## 페이지별 담당 검색 의도

| URL | 담당 검색 의도와 설명할 용어 |
| --- | --- |
| `/` | 미국·한국 공포탐욕지수, 공탐·공탐 지수, 종합 시장 점수 |
| `/about/` | ZGMINI·지그미니 소개와 운영 목적 |
| `/usage/` | ZGMINI 사용법·점수 읽는 법 |
| `/data-sources/` | 데이터 출처·관측일·잠정치 기준 |
| `/investment-notice/` | 투자 유의사항·점수 해석 한계 |
| `/fear-greed/korea/` | 한국 공탐지수·코스피 투자심리·ZGmini 자체 모델 |
| `/fear-greed/usa/` | 미국 공탐지수·CNN Fear & Greed Index·미국 주식 투자심리 |
| `/sector-fear-greed/` | 미국 섹터 공탐·업종별 공포탐욕지수·11개 GICS 섹터 |
| `/risk-indicators/` | 미국 경제 위험·8대 위험 지표 비교 |
| `/economic-indicators/` | 미국 경제지표·12개 시장 평가 점수 비교 |
| `/theme-fear-greed/` | 테마 공탐·ETF 투자심리·공개된 AI·반도체/로봇/바이오 테마 |
| `/inflation/` | 미국 인플레이션 위험·근원 물가·CPI/PCE 재가속 |
| `/recession/` | 미국 경기침체·recession·실업률·Sahm Rule·장단기 금리차 |
| `/stagflation-risk/` | 스태그플레이션·stagflation·고물가와 경기 부진 |
| `/credit-risk/` | 미국 신용위험·회사채 스트레스·HY/IG/CMDI |
| `/earnings-recession/` | 실적 침체·earnings recession·이익 위축 위험 |
| `/asset-bubble/` | 자산 버블·거품·과열·asset bubble |
| `/debt-risk/` | 미국 가계·기업 부채위험·DSR·원리금 상환 부담 |
| `/supply-shock/` | 공급 충격·공급망 차질·supply shock |
| `/guides/fear-greed-buying/` | 공탐 지수 해석·공포탐욕지수 매수 기준·교육 자료 |
| `/guides/cpi-pce-release/` | 미국 CPI/PCE 발표일·발표시간·한국시간 |
| `/guides/fomc/` | 연준 금리 발표일·발표시간·FOMC 일정·한국시간 |
| `/economic-indicators/inflation/` | 소비자물가지수 CPI·개인소비지출 물가지수 PCE·기대인플레이션 (시장 여건 평가) |
| `/economic-indicators/employment/` | 미국 고용지표·비농업고용 NFP·실업률·실업수당 (시장 여건 평가) |
| `/economic-indicators/rates/` | 미국 기준금리·연방기금금리·국채금리·Fed (시장 여건 평가) |
| `/economic-indicators/credit/` | 미국 회사채·투자등급 IG·하이일드 HY (시장 여건 평가) |
| `/economic-indicators/growth/` | 실물경기·산업생산·신규주문 (시장 여건 평가) |
| `/economic-indicators/consumption/` | 실질 개인소비지출 PCE·소득·가계 여력 (시장 여건 평가) |
| `/economic-indicators/earnings/` | 기업 실적·주당순이익 EPS·매출·현금흐름 (시장 여건 평가) |
| `/economic-indicators/liquidity/` | 시장 유동성·통화량 M2·TGA·ON RRP (시장 여건 평가) |
| `/economic-indicators/fund-flows/` | 펀드 자금흐름·순유입·환매·fund flows (시장 여건 평가) |
| `/economic-indicators/breadth/` | 시장 폭·상승 참여·market breadth (시장 여건 평가) |
| `/economic-indicators/dollar-fx/` | 미국 달러 종합지수·달러 강세와 약세 (시장 여건 평가) |
| `/economic-indicators/commodities/` | 국제유가·서부텍사스산 원유 WTI·브렌트유 Brent·구리 (시장 여건 평가) |

## 신규 페이지와 변경 시 필수 점검

1. 실제 데이터·기능을 확인하고 대표 검색 의도 하나를 정한다. 정식 명칭, 통용 줄임말, 영문 약어를 짧은 설명에 연결한다. 제공하지 않는 자산·실시간 기능·확률·확정치를 유입 목적으로 추가하지 않는다.
2. 제목·설명·대표 제목·보이는 본문이 같은 내용을 설명해야 한다. 경제지표 12개는 economic-detail-catalog의 설명을 메타데이터와 본문이 공유한다. 위험 진단과 시장 여건 평가, 국가별 모델을 구분한다.
3. 관련 기존 페이지에서 일반 HTML 링크로 연결한다. 새 URL의 canonical·robots·구조화 데이터·사이트맵과 SEO_RUNTIME_MARKERS를 함께 등록한다. 실제 내용이 변경된 URL만 lastmod를 갱신한다.
4. 검색어별 얇은 복제 페이지, 숨긴 키워드 목록, meta keywords, 허위 브랜드 별칭을 만들지 않는다. 안내·출처·유의사항 페이지에 투자 키워드를 무관하게 채우지 않는다.
5. 빌드된 Workers HTML 검사에서 모든 사이트맵 URL의 메타데이터·대표 URL을 검증한다. PC·모바일 렌더링에서 설명의 잘림·가로 넘침을 확인한다.
6. main 반영 후 Cloudflare exact deployment와 공개 34개 URL 검사 결과를 확인한다. IndexNow 제출 성공은 Bing 계열의 접수 증거이며 Google·Naver 색인이나 순위 상승 증거가 아니다.
7. Search Console·네이버 도구의 실제 색인/검색어 노출 결과를 별도로 확인한다. 도구 접근 실패를 미색인으로 판정하지 않는다. 키워드 반영·수집 가능·제출·색인·검색 순위를 구분해 보고한다.

## 이번 점검에서 구분한 사실

변경 전 34개 URL은 HTTP 200, index/follow, 정상 canonical과 사이트 내 유입 링크가 확인됐다. 테마 설명 1건은 공개 페이지가 준비 테마를 구분하도록 이미 변경됐으나 검사 기준이 과거 문구에 머문 불일치였다. 실제 내용에 맞게 설명과 검사 기준을 함께 정리한다. GSC Wizard는 subscription_required로 검색어/색인 데이터를 조회하지 못했으며, 미색인으로 확정하지 않았다.

## 주식 투자자 검색 표현 R3

공개 검색 결과와 실제 제공 기능을 대조해 30개 정보 페이지에 대응하는 180개 중복 제거 검색 표현 예시를 config/investor-search-queries-r3.json에 기록했다. 검색량이 측정됐거나 모든 표현에서 노출된다는 뜻은 아니다.

- 메인: 미국 증시·주식시장·공탐·종합 시장 점수·매수 타이밍과 지표별 이동 경로
- 시장 심리: 공포지수·공탐지수·미장·국장·CNN·VIX/빅스·VKOSPI200·풋콜비율
- 경기·위험: 리세션·샴의 법칙·금리차 역전·신용경색·실적 둔화·주식 고평가·자산 거품·공급망 차질
- 경제·수급: CPI/PCE·비농업고용/NFP·실업률·국채금리·실질금리·개인소비지출·EPS·M2/TGA/역레포·펀드 순유입·시장 폭·달러·국제유가
- 일정: 연준 금리 발표일·발표시간·한국시간·FOMC·CPI/PCE 발표일
- 업종·테마: 11개 GICS 섹터·섹터 로테이션·공개된 AI/반도체·로봇·바이오·방산·원전/SMR·클라우드/SaaS·사이버보안·핀테크·자율주행 ETF

제목과 검색 설명은 각 페이지의 핵심 의도에 집중하고, 확장 검색 표현은 실제 독자 질문과 답변·관련 링크에 연결한다. 실시간 시세·DXY 시세·국내 기관별 순매수·개별 종목 추천처럼 제공 범위를 벗어나는 표현은 제공 기능으로 홍보하지 않는다. 기존 색인 검증을 반복하지 않고, 이번 배포 후에는 바뀐 문구의 운영 반영을 확인한다.

참고한 공개 검색 표현: [주식매니저 공포·탐욕](https://stock-manager.co.kr/fear-greed/), [경제 일정](https://stock-manager.co.kr/calendar/), [미국 CPI 일정](https://traderda.com/market/cpi). 기능·용어 대조는 프로젝트의 현재 코드와 BLS·BEA·연준 공식 자료를 우선했다.
