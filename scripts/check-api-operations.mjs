import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data=JSON.parse(readFileSync(resolve(root,'config/api-operations.json'),'utf8'));
const hosting=JSON.parse(readFileSync(resolve(root,'.openai/hosting.json'),'utf8'));
const errors=[];
const ids=new Set();
if(hosting.d1!=='DB') errors.push('D1 binding differs from registry');
for(const p of data.providers){
 if(ids.has(p.id)) errors.push(`Duplicate provider: ${p.id}`);
 ids.add(p.id);
 if(!data.schedules[p.schedule]) errors.push(`Unknown schedule: ${p.id}`);
 if(!p.quotaNote || !p.quotaEvidence?.startsWith('https://')) errors.push(`Missing quota evidence: ${p.id}`);
 for(const path of [p.sourceModule,...p.storageModules]){
  const full=resolve(root,path);
  if(!full.startsWith(root+'/') && !full.startsWith(root+'\\')) errors.push(`Invalid path: ${p.id}`);
  else if(!existsSync(full)) errors.push(`Missing source: ${path}`);
 }
 if(p.persistence==='EXISTING_D1'&&!p.storageModules.length) errors.push(`Missing persistence module: ${p.id}`);
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`PASS: ${ids.size} providers; source/storage paths and DB binding verified. No provider calls or runtime quota verification.`);
