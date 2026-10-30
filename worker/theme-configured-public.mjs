// Separate opt-in reader for approved configured themes. Does not touch the
// existing ten-theme route, publish, calculate, or call a price provider.
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';
import {CONFIGURED_R32,CONFIGURED_V2,validR32History,validConfiguredProvisional} from './theme-configured-r32-contract.mjs';

const PREFIX='theme-configured:';
const VERSION='ZGMINI_CONFIGURED_THEME_PUBLIC_V1';
const ROUTE_VERSION='ZGMINI_CONFIGURED_THEMES_READER_V1';
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
 Number.isFinite(Date.parse(d+'T00:00:00Z'))&&
 new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const validScore=s=>typeof s==='number'&&Number.isFinite(s)&&s>=0&&s<=100;
const validStamp=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const hash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);

export function eligibleConfiguredPublic(record,key,storedAt,now=Date.now()){
 const v2=record?.version===CONFIGURED_V2;
 const provisional=v2&&record.phase==='PROVISIONAL';
 if(!record||typeof record!=='object'||Array.isArray(record)||
  (!v2&&record.version!==VERSION)||record.status!=='READY'||
  typeof record.themeId!=='string'||key!==(provisional?'theme-configured-provisional:':PREFIX)+record.themeId||
  !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(record.themeId)||
  typeof record.theme!=='string'||!record.theme.trim()||
  record.theme.trim()!==record.theme||record.theme.length>60||
  /[<>\x00-\x1f\x7f]/.test(record.theme)||
  record.benchmark!=='SPY'||record.methodologyVersion!==(v2?CONFIGURED_R32:'ADAPTIVE_R2_PAIR_R3')||
  record.publicationAuthorized!==true||record.derivedOnlyNoRaw!==true||
  record.publicationAuthorizationBasis!=='LOCAL_OPERATOR_ATTESTATION_NOT_INDEPENDENT_LEGAL_VERIFICATION'||
  ![record.definitionSha256,record.candidateSha256,record.approvalSha256].every(hash)||
  !(provisional?/^R32_PROVISIONAL_SHA256_[a-f0-9]{64}$/:/^GMH_MANIFEST_SHA256_[a-f0-9]{64}$/).test(record.sourceVersion??'')||
  !Array.isArray(record.etfs)||(v2?record.etfs.length<1:record.etfs.length!==2)||
  new Set(record.etfs).size!==record.etfs.length||
  record.etfs.some(s=>typeof s!=='string'||!/^[A-Z]{1,6}$/.test(s)||s==='SPY')||
  !validDate(record.observationDate)||!validStamp(record.sourceStoredAt)||
  !validStamp(record.publishedAt)||!validScore(record.score)||
  !Array.isArray(record.history)||record.history.length<1||record.history.length>252||
  !Number.isSafeInteger(storedAt)||storedAt<=0||storedAt>now)return false;
 const sourceAt=Date.parse(record.sourceStoredAt),publishedAt=Date.parse(record.publishedAt),
  observedAt=Date.parse(record.observationDate+'T23:59:59Z');
 if(sourceAt>now||publishedAt>now||observedAt>now||
  now-sourceAt>=PUBLIC_DISPLAY_MAX_AGE_MS||
  now-observedAt>=PUBLIC_DISPLAY_MAX_AGE_MS||
  now-storedAt>=PUBLIC_DISPLAY_MAX_AGE_MS)return false;
 if(v2)return hash(record.selectionEvidenceSha256)&&hash(record.aumEvidenceSha256)&&validR32History(record)&&(!provisional||validConfiguredProvisional(record));
 let last='';
 for(const p of record.history){
  if(!p||!validDate(p.date)||p.date<=last||
   (p.score!==null&&!validScore(p.score))||
   typeof p.status!=='string'||!p.status||
   (p.weights!==null&&(!p.weights||
    !Number.isFinite(p.weights.first)||!Number.isFinite(p.weights.second)||
    p.weights.first<0||p.weights.second<0||
    Math.abs(p.weights.first+p.weights.second-1)>0.000001)))return false;
  last=p.date;
 }
 return last===record.observationDate&&
  record.history.at(-1).score===record.score;
}

