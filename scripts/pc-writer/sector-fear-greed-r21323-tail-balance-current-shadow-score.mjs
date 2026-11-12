import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv,buildPointInTimeSectorInputs} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS,SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildSectorSpeculativeRawHistory,SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r2-speculative-shadow.mjs";
import {scoreRawAxis,buildCompositeSeries,rankCorrelationByKey} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";
import {deriveR28RawAxes} from "./sector-fear-greed-r28-reference-window-diagnostic.mjs";
import {classifyR2111Band} from "./sector-fear-greed-r2111-band-stability.mjs";
import {mergeAlpacaRows} from "./sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {mergeCanonicalRowsR2135} from "./sector-fear-greed-r2135-r24-source-sensitivity.mjs";
import {validateStoredBenchmark as validateR21320Benchmark} from "./sector-fear-greed-r21320-alpaca-benchmark-backfill.mjs";
import {mergeR21321BenchmarkRows} from "./sector-fear-greed-r21321-tail-balance-756-readiness.mjs";
import {validateR21322Stored} from "./sector-fear-greed-r21322-spy-gap-backfill.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INV_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const R21320_FILE="local-sector-fear-greed-r21320-alpaca-benchmark-backfill.json";
const R21322_FILE="local-sector-fear-greed-r21322-spy-gap-backfill.json";
const R6_FILE="local-breadth-r6-shadow-history.json";
const R7_FILE="local-breadth-r7-pit-price-history.json";
const ALPACA_DIR="asset-r10-alpaca";
const OUT="local-sector-fear-greed-r21323-tail-balance-current-shadow-score";
const WINDOW=252;
const SPEC_WEIGHT=.15;
const AXIS_WEIGHTS_5=Object.freeze({trend:.20,breadth:.20,demand:.15,relativeStrength:.15,volatility:.15});
const AXIS_SPECS=Object.freeze({trend:{metrics:[{key:"m125",weight:.50},{key:"r60",weight:.30},{key:"r20",weight:.20}]},breadth:{metrics:[{key:"b50",weight:.35},{key:"b200",weight:.35},{key:"highLowNet",weight:.30}]},demand:{metrics:[{key:"vb5",weight:.60},{key:"vb20",weight:.40}]},relativeStrength:{metrics:[{key:"rs20",weight:.25},{key:"rs60",weight:.45},{key:"rs125",weight:.30}]},volatility:{metrics:[{key:"rv20",weight:.40,invert:true},{key:"dsv20",weight:.35,invert:true},{key:"dd63",weight:.25}]}});
const AXES=Object.keys(AXIS_WEIGHTS_5);
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
const safeJson=file=>{if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}};
const arr=file=>{const x=safeJson(file);return Array.isArray(x)?x:[];};
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function tableExists(db,name){return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(name));}
function listAlpacaFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(n=>path.join(dir,n)):[];const inc=path.join(dir,"incremental");const incremental=fs.existsSync(inc)?fs.readdirSync(inc).filter(n=>!n.startsWith(".")).sort().map(n=>path.join(inc,n)).filter(f=>fs.statSync(f).isFile()):[];return [...base,...incremental];}
function normalizePriceRows(rows=[]){const map=new Map();for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),close=Number(row?.close??row?.currentClose??row?.current_close);if(validDate(date)&&finite(close)&&close>0)map.set(date,{date,close});}return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));}
function readCanonical(base){const rowSets=[];for(const [name,source] of [[R7_FILE,"BREADTH_R7_LOCAL"],[R6_FILE,"BREADTH_R6_LOCAL"]])rowSets.push({source,rows:safeJson(path.join(base,name))?.rows??[]});const dbRows=[],dbFile=path.join(base,"storage","core.sqlite");if(fs.existsSync(dbFile)){const db=new DatabaseSync(dbFile,{readOnly:true});db.exec("PRAGMA query_only=ON");try{if(tableExists(db,"market_score_breadth_b1_r3_current_v1"))for(const row of db.prepare("SELECT trade_date,ticker,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 ORDER BY trade_date,ticker").all())dbRows.push(row);}finally{db.close();}}return mergeCanonicalRowsR2135(rowSets,dbRows);}

