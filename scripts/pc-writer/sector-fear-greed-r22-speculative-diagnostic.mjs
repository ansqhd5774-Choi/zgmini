import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {runSectorFearGreedR2SpeculativeDiagnostic} from "./sector-fear-greed-r2-speculative-diagnostic.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const SOURCE_JSON="local-sector-fear-greed-r2-speculative-diagnostic.json";
const OUTPUT_JSON="local-sector-fear-greed-r22-speculative-diagnostic.json";
const OUTPUT_TXT="local-sector-fear-greed-r22-speculative-diagnostic.txt";
const REFERENCE_REQUIRED=756;
const INTERNAL_WARNING=0.70;
const EXISTING_WARNING=0.70;
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const abs=value=>finite(value)?Math.abs(value):null;
const maxFinite=values=>{const clean=values.filter(finite);return clean.length?Math.max(...clean):null;};

export function runSectorFearGreedR22SpeculativeDiagnostic(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const upstream=runSectorFearGreedR2SpeculativeDiagnostic(base,{now});
  if(upstream.status!=="SHADOW_DIAGNOSTIC_COMPLETE")throw new Error("R22_UPSTREAM_DIAGNOSTIC_INCOMPLETE");
  const sourcePath=path.join(base,SOURCE_JSON),source=JSON.parse(fs.readFileSync(sourcePath,"utf8")),sectors={};
  for(const [sectorId,item] of Object.entries(source.sectors??{})){
    const r21=item.r21??{},ext=r21.existingCorrelations??{},internal=r21.internalCorrelations??{};
    const lotteryExternal=maxFinite([
      abs(ext.lotteryVsEtfReturn20?.pearson),
      abs(ext.lotteryVsBreadth50?.pearson),
      abs(ext.lotteryVsDemand?.pearson),
    ]);
    const volumeExternal=maxFinite([abs(ext.volumeVsDemand?.pearson)]);
    const maxExisting=maxFinite([lotteryExternal,volumeExternal]);
    const lotteryVolume=abs(internal.lotteryVsVolume?.pearson);
    const lotteryRef=Number(r21.referenceObservations?.lotteryDemand??0),volumeRef=Number(r21.referenceObservations?.speculativeVolume??0);
    const ready=lotteryRef>=REFERENCE_REQUIRED&&volumeRef>=REFERENCE_REQUIRED;
    sectors[sectorId]={
      ticker:item.ticker,
      historyObservations:item.historyObservations,
      referenceObservations:{lotteryDemand:lotteryRef,speculativeVolume:volumeRef},
      status:ready?"READY":"PARTIAL",
      maxAbsExistingCorrelation:maxExisting,
      absInternalLotteryVolumeCorrelation:lotteryVolume,
      existingRedundancyWarning:finite(maxExisting)&&maxExisting>=EXISTING_WARNING,
      internalRedundancyWarning:finite(lotteryVolume)&&lotteryVolume>=INTERNAL_WARNING,
      removedLeadershipCorrelation:{
        lotteryVsLeadership:abs(internal.lotteryVsLeadership?.pearson),
        leadershipVsVolume:abs(internal.leadershipVsVolume?.pearson),
      },
    };
  }
  const sectorList=Object.values(sectors),report={
    version:"R2.2",
    generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),
    status:"SHADOW_DIAGNOSTIC_COMPLETE",
    mode:"R2_2_TWO_FACTOR_SPECULATIVE_APPETITE_RESEARCH_ONLY",
    candidateWeights:{lotteryDemand:0.50,speculativeVolume:0.50},
    topLevelAxisWeightChanged:false,
    referenceRequirement:REFERENCE_REQUIRED,
    warningThresholds:{existingCorrelation:EXISTING_WARNING,internalCorrelation:INTERNAL_WARNING,researchOnly:true},
    providerCalls:0,
    rawRowsStored:false,
    publicMutation:false,
    dbSchemaChanged:false,
    productionFormulaChanged:false,
    schedulerChanged:false,
    sectors,
    summary:{
      sectors:sectorList.length,
      ready:sectorList.filter(item=>item.status==="READY").length,
      partial:sectorList.filter(item=>item.status==="PARTIAL").length,
      existingWarnings:sectorList.filter(item=>item.existingRedundancyWarning).length,
      internalWarnings:sectorList.filter(item=>item.internalRedundancyWarning).length,
      maxExistingCorrelation:maxFinite(sectorList.map(item=>item.maxAbsExistingCorrelation)),
      maxInternalCorrelation:maxFinite(sectorList.map(item=>item.absInternalLotteryVolumeCorrelation)),
    },
  };
  const lines=[
    "ZGMINI SECTOR FEAR & GREED R2.2 TWO-FACTOR SPECULATIVE APPETITE DIAGNOSTIC",
    `generatedAt=${report.generatedAt}`,
    `status=${report.status}`,
    "candidate=50% RESIDUAL_LOTTERY_DEMAND + 50% SPECULATIVE_VOLUME",
    `referenceRequirement=${REFERENCE_REQUIRED} (UNCHANGED)`,
    `researchWarningThreshold=${INTERNAL_WARNING} (NOT_PRODUCTION_GATE)`,
    "",
    "SECTOR | ETF | HISTORY | LOTTERY_REF | VOL_REF | MAX_EXISTING | LOTTERY~VOL | EXISTING_WARN | INTERNAL_WARN | STATUS",
  ];
  for(const [sectorId,item] of Object.entries(sectors)){
    lines.push(`${sectorId} | ${item.ticker} | ${item.historyObservations} | ${item.referenceObservations.lotteryDemand} | ${item.referenceObservations.speculativeVolume} | ${item.maxAbsExistingCorrelation??"NA"} | ${item.absInternalLotteryVolumeCorrelation??"NA"} | ${item.existingRedundancyWarning?"YES":"NO"} | ${item.internalRedundancyWarning?"YES":"NO"} | ${item.status}`);
    lines.push(`  removed leadership corr lottery~lead=${item.removedLeadershipCorrelation.lotteryVsLeadership??"NA"} lead~vol=${item.removedLeadershipCorrelation.leadershipVsVolume??"NA"}`);
  }
  lines.push("",`summary ready=${report.summary.ready}/${report.summary.sectors} partial=${report.summary.partial} existingWarnings=${report.summary.existingWarnings} internalWarnings=${report.summary.internalWarnings} maxExisting=${report.summary.maxExistingCorrelation??"NA"} maxInternal=${report.summary.maxInternalCorrelation??"NA"}`,"providerCalls=0 rawRowsStored=false publicMutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false","note=CANDIDATE_ONLY_NOT_APPROVED_NOT_PRODUCTION");
  fs.mkdirSync(base,{recursive:true});
  const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);
  fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");
  fs.writeFileSync(txtFile,lines.join("\n")+"\n");
  return {status:report.status,jsonFile,txtFile,providerCalls:0,publicMutation:false,productionFormulaChanged:false,summary:report.summary};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(runSectorFearGreedR22SpeculativeDiagnostic(),null,2));}
  catch(error){const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R22_SPECULATIVE_DIAGNOSTIC_FAILED";console.log(JSON.stringify({status:"FAILED",code,providerCalls:0,publicMutation:false,productionFormulaChanged:false}));process.exitCode=1;}
}
