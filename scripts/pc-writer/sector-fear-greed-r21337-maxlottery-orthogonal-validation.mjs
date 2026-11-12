import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS,SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildSectorSpeculativeRawHistory,SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r2-speculative-shadow.mjs";
import {mergeAlpacaRows} from "./sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {validateStoredBenchmark as validateR21320Benchmark} from "./sector-fear-greed-r21320-alpaca-benchmark-backfill.mjs";
import {validateR21322Stored} from "./sector-fear-greed-r21322-spy-gap-backfill.mjs";
import {validateR21331Stored} from "./sector-fear-greed-r21331-alpaca-sector-etf-backfill.mjs";
import {mergeR21332PriceSeries} from "./sector-fear-greed-r21332-full-252-historical-validation.mjs";
import {buildR21333OutcomeRows,spearmanR21333} from "./sector-fear-greed-r21333-economic-validation.mjs";
import {scoreR21336Feature} from "./sector-fear-greed-r21336-tail-feature-attribution.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INV_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const R21320_FILE="local-sector-fear-greed-r21320-alpaca-benchmark-backfill.json";
const R21322_FILE="local-sector-fear-greed-r21322-spy-gap-backfill.json";
const R21325_SPY_FILE="local-sector-fear-greed-r21325-spy-history-backfill.json";
const R21331_FILE="local-sector-fear-greed-r21331-alpaca-sector-etf-backfill.json";
const R21332_FILE="local-sector-fear-greed-r21332-full-252-historical-validation.json";
const R21336_FILE="local-sector-fear-greed-r21336-tail-feature-attribution.json";
const ALPACA_DIR="asset-r10-alpaca";
const OUT="local-sector-fear-greed-r21337-maxlottery-orthogonal-validation";

export const R21337_HORIZONS=Object.freeze([5,20,60]);
export const R21337_REFERENCE_OBSERVATIONS=756;
export const R21337_WINDOW=252;
export const R21337_FOLDS=3;
export const R21337_FOLD_SIZE=84;
export const R21337_EXPECTED_IC_DIRECTION="NEGATIVE";
export const R21337_ORTHOGONALIZATION="DATEWISE_CROSS_SECTIONAL_RANK_OLS_MAXLOTTERY_ON_TAILBALANCE";

const finite=x=>typeof x==="number"&&Number.isFinite(x);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
const median=values=>{const a=(Array.isArray(values)?values:[]).filter(finite).sort((x,y)=>x-y);if(!a.length)return null;const p=(a.length-1)/2,l=Math.floor(p),h=Math.ceil(p);return l===h?a[l]:(a[l]+a[h])/2;};
const mean=values=>{const a=(Array.isArray(values)?values:[]).filter(finite);return a.length?a.reduce((s,x)=>s+x,0)/a.length:null;};
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function arr(file){const x=safeJson(file);return Array.isArray(x)?x:[];}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function listAlpacaFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(n=>path.join(dir,n)):[];const inc=path.join(dir,"incremental"),extra=fs.existsSync(inc)?fs.readdirSync(inc).filter(n=>!n.startsWith(".")).sort().map(n=>path.join(inc,n)).filter(f=>fs.statSync(f).isFile()):[];return [...base,...extra];}

export function midranksR21337(values=[]){
  const indexed=(Array.isArray(values)?values:[]).map((value,index)=>({value,index})).filter(x=>finite(x.value)).sort((a,b)=>a.value-b.value);
  const ranks=Array(values.length).fill(null);
  for(let i=0;i<indexed.length;){let j=i+1;while(j<indexed.length&&indexed[j].value===indexed[i].value)j++;const rank=(i+1+j)/2;for(let k=i;k<j;k++)ranks[indexed[k].index]=rank;i=j;}
  return ranks;
}

export function orthogonalizeR21337Date(rows=[]){
  const valid=(Array.isArray(rows)?rows:[]).filter(r=>typeof r?.sectorId==="string"&&finite(r?.tailScore)&&finite(r?.maxLotteryScore));
  if(valid.length<3)return [];
  const x=midranksR21337(valid.map(r=>r.tailScore)),y=midranksR21337(valid.map(r=>r.maxLotteryScore)),mx=mean(x),my=mean(y),den=x.reduce((s,v)=>s+(v-mx)**2,0),beta=den>0?x.reduce((s,v,i)=>s+(v-mx)*(y[i]-my),0)/den:0,alpha=my-beta*mx;
  return valid.map((r,i)=>({...r,tailRank:x[i],maxLotteryRank:y[i],orthogonalScore:y[i]-(alpha+beta*x[i]),orthogonalAlpha:alpha,orthogonalBeta:beta}));
}

