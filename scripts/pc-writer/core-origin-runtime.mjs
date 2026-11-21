import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const expectedCode=new Set(['TASK_ENGINE_CHAIN_MATCH','CORE_TASK_NOT_RUNNING',
 'CORE_TASK_ENGINE_NOT_VISIBLE','CORE_NODE_IDENTITY_UNVERIFIED',
 'TASK_ENGINE_CHAIN_UNVERIFIED','PROCESS_LIMIT','INPUT_INVALID',
 'CORE_ORIGIN_PROBE_UNAVAILABLE']);
const fail=code=>({status:'UNVERIFIED',code,ownerCreatedAtMs:null});
// This attests only the in-cycle TaskEngine ancestry at the instant of launch.
// A later independent Controller read must still bind the stored records to the
// approved checkout and source-file bytes; self-reported hashes alone are not PASS.
export function captureCoreOriginAtStart({
 platform=process.platform,pid=process.pid,
 startedAt=Date.now(),entrypoint=fileURLToPath(new URL('./local-cycle.mjs',import.meta.url)),
 systemRoot=process.env.SystemRoot??String.raw`C:\Windows`,
 exists=fs.existsSync,spawn=spawnSync,
}={}){
 if(platform!=='win32')return fail('CORE_ORIGIN_WINDOWS_REQUIRED');
 if(!Number.isSafeInteger(pid)||pid<1||!Number.isSafeInteger(startedAt)||
    !Number.isFinite(Date.now()-startedAt)||startedAt>Date.now()+60000)
  return fail('CORE_ORIGIN_INPUT_INVALID');
 const cscript=path.win32.join(systemRoot,'System32','cscript.exe');
 const probe=fileURLToPath(new URL('./core-origin-wmi.js',import.meta.url));
 if(!exists(cscript)||!exists(probe))return fail('CORE_ORIGIN_PROBE_UNAVAILABLE');
 try{
  const response=spawn(cscript,['//NoLogo','//E:JScript',probe,String(pid),entrypoint],{
   encoding:'utf8',windowsHide:true,shell:false,timeout:8000,maxBuffer:4096});
  if(response?.error||response?.status!==0||typeof response?.stdout!=='string'||
     response.stdout.length<4||response.stdout.length>2048)
   return fail('CORE_ORIGIN_PROBE_UNAVAILABLE');
  const result=JSON.parse(response.stdout.trim());
  if(result?.ok!==true||typeof result.linked!=='boolean'||
     !expectedCode.has(result.code)||!Number.isSafeInteger(result.visibleInstances)||
     result.visibleInstances<0||result.visibleInstances>12)
   return fail('CORE_ORIGIN_PROBE_INVALID');
  if(result.linked!==true||result.code!=='TASK_ENGINE_CHAIN_MATCH')
   return fail(result.code==='TASK_ENGINE_CHAIN_MATCH'?'CORE_ORIGIN_PROBE_INVALID':result.code);
  if(!Number.isSafeInteger(result.createdAtMs)||result.createdAtMs<946684800000||
     Math.abs(result.createdAtMs-startedAt)>30000)
   return fail('CORE_ORIGIN_NODE_START_MISMATCH');
  return {status:'PASS',code:'CORE_TASK_ENGINE_CAPTURED_AT_START',
   ownerCreatedAtMs:result.createdAtMs};
 }catch{return fail('CORE_ORIGIN_PROBE_UNAVAILABLE');}
}
