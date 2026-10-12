import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {rankCorrelationByKey} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const INPUT_JSON="local-sector-fear-greed-r28-reference-window-diagnostic.json";
const OUTPUT_JSON="local-sector-fear-greed-r29-window-stability-diagnostic.json";
const OUTPUT_TXT="local-sector-fear-greed-r29-window-stability-diagnostic.txt";
const AXES=Object.freeze(["trend","breadth","demand","relativeStrength","volatility"]);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const round=value=>finite(value)?Math.round(value*10000)/10000:null;
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
function median(values){const x=values.filter(finite).sort((a,b)=>a-b);if(!x.length)return null;const m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2;}
function maxWithKey(entries){const clean=entries.filter(([,value])=>finite(value));if(!clean.length)return {key:null,value:null};clean.sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0])));return {key:clean[0][0],value:clean[0][1]};}
function minWindow(deltas,windows){const pairs=windows.map(window=>[String(window),Number(deltas?.[String(window)])]).filter(([,value])=>finite(value));if(!pairs.length)return null;pairs.sort((a,b)=>a[1]-b[1]||Number(b[0])-Number(a[0]));return pairs[0][0];}

export function analyzeR29WindowStability(input){
  if(!input||input.status!=="SHADOW_R28_REFERENCE_WINDOW_COMPLETE")throw new Error("R29_R28_INPUT_NOT_READY");
  const windows=(Array.isArray(input.testedWindows)?input.testedWindows:[]).map(Number).filter(Number.isInteger).sort((a,b)=>a-b);
  if(windows.length<2)throw new Error("R29_WINDOWS_INSUFFICIENT");
  const sectors=input.sectors&&typeof input.sectors==="object"?input.sectors:{};
  const sectorIds=Object.keys(sectors).sort();
  if(sectorIds.length<3)throw new Error("R29_SECTORS_INSUFFICIENT");

  const axisSummary={};
  for(const axis of AXES){
    const byWindow={};
    const winCounts=Object.fromEntries(windows.map(window=>[String(window),0]));
    const spreads=[];
    for(const window of windows){
      const key=String(window),deltas=[],windowScores={},fullScores={};
      for(const sectorId of sectorIds){
        const sector=sectors[sectorId],item=sector?.byWindow?.[key],delta=Number(item?.axisDeltasVsFull?.[axis]),current=Number(item?.currentAxes?.[axis]),full=Number(sector?.fullAvailable?.currentAxes?.[axis]);
        if(finite(delta))deltas.push(delta);
        if(finite(current)&&finite(full)){windowScores[sectorId]=current;fullScores[sectorId]=full;}
      }
      byWindow[key]={n:deltas.length,meanAbsDeltaVsFull:round(deltas.length?mean(deltas):null),medianAbsDeltaVsFull:round(median(deltas)),maxAbsDeltaVsFull:round(deltas.length?Math.max(...deltas):null),rankSpearmanVsFull:round(rankCorrelationByKey(windowScores,fullScores))};
    }
    for(const sectorId of sectorIds){
      const sector=sectors[sectorId],values=windows.map(window=>Number(sector?.byWindow?.[String(window)]?.currentAxes?.[axis])).filter(finite);
      if(values.length===windows.length)spreads.push([sectorId,Math.max(...values)-Math.min(...values)]);
      const deltas=Object.fromEntries(windows.map(window=>[String(window),sector?.byWindow?.[String(window)]?.axisDeltasVsFull?.[axis]]));
      const winner=minWindow(deltas,windows);if(winner)winCounts[winner]++;
    }
    const worst=maxWithKey(spreads);
    axisSummary[axis]={byWindow,closestToFullCounts:winCounts,currentWindowSpread:{n:spreads.length,mean:round(spreads.length?mean(spreads.map(([,v])=>v)):null),median:round(median(spreads.map(([,v])=>v))),max:round(worst.value),worstSector:worst.key}};
  }

  const compositeSpreads=[],compositeWins=Object.fromEntries(windows.map(window=>[String(window),0]));
  for(const sectorId of sectorIds){
    const sector=sectors[sectorId],values=windows.map(window=>Number(sector?.byWindow?.[String(window)]?.compositeCurrent)).filter(finite);
    if(values.length===windows.length)compositeSpreads.push([sectorId,Math.max(...values)-Math.min(...values)]);
    const deltas=Object.fromEntries(windows.map(window=>[String(window),sector?.byWindow?.[String(window)]?.compositeDeltaVsFull]));
    const winner=minWindow(deltas,windows);if(winner)compositeWins[winner]++;
  }
  const compositeWorst=maxWithKey(compositeSpreads);
  const compositeSummary={closestToFullCounts:compositeWins,currentWindowSpread:{n:compositeSpreads.length,mean:round(compositeSpreads.length?mean(compositeSpreads.map(([,v])=>v)):null),median:round(median(compositeSpreads.map(([,v])=>v))),max:round(compositeWorst.value),worstSector:compositeWorst.key},byWindow:Object.fromEntries(windows.map(window=>[String(window),input.summaryByWindow?.[String(window)]??null]))};
  return {windows,sectorCount:sectorIds.length,axisSummary,compositeSummary};
}

