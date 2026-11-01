import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleBiotechTheme,addVerifiedBiotechTheme,BIOTECH_THEME_PUBLIC_KEY,BIOTECH_THEME_PUBLIC_VERSION} from '../worker/theme-biotech-optional.mjs';

const now=Date.parse('2026-10-22T18:00:00Z');
const dates=[];
for(let ts=Date.UTC(2026,9,19);dates.length<252;ts-=86400000){
 const d=new Date(ts);if(d.getUTCDay()!==0&&d.getUTCDay()!==6)dates.unshift(d.toISOString().slice(0,10));
}
const method='ETF_ONLY_T40_R20_V40_PAIR50';
const point=date=>({date,score:42.5});
const base=(provisional=false)=>({status:'READY',methodologyVersion:method,observationDate:dates.at(-1),
 phase:provisional?'PROVISIONAL':'CONFIRMED',
 themes:Array.from({length:8},(_,i)=>({theme:i===7?'AI 반도체':'theme '+i,
  etfs:i===7?['SMH','SOXX']:['BOTZ','ROBO'],score:50,history:dates.map(date=>({date,score:50}))})),
 ...(provisional?{provisional:{points:[{date:'2026-10-20',scores:Object.fromEntries(Array.from({length:8},(_,i)=>[i===7?'AI 반도체':'theme '+i,60]))}]}}:{})});
function approved(b){return {status:'READY',version:BIOTECH_THEME_PUBLIC_VERSION,theme:'바이오테크',
 etfs:['IBB','XBI'],referenceSymbol:'SPY',methodologyVersion:method,scoreMethod:'ETF_ONLY_PROXY',
 individualStocksUsed:0,sourcePriceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',
 priceSessions:701,sourceStoredAtKind:'LOCAL_BIOTECH_RAW_FILE_MTIME_NOT_PROVIDER_TIMESTAMP',
 sourceTimestampBasis:'FILE_MTIME_NOT_PROVIDER_TIMESTAMP',sourceVersion:'BIOTECH_R1_SHA256_'+('a'.repeat(64)),
 sourceFileSha256:'a'.repeat(64),sourceStoredAt:'2026-10-22T08:30:00Z',asOf:'2026-10-22T09:00:00Z',publishedAt:'2026-10-22T09:00:00Z',
 publicationAuthorized:true,upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,localBarsVerified:true,sourcePriceReconciled:true,
 observationDate:b.observationDate,phase:b.phase,score:42.5,history:dates.map(point),
 ...(b.phase==='PROVISIONAL'?{provisional:{points:[{date:'2026-10-20',score:44}]}}:{})};}
function db(record){return {prepare(sql){assert.match(sql,/^SELECT /);return {bind(key){assert.equal(key,BIOTECH_THEME_PUBLIC_KEY);
 return {first:async()=>record?{body:JSON.stringify(record),stored_at:now-1000}:null}}}}};}

test('R1 only an explicitly approved, reconciled, derived 252-point biotechnology sidecar is added',async()=>{
 const b=base(),p=approved(b);
 assert.equal(eligibleBiotechTheme(p,b,{now,storedAt:now-1000}),true);
 p.history[0].rawPrice=123;p.privateBars=[123];
 const out=await addVerifiedBiotechTheme(db(p),b,{now});
 assert.equal(out.themes.length,9);
 assert.deepEqual(out.themes.slice(0,8),b.themes);
 assert.equal(out.themes[8].theme,'바이오·신약');
 assert.equal(p.theme,'바이오테크');
 assert.equal(out.themes[8].history.length,252);
 assert.ok(!JSON.stringify(out).includes('rawPrice'));
 assert.ok(!JSON.stringify(out).includes('privateBars'));
});
test('R1 rejects unverified source, private status, changed contracts or stale data',()=>{
 const b=base(),p=approved(b);
 const bad=[{...p,status:'PRIVATE_SHADOW_NOT_PUBLIC'},{...p,publicationAuthorized:false},
  {...p,derivedLicenseVerified:false},{...p,sourcePriceReconciled:false},
  {...p,sourceFileSha256:'b'.repeat(64)},{...p,sourcePriceMode:'ADJUSTED_DAILY_CLOSE'},
  {...p,priceSessions:300},{...p,etfs:['XBI','IBB']},
  {...p,history:p.history.slice(1)},{...p,score:41},
  {...p,sourceStoredAt:'2026-10-01T00:00:00Z'}];
 for(const row of bad)assert.equal(eligibleBiotechTheme(row,b,{now,storedAt:now-1000}),false);
});
test('R1 owner-authorized limited validation discloses unsettled anonymous rights; no false verified flags',async()=>{
 const b=base(),p={...approved(b),upstreamCommercialRightsVerified:false,derivedLicenseVerified:false,
  sourcePriceReconciled:false,rightsBasis:'OFFICIAL_TERMS_DERIVED_WORKS_ANONYMOUS_SCOPE_UNCONFIRMED',
  sourceTermsUrl:'https://getmarkethistory.com/docs/terms',anonymousScopeIndependentlyConfirmed:false,
  licensingRiskAcceptedByPublisher:true,priceValidationBasis:'R3_703_R4_R158_EXACT_R5_ISSUER_3_OF_3',
  issuerSpotChecksPassed:3,fullHistoryIndependentlyReconciled:false,derivedOnlyNoRaw:true};
 assert.equal(eligibleBiotechTheme(p,b,{now,storedAt:now-1000}),true);
 const out=await addVerifiedBiotechTheme(db(p),b,{now});
 assert.equal(out.themes.length,9);
 assert.deepEqual(out.themes.slice(0,8),b.themes);
 for(const invalid of [{...p,licensingRiskAcceptedByPublisher:false},
  {...p,rightsBasis:'UNKNOWN'},{...p,issuerSpotChecksPassed:2},
  {...p,derivedOnlyNoRaw:false},{...p,anonymousScopeIndependentlyConfirmed:true}]){
  assert.equal(eligibleBiotechTheme(invalid,b,{now,storedAt:now-1000}),false);
 }
});
test('R1 requires all eight live themes, aligned time series, and matched provisional points',async()=>{
 const b=base(true),p=approved(b),yes=await addVerifiedBiotechTheme(db(p),b,{now});
 assert.equal(yes.themes.length,9);
 assert.equal(yes.provisional.points[0].scores['바이오·신약'],44);
 assert.equal(Object.hasOwn(yes.provisional.points[0].scores,'바이오테크'),false);
 assert.equal(eligibleBiotechTheme({...p,provisional:{points:[]}},b,{now,storedAt:now-1000}),false);
 assert.equal(eligibleBiotechTheme(p,{...b,themes:b.themes.slice(0,7)},{now,storedAt:now-1000}),false);
 assert.equal(eligibleBiotechTheme(p,{...b,observationDate:'2026-10-21'},{now,storedAt:now-1000}),false);
});
test('R1 never blocks previously published themes if missing, invalid, or DB-read unavailable',async()=>{
 const b=base();
 assert.strictEqual(await addVerifiedBiotechTheme(db(null),b,{now}),b);
 assert.strictEqual(await addVerifiedBiotechTheme(db({...approved(b),derivedLicenseVerified:false}),b,{now}),b);
 assert.strictEqual(await addVerifiedBiotechTheme({prepare(){throw Error('unavailable')}},b,{now}),b);
});