export function partialSpearmanR21337(x=[],y=[],control=[]){
  const rows=[];const n=Math.min(x.length,y.length,control.length);for(let i=0;i<n;i++)if(finite(x[i])&&finite(y[i])&&finite(control[i]))rows.push([x[i],y[i],control[i]]);if(rows.length<3)return null;
  const a=rows.map(r=>r[0]),b=rows.map(r=>r[1]),c=rows.map(r=>r[2]),rxy=spearmanR21333(a,b),rxz=spearmanR21333(a,c),ryz=spearmanR21333(b,c);if(![rxy,rxz,ryz].every(finite))return null;const den=Math.sqrt((1-rxz**2)*(1-ryz**2));return den>1e-12?(rxy-rxz*ryz)/den:null;
}

export function splitR21337Folds(dates=[]){const unique=[...new Set((Array.isArray(dates)?dates:[]).filter(validDate))].sort();if(unique.length!==R21337_WINDOW)return [];return Array.from({length:R21337_FOLDS},(_,i)=>({fold:i+1,dates:unique.slice(i*R21337_FOLD_SIZE,(i+1)*R21337_FOLD_SIZE)}));}
function summarizeSigned(values=[]){const v=(Array.isArray(values)?values:[]).filter(finite);return {n:v.length,median:round(median(v)),mean:round(mean(v)),negative:v.filter(x=>x<0).length,positive:v.filter(x=>x>0).length,zero:v.filter(x=>x===0).length};}
function outcomeKey(metric,h){return metric==="return"?`forwardReturn${h}`:`forwardDrawdown${h}`;}

function summarizeTimeSeries(rowsBySector={},fiveBySector={}){
  const detail={},summary={};
  for(const [sectorId,rows] of Object.entries(rowsBySector)){const fiveMap=new Map((fiveBySector[sectorId]??[]).map(r=>[r.date,r.score]));detail[sectorId]={};for(const h of R21337_HORIZONS){detail[sectorId][h]={};for(const metric of ["return","drawdown"]){const key=outcomeKey(metric,h),eligible=(rows??[]).filter(r=>finite(r.orthogonalScore)&&finite(r[key])&&finite(fiveMap.get(r.date)));detail[sectorId][h][metric]={n:eligible.length,ic:round(spearmanR21333(eligible.map(r=>r.orthogonalScore),eligible.map(r=>r[key]))),partialIcVsFiveRaw:round(partialSpearmanR21337(eligible.map(r=>r.orthogonalScore),eligible.map(r=>r[key]),eligible.map(r=>fiveMap.get(r.date))))};}}}
  for(const h of R21337_HORIZONS){summary[h]={};for(const metric of ["return","drawdown"]){summary[h][metric]={ic:summarizeSigned(Object.values(detail).map(x=>x?.[h]?.[metric]?.ic)),partialIcVsFiveRaw:summarizeSigned(Object.values(detail).map(x=>x?.[h]?.[metric]?.partialIcVsFiveRaw))};}}
  return {summary,detail};
}

function summarizeCrossSectional(rowsBySector={},fiveBySector={},allowedDates=null){
  const sectors=Object.keys(rowsBySector).sort(),dates=[...new Set(sectors.flatMap(id=>(rowsBySector[id]??[]).map(r=>r.date)))].filter(d=>!allowedDates||allowedDates.has(d)).sort(),detail={},summary={},rowMaps=Object.fromEntries(sectors.map(id=>[id,new Map((rowsBySector[id]??[]).map(r=>[r.date,r]))])),fiveMaps=Object.fromEntries(sectors.map(id=>[id,new Map((fiveBySector[id]??[]).map(r=>[r.date,r.score]))]));
  for(const h of R21337_HORIZONS){detail[h]={};for(const metric of ["return","drawdown"]){const key=outcomeKey(metric,h),dateRows=[];for(const date of dates){const eligible=sectors.map(id=>({id,row:rowMaps[id].get(date),five:fiveMaps[id].get(date)})).filter(x=>finite(x.row?.orthogonalScore)&&finite(x.row?.[key])&&finite(x.five));if(eligible.length<5)continue;dateRows.push({date,n:eligible.length,ic:round(spearmanR21333(eligible.map(x=>x.row.orthogonalScore),eligible.map(x=>x.row[key]))),partialIcVsFiveRaw:round(partialSpearmanR21337(eligible.map(x=>x.row.orthogonalScore),eligible.map(x=>x.row[key]),eligible.map(x=>x.five)))});}detail[h][metric]=dateRows;summary[h]??={};summary[h][metric]={ic:summarizeSigned(dateRows.map(x=>x.ic)),partialIcVsFiveRaw:summarizeSigned(dateRows.map(x=>x.partialIcVsFiveRaw))};}}
  return {summary,detail};
}

