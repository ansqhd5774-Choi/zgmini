import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('theme detail comparison tooltip reads canonical rows, not duplicated chart segments',()=>{
 const source=readFileSync('app/theme-fear-greed/theme-detail-charts.tsx','utf8');
 assert.match(source,/import \{themeTooltipRows\} from '\.\.\/\.\.\/lib\/theme-tooltip-rows\.mjs'/);
 assert.match(source,/themeTooltipRows\(ranked,currentVisible,dayRow,day\)/);
 assert.doesNotMatch(source,/payload\.filter\(p=>validScore\(p\.value\)\)/);
 assert.match(source,/lastObservedDate/);
});
