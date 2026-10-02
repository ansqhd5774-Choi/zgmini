import {readOnlyDatabase,candidateRequest} from './candidate-guard.mjs';
export function readOnlyDualEnv(native){
 const core=native.DB_CORE?readOnlyDatabase(native.DB_CORE):undefined;
 const history=native.DB_HISTORY?readOnlyDatabase(native.DB_HISTORY):undefined;
 return Object.freeze({DB_CORE:core,DB_HISTORY:history,DB:core,ASSETS:native.ASSETS});
}
export function candidate2dbWorker(handler){return Object.freeze({async fetch(request,native,ctx){
 const safe=candidateRequest(request);if(!safe)return new Response('CANDIDATE_WRITE_DISABLED',{status:403});
 return handler.fetch(safe,readOnlyDualEnv(native),ctx);
}});}
