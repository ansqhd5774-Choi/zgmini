// Reproducibly bundle the existing approved R6 preview into a standalone
// directory. Does not install, collect, publish, modify PC state or run R6.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ENTRY='scripts/iran-progress/english-r5-published-preview-r6.mjs';
const EXTRAS=[
 'RUN_IRAN_ENGLISH_R6_PORTABLE.cmd',
 'docs/IRAN_ENGLISH_R6_PORTABLE_README.txt',
 'scripts/iran-progress/IRAN_ENGLISH_R5_R6_IN_MEMORY_PREVIEW.cmd',
 'scripts/resolve-local-node.cmd',
];
const SOURCE_BRANCH='codex/outbreak-iran-news-retention-r1-20261026';
const R6_SOURCE_COMMIT='a84f71bdc13b09425d4bca341a3a4eaaee01c60c';
const imports=/\b(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"\n]+)['"]/g;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

export function portableR6FileList({base=root}={}){
 const seen=new Set();
 function visit(relative){
  if(seen.has(relative))return;
  const absolute=path.resolve(base,relative);
  if(!absolute.startsWith(base+path.sep))throw Error('IRAN_R6_PORTABLE_PATH_ESCAPE');
  if(!fs.statSync(absolute).isFile())throw Error('IRAN_R6_PORTABLE_SOURCE_MISSING');
  seen.add(relative);
  if(!relative.endsWith('.mjs')&&!relative.endsWith('.js'))return;
  const source=fs.readFileSync(absolute,'utf8');
  for(const match of source.matchAll(imports)){
   const specifier=match[1];
   if(specifier.startsWith('node:'))continue;
   if(!specifier.startsWith('.'))throw Error(`IRAN_R6_PORTABLE_EXTERNAL_IMPORT: ${specifier}`);
   const dependency=path.relative(base,path.resolve(path.dirname(absolute),specifier))
    .split(path.sep).join('/');
   visit(dependency);
  }
 }
 visit(ENTRY);
 for(const extra of EXTRAS)visit(extra);
 return [...seen].sort();
}

export function buildPortableR6(target,{base=root}={}){
 const out=path.resolve(target);
 if(!path.isAbsolute(target)||out===base||out.startsWith(base+path.sep))
  throw Error('IRAN_R6_PORTABLE_OUTSIDE_REPOSITORY_REQUIRED');
 if(fs.existsSync(out))throw Error('IRAN_R6_PORTABLE_OUTPUT_ALREADY_EXISTS');
 const files=portableR6FileList({base});
 fs.mkdirSync(out);
 const manifest={kind:'ZGMINI_IRAN_ENGLISH_R6_PORTABLE_READONLY',
  sourceBranch:SOURCE_BRANCH,r6SourceCommit:R6_SOURCE_COMMIT,
  readOnly:true,operatingProjectInstall:false,sqliteWrite:false,
  d1Write:false,scheduleChange:false,files:[]};
 for(const file of files){
  const destination=path.join(out,file);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  let bytes=fs.readFileSync(path.join(base,file));
  if(file.toLowerCase().endsWith('.cmd')){
   const normalized=bytes.toString('utf8').replace(/\r?\n/g,'\r\n');
   if(/[^\x00-\x7f]/.test(normalized)||normalized.charCodeAt(0)===0xfeff)
    throw Error(`IRAN_R6_PORTABLE_CMD_NOT_ASCII: ${file}`);
   bytes=Buffer.from(normalized,'ascii');
  }
  fs.writeFileSync(destination,bytes,{flag:'wx'});
  manifest.files.push({path:file,sha256:digest(bytes),bytes:bytes.length});
 }
 fs.writeFileSync(path.join(out,'R6_PORTABLE_MANIFEST.json'),
  `${JSON.stringify(manifest,null,2)}\n`,{flag:'wx'});
 return manifest;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const target=process.argv[2];
 if(process.argv.length!==3||!target||!path.isAbsolute(target)){
  console.error('Usage: node tools/iran-r6-portable-build.mjs ABSOLUTE_OUTPUT_DIRECTORY');
  process.exitCode=2;
 }else{
  try{
   const manifest=buildPortableR6(target);
   console.log(JSON.stringify({status:'BUILT_READ_ONLY_PACKAGE',fileCount:manifest.files.length,
    sourceBranch:manifest.sourceBranch,r6SourceCommit:manifest.r6SourceCommit},null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
 }
}
