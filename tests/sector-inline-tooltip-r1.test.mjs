import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const component=readFileSync(new URL('../components/sector-sentiment-chart.tsx',import.meta.url),'utf8');
const styles=readFileSync(new URL('../components/sector-sentiment-chart.css',import.meta.url),'utf8');

test('hover tooltip is portaled below legend, never positioned above the plot',()=>{
 assert.match(component,/const \[tooltipReadout,setTooltipReadout\]=useState<HTMLDivElement\|null>\(null\)/);
 assert.match(component,/<Tooltip portal=\{tooltipReadout\?\?undefined\}/);
 assert.match(component,/content=\{\(\{active,payload,label\}\)=>!tooltipReadout\|\|heldRow\|\|!active/);
 assert.match(component,/wrapperStyle=\{\{position:'relative',transform:'none',width:'100%',pointerEvents:'none'\}\}/);
 assert.doesNotMatch(component,/transform:'translateY\(calc\(-100% - 8px\)\)'/);
 assert.doesNotMatch(component,/allowEscapeViewBox=\{\{x:true,y:true\}\}/);
 const index=component.indexOf('ref={setTooltipReadout} className="zg-sector-readout"');
 const legend=component.indexOf('className="zg-legend-row zg-theme-picker-legend"');
 const plot=component.indexOf('className="zg-sector-chart-plot"');
 assert.ok(plot>=0&&legend>plot&&index>legend,'readout must follow both plot and theme/sector legends');
});

test('held pointer uses same below-legend readout without losing crosshair or numeric bands',()=>{
 const index=component.indexOf('ref={setTooltipReadout} className="zg-sector-readout"');
 const held=component.indexOf('className="zg-sector-held-tooltip zg-sector-tooltip"');
 assert.ok(index>0&&held>index,'held readout stays outside SVG plot');
 assert.equal(component.match(/className="zg-sector-held-tooltip zg-sector-tooltip"/g)?.length,1);
 assert.match(component,/const heldRow=heldIndex===null\?null:visibleRows\[heldIndex\]/);
 assert.match(component,/\{heldRow&&<ReferenceLine x=\{heldRow.date\}/);
 assert.match(component,/scoreBand\(Number\(heldRow\[s.id\]\)\)/);
 assert.match(component,/uniqueChartTooltipEntries\(payload\)/);
});

test('card height only expands for a real readout and never narrows the plot',()=>{
 assert.match(styles,/\.zg-sector-chart\{height:232px;/);
 assert.match(styles,/\.zg-sector-chart-plot\{position:relative;height:120px;/);
 assert.match(styles,/\.zg-sector-chart:has\(\.zg-sector-readout \.zg-sector-tooltip\)\{height:auto;min-height:232px\}/);
 assert.match(styles,/\.zg-sector-readout\{position:relative;min-width:0\}/);
 assert.match(styles,/\.zg-sector-readout \.recharts-tooltip-wrapper\{width:100%;max-width:100%\}/);
 assert.match(styles,/\.zg-sector-readout \.zg-sector-held-tooltip\{position:relative;left:auto;bottom:auto;z-index:auto;pointer-events:none\}/);
 assert.match(styles,/\.zg-sector-tooltip:has\(li:nth-child\(2\)\) ul\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
});
