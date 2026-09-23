import {buildEarningsE1R3} from "./earnings-e1-r3.mjs";
import {
  parseWikipediaCurrentConstituents,
  latestMatureFrame,
  REVENUE_TAGS,
  EPS_TAG,
  OPERATING_INCOME_TAG,
  MATURE_LAG_DAYS,
} from "./sec-earnings-e1-r2-provider.mjs";
import {createEarningsE1R3D1Store} from "./earnings-e1-r3-d1-store.mjs";

const WIKI_API="https://en.wikipedia.org/w/api.php";
const SEC_BASE="https://data.sec.gov/api/xbrl/frames";
const SEC_UA="ZGMINI/1.0 (+https://zgmini.kr)";
const UNIVERSE_SECURITY_MIN=495;
const UNIVERSE_SECURITY_MAX=510;
const DEFAULT_REFRESH_MS=6*60*60*1000;
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(`${s}T00:00:00Z`));
const padCik=v=>String(v??"").replace(/\D/g,"").padStart(10,"0");
const day=s=>Math.floor(Date.parse(`${String(s).slice(0,10)}T00:00:00Z`)/86400000);
const ms=()=>globalThis.performance?.now?.()??Date.now();

function partial(reason,meta={}){
  return {id:"earnings",status:"PARTIAL",score:null,methodologyVersion:"E1-R3",source:"SEC EDGAR + Wikipedia",sourceAttribution:"SEC EDGAR; Wikipedia contributors (CC BY-SA 4.0)",missing:[reason],providerRequests:meta.providerRequests??0,reweighted:false,...meta};
}
function signedChange(current,prior){if(!finite(current)||!finite(prior))return null;const d=Math.abs(current)+Math.abs(prior);return d?(current-prior)/d:0}
function frameUrl(tag,unit,frame){return`${SEC_BASE}/us-gaap/${encodeURIComponent(tag)}/${encodeURIComponent(unit)}/${frame}.json`}
async function fetchJson(fetchImpl,url,headers={}){try{const r=await Reflect.apply(fetchImpl,globalThis,[url,{headers:{Accept:"application/json",...headers},redirect:"follow"}]);let json=null;try{json=await r.json()}catch{}return{ok:r.ok,status:r.status,json,url:String(url)}}catch(error){return{ok:false,status:0,json:null,url:String(url),error:String(error?.message??error)}}}
function frameMap(payload,asOfDate){const out=new Map();for(const x of payload?.data??[]){const cik=padCik(x?.cik);if(!/^\d{10}$/.test(cik)||cik==="0000000000")continue;if(typeof x?.filed==="string"&&x.filed>asOfDate)continue;if(!finite(x?.val))continue;const start=typeof x?.start==="string"?x.start:null,end=typeof x?.end==="string"?x.end:null,duration=start&&end?day(end)-day(start)+1:null;if(duration!=null&&(duration<55||duration>120))continue;out.set(cik,{cik,val:x.val,start,end,duration,accn:x?.accn??null,fy:x?.fy??null,fp:x?.fp??null,form:x?.form??null,filed:x?.filed??null,entityName:x?.entityName??null})}return out}
function comparablePair(cur,prior){if(!cur||!prior)return false;if(cur.end&&prior.end){const gap=day(cur.end)-day(prior.end);if(gap<320||gap>410)return false}if(cur.duration!=null&&prior.duration!=null&&Math.abs(cur.duration-prior.duration)>45)return false;return true}
function sameQuarter(a,b){if(!a||!b)return false;if(a.end&&b.end&&Math.abs(day(a.end)-day(b.end))>45)return false;return true}
async function mapLimit(items,limit,fn){const out=new Array(items.length);let cursor=0;async function worker(){while(true){const i=cursor++;if(i>=items.length)return;out[i]=await fn(items[i],i)}}await Promise.all(Array.from({length:Math.min(limit,items.length)},()=>worker()));return out}
function factProv(x){return x?{accn:x.accn??null,filed:x.filed??null,fy:x.fy??null,fp:x.fp??null,form:x.form??null,start:x.start??null,end:x.end??null}:null}
function count(rows,key){return rows.reduce((n,r)=>n+(finite(r?.[key])?1:0),0)}
function rowsFromStored(universe,facts){const map=new Map();for(const r of facts??[])map.set(`${r.cik}|${r.metric}`,Number(r.value));return (universe?.members??[]).map(m=>({cik:m.cik,ticker:m.ticker,name:m.name,epsGrowth:map.get(`${m.cik}|epsGrowth`)??null,revenueGrowth:map.get(`${m.cik}|revenueGrowth`)??null,operatingMargin:map.get(`${m.cik}|operatingMargin`)??null}))}
function scoreStored({asOf,frame,universe,facts,retrievedAt,collectionMode,providerRequests=0,storageReadMs=null,collectionMeta={}}){
  const issuerRows=rowsFromStored(universe,facts),t0=ms();
  const result=buildEarningsE1R3({asOfDate:asOf,financialPeriodEnd:frame.end,issuerRows,retrievedAt,universeMeta:{securityCount:universe.securityCount??issuerRows.length,validCikSecurityCount:universe.members?.length??issuerRows.length,uniqueIssuerCount:universe.members?.length??issuerRows.length,wikipediaRevisionId:universe.wikipediaRevisionId??null,providerRequests,frameFailures:[]}});
  const scoreComputeMs=ms()-t0;
  return {...result,providerRequests,framePolicy:{mode:"LATEST_CALENDAR_QUARTER_AT_LEAST_75_DAYS_OLD",currentFrame:frame.frame,priorFrame:frame.priorFrame,lagDays:frame.lagDays,q4CoverageRisk:"DEFERRED_NON_BLOCKING"},rawRowsExposed:false,reweighted:false,persistence:{store:"D1",mode:"CURRENT_UPSERT_PLUS_CHANGE_HISTORY",collectionMode,storageReadMs,scoreComputeMs,...collectionMeta}};
}
async function fetchLiveSnapshot({asOf,fetchImpl,frame,universeSecurityMin,universeSecurityMax}){
  let providerRequests=0;
  const wikiUrl=new URL(WIKI_API);wikiUrl.searchParams.set("action","parse");wikiUrl.searchParams.set("page","List_of_S&P_500_companies");wikiUrl.searchParams.set("prop","text|revid");wikiUrl.searchParams.set("formatversion","2");wikiUrl.searchParams.set("format","json");
  providerRequests++;const wiki=await fetchJson(fetchImpl,wikiUrl,{"User-Agent":SEC_UA});
  if(!wiki.ok)return{ok:false,reason:"WIKIPEDIA_UNIVERSE_REQUEST_FAILED",providerRequests,httpStatus:wiki.status};
  const parsed=parseWikipediaCurrentConstituents(wiki.json);if(!parsed)return{ok:false,reason:"WIKIPEDIA_UNIVERSE_PARSE_FAILED",providerRequests};
  if(parsed.securityCount<universeSecurityMin||parsed.securityCount>universeSecurityMax)return{ok:false,reason:"WIKIPEDIA_UNIVERSE_COUNT_SANITY",providerRequests,securityCount:parsed.securityCount};
  const byCik=new Map();for(const m of parsed.members)if(!byCik.has(m.cik))byCik.set(m.cik,{...m});const uniqueMembers=[...byCik.values()];
  const specs=[];for(const tag of REVENUE_TAGS){specs.push({kind:"revenueCurrent",tag,unit:"USD",frame:frame.frame});specs.push({kind:"revenuePrior",tag,unit:"USD",frame:frame.priorFrame})}specs.push({kind:"epsCurrent",tag:EPS_TAG,unit:"USD-per-shares",frame:frame.frame});specs.push({kind:"epsPrior",tag:EPS_TAG,unit:"USD-per-shares",frame:frame.priorFrame});specs.push({kind:"opCurrent",tag:OPERATING_INCOME_TAG,unit:"USD",frame:frame.frame});
  const responses=await mapLimit(specs,4,async spec=>{providerRequests++;const r=await fetchJson(fetchImpl,frameUrl(spec.tag,spec.unit,spec.frame),{"User-Agent":SEC_UA});return{spec,...r}});
  const frameFailures=responses.filter(x=>!x.ok).map(x=>({kind:x.spec.kind,tag:x.spec.tag,frame:x.spec.frame,status:x.status}));
  const maps=new Map();for(const r of responses)maps.set(`${r.spec.kind}|${r.spec.tag}`,r.ok?frameMap(r.json,asOf):new Map());
  const epsCur=maps.get(`epsCurrent|${EPS_TAG}`)??new Map(),epsPrior=maps.get(`epsPrior|${EPS_TAG}`)??new Map(),opCur=maps.get(`opCurrent|${OPERATING_INCOME_TAG}`)??new Map();
  const issuerRows=[];
  for(const member of uniqueMembers){
    const id=member.cik;let revenueCurrent=null,revenuePrior=null,revenueTag=null;
    for(const tag of REVENUE_TAGS){const c=(maps.get(`revenueCurrent|${tag}`)??new Map()).get(id),p=(maps.get(`revenuePrior|${tag}`)??new Map()).get(id);if(comparablePair(c,p)){revenueCurrent=c;revenuePrior=p;revenueTag=tag;break}}
    const ec=epsCur.get(id),ep=epsPrior.get(id),oc=opCur.get(id);const epsGrowth=comparablePair(ec,ep)?signedChange(ec.val,ep.val):null,revenueGrowth=revenueCurrent&&revenuePrior?signedChange(revenueCurrent.val,revenuePrior.val):null,operatingMargin=(oc&&revenueCurrent&&sameQuarter(oc,revenueCurrent)&&revenueCurrent.val!==0)?oc.val/revenueCurrent.val:null;
    issuerRows.push({cik:id,ticker:member.ticker,name:member.name,epsGrowth,revenueGrowth,operatingMargin,provenance:{epsGrowth:{tag:EPS_TAG,currentFrame:frame.frame,priorFrame:frame.priorFrame,current:factProv(ec),prior:factProv(ep)},revenueGrowth:{tag:revenueTag,currentFrame:frame.frame,priorFrame:frame.priorFrame,current:factProv(revenueCurrent),prior:factProv(revenuePrior)},operatingMargin:{operatingTag:OPERATING_INCOME_TAG,revenueTag,currentFrame:frame.frame,operating:factProv(oc),revenue:factProv(revenueCurrent)}}});
  }
  return{ok:true,providerRequests,frameFailures,issuerRows,universe:{members:uniqueMembers,securityCount:parsed.securityCount,issuerCount:uniqueMembers.length,wikipediaRevisionId:parsed.revisionId}};
}

