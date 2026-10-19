import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const iran=readFileSync(new URL('../app/iran-progress.tsx',import.meta.url),'utf8');
const axis=readFileSync(new URL('../components/chart-axis-labels.tsx',import.meta.url),'utf8');

test('Iran compact 14-day chart supplies actual date endpoints to overlay axis',()=>{
 assert.match(iran,/\<ChartAxisLabels dates startLabel=\{startText\} endLabel=\{endText\}\/>/);
 assert.match(iran,/chartEndAt-13\*86400000/);
 assert.match(iran,/const dateLabel=\(at:number\)=>new Date\(at\)\.toISOString\(\)\.slice\(5,10\)\.replace\('-','\/'\)/);
 const end=Date.parse('2026-10-19T00:00:00Z');
 const start=new Date(end-13*86400000).toISOString().slice(5,10).replace('-','/');
 assert.equal(start,'10/06');
 assert.equal(new Date(end).toISOString().slice(5,10).replace('-','/'),'10/19');
});

test('fixed axis uses caller date labels while preserving 0 and 14 defaults for other charts',()=>{
 assert.match(axis,/startLabel='0',endLabel='14'/);
 assert.match(axis,/startLabel\?:string;endLabel\?:string/);
 assert.match(axis,/\{startLabel\}<\/b>/);
 assert.match(axis,/\{endLabel\}<\/b>/);
 assert.match(axis,/startLabel==='0'/);
 assert.match(axis,/endLabel==='14'/);
});

test('Iran chart remains on unchanged full 0/50/100 y-scale and 14 daily positions',()=>{
 assert.match(iran,/\[0,50,100\]\.map\(v=>/);
 assert.match(iran,/\/\(13\*86400000\)/);
 assert.match(iran,/strokeDasharray="3 3"/);
 assert.match(iran,/\<IranChart view=\{view\} compact\/>/);
});
