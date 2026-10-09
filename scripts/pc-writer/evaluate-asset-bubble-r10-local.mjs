// Local-only read-only Asset Bubble R10 candidate evaluation.
// No provider calls, remote reads, DB mutation or production publication.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {marketOperationalStore} from '../../worker/candidate-market-operational-store.mjs';
import {evaluateAssetBubbleR10Candidate} from '../../lib/diagnostic-layer/asset-bubble-r10-evaluation.mjs';

const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const file=path.join(base,'storage','core.sqlite');
const report={methodology:'ASSET_BUBBLE_R10_CANDIDATE',mode:'LOCAL_READ_ONLY',
 at:new Date().toISOString(),providerRequests:0,dbWrites:0,publication:false,productionFormulaChanged:false};
const dateRe=/^\d{4}-\d{2}-\d{2}$/;
function fileInfo(name){
 const f=path.join(base,name);
 return fs.existsSync(f)?{exists:true,bytes:fs.statSync(f).size,modifiedAt:fs.statSync(f).mtime.toISOString()}:{exists:false};
}
function summarize(rows=[]){
 const valid=(Array.isArray(rows)?rows:[]).filter(r=>typeof r?.observationDate==='string'&&dateRe.test(r.observationDate)&&typeof r.value==='number'&&Number.isFinite(r.value));
 return {rows:valid.length,first:valid[0]?.observationDate??null,last:valid.at(-1)?.observationDate??null};
}
async function run(){
 if(!fs.existsSync(file))throw Error('LOCAL_CORE_SQLITE_NOT_FOUND');
 const db=new DatabaseSync(file,{readOnly:true});db.exec('PRAGMA query_only=ON');
 const d1={prepare:(sql)=>({bind(...args){return {first:async()=>db.prepare(sql).get(...args)??null}}})};
 try{
  const store=marketOperationalStore(d1);
  const full=await store.readInput('macro');
  const shadow=await store.readInput('shadowSp500Benchmark');
  const macroSeries=full?.body?.series??{},sp500ShadowRows=shadow?.body?.series?.SP500??[];
  const z1Ids=['BOGZ1FA153064475Q','BOGZ1FL153064475Q'];
  report.z1=Object.fromEntries(z1Ids.map(id=>[id,summarize(macroSeries[id])]));
  report.sp500={...summarize(sp500ShadowRows),storedAt:shadow?.storedAt??null,
    historyMode:shadow?.body?.historyMode??null,rightsStatus:'RESEARCH_ONLY_LICENSE_NOT_CLEARED'};
  const input=evaluateAssetBubbleR10Candidate({macroSeries,sp500ShadowRows,
   // No unverified B1, R6 or R7 score may fill an R10 breadth component.
   breadthScoreRows:[],breadthEvidence:null,asOfDate:new Date().toISOString().slice(0,10)});
  report.candidate={status:input.status,score:input.score,lastQuarter:input.lastQuarter,
    missing:input.rows.at(-1)?.missing??Object.keys({
      valuationPressure:1,priceAcceleration:1,riskAssetShare:1,
      speculativeFlows:1,breadthDivergence:1,excessLiquidity:1}),
    inputStatus:input.inputStatus,knownWeight:input.rows.at(-1)?.knownWeight??0,
    productionEligible:input.productionEligible,lookAheadSafe:input.lookAheadSafe};
  report.breadthPit={
   universeFile:fileInfo('local-breadth-r7-pit-universe.json'),
   historyFile:fileInfo('local-breadth-r7-pit-price-history.json'),
   backtestFile:fileInfo('local-breadth-r7-pit-backtest.json'),
  };
  const uniPath=path.join(base,'local-breadth-r7-pit-universe.json');
  if(fs.existsSync(uniPath)){
   const uni=JSON.parse(fs.readFileSync(uniPath,'utf8'));
   report.breadthPit.universe={
    status:uni.status??null,first:uni.first??null,last:uni.last??null,
    currentDate:uni.currentDate??null,sessionCount:Array.isArray(uni.universes)?uni.universes.length:0,
    membershipLookAheadSafe:uni.membershipLookAheadSafe===true,
    currentUniverseSurvivorshipBiasRemoved:uni.currentUniverseSurvivorshipBiasRemoved===true,
    eventDigestPresent:typeof uni.eventDigest==='string'&&uni.eventDigest.length>0,
   };
  }
  // Large price history is inspected only for metadata integrity and coverage.
  const historyPath=path.join(base,'local-breadth-r7-pit-price-history.json');
  if(fs.existsSync(historyPath)){
   const history=JSON.parse(fs.readFileSync(historyPath,'utf8'));
   const rows=Array.isArray(history.rows)?history.rows:[];
   const matched=Boolean(report.breadthPit.universe?.eventDigestPresent&&
     history.pitEventDigest&&history.pitEventDigest===
     JSON.parse(fs.readFileSync(uniPath,'utf8')).eventDigest);
   report.breadthPit.priceHistory={rows:rows.length,first:history.first??null,
    last:history.last??null,eventDigestMatches:matched,
    // Record existence and integrity, not approved R10 breadth divergence.
    r10BreadthReady:false};
  }
  report.status='COMPLETED_READ_ONLY';
 }finally{db.close()}
}
try{await run();console.log(JSON.stringify(report,null,2));}
catch(error){report.status='AUTOMATION_BLOCKED';report.reason=/^[A-Z0-9_:.-]+$/.test(String(error?.message??''))?error.message:'R10_READ_ONLY_EVALUATION_FAILED';console.log(JSON.stringify(report,null,2));process.exitCode=2;}
