import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {buildEarningsR5ForwardSourceAudit} from "../../lib/market-score/earnings-e1-r5-forward-sources.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){const match=item.match(/^--([^=]+)=(.*)$/);if(match)out[match[1]]=match[2];}
  return out;
}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function resolveSecJson(directory,cik){
  const name=`CIK${cik}.json`;
  const candidates=[path.join(directory,name),path.join(directory,"submissions",name),path.join(directory,path.basename(directory),name)];
  return candidates.find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;
}
function ensureDirectory(directory){fs.mkdirSync(directory,{recursive:true});}

export function formatEarningsR5R16ForwardAuditText(report){
  const s12=report?.s12??{},s13=report?.s13??{},e=s13.evidence??{};
  const candidateRows=(s12.candidates??[]).map(item=>`S12_SOURCE ${item.id}: REJECT commercial=${item.commercialUse} key=${item.apiKeyRequired?"YES":"NO"} reason=${item.reason}`).join("\r\n");
  return [
    `E1-R5 R16 FORWARD SOURCE AUDIT: ${report?.status??"UNKNOWN"}`,
    `AT: ${report?.at??"-"}`,
    `AS_OF: ${report?.asOf??"-"}`,
    `POLICY: RESEARCH_ONLY formulaChanged=${report?.formulaChanged===true?"true":"false"} weightChanged=${report?.weightChanged===true?"true":"false"} productionActivation=${report?.productionActivation===true?"true":"false"}`,
    `FILES: submissions=${report?.files?.submissions??0} universe=${report?.files?.universe??0}`,
    `S12: ${s12.status??"PARTIAL"} reviewed=${s12.reviewed??0} rejected=${s12.rejected??0} accepted=${s12.acceptedSource??"-"} reason=${s12.reason??"-"}`,
    candidateRows,
    `S13: ${s13.status??"PARTIAL"} source=${s13.source?.id??"-"} commercial=${s13.source?.commercialUse??"-"} rawTextRedistribution=${s13.source?.rawTextRedistribution===true?"YES":"NO"} reason=${s13.reason??"-"}`,
    `S13_COVERAGE: documents=${e.documentsValid??0}/${e.documentsTotal??0} recent8k=${e.totalRecent8k??0} candidateIssuers=${e.issuerCandidates??0} candidateFilings=${e.candidateFilings??0} lookbackDays=${e.lookbackDays??"-"}`,
    `NETWORK_CALLS: ${report?.networkCalls??0}`,
    `DB_WRITES: ${report?.dbWrites??0}`,
    `PRODUCTION_ACTIVATION: ${report?.productionActivation===true?"YES":"NO"}`,
  ].filter(Boolean).join("\r\n")+"\r\n";
}

export async function runEarningsR5R16ForwardAudit(options={}){
  const base=options.base??defaultBase;
  const incoming=options.incoming??path.join(base,"manual-input","e1-r5","incoming");
  const reports=options.reports??path.join(base,"manual-input","e1-r5","reports");
  const coreFile=options.coreFile??path.join(base,"storage","core.sqlite");
  const submissionsDir=options.submissionsDir??path.join(incoming,"submissions");
  const asOf=options.asOf??new Date().toISOString().slice(0,10);
  const lookbackDays=Number.isInteger(options.lookbackDays)?options.lookbackDays:185;
  const universe=readLatestEarningsUniverse(coreFile);
  const members=universe.members??[];
  const submissionsByCik=new Map();
  for(const member of members){
    const cik=String(member?.cik??"").replace(/\D/g,"").padStart(10,"0");
    submissionsByCik.set(cik,readJson(resolveSecJson(submissionsDir,cik)));
  }
  const report=buildEarningsR5ForwardSourceAudit({submissionsByCik,asOf,lookbackDays});
  report.at=new Date().toISOString();
  report.asOf=asOf;
  report.files={submissions:submissionsByCik.size,universe:members.length};
  ensureDirectory(reports);
  const jsonReport=path.join(reports,"e1-r5-r16-forward-source-last.json");
  const textReport=path.join(reports,"e1-r5-r16-forward-source-last.txt");
  fs.writeFileSync(jsonReport,JSON.stringify(report,null,2)+"\n","utf8");
  fs.writeFileSync(textReport,formatEarningsR5R16ForwardAuditText(report),"utf8");
  return {report,jsonReport,textReport};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs();
    const lookback=Number(cli["lookback-days"]??185);
    const {report,jsonReport,textReport}=await runEarningsR5R16ForwardAudit({
      base:cli.base?path.resolve(cli.base):undefined,
      incoming:cli.incoming?path.resolve(cli.incoming):undefined,
      reports:cli.reports?path.resolve(cli.reports):undefined,
      coreFile:cli.core?path.resolve(cli.core):undefined,
      submissionsDir:cli["submissions-dir"]?path.resolve(cli["submissions-dir"]):undefined,
      asOf:cli["as-of"]??undefined,
      lookbackDays:Number.isInteger(lookback)&&lookback>0?lookback:185,
    });
    console.log(JSON.stringify({status:report.status,s12:report.s12.status,s13:report.s13.status,textReport,jsonReport,networkCalls:report.networkCalls,dbWrites:report.dbWrites,productionActivation:report.productionActivation}));
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:error?.code??"E1_R5_R16_FORWARD_AUDIT_FAILED"}));
    process.exitCode=1;
  }
}
