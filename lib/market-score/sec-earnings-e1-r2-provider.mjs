import {buildEarningsE1R2} from "./earnings-e1-r2.mjs";

const WIKI_API="https://en.wikipedia.org/w/api.php";
const SEC_BASE="https://data.sec.gov/api/xbrl/frames";
const SEC_UA="ZGMINI/1.0 (+https://zgmini.kr)";
const REVENUE_TAGS=Object.freeze([
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "Revenues",
  "SalesRevenueNet",
]);
const EPS_TAG="EarningsPerShareDiluted";
const OPERATING_INCOME_TAG="OperatingIncomeLoss";
const MATURE_LAG_DAYS=75;
const UNIVERSE_SECURITY_MIN=495;
const UNIVERSE_SECURITY_MAX=510;

const finite=n=>typeof n==="number"&&Number.isFinite(n);
const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(`${s}T00:00:00Z`));
const padCik=v=>String(v??"").replace(/\D/g,"").padStart(10,"0");
const day=s=>Math.floor(Date.parse(`${String(s).slice(0,10)}T00:00:00Z`)/86400000);

function partial(reason,meta={}){
  return {
    id:"earnings",
    status:"PARTIAL",
    score:null,
    methodologyVersion:"E1-R2",
    source:"SEC EDGAR + Wikipedia",
    sourceAttribution:"SEC EDGAR; Wikipedia contributors (CC BY-SA 4.0)",
    missing:[reason],
    providerRequests:meta.providerRequests??0,
    ...meta,
  };
}
function signedChange(current,prior){
  if(!finite(current)||!finite(prior))return null;
  const d=Math.abs(current)+Math.abs(prior);
  return d?(current-prior)/d:0;
}
function decodeHtml(s){
  return String(s||"")
    .replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16)))
    .replace(/&#([0-9]+);/g,(_,d)=>String.fromCodePoint(parseInt(d,10)))
    .replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&")
    .replace(/&lt;/gi,"<").replace(/&gt;/gi,">")
    .replace(/&quot;/gi,'"').replace(/&#39;/gi,"'");
}
function htmlText(s){
  let x=String(s||"");
  x=x.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi," ");
  x=x.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ");
  x=x.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ");
  x=x.replace(/<br\s*\/?>/gi," ").replace(/<[^>]+>/g," ");
  return decodeHtml(x).replace(/\s+/g," ").trim();
}
function firstBalancedTable(html){
  const s=String(html||""),tag=/<\/?table\b[^>]*>/gi;
  let m,start=-1,depth=0;
  while((m=tag.exec(s))!==null){
    const closing=/^<\//.test(m[0]);
    if(!closing){if(depth===0)start=m.index;depth++}
    else if(depth>0){depth--;if(depth===0&&start>=0)return s.slice(start,tag.lastIndex)}
  }
  return null;
}
function tableRows(tableHtml){
  const rows=[],rr=/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm;
  while((rm=rr.exec(String(tableHtml||"")))!==null){
    const cells=[],cr=/<t([dh])\b[^>]*>([\s\S]*?)<\/t\1>/gi;
    let cm;
    while((cm=cr.exec(rm[1]))!==null)cells.push({kind:cm[1].toLowerCase(),text:htmlText(cm[2])});
    if(cells.length)rows.push(cells);
  }
  return rows;
}
export function parseWikipediaCurrentConstituents(parsePayload){
  const html=parsePayload?.parse?.text??"";
  const rows=tableRows(firstBalancedTable(html));
  if(rows.length<2)return null;
  const headers=rows[0].map(x=>x.text);
  const symbolIndex=headers.indexOf("Symbol");
  const securityIndex=headers.indexOf("Security");
  const cikIndex=headers.indexOf("CIK");
  if(symbolIndex<0||securityIndex<0||cikIndex<0)return null;
  const members=[];
  for(const r of rows.slice(1)){
    const c=r.map(x=>x.text);
    const ticker=String(c[symbolIndex]??"").trim().toUpperCase().replace(/\./g,"-");
    const name=String(c[securityIndex]??"").trim();
    const raw=String(c[cikIndex]??"").replace(/\D/g,"");
    if(!ticker||!raw)continue;
    const cik=raw.padStart(10,"0");
    if(!/^\d{10}$/.test(cik)||cik==="0000000000")continue;
    members.push({ticker,name,cik});
  }
  return {
    revisionId:parsePayload?.parse?.revid??null,
    securityCount:members.length,
    members,
  };
}
function quarterEndDate(y,q){
  if(q===1)return`${y}-03-31`;
  if(q===2)return`${y}-06-30`;
  if(q===3)return`${y}-09-30`;
  return`${y}-12-31`;
}
export function latestMatureFrame(asOfDate,{lagDays=MATURE_LAG_DAYS}={}){
  if(!validDate(asOfDate)||!Number.isInteger(lagDays)||lagDays<0)return null;
  const cutoff=day(asOfDate)-lagDays;
  const y=Number(asOfDate.slice(0,4));
  const candidates=[];
  for(let yr=y-2;yr<=y;yr++)for(let q=1;q<=4;q++){
    const end=quarterEndDate(yr,q);
    if(day(end)<=cutoff)candidates.push({year:yr,quarter:q,end,frame:`CY${yr}Q${q}`});
  }
  candidates.sort((a,b)=>a.end.localeCompare(b.end));
  const current=candidates.at(-1);
  if(!current)return null;
  return {
    ...current,
    priorFrame:`CY${current.year-1}Q${current.quarter}`,
    priorEnd:quarterEndDate(current.year-1,current.quarter),
    lagDays,
  };
}
async function fetchJson(fetchImpl,url,headers={}){
  try{
    const r=await Reflect.apply(fetchImpl,globalThis,[url,{headers:{Accept:"application/json",...headers},redirect:"follow"}]);
    let json=null;try{json=await r.json()}catch{}
    return{ok:r.ok,status:r.status,json,url:String(url)};
  }catch(error){
    return{ok:false,status:0,json:null,url:String(url),error:String(error?.message??error)};
  }
}
function frameUrl(tag,unit,frame){
  return `${SEC_BASE}/us-gaap/${encodeURIComponent(tag)}/${encodeURIComponent(unit)}/${frame}.json`;
}
function frameMap(payload,asOfDate){
  const out=new Map();
  for(const x of payload?.data??[]){
    const cik=padCik(x?.cik);
    if(!/^\d{10}$/.test(cik)||cik==="0000000000")continue;
    if(typeof x?.filed==="string"&&x.filed>asOfDate)continue;
    if(!finite(x?.val))continue;
    const start=typeof x?.start==="string"?x.start:null;
    const end=typeof x?.end==="string"?x.end:null;
    const duration=start&&end?day(end)-day(start)+1:null;
    if(duration!=null&&(duration<55||duration>120))continue;
    out.set(cik,{
      cik,val:x.val,start,end,duration,
      accn:x?.accn??null,fy:x?.fy??null,fp:x?.fp??null,
      form:x?.form??null,filed:x?.filed??null,
      entityName:x?.entityName??null,
    });
  }
  return out;
}
function comparablePair(cur,prior){
  if(!cur||!prior)return false;
  if(cur.end&&prior.end){
    const gap=day(cur.end)-day(prior.end);
    if(gap<320||gap>410)return false;
  }
  if(cur.duration!=null&&prior.duration!=null&&Math.abs(cur.duration-prior.duration)>45)return false;
  return true;
}
function sameQuarter(a,b){
  if(!a||!b)return false;
  if(a.end&&b.end&&Math.abs(day(a.end)-day(b.end))>45)return false;
  return true;
}
async function mapLimit(items,limit,fn){
  const out=new Array(items.length);let cursor=0;
  async function worker(){
    while(true){
      const i=cursor++;
      if(i>=items.length)return;
      out[i]=await fn(items[i],i);
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},()=>worker()));
  return out;
}

