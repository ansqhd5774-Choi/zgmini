import {Rev7D1Store} from './korea-rev7-d1.mjs';
import {fetchRev7Date} from './korea-rev7-provider.mjs';
import {calculateRev7} from './korea-rev7-engine.mjs';

const shift=(date,days)=>{const d=new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10).replaceAll('-','');};
const key=(env,names)=>names.map(n=>env?.[n]).find(v=>typeof v==='string'&&v.trim())?.trim();

// Bounded forward collection; the existing historical anchor is never reset.
// Raw data is committed first. Calculation failure resumes from stored rows.
/** @param {{env?:import('./runtime-contracts').DataEnv,store?:import('./korea-rev7-d1.mjs').Rev7D1Store,fetchDate?:typeof fetchRev7Date,calculate?:typeof calculateRev7,now?:Date,maxDates?:number,deferCalculation?:boolean}} [options] */
export async function refreshKoreaRev7({env,store,fetchDate=fetchRev7Date,calculate=calculateRev7,now=new Date(),maxDates=1,deferCalculation=false}={}){
 const krxKey=key(env,['KRX_API_KEY','KRX_AUTH_KEY','KRX_OPEN_API_KEY','KRX_OPENAPI_KEY']);
 const bokKey=key(env,['BOK_API_KEY','ECOS_API_KEY','BOK_ECOS_API_KEY']);
 if(!krxKey||!bokKey||(!store&&!env?.DB))return {status:'CONFIGURATION_MISSING',providerRequests:0};
 if(!Number.isInteger(maxDates)||maxDates<1||maxDates>2)throw Error('INVALID_LIMIT');
 store??=new Rev7D1Store(env.DB,{leaseMs:600000});
 if(!await store.acquireLease())return {status:'ALREADY_RUNNING',providerRequests:0};
 let providerRequests=0,storedDates=0,calculated=false,phase='READ',waitingPublication=false;
 try{
  const progress=await store.getBackfillProgress();
  if(!progress?.latestProcessedDate||progress.successfulTradingDates<1030)return {status:'HISTORY_NOT_READY',providerRequests};
  const koreaNow=new Date(now.getTime()+9*3600000);
  const today=koreaNow.toISOString().slice(0,10).replaceAll('-','');
  // After the close/publication buffer, attempt today's official daily file.
  // A missing publication stays pending; no future observation is fabricated.
  const target=koreaNow.getUTCHours()>=18?today:shift(today,-1);
  let date=shift(progress.latestProcessedDate,1);
  for(let n=0;n<maxDates&&date<=target;n++,date=shift(date,1)){
   await store.renewLease();phase='COLLECT';
   const raw=await fetchDate(date,{krxKey,bokKey});
   providerRequests+=(raw.krxRequestCount??0)+(raw.bokRequestCount??0);
   if(raw.requestedDate!==date||!raw.complete||!['SUCCESS','NO_TRADING_OBSERVATION'].includes(raw.status))throw Error('INVALID_SNAPSHOT');
   // A recent empty response may mean publication delay, not a closed session.
   const weekday=new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T00:00:00Z`).getUTCDay();
   if(raw.status==='NO_TRADING_OBSERVATION'&&weekday!==0&&weekday!==6&&date>shift(today,-3)){waitingPublication=true;break;}
   phase='STORE';await store.saveDate(raw);storedDates++;
  }
  const latest=await store.getLatestCompleteDate();
  const snapshot=await store.getLatestSnapshot();
  if(!deferCalculation&&latest&&(!snapshot||snapshot.date<latest)){
   phase='CALCULATE';await store.renewLease();
   const updated=await store.getBackfillProgress();
   const history=await store.getHistory(updated.successfulTradingDates);
   const result=calculate(history);
   if(result.observationDate!==latest||!Number.isFinite(result.score))throw Error('LATEST_SCORE_NOT_READY');
   calculated=await store.saveSnapshot(result);
  }
  const checkpoint=(await store.getBackfillProgress()).latestProcessedDate;
  const caughtUp=checkpoint>=target;
  const status=caughtUp?'COMPLETE':waitingPublication?'WAITING_PUBLICATION':'BACKLOG';
  await store.markBackfillStatus(caughtUp?'COMPLETE':'IDLE');
  return {status,providerRequests,storedDates,calculated,latestDate:latest,scoreDate:(await store.getLatestSnapshot())?.date??null,processedThrough:checkpoint,targetDate:target,caughtUp,nextDate:caughtUp?null:shift(checkpoint,1)};
 }catch(error){
  const allowed=/^(?:UPSTREAM_HTTP_\d{3}|BODY_MISSING|BODY_LIMIT|INVALID_JSON|TIMEOUT|KRX_SCHEMA_ERROR|KOSPI_EXACT_INDEX_MISSING|KOSPI_STOCK_DATE_MISMATCH|KOSPI_STOCK_IDENTITY_ERROR|KOSPI_STOCK_ROWS_TOO_LOW|STANDARD_KOSPI200_OPTION_MISSING|VKOSPI200_MISSING|KTB_TOTAL_RETURN_MISSING|INVALID_SNAPSHOT|LATEST_SCORE_NOT_READY)$/;
  const reason=allowed.test(error?.message??'')?error.message:`${phase}_FAILED`;
  if(phase==='COLLECT')providerRequests+=(error?.krxRequestCount??0)+(error?.bokRequestCount??0);
  await store.markBackfillStatus('ERROR',reason).catch(()=>{});
  return {status:'ERROR',phase,reason,providerRequests,storedDates,calculated};
 }finally{await store.releaseLease();}
}
