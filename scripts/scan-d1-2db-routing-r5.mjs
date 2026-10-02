import {readFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';

const roots=['app','worker','lib','db','drizzle'];
const out=[];
function walk(dir){
 for(const ent of readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,ent.name);
  if(ent.isDirectory())walk(p);
  else if(/\.(?:mjs|js|ts|tsx|sql)$/.test(ent.name)){
   const s=readFileSync(p,'utf8');
   const history=/\bkfg_(?:v2|rev7)_/i.test(s);
   const core=/\b(?:market_|growth_|api_history_|public_feed_|c1_r3_|favorite_sentiments)\w*/i.test(s);
   const envDb=/\b(?:env|runtimeEnv)\.DB\b/.test(s);
   const explicitStore=/D1KoreaMarketHistoryStore|Rev7D1Store/.test(s);
   if(history||explicitStore)out.push({file:p.replaceAll('\\','/'),history,core,envDb,explicitStore,classification:history&&core?'BOTH_REVIEW':'HISTORY'});
  }
 }
}
for(const r of roots)if(statSync(r).isDirectory())walk(r);
console.log(JSON.stringify({files:out,counts:{total:out.length,bothReview:out.filter(x=>x.classification==='BOTH_REVIEW').length}},null,2));