export async function collectEarningsE1R2PublicDomain({
  asOf,
  fetchImpl=globalThis.fetch,
  now=()=>new Date(),
  lagDays=MATURE_LAG_DAYS,
  universeSecurityMin=UNIVERSE_SECURITY_MIN,
  universeSecurityMax=UNIVERSE_SECURITY_MAX,
}={}){
  if(!validDate(asOf))return partial("INVALID_AS_OF_DATE");
  if(typeof fetchImpl!=="function")return partial("FETCH_UNAVAILABLE");
  const frame=latestMatureFrame(asOf,{lagDays});
  if(!frame)return partial("NO_MATURE_FINANCIAL_FRAME");

  let providerRequests=0;
  const wikiUrl=new URL(WIKI_API);
  wikiUrl.searchParams.set("action","parse");
  wikiUrl.searchParams.set("page","List_of_S%26P_500_companies");
  wikiUrl.searchParams.set("prop","text|revid");
  wikiUrl.searchParams.set("formatversion","2");
  wikiUrl.searchParams.set("format","json");

  providerRequests++;
  const wiki=await fetchJson(fetchImpl,wikiUrl,{"User-Agent":"ZGMINI/1.0 (+https://zgmini.kr)"});
  if(!wiki.ok)return partial("WIKIPEDIA_UNIVERSE_REQUEST_FAILED",{providerRequests,httpStatus:wiki.status});
  const universe=parseWikipediaCurrentConstituents(wiki.json);
  if(!universe)return partial("WIKIPEDIA_UNIVERSE_PARSE_FAILED",{providerRequests});
  if(universe.securityCount<universeSecurityMin||universe.securityCount>universeSecurityMax){
    return partial("WIKIPEDIA_UNIVERSE_COUNT_SANITY",{
      providerRequests,securityCount:universe.securityCount,requiredRange:[universeSecurityMin,universeSecurityMax],
    });
  }

  const byCik=new Map();
  for(const m of universe.members)if(!byCik.has(m.cik))byCik.set(m.cik,{...m});
  const uniqueMembers=[...byCik.values()];

  const specs=[];
  for(const tag of REVENUE_TAGS){
    specs.push({kind:"revenueCurrent",tag,unit:"USD",frame:frame.frame});
    specs.push({kind:"revenuePrior",tag,unit:"USD",frame:frame.priorFrame});
  }
  specs.push({kind:"epsCurrent",tag:EPS_TAG,unit:"USD-per-shares",frame:frame.frame});
  specs.push({kind:"epsPrior",tag:EPS_TAG,unit:"USD-per-shares",frame:frame.priorFrame});
  specs.push({kind:"opCurrent",tag:OPERATING_INCOME_TAG,unit:"USD",frame:frame.frame});

  const responses=await mapLimit(specs,4,async spec=>{
    providerRequests++;
    const r=await fetchJson(fetchImpl,frameUrl(spec.tag,spec.unit,spec.frame),{"User-Agent":SEC_UA});
    return{spec,...r};
  });
  const frameFailures=responses.filter(x=>!x.ok).map(x=>({kind:x.spec.kind,tag:x.spec.tag,frame:x.spec.frame,status:x.status}));
  const maps=new Map();
  for(const r of responses)maps.set(`${r.spec.kind}|${r.spec.tag}`,r.ok?frameMap(r.json,asOf):new Map());

  const epsCur=maps.get(`epsCurrent|${EPS_TAG}`)??new Map();
  const epsPrior=maps.get(`epsPrior|${EPS_TAG}`)??new Map();
  const opCur=maps.get(`opCurrent|${OPERATING_INCOME_TAG}`)??new Map();

  const issuerRows=[];
  for(const member of uniqueMembers){
    const cik=member.cik;
    let revenueCurrent=null,revenuePrior=null,revenueTag=null;
    for(const tag of REVENUE_TAGS){
      const c=(maps.get(`revenueCurrent|${tag}`)??new Map()).get(cik);
      const p=(maps.get(`revenuePrior|${tag}`)??new Map()).get(cik);
      if(comparablePair(c,p)){revenueCurrent=c;revenuePrior=p;revenueTag=tag;break}
    }
    const ec=epsCur.get(cik),ep=epsPrior.get(cik);
    const oc=opCur.get(cik);
    const epsGrowth=comparablePair(ec,ep)?signedChange(ec.val,ep.val):null;
    const revenueGrowth=revenueCurrent&&revenuePrior?signedChange(revenueCurrent.val,revenuePrior.val):null;
    const operatingMargin=(oc&&revenueCurrent&&sameQuarter(oc,revenueCurrent)&&revenueCurrent.val!==0)
      ? oc.val/revenueCurrent.val
      : null;
    issuerRows.push({
      cik,ticker:member.ticker,name:member.name,
      epsGrowth,revenueGrowth,operatingMargin,revenueTag,
    });
  }

  const retrievedAt=now().toISOString();
  const result=buildEarningsE1R2({
    asOfDate:asOf,
    financialPeriodEnd:frame.end,
    issuerRows,
    retrievedAt,
    universeMeta:{
      securityCount:universe.securityCount,
      validCikSecurityCount:universe.members.length,
      uniqueIssuerCount:uniqueMembers.length,
      wikipediaRevisionId:universe.revisionId,
      providerRequests,
      frameFailures,
    },
  });
  return {
    ...result,
    providerRequests,
    framePolicy:{
      mode:"LATEST_CALENDAR_QUARTER_AT_LEAST_75_DAYS_OLD",
      currentFrame:frame.frame,
      priorFrame:frame.priorFrame,
      lagDays:frame.lagDays,
      q4CoverageRisk:"DEFERRED_NON_BLOCKING",
    },
    rawRowsExposed:false,
  };
}

export {REVENUE_TAGS,EPS_TAG,OPERATING_INCOME_TAG,MATURE_LAG_DAYS};
