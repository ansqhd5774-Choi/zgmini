import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleConfiguredPublic,readConfiguredThemes} from '../worker/theme-configured-public.mjs';

const now=Date.parse('2026-10-29T04:00:00Z');
const record={version:'ZGMINI_CONFIGURED_THEME_PUBLIC_V1',status:'READY',
 themeId:'fixture-safe',theme:'안전한 테마',etfs:['AAA','BBB'],benchmark:'SPY',
 methodologyVersion:'ADAPTIVE_R2_PAIR_R3',
 definitionSha256:'a'.repeat(64),candidateSha256:'b'.repeat(64),
 approvalSha256:'c'.repeat(64),
 sourceVersion:'GMH_MANIFEST_SHA256_'+'d'.repeat(64),
 sourceStoredAt:'2026-10-29T02:00:00.000Z',
 publishedAt:'2026-10-29T03:00:00.000Z',
 observationDate:'2026-10-28',score:54,
 derivedOnlyNoRaw:true,publicationAuthorized:true,
 publicationAuthorizationBasis:'LOCAL_OPERATOR_ATTESTATION_NOT_INDEPENDENT_LEGAL_VERIFICATION',
 history:[{date:'2026-10-27',score:null,status:'INSUFFICIENT_OR_UNAPPROVED_PAIR',weights:null},
  {date:'2026-10-28',score:54,status:'ADAPTIVE_PROVISIONAL',
   weights:{first:.5,second:.5,firstEffectiveSessions:377,secondEffectiveSessions:377,
    method:'R3_APPROVED_BOTH_R188_COMPATIBLE_50_50'}}]};
const key='theme-configured:fixture-safe';
function database(rows=[]){
 const calls=[];
 return {calls,prepare(sql){
  calls.push(sql);
  return {bind(cursor){return {async all(){return {results:rows.filter(r=>r.feed_key>cursor).sort((a,b)=>a.feed_key.localeCompare(b.feed_key)).slice(0,200)};}};}};
 }};
}
const row=(value=record,feedKey=key,at=now-1000)=>({
 feed_key:feedKey,body:JSON.stringify(value),stored_at:at});
const load=async db=>{const r=await readConfiguredThemes(db,{now});
 return {response:r,body:await r.json()};};

test('separate opt-in reader exposes only whitelisted derived fields',async()=>{
 const db=database([row({...record,rawPrices:[123],apiToken:'FORBIDDEN'})]);
 const {response,body}=await load(db);
 assert.equal(response.status,200);assert.equal(body.status,'READY');
 assert.equal(body.themes.length,1);
 assert.deepEqual(Object.keys(body.themes[0]),[
  'id','theme','etfs','methodologyVersion','observationDate','sourceStoredAt','score','history']);
 assert.equal(body.themes[0].history[0].score,null);
 assert.equal(JSON.stringify(body).includes('rawPrices'),false);
 assert.equal(JSON.stringify(body).includes('apiToken'),false);
 assert.equal(db.calls.length,1);
 assert.match(db.calls[0],/public_feed_snapshots_v1/);
 assert.doesNotMatch(db.calls[0],/INSERT|UPDATE|DELETE/);
});
test('unapproved, stale and changed-identity records are individually skipped',async()=>{
 const db=database([row(record),row({...record,publicationAuthorized:false},'theme-configured:nope'),
  row({...record,observationDate:'2026-10-15'},'theme-configured:old'),
  row({...record,definitionSha256:'not-a-hash'},'theme-configured:bad')]);
 const {body}=await load(db);
 assert.equal(body.status,'READY');assert.equal(body.themes.length,1);
 assert.equal(body.themes[0].id,'fixture-safe');
});
test('no published themes stays PENDING, not a legacy-feed failure',async()=>{
 const {response,body}=await load(database());
 assert.equal(response.status,200);assert.equal(body.status,'PENDING');
 assert.deepEqual(body.themes,[]);
});
test('all invalid or unpublished records return empty safe response',async()=>{
 const {body}=await load(database([row({...record,publicationAuthorized:false})]));
 assert.equal(body.status,'UNAVAILABLE');assert.deepEqual(body.themes,[]);
});
test('unknown D1 read error remains 503, never fabricates a score',async()=>{
 const db={prepare(){return {all(){throw Error('D1 unavailable');}};}};
 const {response,body}=await load(db);
 assert.equal(response.status,503);assert.equal(body.status,'UNAVAILABLE');
 assert.equal(body.reason,'STORED_READ_UNAVAILABLE');
});
test('future source, missing approval or wrong key are invalid',()=>{
 assert.equal(eligibleConfiguredPublic(record,key,now-1000,now),true);
 assert.equal(eligibleConfiguredPublic(record,'public:theme-etf-only:r1',now-1000,now),false);
 assert.equal(eligibleConfiguredPublic({...record,publishedAt:'2026-10-30T00:00:00Z'},key,now-1000,now),false);
 assert.equal(eligibleConfiguredPublic({...record,approvalSha256:null},key,now-1000,now),false);
});

test('all pages are read beyond 200 themes without a total cap',async()=>{
 const rows=Array.from({length:501},(_,i)=>{const id='theme-'+String(i).padStart(4,'0');return row({...record,themeId:id,theme:id},'theme-configured:'+id);});
 const db=database(rows);const {body}=await load(db);
 assert.equal(body.themes.length,501);assert.equal(db.calls.length,3);
 assert.equal(new Set(body.themes.map(t=>t.id)).size,501);
});

test('nonadvancing page fails closed instead of infinite loop or partial success',async()=>{
 const rows=Array.from({length:200},(_,i)=>row(record,'theme-configured:'+i));
 const db={prepare(){return {bind(){return {async all(){return {results:rows};}};}};}};
 const {response,body}=await load(db);assert.equal(response.status,503);assert.deepEqual(body.themes,[]);
});
