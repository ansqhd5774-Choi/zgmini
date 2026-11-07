import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {parseEiaRegularWeekly,collectEiaRegularWeekly,EIA_REGULAR_SERIES,
  EIA_REGULAR_FILE} from './inflation-causal-candidate-eia-gasoline.mjs';

const weekDays=['2026-08-03','2026-08-10','2026-08-17','2026-08-24',
  '2026-08-31','2026-09-07','2026-09-14','2026-09-21'];
const rows=(revision='4.153')=>Array.from({length:8},(_,i)=>({
  series:EIA_REGULAR_SERIES,duoarea:'NUS',units:'$/GAL',
  period:weekDays[i],value:i===7?revision:'4.200',
}));
const data=(items=rows())=>({response:{frequency:'weekly',total:1300,data:items}});
const fixture=()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-eia-reg-'));
  const base=path.join(temp,'pc-writer');fs.mkdirSync(base);
  return {base,clear:()=>fs.rmSync(temp,{recursive:true,force:true})};
};
const now=new Date('2026-11-08T00:00:00Z');

test('strict EIA v2 weekly national facet, series, unit and missing distinct from zero',()=>{
  const parsed=parseEiaRegularWeekly(data());
  assert.equal(parsed.observations.length,8);
  assert.equal(parsed.observations.at(-1).value,4.153);
  assert.throws(()=>parseEiaRegularWeekly(data(rows().map(r=>({...r,duoarea:'CAN'})))),/SERIES_OR_DATE_INVALID/);
  assert.throws(()=>parseEiaRegularWeekly(data(rows().map(r=>({...r,units:'Dollars'})))),/SERIES_OR_DATE_INVALID/);
  assert.throws(()=>parseEiaRegularWeekly(data(rows().map(r=>({...r,series:'OTHER'})))),/SERIES_OR_DATE_INVALID/);
  assert.throws(()=>parseEiaRegularWeekly(data(rows().map(r=>({...r,value:'0'})))),/VALUE_INVALID/);
  const missing=parseEiaRegularWeekly(data(rows().map((r,i)=>i===7?{...r,value:null}:r)));
  assert.equal(missing.missing.length,1);
});

test('key-backed provider call is bounded to specific series and preserves revisions',async t=>{
  const ctx=fixture();t.after(ctx.clear);
  let revision='4.153',calls=0;
  const quotaFetch=async url=>{
    calls++;const params=new URL(url).searchParams;
    assert.equal(params.get('api_key'),'secret-test-key');
    assert.equal(params.get('facets[series][]'),EIA_REGULAR_SERIES);
    assert.equal(params.get('frequency'),'weekly');
    assert.equal(params.get('length'),'520');
    return new Response(JSON.stringify(data(rows(revision))),{status:200});
  };
  const collect=()=>collectEiaRegularWeekly({base:ctx.base,eiaKey:'secret-test-key',quotaFetch,now});
  assert.equal((await collect()).status,'SAVED_READBACK');
  assert.equal((await collect()).status,'UNCHANGED');
  revision='4.203';assert.equal((await collect()).status,'SAVED_READBACK');
  const doc=JSON.parse(fs.readFileSync(path.join(ctx.base,EIA_REGULAR_FILE),'utf8'));
  assert.equal(doc.observations.at(-1).value,4.203);
  assert.equal(calls,3);
  assert.equal(JSON.stringify(doc).includes('secret-test-key'),false);
});

test('invalid response cannot overwrite snapshot; no key / quota stops before network',async t=>{
  const ctx=fixture();t.after(ctx.clear);
  let invalid=false,calls=0;
  const quotaFetch=async()=>{calls++;return new Response(JSON.stringify(data(invalid?rows('NA'):rows())),{status:200});};
  const options={base:ctx.base,eiaKey:'k',quotaFetch,now};
  await collectEiaRegularWeekly(options);
  const file=path.join(ctx.base,EIA_REGULAR_FILE),before=fs.readFileSync(file);
  invalid=true;
  await assert.rejects(()=>collectEiaRegularWeekly(options),/VALUE_INVALID/);
  assert.deepEqual(before,fs.readFileSync(file));
  const prevCalls=calls;
  await assert.rejects(()=>collectEiaRegularWeekly({...options,eiaKey:''}),/KEY_MISSING/);
  await assert.rejects(()=>collectEiaRegularWeekly({...options,quotaFetch:null}),/QUOTA_REQUIRED/);
  assert.equal(calls,prevCalls);
});
