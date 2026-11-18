import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../app/earnings-recession/earnings-indicator-r2.css',import.meta.url),'utf8');
const panel=readFileSync(new URL('../app/earnings-recession/earnings-risk-only-panel.tsx',import.meta.url),'utf8');

test('W06 #45 SEC/BLS/BEA status wraps in the available mobile width instead of expanding the page',()=>{
 const declaration=css.match(/\.earnings-r2-indicators \.earnings-r2-cost-status\s*\{([^}]+)\}/)?.[1];
 assert.ok(declaration,'status declaration exists');
 assert.match(declaration,/max-width:\s*100%/);
 assert.match(declaration,/white-space:\s*normal/);
 assert.match(declaration,/overflow-wrap:\s*anywhere/);
 assert.doesNotMatch(declaration,/white-space:\s*nowrap/);
 assert.match(css,/@media\(max-width:767px\)\{\s*\.earnings-r2-indicators \.earnings-r2-cost-status\{display:block;margin:5px 0 0;font-size:10px\}/);
 assert.match(panel,/className="earnings-r2-cost-status" role="status"/);
 assert.doesNotMatch(declaration,/overflow:\s*hidden/,'status text must remain visible');
});
