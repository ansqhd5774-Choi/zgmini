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

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const PRICE_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const R6_HISTORY_NAME="local-breadth-r6-shadow-history.json";
const R7_HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const OUTPUT_JSON="local-sector-fear-greed-r211-band-stability.json";
const OUTPUT_TXT="local-sector-fear-greed-r211-band-stability.txt";
const WINDOW=252;
const SMOOTH_ALPHA=.5;
const AXIS_WEIGHTS=Object.freeze({trend:.20,breadth:.20,demand:.15,relativeStrength:.15,volatility:.15});
const AXIS_SPECS=Object.freeze({
  trend:{metrics:[{key:"m125",weight:.50},{key:"r60",weight:.30},{key:"r20",weight:.20}]},
  breadth:{metrics:[{key:"b50",weight:.35},{key:"b200",weight:.35},{key:"highLowNet",weight:.30}]},
  demand:{metrics:[{key:"vb5",weight:.60},{key:"vb20",weight:.40}]},
  relativeStrength:{metrics:[{key:"rs20",weight:.25},{key:"rs60",weight:.45},{key:"rs125",weight:.30}]},
  volatility:{metrics:[{key:"rv20",weight:.40,invert:true},{key:"dsv20",weight:.35,invert:true},{key:"dd63",weight:.25}]},
});
const AXES=Object.keys(AXIS_WEIGHTS);
const BAND_NAMES=Object.freeze(["EXTREME_FEAR","FEAR","NEUTRAL","GREED","EXTREME_GREED"]);
const BAND_BOUNDARIES=Object.freeze([25,45,56,76]);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const round=value=>finite(value)?Math.round(value*10000)/10000:null;
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
function quantile(values,p){const x=values.filter(finite).sort((a,b)=>a-b);if(!x.length)return null;const pos=(x.length-1)*p,lo=Math.floor(pos),hi=Math.ceil(pos);return lo===hi?x[lo]:x[lo]+(x[hi]-x[lo])*(pos-lo);}
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function validDate(value){return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));}
function tableExists(db,name){return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(name));}
function putRow(map,row,source,diagnostics){
  const tradeDate=String(row?.tradeDate??row?.trade_date??row?.date??"").slice(0,10);
  const ticker=String(row?.ticker??"").trim();
  const currentClose=Number(row?.currentClose??row?.current_close??row?.close);
  const currentVolume=Number(row?.currentVolume??row?.current_volume??row?.volume);
  if(!validDate(tradeDate)||!ticker||!finite(currentClose)||currentClose<=0||!finite(currentVolume)||currentVolume<0)return;
  const key=`${tradeDate}|${ticker}`,old=map.get(key);
  if(old&&(old.currentClose!==currentClose||old.currentVolume!==currentVolume)){
    diagnostics.conflicts++;
    const transition=`${old.source}->${source}`;
    diagnostics.overrides[transition]=(diagnostics.overrides[transition]??0)+1;
  }
  map.set(key,{tradeDate,ticker,currentClose,currentVolume,source});
}
function readStorage(base){
  const map=new Map(),diagnostics={conflicts:0,overrides:{}};
  for(const [name,source] of [[R7_HISTORY_NAME,"BREADTH_R7_LOCAL"],[R6_HISTORY_NAME,"BREADTH_R6_LOCAL"]]){
    const payload=safeJson(path.join(base,name));
    for(const row of payload?.rows??[])putRow(map,row,source,diagnostics);
  }
  const dbFile=path.join(base,"storage","core.sqlite");
  if(fs.existsSync(dbFile)){
    const db=new DatabaseSync(dbFile,{readOnly:true});
    db.exec("PRAGMA query_only=ON");
    try{
      if(tableExists(db,"market_score_breadth_b1_r3_current_v1")){
        for(const row of db.prepare("SELECT trade_date,ticker,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 ORDER BY trade_date,ticker").all())putRow(map,row,"B1_R3_STORED",diagnostics);
      }
    }finally{db.close();}
  }
  return {rows:[...map.values()],diagnostics};
}
function normalizePriceRows(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),close=Number(row?.close??row?.currentClose??row?.current_close);
    if(validDate(date)&&finite(close)&&close>0)map.set(date,{date,close});
  }
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

