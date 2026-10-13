import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS,SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {scoreRawAxis} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";
import {mergeAlpacaRows} from "./sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {validateR21331Stored} from "./sector-fear-greed-r21331-alpaca-sector-etf-backfill.mjs";
import {mergeR21332PriceSeries} from "./sector-fear-greed-r21332-full-252-historical-validation.mjs";
import {deriveR28RawAxes} from "./sector-fear-greed-r28-reference-window-diagnostic.mjs";
import {buildR21342DailySectorSeries,buildR21342RawHistory} from "./sector-fear-greed-r21342-tail-correlation-screen.mjs";
import {scoreR21340Feature} from "./sector-fear-greed-r21340-internal-fragility-screen.mjs";
import {buildR21333OutcomeRows,spearmanR21333} from "./sector-fear-greed-r21333-economic-validation.mjs";
import {partialSpearmanR21337} from "./sector-fear-greed-r21337-maxlottery-orthogonal-validation.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INV_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const R21331_FILE="local-sector-fear-greed-r21331-alpaca-sector-etf-backfill.json";
const R21332_FILE="local-sector-fear-greed-r21332-full-252-historical-validation.json";
const R21342_FILE="local-sector-fear-greed-r21342-tail-correlation-screen.json";
const R21343_FILE="local-sector-fear-greed-r21343-internal-correlation-sign-persistence.json";
const ALPACA_DIR="asset-r10-alpaca";
const OUT="local-sector-fear-greed-r21344-internal-correlation-incremental-robustness";

export const R21344_FEATURE="internalCorrelationShock";
export const R21344_REFERENCE_OBSERVATIONS=756;
export const R21344_WINDOW=252;
export const R21344_HORIZONS=Object.freeze([5,20,60]);
export const R21344_BOOTSTRAP_BLOCK=21;
export const R21344_BOOTSTRAP_ITERATIONS=2000;
export const R21344_EXPECTED_IC_DIRECTION="NEGATIVE";
export const R21344_VOLATILITY_SPEC=Object.freeze({metrics:[{key:"rv20",weight:.40,invert:true},{key:"dsv20",weight:.35,invert:true},{key:"dd63",weight:.25}]});

const finite=x=>typeof x==="number"&&Number.isFinite(x);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const median=a=>quantile(a,.5);
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
function quantile(values,q){const v=(Array.isArray(values)?values:[]).filter(finite).sort((a,b)=>a-b);if(!v.length)return null;const p=(v.length-1)*q,l=Math.floor(p),h=Math.ceil(p),w=p-l;return l===h?v[l]:v[l]*(1-w)+v[h]*w;}
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function arr(file){const x=safeJson(file);return Array.isArray(x)?x:[];}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function listAlpacaFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(n=>path.join(dir,n)):[];const inc=path.join(dir,"incremental"),extra=fs.existsSync(inc)?fs.readdirSync(inc).filter(n=>!n.startsWith(".")).sort().map(n=>path.join(inc,n)).filter(f=>fs.statSync(f).isFile()):[];return [...base,...extra];}

