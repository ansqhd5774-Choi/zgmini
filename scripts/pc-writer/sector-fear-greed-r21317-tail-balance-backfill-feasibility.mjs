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
const ALPACA_DIR="asset-r10-alpaca";
const OUT="local-sector-fear-greed-r21317-tail-balance-backfill-feasibility";
const WARMUP=60;
const REQUIRED=SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS;
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
function json(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function arr(file){const x=json(file);return Array.isArray(x)?x:[];}
function listStoredFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).map(n=>path.join(dir,n)):[];const inc=path.join(dir,"incremental");const incremental=fs.existsSync(inc)?fs.readdirSync(inc).filter(n=>!n.startsWith(".")).map(n=>path.join(inc,n)).filter(f=>fs.statSync(f).isFile()):[];return {base,all:[...base,...incremental]};}
function rowDate(r){return String(r?.tradeDate??r?.trade_date??r?.date??"").slice(0,10);}
function uniqueDates(rows=[]){return [...new Set((Array.isArray(rows)?rows:[]).map(rowDate).filter(validDate))].sort();}
export function summarizeR21317CalendarCapacity(dates=[],{required=REQUIRED,warmup=WARMUP}={}){
  const clean=[...new Set((Array.isArray(dates)?dates:[]).filter(validDate))].sort();
  const calendarSessions=clean.length,maxPossibleScoreObservations=Math.max(0,calendarSessions-warmup),missingScoreObservations=Math.max(0,required-maxPossibleScoreObservations),minimumAdditionalRawSessions=Math.max(0,required+warmup-calendarSessions);
  return {calendarSessions,required,warmup,maxPossibleScoreObservations,missingScoreObservations,minimumAdditionalRawSessions,localCalendarEnough:maxPossibleScoreObservations>=required,firstDate:clean[0]??null,lastDate:clean.at(-1)??null};
}
function activeCounts(pit,date){const counts={};for(const list of Object.values(pit.byTicker??{})){const active=(list??[]).find(x=>x.dateAdded<=date&&(!x.dateRemoved||date<x.dateRemoved));if(active)counts[active.sectorId]=(counts[active.sectorId]??0)+1;}return counts;}
function pitCoverageStart(pit){const events=[...new Set((pit.entries??[]).flatMap(x=>[x.dateAdded,x.dateRemoved].filter(validDate)))].sort();for(const date of events){const counts=activeCounts(pit,date);if(Object.keys(SECTOR_FEAR_GREED_R1_ETFS).every(sector=>(counts[sector]??0)>=8))return {date,counts};}return {date:null,counts:{}};}
function tickerRanges(rows=[]){const map=new Map();for(const row of rows){const d=rowDate(row),t=String(row?.ticker??"").trim();if(!validDate(d)||!t)continue;const x=map.get(t)??{first:d,last:d,dates:new Set()};if(d<x.first)x.first=d;if(d>x.last)x.last=d;x.dates.add(d);map.set(t,x);}return map;}
function sectorCoverageAtDate(pit,ranges,date){const out={};for(const sectorId of Object.keys(SECTOR_FEAR_GREED_R1_ETFS)){let active=0,hasAnyLocal=0,hasWarmupPotential=0;for(const [ticker,list] of Object.entries(pit.byTicker??{})){const item=(list??[]).find(x=>x.dateAdded<=date&&(!x.dateRemoved||date<x.dateRemoved));if(!item||item.sectorId!==sectorId)continue;active++;const range=ranges.get(ticker);if(range){hasAnyLocal++;if(range.dates.size>=WARMUP+1&&range.first<=date)hasWarmupPotential++;}}out[sectorId]={activePitMembers:active,localTickers:hasAnyLocal,warmupPotentialTickers:hasWarmupPotential};}return out;}

