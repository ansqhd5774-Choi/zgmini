
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {runEarningsR5SecCrossFilingAudit} from "./earnings-r5-sec-cross-filing-audit.mjs";
import {runForwardReadinessR3} from "./earnings-r5-forward-readiness-r3.mjs";
import {runForwardShadowSnapshotR1} from "./earnings-r5-forward-shadow-snapshot-r1.mjs";
import {runG4PitLedgerR1} from "./earnings-r5-g4-pit-ledger-r1.mjs";

export const E1_R5_FORWARD_PROSPECTIVE_CYCLE_R1_VERSION="E1-R5-FORWARD-PROSPECTIVE-CYCLE-R1";
export const E1_R5_FORWARD_PROSPECTIVE_CYCLE_R1_CONTRACT=Object.freeze({
  researchOnly:true,
  productionActivation:false,
  networkCalls:0,
  dbWrites:0,
  formulaChanged:false,
  weightChanged:false,
  normalizationChanged:false,
  productionBaseline:"E1-R4",
  refreshPolicy:"UTC_DAY_OR_INPUT_MTIME_AFTER_LAST_SNAPSHOT",
  nonBlockingCaller:true,
  g4PitLedger:"E1-R5-G4-PIT-R1",
  g4PitNonBlocking:true,
  g4PitOrder:"BEFORE_HEAVY_SEC_CROSS_AUDIT",
});

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const clean=v=>String(v??"").trim();

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){
    const m=item.match(/^--([^=]+)=(.*)$/);
    if(m)out[m[1]]=m[2];
  }
  return out;
}
function readJson(file){return JSON.parse(fs.readFileSync(file,"utf8"));}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function writeJsonAtomic(file,value){
  ensureDir(path.dirname(file));
  const part=`${file}.${process.pid}.part`;
  fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");
  fs.renameSync(part,file);
}
function safeIso(value){
  const ms=Date.parse(clean(value));
  return Number.isFinite(ms)?new Date(ms).toISOString():null;
}
function latestSnapshot(ledger){
  const rows=Array.isArray(ledger?.snapshots)?ledger.snapshots:[];
  return [...rows].filter(x=>safeIso(x?.recordedAt)).sort((a,b)=>Date.parse(a.recordedAt)-Date.parse(b.recordedAt)).at(-1)??null;
}
function runG4PitNonBlocking({runG4Pit,base,recordedAt,e1}){
  try{
    return runG4Pit({base,recordedAt});
  }catch(error){
    return {
      status:"FAILED",
      code:clean(error?.code??error?.message??"G4_PIT_FAILED"),
      snapshot:null,
      snapshotCount:null,
      ledgerFile:path.join(e1,"g4-pit-r1","snapshots.json"),
      networkCalls:0,
      dbWrites:0,
      productionActivation:false,
    };
  }
}
function g4ReportFields(g4Pit){
  return {
    g4PitStatus:g4Pit?.status??null,
    g4PitCode:g4Pit?.code??null,
    g4PitSnapshotId:g4Pit?.snapshot?.snapshotId??null,
    g4PitSnapshotDate:g4Pit?.snapshot?.snapshotDate??null,
    g4PitSnapshotCount:g4Pit?.snapshotCount??null,
    g4PitLedgerFile:g4Pit?.ledgerFile??null,
  };
}

export function evaluateProspectiveRefresh({now=new Date().toISOString(),ledger=null,inputStats=[]}={}){
  const nowIso=safeIso(now);
  if(!nowIso)throw Object.assign(new Error("NOW_INVALID"),{code:"NOW_INVALID"});
  const latest=latestSnapshot(ledger);
  if(!latest)return {refresh:true,reason:"NO_PRIOR_SNAPSHOT",latestSnapshot:null,maxInputMtime:null};

  const latestIso=safeIso(latest.recordedAt);
  const latestMs=Date.parse(latestIso);
  const today=nowIso.slice(0,10);
  const latestDate=clean(latest.snapshotDate)||latestIso.slice(0,10);
  const mtimes=inputStats.map(x=>Date.parse(clean(x?.mtime))).filter(Number.isFinite);
  const maxInputMs=mtimes.length?Math.max(...mtimes):null;

  if(latestDate!==today){
    return {refresh:true,reason:"NEW_UTC_DAY",latestSnapshot:latestIso,maxInputMtime:maxInputMs===null?null:new Date(maxInputMs).toISOString()};
  }
  if(maxInputMs!==null&&maxInputMs>latestMs){
    return {refresh:true,reason:"INPUT_CHANGED_AFTER_LAST_SNAPSHOT",latestSnapshot:latestIso,maxInputMtime:new Date(maxInputMs).toISOString()};
  }
  return {refresh:false,reason:"UNCHANGED_SAME_UTC_DAY",latestSnapshot:latestIso,maxInputMtime:maxInputMs===null?null:new Date(maxInputMs).toISOString()};
}