export function runSectorFearGreedR29WindowStabilityDiagnostic(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const inputFile=path.join(base,INPUT_JSON);if(!fs.existsSync(inputFile))throw new Error("R29_R28_JSON_MISSING");
  let input;try{input=JSON.parse(fs.readFileSync(inputFile,"utf8"));}catch{throw new Error("R29_R28_JSON_INVALID");}
  const analysis=analyzeR29WindowStability(input),generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const report={version:"R2.9-WINDOW-STABILITY",generatedAt,status:"SHADOW_R29_WINDOW_STABILITY_COMPLETE",mode:"SHADOW_RESEARCH_ONLY",providerCalls:0,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,candidateSelected:false,inputVersion:input.version??null,...analysis};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.9 WINDOW STABILITY",`generatedAt=${generatedAt}`,`status=${report.status}`,"approvedR1ReferenceRequirement=756 (UNCHANGED)",`windows=${report.windows.join(",")}`,"candidateSelected=false","providerCalls=0 publicMutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false referenceRequirementChanged=false","",`COMPOSITE_SPREAD mean=${report.compositeSummary.currentWindowSpread.mean??"NA"} median=${report.compositeSummary.currentWindowSpread.median??"NA"} max=${report.compositeSummary.currentWindowSpread.max??"NA"} worstSector=${report.compositeSummary.currentWindowSpread.worstSector??"NA"}`,`COMPOSITE_CLOSEST_COUNTS ${Object.entries(report.compositeSummary.closestToFullCounts).map(([w,n])=>`${w}:${n}`).join(" ")}`,"","AXIS | WINDOW | MEAN_ABS_DELTA_FULL | MEDIAN_ABS_DELTA_FULL | MAX_ABS_DELTA_FULL | RANK_SPEARMAN_FULL | CLOSEST_COUNT | SPREAD_MEAN | SPREAD_MAX | WORST_SECTOR"];
  for(const axis of AXES){for(const window of report.windows){const key=String(window),s=report.axisSummary[axis].byWindow[key],spread=report.axisSummary[axis].currentWindowSpread;lines.push(`${axis} | ${window} | ${s.meanAbsDeltaVsFull??"NA"} | ${s.medianAbsDeltaVsFull??"NA"} | ${s.maxAbsDeltaVsFull??"NA"} | ${s.rankSpearmanVsFull??"NA"} | ${report.axisSummary[axis].closestToFullCounts[key]} | ${spread.mean??"NA"} | ${spread.max??"NA"} | ${spread.worstSector??"NA"}`);}}
  lines.push("","note=R2_9_AGGREGATES_R2_8_ONLY_AND_SELECTS_NO_REFERENCE_WINDOW","note=FULL_AVAILABLE_REMAINS_ENDPOINT_COMPARATOR_NOT_APPROVED_SCORING_RULE","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_OR_REFERENCE_CHANGE");
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,lines.join("\n")+"\n");return {status:report.status,jsonFile,txtFile,providerCalls:0,publicMutation:false,productionFormulaChanged:false,referenceRequirementChanged:false,compositeSummary:report.compositeSummary,axisSummary:report.axisSummary};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(runSectorFearGreedR29WindowStabilityDiagnostic(),null,2));}catch(error){const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R29_WINDOW_STABILITY_FAILED";console.log(JSON.stringify({status:"FAILED",code,errorName:String(error?.name??"Error"),providerCalls:0,publicMutation:false,productionFormulaChanged:false,referenceRequirementChanged:false}));process.exitCode=1;}}