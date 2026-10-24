import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../app/risk-indicators/risk-indicators.css',import.meta.url),'utf8');
const client=readFileSync(new URL('../app/risk-indicators/risk-indicators-client.tsx',import.meta.url),'utf8');

test('mobile shows the real analysis card beside an eight-row right selector rail',()=>{
 assert.match(css,/@media\(max-width:600px\)\{\s*\.zg-risk-overview\{grid-template-columns:minmax\(0,1fr\) 76px/);
 assert.match(css,/\.zg-risk-feature\{grid-column:1;grid-row:1/);
 assert.match(css,/\.zg-risk-ranking\{grid-column:2;grid-row:1/);
 assert.match(css,/\.zg-risk-ranking-list\{border:0;flex:1;gap:2px;grid-template-rows:repeat\(8,minmax\(44px,1fr\)\)/);
 assert.match(css,/\.zg-risk-rank-select\{display:flex;flex-direction:column;align-items:center;justify-content:center/);
 assert.match(css,/@media\(max-width:350px\)\{\s*\.zg-risk-overview\{grid-template-columns:minmax\(0,1fr\) 66px/);
});

test('button accessibility retains full risk names and selecting beside a card does not jump scroll',()=>{
 assert.match(client,/aria-label=\{`\$\{index\+1\}위 \$\{card.name\}/);
 assert.match(client,/mobileRiskNames:Record<RiskCard\['id'\],string>/);
 assert.match(client,/max-width: 950px/);
 assert.match(client,/min-width: 601px/);
 assert.match(client,/className="zg-risk-rank-name-mobile" aria-hidden="true"/);
 assert.match(client,/className="zg-risk-mobile-footnote"/);
 assert.doesNotMatch(css,/\.zg-risk-chart\{display:none/);
});
