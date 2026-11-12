import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv,buildPointInTimeSectorInputs} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS,SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildSectorSpeculativeRawHistory,SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r2-speculative-shadow.mjs";
import {scoreRawAxis,buildCompositeSeries,rankCorrelationByKey,correlation} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";
import {deriveR28RawAxes} from "./sector-fear-greed-r28-reference-window-diagnostic.mjs";
import {classifyR2111Band} from "./sector-fear-greed-r2111-band-stability.mjs";
import {mergeAlpacaRows} from "./sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {validateStoredBenchmark as validateR21320Benchmark} from "./sector-fear-greed-r21320-alpaca-benchmark-backfill.mjs";
import {mergeR21321BenchmarkRows} from "./sector-fear-greed-r21321-tail-balance-756-readiness.mjs";
import {validateR21322Stored} from "./sector-fear-greed-r21322-spy-gap-backfill.mjs";
import {scoreR21326TailSeries,smoothR21326Series,summarizeR21326Bands} from "./sector-fear-greed-r21326-tail-balance-historical-smoothed-validation.mjs";
import {adaptMergedAlpacaRowsForStoredInput} from "./sector-fear-greed-r21330-alpaca-stock-contract-recheck.mjs";
import {validateR21331Stored} from "./sector-fear-greed-r21331-alpaca-sector-etf-backfill.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INV_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const R21320_FILE="local-sector-fear-greed-r21320-alpaca-benchmark-backfill.json";
const R21322_FILE="local-sector-fear-greed-r21322-spy-gap-backfill.json";
const R21325_SPY_FILE="local-sector-fear-greed-r21325-spy-history-backfill.json";
const R21331_FILE="local-sector-fear-greed-r21331-alpaca-sector-etf-backfill.json";
const ALPACA_DIR="asset-r10-alpaca";
const OUT="local-sector-fear-greed-r21332-full-252-historical-validation";
export const R21332_WINDOW=252;
export const R21332_SPEC_WEIGHT=.15;
export const R21332_SMOOTH_ALPHA=.5;
export const R21332_AXIS_WEIGHTS=Object.freeze({trend:.20,breadth:.20,demand:.15,relativeStrength:.15,volatility:.15});
const AXIS_SPECS=Object.freeze({
  trend:{metrics:[{key:"m125",weight:.50},{key:"r60",weight:.30},{key:"r20",weight:.20}]},
  breadth:{metrics:[{key:"b50",weight:.35},{key:"b200",weight:.35},{key:"highLowNet",weight:.30}]},
  demand:{metrics:[{key:"vb5",weight:.60},{key:"vb20",weight:.40}]},
  relativeStrength:{metrics:[{key:"rs20",weight:.25},{key:"rs60",weight:.45},{key:"rs125",weight:.30}]},
  volatility:{metrics:[{key:"rv20",weight:.40,invert:true},{key:"dsv20",weight:.35,invert:true},{key:"dd63",weight:.25}]},
});
const AXES=Object.keys(R21332_AXIS_WEIGHTS);
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
const mean=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;
const median=x=>{const a=x.filter(finite).sort((a,b)=>a-b);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
const safeJson=file=>{if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}};
const arr=file=>{const x=safeJson(file);return Array.isArray(x)?x:[];};
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function listAlpacaFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(n=>path.join(dir,n)):[];const inc=path.join(dir,"incremental"),incremental=fs.existsSync(inc)?fs.readdirSync(inc).filter(n=>!n.startsWith(".")).sort().map(n=>path.join(inc,n)).filter(f=>fs.statSync(f).isFile()):[];return [...base,...incremental];}

export function mergeR21332PriceSeries(primaryRows=[],extensionRows=[]){return mergeR21321BenchmarkRows(primaryRows,extensionRows).rows;}
export function takeR21332AlignedDates(a=[],b=[],limit=R21332_WINDOW){const bm=new Set((b??[]).map(r=>r.date));const dates=[...new Set((a??[]).map(r=>r.date).filter(d=>bm.has(d)&&validDate(d)))].sort();return dates.slice(-limit);}
function seriesCorrelation(a=[],b=[]){return round(correlation(a,b,{method:"spearman"}));}
function dailyRankSummary(sectors,fieldA,fieldB){const dates=new Set();for(const item of Object.values(sectors))for(const row of item[fieldA]??[])dates.add(row.date);const rows=[];for(const date of [...dates].sort()){const a={},b={};for(const [id,item] of Object.entries(sectors)){const x=(item[fieldA]??[]).find(r=>r.date===date),y=(item[fieldB]??[]).find(r=>r.date===date);if(x&&y){a[id]=x.score;b[id]=y.score;}}if(Object.keys(a).length===11)rows.push({date,rho:rankCorrelationByKey(a,b)});}const v=rows.map(r=>r.rho).filter(finite);return {dates:rows.length,firstDate:rows[0]?.date??null,lastDate:rows.at(-1)?.date??null,mean:round(mean(v)),median:round(median(v)),min:round(v.length?Math.min(...v):null),current:round(rows.at(-1)?.rho)};}

