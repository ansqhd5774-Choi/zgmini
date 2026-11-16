import {createSecSharedLimiter} from '../scripts/pc-writer/sec-request-controls.mjs';
const base=process.argv[2];const count=Number(process.argv[3]??10);
const gate=createSecSharedLimiter({base,maxWaitMs:15000});
try{const result=await Promise.all(Array.from({length:count},async()=>await gate.reserve()));
 process.send?.({ok:true,at:result.map(x=>x.at)});
}catch(e){process.send?.({ok:false,code:e.code??e.message});process.exitCode=1;}