export function runSectorFearGreedR21317TailBalanceBackfillFeasibility(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const pitPath=path.join(base,PIT_FILE);if(!fs.existsSync(pitPath))throw new Error("R21317_PIT_HISTORY_MISSING");
  const files=listStoredFiles(path.join(base,ALPACA_DIR));if(!files.base.length)throw new Error("R21317_ALPACA_LOCAL_STORE_MISSING");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8")),merged=mergeAlpacaRows(files.all.map(arr)),rows=merged.rows,dates=uniqueDates(rows),capacity=summarizeR21317CalendarCapacity(dates),ranges=tickerRanges(rows),pitStart=pitCoverageStart(pit),probeDate=dates[0]??null,probe=probeDate?sectorCoverageAtDate(pit,ranges,probeDate):{};
  const allPitReadyAtLocalStart=probeDate?Object.values(probe).every(x=>x.activePitMembers>=8):false;
  const allHaveAtLeast8LocalTickers=probeDate?Object.values(probe).every(x=>x.localTickers>=8):false;
  const blockers=[];
  if(!capacity.localCalendarEnough)blockers.push("LOCAL_STOCK_CALENDAR_TOO_SHORT_FOR_756_PLUS_60_WARMUP");
  if(!allPitReadyAtLocalStart)blockers.push("PIT_MEMBERSHIP_LT8_IN_ONE_OR_MORE_SECTORS_AT_LOCAL_START");
  if(!allHaveAtLeast8LocalTickers)blockers.push("LOCAL_TICKER_COVERAGE_LT8_IN_ONE_OR_MORE_SECTORS_AT_LOCAL_START");
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const report={version:"R2.13.17-TAIL-BALANCE-BACKFILL-FEASIBILITY",generatedAt,status:"SHADOW_R21317_TAIL_BALANCE_BACKFILL_FEASIBILITY_COMPLETE",mode:"LOCAL_READ_ONLY_BACKFILL_REQUIREMENT_DIAGNOSTIC",providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,fillForwardFill:false,sourceFilesMutated:false,candidateSelected:false,selectionThresholdIntroduced:false,optionsEquivalenceClaimed:false,newFormulaIntroduced:false,normalizationChanged:false,referenceWindowChanged:false,diagnosticOnly:true,warmupSessions:WARMUP,capacity,pit:{source:pit.source,sourceLicense:pit.sourceLicense,entries:pit.entries.length,coverageStartDate:pitStart.date,allPitReadyAtLocalStart},local:{rows:rows.length,conflicts:merged.conflicts.length,firstDate:dates[0]??null,lastDate:dates.at(-1)??null,allHaveAtLeast8LocalTickers,sectorProbeAtLocalStart:probe},localOnlyBackfillFeasible:blockers.length===0,blockers};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.17 TAIL BALANCE BACKFILL FEASIBILITY",`generatedAt=${generatedAt}`,`status=${report.status}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false","productionFormulaChanged=false dbSchemaChanged=false schedulerChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)","fillForwardFill=false sourceFilesMutated=false candidateSelected=false selectionThresholdIntroduced=false","optionsEquivalenceClaimed=false newFormulaIntroduced=false normalizationChanged=false referenceWindowChanged=false diagnosticOnly=true",`local rows=${report.local.rows} conflicts=${report.local.conflicts} dates=${report.local.firstDate}..${report.local.lastDate}`,`calendarSessions=${capacity.calendarSessions} warmup=${capacity.warmup} maxPossibleScoreObservations=${capacity.maxPossibleScoreObservations} required=${capacity.required} missingScoreObservations=${capacity.missingScoreObservations} minimumAdditionalRawSessions=${capacity.minimumAdditionalRawSessions} localCalendarEnough=${capacity.localCalendarEnough}`,`pit source=${report.pit.source} license=${report.pit.sourceLicense} entries=${report.pit.entries} coverageStartDate=${report.pit.coverageStartDate??"NA"} allPitReadyAtLocalStart=${report.pit.allPitReadyAtLocalStart}`,`localOnlyBackfillFeasible=${report.localOnlyBackfillFeasible}`,`blockers=${report.blockers.length?report.blockers.join(","):"NONE"}`,"","SECTOR | ETF | PIT_ACTIVE_AT_LOCAL_START | LOCAL_TICKERS | WARMUP_POTENTIAL_TICKERS"];
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){const x=probe[sectorId]??{};lines.push(`${sectorId} | ${ticker} | ${x.activePitMembers??0} | ${x.localTickers??0} | ${x.warmupPotentialTickers??0}`);}
  lines.push("","note=THIS_IS_AN_UPPER_BOUND_DIAGNOSTIC_LOCAL_CALENDAR_MINUS_60_WARMUP","note=IF_MAX_POSSIBLE_SCORE_OBSERVATIONS_IS_BELOW_756_LOCAL_RECOMPUTE_ALONE_CANNOT_SATISFY_THE_APPROVED_REFERENCE","note=NO_PROVIDER_CALL_IS_MADE_AND_NO_BACKFILL_IS_EXECUTED","note=NO_REFERENCE_NORMALIZATION_FORMULA_WEIGHT_PUBLICATION_OR_SCHEMA_CHANGE");
  fs.writeFileSync(path.join(base,`${OUT}.json`),JSON.stringify(report,null,2)+"\n");fs.writeFileSync(path.join(base,`${OUT}.txt`),lines.join("\n")+"\n");return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runSectorFearGreedR21317TailBalanceBackfillFeasibility();console.log(JSON.stringify({status:r.status,jsonFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,`${OUT}.json`),txtFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,`${OUT}.txt`),providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,referenceRequirementChanged:r.referenceRequirementChanged,capacity:r.capacity,pit:r.pit,localOnlyBackfillFeasible:r.localOnlyBackfillFeasible,blockers:r.blockers},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