export function classifyR211Band(score){
  const value=Number(score);if(!finite(value))return null;
  const index=value<25?0:value<45?1:value<56?2:value<76?3:4;
  return {index,name:BAND_NAMES[index]};
}
export function smoothR211Series(rows,alpha=SMOOTH_ALPHA){
  const a=Number(alpha);if(!finite(a)||a<0||a>1)return [];
  const source=(Array.isArray(rows)?rows:[]).filter(row=>validDate(row?.date)&&finite(Number(row?.score))).sort((x,y)=>x.date.localeCompare(y.date));
  const out=[];let previous=null;
  for(const row of source){const raw=Number(row.score),score=previous===null?raw:a*raw+(1-a)*previous;out.push({date:row.date,score});previous=score;}
  return out;
}
function nearestBoundaryDistance(score){const value=Number(score);return finite(value)?Math.min(...BAND_BOUNDARIES.map(boundary=>Math.abs(value-boundary))):null;}
function side(index){return index<=1?"FEAR":index===2?"NEUTRAL":"GREED";}
export function summarizeR211BandPairs(rolling,expanding){
  const pairs=alignSeries(rolling,expanding);
  if(!pairs.length)return {n:0,matchCount:0,matchShare:null,mismatchCount:0,severeMismatchCount:0,oppositeSideCount:0,meanOrdinalDiff:null,maxOrdinalDiff:null,mismatchBoundaryDistanceMedian:null,current:null};
  let matchCount=0,severeMismatchCount=0,oppositeSideCount=0;const ordinalDiffs=[],mismatchBoundaryDistances=[];
  let current=null;
  for(const row of pairs){
    const left=classifyR211Band(row.left),right=classifyR211Band(row.right);if(!left||!right)continue;
    const diff=Math.abs(left.index-right.index);ordinalDiffs.push(diff);if(diff===0)matchCount++;else{if(diff>=2)severeMismatchCount++;if(side(left.index)!=="NEUTRAL"&&side(right.index)!=="NEUTRAL"&&side(left.index)!==side(right.index))oppositeSideCount++;const d=Math.min(nearestBoundaryDistance(row.left),nearestBoundaryDistance(row.right));if(finite(d))mismatchBoundaryDistances.push(d);}
    current={date:row.date,rollingScore:round(row.left),expandingScore:round(row.right),rollingBand:left.name,expandingBand:right.name,ordinalDiff:diff};
  }
  const n=ordinalDiffs.length,mismatchCount=n-matchCount;
  return {n,matchCount,matchShare:round(n?matchCount/n:null),mismatchCount,severeMismatchCount,oppositeSideCount,meanOrdinalDiff:round(n?mean(ordinalDiffs):null),maxOrdinalDiff:n?Math.max(...ordinalDiffs):null,mismatchBoundaryDistanceMedian:round(quantile(mismatchBoundaryDistances,.5)),current};
}
function pooledBandSummary(groups){return summarizeR211BandPairs(groups.flatMap(group=>group.rolling),groups.flatMap(group=>group.expanding));}
function dailyAgreement(sectorPairs){
  const byDate=new Map();
  for(const [sectorId,pair] of Object.entries(sectorPairs)){
    const expandingMap=new Map(pair.expanding.map(row=>[row.date,row.score]));
    for(const row of pair.rolling){if(!expandingMap.has(row.date))continue;const slot=byDate.get(row.date)??[];slot.push({sectorId,rolling:row.score,expanding:expandingMap.get(row.date)});byDate.set(row.date,slot);}
  }
  const rows=[];
  for(const [date,items] of [...byDate.entries()].sort(([a],[b])=>a.localeCompare(b))){let match=0;for(const item of items){const a=classifyR211Band(item.rolling),b=classifyR211Band(item.expanding);if(a&&b&&a.index===b.index)match++;}if(items.length)rows.push({date,n:items.length,matchShare:match/items.length});}
  const shares=rows.map(row=>row.matchShare);let minRow=null;for(const row of rows){if(!minRow||row.matchShare<minRow.matchShare)minRow=row;}
  return {nDates:rows.length,meanMatchShare:round(shares.length?mean(shares):null),medianMatchShare:round(quantile(shares,.5)),minMatchShare:round(minRow?.matchShare),minDate:minRow?.date??null,lastMatchShare:round(rows.at(-1)?.matchShare),firstDate:rows[0]?.date??null,lastDate:rows.at(-1)?.date??null};
}