export function runForwardProspectiveCycleR1({base=DEFAULT_BASE,now=new Date().toISOString(),runG4Pit=runG4PitLedgerR1}={}){
  const e1=path.join(base,"manual-input","e1-r5");
  const reports=path.join(e1,"reports");
  const sourceFiles=[
    path.join(e1,"sec-guidance-r17","checkpoint.json"),
    path.join(e1,"sec-guidance-r17","historical-backfill-r1.json"),
    path.join(reports,"e1-r5-sec-history-backfill-last.json"),
    path.join(e1,"cfo-survey-r1","releases.json"),
  ];
  const optionalG4Inputs=[
    path.join(e1,"incoming","companyfacts"),
    path.join(e1,"incoming","bea-section1-all.xlsx"),
  ];
  const missing=sourceFiles.filter(f=>!fs.existsSync(f));
  const ledgerFile=path.join(e1,"forward-shadow-r1","snapshots.json");
  const lastRunFile=path.join(base,"local-earnings-r5-forward-prospective-last-run.json");

  if(missing.length){
    const report={version:E1_R5_FORWARD_PROSPECTIVE_CYCLE_R1_VERSION,at:new Date().toISOString(),status:"INPUT_MISSING",missing,networkCalls:0,dbWrites:0,productionActivation:false};
    writeJsonAtomic(lastRunFile,report);
    return report;
  }

  const ledger=fs.existsSync(ledgerFile)?readJson(ledgerFile):null;
  const inputStats=[...sourceFiles,...optionalG4Inputs.filter(fs.existsSync)].map(file=>({file,mtime:fs.statSync(file).mtime.toISOString(),size:fs.statSync(file).size}));
  const decision=evaluateProspectiveRefresh({now,ledger,inputStats});

  if(!decision.refresh){
    const report={version:E1_R5_FORWARD_PROSPECTIVE_CYCLE_R1_VERSION,at:new Date().toISOString(),status:"NOOP_UNCHANGED",decision,snapshotCount:Array.isArray(ledger?.snapshots)?ledger.snapshots.length:0,ledgerFile,lastRunFile,networkCalls:0,dbWrites:0,productionActivation:false};
    writeJsonAtomic(lastRunFile,report);
    return report;
  }

  // G4 is independent of the heavier SEC cross-filing audit. Persist the current
  // approved PIT state first so a long shadow validation cannot prevent G4 history
  // accumulation after an official/local input change.
  const g4Pit=runG4PitNonBlocking({runG4Pit,base,recordedAt:now,e1});
  const g4Fields=g4ReportFields(g4Pit);

  const cross=runEarningsR5SecCrossFilingAudit({base,asOf:now});
  if(cross.report.status!=="PASS"){
    const report={version:E1_R5_FORWARD_PROSPECTIVE_CYCLE_R1_VERSION,at:new Date().toISOString(),status:"CROSS_AUDIT_NOT_READY",decision,crossStatus:cross.report.status,crossReason:cross.report.reason??null,...g4Fields,networkCalls:0,dbWrites:0,productionActivation:false};
    writeJsonAtomic(lastRunFile,report);
    return report;
  }

  const readiness=runForwardReadinessR3({base,asOf:now});
  if(readiness.report.rawComponentsReady!==true){
    const report={version:E1_R5_FORWARD_PROSPECTIVE_CYCLE_R1_VERSION,at:new Date().toISOString(),status:"READINESS_NOT_READY",decision,readinessStatus:readiness.report.status,...g4Fields,networkCalls:0,dbWrites:0,productionActivation:false};
    writeJsonAtomic(lastRunFile,report);
    return report;
  }

  const snapshot=runForwardShadowSnapshotR1({base,recordedAt:now});
  const report={
    version:E1_R5_FORWARD_PROSPECTIVE_CYCLE_R1_VERSION,
    at:new Date().toISOString(),
    status:snapshot.status==="STORED"?"SNAPSHOT_STORED":"SNAPSHOT_NOOP",
    decision,
    crossStatus:cross.report.status,
    readinessStatus:readiness.report.status,
    snapshotStatus:snapshot.status,
    snapshotId:snapshot.snapshot.snapshotId,
    snapshotDate:snapshot.snapshot.snapshotDate,
    snapshotCount:snapshot.snapshotCount,
    checkpoint:snapshot.snapshot.checkpoint,
    ledgerFile:snapshot.ledgerFile,
    ...g4Fields,
    lastRunFile,
    networkCalls:0,
    dbWrites:0,
    productionActivation:false,
  };
  writeJsonAtomic(lastRunFile,report);
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();
  try{
    const report=runForwardProspectiveCycleR1({base:cli.base?path.resolve(cli.base):undefined,now:cli.now??undefined});
    console.log(JSON.stringify(report));
  }catch(error){
    const code=String(error?.code??error?.message??"FORWARD_PROSPECTIVE_CYCLE_R1_FAILED");
    console.log(JSON.stringify({status:"FAILED",code,networkCalls:0,dbWrites:0,productionActivation:false}));
    process.exitCode=1;
  }
}
