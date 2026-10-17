import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('inflation indicators expose animated icon-only favorite toggles on desktop and mobile',()=>{
 const panel=read('app/inflation/inflation-panel.tsx');
 const favorite=read('app/inflation/inflation-favorite-button.tsx');
 const css=read('app/inflation/inflation-favorite-r1.css');
 assert.match(panel,/InflationFavoriteHeaderIcon/);
 assert.match(panel,/<th className="inflation-r2-favorite-head">/);
 assert.match(panel,/<InflationFavoriteButton id=\{feature\} label=\{meta\.label\}\/>/);
 assert.match(panel,/inflation-r2-mobile-title/);
 assert.match(favorite,/import \{Star\} from "lucide-react"/);
 assert.match(favorite,/zgmini:inflation:favorites:v1/);
 assert.match(favorite,/aria-pressed=\{active\}/);
 assert.match(favorite,/window\.dispatchEvent\(new Event\(CHANGE_EVENT\)\)/);
 assert.doesNotMatch(favorite,/>★</);
 assert.match(css,/color:#f4c34e/);
 assert.match(css,/\.inflation-favorite-button\.is-active \.inflation-favorite-icon\{fill:currentColor;animation:inflation-favorite-pop/);
 assert.match(css,/@keyframes inflation-favorite-pop/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/td:nth-child\(9\)\{width:130px!important;text-align:center\}/);
 assert.match(css,/td:nth-child\(10\)\{width:50px!important;text-align:center\}/);
});
