import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {buildR2138OutcomeRows} from "./sector-fear-greed-r2138-economic-regime-validation.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const R21311_JSON="local-sector-fear-greed-r21311-orthogonality-economic-diagnostic.json";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INV_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const OUT="local-sector-fear-greed-r21314-cross-sectional-fwd5-ic";
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
function median(values){const a=values.filter(finite).sort((x,y)=>x-y);if(!a.length)return null;const i=(a.length-1)/2,l=Math.floor(i),h=Math.ceil(i);return l===h?a[l]:(a[l]+a[h])/2;}
function json(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function scoreRows(rows=[]){return (Array.isArray(rows)?rows:[]).map(r=>({date:String(r?.date??"").slice(0,10),score:Number(r?.score)})).filter(r=>validDate(r.date)&&finite(r.score)).sort((a,b)=>a.date.localeCompare(b.date));}

function ranks(values){
  const indexed=values.map((value,index)=>({value,index})).sort((a,b)=>a.value-b.value),out=new Array(values.length);
  for(let i=0;i<indexed.length;){let j=i+1;while(j<indexed.length&&indexed[j].value===indexed[i].value)j++;const rank=((i+1)+j)/2;for(let k=i;k<j;k++)out[indexed[k].index]=rank;i=j;}
  return out;
}
function pearson(a,b){
  if(a.length!==b.length||a.length<2)return null;const ma=mean(a),mb=mean(b);let num=0,da=0,db=0;
  for(let i=0;i<a.length;i++){const xa=a[i]-ma,xb=b[i]-mb;num+=xa*xb;da+=xa*xa;db+=xb*xb;}
  return da>0&&db>0?num/Math.sqrt(da*db):null;
}
export function spearmanR21314(a=[],b=[]){
  const pairs=[];for(let i=0;i<Math.min(a.length,b.length);i++)if(finite(a[i])&&finite(b[i]))pairs.push([a[i],b[i]]);
  if(pairs.length<3)return null;return round(pearson(ranks(pairs.map(x=>x[0])),ranks(pairs.map(x=>x[1]))));
}

export function summarizeR21314Date(rows=[]){
  const clean=(Array.isArray(rows)?rows:[]).filter(r=>finite(r?.score));
  const ret=clean.filter(r=>finite(r.forwardReturn5)),dd=clean.filter(r=>finite(r.forwardDrawdown5));
  const retIc=spearmanR21314(ret.map(r=>r.score),ret.map(r=>r.forwardReturn5));
  const ddIc=spearmanR21314(dd.map(r=>r.score),dd.map(r=>r.forwardDrawdown5));
  const spread=arr=>{
    if(arr.length<6)return null;const sorted=[...arr].sort((a,b)=>a.score-b.score),k=Math.min(3,Math.floor(sorted.length/2)),low=sorted.slice(0,k),high=sorted.slice(-k);
    return {k,topMinusBottomReturn:round(mean(high.map(r=>r.forwardReturn5))-mean(low.map(r=>r.forwardReturn5))),topMinusBottomDrawdown:round(mean(high.map(r=>r.forwardDrawdown5))-mean(low.map(r=>r.forwardDrawdown5)))};
  };
  const both=clean.filter(r=>finite(r.forwardReturn5)&&finite(r.forwardDrawdown5));
  return {sectors:clean.length,returnN:ret.length,drawdownN:dd.length,returnIC:retIc,drawdownIC:ddIc,spread:spread(both)};
}

function aggregate(dates={}){
  const rows=Object.values(dates),pick=k=>rows.map(r=>r[k]).filter(finite),ret=pick("returnIC"),dd=pick("drawdownIC"),sectorN=rows.map(r=>r.sectors).filter(finite),retSpread=rows.map(r=>r.spread?.topMinusBottomReturn).filter(finite),ddSpread=rows.map(r=>r.spread?.topMinusBottomDrawdown).filter(finite);
  return {dates:rows.length,minSectors:sectorN.length?Math.min(...sectorN):0,medianSectors:round(median(sectorN)),returnEligibleDates:ret.length,drawdownEligibleDates:dd.length,medianReturnIC:round(median(ret)),meanReturnIC:round(mean(ret)),medianAbsReturnIC:round(median(ret.map(Math.abs))),returnPositiveDates:ret.filter(x=>x>0).length,returnNegativeDates:ret.filter(x=>x<0).length,medianDrawdownIC:round(median(dd)),meanDrawdownIC:round(mean(dd)),medianAbsDrawdownIC:round(median(dd.map(Math.abs))),drawdownPositiveDates:dd.filter(x=>x>0).length,drawdownNegativeDates:dd.filter(x=>x<0).length,medianTopMinusBottomReturn:round(median(retSpread)),medianTopMinusBottomDrawdown:round(median(ddSpread))};
}

export function runSectorFearGreedR21314CrossSectionalFwd5Ic(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  for(const name of [R21311_JSON,IEX_FILE,INV_FILE])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21314_INPUT_MISSING:${name}`);
  const prior=json(path.join(base,R21311_JSON));
  if(prior?.status!=="SHADOW_R21311_ORTHOGONALITY_ECONOMIC_DIAGNOSTIC_COMPLETE")throw new Error("R21314_R21311_NOT_COMPLETE");
  const iex=json(path.join(base,IEX_FILE)),inv=json(path.join(base,INV_FILE)),repair=buildR2134RepairedBenchmarks(iex?.series??{},inv),candidates={};
  for(const id of prior.candidates??Object.keys(prior.detail??{})){
    const byDate=new Map();
    for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
      const item=prior?.detail?.[id]?.sectors?.[sectorId],residual=scoreRows(item?.residual?.residual??[]),outcomes=buildR2138OutcomeRows(residual,repair.series[ticker]??[]);
      for(const row of outcomes){
        if(!validDate(row.date)||!finite(row.score)||(!finite(row.forwardReturn5)&&!finite(row.forwardDrawdown5)))continue;
        if(!byDate.has(row.date))byDate.set(row.date,[]);
        byDate.get(row.date).push({sectorId,ticker,score:row.score,forwardReturn5:row.forwardReturn5,forwardDrawdown5:row.forwardDrawdown5});
      }
    }
    const dates={};for(const [date,rows] of [...byDate.entries()].sort((a,b)=>a[0].localeCompare(b[0])))dates[date]=summarizeR21314Date(rows);
    candidates[id]={summary:aggregate(dates),dates};
  }
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.13.14-CROSS-SECTIONAL-FWD5-IC",generatedAt,status:"SHADOW_R21314_CROSS_SECTIONAL_FWD5_IC_COMPLETE",mode:"LOCAL_READ_ONLY_CROSS_SECTIONAL_SHORT_HORIZON_DIAGNOSTIC",providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,fillForwardFill:false,sourceFilesMutated:false,candidateSelected:false,selectionThresholdIntroduced:false,optionsEquivalenceClaimed:false,newFormulaIntroduced:false,residualizationChanged:false,referenceWindowChanged:false,diagnosticOnly:true,interpretationPolicy:"DESCRIPTIVE_ONLY_CROSS_SECTIONAL_IC_NOT_A_SELECTION_RULE",repair:{targetDate:repair.targetDate,complete:repair.complete,injected:repair.injected.length},candidates};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.14 CROSS-SECTIONAL FWD5 IC",`generatedAt=${generatedAt}`,`status=${report.status}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false","productionFormulaChanged=false dbSchemaChanged=false schedulerChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)","fillForwardFill=false sourceFilesMutated=false candidateSelected=false selectionThresholdIntroduced=false","optionsEquivalenceClaimed=false newFormulaIntroduced=false residualizationChanged=false referenceWindowChanged=false diagnosticOnly=true",`repair targetDate=${report.repair.targetDate} complete=${report.repair.complete} injected=${report.repair.injected}`,`interpretationPolicy=${report.interpretationPolicy}`,"","CANDIDATE | DATES | MIN_SECTORS | MED_SECTORS | RET_ELIG | MED_RET_IC | MEAN_RET_IC | MED_ABS_RET_IC | RET_POS | RET_NEG | DD_ELIG | MED_DD_IC | MEAN_DD_IC | MED_ABS_DD_IC | DD_POS | DD_NEG | MED_TOP_BOTTOM_RET | MED_TOP_BOTTOM_DD"];
  for(const [id,bucket] of Object.entries(candidates)){const s=bucket.summary;lines.push(`${id} | ${s.dates} | ${s.minSectors} | ${s.medianSectors??"NA"} | ${s.returnEligibleDates} | ${s.medianReturnIC??"NA"} | ${s.meanReturnIC??"NA"} | ${s.medianAbsReturnIC??"NA"} | ${s.returnPositiveDates} | ${s.returnNegativeDates} | ${s.drawdownEligibleDates} | ${s.medianDrawdownIC??"NA"} | ${s.meanDrawdownIC??"NA"} | ${s.medianAbsDrawdownIC??"NA"} | ${s.drawdownPositiveDates} | ${s.drawdownNegativeDates} | ${s.medianTopMinusBottomReturn??"NA"} | ${s.medianTopMinusBottomDrawdown??"NA"}`);}
  lines.push("","DATE DETAIL");
  for(const [id,bucket] of Object.entries(candidates)){
    lines.push("",`[${id}]`,`DATE | SECTORS | RET_N | RET_IC | DD_N | DD_IC | TOP_BOTTOM_RET | TOP_BOTTOM_DD`);
    for(const [date,x] of Object.entries(bucket.dates))lines.push(`${date} | ${x.sectors} | ${x.returnN} | ${finite(x.returnIC)?x.returnIC:"NA"} | ${x.drawdownN} | ${finite(x.drawdownIC)?x.drawdownIC:"NA"} | ${finite(x.spread?.topMinusBottomReturn)?x.spread.topMinusBottomReturn:"NA"} | ${finite(x.spread?.topMinusBottomDrawdown)?x.spread.topMinusBottomDrawdown:"NA"}`);
  }
  lines.push("","note=CROSS_SECTIONAL_IC_USES_ONLY_THE_CURRENTLY_MATURE_FWD5_HORIZON","note=EACH_DATE_RANKS_SECTORS_AGAINST_OTHER_SECTORS_SO_COMMON_MARKET_LEVEL_DOES_NOT_DRIVE_RETURN_RANKS","note=NO_SHORTENING_OF_252_REFERENCE_WINDOW_AND_NO_CHANGE_TO_RESIDUALIZATION","note=NO_CANDIDATE_SELECTION_THRESHOLD_OR_OPTIONS_EQUIVALENCE_CLAIM","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_OR_SCHEMA_CHANGE");
  fs.writeFileSync(path.join(base,`${OUT}.json`),JSON.stringify(report,null,2)+"\n");
  fs.writeFileSync(path.join(base,`${OUT}.txt`),lines.join("\n")+"\n");
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const r=runSectorFearGreedR21314CrossSectionalFwd5Ic();console.log(JSON.stringify({status:r.status,jsonFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,`${OUT}.json`),txtFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,`${OUT}.txt`),providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,referenceRequirementChanged:r.referenceRequirementChanged,candidates:Object.fromEntries(Object.entries(r.candidates).map(([id,x])=>[id,x.summary]))},null,2));}
  catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}
}
