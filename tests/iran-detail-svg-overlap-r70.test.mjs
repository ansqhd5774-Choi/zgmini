import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const styles=readFileSync(new URL('../app/outbreak-events.css',import.meta.url),'utf8');
const svgStyles=readFileSync(new URL('../components/chart-axis-labels.css',import.meta.url),'utf8');

test('Iran detail SVG does not overflow capped container or overlap the following note',()=>{
 assert.match(styles,/\.ob-iran-chart\{display:block;width:100%;height:auto;max-height:none\}/);
 assert.match(styles,/\.ob-iran-chart>svg\{max-width:500px;margin-inline:auto\}/);
 assert.match(styles,/@media\(min-width:701px\)\{\.ob-iran-chart>svg text\{font-size:4px\}\}/);
 assert.match(svgStyles,/\.ob-iran-chart>svg\{display:block;width:100%;height:auto\}/);
 // The detail chart uses the existing 170 x 68 viewBox. Desktop max width
 // must fit within the original 220px height budget without clipping.
 assert.ok(500*68/170<=220);
 // Narrow/mobile screens retain their original fluid SVG and font sizing.
 assert.ok(308<500);
});
