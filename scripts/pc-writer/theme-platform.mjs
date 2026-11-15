// Common theme contracts and resumable execution. Resource budgets bound a run,
// never the number of registered themes. Existing approved formula is reused.
import {createHash} from 'node:crypto';
import {mixNineR32Date} from './theme-nine-r32-private-aggregate.mjs';
import {decideThemeAction} from './theme-platform-policy.mjs';

export const R32='ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_DATED_ISSUER_AUM_R32';
export const STAGES=['source','calculate','validate','publish','readback','public'];
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const sha=s=>createHash('sha256').update(s).digest('hex');
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
export const identity=x=>sha(JSON.stringify(canonical(x)));
const id=x=>typeof x==='string'&&/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(x);
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function validateThemeRegistry(registry,{formulas}={}){
 need(registry?.schema==='ZGMINI_THEME_PLATFORM_V1'&&Array.isArray(registry.themes),'THEME_REGISTRY_SCHEMA');
 need(formulas&&typeof formulas==='object','THEME_FORMULA_REGISTRY_REQUIRED');
 const ids=new Set(),labels=new Set(),keys=new Set();
 for(const t of registry.themes){
  need(id(t.id)&&!ids.has(t.id),'THEME_ID_DUPLICATE_OR_INVALID');ids.add(t.id);
  need(typeof t.label==='string'&&t.label.trim()===t.label&&t.label&&!labels.has(t.label),'THEME_LABEL_DUPLICATE_OR_INVALID');labels.add(t.label);
  need(typeof t.enabled==='boolean'&&typeof t.public==='boolean','THEME_FLAGS_REQUIRED');
  need(Object.hasOwn(formulas,t.methodologyVersion),'THEME_FORMULA_UNSUPPORTED');
  need(Array.isArray(t.etfs)&&t.etfs.length>0&&new Set(t.etfs).size===t.etfs.length&&
   t.etfs.every(s=>typeof s==='string'&&/^[A-Z][A-Z0-9.-]*$/.test(s)&&s!==t.benchmark),'THEME_ETF_ROSTER_INVALID');
  need(typeof t.benchmark==='string'&&/^[A-Z][A-Z0-9.-]*$/.test(t.benchmark),'THEME_BENCHMARK_INVALID');
  need(hash(t.approvalSha256),'THEME_APPROVAL_REQUIRED');
  for(const mode of ['confirmed','provisional']){
   const input=t.inputs?.[mode];need(input&&id(input.adapter)&&typeof input.priceMode==='string'&&input.priceMode,'THEME_INPUT_CONTRACT_REQUIRED');
   const key=t.publication?.[mode];need(typeof key==='string'&&key&&!keys.has(key),'THEME_PUBLICATION_KEY_COLLISION');keys.add(key);
  }
 }
 return structuredClone(registry);
}
export function compareThemeCoverage(registry,publicThemes){
 const expected=new Map(registry.themes.filter(t=>t.public).map(t=>[t.id,t]));
 const actual=new Map();const differences=[];
 for(const t of publicThemes){
  if(actual.has(t.id))differences.push({id:t.id,reason:'DUPLICATE_PUBLIC_THEME'});
  actual.set(t.id,t);
  const spec=expected.get(t.id);
  if(!spec)differences.push({id:t.id,reason:'UNREGISTERED_PUBLIC_THEME'});
  else if(t.methodologyVersion!==spec.methodologyVersion)differences.push({id:t.id,reason:'METHODOLOGY_MISMATCH',expected:spec.methodologyVersion,actual:t.methodologyVersion});
 }
 for(const key of expected.keys())if(!actual.has(key))differences.push({id:key,reason:'REGISTERED_PUBLIC_THEME_MISSING'});
 return {status:differences.length?'MISMATCH':'MATCH',differences};
}
export function sourcePlan(registry){
 const jobs=new Map();
 for(const t of registry.themes.filter(t=>t.enabled))for(const mode of ['confirmed','provisional']){
  const input=t.inputs[mode];
  for(const symbol of [...t.etfs,t.benchmark]){
   const key=identity({input,symbol});
   const job=jobs.get(key)??{input:structuredClone(input),symbol,consumers:[]};
   job.consumers.push({themeId:t.id,mode});jobs.set(key,job);
  }
 }
 return [...jobs.values()];
}
export function scoreR32Theme({definition,dates,individual,aum,allowDatedOfficialAum=false}){
 need(Array.isArray(dates)&&dates.length&&dates.every((d,i)=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&(!i||d>dates[i-1])),'THEME_DATES_INVALID');
 const history=dates.map(date=>{
  const excluded=[];
  const rows=definition.etfs.flatMap(ticker=>{
   const point=individual[ticker]?.find(p=>p.date===date);
   if(!point||point.score===null){excluded.push({ticker,reason:point?.status??'SOURCE_OR_SCORE_MISSING'});return [];}
   const money=aum[ticker];need(money,'THEME_AUM_MISSING');
   return [{ticker,score:point.score,sessions:point.realSessionCount,status:point.status,aumUsd:money.aumUsd,aumAsOf:money.aumAsOf}];
  });
  return {...mixNineR32Date({date,rows,benchmarkDate:dates.at(-1),allowDatedOfficialAum}),excluded};
 });
 return {themeId:definition.id,methodologyVersion:R32,roster:[...definition.etfs],history};
}
export const FORMULAS=Object.freeze({[R32]:scoreR32Theme});