export function scoreR21323TailBalance(history=[],required=SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS){
  const rows=(Array.isArray(history)?history:[]).filter(row=>validDate(String(row?.date??"").slice(0,10))&&finite(Number(row?.tailBalance))).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const normalizableDates=Math.max(0,rows.length-required+1);if(rows.length<required)return {ready:false,observations:rows.length,required,normalizableDates,date:rows.at(-1)?.date??null,currentRaw:rows.at(-1)?.tailBalance??null,score:null};
  const sample=rows.slice(-required),current=Number(sample.at(-1).tailBalance);let below=0,equal=0;for(const row of sample){const value=Number(row.tailBalance);if(value<current)below++;else if(value===current)equal++;}
  return {ready:true,observations:rows.length,required,normalizableDates,date:sample.at(-1).date,currentRaw:current,score:100*(below+.5*equal)/required};
}
export function combineR21323Current(fiveAxisScore,tailScore,weight=SPEC_WEIGHT){const five=Number(fiveAxisScore),tail=Number(tailScore),w=Number(weight);return finite(five)&&finite(tail)&&finite(w)?five+w*tail:null;}

export function runR21323(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  if(SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS!==SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS)throw new Error("R21323_REFERENCE_CONSTANT_MISMATCH");
  for(const name of [PIT_FILE,IEX_FILE,INV_FILE,R21320_FILE,R21322_FILE])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21323_INPUT_MISSING:${name}`);
  const files=listAlpacaFiles(path.join(base,ALPACA_DIR));if(!files.length)throw new Error("R21323_ALPACA_LOCAL_STORE_MISSING");
  const earlyPayload=safeJson(path.join(base,R21320_FILE)),gapPayload=safeJson(path.join(base,R21322_FILE)),early=validateR21320Benchmark(earlyPayload),gap=validateR21322Stored(gapPayload);if(!early||!gap)throw new Error("R21323_SHADOW_BENCHMARK_INVALID");
  const iex=safeJson(path.join(base,IEX_FILE)),inventory=safeJson(path.join(base,INV_FILE)),repair=buildR2134RepairedBenchmarks(iex?.series??{},inventory);let fullSpy=mergeR21321BenchmarkRows(repair.series?.SPY??[],earlyPayload.series?.SPY??[]).rows;fullSpy=mergeR21321BenchmarkRows(fullSpy,gap.rows).rows;
  const mergedStocks=mergeAlpacaRows(files.map(arr));if(mergedStocks.conflicts.length)throw new Error("R21323_ALPACA_STOCK_CONFLICT");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(path.join(base,PIT_FILE),"utf8")),canonical=readCanonical(base),derived=buildPointInTimeSectorInputs({rows:canonical.rows,pitHistory:pit}),fiveSpy=normalizePriceRows(repair.series?.SPY??[]),sectors={},fiveCurrent={},sixCurrent={},tailCurrent={},axisCurrent=Object.fromEntries(AXES.map(axis=>[axis,{}]));
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const tailHistory=buildSectorSpeculativeRawHistory({rows:mergedStocks.rows,spyRows:fullSpy,etfRows:[],pitHistory:pit,sectorId}),tail=scoreR21323TailBalance(tailHistory),etfRows=normalizePriceRows(repair.series?.[ticker]??[]),pitRows=derived.sectors[sectorId]??[],breadthRows=pitRows.filter(row=>[row?.b50,row?.b200,row?.highLowNet].every(finite)),demandRows=pitRows.filter(row=>finite(row?.volumeBreadth)),raw=deriveR28RawAxes({etfRows,spyRows:fiveSpy,breadthRows,demandRows}),axisSeries={};
    for(const axis of AXES)axisSeries[axis]=scoreRawAxis(raw[axis],AXIS_SPECS[axis],WINDOW);
    const fiveSeries=buildCompositeSeries(axisSeries,AXIS_WEIGHTS_5),fiveMap=new Map(fiveSeries.map(row=>[row.date,row.score])),five=tail.date&&fiveMap.has(tail.date)?fiveMap.get(tail.date):null,aligned=finite(five)&&finite(tail.score),six=aligned?combineR21323Current(five,tail.score):null,axisAtDate={};
    for(const axis of AXES){const map=new Map(axisSeries[axis].map(row=>[row.date,row.score]));axisAtDate[axis]=tail.date&&map.has(tail.date)?round(map.get(tail.date)):null;if(finite(axisAtDate[axis]))axisCurrent[axis][sectorId]=axisAtDate[axis];}
    const fiveBand=finite(five)?classifyR2111Band(five):null,sixBand=finite(six)?classifyR2111Band(six):null;
    sectors[sectorId]={ticker,tail:{...tail,currentRaw:round(tail.currentRaw),score:round(tail.score)},fiveAxisDate:fiveSeries.at(-1)?.date??null,alignedDate:aligned?tail.date:null,currentAxes:axisAtDate,fiveAxisRaw:round(five),sixAxisRaw:round(six),delta:aligned?round(six-five):null,fiveAxisRawBand:fiveBand?.name??null,sixAxisRawBand:sixBand?.name??null,bandDiff:fiveBand&&sixBand?Math.abs(fiveBand.index-sixBand.index):null,historicalSmoothedImpactAvailable:tail.normalizableDates>1};
    if(finite(five))fiveCurrent[sectorId]=five;if(finite(six))sixCurrent[sectorId]=six;if(finite(tail.score))tailCurrent[sectorId]=tail.score;
  }
  const list=Object.values(sectors),aligned=list.filter(item=>item.alignedDate).length,normalizableDatesMin=Math.min(...list.map(item=>item.tail.normalizableDates)),normalizableDatesMax=Math.max(...list.map(item=>item.tail.normalizableDates)),generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const report={version:"R2.13.23-TAIL-BALANCE-CURRENT-SHADOW-SCORE",generatedAt,status:"SHADOW_R21323_TAIL_BALANCE_CURRENT_SCORE_COMPLETE",mode:"LOCAL_READ_ONLY_CURRENT_POINT_756_NORMALIZATION",providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS,normalizationChanged:false,weightsChanged:false,productionBenchmarkSourceChanged:false,candidateSelected:false,optionsEquivalenceClaimed:false,diagnosticOnly:true,existingNormalization:"TRAILING_756_PERCENTILE_MIDRANK_TIES",existingFiveAxisWeights:AXIS_WEIGHTS_5,speculativeWeightResearchOnly:SPEC_WEIGHT,no85PercentRenormalization:true,smoothingApplied:false,smoothingReason:"ONLY_CURRENT_756_NORMALIZED_TAIL_BALANCE_POINT_IS_AVAILABLE_WITH_EXACTLY_756_RAW_OBSERVATIONS",historicalSmoothedImpactAvailable:normalizableDatesMin>1,summary:{sectors:list.length,tailReady:list.filter(item=>item.tail.ready).length,currentAligned:aligned,normalizableDatesMin,normalizableDatesMax,currentRankSpearmanFiveVsSix:round(rankCorrelationByKey(fiveCurrent,sixCurrent)),bandChangesRawCurrent:list.filter(item=>finite(item.bandDiff)&&item.bandDiff>0).length,severeBandChangesRawCurrent:list.filter(item=>finite(item.bandDiff)&&item.bandDiff>=2).length,currentTailRankCorrelationVsAxes:Object.fromEntries(AXES.map(axis=>[axis,round(rankCorrelationByKey(tailCurrent,axisCurrent[axis]))]))},sources:{alpacaStockRows:mergedStocks.rows.length,alpacaStockConflicts:mergedStocks.conflicts.length,mergedSpyRows:fullSpy.length,canonicalRows:canonical.rows.length},sectors,next:aligned===11?"CURRENT_POINT_READY_PRODUCTION_HOLD_PENDING_HISTORICAL_SMOOTHED_VALIDATION_AND_ECONOMIC_DECISION":"INVESTIGATE_CURRENT_DATE_ALIGNMENT"};
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`),s=report.summary,lines=["ZGMINI SECTOR FEAR & GREED R2.13.23 TAIL BALANCE CURRENT SHADOW SCORE",`generatedAt=${generatedAt}`,`status=${report.status}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false","dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false referenceRequirementChanged=false productionBenchmarkSourceChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)","normalization=TRAILING_756_PERCENTILE_MIDRANK_TIES (UNCHANGED)","fiveAxisWeights=T.20 B.20 D.15 R.15 V.15 speculativeWeight=.15 no85PercentRenormalization=true","smoothingApplied=false reason=ONLY_CURRENT_756_NORMALIZED_TAIL_BALANCE_POINT_IS_AVAILABLE_WITH_EXACTLY_756_RAW_OBSERVATIONS","candidateSelected=false optionsEquivalenceClaimed=false diagnosticOnly=true",`sources alpacaStockRows=${report.sources.alpacaStockRows} conflicts=${report.sources.alpacaStockConflicts} mergedSpyRows=${report.sources.mergedSpyRows} canonicalRows=${report.sources.canonicalRows}`,`summary tailReady=${s.tailReady}/11 currentAligned=${s.currentAligned}/11 normalizableDates=${s.normalizableDatesMin}..${s.normalizableDatesMax} currentRankSpearmanFiveVsSix=${s.currentRankSpearmanFiveVsSix??"NA"} rawBandChanges=${s.bandChangesRawCurrent} severe=${s.severeBandChangesRawCurrent}`,`tailRankCorrVsAxes ${Object.entries(s.currentTailRankCorrelationVsAxes).map(([k,v])=>`${k}:${v??"NA"}`).join(" ")}`,`next=${report.next}`,"","SECTOR | ETF | DATE | TAIL_RAW | TAIL_SCORE | NORM_DATES | FIVE_RAW | SIX_RAW | DELTA | FIVE_BAND | SIX_BAND | BAND_DIFF"];
  for(const [sectorId,item] of Object.entries(sectors))lines.push(`${sectorId} | ${item.ticker} | ${item.alignedDate??item.tail.date??"NA"} | ${item.tail.currentRaw??"NA"} | ${item.tail.score??"NA"} | ${item.tail.normalizableDates} | ${item.fiveAxisRaw??"NA"} | ${item.sixAxisRaw??"NA"} | ${item.delta??"NA"} | ${item.fiveAxisRawBand??"NA"} | ${item.sixAxisRawBand??"NA"} | ${item.bandDiff??"NA"}`);
  lines.push("","note=THIS_USES_THE_EXISTING_756_PERCENTILE_RULE_AND_EXISTING_FIXED_15_PERCENT_SHADOW_SLOT_WITHOUT_CHANGING_PRODUCTION","note=BECAUSE_EACH_SECTOR_HAS_EXACTLY_756_RAW_TAIL_BALANCE_OBSERVATIONS_ONLY_ONE_NORMALIZED_DATE_EXISTS_TODAY","note=NO_HISTORICAL_SMOOTHED_OR_BAND_STABILITY_CLAIM_IS_MADE_FROM_A_SINGLE_NORMALIZED_POINT","note=REFERENCE_READY_DOES_NOT_MEAN_OPTIONS_EQUIVALENT_OR_PRODUCTION_APPROVED");
  saveJson(jsonFile,report);saveText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21323();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,summary:r.summary,smoothingApplied:r.smoothingApplied,historicalSmoothedImpactAvailable:r.historicalSmoothedImpactAvailable,next:r.next,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,referenceRequirementChanged:r.referenceRequirementChanged},null,2));}catch(error){console.error(error?.stack??error?.message??String(error));process.exitCode=1;}}
