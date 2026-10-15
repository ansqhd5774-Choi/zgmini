import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {correlation} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {buildR2138OutcomeRows} from "./sector-fear-greed-r2138-economic-regime-validation.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const R21311_JSON="local-sector-fear-greed-r21311-orthogonality-economic-diagnostic.json";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INV_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const OUT="local-sector-fear-greed-r21313-residual-fwd5-economic";
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
function json(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function median(values){const a=values.filter(finite).sort((x,y)=>x-y);if(!a.length)return null;const i=(a.length-1)/2,l=Math.floor(i),h=Math.ceil(i);return l===h?a[l]:(a[l]+a[h])/2;}
function scoreRows(rows=[]){return (Array.isArray(rows)?rows:[]).map(r=>({date:String(r?.date??"").slice(0,10),score:Number(r?.score)})).filter(r=>validDate(r.date)&&finite(r.score)).sort((a,b)=>a.date.localeCompare(b.date));}
function spearmanOutcome(rows,key){
  const left=[],right=[];
  for(const row of Array.isArray(rows)?rows:[]){
    if(!validDate(row?.date)||!finite(row?.score)||!finite(row?.[key]))continue;
    left.push({date:row.date,score:row.score});
    right.push({date:row.date,score:row[key]});
  }
  return {n:left.length,rho:round(correlation(left,right,{method:"spearman"}))};
}

export function summarizeR21313Fwd5(outcomeRows=[]){
  const ret=spearmanOutcome(outcomeRows,"forwardReturn5"),dd=spearmanOutcome(outcomeRows,"forwardDrawdown5");
  return {
    outcomeRows:Array.isArray(outcomeRows)?outcomeRows.length:0,
    forward5Pairs:ret.n,
    forward5ReturnSpearman:ret.rho,
    forward5DrawdownPairs:dd.n,
    forward5DrawdownSpearman:dd.rho,
    forward5ReturnEligible:ret.n>=3&&finite(ret.rho),
    forward5DrawdownEligible:dd.n>=3&&finite(dd.rho)
  };
}

function aggregate(sectors={}){
  const rows=Object.values(sectors),ret=rows.map(x=>x.forward5ReturnSpearman).filter(finite),dd=rows.map(x=>x.forward5DrawdownSpearman).filter(finite),pairs=rows.map(x=>x.forward5Pairs).filter(finite);
  return {
    sectors:rows.length,
    minForward5Pairs:pairs.length?Math.min(...pairs):0,
    medianForward5Pairs:round(median(pairs)),
    returnEligibleSectors:rows.filter(x=>x.forward5ReturnEligible).length,
    drawdownEligibleSectors:rows.filter(x=>x.forward5DrawdownEligible).length,
    medianForward5ReturnSpearman:round(median(ret)),
    medianAbsForward5ReturnSpearman:round(median(ret.map(Math.abs))),
    medianForward5DrawdownSpearman:round(median(dd)),
    returnPositiveSectors:ret.filter(x=>x>0).length,
    returnNegativeSectors:ret.filter(x=>x<0).length,
    drawdownPositiveSectors:dd.filter(x=>x>0).length,
    drawdownNegativeSectors:dd.filter(x=>x<0).length
  };
}

export function runSectorFearGreedR21313ResidualFwd5Economic(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  for(const name of [R21311_JSON,IEX_FILE,INV_FILE])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21313_INPUT_MISSING:${name}`);
  const prior=json(path.join(base,R21311_JSON));
  if(prior?.status!=="SHADOW_R21311_ORTHOGONALITY_ECONOMIC_DIAGNOSTIC_COMPLETE")throw new Error("R21313_R21311_NOT_COMPLETE");
  const iex=json(path.join(base,IEX_FILE)),inv=json(path.join(base,INV_FILE)),repair=buildR2134RepairedBenchmarks(iex?.series??{},inv),candidates={};
  for(const id of prior.candidates??Object.keys(prior.detail??{})){
    const sectors={};
    for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
      const item=prior?.detail?.[id]?.sectors?.[sectorId],residual=scoreRows(item?.residual?.residual??[]),outcomes=buildR2138OutcomeRows(residual,repair.series[ticker]??[]),summary=summarizeR21313Fwd5(outcomes);
      sectors[sectorId]={ticker,residualStatus:item?.residual?.status??null,residualN:residual.length,explainedR2:item?.residual?.r2??null,...summary};
    }
    candidates[id]={summary:aggregate(sectors),sectors};
  }
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const report={
    version:"R2.13.13-RESIDUAL-FWD5-ECONOMIC",generatedAt,status:"SHADOW_R21313_RESIDUAL_FWD5_ECONOMIC_COMPLETE",mode:"LOCAL_READ_ONLY_EXISTING_RESIDUAL_SHORT_HORIZON_DIAGNOSTIC",
    providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,fillForwardFill:false,sourceFilesMutated:false,candidateSelected:false,selectionThresholdIntroduced:false,optionsEquivalenceClaimed:false,newFormulaIntroduced:false,residualizationChanged:false,referenceWindowChanged:false,diagnosticOnly:true,
    interpretationPolicy:"DESCRIPTIVE_ONLY_NO_SIGN_IS_A_SELECTION_RULE",repair:{targetDate:repair.targetDate,complete:repair.complete,injected:repair.injected.length},candidates
  };
  const lines=[
    "ZGMINI SECTOR FEAR & GREED R2.13.13 RESIDUAL FWD5 ECONOMIC DIAGNOSTIC",
    `generatedAt=${generatedAt}`,
    `status=${report.status}`,
    "providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false",
    "productionFormulaChanged=false dbSchemaChanged=false schedulerChanged=false referenceRequirementChanged=false",
    "approvedR1ReferenceRequirement=756 (UNCHANGED)",
    "fillForwardFill=false sourceFilesMutated=false candidateSelected=false selectionThresholdIntroduced=false",
    "optionsEquivalenceClaimed=false newFormulaIntroduced=false residualizationChanged=false referenceWindowChanged=false diagnosticOnly=true",
    `repair targetDate=${report.repair.targetDate} complete=${report.repair.complete} injected=${report.repair.injected}`,
    "interpretationPolicy=DESCRIPTIVE_ONLY_NO_SIGN_IS_A_SELECTION_RULE",
    "",
    "CANDIDATE | MIN_FWD5 | MED_FWD5 | RET_ELIG | DD_ELIG | MED_RET_RHO | MED_ABS_RET_RHO | MED_DD_RHO | RET_POS | RET_NEG | DD_POS | DD_NEG"
  ];
  for(const [id,bucket] of Object.entries(candidates)){
    const s=bucket.summary;lines.push(`${id} | ${s.minForward5Pairs} | ${s.medianForward5Pairs??"NA"} | ${s.returnEligibleSectors}/11 | ${s.drawdownEligibleSectors}/11 | ${s.medianForward5ReturnSpearman??"NA"} | ${s.medianAbsForward5ReturnSpearman??"NA"} | ${s.medianForward5DrawdownSpearman??"NA"} | ${s.returnPositiveSectors}/11 | ${s.returnNegativeSectors}/11 | ${s.drawdownPositiveSectors}/11 | ${s.drawdownNegativeSectors}/11`);
  }
  lines.push("","SECTOR DETAIL");
  for(const [id,bucket] of Object.entries(candidates)){
    lines.push("",`[${id}]`,`SECTOR | ETF | STATUS | RESID_N | FWD5_PAIRS | RET_RHO | DD_RHO | RET_ELIG | DD_ELIG | R2`);
    for(const [sectorId,x] of Object.entries(bucket.sectors))lines.push(`${sectorId} | ${x.ticker} | ${x.residualStatus??"NA"} | ${x.residualN} | ${x.forward5Pairs} | ${finite(x.forward5ReturnSpearman)?x.forward5ReturnSpearman:"NA"} | ${finite(x.forward5DrawdownSpearman)?x.forward5DrawdownSpearman:"NA"} | ${x.forward5ReturnEligible} | ${x.forward5DrawdownEligible} | ${finite(x.explainedR2)?round(x.explainedR2):"NA"}`);
  }
  lines.push("","note=FWD5_IS_THE_ONLY_CURRENTLY_MATURE_FORWARD_HORIZON_IN_R21312","note=FWD20_AND_FWD60_REMAIN_UNRESOLVED_UNTIL_MORE_ACTUAL_SESSIONS_MATURE","note=NO_SHORTENING_OF_252_REFERENCE_WINDOW_AND_NO_CHANGE_TO_RESIDUALIZATION","note=NO_CANDIDATE_SELECTION_THRESHOLD_OR_OPTIONS_EQUIVALENCE_CLAIM","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_OR_SCHEMA_CHANGE");
  fs.writeFileSync(path.join(base,`${OUT}.json`),JSON.stringify(report,null,2)+"\n");
  fs.writeFileSync(path.join(base,`${OUT}.txt`),lines.join("\n")+"\n");
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const r=runSectorFearGreedR21313ResidualFwd5Economic();
    console.log(JSON.stringify({status:r.status,jsonFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,`${OUT}.json`),txtFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,`${OUT}.txt`),providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,referenceRequirementChanged:r.referenceRequirementChanged,candidates:Object.fromEntries(Object.entries(r.candidates).map(([id,x])=>[id,x.summary]))},null,2));
  }catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}
}