export async function readEarningsE1R3StoredScore({asOf,now=()=>new Date(),lagDays=MATURE_LAG_DAYS,db}={}){
  if(!validDate(asOf))return partial("INVALID_AS_OF_DATE",{persistence:{store:"D1",calculationSource:"STORED_CURRENT_ONLY",collectionDecoupled:true}});
  const frame=latestMatureFrame(asOf,{lagDays});if(!frame)return partial("NO_MATURE_FINANCIAL_FRAME",{persistence:{store:"D1",calculationSource:"STORED_CURRENT_ONLY",collectionDecoupled:true}});
  if(!db||typeof db.prepare!=="function")return partial("D1_DATABASE_UNAVAILABLE",{financialPeriodEnd:frame.end,persistence:{store:"D1",calculationSource:"STORED_CURRENT_ONLY",collectionDecoupled:true,collectionMode:"READ_ONLY_NO_DB"}});
  const store=createEarningsE1R3D1Store(db,{now});await store.initialize();
  const r0=ms();
  const [universe,facts,latest]=await Promise.all([
    store.getUniverse(frame.end),
    store.getCurrentFacts(frame.end),
    store.latestSuccessfulRun(frame.end),
  ]);
  const storageReadMs=ms()-r0;
  if(!universe?.members?.length||!facts.length){
    return partial("NO_STORED_CURRENT_FOR_PERIOD",{
      financialPeriodEnd:frame.end,
      framePolicy:{mode:"LATEST_CALENDAR_QUARTER_AT_LEAST_75_DAYS_OLD",currentFrame:frame.frame,priorFrame:frame.priorFrame,lagDays:frame.lagDays,q4CoverageRisk:"DEFERRED_NON_BLOCKING"},
      persistence:{store:"D1",mode:"CURRENT_UPSERT_PLUS_CHANGE_HISTORY",calculationSource:"STORED_CURRENT_ONLY",collectionDecoupled:true,collectionMode:"PERSISTED_CURRENT_READ_ONLY_EMPTY",storageReadMs,lastRunId:latest?.run_id??null},
    });
  }
  const ageMs=latest?.completed_at?Date.parse(now().toISOString())-Date.parse(latest.completed_at):null;
  return scoreStored({
    asOf,frame,universe,facts,retrievedAt:latest?.completed_at??universe.retrievedAt,
    collectionMode:"PERSISTED_CURRENT_READ_ONLY",storageReadMs,
    collectionMeta:{calculationSource:"STORED_CURRENT_ONLY",collectionDecoupled:true,lastRunId:latest?.run_id??null,refreshAgeMs:Number.isFinite(ageMs)?ageMs:null},
  });
}

