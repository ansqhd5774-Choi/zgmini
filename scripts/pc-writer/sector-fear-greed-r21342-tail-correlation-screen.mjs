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
const R21341_FILE="local-sector-fear-greed-r21341-stock-internal-crowding-screen.json";
const ALPACA_DIR="asset-r10-alpaca";
const OUT="local-sector-fear-greed-r21342-tail-correlation-screen";

export const R21342_FEATURES=Object.freeze(["tailExceedanceAsymmetry","internalCorrelationShock"]);
export const R21342_REFERENCE_OBSERVATIONS=756;
export const R21342_WINDOW=252;
export const R21342_ROLLING=60;
export const R21342_SHORT=20;
export const R21342_MIN_MEMBERS=8;
export const R21342_TAIL_Q=0.10;
export const R21342_HORIZONS=Object.freeze([5,20,60]);
export const R21342_EXPECTED_IC_DIRECTION="NEGATIVE";

const finite=x=>typeof x==="number"&&Number.isFinite(x);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const median=a=>quantile(a,0.5);
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function quantile(values,q){const v=(Array.isArray(values)?values:[]).filter(finite).sort((a,b)=>a-b);if(!v.length)return null;const p=(v.length-1)*q,l=Math.floor(p),h=Math.ceil(p),w=p-l;return l===h?v[l]:v[l]*(1-w)+v[h]*w;}
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function arr(file){const x=safeJson(file);return Array.isArray(x)?x:[];}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function listAlpacaFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(n=>path.join(dir,n)):[];const inc=path.join(dir,"incremental"),extra=fs.existsSync(inc)?fs.readdirSync(inc).filter(n=>!n.startsWith(".")).sort().map(n=>path.join(inc,n)).filter(f=>fs.statSync(f).isFile()):[];return [...base,...extra];}
function activePitEntry(list,date){const hits=(list??[]).filter(x=>x.dateAdded<=date&&(!x.dateRemoved||date<x.dateRemoved));if(hits.length>1)throw new Error("R21342_PIT_OVERLAP");return hits[0]??null;}
function normalizeStockRows(rows=[]){const byTicker=new Map();for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),ticker=String(row?.ticker??"").trim(),close=Number(row?.close??row?.currentClose??row?.current_close);if(!validDate(date)||!ticker||!finite(close)||close<=0)continue;const list=byTicker.get(ticker)??[];list.push({date,ticker,close});byTicker.set(ticker,list);}for(const list of byTicker.values())list.sort((a,b)=>a.date.localeCompare(b.date));return byTicker;}

