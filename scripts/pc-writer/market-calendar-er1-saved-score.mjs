// ER1 one-shot scorer for the five already-saved EarningsAPI calendar days.
// No issuer roster, provider calls, Core writes, scheduling or D1 publication.
// The observed calendar cohort is NOT represented as a complete issuer universe.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {scoreER1Issuers,uniqueIssuerAlias} from '../../lib/market-calendar-er1-earnings-score.mjs';
import {makeER1PublicDisplay} from '../../lib/market-calendar-er1-public-display.mjs';

const DEFAULT_PC_HOME = String.raw`E:\ZGmini\data\pc-writer`;
const ER1_DAYS = ['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30'];
const ER1_ASOF = '2026-11-02';
const outputFile = 'er1-public-display.json';
const stop = code => {throw Error(code)};
const MAX_DAY_BYTES = 2_000_000;
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const groups=['pre','after','notSupplied'];

// Saved-file reader only. Deliberately no provider fetch, env, or Core imports.
function readSavedDay(file,day) {
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<20||
    stat.size>MAX_DAY_BYTES) stop('ER1_SAVED_DAY_SIZE_OR_TYPE_INVALID');
 let saved;
 try{saved=JSON.parse(fs.readFileSync(file,'utf8'))}
 catch{stop('ER1_SAVED_DAY_JSON_INVALID')}
 if(saved?.body?.date!==day ||
    typeof saved.storedAt!=='string' ||
    !Number.isFinite(Date.parse(saved.storedAt)) ||
    !groups.every(group=>Array.isArray(saved.body[group])))
  stop('ER1_SAVED_SOURCE_DAY_INVALID_STOP');
 const events=[];
 let excludedEvents=0;
 for(const group of groups)for(const event of saved.body[group]) {
  const valid=event&&typeof event==='object'&&!Array.isArray(event)&&
   TICKER.test(event.symbol)&&Object.hasOwn(event,'eps')&&
   Object.hasOwn(event,'revenue')&&(event.eps===null||finite(event.eps))&&
   (event.revenue===null||(finite(event.revenue)&&event.revenue>=0));
  if(valid)events.push({date:day,symbol:event.symbol,
   eps:event.eps,revenue:event.revenue});
  else excludedEvents++;
 }
 return {events,excludedEvents};
}

function readObservedCohort(pcHome,asOf) {
 const bySymbol=new Map(), seenDates=new Map();
 let sourceDays=0,recoveredRows=0;
 for(const day of ER1_DAYS) {
  const file=path.join(pcHome,'er1-input','days',`${day}.json`);
  if(!fs.existsSync(file)) stop('ER1_SAVED_SOURCE_DAY_MISSING_STOP');
  const saved=readSavedDay(file,day);
  recoveredRows+=saved.excludedEvents;
  sourceDays++;
  if(day>=asOf) continue; // Never count an unverified same-day report.
  for(const event of saved.events) {
   const key=event.symbol+'|'+day,old=seenDates.get(key);
   if(old&&(old.eps!==event.eps||old.revenue!==event.revenue))
    stop('ER1_CALENDAR_CONFLICTING_REPORT');
   if(old)continue;
   seenDates.set(key,event);
   if(!bySymbol.has(event.symbol))bySymbol.set(event.symbol,[]);
   bySymbol.get(event.symbol).push(event);
  }
 }
 const observations=[...bySymbol.entries()].sort(([a],[b])=>a.localeCompare(b))
  .map(([symbol,releases])=>[symbol,
   releases.sort((a,b)=>b.date.localeCompare(a.date))]);
 return {observations,sourceDays,recoveredRows};
}

// Compare every stored report before treating different share classes as one
// issuer. EPS is per share and may legitimately differ by share class; never
// choose one class's actuals over another class's conflicting observations.
function buildIssuerRows(observations){
 const issuers=new Map();
 for(const [symbol,releases] of observations){
  const issuerId=uniqueIssuerAlias(symbol);
  if(!issuers.has(issuerId))issuers.set(issuerId,[]);
  issuers.get(issuerId).push({symbol,releases});
 }
 const rows=[];
 let shareClassGroups=0,shareClassConflicts=0;
 for(const [issuerId,classes] of issuers){
  classes.sort((a,b)=>a.symbol.localeCompare(b.symbol));
  const primary=classes[0];
  if(classes.length>1)shareClassGroups++;
  const verified=classes.every(({releases})=>
   releases.length===primary.releases.length&&releases.every((event,i)=>{
    const original=primary.releases[i];
    return event.date===original.date&&event.eps===original.eps&&
     event.revenue===original.revenue;
   }));
  if(!verified)shareClassConflicts++;
  rows.push({issuerId,tickers:classes.map(({symbol})=>symbol),
   earningsSymbol:primary.symbol,releases:verified?primary.releases:[]});
 }
 return {rows,shareClassGroups,shareClassConflicts};
}

