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
test('R154 dashboard retains seven published ETF-only 252-point histories',()=>{
 const actual=themeEtfDashboardSeries(ready());
 assert.equal(actual.series.length,7);
 assert.deepEqual(actual.series.map(x=>x.name),['로봇·자동화','클라우드·SaaS','자율주행','원전·SMR','방산','핀테크','사이버보안']);
 assert.equal(actual.data.length,252);
 assert.deepEqual(Object.keys(actual.data[0]),['date',...THEME_DASHBOARD_SEVEN.map(x=>x.id)]);
 assert.equal(actual.data.at(-1)['로봇·자동화'],0);
});
test('R155 hides scores when feed unavailable or observation mismatched',()=>{
 for(const body of [null,undefined,{status:'UNAVAILABLE',themes:[]},{...ready(),status:'PARTIAL'},
  {...ready(),observationDate:'2026-10-21'}]){
  assert.equal(themeEtfDashboardSeries(body).series.length,0);
  assert.equal(themeEtfDashboardSeries(body).data.length,0);
 }
});
test('R155 excludes only invalid or missing themes; never fabricates points',()=>{
 const cases=[ready(),ready(),ready(),ready(),ready()];
 cases[0].themes[0].history.pop();
 cases[1].themes[0].history[17].score=null;
 cases[2].themes[1].history[0].date='2025-10-14';
 cases[3].themes[0].score=50;
 cases[4].themes[0].history.reverse();
 for(const body of cases){
  const actual=themeEtfDashboardSeries(body);
  assert.equal(actual.series.length,6);
  assert.equal(actual.data.length,252);
 }
});
test('R155 automatically includes any newly published valid theme; no fixed count gate',()=>{
 const next=ready();
 const newTheme={theme:'신규 ETF 테마',score:33,history:dates.map(date=>({date,score:33}))};
 next.themes.push(newTheme);
 const actual=themeEtfDashboardSeries(next);
 assert.equal(actual.series.length,8);
 assert.equal(actual.data.length,252);
 assert.equal(actual.data.at(-1)['신규 ETF 테마'],33);
 const color=actual.series.at(-1).color;
 next.themes.reverse();
 assert.equal(themeEtfDashboardSeries(next).series[0].color,color);
});
test('R154 chart passes published API dataset, not the old 30-theme placeholder',()=>{
 const page=fs.readFileSync('app/page.tsx','utf8');
 const wrapper=fs.readFileSync('components/theme-sentiment-dashboard-chart.tsx','utf8');
 assert.match(page,/<ThemeSentimentDashboardChart\/>/);
 assert.doesNotMatch(page,/<SectorSentimentChart title="테마별 공포·탐욕" draggable series=/);
 assert.match(wrapper,/useStoredIndex<ThemeStoredPayload>\('\/api\/theme-fear-greed'\)/);
 assert.match(wrapper,/themeEtfDashboardSeries\(error\?null:payload\)/);
 assert.match(wrapper,/<SectorSentimentChart title="테마별 공포·탐욕" draggable themePicker series=\{series\} data=\{data\}\/>/);
 assert.doesNotMatch(wrapper,/\bfetch\s*\(/);
});
test('R156 picker applies selections immediately without a chart-view button',()=>{
 const shared=fs.readFileSync('components/sector-sentiment-chart.tsx','utf8');
 const css=fs.readFileSync('components/sector-sentiment-chart.css','utf8');
 assert.match(shared,/themePicker=false/);
 assert.match(shared,/pickerOpen\?<ChevronDown size=\{16\} aria-hidden="true"\/>:<ChevronUp size=\{16\} aria-hidden="true"\/>/);
 assert.match(shared,/className="zg-theme-picker-panel"/);
 assert.match(shared,/className="zg-theme-picker-options"/);
 assert.match(shared,/onClick=\{\(\)=>toggleThemePickerItem\(item.id\)\}/);
 assert.match(shared,/const toggleThemePickerItem=\(id:string\)=>setHidden\(previous=>\{/);
 assert.match(shared,/series.every\(item=>next.has\(item.id\)\)/);
 assert.doesNotMatch(shared,/draftHidden|applyThemePicker|zg-theme-picker-apply|차트 보기/);
 assert.doesNotMatch(css,/zg-theme-picker-apply/);
 assert.match(css,/\.zg-theme-picker-options\{display:grid;flex:1;/);
 assert.match(shared,/series\.map\(item=><button key=\{item.id\}/);
 assert.match(css,/\.zg-theme-picker-panel\{position:absolute/);
 assert.match(css,/overflow-y:auto/);
});
test('R155 leaves sector chart stored data and legend behavior intact',()=>{
 const shared=fs.readFileSync('components/sector-sentiment-chart.tsx','utf8');
 const page=fs.readFileSync('app/page.tsx','utf8');
 assert.match(shared,/useStoredIndex<SectorFearGreedStoredPayload>\('\/api\/sector-fear-greed',null,autoStored\)/);
 assert.match(page,/<SectorSentimentChart\/>/);
});