function rng32(seed){let x=(seed>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
export function movingBlockBootstrapR21344(values=[],{block=R21344_BOOTSTRAP_BLOCK,iterations=R21344_BOOTSTRAP_ITERATIONS,seed=21344}={}){
  const source=(Array.isArray(values)?values:[]).filter(finite);if(!source.length||!Number.isInteger(block)||block<1||!Number.isInteger(iterations)||iterations<1)return {n:source.length,iterations:0,block,observedMedian:round(median(source)),ci025:null,ci975:null,bootstrapMedian:null,probNegative:null};
  const random=rng32(seed),reps=[];for(let b=0;b<iterations;b++){const sample=[];while(sample.length<source.length){const start=Math.floor(random()*source.length);for(let k=0;k<block&&sample.length<source.length;k++)sample.push(source[(start+k)%source.length]);}reps.push(median(sample));}
  return {n:source.length,iterations,block,observedMedian:round(median(source)),ci025:round(quantile(reps,.025)),ci975:round(quantile(reps,.975)),bootstrapMedian:round(median(reps)),probNegative:round(reps.filter(x=>x<0).length/reps.length)};
}

function signedSummary(values=[]){const v=(Array.isArray(values)?values:[]).filter(finite);return {n:v.length,median:round(median(v)),mean:round(mean(v)),negative:v.filter(x=>x<0).length,positive:v.filter(x=>x>0).length,zero:v.filter(x=>x===0).length};}
function outcomeKey(h){return `forwardDrawdown${h}`;}

export function summarizeVolatilityControlledR21344(rowsBySector={},volBySector={}){
  const ids=Object.keys(rowsBySector).sort(),time={},cross={};
  for(const h of R21344_HORIZONS){const key=outcomeKey(h),ts=[];for(const id of ids){const vol=new Map((volBySector[id]??[]).map(r=>[r.date,r.score])),eligible=(rowsBySector[id]??[]).filter(r=>finite(r.score)&&finite(r[key])&&finite(vol.get(r.date)));ts.push(partialSpearmanR21337(eligible.map(r=>r.score),eligible.map(r=>r[key]),eligible.map(r=>vol.get(r.date))));}time[h]=signedSummary(ts);
    const dates=[...new Set(ids.flatMap(id=>(rowsBySector[id]??[]).map(r=>r.date)))].sort(),daily=[];for(const date of dates){const e=ids.map(id=>{const row=(rowsBySector[id]??[]).find(r=>r.date===date),vol=(volBySector[id]??[]).find(r=>r.date===date)?.score;return {row,vol};}).filter(x=>finite(x.row?.score)&&finite(x.row?.[key])&&finite(x.vol));if(e.length<5)continue;daily.push({date,n:e.length,partialIcVsVolatility:partialSpearmanR21337(e.map(x=>x.row.score),e.map(x=>x.row[key]),e.map(x=>x.vol))});}cross[h]={summary:signedSummary(daily.map(x=>x.partialIcVsVolatility)),detail:daily.map(r=>({...r,partialIcVsVolatility:round(r.partialIcVsVolatility)}))};}
  return {timeSeries:time,crossSectional:cross};
}

export function summarizeRedundancyR21344(featureBySector={},volBySector={}){const rows=[];for(const id of Object.keys(featureBySector).sort()){const vol=new Map((volBySector[id]??[]).map(r=>[r.date,r.score])),pairs=(featureBySector[id]??[]).filter(r=>finite(r.score)&&finite(vol.get(r.date)));rows.push({sectorId:id,n:pairs.length,spearman:round(spearmanR21333(pairs.map(r=>r.score),pairs.map(r=>vol.get(r.date))))});}return {median:round(median(rows.map(r=>r.spearman))),min:round(Math.min(...rows.map(r=>r.spearman).filter(finite))),max:round(Math.max(...rows.map(r=>r.spearman).filter(finite))),sectors:rows};}

export function runR21344(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  if(SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS!==R21344_REFERENCE_OBSERVATIONS)throw new Error("R21344_REFERENCE_CONSTANT_MISMATCH");
  const source42=safeJson(path.join(base,R21342_FILE)),source43=safeJson(path.join(base,R21343_FILE)),r21332=safeJson(path.join(base,R21332_FILE));
  if(source42?.status!=="SHADOW_R21342_TAIL_CORRELATION_SCREEN_COMPLETE"||source43?.status!=="SHADOW_R21343_INTERNAL_CORRELATION_SIGN_PERSISTENCE_COMPLETE")throw new Error("R21344_PRIOR_DIAGNOSTIC_NOT_READY");
  if(source42?.featureResults?.[R21344_FEATURE]?.status!=="READY_252"||source43?.feature!==R21344_FEATURE)throw new Error("R21344_FEATURE_NOT_READY");
  if(r21332?.status!=="SHADOW_R21332_FULL_252_HISTORICAL_VALIDATION_COMPLETE")throw new Error("R21344_R21332_NOT_READY");
  for(const name of [PIT_FILE,IEX_FILE,INV_FILE,R21331_FILE])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21344_INPUT_MISSING:${name}`);
  const stockFiles=listAlpacaFiles(path.join(base,ALPACA_DIR));if(!stockFiles.length)throw new Error("R21344_ALPACA_STOCK_STORE_MISSING");const merged=mergeAlpacaRows(stockFiles.map(arr));if(merged.conflicts.length)throw new Error("R21344_ALPACA_STOCK_CONFLICT");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(path.join(base,PIT_FILE),"utf8")),iex=safeJson(path.join(base,IEX_FILE)),inventory=safeJson(path.join(base,INV_FILE)),repair=buildR2134RepairedBenchmarks(iex?.series??{},inventory),r21331Payload=safeJson(path.join(base,R21331_FILE)),r21331=validateR21331Stored(r21331Payload);if(!r21331||r21331.sessions!==89)throw new Error("R21344_R21331_INVALID");
  const featureBySector={},rowsBySector={},volBySector={},coverage={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const fullEtf=mergeR21332PriceSeries(repair.series?.[ticker]??[],r21331Payload.series?.[ticker]??[]),priceDates=new Set(fullEtf.map(r=>r.date)),daily=buildR21342DailySectorSeries({rows:merged.rows,pitHistory:pit,sectorId}),history=buildR21342RawHistory(daily),all=scoreR21340Feature(history,R21344_FEATURE),feature=all.filter(r=>priceDates.has(r.date)).slice(-R21344_WINDOW);if(feature.length!==R21344_WINDOW)throw new Error(`R21344_FEATURE_NOT_252:${sectorId}:${feature.length}`);
    const raw=deriveR28RawAxes({etfRows:fullEtf}),volAll=scoreRawAxis(raw.volatility,R21344_VOLATILITY_SPEC,R21344_WINDOW),volMap=new Map(volAll.map(r=>[r.date,r.score])),vol=feature.filter(r=>volMap.has(r.date)).map(r=>({date:r.date,score:volMap.get(r.date)}));if(vol.length!==R21344_WINDOW)throw new Error(`R21344_VOLATILITY_NOT_252:${sectorId}:${vol.length}`);
    featureBySector[sectorId]=feature;rowsBySector[sectorId]=buildR21333OutcomeRows(feature,fullEtf);volBySector[sectorId]=vol;coverage[sectorId]={ticker,featureDates:feature.length,volatilityDates:vol.length,firstDate:feature[0]?.date??null,lastDate:feature.at(-1)?.date??null};
  }
  const redundancy=summarizeRedundancyR21344(featureBySector,volBySector),volatilityControlled=summarizeVolatilityControlledR21344(rowsBySector,volBySector),bootstrap={};
  for(const h of R21344_HORIZONS){const daily=source42.featureResults[R21344_FEATURE]?.crossSectional?.detail?.[h]?.drawdown??[],values=daily.map(r=>r?.partialIcVsFiveRaw).filter(finite);bootstrap[h]=movingBlockBootstrapR21344(values,{seed:213440+h});}
  const storedFiveRawPartial={};for(const h of R21344_HORIZONS){const s=source42.featureResults[R21344_FEATURE]?.crossSectional?.summary?.[h]?.drawdown?.partialIcVsFiveRaw;storedFiveRawPartial[h]={median:round(s?.median),negative:s?.negative??null,positive:s?.positive??null,n:s?.n??null};}
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.13.44-INTERNAL-CORRELATION-INCREMENTAL-ROBUSTNESS",generatedAt,status:"SHADOW_R21344_INTERNAL_CORRELATION_INCREMENTAL_ROBUSTNESS_COMPLETE",mode:"LOCAL_READ_ONLY_INCREMENTAL_ROBUSTNESS",sourceStatus:source43.status,providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,candidateSelected:false,optionsReplacementSelected:false,selectionThresholdIntroduced:false,diagnosticOnly:true,feature:R21344_FEATURE,expectedIcDirection:R21344_EXPECTED_IC_DIRECTION,bootstrapBlock:R21344_BOOTSTRAP_BLOCK,bootstrapIterations:R21344_BOOTSTRAP_ITERATIONS,coverage,redundancyVsVolatility:redundancy,storedFiveRawPartialDrawdown:storedFiveRawPartial,volatilityControlledDrawdown:volatilityControlled,blockBootstrapFiveRawPartialDrawdown:bootstrap,priorPersistence:source43.synthesis,next:"REVIEW_R21344_BEFORE_ANY_FORMULA_WEIGHT_CANDIDATE_OR_PROVIDER_CHANGE"};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.44 INTERNAL CORRELATION INCREMENTAL ROBUSTNESS",`generatedAt=${generatedAt}`,`status=${report.status}`,`sourceStatus=${report.sourceStatus}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED) normalizationChanged=false weightsChanged=false referenceWindowChanged=false","candidateSelected=false optionsReplacementSelected=false selectionThresholdIntroduced=false diagnosticOnly=true",`feature=${R21344_FEATURE}`,`spearmanVsVolatilityMedian=${redundancy.median} min=${redundancy.min} max=${redundancy.max}`,`bootstrapBlock=${R21344_BOOTSTRAP_BLOCK} bootstrapIterations=${R21344_BOOTSTRAP_ITERATIONS}`,"","H | FIVE_RAW_PARTIAL | BOOT_CI025 | BOOT_CI975 | BOOT_P_NEG | VOL_XS_PARTIAL | VOL_TS_PARTIAL | VOL_XS_NEG/POS | VOL_TS_NEG/POS"];
  for(const h of R21344_HORIZONS){const b=bootstrap[h],xs=volatilityControlled.crossSectional[h].summary,ts=volatilityControlled.timeSeries[h],f=storedFiveRawPartial[h];lines.push(`${h} | ${f.median??"NA"} | ${b.ci025??"NA"} | ${b.ci975??"NA"} | ${b.probNegative??"NA"} | ${xs.median??"NA"} | ${ts.median??"NA"} | ${xs.negative}/${xs.positive} | ${ts.negative}/${ts.positive}`);}
  lines.push("",`priorDrawdownFullNegativeCells=${source43.synthesis?.drawdownFullNegativeCells??"NA"}/3`,`priorDrawdownBlockMajorityNegativeCells=${source43.synthesis?.drawdownBlockMajorityNegativeCells??"NA"}/3`,`priorLeaveOneBlockOutAllNegativeCells=${source43.synthesis?.leaveOneBlockOutAllNegativeCells??"NA"}`,"note=VOLATILITY_CONTROL_USES_THE_EXISTING_R2_DIAGNOSTIC_VOLATILITY_AXIS_DEFINITION_WITHOUT_CHANGING_PRODUCTION","note=BOOTSTRAP_RESAMPLES_STORED_DAILY_CROSS_SECTIONAL_PARTIAL_IC_IN_21_SESSION_CIRCULAR_BLOCKS","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE","note=RESULTS_DO_NOT_SELECT_A_CANDIDATE_OR_AUTHORIZE_OPTIONS_REPLACEMENT",`next=${report.next}`);
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`);saveJson(jsonFile,report);saveText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21344();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,redundancyVsVolatility:r.redundancyVsVolatility,bootstrap:r.blockBootstrapFiveRawPartialDrawdown,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
