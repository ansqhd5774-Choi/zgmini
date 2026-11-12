import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {gunzipSync} from "node:zlib";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv,buildPointInTimeSectorInputs} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {SECTOR_FEAR_GREED_R28_WINDOWS,scoreRawAxis,scoreRawAxisFullAvailable,buildCompositeSeries,currentComposite,correlation,summarizeScoreSeries,rankCorrelationByKey} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const PRICE_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const R6_HISTORY_NAME="local-breadth-r6-shadow-history.json";
const R7_HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const OUTPUT_JSON="local-sector-fear-greed-r28-reference-window-diagnostic.json";
const OUTPUT_TXT="local-sector-fear-greed-r28-reference-window-diagnostic.txt";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const round=value=>finite(value)?Math.round(value*10000)/10000:null;
const AXIS_WEIGHTS=Object.freeze({trend:.20,breadth:.20,demand:.15,relativeStrength:.15,volatility:.15});
const AXIS_SPECS=Object.freeze({
  trend:{metrics:[{key:"m125",weight:.50},{key:"r60",weight:.30},{key:"r20",weight:.20}]},
  breadth:{metrics:[{key:"b50",weight:.35},{key:"b200",weight:.35},{key:"highLowNet",weight:.30}]},
  demand:{metrics:[{key:"vb5",weight:.60},{key:"vb20",weight:.40}]},
  relativeStrength:{metrics:[{key:"rs20",weight:.25},{key:"rs60",weight:.45},{key:"rs125",weight:.30}]},
  volatility:{metrics:[{key:"rv20",weight:.40,invert:true},{key:"dsv20",weight:.35,invert:true},{key:"dd63",weight:.25}]},
});
const AXES=Object.keys(AXIS_WEIGHTS);

function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function decodeBody(value){const text=String(value??"");try{return JSON.parse(text.startsWith("gzip:")?gunzipSync(Buffer.from(text.slice(5),"base64")).toString():text);}catch{return null;}}
function tableExists(db,name){return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(name));}
function normalizePriceRows(rows=[]){const map=new Map();for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),close=Number(row?.close??row?.currentClose??row?.current_close);if(validDate(date)&&finite(close)&&close>0)map.set(date,{date,close});}return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));}
function putRow(map,row,source,diagnostics){const tradeDate=String(row?.tradeDate??row?.trade_date??row?.date??"").slice(0,10),ticker=String(row?.ticker??"").trim(),currentClose=Number(row?.currentClose??row?.current_close??row?.close),currentVolume=Number(row?.currentVolume??row?.current_volume??row?.volume);if(!validDate(tradeDate)||!ticker||!finite(currentClose)||currentClose<=0||!finite(currentVolume)||currentVolume<0)return;const key=`${tradeDate}|${ticker}`,old=map.get(key);if(old&&(old.currentClose!==currentClose||old.currentVolume!==currentVolume)){diagnostics.conflicts++;const transition=`${old.source}->${source}`;diagnostics.overrides[transition]=(diagnostics.overrides[transition]??0)+1;}map.set(key,{tradeDate,ticker,currentClose,currentVolume,source});}
function readStorage(base){const map=new Map(),diagnostics={conflicts:0,overrides:{}};for(const [name,source] of [[R7_HISTORY_NAME,"BREADTH_R7_LOCAL"],[R6_HISTORY_NAME,"BREADTH_R6_LOCAL"]]){const payload=safeJson(path.join(base,name));for(const row of payload?.rows??[])putRow(map,row,source,diagnostics);}const dbFile=path.join(base,"storage","core.sqlite");if(fs.existsSync(dbFile)){const db=new DatabaseSync(dbFile,{readOnly:true});db.exec("PRAGMA query_only=ON");try{if(tableExists(db,"market_score_breadth_b1_r3_current_v1")){for(const row of db.prepare("SELECT trade_date,ticker,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 ORDER BY trade_date,ticker").all())putRow(map,row,"B1_R3_STORED",diagnostics);}}finally{db.close();}}return {rows:[...map.values()],diagnostics};}
function stdPopulation(values){const m=mean(values);return Math.sqrt(mean(values.map(value=>(value-m)**2)));}
function alignPrices(leftRows,rightRows){const left=normalizePriceRows(leftRows),right=normalizePriceRows(rightRows),rmap=new Map(right.map(row=>[row.date,row.close]));return left.filter(row=>rmap.has(row.date)).map(row=>({date:row.date,left:row.close,right:rmap.get(row.date)}));}

