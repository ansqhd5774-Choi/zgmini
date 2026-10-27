// R22 Stage 6, private-only: deterministically replay the user's 9x252 R32
// shadow output against their original R25 scores and the approved evidence.
// Does not fetch public history, collect prices, write D1, or publish results.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {calculateNineR32Private} from './theme-nine-r32-private-aggregate.mjs';

const fail=(code)=>{throw Object.assign(new Error(code),{code});};
const round=n=>Number(n.toFixed(5));
const views=[['1W',5],['1M',21],['3M',63],['6M',126],['1Y',251]];

export function auditNineR33Private({shadow,r25,roster,aum,approval}={}){
 if(shadow?.contract!=='THEME_NINE_R32_PRIVATE_STAGE5_SHADOW_V1'||
   shadow?.status!=='PRIVATE_STAGE5_CALCULATED_NOT_PUBLISHED'||
   shadow?.publicationAuthorized!==false)fail('SHADOW_NOT_PRIVATE_R32');
 const replay=calculateNineR32Private({r25,roster,aum,aumApproval:approval});
 if(!isDeepStrictEqual(shadow,replay))fail('SHADOW_EXACT_REPLAY_MISMATCH');
 const dates=r25.latest252TradingDates;
 const modes={},scoreDates=[];
 let weightsPass=0,datedOfficialAumDays=0;
 const perTheme=shadow.themes.map(t=>{
  if(t.history.length!==252||t.history.some((h,i)=>h.date!==dates[i]))
    fail('SHADOW_DATE_AXIS_INVALID');
  let nullDates=0;
  for(const d of t.history){
   modes[d.mode]=(modes[d.mode]||0)+1;
   if(d.score===null){nullDates++;continue;}
   if(!Number.isFinite(d.score)||d.score<0||d.score>100)fail('SHADOW_SCORE_OUT_OF_RANGE');
   if(!d.contributingETFs?.length)fail('SHADOW_NO_REAL_CONTRIBUTORS');
   const w=Object.values(d.weightsPercent||{});
   if(!w.length||Math.abs(w.reduce((a,b)=>a+b,0)-100)>0.0001)
    fail('SHADOW_WEIGHT_SUM_INVALID');
   if(d.datedOfficialAumUsed)datedOfficialAumDays++;
   weightsPass++;
  }
  scoreDates.push(t.scoredDates);
  const hist=t.history;
  const latest=hist.at(-1).score;
  return {theme:t.theme,firstDate:hist[0].date,lastDate:hist.at(-1).date,
   totalDates:hist.length,scoredDates:t.scoredDates,nullDates,
   latestScore:latest,
   scoreChangePoints:Object.fromEntries(views.map(([label,n])=>{
    const prior=hist.at(-1-n).score;
    return [label,{tradingSessions:n,priorScore:prior,
     delta:prior===null||latest===null?null:round(latest-prior)}];
   }))};
 });
 return {contract:'THEME_NINE_R33_STAGE6_PRIVATE_AUDIT_V1',
  status:'PRIVATE_REPLAY_PASS_PUBLIC_HISTORICAL_COMPARISON_PENDING',
  branch:'codex/theme-fear-greed-integration-20261025',
  benchmarkDate:shadow.benchmarkDate,
  source:shadow.source,counts:shadow.counts,
  dailyThemePoints:shadow.themes.length*dates.length,
  replayMatchedExactly:true,weightChecksPassed:weightsPass,
  datedOfficialAumContributorDays:datedOfficialAumDays,
  modes,perTheme,
  scoreHistoryInterpretation:'FIXED_OFFICIAL_AUM_SNAPSHOTS_NOT_HISTORICAL_POINT_IN_TIME_AUM',
  publicHistoryComparison:{status:'PENDING_NO_VERIFIED_LEGACY_PUBLIC_SNAPSHOT',
   note:'Do not claim public latest/1M/3M/1Y parity without a date-matched read-only export.'},
  providerCalls:0,dataRootWrites:0,d1Writes:0,schedulerWrites:0,
  formulaWrites:0,publicationWrites:0,publicationAuthorized:false};
}

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const sha=b=>createHash('sha256').update(b).digest('hex');
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==4||a[0]!=='--shadow'||a[2]!=='--r25')fail('R33_USAGE');
  const sb=fs.readFileSync(a[1]);
  const rb=fs.readFileSync(a[3]);
  const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
  const report=auditNineR33Private({shadow:JSON.parse(sb),r25:JSON.parse(rb),
   roster:read('config/theme-nine-r20-approved-candidates.json'),
   aum:read('config/theme-nine-r26-official-aum-evidence.json'),
   approval:read('config/theme-nine-r32-dated-aum-approval.json')});
  process.stdout.write(JSON.stringify({...report,shadowSha256:sha(sb),
   r25Sha256:sha(rb)},null,2)+'\n');
 }catch(e){
  process.stderr.write(JSON.stringify({status:'STOP_R33_PRIVATE_AUDIT',
   error:e.code||'UNEXPECTED_FAILURE',message:e.code?undefined:e.message})+'\n');
  process.exitCode=1;
 }
}