export function runSectorFearGreedR211BandStability(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const pitPath=path.join(base,PIT_FILE),pricePath=path.join(base,PRICE_FILE);
  if(!fs.existsSync(pitPath))throw new Error("R211_PIT_HISTORY_MISSING");
  if(!fs.existsSync(pricePath))throw new Error("R211_IEX_PRICE_HISTORY_MISSING");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8")),storage=readStorage(base),derived=buildPointInTimeSectorInputs({rows:storage.rows,pitHistory:pit});
  const pricePayload=safeJson(pricePath),series=pricePayload?.series??{},spyRows=normalizePriceRows(series.SPY??[]),sectors={},rawGroups=[],smoothedGroups=[],smoothedSectorPairs={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const etfRows=normalizePriceRows(series[ticker]??[]),pitRows=derived.sectors[sectorId]??[],breadthRows=pitRows.filter(row=>[row?.b50,row?.b200,row?.highLowNet].every(finite)),demandRows=pitRows.filter(row=>finite(row?.volumeBreadth)),raw=deriveR28RawAxes({etfRows,spyRows,breadthRows,demandRows}),rollingAxes={},expandingAxes={};
    for(const axis of AXES){rollingAxes[axis]=scoreRawAxis(raw[axis],AXIS_SPECS[axis],WINDOW);expandingAxes[axis]=scoreRawAxisExpanding(raw[axis],AXIS_SPECS[axis],WINDOW);}
    const rollingRaw=buildCompositeSeries(rollingAxes,AXIS_WEIGHTS),expandingRaw=buildCompositeSeries(expandingAxes,AXIS_WEIGHTS),rollingSmoothed=smoothR211Series(rollingRaw),expandingSmoothed=smoothR211Series(expandingRaw),rawBand=summarizeR211BandPairs(rollingRaw,expandingRaw),smoothedBand=summarizeR211BandPairs(rollingSmoothed,expandingSmoothed);
    rawGroups.push({rolling:rollingRaw,expanding:expandingRaw});smoothedGroups.push({rolling:rollingSmoothed,expanding:expandingSmoothed});smoothedSectorPairs[sectorId]={rolling:rollingSmoothed,expanding:expandingSmoothed};
    sectors[sectorId]={ticker,rawBand,smoothedBand,dateStart:rollingSmoothed[0]?.date??null,dateEnd:rollingSmoothed.at(-1)?.date??null};
  }
  const rawPooled=pooledBandSummary(rawGroups),smoothedPooled=pooledBandSummary(smoothedGroups),dailySmoothedAgreement=dailyAgreement(smoothedSectorPairs),generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const report={version:"R2.11-252-SMOOTHED-BAND-STABILITY",generatedAt,status:"SHADOW_R211_BAND_STABILITY_COMPLETE",mode:"SHADOW_RESEARCH_ONLY",providerCalls:0,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,testedReferenceWindow:252,candidateSelected:false,comparator:"EXPANDING_HISTORY_AVAILABLE_AT_EACH_DATE_NOT_756",approvedSmoothing:{alphaCurrent:.5,alphaPrevious:.5},bandCutpoints:[25,45,56,76],no85PercentRenormalization:true,rawPooled,smoothedPooled,dailySmoothedAgreement,sectors};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.11 252-DAY SMOOTHED BAND STABILITY",`generatedAt=${generatedAt}`,`status=${report.status}`,"approvedR1ReferenceRequirement=756 (UNCHANGED)","testedReferenceWindow=252","candidateSelected=false","comparator=EXPANDING_HISTORY_AVAILABLE_AT_EACH_DATE_NOT_756","approvedSmoothing=0.5*RAW+0.5*PREVIOUS","bands=<25 ExtremeFear, <45 Fear, <56 Neutral, <76 Greed, else ExtremeGreed","providerCalls=0 publicMutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false referenceRequirementChanged=false","",`RAW_POOLED n=${rawPooled.n} match=${rawPooled.matchCount} share=${rawPooled.matchShare??"NA"} mismatch=${rawPooled.mismatchCount} severe=${rawPooled.severeMismatchCount} oppositeSide=${rawPooled.oppositeSideCount} meanOrdinalDiff=${rawPooled.meanOrdinalDiff??"NA"} maxOrdinalDiff=${rawPooled.maxOrdinalDiff??"NA"}`,`SMOOTHED_POOLED n=${smoothedPooled.n} match=${smoothedPooled.matchCount} share=${smoothedPooled.matchShare??"NA"} mismatch=${smoothedPooled.mismatchCount} severe=${smoothedPooled.severeMismatchCount} oppositeSide=${smoothedPooled.oppositeSideCount} meanOrdinalDiff=${smoothedPooled.meanOrdinalDiff??"NA"} maxOrdinalDiff=${smoothedPooled.maxOrdinalDiff??"NA"} mismatchBoundaryMedian=${smoothedPooled.mismatchBoundaryDistanceMedian??"NA"}`,`DAILY_SMOOTHED_MATCH nDates=${dailySmoothedAgreement.nDates} mean=${dailySmoothedAgreement.meanMatchShare??"NA"} median=${dailySmoothedAgreement.medianMatchShare??"NA"} min=${dailySmoothedAgreement.minMatchShare??"NA"} minDate=${dailySmoothedAgreement.minDate??"NA"} last=${dailySmoothedAgreement.lastMatchShare??"NA"}`,"","SECTOR | N | MATCH_SHARE | MISMATCH | SEVERE | OPPOSITE_SIDE | BOUNDARY_MEDIAN | CURRENT_ROLLING | CURRENT_EXPANDING | CURRENT_BANDS"];
  for(const [sectorId,item] of Object.entries(sectors)){const s=item.smoothedBand,c=s.current;lines.push(`${sectorId} | ${s.n} | ${s.matchShare??"NA"} | ${s.mismatchCount} | ${s.severeMismatchCount} | ${s.oppositeSideCount} | ${s.mismatchBoundaryDistanceMedian??"NA"} | ${c?.rollingScore??"NA"} | ${c?.expandingScore??"NA"} | ${c?.rollingBand??"NA"}/${c?.expandingBand??"NA"}`);}
  lines.push("","note=R2_11_TESTS_USER_FACING_APPROVED_SMOOTHING_AND_EXISTING_BAND_CUTPOINTS_ONLY","note=EXPANDING_COMPARATOR_IS_NOT_APPROVED_756_ECDF_AND_DOES_NOT_REPLACE_IT","note=FIVE_AXIS_SHADOW_ONLY_OPTIONS_AXIS_REMAINS_UNRESOLVED","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_OR_REFERENCE_CHANGE");
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,lines.join("\n")+"\n");return {status:report.status,jsonFile,txtFile,providerCalls:0,publicMutation:false,productionFormulaChanged:false,referenceRequirementChanged:false,rawPooled,smoothedPooled,dailySmoothedAgreement};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(runSectorFearGreedR211BandStability(),null,2));}catch(error){const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R211_BAND_STABILITY_FAILED";console.log(JSON.stringify({status:"FAILED",code,errorName:String(error?.name??"Error"),providerCalls:0,publicMutation:false,productionFormulaChanged:false,referenceRequirementChanged:false}));process.exitCode=1;}}
