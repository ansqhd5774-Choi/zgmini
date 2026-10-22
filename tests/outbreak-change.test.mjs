import {test} from 'node:test';import assert from 'node:assert/strict';
import {outbreakChange} from '../lib/outbreak-change.mjs';
import fs from 'node:fs';import {createRequire} from 'node:module';
import ts from 'typescript';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
test('a 0.4 point movement retains its arrow and exact displayed magnitude',()=>{
 assert.deepEqual(outbreakChange(46.6,46.2),{amount:.4,text:'0.4',direction:'up'});
 assert.deepEqual(outbreakChange(46.2,46.6),{amount:.4,text:'0.4',direction:'down'});
 assert.deepEqual(outbreakChange(61.4,61.3),{amount:.1,text:'0.1',direction:'up'});
});
test('direction agrees with visible card scores at one-decimal boundaries',()=>{
 assert.deepEqual(outbreakChange(25.06,25.04),{amount:.1,text:'0.1',direction:'up'});
 assert.deepEqual(outbreakChange(25.04,25.01),{amount:0,text:'0',direction:'flat'});
 assert.deepEqual(outbreakChange(25,25),{amount:0,text:'0',direction:'flat'});
});
test('zero is valid, missing values never become zero and integer changes stay compact',()=>{
 assert.deepEqual(outbreakChange(0,.4),{amount:.4,text:'0.4',direction:'down'});
 assert.deepEqual(outbreakChange(12,10),{amount:2,text:'2',direction:'up'});
 for(const pair of [[null,0],[0,null],[NaN,0],[0,Infinity]])assert.equal(outbreakChange(...pair),null);
});
test('the shared React card rounds only displayed deltas, including title and aria-label',()=>{
 const file=new URL('../app/outbreak-change.tsx',import.meta.url),module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const require=createRequire(file);
 let active=true;
 new Function('require','module','exports',code)(id=>id==='../components/score-arrow-provider'?{useScoreArrows:()=>()=>active}:require(id),module,module.exports);
 const render=(current,previous)=>renderToStaticMarkup(React.createElement(module.exports.OutbreakChange,{current,previous,series:'iran'}));
 const up=render(47.1,46.2),down=render(46.2,47.1),flat=render(46.2,46.2);
 assert.match(up,/aria-label="전일 대비 1점 상승"/);assert.match(up,/title="전일 대비 1점 상승"/);assert.match(up,/ob-direction-up/);assert.match(up,/>1<svg/);
 assert.match(down,/aria-label="전일 대비 1점 하락"/);assert.match(down,/title="전일 대비 1점 하락"/);assert.match(down,/ob-direction-down/);assert.match(down,/>1<svg/);
 assert.match(flat,/변화 없음/);assert.doesNotMatch(flat,/<svg/);assert.equal(render(null,46.2),'');
 const small=render(46.6,46.2);
 assert.match(small,/aria-label="전일 대비 0점 상승"/);
 assert.match(small,/>0<svg/); // rounding affects the numeral, not direction of the original delta
 const larger=render(48.2,46.6);
 assert.match(larger,/aria-label="전일 대비 2점 상승"/);
 active=false;
 const expired=render(47.1,46.2);
 assert.match(expired,/>\+1<\/span>/);assert.match(expired,/data-arrow-active="false"/);assert.doesNotMatch(expired,/<svg/);
 assert.match(render(46.2,47.1),/>−1<\/span>/);
});
