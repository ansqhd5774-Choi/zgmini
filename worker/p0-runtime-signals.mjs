import {POLICY} from './p0-fred-transport.mjs';
const hosts=new Set(['zgmini.kr','zgmini.ansqhd5774.chatgpt.site']);
export function inspectRuntime(request,context={}) {
  const u=new URL(request.url);
  const signals={
    importMetaProd:typeof context.importMetaProd==='boolean'?context.importMetaProd:null,
    nodeEnvProduction:typeof context.nodeEnv==='string'?context.nodeEnv==='production':null,
    nodeEnvTest:context.nodeEnv==='test',
    nodeEnvDevelopment:context.nodeEnv==='development',
    requestCfPresent:!!request.cf,
    requestCfColoPresent:typeof request.cf?.colo==='string'&&request.cf.colo!=='local',
    workerContextPresent:typeof context.workerContext?.waitUntil==='function'&&typeof context.workerContext?.passThroughOnException==='function',
    workerRuntimePresent:context.workerUserAgent==='Cloudflare-Workers',
    productionHostMatch:hosts.has(u.hostname)&&u.protocol==='https:',
    loopbackHost:['localhost','127.0.0.1','::1','[::1]'].includes(u.hostname),
  };
  signals.platformSignalPresent=signals.workerContextPresent&&(signals.workerRuntimePresent||signals.requestCfColoPresent);
  let runtimeClassification='UNKNOWN';
  if(signals.nodeEnvTest)runtimeClassification='TEST';
  else if(signals.loopbackHost||signals.nodeEnvDevelopment)runtimeClassification='LOCAL';
  else if(signals.productionHostMatch&&signals.platformSignalPresent&&(signals.importMetaProd===true||signals.nodeEnvProduction===true))runtimeClassification='PRODUCTION_CONFIRMED';
  return {runtimeClassification,runtimeSignals:signals};
}
// P0-4C deliberately has no reference to fetch, transport execution, or cached probe results.
export function runtimeSignalResponse(request,context={}) {
  let status=200,error;
  if(request.method!=='GET'){status=405;error='METHOD_NOT_ALLOWED';}
  else if(new URL(request.url).search){status=400;error='QUERY_NOT_ALLOWED';}
  else if(Date.now()>=Date.parse(POLICY.expiresAt)){status=410;error='EXPIRED';}
  return Response.json({diagnosticOnly:true,...inspectRuntime(request,context),upstreamFetchEnabled:false,status:error??'RUNTIME_CLASSIFICATION_ONLY'},{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});
}
