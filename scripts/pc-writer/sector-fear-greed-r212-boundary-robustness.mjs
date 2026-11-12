import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv,buildPointInTimeSectorInputs} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {scoreRawAxis,buildCompositeSeries,alignSeries} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";
import {deriveR28RawAxes} from "./sector-fear-greed-r28-reference-window-diagnostic.mjs";
import {scoreRawAxisExpanding} from "./sector-fear-greed-r210-temporal-validation.mjs";
import {classifyR2111Band,smoothR2111Series} from "./sector-fear-greed-r2111-band-stability.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const PRICE_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const R6_HISTORY_NAME="local-breadth-r6-shadow-history.json";
const R7_HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const OUTPUT_JSON="local-sector-fear-greed-r212-boundary-robustness.json";
const OUTPUT_TXT="local-sector-fear-greed-r212-boundary-robustness.txt";
const WINDOW=252;
const BOUNDARIES=Object.freeze([25,45,56,76]);
const BUFFERS=Object.freeze([0,1,2,3,5]);
const AXIS_WEIGHTS=Object.freeze({trend:.20,breadth:.20,demand:.15,relativeStrength:.15,volatility:.15});
const AXIS_SPECS=Object.freeze({trend:{metrics:[{key:"m125",weight:.50},{key:"r60",weight:.30},{key:"r20",weight:.20}]},breadth:{metrics:[{key:"b50",weight:.35},{key:"b200",weight:.35},{key:"highLowNet",weight:.30}]},demand:{metrics:[{key:"vb5",weight:.60},{key:"vb20",weight:.40}]},relativeStrength:{metrics:[{key:"rs20",weight:.25},{key:"rs60",weight:.45},{key:"rs125",weight:.30}]},volatility:{metrics:[{key:"rv20",weight:.40,invert:true},{key:"dsv20",weight:.35,invert:true},{key:"dd63",weight:.25}]}});
const AXES=Object.keys(AXIS_WEIGHTS);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const round=value=>finite(value)?Math.round(value*10000)/10000:null;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function tableExists(db,name){return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(name));}
function putRow(map,row,source){const tradeDate=String(row?.tradeDate??row?.trade_date??row?.date??"").slice(0,10),ticker=String(row?.ticker??"").trim(),currentClose=Number(row?.currentClose??row?.current_close??row?.close),currentVolume=Number(row?.currentVolume??row?.current_volume??row?.volume);if(!validDate(tradeDate)||!ticker||!finite(currentClose)||currentClose<=0||!finite(currentVolume)||currentVolume<0)return;map.set(`${tradeDate}|${ticker}`,{tradeDate,ticker,currentClose,currentVolume,source});}
function readStorage(base){const map=new Map();for(const [name,source] of [[R7_HISTORY_NAME,"BREADTH_R7_LOCAL"],[R6_HISTORY_NAME,"BREADTH_R6_LOCAL"]]){const payload=safeJson(path.join(base,name));for(const row of payload?.rows??[])putRow(map,row,source);}const dbFile=path.join(base,"storage","core.sqlite");if(fs.existsSync(dbFile)){const db=new DatabaseSync(dbFile,{readOnly:true});db.exec("PRAGMA query_only=ON");try{if(tableExists(db,"market_score_breadth_b1_r3_current_v1")){for(const row of db.prepare("SELECT trade_date,ticker,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 ORDER BY trade_date,ticker").all())putRow(map,row,"B1_R3_STORED");}}finally{db.close();}}return [...map.values()];}
function normalizePriceRows(rows=[]){const map=new Map();for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),close=Number(row?.close??row?.currentClose??row?.current_close);if(validDate(date)&&finite(close)&&close>0)map.set(date,{date,close});}return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));}
function boundaryDistance(score){const value=Number(score);return finite(value)?Math.min(...BOUNDARIES.map(boundary=>Math.abs(value-boundary))):null;}
function annotatedPairs(rolling,expanding){return alignSeries(rolling,expanding).map(row=>{const a=classifyR2111Band(row.left),b=classifyR2111Band(row.right),distance=Math.min(boundaryDistance(row.left),boundaryDistance(row.right));return {...row,match:Boolean(a&&b&&a.index===b.index),ordinalDiff:a&&b?Math.abs(a.index-b.index):null,boundaryDistance:distance};}).filter(row=>finite(row.ordinalDiff)&&finite(row.boundaryDistance));}
function summarizeAnnotated(pairs){const n=pairs.length,match=pairs.filter(row=>row.match).length;return {n,matchCount:match,matchShare:round(n?match/n:null),mismatchCount:n-match,severeMismatchCount:pairs.filter(row=>row.ordinalDiff>=2).length,oppositeSideCount:pairs.filter(row=>row.ordinalDiff>=3).length};}
export function summarizeR212BoundaryRobustnessGroups(groups,buffers=BUFFERS){const pairs=[];for(const group of Array.isArray(groups)?groups:[])pairs.push(...annotatedPairs(group?.rolling??[],group?.expanding??[]));const baseline=summarizeAnnotated(pairs),byBuffer={};for(const rawBuffer of buffers){const buffer=Number(rawBuffer),eligible=pairs.filter(row=>row.boundaryDistance>buffer);byBuffer[String(buffer)]={...summarizeAnnotated(eligible),excludedNearBoundary:pairs.length-eligible.length};}const mismatches=pairs.filter(row=>!row.match),buckets={le1:0,gt1le2:0,gt2le3:0,gt3le5:0,gt5:0};for(const row of mismatches){const d=row.boundaryDistance;if(d<=1)buckets.le1++;else if(d<=2)buckets.gt1le2++;else if(d<=3)buckets.gt2le3++;else if(d<=5)buckets.gt3le5++;else buckets.gt5++;}return {baseline,byBuffer,mismatchDistanceBuckets:buckets};}

