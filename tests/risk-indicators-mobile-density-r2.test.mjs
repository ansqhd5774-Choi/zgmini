import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../app/risk-indicators/risk-indicators.css',import.meta.url),'utf8');
const mobile=css.split('@media(max-width:600px){')[1]?.split('@media(max-width:375px){')[0];

test('risk-indicators compact layout changes are scoped to mobile only',()=>{
 assert.ok(mobile,'the mobile-only media query must remain available');
 assert.match(css.split('@media(max-width:600px){')[0],/\.zg-risk-five-band\{[^}]*height:22px/);
 assert.match(css.split('@media(max-width:600px){')[0],/\.zg-risk-chart\{height:189px;min-height:189px/);
 assert.match(mobile,/\.zg-risk-feature-head\{[^}]*margin-bottom:5px/);
 assert.match(mobile,/\.zg-risk-chart\{height:110px;min-height:110px/);
 assert.match(mobile,/\.zg-risk-five-band\{height:11px\}/);
 assert.match(mobile,/\.zg-risk-periods\{[^}]*width:auto/);
 assert.match(mobile,/\.zg-risk-feature-number\{display:flex/);
 assert.match(mobile,/\.zg-risk-feature-bottom\{[^}]*flex-wrap:nowrap/);
});
