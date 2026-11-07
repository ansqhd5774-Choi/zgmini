// Candidate-only dispatcher for an explicitly approved, single scoped invocation.
// No Core hook/scheduler or provider approval is created here. Disabled by default.
// The future approved caller owns unique request/manifest, event and cadence checks.
export const INFLATION_CANDIDATE_GROUPS=Object.freeze({
  cpi:{ids:[22,23],credential:'BLS',maxRequests:1},
  ppi:{ids:[24],credential:'BLS',maxRequests:1},
  treasury:{ids:[16],credential:null,maxRequests:1},
  census:{ids:[28],credential:'CENSUS',maxRequests:2},
  fed:{ids:[29],credential:null,maxRequests:1},
  eia:{ids:[2],credential:'EIA',maxRequests:1},
});
const fail=code=>Object.assign(new Error(code),{code});
// Preserve only our fixed, non-secret diagnostic codes. Never emit provider
// bodies, request URLs, key values, or arbitrary exception messages.
const safeErrorCode=e=>/^(?:INFL_CANDIDATE|BLS_CANDIDATE|TREASURY_CUSTOMS|CENSUS_M3|FED_G17|EIA_REGULAR)_[A-Z0-9_]+$/.test(e?.code??'')?
  e.code:'INFL_CANDIDATE_SOURCE_FAILED';
const credentials=(env,type)=>type==='BLS'?(env?.BLS_API_KEY??env?.BLS_REGISTRATION_KEY):
  type==='CENSUS'?env?.CENSUS_API_KEY:type==='EIA'?env?.EIA_API_KEY:null;

export async function runInflationCandidateOnce({approved=false,base,groups=[],providerEnv={},
  quotaFetch,collectors,now=new Date()}={}){
  if(approved!==true)return {status:'DISABLED',providerRequests:0,completed:[],failed:[],skipped:[]};
  if(!Array.isArray(groups)||!groups.length||groups.length>6||new Set(groups).size!==groups.length||
    groups.some(key=>typeof key!=='string'||!Object.hasOwn(INFLATION_CANDIDATE_GROUPS,key)))
    throw fail('INFL_CANDIDATE_SCOPE_INVALID');
  if(typeof quotaFetch!=='function')throw fail('INFL_CANDIDATE_APPROVED_QUOTA_REQUIRED');
  const moment=now instanceof Date?now:new Date(now);
  if(!Number.isFinite(moment.getTime()))throw fail('INFL_CANDIDATE_NOW_INVALID');
  const provided=collectors??{
    cpi:(await import('./inflation-causal-candidate-bls3.mjs')).collectInflationCandidateBls,
    ppi:(await import('./inflation-causal-candidate-bls3.mjs')).collectInflationCandidateBls,
    treasury:(await import('./inflation-causal-candidate-treasury.mjs')).collectTreasuryCustoms,
    census:(await import('./inflation-causal-candidate-census-m3.mjs')).collectCensusM3Inventories,
    fed:(await import('./inflation-causal-candidate-fed-g17.mjs')).collectFedG17Manufacturing,
    eia:(await import('./inflation-causal-candidate-eia-gasoline.mjs')).collectEiaRegularWeekly,
  };
  const report={status:'COMPLETE',providerRequests:0,completed:[],failed:[],skipped:[]};
  for(const group of groups){
    const spec=INFLATION_CANDIDATE_GROUPS[group],key=credentials(providerEnv,spec.credential);
    if(spec.credential&&(typeof key!=='string'||!key.trim())){
      report.skipped.push({group,reason:'CREDENTIAL_UNAVAILABLE'});continue;
    }
    let calls=0;
    const meteredFetch=async(...args)=>{
      if(calls>=spec.maxRequests)throw fail('INFL_CANDIDATE_REQUEST_BOUND');
      calls++;return quotaFetch(...args);
    };
    try{
      if(typeof provided[group]!=='function')throw fail('INFL_CANDIDATE_COLLECTOR_UNAVAILABLE');
      const args={base,quotaFetch:meteredFetch,now:moment};
      if(group==='cpi'||group==='ppi'){args.group=group;args.blsKey=key;}
      if(group==='census')args.censusKey=key;
      if(group==='eia')args.eiaKey=key;
      const result=await provided[group](args);
      if(!['SAVED_READBACK','UNCHANGED'].includes(result?.status)||
        result.providerRequests!==calls||calls<1||calls>spec.maxRequests)
        throw fail('INFL_CANDIDATE_COLLECTOR_RESULT_INVALID');
      report.completed.push({group,ids:spec.ids,status:result.status,providerRequests:calls});
    }catch(e){report.failed.push({group,code:safeErrorCode(e)});
    }finally{report.providerRequests+=calls;}
  }
  if(report.failed.length)report.status='PARTIAL_PREVIOUS_INPUTS_PRESERVED';
  else if(report.skipped.length)report.status='PARTIAL_CREDENTIALS_UNAVAILABLE';
  else if(report.completed.every(x=>x.status==='UNCHANGED'))report.status='UNCHANGED';
  return report;
}
