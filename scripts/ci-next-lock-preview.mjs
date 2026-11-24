// TEMPORARY CI-ONLY artifact generator for a trusted Next.js security PR.
// No GitHub write permission; npm recalculates lockfile only in throwaway CI checkout.
// Delete this file and workflow hook before production merge.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const expectedRepo='ansqhd5774-Choi/zgmini';
const expectedBranch='codex/ci-standardization-r1-next-security-candidate-20261125';
if(process.env.GITHUB_REPOSITORY!==expectedRepo||
   process.env.GITHUB_EVENT_NAME!=='pull_request'||
   process.env.GITHUB_HEAD_REF!==expectedBranch){
  console.error('LOCK_PREVIEW_EVENT_REJECTED');process.exitCode=2;
}else{
 const path='package-lock.json';
 const original=JSON.parse(fs.readFileSync(path,'utf8'));
 const manifest=JSON.parse(fs.readFileSync('package.json','utf8'));
 if(manifest.dependencies.next!=='16.4.6'||original.packages?.['']?.dependencies?.next!=='16.2.6'){
   console.error('LOCK_PREVIEW_MANIFEST_PRECONDITION_FAILED');process.exitCode=3;
 }else{
  const p=spawnSync('npm',['install','--package-lock-only','--ignore-scripts',
    '--no-audit','--no-fund'],{stdio:'pipe',encoding:'utf8',timeout:120000,
    maxBuffer:8*1024*1024});
  if(p.error||p.status!==0){
    console.error('LOCK_PREVIEW_RESOLVE_FAILED_'+String(p.status??'EXEC'));
    process.exitCode=4;
  }else{
   const updated=JSON.parse(fs.readFileSync(path,'utf8'));
   if(updated.packages?.['']?.dependencies?.next!=='16.4.6'){
     console.error('LOCK_PREVIEW_NEXT_NOT_RESOLVED');process.exitCode=5;
   }else{
    const previous=original.packages;
    const next=updated.packages;
    const modified=[...new Set([...Object.keys(previous),...Object.keys(next)])]
       .sort().filter(k=>JSON.stringify(previous[k])!==JSON.stringify(next[k]));
    console.log('ZGMINI_LOCK_PREVIEW_BEGIN');
    for(const name of modified){
      const entry=Object.hasOwn(next,name)?next[name]:null;
      // Lockfile is already public; URI-encode one package per safe log line.
      console.log('ZGMINI_LOCK_PATCH|'+encodeURIComponent(name)+'|'+
        encodeURIComponent(JSON.stringify(entry)));
    }
    console.log('ZGMINI_LOCK_PREVIEW_END|'+modified.length);
   }
  }
 }
}
