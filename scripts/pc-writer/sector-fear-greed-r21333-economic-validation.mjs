import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r2-speculative-shadow.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {validateR21331Stored} from "./sector-fear-greed-r21331-alpaca-sector-etf-backfill.mjs";
import {R21332_WINDOW,R21332_SPEC_WEIGHT,R21332_SMOOTH_ALPHA,R21332_AXIS_WEIGHTS,mergeR21332PriceSeries} from "./sector-fear-greed-r21332-full-252-historical-validation.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const R21332_FILE="local-sector-fear-greed-r21332-full-252-historical-validation.json";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INV_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const R21331_FILE="local-sector-fear-greed-r21331-alpaca-sector-etf-backfill.json";
const OUT="local-sector-fear-greed-r21333-economic-validation";
export const R21333_HORIZONS=Object.freeze([5,20,60]);
export const R21333_MODELS=Object.freeze(["fiveRaw","sixRaw","fiveSmoothed","sixSmoothed"]);
export const R21333_REFERENCE_OBSERVATIONS=756;
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const median=values=>{const a=values.filter(finite).sort((x,y)=>x-y);if(!a.length)return null;const i=(a.length-1)/2,l=Math.floor(i),h=Math.ceil(i);return l===h?a[l]:(a[l]+a[h])/2;};
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function normalizePriceRows(rows=[]){const map=new Map();for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),close=Number(row?.close??row?.currentClose??row?.current_close);if(validDate(date)&&finite(close)&&close>0)map.set(date,{date,close});}return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));}
function normalizeScoreRows(rows=[]){return (Array.isArray(rows)?rows:[]).map(r=>({date:String(r?.date??"").slice(0,10),score:Number(r?.score)})).filter(r=>validDate(r.date)&&finite(r.score)).sort((a,b)=>a.date.localeCompare(b.date));}

function ranks(values){const indexed=values.map((value,index)=>({value,index})).sort((a,b)=>a.value-b.value),out=new Array(values.length);for(let i=0;i<indexed.length;){let j=i+1;while(j<indexed.length&&indexed[j].value===indexed[i].value)j++;const rank=((i+1)+j)/2;for(let k=i;k<j;k++)out[indexed[k].index]=rank;i=j;}return out;}
function pearson(a,b){if(a.length!==b.length||a.length<2)return null;const ma=mean(a),mb=mean(b);let num=0,da=0,db=0;for(let i=0;i<a.length;i++){const xa=a[i]-ma,xb=b[i]-mb;num+=xa*xb;da+=xa*xa;db+=xb*xb;}return da>0&&db>0?num/Math.sqrt(da*db):null;}
export function spearmanR21333(a=[],b=[]){const pairs=[];for(let i=0;i<Math.min(a.length,b.length);i++)if(finite(a[i])&&finite(b[i]))pairs.push([a[i],b[i]]);if(pairs.length<3)return null;return round(pearson(ranks(pairs.map(x=>x[0])),ranks(pairs.map(x=>x[1]))));}

export function buildR21333OutcomeRows(scoreRows=[],priceRows=[]){
  const scores=normalizeScoreRows(scoreRows),prices=normalizePriceRows(priceRows),indexByDate=new Map(prices.map((row,i)=>[row.date,i])),out=[];
  for(const row of scores){
    const i=indexByDate.get(row.date);if(!Number.isInteger(i))continue;
    const current=prices[i].close,item={date:row.date,score:row.score,priceIndex:i};
    for(const h of R21333_HORIZONS){
      if(i+h>=prices.length)continue;
      item[`forwardReturn${h}`]=prices[i+h].close/current-1;
      let min=0;for(let j=i+1;j<=i+h;j++)min=Math.min(min,prices[j].close/current-1);
      item[`forwardDrawdown${h}`]=min;
    }
    out.push(item);
  }
  return out;
}

function outcomeIc(rows,key){const clean=(Array.isArray(rows)?rows:[]).filter(r=>finite(r?.score)&&finite(r?.[key]));return {n:clean.length,rho:spearmanR21333(clean.map(r=>r.score),clean.map(r=>r[key]))};}
export function summarizeR21333TimeSeries(rows=[]){
  const result={};
  for(const h of R21333_HORIZONS){const ret=outcomeIc(rows,`forwardReturn${h}`),dd=outcomeIc(rows,`forwardDrawdown${h}`);result[h]={returnPairs:ret.n,returnIC:ret.rho,drawdownPairs:dd.n,drawdownIC:dd.rho};}
  return result;
}