async function configuredRows(db,prefix){
 const rows=[];let cursor='';
 for(;;){
  const response=await db.prepare(
   `SELECT feed_key,body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key LIKE '${prefix}%' AND snapshot_key='current' AND feed_key > ? ORDER BY feed_key LIMIT 200`
  ).bind(cursor).all();
  if(!Array.isArray(response?.results))throw Error('INVALID_D1_SHAPE');
  const page=response.results;let previous=cursor;
  for(const row of page){if(typeof row.feed_key!=='string'||row.feed_key<=previous)throw Error('INVALID_D1_CURSOR');previous=row.feed_key;}
  rows.push(...page);if(page.length<200)break;cursor=previous;
 }
 return rows;
}
export async function readConfiguredThemes(db,{now=Date.now()}={}){
 const headers={'cache-control':'no-store','x-data-source':'STORED',
  'x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'};
 if(!Number.isSafeInteger(now)||now<=0)
  return Response.json({status:'UNAVAILABLE',reason:'INVALID_CLOCK',themes:[]},
   {status:503,headers});
 let rows;
 try{
  // 200 is a query page size, never a total number of admitted themes.
  // Keyset pagination avoids OFFSET skipping rows as registrations grow.
  rows=await configuredRows(db,PREFIX);
 }catch{
  return Response.json({status:'UNAVAILABLE',reason:'STORED_READ_UNAVAILABLE',
   version:ROUTE_VERSION,themes:[]},{status:503,headers});
 }
 const themes=[];
 const r32Records=new Map();
 for(const row of rows){
  let record;
  try{record=JSON.parse(row.body);}catch{continue;}
  if(!eligibleConfiguredPublic(record,row.feed_key,Number(row.stored_at),now))
   continue;
  if(record.version===CONFIGURED_V2)r32Records.set(record.themeId,record);
  themes.push({id:record.themeId,theme:record.theme,etfs:[...record.etfs],
   methodologyVersion:record.methodologyVersion,observationDate:record.observationDate,
   sourceStoredAt:record.sourceStoredAt,score:record.score,
   history:record.history.map(p=>({date:p.date,score:p.score,status:p.status??p.mode}))});
 }
 // Optional sidecar failures do not hide a verified confirmed result.
 if(r32Records.size){
  const provisionals=new Map();
  try{for(const row of await configuredRows(db,'theme-configured-provisional:')){
   try{const record=JSON.parse(row.body);if(eligibleConfiguredPublic(record,row.feed_key,Number(row.stored_at),now))provisionals.set(record.themeId,record);}catch{}
  }}catch{}
  for(const theme of themes){
   const confirmed=r32Records.get(theme.id);if(!confirmed)continue;
   const provisional=provisionals.get(theme.id);
   theme.provisionalStatus='PENDING';
   if(provisional&&provisional.definitionSha256===confirmed.definitionSha256&&provisional.confirmedObservationDate===confirmed.observationDate&&
    provisional.methodologyVersion===confirmed.methodologyVersion&&provisional.selectionEvidenceSha256===confirmed.selectionEvidenceSha256&&
    provisional.aumEvidenceSha256===confirmed.aumEvidenceSha256){
    theme.provisionalStatus='READY';theme.provisional={date:provisional.observationDate,score:provisional.score,
     methodologyVersion:provisional.methodologyVersion,sourcePriceMode:provisional.sourcePriceMode,
     sourcePriceReconciled:false,etfs:provisional.history.at(-1).contributingETFs};
   }
  }
 }
 const status=themes.length?'READY':rows.length?'UNAVAILABLE':'PENDING';
 return Response.json({status,version:ROUTE_VERSION,supportedMethodologies:['ADAPTIVE_R2_PAIR_R3',CONFIGURED_R32],
  supportsSeparateR32Provisional:true,themes},{
  headers:themes.length?{...headers,
   'cache-control':'public, max-age=60, must-revalidate'}:headers});
}
