import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv,buildPointInTimeSectorInputs} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildSectorSpeculativeCandidateR23} from "../../lib/market-score/sector-fear-greed-r23-speculative-shadow.mjs";
import {buildSectorSpeculativeCandidateR24} from "../../lib/market-score/sector-fear-greed-r24-speculative-shadow.mjs";
import {scoreRawAxis,buildCompositeSeries,correlation,rankCorrelationByKey} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";
import {deriveR28RawAxes} from "./sector-fear-greed-r28-reference-window-diagnostic.mjs";
import {mergeAlpacaRows} from "./sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {mergeCanonicalRowsR2135} from "./sector-fear-greed-r2135-r24-source-sensitivity.mjs";
import {summarizeR2137Redundancy} from "./sector-fear-greed-r2137-component-weight-sensitivity.mjs";
import {buildR2138OutcomeRows,summarizeR2138Economic} from "./sector-fear-greed-r2138-economic-regime-validation.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const ALPACA_DIR="asset-r10-alpaca";
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const IEX_PRICE_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INVENTORY_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const R6_HISTORY_NAME="local-breadth-r6-shadow-history.json";
const R7_HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const OUTPUT_JSON="local-sector-fear-greed-r21310-r23-vs-r24-head-to-head.json";
const OUTPUT_TXT="local-sector-fear-greed-r21310-r23-vs-r24-head-to-head.txt";
const WINDOW=252;
export const R21310_CANDIDATES=Object.freeze(["R23","R24"]);
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
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));
const median=values=>{const a=values.filter(finite).sort((x,y)=>x-y);if(!a.length)return null;const i=(a.length-1)/2,lo=Math.floor(i),hi=Math.ceil(i);return lo===hi?a[lo]:(a[lo]+a[hi])/2;};

