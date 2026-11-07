// User-facing Korean company aliases for well-known issuer/ticker pairs.
// This is a presentation aid, not an assertion about a legal Korean name.
// Unknown or ambiguous issuers retain the original vendor company name.
// Do not use aliases in raw snapshots, issuer matching, scoring, or D1 storage.
const NAMES=Object.freeze({
 AAPL:'애플',ABNB:'에어비앤비',ACHR:'아처 에비에이션',ALAB:'아스테라 랩스',
 AMZN:'아마존',AVGO:'브로드컴',BAC:'뱅크오브아메리카',BA:'보잉',
 AMAT:'어플라이드 머티리얼즈',AMGN:'암젠',ANET:'아리스타 네트웍스',
 APO:'아폴로 글로벌 매니지먼트',AXON:'액손 엔터프라이즈',
 BIDU:'바이두',BKNG:'부킹 홀딩스',BNTX:'바이오엔테크',
 'BRK.A':'버크셔 해서웨이','BRK.B':'버크셔 해서웨이',
 'BRK-A':'버크셔 해서웨이','BRK-B':'버크셔 해서웨이',
 C:'씨티그룹',CAT:'캐터필러',CEG:'컨스텔레이션 에너지',
 COST:'코스트코',CPNG:'쿠팡',CRM:'세일즈포스',CSCO:'시스코',
 CVX:'셰브론',DD:'듀폰',DDOG:'데이터독',
 DIS:'월트 디즈니',DUOL:'듀오링고',EL:'에스티 로더',ETN:'이튼',
 EXPE:'익스피디아 그룹',GE:'GE 에어로스페이스',
 GOOG:'알파벳',GOOGL:'알파벳',GRAB:'그랩',GS:'골드만삭스',
 HD:'홈디포',HUM:'휴매나',INTC:'인텔',
 IONQ:'아이온큐',JOBY:'조비 에비에이션',JPM:'JP모건 체이스',
 KDP:'큐리그 닥터페퍼',KO:'코카콜라',
 KMB:'킴벌리클라크',KODK:'이스트먼 코닥',LCID:'루시드 그룹',
 LOW:'로우스',LUNR:'인튜이티브 머신스',MA:'마스터카드',
 MAR:'메리어트 인터내셔널',META:'메타 플랫폼스',MS:'모건스탠리',
 MSFT:'마이크로소프트',
 MARA:'마라 홀딩스',MCD:'맥도날드',MDT:'메드트로닉',NET:'클라우드플레어',
 NKE:'나이키',NVDA:'엔비디아',NVO:'노보 노디스크',
 OKLO:'오클로',ON:'온세미',ORCL:'오라클',
 PANW:'팔로알토 네트웍스',PDD:'PDD 홀딩스',PEP:'펩시코',
 PFE:'화이자',PG:'프록터앤드갬블',PKX:'포스코홀딩스',
 PLTR:'팔란티어 테크놀로지스',PLUG:'플러그 파워',PTON:'펠로톤 인터랙티브',
 PYPL:'페이팔',QBTS:'디웨이브 퀀텀',QCOM:'퀄컴',
 RACE:'페라리',RGTI:'리게티 컴퓨팅',
 RKLB:'로켓랩',ROKU:'로쿠',SHOP:'쇼피파이',SMCI:'슈퍼마이크로컴퓨터',
 SMR:'뉴스케일 파워',SWKS:'스카이웍스 솔루션즈',TEM:'템퍼스 AI',
 TGT:'타겟',TSLA:'테슬라',TTWO:'테이크투 인터랙티브',
 UBER:'우버',V:'비자',VRTX:'버텍스 파마슈티컬스',
 WFC:'웰스파고',WMT:'월마트',XOM:'엑슨모빌',
 YUM:'얌 브랜즈',YUMC:'얌 차이나',
});

// A ticker can be reused or renamed. Match the preserved English issuer too;
// a changed/unrecognized company is displayed in English rather than misnamed.
const ENGLISH_HINTS=Object.freeze({
 AAPL:['apple'],ABNB:['airbnb'],ACHR:['archer'],ALAB:['astera'],
 AMZN:['amazon'],AVGO:['broadcom'],BAC:['bank of america'],BA:['boeing'],
 AMAT:['applied materials'],AMGN:['amgen'],ANET:['arista'],APO:['apollo'],
 AXON:['axon'],BIDU:['baidu'],BKNG:['booking'],BNTX:['biontech'],
 'BRK.A':['berkshire'],'BRK.B':['berkshire'],
 'BRK-A':['berkshire'],'BRK-B':['berkshire'],
 C:['citigroup'],CAT:['caterpillar'],CEG:['constellation energy'],
 COST:['costco'],CPNG:['coupang'],CRM:['salesforce'],CSCO:['cisco'],
 CVX:['chevron'],DD:['dupont'],DDOG:['datadog'],DIS:['disney'],
 DUOL:['duolingo'],EL:['lauder'],ETN:['eaton'],EXPE:['expedia'],
 GE:['ge aerospace','general electric'],GOOG:['alphabet'],GOOGL:['alphabet'],
 GRAB:['grab'],GS:['goldman sachs'],HD:['home depot'],HUM:['humana'],
 INTC:['intel'],IONQ:['ionq'],JOBY:['joby'],JPM:['jpmorgan'],
 KDP:['keurig'],KO:['coca-cola','coca cola'],KMB:['kimberly'],
 KODK:['kodak'],LCID:['lucid'],LOW:['lowe'],LUNR:['intuitive machines'],
 MA:['mastercard'],MAR:['marriott'],MARA:['mara'],MCD:['mcdonald'],
 MDT:['medtronic'],META:['meta platforms'],MS:['morgan stanley'],
 MSFT:['microsoft'],NET:['cloudflare'],NKE:['nike'],NVDA:['nvidia'],
 NVO:['novo nordisk'],OKLO:['oklo'],ON:['onsemi','on semiconductor'],
 ORCL:['oracle'],PANW:['palo alto'],PDD:['pdd'],PEP:['pepsico'],
 PFE:['pfizer'],PG:['procter','p&g'],PKX:['posco'],PLTR:['palantir'],
 PLUG:['plug power'],PTON:['peloton'],PYPL:['paypal'],QBTS:['d-wave'],
 QCOM:['qualcomm'],RACE:['ferrari'],RGTI:['rigetti'],RKLB:['rocket lab'],
 ROKU:['roku'],SHOP:['shopify'],SMCI:['super micro','supermicro'],
 SMR:['nuscale'],SWKS:['skyworks'],TEM:['tempus'],TGT:['target'],
 TSLA:['tesla'],TTWO:['take-two'],UBER:['uber'],V:['visa'],
 VRTX:['vertex'],WFC:['wells fargo'],WMT:['walmart'],XOM:['exxon'],
 YUM:['yum! brands','yum brands'],YUMC:['yum china'],
});

export function koreanCompanyName(tickers,englishName){
 if(!tickers||typeof tickers[Symbol.iterator]!=='function'||
  typeof englishName!=='string')return null;
 const name=englishName.toLowerCase();
 for(const ticker of tickers){
  if(typeof ticker==='string'&&Object.hasOwn(NAMES,ticker)&&
   ENGLISH_HINTS[ticker]?.some(hint=>name.includes(hint)))return NAMES[ticker];
 }
 return null;
}
