import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv,buildPointInTimeSectorInputs} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildSectorSpeculativeCandidateR24} from "../../lib/market-score/sector-fear-greed-r24-speculative-shadow.mjs";
import {scoreRawAxis,buildCompositeSeries,correlation,rankCorrelationByKey} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";
import {deriveR28RawAxes} from "./sector-fear-greed-r28-reference-window-diagnostic.mjs";
import {smoothR2111Series} from "./sector-fear-greed-r2111-band-stability.mjs";
import {mergeAlpacaRows} from "./sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {mergeCanonicalRowsR2135} from "./sector-fear-greed-r2135-r24-source-sensitivity.mjs";
import {combineR2136SixAxis,summarizeR2136SeriesImpact,summarizeR2136DailyRank} from "./sector-fear-greed-r2136-six-axis-source-impact.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const ALPACA_DIR="asset-r10-alpaca";
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const IEX_PRICE_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INVENTORY_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const R6_HISTORY_NAME="local-breadth-r6-shadow-history.json";
const R7_HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const OUTPUT_JSON="local-sector-fear-greed-r2137-component-weight-sensitivity.json";
const OUTPUT_TXT="local-sector-fear-greed-r2137-component-weight-sensitivity.txt";
const WINDOW=252;
const SPECULATIVE_WEIGHT=.15;
export const R2137_MIXES=Object.freeze([
  Object.freeze({id:"L50_V50",lottery:.50,volume:.50}),
  Object.freeze({id:"L60_V40",lottery:.60,volume:.40}),
  Object.freeze({id:"L70_V30",lottery:.70,volume:.30}),
  Object.freeze({id:"L80_V20",lottery:.80,volume:.20}),
]);
const AXIS_WEIGHTS_5=Object.freeze({trend:.20,breadth:.20,demand:.15,relativeStrength:.15,volatility:.15});
const AXIS_SPECS=Object.freeze({
  trend:{metrics:[{key:"m125",weight:.50},{key:"r60",weight:.30},{key:"r20",weight:.20}]},
  breadth:{metrics:[{key:"b50",weight:.35},{key:"b200",weight:.35},{key:"highLowNet",weight:.30}]},
  demand:{metrics:[{key:"vb5",weight:.60},{key:"vb20",weight:.40}]},
  relativeStrength:{metrics:[{key:"rs20",weight:.25},{key:"rs60",weight:.45},{key:"rs125",weight:.30}]},
  volatility:{metrics:[{key:"rv20",weight:.40,invert:true},{key:"dsv20",weight:.35,invert:true},{key:"dd63",weight:.25}]},
});
const AXES=Object.keys(AXIS_WEIGHTS_5);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const round=value=>finite(value)?Math.round(value*10000)/10000:null;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));
function quantile(values,p){const x=values.filter(finite).sort((a,b)=>a-b);if(!x.length)return null;const pos=(x.length-1)*p,lo=Math.floor(pos),hi=Math.ceil(pos);return lo===hi?x[lo]:x[lo]+(x[hi]-x[lo])*(pos-lo);}
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function safeArray(file){const value=safeJson(file);return Array.isArray(value)?value:[];}
function listStoredFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(name=>/^group-\d+\.json$/.test(name)).map(name=>path.join(dir,name)):[];const incrementalDir=path.join(dir,"incremental");const incremental=fs.existsSync(incrementalDir)?fs.readdirSync(incrementalDir).filter(name=>!name.startsWith(".")).map(name=>path.join(incrementalDir,name)).filter(file=>fs.statSync(file).isFile()):[];return {base,incremental,all:[...base,...incremental]};}
function tableExists(db,name){return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(name));}
function normalizePriceRows(rows=[]){const map=new Map();for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),close=Number(row?.close??row?.currentClose??row?.current_close);if(validDate(date)&&finite(close)&&close>0)map.set(date,{date,close});}return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));}
function normalizeScoreRows(rows=[]){return (Array.isArray(rows)?rows:[]).map(row=>({date:String(row?.date??"").slice(0,10),score:Number(row?.score)})).filter(row=>validDate(row.date)&&finite(row.score)).sort((a,b)=>a.date.localeCompare(b.date));}
function readCanonicalRows(base){
  const rowSets=[];
  for(const [name,source] of [[R7_HISTORY_NAME,"BREADTH_R7_LOCAL"],[R6_HISTORY_NAME,"BREADTH_R6_LOCAL"]]){
    const payload=safeJson(path.join(base,name));rowSets.push({source,rows:payload?.rows??[]});
  }
  const dbRows=[],dbFile=path.join(base,"storage","core.sqlite");
  if(fs.existsSync(dbFile)){
    const db=new DatabaseSync(dbFile,{readOnly:true});db.exec("PRAGMA query_only=ON");
    try{
      if(tableExists(db,"market_score_breadth_b1_r3_current_v1")){
        const stored=db.prepare("SELECT trade_date,ticker,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 ORDER BY trade_date,ticker").all();
        for(const row of stored)dbRows.push(row);
      }
    }finally{db.close();}
  }
  return mergeCanonicalRowsR2135(rowSets,dbRows);
}

