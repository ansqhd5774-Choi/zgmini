// Stage 06: DATED issuer-original evidence only. No ETF-constituent research,
// upstream sentiment formula audit, stock quotes, prohibited-source scraping, or orders.
// This route is deliberately limited to the user's Stage 5 TEST selection;
// it does not claim live automatic investment candidate discovery.
import fs from 'node:fs';
import path from 'node:path';

export const STAGE5_SELECTION_FILE='M2_STAGE5_SELECTION.json';
export const EVIDENCE_CHECKED_AT='2026-10-24';
const REPORTING_FRESHNESS_DAYS=45;
const validDay=value=>typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value+'T00:00:00Z')) &&
  new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;

export function validateStage5Selection(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('STAGE5_SELECTION_NOT_OBJECT');
 if(value.schema!=='ZGMINI_M2_STAGE5_SELECTION_V1'||
    value.purpose!=='STAGE6_COMPANY_EXPOSURE_RESEARCH_ONLY'||
    value.noTrade!==true||value.investmentAttractiveness!=='NOT_EVALUATED'||
    value.industryInvestmentScore!==null)throw Error('STAGE5_SELECTION_CONTRACT_INVALID');
 if(value.parentTheme!=='로봇·자동화'||value.industryId!=='humanoid'||
    value.industryName!=='휴머노이드·범용 피지컬 AI')throw Error('NO_OFFICIAL_COMPANY_EVIDENCE_ROUTE_FOR_INDUSTRY');
 if(!Number.isFinite(Date.parse(value.selectedAt))||!validDay(value.evidenceCheckedAt)||
    !Array.isArray(value.researchSources)||value.researchSources.length!==2||
    !value.researchSources.every(url=>typeof url==='string'&&url.startsWith('https://ifr.org/')))
   throw Error('STAGE5_SELECTION_PROVENANCE_INVALID');
 return Object.freeze({parentTheme:value.parentTheme,industryId:value.industryId,
   industryName:value.industryName,selectedAt:value.selectedAt,
   evidenceCheckedAt:value.evidenceCheckedAt,noTrade:true});
}

export function loadStage5Selection(directory){
 const file=path.join(directory,STAGE5_SELECTION_FILE);
 if(!fs.existsSync(file))return {status:'BLOCKED',reason:'STAGE5_SELECTION_FILE_MISSING'};
 try{
   if(fs.statSync(file).size>32768)throw Error('STAGE5_SELECTION_FILE_TOO_LARGE');
   return {status:'READY',selection:validateStage5Selection(JSON.parse(fs.readFileSync(file,'utf8')))};
 }catch(error){return {status:'BLOCKED',reason:String(error?.message||'STAGE5_SELECTION_INVALID')};}
}

// Listed-share identity and claim are not an investment recommendation.
// A null specifically means that audited/original disclosures considered in
// this pilot DO NOT establish a humanoid-only recognized sales amount.
export const HUMANOID_COMPANIES=Object.freeze([
 {
  issuerId:'HKEX:09880',legalName:'UBTECH ROBOTICS CORP LTD',name:'우비테크 로보틱스',
  ticker:'09880',exchange:'HKEX',shareClass:'H ordinary shares',listingCurrency:'HKD',
  linkType:'DIRECT_PRODUCT_SALES',verification:'DISCLOSED_HUMANOID_REVENUE',
  connection:'전신형 임바디드 지능 휴머노이드 로봇 제품·서비스를 별도 공시한 직접 제조·판매사.',
  revenue:{period:'2026-H1',audited:false,currency:'RMB',unit:'million',
   humanoidProductsAndServices:590.299,totalConsolidated:1269.130,disclosedSharePct:46.5,
   netLossTotal:338.827},
  boundary:'이 회사 분류는 이족보행뿐 아니라 바퀴형 전신 휴머노이드 제품·서비스도 포함. 그룹 전체는 당기 순손실이며 매출 확인을 수익성으로 해석 금지.',
  latestSource:{publisher:'HKEX · UBTECH 2026 H1 실적 공시',date:'2026-08-28',
   url:'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0828/2026082801691.pdf'},
  nextVerification:'후속 반기·연간 공시에서 동일 분류 매출, 고객 집중도, 관련 원가·현금흐름 대조',
 },
 {
  issuerId:'NASDAQ:TSLA',legalName:'Tesla, Inc.',name:'테슬라',
  ticker:'TSLA',exchange:'NASDAQ',shareClass:'Common stock',listingCurrency:'USD',
  linkType:'DIRECT_DEVELOPMENT',verification:'SOURCE_PROHIBITED_NOT_EVALUATED',
  connection:'허용된 자료원으로 Optimus 사업 관련성을 재검증해야 합니다.',
  revenue:null,
  boundary:'과거 자료원을 사용할 수 없으므로 개발 진행 및 전용 매출을 확정할 수 없습니다.',
  latestSource:null,
  nextVerification:'허용된 발행사 IR·거래소 발표 등에서 기술·출하·매출 근거를 신규 검증',
 },
 {
  issuerId:'NYSE:XPEV',legalName:'XPeng Inc.',name:'샤오펑(XPeng)',
  ticker:'XPEV',exchange:'NYSE',shareClass:'ADS (2 Class A ordinary shares per ADS); HKEX 09868 separately',
  listingCurrency:'USD',
  linkType:'GROUP_ROBOTICS_BUSINESS',verification:'HUMANOID_REVENUE_NOT_DISCLOSED',
  connection:'IRON 휴머노이드 생산라인 시험·양산 로드맵 공개. 로보틱스 사업의 외부 민간 투자유치 공시.',
  revenue:null,
  boundary:'로보틱스 사업의 비상장 투자유치 금액·기업가치가 XPeng 상장사 보유 비율이나 휴머노이드 매출을 입증하지는 않음. 지분율 재검증 필요.',
  latestSource:{publisher:'XPeng Inc. · IRON 제조라인 보도자료',date:'2026-09-08',
   url:'https://www.xpeng.com/au/news/01a0c826ab12a0c365408a028229001e'},
  nextVerification:'로보틱스 사업 소유권·지분희석 및 외부 출하/인식 매출의 연결재무 반영 확인',
 },
 {
  issuerId:'KRX:005380',legalName:'Hyundai Motor Company',name:'현대자동차',
  ticker:'005380',exchange:'KRX',shareClass:'Common stock',listingCurrency:'KRW',
  linkType:'GROUP_DEPLOYMENT_AND_AFFILIATE',verification:'HUMANOID_REVENUE_NOT_DISCLOSED',
  connection:'Boston Dynamics Atlas를 2028년부터 그룹 공장에 도입하는 사업 계획을 현대차 공식 IR이 설명.',
  revenue:null,
  boundary:'그룹의 Boston Dynamics 사업·목표 생산량은 현대차 법인의 휴머노이드 매출이나 귀속 지분 수익과 동일하지 않음.',
  latestSource:{publisher:'현대자동차 · 2026 CEO Investor Day',date:'2026-08-26',
   url:'https://www.hyundai.com/worldwide/en/newsroom/detail/0000001260.html'},
  nextVerification:'현대차 법인의 Boston Dynamics 실질 지분 노출 및 외부 판매·수익 인식 여부 확인',
 },
 {
  issuerId:'KRX:012330',legalName:'Hyundai Mobis Co., Ltd.',name:'현대모비스',
  ticker:'012330',exchange:'KRX',shareClass:'Common stock',listingCurrency:'KRW',
  linkType:'ROBOT_COMPONENT_SUPPLIER',verification:'HUMANOID_REVENUE_NOT_DISCLOSED',
  connection:'Boston Dynamics Atlas용 액추에이터 공급 협력·고객 확보를 발행사 뉴스룸에서 직접 발표.',
  revenue:null,
  boundary:'협력·공급 합의는 실제 납품액·수익인식·매출총이익을 뜻하지 않음. 전장 매출과 합산·대체 금지.',
  latestSource:{publisher:'현대모비스 · 공식 협력 발표',date:'2026-01-08',
   url:'https://www.mobis.com/en/aboutus/press.do?category=press&idx=6159'},
  nextVerification:'Atlas 부품 납품 시점·관련 매출 분리 공시 및 고객 단가·마진 확인',
 },
]);

