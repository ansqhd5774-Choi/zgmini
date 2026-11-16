// Presentation only: same calendar importance and existing own-site HTML feed.
// No provider requests, raw vendor JSON, storage or public API contract changes.
import {releaseImportance} from './market-calendar-importance.mjs';
import {easternIso,SCHEDULE_MAX_ITEMS} from './fomc-schedule.mjs';
import {FOMC_DATES,FOMC_SOURCE,fomcInstant} from './fomc-countdown.mjs';
const day=x=>typeof x==='string'&&/^20\d\d-\d\d-\d\d$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const ny=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
const sourceReady=(state,now)=>state?.status==='READY'&&Number.isFinite(Date.parse(state.checkedAt))&&now>=Date.parse(state.checkedAt)&&now-Date.parse(state.checkedAt)<=48*3600000;
const names={gdp:'미국 GDP',pce:'미국 PCE',employment:'미국 고용보고서',cpi:'미국 CPI'};
const timedSources={gdp:'bea',pce:'bea',employment:'bls',cpi:'bls'};
// Curated issuer → official-site favicon domains. Do not guess a URL from
// ticker/company text or emit private vendor records; unknowns retain ticker fallback.
const domains=Object.freeze({
 AMZN:'amazon.com',AAPL:'apple.com',MSFT:'microsoft.com',
 GOOG:'abc.xyz',GOOGL:'abc.xyz',NVDA:'nvidia.com',META:'meta.com',
 TSLA:'tesla.com',AVGO:'broadcom.com',
 DIS:'thewaltdisneycompany.com',HD:'homedepot.com',MDT:'medtronic.com',LOW:'lowes.com',
 TGT:'target.com',TJX:'tjx.com',PANW:'paloaltonetworks.com',WMT:'walmart.com',
 INTU:'intuit.com',KEYS:'keysight.com',ROST:'rossstores.com',HPE:'hpe.com',
 ADI:'analog.com',ADSK:'autodesk.com',DELL:'dell.com',DE:'deere.com',

 // Manual-only curated domains for November 2026 public R44 ★★★ cohort;
 // no dynamic mapping, scheduled checks or provider/API requests.
 ABNB:'airbnb.com',
 AFL:'aflac.com',
 ALL:'allstate.com',
 AMAT:'appliedmaterials.com',
 APD:'airproducts.com',
 APP:'applovin.com',
 B:'barrick.com',
 BAM:'bam.brookfield.com',
 BDX:'bd.com',
 BN:'bn.brookfield.com',
 CAH:'cardinalhealth.com',
 CEG:'constellationenergy.com',
 CI:'thecignagroup.com',
 CMI:'cummins.com',
 CNQ:'cnrl.com',
 COP:'conocophillips.com',
 COR:'cencora.com',
 CSCO:'cisco.com',
 CVE:'cenovus.com',
 CVS:'cvshealth.com',
 DDOG:'datadoghq.com',
 DUK:'duke-energy.com',
 DVN:'devonenergy.com',
 EMR:'emerson.com',
 ENB:'enbridge.com',
 EOG:'eogresources.com',
 EW:'edwards.com',
 GWW:'grainger.com',
 KKR:'kkr.com',
 MCD:'mcdonalds.com',
 MCK:'mckesson.com',
 MELI:'mercadolibre.com',
 MET:'metlife.com',
 MFC:'manulife.com',
 MNST:'monsterbevcorp.com',
 MRNA:'modernatx.com',
 MSI:'motorolasolutions.com',
 MUFG:'mufg.jp',
 NET:'cloudflare.com',
 NTRA:'natera.com',
 NU:'nu.com',
 NVO:'novonordisk.com',
 OXY:'oxy.com',
 PH:'parker.com',
 QCOM:'qualcomm.com',
 SO:'southerncompany.com',
 SPG:'simon.com',
 SRE:'sempra.com',
 TDG:'transdigm.com',
 TM:'global.toyota',
 TRGP:'targaresources.com',
 TRP:'tcenergy.com',
 UBER:'uber.com',
 WPM:'wheatonpm.com',

 // Manual official domains for 2026-11 R44 ★★★ candidates not on November earnings feed.
 // Preserve existing ticker fallback; this does not change R44 grades.
 AMD:'amd.com',
 AME:'ametek.com',
 AMGN:'amgen.com',
 ANET:'arista.com',
 APO:'apollo.com',
 BKNG:'bookingholdings.com',
 'BRK.A':'berkshirehathaway.com',
 ETN:'eaton.com',
 ETR:'entergy.com',
 FANG:'diamondbackenergy.com',
 IDXX:'idexx.com',
 KDP:'keurigdrpepper.com',
 LITE:'lumentum.com',
 MAR:'marriott.com',
 MPC:'marathonpetroleum.com',
 O:'realtyincome.com',
 PFE:'pfizer.com',
 PLTR:'palantir.com',
 RACE:'ferrari.com',
 SHOP:'shopify.com',
 SU:'suncor.com',
 TRI:'thomsonreuters.com',
 VRTX:'vrtx.com',
 WMB:'williams.com'
});
// Accept only the reviewed renderer's current R44 market-cap stars or
// historical ER1 >=97 stars. Never accept FHS/R43 or priority-only markup.
const publishedER1ThreeStars=html=>{
 const match=/<div class=mc-importance aria-label="기업 실적 점수 (\d{1,3}\.\d{2})점(?: · 별 3개)?" title="ER1 [^"<>]*">★★★<\/div>/.exec(html);
 const score=match?Number(match[1]):NaN;
 return Number.isFinite(score)&&score>=97&&score<=100;
};
// The own-site reviewed R44 HTML is already filtered at importance=3.
// Match its exact dated, threshold-bearing aria/title contract, including
// legacy 200B rows; never treat a bare ★★★ as an R44 grade.
const publishedR44ThreeStars=html=>
 /<div class=mc-importance aria-label="시총 기준 중요도 별 3개" title="시총 중요도 · 20\d\d-\d\d-\d\d 기준 · ★★★ (?:50B|200B) USD 이상 · ★★ 20B USD 이상">★★★<\/div>/.test(html);
