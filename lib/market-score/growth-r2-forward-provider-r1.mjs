import {GROWTH_R2_FEATURE_IDS} from "./growth-r2-contract.mjs";

const finite=v=>typeof v==="number"&&Number.isFinite(v);
const M3_BASE="https://api.census.gov/data/timeseries/eits/m3";
const BFS_BASE="https://api.census.gov/data/timeseries/eits/bfs";
const FED_IP="https://www.federalreserve.gov/releases/g17/Current/ipdisk/ip_sa.txt";
const FED_UTL="https://www.federalreserve.gov/Releases/G17/Current/ipdisk/utl_sa.txt";
const BLS_URL="https://api.bls.gov/publicAPI/v2/timeseries/data/";
const M3_GROUPS=Object.freeze({MTM:["G010","G013","G015","G016"],MDM:["G011"],NXA:["G012","G014"]});
const M3_MAP=Object.freeze({G010:{cat:"MTM",dt:"NO"},G011:{cat:"MDM",dt:"NO"},G012:{cat:"NXA",dt:"NO"},G013:{cat:"MTM",dt:"VS"},G014:{cat:"NXA",dt:"VS"},G015:{cat:"MTM",dt:"UO"},G016:{cat:"MTM",dt:"TI"}});
const BFS_MAP=Object.freeze({G060:"BA_BA",G061:"BA_HBA",G062:"BA_WBA"});
const FED_MAP=Object.freeze({G019:{kind:"ip",code:"B50001"},G020:{kind:"ip",code:"GMF"},G021:{kind:"ip",code:"G21"},G022:{kind:"ip",code:"G2211A2"},G023:{kind:"utl",code:"B50001"},G024:{kind:"utl",code:"GMF"}});
const BLS_MAP=Object.freeze({G040:"CES0500000002",G042:"CES3000000009",G043:"CES0500000016",G044:"CES6056132001"});
const sha256Hex=async(value)=>{const b=typeof value==="string"?new TextEncoder().encode(value):value;const d=await crypto.subtle.digest("SHA-256",b);return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")};
const monthDate=(y,m)=>`${y}-${String(m).padStart(2,"0")}-01`;
function rowDate(row){
  const t=row.time??row.TIME??row.time_slot_id??row.TIME_SLOT_ID??"";
  const m=String(t).match(/(20\d{2})[- ]?(0?[1-9]|1[0-2])$/); if(m)return monthDate(Number(m[1]),Number(m[2]));
  const y=Number(row.year??row.YEAR); const mo=Number(row.month??row.MONTH); return Number.isInteger(y)&&Number.isInteger(mo)?monthDate(y,mo):null;
}
function censusRows(json){
  if(!Array.isArray(json)||!Array.isArray(json[0]))return [];
  const h=json[0];return json.slice(1).map(vals=>Object.fromEntries(h.map((k,i)=>[k,vals[i]])));
}
const censusNumber=value=>Number(String(value??"").replace(/,/g,"").trim());
function latestCensus(rows,{dt,category=null}){
  return rows.filter(r=>String(r.data_type_code??r.DATA_TYPE_CODE)===dt&&(category==null||String(r.category_code??r.CATEGORY_CODE)===category)&&String(r.seasonally_adj??r.SEASONALLY_ADJ).toLowerCase().startsWith("y")&&finite(censusNumber(r.cell_value??r.CELL_VALUE)))
    .map(r=>({...r,_date:rowDate(r),_value:censusNumber(r.cell_value??r.CELL_VALUE)})).filter(r=>r._date).sort((a,b)=>a._date.localeCompare(b._date)).at(-1)??null;
}
async function fetchJson(fetchImpl,url,opts){const r=await fetchImpl(url,opts);const text=await r.text();if(!r.ok)throw new Error(`GROWTH_R2_HTTP_${r.status}:${url}`);return {json:JSON.parse(text),text,url};}
async function censusGroup(fetchImpl,base,key,year,category){
  const q=new URLSearchParams({get:"data_type_code,time_slot_id,seasonally_adj,category_code,cell_value,error_data",time:String(year),category_code:category,seasonally_adj:"yes",key});q.set("for","us:*");
  return fetchJson(fetchImpl,`${base}?${q.toString()}`);
}
async function censusBfsGroup(fetchImpl,key,year){
  const q=new URLSearchParams({get:"data_type_code,time_slot_id,seasonally_adj,category_code,cell_value,error_data",time:String(year),key});q.set("for","us:*");
  return fetchJson(fetchImpl,`${BFS_BASE}?${q.toString()}`);
}
function buildRecord(id,{value,date,retrievedAt,provider,selector,nativeUnit,harmonizedUnit,transformRule,sourceHash,sourceUrl}){return {candidateId:id,observationDate:date,observationPeriod:date.slice(0,7),availableAt:retrievedAt,releaseDate:retrievedAt.slice(0,10),vintageId:sourceHash,pitEligible:true,provider,selector,frequency:"MONTHLY",nativeValue:value,nativeUnit,harmonizedValue:value,harmonizedUnit,transformRule,sourceHash,sourceUrl,featureRevision:"G12_HARMONIZED_FEATURE_R1",methodRevision:"G12_HARMONIZATION_METHOD_R1",retrievedAt};}
function fedSeries(text,code){
  const rows=[]; const re=new RegExp(`^"?${code}"?\\s+(\\d{4})\\s+(.+)$`);
  for(const line of text.split(/\r?\n/)){const m=line.trim().match(re);if(!m)continue;const y=Number(m[1]);const vals=m[2].trim().split(/\s+/).slice(0,12);vals.forEach((v,i)=>{const n=Number(v);if(finite(n))rows.push({date:monthDate(y,i+1),value:n})});}
  return rows.sort((a,b)=>a.date.localeCompare(b.date));
}
function seedAnchor(seedRows,id,date="2021-12-01"){const r=seedRows.find(x=>x.candidateId===id&&x.observationDate===date&&x.pitEligible!==false);if(!r||!finite(r.harmonizedValue))throw new Error(`GROWTH_R2_FED_SEED_ANCHOR_MISSING:${id}`);return r.harmonizedValue;}
function blsSeries(data,id){return (data.find(x=>x.seriesID===id)?.data??[]).filter(x=>/^M(0[1-9]|1[0-2])$/.test(x.period)).map(x=>({date:monthDate(Number(x.year),Number(x.period.slice(1))),value:Number(x.value)})).filter(x=>finite(x.value)).sort((a,b)=>a.date.localeCompare(b.date));}
function latest(arr){return arr.at(-1)??null;}
export async function collectGrowthR2ForwardRecords({env,asOf,fetchImpl=fetch,seedRows,now=()=>new Date()}={}){
  if(!env?.CENSUS_API_KEY)throw new Error("GROWTH_R2_CENSUS_API_KEY_REQUIRED");
  const instant=now(),retrievedAt=instant.toISOString(),year=Number(asOf.slice(0,4));
  const records=[],snapshots=[];
  // Census M3: total unfilled orders are MTM/UO; reuse the MTM query.
  const m3ByCat={};
  for(const cat of Object.keys(M3_GROUPS)){
    let got=await censusGroup(fetchImpl,M3_BASE,env.CENSUS_API_KEY,year,cat);let rows=censusRows(got.json);
    if(!rows.length) {got=await censusGroup(fetchImpl,M3_BASE,env.CENSUS_API_KEY,year-1,cat);rows=censusRows(got.json);}
    const hash=await sha256Hex(got.text);m3ByCat[cat]={rows,hash,url:got.url};snapshots.push({providerGroup:`Census M3:${cat}`,snapshotHash:hash,retrievedAt,sourceUrl:got.url,payload:rows});
  }
  const m3={};
  for(const [id,spec] of Object.entries(M3_MAP)){
    const hit=latestCensus(m3ByCat[spec.cat].rows,{dt:spec.dt});if(!hit)throw new Error(`GROWTH_R2_M3_MISSING:${id}`);
    const v=hit._value/1000; m3[id]=v;
    records.push(buildRecord(id,{value:v,date:hit._date,retrievedAt,provider:"Census M3",selector:{G010:"M3_TABLE5_TOTAL_NEW_ORDERS",G011:"M3_TABLE2_DURABLE_NEW_ORDERS",G012:"M3_TABLE5_CORE_CAPEX_ORDERS",G013:"M3_TABLE5_TOTAL_SHIPMENTS",G014:"M3_TABLE5_CORE_CAPEX_SHIPMENTS",G015:"M3_TABLE5_UNFILLED_ORDERS",G016:"M3_TABLE5_TOTAL_INVENTORIES"}[id],nativeUnit:"USD_BILLION_SA_NOMINAL",harmonizedUnit:"USD_BILLION_SA_NOMINAL",transformRule:"IDENTITY",sourceHash:m3ByCat[spec.cat].hash,sourceUrl:m3ByCat[spec.cat].url}));
  }
  const derivedDate=[records.find(x=>x.candidateId==="G010").observationDate,records.find(x=>x.candidateId==="G013").observationDate,records.find(x=>x.candidateId==="G016").observationDate].sort()[0];
  for(const [id,n,d,sel] of [["G017","G010","G016","DERIVED_NEW_ORDERS_TO_INVENTORIES"],["G018","G013","G016","DERIVED_SHIPMENTS_TO_INVENTORIES"]]){
    const value=m3[n]/m3[d]; const sourceHash=await sha256Hex(`${id}|${m3[n]}|${m3[d]}|${derivedDate}`);
    records.push(buildRecord(id,{value,date:derivedDate,retrievedAt,provider:"Census M3 derived",selector:sel,nativeUnit:"RATIO",harmonizedUnit:"RATIO",transformRule:"IDENTITY",sourceHash,sourceUrl:M3_BASE}));
  }
  // Census BFS: one year query. Official EITS BFS contract uses category_code=TOTAL
  // and BA_BA / BA_HBA / BA_WBA as data_type_code values.
  let bfsGot=await censusBfsGroup(fetchImpl,env.CENSUS_API_KEY,year);let bfsRows=censusRows(bfsGot.json);
  const bfsHasAll=()=>Object.values(BFS_MAP).every(dt=>latestCensus(bfsRows,{dt,category:"TOTAL"}));
  if(!bfsRows.length||!bfsHasAll()){bfsGot=await censusBfsGroup(fetchImpl,env.CENSUS_API_KEY,year-1);bfsRows=censusRows(bfsGot.json);}
  const bfsHash=await sha256Hex(bfsGot.text);snapshots.push({providerGroup:"Census BFS",snapshotHash:bfsHash,retrievedAt,sourceUrl:bfsGot.url,payload:bfsRows});
  for(const [id,dt] of Object.entries(BFS_MAP)){const hit=latestCensus(bfsRows,{dt,category:"TOTAL"});if(!hit)throw new Error(`GROWTH_R2_BFS_MISSING:${id}`);records.push(buildRecord(id,{value:hit._value,date:hit._date,retrievedAt,provider:"Census BFS",selector:{G060:"BFS_US_BA_SA",G061:"BFS_US_HBA_SA",G062:"BFS_US_WBA_SA"}[id],nativeUnit:"COUNT_SA_MONTH",harmonizedUnit:"COUNT_SA_MONTH_EQUIVALENT",transformRule:"HARM-BFS-001_MONTHLY_IDENTITY",sourceHash:bfsHash,sourceUrl:bfsGot.url}));}
  // Federal Reserve G.17.
  const [ipRes,utlRes]=await Promise.all([fetchImpl(FED_IP),fetchImpl(FED_UTL)]);if(!ipRes.ok||!utlRes.ok)throw new Error(`GROWTH_R2_FED_HTTP:${ipRes.status}:${utlRes.status}`);const [ipText,utlText]=await Promise.all([ipRes.text(),utlRes.text()]);const ipHash=await sha256Hex(ipText),utlHash=await sha256Hex(utlText);snapshots.push({providerGroup:"Federal Reserve G17:IP",snapshotHash:ipHash,retrievedAt,sourceUrl:FED_IP,payload:{sha256:ipHash}});snapshots.push({providerGroup:"Federal Reserve G17:UTL",snapshotHash:utlHash,retrievedAt,sourceUrl:FED_UTL,payload:{sha256:utlHash}});
  for(const [id,spec] of Object.entries(FED_MAP)){const rows=fedSeries(spec.kind==="ip"?ipText:utlText,spec.code),cur=latest(rows);if(!cur)throw new Error(`GROWTH_R2_FED_MISSING:${id}`);let value=cur.value,rule="HARM-G17-002_IDENTITY",unit="PERCENT_CAPACITY_SA";if(spec.kind==="ip"){const anchor=rows.find(x=>x.date==="2021-12-01");if(!anchor)throw new Error(`GROWTH_R2_FED_CURRENT_ANCHOR_MISSING:${id}`);const factor=seedAnchor(seedRows,id)/anchor.value;if(!finite(factor)||factor<=0)throw new Error(`GROWTH_R2_FED_ANCHOR_FACTOR:${id}`);value=cur.value*factor;rule="HARM-G17-001_OLD_BASE_ANCHOR";unit="CHAIN_LINKED_PIT_INDEX";}records.push(buildRecord(id,{value,date:cur.date,retrievedAt,provider:"Federal Reserve G.17",selector:{G019:"G17_TOTAL_IP_INDEX",G020:"G17_MANUFACTURING_IP_INDEX",G021:"G17_MINING_IP_INDEX",G022:"G17_UTILITIES_IP_INDEX",G023:"G17_TOTAL_CAPACITY_UTILIZATION",G024:"G17_MANUFACTURING_CAPACITY_UTILIZATION"}[id],nativeUnit:spec.kind==="ip"?"CURRENT_G17_INDEX_SA":"PERCENT_CAPACITY_SA",harmonizedUnit:unit,transformRule:rule,sourceHash:spec.kind==="ip"?ipHash:utlHash,sourceUrl:spec.kind==="ip"?FED_IP:FED_UTL}));}
  // BLS CES.
  const blsIds=["CES0000000001",...Object.values(BLS_MAP)];const blsBody=JSON.stringify({seriesid:blsIds,startyear:String(year-1),endyear:String(year)});const blsRes=await fetchImpl(BLS_URL,{method:"POST",headers:{"content-type":"application/json"},body:blsBody});const blsText=await blsRes.text();if(!blsRes.ok)throw new Error(`GROWTH_R2_BLS_HTTP:${blsRes.status}`);const blsJson=JSON.parse(blsText);if(blsJson.status!=="REQUEST_SUCCEEDED")throw new Error(`GROWTH_R2_BLS_STATUS:${blsJson.status}`);const blsHash=await sha256Hex(blsText);snapshots.push({providerGroup:"BLS CES",snapshotHash:blsHash,retrievedAt,sourceUrl:BLS_URL,payload:blsJson.Results?.series??[]});const series=blsJson.Results?.series??[];
  const pay=blsSeries(series,"CES0000000001");if(pay.length<4)throw new Error("GROWTH_R2_BLS_PAYROLL_HISTORY_SHORT");const diffs=pay.slice(1).map((x,i)=>({date:x.date,value:x.value-pay[i].value}));const d1=latest(diffs),d3=diffs.slice(-3);records.push(buildRecord("G035",{value:d1.value,date:d1.date,retrievedAt,provider:"BLS CES",selector:"TOTAL_NONFARM_MONTHLY_CHANGE",nativeUnit:"THOUSAND_JOBS_CHANGE_SA",harmonizedUnit:"THOUSAND_JOBS_CHANGE_SA",transformRule:"IDENTITY",sourceHash:blsHash,sourceUrl:BLS_URL}));records.push(buildRecord("G036",{value:d3.reduce((s,x)=>s+x.value,0)/3,date:d3.at(-1).date,retrievedAt,provider:"BLS CES",selector:"TOTAL_NONFARM_3M_AVG_CHANGE",nativeUnit:"THOUSAND_JOBS_3M_AVG_CHANGE_SA",harmonizedUnit:"THOUSAND_JOBS_3M_AVG_CHANGE_SA",transformRule:"IDENTITY",sourceHash:blsHash,sourceUrl:BLS_URL}));
  for(const [id,sid] of Object.entries(BLS_MAP)){const cur=latest(blsSeries(series,sid));if(!cur)throw new Error(`GROWTH_R2_BLS_MISSING:${id}`);records.push(buildRecord(id,{value:cur.value,date:cur.date,retrievedAt,provider:"BLS CES",selector:{G040:"ALL_EMPLOYEES_TOTAL_PRIVATE_AVG_WEEKLY_HOURS",G042:"ALL_EMPLOYEES_MANUFACTURING_OVERTIME_HOURS",G043:"TOTAL_PRIVATE_AGG_WEEKLY_HOURS_INDEX_TABLE_B4",G044:"TEMPORARY_HELP_SERVICES_EMPLOYMENT_LEVEL"}[id],nativeUnit:{G040:"HOURS_SA",G042:"HOURS_SA",G043:"INDEX_2007_100_SA",G044:"THOUSAND_EMPLOYEES_SA"}[id],harmonizedUnit:{G040:"HOURS_SA",G042:"HOURS_SA",G043:"INDEX_2007_100_SA",G044:"THOUSAND_EMPLOYEES_SA"}[id],transformRule:"IDENTITY",sourceHash:blsHash,sourceUrl:BLS_URL}));}
  const by=new Map(records.map(x=>[x.candidateId,x]));const missing=GROWTH_R2_FEATURE_IDS.filter(id=>!by.has(id));if(missing.length||by.size!==24)throw new Error(`GROWTH_R2_FORWARD_COVERAGE:${by.size}:${missing.join(",")}`);
  return {status:"READY",records:[...by.values()].sort((a,b)=>a.candidateId.localeCompare(b.candidateId)),snapshots,retrievedAt,providerRequestCount:3+1+2+1};
}
export const GROWTH_R2_FORWARD_PROVIDER_CONTRACT=Object.freeze({providers:["Census M3","Census BFS","Federal Reserve G.17","BLS CES"],censusApiKey:"CENSUS_API_KEY",normalProviderRequests:7,requiredFeatureCount:24,scoreReadsNetwork:false});