function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function safeArray(file){const value=safeJson(file);return Array.isArray(value)?value:[];}
function listStoredFiles(dir){
  const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(name=>/^group-\d+\.json$/.test(name)).map(name=>path.join(dir,name)):[];
  const incrementalDir=path.join(dir,"incremental");
  const incremental=fs.existsSync(incrementalDir)?fs.readdirSync(incrementalDir).filter(name=>!name.startsWith(".")).map(name=>path.join(incrementalDir,name)).filter(file=>fs.statSync(file).isFile()):[];
  return {base,incremental,all:[...base,...incremental]};
}
function tableExists(db,name){return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(name));}
function normalizePriceRows(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),close=Number(row?.close??row?.currentClose??row?.current_close);
    if(validDate(date)&&finite(close)&&close>0)map.set(date,{date,close});
  }
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function normalizeScoreRows(rows=[]){
  return (Array.isArray(rows)?rows:[]).map(row=>({date:String(row?.date??"").slice(0,10),score:Number(row?.score)})).filter(row=>validDate(row.date)&&finite(row.score)).sort((a,b)=>a.date.localeCompare(b.date));
}
function readCanonicalRows(base){
  const rowSets=[];
  for(const [name,source] of [[R7_HISTORY_NAME,"BREADTH_R7_LOCAL"],[R6_HISTORY_NAME,"BREADTH_R6_LOCAL"]]){
    const payload=safeJson(path.join(base,name));rowSets.push({source,rows:payload?.rows??[]});
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
function scoreSpearman(left,right){return round(correlation(normalizeScoreRows(left),normalizeScoreRows(right),{method:"spearman"}));}

export function summarizeR21310Candidate(sectors={}){
  const list=Object.values(sectors),source=list.map(item=>item.sourceSpearman).filter(finite),redundancyMax=list.map(item=>item.redundancy?.maxAbs).filter(finite),redundancyFive=list.map(item=>Math.abs(item.redundancy?.fiveAxis)).filter(finite);
  const economic=key=>list.map(item=>item.economic?.[key]).filter(finite);
  const canonicalCurrent={},alpacaCurrent={};
  for(const [sectorId,item] of Object.entries(sectors)){
    if(finite(item.canonicalCurrent))canonicalCurrent[sectorId]=item.canonicalCurrent;
    if(finite(item.alpacaCurrent))alpacaCurrent[sectorId]=item.alpacaCurrent;
  }
  return {
    sectors:list.length,
    canonicalReady:list.filter(item=>item.canonicalStatus==="READY_CROSS_SECTION").length,
    alpacaReady:list.filter(item=>item.alpacaStatus==="READY_CROSS_SECTION").length,
    sourceSpearmanMin:round(source.length?Math.min(...source):null),
    sourceSpearmanMedian:round(median(source)),
    currentSourceRankSpearman:round(rankCorrelationByKey(canonicalCurrent,alpacaCurrent)),
    redundancyMaxAbsMedian:round(median(redundancyMax)),
    redundancyMaxAbsMax:round(redundancyMax.length?Math.max(...redundancyMax):null),
    redundancyFiveAxisAbsMedian:round(median(redundancyFive)),
    economic:{
      medianCorrTrailing20:round(median(economic("corrTrailing20"))),
      medianCorrRv20:round(median(economic("corrRv20"))),
      medianCorrForward20:round(median(economic("corrForward20"))),
      medianCorrForward60:round(median(economic("corrForward60"))),
      medianCorrDrawdown20:round(median(economic("corrForwardDrawdown20"))),
      medianCorrDrawdown60:round(median(economic("corrForwardDrawdown60"))),
      signs:{
        trailing20Positive:list.filter(item=>finite(item.economic?.corrTrailing20)&&item.economic.corrTrailing20>0).length,
        rv20Negative:list.filter(item=>finite(item.economic?.corrRv20)&&item.economic.corrRv20<0).length,
        forward20Negative:list.filter(item=>finite(item.economic?.corrForward20)&&item.economic.corrForward20<0).length,
        drawdown20Negative:list.filter(item=>finite(item.economic?.corrForwardDrawdown20)&&item.economic.corrForwardDrawdown20<0).length,
      },
    },
  };
}

export function runSectorFearGreedR21310HeadToHead(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const pitPath=path.join(base,PIT_FILE),iexPath=path.join(base,IEX_PRICE_FILE),inventoryPath=path.join(base,INVENTORY_FILE),alpacaDir=path.join(base,ALPACA_DIR);
  if(!fs.existsSync(pitPath))throw new Error("R21310_PIT_HISTORY_MISSING");
  if(!fs.existsSync(iexPath))throw new Error("R21310_IEX_PRICE_HISTORY_MISSING");
  if(!fs.existsSync(inventoryPath))throw new Error("R21310_R2133_INVENTORY_MISSING");
  if(!fs.existsSync(alpacaDir))throw new Error("R21310_ALPACA_LOCAL_STORE_MISSING");
  const files=listStoredFiles(alpacaDir);if(!files.base.length)throw new Error("R21310_ALPACA_BASE_GROUPS_MISSING");

  const merged=mergeAlpacaRows(files.all.map(safeArray)),alpacaRows=merged.rows,pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8")),iex=safeJson(iexPath),inventory=safeJson(inventoryPath),repair=buildR2134RepairedBenchmarks(iex?.series??{},inventory),canonical=readCanonicalRows(base),derived=buildPointInTimeSectorInputs({rows:canonical.rows,pitHistory:pit}),spyRows=normalizePriceRows(repair.series.SPY??[]);
  const candidates={R23:{sectors:{}},R24:{sectors:{}}},headToHead={},r23Current={},r24Current={};

  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const etfRows=normalizePriceRows(repair.series[ticker]??[]),pitRows=derived.sectors[sectorId]??[],breadthRows=pitRows.filter(row=>[row?.b50,row?.b200,row?.highLowNet].every(finite)),demandRows=pitRows.filter(row=>finite(row?.volumeBreadth)),raw=deriveR28RawAxes({etfRows,spyRows,breadthRows,demandRows}),axisSeries={};
    for(const axis of AXES)axisSeries[axis]=scoreRawAxis(raw[axis],AXIS_SPECS[axis],WINDOW);
    const fiveRaw=buildCompositeSeries(axisSeries,AXIS_WEIGHTS_5);

    const canonicalR23=buildSectorSpeculativeCandidateR23({rows:canonical.rows,spyRows,etfRows,pitHistory:pit,sectorId});
    const alpacaR23=buildSectorSpeculativeCandidateR23({rows:alpacaRows,spyRows,etfRows,pitHistory:pit,sectorId});
    const canonicalR24=buildSectorSpeculativeCandidateR24({rows:canonical.rows,spyRows,etfRows,pitHistory:pit,sectorId});
    const alpacaR24=buildSectorSpeculativeCandidateR24({rows:alpacaRows,spyRows,etfRows,pitHistory:pit,sectorId});

    for(const [id,canonicalCandidate,alpacaCandidate] of [["R23",canonicalR23,alpacaR23],["R24",canonicalR24,alpacaR24]]){
      const outcomes=buildR2138OutcomeRows(canonicalCandidate.history,etfRows);
      candidates[id].sectors[sectorId]={
        ticker,
        canonicalStatus:canonicalCandidate.status,
        alpacaStatus:alpacaCandidate.status,
        canonicalN:canonicalCandidate.history.length,
        alpacaN:alpacaCandidate.history.length,
        canonicalCurrent:round(canonicalCandidate.score),
        alpacaCurrent:round(alpacaCandidate.score),
        sourceSpearman:scoreSpearman(canonicalCandidate.history,alpacaCandidate.history),
        redundancy:summarizeR2137Redundancy(canonicalCandidate.history,axisSeries,fiveRaw),
        economic:summarizeR2138Economic(outcomes),
      };
    }
    if(finite(canonicalR23.score))r23Current[sectorId]=canonicalR23.score;
    if(finite(canonicalR24.score))r24Current[sectorId]=canonicalR24.score;
    headToHead[sectorId]={ticker,canonicalR23VsR24Spearman:scoreSpearman(canonicalR23.history,canonicalR24.history),r23Current:round(canonicalR23.score),r24Current:round(canonicalR24.score)};
  }

  const summaries=Object.fromEntries(R21310_CANDIDATES.map(id=>[id,summarizeR21310Candidate(candidates[id].sectors)])),h2hRhos=Object.values(headToHead).map(item=>item.canonicalR23VsR24Spearman).filter(finite),generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={
    version:"R2.13.10-R23-VS-R24-HEAD-TO-HEAD",
    generatedAt,
    status:"SHADOW_R21310_R23_VS_R24_HEAD_TO_HEAD_COMPLETE",
    mode:"LOCAL_READ_ONLY_EXISTING_R23_R24_HEAD_TO_HEAD",
    providerCalls:0,
    rawRowsStored:false,
    publicMutation:false,
    d1Mutation:false,
    dbSchemaChanged:false,
    productionFormulaChanged:false,
    schedulerChanged:false,
    referenceRequirementChanged:false,
    approvedR1ReferenceRequirement:756,
    fillForwardFill:false,
    sourceFilesMutated:false,
    candidateSelected:false,
    selectionThresholdIntroduced:false,
    optionsEquivalenceClaimed:false,
    r23ApprovedForProduction:false,
    r24ApprovedForProduction:false,
    currentR24WeightsChanged:false,
    newFormulaIntroduced:false,
    testedReferenceWindow:WINDOW,
    repair:{targetDate:repair.targetDate,complete:repair.complete,injected:repair.injected.length,alreadyPresent:repair.alreadyPresent.length},
    sources:{canonical:{rows:canonical.rows.length,diagnostics:canonical.diagnostics},alpaca:{rows:alpacaRows.length,conflicts:merged.conflicts.length,firstDate:alpacaRows[0]?.date??null,lastDate:alpacaRows.at(-1)?.date??null}},
    summaries,
    headToHeadSummary:{minCanonicalR23VsR24Spearman:round(h2hRhos.length?Math.min(...h2hRhos):null),medianCanonicalR23VsR24Spearman:round(median(h2hRhos)),currentSectorRankR23VsR24:round(rankCorrelationByKey(r23Current,r24Current))},
    candidates,
    headToHead,
  };

  const lines=[
    "ZGMINI SECTOR FEAR & GREED R2.13.10 R23 VS R24 HEAD-TO-HEAD",
    `generatedAt=${generatedAt}`,
    `status=${report.status}`,
    "mode=LOCAL_READ_ONLY_EXISTING_R23_R24_HEAD_TO_HEAD",
    "providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false",
    "productionFormulaChanged=false dbSchemaChanged=false schedulerChanged=false referenceRequirementChanged=false",
    "approvedR1ReferenceRequirement=756 (UNCHANGED)",
    "fillForwardFill=false sourceFilesMutated=false candidateSelected=false selectionThresholdIntroduced=false",
    "optionsEquivalenceClaimed=false r23ApprovedForProduction=false r24ApprovedForProduction=false currentR24WeightsChanged=false newFormulaIntroduced=false",
    `repair targetDate=${report.repair.targetDate} complete=${report.repair.complete} injected=${report.repair.injected}`,
    `canonicalRows=${report.sources.canonical.rows} alpacaRows=${report.sources.alpaca.rows} alpacaConflicts=${report.sources.alpaca.conflicts}`,
    "",
    "CANDIDATE | READY_CANON | READY_ALPACA | SRC_RHO_MIN | SRC_RHO_MED | CURRENT_SRC_RANK | REDUND_MED | REDUND_MAX | FIVE_ABS_MED | TRAIL20 | RV20 | FWD20 | FWD60 | DD20 | DD60 | TRAIL_POS | RV_NEG | FWD20_NEG | DD20_NEG"
  ];
  for(const id of R21310_CANDIDATES){
    const s=summaries[id],e=s.economic;
    lines.push(`${id} | ${s.canonicalReady}/11 | ${s.alpacaReady}/11 | ${s.sourceSpearmanMin??"NA"} | ${s.sourceSpearmanMedian??"NA"} | ${s.currentSourceRankSpearman??"NA"} | ${s.redundancyMaxAbsMedian??"NA"} | ${s.redundancyMaxAbsMax??"NA"} | ${s.redundancyFiveAxisAbsMedian??"NA"} | ${e.medianCorrTrailing20??"NA"} | ${e.medianCorrRv20??"NA"} | ${e.medianCorrForward20??"NA"} | ${e.medianCorrForward60??"NA"} | ${e.medianCorrDrawdown20??"NA"} | ${e.medianCorrDrawdown60??"NA"} | ${e.signs.trailing20Positive}/11 | ${e.signs.rv20Negative}/11 | ${e.signs.forward20Negative}/11 | ${e.signs.drawdown20Negative}/11`);
  }
  lines.push("",
    `headToHead minCanonicalR23VsR24Spearman=${report.headToHeadSummary.minCanonicalR23VsR24Spearman??"NA"} medianCanonicalR23VsR24Spearman=${report.headToHeadSummary.medianCanonicalR23VsR24Spearman??"NA"} currentSectorRankR23VsR24=${report.headToHeadSummary.currentSectorRankR23VsR24??"NA"}`,
    "",
    "SECTOR | ETF | R23_SRC_RHO | R24_SRC_RHO | R23_REDUND_MAX | R24_REDUND_MAX | R23_TRAIL20 | R24_TRAIL20 | R23_RV20 | R24_RV20 | R23_VS_R24_RHO | R23_CURRENT | R24_CURRENT"
  );
  for(const [sectorId,item] of Object.entries(headToHead)){
    const a=candidates.R23.sectors[sectorId],b=candidates.R24.sectors[sectorId];
    lines.push(`${sectorId} | ${item.ticker} | ${a.sourceSpearman??"NA"} | ${b.sourceSpearman??"NA"} | ${a.redundancy.maxAbs??"NA"} | ${b.redundancy.maxAbs??"NA"} | ${a.economic.corrTrailing20??"NA"} | ${b.economic.corrTrailing20??"NA"} | ${a.economic.corrRv20??"NA"} | ${b.economic.corrRv20??"NA"} | ${item.canonicalR23VsR24Spearman??"NA"} | ${item.r23Current??"NA"} | ${item.r24Current??"NA"}`);
  }
  lines.push("",
    "note=THIS_COMPARES_TWO_EXISTING_SHADOW_CANDIDATES_ONLY_AND_INTRODUCES_NO_NEW_FORMULA",
    "note=SOURCE_STABILITY_ECONOMIC_BEHAVIOR_AND_REDUNDANCY_ARE_DIAGNOSTIC_EVIDENCE_NOT_PRODUCTION_GATES",
    "note=OPTIONS_EQUIVALENCE_REMAINS_UNRESOLVED",
    "note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_OR_SCHEMA_CHANGE"
  );
  fs.mkdirSync(base,{recursive:true});
  const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);
  fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");
  fs.writeFileSync(txtFile,lines.join("\n")+"\n");
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const report=runSectorFearGreedR21310HeadToHead();
    console.log(JSON.stringify({status:report.status,jsonFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,OUTPUT_JSON),txtFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,OUTPUT_TXT),providerCalls:report.providerCalls,publicMutation:report.publicMutation,productionFormulaChanged:report.productionFormulaChanged,referenceRequirementChanged:report.referenceRequirementChanged,summaries:report.summaries,headToHeadSummary:report.headToHeadSummary},null,2));
  }catch(error){console.error(error?.message??String(error));process.exitCode=1;}
}