export function buildR21342DailySectorSeries({rows=[],pitHistory,sectorId}={}){
  if(!pitHistory?.byTicker)throw new TypeError("R21342_PIT_REQUIRED");
  const byTicker=normalizeStockRows(rows),byDate=new Map();
  for(const [ticker,series] of byTicker){
    const returns=[];
    for(let i=1;i<series.length;i++){
      const r=series[i].close/series[i-1].close-1;returns.push(r);
      const date=series[i].date,active=activePitEntry(pitHistory.byTicker[ticker],date);if(!active||active.sectorId!==sectorId)continue;
      let downsideTail=null,upsideTail=null;
      if(returns.length>=R21342_ROLLING+1){const prior=returns.slice(-(R21342_ROLLING+1),-1),qlo=quantile(prior,R21342_TAIL_Q),qhi=quantile(prior,1-R21342_TAIL_Q);downsideTail=r<qlo;upsideTail=r>qhi;}
      const list=byDate.get(date)??[];list.push({ticker,r,downsideTail,upsideTail});byDate.set(date,list);
    }
  }
  const daily=[];
  for(const [date,items] of [...byDate.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){if(items.length<R21342_MIN_MEMBERS)continue;const tail=items.filter(x=>typeof x.downsideTail==="boolean"&&typeof x.upsideTail==="boolean");daily.push({date,memberObservations:items.length,returns:Object.fromEntries(items.map(x=>[x.ticker,x.r])),tailReady:tail.length,tailExceedanceAsymmetry:tail.length>=R21342_MIN_MEMBERS?(tail.filter(x=>x.downsideTail).length-tail.filter(x=>x.upsideTail).length)/tail.length:null});}
  return daily;
}

export function averagePairwiseCorrelationR21342(days=[]){
  if(!Array.isArray(days)||days.length<3)return null;
  let common=null;for(const d of days){const tickers=Object.keys(d?.returns??{});common=common===null?new Set(tickers):new Set(tickers.filter(t=>common.has(t)));if(common.size<R21342_MIN_MEMBERS)return null;}
  const valid=[];for(const ticker of common){const x=days.map(d=>d.returns[ticker]);const m=mean(x),v=mean(x.map(r=>(r-m)**2)),sd=Math.sqrt(v);if(sd>0)valid.push({ticker,z:x.map(r=>(r-m)/sd)});}
  const n=valid.length;if(n<R21342_MIN_MEMBERS)return null;
  let varMean=0;for(let t=0;t<days.length;t++){let mz=0;for(const s of valid)mz+=s.z[t];mz/=n;varMean+=mz*mz;}varMean/=days.length;
  return clamp((n*varMean-1)/(n-1),-1,1);
}

export function buildR21342RawHistory(daily=[]){
  const rows=(Array.isArray(daily)?daily:[]).filter(r=>validDate(r?.date)&&r?.returns&&typeof r.returns==="object").sort((a,b)=>a.date.localeCompare(b.date)),out=[];
  for(let i=0;i<rows.length;i++){
    let internalCorrelationShock=null;
    if(i>=R21342_ROLLING-1){const w60=rows.slice(i-R21342_ROLLING+1,i+1),w20=rows.slice(i-R21342_SHORT+1,i+1),rho60=averagePairwiseCorrelationR21342(w60),rho20=averagePairwiseCorrelationR21342(w20);if(finite(rho60)&&finite(rho20))internalCorrelationShock=rho20-rho60;}
    out.push({date:rows[i].date,tailExceedanceAsymmetry:finite(rows[i].tailExceedanceAsymmetry)?rows[i].tailExceedanceAsymmetry:null,internalCorrelationShock});
  }
  return out;
}

function signedSummary(values=[]){const v=values.filter(finite);return {n:v.length,median:round(median(v)),mean:round(mean(v)),negative:v.filter(x=>x<0).length,positive:v.filter(x=>x>0).length,zero:v.filter(x=>x===0).length};}
function outcomeKey(metric,h){return metric==="return"?`forwardReturn${h}`:`forwardDrawdown${h}`;}
function summarizeTime(rowsBySector={},fiveBySector={}){const detail={},summary={};for(const [id,rows] of Object.entries(rowsBySector)){const five=new Map((fiveBySector[id]??[]).map(r=>[r.date,r.score]));detail[id]={};for(const h of R21342_HORIZONS){detail[id][h]={};for(const metric of ["return","drawdown"]){const key=outcomeKey(metric,h),eligible=rows.filter(r=>finite(r.score)&&finite(r[key])&&finite(five.get(r.date)));detail[id][h][metric]={n:eligible.length,ic:round(spearmanR21333(eligible.map(r=>r.score),eligible.map(r=>r[key]))),partialIcVsFiveRaw:round(partialSpearmanR21337(eligible.map(r=>r.score),eligible.map(r=>r[key]),eligible.map(r=>five.get(r.date))))};}}}for(const h of R21342_HORIZONS){summary[h]={};for(const metric of ["return","drawdown"]){summary[h][metric]={ic:signedSummary(Object.values(detail).map(x=>x[h][metric].ic)),partialIcVsFiveRaw:signedSummary(Object.values(detail).map(x=>x[h][metric].partialIcVsFiveRaw))};}}return {detail,summary};}
function summarizeCross(rowsBySector={},fiveBySector={},allowedDates=null){const ids=Object.keys(rowsBySector).sort(),maps=Object.fromEntries(ids.map(id=>[id,new Map(rowsBySector[id].map(r=>[r.date,r]))])),five=Object.fromEntries(ids.map(id=>[id,new Map((fiveBySector[id]??[]).map(r=>[r.date,r.score]))])),dates=[...new Set(ids.flatMap(id=>rowsBySector[id].map(r=>r.date)))].filter(d=>!allowedDates||allowedDates.has(d)).sort(),detail={},summary={};for(const h of R21342_HORIZONS){detail[h]={};summary[h]={};for(const metric of ["return","drawdown"]){const key=outcomeKey(metric,h),dateRows=[];for(const date of dates){const e=ids.map(id=>({row:maps[id].get(date),five:five[id].get(date)})).filter(x=>finite(x.row?.score)&&finite(x.row?.[key])&&finite(x.five));if(e.length<5)continue;dateRows.push({date,n:e.length,ic:round(spearmanR21333(e.map(x=>x.row.score),e.map(x=>x.row[key]))),partialIcVsFiveRaw:round(partialSpearmanR21337(e.map(x=>x.row.score),e.map(x=>x.row[key]),e.map(x=>x.five)))});}detail[h][metric]=dateRows;summary[h][metric]={ic:signedSummary(dateRows.map(x=>x.ic)),partialIcVsFiveRaw:signedSummary(dateRows.map(x=>x.partialIcVsFiveRaw))};}}return {detail,summary};}
function summarizePeriods(rowsBySector,fiveBySector,dates){const folds=splitR21337Folds(dates),out=[];for(const fold of folds){const allowed=new Set(fold.dates),cross=summarizeCross(rowsBySector,fiveBySector,allowed),cells=[];for(const h of R21342_HORIZONS)for(const metric of ["return","drawdown"])cells.push(cross.summary[h][metric].partialIcVsFiveRaw.median);out.push({fold:fold.fold,firstDate:fold.dates[0],lastDate:fold.dates.at(-1),dates:fold.dates.length,negativeCells:cells.filter(x=>finite(x)&&x<0).length,positiveCells:cells.filter(x=>finite(x)&&x>0).length,crossSectional:cross.summary});}return out;}
function summarizeLoso(rowsBySector,fiveBySector,fullCross){const ids=Object.keys(rowsBySector).sort(),detail={},summary={};for(const omitted of ids){const keep=ids.filter(x=>x!==omitted),r=Object.fromEntries(keep.map(id=>[id,rowsBySector[id]])),f=Object.fromEntries(keep.map(id=>[id,fiveBySector[id]]));detail[omitted]=summarizeCross(r,f).summary;}for(const h of R21342_HORIZONS){summary[h]={};for(const metric of ["return","drawdown"]){const full=fullCross.summary[h][metric].partialIcVsFiveRaw.median,vals=ids.map(id=>detail[id][h][metric].partialIcVsFiveRaw.median).filter(finite),delta=vals.map(x=>x-full);summary[h][metric]={full:round(full),losoMedian:round(median(vals)),min:round(vals.length?Math.min(...vals):null),max:round(vals.length?Math.max(...vals):null),maxAbsDelta:round(delta.length?Math.max(...delta.map(Math.abs)):null),negativeRuns:vals.filter(x=>x<0).length,positiveRuns:vals.filter(x=>x>0).length,runs:vals.length};}}return {detail,summary};}
function evaluate(rowsBySector,fiveBySector,common){const timeSeries=summarizeTime(rowsBySector,fiveBySector),crossSectional=summarizeCross(rowsBySector,fiveBySector),periodStability=summarizePeriods(rowsBySector,fiveBySector,common),loso=summarizeLoso(rowsBySector,fiveBySector,crossSectional),redundancy=[];for(const id of Object.keys(rowsBySector)){const five=new Map((fiveBySector[id]??[]).map(r=>[r.date,r.score])),pairs=rowsBySector[id].filter(r=>finite(five.get(r.date)));redundancy.push(spearmanR21333(pairs.map(r=>r.score),pairs.map(r=>five.get(r.date))));}const xs=[],ts=[];for(const h of R21342_HORIZONS)for(const metric of ["return","drawdown"]){xs.push(crossSectional.summary[h][metric].partialIcVsFiveRaw.median);ts.push(timeSeries.summary[h][metric].partialIcVsFiveRaw.median);}return {timeSeries,crossSectional,periodStability,loso,medianSpearmanVsFiveRaw:round(median(redundancy)),sectorSpearmanVsFiveRaw:redundancy.map(round),synthesis:{expectedIcDirection:R21342_EXPECTED_IC_DIRECTION,crossNegativeCells:xs.filter(x=>finite(x)&&x<0).length,crossPositiveCells:xs.filter(x=>finite(x)&&x>0).length,timeNegativeCells:ts.filter(x=>finite(x)&&x<0).length,timePositiveCells:ts.filter(x=>finite(x)&&x>0).length,foldMajorityNegative:periodStability.filter(x=>x.negativeCells>x.positiveCells).length}};}

export function runR21342(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  if(SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS!==R21342_REFERENCE_OBSERVATIONS)throw new Error("R21342_REFERENCE_CONSTANT_MISMATCH");
  const prior=safeJson(path.join(base,R21341_FILE));if(prior?.status!=="SHADOW_R21341_STOCK_INTERNAL_CROWDING_SCREEN_COMPLETE")throw new Error("R21342_R21341_NOT_READY");
  for(const name of [PIT_FILE,IEX_FILE,INV_FILE,R21320_FILE,R21322_FILE,R21325_SPY_FILE,R21331_FILE,R21332_FILE])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21342_INPUT_MISSING:${name}`);
  const stockFiles=listAlpacaFiles(path.join(base,ALPACA_DIR));if(!stockFiles.length)throw new Error("R21342_ALPACA_STOCK_STORE_MISSING");const merged=mergeAlpacaRows(stockFiles.map(arr));if(merged.conflicts.length)throw new Error("R21342_ALPACA_STOCK_CONFLICT");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(path.join(base,PIT_FILE),"utf8")),iex=safeJson(path.join(base,IEX_FILE)),inventory=safeJson(path.join(base,INV_FILE)),repair=buildR2134RepairedBenchmarks(iex?.series??{},inventory),earlyPayload=safeJson(path.join(base,R21320_FILE)),early=validateR21320Benchmark(earlyPayload),gap=validateR21322Stored(safeJson(path.join(base,R21322_FILE))),oldSpy=safeJson(path.join(base,R21325_SPY_FILE)),r21331Payload=safeJson(path.join(base,R21331_FILE)),r21331=validateR21331Stored(r21331Payload),r21332=safeJson(path.join(base,R21332_FILE));
  if(!early||!gap||!Array.isArray(oldSpy?.series?.SPY)||!r21331||r21331.sessions!==89||r21332?.status!=="SHADOW_R21332_FULL_252_HISTORICAL_VALIDATION_COMPLETE")throw new Error("R21342_BENCHMARK_INPUT_INVALID");
  const fiveBySector=Object.fromEntries(Object.keys(SECTOR_FEAR_GREED_R1_ETFS).map(id=>[id,r21332.sectors?.[id]?.fiveRaw??[]])),featureRows=Object.fromEntries(R21342_FEATURES.map(k=>[k,{}])),coverage={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const fullEtf=mergeR21332PriceSeries(repair.series?.[ticker]??[],r21331Payload.series?.[ticker]??[]),priceDates=new Set(fullEtf.map(r=>r.date)),daily=buildR21342DailySectorSeries({rows:merged.rows,pitHistory:pit,sectorId}),history=buildR21342RawHistory(daily);coverage[sectorId]={ticker,dailyRows:daily.length,rawHistory:history.length,features:{}};
    for(const key of R21342_FEATURES){const validRaw=history.filter(r=>finite(r[key])),all=scoreR21340Feature(history,key),aligned=all.filter(r=>priceDates.has(r.date)).slice(-R21342_WINDOW);coverage[sectorId].features[key]={rawValid:validRaw.length,scoredDates:all.length,alignedDates:aligned.length,firstDate:aligned[0]?.date??null,lastDate:aligned.at(-1)?.date??null};if(aligned.length===R21342_WINDOW)featureRows[key][sectorId]=buildR21333OutcomeRows(aligned,fullEtf);}
  }
  const featureResults={},readyFeatures=[],insufficientFeatures=[];
  for(const key of R21342_FEATURES){const rowsBySector=featureRows[key],ids=Object.keys(rowsBySector),cov=Object.values(coverage).map(x=>x.features[key]),baseResult={status:ids.length===11?"READY_252":"INSUFFICIENT_LOCAL_HISTORY",ready252Sectors:ids.length,rawValidMin:Math.min(...cov.map(x=>x.rawValid)),rawValidMax:Math.max(...cov.map(x=>x.rawValid)),scoredMin:Math.min(...cov.map(x=>x.scoredDates)),scoredMax:Math.max(...cov.map(x=>x.scoredDates)),alignedMin:Math.min(...cov.map(x=>x.alignedDates)),alignedMax:Math.max(...cov.map(x=>x.alignedDates))};if(ids.length!==11){featureResults[key]=baseResult;insufficientFeatures.push(key);continue;}const common=[...new Set(rowsBySector[ids[0]].map(r=>r.date))].filter(d=>ids.every(id=>rowsBySector[id].some(r=>r.date===d))).sort();if(common.length!==R21342_WINDOW){featureResults[key]={...baseResult,status:"INSUFFICIENT_COMMON_DATES",commonDates:common.length};insufficientFeatures.push(key);continue;}featureResults[key]={...baseResult,commonDates:common.length,...evaluate(rowsBySector,fiveBySector,common)};readyFeatures.push(key);}
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.13.42-TAIL-CORRELATION-SCREEN",generatedAt,status:"SHADOW_R21342_TAIL_CORRELATION_SCREEN_COMPLETE",mode:"LOCAL_READ_ONLY_TAIL_CORRELATION_SCREEN",sourceStatus:prior.status,providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,candidateSelected:false,optionsReplacementSelected:false,selectionThresholdIntroduced:false,diagnosticOnly:true,features:R21342_FEATURES,definitions:{tailExceedanceAsymmetry:"PIT_MEMBER_FRACTION_BELOW_OWN_PRIOR60_Q10_MINUS_ABOVE_OWN_PRIOR60_Q90_INVERTED_756_PERCENTILE",internalCorrelationShock:"AVERAGE_PAIRWISE_CORRELATION_20D_MINUS_60D_USING_COMMON_PIT_MEMBERS_INVERTED_756_PERCENTILE"},coverage,featureResults,synthesis:{readyFeatures,insufficientFeatures},next:"REVIEW_R21342_BEFORE_ANY_CANDIDATE_SELECTION_OR_PROVIDER_CHANGE"};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.42 TAIL + CORRELATION SCREEN",`generatedAt=${generatedAt}`,`status=${report.status}`,`sourceStatus=${report.sourceStatus}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED) normalizationChanged=false weightsChanged=false referenceWindowChanged=false","candidateSelected=false optionsReplacementSelected=false selectionThresholdIntroduced=false diagnosticOnly=true","","FEATURE | STATUS | READY252 | COMMON | SPEARMAN_VS_FIVE | XS_NEG/POS | TS_NEG/POS | FOLD_MAJ_NEG | XS_RET5 | XS_RET20 | XS_RET60 | XS_DD5 | XS_DD20 | XS_DD60"];
  for(const key of R21342_FEATURES){const x=featureResults[key];if(x.status!=="READY_252"){lines.push(`${key} | ${x.status} | ${x.ready252Sectors}/11 | ${x.commonDates??0} | NA | NA | NA | NA | NA | NA | NA | NA | NA | NA`);continue;}const c=x.crossSectional.summary;lines.push(`${key} | ${x.status} | 11/11 | ${x.commonDates} | ${x.medianSpearmanVsFiveRaw??"NA"} | ${x.synthesis.crossNegativeCells}/${x.synthesis.crossPositiveCells} | ${x.synthesis.timeNegativeCells}/${x.synthesis.timePositiveCells} | ${x.synthesis.foldMajorityNegative}/3 | ${c[5].return.partialIcVsFiveRaw.median??"NA"} | ${c[20].return.partialIcVsFiveRaw.median??"NA"} | ${c[60].return.partialIcVsFiveRaw.median??"NA"} | ${c[5].drawdown.partialIcVsFiveRaw.median??"NA"} | ${c[20].drawdown.partialIcVsFiveRaw.median??"NA"} | ${c[60].drawdown.partialIcVsFiveRaw.median??"NA"}`);}
  lines.push("",`readyFeatures=${readyFeatures.join(",")||"NONE"}`,`insufficientFeatures=${insufficientFeatures.join(",")||"NONE"}`,"note=SIGNALS_USE_ONLY_EXISTING_LOCAL_PIT_STOCK_CLOSE_HISTORY_AND_SECTOR_ETF_ONLY_FOR_FORWARD_OUTCOME_VALIDATION","note=MISSING_HISTORY_IS_NOT_IMPUTED_AS_ZERO","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE","note=RESULTS_DO_NOT_SELECT_A_CANDIDATE_OR_AUTHORIZE_OPTIONS_REPLACEMENT",`next=${report.next}`);
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`);saveJson(jsonFile,report);saveText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21342();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,synthesis:r.synthesis,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
