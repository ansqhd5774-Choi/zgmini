import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {buildR2138OutcomeRows} from "./sector-fear-greed-r2138-economic-regime-validation.mjs";
import {summarizeR21314Date} from "./sector-fear-greed-r21314-cross-sectional-fwd5-ic.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const R21311_JSON="local-sector-fear-greed-r21311-orthogonality-economic-diagnostic.json";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INV_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const OUT="local-sector-fear-greed-r21315-tail-balance-robustness";
export const R21315_CANDIDATES=Object.freeze(["R24","R2_TAIL_BALANCE_RAW"]);
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
function median(values){const a=values.filter(finite).sort((x,y)=>x-y);if(!a.length)return null;const i=(a.length-1)/2,l=Math.floor(i),h=Math.ceil(i);return l===h?a[l]:(a[l]+a[h])/2;}
function json(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function scoreRows(rows=[]){return (Array.isArray(rows)?rows:[]).map(r=>({date:String(r?.date??"").slice(0,10),score:Number(r?.score)})).filter(r=>validDate(r.date)&&finite(r.score)).sort((a,b)=>a.date.localeCompare(b.date));}
function aggregateDateSummaries(dates={}){
  const rows=Object.values(dates),ret=rows.map(r=>r.returnIC).filter(finite),dd=rows.map(r=>r.drawdownIC).filter(finite),retSpread=rows.map(r=>r.spread?.topMinusBottomReturn).filter(finite),ddSpread=rows.map(r=>r.spread?.topMinusBottomDrawdown).filter(finite);
  return {dates:rows.length,medianReturnIC:round(median(ret)),meanReturnIC:round(mean(ret)),returnPositiveDates:ret.filter(x=>x>0).length,returnNegativeDates:ret.filter(x=>x<0).length,medianDrawdownIC:round(median(dd)),meanDrawdownIC:round(mean(dd)),drawdownPositiveDates:dd.filter(x=>x>0).length,drawdownNegativeDates:dd.filter(x=>x<0).length,medianTopMinusBottomReturn:round(median(retSpread)),medianTopMinusBottomDrawdown:round(median(ddSpread))};
}
export function summarizeR21315NonOverlap(dates={}){
  const entries=Object.entries(dates).sort((a,b)=>a[0].localeCompare(b[0])),offsets=[];
  for(let offset=0;offset<5;offset++){
    const subset={};for(let i=offset;i<entries.length;i+=5)subset[entries[i][0]]=entries[i][1];
    offsets.push({offset,...aggregateDateSummaries(subset)});
  }
  return {offsets,meanReturnPositiveOffsets:offsets.filter(x=>finite(x.meanReturnIC)&&x.meanReturnIC>0).length,medianReturnPositiveOffsets:offsets.filter(x=>finite(x.medianReturnIC)&&x.medianReturnIC>0).length,meanDrawdownPositiveOffsets:offsets.filter(x=>finite(x.meanDrawdownIC)&&x.meanDrawdownIC>0).length,medianDrawdownPositiveOffsets:offsets.filter(x=>finite(x.medianDrawdownIC)&&x.medianDrawdownIC>0).length,minMeanReturnIC:round(Math.min(...offsets.map(x=>x.meanReturnIC).filter(finite))),minMeanDrawdownIC:round(Math.min(...offsets.map(x=>x.meanDrawdownIC).filter(finite)))};
}
export function summarizeR21315LeaveOneOut(byDateRows={},sectorIds=[]){
  const cases={};
  for(const omitted of sectorIds){const dates={};for(const [date,rows] of Object.entries(byDateRows)){const kept=rows.filter(r=>r.sectorId!==omitted);dates[date]=summarizeR21314Date(kept);}cases[omitted]=aggregateDateSummaries(dates);}
  const list=Object.values(cases),pick=k=>list.map(x=>x[k]).filter(finite);
  return {cases,summary:{omissions:list.length,minMeanReturnIC:round(Math.min(...pick("meanReturnIC"))),medianMeanReturnIC:round(median(pick("meanReturnIC"))),positiveMeanReturnOmissions:list.filter(x=>x.meanReturnIC>0).length,minMedianReturnIC:round(Math.min(...pick("medianReturnIC"))),positiveMedianReturnOmissions:list.filter(x=>x.medianReturnIC>0).length,minMeanDrawdownIC:round(Math.min(...pick("meanDrawdownIC"))),medianMeanDrawdownIC:round(median(pick("meanDrawdownIC"))),positiveMeanDrawdownOmissions:list.filter(x=>x.meanDrawdownIC>0).length,minMedianDrawdownIC:round(Math.min(...pick("medianDrawdownIC"))),positiveMedianDrawdownOmissions:list.filter(x=>x.medianDrawdownIC>0).length,minMedianTopMinusBottomReturn:round(Math.min(...pick("medianTopMinusBottomReturn"))),positiveMedianTopMinusBottomReturnOmissions:list.filter(x=>x.medianTopMinusBottomReturn>0).length}};
}
function buildCandidateDateRows(prior,repair,id){
  const byDate=new Map();
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const item=prior?.detail?.[id]?.sectors?.[sectorId],residual=scoreRows(item?.residual?.residual??[]),outcomes=buildR2138OutcomeRows(residual,repair.series[ticker]??[]);
    for(const row of outcomes){if(!validDate(row.date)||!finite(row.score)||(!finite(row.forwardReturn5)&&!finite(row.forwardDrawdown5)))continue;if(!byDate.has(row.date))byDate.set(row.date,[]);byDate.get(row.date).push({sectorId,ticker,score:row.score,forwardReturn5:row.forwardReturn5,forwardDrawdown5:row.forwardDrawdown5});}
  }
  return Object.fromEntries([...byDate.entries()].sort((a,b)=>a[0].localeCompare(b[0])));
}
export function runSectorFearGreedR21315TailBalanceRobustness(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  for(const name of [R21311_JSON,IEX_FILE,INV_FILE])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21315_INPUT_MISSING:${name}`);
  const prior=json(path.join(base,R21311_JSON));if(prior?.status!=="SHADOW_R21311_ORTHOGONALITY_ECONOMIC_DIAGNOSTIC_COMPLETE")throw new Error("R21315_R21311_NOT_COMPLETE");
  const iex=json(path.join(base,IEX_FILE)),inv=json(path.join(base,INV_FILE)),repair=buildR2134RepairedBenchmarks(iex?.series??{},inv),sectorIds=Object.keys(SECTOR_FEAR_GREED_R1_ETFS),candidates={};
  for(const id of R21315_CANDIDATES){const byDateRows=buildCandidateDateRows(prior,repair,id),dates=Object.fromEntries(Object.entries(byDateRows).map(([date,rows])=>[date,summarizeR21314Date(rows)]));candidates[id]={full:aggregateDateSummaries(dates),nonOverlap:summarizeR21315NonOverlap(dates),leaveOneOut:summarizeR21315LeaveOneOut(byDateRows,sectorIds)};}
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.13.15-TAIL-BALANCE-ROBUSTNESS",generatedAt,status:"SHADOW_R21315_TAIL_BALANCE_ROBUSTNESS_COMPLETE",mode:"LOCAL_READ_ONLY_SHORT_HORIZON_ROBUSTNESS_DIAGNOSTIC",providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,fillForwardFill:false,sourceFilesMutated:false,candidateSelected:false,selectionThresholdIntroduced:false,optionsEquivalenceClaimed:false,newFormulaIntroduced:false,residualizationChanged:false,referenceWindowChanged:false,diagnosticOnly:true,interpretationPolicy:"DESCRIPTIVE_ONLY_OVERLAP_AND_SECTOR_JACKKNIFE_NOT_A_SELECTION_RULE",repair:{targetDate:repair.targetDate,complete:repair.complete,injected:repair.injected.length},candidates};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.15 TAIL BALANCE ROBUSTNESS",`generatedAt=${generatedAt}`,`status=${report.status}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false","productionFormulaChanged=false dbSchemaChanged=false schedulerChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)","fillForwardFill=false sourceFilesMutated=false candidateSelected=false selectionThresholdIntroduced=false","optionsEquivalenceClaimed=false newFormulaIntroduced=false residualizationChanged=false referenceWindowChanged=false diagnosticOnly=true",`repair targetDate=${report.repair.targetDate} complete=${report.repair.complete} injected=${report.repair.injected}`,`interpretationPolicy=${report.interpretationPolicy}`,"","CANDIDATE | DATES | FULL_MEAN_RET_IC | FULL_MED_RET_IC | FULL_RET_POS | FULL_MEAN_DD_IC | FULL_MED_DD_IC | NONOVERLAP_MEAN_RET_POS_OFFSETS | NONOVERLAP_MIN_MEAN_RET_IC | NONOVERLAP_MEAN_DD_POS_OFFSETS | NONOVERLAP_MIN_MEAN_DD_IC | LOO_POS_MEAN_RET | LOO_MIN_MEAN_RET | LOO_POS_MED_RET | LOO_MIN_MED_RET | LOO_POS_MEAN_DD | LOO_MIN_MEAN_DD | LOO_POS_TOPBOT_RET | LOO_MIN_TOPBOT_RET"];
  for(const [id,x] of Object.entries(candidates)){const f=x.full,n=x.nonOverlap,j=x.leaveOneOut.summary;lines.push(`${id} | ${f.dates} | ${f.meanReturnIC??"NA"} | ${f.medianReturnIC??"NA"} | ${f.returnPositiveDates}/${f.dates} | ${f.meanDrawdownIC??"NA"} | ${f.medianDrawdownIC??"NA"} | ${n.meanReturnPositiveOffsets}/5 | ${n.minMeanReturnIC??"NA"} | ${n.meanDrawdownPositiveOffsets}/5 | ${n.minMeanDrawdownIC??"NA"} | ${j.positiveMeanReturnOmissions}/11 | ${j.minMeanReturnIC??"NA"} | ${j.positiveMedianReturnOmissions}/11 | ${j.minMedianReturnIC??"NA"} | ${j.positiveMeanDrawdownOmissions}/11 | ${j.minMeanDrawdownIC??"NA"} | ${j.positiveMedianTopMinusBottomReturnOmissions}/11 | ${j.minMedianTopMinusBottomReturn??"NA"}`);}
  lines.push("","NON-OVERLAP OFFSET DETAIL");for(const [id,x] of Object.entries(candidates)){lines.push("",`[${id}]`,`OFFSET | DATES | MEAN_RET_IC | MED_RET_IC | MEAN_DD_IC | MED_DD_IC | MED_TOP_BOTTOM_RET`);for(const o of x.nonOverlap.offsets)lines.push(`${o.offset} | ${o.dates} | ${o.meanReturnIC??"NA"} | ${o.medianReturnIC??"NA"} | ${o.meanDrawdownIC??"NA"} | ${o.medianDrawdownIC??"NA"} | ${o.medianTopMinusBottomReturn??"NA"}`);}
  lines.push("","LEAVE-ONE-SECTOR-OUT DETAIL");for(const [id,x] of Object.entries(candidates)){lines.push("",`[${id}]`,`OMITTED | MEAN_RET_IC | MED_RET_IC | RET_POS | MEAN_DD_IC | MED_DD_IC | DD_POS | MED_TOP_BOTTOM_RET`);for(const [sectorId,v] of Object.entries(x.leaveOneOut.cases))lines.push(`${sectorId} | ${v.meanReturnIC??"NA"} | ${v.medianReturnIC??"NA"} | ${v.returnPositiveDates}/${v.dates} | ${v.meanDrawdownIC??"NA"} | ${v.medianDrawdownIC??"NA"} | ${v.drawdownPositiveDates}/${v.dates} | ${v.medianTopMinusBottomReturn??"NA"}`);}
  lines.push("","note=R21314_IDENTIFIED_TAIL_BALANCE_AS_THE_STRONGEST_CURRENT_CROSS_SECTIONAL_FWD5_SIGNAL","note=NON_OVERLAP_OFFSETS_REDUCE_SHARED_FWD5_HORIZON_BUT_EACH_OFFSET_HAS_ONLY_3_OR_4_DATES","note=LEAVE_ONE_OUT_CHECKS_Whether_ONE_SECTOR_DRIVES_THE_RESULT","note=TAIL_BALANCE_SOURCE_STABILITY_WAS_ALREADY_HIGH_IN_R21311_AND_IS_NOT_REESTIMATED_HERE","note=NO_CANDIDATE_SELECTION_THRESHOLD_OR_OPTIONS_EQUIVALENCE_CLAIM","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_OR_SCHEMA_CHANGE");
  fs.writeFileSync(path.join(base,`${OUT}.json`),JSON.stringify(report,null,2)+"\n");fs.writeFileSync(path.join(base,`${OUT}.txt`),lines.join("\n")+"\n");return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runSectorFearGreedR21315TailBalanceRobustness();console.log(JSON.stringify({status:r.status,jsonFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,`${OUT}.json`),txtFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,`${OUT}.txt`),providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,referenceRequirementChanged:r.referenceRequirementChanged,candidates:Object.fromEntries(Object.entries(r.candidates).map(([id,x])=>[id,{full:x.full,nonOverlap:x.nonOverlap,leaveOneOut:x.leaveOneOut.summary}]))},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