function rebuildOrthogonalRows({scoresBySector,priceBySector,fiveBySector,sectorSubset=null}){
  const sectors=(sectorSubset??Object.keys(scoresBySector)).slice().sort(),dates=[...new Set(sectors.flatMap(id=>(scoresBySector[id]?.tail??[]).map(r=>r.date)))].sort(),scoreMaps=Object.fromEntries(sectors.map(id=>[id,{tail:new Map((scoresBySector[id]?.tail??[]).map(r=>[r.date,r.score])),max:new Map((scoresBySector[id]?.maxLottery??[]).map(r=>[r.date,r.score]))}])),residualSeries=Object.fromEntries(sectors.map(id=>[id,[]])),fitByDate=[];
  for(const date of dates){const rows=sectors.map(sectorId=>({sectorId,date,tailScore:scoreMaps[sectorId].tail.get(date),maxLotteryScore:scoreMaps[sectorId].max.get(date)})).filter(r=>finite(r.tailScore)&&finite(r.maxLotteryScore));if(rows.length!==sectors.length)continue;const orth=orthogonalizeR21337Date(rows);if(orth.length!==sectors.length)continue;fitByDate.push({date,sectors:orth.length,beta:round(orth[0]?.orthogonalBeta),alpha:round(orth[0]?.orthogonalAlpha)});for(const row of orth)residualSeries[row.sectorId].push({date,score:row.orthogonalScore,orthogonalScore:row.orthogonalScore,tailScore:row.tailScore,maxLotteryScore:row.maxLotteryScore});}
  const rowsBySector={};for(const sectorId of sectors){const outcomes=buildR21333OutcomeRows(residualSeries[sectorId],priceBySector[sectorId]??[]);rowsBySector[sectorId]=outcomes.map(r=>({...r,orthogonalScore:r.score}));}
  return {sectors,residualSeries,rowsBySector,fitByDate,fiveBySector:Object.fromEntries(sectors.map(id=>[id,fiveBySector[id]??[]]))};
}

function summarizePeriodStability(rowsBySector,fiveBySector,folds){const out=[];for(const fold of folds){const allowed=new Set(fold.dates),sectorRows=Object.fromEntries(Object.entries(rowsBySector).map(([id,rows])=>[id,(rows??[]).filter(r=>allowed.has(r.date))])),cross=summarizeCrossSectional(sectorRows,fiveBySector,allowed),time=summarizeTimeSeries(sectorRows,fiveBySector),cells=[];for(const h of R21337_HORIZONS)for(const metric of ["return","drawdown"])cells.push(cross.summary?.[h]?.[metric]?.partialIcVsFiveRaw?.median);out.push({fold:fold.fold,firstDate:fold.dates[0],lastDate:fold.dates.at(-1),dates:fold.dates.length,crossSectionalPartialNegativeCells:cells.filter(x=>finite(x)&&x<0).length,crossSectionalPartialPositiveCells:cells.filter(x=>finite(x)&&x>0).length,crossSectional:cross.summary,timeSeries:time.summary});}return out;}