export async function collectEarningsE1R3ToStore({asOf,fetchImpl=globalThis.fetch,now=()=>new Date(),lagDays=MATURE_LAG_DAYS,universeSecurityMin=UNIVERSE_SECURITY_MIN,universeSecurityMax=UNIVERSE_SECURITY_MAX,db,refreshMs=DEFAULT_REFRESH_MS}={}){
  const base={collector:"E1-R3-STORAGE",calculationPerformed:false,calculationSource:null};
  if(!validDate(asOf))return{...base,status:"INVALID",failureCode:"INVALID_AS_OF_DATE",providerRequests:0};
  const frame=latestMatureFrame(asOf,{lagDays});if(!frame)return{...base,status:"INVALID",failureCode:"NO_MATURE_FINANCIAL_FRAME",providerRequests:0};
  if(!db||typeof db.prepare!=="function")return{...base,status:"FAIL",failureCode:"D1_DATABASE_UNAVAILABLE",financialPeriodEnd:frame.end,providerRequests:0};
  if(typeof fetchImpl!=="function")return{...base,status:"FAIL",failureCode:"FETCH_UNAVAILABLE",financialPeriodEnd:frame.end,providerRequests:0};

  const store=createEarningsE1R3D1Store(db,{now});await store.initialize();
  const latest=await store.latestSuccessfulRun(frame.end),nowIso=now().toISOString(),age=latest?.completed_at?Date.parse(nowIso)-Date.parse(latest.completed_at):Infinity;
  if(latest&&age>=0&&age<refreshMs)return{...base,status:"SKIPPED_FRESH",financialPeriodEnd:frame.end,providerRequests:0,lastRunId:latest.run_id,refreshAgeMs:age};

  const lease=await store.acquire(`E1-R3:${frame.end}`,{ttlMs:120000});
  if(!lease.acquired)return{...base,status:"SKIPPED_LEASE_BUSY",financialPeriodEnd:frame.end,providerRequests:0};

  const startedAt=now().toISOString();
  try{
    const afterLease=await store.latestSuccessfulRun(frame.end),age2=afterLease?.completed_at?Date.parse(now().toISOString())-Date.parse(afterLease.completed_at):Infinity;
    if(afterLease&&age2>=0&&age2<refreshMs)return{...base,status:"SKIPPED_FRESH",financialPeriodEnd:frame.end,providerRequests:0,lastRunId:afterLease.run_id,refreshAgeMs:age2};

    const u0=ms(),live=await fetchLiveSnapshot({asOf,fetchImpl,frame,universeSecurityMin,universeSecurityMax}),upstreamMs=ms()-u0;
    if(!live.ok){
      const completedAt=now().toISOString();
      const runId=await store.recordRun({periodEnd:frame.end,status:"FAIL",startedAt,completedAt,providerRequests:live.providerRequests??0,upstreamMs,failureCode:live.reason});
      return{...base,status:"FAIL",failureCode:live.reason,financialPeriodEnd:frame.end,providerRequests:live.providerRequests??0,runId,upstreamMs};
    }

    const retrievedAt=now().toISOString(),w0=ms();
    await store.putUniverse(frame.end,live.universe,retrievedAt);
    const write=await store.upsertIssuerRows({periodEnd:frame.end,frame:frame.frame,priorFrame:frame.priorFrame,issuerRows:live.issuerRows,retrievedAt});
    const storageWriteMs=ms()-w0;
    const merged=rowsFromStored(live.universe,write.facts);
    const completedAt=now().toISOString();

    const runId=await store.recordRun({
      periodEnd:frame.end,status:"SUCCESS",startedAt,completedAt,universeCount:live.universe.members.length,
      providerRequests:live.providerRequests,epsCount:count(merged,"epsGrowth"),revenueCount:count(merged,"revenueGrowth"),marginCount:count(merged,"operatingMargin"),
      insertedCount:write.inserted,updatedCount:write.updated,noopCount:write.noop,currentRows:write.currentRows,historyRowsAdded:write.historyRowsAdded,
      upstreamMs,storageWriteMs,storageReadMs:null,scoreComputeMs:null,
    });

    return{...base,status:"STORED",financialPeriodEnd:frame.end,runId,providerRequests:live.providerRequests,upstreamMs,storageWriteMs,
      inserted:write.inserted,updated:write.updated,noop:write.noop,currentRows:write.currentRows,historyRowsAdded:write.historyRowsAdded,
      epsCount:count(merged,"epsGrowth"),revenueCount:count(merged,"revenueGrowth"),marginCount:count(merged,"operatingMargin")};
  }finally{await store.release(lease).catch(()=>false)}
}

// Compatibility export: despite the legacy name, this path is read-only and performs zero upstream API calls.
export const collectEarningsE1R3PublicDomain=readEarningsE1R3StoredScore;

export {DEFAULT_REFRESH_MS};
