import {buildEarningsE1R1} from "./earnings-e1-r1.mjs";

const DEFAULT_BASE="https://api.equibles.com/v1";
const PRO_DAILY_LIMIT=100000;
const MAX_INDEX_PAGES=4;
const MAX_SCREENER_PAGES=4;
const SCREENER_LIMIT=200;
const SCREENER_COLS="epsgrowth,opmargin,revgrowth";

function partial(reason,meta={}){
  return {
    id:"earnings",status:"PARTIAL",score:null,methodologyVersion:"E1-R1",
    source:"Equibles",missing:[reason],
    providerRequests:meta.providerRequests??0,
    entitlement:meta.entitlement??null,
    ...meta,
  };
}
function finite(n){return typeof n==="number"&&Number.isFinite(n)}
function headerNumber(headers,name){const n=Number(headers?.get?.(name));return Number.isFinite(n)?n:null}
function planFromLimit(limit){
  if(!Number.isFinite(limit))return "UNKNOWN";
  if(limit>=100000)return "PRO_OR_HIGHER";
  if(limit>=10000)return "PLUS";
  if(limit>=100)return "FREE";
  return "UNKNOWN";
}
async function responseJson(response){try{return await response.json()}catch{return null}}
function normalizeMember(row){
  return {ticker:typeof row?.ticker==="string"?row.ticker.trim():null,weight:Number(row?.weight),isLinked:row?.isLinked===true};
}
function sameProvenance(a,b){
  return a?.slug===b?.slug&&a?.asOfDate===b?.asOfDate&&a?.source===b?.source&&a?.isDaily===b?.isDaily
    &&Number(a?.constituentCount)===Number(b?.constituentCount)
    &&Number(a?.unlinkedCount??0)===Number(b?.unlinkedCount??0);
}
function parseCsvLine(line){
  const out=[];let value="",quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(quoted){
      if(ch==='"'&&line[i+1]==='"'){value+='"';i++}
      else if(ch==='"')quoted=false;
      else value+=ch;
    }else{
      if(ch==='"')quoted=true;
      else if(ch===','){out.push(value);value=""}
      else value+=ch;
    }
  }
  out.push(value);
  return out;
}
export function parseEquiblesEarningsCsv(text){
  if(typeof text!=="string"||!text.trim())return null;
  const lines=text.replace(/^\uFEFF/,"").split(/\r?\n/).filter(x=>x.length);
  if(lines.length<2)return null;
  const header=parseCsvLine(lines[0]);
  const required=["ticker","name","price","marketcap","epsgrowth","opmargin","revgrowth"];
  for(const key of required)if(!header.includes(key))return null;
  const idx=Object.fromEntries(header.map((x,i)=>[x,i]));
  const rows=[];
  for(const line of lines.slice(1)){
    const cols=parseCsvLine(line);
    const ticker=String(cols[idx.ticker]??"").trim().toUpperCase();
    if(!ticker)continue;
    const numeric=key=>{
      const raw=String(cols[idx[key]]??"").trim();
      if(raw==="")return null;
      const n=Number(raw.replace(/,/g,""));
      return finite(n)?n:null;
    };
    rows.push({
      ticker,
      marketcap:numeric("marketcap"),
      epsgrowth:numeric("epsgrowth"),
      opmargin:numeric("opmargin"),
      revgrowth:numeric("revgrowth"),
    });
  }
  return rows;
}

