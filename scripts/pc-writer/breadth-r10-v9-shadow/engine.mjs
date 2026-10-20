/** R10 V9 shadow: current core.sqlite only. No upstream fetch, no D1/public mutation.
 * Strict source audit and frozen V9 5-factor formula from the verified PC package.
 * Read-only projection for prospective validation, not a B1-R5 replacement. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {auditDay,eligibleRows} from './audit.mjs';
import {computeFiveFactor,smoothFiveFactorSeries,METHOD,FACTOR_WEIGHTS} from './formula.mjs';
import {latestCompletedSession,isMarketSession} from '../../../lib/market-score/breadth-b1-r3-calendar.mjs';
const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const STATUS_NAME='local-breadth-r10-v9-shadow-last-run.json';
const RESULT_NAME='local-breadth-r10-v9-shadow.json';
const COLS='trade_date,ticker,previous_date,previous_close,current_close,current_volume,source,feed,provenance_json';
const isDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const round=x=>typeof x==='number'&&Number.isFinite(x)?Number(x.toFixed(9)):null;
const count=rows=>rows.reduce((acc,r)=>(acc[r.status]=(acc[r.status]??0)+1,acc),{});
const summarizeRows=rows=>rows.map(r=>({date:r.date,status:r.status,eligible:r.eligible??null,required:r.required??null,reason:r.reason??null,rejected:r.reject??null}));
const validMembers=x=>Array.isArray(x)&&x.length>=490&&x.length<=520&&x.every(t=>typeof t==='string'&&t.trim()===t&&t.length>0)&&new Set(x).size===x.length;
function parseMembers(s){try{return JSON.parse(s)}catch{return null}}
export function evaluateDirect(db,dates,{onStage=()=>{}}={}){
 if(!Array.isArray(dates)||dates.length<120||dates.length>370||dates.some((d,i)=>!isDate(d)||(i>0&&d<=dates[i-1])))throw Error('BOUNDED_CALENDAR_INVALID');
 const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name));
 for(const t of ['market_score_breadth_b1_r3_universe_v1','market_score_breadth_b1_r3_current_v1','market_score_breadth_b1_r3_history_v1'])
  if(!tables.has(t))throw Error('TABLE_MISSING:'+t);
 const getUniverse=db.prepare('SELECT trade_date,members_json,member_count,provenance_json FROM market_score_breadth_b1_r3_universe_v1 WHERE trade_date=?');
 const getPrice=db.prepare('SELECT '+COLS+' FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=?');
 const getHistory=db.prepare('SELECT '+COLS+' FROM market_score_breadth_b1_r3_history_v1 WHERE trade_date=?');
 const memberByDate=new Map(),byDate=new Map(),auditByDate=new Map(),membersDigest=[];
 for(const date of dates){
  onStage('READ_DATE',date);
  const u=getUniverse.get(date),members=parseMembers(u?.members_json);
  if(!u){auditByDate.set(date,{date,status:'NO_STORED_UNIVERSE',pass:false,eligible:0});continue}
  if(!validMembers(members)||members.length!==Number(u.member_count)){
   auditByDate.set(date,{date,status:'INVALID_STORED_UNIVERSE',pass:false,eligible:0});continue}
  // A stored per-date universe is NOT official PIT proof. Report as a separate source method.
  memberByDate.set(date,members);
  const p=getPrice.all(date),h=getHistory.all(date);
  const audit=auditDay({date,universe:{trade_date:date,members,member_count:Number(u.member_count)},priceRows:p,historyRows:h});
  const e=eligibleRows({date,members,priceRows:p,historyRows:h});
  if(e.size!==audit.eligible)throw Error('AUDIT_ELIGIBILITY_MISMATCH:'+date);
  if(audit.pass&&audit.eligible<audit.required)throw Error('AUDIT_COVERAGE_BUG:'+date);
  byDate.set(date,e);auditByDate.set(date,audit);
  membersDigest.push({date,count:members.length});
 }
 const output=[];
 for(let ix=59;ix<dates.length;ix++){
  const window=dates.slice(ix-59,ix+1);
  const d=window.map(x=>auditByDate.get(x));
  onStage('COMPUTE',dates[ix]);
  const value=d.at(-1)?.pass?computeFiveFactor({dates:window,days:d,byDate,memberByDate}):{status:'NOT_READY',score:null,reason:d.at(-1)?.status??'LATEST_SOURCE_UNQUALIFIED'};
  output.push({date:dates[ix],...value});
 }
 const smooth=smoothFiveFactorSeries(output);
 const good=smooth.filter(x=>x.status==='CANDIDATE_READY');
 const notReady=smooth.filter(x=>x.status!=='CANDIDATE_READY');
 const latest=smooth.at(-1);
 const auditLast60=dates.slice(-60).map(d=>auditByDate.get(d));
 const goodDiff=[];for(let i=1;i<smooth.length;i++){
  if(smooth[i-1].status==='CANDIDATE_READY'&&smooth[i].status==='CANDIDATE_READY')goodDiff.push(Math.abs(smooth[i].ema3-smooth[i-1].ema3));
 }
 return {
  inputs:{datesChecked:dates.length,first:dates[0],last:dates.at(-1),nativePerDateUniverseCount:membersDigest.length,universeProvenanceNotPITVerified:true},
  last60QualifiedPriceDays:auditLast60.filter(x=>x?.pass).length,
  last60QualifiedPriceFailed:summarizeRows(auditLast60.filter(x=>!x?.pass)),
  all120QualifyReasons:count([...auditByDate.values()]),
  scoreSummary:{computedCandidateDates:smooth.length,ready:good.length,notReady:notReady.length,missing:notReady.map(x=>({date:x.date,reason:x.reason??'UNKNOWN'})),
    latest:latest?.status==='CANDIDATE_READY'?{date:latest.date,rawScore:latest.score,ema3:latest.ema3,
      referenceDate:latest.referenceDate,factors:latest.factors,contributions:latest.contributions,validDailySessions:latest.validDailySessions,
      f5Margin:latest.f5Eligible-latest.f5Required}:{date:latest?.date??null,status:latest?.status??'NOT_READY',reason:latest?.reason??'UNKNOWN'},
    ema3DailyAbsChange:goodDiff.length?{n:goodDiff.length,mean:round(goodDiff.reduce((a,b)=>a+b,0)/goodDiff.length)}:null},
  perDay:smooth.map(x=>({date:x.date,status:x.status,score:x.score??null,ema3:x.ema3??null,reason:x.reason??null,referenceDate:x.referenceDate??null})),
 };
}

function prevDate(date){const x=new Date(Date.parse(date+'T00:00:00Z')-86400000);return x.toISOString().slice(0,10)}
export function marketWindow(asOf,n=120){
 if(!isDate(asOf)||!isMarketSession(asOf)||!Number.isInteger(n)||n<60||n>370)throw Error('CALENDAR_INVALID');
 const dates=[];let date=asOf;
 while(dates.length<n){if(isMarketSession(date))dates.push(date);date=prevDate(date)}
 return dates.reverse();
}
export function projectDirect(evaluation,asOf){
 const rows=evaluation?.perDay??[];
 if(!rows.length||rows.at(-1).date!==asOf)throw Error('EVALUATION_ASOF_MISMATCH');
 const ready=rows.filter(x=>x.status==='CANDIDATE_READY');
 const last=ready.at(-1)??null;
 const dates=rows.map(x=>x.date);
 const lag=last?dates.length-1-dates.indexOf(last.date):null;
 const staleAllowed=lag!==null&&lag>0&&lag<=2;
 const current=last&&lag===0;
 return {
  status:current?'SHADOW_READY':staleAllowed?'SHADOW_STALE':'SHADOW_UNAVAILABLE',
  score:current||staleAllowed?last.ema3:null,rawScore:current||staleAllowed?last.score:null,
  asOf,observationDate:current||staleAllowed?last.date:null,lagSessions:lag,
  newObservation:!!current,missingCurrent:!current,
  latestReason:current?null:rows.at(-1).reason??'NO_VALID_CURRENT',
  method:METHOD,formulaWeights:FACTOR_WEIGHTS,
  calculation:{checked:rows.length,ready:ready.length,notReady:rows.length-ready.length},
  factors:current?evaluation.scoreSummary.latest.factors:null,
  contributions:current?evaluation.scoreSummary.latest.contributions:null,
 };
}
const scoreDate=(evaluation,asOf)=>evaluation.perDay.findLast(r=>r.date<=asOf&&r.status==='CANDIDATE_READY')?.date??asOf;
export function runShadow({base=DEFAULT_BASE,now=new Date(),writeLocal=false,asOf=null,historySessions=120}={}){
 const expected=latestCompletedSession(now);
 if(asOf!==null&&(!isDate(asOf)||asOf>expected||!isMarketSession(asOf)))throw Error('ASOF_NOT_COMPLETED_MARKET_SESSION');
 if(writeLocal&&asOf!==null&&asOf!==expected)throw Error('HISTORICAL_WRITE_FORBIDDEN');
 const date=asOf??expected;
 // Keep the scheduled Shadow's approved 120-session behavior. The publisher may
 // explicitly request 312 stored trading sessions to cover ~252 one-year observations
 // after the unchanged 60-session indicator warm-up. No provider/DB writes.
 if(!Number.isInteger(historySessions)||historySessions<120||historySessions>370)throw Error('HISTORY_SESSION_COUNT_INVALID');
 const dates=marketWindow(date,historySessions);
 const core=path.join(base,'storage','core.sqlite');
 if(!fs.existsSync(core))throw Error('CORE_SQLITE_MISSING');
 const db=new DatabaseSync(core,{readOnly:true});
 let report;
 try{
  db.exec('PRAGMA query_only=ON');db.exec('PRAGMA busy_timeout=2500');
  const before=Number(db.prepare('PRAGMA data_version').get().data_version);
  const evaluation=evaluateDirect(db,dates);
  const after=Number(db.prepare('PRAGMA data_version').get().data_version);
  if(before!==after)throw Error('SOURCE_CHANGED_DURING_READ');
  const latestUniverse=db.prepare('SELECT MAX(trade_date) date FROM market_score_breadth_b1_r3_universe_v1').get()?.date??null;
  const latestPrice=db.prepare('SELECT MAX(trade_date) date FROM market_score_breadth_b1_r3_current_v1').get()?.date??null;
  const hasRetrievedAt=db.prepare('PRAGMA table_info(market_score_breadth_b1_r3_current_v1)').all().some(c=>c.name==='retrieved_at');
  const sourceStoredAt=hasRetrievedAt?(db.prepare('SELECT MAX(retrieved_at) at FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=?').get(scoreDate(evaluation,date))?.at??null):null;
  const {scoreSummary,perDay,inputs}=evaluation;
  const display=projectDirect(evaluation,date);
  report={version:1,methodologyVersion:METHOD,mode:'PC_LOCAL_STORED_SHADOW_ONLY',
   status:display.status,asOf:date,display,sourceStoredAt,latestStored:{universe:latestUniverse,price:latestPrice},
   source:'PC_LOCAL_B1_R3_STORED_TIME_LABELED_NOT_OFFICIAL_PIT_ATTESTED',
   quality:{pitOfficialIndependentlyVerified:false,noImputation:true,emaResetsOnMissing:true},
   evaluation:{inputs,scoreSummary,perDay},
   security:{providerCalls:0,networkCalls:0,dbWrites:0,d1Writes:0,publications:0,deploys:0,productionFormulaChanged:false},
   observationRunAt:new Date(now).toISOString(),dbDataVersion:after,localShadowWrites:writeLocal?(display.status==='SHADOW_READY'?2:1):0,productionApproved:false};
 }finally{db.close()}
 if(writeLocal){
  // ONLY separate shadow artifacts; never replace a published score or writer checkpoint.
  // STALE or UNAVAILABLE must not overwrite the last verified READY score.
  if(report.status==='SHADOW_READY')fs.writeFileSync(path.join(base,RESULT_NAME),JSON.stringify(report,null,2)+'\n',{flag:'w'});
  fs.writeFileSync(path.join(base,STATUS_NAME),JSON.stringify({at:report.observationRunAt,status:report.status,asOf:report.asOf,display:report.display,latestStored:report.latestStored,source:'R10_V9_SHADOW'},null,2)+'\n',{flag:'w'});
 }
 return report;
}
