// Copy only an immutable, explicitly listed biotech operational snapshot to E:.
// Seven-theme code, original D1 outputs and task definitions are never edited.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const names=[
 'BIOTECH_R7_SCHEDULED.cmd',
 'scripts/pc-writer/theme-biotech-auth-r7.mjs',
 'scripts/pc-writer/theme-biotech-auto-r7.mjs',
 'scripts/pc-writer/theme-biotech-auto-core-r7.mjs',
 'scripts/pc-writer/theme-biotech-continuation-r6.mjs',
 'scripts/pc-writer/theme-biotech-public-record-r7.mjs',
 'scripts/pc-writer/theme-biotech-shadow-core-r5.mjs',
 'scripts/pc-writer/theme-biotech-versioned-d1-r7.mjs',
 'scripts/pc-writer/theme-data-inventory.mjs',
 'scripts/pc-writer/theme-optional-collect.mjs',
 'scripts/pc-writer/theme-optional-score-r188.mjs',
 'worker/theme-biotech-continuation-public-r2.mjs',
 'worker/public-display-freshness.mjs',
];
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code});};
const check=(v,code)=>{if(!v)fail(code);};
const within=(root,file)=>{const r=path.relative(root,file);return r!==''&&r!=='..'&&
 !r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};

export function installBiotechPcR7({bundleRoot,dataRoot,install=false}={}){
 check(fs.existsSync(dataRoot)&&fs.statSync(dataRoot).isDirectory(),'BIOTECH_R7_DATA_ROOT_MISSING');
 const root=fs.realpathSync(dataRoot),theme=path.join(root,'themes','biotech');
 check(fs.existsSync(theme)&&within(root,fs.realpathSync(theme))&&
  fs.existsSync(path.join(theme,'raw-manifest.json')),'BIOTECH_R7_EXISTING_THEME_MISSING');
 const source=path.join(theme,'source-r7'),bundle=fs.realpathSync(bundleRoot);
 const manifestPath=path.join(bundle,'BIOTECH_R7_FILES.json');
 check(fs.existsSync(manifestPath),'BIOTECH_R7_INSTALL_MANIFEST_MISSING');
 const descriptor=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 check(descriptor.version===1&&JSON.stringify(Object.keys(descriptor.files).sort())===JSON.stringify([...names].sort()),
  'BIOTECH_R7_INSTALL_FILE_LIST_MISMATCH');
 const planned=names.map(relative=>{
  const input=path.join(bundle,relative),target=path.join(source,relative);
  check(fs.existsSync(input)&&within(bundle,fs.realpathSync(input)),'BIOTECH_R7_BUNDLE_FILE_MISSING');
  const bytes=fs.readFileSync(input),digest=sha(bytes);
  check(digest===descriptor.files[relative],'BIOTECH_R7_SOURCE_SHA_MISMATCH');
  if(fs.existsSync(target)){
   check(fs.statSync(target).isFile()&&within(root,fs.realpathSync(target)),
    'BIOTECH_R7_EXISTING_SOURCE_ESCAPE');
   check(sha(fs.readFileSync(target))===digest,'BIOTECH_R7_INSTALL_SOURCE_DRIFT');
  }
  return {relative,bytes,digest,target};
 });
 if(install){
  check(!fs.existsSync(source)||within(root,fs.realpathSync(source)),
   'BIOTECH_R7_INSTALL_FOLDER_ESCAPE');
  for(const item of planned){
   fs.mkdirSync(path.dirname(item.target),{recursive:true});
   check(within(root,fs.realpathSync(path.dirname(item.target))),'BIOTECH_R7_INSTALL_FOLDER_ESCAPE');
   if(!fs.existsSync(item.target))fs.writeFileSync(item.target,item.bytes,{flag:'wx'});
   check(sha(fs.readFileSync(item.target))===item.digest,'BIOTECH_R7_INSTALL_READBACK_FAILED');
  }
 }
 return {report:'BIOTECH_PC_INSTALL_R7',status:install?'INSTALLED_VERIFIED':'READY_TO_INSTALL',
  source:'themes/biotech/source-r7',files:planned.length,existing:planned.filter(p=>fs.existsSync(p.target)).length,
  touchedExistingSeven:0,d1Writes:0,schedulerWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  check(args.length===1&&['--inspect','--install'].includes(args[0]),'BIOTECH_R7_INSTALL_ARGS');
  const bundleRoot=path.dirname(fileURLToPath(import.meta.url));
  console.log(JSON.stringify(installBiotechPcR7({bundleRoot,dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
   install:args[0]==='--install'})));
 }catch(e){console.log(JSON.stringify({report:'BIOTECH_PC_INSTALL_R7',status:'BLOCKED',reason:e?.code??'BIOTECH_R7_INSTALL_FAILED'}));process.exitCode=1;}
}
