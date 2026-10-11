import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
import {collectEarningsR5OfficialPreflightInputs} from "./earnings-r5-official-download.mjs";
import {formatEarningsR5OfficialPreflightText,runEarningsR5OfficialPreflight} from "./earnings-r5-official-preflight.mjs";
import {formatEarningsR5CurrentFrameAuditText,runEarningsR5CurrentFrameAudit} from "./earnings-r5-current-frame-audit.mjs";
import {formatEarningsR5CoverageDiagnosticText,runEarningsR5CoverageDiagnostic} from "./earnings-r5-coverage-diagnostic.mjs";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){
    const match=item.match(/^--([^=]+)=(.*)$/);
    if(match)out[match[1]]=match[2];
  }
  return out;
}

export function formatEarningsR5ShadowCollectionText(report){
  const companyFacts=report?.collection?.extraction?.companyFacts??{};
  const submissions=report?.collection?.extraction?.submissions??{};
  const lines=[
    `E1-R5 SHADOW COLLECTION: ${report?.status??"UNKNOWN"}`,
    `AT: ${report?.at??"-"}`,
    `NETWORK_CALLS: ${report?.collection?.networkCalls??"-"}`,
    `DB_WRITES: ${report?.dbWrites??"-"}`,
    `DOWNLOAD_REQUESTS: ${report?.collection?.download?.requestCount??"-"}`,
    `SEC_COMPANYFACTS_EXTRACTION: ${companyFacts.status??"-"} selected=${companyFacts.selected??0} extracted=${companyFacts.extracted??0}`,
    `SEC_SUBMISSIONS_EXTRACTION: ${submissions.status??"-"} selected=${submissions.selected??0} extracted=${submissions.extracted??0}`,
    "",
    formatEarningsR5OfficialPreflightText(report?.preflight??{}).trimEnd(),
    "",
    formatEarningsR5CurrentFrameAuditText(report?.currentFrameAudit??{}).trimEnd(),
    "",
    formatEarningsR5CoverageDiagnosticText(report?.coverageDiagnostic??{}).trimEnd(),
  ];
  return lines.join("\r\n")+"\r\n";
}

export async function runEarningsR5ShadowCollection({incoming,coreFile,reportsDir,asOf,fetchImpl=globalThis.fetch,execFile=execFileSync}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");
  const core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const collection=await collectEarningsR5OfficialPreflightInputs({incoming:inputDir,coreFile:core,fetchImpl,execFile});
  const preflight=await runEarningsR5OfficialPreflight({incoming:inputDir,coreFile:core});
  const currentFrameAudit=await runEarningsR5CurrentFrameAudit({incoming:inputDir,coreFile:core,asOf});
  const coverageDiagnostic=await runEarningsR5CoverageDiagnostic({incoming:inputDir,coreFile:core,asOf});
  const status=collection.status==="COMPLETE"&&preflight.status==="PASS"&&currentFrameAudit.status==="PASS"?"PASS":"PARTIAL";
  const report={
    version:4,
    methodologyVersion:"E1-R5-SHADOW-R1",
    at:new Date().toISOString(),
    active:false,
    status,
    dbWrites:0,
    collection,
    preflight,
    currentFrameAudit,
    coverageDiagnostic,
  };
  const outDir=reportsDir??path.join(defaultBase,"manual-input","e1-r5","reports");
  fs.mkdirSync(outDir,{recursive:true});
  const jsonFile=path.join(outDir,"e1-r5-shadow-collection-last.json");
  const textFile=path.join(outDir,"e1-r5-shadow-collection-last.txt");
  fs.writeFileSync(jsonFile,JSON.stringify(report,null,2));
  fs.writeFileSync(textFile,formatEarningsR5ShadowCollectionText(report));
  return {report,jsonFile,textFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs();
    const result=await runEarningsR5ShadowCollection({
      incoming:cli.incoming?path.resolve(cli.incoming):undefined,
      coreFile:cli.core?path.resolve(cli.core):undefined,
      reportsDir:cli["reports-dir"]?path.resolve(cli["reports-dir"]):undefined,
      asOf:cli["as-of"]??undefined,
    });
    console.log(JSON.stringify({
      status:result.report.status,
      textReport:result.textFile,
      jsonReport:result.jsonFile,
      networkCalls:result.report.collection.networkCalls,
      dbWrites:0,
    }));
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:error?.code??"E1_R5_SHADOW_COLLECTION_FAILED"}));
    process.exitCode=1;
  }
}
