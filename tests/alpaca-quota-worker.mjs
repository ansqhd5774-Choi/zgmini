import {QuotaLedger} from '../scripts/pc-writer/quota-ledger.mjs';
import fs from 'node:fs';
import path from 'node:path';
const base=process.argv[2],attempts=Number(process.argv[3]);
const quota=new QuotaLedger(base,{mode:'observe'});
let allowed=0,blocked=0;
for(let i=0;i<attempts;i++){
 try{quota.beforeRequest('ALPACA',Date.now());allowed++;}
 catch(error){if(error?.code!=='PROVIDER_QUOTA_GUARD')throw error;blocked++;}
}
fs.writeFileSync(path.join(base,`worker-result-${process.argv[4]}.json`),JSON.stringify({allowed,blocked}));
