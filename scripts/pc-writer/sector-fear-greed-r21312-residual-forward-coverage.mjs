import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const R21311_JSON="local-sector-fear-greed-r21311-orthogonality-economic-diagnostic.json";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INV_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const OUT="local-sector-fear-greed-r21312-residual-forward-coverage";
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
function json(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function median(values){const a=values.filter(finite).sort((x,y)=>x-y);if(!a.length)return null;const i=(a.length-1)/2,l=Math.floor(i),h=Math.ceil(i);return l===h?a[l]:(a[l]+a[h])/2;}
function prices(rows=[]){const m=new Map();for(const r of rows){const date=String(r?.date??r?.tradeDate??r?.trade_date??"").slice(0,10),close=Number(r?.close??r?.currentClose??r?.current_close);if(validDate(date)&&finite(close)&&close>0)m.set(date,{date,close});}return [...m.values()].sort((a,b)=>a.date.localeCompare(b.date));}
function residualScores(rows=[]){return (Array.isArray(rows)?rows:[]).map(r=>({date:String(r?.date??"").slice(0,10),score:Number(r?.score)})).filter(r=>validDate(r.date)&&finite(r.score)).sort((a,b)=>a.date.localeCompare(b.date));}

export function summarizeResidualCoverage(residualRows=[],priceRows=[]){
  const residual=residualScores(residualRows),price=prices(priceRows),idx=new Map(price.map((r,i)=>[r.date,i]));
  let aligned=0,trail20=0,fwd5=0,fwd20=0,fwd60=0;
  for(const row of residual){
    const i=idx.get(row.date);if(!Number.isInteger(i))continue;aligned++;
    if(i>=20)trail20++;
    if(i+5<price.length)fwd5++;
    if(i+20<price.length)fwd20++;
    if(i+60<price.length)fwd60++;
  }
  const uniqueScores=new Set(residual.map(r=>String(round(r.score)))).size;
  return {residualN:residual.length,alignedN:aligned,firstDate:residual[0]?.date??null,lastDate:residual.at(-1)?.date??null,uniqueScores,trail20Pairs:trail20,forward5Pairs:fwd5,forward20Pairs:fwd20,forward60Pairs:fwd60,forward20CorrelationEligible:fwd20>=3&&uniqueScores>=2,forward60CorrelationEligible:fwd60>=3&&uniqueScores>=2};
}

function aggregate(sectors={}){
  const rows=Object.values(sectors),pick=k=>rows.map(r=>r[k]).filter(finite);
  return {sectors:rows.length,minResidualN:pick("residualN").length?Math.min(...pick("residualN")):0,medianResidualN:round(median(pick("residualN"))),minForward20Pairs:pick("forward20Pairs").length?Math.min(...pick("forward20Pairs")):0,medianForward20Pairs:round(median(pick("forward20Pairs"))),minForward60Pairs:pick("forward60Pairs").length?Math.min(...pick("forward60Pairs")):0,medianForward60Pairs:round(median(pick("forward60Pairs"))),forward20EligibleSectors:rows.filter(r=>r.forward20CorrelationEligible).length,forward60EligibleSectors:rows.filter(r=>r.forward60CorrelationEligible).length,constantResidualSectors:rows.filter(r=>r.uniqueScores<2).length};
}

export function runSectorFearGreedR21312ResidualForwardCoverage(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  for(const name of [R21311_JSON,IEX_FILE,INV_FILE])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21312_INPUT_MISSING:${name}`);
  const prior=json(path.join(base,R21311_JSON));
  if(prior?.status!=="SHADOW_R21311_ORTHOGONALITY_ECONOMIC_DIAGNOSTIC_COMPLETE")throw new Error("R21312_R21311_NOT_COMPLETE");
  const iex=json(path.join(base,IEX_FILE)),inv=json(path.join(base,INV_FILE)),repair=buildR2134RepairedBenchmarks(iex?.series??{},inv);
  const candidates={};
  for(const id of prior.candidates??Object.keys(prior.detail??{})){
    const sectors={};
    for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
      const item=prior?.detail?.[id]?.sectors?.[sectorId];
      const residual=item?.residual?.residual??[];
      sectors[sectorId]={ticker,...summarizeResidualCoverage(residual,repair.series[ticker]??[]),residualStatus:item?.residual?.status??null,explainedR2:item?.residual?.r2??null};
    }
    candidates[id]={summary:aggregate(sectors),sectors};
  }
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const report={version:"R2.13.12-RESIDUAL-FORWARD-COVERAGE",generatedAt,status:"SHADOW_R21312_RESIDUAL_FORWARD_COVERAGE_COMPLETE",mode:"LOCAL_READ_ONLY_R21311_RESIDUAL_HORIZON_DIAGNOSTIC",providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,fillForwardFill:false,sourceFilesMutated:false,candidateSelected:false,selectionThresholdIntroduced:false,optionsEquivalenceClaimed:false,newFormulaIntroduced:false,residualizationChanged:false,diagnosticOnly:true,repair:{targetDate:repair.targetDate,complete:repair.complete,injected:repair.injected.length},candidates};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.12 RESIDUAL FORWARD COVERAGE",`generatedAt=${generatedAt}`,`status=${report.status}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false","productionFormulaChanged=false dbSchemaChanged=false schedulerChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)","fillForwardFill=false sourceFilesMutated=false candidateSelected=false selectionThresholdIntroduced=false","optionsEquivalenceClaimed=false newFormulaIntroduced=false residualizationChanged=false diagnosticOnly=true",`repair targetDate=${report.repair.targetDate} complete=${report.repair.complete} injected=${report.repair.injected}`,"","CANDIDATE | MIN_RESID_N | MED_RESID_N | MIN_FWD20 | MED_FWD20 | FWD20_ELIGIBLE | MIN_FWD60 | MED_FWD60 | FWD60_ELIGIBLE | CONSTANT_RESID"];
  for(const [id,bucket] of Object.entries(candidates)){const s=bucket.summary;lines.push(`${id} | ${s.minResidualN} | ${s.medianResidualN??"NA"} | ${s.minForward20Pairs} | ${s.medianForward20Pairs??"NA"} | ${s.forward20EligibleSectors}/11 | ${s.minForward60Pairs} | ${s.medianForward60Pairs??"NA"} | ${s.forward60EligibleSectors}/11 | ${s.constantResidualSectors}/11`);}
  lines.push("","SECTOR DETAIL");
  for(const [id,bucket] of Object.entries(candidates)){
    lines.push("",`[${id}]`,`SECTOR | ETF | STATUS | RESID_N | ALIGNED | FIRST | LAST | UNIQUE | TRAIL20 | FWD5 | FWD20 | FWD60 | FWD20_ELIG | FWD60_ELIG | R2`);
    for(const [sectorId,x] of Object.entries(bucket.sectors))lines.push(`${sectorId} | ${x.ticker} | ${x.residualStatus??"NA"} | ${x.residualN} | ${x.alignedN} | ${x.firstDate??"NA"} | ${x.lastDate??"NA"} | ${x.uniqueScores} | ${x.trail20Pairs} | ${x.forward5Pairs} | ${x.forward20Pairs} | ${x.forward60Pairs} | ${x.forward20CorrelationEligible} | ${x.forward60CorrelationEligible} | ${finite(x.explainedR2)?round(x.explainedR2):"NA"}`);
  }
  lines.push("","note=THIS_DIAGNOSTIC_ONLY_EXPLAINS_WHY_R21311_FORWARD_RESIDUAL_CORRELATIONS_ARE_OR_ARE_NOT_AVAILABLE","note=IT_DOES_NOT_CHANGE_THE_RESIDUALIZATION_METHOD_OR_REFERENCE_WINDOW","note=NO_CANDIDATE_SELECTION_AND_NO_OPTIONS_EQUIVALENCE_CLAIM","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_OR_SCHEMA_CHANGE");
  fs.writeFileSync(path.join(base,`${OUT}.json`),JSON.stringify(report,null,2)+"\n");
  fs.writeFileSync(path.join(base,`${OUT}.txt`),lines.join("\n")+"\n");
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const r=runSectorFearGreedR21312ResidualForwardCoverage();console.log(JSON.stringify({status:r.status,jsonFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,`${OUT}.json`),txtFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,`${OUT}.txt`),providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,referenceRequirementChanged:r.referenceRequirementChanged,candidates:Object.fromEntries(Object.entries(r.candidates).map(([id,x])=>[id,x.summary]))},null,2));}
  catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}
}
