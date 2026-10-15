import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv,buildPointInTimeSectorInputs} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildSectorSpeculativeCandidateR24} from "../../lib/market-score/sector-fear-greed-r24-speculative-shadow.mjs";
import {scoreRawAxis,buildCompositeSeries,alignSeries,rankCorrelationByKey} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";
import {deriveR28RawAxes} from "./sector-fear-greed-r28-reference-window-diagnostic.mjs";
import {smoothR2111Series,classifyR2111Band} from "./sector-fear-greed-r2111-band-stability.mjs";
import {mergeAlpacaRows} from "./sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {mergeCanonicalRowsR2135} from "./sector-fear-greed-r2135-r24-source-sensitivity.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const ALPACA_DIR="asset-r10-alpaca";
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const IEX_PRICE_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INVENTORY_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const R6_HISTORY_NAME="local-breadth-r6-shadow-history.json";
const R7_HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const OUTPUT_JSON="local-sector-fear-greed-r2136-six-axis-source-impact.json";
const OUTPUT_TXT="local-sector-fear-greed-r2136-six-axis-source-impact.txt";
const WINDOW=252;
const SPECULATIVE_WEIGHT=.15;
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
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
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
    const payload=safeJson(path.join(base,name));
    rowSets.push({source,rows:payload?.rows??[]});
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

export function combineR2136SixAxis(fiveAxis,speculative,weight=SPECULATIVE_WEIGHT){
  const specMap=new Map(normalizeScoreRows(speculative).map(row=>[row.date,row.score]));
  return normalizeScoreRows(fiveAxis).filter(row=>specMap.has(row.date)).map(row=>({date:row.date,score:row.score+Number(weight)*specMap.get(row.date)}));
}

export function summarizeR2136SeriesImpact(canonical=[],alpaca=[]){
  const pairs=alignSeries(canonical,alpaca);
  if(!pairs.length)return {n:0,meanAbsDelta:null,medianAbsDelta:null,p95AbsDelta:null,maxAbsDelta:null,bandChangeCount:0,bandChangeShare:null,severeBandChangeCount:0,current:null};
  const abs=[],bandDiffs=[];let current=null;
  for(const row of pairs){
    const delta=row.right-row.left,leftBand=classifyR2111Band(row.left),rightBand=classifyR2111Band(row.right),bandDiff=leftBand&&rightBand?Math.abs(leftBand.index-rightBand.index):null;
    abs.push(Math.abs(delta));if(finite(bandDiff))bandDiffs.push(bandDiff);
    current={date:row.date,canonical:round(row.left),alpaca:round(row.right),delta:round(delta),absDelta:round(Math.abs(delta)),canonicalBand:leftBand?.name??null,alpacaBand:rightBand?.name??null,bandDiff};
  }
  const changes=bandDiffs.filter(v=>v>0),severe=bandDiffs.filter(v=>v>=2);
  return {n:pairs.length,meanAbsDelta:round(mean(abs)),medianAbsDelta:round(quantile(abs,.5)),p95AbsDelta:round(quantile(abs,.95)),maxAbsDelta:round(Math.max(...abs)),bandChangeCount:changes.length,bandChangeShare:round(changes.length/pairs.length),severeBandChangeCount:severe.length,current};
}

export function summarizeR2136DailyRank(sectorPairs={}){
  const byDate=new Map();
  for(const [sectorId,pair] of Object.entries(sectorPairs)){
    const right=new Map(normalizeScoreRows(pair?.alpaca??[]).map(row=>[row.date,row.score]));
    for(const row of normalizeScoreRows(pair?.canonical??[])){
      if(!right.has(row.date))continue;
      const slot=byDate.get(row.date)??{canonical:{},alpaca:{}};
      slot.canonical[sectorId]=row.score;slot.alpaca[sectorId]=right.get(row.date);byDate.set(row.date,slot);
    }
  }
  const rows=[];
  for(const [date,slot] of [...byDate.entries()].sort(([a],[b])=>a.localeCompare(b))){
    const rho=rankCorrelationByKey(slot.canonical,slot.alpaca);
    if(finite(rho))rows.push({date,rho});
  }
  const values=rows.map(row=>row.rho);
  return {nDates:values.length,mean:round(values.length?mean(values):null),median:round(quantile(values,.5)),min:round(values.length?Math.min(...values):null),last:round(values.at(-1)),firstDate:rows[0]?.date??null,lastDate:rows.at(-1)?.date??null};
}

