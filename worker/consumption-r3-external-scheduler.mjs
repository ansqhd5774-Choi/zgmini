import {runConsumptionR3OperationalRefresh} from "./consumption-r3-operational-refresh.mjs";

const SECRET_NAME="C1_R3_EXTERNAL_SCHEDULER_SECRET";
const OPERATIONAL_REVISION="C1-OP-R3";
const EXTERNAL_BATCH_SIZE=1;
const PROVIDER_TIMEOUT_MS=20000;

const json=(body,status=200)=>Response.json(
  {operationalRevision:OPERATIONAL_REVISION,...body},
  {status,headers:{"cache-control":"no-store","x-robots-tag":"noindex"}}
);

const authorized=(request,configured)=>{
  const provided=request.headers.get("authorization")??"";
  return typeof configured==="string" &&
    configured.length>=32 &&
    provided===`Bearer ${configured}`;
};

function withTimeout(fetchImpl,timeoutMs=PROVIDER_TIMEOUT_MS){
  return async (input,init={})=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort("C1_R3_PROVIDER_TIMEOUT"),timeoutMs);
    const upstream=init?.signal;
    let relay=null;
    if(upstream){
      if(upstream.aborted)controller.abort(upstream.reason);
      else{
        relay=()=>controller.abort(upstream.reason);
        upstream.addEventListener("abort",relay,{once:true});
      }
    }
    try{
      return await fetchImpl(input,{...init,signal:controller.signal});
    }finally{
      clearTimeout(timer);
      if(upstream&&relay)upstream.removeEventListener("abort",relay);
    }
  };
}

/** @param {{env?:import('./runtime-contracts').DataEnv,refresh?:typeof runConsumptionR3OperationalRefresh,fetchImpl?:typeof fetch,now?:()=>Date,providerTimeoutMs?:number}} [options] */
export function createConsumptionR3ExternalSchedulerHandler({
  env,
  refresh=runConsumptionR3OperationalRefresh,
  fetchImpl=globalThis.fetch,
  now=()=>new Date(),
  providerTimeoutMs=PROVIDER_TIMEOUT_MS,
}={}){
  return async function handle(request){
    if(request.method!=="POST")return json({status:"FAILED",reason:"METHOD_NOT_ALLOWED"},405);

    const configured=env?.[SECRET_NAME];
    if(typeof configured!=="string"||configured.length<32){
      return json({status:"FAILED",reason:"SCHEDULER_SECRET_NOT_CONFIGURED"},503);
    }
    if(!authorized(request,configured)){
      return json({status:"FAILED",reason:"UNAUTHORIZED"},401);
    }

    const started=now();
    const asOf=started.toISOString().slice(0,10);
    try{
      const result=await refresh({
        env,
        asOf,
        fetchImpl:withTimeout(fetchImpl,providerTimeoutMs),
        now,
        maxSourcesPerRun:EXTERNAL_BATCH_SIZE,
      });
      return json({
        status:result?.status??"FAILED",
        quarter:result?.quarter??null,
        scoreDate:result?.scoreDate??null,
        providerRequests:result?.providerRequests??0,
        storedSources:result?.storedSources??0,
        remainingSources:result?.remainingSources??null,
        calculated:result?.calculated===true,
        flat7:result?.flat7??null,
        durationMs:Math.max(0,now().getTime()-started.getTime()),
      },200);
    }catch{
      return json({status:"FAILED",reason:"REFRESH_FAILED"},500);
    }
  };
}

export const C1_R3_EXTERNAL_SCHEDULER_CONTRACT=Object.freeze({
  methodologyRevision:"R3.45P",
  operationalRevision:OPERATIONAL_REVISION,
  route:"/api/internal/c1-r3-refresh",
  method:"POST",
  auth:"BEARER_ENV_SECRET",
  secretBinding:SECRET_NAME,
  maxSourcesPerInvocation:EXTERNAL_BATCH_SIZE,
  providerTimeoutMs:PROVIDER_TIMEOUT_MS,
  waitUntil:false,
  sourcePersistence:"D1_BEFORE_CALCULATION",
  calculation:"STORED_SOURCE_ONLY",
});
