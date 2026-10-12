import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  E1_R5_S13_R33_SHADOW_POLICY,
  bindR33GuidanceAuditToS13,
} from "../../lib/market-score/earnings-e1-r5-s13-r33-shadow.mjs";

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){
    const match=item.match(/^--([^=]+)=(.*)$/);
    if(match)out[match[1]]=match[2];
  }
  return out;
}

function readJson(file){
  return JSON.parse(fs.readFileSync(file,"utf8"));
}

function reportText(report){
  return [
    `E1-R5 S13 R33 SHADOW DRY RUN: ${report.status}`,
    `AT: ${report.at}`,
    `BINDING_VERSION: ${report.bindingVersion}`,
    `SOURCE: ${report.source}`,
    `SOURCE_VERSION: ${report.sourceVersion}`,
    `S13_RAW: ${report.s13Raw??"-"}`,
    `ELIGIBLE: ${report.eligibleCount??"-"}/${report.totalCount??"-"}`,
    `UP: ${report.guidance?.up??"-"}`,
    `FLAT: ${report.guidance?.flat??"-"}`,
    `DOWN: ${report.guidance?.down??"-"}`,
    `EXCLUDED_WITHDRAW: ${report.excludedCounts?.withdraw??"-"}`,
    `EXCLUDED_MIXED: ${report.excludedCounts?.mixed??"-"}`,
    `EXCLUDED_UNCLASSIFIED: ${report.excludedCounts?.unclassified??"-"}`,
    `BINDING_REASON: ${report.reason??"-"}`,
    "NETWORK_CALLS: 0",
    "DB_WRITES: 0",
    "PRODUCTION_ACTIVATION: NO",
    "FORMULA_CHANGED: NO",
    "SCORING_GATE_CHANGED: NO",
  ].join("\r\n")+"\r\n";
}

export function runEarningsR5S13R33ShadowDryRun({base=DEFAULT_BASE,auditFile,reportsDir}={}){
  const reports=reportsDir??path.join(base,"manual-input","e1-r5","reports");
  const sourceFile=auditFile??path.join(reports,"e1-r5-r33-guidance-candidate-audit-last.json");
  const sourceReport=readJson(sourceFile);
  const binding=bindR33GuidanceAuditToS13(sourceReport);
  const report={
    version:"E1-R5-S13-R33-SHADOW-DRY-RUN-R1",
    bindingVersion:E1_R5_S13_R33_SHADOW_POLICY.version,
    at:new Date().toISOString(),
    status:binding.status==="READY"?"PASS":"FAILED",
    source:binding.source,
    sourceVersion:binding.sourceVersion,
    s13Raw:binding.netBreadth??null,
    guidance:binding.guidance??null,
    eligibleCount:binding.eligibleCount??null,
    totalCount:binding.totalCount??null,
    excludedCounts:binding.excludedCounts??null,
    reason:binding.reason??null,
    networkCalls:0,
    dbWrites:0,
    productionActivation:false,
    formulaChanged:false,
    scoringGateChanged:false,
  };
  fs.mkdirSync(reports,{recursive:true});
  const jsonFile=path.join(reports,"e1-r5-s13-r33-shadow-dry-run-last.json");
  const textFile=path.join(reports,"e1-r5-s13-r33-shadow-dry-run-last.txt");
  fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n","utf8");
  fs.writeFileSync(textFile,reportText(report),"utf8");
  return {report,jsonFile,textFile,sourceFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();
  try{
    const result=runEarningsR5S13R33ShadowDryRun({
      base:cli.base?path.resolve(cli.base):undefined,
      auditFile:cli.audit?path.resolve(cli.audit):undefined,
      reportsDir:cli["reports-dir"]?path.resolve(cli["reports-dir"]):undefined,
    });
    console.log(JSON.stringify({
      status:result.report.status,
      s13Raw:result.report.s13Raw,
      eligibleCount:result.report.eligibleCount,
      totalCount:result.report.totalCount,
      source:result.report.source,
      sourceVersion:result.report.sourceVersion,
      textReport:result.textFile,
      jsonReport:result.jsonFile,
      networkCalls:0,
      dbWrites:0,
      productionActivation:false,
      formulaChanged:false,
      scoringGateChanged:false,
    }));
    if(result.report.status!=="PASS")process.exitCode=1;
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:String(error?.code??"E1_R5_S13_R33_SHADOW_DRY_RUN_FAILED")}));
    process.exitCode=1;
  }
}
