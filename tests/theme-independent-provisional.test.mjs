import test from'node:test';import assert from'node:assert/strict';
import{THEME_DASHBOARD_SEVEN,themeEtfDashboardSeries}from'../lib/theme-etf-dashboard.mjs';
const dates=Array.from({length:252},(_,i)=>new Date(Date.UTC(2026,1,14)+i*86400000).toISOString().slice(0,10));
const confirmed=dates.at(-1),next=new Date(Date.parse(confirmed)+86400000).toISOString().slice(0,10);
const feed=()=>({status:'READY',phase:'PROVISIONAL',observationDate:confirmed,themes:[...THEME_DASHBOARD_SEVEN.map((t,i)=>({theme:t.id,score:40+i,history:dates.map(date=>({date,score:40+i}))})),...['바이오·신약','데이터센터·전력','우주·위성'].map(theme=>({theme,score:20,history:dates.map(date=>({date,score:20}))}))],provisional:{points:[{date:next,scores:Object.fromEntries(THEME_DASHBOARD_SEVEN.map((t,i)=>[t.id,60+i]))}]}});
test('ten confirmed themes and seven independently available provisional scores preserve all seven dashed extensions',()=>{
 const p=feed(),before=JSON.stringify(p),out=themeEtfDashboardSeries(p);assert.equal(JSON.stringify(p),before);assert.equal(out.series.length,10);assert.equal(out.data.at(-1).date,next);
 for(const [i,t]of THEME_DASHBOARD_SEVEN.entries()){assert.equal(out.data.at(-1)[t.id],60+i);assert.equal(out.provisionalBySeries[t.id],next);assert.equal(out.data.at(-2)[t.id],40+i);}
 for(const t of ['바이오·신약','데이터센터·전력','우주·위성']){assert.equal(out.data.at(-1)[t],null);assert.equal(out.provisionalBySeries[t],undefined);assert.equal(out.data.at(-2)[t],20);}
});
test('a newly published theme participates automatically, with no fixed roster gate',()=>{
 const p=feed();p.provisional.points[0].scores['바이오·신약']=0;const out=themeEtfDashboardSeries(p);assert.equal(out.data.at(-1)['바이오·신약'],0);assert.equal(out.provisionalBySeries['바이오·신약'],next);
});
test('malformed scores and empty provisional observations still fail closed',()=>{
 for(const scores of [{...feed().provisional.points[0].scores,'바이오·신약':101},{}]){const p=feed();p.provisional.points[0].scores=scores;const out=themeEtfDashboardSeries(p);assert.equal(out.data.at(-1).date,confirmed);assert.deepEqual(out.provisionalBySeries,{});}
});