function summarizeLoso({scoresBySector,priceBySector,fiveBySector,fullCross}){const sectorIds=Object.keys(scoresBySector).sort(),detail={},summary={};for(const omitted of sectorIds){const keep=sectorIds.filter(id=>id!==omitted),rebuilt=rebuildOrthogonalRows({scoresBySector,priceBySector,fiveBySector,sectorSubset:keep}),cross=summarizeCrossSectional(rebuilt.rowsBySector,rebuilt.fiveBySector);detail[omitted]=cross.summary;}for(const h of R21337_HORIZONS){summary[h]={};for(const metric of ["return","drawdown"]){const full=fullCross?.summary?.[h]?.[metric]?.partialIcVsFiveRaw?.median,vals=sectorIds.map(id=>detail[id]?.[h]?.[metric]?.partialIcVsFiveRaw?.median).filter(finite),deltas=vals.map(x=>finite(full)?x-full:null).filter(finite);summary[h][metric]={full:round(full),losoMedian:round(median(vals)),min:round(vals.length?Math.min(...vals):null),max:round(vals.length?Math.max(...vals):null),maxAbsDelta:round(deltas.length?Math.max(...deltas.map(Math.abs)):null),negativeRuns:vals.filter(x=>x<0).length,positiveRuns:vals.filter(x=>x>0).length,runs:vals.length};}}return {summary,detail};}