export function mixR2137History(history=[],lotteryWeight=.5,volumeWeight=.5){
  const lw=Number(lotteryWeight),vw=Number(volumeWeight);
  if(!finite(lw)||!finite(vw)||lw<0||vw<0||Math.abs(lw+vw-1)>1e-9)return [];
  return (Array.isArray(history)?history:[]).map(row=>{
    const lottery=Number(row?.lotterySuperiority),volume=Number(row?.volumeSuperiority),date=String(row?.date??"").slice(0,10);
    if(!validDate(date)||!finite(lottery)||!finite(volume))return null;
    return {date,score:lw*lottery+vw*volume,lotterySuperiority:lottery,volumeSuperiority:volume};
  }).filter(Boolean);
}

export function summarizeR2137Redundancy(speculative=[],axisSeries={},fiveAxis=[]){
  const spec=normalizeScoreRows(speculative),axes={};
  for(const axis of AXES){
    const value=correlation(spec,normalizeScoreRows(axisSeries?.[axis]??[]),{method:"spearman"});
    axes[axis]=round(value);
  }
  const five=round(correlation(spec,normalizeScoreRows(fiveAxis),{method:"spearman"}));
  const abs=[...Object.values(axes),five].filter(finite).map(Math.abs);
  return {axes,fiveAxis:five,maxAbs:round(abs.length?Math.max(...abs):null),medianAbs:round(quantile(abs,.5))};
}

function scoreOverlap(left=[],right=[]){return round(correlation(normalizeScoreRows(left),normalizeScoreRows(right),{method:"spearman"}));}
function currentScore(rows=[]){return normalizeScoreRows(rows).at(-1)?.score??null;}

