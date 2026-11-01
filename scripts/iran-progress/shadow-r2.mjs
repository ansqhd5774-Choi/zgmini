import {DatabaseSync,backup} from 'node:sqlite';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {openStore} from './store.mjs';import {collectNewsR2} from './continuous-news-r2.mjs';import {replayStoredR2} from './reference-flow-r2.mjs';

// Explicit source + new destination. A shadow run never writes to the operational DB.
export async function shadowR2(input,output,{maxArticles=12,fetcher=fetch,now=Date.now()}={}){
 if(!fs.existsSync(input)||fs.existsSync(output)||fs.existsSync(output+'.json')||path.resolve(input)===path.resolve(output))throw Error('R2_SHADOW_PATH_INVALID');
 const source=new DatabaseSync(input,{readOnly:true});try{await backup(source,output);}finally{source.close();}
 const store=openStore(output);
 try{
  const report=await collectNewsR2(store,{maxArticles,fetcher,now});
  const replay=replayStoredR2(store.db,{now});
  const result={report,replay,productionChanged:false};fs.writeFileSync(output+'.json',JSON.stringify(result,null,2),{flag:'wx'});return result;
 }finally{store.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,output,budget]=process.argv.slice(2);
 if(!input||!output)throw Error('R2_SHADOW_ARGS_INVALID');
 const result=await shadowR2(input,output,{maxArticles:budget?Number(budget):12});
 console.log(JSON.stringify({report:result.report,inputCount:result.replay.inputCount,accepted:result.replay.accepted,r2Score:result.replay.r2.score,productionChanged:false}));
}
