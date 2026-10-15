import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r2-speculative-shadow.mjs";
import {mergeAlpacaRows} from "./sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const ALPACA_DIR="asset-r10-alpaca";
const OUT="local-sector-fear-greed-r21318-tail-balance-backfill-window";
const WARMUP=60;
const REQUIRED=SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS;
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
function json(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function arr(file){const x=json(file);return Array.isArray(x)?x:[];}
function listStoredFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(n=>path.join(dir,n)):[];const inc=path.join(dir,"incremental");const incremental=fs.existsSync(inc)?fs.readdirSync(inc).filter(n=>!n.startsWith(".")).map(n=>path.join(inc,n)).filter(f=>fs.statSync(f).isFile()):[];return {base,all:[...base,...incremental]};}
function rowDate(r){return String(r?.tradeDate??r?.trade_date??r?.date??"").slice(0,10);}
function uniqueDates(rows=[]){return [...new Set((Array.isArray(rows)?rows:[]).map(rowDate).filter(validDate))].sort();}
function seriesDates(rows=[]){return [...new Set((Array.isArray(rows)?rows:[]).map(r=>String(r?.date??r?.tradeDate??r?.trade_date??"").slice(0,10)).filter(validDate))].sort();}
function activePit(list,date){return (list??[]).find(x=>x.dateAdded<=date&&(!x.dateRemoved||date<x.dateRemoved))??null;}

export function buildR21318WindowPlan(localDates=[],benchmarkDates=[],{required=REQUIRED,warmup=WARMUP}={}){
  const local=[...new Set(localDates.filter(validDate))].sort(),bench=[...new Set(benchmarkDates.filter(validDate))].sort();
  const currentSessions=local.length,needed=Math.max(0,required+warmup-currentSessions),localStart=local[0]??null,localEnd=local.at(-1)??null;
  const prior=localStart?bench.filter(d=>d<localStart):[],selected=needed?prior.slice(-needed):[];
  const targetStart=needed&&selected.length===needed?selected[0]:localStart,targetEnd=selected.at(-1)??null,totalSessionsAfterPlan=currentSessions+selected.length,maxPossibleScores=Math.max(0,totalSessionsAfterPlan-warmup);
  return {required,warmup,currentSessions,neededAdditionalRawSessions:needed,localStart,localEnd,benchmarkPriorSessions:prior.length,benchmarkCalendarEnough:selected.length===needed,targetStart,targetEnd,plannedSessions:selected.length,totalSessionsAfterPlan,maxPossibleScores,referenceReadyAfterPlan:maxPossibleScores>=required,plannedDates:selected};
}

export function summarizeR21318GroupUniverse(groupRows=[]){
  const symbols=[...new Set(groupRows.flatMap(x=>(Array.isArray(x)?x:[]).map(r=>String(r?.ticker??"").trim()).filter(Boolean)))].sort();
  return {symbols:new Set(symbols),symbolCount:symbols.length};
}

export function summarizeR21318SectorCoverage(pit,symbolSet,dates=[]){
  const out={};for(const sectorId of Object.keys(SECTOR_FEAR_GREED_R1_ETFS))out[sectorId]={minPitActive:null,minAvailableSymbols:null};
  for(const date of dates){const pitCounts={},available={};for(const [ticker,list] of Object.entries(pit?.byTicker??{})){const active=activePit(list,date);if(!active)continue;pitCounts[active.sectorId]=(pitCounts[active.sectorId]??0)+1;if(symbolSet.has(ticker))available[active.sectorId]=(available[active.sectorId]??0)+1;}
    for(const sectorId of Object.keys(out)){const p=pitCounts[sectorId]??0,a=available[sectorId]??0;out[sectorId].minPitActive=out[sectorId].minPitActive===null?p:Math.min(out[sectorId].minPitActive,p);out[sectorId].minAvailableSymbols=out[sectorId].minAvailableSymbols===null?a:Math.min(out[sectorId].minAvailableSymbols,a);}
  }
  for(const sectorId of Object.keys(out)){out[sectorId].pitReady=(out[sectorId].minPitActive??0)>=8;out[sectorId].groupUniverseReady=(out[sectorId].minAvailableSymbols??0)>=8;}
  return out;
}

function groupPlan(files,plannedSessions){const groups=[];let fullDensityPages=0;for(const file of files){const rows=arr(file),symbols=[...new Set(rows.map(r=>String(r?.ticker??"").trim()).filter(Boolean))],estimatedRows=symbols.length*plannedSessions,pages=Math.max(1,Math.ceil(estimatedRows/10000));groups.push({name:path.basename(file),symbols:symbols.length,estimatedRowsAtFullDensity:estimatedRows,estimatedPagesAtFullDensity:pages});fullDensityPages+=pages;}return {groups,groupCount:groups.length,estimatedPagesAtFullDensity:fullDensityPages};}