export function runSectorFearGreedR212BoundaryRobustness(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const pitPath=path.join(base,PIT_FILE),pricePath=path.join(base,PRICE_FILE);if(!fs.existsSync(pitPath))throw new Error("R212_PIT_HISTORY_MISSING");if(!fs.existsSync(pricePath))throw new Error("R212_IEX_PRICE_HISTORY_MISSING");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8")),storageRows=readStorage(base),derived=buildPointInTimeSectorInputs({rows:storageRows,pitHistory:pit}),pricePayload=safeJson(pricePath),series=pricePayload?.series??{},spyRows=normalizePriceRows(series.SPY??[]),groups=[],sectors={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const etfRows=normalizePriceRows(series[ticker]??[]),pitRows=derived.sectors[sectorId]??[],breadthRows=pitRows.filter(row=>[row?.b50,row?.b200,row?.highLowNet].every(finite)),demandRows=pitRows.filter(row=>finite(row?.volumeBreadth)),raw=deriveR28RawAxes({etfRows,spyRows,breadthRows,demandRows}),rollingAxes={},expandingAxes={};
    for(const axis of AXES){rollingAxes[axis]=scoreRawAxis(raw[axis],AXIS_SPECS[axis],WINDOW);expandingAxes[axis]=scoreRawAxisExpanding(raw[axis],AXIS_SPECS[axis],WINDOW);}
    const rolling=smoothR2111Series(buildCompositeSeries(rollingAxes,AXIS_WEIGHTS)),expanding=smoothR2111Series(buildCompositeSeries(expandingAxes,AXIS_WEIGHTS)),analysis=summarizeR212BoundaryRobustnessGroups([{rolling,expanding}]);groups.push({rolling,expanding});sectors[sectorId]={ticker,...analysis};
  }
  const pooled=summarizeR212BoundaryRobustnessGroups(groups),generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.12-BOUNDARY-ROBUSTNESS",generatedAt,status:"SHADOW_R212_BOUNDARY_ROBUSTNESS_COMPLETE",mode:"SHADOW_RESEARCH_ONLY",providerCalls:0,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,testedReferenceWindow:252,candidateSelected:false,boundaryBuffers:[...BUFFERS],comparator:"EXPANDING_HISTORY_AVAILABLE_AT_EACH_DATE_NOT_756",pooled,sectors};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.12 BOUNDARY ROBUSTNESS",`generatedAt=${generatedAt}`,`status=${report.status}`,"approvedR1ReferenceRequirement=756 (UNCHANGED)","testedReferenceWindow=252","candidateSelected=false","providerCalls=0 publicMutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false referenceRequirementChanged=false","",`BASELINE n=${pooled.baseline.n} matchShare=${pooled.baseline.matchShare??"NA"} mismatch=${pooled.baseline.mismatchCount} severe=${pooled.baseline.severeMismatchCount}`,`MISMATCH_DISTANCE le1=${pooled.mismatchDistanceBuckets.le1} gt1le2=${pooled.mismatchDistanceBuckets.gt1le2} gt2le3=${pooled.mismatchDistanceBuckets.gt2le3} gt3le5=${pooled.mismatchDistanceBuckets.gt3le5} gt5=${pooled.mismatchDistanceBuckets.gt5}`,"","BUFFER | ELIGIBLE_N | MATCH_SHARE | MISMATCH | EXCLUDED_NEAR_BOUNDARY"];
  for(const buffer of BUFFERS){const s=pooled.byBuffer[String(buffer)];lines.push(`${buffer} | ${s.n} | ${s.matchShare??"NA"} | ${s.mismatchCount} | ${s.excludedNearBoundary}`);}lines.push("","SECTOR | BASE_MATCH | BUFFER3_N | BUFFER3_MATCH | BUFFER3_MISMATCH | GT5_MISMATCH");for(const [sectorId,item] of Object.entries(sectors)){const b3=item.byBuffer["3"];lines.push(`${sectorId} | ${item.baseline.matchShare??"NA"} | ${b3.n} | ${b3.matchShare??"NA"} | ${b3.mismatchCount} | ${item.mismatchDistanceBuckets.gt5}`);}lines.push("","note=BUFFER_FILTER_IS_DIAGNOSTIC_ONLY_NOT_A_PRODUCTION_HYSTERESIS_RULE","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_OR_REFERENCE_CHANGE");
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,lines.join("\n")+"\n");return {status:report.status,jsonFile,txtFile,providerCalls:0,publicMutation:false,productionFormulaChanged:false,referenceRequirementChanged:false,pooled:report.pooled};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(runSectorFearGreedR212BoundaryRobustness(),null,2));}catch(error){const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R212_BOUNDARY_ROBUSTNESS_FAILED";console.log(JSON.stringify({status:"FAILED",code,errorName:String(error?.name??"Error"),providerCalls:0,publicMutation:false,productionFormulaChanged:false,referenceRequirementChanged:false}));process.exitCode=1;}}
