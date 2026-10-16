import fs from 'node:fs';import path from 'node:path';
import {loadLocalProviders} from './local-env.mjs';
export async function collectAlpacaIncremental(base,{fetchImpl=fetch,now=Date.now(),wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const file=path.join(base,'local-asset-bubble-r10-alpaca-collection.json'),dir=path.join(base,'asset-r10-alpaca');
 const read=f=>fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):null;
 const save=(f,v)=>{fs.writeFileSync(f+'.tmp',JSON.stringify(v));fs.renameSync(f+'.tmp',f);};
 const end=new Date(now-86400000).toISOString().slice(0,10);
 const checkpoint=path.join(dir,'incremental-checkpoint.json');
 const old=read(file),storedThrough=read(checkpoint)?.through;
 if(old&&(!old.storageVerified||storedThrough===end)&&now>=Date.parse(old.checkedAt)&&now-Date.parse(old.checkedAt)<(old.storageVerified?20:1)*3600000)return {status:'CACHED',runRequests:0};
 const report={checkedAt:new Date(now).toISOString(),requestEnd:end,status:'BLOCKED',runRequests:0,completedGroups:0,totalGroups:0,errorCode:null,storageVerified:false};
 try{
  const env=loadLocalProviders(base);if(!env.APCA_API_KEY_ID||!env.APCA_API_SECRET_KEY)throw Error('ALPACA_CREDENTIAL_MISSING');
  const groups=fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(name=>({name,symbols:[...new Set(read(path.join(dir,name)).map(r=>r.ticker))]}));
  if(!groups.length)throw Error('ALPACA_UNIVERSE_MISSING');report.totalGroups=groups.length;
  const start=storedThrough??read(path.join(dir,'checkpoint.json')).end;
  if(start>end)return {status:'NO_NEW_WINDOW',runRequests:0};
  const output=path.join(dir,'incremental');fs.mkdirSync(output,{recursive:true});
  for(const group of groups){let token=null;const rows=[];do{
   if(report.runRequests>=120)throw Error('ALPACA_RUN_BUDGET');if(report.runRequests)await wait(1000);
   const url=new URL('https://data.alpaca.markets/v2/stocks/bars');url.search=new URLSearchParams({symbols:group.symbols.join(','),timeframe:'1Day',start:start+'T00:00:00Z',end:end+'T23:59:59Z',feed:'iex',adjustment:'split',limit:'10000',...(token?{page_token:token}:{})});
   report.runRequests++;const r=await fetchImpl(url,{headers:{'APCA-API-KEY-ID':env.APCA_API_KEY_ID,'APCA-API-SECRET-KEY':env.APCA_API_SECRET_KEY},signal:AbortSignal.timeout(20000)});
   if(!r.ok)throw Error('ALPACA_HTTP_'+r.status);const body=await r.json();if(!body.bars||typeof body.bars!=='object')throw Error('ALPACA_INVALID_RESPONSE');
   for(const [ticker,bars]of Object.entries(body.bars))for(const b of bars){if(!group.symbols.includes(ticker)||!Number.isFinite(b.c)||b.c<=0||!Number.isFinite(b.v)||b.v<0||!/^\d{4}-\d{2}-\d{2}/.test(b.t))throw Error('ALPACA_INVALID_BAR');rows.push({ticker,tradeDate:b.t.slice(0,10),currentClose:b.c,currentVolume:b.v,source:'ALPACA',feed:'iex',adjustmentStatus:'split'});}
   token=body.next_page_token??null;
  }while(token);const saved=path.join(output,`${start}-${end}-${group.name}`);save(saved,rows);if(JSON.stringify(read(saved))!==JSON.stringify(rows))throw Error('ALPACA_READBACK_FAILED');report.completedGroups++;}
  save(checkpoint,{through:end});report.status='COLLECTED_PENDING_VALIDATION';report.storageVerified=true;
 }catch(error){report.errorCode=/^ALPACA_[A-Z0-9_]+$/.test(error.message)?error.message:'ALPACA_NETWORK_OR_TIMEOUT';}
 save(file,report);return report;
}
