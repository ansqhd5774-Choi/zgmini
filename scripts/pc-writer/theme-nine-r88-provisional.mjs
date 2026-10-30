// User-approved EOD provisional bridge: exact existing R25/R32 functions.
// SHA-audited saved sources only. No raw collection, confirmed writes or tasks.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {calculateNineR47PrivateScores} from './theme-nine-r47-private-score.mjs';
import {calculateNineR47PrivateThemes,loadNineR47OfficialEvidence} from './theme-nine-r47-private-theme-aggregate.mjs';
import {scoreOneR25} from './theme-nine-r25-individual-score.mjs';
import {mixNineR32Date} from './theme-nine-r32-private-aggregate.mjs';
import {readNineR45SavedDates,compileNineR45PrivateEodFeed} from './theme-nine-r45-private-eod-feed.mjs';
import {R88_VERSION,R88_PRICE_MODE,R88_PUBLIC_ROSTER,validNineR88} from '../../worker/theme-nine-r88-provisional.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function calculateNineR88({base,sessions,scores,evidence,parquet,now=Date.now()}={}){
 const date=base?.confirmedObservationDate,latest=parquet?.latestVerifiedDate;
 need(date===scores?.source?.latestSpySessionDate&&latest>date&&
  parquet?.source==='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED'&&
  parquet.sourceFiles?.length===2&&parquet.sourceFiles[0].date===date&&
  parquet.latestSPYPresent===true,'R88_SOURCE_DATES_OR_SPY_INVALID');
 const baseline=calculateNineR47PrivateThemes({scores,...evidence});
 const baseByName=new Map(base.themes.map(t=>[t.theme,t]));
 for(const required of R88_PUBLIC_ROSTER){
  const t=baseline.themes.find(t=>t.theme===required.theme),b=baseByName.get(required.theme);
  need(b&&eq(b.etfs,required.etfs)&&b.score===t.latest.score&&
   eq(b.history,t.history.map(p=>({date:p.date,score:p.score}))),
   'R88_CONFIRMED_R32_REPLAY_MISMATCH_'+required.theme);
 }
 const symbols=[...new Set(R88_PUBLIC_ROSTER.flatMap(t=>t.etfs))];
 const overlapPriceDifferences={},eligible=new Map();
 const spy=sessions.get('SPY');
 need(spy?.at(-1)?.date===date,'R88_GMH_SPY_ANCHOR');
 const price=(s,d)=>parquet.series[s]?.find(p=>p.date===d)?.close;
 const bridge=s=>{
  const previous=sessions.get(s)?.find(p=>p.date===date)?.close,other=price(s,date);
  need(previous>0&&other>0,'R88_OVERLAP_MISSING_'+s);
  const diff=Math.abs(other/previous-1);
  need(Number.isFinite(diff)&&diff<=0.05,'R88_OVERLAP_PRICE_MODE_DIFFERENCE_'+s);
  overlapPriceDifferences[s]=diff;
 };
 bridge('SPY');
 const nextSpy=[...spy,{date:latest,close:price('SPY',latest)}];
 const money=new Map(evidence.aum.rows.map(r=>[r.ticker,r]));
 for(const s of symbols){
  // Missing EOD rows stay missing: no carry-forward price or invented ETF.
  if(!(price(s,latest)>0))continue;
  // Without an actual same-day overlap the source modes cannot be compared.
  // Treat that ETF as missing for this provisional point, never as a match.
  if(!(sessions.get(s)?.find(p=>p.date===date)?.close>0)||!(price(s,date)>0))continue;
  bridge(s);
  const result=scoreOneR25({symbol:s,spySessions:nextSpy,
   ownSessions:[...sessions.get(s),{date:latest,close:price(s,latest)}]});
  const p=result.history.at(-1),aum=money.get(s);
  if(p.score===null)continue;
  eligible.set(s,{ticker:s,score:p.score,sessions:p.realSessionCount,
   status:p.status,aumUsd:aum.aumUsd,aumAsOf:aum.aumAsOf});
 }
 const themes=R88_PUBLIC_ROSTER.map(t=>{
  const rows=t.etfs.flatMap(s=>eligible.has(s)?[eligible.get(s)]:[]);
  need(rows.length>=3,'R88_THREE_PLUS_ACTUAL_ETFS_REQUIRED_'+t.theme);
  const mixed=mixNineR32Date({date:latest,rows,benchmarkDate:latest,allowDatedOfficialAum:true});
  need(mixed.mode==='NORMALIZED_DATED_OFFICIAL_AUM_THREE_PLUS','R88_R32_AGGREGATION_DRIFT');
  return {theme:t.theme,approvedEtfs:[...t.etfs],confirmedScore:baseByName.get(t.theme).score,
   points:[{date:latest,score:mixed.score,etfs:mixed.contributingETFs,
    missingEtfs:t.etfs.filter(s=>!mixed.contributingETFs.includes(s)),weightsPercent:mixed.weightsPercent}]};
 });
 const sourceFiles=parquet.sourceFiles;
 const record={status:'READY',version:R88_VERSION,phase:'PROVISIONAL',
  methodologyVersion:base.methodologyVersion,sourcePriceMode:R88_PRICE_MODE,
  confirmedObservationDate:date,observationDate:latest,rosterSha256:scores.source.rosterSha256,
  baselineManifestSha256:scores.source.baselineManifestSha256,
  deltaManifestSha256:scores.source.deltaManifestSha256,
  officialAumEvidenceSha256:sha(Buffer.from(JSON.stringify(evidence.aum))),
  confirmedReplayVerified:true,derivedOnlyNoRaw:true,sourcePriceReconciled:false,
  upstreamCommercialRightsVerified:false,derivedLicenseVerified:false,
  publicationAuthorized:true,individualStocksUsed:0,
  sourceStoredAt:parquet.sourceStoredAt,asOf:new Date(now).toISOString(),
  sourceFiles,overlapPriceDifferences,
  aumAsOf:Object.fromEntries(evidence.aum.rows.map(r=>[r.ticker,r.aumAsOf])),themes};
 record.sourceVersion=sha(Buffer.from(JSON.stringify({baseline:record.baselineManifestSha256,
  delta:record.deltaManifestSha256,aum:record.officialAumEvidenceSha256,sourceFiles,themes})));
 need(validNineR88(record,base,{now,storedAt:now}),'R88_PUBLIC_READER_REJECTED');
 return record;
}
export async function buildNineR88FromStorage({dataRoot='E:/ZGmini/data',
 configDirectory=fileURLToPath(new URL('../../config/',import.meta.url)),base,targetDate,now=Date.now(),decoder=null}={}){
 const rosterPath=path.join(configDirectory,'theme-nine-r20-approved-candidates.json');
 const evidence=loadNineR47OfficialEvidence({configDirectory,rosterPath});
 let sessions;
 const scores=calculateNineR47PrivateScores({dataRoot,rosterPath,now:new Date(now),
  onVerifiedSessions:value=>{sessions=value;}});
 const saved=await readNineR45SavedDates({dataRoot,dates:[base.confirmedObservationDate,targetDate],decoder});
 const parquet={...compileNineR45PrivateEodFeed({roster:evidence.roster,
  verifiedRowsByDate:saved.rows,shaByDate:saved.hashes}),sourceStoredAt:saved.sourceStoredAt};
 const record=calculateNineR88({base,sessions,scores,evidence,parquet,now});
 const bytes=Buffer.from(JSON.stringify(record,null,2)+'\n'),digest=sha(bytes);
 const dir=path.join(dataRoot,'themes','legacy-nine-r88-provisional');fs.mkdirSync(dir,{recursive:true});
 const file=path.join(dir,`THEME_NINE_R88_PROVISIONAL_${targetDate}_${digest}.json`);
 if(fs.existsSync(file))need(sha(fs.readFileSync(file))===digest,'R88_IMMUTABLE_CANDIDATE_DRIFT');
 else fs.writeFileSync(file,bytes,{flag:'wx'});
 return {record,candidateFile:file,candidateSha256:digest};
}
