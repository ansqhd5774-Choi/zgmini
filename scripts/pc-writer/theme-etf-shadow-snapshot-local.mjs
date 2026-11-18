/**
 * Manual-only. Validates a previously generated R122 result and stores an
 * immutable research snapshot locally. No provider calls, DB writes, API/D1,
 * scheduler registration, or production deployment. Never writes source to Git.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {sha256,validateR122ResearchEvidence} from '../../lib/market-score/theme-etf-shadow-snapshot.mjs';
const MAX_SOURCE_BYTES=2_500_000;
const DEFAULT_ROOT=path.join(os.homedir(),'.zgmini','pc-writer');
const basename='theme-etf-shadow-research';
const requireSafe=(ok,code)=>{if(!ok)throw Error('THEME_SHADOW_STORE_'+code);};
const regular=p=>{try{const s=fs.lstatSync(p);return s.isFile()&&!s.isSymbolicLink()?s:null;}catch{return null;}};
const directory=p=>{try{const s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink();}catch{return false;}};
export function storeLocalSnapshot({inputPath,root=DEFAULT_ROOT,write=false}){
 requireSafe(typeof inputPath==='string'&&path.isAbsolute(inputPath),'INPUT_ABSOLUTE_REQUIRED');
 requireSafe(typeof root==='string'&&path.isAbsolute(root)&&directory(root),'ROOT_MISSING_OR_LINK');
 const sourceFile=regular(inputPath);
 requireSafe(sourceFile&&sourceFile.size>0&&sourceFile.size<=MAX_SOURCE_BYTES,'SOURCE_MISSING_OR_TOO_LARGE');
 const bytes=fs.readFileSync(inputPath);
 let source;try{source=JSON.parse(bytes.toString('utf8'));}catch{throw Error('THEME_SHADOW_STORE_INVALID_JSON');}
 const sourceSha256=sha256(bytes);
 const data=validateR122ResearchEvidence(source,{sourceSha256});
 const outputDir=path.join(root,basename),filename=`shadow-${data.observationDate}-${sourceSha256.slice(0,24)}.json`;
 const output=path.join(outputDir,filename);
 const serialized=JSON.stringify(data,null,2)+'\n';
 const prepared={status:'VALIDATED_RESEARCH_ONLY',mode:write?'WRITE_LOCAL_ONLY':'DRY_RUN',sourceSha256,contentSha256:sha256(serialized),asOf:data.observationDate,themes:data.passedThemes,points:data.observations,localRelativePath:path.join(basename,filename),publicationAllowed:false};
 if(!write)return prepared;
 if(!fs.existsSync(outputDir))fs.mkdirSync(outputDir,{recursive:false});
 requireSafe(directory(outputDir),'OUTPUT_DIRECTORY_LINK_OR_MISSING');
 const snapshots=fs.readdirSync(outputDir).filter(x=>/^shadow-2026-10-16-[a-f0-9]{24}\.json$/.test(x));
 const different=snapshots.filter(x=>x!==filename);
 requireSafe(different.length===0,'CONFLICTING_SNAPSHOT_EXISTS');
 if(fs.existsSync(output)){
  const current=regular(output);
  requireSafe(current&&sha256(fs.readFileSync(output))===prepared.contentSha256,'EXISTING_SNAPSHOT_CONTENT_CONFLICT');
  return {...prepared,status:'ALREADY_VERIFIED_NO_WRITE'};
 }
 fs.writeFileSync(output,serialized,{encoding:'utf8',flag:'wx'});
 const readback=fs.readFileSync(output);
 requireSafe(sha256(readback)===prepared.contentSha256,'READBACK_HASH_MISMATCH');
 return {...prepared,status:'STORED_READBACK_VERIFIED'};
}
function cli(argv){
 const opts={inputPath:null,root:DEFAULT_ROOT,write:false};
 for(let i=0;i<argv.length;i++){
  if(argv[i]==='--input'){opts.inputPath=argv[++i];continue;}
  if(argv[i]==='--root'){opts.root=argv[++i];continue;}
  if(argv[i]==='--write-local-research'){opts.write=true;continue;}
  throw Error('THEME_SHADOW_STORE_UNSUPPORTED_ARGUMENT');
 }
 return opts;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(storeLocalSnapshot(cli(process.argv.slice(2))),null,2));}
 catch(e){console.error(JSON.stringify({status:'STOP_NO_RETRY',code:/^THEME_SHADOW_(STORE|SNAPSHOT)_[A-Z0-9_]+$/.test(String(e.message))?e.message:'THEME_SHADOW_STORE_FAILED'}));process.exitCode=1;}
}
