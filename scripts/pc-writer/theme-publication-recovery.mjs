import fs from'node:fs';import path from'node:path';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';
const sha=x=>createHash('sha256').update(x).digest('hex');
const replace=(s,from,to)=>{if(!s.includes(from)||s.indexOf(from)!==s.lastIndexOf(from))throw Error('SIDECAR_SOURCE_DRIFT');return s.replace(from,to)};
export function recoverySources(files){
 let core=files['r179-publish-core.mjs'];
 core=replace(core,"got.length!==7","got.length<7");
 core=replace(core,"if(!['NO_LOCK','STALE_LOCK'].includes(localCore))",`const publisherClaim=read(path.join(pc,'local-cycle.lock'));
 const ownedByParent=publisherClaim?.pid===process.ppid&&publisherClaim?.purpose==='THEME_R179_PUBLICATION'&&read(path.join(home,'r182-publish.lock'))?.pid===process.ppid;
 if(!['NO_LOCK','STALE_LOCK'].includes(localCore)&&!ownedByParent)`);
 // read() is normally strict; a missing core lock is a normal idle state.
 core=replace(core,"const publisherClaim=read(path.join(pc,'local-cycle.lock'));","const publisherClaim=fs.existsSync(path.join(pc,'local-cycle.lock'))?read(path.join(pc,'local-cycle.lock')):null;");
 let wrapper=files['r171-publish.mjs'];
 wrapper=replace(wrapper,/const expected='[a-f0-9]{64}';/.exec(wrapper)?.[0]??'SOURCE_MISSING',`const expected='${sha(core)}';`);
 wrapper=replace(wrapper,'let ownLock=false;',`let ownLock=false,ownCoreLock=false;
const coreLock=path.resolve(home,'../../pc-writer/local-cycle.lock');
const releaseCore=()=>{if(ownCoreLock){if(read(coreLock).pid!==process.pid)throw Error('CORE_LOCK_OWNER_CHANGED');fs.unlinkSync(coreLock);ownCoreLock=false;}};`);
 wrapper=replace(wrapper,'const previousMeta=fs.existsSync(last)?fs.statSync(last).mtimeMs:null;',`// Wait without running the expensive scorer; the regular writer remains untouched.
  if(fs.existsSync(coreLock)){sleep(Math.min(1000,left));idx--;continue;}
  try{fs.writeFileSync(coreLock,JSON.stringify({pid:process.pid,at:Date.now(),purpose:'THEME_R179_PUBLICATION'}),{flag:'wx'});ownCoreLock=true;}
  catch(e){if(e.code==='EEXIST'){idx--;continue;}throw e;}
  const previousMeta=fs.existsSync(last)?fs.statSync(last).mtimeMs:null;`);
 wrapper=replace(wrapper,'const attemptEnd=Date.now();','releaseCore();\n  const attemptEnd=Date.now();');
 wrapper=replace(wrapper,'if(ownLock)try{fs.unlinkSync(lockFile)}','try{releaseCore()}catch{report.cleanup="CORE_LOCK_CLEANUP_REQUIRES_REVIEW"}\n if(ownLock)try{fs.unlinkSync(lockFile)}');
 return {...files,'r179-publish-core.mjs':core,'r171-publish.mjs':wrapper,
  'r183-guard.mjs':replace(files['r183-guard.mjs'],'R183_MAX_TOTAL_MS=106000','R183_MAX_TOTAL_MS=600000'),
  'r167-cycle.mjs':replace(files['r167-cycle.mjs'],'timeout:120000,maxBuffer:1024*1024','timeout:630000,maxBuffer:1024*1024')};
}
export function installRecovery(home,{apply=false}={}){
 const approved='E:/ZGmini/data/theme-market-history-r131/marketparquet-r167';
 if(fs.realpathSync.native(home).replaceAll('\\','/').toLowerCase()!==approved.toLowerCase())throw Error('UNAPPROVED_SIDECAR_HOME');
 for(const n of ['r167-cycle.lock','r182-publish.lock'])if(fs.existsSync(path.join(home,n)))throw Error('SIDECAR_ACTIVE');
 const names=['r179-publish-core.mjs','r171-publish.mjs','r183-guard.mjs','r167-cycle.mjs'];
 const before=Object.fromEntries(names.map(n=>[n,fs.readFileSync(path.join(home,n),'utf8')]));const after=recoverySources(before);
 const report={status:apply?'APPLIED':'CHECKED',providerCalls:0,dbWrites:0,schedulerChanges:0,files:names.map(n=>({name:n,before:sha(before[n]),after:sha(after[n])}))};
 if(apply){const backup=path.join(home,'publication-recovery-'+Date.now());fs.mkdirSync(backup);for(const n of names)fs.writeFileSync(path.join(backup,n),before[n]);try{for(const n of names)fs.writeFileSync(path.join(home,n),after[n]);}catch(e){for(const n of names)fs.writeFileSync(path.join(home,n),before[n]);throw e}report.backup=backup;fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify(report,null,2));}
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(installRecovery('E:/ZGmini/data/theme-market-history-r131/marketparquet-r167',{apply:process.argv.includes('--apply')}),null,2));
