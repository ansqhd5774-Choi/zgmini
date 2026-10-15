import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {marketOperationalStore,readStoredMarketInputs} from '../../worker/candidate-market-operational-store.mjs';
import {buildStoredDiagnostic} from '../../worker/stored-diagnostic-r61.mjs';
import {readBreadthB1R5StoredPublicDomainR1} from '../../lib/market-score/breadth-b1-r5-worker-domain.mjs';
import {mergeEarningsProductionCandidate} from '../../lib/market-score/earnings-e1-r5-production-domain.mjs';
import {runEarningsR5ProductionCycle} from './earnings-r5-production-cycle-r1.mjs';
import {candidate2dbImportBoundary} from '../candidate-2db-import-boundary.mjs';

function preserveEarningsDiagnosticCompatibility(candidate,current){
 if(candidate?.methodologyVersion!=="E1-R5"||current?.methodologyVersion!=="E1-R4")return candidate;
 const source=current?.components??{};
 return {...candidate,components:{...(candidate?.components??{}),epsGrowth:source.epsGrowth??null,margin:source.margin??null,revenueGrowth:source.revenueGrowth??null,earningsGrowthBreadth:source.earningsGrowthBreadth??null}};
}

// Reuse exactly the deployed candidate credit import transform, not a new formula.
export async function calculateMarket(root,db,now){
 const file=path.join(root,'worker/market-score-r1.mjs'),creditFile=path.join(root,'lib/market-score/credit-r2.mjs');
 const resolve=(code,file)=>code.replace(/from\s*(['"])([^'"]+)\1/g,(_,q,p)=>'from '+JSON.stringify(p.startsWith('.')||path.isAbsolute(p)?pathToFileURL(path.resolve(path.dirname(file),p)).href:p));
 const credit=resolve(candidate2dbImportBoundary(root).transform(fs.readFileSync(creditFile,'utf8'),creditFile).code,creditFile);
 const creditUrl='data:text/javascript;base64,'+Buffer.from(credit).toString('base64');
 const code=resolve(fs.readFileSync(file,'utf8').replace('"../lib/market-score/credit-r2.mjs"',JSON.stringify(creditUrl)),file);
 const {createMarketScoreR1Handler}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const store=marketOperationalStore(db),base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
 const collectInputs=async()=>{
  const collected=await readStoredMarketInputs(store,now),current=collected?.external?.publicDomainScores?.earnings??null;
  try{
   const result=await runEarningsR5ProductionCycle({base,now:new Date(now).toISOString()});
   const candidate=preserveEarningsDiagnosticCompatibility(result?.candidate,current);
   return mergeEarningsProductionCandidate(collected,candidate);
  }catch{return collected;}
 };
 const handler=createMarketScoreR1Handler({env:{DB:db},fetchImpl:async()=>{throw Error('PROVIDER_NETWORK_FORBIDDEN')},collectInputs,orchestrate:buildStoredDiagnostic,collectBreadthDomain:readBreadthB1R5StoredPublicDomainR1,now:()=>new Date(now)});
 const response=await handler(new Request('https://zgmini.kr/api/market-score'));
 const body=await response.json();
 if(!response.ok||body.status!=='SUCCESS'||body.domains?.length!==12)throw Error('SCORE_CONTRACT_FAILED');
 return body;
}
