import {GROWTH_R2_FEATURE_IDS} from "./growth-r2-contract.mjs";

const finite=v=>typeof v==="number"&&Number.isFinite(v);
const M3_BASE="https://api.census.gov/data/timeseries/eits/m3";
const BFS_BASE="https://api.census.gov/data/timeseries/eits/bfs";
const BFS_MONTHLY_CSV="https://cdn.www.census.gov/econ/bfs/csv/bfs_monthly.csv";
const FED_IP="https://www.federalreserve.gov/releases/g17/Current/ipdisk/ip_sa.txt";
const FED_UTL="https://www.federalreserve.gov/Releases/G17/Current/ipdisk/utl_sa.txt";
const BLS_URL="https://api.bls.gov/publicAPI/v2/timeseries/data/";
const M3_MAP=Object.freeze({G010:{cat:"MTM",dt:"NO"},G011:{cat:"MDM",dt:"NO"},G012:{cat:"NXA",dt:"NO"},G013:{cat:"MTM",dt:"VS"},G014:{cat:"NXA",dt:"VS"},G015:{cat:"MDM",dt:"UO"},G016:{cat:"MTM",dt:"TI"}});
const BFS_MAP=Object.freeze({G060:"BA_BA",G061:"BA_HBA",G062:"BA_WBA"});
const FED_MAP=Object.freeze({G019:{kind:"ip",code:"B50001"},G020:{kind:"ip",code:"GMF"},G021:{kind:"ip",code:"G21"},G022:{kind:"ip",code:"G2211A2"},G023:{kind:"utl",code:"B50001"},G024:{kind:"utl",code:"GMF"}});
const BLS_MAP=Object.freeze({G040:"CES0500000002",G042:"CES3000000009",G043:"CES0500000016",G044:"CES6056132001"});
export const GROWTH_R2_FORWARD_STAGE_IDS=Object.freeze({
 censusM3Core:Object.freeze(["G010","G011","G013","G015","G016","G017","G018"]),
 censusCapexBfs:Object.freeze(["G012","G014","G060","G061","G062"]),
 fedG17:Object.freeze(["G019","G020","G021","G022","G023","G024"]),
 blsCes:Object.freeze(["G035","G036","G040","G042","G043","G044"]),
});
const sha256Hex=async value=>{const b=typeof value==="string"?new TextEncoder().encode(value):value;const d=await crypto.subtle.digest("SHA-256",b);return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")};
const monthDate=(y,m)=>`${y}-${String(m).padStart(2,"0")}-01`;
function rowDate(row){const t=row.time??row.TIME??row.time_slot_id??row.TIME_SLOT_ID??"";const m=String(t).match(/(20\d{2})[- ]?(0?[1-9]|1[0-2])$/);if(m)return monthDate(Number(m[1]),Number(m[2]));const y=Number(row.year??row.YEAR),mo=Number(row.month??row.MONTH);return Number.isInteger(y)&&Number.isInteger(mo)?monthDate(y,mo):null;}
function censusRows(json){if(!Array.isArray(json)||!Array.isArray(json[0]))return [];const h=json[0];return json.slice(1).map(vals=>Object.fromEntries(h.map((k,i)=>[k,vals[i]])));}
const censusNumber=value=>Number(String(value??"").replace(/,/g,"").trim());
function latestCensus(rows,{dt,category=null}){return rows.filter(r=>String(r.data_type_code??r.DATA_TYPE_CODE)===dt&&(category==null||String(r.category_code??r.CATEGORY_CODE)===category)&&String(r.seasonally_adj??r.SEASONALLY_ADJ).toLowerCase().startsWith("y")&&finite(censusNumber(r.cell_value??r.CELL_VALUE))).map(r=>({...r,_date:rowDate(r),_value:censusNumber(r.cell_value??r.CELL_VALUE)})).filter(r=>r._date).sort((a,b)=>a._date.localeCompare(b._date)).at(-1)??null;}
function latestBfsCsv(text,series,year){const lines=String(text??"").trim().split("\n").map(line=>line.replace(/\r$/,""));if(lines.length<2)return null;const header=lines[0].split(",");const rows=lines.slice(1).map(line=>{const vals=line.split(",");return Object.fromEntries(header.map((k,i)=>[k,vals[i]??""]))});const row=rows.find(r=>r.sa==="A"&&r.naics_sector==="TOTAL"&&r.series===series&&r.geo==="US"&&String(r.year)===String(year));if(!row)return null;const months=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];for(let i=months.length-1;i>=0;i--){const raw=row[months[i]];if(raw!==""&&finite(censusNumber(raw)))return {date:monthDate(year,i+1),value:censusNumber(raw)};}return null;}
async function fetchJson(fetchImpl,url){const r=await fetchImpl(url);const text=await r.text();if(!r.ok)throw new Error(`GROWTH_R2_HTTP_${r.status}`);return {json:JSON.parse(text),text,url};}
async function censusGroup(fetchImpl,base,key,year,category){const q=new URLSearchParams({get:"data_type_code,time_slot_id,seasonally_adj,category_code,cell_value,error_data",time:String(year),category_code:category,seasonally_adj:"yes",key});q.set("for","us:*");return fetchJson(fetchImpl,`${base}?${q.toString()}`);}
async function censusBfsGroup(fetchImpl,key,year){const q=new URLSearchParams({get:"data_type_code,time_slot_id,seasonally_adj,category_code,cell_value,error_data",time:String(year),key});q.set("for","us:*");return fetchJson(fetchImpl,`${BFS_BASE}?${q.toString()}`);}
function buildRecord(id,{value,date,retrievedAt,provider,selector,nativeUnit,harmonizedUnit,transformRule,sourceHash,sourceUrl}){return {candidateId:id,observationDate:date,observationPeriod:date.slice(0,7),availableAt:retrievedAt,releaseDate:retrievedAt.slice(0,10),vintageId:sourceHash,pitEligible:true,provider,selector,frequency:"MONTHLY",nativeValue:value,nativeUnit,harmonizedValue:value,harmonizedUnit,transformRule,sourceHash,sourceUrl,featureRevision:"G12_HARMONIZED_FEATURE_R1",methodRevision:"G12_HARMONIZATION_METHOD_R1",retrievedAt};}
function fedSeries(text,code){const rows=[],re=new RegExp(`^"?${code}"?\\s+(\\d{4})\\s+(.+)$`);for(const line of text.split(/\r?\n/)){const m=line.trim().match(re);if(!m)continue;const y=Number(m[1]),vals=m[2].trim().split(/\s+/).slice(0,12);vals.forEach((v,i)=>{const n=Number(v);if(finite(n))rows.push({date:monthDate(y,i+1),value:n})});}return rows.sort((a,b)=>a.date.localeCompare(b.date));}
function seedAnchor(seedRows,id,date="2021-12-01"){const r=seedRows.find(x=>x.candidateId===id&&x.observationDate===date&&x.pitEligible!==false);if(!r||!finite(r.harmonizedValue))throw new Error(`GROWTH_R2_FED_SEED_ANCHOR_MISSING:${id}`);return r.harmonizedValue;}
function blsSeries(data,id){return (data.find(x=>x.seriesID===id)?.data??[]).filter(x=>/^M(0[1-9]|1[0-2])$/.test(x.period)).map(x=>({date:monthDate(Number(x.year),Number(x.period.slice(1))),value:Number(x.value)})).filter(x=>finite(x.value)).sort((a,b)=>a.date.localeCompare(b.date));}
const latest=arr=>arr.at(-1)??null;

