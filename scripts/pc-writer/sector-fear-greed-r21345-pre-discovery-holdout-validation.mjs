import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv,buildPointInTimeSectorInputs} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS,SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {scoreRawAxis,buildCompositeSeries} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";
import {mergeAlpacaRows} from "./sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";
import {adaptMergedAlpacaRowsForStoredInput} from "./sector-fear-greed-r21330-alpaca-stock-contract-recheck.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {validateStoredBenchmark as validateR21320Benchmark} from "./sector-fear-greed-r21320-alpaca-benchmark-backfill.mjs";
import {validateR21322Stored} from "./sector-fear-greed-r21322-spy-gap-backfill.mjs";
import {validateR21331Stored} from "./sector-fear-greed-r21331-alpaca-sector-etf-backfill.mjs";
import {mergeR21332PriceSeries} from "./sector-fear-greed-r21332-full-252-historical-validation.mjs";
import {deriveR28RawAxes} from "./sector-fear-greed-r28-reference-window-diagnostic.mjs";
import {buildR21342DailySectorSeries,buildR21342RawHistory} from "./sector-fear-greed-r21342-tail-correlation-screen.mjs";
import {scoreR21340Feature} from "./sector-fear-greed-r21340-internal-fragility-screen.mjs";
import {buildR21333OutcomeRows,spearmanR21333} from "./sector-fear-greed-r21333-economic-validation.mjs";
import {partialSpearmanR21337} from "./sector-fear-greed-r21337-maxlottery-orthogonal-validation.mjs";
import {movingBlockBootstrapR21344} from "./sector-fear-greed-r21344-internal-correlation-incremental-robustness.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INV_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const R21320_FILE="local-sector-fear-greed-r21320-alpaca-benchmark-backfill.json";
const R21322_FILE="local-sector-fear-greed-r21322-spy-gap-backfill.json";
const R21325_SPY_FILE="local-sector-fear-greed-r21325-spy-history-backfill.json";
const R21331_FILE="local-sector-fear-greed-r21331-alpaca-sector-etf-backfill.json";
const R21342_FILE="local-sector-fear-greed-r21342-tail-correlation-screen.json";
const R21343_FILE="local-sector-fear-greed-r21343-internal-correlation-sign-persistence.json";
const R21344_FILE="local-sector-fear-greed-r21344-internal-correlation-incremental-robustness.json";
const ALPACA_DIR="asset-r10-alpaca";
const OUT="local-sector-fear-greed-r21345-pre-discovery-holdout-validation";

export const R21345_FEATURE="internalCorrelationShock";
export const R21345_REFERENCE_OBSERVATIONS=756;
export const R21345_FIVE_RAW_WINDOW=252;
export const R21345_HORIZONS=Object.freeze([5,20,60]);
export const R21345_BOOTSTRAP_BLOCK=21;
export const R21345_BOOTSTRAP_ITERATIONS=2000;
export const R21345_EXPECTED_IC_DIRECTION="NEGATIVE";
export const R21345_AXIS_WEIGHTS=Object.freeze({trend:.20,breadth:.20,demand:.15,relativeStrength:.15,volatility:.15});
export const R21345_AXIS_SPECS=Object.freeze({
  trend:{metrics:[{key:"m125",weight:.50},{key:"r60",weight:.30},{key:"r20",weight:.20}]},
  breadth:{metrics:[{key:"b50",weight:.35},{key:"b200",weight:.35},{key:"highLowNet",weight:.30}]},
  demand:{metrics:[{key:"vb5",weight:.60},{key:"vb20",weight:.40}]},
  relativeStrength:{metrics:[{key:"rs20",weight:.25},{key:"rs60",weight:.45},{key:"rs125",weight:.30}]},
  volatility:{metrics:[{key:"rv20",weight:.40,invert:true},{key:"dsv20",weight:.35,invert:true},{key:"dd63",weight:.25}]},
});

const AXES=Object.keys(R21345_AXIS_WEIGHTS);
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
function signedSummary(values=[]){const v=(Array.isArray(values)?values:[]).filter(finite);return {n:v.length,median:round(median(v)),mean:round(mean(v)),negative:v.filter(x=>x<0).length,positive:v.filter(x=>x>0).length,zero:v.filter(x=>x===0).length};}

export function futureEndDateR21345(priceRows=[],date,horizon){
  if(!validDate(date)||!Number.isInteger(horizon)||horizon<1)return null;
  const dates=(Array.isArray(priceRows)?priceRows:[]).map(r=>String(r?.date??"").slice(0,10)).filter(validDate);
  const i=dates.indexOf(date);return i>=0&&i+horizon<dates.length?dates[i+horizon]:null;
}

