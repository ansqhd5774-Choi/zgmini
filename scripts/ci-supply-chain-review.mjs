// #15 Supply Chain: dependency lockfile change evidence without dependency-graph API.
// Security advisories remain the existing production npm audit's responsibility.
// Never persist resolved URLs, registries with credentials, or SRI digest values.
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const SCHEMA_VERSION=1;
const SEMVER=/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][a-zA-Z0-9.-]+)?$/;
function inspectLock(value){
 const lock=typeof value==='string'?JSON.parse(value):value;
 if(!lock||typeof lock!=='object'||Array.isArray(lock)||
  lock.lockfileVersion!==3||!lock.packages||typeof lock.packages!=='object'||
  Array.isArray(lock.packages)||!lock.packages['']||
  typeof lock.packages['']!=='object')
  throw Error('CI_SUPPLY_LOCK_INVALID');
 return lock.packages;
}
export function sourceKind(resolved){
 if(typeof resolved!=='string'||!resolved)return 'UNVERIFIED';
 if(/^https:\/\/registry\.npmjs\.org\//.test(resolved))return 'NPMJS';
 if(/^https:\/\//.test(resolved))return 'OTHER_HTTPS';
 if(/^http:\/\//.test(resolved))return 'INSECURE_HTTP';
 if(/^(git\+|git:|ssh:)/.test(resolved))return 'GIT';
 if(/^(file:|link:|workspace:)/.test(resolved))return 'LOCAL';
 return 'OTHER';
}
function describe(pkg){
 if(!pkg)return null;
 if(typeof pkg!=='object'||Array.isArray(pkg))
  throw Error('CI_SUPPLY_ENTRY_INVALID');
 return {
  version:typeof pkg.version==='string'&&SEMVER.test(pkg.version)?pkg.version:'UNVERIFIED',
  source:sourceKind(pkg.resolved),
  integrity:typeof pkg.integrity==='string'&&/^sha(?:256|384|512)-[A-Za-z0-9+/]+={0,2}$/.test(pkg.integrity)
   ?'PRESENT':'UNVERIFIED',
  hasInstallScript:pkg.hasInstallScript===true,
  development:pkg.dev===true,
  optional:pkg.optional===true
 };
}
export function compareSupplyLocks(before,after){
 const oldPackages=inspectLock(before),newPackages=inspectLock(after);
 const paths=[...new Set([...Object.keys(oldPackages),...Object.keys(newPackages)])]
  .filter(path=>path.startsWith('node_modules/')).sort();
 const changes=[];
 for(const path of paths){
  const old=describe(oldPackages[path]),now=describe(newPackages[path]);
  // Compare original lock attributes without persisting URLs or digest values.
  // Categorized metadata alone would miss a changed tarball at the same version.
  const oldRaw=oldPackages[path],newRaw=newPackages[path];
  const rawSignature=value=>value?JSON.stringify([
   value.version??null,value.resolved??null,value.integrity??null,
   value.hasInstallScript===true,value.dev===true,value.optional===true
  ]):null;
  if(rawSignature(oldRaw)===rawSignature(newRaw))continue;
  const kind=!old?'ADDED':!now?'REMOVED':'MODIFIED';
  const warnings=[];
  if(now){
   if(now.source!=='NPMJS')warnings.push('NON_STANDARD_OR_UNKNOWN_SOURCE');
   if(now.integrity==='UNVERIFIED')warnings.push('INTEGRITY_UNVERIFIED');
   if(now.hasInstallScript)warnings.push('INSTALL_SCRIPT_PRESENT');
   if(old&&old.source!==now.source)warnings.push('SOURCE_KIND_CHANGED');
   if(old&&oldRaw?.resolved!==newRaw?.resolved)
    warnings.push('RESOLUTION_VALUE_CHANGED');
   if(old&&oldRaw?.integrity!==newRaw?.integrity)
    warnings.push('INTEGRITY_VALUE_CHANGED');
  }
  changes.push({packagePath:path,kind,previousVersion:old?.version??null,
   currentVersion:now?.version??null,source:now?.source??null,
   integrity:now?.integrity??null,hasInstallScript:now?.hasInstallScript??null,
   warnings});
 }
 return {schemaVersion:SCHEMA_VERSION,scope:'npm lockfile v3 PR package diff only',
  advisoryOnly:true,sourceCredentialValuesIncluded:false,
  baselinePresent:true,changedPackages:changes.length,
  added:changes.filter(x=>x.kind==='ADDED').length,
  modified:changes.filter(x=>x.kind==='MODIFIED').length,
  removed:changes.filter(x=>x.kind==='REMOVED').length,
  warningEntries:changes.filter(x=>x.warnings.length>0).length,
  changes};
}
function runGit(root,args){
 return execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
}
export async function main(){
 if(process.argv.length!==2||process.env.CI!=='true'||
  process.env.GITHUB_EVENT_NAME!=='pull_request')
  throw Error('CI_SUPPLY_PR_ONLY');
 const base=process.env.GITHUB_BASE_REF;
 if(typeof base!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,180}$/.test(base)||
  base.includes('..')||base.includes('//'))
  throw Error('CI_SUPPLY_BASE_REF_INVALID');
 const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
 const baseSha=runGit(root,['merge-base','HEAD','refs/remotes/origin/'+base]);
 if(!/^[0-9a-f]{40}$/.test(baseSha))throw Error('CI_SUPPLY_BASE_SHA_INVALID');
 const baseline=runGit(root,['show',baseSha+':package-lock.json']);
 const current=await readFile(resolve(root,'package-lock.json'),'utf8');
 const report=compareSupplyLocks(baseline,current);
 const output=resolve(root,'artifacts/ci-supply-chain-review/report.json');
 await mkdir(resolve(root,'artifacts/ci-supply-chain-review'),{recursive:true});
 await writeFile(output,JSON.stringify({...report,baseCommit:baseSha,
  headCommit:runGit(root,['rev-parse','HEAD'])},null,2)+'\n');
 console.log('CI_SUPPLY_LOCAL_REVIEW '+JSON.stringify({
  baseSha,headSha:runGit(root,['rev-parse','HEAD']),
  changedPackages:report.changedPackages,added:report.added,
  modified:report.modified,removed:report.removed,
  warningEntries:report.warningEntries,advisoryOnly:true
 }));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(error=>{console.error(error.message);process.exitCode=1;});