// Persistence supplies load/save with compare-and-swap. A completed stage must
// return a durable artifact hash; no success is inferred from HTTP or exit code.
// Adapters are versioned code bindings, never executable paths from user JSON.
export async function runThemeBatch({registry,adapters,store,runKey,mode='private',
 maxStages=Infinity,after=null,formulas=FORMULAS,grant=null}={}){
 validateThemeRegistry(registry,{formulas});
 need(['private','public'].includes(mode)&&typeof runKey==='string'&&runKey,'THEME_RUN_CONTRACT');
 need(maxStages===Infinity||Number.isSafeInteger(maxStages)&&maxStages>0,'THEME_RUN_BUDGET');
 const tasks=registry.themes.filter(t=>t.enabled).flatMap(t=>['confirmed','provisional'].map(kind=>({theme:t,kind})));
 const fingerprint=identity({registry,runKey,mode});
 const state=await store.load(fingerprint)??{fingerprint,revision:0,tasks:{}};
 need(state.fingerprint===fingerprint,'THEME_CHECKPOINT_IDENTITY');
 let executed=0;const results=[];
 const stages=mode==='private'?STAGES.slice(0,3):STAGES;
 const start=after?tasks.findIndex(t=>t.theme.id+':'+t.kind===after):0;
 need(start>=0,'THEME_CURSOR_INVALID');
 for(let n=0;n<tasks.length;n++){
  const {theme,kind}=tasks[(start+n)%tasks.length],key=theme.id+':'+kind;
  const checkpoint=state.tasks[key]??={completed:{}};
  let result={id:theme.id,kind,status:'COMPLETE'};
  for(const stage of stages){
   if(checkpoint.completed[stage])continue;
   if(executed>=maxStages)return {status:'RUNNING',cursor:key,fingerprint,executed,results};
   const handler=adapters[stage];need(typeof handler==='function','THEME_ADAPTER_MISSING_'+stage);
   const effectKey=identity({fingerprint,key,stage});
   try{
    if(stage==='publish'){
     need(grant,'THEME_PUBLIC_DELEGATION_REQUIRED');
     const decision=decideThemeAction({action:'publish',grant,
      context:checkpoint.completed.validate.publicationContext??{}});
     need(decision.decision==='PROCEED',decision.reason);
    }
    executed++;
    const proof=await handler({theme,kind,stage,effectKey,completed:structuredClone(checkpoint.completed),mode});
    need(proof?.status==='VERIFIED'&&hash(proof.artifactSha256),'THEME_STAGE_NOT_VERIFIED');
    if(stage==='calculate')need(proof.methodologyVersion===theme.methodologyVersion,'THEME_CALCULATOR_VERSION_MISMATCH');
    if(['validate','publish','readback','public'].includes(stage)){
     need(proof.methodologyVersion===theme.methodologyVersion&&proof.definitionSha256===identity(theme),'THEME_PROJECTION_CONTRACT_MISMATCH');
     need(proof.calculationSha256===checkpoint.completed.calculate.artifactSha256,'THEME_PROJECTION_CALCULATION_MISMATCH');
    }
    checkpoint.completed[stage]=proof;
    delete checkpoint.error;
    const prior=state.revision;state.revision++;
    // A failed save after external write is uncertain. Stop the entire run;
    // retry must use effectKey + publisher CAS/readback, never blind re-write.
    try{await store.save(fingerprint,structuredClone(state),prior);}
    catch(error){throw Object.assign(error,{checkpointWriteFailed:true});}
   }catch(error){
    if(error.checkpointWriteFailed)throw error;
    checkpoint.error={stage,code:error.code??'THEME_STAGE_FAILED'};
    const prior=state.revision;state.revision++;await store.save(fingerprint,structuredClone(state),prior);
    result={...result,status:'BLOCKED',...checkpoint.error};break;
   }
  }
  results.push(result);
 }
 return {status:results.some(r=>r.status==='BLOCKED')?'PARTIAL':'COMPLETE',fingerprint,executed,results};
}
