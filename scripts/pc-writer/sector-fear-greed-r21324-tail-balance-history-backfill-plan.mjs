import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildSectorSpeculativeRawHistory,SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r2-speculative-shadow.mjs";
import {mergeAlpacaRows} from "./sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {validateStoredBenchmark as validateR21320Benchmark} from "./sector-fear-greed-r21320-alpaca-benchmark-backfill.mjs";
import {mergeR21321BenchmarkRows} from "./sector-fear-greed-r21321-tail-balance-756-readiness.mjs";
import {validateR21322Stored} from "./sector-fear-greed-r21322-spy-gap-backfill.mjs";

export const TARGET_NORMALIZED_DATES=252;
export const FEATURE_WARMUP_SESSIONS=60;
export const PRIOR_CALENDAR_START="2022-07-12";
export const PRIOR_CALENDAR_END="2023-07-11";
const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INV_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const R21320_FILE="local-sector-fear-greed-r21320-alpaca-benchmark-backfill.json";
const R21322_FILE="local-sector-fear-greed-r21322-spy-gap-backfill.json";
const R21323_FILE="local-sector-fear-greed-r21323-tail-balance-current-shadow-score.json";
const ALPACA_DIR="asset-r10-alpaca";
const OUT="local-sector-fear-greed-r21324-tail-balance-history-backfill-plan";
const NYSE_HOLIDAYS=new Set([
  "2022-09-05","2022-11-24","2022-12-26",
  "2023-01-02","2023-01-16","2023-02-20","2023-04-07","2023-05-29","2023-06-19","2023-07-04",
]);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const safeJson=file=>{if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}};
const arr=file=>{const x=safeJson(file);return Array.isArray(x)?x:[];};
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function listStoredFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(n=>path.join(dir,n)):[];const inc=path.join(dir,"incremental");const incremental=fs.existsSync(inc)?fs.readdirSync(inc).filter(n=>!n.startsWith(".")).sort().map(n=>path.join(inc,n)).filter(f=>fs.statSync(f).isFile()):[];return {base,all:[...base,...incremental]};}
function rowDate(r){return String(r?.tradeDate??r?.trade_date??r?.date??"").slice(0,10);}
function uniqueDates(rows=[]){return [...new Set((Array.isArray(rows)?rows:[]).map(rowDate).filter(validDate))].sort();}
function activePit(list,date){return (list??[]).find(x=>x.dateAdded<=date&&(!x.dateRemoved||date<x.dateRemoved))??null;}
function addDays(date,days){const d=new Date(`${date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}

export function buildR21324NyseSessions(start=PRIOR_CALENDAR_START,end=PRIOR_CALENDAR_END){
  if(!validDate(start)||!validDate(end)||start>end)return [];
  const out=[];for(let date=start;date<=end;date=addDays(date,1)){const d=new Date(`${date}T00:00:00Z`),day=d.getUTCDay();if(day===0||day===6||NYSE_HOLIDAYS.has(date))continue;out.push(date);}return out;
}

export function buildR21324Plan({currentRawObservations,currentUnderlyingSessions,targetNormalizedDates=TARGET_NORMALIZED_DATES,reference=SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS,warmup=FEATURE_WARMUP_SESSIONS,priorSessions=buildR21324NyseSessions()}={}){
  const currentRaw=Math.max(0,Number(currentRawObservations)||0),underlying=Math.max(0,Number(currentUnderlyingSessions)||0),targetNorm=Math.max(1,Math.trunc(Number(targetNormalizedDates)||0));
  const targetRaw=reference+targetNorm-1,missingRaw=Math.max(0,targetRaw-currentRaw),theoreticalUnderlyingRequired=targetRaw+warmup,theoreticalAdditionalUnderlying=Math.max(0,theoreticalUnderlyingRequired-underlying),neededPriorSessions=Math.max(missingRaw,theoreticalAdditionalUnderlying),calendar=Array.isArray(priorSessions)?priorSessions.filter(validDate).sort():[],selected=neededPriorSessions?calendar.slice(-neededPriorSessions):[];
  const projectedRaw=currentRaw+selected.length,projectedNormalized=Math.max(0,projectedRaw-reference+1);
  return {reference,warmup,targetNormalizedDates:targetNorm,targetRawObservations:targetRaw,currentRawObservations:currentRaw,currentUnderlyingSessions:underlying,missingRawObservations:missingRaw,theoreticalUnderlyingRequired,theoreticalAdditionalUnderlying,neededPriorSessions,availableKnownPriorSessions:calendar.length,calendarEnough:selected.length===neededPriorSessions,targetStart:selected[0]??null,targetEnd:selected.at(-1)??null,plannedSessions:selected.length,projectedRawObservations:projectedRaw,projectedNormalizedDates:projectedNormalized,targetMet:projectedNormalized>=targetNorm,plannedDates:selected};
}

export function summarizeR21324GroupUniverse(groupRows=[]){const symbols=[...new Set(groupRows.flatMap(x=>(Array.isArray(x)?x:[]).map(r=>String(r?.ticker??"").trim()).filter(Boolean)))].sort();return {symbols:new Set(symbols),symbolCount:symbols.length};}

export function summarizeR21324SectorCoverage(pit,symbolSet,dates=[]){
  const out={};for(const sectorId of Object.keys(SECTOR_FEAR_GREED_R1_ETFS))out[sectorId]={minPitActive:null,minGroupSymbols:null};
  for(const date of dates){const pitCounts={},groupCounts={};for(const [ticker,list] of Object.entries(pit?.byTicker??{})){const active=activePit(list,date);if(!active)continue;pitCounts[active.sectorId]=(pitCounts[active.sectorId]??0)+1;if(symbolSet.has(ticker))groupCounts[active.sectorId]=(groupCounts[active.sectorId]??0)+1;}for(const sectorId of Object.keys(out)){const p=pitCounts[sectorId]??0,g=groupCounts[sectorId]??0;out[sectorId].minPitActive=out[sectorId].minPitActive===null?p:Math.min(out[sectorId].minPitActive,p);out[sectorId].minGroupSymbols=out[sectorId].minGroupSymbols===null?g:Math.min(out[sectorId].minGroupSymbols,g);}}
  for(const sectorId of Object.keys(out)){out[sectorId].pitReady=(out[sectorId].minPitActive??0)>=8;out[sectorId].groupUniverseReady=(out[sectorId].minGroupSymbols??0)>=8;}return out;
}

function groupRequestPlan(files,plannedSessions){const groups=[];let requests=0,rows=0;for(const file of files){const symbols=[...new Set(arr(file).map(r=>String(r?.ticker??"").trim()).filter(Boolean))],estimatedRows=symbols.length*plannedSessions,pages=plannedSessions?Math.max(1,Math.ceil(estimatedRows/10000)):0;groups.push({name:path.basename(file),symbols:symbols.length,estimatedRowsAtFullDensity:estimatedRows,estimatedRequestsAtFullDensity:pages});requests+=pages;rows+=estimatedRows;}return {groupCount:groups.length,estimatedRowsAtFullDensity:rows,estimatedRequestsAtFullDensity:requests,groups};}

export function runR21324(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  for(const name of [PIT_FILE,IEX_FILE,INV_FILE,R21320_FILE,R21322_FILE,R21323_FILE])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21324_INPUT_MISSING:${name}`);
  const priorResult=safeJson(path.join(base,R21323_FILE));if(priorResult?.result?.summary?.tailReady!==11&&priorResult?.summary?.tailReady!==11)throw new Error("R21324_R21323_NOT_11_OF_11_READY");
  const files=listStoredFiles(path.join(base,ALPACA_DIR));if(!files.base.length)throw new Error("R21324_ALPACA_LOCAL_STORE_MISSING");
  const mergedStocks=mergeAlpacaRows(files.all.map(arr));if(mergedStocks.conflicts.length)throw new Error("R21324_ALPACA_STOCK_CONFLICT");
  const earlyPayload=safeJson(path.join(base,R21320_FILE)),gapPayload=safeJson(path.join(base,R21322_FILE)),early=validateR21320Benchmark(earlyPayload),gap=validateR21322Stored(gapPayload);if(!early||!gap)throw new Error("R21324_SHADOW_BENCHMARK_INVALID");
  const iex=safeJson(path.join(base,IEX_FILE)),inv=safeJson(path.join(base,INV_FILE)),repair=buildR2134RepairedBenchmarks(iex?.series??{},inv);let fullSpy=mergeR21321BenchmarkRows(repair.series?.SPY??[],earlyPayload.series?.SPY??[]).rows;fullSpy=mergeR21321BenchmarkRows(fullSpy,gap.rows).rows;
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(path.join(base,PIT_FILE),"utf8")),tailBySector={};
  for(const sectorId of Object.keys(SECTOR_FEAR_GREED_R1_ETFS)){const history=buildSectorSpeculativeRawHistory({rows:mergedStocks.rows,spyRows:fullSpy,etfRows:[],pitHistory:pit,sectorId});tailBySector[sectorId]={observations:history.length,firstDate:history[0]?.date??null,lastDate:history.at(-1)?.date??null};}
  const tailObs=Object.values(tailBySector).map(x=>x.observations),currentRawMin=Math.min(...tailObs),currentRawMax=Math.max(...tailObs),stockDates=uniqueDates(mergedStocks.rows),spyDates=uniqueDates(fullSpy),knownPrior=buildR21324NyseSessions(),plan=buildR21324Plan({currentRawObservations:currentRawMin,currentUnderlyingSessions:Math.min(stockDates.length,spyDates.length),priorSessions:knownPrior}),universe=summarizeR21324GroupUniverse(files.base.map(arr)),coverage=summarizeR21324SectorCoverage(pit,universe.symbols,plan.plannedDates),groups=groupRequestPlan(files.base,plan.plannedSessions),plannedSet=new Set(plan.plannedDates),existingStockDatesInPlan=stockDates.filter(d=>plannedSet.has(d)),existingSpyDatesInPlan=spyDates.filter(d=>plannedSet.has(d)),allPitReady=Object.values(coverage).every(x=>x.pitReady),allGroupUniverseReady=Object.values(coverage).every(x=>x.groupUniverseReady),spyRequests=plan.plannedSessions?1:0,estimatedProviderRequests=groups.estimatedRequestsAtFullDensity+spyRequests,blockers=[];
  if(!plan.calendarEnough)blockers.push("KNOWN_NYSE_CALENDAR_RANGE_TOO_SHORT_FOR_TARGET");
  if(!plan.targetMet)blockers.push("PLANNED_PRIOR_WINDOW_DOES_NOT_REACH_252_NORMALIZED_DATES");
  if(!allPitReady)blockers.push("PIT_MEMBERSHIP_LT8_IN_PLANNED_WINDOW");
  if(!allGroupUniverseReady)blockers.push("EXISTING_ALPACA_GROUP_UNIVERSE_LT8_IN_PLANNED_WINDOW");
  if(currentRawMin<SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS)blockers.push("CURRENT_TAIL_REFERENCE_BELOW_756");
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.13.24-TAIL-BALANCE-HISTORY-BACKFILL-PLAN",generatedAt,status:"SHADOW_R21324_TAIL_BALANCE_HISTORY_BACKFILL_PLAN_COMPLETE",mode:"LOCAL_READ_ONLY_252_NORMALIZED_DATE_CAPACITY_PLAN",providerCalls:0,backfillExecuted:false,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS,normalizationChanged:false,weightsChanged:false,productionBenchmarkSourceChanged:false,candidateSelected:false,optionsEquivalenceClaimed:false,diagnosticOnly:true,calendarSource:"NYSE_2022_2023_YEARLY_TRADING_CALENDARS_STATIC_RESEARCH_FIXTURE",calendarWindow:{start:PRIOR_CALENDAR_START,end:PRIOR_CALENDAR_END,sessions:knownPrior.length},current:{stockRows:mergedStocks.rows.length,stockConflicts:mergedStocks.conflicts.length,stockSessions:stockDates.length,stockStart:stockDates[0]??null,stockEnd:stockDates.at(-1)??null,spySessions:spyDates.length,spyStart:spyDates[0]??null,spyEnd:spyDates.at(-1)??null,tailRawMin:currentRawMin,tailRawMax:currentRawMax},target:{normalizedDates:TARGET_NORMALIZED_DATES,reference:SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS,warmup:FEATURE_WARMUP_SESSIONS},plan,existingInPlan:{stockDates:existingStockDatesInPlan.length,spyDates:existingSpyDatesInPlan.length},universe:{symbolCount:universe.symbolCount},coverage,allPitReady,allGroupUniverseReady,requestEstimate:{stockGroupRequestsAtFullDensity:groups.estimatedRequestsAtFullDensity,spyRequests,estimatedProviderRequests,estimatedStockRowsAtFullDensity:groups.estimatedRowsAtFullDensity,sectorEtfRequests:0,sectorEtfBackfillRequired:false},groups,tailBySector,providerBackfillPlanReady:blockers.length===0,blockers};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.24 TAIL BALANCE HISTORY BACKFILL PLAN",`generatedAt=${generatedAt}`,`status=${report.status}`,"providerCalls=0 backfillExecuted=false rawRowsStored=false publicMutation=false d1Mutation=false","productionFormulaChanged=false dbSchemaChanged=false schedulerChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)","normalizationChanged=false weightsChanged=false productionBenchmarkSourceChanged=false candidateSelected=false optionsEquivalenceClaimed=false diagnosticOnly=true",`calendarSource=${report.calendarSource}`,`knownCalendar=${PRIOR_CALENDAR_START}..${PRIOR_CALENDAR_END} sessions=${knownPrior.length}`,`current stockSessions=${report.current.stockSessions} dates=${report.current.stockStart}..${report.current.stockEnd} spySessions=${report.current.spySessions} dates=${report.current.spyStart}..${report.current.spyEnd} tailRaw=${currentRawMin}..${currentRawMax}`,`target normalizedDates=${TARGET_NORMALIZED_DATES} targetRaw=${plan.targetRawObservations} warmup=${FEATURE_WARMUP_SESSIONS} theoreticalUnderlying=${plan.theoreticalUnderlyingRequired}`,`plan neededPriorSessions=${plan.neededPriorSessions} targetStart=${plan.targetStart??"NA"} targetEnd=${plan.targetEnd??"NA"} plannedSessions=${plan.plannedSessions} projectedRaw=${plan.projectedRawObservations} projectedNormalized=${plan.projectedNormalizedDates} targetMet=${plan.targetMet}`,`existingInPlan stockDates=${existingStockDatesInPlan.length} spyDates=${existingSpyDatesInPlan.length}`,`existingGroupSymbols=${universe.symbolCount} groups=${groups.groupCount} allPitReady=${allPitReady} allGroupUniverseReady=${allGroupUniverseReady}`,`requestEstimate stockGroupRequests=${groups.estimatedRequestsAtFullDensity} spyRequests=${spyRequests} total=${estimatedProviderRequests} stockRowsAtFullDensity=${groups.estimatedRowsAtFullDensity} sectorEtfRequests=0`,"sectorEtfBackfillRequired=false reason=TAIL_BALANCE_FEATURE_REQUIRES_SPY_NOT_SECTOR_ETF",`providerBackfillPlanReady=${report.providerBackfillPlanReady}`,`blockers=${blockers.length?blockers.join(","):"NONE"}`,"","SECTOR | ETF | TAIL_OBS | FIRST | LAST | MIN_PIT_ACTIVE | MIN_GROUP_SYMBOLS | PIT_READY | GROUP_READY"];
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){const t=tailBySector[sectorId],c=coverage[sectorId];lines.push(`${sectorId} | ${ticker} | ${t.observations} | ${t.firstDate??"NA"} | ${t.lastDate??"NA"} | ${c.minPitActive??0} | ${c.minGroupSymbols??0} | ${c.pitReady} | ${c.groupUniverseReady}`);}
  lines.push("","GROUP REQUEST ESTIMATE","GROUP | SYMBOLS | FULL_DENSITY_ROWS | EST_REQUESTS");for(const g of groups.groups)lines.push(`${g.name} | ${g.symbols} | ${g.estimatedRowsAtFullDensity} | ${g.estimatedRequestsAtFullDensity}`);
  lines.push("","note=252_NORMALIZED_DATES_REQUIRE_1007_RAW_TAIL_BALANCE_OBSERVATIONS_UNDER_THE_UNCHANGED_TRAILING_756_RULE","note=THE_PRIOR_WINDOW_IS_A_CAPACITY_PLAN_ONLY_AND_DOES_NOT GUARANTEE_EVERY_SYMBOL_WILL_RETURN_A_BAR_ON_EVERY_SESSION","note=SECTOR_ETFS_ARE_NOT_REQUIRED_FOR_TAIL_BALANCE_ITSELF_AND_ARE_NOT_INCLUDED_IN_THE_REQUEST_ESTIMATE","note=NO_PROVIDER_CALL_OR_BACKFILL_IS_EXECUTED_BY_THIS_DIAGNOSTIC");
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`);saveJson(jsonFile,report);saveText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21324();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,current:r.current,target:r.target,plan:r.plan,universe:r.universe,allPitReady:r.allPitReady,allGroupUniverseReady:r.allGroupUniverseReady,requestEstimate:r.requestEstimate,providerBackfillPlanReady:r.providerBackfillPlanReady,blockers:r.blockers,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,referenceRequirementChanged:r.referenceRequirementChanged},null,2));}catch(error){console.error(JSON.stringify({status:"FAILED",code:String(error?.message??error),providerCalls:0,publicMutation:false,d1Mutation:false,productionFormulaChanged:false,referenceRequirementChanged:false}));process.exitCode=1;}}
