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
import {buildR21333OutcomeRows,summarizeR21333TimeSeries,summarizeR21333CrossSectional,spearmanR21333} from "./sector-fear-greed-r21333-economic-validation.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INV_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const R21320_FILE="local-sector-fear-greed-r21320-alpaca-benchmark-backfill.json";
const R21322_FILE="local-sector-fear-greed-r21322-spy-gap-backfill.json";
const R21325_SPY_FILE="local-sector-fear-greed-r21325-spy-history-backfill.json";
const R21331_FILE="local-sector-fear-greed-r21331-alpaca-sector-etf-backfill.json";
const R21335_FILE="local-sector-fear-greed-r21335-directional-validation.json";
const ALPACA_DIR="asset-r10-alpaca";
const OUT="local-sector-fear-greed-r21336-tail-feature-attribution";
export const R21336_FEATURES=Object.freeze(["tailBalance","maxLottery","lotteryDemand","speculativeLeadership","speculativeVolume"]);
export const R21336_HORIZONS=Object.freeze([5,20,60]);
export const R21336_REFERENCE_OBSERVATIONS=756;
export const R21336_WINDOW=252;

const finite=x=>typeof x==="number"&&Number.isFinite(x);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
const median=values=>{const a=(Array.isArray(values)?values:[]).filter(finite).sort((x,y)=>x-y);if(!a.length)return null;const p=(a.length-1)/2,l=Math.floor(p),h=Math.ceil(p);return l===h?a[l]:(a[l]+a[h])/2;};
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function arr(file){const x=safeJson(file);return Array.isArray(x)?x:[];}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function listAlpacaFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(n=>path.join(dir,n)):[];const inc=path.join(dir,"incremental"),extra=fs.existsSync(inc)?fs.readdirSync(inc).filter(n=>!n.startsWith(".")).sort().map(n=>path.join(inc,n)).filter(f=>fs.statSync(f).isFile()):[];return [...base,...extra];}

export function scoreR21336Feature(history=[],key,required=R21336_REFERENCE_OBSERVATIONS){
  const rows=(Array.isArray(history)?history:[]).map(r=>{
    const raw=r?.[key];
    const value=raw===null||raw===undefined||raw===""?NaN:Number(raw);
    return {date:String(r?.date??"").slice(0,10),value};
  }).filter(r=>validDate(r.date)&&finite(r.value)).sort((a,b)=>a.date.localeCompare(b.date));
  const out=[];
  for(let i=required-1;i<rows.length;i++){
    const sample=rows.slice(i-required+1,i+1),current=sample.at(-1).value;let below=0,equal=0;
    for(const row of sample){if(row.value<current)below++;else if(row.value===current)equal++;}
    out.push({date:sample.at(-1).date,score:100*(below+.5*equal)/required,raw:current});
  }
  return out;
}

export function summarizeR21336Feature(featureOutcomes={}){
  const sectorIds=Object.keys(featureOutcomes).sort(),timeSeries={};
  for(const h of R21336_HORIZONS){timeSeries[h]={};for(const metric of ["return","drawdown"]){const key=metric==="return"?"returnIC":"drawdownIC",vals=sectorIds.map(id=>featureOutcomes[id]?.summary?.[h]?.[key]).filter(finite);timeSeries[h][metric]={eligibleSectors:vals.length,medianIC:round(median(vals)),negativeSectors:vals.filter(x=>x<0).length,positiveSectors:vals.filter(x=>x>0).length};}}
  const xs={};for(const h of R21336_HORIZONS)xs[h]={return:summarizeR21333CrossSectional(Object.fromEntries(sectorIds.map(id=>[id,featureOutcomes[id]?.rows??[]])),h,`forwardReturn${h}`),drawdown:summarizeR21333CrossSectional(Object.fromEntries(sectorIds.map(id=>[id,featureOutcomes[id]?.rows??[]])),h,`forwardDrawdown${h}`)};
  return {sectorCount:sectorIds.length,ready252Sectors:sectorIds.filter(id=>(featureOutcomes[id]?.rows?.length??0)===R21336_WINDOW).length,timeSeries,crossSectional:xs};
}