export function selectPreDiscoveryCommonDatesR21345(seriesBySector={},discoveryStart){
  if(!validDate(discoveryStart))return [];
  const ids=Object.keys(seriesBySector).sort();if(!ids.length)return [];
  const sets=ids.map(id=>new Set((seriesBySector[id]??[]).map(r=>r?.date).filter(d=>validDate(d)&&d<discoveryStart)));
  return [...sets[0]].filter(d=>sets.every(s=>s.has(d))).sort();
}

export function summarizeHoldoutR21345({rowsBySector={},fiveBySector={},priceBySector={},discoveryStart,horizon}={}){
  const ids=Object.keys(rowsBySector).sort(),key=`forwardDrawdown${horizon}`,time=[];
  for(const id of ids){const five=new Map((fiveBySector[id]??[]).map(r=>[r.date,r.score]));const eligible=(rowsBySector[id]??[]).filter(r=>{const end=futureEndDateR21345(priceBySector[id]??[],r.date,horizon);return finite(r.score)&&finite(r[key])&&finite(five.get(r.date))&&validDate(end)&&end<discoveryStart;});time.push({sectorId:id,n:eligible.length,partialIcVsFiveRaw:round(partialSpearmanR21337(eligible.map(r=>r.score),eligible.map(r=>r[key]),eligible.map(r=>five.get(r.date))))});}
  const dates=[...new Set(ids.flatMap(id=>(rowsBySector[id]??[]).map(r=>r.date)))].filter(d=>d<discoveryStart).sort(),daily=[];
  for(const date of dates){const e=[];for(const id of ids){const row=(rowsBySector[id]??[]).find(r=>r.date===date),five=(fiveBySector[id]??[]).find(r=>r.date===date)?.score,end=futureEndDateR21345(priceBySector[id]??[],date,horizon);if(finite(row?.score)&&finite(row?.[key])&&finite(five)&&validDate(end)&&end<discoveryStart)e.push({row,five});}if(e.length<5)continue;daily.push({date,n:e.length,partialIcVsFiveRaw:round(partialSpearmanR21337(e.map(x=>x.row.score),e.map(x=>x.row[key]),e.map(x=>x.five)))});}
  const fullMedian=round(median(daily.map(r=>r.partialIcVsFiveRaw))),loso=[];
  for(const omitted of ids){const keep=ids.filter(x=>x!==omitted),d=[];for(const date of dates){const e=[];for(const id of keep){const row=(rowsBySector[id]??[]).find(r=>r.date===date),five=(fiveBySector[id]??[]).find(r=>r.date===date)?.score,end=futureEndDateR21345(priceBySector[id]??[],date,horizon);if(finite(row?.score)&&finite(row?.[key])&&finite(five)&&validDate(end)&&end<discoveryStart)e.push({row,five});}if(e.length<5)continue;d.push(partialSpearmanR21337(e.map(x=>x.row.score),e.map(x=>x.row[key]),e.map(x=>x.five)));}loso.push({omitted,median:round(median(d))});}
  return {horizon,discoveryStart,crossSectional:{summary:signedSummary(daily.map(r=>r.partialIcVsFiveRaw)),detail:daily},timeSeries:{summary:signedSummary(time.map(r=>r.partialIcVsFiveRaw)),detail:time},loso:{summary:signedSummary(loso.map(r=>r.median)),detail:loso,fullMedian},bootstrap:movingBlockBootstrapR21344(daily.map(r=>r.partialIcVsFiveRaw),{block:R21345_BOOTSTRAP_BLOCK,iterations:R21345_BOOTSTRAP_ITERATIONS,seed:213450+horizon})};
}

