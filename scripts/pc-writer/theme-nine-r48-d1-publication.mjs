// R48 isolated D1 write gate. Caller supplies existing Cloudflare D1 adapter
// and a live public read-model; no secrets, network or PC-task assumptions here.
import {eligibleNineR37,THEME_NINE_R37_KEY} from '../../worker/theme-nine-r37-public.mjs';

const READ="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
const INSERT="INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO NOTHING";
const UPDATE="UPDATE public_feed_snapshots_v1 SET body=?,stored_at=? WHERE kind='output' AND feed_key=? AND snapshot_key='current' AND stored_at=? AND body=?";
const fail=code=>{throw Object.assign(new Error('THEME_NINE_R48_'+code),{code:'THEME_NINE_R48_'+code});};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hashes=['rawManifestSha256','r25InputSha256','shadowSha256',
  'officialAumEvidenceSha256','baselineManifestSha256'];
const LEGACY_PROVISIONAL='EXISTING_PUBLIC_PROVISIONAL_AS_PUBLISHED';
const rebaseOnlyFields=new Set([
  'provisional','provisionalLineage','candidateFileSha256',
  'publishedAt','sourceStoredAt',
]);
const immutableSameDay=record=>Object.fromEntries(Object.entries(record)
  .filter(([key])=>!rebaseOnlyFields.has(key)));

export async function publishNineR48D1({query,record,publicBase,now=Date.now(),
  expectedStoredAt=null}={}){
  if(typeof query!=='function'||!Number.isSafeInteger(now)||now<=0)
    fail('D1_ADAPTER_OR_CLOCK');
  // The live public feed must be supplied by the caller. Never synthesize
  // it from a local private candidate to circumvent same-day/phase checks.
  if(!eligibleNineR37(record,publicBase,{now,storedAt:now}))
    fail('PUBLICATION_EVIDENCE_OR_BASE_NOT_READY');
  if(record.sourceContract==='THEME_NINE_R47_PRIVATE_RECURRING_NINE_THEME_SHADOW_V1'&&
    (!hashes.every(k=>/^[a-f0-9]{64}$/.test(record[k]))||
     !Array.isArray(record.themes)||record.themes.length!==9))
    fail('R47_MANIFEST_EVIDENCE');
  const select=async()=>{
    const r=await query(READ,[THEME_NINE_R37_KEY],{write:false});
    const row=r?.results?.[0];
    if(!row)return null;
    if(typeof row.body!=='string'||!Number.isSafeInteger(Number(row.stored_at)))
      fail('D1_ROW_INVALID');
    let body;try{body=JSON.parse(row.body);}catch{fail('D1_ROW_INVALID');}
    return {body,raw:row.body,storedAt:Number(row.stored_at)};
  };
  const before=await select();
  if((before?.storedAt??null)!==expectedStoredAt)fail('D1_CAS_EXPECTED_STAMP');
  if(before){
    if(before.body.version!==record.version||
       before.body.methodologyVersion!==record.methodologyVersion||
       before.body.rosterSha256!==record.rosterSha256||
       before.body.sourcePriceMode!==record.sourcePriceMode||
       !same(before.body.themes.map(t=>({theme:t.theme,etfs:t.etfs})),
         record.themes.map(t=>({theme:t.theme,etfs:t.etfs})))||
       before.body.observationDate>record.observationDate)
      fail('D1_CONTRACT_OR_NEWER_PRESERVED');
    for(let i=0;i<9;i++){
      const old=new Map(before.body.themes[i].history.map(p=>[p.date,p.score]));
      if(!record.themes[i].history.some(p=>old.has(p.date))||
         record.themes[i].history.some(p=>old.has(p.date)&&old.get(p.date)!==p.score))
        fail('D1_PRIOR_HISTORY_IMMUTABLE');
    }
    if(before.body.observationDate===record.observationDate){
      if(!same(before.body.themes,record.themes))fail('D1_SAME_DATE_REWRITE_DENIED');
      // A separately approved optional theme may publish a later provisional
      // sidecar WITHOUT changing this day's 252-session R32 confirmed history.
      // Old R37 then ceases to match the public base byte-for-byte. Rebase
      // ONLY the already-approved PUBLIC_LEGACY_AS_IS provisional lineage;
      // no same-date confirmed score, formula, raw source, rights or roster
      // changes can pass. Both dates and scores are re-verified by R37 above.
      if(same(before.body.provisional,record.provisional))
        return {status:'UNCHANGED',written:0,storedAt:before.storedAt};
      if(before.body.provisionalLineage?.source!==LEGACY_PROVISIONAL||
         record.provisionalLineage?.source!==LEGACY_PROVISIONAL||
         !same(immutableSameDay(before.body),immutableSameDay(record)))
        fail('D1_SAME_DATE_REBASE_SCOPE_DENIED');
    }
  }
  if(now<=(before?.storedAt??0))fail('D1_CLOCK_NOT_MONOTONIC');
  const encoded=JSON.stringify(record);
  const out=before?await query(UPDATE,[encoded,now,THEME_NINE_R37_KEY,
    before.storedAt,before.raw],{write:true}):
    await query(INSERT,[THEME_NINE_R37_KEY,encoded,now],{write:true});
  if(out?.meta?.changes!==1)fail('D1_CAS_NOT_APPLIED');
  const after=await select();
  if(after?.storedAt!==now||after.raw!==encoded)fail('D1_READBACK_MISMATCH');
  return {status:'WRITTEN_AND_READBACK_VERIFIED',written:1,
    storedAt:now,observationDate:record.observationDate,
    key:THEME_NINE_R37_KEY};
}
