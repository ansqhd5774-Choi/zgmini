// One existing-Core lane for all registered themes. No new Task, Controller or arbitrary shell.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {loadPaidRegistry} from './theme-paid-registry.mjs';
import {syncPaidHourly,readPaidHourly,PAID_HOURLY_MODE} from './theme-paid-hourly-source.mjs';
import {choosePaidPhaseDates,calculatePaidThemes} from './theme-paid-calculate.mjs';
import {PAID_THEME_KEY,validPaidThemeRecord} from '../../worker/theme-paid-contract.mjs';
import {client,credential} from './d1.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const need=(ok,c)=>{if(!ok)throw Object.assign(Error(c),{code:c});};
const sql="SELECT feed_key,body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND snapshot_key='current' AND feed_key IN ";
export async function readPaidThemeSeeds({registry,remote,dbId}){
 const keys=[...new Set([PAID_THEME_KEY,...registry.themes.filter(t=>t.public).map(t=>t.operational.physicalFeeds.confirmed)])],rows=[];
 for(let i=0;i<keys.length;i+=50){const part=keys.slice(i,i+50);rows.push(...(await remote.query(dbId,sql+'('+part.map(()=>'?').join(',')+')',part)).results);}
 const map=new Map(rows.map(r=>[r.feed_key,r])),paid=map.get(PAID_THEME_KEY);let previous=[];
 if(paid){const b=JSON.parse(paid.body);need(validPaidThemeRecord(b),'PAID_THEME_EXISTING_ROW_INVALID');previous=b.themes;}
 const byId=new Map(previous.map(t=>[t.id,t]));
 for(const t of registry.themes.filter(t=>t.public))if(!byId.has(t.id)){
  const legacy=map.get(t.operational.physicalFeeds.confirmed);if(!legacy)continue;
  const b=JSON.parse(legacy.body),found=b.themes?.find(x=>x.theme===t.label)??(b.theme===t.label?b:null);
  if(found){need(JSON.stringify(found.etfs)===JSON.stringify(t.etfs),'PAID_THEME_LEGACY_ROSTER_MISMATCH');byId.set(t.id,{...found,id:t.id,sourcePriceMode:found.sourcePriceMode??b.sourcePriceMode??b.priceMode??'PREVIOUS_PUBLISHED_PRICE_POLICY'});}
 }
 return {previousThemes:[...byId.values()],preimage:paid??null};
}
const semantic=b=>JSON.stringify({...b,updatedAt:null});
export async function publishPaidThemeRecord({remote,dbId,record,preimage,now=Date.now()}){
 need(validPaidThemeRecord(record),'PAID_THEME_CANDIDATE_INVALID');
 if(preimage){const previous=JSON.parse(preimage.body);need(previous.observationDate<=record.observationDate,'PAID_THEME_NEWER_D1_PRESERVED');
  if(semantic(previous)===semantic(record))return {status:'UNCHANGED_READBACK_VERIFIED',written:0,storedAt:preimage.stored_at};
  const old=new Map(previous.themes.map(t=>[t.id,t]));
  for(const t of record.themes){const prior=old.get(t.id);if(!prior)continue;need(prior.methodologyVersion===t.methodologyVersion&&JSON.stringify(prior.etfs)===JSON.stringify(t.etfs),'PAID_THEME_METHOD_OR_ROSTER_CHANGE');const scores=new Map(prior.history.map(p=>[p.date,p.score]));need(!t.history.some(p=>scores.has(p.date)&&scores.get(p.date)!==p.score),'PAID_THEME_PUBLIC_HISTORY_DRIFT');}
 }
 need(Number.isSafeInteger(now)&&now>Number(preimage?.stored_at??0),'PAID_THEME_CAS_CLOCK');const body=JSON.stringify(record);let outcome;
 try{outcome=await remote.request(dbId,[preimage?{sql:"UPDATE public_feed_snapshots_v1 SET body=?,stored_at=? WHERE kind='output' AND feed_key=? AND snapshot_key='current' AND body=? AND stored_at=?",params:[body,now,PAID_THEME_KEY,preimage.body,preimage.stored_at]}:{sql:"INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO NOTHING",params:[PAID_THEME_KEY,body,now]}]);}
 catch{throw Object.assign(Error('PAID_THEME_D1_OUTCOME_UNKNOWN_NO_RETRY'),{code:'PAID_THEME_D1_OUTCOME_UNKNOWN_NO_RETRY'});}
 const after=(await remote.query(dbId,sql+'(?)',[PAID_THEME_KEY])).results?.[0];
 need(after?.body===body&&Number(after.stored_at)===now,'PAID_THEME_D1_CAS_READBACK_MISMATCH');
 need(outcome[0]?.meta?.changes===1,'PAID_THEME_D1_CAS_NOT_APPLIED');
 return {status:'D1_CAS_READBACK_VERIFIED',written:1,storedAt:now,bodySha256:sha(body)};
}
// Private derived history is immutable local evidence, never a D1/public payload.
export function storePaidPrivateResults(dir,{privateRecords=[],sourceVersion,registrySha256,phases},{fileSystem=fs}={}){
 need(Array.isArray(privateRecords),'PAID_THEME_PRIVATE_SHAPE');
 if(!privateRecords.length)return {status:'NONE',count:0,bodySha256:null};
 need(privateRecords.every(t=>t?.configured===true&&typeof t.id==='string'&&
  t.confirmedObservationDate===phases?.confirmed&&Array.isArray(t.history)&&
  t.history.length>0&&t.history.at(-1)?.date===phases.confirmed&&
  Number.isFinite(t.score)&&t.score>=0&&t.score<=100)&&
  new Set(privateRecords.map(t=>t.id)).size===privateRecords.length&&
  /^[a-f0-9]{64}$/.test(sourceVersion)&&/^[a-f0-9]{64}$/.test(registrySha256),
  'PAID_THEME_PRIVATE_INVALID');
 const bytes=Buffer.from(JSON.stringify({schema:'ZGMINI_PAID_PRIVATE_DERIVED_V1',
  sourceVersion,registrySha256,confirmedDate:phases.confirmed,
  provisionalDate:phases.provisional,themes:privateRecords}));
 const bodySha256=sha(bytes),filename=path.join(dir,'private-theme-'+bodySha256+'.json');
 fileSystem.mkdirSync(dir,{recursive:true});
 if(!fileSystem.existsSync(filename))fileSystem.writeFileSync(filename,bytes,{flag:'wx'});
 need(sha(fileSystem.readFileSync(filename))===bodySha256,'PAID_THEME_PRIVATE_READBACK_MISMATCH');
 return {status:'PRIVATE_STORED_READBACK_VERIFIED',count:privateRecords.length,bodySha256};
}