export function deriveR28RawAxes({etfRows=[],spyRows=[],breadthRows=[],demandRows=[]}={}){
  const prices=normalizePriceRows(etfRows),trend=[];
  for(let i=124;i<prices.length;i++){const current=prices[i].close,ma125=mean(prices.slice(i-124,i+1).map(row=>row.close));trend.push({date:prices[i].date,m125:current/ma125-1,r60:current/prices[i-60].close-1,r20:current/prices[i-20].close-1});}
  const breadth=(Array.isArray(breadthRows)?breadthRows:[]).map(row=>({date:String(row?.date??row?.tradeDate??"").slice(0,10),b50:Number(row?.b50??row?.aboveMa50),b200:Number(row?.b200??row?.aboveMa200),highLowNet:Number(row?.highLowNet??row?.highLowNet52w)})).filter(row=>validDate(row.date)&&[row.b50,row.b200,row.highLowNet].every(finite)).sort((a,b)=>a.date.localeCompare(b.date));
  const demandBase=(Array.isArray(demandRows)?demandRows:[]).map(row=>({date:String(row?.date??row?.tradeDate??"").slice(0,10),value:Number(row?.value??row?.volumeBreadth)})).filter(row=>validDate(row.date)&&finite(row.value)).sort((a,b)=>a.date.localeCompare(b.date)),demand=[];
  for(let i=19;i<demandBase.length;i++)demand.push({date:demandBase[i].date,vb5:mean(demandBase.slice(i-4,i+1).map(row=>row.value)),vb20:mean(demandBase.slice(i-19,i+1).map(row=>row.value))});
  const aligned=alignPrices(etfRows,spyRows),relativeStrength=[];
  for(let i=125;i<aligned.length;i++){const rel=lookback=>(aligned[i].left/aligned[i-lookback].left-1)-(aligned[i].right/aligned[i-lookback].right-1);relativeStrength.push({date:aligned[i].date,rs20:rel(20),rs60:rel(60),rs125:rel(125)});}
  const volatility=[];
  for(let i=62;i<prices.length;i++){const returns=[];for(let j=i-19;j<=i;j++)returns.push(prices[j].close/prices[j-1].close-1);const high=Math.max(...prices.slice(i-62,i+1).map(row=>row.close));volatility.push({date:prices[i].date,rv20:stdPopulation(returns)*Math.sqrt(252),dsv20:Math.sqrt(252*mean(returns.map(value=>Math.min(value,0)**2))),dd63:prices[i].close/high-1});}
  return {trend,breadth,demand,relativeStrength,volatility};
}

function maxFinite(values){const clean=values.filter(finite);return clean.length?Math.max(...clean):null;}
function minFinite(values){const clean=values.filter(finite);return clean.length?Math.min(...clean):null;}
function avgFinite(values){const clean=values.filter(finite);return clean.length?mean(clean):null;}
function roundedSummary(summary){return Object.fromEntries(Object.entries(summary).map(([key,value])=>[key,finite(value)?round(value):value]));}

