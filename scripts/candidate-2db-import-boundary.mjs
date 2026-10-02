import path from 'node:path';
import {candidateImportBoundary} from './candidate-import-boundary.mjs';
export const historyReaders=Object.freeze(['worker/korea-funds.mjs','worker/korea-rev7-refresh.mjs','worker/korea-rev7-public-projection.mjs','worker/kfg-v2-postcheck.mjs','worker/kfg-v2-canary.mjs','worker/kfg-rev7-canary.mjs']);
export function candidate2dbImportBoundary(root){
 const base=candidateImportBoundary(root),prefix=path.resolve(root).replaceAll('\\','/')+'/';
 const adapter=prefix+'worker/candidate-env-2db.ts';
 return {...base,name:'candidate-2db-import-boundary',transform(code,id){
 const file=id.split('?')[0].replaceAll('\\','/');if(!file.startsWith(prefix)||file===adapter||file.includes('/node_modules/'))return null;
 const rel=file.slice(prefix.length);let rewritten=base.transform(code,id)?.code??code;
 rewritten=rewritten.replaceAll(prefix+'worker/candidate-env.ts',adapter);
 if(historyReaders.includes(rel))rewritten=rewritten.replace(/\benv(?:\?)?\.DB\b/g,m=>m.replace('DB','DB_HISTORY'));
 if(['worker/korea-market-d1.mjs','worker/korea-rev7-d1.mjs'].includes(rel)){
 if(!rewritten.includes('constructor(db,'))throw Error('Candidate history constructor identity changed');
 rewritten=`import {env as candidate2dbEnv} from ${JSON.stringify(adapter)};\n`+rewritten.replace(/constructor\(db,([^)]*)\)\s*\{/,m=>m+' db=candidate2dbEnv.DB_HISTORY;');
 }
 if(rel==='worker/kfg-v2-postcheck.mjs'){
 rewritten=rewritten.replace("catch { return json({temporary: TEMPORARY_KFG_V2_POSTCHECK_ONLY, error: 'READ_POSTCHECK_FAILED'}, 500); }",`catch (error) { const message=String(error?.message??'')+' '+String(error?.cause?.message??''); const categories=[['REQUEST_SCOPE',/different request|I\\/O on behalf/i],['BINDING_UNAVAILABLE',/INVALID_D1_CONFIGURATION|undefined|null/i],['TABLE_MISSING',/no such table/i],['WRITE_GUARD',/CANDIDATE_WRITE_DISABLED/i],['D1_QUOTA',/quota|daily.*limit|row.*limit/i],['QUERY_LIMIT',/SQL_LIMIT|too many/i],['D1_TIMEOUT',/timeout|timed out/i],['D1_OVERLOADED',/overload|SQLITE_BUSY/i],['D1_READ',/D1_ERROR/i],['INVALID_PAYLOAD',/JSON|Unexpected token/i]]; const category=categories.find(([,pattern])=>pattern.test(message))?.[0]??'UNKNOWN'; const response=json({temporary: TEMPORARY_KFG_V2_POSTCHECK_ONLY, error: 'READ_POSTCHECK_FAILED'},500); response.headers.set('x-zgmini-read-error',category); return response; }`);
 }
 if(rel==='lib/market-score/earnings-e1-r3-d1-store.mjs'){
 const start=rewritten.indexOf('async function initialize(){'),end=rewritten.indexOf('async function all(',start);
 if(start<0||end<0)throw Error('Candidate earnings initializer identity changed');
 rewritten=rewritten.slice(0,start)+`async function initialize(){return initialized??=Promise.resolve(true);}
  `+rewritten.slice(end);
 }
 return rewritten!==code?{code:rewritten,map:null}:null;
 }};
}

