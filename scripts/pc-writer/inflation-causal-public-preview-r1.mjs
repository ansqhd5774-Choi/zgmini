// PC read-only bridge: summarize approved 19 stored research series for a public
// presentation *candidate*. No provider API calls, DB writes, D1 writes, or score.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {INFLATION_CAUSAL_19} from '../../lib/inflation-causal-public-catalog.mjs';
import {INFLATION_CAUSAL_PUBLIC_SCHEMA,validateInflationCausalPublic}
 from '../../worker/inflation-causal-public-r1.mjs';

const APPROVED=String.raw`E:\ZGmini\data\pc-writer`;
const BLS=new Map([['5','WPU1017'],['6','WPU102502'],['7','WPU081'],
 ['8','WPU061'],['9','WPU012'],['10','WPU0221'],['11','WPU029'],['25','WPUID61']]);
const PIT=new Map([['1','MCOILWTICO'],['12','CES0500000003'],
 ['13','ECIALLCIV'],['14','PRS85006111'],['19','IREXFUELS']]);
const digest=x=>createHash('sha256').update(x).digest('hex');
const date=x=>typeof x==='string'&&/^\d{4}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(x)
 &&Number.isFinite(Date.parse(x.length===7?x+'-01':x));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const stamp=x=>{
 const d=x instanceof Date?x:new Date(x);
 return Number.isFinite(d.getTime())?d.toISOString():null;
};
const strictVal=x=>finite(x)?x:typeof x==='string'&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(x.trim())?
 Number(x):null;
const absent=m=>({id:m.id,series:m.series,unit:m.unit,status:'PENDING',value:null,
 previousValue:null,observationDate:null,previousObservationDate:null,
 availableAt:null,sourceStoredAt:null,history:[]});