export function runSectorFearGreedR2136SixAxisSourceImpact(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const pitPath=path.join(base,PIT_FILE),iexPath=path.join(base,IEX_PRICE_FILE),inventoryPath=path.join(base,INVENTORY_FILE),alpacaDir=path.join(base,ALPACA_DIR);
  if(!fs.existsSync(pitPath))throw new Error("R2136_PIT_HISTORY_MISSING");
  if(!fs.existsSync(iexPath))throw new Error("R2136_IEX_PRICE_HISTORY_MISSING");
  if(!fs.existsSync(inventoryPath))throw new Error("R2136_R2133_INVENTORY_MISSING");
  if(!fs.existsSync(alpacaDir))throw new Error("R2136_ALPACA_LOCAL_STORE_MISSING");
  const files=listStoredFiles(alpacaDir);if(!files.base.length)throw new Error("R2136_ALPACA_BASE_GROUPS_MISSING");
  const merged=mergeAlpacaRows(files.all.map(safeArray)),alpacaRows=merged.rows,pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8")),iex=safeJson(iexPath),inventory=safeJson(inventoryPath),repair=buildR2134RepairedBenchmarks(iex?.series??{},inventory),canonical=readCanonicalRows(base),derived=buildPointInTimeSectorInputs({rows:canonical.rows,pitHistory:pit}),spyRows=normalizePriceRows(repair.series.SPY??[]),sectors={},sectorPairs={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const etfRows=normalizePriceRows(repair.series[ticker]??[]),pitRows=derived.sectors[sectorId]??[],breadthRows=pitRows.filter(row=>[row?.b50,row?.b200,row?.highLowNet].every(finite)),demandRows=pitRows.filter(row=>finite(row?.volumeBreadth)),raw=deriveR28RawAxes({etfRows,spyRows,breadthRows,demandRows}),axisSeries={};
    for(const axis of AXES)axisSeries[axis]=scoreRawAxis(raw[axis],AXIS_SPECS[axis],WINDOW);
    const fiveRaw=buildCompositeSeries(axisSeries,AXIS_WEIGHTS_5),canonicalR24=buildSectorSpeculativeCandidateR24({rows:canonical.rows,spyRows,etfRows,pitHistory:pit,sectorId}),alpacaR24=buildSectorSpeculativeCandidateR24({rows:alpacaRows,spyRows,etfRows,pitHistory:pit,sectorId}),canonicalSix=smoothR2111Series(combineR2136SixAxis(fiveRaw,canonicalR24.history)),alpacaSix=smoothR2111Series(combineR2136SixAxis(fiveRaw,alpacaR24.history)),impact=summarizeR2136SeriesImpact(canonicalSix,alpacaSix);
    sectors[sectorId]={ticker,canonicalR24Status:canonicalR24.status,alpacaR24Status:alpacaR24.status,canonicalR24Current:round(canonicalR24.score),alpacaR24Current:round(alpacaR24.score),fiveHistory:fiveRaw.length,canonicalSixHistory:canonicalSix.length,alpacaSixHistory:alpacaSix.length,impact};
    sectorPairs[sectorId]={canonical:canonicalSix,alpaca:alpacaSix};
  }
  const list=Object.values(sectors),canonicalCurrentSix={},alpacaCurrentSix={},canonicalCurrentR24={},alpacaCurrentR24={};
  for(const [id,item] of Object.entries(sectors)){
    if(finite(item.impact.current?.canonical))canonicalCurrentSix[id]=item.impact.current.canonical;
    if(finite(item.impact.current?.alpaca))alpacaCurrentSix[id]=item.impact.current.alpaca;
    if(finite(item.canonicalR24Current))canonicalCurrentR24[id]=item.canonicalR24Current;
    if(finite(item.alpacaR24Current))alpacaCurrentR24[id]=item.alpacaR24Current;
  }
  const allImpacts=list.map(item=>item.impact),generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={
    version:"R2.13.6-SIX-AXIS-SOURCE-IMPACT",generatedAt,status:"SHADOW_R2136_SIX_AXIS_SOURCE_IMPACT_COMPLETE",mode:"LOCAL_READ_ONLY_CANONICAL_VS_ALPACA_FINAL_COMPOSITE_IMPACT",providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,fillForwardFill:false,sourceFilesMutated:false,r24ApprovedForProduction:false,candidateSelected:false,optionsAxisStillUnresolved:true,no85PercentRenormalization:true,testedReferenceWindow:WINDOW,speculativeWeightResearchOnly:SPECULATIVE_WEIGHT,
    repair:{targetDate:repair.targetDate,complete:repair.complete,injected:repair.injected.length,alreadyPresent:repair.alreadyPresent.length},
    sources:{canonical:{rows:canonical.rows.length,diagnostics:canonical.diagnostics},alpaca:{rows:alpacaRows.length,conflicts:merged.conflicts.length,firstDate:alpacaRows[0]?.date??null,lastDate:alpacaRows.at(-1)?.date??null}},
    summary:{sectors:list.length,canonicalReady:list.filter(x=>x.canonicalR24Status==="READY_CROSS_SECTION").length,alpacaReady:list.filter(x=>x.alpacaR24Status==="READY_CROSS_SECTION").length,currentAligned:list.filter(x=>x.impact.current?.date).length,currentSixAxisRankSpearman:round(rankCorrelationByKey(canonicalCurrentSix,alpacaCurrentSix)),currentR24RankSpearman:round(rankCorrelationByKey(canonicalCurrentR24,alpacaCurrentR24)),dailySixAxisRank:summarizeR2136DailyRank(sectorPairs),maxCurrentAbsDelta:round(Math.max(...list.map(x=>x.impact.current?.absDelta).filter(finite))),maxMeanAbsDelta:round(Math.max(...allImpacts.map(x=>x.meanAbsDelta).filter(finite))),maxP95AbsDelta:round(Math.max(...allImpacts.map(x=>x.p95AbsDelta).filter(finite))),maxAbsDelta:round(Math.max(...allImpacts.map(x=>x.maxAbsDelta).filter(finite))),bandChangeCount:allImpacts.reduce((sum,x)=>sum+x.bandChangeCount,0),severeBandChangeCount:allImpacts.reduce((sum,x)=>sum+x.severeBandChangeCount,0),observations:allImpacts.reduce((sum,x)=>sum+x.n,0)},
    sectors
  };
  const s=report.summary,lines=["ZGMINI SECTOR FEAR & GREED R2.13.6 SIX-AXIS SOURCE IMPACT",`generatedAt=${generatedAt}`,`status=${report.status}`,"mode=LOCAL_READ_ONLY_CANONICAL_VS_ALPACA_FINAL_COMPOSITE_IMPACT","providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false","productionFormulaChanged=false dbSchemaChanged=false schedulerChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)","fillForwardFill=false sourceFilesMutated=false candidateSelected=false r24ApprovedForProduction=false optionsAxisStillUnresolved=true","testedReferenceWindow=252 speculativeWeightResearchOnly=0.15 no85PercentRenormalization=true",`repair targetDate=${report.repair.targetDate} complete=${report.repair.complete} injected=${report.repair.injected}`,`canonical rows=${report.sources.canonical.rows} duplicateRows=${report.sources.canonical.diagnostics.duplicateRows} conflictingKeys=${report.sources.canonical.diagnostics.conflictingKeys}`,`alpaca rows=${report.sources.alpaca.rows} conflicts=${report.sources.alpaca.conflicts} dates=${report.sources.alpaca.firstDate}..${report.sources.alpaca.lastDate}`,`summary sectors=${s.sectors} canonicalReady=${s.canonicalReady}/11 alpacaReady=${s.alpacaReady}/11 currentAligned=${s.currentAligned}/11 currentSixAxisRankSpearman=${s.currentSixAxisRankSpearman??"NA"} currentR24RankSpearman=${s.currentR24RankSpearman??"NA"} maxCurrentAbsDelta=${s.maxCurrentAbsDelta??"NA"} maxMeanAbsDelta=${s.maxMeanAbsDelta??"NA"} maxP95AbsDelta=${s.maxP95AbsDelta??"NA"} maxAbsDelta=${s.maxAbsDelta??"NA"} bandChanges=${s.bandChangeCount}/${s.observations} severeBandChanges=${s.severeBandChangeCount}`,`dailySixAxisRank nDates=${s.dailySixAxisRank.nDates} mean=${s.dailySixAxisRank.mean??"NA"} median=${s.dailySixAxisRank.median??"NA"} min=${s.dailySixAxisRank.min??"NA"} last=${s.dailySixAxisRank.last??"NA"} dates=${s.dailySixAxisRank.firstDate??"NA"}..${s.dailySixAxisRank.lastDate??"NA"}`,"","SECTOR | ETF | CANON_R24 | ALPACA_R24 | N | CURRENT_CANON6 | CURRENT_ALPACA6 | CURRENT_ABS_DELTA | MEAN_ABS_DELTA | P95_ABS_DELTA | MAX_ABS_DELTA | BAND_CHANGES | SEVERE | CURRENT_BANDS"];
  for(const [sectorId,item] of Object.entries(sectors)){const i=item.impact,c=i.current;lines.push(`${sectorId} | ${item.ticker} | ${item.canonicalR24Current??"NA"} | ${item.alpacaR24Current??"NA"} | ${i.n} | ${c?.canonical??"NA"} | ${c?.alpaca??"NA"} | ${c?.absDelta??"NA"} | ${i.meanAbsDelta??"NA"} | ${i.p95AbsDelta??"NA"} | ${i.maxAbsDelta??"NA"} | ${i.bandChangeCount} | ${i.severeBandChangeCount} | ${c?.canonicalBand??"NA"}/${c?.alpacaBand??"NA"}`);}
  lines.push("","note=THIS_DIAGNOSTIC_MEASURES_ONLY_THE_FINAL_15_PERCENT_WEIGHTED_COMPOSITE_SENSITIVITY_TO_CANONICAL_VS_ALPACA_R24_INPUTS","note=R24_REMAINS_A_RESEARCH_PROXY_AND_IS_NOT_VALIDATED_AS_OPTIONS_EQUIVALENT","note=NO_SELECTION_THRESHOLD_IS_INTRODUCED; RESULTS_ARE_EVIDENCE_FOR_THE_EXISTING_RESEARCH_DECISION","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_OR_REFERENCE_CHANGE");
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,lines.join("\n")+"\n");
  return {status:report.status,jsonFile,txtFile,providerCalls:0,publicMutation:false,productionFormulaChanged:false,referenceRequirementChanged:false,summary:report.summary};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(runSectorFearGreedR2136SixAxisSourceImpact(),null,2));}
  catch(error){const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R2136_SIX_AXIS_SOURCE_IMPACT_FAILED";console.log(JSON.stringify({status:"FAILED",code,providerCalls:0,publicMutation:false,productionFormulaChanged:false}));process.exitCode=1;}
}