export async function collectEquiblesEarningsE1R1({
  apiKey,
  fetchImpl=globalThis.fetch,
  baseUrl=DEFAULT_BASE,
  now=()=>new Date(),
}={}){
  if(typeof apiKey!=="string"||!apiKey.trim())return partial("EQUIBLES_API_KEY_MISSING",{providerRequests:0});
  if(typeof fetchImpl!=="function")return partial("EQUIBLES_FETCH_UNAVAILABLE",{providerRequests:0});

  let providerRequests=0;
  const key=apiKey.trim();
  const headers={Authorization:`Bearer ${key}`};

  async function get(url,accept="application/json"){
    providerRequests++;
    try{return await fetchImpl(url,{headers:{...headers,Accept:accept}})}
    catch(error){return {ok:false,status:0,headers:new Headers(),json:async()=>null,text:async()=>"",__networkError:String(error?.message??error)}}
  }

  const firstUrl=new URL(`${baseUrl}/indexes/sp-500`);
  firstUrl.searchParams.set("limit","500");
  firstUrl.searchParams.set("offset","0");
  const firstResponse=await get(firstUrl);
  if(firstResponse.status!==200)return partial("EQUIBLES_INDEX_REQUEST_FAILED",{providerRequests,httpStatus:firstResponse.status??0});

  const dailyLimit=headerNumber(firstResponse.headers,"x-ratelimit-limit");
  const entitlement=planFromLimit(dailyLimit);
  if(dailyLimit===null||dailyLimit<PRO_DAILY_LIMIT){
    return partial("EQUIBLES_PRO_ENTITLEMENT_REQUIRED",{
      providerRequests,entitlement,observedDailyLimit:dailyLimit,requiredDailyLimit:PRO_DAILY_LIMIT,
    });
  }

  const first=await responseJson(firstResponse);
  if(!first||!Array.isArray(first.data)||!first.meta)return partial("EQUIBLES_INDEX_INVALID_RESPONSE",{providerRequests,entitlement});
  const provenance={
    slug:first.slug,name:first.name,asOfDate:first.asOfDate,source:first.source,isDaily:first.isDaily,
    constituentCount:Number(first.constituentCount),unlinkedCount:Number(first.unlinkedCount??0),
  };
  if(provenance.slug!=="sp-500"||provenance.isDaily!==true||!provenance.asOfDate||!Number.isInteger(provenance.constituentCount)||provenance.constituentCount<=0){
    return partial("EQUIBLES_INDEX_PROVENANCE_INVALID",{providerRequests,entitlement});
  }

  const indexRows=[...first.data];
  let meta=first.meta,pageCount=1,offset=Number(meta.offset??0)+Number(meta.count??first.data.length);
  while(meta.hasMore===true){
    if(pageCount>=MAX_INDEX_PAGES)return partial("EQUIBLES_INDEX_PAGE_LIMIT_EXCEEDED",{providerRequests,entitlement});
    const u=new URL(`${baseUrl}/indexes/sp-500`);
    u.searchParams.set("limit","500");u.searchParams.set("offset",String(offset));
    const response=await get(u);
    if(response.status!==200)return partial("EQUIBLES_INDEX_PAGE_FAILED",{providerRequests,entitlement,httpStatus:response.status??0});
    const page=await responseJson(response);
    if(!page||!Array.isArray(page.data)||!page.meta||!sameProvenance(provenance,page)){
      return partial("EQUIBLES_INDEX_PAGE_PROVENANCE_MISMATCH",{providerRequests,entitlement});
    }
    indexRows.push(...page.data);meta=page.meta;offset=Number(meta.offset??offset)+Number(meta.count??page.data.length);pageCount++;
  }
  if(indexRows.length!==provenance.constituentCount){
    return partial("EQUIBLES_INDEX_INCOMPLETE",{providerRequests,entitlement,rowCount:indexRows.length,reportedCount:provenance.constituentCount});
  }

  const members=indexRows.map(normalizeMember);
  const linkedTickers=members.filter(x=>x.isLinked).map(x=>String(x.ticker??"").toUpperCase()).filter(Boolean);
  if(new Set(linkedTickers).size!==linkedTickers.length)return partial("EQUIBLES_DUPLICATE_LINKED_TICKER",{providerRequests,entitlement});

  const screenerRows=[];
  let screenerPage=1,totalPages=null,totalCount=null;
  while(true){
    if(screenerPage>MAX_SCREENER_PAGES)return partial("EQUIBLES_SCREENER_PAGE_LIMIT_EXCEEDED",{providerRequests,entitlement});
    const u=new URL(`${baseUrl}/screener/stocks`);
    u.searchParams.set("index","sp-500");
    u.searchParams.set("format","csv");
    u.searchParams.set("cols",SCREENER_COLS);
    u.searchParams.set("limit",String(SCREENER_LIMIT));
    u.searchParams.set("page",String(screenerPage));
    u.searchParams.set("sortBy","ticker");
    u.searchParams.set("sortAscending","true");
    const response=await get(u,"text/csv");
    if(response.status!==200)return partial("EQUIBLES_SCREENER_REQUEST_FAILED",{providerRequests,entitlement,httpStatus:response.status??0,screenerPage});
    const parsed=parseEquiblesEarningsCsv(await response.text());
    if(!parsed)return partial("EQUIBLES_SCREENER_INVALID_CSV",{providerRequests,entitlement,screenerPage});
    screenerRows.push(...parsed);

    const responsePages=headerNumber(response.headers,"x-screener-total-pages");
    const responseCount=headerNumber(response.headers,"x-screener-total-count");
    if(responsePages===null||responsePages<1||responsePages>MAX_SCREENER_PAGES){
      return partial("EQUIBLES_SCREENER_PAGINATION_INVALID",{providerRequests,entitlement,observedTotalPages:responsePages});
    }
    if(totalPages===null){totalPages=responsePages;totalCount=responseCount}
    else if(totalPages!==responsePages||totalCount!==responseCount){
      return partial("EQUIBLES_SCREENER_PAGINATION_CHANGED",{providerRequests,entitlement});
    }
    if(screenerPage>=totalPages)break;
    screenerPage++;
  }

  const spyUrl=new URL(`${baseUrl}/stocks/SPY/prices`);
  spyUrl.searchParams.set("limit","10");
  const spyResponse=await get(spyUrl);
  if(spyResponse.status!==200)return partial("EQUIBLES_MARKET_CALENDAR_UNAVAILABLE",{providerRequests,entitlement,httpStatus:spyResponse.status??0});
  const spy=await responseJson(spyResponse);
  if(!spy||!Array.isArray(spy.data))return partial("EQUIBLES_MARKET_CALENDAR_INVALID",{providerRequests,entitlement});
  const newerTradingDates=new Set(spy.data.map(x=>x?.date).filter(x=>typeof x==="string"&&x>provenance.asOfDate));

  const retrievedAt=now().toISOString();
  const snapshot={
    asOfDate:provenance.asOfDate,source:provenance.source,isDaily:true,
    constituentCount:provenance.constituentCount,unlinkedCount:provenance.unlinkedCount,members,
  };
  const result=buildEarningsE1R1({
    observationDate:provenance.asOfDate,
    snapshot,
    screenerRows,
    lagTradingSessions:newerTradingDates.size,
    retrievedAt,
    now:retrievedAt,
  });

  return {
    ...result,
    provider:"Equibles",
    providerRequests,
    entitlement,
    observedDailyLimit:dailyLimit,
    indexPageCount:pageCount,
    screenerPageCount:totalPages,
    screenerReportedTotal:totalCount,
    screenerRowsParsed:screenerRows.length,
    rawRowsExposed:false,
  };
}

export {PRO_DAILY_LIMIT,SCREENER_COLS};