const publishedThreeStars=html=>publishedR44ThreeStars(html)||publishedER1ThreeStars(html);
const text=s=>s.replace(/&#(x[0-9a-f]+|\d+);|&(amp|quot|apos|lt|gt);/gi,(whole,named,entity)=>{
 if(named){const n=named[0].toLowerCase()==='x'?parseInt(named.slice(1),16):Number(named);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}
 return {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'}[entity.toLowerCase()]??whole;
});
// The existing own-site classified HTML is the only sector source for the banner.
// No ticker-based guessing and no extra supplier/API request.
const SECTOR_BADGES=Object.freeze({
 '정보기술':['기술','technology'],
 '커뮤니케이션 서비스':['통신·미디어','communication'],
 '경기소비재':['경기소비재','cyclical'],
 '필수소비재':['필수소비재','defensive'],
 '헬스케어':['헬스케어','healthcare'],
 '산업재':['산업재','industrials'],
 '금융':['금융','financial'],
 '소재':['소재','materials'],
 '에너지':['에너지','energy'],
 '유틸리티':['유틸리티','utilities'],
 '부동산':['부동산','real-estate'],
 '미분류':['미분류','unclassified']
});
function publishedSectorBadge(body){
 const match=/<span class="mc-sector(?: is-empty)?" title="([^"<>]{1,100})">([^<>]{1,100})<\/span>/.exec(body);
 if(!match||match[1]!==match[2])return {sector:null,sectorLabel:null,sectorTone:null};
 const sector=text(match[1]);
 if(!sector||sector.length>60)return {sector:null,sectorLabel:null,sectorTone:null};
 const [sectorLabel,sectorTone]=SECTOR_BADGES[sector]??[sector,'unclassified'];
 return {sector,sectorLabel,sectorTone};
}
export function bannerCalendarRange(now){
 const start=ny.format(new Date(now)),end=new Date(Date.parse(start+'T12:00:00Z')+13*86400000).toISOString().slice(0,10);
 return {start,end};
}
export function earningsBannerRows(html,now){
 if(typeof html!=='string'||html.length>1000000||!Number.isFinite(now))return [];
 const {start,end}=bannerCalendarRange(now),rows=[];let date=null;
 // Parse only the existing renderer's date heading and reviewed article form.
 // Names remain React text, never injected HTML or a new redistributed feed.
 const tokens=/<div class="mc-week mc-vendor-week"><strong>(20\d\d-\d\d-\d\d) · 기업 실적<\/strong>|<article class="mc-row mc-vendor-row" data-search="([a-z0-9.\-]{1,12}) [^"]*">([\s\S]*?)<\/article>/g;
 for(const match of html.matchAll(tokens)){
  if(match[1]){date=day(match[1])?match[1]:null;continue;}
  const body=match[3],ticker=match[2].toUpperCase();
  if(!date||date<start||date>end||!publishedThreeStars(body))continue;
  const rawName=/<div class=mc-event><span>([^<]*)<\/span>/.exec(body)?.[1];
  const session=/<time class=mc-time>([^<]*)<\/time>/.exec(body)?.[1];
  if(!rawName||!['장전','장후','시각 미정'].includes(session))continue;
  const at=session==='장전'?easternIso(date,9,30):session==='장후'?easternIso(date,16):null;
  if(at&&Date.parse(at)<=now)continue;
  // The reviewed display can wrap an English legal name containing (The)
  // inside the outer localized suffix; remove that complete outer suffix.
  rows.push({key:'calendar-earnings-'+ticker+'-'+date,kind:'실적',importance:3,name:text(rawName).replace(/ \((?:[^()]|\([^()]*\))*\)$/,''),ticker,date,at,sortAt:at??easternIso(date,23,59),estimated:true,session:session==='장전'?'beforeOpen':session==='장후'?'afterClose':'unknown',...publishedSectorBadge(body),logo:ticker==='AMZN'?'amazon':ticker==='MSFT'?'microsoft':['GOOG','GOOGL'].includes(ticker)?'alphabet':undefined,logoDomain:domains[ticker]??null,sourceUrl:'/market-calendar/'});
 }
 return rows;
}
export function marketCalendarBannerRows(now,calendar,earningsHtml=''){
 if(!Number.isFinite(now))return [];
 const rows=earningsBannerRows(earningsHtml,now),{start,end}=bannerCalendarRange(now);
 for(const e of calendar?.events??[]){
  if(!day(e?.date)||e.date<start||e.date>end||typeof e.title!=='string'||!e.title.trim()||!['bls','bea','fed','fed_calendar','census'].includes(e.source)||releaseImportance(e.id,e.title)!==3||!sourceReady(calendar?.sources?.[e.source],now)||typeof e.sourceUrl!=='string'||!e.sourceUrl.startsWith('https://'))continue;
  const at=timedSources[e.id]===e.source?easternIso(e.date,8,30):null;
  if(at&&Date.parse(at)<=now)continue;
  if(e.status==='released')continue;
  rows.push({key:'calendar-'+e.id+'-'+e.date,kind:'지표',importance:3,name:names[e.id]??e.title,date:e.date,at,sortAt:at??easternIso(e.date,23,59),estimated:false,sourceUrl:e.sourceUrl});
 }
 // The same official FOMC snapshot is shown by the market calendar. Only
 // future decisions enter this list; the old 24-hour reached hold is excluded.
 for(const date of FOMC_DATES){
  const at=fomcInstant(date);if(date>=start&&date<=end&&Date.parse(at)>now)rows.push({key:'calendar-fomc-'+date,kind:'연준',importance:3,name:'FOMC 금리 결정',date,at,sortAt:at,estimated:false,sourceUrl:FOMC_SOURCE});
 }
 return [...new Map(rows.map(r=>[r.key,r])).values()].sort((a,b)=>Date.parse(a.sortAt)-Date.parse(b.sortAt)||a.key.localeCompare(b.key)).slice(0,SCHEDULE_MAX_ITEMS);
}
