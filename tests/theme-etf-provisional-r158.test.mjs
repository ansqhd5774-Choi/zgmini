import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validThemeEtfProvisional,THEME_ETF_PROVISIONAL_KEY} from '../lib/market-score/theme-etf-provisional.mjs';
import {readThemeEtfOnly,THEME_ETF_ONLY_PAIRS,THEME_ETF_ONLY_PUBLIC_VERSION,THEME_ETF_ONLY_METHOD} from '../worker/theme-etf-only-public.mjs';
import {themeEtfDashboardSeries} from '../lib/theme-etf-dashboard.mjs';
const now=Date.parse('2026-10-21T04:00:00Z');
const tradingDates=Array.from({length:252},(_,i)=>new Date(Date.UTC(2025,9,16)+i*86400000).toISOString().slice(0,10));
const confirmation='2026-10-16';
function makeConfirmed(){
 const days=Array.from({length:252},(_,i)=>({date: new Date(Date.parse(confirmation+'T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10),score:42}));
 return {status:'READY',version:THEME_ETF_ONLY_PUBLIC_VERSION,methodologyVersion:THEME_ETF_ONLY_METHOD,
  publicationAuthorized:true,upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,individualStocksUsed:0,
  scoreMethod:'ETF_ONLY_PROXY',sourcePriceMode:'UNADJUSTED_HOURLY_CLOSE_PROXY_DISCLOSED',
  sourceVersion:'confirmed-test',sourceStoredAt:'2026-10-20T10:00:00Z',publishedAt:'2026-10-20T11:00:00Z',
  observationDate:confirmation,weights:{trend:.4,relativeStrength:.2,volatility:.4},pairWeight:.5,
  themes:THEME_ETF_ONLY_PAIRS.map(p=>({...p,history:days.map(d=>({...d})),latestScore:42}))};
}
function makeProvisional(){
 return {status:'READY',phase:'PROVISIONAL',methodologyVersion:THEME_ETF_ONLY_METHOD,individualStocksUsed:0,
  publicationAuthorized:true,upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,sourcePriceReconciled:true,
  sourceName:'LICENSED_VALIDATED_FEED',sourceVersion:'two-day-input-v1',
  confirmedObservationDate:confirmation,observationDate:'2026-10-20',asOf:'2026-10-21T03:00:00Z',sourceStoredAt:'2026-10-21T03:10:00Z',
  coverage:{etfs:13,benchmark:'SPY',complete:true},
  points:['2026-10-19','2026-10-20'].map((date,i)=>({date,scores:Object.fromEntries(THEME_ETF_ONLY_PAIRS.map(t=>[t.theme,42+i+1]))}))};
}
const store=(provisional)=>({readOutput:async key=>{assert.equal(key,THEME_ETF_PROVISIONAL_KEY);return provisional?{body:provisional,storedAt:now-1000}:null;}});
const db=(confirmed)=>({prepare:sql=>{assert.match(sql,/market_public_snapshots_v1/);return {bind:()=>({first:async()=>({body:JSON.stringify(confirmed),stored_at:now-3000})})}}});
test('R158 reads licensed 2-day score output without mutating original 252 days',async()=>{
 const base=makeConfirmed(),provisional=makeProvisional();
 assert.equal(validThemeEtfProvisional(provisional,confirmation,{now,themes:base.themes}),true);
 const res=await readThemeEtfOnly(db(base),{now,store:store(provisional)});
 assert.equal(res.status,200);
 const body=await res.json();
 assert.equal(body.phase,'PROVISIONAL');
 assert.equal(body.themes.length,7);
 assert.equal(body.themes[0].history.length,252);
 assert.equal(body.themes[0].score,42);
 assert.equal(body.provisional.points.length,2);
 assert.deepEqual(body.provisional.points.map(x=>x.date),['2026-10-19','2026-10-20']);
 assert.equal('sourceName' in body.provisional,false);
 const projected=themeEtfDashboardSeries(body);
 assert.equal(projected.series.length,7);
 assert.equal(projected.data.length,254);
 assert.equal(projected.data.at(-3).provisional,undefined);
 assert.equal(projected.data.at(-2).provisional,true);
 assert.equal(projected.data.at(-1)['로봇·자동화'],44);
});
test('R158 never accepts unauthorized, incomplete, misdated or excessive observations',()=>{
 const base=makeConfirmed(),o=makeProvisional();
 const candidates=[
  {...o,publicationAuthorized:false},
  {...o,upstreamCommercialRightsVerified:false},
  {...o,sourcePriceReconciled:false},
  {...o,coverage:{...o.coverage,complete:false}},
  {...o,points:[...o.points,...o.points]},
  {...o,points:[o.points[0],{...o.points[1],date:'2026-10-19'}]},
  {...o,confirmedObservationDate:'2026-10-15'},
  {...o,points:[o.points[0],{...o.points[1],scores:{'로봇·자동화':44}}]},
  {...o,asOf:'2026-10-22T03:00:00Z'},
 ];
 for(const candidate of candidates)assert.equal(validThemeEtfProvisional(candidate,confirmation,{now,themes:base.themes}),false);
});
test('R158 falls back to exact confirmed response when 2-day output missing or unapproved',async()=>{
 const confirmed=makeConfirmed();
 for(const candidate of [null,{...makeProvisional(),publicationAuthorized:false}]){
  const res=await readThemeEtfOnly(db(confirmed),{now,store:store(candidate)});
  assert.equal(res.status,200);
  const result=await res.json();
  assert.equal(result.phase,'CONFIRMED');
  assert.equal(result.provisional,undefined);
  assert.equal(themeEtfDashboardSeries(result).data.length,252);
 }
});
test('R158 refuses an incomplete appended point rather than inventing a score',()=>{
 const confirmed=makeConfirmed();
 const projected={status:'READY',phase:'PROVISIONAL',observationDate:confirmation,
  themes:confirmed.themes.map(t=>({theme:t.theme,score:42,history:t.history})),
  provisional:{points:[{date:'2026-10-19',scores:Object.fromEntries(THEME_ETF_ONLY_PAIRS.map(t=>[t.theme,43]))},
    {date:'2026-10-20',scores:{'로봇·자동화':44}}]}};
 const p=themeEtfDashboardSeries(projected);
 assert.equal(p.data.length,252);
 assert.equal(p.series.length,7);
});
test('provisional chart isolates the extension and labels only an actual provisional interval',()=>{
 const chart=fs.readFileSync('components/sector-sentiment-chart.tsx','utf8');
 assert.match(chart,/const hasProvisional=firstProvisional>0;/);
 assert.match(chart,/id\+'__solid'/);
 assert.match(chart,/id\+'__dash'/);
 assert.match(chart,/strokeDasharray="4 5"/);
 assert.match(chart,/hasProvisional\?\[/);
 assert.match(chart,/hasProvisional&&<small/);
 assert.match(chart,/잠정 · 점선 구간/);
});
