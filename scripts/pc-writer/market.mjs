import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {marketOperationalStore,readStoredMarketInputs} from '../../worker/candidate-market-operational-store.mjs';
import {observeStoredMarketInputs} from '../../lib/score-history/market-input-observation-shadow-r1.mjs';
import {buildStoredDiagnostic} from '../../worker/stored-diagnostic-r61.mjs';
import {readBreadthB1R5StoredPublicDomainR1} from '../../lib/market-score/breadth-b1-r5-worker-domain.mjs';
import {mergeEarningsProductionCandidate} from '../../lib/market-score/earnings-e1-r5-production-domain.mjs';
import {runEarningsR5ProductionCycle} from './earnings-r5-production-cycle-r1.mjs';
import {readStoredEarningsRiskFourFactor} from '../../lib/market-score/earnings-recession-stored-r4-pc-r1.mjs';
import {candidate2dbImportBoundary} from '../candidate-2db-import-boundary.mjs';

function preserveEarningsDiagnosticCompatibility(candidate,current){
 if(candidate?.methodologyVersion!=="E1-R5"||current?.methodologyVersion!=="E1-R4")return candidate;
 const source=current?.components??{};
 return {...candidate,components:{...(candidate?.components??{}),epsGrowth:source.epsGrowth??null,margin:source.margin??null,revenueGrowth:source.revenueGrowth??null,earningsGrowthBreadth:source.earningsGrowthBreadth??null}};
}

// Used only by the optional evidence shadow; the existing Reader still owns
// validation/selection and sees the same decoded body as before.
function decodeStoredBatch(encoded){
 if(typeof encoded!=='string')throw Error('MARKET_SHADOW_BODY_INVALID');
 const plain=encoded.startsWith('gzip:')
  ?gunzipSync(Buffer.from(encoded.slice(5),'base64'),{maxOutputLength:32_000_000}).toString('utf8')
  :encoded;
 return JSON.parse(plain);
}

// Reuse exactly the deployed candidate credit import transform, not a new formula.
// Optional evidence is development-only until an approved Writer change enables it.
export async function calculateMarket(root,db,now,{onInputEvidence}={}){
 const file=path.join(root,'worker/market-score-r1.mjs'),creditFile=path.join(root,'lib/market-score/credit-r2.mjs');
 const resolve=(code,file)=>code.replace(/from\s*(['"])([^'"]+)\1/g,(_,q,p)=>'from '+JSON.stringify(p.startsWith('.')||path.isAbsolute(p)?pathToFileURL(path.resolve(path.dirname(file),p)).href:p));
 const credit=resolve(candidate2dbImportBoundary(root).transform(fs.readFileSync(creditFile,'utf8'),creditFile).code,creditFile);
 const creditUrl='data:text/javascript;base64,'+Buffer.from(credit).toString('base64');
 const code=resolve(fs.readFileSync(file,'utf8').replace('"../lib/market-score/credit-r2.mjs"',JSON.stringify(creditUrl)),file);
 const {createMarketScoreR1Handler}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const store=marketOperationalStore(db),base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
 let inputEvidence=null;
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
   return mergeEarningsProductionCandidate(riskInput,candidate);
  }catch{return riskInput;}
 };
 const handler=createMarketScoreR1Handler({env:{DB:db},fetchImpl:async()=>{throw Error('PROVIDER_NETWORK_FORBIDDEN')},collectInputs,orchestrate:buildStoredDiagnostic,collectBreadthDomain:readBreadthB1R5StoredPublicDomainR1,now:()=>new Date(now)});
 const response=await handler(new Request('https://zgmini.kr/api/market-score'));
 const body=await response.json();
 if(!response.ok||body.status!=='SUCCESS'||body.domains?.length!==12)throw Error('SCORE_CONTRACT_FAILED');
 if(typeof onInputEvidence==='function'){
  // Evidence failure must never affect an approved calculation result.
  // The seven stored batches do not cover separate SEC/E1-R5/Breadth inputs.
  try{await onInputEvidence({calculatedAt:new Date(now).toISOString(),
   asOfDate:body.asOfDate??null,score:body.overall?.score??null,
   evidence:inputEvidence??{status:'UNPROVEN_NO_READER_OBSERVATION'}});}catch{}
 }
 return body;
}
