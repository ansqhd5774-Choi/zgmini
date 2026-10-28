// R24 V2: preserve five confirmed unrelated PC Core changes after R23.
// Never reset/cherry-pick/overwrite those changes; install only three USDA
// calendar files after exact, read-only source lineage verification.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runR24} from './market-calendar-r24-usda-apply.mjs';
import {runR24SourceDriftReadOnly} from './market-calendar-r24-source-drift-readonly.mjs';

export const R24_V2_APPROVED_PC_SOURCE='4e2a12ccf486d760a21c3269a9f77a4bfe4f48df';
const r23Source='8ff396217c9f84578b37c9d422381644c2b8f0e8';
const requiredUnrelatedChanges=Object.freeze([
 'lib/market-score/sec-earnings-e1-r4-provider.mjs',
 'scripts/pc-writer/collect-local.mjs',
 'scripts/pc-writer/collection-events.mjs',
 'scripts/pc-writer/local-data-alert.mjs',
 'worker/market-operational-refresh.mjs',
]);
const requiredFileSha=Object.freeze({
 'lib/release-calendar.mjs':'cf94658ade12f83326c5f9403e4303150f7f0b3d771ab25bf7d65bf8d9313de5',
 'lib/eia-calendar.mjs':'6099a1fb912077b2627369b8428a600f613004b2facdb16b262a8ea5b3f65e90',
 'scripts/pc-writer/release-calendar.mjs':'b684ab2495b5f25fa604276694111be48df6861d8aaf5b86f75ee3593973a007',
 'lib/usda-calendar.mjs':null,
});
const exact=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&
 JSON.stringify([...a].sort())===JSON.stringify([...b].sort());

export function runR24V2({apply=false,diagnose=runR24SourceDriftReadOnly,install=runR24}={}){
 const result={audit:'MARKET_CALENDAR_R24_USDA_APPLY_V2',at:new Date().toISOString(),
  mode:apply?'EXPLICIT_APPLY':'PREFLIGHT',previousSource:R24_V2_APPROVED_PC_SOURCE,
  previousR23Source:r23Source,policy:'EXACT_R23_DESCENDANT_FIVE_UNRELATED_FILES_PRESERVED_THREE_USDA_ONLY',
  changedFiles:[],backupCreated:false,gitPushed:false,publisherExecuted:false,
  forcedCollection:false,newSource:null,decision:'R24_V2_SOURCE_RECHECK_STOP'};
 let scan;
 try{scan=diagnose();}catch{result.decision='R24_V2_DIAGNOSTIC_UNAVAILABLE_STOP';return result;}
 result.observedHead=scan?.observedHead??null;
 result.worktreeId=scan?.worktreeId??null;
 result.configSource=scan?.configSource??null;
 const matchingSource=scan?.decision==='R24_SOURCE_DRIFT_READONLY_COMPLETE'&&
  scan.observedHead===R24_V2_APPROVED_PC_SOURCE&&
  scan.configSource===R24_V2_APPROVED_PC_SOURCE&&
  scan.configSourceMatchesHead===true&&scan.configEnabled===true&&
  scan.collectionTarget==='pc'&&scan.worktreeId==='d0a4b3cb8b95'&&
  scan.r23ObjectAvailable===true&&scan.r23IsAncestor===true&&
  scan.protectedTrackedDirty===false&&scan.cycleLockPresent===false;
 const matchingFiles=Object.entries(requiredFileSha).every(([file,sha])=>
  scan?.installedFileSha256?.[file]===sha);
 const matchingUnrelated=exact(scan?.protectedFilesChangedSinceR23,requiredUnrelatedChanges);
 result.sourceLineageVerified=matchingSource&&matchingFiles&&matchingUnrelated;
 result.preservedUnrelatedFiles=matchingUnrelated?requiredUnrelatedChanges.length:0;
 if(!result.sourceLineageVerified)return result;
 let applied;
 try{applied=install({apply,approvedSource:R24_V2_APPROVED_PC_SOURCE});}
 catch{result.decision='R24_V2_INSTALLER_UNEXPECTED_ERROR_STOP';return result;}
 // The underlying R24 installer also rechecks source/config/locked files
 // under Core lock, commits exactly three files, and never collects/publishes.
 return {...result,...applied,audit:result.audit,previousR23Source:r23Source,
  previousSource:R24_V2_APPROVED_PC_SOURCE,sourceLineageVerified:true,
  preservedUnrelatedFiles:requiredUnrelatedChanges.length,
  baseInstallerDecision:applied.decision,
  decision:applied.decision==='R24_USDA_CALENDAR_INSTALLED_NO_FORCED_COLLECTION'?
   'R24_USDA_V2_INSTALLED_NO_FORCED_COLLECTION':
   applied.decision==='R24_THREE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE'?
    'R24_USDA_V2_PREFLIGHT_READY_NO_CHANGES_MADE':applied.decision};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const reportPath=process.argv[2],apply=process.argv.includes('--apply');
 if(!reportPath){console.error('RESULT_FILE_ARGUMENT_REQUIRED');process.exitCode=2;}
 else try{
  const result=runR24V2({apply});
  fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n','utf8');
  console.log(result.decision);
  console.log(`RESULT_FILE=${reportPath}`);
  if(!['R24_USDA_V2_INSTALLED_NO_FORCED_COLLECTION','R24_USDA_V2_PREFLIGHT_READY_NO_CHANGES_MADE'].includes(result.decision))process.exitCode=1;
 }catch{console.error('R24_V2_RESULT_WRITE_FAILED');process.exitCode=2;}
}
