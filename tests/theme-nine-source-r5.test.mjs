import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {extractArray,arraysIn,dateFrom,run}=require('../scripts/pc-writer/theme-nine-source-r5.cjs');
const cmdPath=new URL('../scripts/pc-writer/theme-nine-source-r5.cmd',import.meta.url);
const sourcePath=new URL('../scripts/pc-writer/theme-nine-source-r5.cjs',import.meta.url);

test('real NY 15-hour proxy extraction and early close 12-hour, not 14-hour',()=>{
 const a=[
  {timestamp:'2025-07-02T18:00:00Z',close:11},
  {timestamp:'2025-07-02T19:00:00Z',close:12},
  {timestamp:'2025-07-03T16:00:00Z',close:13},
  {timestamp:'2025-07-03T17:00:00Z',close:14},
  {timestamp:'2025-07-03T19:00:00Z',close:15},
 ];
 const result=extractArray(a,'hourly');
 assert.deepEqual(result.rows,[{date:'2025-07-02',price:12},{date:'2025-07-03',price:13}]);
 assert.equal(result.mode,'NY_HOURLY_15_12');
});
test('fallback nested daily bar schema and no invented prices',()=>{
 const nested={source:{bars:{days:[{date:'2025-01-02',proxyClose:100},
  {date:'2025-01-03',proxyClose:101},{date:'2025-01-06',proxyClose:null}]}}};
 const c=arraysIn(nested);
 assert.equal(c[0].rows.length,2);
 assert.equal(c[0].key,'source.bars.days');
 assert.equal(dateFrom({timestamp:'2025-01-02 15:00:00'}),null);
});
test('R5 CMD is fully embedded, CRLF ASCII and each line below Win CMD limit',()=>{
 const cmd=fs.readFileSync(cmdPath);
 assert.equal(cmd.includes(0),false);
 assert.equal(cmd.toString('ascii').includes('\n')&&cmd.toString('ascii').replace(/\r\n/g,'').includes('\n'),false);
 const lines=cmd.toString('ascii').split('\r\n');
 assert.ok(lines.every(l=>l.length<8191));
 const chunks=lines.filter(l=>/^set "R5_PART_\d+=/.test(l)).map(l=>l.slice(l.indexOf('=')+1,-1));
 assert.ok(chunks.length>=2);
 assert.equal(zlib.inflateRawSync(Buffer.from(chunks.join(''),'base64')).toString('utf8'),
  fs.readFileSync(sourcePath,'utf8'));
 assert.ok(lines.some(l=>l.includes('m.exports.run(process.argv[1])')));
 assert.ok(!cmd.toString('ascii').includes('powershell'));
});
test('fake fixture audit outputs all nine, no prices and does not write in dataRoot',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-nine-r5-test-'));
 const base=path.join(root,'theme-market-history-r131');
 try{
  fs.mkdirSync(path.join(base,'derived','warmup-joined'),{recursive:true});
  const dates=['2025-01-02','2025-01-03'];
  for(const sym of ['SPY','BOTZ','ROBO']){
   fs.writeFileSync(path.join(base,'derived','warmup-joined',`${sym}_candidate.joined-research.json`),
    JSON.stringify({symbol:sym,days:dates.map((date,i)=>({date,proxyClose:100+i}))}));
  }
  const out=[];run(root,line=>out.push(line));
  assert.equal(out.filter(s=>s.startsWith('THEME=')).length,9);
  assert.ok(out.some(s=>s.startsWith('THEME=robotics;')&&s.includes('COMMON_CANDIDATE_DAYS=2')));
  assert.ok(out.some(s=>s.includes('SOURCE=BOTZ/JOINED_DERIVED;FILES=1;DAYS=2')));
  assert.ok(!out.some(s=>s.includes('proxyClose:100')));
  assert.deepEqual(fs.readdirSync(root),['theme-market-history-r131']);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
