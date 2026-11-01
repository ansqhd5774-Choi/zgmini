// Standalone read-only R7 diagnostics package built from original branch files.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {portableR6FileList} from './iran-r6-portable-build.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const EXTRAS=[
 'RUN_IRAN_ENGLISH_R7_DIAG_PORTABLE.cmd',
 'docs/IRAN_ENGLISH_R7_HOLD_DIAG_README.txt',
 'scripts/iran-progress/IRAN_ENGLISH_R7_HOLD_DIAGNOSTICS.cmd',
 'scripts/iran-progress/english-r5-hold-diagnostics-r7.mjs',
];

export function buildPortableR7(target,{base=root}={}){
 if(!path.isAbsolute(target))throw Error('IRAN_R7_ABSOLUTE_PATH_REQUIRED');
 const out=path.resolve(target);
 if(out===base||out.startsWith(base+path.sep))
  throw Error('IRAN_R7_OUTSIDE_REPOSITORY_REQUIRED');
 if(fs.existsSync(out))throw Error('IRAN_R7_OUTPUT_ALREADY_EXISTS');
 const files=[...new Set([...portableR6FileList({base}),...EXTRAS])].sort();
 fs.mkdirSync(out);
 const manifest={kind:'ZGMINI_IRAN_ENGLISH_R7_HOLD_DIAGNOSTICS_READ_ONLY',
  sourceBranch:'codex/outbreak-iran-news-retention-r1-20261026',
  readOnly:true,operatingProjectInstall:false,sqliteWrite:false,
  checkpointWrite:false,d1Write:false,scheduleChange:false,publicWrite:false,files:[]};
 for(const file of files){
  const destination=path.join(out,file);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  let bytes=fs.readFileSync(path.join(base,file));
  if(file.toLowerCase().endsWith('.cmd')){
   const normalized=bytes.toString('utf8').replace(/\r?\n/g,'\r\n');
   if(/[^\x00-\x7f]/.test(normalized)||normalized.charCodeAt(0)===0xfeff)
    throw Error(`IRAN_R7_CMD_NOT_ASCII: ${file}`);
   bytes=Buffer.from(normalized,'ascii');
  }
  fs.writeFileSync(destination,bytes,{flag:'wx'});
  manifest.files.push({path:file,sha256:createHash('sha256').update(bytes).digest('hex'),
   bytes:bytes.length});
 }
 fs.writeFileSync(path.join(out,'R7_PORTABLE_MANIFEST.json'),
  `${JSON.stringify(manifest,null,2)}\n`,{flag:'wx'});
 return manifest;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const target=process.argv[2];
 if(process.argv.length!==3||!target||!path.isAbsolute(target)){
  console.error('Usage: node tools/iran-r7-portable-build.mjs ABSOLUTE_OUTPUT_DIRECTORY');
  process.exitCode=2;
 }else{
  try{
   const report=buildPortableR7(target);
   console.log(JSON.stringify({status:'R7_READ_ONLY_PACKAGE_BUILT',
    sourceBranch:report.sourceBranch,fileCount:report.files.length},null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
 }
}