export function summarizeR21333NonOverlap(rows=[],horizon=5,key=`forwardReturn${horizon}`){
  const buckets=[];
  for(let offset=0;offset<horizon;offset++){
    const selected=(Array.isArray(rows)?rows:[]).filter(r=>Number.isInteger(r?.priceIndex)&&r.priceIndex%horizon===offset&&finite(r?.score)&&finite(r?.[key]));
    buckets.push({offset,n:selected.length,rho:spearmanR21333(selected.map(r=>r.score),selected.map(r=>r[key]))});
  }
  const eligible=buckets.filter(x=>x.n>=3&&finite(x.rho)),rhos=eligible.map(x=>x.rho);
  return {horizon,key,eligibleOffsets:eligible.length,totalOffsets:horizon,minPairs:eligible.length?Math.min(...eligible.map(x=>x.n)):0,medianPairs:round(median(eligible.map(x=>x.n))),medianIC:round(median(rhos)),meanIC:round(mean(rhos)),minIC:round(rhos.length?Math.min(...rhos):null),maxIC:round(rhos.length?Math.max(...rhos):null),positiveOffsets:rhos.filter(x=>x>0).length,negativeOffsets:rhos.filter(x=>x<0).length,buckets};
}

function crossSectionalDate(rows=[]){const clean=(Array.isArray(rows)?rows:[]).filter(r=>finite(r?.score)&&finite(r?.outcome));return {n:clean.length,ic:spearmanR21333(clean.map(r=>r.score),clean.map(r=>r.outcome))};}
export function summarizeR21333CrossSectional(sectorOutcomes={},horizon=5,key=`forwardReturn${horizon}`,omitSector=null){
  const byDate=new Map();
  for(const [sectorId,rows] of Object.entries(sectorOutcomes??{})){
    if(omitSector&&sectorId===omitSector)continue;
    for(const row of Array.isArray(rows)?rows:[]){if(!validDate(row?.date)||!finite(row?.score)||!finite(row?.[key]))continue;if(!byDate.has(row.date))byDate.set(row.date,[]);byDate.get(row.date).push({sectorId,score:row.score,outcome:row[key]});}
  }
  const dates={};
  for(const [date,rows] of [...byDate.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){const x=crossSectionalDate(rows);dates[date]={sectors:x.n,ic:x.ic};}
  const eligible=Object.values(dates).filter(x=>x.sectors>=3&&finite(x.ic)),ics=eligible.map(x=>x.ic),sectorCounts=eligible.map(x=>x.sectors);
  return {horizon,key,omitSector,dates:Object.keys(dates).length,eligibleDates:eligible.length,minSectors:sectorCounts.length?Math.min(...sectorCounts):0,medianSectors:round(median(sectorCounts)),medianIC:round(median(ics)),meanIC:round(mean(ics)),medianAbsIC:round(median(ics.map(Math.abs))),positiveDates:ics.filter(x=>x>0).length,negativeDates:ics.filter(x=>x<0).length,dateDetail:dates};
}

export function summarizeR21333Loso(sectorOutcomes={},horizon=5,key=`forwardReturn${horizon}`){
  const full=summarizeR21333CrossSectional(sectorOutcomes,horizon,key),omissions={};
  for(const sectorId of Object.keys(sectorOutcomes??{}).sort()){const x=summarizeR21333CrossSectional(sectorOutcomes,horizon,key,sectorId);omissions[sectorId]={eligibleDates:x.eligibleDates,medianIC:x.medianIC,meanIC:x.meanIC,deltaMedianIC:finite(x.medianIC)&&finite(full.medianIC)?round(x.medianIC-full.medianIC):null};}
  const deltas=Object.values(omissions).map(x=>x.deltaMedianIC).filter(finite),medians=Object.values(omissions).map(x=>x.medianIC).filter(finite),fullSign=finite(full.medianIC)?Math.sign(full.medianIC):0;
  return {horizon,key,full:{eligibleDates:full.eligibleDates,medianIC:full.medianIC,meanIC:full.meanIC},omissions,maxAbsDeltaMedianIC:round(deltas.length?Math.max(...deltas.map(Math.abs)):null),minOmittedMedianIC:round(medians.length?Math.min(...medians):null),maxOmittedMedianIC:round(medians.length?Math.max(...medians):null),signFlipOmissions:fullSign===0?0:medians.filter(x=>Math.sign(x)!==0&&Math.sign(x)!==fullSign).length};
}

function aggregateSectorTimeSeries(sectors={}){
  const out={};
  for(const h of R21333_HORIZONS){out[h]={};for(const metric of ["return","drawdown"]){const icKey=metric==="return"?"returnIC":"drawdownIC",pairsKey=metric==="return"?"returnPairs":"drawdownPairs",rows=Object.values(sectors),ics=rows.map(x=>x.timeSeries?.[h]?.[icKey]).filter(finite),pairs=rows.map(x=>x.timeSeries?.[h]?.[pairsKey]).filter(finite);out[h][metric]={eligibleSectors:ics.length,minPairs:pairs.length?Math.min(...pairs):0,medianPairs:round(median(pairs)),medianIC:round(median(ics)),meanIC:round(mean(ics)),medianAbsIC:round(median(ics.map(Math.abs))),positiveSectors:ics.filter(x=>x>0).length,negativeSectors:ics.filter(x=>x<0).length};}}
  return out;
}
function aggregateNonOverlap(sectors={}){
  const out={};
  for(const h of R21333_HORIZONS){out[h]={};for(const metric of ["return","drawdown"]){const key=metric==="return"?"return":"drawdown",items=Object.values(sectors).map(x=>x.nonOverlap?.[h]?.[key]).filter(Boolean),ics=items.map(x=>x.medianIC).filter(finite);out[h][metric]={eligibleSectors:ics.length,minEligibleOffsets:items.length?Math.min(...items.map(x=>x.eligibleOffsets)):0,medianEligibleOffsets:round(median(items.map(x=>x.eligibleOffsets))),medianOffsetICAcrossSectors:round(median(ics)),meanOffsetICAcrossSectors:round(mean(ics)),positiveSectorMedians:ics.filter(x=>x>0).length,negativeSectorMedians:ics.filter(x=>x<0).length};}}
  return out;
}
function buildModelSummary(sectorOutcomes={}){
  const sectors={};
  for(const [sectorId,rows] of Object.entries(sectorOutcomes)){const timeSeries=summarizeR21333TimeSeries(rows),nonOverlap={};for(const h of R21333_HORIZONS)nonOverlap[h]={return:summarizeR21333NonOverlap(rows,h,`forwardReturn${h}`),drawdown:summarizeR21333NonOverlap(rows,h,`forwardDrawdown${h}`)};sectors[sectorId]={outcomeRows:rows.length,timeSeries,nonOverlap};}
  const crossSectional={},loso={};
  for(const h of R21333_HORIZONS){crossSectional[h]={return:summarizeR21333CrossSectional(sectorOutcomes,h,`forwardReturn${h}`),drawdown:summarizeR21333CrossSectional(sectorOutcomes,h,`forwardDrawdown${h}`)};loso[h]={return:summarizeR21333Loso(sectorOutcomes,h,`forwardReturn${h}`),drawdown:summarizeR21333Loso(sectorOutcomes,h,`forwardDrawdown${h}`)};}
  return {sectorTimeSeries:aggregateSectorTimeSeries(sectors),nonOverlap:aggregateNonOverlap(sectors),crossSectional,loso,sectors};
}
function economicDeltas(models={}){
  const compare=(five,six)=>{const out={};for(const h of R21333_HORIZONS){out[h]={};for(const metric of ["return","drawdown"]){const a=models[five]?.crossSectional?.[h]?.[metric]?.medianIC,b=models[six]?.crossSectional?.[h]?.[metric]?.medianIC;out[h][metric]={fiveMedianIC:a??null,sixMedianIC:b??null,deltaMedianIC:finite(a)&&finite(b)?round(b-a):null};}}return out;};
  return {raw:compare("fiveRaw","sixRaw"),smoothed:compare("fiveSmoothed","sixSmoothed")};
}

export function runR21333(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  if(SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS!==R21333_REFERENCE_OBSERVATIONS||SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS!==R21333_REFERENCE_OBSERVATIONS)throw new Error("R21333_REFERENCE_CONSTANT_MISMATCH");
  if(R21332_WINDOW!==252||R21332_SPEC_WEIGHT!==.15||R21332_SMOOTH_ALPHA!==.5)throw new Error("R21333_R21332_CONTRACT_MISMATCH");
  const totalWeight=Object.values(R21332_AXIS_WEIGHTS).reduce((a,b)=>a+b,0);if(Math.abs(totalWeight-.85)>1e-12)throw new Error("R21333_FIVE_AXIS_WEIGHT_CONTRACT_MISMATCH");
  for(const name of [R21332_FILE,IEX_FILE,INV_FILE,R21331_FILE])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21333_INPUT_MISSING:${name}`);
  const prior=safeJson(path.join(base,R21332_FILE));if(prior?.status!=="SHADOW_R21332_FULL_252_HISTORICAL_VALIDATION_COMPLETE"||prior?.summary?.allReady252!==true)throw new Error("R21333_R21332_NOT_FULL_252_READY");
  if(prior?.approvedR1ReferenceRequirement!==756||prior?.diagnosticWindow!==252||prior?.speculativeWeight!==.15||prior?.no85PercentRenormalization!==true)throw new Error("R21333_R21332_REPORT_CONTRACT_MISMATCH");
  const r21331Payload=safeJson(path.join(base,R21331_FILE)),r21331=validateR21331Stored(r21331Payload);if(!r21331||r21331.sessions!==89)throw new Error("R21333_R21331_INVALID");
  const iex=safeJson(path.join(base,IEX_FILE)),inventory=safeJson(path.join(base,INV_FILE)),repair=buildR2134RepairedBenchmarks(iex?.series??{},inventory),modelOutcomes=Object.fromEntries(R21333_MODELS.map(id=>[id,{}])),priceCoverage={};
  const sectorEntries=Object.entries(prior?.sectors??{});if(sectorEntries.length!==11)throw new Error(`R21333_SECTOR_COUNT_INVALID:${sectorEntries.length}`);
  for(const [sectorId,item] of sectorEntries){
    const ticker=item?.ticker;if(typeof ticker!=="string"||!ticker)throw new Error(`R21333_TICKER_MISSING:${sectorId}`);
    for(const model of R21333_MODELS)if(!Array.isArray(item?.[model])||item[model].length!==252)throw new Error(`R21333_MODEL_NOT_252:${sectorId}:${model}:${item?.[model]?.length??0}`);
    const fullEtf=mergeR21332PriceSeries(repair.series?.[ticker]??[],r21331Payload.series?.[ticker]??[]),prices=normalizePriceRows(fullEtf);priceCoverage[sectorId]={ticker,rows:prices.length,firstDate:prices[0]?.date??null,lastDate:prices.at(-1)?.date??null};
    for(const model of R21333_MODELS){const outcomes=buildR21333OutcomeRows(item[model],prices);if(outcomes.length!==252)throw new Error(`R21333_PRICE_ALIGNMENT_NOT_252:${sectorId}:${model}:${outcomes.length}`);modelOutcomes[model][sectorId]=outcomes;}
  }
  const models=Object.fromEntries(R21333_MODELS.map(id=>[id,buildModelSummary(modelOutcomes[id])])),comparisons=economicDeltas(models),generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={
    version:"R2.13.33-ECONOMIC-VALIDATION",generatedAt,status:"SHADOW_R21333_ECONOMIC_VALIDATION_COMPLETE",mode:"LOCAL_READ_ONLY_FULL_252_ECONOMIC_VALIDATION",
    providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,productionBenchmarkSourceChanged:false,sourceFilesMutated:false,candidateSelected:false,optionsReplacementSelected:false,optionsEquivalenceClaimed:false,selectionThresholdIntroduced:false,diagnosticOnly:true,
    sourceR21332Status:prior.status,diagnosticWindow:252,horizons:R21333_HORIZONS,smoothingAlpha:R21332_SMOOTH_ALPHA,speculativeWeight:R21332_SPEC_WEIGHT,no85PercentRenormalization:true,icMethod:"SPEARMAN_MIDRANK",forwardReturnDefinition:"P_T_PLUS_H_DIV_P_T_MINUS_1",forwardDrawdownDefinition:"MIN_1_TO_H_P_T_PLUS_J_DIV_P_T_MINUS_1_CAPPED_AT_0",nonOverlapDefinition:"PRICE_INDEX_MOD_H_OFFSET_BUCKETS",losoDefinition:"CROSS_SECTIONAL_DATE_IC_RECOMPUTED_LEAVING_ONE_SECTOR_OUT",interpretationPolicy:"DESCRIPTIVE_ONLY_NO_SELECTION_OR_OPTIONS_REPLACEMENT_RULE",repair:{targetDate:repair.targetDate,complete:repair.complete,injected:repair.injected.length},r21331EtfSessions:r21331.sessions,priceCoverage,models,comparisons,next:"REVIEW_R21333_ECONOMIC_ROBUSTNESS_BEFORE_ANY_TAIL_OR_OPTIONS_REPLACEMENT_JUDGMENT"
  };
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.33 ECONOMIC VALIDATION",`generatedAt=${generatedAt}`,`status=${report.status}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED) normalizationChanged=false weightsChanged=false referenceWindowChanged=false","candidateSelected=false optionsReplacementSelected=false optionsEquivalenceClaimed=false selectionThresholdIntroduced=false diagnosticOnly=true","diagnosticWindow=252 horizons=5,20,60 smoothingAlpha=0.5 speculativeWeight=0.15 no85PercentRenormalization=true",`icMethod=${report.icMethod}`,`nonOverlapDefinition=${report.nonOverlapDefinition}`,`losoDefinition=${report.losoDefinition}`,`interpretationPolicy=${report.interpretationPolicy}`,"","MODEL | H | RET_XS_DATES | RET_XS_MED_IC | DD_XS_DATES | DD_XS_MED_IC | RET_LOSO_MAX_DELTA | DD_LOSO_MAX_DELTA | RET_NONOVERLAP_SECTORS | RET_NONOVERLAP_MED_IC | DD_NONOVERLAP_SECTORS | DD_NONOVERLAP_MED_IC"];
  for(const model of R21333_MODELS){for(const h of R21333_HORIZONS){const m=models[model],ret=m.crossSectional[h].return,dd=m.crossSectional[h].drawdown,rlo=m.loso[h].return,dlo=m.loso[h].drawdown,rno=m.nonOverlap[h].return,dno=m.nonOverlap[h].drawdown;lines.push(`${model} | ${h} | ${ret.eligibleDates} | ${ret.medianIC??"NA"} | ${dd.eligibleDates} | ${dd.medianIC??"NA"} | ${rlo.maxAbsDeltaMedianIC??"NA"} | ${dlo.maxAbsDeltaMedianIC??"NA"} | ${rno.eligibleSectors}/11 | ${rno.medianOffsetICAcrossSectors??"NA"} | ${dno.eligibleSectors}/11 | ${dno.medianOffsetICAcrossSectors??"NA"}`);}}
  lines.push("","FIVE_TO_SIX CROSS-SECTIONAL MEDIAN IC DELTAS","TYPE | H | RET_FIVE | RET_SIX | RET_DELTA | DD_FIVE | DD_SIX | DD_DELTA");
  for(const [type,bucket] of Object.entries(comparisons)){for(const h of R21333_HORIZONS){const r=bucket[h].return,d=bucket[h].drawdown;lines.push(`${type} | ${h} | ${r.fiveMedianIC??"NA"} | ${r.sixMedianIC??"NA"} | ${r.deltaMedianIC??"NA"} | ${d.fiveMedianIC??"NA"} | ${d.sixMedianIC??"NA"} | ${d.deltaMedianIC??"NA"}`);}}
  lines.push("","note=FWD5_FWD20_FWD60_AND_FORWARD_DRAWDOWN_USE_THE_EXISTING_R2138_OUTCOME_DEFINITIONS","note=CROSS_SECTIONAL_IC_GENERALIZES_THE_EXISTING_R21314_MIDRANK_SPEARMAN_METHOD_TO_ALL_THREE_HORIZONS","note=NON_OVERLAP_SPLITS_BY_ETF_PRICE_INDEX_MODULO_HORIZON_SO_FORWARD_WINDOWS_WITHIN_AN_OFFSET_DO_NOT_OVERLAP","note=LOSO_RECOMPUTES_CROSS_SECTIONAL_DATE_IC_AFTER_REMOVING_EACH_SECTOR_ONE_AT_A_TIME","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE","note=RESULTS_ARE_DESCRIPTIVE_ONLY_AND_DO_NOT_SELECT_TAIL_OR_AUTHORIZE_OPTIONS_REPLACEMENT",`next=${report.next}`);
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`);saveJson(jsonFile,report);saveText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21333();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,referenceRequirementChanged:r.referenceRequirementChanged,comparisons:r.comparisons,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
