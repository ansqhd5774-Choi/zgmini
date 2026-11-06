// Development-only, read-only planning helper. No live PC file or scheduler writes.
// Candidate contents must remain on the PC until the installed runtime and B approval
// are independently established. Do not put candidate source in Issue comments.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

export const PC_RELEASE_CALENDAR_SHA256=Object.freeze({
 module:'97800cfbe226be56c3f10e9fa4a37a8967a7e84ad5ba2f098477f7fb3447aefe',
 runner:'75861acfb5481572cbfb4d769647cc77fb991f5b44cf909851172ebb93566eda',
});
export const PREEXISTING_RELEASE_SOURCES=Object.freeze([
 'bls','bea','fed','fed_calendar','census','eia','usda','cftc','treasury','tic',
]);
const PUBLIC_BASE_SOURCES=['bls','bea','fed','census'];
const ADDITIONS=['eia_epm','nyfed'];
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=(code)=>{throw Object.assign(new Error(code),{code});};

function readFixedFile(file){
 if(typeof file!=='string'||!path.isAbsolute(file))fail('CALENDAR_PATH_NOT_ABSOLUTE');
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink())fail('CALENDAR_FILE_NOT_REGULAR');
 if(stat.size>1024*1024)fail('CALENDAR_FILE_TOO_LARGE');
 return fs.readFileSync(file);
}

function sourceLines(code){
 const block=code.match(/^export const RELEASE_SOURCES=Object\.freeze\(\{\r?\n([\s\S]*?)^\}\);/m);
 if(!block)fail('CALENDAR_SOURCE_BLOCK_UNRECOGNIZED');
 const result=new Map();
 for(const line of block[1].split(/(?<=\n)/)){
  if(!line.trim())continue;
  const match=line.match(/^\s*([a-z][a-z0-9_]*):\{[^\r\n]*\},\r?\n?$/);
  if(!match||result.has(match[1]))fail('CALENDAR_SOURCE_ENTRY_UNRECOGNIZED');
  result.set(match[1],line.replace(/\r?\n$/,''));
 }
 return result;
}

function mergeFile(gitBin,pc,base,feature){
 const result=spawnSync(gitBin,['merge-file','-p',pc,base,feature],{
  shell:false,encoding:'utf8',maxBuffer:1024*1024,timeout:15000,
 });
 if(result.error)fail('CALENDAR_GIT_MERGE_UNAVAILABLE');
 if(![0,1].includes(result.status)||typeof result.stdout!=='string')fail('CALENDAR_GIT_MERGE_ERROR');
 return {text:result.stdout,conflicted:result.status===1};
}

function syntaxCheck(contents){
 const result=spawnSync(process.execPath,['--input-type=module','--check'],{
  input:contents,shell:false,encoding:'utf8',maxBuffer:1024*1024,timeout:15000,
 });
 if(result.status!==0)fail('CALENDAR_CANDIDATE_SYNTAX_FAILED');
}

function resolveSourceOnlyConflict(merged,oldLines,newLines){
 let count=0;
 const resolved=merged.replace(/^<<<<<<<[^\r\n]*\r?\n([\s\S]*?)^=======\r?\n([\s\S]*?)^>>>>>>>[^\r\n]*\r?\n/gm,
  (whole,pcSide,featureSide,offset)=>{
   count++;
   const before=merged.slice(0,offset);
   const blockStart=before.lastIndexOf('export const RELEASE_SOURCES=Object.freeze({');
   const blockEnd=before.lastIndexOf('});');
   if(blockStart<0||blockEnd>blockStart)fail('CALENDAR_CONFLICT_OUTSIDE_SOURCES');
   const parts=[pcSide,featureSide];
   for(const [i,part] of parts.entries()){
    for(const line of part.split(/(?<=\n)/)){
     if(!line.trim())continue;
     const hit=line.match(/^\s*([a-z][a-z0-9_]*):\{[^\r\n]*\},\r?\n?$/);
     const expected=(i===0?oldLines:newLines).get(hit?.[1]);
     if(!hit||!expected||line.replace(/\r?\n$/,'')!==expected)fail('CALENDAR_CONFLICT_UNSAFE');
    }
   }
   return pcSide+featureSide;
  });
 if(count!==1||/^(?:<<<<<<<|=======|>>>>>>>)/m.test(resolved))fail('CALENDAR_CONFLICT_UNSAFE');
 return resolved;
}

