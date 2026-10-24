import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {THEME_DASHBOARD_SEVEN,themeEtfDashboardSeries} from '../lib/theme-etf-dashboard.mjs';

const dates=Array.from({length:254},(_,i)=>new Date(Date.UTC(2026,1,12)+i*86400000).toISOString().slice(0,10));
const confirmedDate=dates[252],biotechDate=dates[251],lastDate=dates[253];
const points=(from,to,value)=>dates.slice(from,to).map(date=>({date,score:value}));
const seed=()=>({
 status:'READY',phase:'PROVISIONAL',observationDate:confirmedDate,
 themes:[
  ...THEME_DASHBOARD_SEVEN.map((item,i)=>({theme:item.id,score:40+i,history:points(1,253,40+i)})),
  {theme:'바이오·신약',score:29.03175,history:points(0,251,29.03175).concat({date:biotechDate,score:29.03175}),observationDate:biotechDate,delayed:true},
 ],
 provisional:{points:[
  {date:confirmedDate,scores:{'바이오·신약':26.48413}},
  {date:lastDate,scores:{...Object.fromEntries(THEME_DASHBOARD_SEVEN.map((item,i)=>[item.id,20+i])),'바이오·신약':22.63294}},
 ]},
});

test('R8: same date is seven confirmed and biotech provisional without overwriting either',()=>{
 const feed=seed();
 const original=JSON.stringify(feed);
 const result=themeEtfDashboardSeries(feed);
 assert.equal(JSON.stringify(feed),original,'read-only projection');
 assert.equal(result.series.length,8);
 const shared=result.data.find(row=>row.date===confirmedDate);
 assert.ok(shared);
 for(let i=0;i<7;i++)assert.equal(shared[THEME_DASHBOARD_SEVEN[i].id],40+i);
 assert.equal(shared['바이오·신약'],26.48413);
 const latest=result.data.at(-1);
 assert.equal(latest.date,lastDate);
 assert.equal(latest['바이오·신약'],22.63294);
 for(let i=0;i<7;i++)assert.equal(latest[THEME_DASHBOARD_SEVEN[i].id],20+i);
 assert.equal(result.provisionalBySeries['바이오·신약'],confirmedDate);
 for(const theme of THEME_DASHBOARD_SEVEN)assert.equal(result.provisionalBySeries[theme.id],lastDate);
 const prior=result.data.find(row=>row.date===biotechDate);
 assert.equal(prior['바이오·신약'],29.03175);
});

test('R8: no missing theme values are manufactured from another date',()=>{
 const feed=seed();
 delete feed.provisional.points[1].scores['바이오·신약'];
 const out=themeEtfDashboardSeries(feed);
 assert.equal(out.data.find(row=>row.date===confirmedDate)['바이오·신약'],26.48413);
 assert.equal(out.data.at(-1)['바이오·신약'],null);
 assert.equal(out.provisionalBySeries['바이오·신약'],confirmedDate);
 assert.equal(out.data.at(-1)[THEME_DASHBOARD_SEVEN[0].id],20);
});

test('R8: invalid, unordered or fabricated provisional scores do not reach dashboard',()=>{
 const invalid=seed();
 invalid.provisional.points[0].scores['바이오·신약']=101;
 let out=themeEtfDashboardSeries(invalid);
 assert.equal(out.data.find(row=>row.date===confirmedDate)['바이오·신약'],null);
 assert.equal(out.data.at(-1).date,confirmedDate);
 assert.deepEqual(out.provisionalBySeries,{});
 const reverse=seed();
 reverse.provisional.points.reverse();
 out=themeEtfDashboardSeries(reverse);
 assert.deepEqual(out.provisionalBySeries,{});
 const absent=seed();
 delete absent.provisional.points[0].scores['바이오·신약'];
 out=themeEtfDashboardSeries(absent);
 assert.deepEqual(out.provisionalBySeries,{});
});

test('R8: theme-only line boundaries leave the existing sector chart path intact',()=>{
 const shared=fs.readFileSync('components/sector-sentiment-chart.tsx','utf8');
 const wrapper=fs.readFileSync('components/theme-sentiment-dashboard-chart.tsx','utf8');
 assert.match(shared,/const individualStarts=provisionalBySeries===undefined\?null:/);
 assert.match(shared,/row\.date>=boundary\.start\|\|i===boundary\.anchor/);
 assert.match(shared,/return hasProvisional\?\[\[id,v\]/);
 assert.match(wrapper,/provisionalBySeries=\{provisionalBySeries\}/);
 assert.match(shared,/useStoredIndex<SectorFearGreedStoredPayload>\('\/api\/sector-fear-greed',null,autoStored\)/);
});