/** Score only actual, previously stored EPS+revenue observations.
 * The count checks the saved input; it never invents an issuer population.
 * No output is overwritten, and no raw earnings field is publicly emitted.
 */
export function runER1SavedScore({pcHome=DEFAULT_PC_HOME,asOf=ER1_ASOF,
 expectedObservedSymbols=838,
 outputPath=path.join(pcHome,'er1-input',outputFile)}={}) {
 const report={status:'BLOCKED',reason:null,asOf,providerRequests:0,
  dbWrites:0,d1Writes:0,sourceDays:0,recoveredRows:0,
  inputSymbols:0,symbolsWithBoth:0,scoreableIssuers:0,
  shareClassGroups:0,shareClassConflicts:0,
  star3Count:0,outputCreated:false};
 try {
  if(asOf!==ER1_ASOF || !Number.isInteger(expectedObservedSymbols) ||
   expectedObservedSymbols<1 || typeof pcHome!=='string' ||
   !path.isAbsolute(pcHome) || typeof outputPath!=='string' ||
   !path.isAbsolute(outputPath)) stop('ER1_SAVED_BATCH_PATH_OR_TARGET_INVALID_STOP');
  if(fs.existsSync(outputPath)) stop('ER1_PUBLIC_DISPLAY_ALREADY_EXISTS_STOP');

  const input=readObservedCohort(pcHome,asOf);
  const {observations}=input;
  report.sourceDays=input.sourceDays;
  report.recoveredRows=input.recoveredRows;
  report.inputSymbols=observations.length;
  report.symbolsWithBoth=observations.filter(([,releases])=>
   releases.some(row=>row.eps!==null)&&releases.some(row=>row.revenue!==null)).length;
  if(report.symbolsWithBoth!==expectedObservedSymbols)
   stop('ER1_SAVED_SYMBOL_COUNT_MISMATCH_STOP');

  // Class labels are observations, not separate companies. Only identical
  // actual histories may be merged; conflicting classes remain unscored.
  const {rows,shareClassGroups,shareClassConflicts}=buildIssuerRows(observations);
  report.shareClassGroups=shareClassGroups;
  report.shareClassConflicts=shareClassConflicts;
  const result=scoreER1Issuers(rows,{asOf});
  if(shareClassConflicts){
   const reasons=result.coverage?.unscoreableReasons;
   const missing=reasons?.ER1_RELEASE_HISTORY_INSUFFICIENT??0;
   if(missing<shareClassConflicts)stop('ER1_SHARE_CLASS_COVERAGE_MISMATCH_STOP');
   if(missing===shareClassConflicts)delete reasons.ER1_RELEASE_HISTORY_INSUFFICIENT;
   else reasons.ER1_RELEASE_HISTORY_INSUFFICIENT-=shareClassConflicts;
   reasons.ER1_SHARE_CLASS_SOURCE_CONFLICT=shareClassConflicts;
  }
  report.scoreableIssuers=result.coverage?.scoreableIssuers??0;
  if(result.status!=='READY_SHADOW') stop(result.reason);
  const published=makeER1PublicDisplay(result);
  if(published.recordCount!==report.scoreableIssuers)
   stop('ER1_DERIVED_SCORE_COUNT_MISMATCH_STOP');
  fs.writeFileSync(outputPath,JSON.stringify(published)+'\n',
   {encoding:'utf8',flag:'wx'});
  report.status='READY_ER1_PC_DERIVED';
  report.star3Count=published.star3Count;
  report.outputCreated=true;
 } catch(error) {
  const reason=String(error?.message??'');
  report.reason=/^ER1_[A-Z0-9_]+$/.test(reason)?reason:
   'ER1_OFFLINE_SCORE_UNEXPECTED_STOP';
 }
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const report=runER1SavedScore({pcHome:process.argv[2]||DEFAULT_PC_HOME});
 process.stdout.write(Object.entries(report).map(([key,val])=>
  `${key.toUpperCase()}=${JSON.stringify(val)}`).join('\r\n')+'\r\n');
 if(report.status!=='READY_ER1_PC_DERIVED') process.exitCode=1;
}
