import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {createHash} from 'node:crypto';
import {collectIndustrialElectricity,ELECTRIC_FILE} from '../inflation-causal-gas-electric.mjs';
const WRITER=String.raw`E:\ZGmini\data\pc-writer`;
const fail=c=>{throw Object.assign(new Error(c),{code:c})};
const clean=e=>typeof e?.code==='string'&&/^[A-Z0-9_]{3,80}$/.test(e.code)?e.code:'EIA_ONLY_FAILED';
export async function run({base=process.env.ZGMINI_PC_HOME,loadProviders,quotaFactory,fetcher=fetch}={}){
 if(process.platform==='win32'&&path.win32.normalize(base??'').toLowerCase()!==path.win32.normalize(WRITER).toLowerCase())fail('EIA_ONLY_HOME_DENIED');
 if(!base||!fs.lstatSync(base).isDirectory())fail('EIA_ONLY_HOME_MISSING');
 const env=await (loadProviders??(async()=>{const {loadLocalProviders}=await import('./local-env.mjs');return loadLocalProviders(base)}))();
 const key=env.EIA_API_KEY??env.EIA_KEY;
 if(typeof key!=='string'||!key.trim())fail('EIA_KEY_MISSING');
 const {createQuotaFetch}=quotaFactory?{createQuotaFetch:quotaFactory}:await import('./quota-fetch.mjs');
 const quota=createQuotaFetch({base,originalFetch:fetcher,mode:'enforce'});
 if(typeof quota.fetch!=='function')fail('EIA_QUOTA_NOT_ENFORCED');
 let calls=0;
 const protectedFetch=(url,options)=>{const u=new URL(url);if(u.hostname!=='api.eia.gov'||options?.method!=='GET'||options?.redirect!=='manual'||++calls>2)fail('EIA_REQUEST_DENIED');return quota.fetch(url,options)};
 const out=await collectIndustrialElectricity({base,eiaKey:key,quotaFetch:protectedFetch});
 if(!['SAVED_READBACK','UNCHANGED'].includes(out.status)||out.source!=='EIA_INDUSTRIAL_ELECTRICITY_US'||out.providerRequests!==2||calls!==2||!Number.isInteger(out.count)||out.count<12||!/^\d{4}-\d\d$/.test(out.latest))fail('EIA_CHILD_CONTRACT_DENIED');
 const file=path.join(base,...ELECTRIC_FILE.split('/'));const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8000000)fail('EIA_OUTPUT_UNSAFE');
 const fileSha256=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 return {status:'PASS',code:'EIA_INDUSTRIAL_SAVED_READBACK',count:out.count,latest:out.latest,fileSha256,providerCalls:calls,coreWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let out;try{if(process.argv.length!==2)fail('EIA_ARGS_DENIED');out=await run()}catch(e){out={status:'BLOCKED',code:clean(e),providerCalls:null,coreWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0}}console.log(JSON.stringify(out));if(out.status!=='PASS')process.exitCode=1;
}
