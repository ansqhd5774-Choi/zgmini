import {buildBreadthB1R1} from "./breadth-b1-r1.mjs";

const numeric=n=>n===null||n===undefined||typeof n==="boolean"||(typeof n==="string"&&!n.trim())?NaN:Number(n);
const DEFAULT_BASE="https://api.equibles.com/v1";
const PRO_DAILY_LIMIT=100000;
const MAX_INDEX_PAGES=4;
const PRICE_LIMIT=5;
const DEFAULT_CONCURRENCY=12;

function partial(reason,meta={}){
  return {
    id:"breadth",
    status:"PARTIAL",
    score:null,
    methodologyVersion:"B1-R1",
    source:"Equibles",
    missing:[reason],
    providerRequests:meta.providerRequests??0,
    entitlement:meta.entitlement??null,
    ...meta,
  };
}

function headerNumber(headers,name){
  const value=headers?.get?.(name);
  const n=numeric(value);
  return Number.isFinite(n)?n:null;
}

function planFromLimit(limit){
  if(!Number.isFinite(limit)) return "UNKNOWN";
  if(limit>=100000) return "PRO_OR_HIGHER";
  if(limit>=10000) return "PLUS";
  if(limit>=100) return "FREE";
  return "UNKNOWN";
}

async function responseJson(response){
  try{return await response.json();}catch{return null;}
}

function normalizeMember(row){
  return {
    ticker:typeof row?.ticker==="string"?row.ticker.trim():null,
    weight:numeric(row?.weight),
    isLinked:row?.isLinked===true,
  };
}

function sameProvenance(a,b){
  return a?.slug===b?.slug
    && a?.asOfDate===b?.asOfDate
    && a?.source===b?.source
    && a?.isDaily===b?.isDaily
    && Number(a?.constituentCount)===Number(b?.constituentCount)
    && Number(a?.unlinkedCount??0)===Number(b?.unlinkedCount??0);
}

