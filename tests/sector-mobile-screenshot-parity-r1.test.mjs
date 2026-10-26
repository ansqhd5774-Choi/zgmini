import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('approved mobile sector layout places comparison before compact ranking without the redundant detail panel',()=>{
 const css=read('app/sector-fear-greed/sector-detail.css');
 const tsx=read('app/sector-fear-greed/sector-detail-charts.tsx');
 const mobile=css.slice(css.lastIndexOf('@media(max-width:680px)'));
 assert.ok(mobile.includes('.zg-sfg-lower{display:contents}'));
 assert.ok(mobile.includes('.zg-sfg-comparison{order:1;'));
 assert.ok(mobile.includes('.zg-sfg-ranking{order:2;'));
 assert.ok(mobile.includes('.zg-sfg-footnote{order:3}'));
 assert.ok(!css.includes('.zg-sfg-detail'));
 assert.ok(mobile.includes('grid-template-columns:repeat(4,minmax(0,1fr))'));
 assert.ok(mobile.includes('height:27px;min-height:27px'));
 assert.ok(tsx.includes('zg-sfg-mobile-ranking-title'));
 assert.ok(tsx.includes('zg-sfg-mobile-rank-head'));
 assert.ok(css.includes('.zg-sfg-mobile-ranking-title,.zg-sfg-mobile-rank-head,.zg-sfg-legend-score{display:none}'));
});

test('mobile scores come from the saved API history and use existing five-band colors',()=>{
 const tsx=read('app/sector-fear-greed/sector-detail-charts.tsx');
 const css=read('app/sector-fear-greed/sector-detail.css');
 assert.ok(tsx.includes("fetch('/api/sector-fear-greed'"));
 assert.ok(tsx.includes('const [compareDays,setCompareDays]=useState(365)'));
 assert.ok(tsx.includes('rankedSectors(history).slice(0,3)'));
 for(const name of ['extreme-fear','fear','neutral','greed','extreme-greed']){
  assert.ok(tsx.includes(`var(--zg-score-${name})`),`missing canonical band ${name}`);
 }
 assert.ok(tsx.includes('{SECTORS.map(sector=>{const value=latest[sector.id]'));
 assert.ok(tsx.includes("'--zg-mobile-order':sorted.findIndex"));
 assert.ok(css.includes('order:var(--zg-mobile-order)'));
});

test('a single selected sector places low high and current callouts with guides inside the existing plot',()=>{
 const tsx=read('app/sector-fear-greed/sector-detail-charts.tsx');
 const css=read('app/sector-fear-greed/sector-detail.css');
 assert.ok(tsx.includes('visible.size===1?Array.from(visible)[0]:null'));
 assert.ok(tsx.includes('periodRows(rows,compareDays).flatMap'));
 assert.ok(tsx.includes('soloPoints.reduce'));
 assert.equal((tsx.match(/className="zg-sfg-solo-marker"/g)||[]).length,1);
 assert.ok(tsx.includes('const labels=placeExtremaLabels(samples,markers.map'));
 assert.ok(tsx.includes('const leader=extremaLeader(marker,position)'));
 assert.ok(tsx.includes('<path data-leader-side={leader.side} d={leader.path}'));
 assert.ok(tsx.includes('pointerEvents="none"'));
 assert.ok(tsx.includes('const unique=candidates.filter'));
 assert.ok(tsx.includes('shape={<SoloChartMarkers rows={soloPoints} low={soloLow} high={soloHigh} current={soloCurrent}/>}/>'));
 assert.ok(!tsx.includes('label={{value:soloLow'));
 assert.ok(!tsx.includes('label={{value:soloCurrent'));
 assert.ok(css.includes('.zg-sfg-solo-marker{display:none}'));
 assert.ok(css.includes('@media(max-width:680px){\n .zg-sfg-solo-marker{display:block}'));
 assert.ok(css.includes('.zg-sfg-comparison-plot{height:126px;'));
});

test('approved sector mobile cards center each legend name on one line with left color dot and right score',()=>{
 const css=read('app/sector-fear-greed/sector-detail.css');
 const mobile=css.slice(css.indexOf('/* Approved sector-only mobile legend:'));
 assert.ok(mobile.startsWith('/* Approved sector-only mobile legend:'));
 assert.match(mobile,/@media screen and \(max-width:680px\)/);
 assert.match(mobile,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\);grid-auto-rows:32px;gap:4px/);
 assert.match(mobile,/\.zg-sfg-legend button\{[^}]*position:relative;display:block;[^}]*height:32px;min-height:32px;max-height:32px;/);
 assert.match(mobile,/\.zg-sfg-legend i\{[^}]*position:absolute;left:6px;top:50%;transform:translateY\(-50%\)/);
 assert.match(mobile,/\.zg-sfg-legend-name\{[^}]*position:absolute;left:50%;top:50%;transform:translate\(-50%,-50%\);[^}]*white-space:nowrap;[^}]*text-align:center/);
 assert.match(mobile,/\.zg-sfg-legend-score\{[^}]*position:absolute;right:6px;top:50%;transform:translateY\(-50%\);display:block/);
 assert.match(mobile,/@media screen and \(max-width:600px\)\{\s*\.zg-sector-detail:not\(\.zg-theme-detail\) \.zg-sfg-legend\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\);grid-auto-rows:32px/);
 assert.match(mobile,/@media screen and \(max-width:355px\)\{\s*\.zg-sector-detail:not\(\.zg-theme-detail\) \.zg-sfg-legend\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 // Shared stylesheet is imported on the theme page; every added selector is restricted to the sector page.
 for(const rule of mobile.split('\n').filter(s=>s.trimStart().startsWith('.zg-')))assert.ok(rule.includes('.zg-sector-detail:not(.zg-theme-detail) '),rule);
 assert.match(css,/\.zg-sfg-comparison-plot\{height:126px;/);
});

test('sector legend toggles and sorted current score remain source driven',()=>{
 const tsx=read('app/sector-fear-greed/sector-detail-charts.tsx');
 assert.match(tsx,/order:var\(--zg-mobile-order\)/.test(read('app/sector-fear-greed/sector-detail.css')) ? /SECTORS\.map\(sector=>/ : /never-match/);
 assert.match(tsx,/onClick=\{\(\)=>toggle\(sector\.id\)\}/);
 assert.match(tsx,/\{'--zg-mobile-order':sorted\.findIndex\(item=>item\.id===sector\.id\)\}/);
 assert.match(tsx,/className="zg-sfg-legend-name">\{nameOf\(sector\.id\)\}/);
 assert.match(tsx,/className="zg-sfg-legend-score" style=\{\{color:scoreColor\(current\)\}\}>\{current===null\?'—':current\.toFixed\(1\)\}/);
});
