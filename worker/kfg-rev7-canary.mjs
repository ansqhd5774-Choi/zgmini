import {Rev7D1Store} from './korea-rev7-d1.mjs';
import {runRev7Backfill,REV7_BACKFILL_POLICY} from './korea-rev7-backfill.mjs';

export const REV7_CANARY_OPERATOR_EMAIL_NAME='KFG_V2_CANARY_OPERATOR_EMAIL';

const json=(body,status=200)=>Response.json(
  {temporary:'TEMPORARY_KFG_REV7_CANARY_ONLY',...body},
  {status,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}}
);
const norm=value=>typeof value==='string'?value.trim().toLowerCase():'';
const key=(env,names)=>{
  for(const name of names) if(typeof env?.[name]==='string'&&env[name].trim()) return env[name].trim();
  return null;
};

export function createKfgRev7CanaryHandler({
  authenticate,
  env,
  storeFactory=db=>new Rev7D1Store(db),
  runner=runRev7Backfill,
}={}) {
  return async function handler(request) {
    if(request.method!=='POST') return json({status:'FAILED',reason:'METHOD_NOT_ALLOWED'},405);
    if(typeof authenticate!=='function') return json({status:'FAILED',reason:'UNAUTHORIZED'},401);

    let user=null;
    try{user=await authenticate(request);}catch{}
    if(!user?.userId || !norm(user?.email)) return json({status:'FAILED',reason:'UNAUTHORIZED'},401);

    const operator=norm(env?.[REV7_CANARY_OPERATOR_EMAIL_NAME]);
    if(!operator || norm(user.email)!==operator) return json({status:'FAILED',reason:'FORBIDDEN'},403);

    let body={};
    try{body=await request.json();}catch{return json({status:'FAILED',reason:'INVALID_JSON'},400);}

    const targetAdditional=body?.targetAdditional??1;
    const maxCalendarCandidates=body?.maxCalendarCandidates??16;
    const runId=typeof body?.runId==='string'&&/^[A-Za-z0-9._:-]{1,128}$/.test(body.runId)
      ? body.runId : crypto.randomUUID();

    if(!Number.isSafeInteger(targetAdditional)||targetAdditional<1||
       targetAdditional>REV7_BACKFILL_POLICY.maxAdditionalDatesPerRun ||
       !Number.isSafeInteger(maxCalendarCandidates)||maxCalendarCandidates<1||maxCalendarCandidates>32)
      return json({status:'FAILED',reason:'INVALID_LIMITS'},400);

    const krxKey=key(env,['KRX_API_KEY','KRX_AUTH_KEY','KRX_OPEN_API_KEY','KRX_OPENAPI_KEY']);
    const bokKey=key(env,['BOK_API_KEY','ECOS_API_KEY','BOK_ECOS_API_KEY']);
    if(!env?.DB || !krxKey || !bokKey)
      return json({status:'FAILED',reason:'RUNTIME_CONFIGURATION_MISSING'},503);

    let result;
    try{
      const store=storeFactory(env.DB);
      result=await runner({
        store,krxKey,bokKey,fetchImpl:globalThis.fetch,
        targetAdditionalDates:targetAdditional,maxCalendarCandidates,runId
      });
    }catch{
      return json({status:'FAILED',reason:'CANARY_RUN_FAILED',runId},500);
    }

    return json({
      status:result.status,
      runId,
      methodologyVersion:result.methodologyVersion??null,
      providerRequests:result.providerRequests??0,
      krxRequests:result.krxRequests??0,
      bokRequests:result.bokRequests??0,
      rowsStored:result.rowsStored??0,
      successfulDatesAdded:result.additionalSuccessfulDates??0,
      successfulDatesTotal:result.progress?.successfulTradingDates??0,
      oldestProcessedDate:result.progress?.oldestProcessedDate??null,
      latestProcessedDate:result.progress?.latestProcessedDate??null,
      snapshotWritten:Boolean(result.snapshotWritten),
      failureCode:result.failureCode??null,
      leaseReleased:Boolean(result.leaseReleased),
      researchOnly:true,
      productionEligible:false,
    },result.status==='ERROR'?500:200);
  };
}