export const EXCLUSION_NOTES=Object.freeze([
 {name:'UBTECH ROBOTICS / 09880',reason:'홍콩 HKEX 단독 상장 종목이므로 미국·한국 시장 한정 규칙에서 제외. 기존 조사 자료는 변경하지 않음.',
  source:'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0828/2026082801691.pdf'},
 {name:'Boston Dynamics / Atlas',reason:'별도 상장주식이 아님. 현대차그룹과 현대차 법인 보유지분을 혼동하지 않음.',
  source:'https://www.hyundai.com/worldwide/en/newsroom/detail/0000001225.html'},
]);

export function buildStage6Research(loadResult,stage5,retrievedAt){
 if(loadResult?.status!=='READY')return {status:'BLOCKED',reason:loadResult?.reason||'STAGE5_SELECTION_NOT_READY'};
 if(stage5?.status!=='READY'||stage5.selection?.selectedTheme!==loadResult.selection.parentTheme||
    !stage5.segments?.some(s=>s.id===loadResult.selection.industryId))
  return {status:'BLOCKED',reason:'STAGE5_RESEARCH_SELECTION_MISMATCH'};
 const asOf=validDay(retrievedAt?.slice(0,10))?retrievedAt.slice(0,10):EVIDENCE_CHECKED_AT;
 const ageDays=(Date.parse(asOf+'T00:00:00Z')-Date.parse(EVIDENCE_CHECKED_AT+'T00:00:00Z'))/86400000;
 const us=HUMANOID_COMPANIES.filter(c=>['NYSE','NASDAQ'].includes(c.exchange));
 const kr=HUMANOID_COMPANIES.filter(c=>c.exchange==='KRX').map(c=>({
  issuerId:c.issuerId,legalName:c.legalName,name:c.name,ticker:c.ticker,
  exchange:c.exchange,shareClass:c.shareClass,listingCurrency:c.listingCurrency,
  status:'CONFIGURED_NOT_RESEARCHED',financials:null,
 }));
 return {
  status:'READY',selection:loadResult.selection,selectionMode:'USER_TEST_ONLY',
  route:'US_LISTINGS_FIRST_KR_CONFIG_ONLY',marketsAllowed:['NASDAQ','NYSE','KRX'],
  usScope:'ACTIVE',krScope:'DEFERRED_CONFIGURED',nonTargetMarkets:'EXCLUDED',
  nextManualSelectionRequired:false,liveCompanyDiscovery:false,
  futureAutoIndustrySelection:'NOT_IMPLEMENTED_PENDING_APPROVED_RULES',
  evidenceCheckedAt:EVIDENCE_CHECKED_AT,
  evidenceStatus:ageDays>REPORTING_FRESHNESS_DAYS?'RECHECK_REQUIRED':'DATED_ORIGINAL_SNAPSHOT',
  candidates:us,koreaQueue:kr,exclusions:EXCLUSION_NOTES,
  verifiedHumanoidRevenueCount:us.filter(c=>c.revenue!==null).length,
  unverifiedHumanoidRevenueCount:us.filter(c=>c.revenue===null).length,
  investmentRank:null,investmentScore:null,tradeDecision:'NO_TRADE',
 };
}