export function runSectorFearGreedR2137ComponentWeightSensitivity(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const pitPath=path.join(base,PIT_FILE),iexPath=path.join(base,IEX_PRICE_FILE),inventoryPath=path.join(base,INVENTORY_FILE),alpacaDir=path.join(base,ALPACA_DIR);
  if(!fs.existsSync(pitPath))throw new Error("R2137_PIT_HISTORY_MISSING");
  if(!fs.existsSync(iexPath))throw new Error("R2137_IEX_PRICE_HISTORY_MISSING");
  if(!fs.existsSync(inventoryPath))throw new Error("R2137_R2133_INVENTORY_MISSING");
  if(!fs.existsSync(alpacaDir))throw new Error("R2137_ALPACA_LOCAL_STORE_MISSING");
  const files=listStoredFiles(alpacaDir);if(!files.base.length)throw new Error("R2137_ALPACA_BASE_GROUPS_MISSING");
  const merged=mergeAlpacaRows(files.all.map(safeArray)),alpacaRows=merged.rows,pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8")),iex=safeJson(iexPath),inventory=safeJson(inventoryPath),repair=buildR2134RepairedBenchmarks(iex?.series??{},inventory),canonical=readCanonicalRows(base),derived=buildPointInTimeSectorInputs({rows:canonical.rows,pitHistory:pit}),spyRows=normalizePriceRows(repair.series.SPY??[]);
  const grid=Object.fromEntries(R2137_MIXES.map(mix=>[mix.id,{mix,sectors:{},sectorPairs:{}}]));
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const etfRows=normalizePriceRows(repair.series[ticker]??[]),pitRows=derived.sectors[sectorId]??[],breadthRows=pitRows.filter(row=>[row?.b50,row?.b200,row?.highLowNet].every(finite)),demandRows=pitRows.filter(row=>finite(row?.volumeBreadth)),raw=deriveR28RawAxes({etfRows,spyRows,breadthRows,demandRows}),axisSeries={};
    for(const axis of AXES)axisSeries[axis]=scoreRawAxis(raw[axis],AXIS_SPECS[axis],WINDOW);
    const fiveRaw=buildCompositeSeries(axisSeries,AXIS_WEIGHTS_5),canonicalR24=buildSectorSpeculativeCandidateR24({rows:canonical.rows,spyRows,etfRows,pitHistory:pit,sectorId}),alpacaR24=buildSectorSpeculativeCandidateR24({rows:alpacaRows,spyRows,etfRows,pitHistory:pit,sectorId});
    for(const mix of R2137_MIXES){
      const canonicalSpec=mixR2137History(canonicalR24.history,mix.lottery,mix.volume),alpacaSpec=mixR2137History(alpacaR24.history,mix.lottery,mix.volume),canonicalSix=smoothR2111Series(combineR2136SixAxis(fiveRaw,canonicalSpec,SPECULATIVE_WEIGHT)),alpacaSix=smoothR2111Series(combineR2136SixAxis(fiveRaw,alpacaSpec,SPECULATIVE_WEIGHT)),impact=summarizeR2136SeriesImpact(canonicalSix,alpacaSix),redundancy=summarizeR2137Redundancy(canonicalSpec,axisSeries,fiveRaw);
      grid[mix.id].sectors[sectorId]={ticker,canonicalR24Status:canonicalR24.status,alpacaR24Status:alpacaR24.status,canonicalSpecCurrent:round(currentScore(canonicalSpec)),alpacaSpecCurrent:round(currentScore(alpacaSpec)),sourceSpearman:scoreOverlap(canonicalSpec,alpacaSpec),redundancy,impact};
      grid[mix.id].sectorPairs[sectorId]={canonical:canonicalSix,alpaca:alpacaSix};
    }
  }
  const summaries={};
  for(const mix of R2137_MIXES){
    const bucket=grid[mix.id],list=Object.values(bucket.sectors),sourceRhos=list.map(item=>item.sourceSpearman).filter(finite),redundancyMax=list.map(item=>item.redundancy.maxAbs).filter(finite),redundancyFive=list.map(item=>item.redundancy.fiveAxis).filter(finite).map(Math.abs),canonicalCurrentSpec={},alpacaCurrentSpec={},canonicalCurrentSix={},alpacaCurrentSix={};
    for(const [sectorId,item] of Object.entries(bucket.sectors)){
      if(finite(item.canonicalSpecCurrent))canonicalCurrentSpec[sectorId]=item.canonicalSpecCurrent;
      if(finite(item.alpacaSpecCurrent))alpacaCurrentSpec[sectorId]=item.alpacaSpecCurrent;
      if(finite(item.impact.current?.canonical))canonicalCurrentSix[sectorId]=item.impact.current.canonical;
      if(finite(item.impact.current?.alpaca))alpacaCurrentSix[sectorId]=item.impact.current.alpaca;
    }
    const impacts=list.map(item=>item.impact),maxOf=key=>{const values=impacts.map(item=>item[key]).filter(finite);return round(values.length?Math.max(...values):null);};
    const currentDeltas=impacts.map(item=>item.current?.absDelta).filter(finite);
    summaries[mix.id]={mix,sectors:list.length,canonicalReady:list.filter(item=>item.canonicalR24Status==="READY_CROSS_SECTION").length,alpacaReady:list.filter(item=>item.alpacaR24Status==="READY_CROSS_SECTION").length,sourceSpearmanMin:round(sourceRhos.length?Math.min(...sourceRhos):null),sourceSpearmanMedian:round(quantile(sourceRhos,.5)),currentR24RankSpearman:round(rankCorrelationByKey(canonicalCurrentSpec,alpacaCurrentSpec)),currentSixAxisRankSpearman:round(rankCorrelationByKey(canonicalCurrentSix,alpacaCurrentSix)),dailySixAxisRank:summarizeR2136DailyRank(bucket.sectorPairs),maxCurrentAbsDelta:round(currentDeltas.length?Math.max(...currentDeltas):null),maxMeanAbsDelta:maxOf("meanAbsDelta"),maxP95AbsDelta:maxOf("p95AbsDelta"),maxAbsDelta:maxOf("maxAbsDelta"),bandChangeCount:impacts.reduce((sum,item)=>sum+item.bandChangeCount,0),severeBandChangeCount:impacts.reduce((sum,item)=>sum+item.severeBandChangeCount,0),observations:impacts.reduce((sum,item)=>sum+item.n,0),redundancyMaxAbsMax:round(redundancyMax.length?Math.max(...redundancyMax):null),redundancyMaxAbsMedian:round(quantile(redundancyMax,.5)),redundancyFiveAxisAbsMedian:round(quantile(redundancyFive,.5))};
  }
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.13.7-COMPONENT-WEIGHT-SENSITIVITY",generatedAt,status:"SHADOW_R2137_COMPONENT_WEIGHT_SENSITIVITY_COMPLETE",mode:"LOCAL_READ_ONLY_R24_COMPONENT_WEIGHT_AND_REDUNDANCY_RESEARCH",providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,fillForwardFill:false,sourceFilesMutated:false,r24ApprovedForProduction:false,candidateSelected:false,optionsAxisStillUnresolved:true,no85PercentRenormalization:true,testedReferenceWindow:WINDOW,speculativeWeightResearchOnly:SPECULATIVE_WEIGHT,currentR24WeightsUnchanged:{lottery:.50,volume:.50},testedMixes:R2137_MIXES,selectionThresholdIntroduced:false,repair:{targetDate:repair.targetDate,complete:repair.complete,injected:repair.injected.length,alreadyPresent:repair.alreadyPresent.length},sources:{canonical:{rows:canonical.rows.length,diagnostics:canonical.diagnostics},alpaca:{rows:alpacaRows.length,conflicts:merged.conflicts.length,firstDate:alpacaRows[0]?.date??null,lastDate:alpacaRows.at(-1)?.date??null}},summaries,sectors:Object.fromEntries(R2137_MIXES.map(mix=>[mix.id,grid[mix.id].sectors]))};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.7 COMPONENT WEIGHT SENSITIVITY",`generatedAt=${generatedAt}`,`status=${report.status}`,"mode=LOCAL_READ_ONLY_R24_COMPONENT_WEIGHT_AND_REDUNDANCY_RESEARCH","providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false","productionFormulaChanged=false dbSchemaChanged=false schedulerChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)","fillForwardFill=false sourceFilesMutated=false candidateSelected=false r24ApprovedForProduction=false optionsAxisStillUnresolved=true","selectionThresholdIntroduced=false currentR24Weights=LOTTERY.50/VOLUME.50 (UNCHANGED)","testedMixes=L50_V50,L60_V40,L70_V30,L80_V20 speculativeWeightResearchOnly=0.15 no85PercentRenormalization=true",`repair targetDate=${report.repair.targetDate} complete=${report.repair.complete} injected=${report.repair.injected}`,`canonical rows=${report.sources.canonical.rows} duplicateRows=${report.sources.canonical.diagnostics.duplicateRows} conflictingKeys=${report.sources.canonical.diagnostics.conflictingKeys}`,`alpaca rows=${report.sources.alpaca.rows} conflicts=${report.sources.alpaca.conflicts} dates=${report.sources.alpaca.firstDate}..${report.sources.alpaca.lastDate}`,"","MIX | SOURCE_RHO_MIN | SOURCE_RHO_MEDIAN | CURRENT_R24_RANK | CURRENT_6AXIS_RANK | DAILY_RANK_MEAN | DAILY_RANK_MIN | MAX_CURRENT_DELTA | MAX_MEAN_DELTA | MAX_P95_DELTA | MAX_DELTA | BAND_CHANGES | SEVERE | REDUNDANCY_MAX | REDUNDANCY_MAX_MEDIAN | REDUNDANCY_5AXIS_MEDIAN"];
  for(const mix of R2137_MIXES){const s=summaries[mix.id];lines.push(`${mix.id} | ${s.sourceSpearmanMin??"NA"} | ${s.sourceSpearmanMedian??"NA"} | ${s.currentR24RankSpearman??"NA"} | ${s.currentSixAxisRankSpearman??"NA"} | ${s.dailySixAxisRank.mean??"NA"} | ${s.dailySixAxisRank.min??"NA"} | ${s.maxCurrentAbsDelta??"NA"} | ${s.maxMeanAbsDelta??"NA"} | ${s.maxP95AbsDelta??"NA"} | ${s.maxAbsDelta??"NA"} | ${s.bandChangeCount}/${s.observations} | ${s.severeBandChangeCount} | ${s.redundancyMaxAbsMax??"NA"} | ${s.redundancyMaxAbsMedian??"NA"} | ${s.redundancyFiveAxisAbsMedian??"NA"}`);}
  lines.push("","CURRENT_MIX_SECTOR_REDUNDANCY L50_V50","SECTOR | ETF | SOURCE_RHO | VS_TREND | VS_BREADTH | VS_DEMAND | VS_RS | VS_VOL | VS_5AXIS | MAX_ABS");
  for(const [sectorId,item] of Object.entries(grid.L50_V50.sectors)){const a=item.redundancy.axes;lines.push(`${sectorId} | ${item.ticker} | ${item.sourceSpearman??"NA"} | ${a.trend??"NA"} | ${a.breadth??"NA"} | ${a.demand??"NA"} | ${a.relativeStrength??"NA"} | ${a.volatility??"NA"} | ${item.redundancy.fiveAxis??"NA"} | ${item.redundancy.maxAbs??"NA"}`);}
  lines.push("","note=R2137_DOES_NOT_SELECT_A_NEW_COMPONENT_WEIGHT_OR_CHANGE_R24","note=THE_GRID_ONLY_TESTS_SOURCE_ROBUSTNESS_AND_REDUNDANCY_OF_EXISTING_R24_COMPONENTS","note=OPTIONS_EQUIVALENCE_REMAINS_UNRESOLVED_AND_REQUIRES_SEPARATE_ECONOMIC_VALIDATION","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_OR_REFERENCE_CHANGE");
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,lines.join("\n")+"\n");return {status:report.status,jsonFile,txtFile,providerCalls:0,publicMutation:false,productionFormulaChanged:false,referenceRequirementChanged:false,summaries};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(runSectorFearGreedR2137ComponentWeightSensitivity(),null,2));}catch(error){const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R2137_COMPONENT_WEIGHT_SENSITIVITY_FAILED";console.log(JSON.stringify({status:"FAILED",code,providerCalls:0,publicMutation:false,productionFormulaChanged:false}));process.exitCode=1;}}