async function collectM3({env,year,retrievedAt,fetchImpl}){
 const byCat={},snapshots=[],records=[],vals={};
 for(const cat of ["MTM","MDM"]){let got=await censusGroup(fetchImpl,M3_BASE,env.CENSUS_API_KEY,year,cat),rows=censusRows(got.json);if(!rows.length){got=await censusGroup(fetchImpl,M3_BASE,env.CENSUS_API_KEY,year-1,cat);rows=censusRows(got.json);}const hash=await sha256Hex(got.text);byCat[cat]={rows,hash,url:got.url};snapshots.push({providerGroup:`Census M3:${cat}`,snapshotHash:hash,retrievedAt,sourceUrl:got.url,payload:{rows:rows.length}});}
 for(const id of ["G010","G011","G013","G015","G016"]){const spec=M3_MAP[id],hit=latestCensus(byCat[spec.cat].rows,{dt:spec.dt});if(!hit)throw new Error(`GROWTH_R2_M3_MISSING:${id}`);const v=hit._value/1000;vals[id]=v;records.push(buildRecord(id,{value:v,date:hit._date,retrievedAt,provider:"Census M3",selector:{G010:"M3_TABLE5_TOTAL_NEW_ORDERS",G011:"M3_TABLE2_DURABLE_NEW_ORDERS",G013:"M3_TABLE5_TOTAL_SHIPMENTS",G015:"M3_TABLE2_DURABLE_UNFILLED_ORDERS_EQUIVALENT",G016:"M3_TABLE5_TOTAL_INVENTORIES"}[id],nativeUnit:"USD_BILLION_SA_NOMINAL",harmonizedUnit:"USD_BILLION_SA_NOMINAL",transformRule:"IDENTITY",sourceHash:byCat[spec.cat].hash,sourceUrl:byCat[spec.cat].url}));}
 const date=[records.find(x=>x.candidateId==="G010").observationDate,records.find(x=>x.candidateId==="G013").observationDate,records.find(x=>x.candidateId==="G016").observationDate].sort()[0];
 for(const [id,n,d,sel] of [["G017","G010","G016","DERIVED_NEW_ORDERS_TO_INVENTORIES"],["G018","G013","G016","DERIVED_SHIPMENTS_TO_INVENTORIES"]]){const value=vals[n]/vals[d],sourceHash=await sha256Hex(`${id}|${vals[n]}|${vals[d]}|${date}`);records.push(buildRecord(id,{value,date,retrievedAt,provider:"Census M3 derived",selector:sel,nativeUnit:"RATIO",harmonizedUnit:"RATIO",transformRule:"IDENTITY",sourceHash,sourceUrl:M3_BASE}));}
 return {records,snapshots,providerRequestCount:2};
}
async function collectBfs({env,year,retrievedAt,fetchImpl}){
 let m3=await censusGroup(fetchImpl,M3_BASE,env.CENSUS_API_KEY,year,"NXA"),m3Rows=censusRows(m3.json);
 if(!m3Rows.length){m3=await censusGroup(fetchImpl,M3_BASE,env.CENSUS_API_KEY,year-1,"NXA");m3Rows=censusRows(m3.json);}
 const m3Hash=await sha256Hex(m3.text),records=[];
 for(const id of ["G012","G014"]){
  const spec=M3_MAP[id],hit=latestCensus(m3Rows,{dt:spec.dt});
  if(!hit)throw new Error(`GROWTH_R2_M3_MISSING:${id}`);
  records.push(buildRecord(id,{value:hit._value/1000,date:hit._date,retrievedAt,provider:"Census M3",selector:{G012:"M3_TABLE5_CORE_CAPEX_ORDERS",G014:"M3_TABLE5_CORE_CAPEX_SHIPMENTS"}[id],nativeUnit:"USD_BILLION_SA_NOMINAL",harmonizedUnit:"USD_BILLION_SA_NOMINAL",transformRule:"IDENTITY",sourceHash:m3Hash,sourceUrl:m3.url}));
 }
 const bfsRes=await fetchImpl(BFS_MONTHLY_CSV,{headers:{accept:"text/csv"}});
 if(!bfsRes.ok)throw new Error(`GROWTH_R2_BFS_HTTP:${bfsRes.status}`);
 const bfsText=await bfsRes.text();if(!bfsText.startsWith("sa,naics_sector,series,geo,year,"))throw new Error("GROWTH_R2_BFS_PAYLOAD_INVALID");const bfsHash=await sha256Hex(bfsText);
 for(const [id,series] of Object.entries(BFS_MAP)){
  let hit=latestBfsCsv(bfsText,series,year);
  if(!hit)hit=latestBfsCsv(bfsText,series,year-1);
  if(!hit)throw new Error(`GROWTH_R2_BFS_MISSING:${id}`);
  records.push(buildRecord(id,{value:hit.value,date:hit.date,retrievedAt,provider:"Census BFS Monthly CSV",selector:{G060:"BFS_US_BA_SA",G061:"BFS_US_HBA_SA",G062:"BFS_US_WBA_SA"}[id],nativeUnit:"COUNT_SA_MONTH",harmonizedUnit:"COUNT_SA_MONTH_EQUIVALENT",transformRule:"HARM-BFS-001_MONTHLY_IDENTITY",sourceHash:bfsHash,sourceUrl:BFS_MONTHLY_CSV}));
 }
 return {records,snapshots:[{providerGroup:"Census M3:NXA",snapshotHash:m3Hash,retrievedAt,sourceUrl:m3.url,payload:{rows:m3Rows.length}},{providerGroup:"Census BFS Monthly CSV",snapshotHash:bfsHash,retrievedAt,sourceUrl:BFS_MONTHLY_CSV,payload:{source:"official_monthly_csv"}}],providerRequestCount:2};
}
async function collectFed({seedRows,retrievedAt,fetchImpl}){const [ipRes,utlRes]=await Promise.all([fetchImpl(FED_IP),fetchImpl(FED_UTL)]);if(!ipRes.ok||!utlRes.ok)throw new Error(`GROWTH_R2_FED_HTTP:${ipRes.status}:${utlRes.status}`);const [ipText,utlText]=await Promise.all([ipRes.text(),utlRes.text()]),ipHash=await sha256Hex(ipText),utlHash=await sha256Hex(utlText),records=[];for(const [id,spec] of Object.entries(FED_MAP)){const rows=fedSeries(spec.kind==="ip"?ipText:utlText,spec.code),cur=latest(rows);if(!cur)throw new Error(`GROWTH_R2_FED_MISSING:${id}`);let value=cur.value,rule="HARM-G17-002_IDENTITY",unit="PERCENT_CAPACITY_SA";if(spec.kind==="ip"){const anchor=rows.find(x=>x.date==="2021-12-01");if(!anchor)throw new Error(`GROWTH_R2_FED_CURRENT_ANCHOR_MISSING:${id}`);const factor=seedAnchor(seedRows,id)/anchor.value;if(!finite(factor)||factor<=0)throw new Error(`GROWTH_R2_FED_ANCHOR_FACTOR:${id}`);value=cur.value*factor;rule="HARM-G17-001_OLD_BASE_ANCHOR";unit="CHAIN_LINKED_PIT_INDEX";}records.push(buildRecord(id,{value,date:cur.date,retrievedAt,provider:"Federal Reserve G.17",selector:{G019:"G17_TOTAL_IP_INDEX",G020:"G17_MANUFACTURING_IP_INDEX",G021:"G17_MINING_IP_INDEX",G022:"G17_UTILITIES_IP_INDEX",G023:"G17_TOTAL_CAPACITY_UTILIZATION",G024:"G17_MANUFACTURING_CAPACITY_UTILIZATION"}[id],nativeUnit:spec.kind==="ip"?"CURRENT_G17_INDEX_SA":"PERCENT_CAPACITY_SA",harmonizedUnit:unit,transformRule:rule,sourceHash:spec.kind==="ip"?ipHash:utlHash,sourceUrl:spec.kind==="ip"?FED_IP:FED_UTL}));}return {records,snapshots:[{providerGroup:"Federal Reserve G17:IP",snapshotHash:ipHash,retrievedAt,sourceUrl:FED_IP,payload:{sha256:ipHash}},{providerGroup:"Federal Reserve G17:UTL",snapshotHash:utlHash,retrievedAt,sourceUrl:FED_UTL,payload:{sha256:utlHash}}],providerRequestCount:2};}
async function collectBls({year,retrievedAt,fetchImpl}){const ids=["CES0000000001",...Object.values(BLS_MAP)],body=JSON.stringify({seriesid:ids,startyear:String(year-1),endyear:String(year)}),res=await fetchImpl(BLS_URL,{method:"POST",headers:{"content-type":"application/json"},body}),text=await res.text();if(!res.ok)throw new Error(`GROWTH_R2_BLS_HTTP:${res.status}`);const json=JSON.parse(text);if(json.status!=="REQUEST_SUCCEEDED")throw new Error(`GROWTH_R2_BLS_STATUS:${json.status}`);const hash=await sha256Hex(text),series=json.Results?.series??[],records=[],pay=blsSeries(series,"CES0000000001");if(pay.length<4)throw new Error("GROWTH_R2_BLS_PAYROLL_HISTORY_SHORT");const diffs=pay.slice(1).map((x,i)=>({date:x.date,value:x.value-pay[i].value})),d1=latest(diffs),d3=diffs.slice(-3);records.push(buildRecord("G035",{value:d1.value,date:d1.date,retrievedAt,provider:"BLS CES",selector:"TOTAL_NONFARM_MONTHLY_CHANGE",nativeUnit:"THOUSAND_JOBS_CHANGE_SA",harmonizedUnit:"THOUSAND_JOBS_CHANGE_SA",transformRule:"IDENTITY",sourceHash:hash,sourceUrl:BLS_URL}));records.push(buildRecord("G036",{value:d3.reduce((s,x)=>s+x.value,0)/3,date:d3.at(-1).date,retrievedAt,provider:"BLS CES",selector:"TOTAL_NONFARM_3M_AVG_CHANGE",nativeUnit:"THOUSAND_JOBS_3M_AVG_CHANGE_SA",harmonizedUnit:"THOUSAND_JOBS_3M_AVG_CHANGE_SA",transformRule:"IDENTITY",sourceHash:hash,sourceUrl:BLS_URL}));for(const [id,sid] of Object.entries(BLS_MAP)){const cur=latest(blsSeries(series,sid));if(!cur)throw new Error(`GROWTH_R2_BLS_MISSING:${id}`);records.push(buildRecord(id,{value:cur.value,date:cur.date,retrievedAt,provider:"BLS CES",selector:{G040:"ALL_EMPLOYEES_TOTAL_PRIVATE_AVG_WEEKLY_HOURS",G042:"ALL_EMPLOYEES_MANUFACTURING_OVERTIME_HOURS",G043:"TOTAL_PRIVATE_AGG_WEEKLY_HOURS_INDEX_TABLE_B4",G044:"TEMPORARY_HELP_SERVICES_EMPLOYMENT_LEVEL"}[id],nativeUnit:{G040:"HOURS_SA",G042:"HOURS_SA",G043:"INDEX_2007_100_SA",G044:"THOUSAND_EMPLOYEES_SA"}[id],harmonizedUnit:{G040:"HOURS_SA",G042:"HOURS_SA",G043:"INDEX_2007_100_SA",G044:"THOUSAND_EMPLOYEES_SA"}[id],transformRule:"IDENTITY",sourceHash:hash,sourceUrl:BLS_URL}));}return {records,snapshots:[{providerGroup:"BLS CES",snapshotHash:hash,retrievedAt,sourceUrl:BLS_URL,payload:{seriesCount:series.length}}],providerRequestCount:1};}