export function runR21332(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  if(SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS!==756||SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS!==756)throw new Error("R21332_REFERENCE_CONSTANT_MISMATCH");
  for(const name of [PIT_FILE,IEX_FILE,INV_FILE,R21320_FILE,R21322_FILE,R21325_SPY_FILE,R21331_FILE])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21332_INPUT_MISSING:${name}`);
  const r21331Payload=safeJson(path.join(base,R21331_FILE)),r21331=validateR21331Stored(r21331Payload);if(!r21331||r21331.sessions!==89)throw new Error("R21332_R21331_INVALID");
  const stockFiles=listAlpacaFiles(path.join(base,ALPACA_DIR));if(!stockFiles.length)throw new Error("R21332_ALPACA_STOCK_STORE_MISSING");const mergedStocks=mergeAlpacaRows(stockFiles.map(arr));if(mergedStocks.conflicts.length)throw new Error("R21332_ALPACA_STOCK_CONFLICT");const adaptedStocks=adaptMergedAlpacaRowsForStoredInput(mergedStocks.rows);if(adaptedStocks.length!==mergedStocks.rows.length)throw new Error("R21332_ALPACA_ADAPTER_ROW_LOSS");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(path.join(base,PIT_FILE),"utf8")),stockDerived=buildPointInTimeSectorInputs({rows:adaptedStocks,pitHistory:pit});
  const iex=safeJson(path.join(base,IEX_FILE)),inventory=safeJson(path.join(base,INV_FILE)),repair=buildR2134RepairedBenchmarks(iex?.series??{},inventory),earlyPayload=safeJson(path.join(base,R21320_FILE)),early=validateR21320Benchmark(earlyPayload),gap=validateR21322Stored(safeJson(path.join(base,R21322_FILE))),oldSpy=safeJson(path.join(base,R21325_SPY_FILE));if(!early||!gap||!Array.isArray(oldSpy?.series?.SPY))throw new Error("R21332_SPY_INPUT_INVALID");
  let fullSpy=mergeR21332PriceSeries(repair.series?.SPY??[],earlyPayload.series?.SPY??[]);fullSpy=mergeR21332PriceSeries(fullSpy,gap.rows);fullSpy=mergeR21332PriceSeries(fullSpy,oldSpy.series.SPY);
  const sectors={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const etfRows=mergeR21332PriceSeries(repair.series?.[ticker]??[],r21331Payload.series?.[ticker]??[]),pitRows=stockDerived.sectors[sectorId]??[],breadthRows=pitRows.filter(r=>[r?.b50,r?.b200,r?.highLowNet].every(finite)),demandRows=pitRows.filter(r=>finite(r?.volumeBreadth));
    const raw=deriveR28RawAxes({etfRows,spyRows:fullSpy,breadthRows,demandRows}),axisSeries={};for(const axis of AXES)axisSeries[axis]=scoreRawAxis(raw[axis],AXIS_SPECS[axis],R21332_WINDOW);
    const fiveAll=buildCompositeSeries(axisSeries,R21332_AXIS_WEIGHTS),tailHistory=buildSectorSpeculativeRawHistory({rows:mergedStocks.rows,spyRows:fullSpy,etfRows:[],pitHistory:pit,sectorId}),tailScores=scoreR21326TailSeries(tailHistory),alignedDates=takeR21332AlignedDates(fiveAll,tailScores);
    if(alignedDates.length!==R21332_WINDOW)throw new Error(`R21332_ALIGNED_NOT_252:${sectorId}:${alignedDates.length}`);
    const fiveMap=new Map(fiveAll.map(r=>[r.date,r.score])),tailMap=new Map(tailScores.map(r=>[r.date,r.score])),fiveRaw=alignedDates.map(date=>({date,score:fiveMap.get(date)})),sixRaw=alignedDates.map(date=>({date,score:fiveMap.get(date)+R21332_SPEC_WEIGHT*tailMap.get(date)})),fiveSmoothed=smoothR21326Series(fiveRaw,R21332_SMOOTH_ALPHA),sixSmoothed=smoothR21326Series(sixRaw,R21332_SMOOTH_ALPHA);
    const tailAligned=alignedDates.map(date=>({date,score:tailMap.get(date)})),redundancy={};for(const axis of AXES){const map=new Map(axisSeries[axis].map(r=>[r.date,r.score]));redundancy[axis]=seriesCorrelation(tailAligned.filter(r=>map.has(r.date)),tailAligned.filter(r=>map.has(r.date)).map(r=>({date:r.date,score:map.get(r.date)})));}
    const deltas=sixRaw.map((r,i)=>Math.abs(r.score-fiveRaw[i].score)),currentFive=fiveSmoothed.at(-1)?.score,currentSix=sixSmoothed.at(-1)?.score;
    sectors[sectorId]={ticker,axisRawCounts:Object.fromEntries(AXES.map(a=>[a,raw[a].length])),axisScoredCounts:Object.fromEntries(AXES.map(a=>[a,axisSeries[a].length])),fiveCompositeDates:fiveAll.length,tailRawObservations:tailHistory.length,tailNormalizedDates:tailScores.length,alignedDates:alignedDates.length,firstAlignedDate:alignedDates[0],lastAlignedDate:alignedDates.at(-1),fiveRaw,sixRaw,fiveSmoothed,sixSmoothed,rawBands:summarizeR21326Bands(fiveRaw,sixRaw),smoothedBands:summarizeR21326Bands(fiveSmoothed,sixSmoothed),tailAxisSpearman:redundancy,maxAbsRawDelta:round(Math.max(...deltas)),medianAbsRawDelta:round(median(deltas)),current:{date:alignedDates.at(-1),tailScore:round(tailMap.get(alignedDates.at(-1))),fiveRaw:round(fiveRaw.at(-1)?.score),sixRaw:round(sixRaw.at(-1)?.score),fiveSmoothed:round(currentFive),sixSmoothed:round(currentSix),fiveBand:classifyR2111Band(currentFive)?.name??null,sixBand:classifyR2111Band(currentSix)?.name??null}};
  }
  const list=Object.values(sectors),pooledRaw={n:list.reduce((s,x)=>s+x.rawBands.n,0),changes:list.reduce((s,x)=>s+x.rawBands.changes,0),severe:list.reduce((s,x)=>s+x.rawBands.severe,0)},pooledSmoothed={n:list.reduce((s,x)=>s+x.smoothedBands.n,0),changes:list.reduce((s,x)=>s+x.smoothedBands.changes,0),severe:list.reduce((s,x)=>s+x.smoothedBands.severe,0)};pooledRaw.changeShare=pooledRaw.n?pooledRaw.changes/pooledRaw.n:null;pooledSmoothed.changeShare=pooledSmoothed.n?pooledSmoothed.changes/pooledSmoothed.n:null;
  const redundancySummary=Object.fromEntries(AXES.map(axis=>{const v=list.map(x=>x.tailAxisSpearman[axis]).filter(finite);return [axis,{median:round(median(v)),min:round(v.length?Math.min(...v):null),max:round(v.length?Math.max(...v):null)}];}));
  const currentBandChanges=list.filter(x=>x.current.fiveBand!==x.current.sixBand).length,summary={sectors:list.length,allReady252:list.length===11&&list.every(x=>x.alignedDates===252),alignedMin:Math.min(...list.map(x=>x.alignedDates)),alignedMax:Math.max(...list.map(x=>x.alignedDates)),rawRank:dailyRankSummary(sectors,"fiveRaw","sixRaw"),smoothedRank:dailyRankSummary(sectors,"fiveSmoothed","sixSmoothed"),pooledRaw:{...pooledRaw,changeShare:round(pooledRaw.changeShare)},pooledSmoothed:{...pooledSmoothed,changeShare:round(pooledSmoothed.changeShare)},currentBandChanges,maxAbsRawDelta:round(Math.max(...list.map(x=>x.maxAbsRawDelta))),medianSectorMedianAbsRawDelta:round(median(list.map(x=>x.medianAbsRawDelta))),tailAxisSpearman:redundancySummary};
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.13.32-FULL-252-HISTORICAL-VALIDATION",generatedAt,status:"SHADOW_R21332_FULL_252_HISTORICAL_VALIDATION_COMPLETE",mode:"LOCAL_READ_ONLY_FULL_252_HISTORY",providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,productionBenchmarkSourceChanged:false,candidateSelected:false,optionsEquivalenceClaimed:false,diagnosticWindow:R21332_WINDOW,smoothingAlpha:R21332_SMOOTH_ALPHA,speculativeWeight:R21332_SPEC_WEIGHT,no85PercentRenormalization:true,inputs:{alpacaStockRows:mergedStocks.rows.length,r21331EtfSessions:r21331.sessions,r21331EtfRows:r21331.totalRows,fullSpyRows:fullSpy.length},summary,sectors,next:"FULL_252_HISTORY_READY_EVALUATE_ECONOMIC_AND_OPTIONS_EQUIVALENCE"};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.32 FULL 252 HISTORICAL VALIDATION",`generatedAt=${generatedAt}`,`status=${report.status}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)","normalizationChanged=false weightsChanged=false productionBenchmarkSourceChanged=false candidateSelected=false optionsEquivalenceClaimed=false",`diagnosticWindow=252 smoothingAlpha=${R21332_SMOOTH_ALPHA} speculativeWeight=${R21332_SPEC_WEIGHT} no85PercentRenormalization=true`,`inputs alpacaStockRows=${report.inputs.alpacaStockRows} r21331EtfSessions=${report.inputs.r21331EtfSessions} r21331EtfRows=${report.inputs.r21331EtfRows} fullSpyRows=${report.inputs.fullSpyRows}`,`allReady252=${summary.allReady252} alignedMin=${summary.alignedMin} alignedMax=${summary.alignedMax}`,`rawRank dates=${summary.rawRank.dates} mean=${summary.rawRank.mean} median=${summary.rawRank.median} min=${summary.rawRank.min} current=${summary.rawRank.current}`,`smoothedRank dates=${summary.smoothedRank.dates} mean=${summary.smoothedRank.mean} median=${summary.smoothedRank.median} min=${summary.smoothedRank.min} current=${summary.smoothedRank.current}`,`rawBands n=${summary.pooledRaw.n} changes=${summary.pooledRaw.changes} severe=${summary.pooledRaw.severe} share=${summary.pooledRaw.changeShare}`,`smoothedBands n=${summary.pooledSmoothed.n} changes=${summary.pooledSmoothed.changes} severe=${summary.pooledSmoothed.severe} share=${summary.pooledSmoothed.changeShare}`,`currentBandChanges=${summary.currentBandChanges} maxAbsRawDelta=${summary.maxAbsRawDelta} medianSectorMedianAbsRawDelta=${summary.medianSectorMedianAbsRawDelta}`,`tailAxisSpearman=${JSON.stringify(summary.tailAxisSpearman)}`,`next=${report.next}`,"","SECTOR | ETF | ALIGNED | FIRST | LAST | TREND | BREADTH | DEMAND | RS | VOL | TAIL | RAW_CHANGE/SEVERE | SMOOTH_CHANGE/SEVERE | CURRENT_FIVE | CURRENT_SIX | BANDS"];
  for(const [id,s] of Object.entries(sectors))lines.push(`${id} | ${s.ticker} | ${s.alignedDates} | ${s.firstAlignedDate} | ${s.lastAlignedDate} | ${s.axisScoredCounts.trend} | ${s.axisScoredCounts.breadth} | ${s.axisScoredCounts.demand} | ${s.axisScoredCounts.relativeStrength} | ${s.axisScoredCounts.volatility} | ${s.tailNormalizedDates} | ${s.rawBands.changes}/${s.rawBands.severe} | ${s.smoothedBands.changes}/${s.smoothedBands.severe} | ${s.current.fiveSmoothed} | ${s.current.sixSmoothed} | ${s.current.fiveBand}->${s.current.sixBand}`);
  lines.push("","note=R21332_REUSES_ONLY_LOCAL_STORED_ALPACA_STOCK_SPY_AND_R21331_ETF_DATA","note=FIVE_AXIS_WEIGHTS_REMAIN_20_20_15_15_15_AND_TAIL_SHADOW_SLOT_REMAINS_15_WITH_NO_85_PERCENT_RENORMALIZATION","note=THIS_IS_RESEARCH_ONLY_AND_DOES_NOT_SELECT_A_PRODUCTION_CANDIDATE_OR_CLAIM_OPTIONS_EQUIVALENCE");
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`);saveJson(jsonFile,report);saveText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21332();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,summary:r.summary,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