async function mapLimit(items,limit,fn){
  const out=new Array(items.length);
  let next=0;
  const workers=Array.from({length:Math.min(limit,items.length)},async()=>{
    while(true){
      const i=next++;
      if(i>=items.length) return;
      out[i]=await fn(items[i],i);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function collectEquiblesBreadthB1R1({
  apiKey,
  fetchImpl=globalThis.fetch,
  baseUrl=DEFAULT_BASE,
  concurrency=DEFAULT_CONCURRENCY,
  // Trusted server-side evidence only; never inferred from the five price bars.
  // Must verify completed US sessions and corporate-action price comparability.
  validateSnapshot=null,
}={}){
  if(typeof apiKey!=="string"||!apiKey.trim()){
    return partial("EQUIBLES_API_KEY_MISSING",{providerRequests:0});
  }
  if(typeof fetchImpl!=="function"){
    return partial("EQUIBLES_FETCH_UNAVAILABLE",{providerRequests:0});
  }
  if(!Number.isInteger(concurrency)||concurrency<1||concurrency>32){
    return partial("INVALID_CONCURRENCY",{providerRequests:0});
  }

  const key=apiKey.trim();
  let providerRequests=0;
  const headers={Authorization:`Bearer ${key}`,Accept:"application/json"};

  async function get(url){
    providerRequests++;
    try{
      return await fetchImpl(url,{headers});
    }catch(error){
      return {ok:false,status:0,headers:new Headers(),json:async()=>null,__networkError:String(error?.message??error)};
    }
  }

  const firstUrl=new URL(`${baseUrl}/indexes/sp-500`);
  firstUrl.searchParams.set("limit","500");
  firstUrl.searchParams.set("offset","0");
  const firstResponse=await get(firstUrl);
  if(firstResponse.status!==200){
    return partial("EQUIBLES_INDEX_REQUEST_FAILED",{
      providerRequests,
      httpStatus:firstResponse.status??0,
      safeError:firstResponse.__networkError?"NETWORK_ERROR":null,
    });
  }

  const limit=headerNumber(firstResponse.headers,"x-ratelimit-limit");
  const entitlement=planFromLimit(limit);
  if(limit===null||limit<PRO_DAILY_LIMIT){
    return partial("EQUIBLES_PRO_ENTITLEMENT_REQUIRED",{
      providerRequests,
      entitlement,
      observedDailyLimit:limit,
      requiredDailyLimit:PRO_DAILY_LIMIT,
    });
  }

  const first=await responseJson(firstResponse);
  if(!first||!Array.isArray(first.data)||!first.meta){
    return partial("EQUIBLES_INDEX_INVALID_RESPONSE",{providerRequests,entitlement,observedDailyLimit:limit});
  }

  const provenance={
    slug:first.slug,
    name:first.name,
    asOfDate:first.asOfDate,
    source:first.source,
    isDaily:first.isDaily,
    constituentCount:Number(first.constituentCount),
    unlinkedCount:Number(first.unlinkedCount??0),
  };
  if(provenance.slug!=="sp-500"||provenance.isDaily!==true||!provenance.asOfDate||!Number.isInteger(provenance.constituentCount)||provenance.constituentCount<=0){
    return partial("EQUIBLES_INDEX_PROVENANCE_INVALID",{providerRequests,entitlement,observedDailyLimit:limit});
  }

  const validPage=(page,expectedOffset)=>page?.meta?.offset===expectedOffset
    && page.meta.count===page.data.length
    && page.meta.total===provenance.constituentCount
    && typeof page.meta.hasMore==="boolean"
    && (page.meta.hasMore ? page.data.length>0&&expectedOffset+page.data.length<provenance.constituentCount
      : expectedOffset+page.data.length===provenance.constituentCount);
  if(!validPage(first,0))return partial("EQUIBLES_INDEX_PAGINATION_INVALID",{providerRequests});
  const rows=[...first.data];
  let meta=first.meta;
  let pageCount=1;
  let offset=Number(meta.offset??0)+Number(meta.count??first.data.length);

  while(meta.hasMore===true){
    if(pageCount>=MAX_INDEX_PAGES){
      return partial("EQUIBLES_INDEX_PAGE_LIMIT_EXCEEDED",{providerRequests,entitlement,observedDailyLimit:limit});
    }
    const pageUrl=new URL(`${baseUrl}/indexes/sp-500`);
    pageUrl.searchParams.set("limit","500");
    pageUrl.searchParams.set("offset",String(offset));
    const response=await get(pageUrl);
    if(response.status!==200){
      return partial("EQUIBLES_INDEX_PAGE_FAILED",{providerRequests,entitlement,observedDailyLimit:limit,httpStatus:response.status??0});
    }
    const page=await responseJson(response);
    if(!page||!Array.isArray(page.data)||!page.meta||!sameProvenance(provenance,page)){
      return partial("EQUIBLES_INDEX_PAGE_PROVENANCE_MISMATCH",{providerRequests,entitlement,observedDailyLimit:limit});
    }
    if(!validPage(page,offset))return partial("EQUIBLES_INDEX_PAGINATION_INVALID",{providerRequests});
    rows.push(...page.data);
    meta=page.meta;
    offset=Number(meta.offset??offset)+Number(meta.count??page.data.length);
    pageCount++;
  }

  if(rows.length!==provenance.constituentCount){
    return partial("EQUIBLES_INDEX_INCOMPLETE",{providerRequests,entitlement,observedDailyLimit:limit,rowCount:rows.length,reportedCount:provenance.constituentCount});
  }

  const identities=new Set();
  for(const row of rows){
    if(!row||typeof row!=="object"||Array.isArray(row))return partial("EQUIBLES_INVALID_MEMBER",{providerRequests});
    const identity=JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b))));
    if(identities.has(identity))return partial("EQUIBLES_DUPLICATE_MEMBER",{providerRequests});
    identities.add(identity);
  }
  const members=rows.map(normalizeMember);
  const linkedTickers=members.filter(x=>x.isLinked).map(x=>x.ticker).filter(Boolean);
  const unique=new Set(linkedTickers);
  if(unique.size!==linkedTickers.length){
    return partial("EQUIBLES_DUPLICATE_LINKED_TICKER",{providerRequests,entitlement,observedDailyLimit:limit});
  }

  if(typeof validateSnapshot!=="function"){
    return partial("B1_SESSION_AND_PRICE_BASIS_UNVERIFIED",{providerRequests,entitlement});
  }
  let evidence;
  try{evidence=await validateSnapshot({snapshot:provenance,members});}
  catch{return partial("B1_SNAPSHOT_VALIDATION_FAILED",{providerRequests,entitlement});}
  if(evidence?.asOfDate!==provenance.asOfDate||!Number.isInteger(evidence?.lagCompletedUsSessions)||evidence.lagCompletedUsSessions<0){
    return partial("B1_COMPLETED_US_SESSIONS_UNVERIFIED",{providerRequests,entitlement});
  }
  if(evidence.lagCompletedUsSessions>2)return partial("STALE",{providerRequests,quality:{lagTradingSessions:evidence.lagCompletedUsSessions}});
  if(evidence.publicDisplayRightsVerified!==true)return partial("EQUIBLES_PUBLIC_ENTITLEMENT_UNVERIFIED",{providerRequests,entitlement});
  const comparable=new Set(Array.isArray(evidence.verifiedPriceBasisTickers)?evidence.verifiedPriceBasisTickers:[]);

  const pricePairs=(await mapLimit(linkedTickers,concurrency,async ticker=>{
    if(!comparable.has(ticker))return null;
    const u=new URL(`${baseUrl}/stocks/${encodeURIComponent(ticker)}/prices`);
    u.searchParams.set("limit",String(PRICE_LIMIT));
    const response=await get(u);
    if(response.status!==200) return null;
    const body=await responseJson(response);
    if(!body||!Array.isArray(body.data)) return null;

    const bars=body.data
      .filter(x=>typeof x?.date==="string")
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)));

    if(new Set(bars.map(x=>x.date)).size!==bars.length)return null;

    const currentIndex=bars.findIndex(x=>x.date===provenance.asOfDate);
    if(currentIndex<0) return null;
    const current=bars[currentIndex];
    const previous=bars.slice(currentIndex+1).find(x=>x.date<provenance.asOfDate);
    if(!previous) return null;

    return {
      ticker,
      currentDate:current.date,
      previousDate:previous.date,
      currentClose:numeric(current.close),
      previousClose:numeric(previous.close),
      currentVolume:numeric(current.volume),
    };
  })).filter(Boolean);

  const snapshot={
    asOfDate:provenance.asOfDate,
    source:provenance.source,
    isDaily:true,
    constituentCount:provenance.constituentCount,
    unlinkedCount:provenance.unlinkedCount,
    members,
  };

  const result=buildBreadthB1R1({
    observationDate:provenance.asOfDate,
    snapshot,
    pricePairs,
    lagTradingSessions:evidence.lagCompletedUsSessions,
  });

  return {
    ...result,
    provider:"Equibles",
    attribution:"Data by Equibles",
    publicEntitlementVerified:evidence.publicDisplayRightsVerified===true,
    providerRequests,
    entitlement,
    observedDailyLimit:limit,
    indexPageCount:pageCount,
    priceRequestCount:providerRequests-pageCount,
    rawRowsExposed:false,
  };
}

export {PRO_DAILY_LIMIT};