export function runR21337(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  if(SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS!==R21337_REFERENCE_OBSERVATIONS||SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS!==R21337_REFERENCE_OBSERVATIONS)throw new Error("R21337_REFERENCE_CONSTANT_MISMATCH");
  const r21332=safeJson(path.join(base,R21332_FILE)),r21336=safeJson(path.join(base,R21336_FILE));
  if(r21332?.status!=="SHADOW_R21332_FULL_252_HISTORICAL_VALIDATION_COMPLETE"||r21332?.summary?.allReady252!==true||r21332?.approvedR1ReferenceRequirement!==756)throw new Error("R21337_R21332_NOT_READY");
  if(r21336?.status!=="SHADOW_R21336_TAIL_FEATURE_ATTRIBUTION_COMPLETE"||r21336?.diagnosticOnly!==true||r21336?.candidateSelected!==false||r21336?.optionsReplacementSelected!==false)throw new Error("R21337_R21336_NOT_READY");
  if(r21336?.featureResults?.tailBalance?.ready252Sectors!==11||r21336?.featureResults?.maxLottery?.ready252Sectors!==11)throw new Error("R21337_REQUIRED_FEATURE_NOT_11_OF_11");
  if(r21336?.approvedR1ReferenceRequirement!==756||r21336?.weightsChanged!==false||r21336?.normalizationChanged!==false||r21336?.productionFormulaChanged!==false)throw new Error("R21337_SOURCE_CONTRACT_MISMATCH");
  for(const name of [PIT_FILE,IEX_FILE,INV_FILE,R21320_FILE,R21322_FILE,R21325_SPY_FILE,R21331_FILE])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21337_INPUT_MISSING:${name}`);
  const stockFiles=listAlpacaFiles(path.join(base,ALPACA_DIR));if(!stockFiles.length)throw new Error("R21337_ALPACA_STOCK_STORE_MISSING");const mergedStocks=mergeAlpacaRows(stockFiles.map(arr));if(mergedStocks.conflicts.length)throw new Error("R21337_ALPACA_STOCK_CONFLICT");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(path.join(base,PIT_FILE),"utf8")),iex=safeJson(path.join(base,IEX_FILE)),inventory=safeJson(path.join(base,INV_FILE)),repair=buildR2134RepairedBenchmarks(iex?.series??{},inventory),earlyPayload=safeJson(path.join(base,R21320_FILE)),early=validateR21320Benchmark(earlyPayload),gap=validateR21322Stored(safeJson(path.join(base,R21322_FILE))),oldSpy=safeJson(path.join(base,R21325_SPY_FILE)),r21331Payload=safeJson(path.join(base,R21331_FILE)),r21331=validateR21331Stored(r21331Payload);
  if(!early||!gap||!Array.isArray(oldSpy?.series?.SPY)||!r21331||r21331.sessions!==89)throw new Error("R21337_BENCHMARK_INPUT_INVALID");
  let fullSpy=mergeR21332PriceSeries(repair.series?.SPY??[],earlyPayload.series?.SPY??[]);fullSpy=mergeR21332PriceSeries(fullSpy,gap.rows);fullSpy=mergeR21332PriceSeries(fullSpy,oldSpy.series.SPY);
  const scoresBySector={},priceBySector={},fiveBySector={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){const fullEtf=mergeR21332PriceSeries(repair.series?.[ticker]??[],r21331Payload.series?.[ticker]??[]),history=buildSectorSpeculativeRawHistory({rows:mergedStocks.rows,spyRows:fullSpy,etfRows:fullEtf,pitHistory:pit,sectorId}),tailAll=scoreR21336Feature(history,"tailBalance"),maxAll=scoreR21336Feature(history,"maxLottery"),five=(r21332.sectors?.[sectorId]?.fiveRaw??[]).filter(r=>validDate(r?.date)&&finite(r?.score));if(five.length!==R21337_WINDOW)throw new Error(`R21337_FIVE_RAW_NOT_252:${sectorId}:${five.length}`);const dates=new Set(five.map(r=>r.date)),tail=tailAll.filter(r=>dates.has(r.date)),maxLottery=maxAll.filter(r=>dates.has(r.date));if(tail.length!==R21337_WINDOW||maxLottery.length!==R21337_WINDOW)throw new Error(`R21337_FEATURE_ALIGNMENT_NOT_252:${sectorId}:${tail.length}:${maxLottery.length}`);scoresBySector[sectorId]={tail,maxLottery};priceBySector[sectorId]=fullEtf;fiveBySector[sectorId]=five;}
  const rebuilt=rebuildOrthogonalRows({scoresBySector,priceBySector,fiveBySector});if(rebuilt.sectors.length!==11||rebuilt.sectors.some(id=>(rebuilt.residualSeries[id]?.length??0)!==R21337_WINDOW))throw new Error("R21337_ORTHOGONAL_ALIGNMENT_NOT_252");
  const commonDates=[...new Set(rebuilt.sectors.flatMap(id=>rebuilt.residualSeries[id].map(r=>r.date)))].filter(date=>rebuilt.sectors.every(id=>rebuilt.residualSeries[id].some(r=>r.date===date))).sort();if(commonDates.length!==R21337_WINDOW)throw new Error(`R21337_COMMON_DATES_NOT_252:${commonDates.length}`);const folds=splitR21337Folds(commonDates);if(folds.length!==R21337_FOLDS||folds.some(x=>x.dates.length!==R21337_FOLD_SIZE))throw new Error("R21337_FOLD_CONTRACT_MISMATCH");
  const timeSeries=summarizeTimeSeries(rebuilt.rowsBySector,rebuilt.fiveBySector),crossSectional=summarizeCrossSectional(rebuilt.rowsBySector,rebuilt.fiveBySector),periodStability=summarizePeriodStability(rebuilt.rowsBySector,rebuilt.fiveBySector,folds),loso=summarizeLoso({scoresBySector,priceBySector,fiveBySector,fullCross:crossSectional}),fullCells=[],timeCells=[];for(const h of R21337_HORIZONS)for(const metric of ["return","drawdown"]){fullCells.push(crossSectional.summary?.[h]?.[metric]?.partialIcVsFiveRaw?.median);timeCells.push(timeSeries.summary?.[h]?.[metric]?.partialIcVsFiveRaw?.median);}
  const synthesis={expectedIcDirection:R21337_EXPECTED_IC_DIRECTION,crossSectionalPartialNegativeCells:fullCells.filter(x=>finite(x)&&x<0).length,crossSectionalPartialPositiveCells:fullCells.filter(x=>finite(x)&&x>0).length,timeSeriesPartialNegativeCells:timeCells.filter(x=>finite(x)&&x<0).length,timeSeriesPartialPositiveCells:timeCells.filter(x=>finite(x)&&x>0).length,foldsAllSixCrossPartialNegative:periodStability.filter(f=>f.crossSectionalPartialNegativeCells===6).length,foldsWithMajorityNegativeCrossPartial:periodStability.filter(f=>f.crossSectionalPartialNegativeCells>f.crossSectionalPartialPositiveCells).length,judgment:"NO_SELECTION_DIAGNOSTIC_ONLY"};
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.13.37-MAXLOTTERY-ORTHOGONAL-VALIDATION",generatedAt,status:"SHADOW_R21337_MAXLOTTERY_ORTHOGONAL_VALIDATION_COMPLETE",mode:"LOCAL_READ_ONLY_ORTHOGONAL_INCREMENTAL_VALIDATION",sourceStatuses:{r21332:r21332.status,r21336:r21336.status},providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,sourceFilesMutated:false,candidateSelected:false,optionsReplacementSelected:false,selectionThresholdIntroduced:false,diagnosticOnly:true,diagnosticWindow:R21337_WINDOW,horizons:R21337_HORIZONS,folds:R21337_FOLDS,foldSize:R21337_FOLD_SIZE,orthogonalization:R21337_ORTHOGONALIZATION,scoreOrientation:"HIGHER_SCORE_MORE_GREED_RISK_APPETITE",expectedIcDirection:R21337_EXPECTED_IC_DIRECTION,interpretationPolicy:"ORTHOGONAL_INCREMENTAL_INFORMATION_ONLY_NO_COMPOSITE_OR_WEIGHT_CHANGE",fitByDate:rebuilt.fitByDate,timeSeries,crossSectional,periodStability,loso,synthesis,next:"REVIEW_R21337_ORTHOGONAL_INCREMENTAL_EVIDENCE_BEFORE_ANY_CANDIDATE_OR_WEIGHT_DESIGN"};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.37 MAXLOTTERY ORTHOGONAL VALIDATION",`generatedAt=${generatedAt}`,`status=${report.status}`,`sourceR21332=${r21332.status}`,`sourceR21336=${r21336.status}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED) normalizationChanged=false weightsChanged=false referenceWindowChanged=false","candidateSelected=false optionsReplacementSelected=false selectionThresholdIntroduced=false diagnosticOnly=true",`orthogonalization=${report.orthogonalization}`,`expectedIcDirection=${report.expectedIcDirection}`,"","FULL SAMPLE PARTIAL IC CONTROLLING FIVE_RAW","H | METRIC | TS_MEDIAN_PARTIAL | TS_NEG/POS | XS_MEDIAN_PARTIAL | XS_NEG/POS | LOSO_MAX_ABS_DELTA"];
  for(const h of R21337_HORIZONS)for(const metric of ["return","drawdown"]){const ts=timeSeries.summary[h][metric].partialIcVsFiveRaw,xs=crossSectional.summary[h][metric].partialIcVsFiveRaw,l=loso.summary[h][metric];lines.push(`${h} | ${metric} | ${ts.median??"NA"} | ${ts.negative}/${ts.positive} | ${xs.median??"NA"} | ${xs.negative}/${xs.positive} | ${l.maxAbsDelta??"NA"}`);}
  lines.push("","PERIOD STABILITY","FOLD | FIRST | LAST | DATES | XS_PARTIAL_NEG | XS_PARTIAL_POS");for(const f of periodStability)lines.push(`${f.fold} | ${f.firstDate} | ${f.lastDate} | ${f.dates} | ${f.crossSectionalPartialNegativeCells} | ${f.crossSectionalPartialPositiveCells}`);lines.push("",`crossSectionalPartialNegativeCells=${synthesis.crossSectionalPartialNegativeCells} positive=${synthesis.crossSectionalPartialPositiveCells}`,`timeSeriesPartialNegativeCells=${synthesis.timeSeriesPartialNegativeCells} positive=${synthesis.timeSeriesPartialPositiveCells}`,`foldsAllSixCrossPartialNegative=${synthesis.foldsAllSixCrossPartialNegative}`,`foldsWithMajorityNegativeCrossPartial=${synthesis.foldsWithMajorityNegativeCrossPartial}`,`judgment=${synthesis.judgment}`,"note=MAXLOTTERY_IS_ORTHOGONALIZED_AGAINST_TAILBALANCE_IN_DAILY_CROSS_SECTIONAL_RANK_SPACE","note=PARTIAL_SPEARMAN_CONTROLS_FOR_EXISTING_FIVE_RAW_WITHOUT_CREATING_A_NEW_COMPOSITE_OR_WEIGHT","note=LOSO_RECOMPUTES_ORTHOGONALIZATION_AFTER_EACH_SECTOR_IS_REMOVED","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE","note=RESULTS_DO_NOT_SELECT_A_CANDIDATE_OR_AUTHORIZE_OPTIONS_REPLACEMENT",`next=${report.next}`);
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`);saveJson(jsonFile,report);saveText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21337();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,referenceRequirementChanged:r.referenceRequirementChanged,synthesis:r.synthesis,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