export async function collectGrowthR2ForwardStage({stage,env,asOf,fetchImpl=fetch,seedRows,now=()=>new Date()}={}){
 if(!env?.CENSUS_API_KEY)throw new Error("GROWTH_R2_CENSUS_API_KEY_REQUIRED");
 if(!GROWTH_R2_FORWARD_STAGE_IDS[stage])throw new Error("GROWTH_R2_STAGE_INVALID");
 const retrievedAt=now().toISOString(),year=Number(asOf.slice(0,4));
 const args={env,year,retrievedAt,fetchImpl,seedRows};
 const out=stage==="censusM3Core"?await collectM3(args):stage==="censusCapexBfs"?await collectBfs(args):stage==="fedG17"?await collectFed(args):await collectBls(args);
 const expected=new Set(GROWTH_R2_FORWARD_STAGE_IDS[stage]),actual=new Set(out.records.map(r=>r.candidateId));
 if(actual.size!==expected.size||[...expected].some(id=>!actual.has(id)))throw new Error(`GROWTH_R2_STAGE_COVERAGE:${stage}`);
 return {status:"READY",stage,...out,retrievedAt};
}
export const GROWTH_R2_FORWARD_STAGE_CONTRACT=Object.freeze({stages:Object.keys(GROWTH_R2_FORWARD_STAGE_IDS),requiredFeatureCount:GROWTH_R2_FEATURE_IDS.length});
