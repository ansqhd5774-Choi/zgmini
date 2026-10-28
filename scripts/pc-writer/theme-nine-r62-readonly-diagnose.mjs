// R62: READ ONLY. Inspect an already-published nine-theme D1 record and the
// live public projection. Never print Cloudflare credentials or raw records.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createNineR54D1Query} from './theme-nine-r54-d1-client.mjs';
import {biotechCloudflareTokenR7} from './theme-biotech-auth-r7.mjs';
import {eligibleNineR37,THEME_NINE_R37_ROSTER,
 THEME_NINE_R37_VERSION,THEME_NINE_R37_METHOD,
 THEME_NINE_R37_ROSTER_SHA} from '../../worker/theme-nine-r37-public.mjs';
import {PUBLIC_DISPLAY_MAX_AGE_MS} from '../../worker/public-display-freshness.mjs';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const iso=v=>typeof v==='string'&&!Number.isNaN(Date.parse(v))?v:null;
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const safeCount=v=>Array.isArray(v)?v.length:null;
const names=THEME_NINE_R37_ROSTER.map(t=>t.theme);

export function inspectNineR62({record,base,storedAt,now=Date.now(),
 databaseMatchesApproved=null}={}){
 const p=record?.provisional?.points,existing=base?.provisional?.points;
 const dates=base?.themes?.find(t=>names.includes(t.theme))?.history?.map(x=>x.date);
 const expectedAum=[...new Set(THEME_NINE_R37_ROSTER.flatMap(t=>t.etfs))].sort();
 const aum=record?.officialAumAsOf??{};
 const publicConfirmed=base?.confirmedObservationDate??base?.observationDate;
 const checks={
  databaseMatchesApproved,
  recordExists:!!record,
  recordVersion:record?.version===THEME_NINE_R37_VERSION,
  recordMethod:record?.methodologyVersion===THEME_NINE_R37_METHOD,
  recordRoster:record?.rosterSha256===THEME_NINE_R37_ROSTER_SHA,
  recordConfirmedAnchor:record?.observationDate===publicConfirmed,
  recordPhase:record?.phase===base?.phase,
  recordSourceContract:['THEME_NINE_R32_PRIVATE_STAGE5_SHADOW_V1',
   'THEME_NINE_R47_PRIVATE_RECURRING_NINE_THEME_SHADOW_V1'].includes(record?.sourceContract),
  recordPriceMode:record?.sourcePriceMode==='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
  recordEvidence:[record?.rawManifestSha256,record?.r25InputSha256,
   record?.shadowSha256,record?.officialAumEvidenceSha256].every(sha),
  recordR47Manifests:record?.sourceContract==='THEME_NINE_R47_PRIVATE_RECURRING_NINE_THEME_SHADOW_V1'?
   sha(record?.baselineManifestSha256)&&
   (record?.deltaManifestSha256===null||sha(record?.deltaManifestSha256)):true,
  recordAumKeys:same(Object.keys(aum).sort(),expectedAum),
  recordAumDates:expectedAum.every(x=>typeof aum[x]==='string'&&aum[x]<=record?.observationDate),
  recordRightsFlags:record?.publicationAuthorized===true&&record?.derivedOnlyNoRaw===true&&
   record?.sourceManifestVerified===true&&record?.privateReplayVerified===true,
  recordRightsConfirmed:record?.upstreamCommercialRightsVerified===true&&
   record?.derivedLicenseVerified===true&&record?.sourcePriceReconciled===true,
  recordRightsRiskDisclosure:record?.licensingRiskAcceptedByPublisher===true&&
   record?.rightsBasis==='OFFICIAL_TERMS_DERIVED_WORKS_ANONYMOUS_SCOPE_UNCONFIRMED'&&
   record?.sourceTermsUrl==='https://getmarkethistory.com/docs/terms'&&
   record?.upstreamCommercialRightsVerified===false&&
   record?.derivedLicenseVerified===false&&record?.sourcePriceReconciled===false&&
   record?.accountGoodStandingVerified===false&&
   record?.anonymousScopeIndependentlyConfirmed===false,
  recordScoreHistoryDates:Array.isArray(dates)&&dates.length===252&&
   safeCount(record?.themes)===9&&record.themes.every((t,i)=>
    t.theme===names[i]&&t.history?.length===252&&
    same(t.history.map(x=>x.date),dates)),
  recordProvisionalDateKeysValuesUnchanged:same(p,existing),
  recordProvisionalAsOfUnchanged:record?.provisional?.asOf===base?.provisional?.asOf,
  recordLegacyMethodology:record?.provisionalLegacyMethodologyVersion===base?.methodologyVersion,
  recordLegacySourceVersion:record?.provisionalLegacySourceVersion===(base?.sourceVersion??null),
  recordLegacyLineage:record?.provisionalLineage?.source==='EXISTING_PUBLIC_PROVISIONAL_AS_PUBLISHED'&&
   record?.provisionalLineage?.publicVersion===base?.version&&
   record?.provisionalLineage?.confirmedObservationDate===publicConfirmed&&
   record?.provisionalLineage?.latestCandidateSha256===null&&
   record?.provisionalLineage?.sameMethodology===false&&
   sha(record?.provisionalLineage?.publicProvisionalPointsSha256),
  recordTimeEligible:Number.isSafeInteger(Number(storedAt))&&storedAt<=now&&
   now-storedAt<PUBLIC_DISPLAY_MAX_AGE_MS&&
   iso(record?.sourceStoredAt)!==null&&Date.parse(record.sourceStoredAt)<=now&&
   now-Date.parse(record.sourceStoredAt)<PUBLIC_DISPLAY_MAX_AGE_MS&&
   iso(record?.publishedAt)!==null&&Date.parse(record.publishedAt)<=now&&
   now-Date.parse(record.publishedAt)<PUBLIC_DISPLAY_MAX_AGE_MS,
 };
 let eligible=false;
 if(record&&base){try{eligible=eligibleNineR37(record,base,{now,storedAt});}catch{}}
 return {
  report:'R62_READ_ONLY_NINE_THEME_D1_PUBLIC_READER_DIAGNOSTIC',
  d1WriteAttempts:0,publicWriteAttempts:0,providerPriceCalls:0,
  databaseMatchesApproved,storedAt:storedAt??null,
  recordVersion:record?.version??null,
  recordPhase:record?.phase??null,
  recordDate:record?.observationDate??null,
  recordProvisionalDates:p?.map(x=>x.date)??null,
  recordProvisionalKeyCounts:p?.map(x=>Object.keys(x.scores??{}).length)??null,
  publicVersion:base?.version??null,
  publicModelRevision:base?.modelRevision??null,
  publicConfirmedDate:publicConfirmed??null,
  publicProvisionalDates:existing?.map(x=>x.date)??null,
  publicProvisionalKeyCounts:existing?.map(x=>Object.keys(x.scores??{}).length)??null,
  eligibleInSameReader:eligible,checks,
  failedChecks:Object.entries(checks).filter(([,v])=>v===false).map(([k])=>k),
  next:eligible&&base?.modelRevision!==THEME_NINE_R37_VERSION?
   'D1_RECORD_VALID_BUT_PUBLIC_ROUTE_NOT_APPLYING_READER':
   eligible?'PUBLIC_READER_APPLIED':
   'D1_ROW_READER_ELIGIBILITY_FAILED',
 };
}

