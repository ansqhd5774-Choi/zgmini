import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {client,credential} from './d1.mjs';
import {loadPaidBreadthInputs} from './breadth-paid-source.mjs';
import {calculatePaidBreadth} from './breadth-paid-calculate.mjs';
import {PAID_BREADTH_KEY,validPaidBreadthRecord} from '../../worker/breadth-paid-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(Error(code),{code});};
const sql="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
const semantic=b=>JSON.stringify({...b,updatedAt:null,domain:{...b.domain,updatedAt:null}});
export async function publishPaidBreadth({remote,dbId,record,preimage,now=Date.now()}){
 need(validPaidBreadthRecord(record),'BREADTH_PAID_PUBLISH_RECORD');
 if(preimage){const old=JSON.parse(preimage.body);need(validPaidBreadthRecord(old)&&old.observationDate<=record.observationDate,'BREADTH_PAID_NEWER_D1_PRESERVED');if(semantic(old)===semantic(record))return {status:'UNCHANGED_READBACK_VERIFIED',d1Writes:0,storedAt:preimage.stored_at,bodySha256:sha(preimage.body)};const past=new Map(old.domain.trend.map(p=>[p.label,p.value]));need(record.domain.trend.every(p=>!past.has(p.label)||past.get(p.label)===p.value),'BREADTH_PAID_HISTORY_DRIFT');}
 need(Number.isSafeInteger(now)&&now>Number(preimage?.stored_at??0),'BREADTH_PAID_CAS_CLOCK');const body=JSON.stringify(record);let applied;
 try{applied=await remote.request(dbId,[preimage?{sql:"UPDATE public_feed_snapshots_v1 SET body=?,stored_at=? WHERE kind='output' AND feed_key=? AND snapshot_key='current' AND body=? AND stored_at=?",params:[body,now,PAID_BREADTH_KEY,preimage.body,preimage.stored_at]}:{sql:"INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO NOTHING",params:[PAID_BREADTH_KEY,body,now]}]);}catch{throw Object.assign(Error('BREADTH_PAID_D1_OUTCOME_UNKNOWN_NO_RETRY'),{code:'BREADTH_PAID_D1_OUTCOME_UNKNOWN_NO_RETRY'});}
 const after=(await remote.query(dbId,sql,[PAID_BREADTH_KEY])).results?.[0];need(after?.body===body&&Number(after.stored_at)===now&&applied[0]?.meta?.changes===1,'BREADTH_PAID_CAS_READBACK_MISMATCH');return {status:'D1_CAS_READBACK_VERIFIED',d1Writes:1,storedAt:now,bodySha256:sha(body)};
}
export async function runPaidBreadthCycle(base,{publish=false,now=Date.now(),load=loadPaidBreadthInputs}={}){
 const connection=path.join(base,'marketparquet-paid','connection.json');if(!fs.existsSync(connection)||JSON.parse(fs.readFileSync(connection)).plan!=='full')return {status:'NOT_CONNECTED'};
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),config=JSON.parse(fs.readFileSync(path.join(base,'config.json')));
 if(publish){const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();need(config.enabled===true&&config.collectionTarget==='pc'&&config.source===head,'BREADTH_PAID_INSTALLED_SOURCE_NOT_APPROVED');execFileSync('git',['diff','--quiet','HEAD','--','scripts/pc-writer','worker','lib'],{cwd:root,windowsHide:true,stdio:'pipe'});}
 const remote=client(config,()=>credential(root)),preimage=(await remote.query(config.core,sql,[PAID_BREADTH_KEY])).results?.[0]??null,previous=preimage?JSON.parse(preimage.body):null;
 const input=await load(base),record=await calculatePaidBreadth(input,{now,previous});
 const dir=path.join(base,'marketparquet-paid','derived');fs.mkdirSync(dir,{recursive:true});const bytes=Buffer.from(JSON.stringify(record)),file=path.join(dir,'breadth-'+sha(bytes)+'.json');if(!fs.existsSync(file))fs.writeFileSync(file,bytes,{flag:'wx'});need(sha(fs.readFileSync(file))===sha(bytes),'BREADTH_PAID_PRIVATE_READBACK');
 const effect=publish?await publishPaidBreadth({remote,dbId:config.core,record,preimage,now}):{status:'PRIVATE_CALCULATED',d1Writes:0};
 const report={...effect,observationDate:record.observationDate,sourceLatestDate:record.sourceLatestDate,score:record.domain.score,trendPoints:record.domain.trend.length,returnCoverage:record.quality.returnCoverage,tradingValueCoverage:record.quality.tradingValueCoverage,acquired:input.acquired};fs.writeFileSync(path.join(base,'marketparquet-paid','breadth-last-run.json'),JSON.stringify(report,null,2)+'\n');return report;
}
