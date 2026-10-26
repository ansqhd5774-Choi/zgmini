import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {createRequire} from 'node:module';
import {scoreAll252} from '../scripts/pc-writer/theme-optional-score-r188.mjs';
import {scoreAdaptiveTimeline} from '../scripts/pc-writer/theme-optional-adaptive-r2.mjs';
const require=createRequire(import.meta.url);
const {compareTheme}=require('../scripts/pc-writer/theme-nine-parity-r6.cjs');
const root='../scripts/pc-writer/';
const read=name=>fs.readFileSync(new URL(root+name,import.meta.url),'utf8');
const scoreFuncs={scoreAll252,scoreAdaptiveTimeline};

test('R6 standalone exactly embeds R5 toolkit and existing R188/R2 source, not rewritten formulas',()=>{
 const cmd=read('theme-nine-parity-r6.cmd');
 assert.equal(cmd.replace(/\r\n/g,'').includes('\n'),false);
 const lines=cmd.trimEnd().split('\r\n');
 assert.ok(lines.every(line=>line.length<8191));
 const chunks=lines.filter(line=>/^set "R6_PART_\d+=/.test(line)).map(line=>line.slice(line.indexOf('=')+1,-1));
 assert.ok(chunks.length>=4);
 const obj=JSON.parse(zlib.inflateRawSync(Buffer.from(chunks.join(''),'base64')).toString('utf8'));
 assert.equal(obj.runner,read('theme-nine-parity-r6.cjs'));
 assert.equal(obj.toolkit,read('theme-nine-source-r5.cjs'));
 assert.equal(obj.r188,read('theme-optional-score-r188.mjs'));
 assert.equal(obj.r2,read('theme-optional-adaptive-r2.mjs'));
 // The same in-memory CommonJS/ESM bootstrap used in Windows must evaluate in isolation.
 const load=s=>{const m={exports:{}};new Function('require','module','exports','process',s)(require,m,m.exports,process);return m.exports;};
 const esm=(s,n)=>new Function(s.replace(/\bexport\s+/g,'')+';return {'+n+'}')();
 const previousToolkit=globalThis.__R6_TOOLKIT__,previousScorers=globalThis.__R6_SCORERS__;
 try{
  globalThis.__R6_TOOLKIT__=load(obj.toolkit);
  globalThis.__R6_SCORERS__={...esm(obj.r188,'scoreAll252'),...esm(obj.r2,'scoreAdaptiveTimeline')};
  assert.equal(typeof load(obj.runner).run,'function');
 }finally{
  if(previousToolkit===undefined)delete globalThis.__R6_TOOLKIT__;
  else globalThis.__R6_TOOLKIT__=previousToolkit;
  if(previousScorers===undefined)delete globalThis.__R6_SCORERS__;
  else globalThis.__R6_SCORERS__=previousScorers;
 }
 assert.ok(cmd.includes('R6_PART_1'));
 assert.ok(!cmd.toLowerCase().includes('powershell'));
});
test('R6 252-day R188/R2 parity on complete real-form input, no artificial data exported',()=>{
 const days=Array.from({length:710},(_,i)=>new Date(Date.UTC(2024,0,2)+i*86400000).toISOString().slice(0,10));
 const prices=Object.fromEntries(['SPY','BOTZ','ROBO'].map((sym,k)=>[sym,new Map(days.map((d,i)=>[
  d,100+k*5+0.07*i+Math.sin(i/18+k)*3+Math.cos(i/51)*1.4
 ]))]));
 const result=compareTheme('robotics','BOTZ','ROBO',new Map(Object.entries(prices)),scoreFuncs);
 assert.equal(result.rawSpyDays,710);
 assert.equal(result.scored,252);
 assert.equal(result.comparables,252);
 assert.equal(result.parityViolations,0);
 assert.equal(result.status,'R188_R2_PARITY_252_PASS');
 assert.ok(Math.abs(result.latest.candidate-result.latest.reference)<1e-10);
});
test('R6 one genuine missing old row is not invented; last 252 still auditable if older than lookback',()=>{
 const days=Array.from({length:710},(_,i)=>new Date(Date.UTC(2024,0,2)+i*86400000).toISOString().slice(0,10));
 const prices=new Map(['SPY','ITA','SHLD'].map((sym,k)=>[sym,new Map(days.map((date,i)=>[
  date,90+k*9+0.02*i+Math.sin(i/22+k)*2
 ]))]));
 prices.get('SHLD').delete(days[1]);
 const result=compareTheme('defense','ITA','SHLD',prices,scoreFuncs);
 assert.equal(result.missingPriceSlots,1);
 assert.equal(result.comparables,252);
 assert.equal(result.status,'R188_R2_PARITY_252_PASS');
});
