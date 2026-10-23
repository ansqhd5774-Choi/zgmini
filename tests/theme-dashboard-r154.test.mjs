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
 const deferred=fs.readFileSync('components/deferred-dashboard-charts.tsx','utf8');
 assert.match(page,/<DeferredDashboardCharts\/>/);
 assert.match(deferred,/lazy\(\(\)=>import\('\.\/theme-sentiment-dashboard-chart'\)\)/);
 assert.match(deferred,/<ThemeSentimentDashboardChart\/>/);
 assert.match(deferred,/new IntersectionObserver/);
 assert.doesNotMatch(page,/<SectorSentimentChart title="테마별 공포·탐욕" draggable series=/);
 assert.match(wrapper,/useStoredIndex<ThemeStoredPayload>\('\/api\/theme-fear-greed'\)/);
 assert.match(wrapper,/themeEtfDashboardSeries\(error\?null:payload\)/);
 assert.match(wrapper,/<SectorSentimentChart title="테마별 공포·탐욕" draggable themePicker series=\{series\} data=\{data\} showProvisionalNotice=\{false\}\/>/);
 assert.doesNotMatch(wrapper,/\bfetch\s*\(/);
});
test('R156 picker applies selections immediately without a chart-view button',()=>{
 const shared=fs.readFileSync('components/sector-sentiment-chart.tsx','utf8');
 const css=fs.readFileSync('components/sector-sentiment-chart.css','utf8');
 assert.match(shared,/themePicker=false/);
 assert.match(shared,/pickerOpen\?<ChevronDown size=\{16\} aria-hidden="true"\/>:<ChevronUp size=\{16\} aria-hidden="true"\/>/);
 assert.match(shared,/className=\{`zg-theme-picker-panel\$\{pickerOpen\?' is-open':''\}`\}/);
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
test('R157 picker slides upward to heading and downward on close, including on small screens',()=>{
 const shared=fs.readFileSync('components/sector-sentiment-chart.tsx','utf8');
 const css=fs.readFileSync('components/sector-sentiment-chart.css','utf8');
 assert.match(shared,/id="zg-theme-picker-options" className=\{`zg-theme-picker-panel\$\{pickerOpen\?' is-open':''\}`\}/);
 assert.doesNotMatch(shared,/pickerOpen&&<div id="zg-theme-picker-options"/);
 assert.match(shared,/aria-hidden=\{!pickerOpen\} inert=\{!pickerOpen\}/);
 assert.match(shared,/aria-expanded=\{pickerOpen\}/);
 // Only the sliding selector is clipped; chart tooltips must escape the card.
 assert.match(css,/\.zg-sector-chart\.zg-theme-picker-enabled\{position:relative;overflow:visible\}/);
 assert.match(shared,/<div className="zg-theme-picker-clip">\s*<div id="zg-theme-picker-options"/);
 assert.match(css,/\.zg-theme-picker-clip\{position:absolute;inset:0;z-index:25;overflow:hidden;border-radius:inherit;pointer-events:none\}/);
 assert.match(css,/\.zg-theme-picker-panel\{[^}]*top:8px;bottom:55px;[^}]*transform:translateY\(calc\(100% \+ 70px\)\)[^}]*visibility:hidden;pointer-events:none;transition:transform 300ms/);
 assert.match(css,/\.zg-theme-picker-panel\.is-open\{transform:translateY\(0\);opacity:1;visibility:visible;pointer-events:auto;/);
 assert.match(css,/@media\(max-width:600px\)\{\.zg-theme-picker-panel\{top:6px;bottom:51px;/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.zg-theme-picker-panel,\.zg-theme-picker-panel\.is-open\{transition:none\}/);
 assert.doesNotMatch(shared,/차트 보기|applyThemePicker/);
});
test('R155 leaves sector chart stored data and legend behavior intact',()=>{
 const shared=fs.readFileSync('components/sector-sentiment-chart.tsx','utf8');
 const page=fs.readFileSync('app/page.tsx','utf8');
 assert.match(shared,/useStoredIndex<SectorFearGreedStoredPayload>\('\/api\/sector-fear-greed',null,autoStored\)/);
 assert.match(page,/<DeferredDashboardCharts\/>/);
 const deferred=fs.readFileSync('components/deferred-dashboard-charts.tsx','utf8');
 assert.match(deferred,/lazy\(\(\)=>import\('\.\/sector-sentiment-chart'\)\)/);
 assert.match(deferred,/<SectorSentimentChart showProvisionalNotice=\{false\}\/>/);
});
test('dashboard hides the two notices while detail page retains provisional dashed chart data',()=>{
 const shared=fs.readFileSync('components/sector-sentiment-chart.tsx','utf8');
 const theme=fs.readFileSync('components/theme-sentiment-dashboard-chart.tsx','utf8');
 const deferred=fs.readFileSync('components/deferred-dashboard-charts.tsx','utf8');
 const sectorDetail=fs.readFileSync('app/sector-fear-greed/sector-detail-charts.tsx','utf8');
 assert.match(deferred,/<SectorSentimentChart showProvisionalNotice=\{false\}\/>/);
 assert.match(theme,/data=\{data\} showProvisionalNotice=\{false\}\/>/);
 assert.doesNotMatch(theme,/자료 갱신 지연 · 해당 선은 마지막 관측일까지만 표시합니다/);
 assert.match(shared,/showProvisionalNotice&&hasProvisional&&<small className="zg-provisional-label"/);
 assert.match(shared,/strokeDasharray="4 5"/);
 assert.match(sectorDetail,/snapshot\?\.phase==='PROVISIONAL'/);
 assert.match(sectorDetail,/strokeDasharray="4 4"/);
 assert.match(sectorDetail,/dataKey=\{provisional\?'solid':active\.id\}/);
 assert.match(sectorDetail,/aria-label="11개 섹터 투자심리 순위"/);
 assert.match(sectorDetail,/onClick=\{\(\)=>setSelected\(sector\.id\)\}/);
 assert.match(sectorDetail,/const \[compareDays,setCompareDays\]=useState\(365\)/);
});

test('sector detail mini charts expose stored historical date and score on hover while related links use buttons',()=>{
 const detail=fs.readFileSync('app/sector-fear-greed/sector-detail-charts.tsx','utf8');
 const page=fs.readFileSync('app/sector-fear-greed/page.tsx','utf8');
 const css=fs.readFileSync('app/sector-fear-greed/sector-detail.css','utf8');
 assert.match(detail,/<XAxis dataKey="date" hide height=\{0\}\/>/);
 assert.match(detail,/<Tooltip cursor=\{false\} isAnimationActive=\{false\} allowEscapeViewBox=/);
 assert.match(detail,/typeof point\.value==='number'/);
 assert.match(detail,/point\.value\.toFixed\(1\)/);
 assert.match(detail,/provisional&&<Line dataKey="dash"/);
 assert.match(css,/\.zg-sfg-sparkline\{[^}]*pointer-events:auto/);
 assert.match(css,/\.zg-sfg-rank-row:hover,\.zg-sfg-rank-row:focus-visible\{z-index:2/);
 assert.match(page,/<nav aria-label="관련 분석" className="zg-sector-related-nav">/);
 for(const href of ['/fear-greed/usa/','/recession/','/asset-bubble/'])assert.match(page,new RegExp(`className="zg-sector-related-link" href="${href}"`));
});
