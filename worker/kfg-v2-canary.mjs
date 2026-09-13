import { D1KoreaMarketHistoryStore } from './korea-market-d1.mjs';
import { runKoreaMarketBackfill } from './korea-market-backfill.mjs';

export const TEMPORARY_KFG_V2_CANARY_ONLY = "TEMPORARY_KFG_V2_CANARY_ONLY";
export const CANARY_OPERATOR_EMAIL_NAME = 'KFG_V2_CANARY_OPERATOR_EMAIL';
export const CANARY_LIMITS = Object.freeze({targetAdditional:5,requestCap:10,concurrency:1,retry:0});
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex'} });
const safeRunId=value=>typeof value==='string'&&/^[A-Za-z0-9._:-]{1,128}$/.test(value)?value:null;
const normalizedEmail=value=>typeof value==='string'?value.trim().toLowerCase():null;

export function createKfgV2CanaryHandler({authenticate,env,storeFactory=(db)=>new D1KoreaMarketHistoryStore(db),runner=runKoreaMarketBackfill}={}) {
  if(typeof authenticate!=='function'||!env?.DB) throw Error('INVALID_CANARY_CONFIGURATION');
  return async function handle(request) {
    if(request.method!=='POST') return json({temporary:TEMPORARY_KFG_V2_CANARY_ONLY,error:'METHOD_NOT_ALLOWED'},405);
    const user=await authenticate(request);
    if(!user?.userId||!normalizedEmail(user.email)) return json({temporary:TEMPORARY_KFG_V2_CANARY_ONLY,error:'AUTH_REQUIRED'},401);
    const operatorEmail=normalizedEmail(env[CANARY_OPERATOR_EMAIL_NAME]);
    if(!operatorEmail||normalizedEmail(user.email)!==operatorEmail) return json({temporary:TEMPORARY_KFG_V2_CANARY_ONLY,error:'OPERATOR_REQUIRED'},403);
    let payload;
    try { payload=await request.json(); } catch { return json({temporary:TEMPORARY_KFG_V2_CANARY_ONLY,error:'INVALID_PAYLOAD'},400); }
    const targetAdditional=payload?.targetAdditional;
    const requestCap=payload?.requestCap;
    const runId=safeRunId(payload?.runId)??crypto.randomUUID();
    if(!Number.isSafeInteger(targetAdditional)||targetAdditional<1||targetAdditional>CANARY_LIMITS.targetAdditional||
       !Number.isSafeInteger(requestCap)||requestCap<1||requestCap>CANARY_LIMITS.requestCap||
       payload?.concurrency!==undefined&&payload.concurrency!==CANARY_LIMITS.concurrency||
       payload?.retry!==undefined&&payload.retry!==CANARY_LIMITS.retry) {
      return json({temporary:TEMPORARY_KFG_V2_CANARY_ONLY,error:'INVALID_CANARY_LIMITS'},400);
    }
    const store=storeFactory(env.DB);
    let result;
    try { result=await runner({store,key:env.FSC_API_KEY,fetchImpl:globalThis.fetch,targetAdditionalDates:targetAdditional,requestCap,runId}); }
    catch { return json({temporary:TEMPORARY_KFG_V2_CANARY_ONLY,runId,status:'ERROR',failureCode:'RUNNER_FAILURE',leaseReleased:false},500); }
    const checkpoint=result.checkpoint??{};
    return json({temporary:TEMPORARY_KFG_V2_CANARY_ONLY,runId,status:result.status,
      providerRequests:result.requestCount??0,successfulDatesAdded:result.additionalSuccessfulDates??0,
      successfulDatesTotal:checkpoint.successfulTradingDates??0,oldestProcessedDate:checkpoint.oldestProcessedDate??null,
      rowsStored:result.rowsStored??0,breadthSnapshotsAdded:result.additionalSuccessfulDates??0,
      rowsWritten:typeof store.getWriteUsage==='function'?store.getWriteUsage().rowsWritten:null,
      failureCode:result.safeErrorCode??null,leaseReleased:true});
  };
}