export function runR21336(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  if(SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS!==R21336_REFERENCE_OBSERVATIONS||SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS!==R21336_REFERENCE_OBSERVATIONS)throw new Error("R21336_REFERENCE_CONSTANT_MISMATCH");
  const prior=safeJson(path.join(base,R21335_FILE));if(prior?.status!=="SHADOW_R21335_DIRECTIONAL_VALIDATION_COMPLETE"||prior?.diagnosticOnly!==true)throw new Error("R21336_R21335_NOT_READY");
  for(const name of [PIT_FILE,IEX_FILE,INV_FILE,R21320_FILE,R21322_FILE,R21325_SPY_FILE,R21331_FILE])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21336_INPUT_MISSING:${name}`);
  const stockFiles=listAlpacaFiles(path.join(base,ALPACA_DIR));if(!stockFiles.length)throw new Error("R21336_ALPACA_STOCK_STORE_MISSING");
  const mergedStocks=mergeAlpacaRows(stockFiles.map(arr));if(mergedStocks.conflicts.length)throw new Error("R21336_ALPACA_STOCK_CONFLICT");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(path.join(base,PIT_FILE),"utf8")),iex=safeJson(path.join(base,IEX_FILE)),inventory=safeJson(path.join(base,INV_FILE)),repair=buildR2134RepairedBenchmarks(iex?.series??{},inventory),earlyPayload=safeJson(path.join(base,R21320_FILE)),early=validateR21320Benchmark(earlyPayload),gap=validateR21322Stored(safeJson(path.join(base,R21322_FILE))),oldSpy=safeJson(path.join(base,R21325_SPY_FILE)),r21331Payload=safeJson(path.join(base,R21331_FILE)),r21331=validateR21331Stored(r21331Payload);
  if(!early||!gap||!Array.isArray(oldSpy?.series?.SPY)||!r21331||r21331.sessions!==89)throw new Error("R21336_BENCHMARK_INPUT_INVALID");
  let fullSpy=mergeR21332PriceSeries(repair.series?.SPY??[],earlyPayload.series?.SPY??[]);fullSpy=mergeR21332PriceSeries(fullSpy,gap.rows);fullSpy=mergeR21332PriceSeries(fullSpy,oldSpy.series.SPY);
  const byFeature=Object.fromEntries(R21336_FEATURES.map(key=>[key,{}])),coverage={},redundancy={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const fullEtf=mergeR21332PriceSeries(repair.series?.[ticker]??[],r21331Payload.series?.[ticker]??[]),priceDates=new Set(fullEtf.map(r=>r.date)),history=buildSectorSpeculativeRawHistory({rows:mergedStocks.rows,spyRows:fullSpy,etfRows:fullEtf,pitHistory:pit,sectorId}),scores={};coverage[sectorId]={ticker,rawHistory:history.length,features:{}};
    for(const key of R21336_FEATURES){const all=scoreR21336Feature(history,key),aligned=all.filter(r=>priceDates.has(r.date)).slice(-R21336_WINDOW),rows=buildR21333OutcomeRows(aligned,fullEtf),summary=summarizeR21333TimeSeries(rows);scores[key]=aligned;byFeature[key][sectorId]={rows,summary};coverage[sectorId].features[key]={scoredDates:all.length,alignedDates:aligned.length,firstDate:aligned[0]?.date??null,lastDate:aligned.at(-1)?.date??null};}
    const tail=scores.tailBalance??[];for(const key of R21336_FEATURES){const map=new Map((scores[key]??[]).map(r=>[r.date,r.score])),pairs=tail.filter(r=>map.has(r.date));if(!redundancy[key])redundancy[key]=[];redundancy[key].push(spearmanR21333(pairs.map(r=>r.score),pairs.map(r=>map.get(r.date))));}
  }
  const features={};for(const key of R21336_FEATURES){features[key]=summarizeR21336Feature(byFeature[key]);const rs=(redundancy[key]??[]).filter(finite);features[key].medianSpearmanVsTailBalance=round(median(rs));features[key].sectorSpearmanVsTailBalance=rs.map(round);}
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.13.36-TAIL-FEATURE-ATTRIBUTION",generatedAt,status:"SHADOW_R21336_TAIL_FEATURE_ATTRIBUTION_COMPLETE",mode:"LOCAL_READ_ONLY_FEATURE_ATTRIBUTION",sourceStatus:prior.status,providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,sourceFilesMutated:false,candidateSelected:false,optionsReplacementSelected:false,selectionThresholdIntroduced:false,diagnosticOnly:true,diagnosticWindow:R21336_WINDOW,features:R21336_FEATURES,coverage,featureResults:features,interpretationPolicy:"FEATURE_ATTRIBUTION_ONLY_NO_COMPOSITE_OR_WEIGHT_CHANGE",next:"REVIEW_R21336_FEATURE_EVIDENCE_BEFORE_ANY_REPLACEMENT_CANDIDATE_DESIGN"};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.36 TAIL FEATURE ATTRIBUTION",`generatedAt=${generatedAt}`,`status=${report.status}`,`sourceStatus=${report.sourceStatus}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED) normalizationChanged=false weightsChanged=false referenceWindowChanged=false","candidateSelected=false optionsReplacementSelected=false selectionThresholdIntroduced=false diagnosticOnly=true",`interpretationPolicy=${report.interpretationPolicy}`,"","FEATURE COVERAGE / DIRECTIONAL IC","FEATURE | READY252 | SPEARMAN_VS_TAIL | RET5 | RET20 | RET60 | DD5 | DD20 | DD60 | XS_RET5 | XS_RET20 | XS_RET60 | XS_DD5 | XS_DD20 | XS_DD60"];
  for(const key of R21336_FEATURES){const x=features[key],t=x.timeSeries,c=x.crossSectional;lines.push(`${key} | ${x.ready252Sectors}/11 | ${x.medianSpearmanVsTailBalance??"NA"} | ${t[5].return.medianIC??"NA"} | ${t[20].return.medianIC??"NA"} | ${t[60].return.medianIC??"NA"} | ${t[5].drawdown.medianIC??"NA"} | ${t[20].drawdown.medianIC??"NA"} | ${t[60].drawdown.medianIC??"NA"} | ${c[5].return.medianIC??"NA"} | ${c[20].return.medianIC??"NA"} | ${c[60].return.medianIC??"NA"} | ${c[5].drawdown.medianIC??"NA"} | ${c[20].drawdown.medianIC??"NA"} | ${c[60].drawdown.medianIC??"NA"}`);}
  lines.push("","note=FEATURES_ARE_SCORED_INDEPENDENTLY_WITH_THE_APPROVED_756_OBSERVATION_PERCENTILE_WINDOW","note=NO_FEATURE_IS_ADDED_TO_THE_FIVE_AXIS_COMPOSITE_IN_R21336","note=NO_WEIGHT_OR_NORMALIZATION_OR_PRODUCTION_FORMULA_CHANGE","note=RESULTS_ARE_ATTRIBUTION_ONLY_AND_DO_NOT_SELECT_A_REPLACEMENT",`next=${report.next}`);
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`);saveJson(jsonFile,report);saveText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21336();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,referenceRequirementChanged:r.referenceRequirementChanged,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
