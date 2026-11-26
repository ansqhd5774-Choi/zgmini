import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  FED_G17_MANUFACTURING_FILE,
  FED_G17_MANUFACTURING_URL,
  parseFedG17Manufacturing,
  collectFedG17Manufacturing,
} from './inflation-causal-candidate-fed-g17.mjs';

const source=(last='99.1234')=>[
  '"B50001: Total index"','"B50001" 2025 100.0000 101.0000',
  '"GMF: Manufacturing (NAICS)"',
  `"GMF" 2025 ${Array(12).fill('98.0000').join(' ')}`,
  `"GMF" 2026 97.0786 97.7330 98.0924 98.8383 98.9825 99.2705 99.4308 99.1776 ${last}`,
  '"GMFD: Durable manufacturing (NAICS)"',
  '"GMFD" 2025 100.0000 100.0000',
].join('\n');
const base=()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-g17-candidate-'));
  const writer=path.join(temp,'pc-writer');fs.mkdirSync(writer);
  return {writer,clear:()=>fs.rmSync(temp,{recursive:true,force:true})};
};
const now=new Date('2026-11-08T05:00:00.000Z');

test('official G17 GMF section parses historical 12 months and partial year without GMFD leakage',()=>{
  const observations=parseFedG17Manufacturing(source());
  assert.equal(observations.length,21);
  assert.deepEqual(observations.at(-1),{date:'2026-09-01',value:99.1234});
  assert.deepEqual(observations[0],{date:'2025-01-01',value:98});
  assert.equal(observations.some(x=>x.value===100),false);
});

test('missing GMF, duplicate header, bad number and extra months fail explicitly',()=>{
  assert.throws(()=>parseFedG17Manufacturing('"GMFD: Durable manufacturing (NAICS)"'),/HEADER_MISSING/);
  assert.throws(()=>parseFedG17Manufacturing(source().replace('99.1234','NA')),/VALUE_INVALID/);
  assert.throws(()=>parseFedG17Manufacturing(source().replace('99.1234','99.1 100.1 101.1 102.1 103.1')),/YEAR_OR_MONTH_COUNT_INVALID/);
  assert.throws(()=>parseFedG17Manufacturing(source().replace('"GMFD: Durable manufacturing (NAICS)"',
    '"GMF: Manufacturing (NAICS)"')),/HEADER_DUPLICATE/);
});

test('stores private raw GMF archive, hashes and revised official index with readback',async t=>{
  const fixture=base();t.after(fixture.clear);
  let last='99.1234',requests=0;
  const quotaFetch=async (url,options)=>{
    requests++;
    assert.equal(String(url),FED_G17_MANUFACTURING_URL);
    assert.equal(options.redirect,'manual');
    return new Response(source(last),{status:200});
  };
  const first=await collectFedG17Manufacturing({base:fixture.writer,quotaFetch,now});
  assert.equal(first.status,'SAVED_READBACK');
  const file=path.join(fixture.writer,FED_G17_MANUFACTURING_FILE);
  assert.equal(fs.existsSync(path.join(fixture.writer,'inflation-causal-candidates-r1',first.archive)),true);
  assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).observations.at(-1).value,99.1234);
  const repeated=await collectFedG17Manufacturing({base:fixture.writer,quotaFetch,now});
  assert.equal(repeated.status,'UNCHANGED');
  last='99.5555';
  const revised=await collectFedG17Manufacturing({base:fixture.writer,quotaFetch,now});
  assert.equal(revised.status,'SAVED_READBACK');
  assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).observations.at(-1).value,99.5555);
  assert.equal(requests,3);
});

test('invalid next provider result and unauthorized base protect previous data',async t=>{
  const fixture=base();t.after(fixture.clear);
  let corrupt=false;
  const quotaFetch=async()=>new Response(corrupt?source('X'):source(),{status:200});
  await collectFedG17Manufacturing({base:fixture.writer,quotaFetch,now});
  const file=path.join(fixture.writer,FED_G17_MANUFACTURING_FILE),previous=fs.readFileSync(file);
  corrupt=true;
  await assert.rejects(()=>collectFedG17Manufacturing({base:fixture.writer,quotaFetch,now}),/VALUE_INVALID/);
  assert.deepEqual(previous,fs.readFileSync(file));
  await assert.rejects(()=>collectFedG17Manufacturing({base:'/tmp',quotaFetch,now}),/PC_BASE_DENIED/);
  await assert.rejects(()=>collectFedG17Manufacturing({base:fixture.writer,quotaFetch:null,now}),/QUOTA_FETCH_REQUIRED/);
});
