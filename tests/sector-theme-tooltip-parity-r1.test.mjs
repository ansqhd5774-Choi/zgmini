import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {placeSectorHeldTooltip} from '../lib/sector-tooltip-position.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const chart=read('components/sector-sentiment-chart.tsx');
const css=read('components/sector-sentiment-chart.css');
const korea=read('app/market-fear-greed-chart-renderer.tsx');
const koreaCss=read('app/globals.css');

test('sector and theme share Korea tooltip visual contract without a card resize',()=>{
 assert.match(korea,/<div className="cnn-history-tooltip">/);
 assert.match(chart,/function SectorTooltipCard\(/);
 assert.match(chart,/className=\{\`cnn-history-tooltip zg-sector-tooltip/);
 assert.match(chart,/<SectorTooltipCard date=\{String\(label\)\}/);
 assert.match(chart,/<SectorTooltipCard date=\{heldRow\.date\}/);
 assert.match(koreaCss,/\.cnn-history-tooltip\{[\s\S]*?min-width:92px;/);
 assert.match(koreaCss,/\.cnn-history-tooltip\{[\s\S]*?border-radius:4px;/);
 assert.match(koreaCss,/\.cnn-history-tooltip\{[\s\S]*?background:#071a29;/);
 assert.match(koreaCss,/\.cnn-history-tooltip span\{[\s\S]*?font-size:10px;/);
 assert.match(koreaCss,/\.cnn-history-tooltip strong\{[\s\S]*?font-size:16px;/);
 assert.match(koreaCss,/\.cnn-history-tooltip strong\{[\s\S]*?font-weight:900;/);
 assert.match(css,/\.zg-sector-chart\{height:232px;/);
 assert.match(css,/\.zg-sector-chart-plot\{position:relative;height:120px;/);
 assert.match(css,/\.zg-sector-tooltip\.is-multi/);
 assert.match(css,/\.zg-sector-tooltip\.is-multi \.zg-sector-tooltip-date\{text-align:center\}/);
 assert.match(chart,/\.toFixed\(1\)/);
});
test('Recharts hover auto-repositions inside plot and is not pinned below or above the legend',()=>{
 assert.doesNotMatch(chart,/position=\{\{x:0,y:0\}\}/);
 assert.doesNotMatch(chart,/allowEscapeViewBox=\{\{x:true,y:true\}\}/);
 assert.doesNotMatch(chart,/translateY\(calc\(-100%/);
 assert.match(chart,/offset=\{12\} allowEscapeViewBox=\{\{x:false,y:false\}\}/);
 assert.match(chart,/wrapperStyle=\{\{zIndex:20,pointerEvents:'none'\}\}/);
 assert.match(chart,/cursor=\{\{stroke:'#cbd5e1'/);
 assert.doesNotMatch(css,/\.zg-sector-held-tooltip\{[^}]*bottom:calc\(100%/);
});
test('single and multi series show finite, deduplicated scores with band colors',()=>{
 assert.match(chart,/const single=entries\.length===1/);
 assert.match(chart,/data-score-band=\{scoreBand\(entries\[0\]\.score\)\}/);
 assert.match(chart,/uniqueChartTooltipEntries\(payload\)/);
 assert.match(chart,/Number\.isFinite\(score\)&&score>=0&&score<=100/);
 assert.match(chart,/entries\.map\(entry=><li/);
 assert.match(chart,/data-score-band=\{scoreBand\(entry\.score\)\}/);
 assert.match(chart,/shownSeries\.flatMap\(item=>/);
 assert.match(css,/\.zg-sector-tooltip \.zg-sector-tooltip-values\{display:grid;grid-template-columns:repeat\(2/);
});
test('touch, drag, keyboard and existing sector/theme controls remain isolated',()=>{
 assert.match(chart,/onPointerDownCapture=\{event=>/);
 assert.match(chart,/onPointerUpCapture=\{releasePlot\}/);
 assert.match(chart,/onPointerCancelCapture=\{releasePlot\}/);
 assert.match(chart,/onLostPointerCapture=\{releasePlot\}/);
 assert.match(chart,/setTouchTooltip\(event\.pointerType!=='mouse'\)/);
 assert.match(chart,/placeSectorHeldTooltip\(/);
 assert.match(chart,/const compactSectorScores=!themePicker&&series===SECTORS;/);
 assert.match(chart,/showDashboardThemeScores/);
 assert.match(chart,/themePicker\?<\>/);
 assert.match(chart,/\[\[7,'1W'\],\[30,'1M'\],\[90,'3M'\],\[180,'6M'\],\[365,'1Y'\]\]/);
 assert.match(chart,/const extrema=shownSeries\.length===1\?/);
 assert.match(chart,/hasProvisional\?/);
 assert.match(chart,/toggleThemePickerItem/);
});
test('held tooltip follows pointer and flips at left/right/top/bottom without leaving plot',()=>{
 const scenarios=[
  {name:'center',pointerX:240,pointerY:67,plotWidth:500,plotHeight:120,tooltipWidth:92,tooltipHeight:52},
  {name:'near left',pointerX:3,pointerY:4,plotWidth:500,plotHeight:120,tooltipWidth:92,tooltipHeight:52},
  {name:'near right',pointerX:495,pointerY:75,plotWidth:500,plotHeight:120,tooltipWidth:92,tooltipHeight:52},
  {name:'near bottom',pointerX:240,pointerY:115,plotWidth:500,plotHeight:120,tooltipWidth:92,tooltipHeight:52},
  {name:'multi sector',pointerX:300,pointerY:50,plotWidth:500,plotHeight:120,tooltipWidth:320,tooltipHeight:110},
  {name:'small mobile',pointerX:270,pointerY:6,plotWidth:280,plotHeight:120,tooltipWidth:320,tooltipHeight:110},
 ];
 for(const s of scenarios){
  const xy=placeSectorHeldTooltip(s);
  const w=Math.min(s.tooltipWidth,s.plotWidth-8);
  const h=Math.min(s.tooltipHeight,s.plotHeight-8);
  assert.ok(xy.x>=4&&xy.x+w<=s.plotWidth-4,s.name+' x='+xy.x);
  assert.ok(xy.y>=4&&xy.y+h<=s.plotHeight-4,s.name+' y='+xy.y);
 }
 assert.ok(placeSectorHeldTooltip(scenarios[2]).x<scenarios[2].pointerX,'right edge flips to left');
 assert.ok(placeSectorHeldTooltip(scenarios[1]).y>scenarios[1].pointerY,'top edge flips downward');
 assert.deepEqual(placeSectorHeldTooltip({...scenarios[0],pointerX:NaN}),{x:4,y:4});
});
