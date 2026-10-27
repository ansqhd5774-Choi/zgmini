// R22 Stage 6: descriptive only, date-exact comparison of existing public
// 252-session derived score histories and the approved private R32 shadow.
// No invented values, score changes, external calls, grading or publication.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const fail=code=>{throw Object.assign(new Error(code),{code});};
const score=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const round=n=>Number(n.toFixed(5));
const windows=[['1W',5],['1M',21],['3M',63],['6M',126],['1Y',251]];

export function compareR33PublicOverlap({shadow,publicSnapshot}={}){
 if(shadow?.contract!=='THEME_NINE_R32_PRIVATE_STAGE5_SHADOW_V1'||
  shadow.status!=='PRIVATE_STAGE5_CALCULATED_NOT_PUBLISHED'||
  shadow.publicationAuthorized!==false||shadow.themes?.length!==9)
  fail('PRIVATE_SHADOW_CONTRACT_INVALID');
 if(publicSnapshot?.status!=='READY'||!Array.isArray(publicSnapshot.themes)||
  !['CONFIRMED','PROVISIONAL'].includes(publicSnapshot.phase)||
  !/^\d{4}-\d{2}-\d{2}$/.test(publicSnapshot.observationDate||''))
  fail('PUBLIC_SNAPSHOT_NOT_READY');
 const pub=new Map();
 for(const t of publicSnapshot.themes){
  if(!t||typeof t.theme!=='string'||pub.has(t.theme)||
   !Array.isArray(t.history)||!t.history.length)fail('PUBLIC_THEME_HISTORY_INVALID');
  if(!t.history.every((h,i)=>h&&/^\d{4}-\d{2}-\d{2}$/.test(h.date||'')&&
   score(h.score)&&(!i||h.date>t.history[i-1].date)))fail('PUBLIC_POINTS_INVALID');
  if(!score(t.score)||Math.abs(t.score-t.history.at(-1).score)>0.00001)
   fail('PUBLIC_LATEST_HISTORY_MISMATCH');
  pub.set(t.theme,t);
 }
 let matchedDays=0;
 const report=shadow.themes.map(t=>{
  const x=pub.get(t.theme);
  if(!x)return {theme:t.theme,status:'PUBLIC_THEME_NOT_PRESENT',matchedDates:0,
   privateLatestDate:t.latest?.date,privateLatestScore:t.latest?.score??null};
  const publicByDate=new Map(x.history.map(h=>[h.date,h.score]));
  const overlap=t.history.filter(h=>score(h.score)&&publicByDate.has(h.date));
  if(!overlap.length)return {theme:t.theme,status:'NO_COMMON_DATES',matchedDates:0,
   privateLatestDate:t.latest?.date,publicLatestDate:x.history.at(-1).date};
  const deltas=overlap.map(h=>h.score-publicByDate.get(h.date));
  const latest=t.history.at(-1);
  const publicSameDate=publicByDate.get(latest.date);
  matchedDays+=overlap.length;
  return {theme:t.theme,status:'DATE_MATCHED_DESCRIPTIVE_COMPARISON',
   publicETFs:x.etfs??[],privateLatestETFs:t.latest.contributingETFs,
   privateLatestDate:latest.date,publicLastDate:x.history.at(-1).date,
   matchedDates:overlap.length,overlapFrom:overlap[0].date,
   overlapTo:overlap.at(-1).date,
   privateLatestScore:latest.score,
   publicSameDateScore:publicSameDate??null,
   latestDeltaPoints:publicSameDate===undefined?null:round(latest.score-publicSameDate),
   meanAbsDeltaPoints:round(deltas.reduce((s,n)=>s+Math.abs(n),0)/deltas.length),
   maxAbsDeltaPoints:round(Math.max(...deltas.map(Math.abs))),
   scoreChangeComparison:Object.fromEntries(windows.map(([label,n])=>{
    const ref=t.history.at(-1-n),pubPast=publicByDate.get(ref.date);
    if(publicSameDate===undefined||pubPast===undefined||ref.score===null||latest.score===null)
     return [label,{referenceDate:ref.date,status:'NOT_DATE_MATCHED'}];
    const pri=round(latest.score-ref.score),old=round(publicSameDate-pubPast);
    return [label,{referenceDate:ref.date,privateChangePoints:pri,
     publicChangePoints:old,changeDifferencePoints:round(pri-old)}];
   }))};
 });
 const available=report.filter(t=>t.status==='DATE_MATCHED_DESCRIPTIVE_COMPARISON').length;
 return {contract:'THEME_NINE_R33_PUBLIC_OVERLAP_COMPARISON_V1',
  status:available===shadow.themes.length?'NINE_THEMES_DESCRIPTIVELY_COMPARED':
   'PARTIAL_PUBLIC_THEME_COVERAGE_RECORDED',
  branch:'codex/theme-fear-greed-integration-20261025',
  observationDate:publicSnapshot.observationDate,publicPhase:publicSnapshot.phase,
  publicSourceVersion:publicSnapshot.sourceVersion,
  privateBenchmarkDate:shadow.benchmarkDate,
  comparedThemes:available,unavailableThemes:report.filter(t=>t.status!=='DATE_MATCHED_DESCRIPTIVE_COMPARISON').map(t=>t.theme),
  matchedThemeDates:matchedDays,eligiblePrivateThemeDates:shadow.themes.length*252,
  comparison:report,
  interpretation:'OLD_TWO_ETF_PUBLIC_VS_NEW_ADDITIONAL_ETFS_AND_DATED_AUM_PRIVATE_NOT_A_PARITY_TARGET',
  decisions:'NO_NEW_SCORE_THRESHOLDS_NO_AUTO_PUBLICATION',
  dataRootWrites:0,d1Writes:0,schedulerWrites:0,formulaWrites:0,
  providerCalls:0,publicationWrites:0,publicationAuthorized:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==4||a[0]!=='--shadow'||a[2]!=='--public')fail('R33_PUBLIC_AUDIT_USAGE');
  const priv=fs.readFileSync(a[1]),pub=fs.readFileSync(a[3]);
  const report=compareR33PublicOverlap({shadow:JSON.parse(priv),publicSnapshot:JSON.parse(pub)});
  const hash=b=>createHash('sha256').update(b).digest('hex');
  process.stdout.write(JSON.stringify({...report,shadowSha256:hash(priv),
   publicSnapshotSha256:hash(pub)},null,2)+'\n');
 }catch(e){
  process.stderr.write(JSON.stringify({status:'STOP_R33_PUBLIC_COMPARISON',
   error:e.code||'UNEXPECTED_FAILURE',message:e.code?undefined:e.message})+'\n');
  process.exitCode=1;
 }
}
