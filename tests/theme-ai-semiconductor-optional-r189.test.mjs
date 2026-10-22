import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleAiTheme,addVerifiedAiTheme,AI_THEME_PUBLIC_VERSION,AI_THEME_PUBLIC_KEY} from '../worker/theme-ai-semiconductor-optional.mjs';
const now=Date.parse('2026-10-22T03:00:00Z');
const dates=Array.from({length:252},(_,i)=>new Date(Date.UTC(2025,9,16+i)).toISOString().slice(0,10));
function base(provisional=false){return {status:'READY',methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',observationDate:dates.at(-1),phase:provisional?'PROVISIONAL':'CONFIRMED',themes:Array.from({length:7},(_,i)=>({theme:'theme '+i,etfs:['BOTZ','ROBO'],score:50,history:dates.map(date=>({date,score:50}))})),...(provisional?{provisional:{points:[{date:'2026-10-19',scores:Object.fromEntries(Array.from({length:7},(_,i)=>['theme '+i,60]))}]}}:{})};}
function approved(b){return {status:'READY',version:AI_THEME_PUBLIC_VERSION,phase:b.phase,theme:'AI 반도체',etfs:['SMH','SOXX'],methodologyVersion:b.methodologyVersion,scoreMethod:'ETF_ONLY_PROXY',individualStocksUsed:0,sourcePriceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',sourceStoredAtKind:'VERIFIED_LOCAL_MARKET_BARS',sourceVersion:'RECONCILED_R189_FIXTURE',sourceStoredAt:'2026-10-21T12:00:00Z',publishedAt:'2026-10-21T13:00:00Z',asOf:'2026-10-21T13:00:00Z',publicationAuthorized:true,upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,localBarsVerified:true,sourcePriceReconciled:true,observationDate:b.observationDate,score:25.5,history:dates.map(date=>({date,score:25.5})),...(b.phase==='PROVISIONAL'?{provisional:{points:[{date:'2026-10-19',score:28}]}}:{})};}
function db(value){return{prepare(sql){assert.match(sql,/^SELECT /);return{bind(key){assert.equal(key,AI_THEME_PUBLIC_KEY);return{first:async()=>value&&({body:JSON.stringify(value),stored_at:now-1000})}}}}};}
test('R189 private/unverified R188 type cannot become public',async()=>{
 const b=base(),p={...approved(b),status:'PRIVATE_SHADOW_NOT_PUBLIC',publicationAuthorized:false,sourcePriceReconciled:false,derivedLicenseVerified:false};
 assert.equal(eligibleAiTheme(p,b,{now,storedAt:now-1000}),false);
 assert.strictEqual(await addVerifiedAiTheme(db(p),b,{now}),b);
});
test('R189 adds exactly one independently validated 252-session derived-only theme',async()=>{
 const b=base(),p=approved(b);
 assert.equal(eligibleAiTheme(p,b,{now,storedAt:now-1000}),true);
 p.history[0].rawPrice=123;p.privateBars=[101];
 const output=await addVerifiedAiTheme(db(p),b,{now});
 assert.equal(output.themes.length,8);assert.equal(b.themes.length,7);
 assert.deepEqual(output.themes.slice(0,7),b.themes);
 assert.equal(output.themes[7].score,25.5);
 assert.equal(output.themes[7].history.length,252);
 assert.equal(JSON.stringify(output).includes('rawPrice'),false);
 assert.equal(JSON.stringify(output).includes('privateBars'),false);
});
test('R189 bad rights, dates, prices, source timestamp or stale scores preserve seven',async()=>{
 const b=base(),p=approved(b);
 for(const bad of [{...p,derivedLicenseVerified:false},{...p,sourcePriceReconciled:false},{...p,publicationAuthorized:false},{...p,sourceStoredAtKind:'LOCAL_R187_RAW_FILE_MTIME_NOT_PROVIDER_TIMESTAMP'},{...p,etfs:['SOXX','SMH']},{...p,history:p.history.slice(1)},{...p,score:24},{...p,asOf:'2026-10-01T13:00:00Z'}]){
  assert.equal(eligibleAiTheme(bad,b,{now,storedAt:now-1000}),false);
  assert.strictEqual(await addVerifiedAiTheme(db(bad),b,{now}),b);
 }
});
test('R189 missing sidecar/read failure does not block seven',async()=>{
 const b=base();assert.strictEqual(await addVerifiedAiTheme(db(null),b,{now}),b);
 assert.strictEqual(await addVerifiedAiTheme({prepare(){throw Error('D1 inaccessible');}},b,{now}),b);
});
test('R189 provisional values are complete or excluded to preserve seven original provisional points',async()=>{
 const b=base(true),p=approved(b),yes=await addVerifiedAiTheme(db(p),b,{now});
 assert.equal(yes.themes.length,8);
 assert.equal(yes.provisional.points[0].scores['AI 반도체'],28);
 p.provisional.points=[];
 assert.strictEqual(await addVerifiedAiTheme(db(p),b,{now}),b);
});
