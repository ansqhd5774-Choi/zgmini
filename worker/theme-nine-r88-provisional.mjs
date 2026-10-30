// Stored-only R32 provisional sidecar. Never writes or replaces confirmed history.
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';
import {THEME_NINE_R37_METHOD,THEME_NINE_R37_ROSTER,THEME_NINE_R37_ROSTER_SHA,
 THEME_NINE_R37_VERSION} from './theme-nine-r37-public.mjs';
export const R88_KEY='theme-nine-r32-provisional-r88';
export const R88_VERSION='THEME_NINE_R32_PROVISIONAL_R88_V1';
export const R88_PRICE_MODE='GMH_UNADJUSTED_HOURLY_PROXY_PLUS_MARKETPARQUET_SPLIT_ADJUSTED_EOD_PROVISIONAL_ONLY';
export const R88_PUBLIC_ROSTER=THEME_NINE_R37_ROSTER.filter(t=>t.theme!=='AI·반도체');
const score=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const day=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function validNineR88(record,base,{now=Date.now(),storedAt=now}={}){
 if(base?.status!=='READY'||base.modelRevision!==THEME_NINE_R37_VERSION||
  base.methodologyVersion!==THEME_NINE_R37_METHOD||record?.status!=='READY'||
  record.version!==R88_VERSION||record.methodologyVersion!==THEME_NINE_R37_METHOD||
  record.sourcePriceMode!==R88_PRICE_MODE||record.phase!=='PROVISIONAL'||
  record.rosterSha256!==THEME_NINE_R37_ROSTER_SHA||record.publicationAuthorized!==true||
  record.derivedOnlyNoRaw!==true||record.confirmedReplayVerified!==true||
  record.sourcePriceReconciled!==false||record.individualStocksUsed!==0||
  record.confirmedObservationDate!==base.confirmedObservationDate||
  !sha(record.sourceVersion)||!sha(record.baselineManifestSha256)||
  !sha(record.deltaManifestSha256)||!sha(record.officialAumEvidenceSha256)||
  !day(record.confirmedObservationDate)||!Array.isArray(record.themes)||
  record.themes.length!==R88_PUBLIC_ROSTER.length)return false;
 const clocks=[record.sourceStoredAt,record.asOf].map(Date.parse);
 clocks.push(Number(storedAt));
 if(clocks.some(t=>!Number.isSafeInteger(t)||t>now||now-t>=PUBLIC_DISPLAY_MAX_AGE_MS))return false;
 if(!Array.isArray(record.sourceFiles)||record.sourceFiles.length<2||record.sourceFiles.length>3||
  record.sourceFiles[0]?.date!==record.confirmedObservationDate||
  record.sourceFiles.some((f,i)=>!day(f.date)||!sha(f.sha256)||
   (i>0&&f.date<=record.sourceFiles[i-1].date))||
  record.observationDate!==record.sourceFiles.at(-1).date||
  Date.parse(record.observationDate+'T00:00:00Z')>now||
  now-Date.parse(record.observationDate+'T23:59:59Z')>=PUBLIC_DISPLAY_MAX_AGE_MS)return false;
 const publicByName=new Map(base.themes?.map(t=>[t.theme,t]));
 for(let i=0;i<R88_PUBLIC_ROSTER.length;i++){
  const required=R88_PUBLIC_ROSTER[i],t=record.themes[i],confirmed=publicByName.get(required.theme);
  if(t?.theme!==required.theme||!confirmed||!eq(confirmed.etfs,required.etfs)||
   confirmed.history?.length!==252||confirmed.history.at(-1)?.date!==record.confirmedObservationDate||
   t.confirmedScore!==confirmed.score||!eq(t.approvedEtfs,required.etfs)||
   !Array.isArray(t.points)||t.points.length!==record.sourceFiles.length-1)return false;
  for(let j=0;j<t.points.length;j++){
   const p=t.points[j];
   if(p?.date!==record.sourceFiles[j+1].date||!score(p.score)||
    !Array.isArray(p.etfs)||p.etfs.length<3||new Set(p.etfs).size!==p.etfs.length||
    p.etfs.some(s=>!required.etfs.includes(s))||!p.weightsPercent||
    Object.keys(p.weightsPercent).length!==p.etfs.length||
    p.etfs.some(s=>!(p.weightsPercent[s]>0)||!Number.isFinite(p.weightsPercent[s]))||
    Math.abs(p.etfs.reduce((n,s)=>n+p.weightsPercent[s],0)-100)>0.02||
    !Array.isArray(p.missingEtfs)||!eq([...p.missingEtfs].sort(),
     required.etfs.filter(s=>!p.etfs.includes(s)).sort()))return false;
   for(const s of [...p.etfs,'SPY']){
    const difference=record.overlapPriceDifferences?.[s];
    if(!Number.isFinite(difference)||difference<0||difference>0.05||
     (s!=='SPY'&&(!day(record.aumAsOf?.[s])||record.aumAsOf[s]>record.confirmedObservationDate)))return false;
   }
  }
 }
 return true;
}
export async function addVerifiedNineR88(db,base,{now=Date.now()}={}){
 if(base?.modelRevision!==THEME_NINE_R37_VERSION)return base;
 // A missing next-day R32 record must not silently re-enable the legacy
 // pair formula. Keep confirmed history and optional-theme points, while
 // leaving unverified core provisional values out of the public projection.
 const core=new Set(R88_PUBLIC_ROSTER.map(t=>t.theme));
 const pending=(base.provisional?.points??[]).map(p=>({...p,
  scores:Object.fromEntries(Object.entries(p.scores??{}).filter(([name])=>!core.has(name)))}))
  .filter(p=>Object.keys(p.scores).length);
 base={...base,r32ProvisionalReaderVersion:R88_VERSION,r32ProvisionalStatus:'PENDING',
  phase:pending.length?'PROVISIONAL':'CONFIRMED',
  provisional:{...base.provisional,points:pending}};
 let row,record;
 try{row=await db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'")
  .bind(R88_KEY).first();if(!row)return base;record=JSON.parse(row.body);}catch{return base;}
 if(!validNineR88(record,base,{now,storedAt:Number(row.stored_at)}))return base;
 const indexed=new Map((base.provisional?.points??[]).map(p=>[p.date,{...p,scores:{...p.scores}}]));
 for(const t of record.themes)for(const p of t.points){
  const existing=indexed.get(p.date)??{date:p.date,scores:{}};
  existing.scores[t.theme]=p.score;indexed.set(p.date,existing);
 }
 return {...base,phase:'PROVISIONAL',r32ProvisionalStatus:'READY',provisional:{...base.provisional,
  asOf:record.asOf,points:[...indexed.values()].sort((a,b)=>a.date.localeCompare(b.date))},
  provisionalMethodologyByTheme:{...base.provisionalMethodologyByTheme,
   ...Object.fromEntries(record.themes.map(t=>[t.theme,{methodologyVersion:record.methodologyVersion,
    sourcePriceMode:record.sourcePriceMode,sourceVersion:record.sourceVersion,
    confirmedDate:record.confirmedObservationDate,latestDate:record.observationDate,
    etfs:t.points.at(-1).etfs,missingEtfs:t.points.at(-1).missingEtfs}]))}};
}
