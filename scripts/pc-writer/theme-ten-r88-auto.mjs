// Existing R54 post-step: regenerate the ten approved themes from the two
// existing sources. No task registration, schedule change, new ETF or formula.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectOptional,collectApprovedSpace} from './theme-optional-collect.mjs';
import {calculateDataCenterPower} from './theme-data-center-power-r1.mjs';
import {runApprovedSpacePcR28} from './theme-space-satellite-operational-r28.mjs';
import {runDcPowerPublishR3} from './theme-data-center-power-publish-r3.mjs';
import {dcPowerVersionedD1} from './theme-data-center-power-d1-r3.mjs';
import {runSpacePublishR32} from './theme-space-satellite-publish-r32.mjs';
import {runSpaceR8} from './theme-space-satellite-auto-r8.mjs';
import {runDcPowerR8} from './theme-data-center-power-auto-r8.mjs';
import {buildNineR88FromStorage} from './theme-nine-r88-provisional.mjs';
import {publishNineR88} from './theme-nine-r88-publish.mjs';
import {approvedNineR54SevenToken} from './theme-nine-r54-public-connect.mjs';
import {createNineR54D1Query} from './theme-nine-r54-d1-client.mjs';
import {R88_PUBLIC_ROSTER,R88_VERSION} from '../../worker/theme-nine-r88-provisional.mjs';
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const day=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'));
const shifted=(s,n)=>new Date(Date.parse(s+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
export function verifyTenR88Public(feed,{confirmedDate,provisionalDate}={}){
 const names=[...R88_PUBLIC_ROSTER.map(t=>t.theme),'우주·위성','데이터센터·전력'];
 const point=feed?.provisional?.points?.find(p=>p.date===provisionalDate);
 return feed?.status==='READY'&&feed.r32ProvisionalStatus==='READY'&&
  feed.confirmedObservationDate===confirmedDate&&feed.themes?.length===10&&
  names.every(name=>{
   const t=feed.themes.find(t=>t.theme===name),score=point?.scores?.[name];
   return t?.history?.length===252&&t.history.at(-1)?.date===confirmedDate&&
    Number.isFinite(score)&&score>=0&&score<=100;
  });
}
export async function runTenR88Lanes({steps}={}){
 // Independent errors are recorded per lane; optional failure must not
 // prevent the remaining approved themes from updating.
 const results=[];
 for(const [lane,run] of steps){
  try{results.push({lane,...await run()});}
  catch(error){results.push({lane,status:'BLOCKED',reason:error.code??error.message});}
 }
 return results;
}
async function readPublic(){
 const r=await fetch('https://zgmini.kr/api/theme-fear-greed?ten_r88='+Date.now(),{
  headers:{'cache-control':'no-cache'},redirect:'error',signal:AbortSignal.timeout(20000)});
 need(r.ok,'R88_PUBLIC_API_HTTP_'+r.status);return r.json();
}
export async function runTenR88Auto({dataRoot='E:/ZGmini/data',
 configDirectory=fileURLToPath(new URL('../../config/',import.meta.url)),
 allowCollect=false,allowPublish=false}={}){
 const report={report:'THEME_TEN_R88_EXISTING_POST_CYCLE',status:'STARTED',providerCalls:0,
  d1Writes:0,schedulerWrites:0,formulaChanged:false,rosterChanged:false};
 const consent=path.join(dataRoot,'pc-writer','theme-nine-r54','PUBLISHER_CONSENT_TEN_R88.txt');
 need(!allowPublish||(fs.existsSync(consent)&&fs.readFileSync(consent,'ascii').trim()===
  'APPROVED_TEN_THEMES_TWO_SOURCE_PROVISIONAL_20261030'),'R88_TEN_SCOPE_CONSENT_REQUIRED');
 const base=await readPublic(),confirmedDate=base.confirmedObservationDate;
 need(base.r32ProvisionalReaderVersion===R88_VERSION&&day(confirmedDate),'R88_DEPLOYED_R32_REQUIRED');
 const archive=path.join(dataRoot,'theme-market-history-r131','marketparquet-r165');
 const pending=fs.readdirSync(archive).flatMap(n=>{
  const m=/^etf_daily_(\d{4}-\d{2}-\d{2})\.parquet$/.exec(n);return m&&m[1]>confirmedDate?[m[1]]:[];
 }).sort();
 // This bridge is one actual trading session ahead, not a calendar-date
 // label or arbitrary backfill across missing intermediate sessions.
 if(pending.length!==1)return {...report,status:pending.length?'WAIT_CONFIRMED_REFRESH':'WAIT_PROVISIONAL_SOURCE',confirmedDate};
 const provisionalDate=pending[0];
 const token=await approvedNineR54SevenToken({dataRoot});
 const tokenFn=()=>token;
 const query=allowPublish?createNineR54D1Query({dataRoot,tokenFn}):null;
 const collect=async(kind)=>{
  if(!allowCollect)return {providerCalls:0,status:'STORED_ONLY'};
  const options={dataRoot,start:shifted(confirmedDate,-1),end:shifted(confirmedDate,1),maxRequests:4};
  const result=kind==='space'?await collectApprovedSpace(options):
   await collectOptional({...options,themeId:'data-center-power'});
  report.providerCalls+=result.providerCalls??0;
  need(result.status==='PRIVATE_RAW_COLLECTION_COMPLETE','R88_OPTIONAL_COLLECTION_'+result.status);
  return result;
 };
 const steps=[
  ['DATA_CENTER_CONFIRMED',async()=>{
   if(calculateDataCenterPower({dataRoot}).observationDate<confirmedDate)await collect('dc');
   const candidate=calculateDataCenterPower({dataRoot});
   if(candidate.observationDate!==confirmedDate)return {status:'WAIT_CONFIRMED_SOURCE',observationDate:candidate.observationDate};
   return runDcPowerPublishR3({dataRoot,allowCollect:false,allowPublish,
    acceptAnonymousLicenseRisk:allowPublish,
    db:allowPublish?dcPowerVersionedD1({dataRoot,tokenFn}):null});
  }],
  ['SPACE_CONFIRMED',async()=>{
   let candidate=runApprovedSpacePcR28({dataRoot,historicalSingleContinuity:true});
   if(candidate.scoreAsOf<confirmedDate||candidate.latest?.score===null){
    await collect('space');candidate=runApprovedSpacePcR28({dataRoot,historicalSingleContinuity:true});
   }
   if(candidate.scoreAsOf!==confirmedDate)return {status:'WAIT_CONFIRMED_SOURCE',observationDate:candidate.scoreAsOf};
   return runSpacePublishR32({dataRoot,allowPublish,tokenFn});
  }],
  ['R32_PROVISIONAL',async()=>{
   const latest=await readPublic();
   const staged=await buildNineR88FromStorage({dataRoot,configDirectory,base:latest,targetDate:provisionalDate});
   if(!allowPublish)return {status:'PRIVATE_VERIFIED_NOT_PUBLISHED',candidateSha256:staged.candidateSha256};
   return publishNineR88({query,record:staged.record,base:latest});
  }],
  ['SPACE_PROVISIONAL',()=>runSpaceR8({dataRoot,allowPublish,tokenFn,publicRead:readPublic})],
  ['DATA_CENTER_PROVISIONAL',()=>runDcPowerR8({dataRoot,allowPublish,tokenFn,publicRead:readPublic})],
 ];
 report.lanes=await runTenR88Lanes({steps});
 report.d1Writes=report.lanes.reduce((n,r)=>n+(r.d1Writes??0),0);
 const after=await readPublic();
 report.confirmedDate=confirmedDate;report.provisionalDate=provisionalDate;
 report.status=verifyTenR88Public(after,{confirmedDate,provisionalDate})?
  (allowPublish?'TEN_PUBLIC_API_VERIFIED':'PRIVATE_VALIDATED_EXISTING_PUBLIC_VERIFIED'):'PARTIAL_REVIEW_LANE_RESULTS';
 // An already-visible prior publication is not proof this execution succeeded.
 const success=new Set(['PUBLIC_API_VERIFIED','UNCHANGED_NO_WRITE','UNCHANGED_READBACK_VERIFIED',
  'WRITTEN_AND_READBACK_VERIFIED','PRIVATE_VERIFIED_NOT_PUBLISHED',
  'PRIVATE_CANDIDATE_VERIFIED_NOT_PUBLISHED','PRIVATE_CANDIDATE_SAVED_NOT_PUBLISHED']);
 if(report.lanes.some(r=>!success.has(r.status)))report.status='PARTIAL_REVIEW_LANE_RESULTS';
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),valid=args[0]==='--once'&&args.length<=3&&
  args.slice(1).every(a=>['--publish','--collect-approved-optionals'].includes(a))&&
  args.length===new Set(args).size;
 if(!valid){console.error('Usage: --once [--publish] [--collect-approved-optionals]');process.exitCode=2;}
 else{
  const dataRoot=process.env.ZGMINI_DATA_ROOT||'E:/ZGmini/data';
  const home=path.join(dataRoot,'pc-writer','theme-nine-r54');
  const lock=path.join(home,'TEN_R88_CYCLE.lock');let owned=false;
  try{
   const fd=fs.openSync(lock,'wx');owned=true;
   fs.writeSync(fd,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));fs.closeSync(fd);
   const report=await runTenR88Auto({dataRoot,allowCollect:args.includes('--collect-approved-optionals'),allowPublish:args.includes('--publish')});
   const file=path.join(home,'logs','THEME_TEN_R88_RESULT_'+Date.now()+'.json');
   fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
   console.log(JSON.stringify({...report,resultFile:file}));
   if(report.status==='PARTIAL_REVIEW_LANE_RESULTS')process.exitCode=1;
  }catch(error){console.error(JSON.stringify({status:'STOP_R88_EXISTING_POST_CYCLE',reason:error.code??error.message}));process.exitCode=1;}
  finally{if(owned)fs.unlinkSync(lock);}
 }
}
