import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {THEME_DASHBOARD_SEVEN,themeEtfDashboardSeries} from '../lib/theme-etf-dashboard.mjs';
import {AI_SEMICONDUCTOR_CANDIDATE,reviewAiSemiconductorPrivateCandidate} from '../lib/market-score/theme-ai-semiconductor-r185-readiness.mjs';
import {THEME_ETF_ONLY_PAIRS,validateThemeEtfOnlyPublic} from '../worker/theme-etf-only-public.mjs';

const dates=Array.from({length:252},(_,i)=>new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10));
function seven(){return {status:'READY',observationDate:dates.at(-1),themes:THEME_DASHBOARD_SEVEN.map((t,i)=>({
 theme:t.id,score:40+i,history:dates.map(date=>({date,score:40+i}))
}))};}
function eighth(){return {theme:'AI 반도체',score:51.25,history:dates.map(date=>({date,score:51.25}))};}
function shadow(){return {...eighth(),status:'PRIVATE_SHADOW_NOT_PUBLIC',publicationAuthorized:false,
 etfs:['SMH','SOXX'],methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',scoreMethod:'ETF_ONLY_PROXY',
 individualStocksUsed:0,sourceStoredAt:'2026-10-20T12:00:00Z',sourceVersion:'FIXTURE_R185',
 upstreamCommercialRightsVerified:false,derivedLicenseVerified:false,localBarsVerified:false,sourcePriceReconciled:false};}

test('R185: seven published themes stay unchanged; AI is not manufactured before publication',()=>{
 const s=themeEtfDashboardSeries(seven());
 assert.equal(s.series.length,7);
 assert.deepEqual(s.series.map(t=>t.name),THEME_DASHBOARD_SEVEN.map(t=>t.name));
 assert.equal(s.data.length,252);
 assert.equal(s.data[0]['AI 반도체'],undefined);
});
test('R185: an eighth 252-day READY item is shown as AI·반도체, with canonical source ID',()=>{
 const feed=seven();feed.themes.push(eighth());
 const s=themeEtfDashboardSeries(feed);
 assert.equal(s.series.length,8);
 assert.equal(s.data.length,252);
 assert.deepEqual(s.series.slice(0,7).map(t=>t.color),THEME_DASHBOARD_SEVEN.map(t=>t.color));
 assert.deepEqual(s.series[7],{id:'AI 반도체',name:'AI·반도체',color:'#f97316'});
 assert.equal(s.data.at(-1)['AI 반도체'],51.25);
 feed.themes.reverse();
 assert.deepEqual(themeEtfDashboardSeries(feed).series[0],{id:'AI 반도체',name:'AI·반도체',color:'#f97316'});
});
test('R185: missing or corrupted AI history is rejected without affecting seven existing series',()=>{
 for(const mutate of [
  x=>x.history.pop(),
  x=>x.history[8].score=null,
  x=>x.history[29].date=x.history[28].date,
  x=>x.score=99,
  x=>x.history.reverse(),
 ]){
  const feed=seven(),ai=eighth();mutate(ai);feed.themes.push(ai);
  const s=themeEtfDashboardSeries(feed);
  assert.equal(s.series.length,7);
  assert.equal(s.data.length,252);
  assert.equal(s.data[0]['AI 반도체'],undefined);
 }
});
test('R185: readiness remains private and gated on independent commercial data rights and real aligned local history',()=>{
 const candidate=shadow(),base=seven();
 const pending=reviewAiSemiconductorPrivateCandidate(candidate,{approvedSeven:base});
 assert.equal(pending.candidateReady,true,'test fixture matches a shape, NOT production score verification');
 assert.equal(pending.publicEligible,false);
 assert.equal(pending.status,'PRIVATE_RESEARCH_INCOMPLETE');
 assert(pending.pending.includes('COMMERCIAL_MARKET_DATA_RIGHTS'));
 assert(pending.pending.includes('LOCAL_BAR_COVERAGE_AND_RECONCILIATION'));
 assert(pending.pending.includes('SEPARATE_PUBLICATION_CONTRACT_APPROVAL'));
 assert.equal(pending.providerCalls,0);
 assert.equal(pending.dbWrites,0);
 const spoof={...candidate,upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,localBarsVerified:true,sourcePriceReconciled:true};
 const flagged=reviewAiSemiconductorPrivateCandidate(spoof,{approvedSeven:base});
 assert.equal(flagged.status,'PRIVATE_RESEARCH_READY_NO_PUBLICATION');
 assert.equal(flagged.publicEligible,false,'declarations are not a production publication authorization');
 for(const bad of [
  {...candidate,etfs:['SOXX','SMH']},
  {...candidate,history:candidate.history.slice(1)},
  {...candidate,score:73},
  {...candidate,sourceVersion:''},
  {...candidate,individualStocksUsed:1},
  {...candidate,history:candidate.history.map((p,i)=>i===0?{...p,date:'2020-01-01'}:p)},
 ])assert.equal(reviewAiSemiconductorPrivateCandidate(bad,{approvedSeven:base}).candidateReady,false);
 assert.equal(reviewAiSemiconductorPrivateCandidate(candidate,{approvedSeven:null}).candidateReady,false);
});
test('R185: approved seven-theme reader and ETF-only core formula remain unchanged',()=>{
 assert.equal(THEME_ETF_ONLY_PAIRS.length,7);
 assert.equal(THEME_ETF_ONLY_PAIRS.some(p=>p.theme==='AI 반도체'),false);
 const code=readFileSync('lib/market-score/theme-ai-semiconductor-r185-readiness.mjs','utf8');
 assert.doesNotMatch(code,/\bfetch\s*\(|\bprepare\s*\(|\bwriteFile|\bspawnSync|\bcalcScore\s*\(/);
 const reader=readFileSync('worker/theme-etf-only-public.mjs','utf8');
 assert.match(reader,/record\.themes\.length!==THEME_ETF_ONLY_PAIRS\.length/);
 const api=readFileSync('app/api/theme-fear-greed/route.ts','utf8');
 assert.match(api,/readThemeEtfOnly\(env\.DB\)/);
 assert.equal(typeof validateThemeEtfOnlyPublic,'function');
 assert.deepEqual(AI_SEMICONDUCTOR_CANDIDATE.candidateEtfs,['SMH','SOXX']);
 assert.equal(AI_SEMICONDUCTOR_CANDIDATE.publicationAuthorized,false);
});
