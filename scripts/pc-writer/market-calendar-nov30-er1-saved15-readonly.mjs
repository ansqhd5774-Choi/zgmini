// A-grade read-only checkpoint inspection after #369 PARTIAL.
// No provider access, local writes, D1, re-run, or public publication.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
 loadNovemberEvents,existingActual,selectFutureNovemberSymbols
} from './market-calendar-nov30-er1-probe-publish.mjs';

const PC_HOME='E:\\ZGmini\\data\\pc-writer';
const AS_OF='2026-11-04'; // Replay the exact calendar cohort of #369.
const digest=data=>createHash('sha256').update(data).digest('hex');
const stop=code=>{throw Error(code)};
const codeOf=e=>/^NOV30_SAVED15_[A-Z0-9_]+$/.test(String(e?.message))?
 e.message:'NOV30_SAVED15_UNEXPECTED_STOP';

export async function inspectSavedNovemberBatch20({
 pcHome=PC_HOME,asOf=AS_OF,calendarLoader=loadNovemberEvents,
 storedReader=existingActual,scorer,serializer,requireWindows=true
}={}){
 const report={schema:'ZGMINI_NOV30_ER1_SAVED15_READONLY_V1',
  status:'BLOCKED',code:'NOV30_SAVED15_NOT_STARTED',
  asOf,provenance:'PC_CACHED_ONLY_PARTIAL_COHORT',
  pilotOnly:true,selectedSymbols:0,cachedObservedSymbols:0,
  missingActualSymbols:0,firstMissingSymbol:null,firstMissingScheduledDate:null,
  scoreableIssuers:0,star3Count:0,highestScore:null,
  providerCalls:0,localWrites:0,d1Writes:0,coreWrites:0,
  existingFeedWrites:0,schedulerWrites:0};
 try{
  if(requireWindows&&process.platform!=='win32')
   stop('NOV30_SAVED15_WINDOWS_ONLY');
  if(asOf!==AS_OF)stop('NOV30_SAVED15_AS_OF_DRIFT_STOP');
  if(!path.isAbsolute(pcHome)||!fs.existsSync(pcHome))
   stop('NOV30_SAVED15_PC_HOME_INVALID');
  const events=await calendarLoader(pcHome);
  const symbols=selectFutureNovemberSymbols(events,asOf,20);
  if(!symbols.length)stop('NOV30_SAVED15_NO_FUTURE_EVENTS');
  report.selectedSymbols=symbols.length;
  const dateBySymbol=new Map();
  for(const e of events){
   if(symbols.includes(e.ticker)&&e.date>asOf&&
    (!dateBySymbol.has(e.ticker)||e.date<dateBySymbol.get(e.ticker)))
    dateBySymbol.set(e.ticker,e.date);
  }
  const observed=[];
  for(const symbol of symbols){
   const stored=storedReader(pcHome,symbol);
   if(stored)observed.push({issuerId:symbol,tickers:[symbol],
    earningsSymbol:symbol,releases:stored.actuals});
   else{
    report.missingActualSymbols++;
    if(!report.firstMissingSymbol){
     report.firstMissingSymbol=symbol;
     report.firstMissingScheduledDate=dateBySymbol.get(symbol)??null;
    }
   }
  }
  report.cachedObservedSymbols=observed.length;
  if(!observed.length)stop('NOV30_SAVED15_NO_CACHED_ACTUALS');
  const calculate=scorer??(await import('../../lib/market-calendar-er1-earnings-score.mjs')).scoreER1Issuers;
  const serialize=serializer??(await import('../../lib/market-calendar-er1-public-display.mjs')).makeER1PublicDisplay;
  const scored=calculate(observed,{asOf});
  report.scoreableIssuers=scored.coverage?.scoreableIssuers??0;
  report.star3Count=scored.star3Count??0;
  report.highestScore=scored.rankings?.[0]?.score??null;
  if(scored.status==='READY_SHADOW'){
   const privateDisplay=serialize(scored);
   const body=JSON.stringify(privateDisplay);
   if(Buffer.byteLength(body,'utf8')>100000)
    stop('NOV30_SAVED15_SERIALIZED_SIZE_STOP');
   report.privatePreviewSha256=digest(body);
  }else if(scored.status!=='BLOCKED')
   stop('NOV30_SAVED15_SCORE_STATUS_STOP');
  report.status='PASS';
  report.code='NOV30_SAVED15_PARTIAL_COHORT_READONLY_VERIFIED';
 }catch(e){report.code=codeOf(e)}
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output||!path.isAbsolute(output)){
  process.stderr.write('NOV30_SAVED15_REPORT_PATH_REQUIRED\n');
  process.exitCode=2;
 }else{
  const result=await inspectSavedNovemberBatch20();
  try{fs.writeFileSync(output,JSON.stringify(result)+'\n',{flag:'wx'})}
  catch{process.stderr.write('NOV30_SAVED15_REPORT_SAVE_STOP\n');process.exitCode=2}
  console.log('NOV30_SAVED15='+result.status+' CODE='+result.code+
   ' CACHED='+(result.cachedObservedSymbols??0)+' SCOREABLE='+
   (result.scoreableIssuers??0)+' STAR3='+(result.star3Count??0));
  if(result.status!=='PASS')process.exitCode=1;
 }
}
