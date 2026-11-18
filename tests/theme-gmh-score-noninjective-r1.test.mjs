// W03: source-only proof of a non-unique mapping from GMH raw close levels
// to approved R188 derived scores. This is NOT legal clearance or a raw-data
// rehash: publication still requires separate rights/source/display approval.
import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreAll252} from '../scripts/pc-writer/theme-optional-score-r188.mjs';

test('R188 derived 252-day scores cannot uniquely determine 628 raw price levels',()=>{
 const own=Array.from({length:628},(_,i)=>
  120+i*.071+Math.sin(i*.137)*3.2);
 const spy=Array.from({length:628},(_,i)=>
  390+i*.053+Math.cos(i*.081)*5.1);
 const differentOwn=own.map(price=>price*2);
 const differentSpy=spy.map(price=>price*4);
 assert.notEqual(own[0],differentOwn[0]);
 assert.notEqual(spy[0],differentSpy[0]);
 const original=scoreAll252(own,spy);
 const alternative=scoreAll252(differentOwn,differentSpy);
 assert.equal(original.length,252);
 assert.notEqual(original[0],original.at(-1));
 assert.deepEqual(alternative,original);
 assert.ok(original.every(v=>Number.isFinite(v)&&v>=0&&v<=100));
});
