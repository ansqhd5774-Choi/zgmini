// ER1 offline-only PC scorer for the already saved five EarningsAPI days.
// No provider calls, Core writes, scheduling changes or D1 publication.
// Requires a separately approved COMPLETE eligible-issuer roster; vendor
// calendar symbols must never implicitly become approved issuers.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {indexSavedER1CalendarDays} from '../../lib/market-calendar-er1-calendar-adapter.mjs';
import {scoreER1Issuers} from '../../lib/market-calendar-er1-earnings-score.mjs';
import {makeER1PublicDisplay} from '../../lib/market-calendar-er1-public-display.mjs';
import {readER1SavedDay} from './market-calendar-er1-minimal-capture.mjs';

const DEFAULT_PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const ER1_DAYS=['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30'];
const ER1_ASOF='2026-11-02';
const rosterMethod='ER1_INDEPENDENTLY_APPROVED_ELIGIBLE_ISSUERS_R1';
const rosterFile='er1-approved-issuers.json';
const outputFile='er1-public-display.json';
const stop=code=>{throw Error(code)};

function approvedRoster(roster,asOf){
 if(roster?.version!==1||roster.method!==rosterMethod||
  roster.asOf!==asOf||roster.universeReviewed!==true||
  typeof roster.approvalReference!=='string'||roster.approvalReference.trim().length<8||
  !Array.isArray(roster.members)||
  !Number.isInteger(roster.expectedEligibleIssuers)||roster.expectedEligibleIssuers<1)
  stop('ER1_APPROVED_ROSTER_REQUIRED_STOP');
 // The scorer independently checks issuer identities, share classes, ticker
 // collisions and completeness. No unreviewed ticker is auto-added here.
 return roster;
}

/** Reads the five SAVED PC source files, computes the approved ER1 score,
 * and writes ONLY derived compact scores to an absent output file. Missing
 * source/roster or incomplete coverage produces no new public file. */
export function runER1SavedScore({pcHome=DEFAULT_PC_HOME,asOf=ER1_ASOF,
 expectedObservedSymbols=838,rosterPath=path.join(pcHome,'er1-input',rosterFile),
 outputPath=path.join(pcHome,'er1-input',outputFile)}={}){
 const report={status:'BLOCKED',reason:null,asOf,providerRequests:0,
  dbWrites:0,d1Writes:0,sourceDays:0,recoveredRows:0,
  symbolsWithBoth:0,reviewedEligibleIssuers:0,scoreableIssuers:0,
  star3Count:0,outputCreated:false};
 try{
  if(asOf!==ER1_ASOF||!Number.isInteger(expectedObservedSymbols)||
   expectedObservedSymbols<1)stop('ER1_SAVED_BATCH_DATE_OR_TARGET_INVALID_STOP');
  if(fs.existsSync(outputPath))stop('ER1_PUBLIC_DISPLAY_ALREADY_EXISTS_STOP');
  if(!fs.existsSync(rosterPath))stop('ER1_APPROVED_ROSTER_FILE_MISSING_STOP');
  let roster;
  try{roster=JSON.parse(fs.readFileSync(rosterPath,'utf8'));}
  catch{stop('ER1_APPROVED_ROSTER_JSON_INVALID_STOP')}
  approvedRoster(roster,asOf);
  const saved=[];
  for(const day of ER1_DAYS){
   const file=path.join(pcHome,'er1-input','days',`${day}.json`);
   if(!fs.existsSync(file))stop('ER1_SAVED_SOURCE_DAY_MISSING_STOP');
   const {verifiedInput,diagnostics}=readER1SavedDay(file,day,asOf);
   if(!verifiedInput)stop('ER1_SAVED_SOURCE_DAY_INVALID_STOP');
   report.recoveredRows+=diagnostics.excludedEvents??0;
   report.sourceDays++;saved.push(verifiedInput);
  }
  const index=indexSavedER1CalendarDays(saved,{asOf});
  report.symbolsWithBoth=Object.values(index.releasesBySymbol).filter(releases=>
   releases.some(row=>row.eps!==null)&&releases.some(row=>row.revenue!==null)).length;
  if(report.symbolsWithBoth!==expectedObservedSymbols)
   stop('ER1_SAVED_SYMBOL_COUNT_MISMATCH_STOP');
  const rows=roster.members.map(member=>({...member,
   releases:index.releasesBySymbol[member.earningsSymbol]??[]}));
  const result=scoreER1Issuers(rows,{asOf,
   expectedEligibleIssuers:roster.expectedEligibleIssuers});
  report.reviewedEligibleIssuers=result.coverage.reviewedEligibleIssuers;
  report.scoreableIssuers=result.coverage.scoreableIssuers;
  if(result.status!=='READY_SHADOW')stop(result.reason);
  const published=makeER1PublicDisplay(result);
  // Existing PC source day files and user outputs are NEVER overwritten.
  fs.writeFileSync(outputPath,JSON.stringify(published)+'\n',{encoding:'utf8',flag:'wx'});
  report.status='READY_ER1_PC_DERIVED';report.star3Count=published.star3Count;
  report.outputCreated=true;
 }catch(error){
  const reason=String(error?.message??'');
  report.reason=/^ER1_[A-Z0-9_]+$/.test(reason)?reason:'ER1_OFFLINE_SCORE_UNEXPECTED_STOP';
 }
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=runER1SavedScore({pcHome:process.argv[2]||DEFAULT_PC_HOME});
 // Print ONLY aggregate metadata. Never print tickers, EPS, revenue, or paths.
 process.stdout.write(Object.entries(report).map(([key,val])=>
  `${key.toUpperCase()}=${JSON.stringify(val)}`).join('\r\n')+'\r\n');
 if(report.status!=='READY_ER1_PC_DERIVED')process.exitCode=1;
}
