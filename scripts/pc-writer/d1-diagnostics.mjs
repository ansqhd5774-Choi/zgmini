import fs from 'node:fs';import path from 'node:path';
const credentials=new Map();
export function rememberCredential(token,metadata){
 credentials.set(token,Object.freeze({...metadata}));
 while(credentials.size>2)credentials.delete(credentials.keys().next().value);
 return token;
}
export function credentialMetadata(token){return credentials.get(token)??{authType:'UNKNOWN',authExpiresAt:null,authRefresh:'UNKNOWN'};}
const iso=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))?x:null;
export function safeDiagnostic(x){
 const out={kind:['READ','WRITE'].includes(x?.kind)?x.kind:'UNKNOWN',phase:['FETCH','HTTP','BODY','AUTH','RESULT'].includes(x?.phase)?x.phase:'UNKNOWN',httpStatus:Number.isInteger(x?.httpStatus)&&x.httpStatus>=100&&x.httpStatus<=599?x.httpStatus:null,code:/^[A-Z0-9_]{1,64}$/.test(x?.code??'')?x.code:null};
 if(!x?.at)return out; // Retain the prior minimal event schema for old records.
 return {...out,at:iso(x.at),requestStartedAt:iso(x.requestStartedAt),elapsedMs:Number.isSafeInteger(x.elapsedMs)&&x.elapsedMs>=0?x.elapsedMs:null,requestSequence:Number.isSafeInteger(x.requestSequence)?x.requestSequence:null,databaseRole:['CORE','HISTORY'].includes(x.databaseRole)?x.databaseRole:'UNKNOWN',statementId:/^[a-f0-9]{64}$/.test(x.statementId??'')?x.statementId:null,cfRay:/^[a-f0-9]{16,32}(?:-[a-z]{3})?$/i.test(x.cfRay??'')?x.cfRay:null,providerCodes:Array.isArray(x.providerCodes)?[...new Set(x.providerCodes.filter(n=>Number.isSafeInteger(n)&&n>=0&&n<=2147483647))].slice(0,16):[],errorBody:['JSON','NON_JSON','INVALID_JSON','TOO_LARGE','UNREADABLE','NOT_READ'].includes(x.errorBody)?x.errorBody:'NOT_READ',authType:['OAUTH','API_TOKEN'].includes(x.authType)?x.authType:'UNKNOWN',authExpiresAt:iso(x.authExpiresAt),authExpiredAtFailure:typeof x.authExpiredAtFailure==='boolean'?x.authExpiredAtFailure:null,authRefresh:['NOT_NEEDED','SUCCEEDED','FAILED','READBACK_VERIFIED'].includes(x.authRefresh)?x.authRefresh:'UNKNOWN'};
}
export async function errorResponseDiagnostic(response){
 const cfRay=response.headers?.get('cf-ray'),type=response.headers?.get('content-type')??'';
 if(!type.toLowerCase().includes('json'))return {cfRay,errorBody:'NON_JSON',providerCodes:[]};
 let reader;try{
  reader=response.body?.getReader();let size=0;const chunks=[];
  if(reader)for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();return {cfRay,errorBody:'TOO_LARGE',providerCodes:[]};}chunks.push(value);}
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  return {cfRay,errorBody:'JSON',providerCodes:codesFromResult(body)};
 }catch{return {cfRay,errorBody:'INVALID_JSON',providerCodes:[]};}finally{reader?.releaseLock();}
}
export function codesFromResult(body){return [body,...(Array.isArray(body?.result)?body.result:[])].flatMap(x=>Array.isArray(x?.errors)?x.errors.map(e=>e?.code):[]).filter(n=>Number.isSafeInteger(n)&&n>=0&&n<=2147483647).slice(0,16);}
export function appendD1Diagnostic(base,{runAt,source},diagnostic){
 const record={runAt:iso(runAt),source:/^[a-f0-9]{40}$/.test(source??'')?source:null,...safeDiagnostic(diagnostic)};
 fs.appendFileSync(path.join(base,'d1-request-failures.jsonl'),JSON.stringify(record)+'\n');
}
