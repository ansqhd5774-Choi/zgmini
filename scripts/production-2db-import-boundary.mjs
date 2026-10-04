import path from 'node:path';

export const productionHistoryReaders=Object.freeze([
 'worker/korea-funds.mjs',
 'worker/korea-rev7-refresh.mjs',
 'worker/korea-rev7-public-projection.mjs',
 'worker/kfg-v2-postcheck.mjs',
 'worker/kfg-v2-canary.mjs',
 'worker/kfg-rev7-canary.mjs',
]);

export function production2dbImportBoundary(root){
 const prefix=path.resolve(root).replaceAll('\\','/')+'/';
 const adapter=prefix+'worker/production-env-2db.ts';
 return {
  name:'production-r6-2db-import-boundary',
  enforce:'pre',
  transform(code,id){
   const file=id.split('?')[0].replaceAll('\\','/');
   if(!file.startsWith(prefix)||file===adapter||file.includes('/node_modules/'))return null;
   const rel=file.slice(prefix.length);
   let rewritten=code;
   if(rewritten.includes('cloudflare:workers')){
    rewritten=rewritten.replace(
     /import\s*\{\s*env(?:\s+as\s+(\w+))?\s*\}\s*from\s*(['"])cloudflare:workers\2/g,
     (_m,alias)=>`import {env${alias?` as ${alias}`:''}} from ${JSON.stringify(adapter)}`,
    );
    if(rewritten.includes('cloudflare:workers'))throw Error(`Unmediated production binding import: ${rel}`);
   }
   if(productionHistoryReaders.includes(rel)){
    rewritten=rewritten.replace(/\benv(?:\?)?\.DB\b/g,m=>m.replace('DB','DB_HISTORY'));
   }
   if(['worker/korea-market-d1.mjs','worker/korea-rev7-d1.mjs'].includes(rel)){
    if(!rewritten.includes('constructor(db,'))throw Error('Production history constructor identity changed');
    rewritten=`import {env as production2dbEnv} from ${JSON.stringify(adapter)};\n`+
      rewritten.replace(/constructor\(db,([^)]*)\)\s*\{/,m=>m+' db=production2dbEnv.DB_HISTORY;');
   }
   return rewritten!==code?{code:rewritten,map:null}:null;
  }
 };
}
