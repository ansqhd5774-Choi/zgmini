import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateThemeEtfOnlyPublic,readThemeEtfOnly,THEME_ETF_ONLY_PAIRS,THEME_ETF_ONLY_PUBLIC_KEY,THEME_ETF_ONLY_PUBLIC_VERSION,THEME_ETF_ONLY_METHOD} from '../worker/theme-etf-only-public.mjs';
const now=Date.parse('2026-10-20T12:00:00Z');
function make(){
 const history=Array.from({length:252},(_,i)=>({date:new Date(Date.parse('2026-10-16T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10),score:42}));
 return {version:THEME_ETF_ONLY_PUBLIC_VERSION,status:'READY',methodologyVersion:THEME_ETF_ONLY_METHOD,
  publicationAuthorized:true,upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,individualStocksUsed:0,
  scoreMethod:'ETF_ONLY_PROXY',sourcePriceMode:'UNADJUSTED_HOURLY_CLOSE_PROXY_DISCLOSED',
  weights:{trend:.4,relativeStrength:.2,volatility:.4},pairWeight:.5,
  sourceVersion:'R145-RESEARCH-SOURCE',sourceStoredAt:'2026-10-20T10:00:00Z',publishedAt:'2026-10-20T11:00:00Z',observationDate:'2026-10-16',
  themes:THEME_ETF_ONLY_PAIRS.map(p=>({...p,latestScore:42,history:history.map(h=>({...h}))}))};
}
const store=row=>({prepare(sql){assert.match(sql,/^SELECT body,stored_at FROM market_public_snapshots_v1/);return {bind(key){assert.equal(key,THEME_ETF_ONLY_PUBLIC_KEY);return {first:async()=>row}}}}});
test('R145 private score is not directly public eligible',()=>{
 const x=make();x.status='PRIVATE_252_RESEARCH_READY_NO_PUBLICATION';x.publicationAuthorized=false;
 assert.equal(validateThemeEtfOnlyPublic(x),false);
});
test('requires source rights, publication approval, and unchanged 40:20:40 and ETF identities',()=>{
 const x=make();assert.equal(validateThemeEtfOnlyPublic(x),true);
 for(const key of ['upstreamCommercialRightsVerified','derivedLicenseVerified','publicationAuthorized']){
  assert.equal(validateThemeEtfOnlyPublic({...x,[key]:false}),false,key);
 }
 assert.equal(validateThemeEtfOnlyPublic({...x,weights:{...x.weights,trend:.5}}),false);
 assert.equal(validateThemeEtfOnlyPublic({...x,individualStocksUsed:1}),false);
 assert.equal(validateThemeEtfOnlyPublic({...x,themes:x.themes.map((t,i)=>i===0?{...t,etfs:['SPY','ROBO']}:t)}),false);
});
test('reject 251-point, missing, stale, divergent endpoint, out-of-order scores',()=>{
 const x=make();
 const variations=[
  {...x,themes:x.themes.map((t,i)=>i===0?{...t,history:t.history.slice(1)}:t)},
  {...x,themes:x.themes.map((t,i)=>i===0?{...t,history:t.history.map((h,j)=>j===10?{...h,score:null}:h)}:t)},
  {...x,themes:x.themes.map((t,i)=>i===0?{...t,history:[...t.history].reverse()}:t)},
  {...x,themes:x.themes.map((t,i)=>i===0?{...t,latestScore:90}:t)},
 ];
 for(const v of variations)assert.equal(validateThemeEtfOnlyPublic(v),false);
});
test('unapproved snapshot returns 503 and does not call provider',async()=>{
 const x=make();x.upstreamCommercialRightsVerified=false;
 const res=await readThemeEtfOnly(store({body:JSON.stringify(x),stored_at:now}),{now});
 assert.equal(res.status,503);assert.equal((await res.json()).reason,'STORED_DATA_NOT_APPROVED');
});
test('valid authorized stored payload exposes derived history only',async()=>{
 const x=make();x.themes[0].history[0].rawPrice=123;x.themes[0].rawStockData=[1,2];
 const res=await readThemeEtfOnly(store({body:JSON.stringify(x),stored_at:now}),{now});
 assert.equal(res.status,200);const body=await res.json();
 assert.equal(body.themes.length,7);assert.equal(body.themes[0].history.length,252);
 assert.deepEqual(Object.keys(body.themes[0].history[0]),['date','score']);
 assert.equal('rawStockData' in body.themes[0],false);
});
test('no row, stale row and read errors yield unavailable, not empty scores',async()=>{
 const x=make();
 assert.equal((await readThemeEtfOnly(store(null),{now})).status,503);
 assert.equal((await readThemeEtfOnly(store({body:JSON.stringify(x),stored_at:now}),{now:now+10*86400000})).status,503);
 assert.equal((await readThemeEtfOnly({prepare(){throw Error('not ready')}},{now})).status,503);
});
test('route reads stored data, never performs collection, scoring or writes',()=>{
 const route=fs.readFileSync('app/api/theme-fear-greed/route.ts','utf8');
 const client=fs.readFileSync('app/theme-fear-greed/theme-explorer.tsx','utf8');
 assert.match(route,/readThemeEtfOnly\(env\.DB\)/);assert.doesNotMatch(route,/\bfetch\s*\(/);
 assert.match(client,/useStoredIndex<PublicThemeFeed>\('\/api\/theme-fear-greed'\)/);
 assert.match(client,/ETF 전용 3축 연구/);assert.doesNotMatch(client,/ETF 5축 연구 산출/);
});