export async function runPaidThemeCycle(base,{publish=false,now=Date.now(),sync=syncPaidHourly}={}){
 const report={status:'STARTED',provider:'MARKETPARQUET_PAID',sourcePriceMode:PAID_HOURLY_MODE,d1Writes:0};
 const dataRoot=path.dirname(base),connectionFile=path.join(base,'marketparquet-paid','connection.json');
 if(!fs.existsSync(connectionFile)||JSON.parse(fs.readFileSync(connectionFile)).themeInputPolicy!==PAID_HOURLY_MODE)return {...report,status:'NOT_ENABLED'};
 const context=await loadPaidRegistry(dataRoot),acquisition=await sync(base,{symbols:context.symbols});
 if(acquisition.status!=='STORED_READBACK_VERIFIED')return {...report,status:acquisition.status};
 const saved=readPaidHourly(base,context.symbols),phases=choosePaidPhaseDates(saved.series.SPY,{now});
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),config=JSON.parse(fs.readFileSync(path.join(base,'config.json')));
 if(publish){const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();need(config.enabled===true&&config.collectionTarget==='pc'&&config.source===head,'PAID_THEME_INSTALLED_SOURCE_NOT_APPROVED');execFileSync('git',['diff','--quiet','HEAD','--','scripts/pc-writer','worker','lib'],{cwd:root,windowsHide:true,stdio:'pipe'});}
 const remote=client(config,()=>credential(root)),seed=await readPaidThemeSeeds({registry:context.registry,remote,dbId:config.core});
 const sourceVersion=sha(JSON.stringify({registry:context.registrySha256,proofs:saved.proofs,priceMode:PAID_HOURLY_MODE,phases}));
 const output=calculatePaidThemes({...context,...saved,...seed,phases,sourceVersion,now});
 const dir=path.join(base,'marketparquet-paid','derived');fs.mkdirSync(dir,{recursive:true});const bytes=Buffer.from(JSON.stringify(output.record));const candidate=path.join(dir,'theme-'+sha(bytes)+'.json');if(!fs.existsSync(candidate))fs.writeFileSync(candidate,bytes,{flag:'wx'});
 need(sha(fs.readFileSync(candidate))===sha(bytes),'PAID_THEME_CANDIDATE_READBACK');
 // Optional private evidence failure must not block independent approved public feeds.
 let privateStored;
 try{privateStored=storePaidPrivateResults(dir,{privateRecords:output.privateRecords,
  sourceVersion,registrySha256:context.registrySha256,phases});}
 catch(e){privateStored={status:'PRIVATE_STORE_FAILED',count:output.privateRecords.length,
  code:/^PAID_THEME_PRIVATE_[A-Z_]+$/.test(e?.code??'')?e.code:'PAID_THEME_PRIVATE_STORE_ERROR'};}
 const result={...report,status:'PRIVATE_CALCULATED',sourceLatestDate:phases.sourceLatest,confirmedDate:phases.confirmed,provisionalDate:phases.provisional,expectedIds:output.record.dataQuality.expectedPublicIds,readyIds:output.record.dataQuality.readyPublicIds,pendingIds:output.record.dataQuality.pendingPublicIds,privateResults:output.privateResults,privateStored,acquisition:{chunks:acquisition.acquired,proofs:saved.proofs.length},results:output.results};
 if(publish&&validPaidThemeRecord(output.record)){const applied=await publishPaidThemeRecord({remote,dbId:config.core,record:output.record,preimage:seed.preimage,now});result.status=applied.status;result.d1Writes=applied.written;result.storedAt=applied.storedAt;result.bodySha256=applied.bodySha256??sha(seed.preimage.body);}
 fs.writeFileSync(path.join(base,'marketparquet-paid','theme-last-run.json'),JSON.stringify(result,null,2)+'\n');return result;
}
