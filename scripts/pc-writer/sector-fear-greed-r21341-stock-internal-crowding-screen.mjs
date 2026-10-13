import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS,SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {mergeAlpacaRows} from "./sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {validateStoredBenchmark as validateR21320Benchmark} from "./sector-fear-greed-r21320-alpaca-benchmark-backfill.mjs";
import {validateR21322Stored} from "./sector-fear-greed-r21322-spy-gap-backfill.mjs";
import {validateR21331Stored} from "./sector-fear-greed-r21331-alpaca-sector-etf-backfill.mjs";
import {mergeR21332PriceSeries} from "./sector-fear-greed-r21332-full-252-historical-validation.mjs";
import {buildR21333OutcomeRows,spearmanR21333} from "./sector-fear-greed-r21333-economic-validation.mjs";
import {partialSpearmanR21337,splitR21337Folds} from "./sector-fear-greed-r21337-maxlottery-orthogonal-validation.mjs";
import {scoreR21340Feature} from "./sector-fear-greed-r21340-internal-fragility-screen.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INV_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const R21320_FILE="local-sector-fear-greed-r21320-alpaca-benchmark-backfill.json";
const R21322_FILE="local-sector-fear-greed-r21322-spy-gap-backfill.json";
const R21325_SPY_FILE="local-sector-fear-greed-r21325-spy-history-backfill.json";
const R21331_FILE="local-sector-fear-greed-r21331-alpaca-sector-etf-backfill.json";
const R21332_FILE="local-sector-fear-greed-r21332-full-252-historical-validation.json";
const R213401_FILE="local-sector-fear-greed-r213401-internal-fragility-coverage-correction.json";
const ALPACA_DIR="asset-r10-alpaca";
const OUT="local-sector-fear-greed-r21341-stock-internal-crowding-screen";

export const R21341_FEATURES=Object.freeze(["downsideSignSynchronizationAsymmetry","crossSectionalDispersionShock"]);
export const R21341_REFERENCE_OBSERVATIONS=756;
export const R21341_WINDOW=252;
export const R21341_ROLLING=60;
export const R21341_SHORT=20;
export const R21341_MIN_MEMBERS=8;
export const R21341_MIN_SIGN_DAYS=10;
export const R21341_HORIZONS=Object.freeze([5,20,60]);
export const R21341_EXPECTED_IC_DIRECTION="NEGATIVE";

const finite=x=>typeof x==="number"&&Number.isFinite(x);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const median=a=>{const v=(Array.isArray(a)?a:[]).filter(finite).sort((x,y)=>x-y);if(!v.length)return null;const p=(v.length-1)/2,l=Math.floor(p),h=Math.ceil(p);return l===h?v[l]:(v[l]+v[h])/2;};
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function arr(file){const x=safeJson(file);return Array.isArray(x)?x:[];}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function listAlpacaFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(n=>path.join(dir,n)):[];const inc=path.join(dir,"incremental"),extra=fs.existsSync(inc)?fs.readdirSync(inc).filter(n=>!n.startsWith(".")).sort().map(n=>path.join(inc,n)).filter(f=>fs.statSync(f).isFile()):[];return [...base,...extra];}
function activePitEntry(list,date){const hits=(list??[]).filter(x=>x.dateAdded<=date&&(!x.dateRemoved||date<x.dateRemoved));if(hits.length>1)throw new Error("R21341_PIT_OVERLAP");return hits[0]??null;}
function normalizeStockRows(rows=[]){const byTicker=new Map();for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),ticker=String(row?.ticker??"").trim(),close=Number(row?.close??row?.currentClose??row?.current_close);if(!validDate(date)||!ticker||!finite(close)||close<=0)continue;const list=byTicker.get(ticker)??[];list.push({date,ticker,close});byTicker.set(ticker,list);}for(const list of byTicker.values())list.sort((a,b)=>a.date.localeCompare(b.date));return byTicker;}

