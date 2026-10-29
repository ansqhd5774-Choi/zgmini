// Reproducible, source-pinned ZIP builder. This is a development-only tool;
// no git executable or build tool is included in the user package.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {digest} from './theme-config-registry.mjs';
import {PACKAGE_FILES,PACKAGE_SCHEMA,PACKAGE_REPOSITORY} from './theme-config-package-runner.mjs';

const repositoryRoot=fileURLToPath(new URL('../../',import.meta.url));
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const git=(args,opts={})=>execFileSync('git',args,{cwd:repositoryRoot,...opts});
const sourcePath=rel=>['RUN_PREFLIGHT.cmd','RUN_INSTALL.cmd','RUN_DIAGNOSE.cmd','README_KO.txt'].includes(rel)?
 'packaging/theme-config/'+rel:rel;
const importedPaths=source=>{
 const imports=[];
 const regex=/(?:\bfrom\s*|\bimport\s*|\bimport\(\s*)['"]([^'"]+)['"]/g;
 for(const match of source.matchAll(regex))if(match[1].startsWith('.'))imports.push(match[1]);
 return imports;
};
function assertDependencyClosure(root){
 for(const rel of PACKAGE_FILES.filter(p=>p.endsWith('.mjs'))){
  const content=fs.readFileSync(path.join(root,rel),'utf8');
  for(const spec of importedPaths(content)){
   const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(rel),spec));
   need(PACKAGE_FILES.includes(resolved),'PACKAGE_MISSING_IMPORT_'+resolved);
  }
 }
}

export function buildConfiguredPackage({sourceSha,outputDir}={}){
 need(/^[a-f0-9]{40}$/.test(sourceSha??''),'PACKAGE_SOURCE_SHA');
 need(path.isAbsolute(outputDir??''),'PACKAGE_OUTPUT_ABSOLUTE_REQUIRED');
 need(git(['rev-parse','HEAD'],{encoding:'utf8'}).trim()===sourceSha,
  'PACKAGE_SOURCE_HEAD_DRIFT');
 const treeSha=git(['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();
 need(/^[a-f0-9]{40}$/.test(treeSha),'PACKAGE_SOURCE_TREE');
 if(!fs.existsSync(outputDir))fs.mkdirSync(outputDir,{recursive:true});
 need(fs.readdirSync(outputDir).length===0,'PACKAGE_OUTPUT_NOT_EMPTY');
 const name='THEME_CONFIG_AUTO_PUBLISH_'+sourceSha.slice(0,12);
 const root=path.join(outputDir,name);
 fs.mkdirSync(root);
 const entries=[];
 for(const rel of PACKAGE_FILES){
  const sourceRel=sourcePath(rel),file=path.join(repositoryRoot,sourceRel);
  const expected=git(['show',sourceSha+':'+sourceRel]);
  let bytes=fs.readFileSync(file);
  need(bytes.equals(expected),'PACKAGE_GIT_SOURCE_BYTE_DRIFT');
  if(rel.endsWith('.cmd')){
   need(!bytes.includes(0)&&bytes.every(b=>b<128),
    'PACKAGE_CMD_NOT_ASCII');
   bytes=Buffer.from(bytes.toString('ascii').replace(/\r?\n/g,'\r\n'),'ascii');
   need(!bytes.includes(0xef)&&!bytes.includes(0xbb)&&!bytes.includes(0xbf),
    'PACKAGE_CMD_BOM');
  }
  const out=path.join(root,...rel.split('/'));
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,bytes,{flag:'wx'});
  entries.push({path:rel,sha256:digest(bytes)});
 }
 assertDependencyClosure(root);
 const manifest={schema:PACKAGE_SCHEMA,repository:PACKAGE_REPOSITORY,
  sourceSha,sourceTreeSha:treeSha,files:entries};
 const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(root,'package-manifest.json'),manifestBytes,{flag:'wx'});
 // Keep archive metadata stable; users verify the exact delivered ZIP digest.
 const epoch=new Date('2026-10-29T00:00:00Z');
 const dirs=new Set([root]);
 for(const entry of entries){
  let d=path.dirname(path.join(root,...entry.path.split('/')));
  while(d.startsWith(root)&&d!==root){dirs.add(d);d=path.dirname(d);}
  fs.utimesSync(path.join(root,...entry.path.split('/')),epoch,epoch);
 }
 fs.utimesSync(path.join(root,'package-manifest.json'),epoch,epoch);
 for(const dir of [...dirs].sort((a,b)=>b.length-a.length))fs.utimesSync(dir,epoch,epoch);
 const zipPath=path.join(outputDir,name+'.zip');
 execFileSync('zip',['-q','-X','-r',zipPath,name],{
  cwd:outputDir,stdio:['ignore','pipe','pipe'],timeout:30000});
 const result={status:'PACKAGE_BUILT_NO_PC_WRITES',sourceSha,sourceTreeSha:treeSha,
  zipPath,zipSha256:digest(fs.readFileSync(zipPath)),manifestSha256:digest(manifestBytes),
  packageRoot:root,fileCount:entries.length};
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  need(process.argv.length===5&&process.argv[2]==='--source-sha',
   'PACKAGE_BUILDER_USAGE');
  const result=buildConfiguredPackage({
   sourceSha:process.argv[3],outputDir:path.resolve(process.argv[4])});
  console.log(JSON.stringify(result,null,2));
 }catch(e){
  console.error(JSON.stringify({status:'PACKAGE_BUILD_STOP',reason:e.code??'PACKAGE_BUILD_IO'}));
  process.exitCode=2;
 }
}
