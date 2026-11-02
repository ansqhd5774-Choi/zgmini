import fs from 'node:fs';import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {loadLocalProviders} from './local-env.mjs';
import {createQuotaFetch} from './quota-fetch.mjs';
export async function collectAlpacaIncremental(base,{fetchImpl=fetch,now=Date.now(),wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const file=path.join(base,'local-asset-bubble-r10-alpaca-collection.json'),dir=path.join(base,'asset-r10-alpaca');
 const read=f=>fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):null;
 const save=(f,v)=>{const tmp=`${f}.tmp-${process.pid}-${randomUUID()}`;fs.writeFileSync(tmp,JSON.stringify(v),{flag:'wx'});try{fs.renameSync(tmp,f);}catch(error){try{fs.unlinkSync(tmp);}catch{}throw error;}};
 const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
 const end=new Date(now-86400000).toISOString().slice(0,10);
 const checkpoint=path.join(dir,'incremental-checkpoint.json');
 const old=read(file),storedThrough=read(checkpoint)?.through;
 if(old&&old.status!=='DEFERRED_QUOTA'&&(!old.storageVerified||storedThrough===end)&&now>=Date.parse(old.checkedAt)&&now-Date.parse(old.checkedAt)<(old.storageVerified?20:1)*3600000)return {status:'CACHED',runRequests:0};
 const report={checkedAt:new Date(now).toISOString(),requestEnd:end,status:'BLOCKED',runRequests:0,completedGroups:0,totalGroups:0,errorCode:null,storageVerified:false};
 try{
  const env=loadLocalProviders(base);if(!env.APCA_API_KEY_ID||!env.APCA_API_SECRET_KEY)throw Error('ALPACA_CREDENTIAL_MISSING');
  const groups=fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(name=>({name,symbols:[...new Set(read(path.join(dir,name)).map(r=>r.ticker))]}));
  if(!groups.length)throw Error('ALPACA_UNIVERSE_MISSING');report.totalGroups=groups.length;
  const start=storedThrough??read(path.join(dir,'checkpoint.json')).end;
  if(start>end)return {status:'NO_NEW_WINDOW',runRequests:0};
  const sharedFetch=createQuotaFetch({base,originalFetch:fetchImpl,mode:'enforce'}).fetch;
  const output=path.join(dir,'incremental');fs.mkdirSync(output,{recursive:true});
  // A restartable LOCAL transport cursor, never an approved scoring input.
  // A page is remembered only after complete validation and atomic readback.
  const progressFile=path.join(dir,'incremental-progress.json');
  const groupFingerprint=hash(groups.map(g=>[g.name,g.symbols]));
  let progress;try{progress=read(progressFile);}catch{throw Error('ALPACA_PROGRESS_INVALID');}
  if(progress?.version!==1||progress?.start!==start||progress?.end!==end||progress?.groupFingerprint!==groupFingerprint)
   progress={version:1,start,end,groupFingerprint,completed:{},active:null};
  if(!progress.completed||typeof progress.completed!=='object')throw Error('ALPACA_PROGRESS_INVALID');
  for(const group of groups){
   const saved=path.join(output,`${start}-${end}-${group.name}`);
   if(progress.completed[group.name]){
    if(!fs.existsSync(saved)||hash(fs.readFileSync(saved,'utf8'))!==progress.completed[group.name])throw Error('ALPACA_PROGRESS_INVALID');
    report.completedGroups++;continue;
   }
   if(progress.active&&progress.active.name!==group.name)throw Error('ALPACA_PROGRESS_INVALID');
   const resumed=progress.active;
   if(resumed&&(!Array.isArray(resumed.rows)||typeof resumed.finished!=='boolean'||
     (resumed.nextToken!=null&&typeof resumed.nextToken!=='string')||
     (resumed.finished&&resumed.nextToken!=null)||
     (!resumed.finished&&resumed.rows.length>0&&!resumed.nextToken)||
     resumed.rows.some(r=>!group.symbols.includes(r?.ticker)||!/^\d{4}-\d{2}-\d{2}$/.test(r?.tradeDate??'')||
       !Number.isFinite(r?.currentClose)||r.currentClose<=0||!Number.isFinite(r?.currentVolume)||r.currentVolume<0||
       r.source!=='ALPACA'||r.feed!=='iex'||r.adjustmentStatus!=='split'||r.asof!=='-'||r.symbolMappingMode!=='UNMAPPED_ASOF_DASH')))
     throw Error('ALPACA_PROGRESS_INVALID');
   let token=resumed?.nextToken??null;
   const rows=resumed?.rows??[];
   let finished=resumed?.finished??false;
   while(!finished){
   if(report.runRequests>=120)throw Error('ALPACA_RUN_BUDGET');if(report.runRequests)await wait(1000);
   const url=new URL('https://data.alpaca.markets/v2/stocks/bars');url.search=new URLSearchParams({symbols:group.symbols.join(','),timeframe:'1Day',start:start+'T00:00:00Z',end:end+'T23:59:59Z',feed:'iex',adjustment:'split',asof:'-',limit:'10000',...(token?{page_token:token}:{})});
   let r;try{r=await sharedFetch(url,{headers:{'APCA-API-KEY-ID':env.APCA_API_KEY_ID,'APCA-API-SECRET-KEY':env.APCA_API_SECRET_KEY},signal:AbortSignal.timeout(20000)});report.runRequests++;}
   catch(error){if(error?.requestReserved)report.runRequests++;throw error;}
   if(!r.ok)throw Error(r.status===429?'ALPACA_RATE_LIMITED':'ALPACA_HTTP_'+r.status);const body=await r.json();if(!body.bars||typeof body.bars!=='object')throw Error('ALPACA_INVALID_RESPONSE');
   for(const [ticker,bars]of Object.entries(body.bars))for(const b of bars){if(!group.symbols.includes(ticker)||!Number.isFinite(b.c)||b.c<=0||!Number.isFinite(b.v)||b.v<0||!/^\d{4}-\d{2}-\d{2}/.test(b.t))throw Error('ALPACA_INVALID_BAR');rows.push({ticker,tradeDate:b.t.slice(0,10),currentClose:b.c,currentVolume:b.v,source:'ALPACA',feed:'iex',adjustmentStatus:'split',asof:'-',symbolMappingMode:'UNMAPPED_ASOF_DASH'});}
   token=body.next_page_token??null;
   if(token!=null&&(typeof token!=='string'||token.length>4096))throw Error('ALPACA_INVALID_RESPONSE');
   finished=!token;
   progress.active={name:group.name,nextToken:token,finished,rows};
   save(progressFile,progress);
   if(JSON.stringify(read(progressFile))!==JSON.stringify(progress))throw Error('ALPACA_PROGRESS_READBACK_FAILED');
   }
   save(saved,rows);if(JSON.stringify(read(saved))!==JSON.stringify(rows))throw Error('ALPACA_READBACK_FAILED');
   progress.completed[group.name]=hash(fs.readFileSync(saved,'utf8'));
   progress.active=null;save(progressFile,progress);report.completedGroups++;
  }
  save(checkpoint,{through:end});report.status='COLLECTED_PENDING_VALIDATION';report.storageVerified=true;
 }catch(error){
  if(error?.code==='PROVIDER_QUOTA_GUARD'||['ALPACA_RUN_BUDGET','ALPACA_RATE_LIMITED'].includes(error?.message)){
   report.status='DEFERRED_QUOTA';report.errorCode=error?.code==='PROVIDER_QUOTA_GUARD'?'ALPACA_SHARED_QUOTA_DEFERRED':error.message;
  }else report.errorCode=/^ALPACA_[A-Z0-9_]+$/.test(error?.message??'')?error.message:'ALPACA_NETWORK_OR_TIMEOUT';
 }
 save(file,report);return report;
}
