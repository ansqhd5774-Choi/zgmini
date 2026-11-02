/** Isolated process fixture. All Alpaca HTTP calls are in-memory mocks. */
import {createQuotaFetch} from '../../scripts/pc-writer/quota-fetch.mjs';

const [base,attemptCount,mode='observe']=process.argv.slice(2);
if(typeof base!=='string'||!Number.isSafeInteger(Number(attemptCount))||Number(attemptCount)<1){
 throw Error('MOCK_PROCESS_ARGS_INVALID');
}
let sent=0,guarded=0;
const quota=createQuotaFetch({base,mode,originalFetch:async()=>{
 sent++;return new Response(null,{status:200});
}});
for(let i=0;i<Number(attemptCount);i++){
 try{await quota.fetch('https://data.alpaca.markets/v2/stocks/bars?symbols=MOCK');}
 catch(error){
  if(error?.code==='PROVIDER_QUOTA_GUARD'&&!error.requestReserved)guarded++;
  else throw error;
 }
}
process.stdout.write(JSON.stringify({sent,guarded}));