function regular(file,max=8_000_000){
 const s=fs.lstatSync(file);
 if(!s.isFile()||s.isSymbolicLink()||s.size<1||s.size>max)throw Error('INFL19_SOURCE_FILE_DENIED');
 return fs.readFileSync(file);
}
function readJson(root,relative,max=8_000_000){
 const file=path.join(root,...relative.split('/'));
 return JSON.parse(regular(file,max).toString('utf8'));
}
export function summarize(meta,data,sourceStoredAt,{dateField}={}){
 if(!Array.isArray(data)||data.length<2||data.length>25000||!stamp(sourceStoredAt))
  throw Error('INFL19_SOURCE_ROWS_INVALID');
 const ordered=[],seen=new Set();
 for(const x of data){
  const d=x?.[dateField]??x?.observationDate??x?.date??x?.month,v=strictVal(x?.value);
  if(!date(d)||!finite(v)||seen.has(d))throw Error('INFL19_ROW_INVALID');
  seen.add(d);ordered.push({date:d,value:v,availableAt:x?.availableAt});
 }
 ordered.sort((a,b)=>a.date.localeCompare(b.date));
 const last=ordered.at(-1),prev=ordered.at(-2);
 const byMonth=new Map();
 for(const row of ordered)byMonth.set(row.date.slice(0,7),{date:row.date.slice(0,7),value:row.value});
 const cutoff=new Date((last.date.length===7?last.date+'-01':last.date)+'T00:00:00Z');
 cutoff.setUTCFullYear(cutoff.getUTCFullYear()-1);
 const months=[...byMonth.values()].filter(x=>x.date>=cutoff.toISOString().slice(0,7)).slice(-13);
 const availableAt=stamp(last.availableAt);
 return {id:meta.id,series:meta.series,unit:meta.unit,status:'READY',
  value:last.value,previousValue:prev.value,observationDate:last.date,
  previousObservationDate:prev.date,availableAt,
  sourceStoredAt:stamp(sourceStoredAt),history:months};
}
function readPpi(root){
 const doc=readJson(root,'inflation-causal-r1/bls-ppi8.json');
 if(doc?.provider!=='BLS'||doc.schemaVersion!==1||doc.sourceVersion!=='BLS_API_V2_PPI_BATCH8_R1'
   ||!Array.isArray(doc.ids)||doc.ids.length!==8||!doc.series||!stamp(doc.sourceStoredAt))
  throw Error('INFL19_BLS_PROVENANCE');
 return Object.fromEntries([...BLS].map(([id,series])=>{
  if(!doc.ids.includes(series))throw Error('INFL19_BLS_SERIES_MISSING');
  return [id,summarize(INFLATION_CAUSAL_19.find(x=>x.id===id),doc.series[series],doc.sourceStoredAt)];
 }));
}
function readGasElectric(root,id){
 const rel=id==='3'?'inflation-causal-r1/gas-dhhngsp.json':
  'inflation-causal-r1/electricity-industrial-eia.json';
 const doc=readJson(root,rel);
 const source=id==='3'?'FRED_DHHNGSP':'EIA_INDUSTRIAL_ELECTRICITY_US';
 if(doc?.schemaVersion!==1||doc.sourceVersion!=='INFLATION_CAUSAL_GAS_ELECTRIC_R1'
   ||doc.source!==source||!Array.isArray(doc.observations)||!stamp(doc.sourceStoredAt)||
   (id==='4'&&(doc.facets?.stateid!=='US'||doc.facets?.sectorid!=='IND')))
  throw Error('INFL19_GAS_ELECTRIC_PROVENANCE');
 return summarize(INFLATION_CAUSAL_19.find(x=>x.id===id),doc.observations,doc.sourceStoredAt,
  {dateField:id==='4'?'month':'date'});
}
function readSce(root){
 const meta=readJson(root,'inflation-causal/sce31/latest.json',65536);
 if(meta?.status!=='STORED'||meta.source!=='NY_FED_SCE_ONE_YEAR_MEDIAN'||
   !/^[a-f0-9]{64}$/.test(meta.downloadSha256??'')||!stamp(meta.fetchedAt)||
   meta.attributionRequired!==true||meta.disclaimerRequired!==true)
  throw Error('INFL19_SCE_PROVENANCE');
 const doc=readJson(root,'inflation-causal/sce31/'+meta.downloadSha256+'.json');
 if(doc.source!=='NY_FED_SCE_ONE_YEAR_MEDIAN'||!Array.isArray(doc.observations)||
   doc.observations.length!==meta.count||doc.historyMode==='PIT')
  throw Error('INFL19_SCE_ROWS');
 return summarize(INFLATION_CAUSAL_19.find(x=>x.id==='31'),doc.observations,meta.fetchedAt);
}
function readSupply(root,id){
 const gscpi=id==='21',rel=gscpi?'supply-r10/gscpi.json':'supply-r10/DPCERA3M086SBEA.json';
 const doc=readJson(root,rel);
 if(gscpi&&doc.source!=='NY_FED_GSCPI')throw Error('INFL19_GSCPI_SOURCE');
 const manifest=readJson(root,'supply-r10/extra-manifest.json',65536);
 const sourceId=gscpi?'gscpi':'DPCERA3M086SBEA';
 const m=Array.isArray(manifest)?manifest.find(x=>x.id===sourceId&&x.status==='STORED'):null;
 if(!m||!Array.isArray(doc.rows)||!m.storedAt&&!doc.sourceStoredAt&&!doc.storedAt)
  throw Error('INFL19_SUPPLY_PROVENANCE');
 return summarize(INFLATION_CAUSAL_19.find(x=>x.id===id),doc.rows,
  doc.sourceStoredAt??doc.storedAt??m.storedAt);
}
function readPit(db,meta){
 const name=PIT.get(meta.id);
 const row=db.prepare(`SELECT retrieved_at,history_mode,chunk_hashes_json,row_count
  FROM api_history_snapshots_v1 WHERE provider='FRED' AND dataset=?
  ORDER BY retrieved_at DESC LIMIT 1`).get(name);
 if(!row||row.history_mode!=='INITIAL_RELEASE_ONLY'||!stamp(row.retrieved_at))
  throw Error('INFL19_PIT_PROVENANCE');
 const hashes=JSON.parse(row.chunk_hashes_json);
 if(!Array.isArray(hashes)||!hashes.length||hashes.length>100)throw Error('INFL19_PIT_CHUNKS');
 const rows=[];
 const statement=db.prepare(`SELECT payload_json,row_count FROM api_history_chunks_v1
  WHERE provider='FRED' AND dataset=? AND chunk_sha256=?`);
 for(const hash of hashes){
  if(!/^[a-f0-9]{64}$/.test(hash))throw Error('INFL19_PIT_CHUNK_HASH');
  const item=statement.get(name,hash),part=JSON.parse(item?.payload_json??'null');
  if(!Array.isArray(part)||part.length!==Number(item?.row_count))throw Error('INFL19_PIT_CHUNK_INVALID');
  rows.push(...part.filter(x=>stamp(x?.availableAt)&&
   Date.parse(x.availableAt)<=new Date(row.retrieved_at).getTime()));
 }
 if(rows.length<2)throw Error('INFL19_PIT_ROWS_MISSING');
 return summarize(meta,rows,row.retrieved_at);
}
function readDollar(db){
 const row=db.prepare(`SELECT body,stored_at FROM market_input_batches_v1
  WHERE batch_key LIKE 'macro:%' ORDER BY stored_at DESC LIMIT 1`).get();
 if(!row||typeof row.body!=='string')throw Error('INFL19_MACRO_MISSING');
 const body=row.body.startsWith('gzip:')?
  gunzipSync(Buffer.from(row.body.slice(5),'base64'),{maxOutputLength:30_000_000}).toString('utf8'):
  row.body;
 const doc=JSON.parse(body),rows=doc?.series?.DTWEXBGS;
 if(!Array.isArray(rows))throw Error('INFL19_DOLLAR_MISSING');
 return summarize(INFLATION_CAUSAL_19.find(x=>x.id==='18'),rows,Number(row.stored_at));
}
export function previewInflation19(root,{openDb=file=>new DatabaseSync(file,{readOnly:true,timeout:1000}),
 now=Date.now()}={}){
 if(typeof root!=='string'||!path.isAbsolute(root)||
  (process.platform==='win32'&&path.win32.normalize(root).toLowerCase()!==
   path.win32.normalize(APPROVED).toLowerCase())||
  !fs.lstatSync(root).isDirectory())throw Error('INFL19_APPROVED_HOME_DENIED');
 const records={},missing={};
 const attempt=(id,reader)=>{
  try{records[id]=reader();}
  catch(error){missing[id]=/^INFL19_[A-Z0-9_]+$/.test(error.message)?error.message:'INFL19_SOURCE_UNAVAILABLE';}
 };
 try{const ppi=readPpi(root);for(const [id,v] of Object.entries(ppi))records[id]=v;}
 catch(e){for(const id of BLS.keys())missing[id]='INFL19_BLS_SOURCE_UNAVAILABLE';}
 for(const id of ['3','4'])attempt(id,()=>readGasElectric(root,id));
 attempt('31',()=>readSce(root));
 for(const id of ['21','26'])attempt(id,()=>readSupply(root,id));
 let db=null;
 try{
  const file=path.join(root,'storage','core.sqlite');
  db=openDb(file);db.exec('PRAGMA query_only=ON');
  for(const meta of INFLATION_CAUSAL_19){
   if(PIT.has(meta.id))attempt(meta.id,()=>readPit(db,meta));
  }
  attempt('18',()=>readDollar(db));
 }catch(e){for(const id of [...PIT.keys(),'18'])if(!records[id])missing[id]='INFL19_DB_UNAVAILABLE';}
 finally{try{db?.close();}catch{}}
 // Check each collected row against the public contract independently.
 // A bad research row remains PENDING; valid rows retain their stored evidence.
 const collected=INFLATION_CAUSAL_19.map(m=>records[m.id]).filter(Boolean);
 const probeAt=Math.max(0,...collected.map(r=>Date.parse(r.sourceStoredAt)));
 for(const r of collected){
  const probe={schemaVersion:INFLATION_CAUSAL_PUBLIC_SCHEMA,status:'PARTIAL',
   score:null,sourceVersion:'INFL19_INDIVIDUAL_PREFLIGHT_V1',sourceStoredAt:probeAt,
   indicators:INFLATION_CAUSAL_19.map(m=>m.id===r.id?r:absent(m))};
  try{validateInflationCausalPublic(probe,{now});}
  catch(error){
   const strictDate=s=>date(s)&&new Date(Date.parse(s.length===7?s+'-01':s))
    .toISOString().slice(0,s.length)===s;
   const strictIso=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d/.test(s)
    &&Number.isFinite(Date.parse(s));
   let reason='INFL19_READY_CONTRACT_INVALID';
   if(!finite(r.value))reason='INFL19_READY_VALUE_INVALID';
   else if(!strictDate(r.observationDate))reason='INFL19_READY_DATE_INVALID';
   else if(!strictIso(r.sourceStoredAt))reason='INFL19_READY_SOURCE_TIME_INVALID';
   else if(r.availableAt!=null&&!strictIso(r.availableAt))reason='INFL19_READY_AVAILABLE_TIME_INVALID';
   else if(!(r.previousValue===null||finite(r.previousValue))||
    !(r.previousObservationDate===null||strictDate(r.previousObservationDate))||
    (r.previousValue===null)!==(r.previousObservationDate===null)||
    (r.previousObservationDate!==null&&r.previousObservationDate>=r.observationDate))
    reason='INFL19_READY_PREVIOUS_INVALID';
   else if(!Array.isArray(r.history)||r.history.length>13||r.history.some((p,i)=>
    !strictDate(p.date)||!finite(p.value)||p.date>r.observationDate||
    (i>0&&p.date<=r.history[i-1].date)))
    reason='INFL19_READY_HISTORY_INVALID';
   else if(error?.message!=='INFLATION_CAUSAL_PUBLIC_READY_INVALID')
    reason='INFL19_READY_GLOBAL_CONTRACT_INVALID';
   missing[r.id]=reason;
   delete records[r.id];
  }
 }
 const indicators=INFLATION_CAUSAL_19.map(m=>records[m.id]??absent(m));
 const filled=indicators.filter(x=>x.status==='READY');
 const at=Math.max(...filled.map(x=>Date.parse(x.sourceStoredAt)),0);
 if(!at)return {status:'PENDING',code:'INFL19_PUBLIC_INPUTS_UNAVAILABLE',ready:0,
  missing,providerCalls:0,dbWrites:0,d1Writes:0,coreWrites:0,schedulerWrites:0,payload:null};
 const payload={schemaVersion:INFLATION_CAUSAL_PUBLIC_SCHEMA,
  status:filled.length===19?'READY':'PARTIAL',score:null,
  sourceVersion:'INFL19_PRESENTATION_'+digest(JSON.stringify(indicators)),
  sourceStoredAt:at,indicators};
 validateInflationCausalPublic(payload,{now});
 return {status:'PASS_READONLY',code:'INFL19_PUBLIC_PREVIEW',
  ready:filled.length,missing,providerCalls:0,dbWrites:0,d1Writes:0,
  coreWrites:0,schedulerWrites:0,payload};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let output;
 try{
  if(process.argv.length!==2)throw Error('INFL19_ARGS_DENIED');
  const result=previewInflation19(APPROVED);
  output={status:result.status,code:result.code,ready:result.ready,
   missing:result.missing,
   latest:Object.fromEntries((result.payload?.indicators??[])
    .filter(x=>x.status==='READY').map(x=>[x.id,x.observationDate])),
   sourceVersion:result.payload?.sourceVersion??null,
   providerCalls:0,dbWrites:0,coreWrites:0,d1Writes:0,schedulerWrites:0};
 }catch(e){
  output={status:'BLOCKED',
   code:/^(?:INFL19_|INFLATION_CAUSAL_PUBLIC_)[A-Z0-9_]{2,80}$/.test(e?.message??'')?e.message:'INFL19_PREVIEW_UNAVAILABLE',
   providerCalls:0,dbWrites:0,coreWrites:0,d1Writes:0,schedulerWrites:0};
 }
 console.log(JSON.stringify(output));
 if(output.status!=='PASS_READONLY')process.exitCode=1;
}
