// Read-only location/integrity audit. No provider, D1, scheduler or data writes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const repoRoot=fileURLToPath(new URL('../../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const validHash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
export function containedFile(root,relative){
 if(typeof relative!=='string'||!relative||relative.includes('\\')||relative.includes(':')||path.posix.isAbsolute(relative)||relative.split('/').some(x=>x==='..'||x==='.'||!x))throw Error('UNSAFE_RELATIVE_PATH');
 const base=fs.realpathSync(root),target=path.resolve(base,relative);
 const inside=p=>{const rel=path.relative(base,p);return rel!==''&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel)};
 if(!inside(target))throw Error('PATH_OUTSIDE_ROOT');
 const actual=fs.realpathSync(target);if(!inside(actual))throw Error('REAL_PATH_OUTSIDE_ROOT');
 if(!fs.statSync(actual).isFile())throw Error('NOT_A_FILE');return actual;
}
const json=(f,max=2_000_000)=>{if(fs.statSync(f).size>max)throw Error('METADATA_TOO_LARGE');return JSON.parse(fs.readFileSync(f,'utf8'))};
function resource(root,relative,expected){
 if(relative===null||relative===undefined)return {status:'UNREGISTERED'};
 try{const file=containedFile(root,relative);if(expected&&!validHash(expected))return {status:'INVALID_EXPECTED_SHA'};
  if(expected&&hash(fs.readFileSync(file))!==expected)return {status:'SHA_MISMATCH'};
  return {status:expected?'SHA_VERIFIED':'EXISTS_NOT_HASH_VERIFIED',path:relative};
 }catch(e){return {status:e.code==='ENOENT'?'MISSING':'INVALID_PATH_OR_FILE'};}
}
export function inspectManifest(root,relative,themeId){
 if(!relative)return {status:'UNREGISTERED',files:[]};
 try{const file=containedFile(root,relative),doc=json(file);
  if(doc.version!==1||doc.themeId!==themeId||!Array.isArray(doc.files)||!doc.files.length)throw Error('BAD_MANIFEST');
  const seen=new Set();
  const files=doc.files.map(item=>{
   if(!item||!validHash(item.sha256)||seen.has(item.path)||typeof item.source!=='string'||!item.source.startsWith('https://')||!Number.isFinite(Date.parse(item.collectedAt))||typeof item.schemaVersion!=='string'||!item.schemaVersion||typeof item.priceMode!=='string'||!item.priceMode||!/^\d{4}-\d{2}-\d{2}$/.test(item.observationFrom)||!/^\d{4}-\d{2}-\d{2}$/.test(item.observationThrough)||item.observationFrom>item.observationThrough)throw Error('BAD_ENTRY');
   seen.add(item.path);return resource(path.dirname(file),item.path,item.sha256);
  });return {status:files.every(x=>x.status==='SHA_VERIFIED')?'SHA_VERIFIED':'FILE_CHECK_FAILED',files};
 }catch{return {status:'INVALID_MANIFEST',files:[]};}
}
export function inspectRegistry(registry,{dataRoot,sourceRoot=repoRoot}={}){
 if(registry?.version!==1||!Array.isArray(registry.themes)||!registry.themes.length)throw Error('REGISTRY_INVALID');
 const ids=new Set();
 for(const t of registry.themes){if(!/^[a-z][a-z0-9-]*$/.test(t.id)||ids.has(t.id)||!Array.isArray(t.symbols)||t.symbols.length!==2||!t.public?.feedKey||!t.repository||!t.runtime||!Array.isArray(t.tasks)||!Array.isArray(t.blockers))throw Error('THEME_REGISTRY_INVALID');ids.add(t.id);}
 return {scope:'LOCAL_LOCATION_AND_HASH_ONLY',providerCalls:0,d1Writes:0,schedulerWrites:0,themes:registry.themes.map(t=>({id:t.id,declaredStatus:t.status,
  rawManifest:inspectManifest(dataRoot,t.rawManifest,t.id),rawAssets:(t.rawAssets??[]).map(a=>resource(dataRoot,a.path,a.sha256)),
  repository:Object.fromEntries(Object.entries(t.repository).map(([role,p])=>[role,resource(sourceRoot,p)])),
  runtime:Object.fromEntries(Object.entries(t.runtime).map(([role,p])=>[role,resource(dataRoot,p)])),
  tasks:t.tasks,taskRegistration:'NOT_QUERIED',publicRuntime:'NOT_QUERIED',blockers:t.blockers,followUps:t.followUps??[]}))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--data-root'))throw Error('ARGS_INVALID');
  const registry=json(path.join(repoRoot,'config/theme-data-registry.json'));
  const report=inspectRegistry(registry,{dataRoot:args[1]??process.env.ZGMINI_DATA_ROOT??registry.defaultDataRoot});
  console.log(JSON.stringify(report,null,2));
  const incomplete=report.themes.some(t=>t.blockers.length||t.rawManifest.status!=='SHA_VERIFIED'||Object.values(t.repository).some(r=>!r.status.startsWith('EXISTS'))||Object.values(t.runtime).some(r=>!r.status.startsWith('EXISTS')));
  if(incomplete)process.exitCode=2;
 }catch{console.error('THEME_INVENTORY_STOP_INVALID_CONFIGURATION');process.exitCode=1;}
}