export function buildR21341DailySectorSeries({rows=[],pitHistory,sectorId}={}){
  if(!pitHistory?.byTicker)throw new TypeError("R21341_PIT_REQUIRED");
  const byTicker=normalizeStockRows(rows),byDate=new Map();
  for(const [ticker,series] of byTicker){for(let i=1;i<series.length;i++){const curr=series[i],prev=series[i-1],r=curr.close/prev.close-1;if(!finite(r))continue;const active=activePitEntry(pitHistory.byTicker[ticker],curr.date);if(!active||active.sectorId!==sectorId)continue;const list=byDate.get(curr.date)??[];list.push(r);byDate.set(curr.date,list);}}
  const daily=[];
  for(const [date,returns] of [...byDate.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){if(returns.length<R21341_MIN_MEMBERS)continue;const m=mean(returns),med=median(returns),dispersion=median(returns.map(x=>Math.abs(x-med))),sameSign=m<0?returns.filter(x=>x<0).length/returns.length:m>0?returns.filter(x=>x>0).length/returns.length:null;daily.push({date,memberObservations:returns.length,sectorMeanReturn:m,signAgreement:sameSign,crossSectionalDispersion:dispersion});}
  return daily;
}

export function buildR21341RawHistory(daily=[]){
  const rows=(Array.isArray(daily)?daily:[]).filter(r=>validDate(r?.date)&&finite(r?.sectorMeanReturn)&&finite(r?.crossSectionalDispersion)).sort((a,b)=>a.date.localeCompare(b.date)),out=[];
  for(let i=R21341_ROLLING-1;i<rows.length;i++){
    const w=rows.slice(i-R21341_ROLLING+1,i+1),down=w.filter(r=>r.sectorMeanReturn<0&&finite(r.signAgreement)),up=w.filter(r=>r.sectorMeanReturn>0&&finite(r.signAgreement));
    const d60=median(w.map(r=>r.crossSectionalDispersion)),d20=median(w.slice(-R21341_SHORT).map(r=>r.crossSectionalDispersion));
    out.push({date:rows[i].date,downDays:down.length,upDays:up.length,downsideSignSynchronizationAsymmetry:down.length>=R21341_MIN_SIGN_DAYS&&up.length>=R21341_MIN_SIGN_DAYS?mean(down.map(r=>r.signAgreement))-mean(up.map(r=>r.signAgreement)):null,crossSectionalDispersionShock:d20>0&&d60>0?Math.log(d20/d60):null});
  }
  return out;
}

function signedSummary(values=[]){const v=values.filter(finite);return {n:v.length,median:round(median(v)),mean:round(mean(v)),negative:v.filter(x=>x<0).length,positive:v.filter(x=>x>0).length,zero:v.filter(x=>x===0).length};}
function outcomeKey(metric,h){return metric==="return"?`forwardReturn${h}`:`forwardDrawdown${h}`;}
function summarizeTime(rowsBySector={},fiveBySector={}){const detail={},summary={};for(const [id,rows] of Object.entries(rowsBySector)){const five=new Map((fiveBySector[id]??[]).map(r=>[r.date,r.score]));detail[id]={};for(const h of R21341_HORIZONS){detail[id][h]={};for(const metric of ["return","drawdown"]){const key=outcomeKey(metric,h),eligible=rows.filter(r=>finite(r.score)&&finite(r[key])&&finite(five.get(r.date)));detail[id][h][metric]={n:eligible.length,ic:round(spearmanR21333(eligible.map(r=>r.score),eligible.map(r=>r[key]))),partialIcVsFiveRaw:round(partialSpearmanR21337(eligible.map(r=>r.score),eligible.map(r=>r[key]),eligible.map(r=>five.get(r.date))))};}}}for(const h of R21341_HORIZONS){summary[h]={};for(const metric of ["return","drawdown"]){summary[h][metric]={ic:signedSummary(Object.values(detail).map(x=>x[h][metric].ic)),partialIcVsFiveRaw:signedSummary(Object.values(detail).map(x=>x[h][metric].partialIcVsFiveRaw))};}}return {detail,summary};}
function summarizeCross(rowsBySector={},fiveBySector={},allowedDates=null){const ids=Object.keys(rowsBySector).sort(),maps=Object.fromEntries(ids.map(id=>[id,new Map(rowsBySector[id].map(r=>[r.date,r]))])),five=Object.fromEntries(ids.map(id=>[id,new Map((fiveBySector[id]??[]).map(r=>[r.date,r.score]))])),dates=[...new Set(ids.flatMap(id=>rowsBySector[id].map(r=>r.date)))].filter(d=>!allowedDates||allowedDates.has(d)).sort(),detail={},summary={};for(const h of R21341_HORIZONS){detail[h]={};summary[h]={};for(const metric of ["return","drawdown"]){const key=outcomeKey(metric,h),dateRows=[];for(const date of dates){const e=ids.map(id=>({row:maps[id].get(date),five:five[id].get(date)})).filter(x=>finite(x.row?.score)&&finite(x.row?.[key])&&finite(x.five));if(e.length<5)continue;dateRows.push({date,n:e.length,ic:round(spearmanR21333(e.map(x=>x.row.score),e.map(x=>x.row[key]))),partialIcVsFiveRaw:round(partialSpearmanR21337(e.map(x=>x.row.score),e.map(x=>x.row[key]),e.map(x=>x.five)))});}detail[h][metric]=dateRows;summary[h][metric]={ic:signedSummary(dateRows.map(x=>x.ic)),partialIcVsFiveRaw:signedSummary(dateRows.map(x=>x.partialIcVsFiveRaw))};}}return {detail,summary};}
function summarizePeriods(rowsBySector,fiveBySector,dates){const folds=splitR21337Folds(dates),out=[];for(const fold of folds){const allowed=new Set(fold.dates),cross=summarizeCross(rowsBySector,fiveBySector,allowed),cells=[];for(const h of R21341_HORIZONS)for(const metric of ["return","drawdown"])cells.push(cross.summary[h][metric].partialIcVsFiveRaw.median);out.push({fold:fold.fold,firstDate:fold.dates[0],lastDate:fold.dates.at(-1),dates:fold.dates.length,negativeCells:cells.filter(x=>finite(x)&&x<0).length,positiveCells:cells.filter(x=>finite(x)&&x>0).length,crossSectional:cross.summary});}return out;}
function summarizeLoso(rowsBySector,fiveBySector,fullCross){const ids=Object.keys(rowsBySector).sort(),detail={},summary={};for(const omitted of ids){const keep=ids.filter(x=>x!==omitted),r=Object.fromEntries(keep.map(id=>[id,rowsBySector[id]])),f=Object.fromEntries(keep.map(id=>[id,fiveBySector[id]]));detail[omitted]=summarizeCross(r,f).summary;}for(const h of R21341_HORIZONS){summary[h]={};for(const metric of ["return","drawdown"]){const full=fullCross.summary[h][metric].partialIcVsFiveRaw.median,vals=ids.map(id=>detail[id][h][metric].partialIcVsFiveRaw.median).filter(finite),delta=vals.map(x=>x-full);summary[h][metric]={full:round(full),losoMedian:round(median(vals)),min:round(vals.length?Math.min(...vals):null),max:round(vals.length?Math.max(...vals):null),maxAbsDelta:round(delta.length?Math.max(...delta.map(Math.abs)):null),negativeRuns:vals.filter(x=>x<0).length,positiveRuns:vals.filter(x=>x>0).length,runs:vals.length};}}return {detail,summary};}

export function runR21341(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  if(SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS!==R21341_REFERENCE_OBSERVATIONS)throw new Error("R21341_REFERENCE_CONSTANT_MISMATCH");
  const prior=safeJson(path.join(base,R213401_FILE));if(prior?.status!=="SHADOW_R213401_INTERNAL_FRAGILITY_COVERAGE_CORRECTION_COMPLETE")throw new Error("R21341_R213401_NOT_READY");
  for(const name of [PIT_FILE,IEX_FILE,INV_FILE,R21320_FILE,R21322_FILE,R21325_SPY_FILE,R21331_FILE,R21332_FILE])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21341_INPUT_MISSING:${name}`);
  const stockFiles=listAlpacaFiles(path.join(base,ALPACA_DIR));if(!stockFiles.length)throw new Error("R21341_ALPACA_STOCK_STORE_MISSING");const merged=mergeAlpacaRows(stockFiles.map(arr));if(merged.conflicts.length)throw new Error("R21341_ALPACA_STOCK_CONFLICT");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(path.join(base,PIT_FILE),"utf8")),iex=safeJson(path.join(base,IEX_FILE)),inventory=safeJson(path.join(base,INV_FILE)),repair=buildR2134RepairedBenchmarks(iex?.series??{},inventory),earlyPayload=safeJson(path.join(base,R21320_FILE)),early=validateR21320Benchmark(earlyPayload),gap=validateR21322Stored(safeJson(path.join(base,R21322_FILE))),oldSpy=safeJson(path.join(base,R21325_SPY_FILE)),r21331Payload=safeJson(path.join(base,R21331_FILE)),r21331=validateR21331Stored(r21331Payload),r21332=safeJson(path.join(base,R21332_FILE));
  if(!early||!gap||!Array.isArray(oldSpy?.series?.SPY)||!r21331||r21331.sessions!==89||r21332?.status!=="SHADOW_R21332_FULL_252_HISTORICAL_VALIDATION_COMPLETE")throw new Error("R21341_BENCHMARK_INPUT_INVALID");
  const fiveBySector=Object.fromEntries(Object.keys(SECTOR_FEAR_GREED_R1_ETFS).map(id=>[id,r21332.sectors?.[id]?.fiveRaw??[]])),featureRows=Object.fromEntries(R21341_FEATURES.map(k=>[k,{}])),coverage={},rawHistories={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const fullEtf=mergeR21332PriceSeries(repair.series?.[ticker]??[],r21331Payload.series?.[ticker]??[]),priceDates=new Set(fullEtf.map(r=>r.date)),daily=buildR21341DailySectorSeries({rows:merged.rows,pitHistory:pit,sectorId}),history=buildR21341RawHistory(daily);rawHistories[sectorId]=history;coverage[sectorId]={ticker,dailyRows:daily.length,rawHistory:history.length,features:{}};
    for(const key of R21341_FEATURES){const all=scoreR21340Feature(history,key),aligned=all.filter(r=>priceDates.has(r.date)).slice(-R21341_WINDOW);featureRows[key][sectorId]=buildR21333OutcomeRows(aligned,fullEtf);coverage[sectorId].features[key]={rawValid:history.filter(r=>finite(r[key])).length,scoredDates:all.length,alignedDates:aligned.length,firstDate:aligned[0]?.date??null,lastDate:aligned.at(-1)?.date??null};}
  }
  const features={};
  for(const key of R21341_FEATURES){const rowsBySector=featureRows[key],ids=Object.keys(rowsBySector),ready=ids.filter(id=>(coverage[id]?.features?.[key]?.alignedDates??0)===R21341_WINDOW),common=ready.length===11?[...new Set(rowsBySector[ready[0]].map(r=>r.date))].filter(d=>ready.every(id=>rowsBySector[id].some(r=>r.date===d))).sort():[];let evaluation=null;
    if(ready.length===11&&common.length===R21341_WINDOW){const timeSeries=summarizeTime(rowsBySector,fiveBySector),crossSectional=summarizeCross(rowsBySector,fiveBySector),periodStability=summarizePeriods(rowsBySector,fiveBySector,common),loso=summarizeLoso(rowsBySector,fiveBySector,crossSectional),redundancy=[];for(const id of ids){const five=new Map(fiveBySector[id].map(r=>[r.date,r.score])),pairs=rowsBySector[id].filter(r=>finite(five.get(r.date)));redundancy.push(spearmanR21333(pairs.map(r=>r.score),pairs.map(r=>five.get(r.date))));}const crossCells=[],timeCells=[];for(const h of R21341_HORIZONS)for(const metric of ["return","drawdown"]){crossCells.push(crossSectional.summary[h][metric].partialIcVsFiveRaw.median);timeCells.push(timeSeries.summary[h][metric].partialIcVsFiveRaw.median);}evaluation={timeSeries,crossSectional,periodStability,loso,medianSpearmanVsFiveRaw:round(median(redundancy)),sectorSpearmanVsFiveRaw:redundancy.map(round),synthesis:{expectedIcDirection:R21341_EXPECTED_IC_DIRECTION,crossNegativeCells:crossCells.filter(x=>finite(x)&&x<0).length,crossPositiveCells:crossCells.filter(x=>finite(x)&&x>0).length,timeNegativeCells:timeCells.filter(x=>finite(x)&&x<0).length,timePositiveCells:timeCells.filter(x=>finite(x)&&x>0).length,foldMajorityNegative:periodStability.filter(x=>x.negativeCells>x.positiveCells).length}};}
    features[key]={status:evaluation?"READY_252":"INSUFFICIENT_LOCAL_HISTORY",ready252Sectors:ready.length,commonDates:common.length,evaluation};
  }
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.13.41-STOCK-INTERNAL-CROWDING-SCREEN",generatedAt,status:"SHADOW_R21341_STOCK_INTERNAL_CROWDING_SCREEN_COMPLETE",mode:"LOCAL_READ_ONLY_STOCK_INTERNAL_CROWDING_SCREEN",sourceStatus:prior.status,providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,candidateSelected:false,optionsReplacementSelected:false,selectionThresholdIntroduced:false,diagnosticOnly:true,definitions:{downsideSignSynchronizationAsymmetry:"60D_MEAN_DOWNSIDE_SIGN_AGREEMENT_MINUS_UPSIDE_SIGN_AGREEMENT_INVERTED_756_PERCENTILE",crossSectionalDispersionShock:"LOG_MEDIAN_20D_CROSS_SECTIONAL_MAD_OVER_60D_MEDIAN_CROSS_SECTIONAL_MAD_INVERTED_756_PERCENTILE"},coverage,featureResults:features,next:"REVIEW_R21341_BEFORE_ANY_CANDIDATE_SELECTION_OR_PROVIDER_CHANGE"};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.41 STOCK-INTERNAL CROWDING SCREEN",`generatedAt=${generatedAt}`,`status=${report.status}`,`sourceStatus=${report.sourceStatus}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED) normalizationChanged=false weightsChanged=false referenceWindowChanged=false","candidateSelected=false optionsReplacementSelected=false selectionThresholdIntroduced=false diagnosticOnly=true","","FEATURE | STATUS | READY252 | COMMON | SPEARMAN_VS_FIVE | XS_NEG/POS | TS_NEG/POS | FOLD_MAJ_NEG | XS_RET5 | XS_RET20 | XS_RET60 | XS_DD5 | XS_DD20 | XS_DD60"];
  for(const key of R21341_FEATURES){const x=features[key],e=x.evaluation,c=e?.crossSectional?.summary;lines.push(`${key} | ${x.status} | ${x.ready252Sectors}/11 | ${x.commonDates} | ${e?.medianSpearmanVsFiveRaw??"NA"} | ${e?`${e.synthesis.crossNegativeCells}/${e.synthesis.crossPositiveCells}`:"NA"} | ${e?`${e.synthesis.timeNegativeCells}/${e.synthesis.timePositiveCells}`:"NA"} | ${e?`${e.synthesis.foldMajorityNegative}/3`:"NA"} | ${c?.[5]?.return?.partialIcVsFiveRaw?.median??"NA"} | ${c?.[20]?.return?.partialIcVsFiveRaw?.median??"NA"} | ${c?.[60]?.return?.partialIcVsFiveRaw?.median??"NA"} | ${c?.[5]?.drawdown?.partialIcVsFiveRaw?.median??"NA"} | ${c?.[20]?.drawdown?.partialIcVsFiveRaw?.median??"NA"} | ${c?.[60]?.drawdown?.partialIcVsFiveRaw?.median??"NA"}`);}
  lines.push("","note=FEATURES_USE_ONLY_EXISTING_PIT_STOCK_CLOSE_HISTORY_FOR_THE_SIGNAL_AND_EXISTING_SECTOR_ETF_HISTORY_ONLY_FOR_FORWARD_OUTCOME_VALIDATION","note=MISSING_HISTORY_IS_NOT_IMPUTED_AS_ZERO","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE","note=RESULTS_DO_NOT_SELECT_A_CANDIDATE_OR_AUTHORIZE_OPTIONS_REPLACEMENT",`next=${report.next}`);
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`);saveJson(jsonFile,report);saveText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21341();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
