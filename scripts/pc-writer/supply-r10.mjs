import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {gunzipSync} from 'node:zlib';
import {calculateCandidate,weights} from '../../lib/diagnostic-layer/supply-r10-candidate.mjs';
import {save,hash} from './d1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export async function collectSupplyR10(base,{now=Date.now(),force=false}={}){
 const directory=path.join(base,'supply-r10'),statusFile=path.join(base,'local-supply-r10-collection.json');
 fs.mkdirSync(directory,{recursive:true});
 const previous=fs.existsSync(statusFile)?JSON.parse(fs.readFileSync(statusFile,'utf8')):null;
 if(!force&&previous?.status==='COLLECTED'&&now-previous.checkedAt<86400000)return {status:'CACHED',checkedAt:previous.checkedAt};
 if(!force&&previous?.status==='SOURCE_FAILED'&&now-previous.checkedAt<21600000)return {status:'RETRY_DEFERRED',checkedAt:previous.checkedAt};
 try{
  // Official public files only; bounded once per day, no keys or paid API.
  for(const script of ['supply-r10-source-audit.mjs','supply-r10-extra-sources.mjs'])execFileSync(process.execPath,[path.join(root,'scripts',script),directory],{cwd:root,windowsHide:true,stdio:'pipe',timeout:120000});
  const manifests=['manifest','extra-manifest'].flatMap(name=>JSON.parse(fs.readFileSync(path.join(directory,`${name}.json`),'utf8')));
  if(manifests.some(item=>item.status!=='STORED'))throw Error('SUPPLY_R10_SOURCE_INCOMPLETE');
  const read=id=>JSON.parse(fs.readFileSync(path.join(directory,`${id}.json`),'utf8'));
  const sources={gscpi:read('gscpi').rows,pce:read('sf-pce'),consumption:read('DPCERA3M086SBEA'),stocks:read('eia-stocks'),production:read('WCRFPUS2'),refining:read('WCRRIUS2'),imports:read('WCRIMUS2'),exports:read('WCREXUS2'),supplied:read('WRPUPUS2')};
  if(Object.values(sources).some(rows=>!Array.isArray(rows)||rows.length<180))throw Error('SUPPLY_R10_HISTORY_INCOMPLETE');
  const stored={sourceVersion:'SUPPLY_SHOCK_R10:'+hash(sources),sourceStoredAt:now,sources,historyMode:'CURRENT_VINTAGE_ONLY'};
  const filename=path.join(directory,'inputs.json');save(filename+'.next',stored);fs.renameSync(filename+'.next',filename);
  const check=JSON.parse(fs.readFileSync(filename,'utf8'));if(hash(check)!==hash(stored))throw Error('SUPPLY_R10_READBACK');
  const result={status:'COLLECTED',checkedAt:now,storageVerified:true,sources:manifests.map(({id,status})=>({id,status})),providerRequests:manifests.length};save(statusFile,result);return result;
 }catch{const report={status:'SOURCE_FAILED',checkedAt:now,previousInputsPreserved:true};save(statusFile,report);return report;}
}
export function buildSupplyR10(base,{now=Date.now()}={}){
 const file=path.join(base,'supply-r10','inputs.json');if(!fs.existsSync(file))return {status:'PENDING',reason:'SUPPLY_R10_INPUTS_MISSING',payload:null};
 const stored=JSON.parse(fs.readFileSync(file,'utf8'));
 if(now-stored.sourceStoredAt>7*86400000)return {status:'STALE',reason:'SUPPLY_R10_COLLECTION_STALE',payload:null};
 const db=new DatabaseSync(path.join(base,'storage','core.sqlite'),{readOnly:true});let batch;
 try{db.exec('PRAGMA query_only=ON');batch=db.prepare("SELECT batch_key,body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE 'macro:%' ORDER BY stored_at DESC LIMIT 1").get();}finally{db.close();}
 if(!batch)return {status:'PENDING',reason:'MACRO_INPUTS_MISSING',payload:null};
 if(now-Number(batch.stored_at)>7*86400000)return {status:'STALE',reason:'SUPPLY_R10_MACRO_STALE',payload:null};
 const raw=String(batch.body),macro=JSON.parse(raw.startsWith('gzip:')?gunzipSync(Buffer.from(raw.slice(5),'base64')).toString():raw);
 const evaluated=calculateCandidate({...stored.sources,wti:macro.series.MCOILWTICO??[],gas:macro.series.GASREGCOVM??[],ip:macro.series.INDPRO??[]});
 const latest=evaluated.latest;if(!latest)return {status:'PARTIAL',reason:'SUPPLY_R10_NO_COMMON_MONTH',payload:null};
 const asOfDate=new Date(now).toISOString().slice(0,10),monthEnd=new Date(Date.UTC(Number(latest.month.slice(0,4)),Number(latest.month.slice(5)),0)).toISOString().slice(0,10);
 if(Date.parse(asOfDate)-Date.parse(monthEnd)>120*86400000)return {status:'STALE',reason:'SUPPLY_R10_OBSERVATION_STALE',payload:null};
 const cutoff=new Date(`${latest.month}-01T00:00:00Z`);cutoff.setUTCFullYear(cutoff.getUTCFullYear()-1);
 const names={G:'글로벌 공급망 압력',E:'미국 석유 공급 제약',O:'에너지 가격 충격',P:'공급 주도 물가 압력',I:'산업생산 충격'};
 const payload={status:'READY',score:latest.score,methodologyVersion:'SUPPLY_SHOCK_R10',scoreObservationMonth:latest.month,asOfDate,sourceVersion:stored.sourceVersion+':'+batch.batch_key,sourceStoredAt:Math.max(stored.sourceStoredAt,Number(batch.stored_at)),historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,missingFactors:[],inputCount:12,indicators:Object.entries(weights).map(([id,weight])=>({id,name:names[id],weight,status:'READY',score:100-latest.scores[id],riskScore:latest.scores[id],value:latest.scores[id],unit:'위험점수',observationDate:`${latest.month}-01`,source:id==='G'?'NY Fed':id==='P'?'SF Fed':id==='E'?'EIA':'FRED / BEA / EIA'})),trend:evaluated.rows.filter(row=>row.status==='READY'&&row.month>=cutoff.toISOString().slice(0,7)&&row.month<=latest.month).map(row=>({label:row.month+'-01',value:row.score})),notes:['공급망·석유 공급·에너지 가격·공급 주도 물가·산업생산의 5개 영역을 평가합니다. 높은 점수는 관측된 공급 충격 위험이 낮다는 뜻이며 발생 확률이 아닙니다.','현재 수정 자료로 재구성한 월간 이력입니다. 당시 발표본 기준 검증은 미완료이며 수요 통제 잔차가 공급 원인을 확정하지 않습니다.'],collectionStatus:JSON.parse(fs.readFileSync(path.join(base,'local-supply-r10-collection.json'),'utf8')).status};
 if(payload.trend.length<13)return {status:'PARTIAL',reason:'SUPPLY_R10_ONE_YEAR_INCOMPLETE',payload:null};
 save(path.join(base,'local-supply-r10-release-payload.json'),payload);
 return {status:'READY',payload,checkpoint:{sourceVersion:payload.sourceVersion+':'+hash(payload),sourceStoredAt:payload.sourceStoredAt}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
 const collection=process.argv.includes('--collect')?await collectSupplyR10(base):null;
 const result=buildSupplyR10(base);
 console.log(JSON.stringify({collection,status:result.status,reason:result.reason??null,score:result.payload?.score,scoreObservationMonth:result.payload?.scoreObservationMonth,trendPoints:result.payload?.trend.length,remoteWrites:0}));
 if(result.status!=='READY')process.exitCode=1;
}