export async function runNineR62({dataRoot='E:/ZGmini/data',now=Date.now(),
 fetchImpl=fetch,queryFactory=createNineR54D1Query}={}){
 const config=JSON.parse(fs.readFileSync(path.join(dataRoot,'pc-writer','config.json'),'utf8'));
 const databaseMatchesApproved=config.core==='d7a25e98-8d52-47a4-9e37-695e4d84d18b';
 const query=queryFactory({dataRoot,tokenFn:biotechCloudflareTokenR7,fetchImpl});
 const sql="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
 const result=await query(sql,['theme-legacy-nine-r37'],{write:false});
 const row=result.results?.[0]??null;
 const response=await fetchImpl(`https://zgmini.kr/api/theme-fear-greed/?r62=${now}`,{
  method:'GET',redirect:'error',headers:{accept:'application/json','cache-control':'no-cache'},
  signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('R62_PUBLIC_API_HTTP_'+response.status);
 const base=await response.json();
 let record=null;
 if(row){try{record=JSON.parse(row.body)}catch{throw Error('R62_D1_BODY_INVALID_JSON')}}
 return inspectNineR62({record,base,storedAt:row?Number(row.stored_at):null,
  now,databaseMatchesApproved});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--read-only'){
  console.error(JSON.stringify({status:'STOP_R62_USAGE',d1Writes:0}));
  process.exitCode=2;
 }else{
  try{console.log(JSON.stringify(await runNineR62({dataRoot:process.env.ZGMINI_DATA_ROOT||'E:/ZGmini/data'}),null,2))}
  catch(e){console.error(JSON.stringify({status:'STOP_R62_READ_ONLY_DIAGNOSIS',
   error:e?.code??e?.message??'UNEXPECTED',d1Writes:0}));process.exitCode=1}
 }
}