export function runSectorFearGreedR28ReferenceWindowDiagnostic(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const pitPath=path.join(base,PIT_FILE),pricePath=path.join(base,PRICE_FILE);if(!fs.existsSync(pitPath))throw new Error("R28_PIT_HISTORY_MISSING");if(!fs.existsSync(pricePath))throw new Error("R28_IEX_PRICE_HISTORY_MISSING");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8")),storage=readStorage(base),derived=buildPointInTimeSectorInputs({rows:storage.rows,pitHistory:pit}),pricePayload=safeJson(pricePath),series=pricePayload?.series??{},spyRows=normalizePriceRows(series.SPY??[]),sectors={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const etfRows=normalizePriceRows(series[ticker]??[]),pitRows=derived.sectors[sectorId]??[],breadthRows=pitRows.filter(row=>[row?.b50,row?.b200,row?.highLowNet].every(finite)),demandRows=pitRows.filter(row=>finite(row?.volumeBreadth)),raw=deriveR28RawAxes({etfRows,spyRows,breadthRows,demandRows}),fullAxes={},byWindow={};
    for(const axis of AXES)fullAxes[axis]=scoreRawAxisFullAvailable(raw[axis],AXIS_SPECS[axis]);
    const fullComposite=currentComposite(fullAxes,AXIS_WEIGHTS);
    for(const window of SECTOR_FEAR_GREED_R28_WINDOWS){
      const axisSeries={},currentAxes={},axisStats={},axisCorrTo252={};
      for(const axis of AXES){axisSeries[axis]=scoreRawAxis(raw[axis],AXIS_SPECS[axis],window);currentAxes[axis]=axisSeries[axis].at(-1)?.score??null;axisStats[axis]=roundedSummary(summarizeScoreSeries(axisSeries[axis]));}
      const compositeSeries=buildCompositeSeries(axisSeries,AXIS_WEIGHTS),compositeStats=roundedSummary(summarizeScoreSeries(compositeSeries)),compositeCurrent=currentComposite(currentAxes,AXIS_WEIGHTS),axisDeltas=Object.fromEntries(AXES.map(axis=>[axis,finite(currentAxes[axis])&&finite(fullAxes[axis])?round(Math.abs(currentAxes[axis]-fullAxes[axis])):null]));
      byWindow[String(window)]={window,currentAxes:Object.fromEntries(AXES.map(axis=>[axis,round(currentAxes[axis])])),axisStats,axisDeltasVsFull:axisDeltas,maxAxisDeltaVsFull:round(maxFinite(Object.values(axisDeltas))),compositeCurrent:round(compositeCurrent),compositeDeltaVsFull:finite(compositeCurrent)&&finite(fullComposite)?round(Math.abs(compositeCurrent-fullComposite)):null,compositeStats,dateStart:compositeSeries[0]?.date??null,dateEnd:compositeSeries.at(-1)?.date??null,axisCorrTo252};
    }
    const reference=byWindow["252"];
    for(const window of SECTOR_FEAR_GREED_R28_WINDOWS){const item=byWindow[String(window)];for(const axis of AXES){item.axisCorrTo252[axis]={pearson:round(correlation(scoreRawAxis(raw[axis],AXIS_SPECS[axis],window),scoreRawAxis(raw[axis],AXIS_SPECS[axis],252),{method:"pearson"})),spearman:round(correlation(scoreRawAxis(raw[axis],AXIS_SPECS[axis],window),scoreRawAxis(raw[axis],AXIS_SPECS[axis],252),{method:"spearman"}))};}item.compositeCorrTo252={pearson:round(correlation(buildCompositeSeries(Object.fromEntries(AXES.map(axis=>[axis,scoreRawAxis(raw[axis],AXIS_SPECS[axis],window)])),AXIS_WEIGHTS),buildCompositeSeries(Object.fromEntries(AXES.map(axis=>[axis,scoreRawAxis(raw[axis],AXIS_SPECS[axis],252)])),AXIS_WEIGHTS),{method:"pearson"})),spearman:round(correlation(buildCompositeSeries(Object.fromEntries(AXES.map(axis=>[axis,scoreRawAxis(raw[axis],AXIS_SPECS[axis],window)])),AXIS_WEIGHTS),buildCompositeSeries(Object.fromEntries(AXES.map(axis=>[axis,scoreRawAxis(raw[axis],AXIS_SPECS[axis],252)])),AXIS_WEIGHTS),{method:"spearman"}))};}
    sectors[sectorId]={ticker,counts:{etfRows:etfRows.length,spyRows:spyRows.length,breadthRows:breadthRows.length,demandRows:demandRows.length},rawCounts:Object.fromEntries(AXES.map(axis=>[axis,raw[axis].length])),fullAvailable:{currentAxes:Object.fromEntries(AXES.map(axis=>[axis,round(fullAxes[axis])])),compositeCurrent:round(fullComposite)},byWindow};
  }
  const summaryByWindow={};
  for(const window of SECTOR_FEAR_GREED_R28_WINDOWS){const key=String(window),items=Object.values(sectors).map(item=>item.byWindow[key]),fullRanks=Object.fromEntries(Object.entries(sectors).map(([id,item])=>[id,item.fullAvailable.compositeCurrent])),windowRanks=Object.fromEntries(Object.entries(sectors).map(([id,item])=>[id,item.byWindow[key].compositeCurrent])),axisDeltas=items.flatMap(item=>Object.values(item.axisDeltasVsFull)),compositeDeltas=items.map(item=>item.compositeDeltaVsFull),histories=items.map(item=>item.compositeStats.n),meanShifts=items.map(item=>Math.abs(item.compositeStats.meanShift??NaN)),p95Deltas=items.map(item=>item.compositeStats.p95AbsDelta);summaryByWindow[key]={currentReady:items.filter(item=>finite(item.compositeCurrent)).length,maxAxisDeltaVsFull:round(maxFinite(axisDeltas)),meanAxisDeltaVsFull:round(avgFinite(axisDeltas)),maxCompositeDeltaVsFull:round(maxFinite(compositeDeltas)),meanCompositeDeltaVsFull:round(avgFinite(compositeDeltas)),compositeRankSpearmanVsFull:round(rankCorrelationByKey(windowRanks,fullRanks)),minCompositeHistory:minFinite(histories),maxAbsCompositeMeanShift:round(maxFinite(meanShifts)),maxCompositeP95AbsDelta:round(maxFinite(p95Deltas))};}
  const report={version:"R2.8-REFERENCE-WINDOW-SENSITIVITY",generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),status:"SHADOW_R28_REFERENCE_WINDOW_COMPLETE",mode:"SHADOW_RESEARCH_ONLY",providerCalls:0,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,testedWindows:[...SECTOR_FEAR_GREED_R28_WINDOWS],candidateSelected:false,no85PercentRenormalization:true,priceSource:{file:pricePath,source:pricePayload?.source??null,feed:pricePayload?.feed??null},constituentRows:storage.rows.length,storedMergeDiagnostics:storage.diagnostics,summaryByWindow,sectors};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.8 REFERENCE-WINDOW SENSITIVITY",`generatedAt=${report.generatedAt}`,`status=${report.status}`,"approvedR1ReferenceRequirement=756 (UNCHANGED)",`testedWindows=${report.testedWindows.join(",")}`,"candidateSelected=false","no85PercentRenormalization=true",`providerCalls=0 constituentRows=${report.constituentRows} spyRows=${spyRows.length}`,`storedConflicts=${storage.diagnostics.conflicts}`,"","WINDOW | READY | MAX_AXIS_DELTA_FULL | MEAN_AXIS_DELTA_FULL | MAX_COMP_DELTA_FULL | MEAN_COMP_DELTA_FULL | RANK_SPEARMAN_FULL | MIN_COMP_HISTORY | MAX_MEAN_SHIFT | MAX_P95_DELTA"];
  for(const window of SECTOR_FEAR_GREED_R28_WINDOWS){const s=summaryByWindow[String(window)];lines.push(`${window} | ${s.currentReady}/11 | ${s.maxAxisDeltaVsFull??"NA"} | ${s.meanAxisDeltaVsFull??"NA"} | ${s.maxCompositeDeltaVsFull??"NA"} | ${s.meanCompositeDeltaVsFull??"NA"} | ${s.compositeRankSpearmanVsFull??"NA"} | ${s.minCompositeHistory??"NA"} | ${s.maxAbsCompositeMeanShift??"NA"} | ${s.maxCompositeP95AbsDelta??"NA"}`);}
  lines.push("","SECTOR | RAW T/B/D/R/V | FULL_COMP | W126_COMP/N | W189_COMP/N | W252_COMP/N | W126_MAX_AXIS_DELTA | W189_MAX_AXIS_DELTA | W252_MAX_AXIS_DELTA");
  for(const [sectorId,item] of Object.entries(sectors)){const rc=item.rawCounts,w126=item.byWindow["126"],w189=item.byWindow["189"],w252=item.byWindow["252"];lines.push(`${sectorId} | ${rc.trend}/${rc.breadth}/${rc.demand}/${rc.relativeStrength}/${rc.volatility} | ${item.fullAvailable.compositeCurrent??"NA"} | ${w126.compositeCurrent??"NA"}/${w126.compositeStats.n} | ${w189.compositeCurrent??"NA"}/${w189.compositeStats.n} | ${w252.compositeCurrent??"NA"}/${w252.compositeStats.n} | ${w126.maxAxisDeltaVsFull??"NA"} | ${w189.maxAxisDeltaVsFull??"NA"} | ${w252.maxAxisDeltaVsFull??"NA"}`);}
  lines.push("","note=RESEARCH_ONLY_NO_REFERENCE_WINDOW_APPROVAL","note=FULL_AVAILABLE_IS_ENDPOINT_COMPARATOR_NOT_AN_APPROVED_SCORING_RULE","note=FIVE_AXIS_COMPOSITE_REMAINS_RAW_0_TO_85_CONTRIBUTION_AND_IS_NOT_RENORMALIZED","note=R2_4_SPECULATIVE_AXIS_IS_NOT_APPLIED_TO_PRODUCTION","providerCalls=0 rawRowsStored=false publicMutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false referenceRequirementChanged=false");
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,lines.join("\n")+"\n");return {status:report.status,jsonFile,txtFile,providerCalls:0,publicMutation:false,productionFormulaChanged:false,referenceRequirementChanged:false,summaryByWindow};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(runSectorFearGreedR28ReferenceWindowDiagnostic(),null,2));}catch(error){const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R28_REFERENCE_WINDOW_DIAGNOSTIC_FAILED";console.log(JSON.stringify({status:"FAILED",code,errorName:String(error?.name??"Error"),providerCalls:0,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false}));process.exitCode=1;}}
