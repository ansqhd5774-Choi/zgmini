// Approved-purpose PC publisher candidate: stored 19 summaries only.
// Provider requests=0, Core/SQLite writes=0; one isolated D1 key after full validation.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {previewInflation19} from './inflation-causal-public-preview-r1.mjs';
import {INFLATION_CAUSAL_PUBLIC_KEY,inflationCausalPublicWriter}
 from '../../worker/inflation-causal-public-r1.mjs';

const self=fileURLToPath(import.meta.url);
const fail=x=>{throw Error(x)};
const clean=x=>/^[A-Z][A-Z0-9_]{3,80}$/.test(x?.message??'')?x.message:'INFL19_PUBLICATION_FAILED';
const APPROVED=String.raw`E:\ZGmini\data\pc-writer`;
function sanitize(preview){
 return {ready:preview.ready,missing:preview.missing,
  sourceVersion:preview.payload?.sourceVersion??null,
  sourceStoredAt:preview.payload?.sourceStoredAt??null};
}
export async function publishInflation19({pcHome=APPROVED,apply=false,operationalRoot}={}){
 const preview=previewInflation19(pcHome);
 if(preview.status==='PENDING'||preview.ready!==19||preview.payload?.status!=='READY')
  return {status:'PARTIAL',code:'INFL19_PUBLIC_INPUTS_INCOMPLETE',...sanitize(preview),
   providerCalls:0,coreWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0};
 if(!apply)return {status:'PASS_DRY_RUN',code:'INFL19_PUBLIC_PREFLIGHT_PASS',
  ...sanitize(preview),providerCalls:0,coreWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0};
 if(typeof operationalRoot!=='string'||!path.isAbsolute(operationalRoot)||!fs.existsSync(operationalRoot))
  fail('INFL19_OPERATIONAL_ROOT_REQUIRED');
 const config=JSON.parse(fs.readFileSync(path.join(pcHome,'config.json'),'utf8'));
 const {inspectD1Source,validateD1DualSource}
  =await import('./EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs');
 const publisherRoot=path.resolve(path.dirname(self),'../..');
 validateD1DualSource({config,
  publisher:inspectD1Source(publisherRoot,{publisher:true}),
  operational:inspectD1Source(operationalRoot)});
 const {client,credential}=await import('./d1.mjs');
 const remote=client(config,()=>credential(operationalRoot));
 const result=await inflationCausalPublicWriter(remote.adapter(config.core,{allowWrites:true}))
  .write(preview.payload);
 if(!['READBACK_VERIFIED','ALREADY_STORED'].includes(result.status))
  fail('INFL19_PUBLIC_READBACK_UNVERIFIED');
 return {status:result.status,code:'INFL19_PUBLIC_PUBLISHED_READBACK',
  key:INFLATION_CAUSAL_PUBLIC_KEY,...sanitize(preview),providerCalls:0,
  coreWrites:0,dbWrites:0,d1Writes:result.status==='READBACK_VERIFIED'?1:0,
  schedulerWrites:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===self){
 const args=process.argv.slice(2),dry=args.length===1&&args[0]==='--dry-run',
  apply=args.length===2&&args.includes('--apply')&&
   args.includes('--confirm-inflation-causal-public-r1');
 let output;
 if(!dry&&!apply)output={status:'BLOCKED',code:'INFL19_ARGUMENTS_DENIED'};
 else try{output=await publishInflation19({apply,operationalRoot:
  process.env.ZGMINI_INFLATION_OPERATIONAL_ROOT});}
 catch(e){output={status:'BLOCKED',code:clean(e)}}
 console.log(JSON.stringify(output));if(!['PASS_DRY_RUN','READBACK_VERIFIED','ALREADY_STORED'].includes(output.status))
  process.exitCode=1;
}
