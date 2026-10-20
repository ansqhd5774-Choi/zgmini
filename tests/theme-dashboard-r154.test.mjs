import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {THEME_DASHBOARD_SEVEN,themeEtfDashboardSeries} from '../lib/theme-etf-dashboard.mjs';

const dates=Array.from({length:252},(_,i)=>new Date(Date.UTC(2025,9,16)+i*86400000).toISOString().slice(0,10));
function ready(){
 return {status:'READY',observationDate:dates.at(-1),themes:THEME_DASHBOARD_SEVEN.map((item,i)=>({
  theme:item.id,score:i===0?0:25+i,
  history:dates.map(date=>({date,score:i===0?0:25+i})),
 }))};
}
test('R154 dashboard uses exactly seven ETF-only, 252-point stored histories',()=>{
 const actual=themeEtfDashboardSeries(ready());
 assert.equal(actual.series.length,7);
 assert.deepEqual(actual.series.map(x=>x.name),['로봇·자동화','클라우드·SaaS','자율주행','원전·SMR','방산','핀테크','사이버보안']);
 assert.equal(actual.data.length,252);
 assert.deepEqual(Object.keys(actual.data[0]),['date',...THEME_DASHBOARD_SEVEN.map(x=>x.id)]);
 assert.equal(actual.data.at(-1)['로봇·자동화'],0); // legitimate zero is not missing
});
test('R154 hides scores on missing, unavailable, stale or partial feed',()=>{
 for(const body of [null,undefined,{status:'UNAVAILABLE',themes:[]},{...ready(),status:'PARTIAL'},
  {...ready(),themes:ready().themes.slice(1)}, {...ready(),observationDate:'2026-10-21'}]){
  assert.equal(themeEtfDashboardSeries(body).data.length,0);
 }
});
test('R154 refuses distorted daily points and inconsistent ETF theme dates',()=>{
 const cases=[ready(),ready(),ready(),ready(),ready()];
 cases[0].themes[0].history.pop();
 cases[1].themes[0].history[17].score=null;
 cases[2].themes[1].history[0].date='2025-10-14';
 cases[3].themes[0].score=50;
 cases[4].themes[0].history.reverse();
 for(const item of cases)assert.equal(themeEtfDashboardSeries(item).data.length,0);
});
test('R154 chart passes real dataset from API and not the 30-item placeholder',()=>{
 const page=fs.readFileSync('app/page.tsx','utf8');
 const wrapper=fs.readFileSync('components/theme-sentiment-dashboard-chart.tsx','utf8');
 assert.match(page,/<ThemeSentimentDashboardChart\/>/);
 assert.doesNotMatch(page,/<SectorSentimentChart title="테마별 공포·탐욕" draggable series=/);
 assert.match(wrapper,/useStoredIndex<ThemeStoredPayload>\('\/api\/theme-fear-greed'\)/);
 assert.match(wrapper,/themeEtfDashboardSeries\(error\?null:payload\)/);
 assert.match(wrapper,/<SectorSentimentChart title="테마별 공포·탐욕" draggable series=\{series\} data=\{data\}\/>/);
 assert.doesNotMatch(wrapper,/\bfetch\s*\(/);
});
test('R154 does not modify existing sector auto-stored chart',()=>{
 const shared=fs.readFileSync('components/sector-sentiment-chart.tsx','utf8');
 const page=fs.readFileSync('app/page.tsx','utf8');
 assert.match(shared,/useStoredIndex<SectorFearGreedStoredPayload>\('\/api\/sector-fear-greed',null,autoStored\)/);
 assert.match(page,/<SectorSentimentChart\/>/);
});
