// One-shot biotech-only R5 -> R6 private history continuation.
// Reuses the verified, immutable R5 output and the current biotech D1 sidecar.
// No provider request, D1/public write, or scheduler mutation.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readBiotechPrior} from './theme-biotech-shadow-r5.mjs';
import {buildBiotechConfirmedContinuationR6,saveBiotechConfirmedContinuationR6} from './theme-biotech-continuation-r6.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const requireValid=(check,code)=>{if(!check)throw Object.assign(new Error(code),{code});};

export function loadVerifiedShadowR5(dataRoot){
 const base=fs.realpathSync(dataRoot),home=path.join(base,'themes','biotech');
 requireValid(fs.realpathSync(home).startsWith(base+path.sep),'BIOTECH_R6_ROOT_INVALID');
 const bytes=fs.readFileSync(path.join(home,'raw-manifest.json'));
 const manifestSource='GMH_MANIFEST_SHA256_'+hash(bytes);
 const scorerSha=hash(fs.readFileSync(new URL('./theme-optional-score-r188.mjs',import.meta.url)));
 const derived=path.join(home,'derived');
 requireValid(fs.existsSync(derived)&&fs.realpathSync(derived).startsWith(fs.realpathSync(home)+path.sep),'BIOTECH_R6_SHADOW_MISSING');
 const matches=[];
 for(const name of fs.readdirSync(derived).filter(s=>/^biotech-shadow-r5-[a-f0-9]{16}\.json$/.test(s))){
  const file=path.join(derived,name),real=fs.realpathSync(file);
  requireValid(real.startsWith(fs.realpathSync(derived)+path.sep),'BIOTECH_R6_SHADOW_ESCAPE');
  const body=fs.readFileSync(real),digest=hash(body);
  requireValid(name===`biotech-shadow-r5-${digest.slice(0,16)}.json`,'BIOTECH_R6_SHADOW_SHA_MISMATCH');
  const shadow=JSON.parse(body);
  if(shadow.sourceVersion===manifestSource&&shadow.scorerCodeSha256===scorerSha)matches.push(shadow);
 }
 requireValid(matches.length===1,'BIOTECH_R6_SHADOW_CURRENT_REVISION_AMBIGUOUS_OR_MISSING');
 return matches[0];
}

export async function runBiotechR6({dataRoot,readPrior=readBiotechPrior,loadShadow=loadVerifiedShadowR5,save=false}={}){
 const prior=await readPrior({dataRoot});
 const shadow=loadShadow(dataRoot);
 const candidate=buildBiotechConfirmedContinuationR6({prior,shadow});
 const saved=save?saveBiotechConfirmedContinuationR6(dataRoot,candidate):null;
 const {history,...summary}=candidate;
 return {report:'BIOTECH_CONTINUATION_R6',...summary,historyPoints:history.length,saved};
}

const args=process.argv.slice(2);
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(args.length!==1||!['--inspect','--save-candidate'].includes(args[0])){
  console.log('Usage: theme-biotech-continuation-r6-pc.mjs <--inspect|--save-candidate>');process.exitCode=2;
 }else{
  try{console.log(JSON.stringify(await runBiotechR6({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',save:args[0]==='--save-candidate'})));}
  catch(e){console.log(JSON.stringify({report:'BIOTECH_CONTINUATION_R6',status:'BLOCKED',reason:e?.code??'BIOTECH_R6_UNCLASSIFIED'}));process.exitCode=1;}
 }
}