export function runR21345(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  if(SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS!==R21345_REFERENCE_OBSERVATIONS)throw new Error("R21345_REFERENCE_CONSTANT_MISMATCH");
  const source42=safeJson(path.join(base,R21342_FILE)),source43=safeJson(path.join(base,R21343_FILE)),source44=safeJson(path.join(base,R21344_FILE));
  if(source42?.status!=="SHADOW_R21342_TAIL_CORRELATION_SCREEN_COMPLETE"||source43?.status!=="SHADOW_R21343_INTERNAL_CORRELATION_SIGN_PERSISTENCE_COMPLETE"||source44?.status!=="SHADOW_R21344_INTERNAL_CORRELATION_INCREMENTAL_ROBUSTNESS_COMPLETE")throw new Error("R21345_PRIOR_DIAGNOSTIC_NOT_READY");
  if(source42?.featureResults?.[R21345_FEATURE]?.status!=="READY_252"||source43?.feature!==R21345_FEATURE||source44?.feature!==R21345_FEATURE)throw new Error("R21345_FEATURE_CONTRACT_MISMATCH");
  const discoveryStart=source43?.dates?.[0];if(!validDate(discoveryStart))throw new Error("R21345_DISCOVERY_START_MISSING");
  for(const name of [PIT_FILE,IEX_FILE,INV_FILE,R21320_FILE,R21322_FILE,R21325_SPY_FILE,R21331_FILE])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21345_INPUT_MISSING:${name}`);
  const stockFiles=listAlpacaFiles(path.join(base,ALPACA_DIR));if(!stockFiles.length)throw new Error("R21345_ALPACA_STOCK_STORE_MISSING");const merged=mergeAlpacaRows(stockFiles.map(arr));if(merged.conflicts.length)throw new Error("R21345_ALPACA_STOCK_CONFLICT");const adapted=adaptMergedAlpacaRowsForStoredInput(merged.rows);if(adapted.length!==merged.rows.length)throw new Error("R21345_ALPACA_ADAPTER_ROW_LOSS");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(path.join(base,PIT_FILE),"utf8")),stockDerived=buildPointInTimeSectorInputs({rows:adapted,pitHistory:pit}),iex=safeJson(path.join(base,IEX_FILE)),inventory=safeJson(path.join(base,INV_FILE)),repair=buildR2134RepairedBenchmarks(iex?.series??{},inventory),earlyPayload=safeJson(path.join(base,R21320_FILE)),early=validateR21320Benchmark(earlyPayload),gap=validateR21322Stored(safeJson(path.join(base,R21322_FILE))),oldSpy=safeJson(path.join(base,R21325_SPY_FILE)),r21331Payload=safeJson(path.join(base,R21331_FILE)),r21331=validateR21331Stored(r21331Payload);
  if(!early||!gap||!Array.isArray(oldSpy?.series?.SPY)||!r21331||r21331.sessions!==89)throw new Error("R21345_BENCHMARK_INPUT_INVALID");
  let fullSpy=mergeR21332PriceSeries(repair.series?.SPY??[],earlyPayload.series?.SPY??[]);fullSpy=mergeR21332PriceSeries(fullSpy,gap.rows);fullSpy=mergeR21332PriceSeries(fullSpy,oldSpy.series.SPY);
  const rowsBySector={},fiveBySector={},priceBySector={},candidateSeriesBySector={},coverage={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const fullEtf=mergeR21332PriceSeries(repair.series?.[ticker]??[],r21331Payload.series?.[ticker]??[]),priceDates=new Set(fullEtf.map(r=>r.date)),daily=buildR21342DailySectorSeries({rows:merged.rows,pitHistory:pit,sectorId}),history=buildR21342RawHistory(daily),candidateAll=scoreR21340Feature(history,R21345_FEATURE).filter(r=>priceDates.has(r.date));
    const pitRows=stockDerived.sectors[sectorId]??[],breadthRows=pitRows.filter(r=>[r?.b50,r?.b200,r?.highLowNet].every(finite)),demandRows=pitRows.filter(r=>finite(r?.volumeBreadth)),raw=deriveR28RawAxes({etfRows:fullEtf,spyRows:fullSpy,breadthRows,demandRows}),axisSeries={};for(const axis of AXES)axisSeries[axis]=scoreRawAxis(raw[axis],R21345_AXIS_SPECS[axis],R21345_FIVE_RAW_WINDOW);const fiveAll=buildCompositeSeries(axisSeries,R21345_AXIS_WEIGHTS),fiveMap=new Map(fiveAll.map(r=>[r.date,r.score])),paired=candidateAll.filter(r=>r.date<discoveryStart&&fiveMap.has(r.date)).map(r=>({date:r.date,score:r.score}));
    candidateSeriesBySector[sectorId]=paired;fiveBySector[sectorId]=paired.map(r=>({date:r.date,score:fiveMap.get(r.date)}));rowsBySector[sectorId]=buildR21333OutcomeRows(paired,fullEtf);priceBySector[sectorId]=fullEtf;coverage[sectorId]={ticker,candidateScoredAll:candidateAll.length,fiveScoredAll:fiveAll.length,preDiscoveryPaired:paired.length,firstPreDiscovery:paired[0]?.date??null,lastPreDiscovery:paired.at(-1)?.date??null};
  }
  const commonPreDiscoveryDates=selectPreDiscoveryCommonDatesR21345(candidateSeriesBySector,discoveryStart),horizons={};for(const h of R21345_HORIZONS)horizons[h]=summarizeHoldoutR21345({rowsBySector,fiveBySector,priceBySector,discoveryStart,horizon:h});
  const discoveryReference=Object.fromEntries(R21345_HORIZONS.map(h=>[h,source44?.storedFiveRawPartialDrawdown?.[h]?.median??null])),signAgreement=Object.fromEntries(R21345_HORIZONS.map(h=>{const x=horizons[h]?.crossSectional?.summary?.median,d=discoveryReference[h];return [h,finite(x)&&finite(d)?Math.sign(x)===Math.sign(d):null];}));
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.13.45-PRE-DISCOVERY-HOLDOUT-VALIDATION",generatedAt,status:"SHADOW_R21345_PRE_DISCOVERY_HOLDOUT_VALIDATION_COMPLETE",mode:"LOCAL_READ_ONLY_PRE_DISCOVERY_HOLDOUT",sourceStatus:source44.status,providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,candidateSelected:false,optionsReplacementSelected:false,selectionThresholdIntroduced:false,diagnosticOnly:true,feature:R21345_FEATURE,expectedIcDirection:R21345_EXPECTED_IC_DIRECTION,lockedDefinition:"R21342_INTERNAL_CORRELATION_SHOCK_UNCHANGED",fiveRawControlDefinition:"R21332_FIVE_AXIS_252_DIAGNOSTIC_COMPOSITE_UNCHANGED",discoveryStart,holdoutPolicy:"ALL_COMMON_SCORED_DATES_STRICTLY_BEFORE_DISCOVERY_START_WITH_HORIZON_END_ALSO_BEFORE_DISCOVERY_START",commonPreDiscoveryDates:commonPreDiscoveryDates.length,firstCommonPreDiscovery:commonPreDiscoveryDates[0]??null,lastCommonPreDiscovery:commonPreDiscoveryDates.at(-1)??null,coverage,horizons,discoveryReference,signAgreement,next:"REVIEW_R21345_HISTORICAL_HOLDOUT_BEFORE_ANY_PROSPECTIVE_LOCK_OR_FORMULA_WEIGHT_CANDIDATE_CHANGE"};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.45 PRE-DISCOVERY HOLDOUT VALIDATION",`generatedAt=${generatedAt}`,`status=${report.status}`,`sourceStatus=${report.sourceStatus}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED) normalizationChanged=false weightsChanged=false referenceWindowChanged=false","candidateSelected=false optionsReplacementSelected=false selectionThresholdIntroduced=false diagnosticOnly=true",`feature=${R21345_FEATURE}`,`discoveryStart=${discoveryStart}`,`commonPreDiscoveryDates=${report.commonPreDiscoveryDates} first=${report.firstCommonPreDiscovery??"NA"} last=${report.lastCommonPreDiscovery??"NA"}`,"holdoutPolicy=ALL_COMMON_PRE_DISCOVERY_DATES_WITH_FORWARD_END_PURGED_BEFORE_DISCOVERY_START","","H | HOLDOUT_XS_PARTIAL | XS_NEG/POS | HOLDOUT_TS_PARTIAL | TS_NEG/POS | LOSO_NEG/POS | BOOT_CI025 | BOOT_CI975 | BOOT_P_NEG | DISCOVERY_XS_PARTIAL | SIGN_AGREE"];
  for(const h of R21345_HORIZONS){const x=horizons[h],b=x.bootstrap;lines.push(`${h} | ${x.crossSectional.summary.median??"NA"} | ${x.crossSectional.summary.negative}/${x.crossSectional.summary.positive} | ${x.timeSeries.summary.median??"NA"} | ${x.timeSeries.summary.negative}/${x.timeSeries.summary.positive} | ${x.loso.summary.negative}/${x.loso.summary.positive} | ${b.ci025??"NA"} | ${b.ci975??"NA"} | ${b.probNegative??"NA"} | ${discoveryReference[h]??"NA"} | ${signAgreement[h]===null?"NA":String(signAgreement[h])}`);}
  lines.push("","note=R21345_USES_A_FROZEN_R21342_FEATURE_DEFINITION_AND_DOES_NOT_RETUNE_THE_SIGNAL","note=FORWARD_OUTCOMES_THAT_CROSS_THE_DISCOVERY_WINDOW_START_ARE_PURGED_PER_HORIZON","note=THIS_IS_A_HISTORICAL_PRE_DISCOVERY_HOLDOUT_NOT_A_TRUE_FUTURE_PROSPECTIVE_TEST","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE","note=RESULTS_DO_NOT_SELECT_A_CANDIDATE_OR_AUTHORIZE_OPTIONS_REPLACEMENT",`next=${report.next}`);
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`);saveJson(jsonFile,report);saveText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21345();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,discoveryStart:r.discoveryStart,commonPreDiscoveryDates:r.commonPreDiscoveryDates,signAgreement:r.signAgreement,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