/**
 * Produces in-memory, uninstalled candidates only. It accepts fixed six paths
 * supplied by an authorized local Codex operator; it never writes or uploads.
 * Expected hashes may be supplied for isolated fixture tests, not as approval.
 */
export function planReleaseCalendarAdditive({
 pcModule,pcRunner,baseModule,baseRunner,featureModule,featureRunner,
 gitBin='git',expectedPcSha256=PC_RELEASE_CALENDAR_SHA256,
 }){
 const pcModuleBytes=readFixedFile(pcModule),pcRunnerBytes=readFixedFile(pcRunner);
 const hashes={module:sha256(pcModuleBytes),runner:sha256(pcRunnerBytes)};
 if(hashes.module!==expectedPcSha256.module||hashes.runner!==expectedPcSha256.runner)
  fail('CALENDAR_PC_SHA_MISMATCH');
 const pcModuleText=pcModuleBytes.toString('utf8');
 const baseModuleBytes=readFixedFile(baseModule);
 const baseRunnerBytes=readFixedFile(baseRunner);
 const featureModuleBytes=readFixedFile(featureModule);
 const featureRunnerBytes=readFixedFile(featureRunner);
 const oldLines=sourceLines(pcModuleText);
 const mainLines=sourceLines(baseModuleBytes.toString('utf8'));
 const featureLines=sourceLines(featureModuleBytes.toString('utf8'));
 if(oldLines.size!==10||PREEXISTING_RELEASE_SOURCES.some(key=>!oldLines.has(key)))
  fail('CALENDAR_PC_TEN_SOURCES_MISMATCH');
 if(mainLines.size!==4||PUBLIC_BASE_SOURCES.some(key=>!mainLines.has(key))||
  [...mainLines].some(([key,line])=>featureLines.get(key)!==line))
  fail('CALENDAR_FEATURE_SOURCE_DRIFT');
 if(ADDITIONS.some(key=>oldLines.has(key)||!featureLines.has(key)))
  fail('CALENDAR_ADDITION_UNEXPECTED');
 if(featureLines.size!==6)fail('CALENDAR_FEATURE_SOURCE_DRIFT');
 const module=mergeFile(gitBin,pcModule,baseModule,featureModule);
 const runner=mergeFile(gitBin,pcRunner,baseRunner,featureRunner);
 const inputs=[
  [pcModule,pcModuleBytes],[pcRunner,pcRunnerBytes],
  [baseModule,baseModuleBytes],[baseRunner,baseRunnerBytes],
  [featureModule,featureModuleBytes],[featureRunner,featureRunnerBytes],
 ];
 if(inputs.some(([filename,bytes])=>sha256(readFixedFile(filename))!==sha256(bytes)))
  fail('CALENDAR_INPUT_CHANGED_DURING_PLAN');
 if(runner.conflicted||/^(?:<<<<<<<|=======|>>>>>>>)/m.test(runner.text))
  fail('CALENDAR_RUNNER_MERGE_CONFLICT');
 const moduleCandidate=module.conflicted?
  resolveSourceOnlyConflict(module.text,oldLines,new Map(ADDITIONS.map(k=>[k,featureLines.get(k)]))):module.text;
 const resultLines=sourceLines(moduleCandidate);
 if(resultLines.size!==12||
  [...oldLines].some(([key,line])=>resultLines.get(key)!==line)||
  ADDITIONS.some(key=>resultLines.get(key)!==featureLines.get(key)))
  fail('CALENDAR_SOURCE_PRESERVATION_FAILED');
 syntaxCheck(moduleCandidate);syntaxCheck(runner.text);
 if(!moduleCandidate.includes('function nyFedCalendarPages')||
  !runner.text.includes('nyFedCalendarPages')||
  !runner.text.includes('collectReleaseCalendar'))fail('CALENDAR_REQUIRED_BRANCH_MISSING');
 return {
  status:'CANDIDATE_ONLY_NOT_INSTALLED',
  originalSha256:hashes,
  candidateSha256:{module:sha256(moduleCandidate),runner:sha256(runner.text)},
  sources:[...resultLines.keys()],
  sourceConflictResolved:module.conflicted,
  runtimeSourceVerified:false,
  productionApproved:false,
  // Consume locally in a separate PC work copy only. Never print/upload these.
  candidate:{module:moduleCandidate,runner:runner.text},
 };
}
