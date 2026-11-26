import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {marketOperationalStore,readStoredMarketInputs} from '../../worker/candidate-market-operational-store.mjs';
import {observeStoredMarketInputs} from '../../lib/score-history/market-input-observation-shadow-r1.mjs';
import {buildStoredDiagnostic} from '../../worker/stored-diagnostic-r61.mjs';
import {paidCompositeBreadthDomain as approvedPaidCompositeBreadthDomain} from './paid-composite-breadth.mjs';
import {mergeEarningsProductionCandidate} from '../../lib/market-score/earnings-e1-r5-production-domain.mjs';
import {runEarningsR5ProductionCycle} from './earnings-r5-production-cycle-r1.mjs';
import {readStoredEarningsRiskFourFactor} from '../../lib/market-score/earnings-recession-stored-r4-pc-r1.mjs';
import {candidate2dbImportBoundary} from '../candidate-2db-import-boundary.mjs';
import {observeD05EarningsR5Selection,observeD05PaidBreadthSelection,correlateD05IndependentInputs} from '../../lib/score-history/d05-independent-input-selector-witness-r1.mjs';

function preserveEarningsDiagnosticCompatibility(candidate,current){
 if(candidate?.methodologyVersion!=="E1-R5"||current?.methodologyVersion!=="E1-R4")return candidate;
 const source=current?.components??{};
 return {...candidate,components:{...(candidate?.components??{}),epsGrowth:source.epsGrowth??null,margin:source.margin??null,revenueGrowth:source.revenueGrowth??null,earningsGrowthBreadth:source.earningsGrowthBreadth??null}};
}

// No input body, token or provider source is exposed in the optional event.
function decodeStoredBatch(encoded){
 if(typeof encoded!=='string')throw Error('MARKET_SHADOW_BODY_INVALID');
 const plain=encoded.startsWith('gzip:')
  ?gunzipSync(Buffer.from(encoded.slice(5),'base64'),{maxOutputLength:32_000_000}).toString('utf8')
  :encoded;
 return JSON.parse(plain);
}

// Reuse exactly the deployed candidate credit import transform, not a new formula.
export async function calculateMarket(root,db,now,{onInputEvidence}={}){
 const file=path.join(root,'worker/market-score-r1.mjs'),creditFile=path.join(root,'lib/market-score/credit-r2.mjs');
 const resolve=(code,file)=>code.replace(/from\s*(['"])([^'"]+)\1/g,(_,q,p)=>'from '+JSON.stringify(p.startsWith('.')||path.isAbsolute(p)?pathToFileURL(path.resolve(path.dirname(file),p)).href:p));
 const credit=resolve(candidate2dbImportBoundary(root).transform(fs.readFileSync(creditFile,'utf8'),creditFile).code,creditFile);
 const creditUrl='data:text/javascript;base64,'+Buffer.from(credit).toString('base64');
 const code=resolve(fs.readFileSync(file,'utf8').replace('"../lib/market-score/credit-r2.mjs"',JSON.stringify(creditUrl)),file);
 const {createMarketScoreR1Handler}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const store=marketOperationalStore(db),base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
 let inputEvidence=null,earningsCandidate=null,earningsWitness=null,breadthSelected=null,breadthWitness=null;
 let earningsSelectionCount=0,breadthSelectionCount=0;
 const collectInputs=async()=>{
  const observed=typeof onInputEvidence==='function'
   ?await observeStoredMarketInputs({reader:readStoredMarketInputs,store,db,decode:decodeStoredBatch,now})
   :null;
  const collected=observed?observed.inputs:await readStoredMarketInputs(store,now);
  if(observed)inputEvidence=observed.provenance;
  const current=collected?.external?.publicDomainScores?.earnings??null;
  // The four-factor earnings-risk evidence comes solely from PC-stored SEC
  // issuer metrics. It is not the independent E1-R5 domain score/history.
  let risk=null;
  try{
   risk=await readStoredEarningsRiskFourFactor({
    db,asOf:new Date(now).toISOString().slice(0,10),
   });
  }catch{}
  const riskInput=risk?.status==='READY'
   ?{...collected,external:{...(collected?.external??{}),earningsRiskEvidence:risk}}
   :collected;
  try{
   const result=await runEarningsR5ProductionCycle({base,now:new Date(now).toISOString()});
   const candidate=preserveEarningsDiagnosticCompatibility(result?.candidate,current);
   const merged=mergeEarningsProductionCandidate(riskInput,candidate);
   if(typeof onInputEvidence==='function'){
    earningsSelectionCount++;
    if(earningsSelectionCount===1){
     earningsCandidate=candidate;
     // A shadow witness error must not alter the approved E1-R5 selection.
     try{if(typeof observeD05EarningsR5Selection==='function')
      earningsWitness=observeD05EarningsR5Selection({
       candidate,report:result?.report,mergedInputs:merged});
     }catch{earningsWitness=null;}
    }else{earningsCandidate=null;earningsWitness=null;}
   }
   return merged;
  }catch{return riskInput;}
 };
 // Keep the exact approved calculator hook unchanged. Only its private local
 // delegate observes the *same* verified derived result; no second read.
 const paidCompositeBreadthDomain=(b,at)=>{
  const selected=approvedPaidCompositeBreadthDomain(b,at);
  if(typeof onInputEvidence==='function'){
   breadthSelectionCount++;
   if(breadthSelectionCount===1){
    breadthSelected=selected;
    try{if(typeof observeD05PaidBreadthSelection==='function')
     breadthWitness=observeD05PaidBreadthSelection(selected);
    }catch{breadthWitness=null;}
   }else{breadthSelected=null;breadthWitness=null;}
  }
  return selected;
 };
 const handler=createMarketScoreR1Handler({env:{DB:db},fetchImpl:async()=>{throw Error('PROVIDER_NETWORK_FORBIDDEN')},collectInputs,orchestrate:buildStoredDiagnostic,collectBreadthDomain:()=>paidCompositeBreadthDomain(base,now),now:()=>new Date(now)});
 const response=await handler(new Request('https://zgmini.kr/api/market-score'));
 const body=await response.json();
 if(!response.ok||body.status!=='SUCCESS'||body.domains?.length!==12)throw Error('SCORE_CONTRACT_FAILED');
 if(typeof onInputEvidence==='function'){
  // The approved Reader's return value remains authoritative, even if
  // provenance is incomplete or this private witness callback fails.
  // Seven market batches cannot prove separate SEC/E1-R5/Breadth inputs.
  let independentEvidence={status:'UNPROVEN_OPTIONAL_SELECTION_WITNESS'};
  // Never let optional evidence calculation suppress the established 7-batch
  // callback. The original score and Reader return object are authoritative.
  try{if(typeof correlateD05IndependentInputs==='function')
   independentEvidence=correlateD05IndependentInputs({
    earningsWitness,breadthWitness,earningsCandidate,breadthSelected,marketBody:body});
  }catch{}
  try{await onInputEvidence({calculatedAt:new Date(now).toISOString(),
   asOfDate:body.asOfDate??null,score:body.overall?.score??null,
   evidence:inputEvidence??{status:'UNPROVEN_NO_READER_OBSERVATION'},
   independentEvidence});}catch{}
 }
 return body;
}