export function runSectorFearGreedR21318TailBalanceBackfillWindow(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const pitPath=path.join(base,PIT_FILE),iexPath=path.join(base,IEX_FILE),alpacaDir=path.join(base,ALPACA_DIR);for(const [file,code] of [[pitPath,"R21318_PIT_HISTORY_MISSING"],[iexPath,"R21318_IEX_BENCHMARK_MISSING"]])if(!fs.existsSync(file))throw new Error(code);
  const files=listStoredFiles(alpacaDir);if(!files.base.length)throw new Error("R21318_ALPACA_LOCAL_STORE_MISSING");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8")),iex=json(iexPath),merged=mergeAlpacaRows(files.all.map(arr)),localDates=uniqueDates(merged.rows),spyDates=seriesDates(iex?.series?.SPY??[]),plan=buildR21318WindowPlan(localDates,spyDates),universe=summarizeR21318GroupUniverse(files.base.map(arr)),coverage=summarizeR21318SectorCoverage(pit,universe.symbols,plan.plannedDates),groups=groupPlan(files.base,plan.plannedSessions);
  const allPitReady=Object.values(coverage).every(x=>x.pitReady),allGroupUniverseReady=Object.values(coverage).every(x=>x.groupUniverseReady),blockers=[];
  if(!plan.benchmarkCalendarEnough)blockers.push("BENCHMARK_CALENDAR_DOES_NOT_COVER_REQUIRED_PRIOR_SESSIONS");
  if(!plan.referenceReadyAfterPlan)blockers.push("PLANNED_WINDOW_STILL_BELOW_756_AFTER_60_WARMUP");
  if(!allPitReady)blockers.push("PIT_MEMBERSHIP_LT8_IN_PLANNED_WINDOW");
  if(!allGroupUniverseReady)blockers.push("EXISTING_ALPACA_GROUP_UNIVERSE_LT8_IN_PLANNED_WINDOW");
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.13.18-TAIL-BALANCE-BACKFILL-WINDOW",generatedAt,status:"SHADOW_R21318_TAIL_BALANCE_BACKFILL_WINDOW_COMPLETE",mode:"LOCAL_READ_ONLY_EXACT_BACKFILL_WINDOW_PLAN",providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,fillForwardFill:false,sourceFilesMutated:false,candidateSelected:false,selectionThresholdIntroduced:false,optionsEquivalenceClaimed:false,newFormulaIntroduced:false,normalizationChanged:false,referenceWindowChanged:false,backfillExecuted:false,diagnosticOnly:true,local:{rows:merged.rows.length,conflicts:merged.conflicts.length},plan,universe:{symbolCount:universe.symbolCount},coverage,groups,allPitReady,allGroupUniverseReady,providerBackfillPlanReady:blockers.length===0,blockers};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.18 TAIL BALANCE BACKFILL WINDOW",`generatedAt=${generatedAt}`,`status=${report.status}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false backfillExecuted=false","productionFormulaChanged=false dbSchemaChanged=false schedulerChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)","fillForwardFill=false sourceFilesMutated=false candidateSelected=false selectionThresholdIntroduced=false","optionsEquivalenceClaimed=false newFormulaIntroduced=false normalizationChanged=false referenceWindowChanged=false diagnosticOnly=true",`local rows=${report.local.rows} conflicts=${report.local.conflicts} dates=${plan.localStart}..${plan.localEnd}`,`plan neededAdditionalRawSessions=${plan.neededAdditionalRawSessions} targetStart=${plan.targetStart??"NA"} targetEnd=${plan.targetEnd??"NA"} plannedSessions=${plan.plannedSessions} totalSessionsAfterPlan=${plan.totalSessionsAfterPlan} maxPossibleScores=${plan.maxPossibleScores} referenceReadyAfterPlan=${plan.referenceReadyAfterPlan}`,`benchmarkPriorSessions=${plan.benchmarkPriorSessions} benchmarkCalendarEnough=${plan.benchmarkCalendarEnough}`,`existingGroupSymbols=${universe.symbolCount} groupCount=${groups.groupCount} estimatedPagesAtFullDensity=${groups.estimatedPagesAtFullDensity}`,`allPitReady=${allPitReady} allGroupUniverseReady=${allGroupUniverseReady} providerBackfillPlanReady=${report.providerBackfillPlanReady}`,`blockers=${blockers.length?blockers.join(","):"NONE"}`,"","SECTOR | ETF | MIN_PIT_ACTIVE | MIN_GROUP_SYMBOLS | PIT_READY | GROUP_READY"];
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){const x=coverage[sectorId];lines.push(`${sectorId} | ${ticker} | ${x.minPitActive??0} | ${x.minAvailableSymbols??0} | ${x.pitReady} | ${x.groupUniverseReady}`);}
  lines.push("","GROUP PLAN","GROUP | SYMBOLS | FULL_DENSITY_ROWS | FULL_DENSITY_PAGES");for(const g of groups.groups)lines.push(`${g.name} | ${g.symbols} | ${g.estimatedRowsAtFullDensity} | ${g.estimatedPagesAtFullDensity}`);
  lines.push("","note=TARGET_WINDOW_IS_DERIVED_ONLY_FROM_EXISTING_LOCAL_SPY_BENCHMARK_SESSIONS","note=ESTIMATED_PAGES_ASSUME_EVERY_GROUP_SYMBOL_HAS_A_BAR_ON_EVERY_PLANNED_SESSION_AND_A_10000_BAR_PAGE_LIMIT","note=NO_PROVIDER_CALL_OR_BACKFILL_IS_EXECUTED_BY_THIS_DIAGNOSTIC","note=NO_REFERENCE_NORMALIZATION_FORMULA_WEIGHT_PUBLICATION_OR_SCHEMA_CHANGE");
  fs.writeFileSync(path.join(base,`${OUT}.json`),JSON.stringify({...report,universe:{symbolCount:universe.symbolCount}},null,2)+"\n");fs.writeFileSync(path.join(base,`${OUT}.txt`),lines.join("\n")+"\n");return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runSectorFearGreedR21318TailBalanceBackfillWindow();console.log(JSON.stringify({status:r.status,jsonFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,`${OUT}.json`),txtFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,`${OUT}.txt`),providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,referenceRequirementChanged:r.referenceRequirementChanged,plan:r.plan,universe:r.universe,groups:r.groups,providerBackfillPlanReady:r.providerBackfillPlanReady,blockers:r.blockers},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
