import test from 'node:test';
import assert from 'node:assert/strict';
import {R88_KEY,R88_VERSION,R88_PRICE_MODE,R88_PUBLIC_ROSTER,validNineR88,addVerifiedNineR88} from '../worker/theme-nine-r88-provisional.mjs';
import {THEME_NINE_R37_METHOD,THEME_NINE_R37_VERSION,THEME_NINE_R37_ROSTER_SHA} from '../worker/theme-nine-r37-public.mjs';
const now=Date.parse('2026-10-30T07:00:00Z'),stamp=new Date(now-1000).toISOString();
export function fixture(){
 const history=Array.from({length:252},(_,i)=>({date:new Date(Date.parse('2026-10-28T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10),score:50}));
 const themes=R88_PUBLIC_ROSTER.map(t=>({theme:t.theme,etfs:[...t.etfs],score:50,history:structuredClone(history)}));
 themes.push({theme:'우주·위성',score:40,history:structuredClone(history),etfs:['UFO','NASA','WARP','ROKT']});
 themes.push({theme:'데이터센터·전력',score:10,history:structuredClone(history),etfs:['DTCR','GRID']});
 const base={status:'READY',phase:'PROVISIONAL',modelRevision:THEME_NINE_R37_VERSION,methodologyVersion:THEME_NINE_R37_METHOD,
  confirmedObservationDate:'2026-10-28',observationDate:'2026-10-28',themes,
  provisional:{points:[{date:'2026-10-29',scores:Object.fromEntries(themes.map(t=>[t.theme,12]))}]}};
 const all=[...new Set(R88_PUBLIC_ROSTER.flatMap(t=>t.etfs))];
 const record={status:'READY',version:R88_VERSION,phase:'PROVISIONAL',methodologyVersion:THEME_NINE_R37_METHOD,
  sourcePriceMode:R88_PRICE_MODE,rosterSha256:THEME_NINE_R37_ROSTER_SHA,publicationAuthorized:true,
  derivedOnlyNoRaw:true,confirmedReplayVerified:true,sourcePriceReconciled:false,individualStocksUsed:0,
  confirmedObservationDate:'2026-10-28',observationDate:'2026-10-29',sourceVersion:'1'.repeat(64),
  baselineManifestSha256:'2'.repeat(64),deltaManifestSha256:'3'.repeat(64),officialAumEvidenceSha256:'4'.repeat(64),
  sourceStoredAt:stamp,asOf:stamp,sourceFiles:[{date:'2026-10-28',sha256:'5'.repeat(64)},{date:'2026-10-29',sha256:'6'.repeat(64)}],
  overlapPriceDifferences:Object.fromEntries([...all,'SPY'].map(s=>[s,.001])),
  aumAsOf:Object.fromEntries(all.map(s=>[s,'2026-10-26'])),
  themes:R88_PUBLIC_ROSTER.map(t=>({theme:t.theme,approvedEtfs:[...t.etfs],confirmedScore:50,
   points:[{date:'2026-10-29',score:60,etfs:t.etfs.slice(0,3),missingEtfs:t.etfs.slice(3),
    weightsPercent:Object.fromEntries(t.etfs.slice(0,3).map(s=>[s,100/3]))}]}))};
 return {base,record};
}
const dbFor=(record)=>({prepare(){return {bind(key){assert.equal(key,R88_KEY);return {async first(){return {body:JSON.stringify(record),stored_at:now-1000};}};}};}});
test('R88 overlays real provisional points without changing confirmed histories or optional themes',async()=>{
 const {base,record}=fixture(),copy=structuredClone(base);
 assert.equal(validNineR88(record,base,{now,storedAt:now}),true);
 const result=await addVerifiedNineR88(dbFor(record),base,{now});
 assert.deepEqual(base,copy);assert.strictEqual(result.themes,base.themes);
 assert.equal(result.confirmedObservationDate,'2026-10-28');
 for(const t of R88_PUBLIC_ROSTER)assert.equal(result.provisional.points[0].scores[t.theme],60);
 assert.equal(result.provisional.points[0].scores['우주·위성'],12);
 assert.equal(result.provisional.points[0].scores['데이터센터·전력'],12);
 assert.equal(Object.hasOwn(result.provisional.points[0].scores,'AI·반도체'),false);
 assert.equal(result.provisionalMethodologyByTheme['핀테크'].sourcePriceMode,R88_PRICE_MODE);
});
test('R88 rejects changed confirmation anchor and legacy-model base',()=>{
 const {base,record}=fixture();base.themes[0].score=51;
 assert.equal(validNineR88(record,base,{now}),false);
 const next=fixture();next.base.modelRevision='LEGACY';assert.equal(validNineR88(next.record,next.base,{now}),false);
});
test('R88 rejects source mismatch, stale/future evidence, fake coverage and pair fallback',()=>{
 const changes=[r=>r.sourcePriceMode='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',r=>r.sourceFiles[1].sha256='bad',
  r=>r.overlapPriceDifferences.SPY=.051,r=>r.asOf='2026-10-31T00:00:00Z',
  r=>r.sourceStoredAt='2026-10-01T00:00:00Z',r=>r.themes[0].points[0].etfs.pop(),
  r=>r.themes[0].points[0].missingEtfs=[],r=>r.themes[0].points[0].weightsPercent.BOTZ=80,
  r=>r.themes[0].points[0].score=null,r=>r.themes[0].theme='AI·반도체',
  r=>r.themes[0].points[0].date='2026-10-28',r=>r.sourcePriceReconciled=true];
 for(const change of changes){const {base,record}=fixture();change(record);assert.equal(validNineR88(record,base,{now}),false);}
});
test('R88 missing sidecar keeps confirmation and optional scores but never falls back to legacy core provisional',async()=>{
 const {base}=fixture();const result=await addVerifiedNineR88({prepare(){throw Error('missing');}},base,{now});
 assert.strictEqual(result.themes,base.themes);
 assert.equal(result.r32ProvisionalStatus,'PENDING');
 for(const t of R88_PUBLIC_ROSTER)assert.equal(Object.hasOwn(result.provisional.points[0].scores,t.theme),false);
 assert.equal(result.provisional.points[0].scores['우주·위성'],12);
 assert.equal(result.provisional.points[0].scores['데이터센터·전력'],12);
 assert.equal(base.provisional.points[0].scores['핀테크'],12);
 assert.equal(result.r32ProvisionalReaderVersion,R88_VERSION);
});
