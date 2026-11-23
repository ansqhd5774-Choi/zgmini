import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {captureBeaUnitNipaOnce,readBeaUnitNipaRawArchive,beaUnitNipaRawPaths}
  from '../scripts/pc-writer/EARNINGS_BEA_UNIT_NIPA_RAW_R1.mjs';

const AT=Date.parse('2026-11-23T09:20:00.000Z');
const KEY='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const rows=[['2025Q2','0.216'],['2025Q3','0.219'],['2025Q4','0.222'],
  ['2026Q1','0.231'],['2026Q2','0.250']];
const BODY=Buffer.from(JSON.stringify({BEAAPI:{Results:{Data:
  rows.map(([TimePeriod,DataValue])=>({TableName:'T11500',SeriesCode:'A463RD',
    LineNumber:'7',TimePeriod,DataValue,UNIT_MULT:'0',CL_UNIT:'USD'}))
}}}));
function fixture(t){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'w05-bea-nipa-'));
  const root=path.join(temp,'ZGmini','data','pc-writer');
  fs.mkdirSync(root,{recursive:true});
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  return root;
}
function response(bytes=BODY){
  return {ok:true,headers:{get:n=>n==='content-length'?String(bytes.length):null},
    arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)};
}
const capture=(root,fetchImpl,extra={})=>captureBeaUnitNipaOnce({
  pcBase:root,fetchImpl,beaApiKey:KEY,observationYear:2026,storedAt:AT,...extra
});

test('single BEA T11500/Q GET, immutable original-byte hash, metadata and offline readback',async t=>{
  const root=fixture(t);let calls=0;
  const result=await capture(root,async url=>{
    calls++;
    const request=new URL(url);
    assert.equal(request.origin,'https://apps.bea.gov');
    assert.equal(request.pathname,'/api/data');
    assert.equal(request.searchParams.get('UserID'),KEY);
    assert.equal(request.searchParams.get('TableName'),'T11500');
    assert.equal(request.searchParams.get('Frequency'),'Q');
    assert.equal(request.searchParams.get('Year'),'2025,2026');
    assert.equal(request.searchParams.get('datasetname'),'NIPA');
    return response();
  });
  assert.equal(calls,1);
  assert.equal(result.status,'SOURCE_STORED_READBACK_VERIFIED');
  assert.equal(result.observedThrough,'2026-06-30');
  assert.equal(result.verifiedQuarters,5);
  assert.equal(result.operationalWrites,2);
  const paths=beaUnitNipaRawPaths({pcBase:root,sourceSha:result.sourceSha});
  const raw=fs.readFileSync(paths.raw);
  assert.deepEqual(raw,BODY);
  assert.equal(createHash('sha256').update(raw).digest('hex'),result.sourceSha);
  const meta=JSON.parse(fs.readFileSync(paths.meta,'utf8'));
  assert.equal(meta.sourceUrl,'https://apps.bea.gov/api/data');
  assert.equal(JSON.stringify(meta).includes(KEY),false);
  const offline=readBeaUnitNipaRawArchive({pcBase:root,sourceSha:result.sourceSha});
  assert.equal(offline.sourceStoredAt,AT);
  assert.equal(offline.providerCalls,undefined);
  const pinned=await capture(root,async()=>{throw Error('FORBIDDEN_FETCH');},
    {sourceSha:result.sourceSha,beaApiKey:undefined});
  assert.equal(pinned.status,'ALREADY_CAPTURED');
  assert.equal(pinned.providerCalls,0);
});

test('mismatched API table, date and unsupported multiplier fail before creating archive',async t=>{
  const root=fixture(t);
  const base=JSON.parse(BODY.toString('utf8'));
  for(const [field,val] of [['TableName','T99999'],['TimePeriod','2026Q3'],['UNIT_MULT','3']]){
    const modified=structuredClone(base);
    modified.BEAAPI.Results.Data.at(-1)[field]=val;
    await assert.rejects(capture(root,async()=>response(Buffer.from(JSON.stringify(modified)))),
      /BEA_UNIT_NIPA_/);
    assert.equal(fs.existsSync(path.join(root,'raw')),false);
  }
});

test('bad JSON, oversized response and wrong content length do not create raw files',async t=>{
  const root=fixture(t);
  for(const bytes of [Buffer.from('{invalid JSON but long enough to process}'),
    Buffer.alloc(2_000_001,0x78),BODY]){
    await assert.rejects(capture(root,async()=>({
      ...response(bytes),
      headers:{get:n=>n==='content-length'?String(bytes.length+1):null}
    })),/BEA_UNIT_NIPA_SOURCE_HTTP_FAILED/);
    assert.equal(fs.existsSync(path.join(root,'raw')),false);
  }
  await assert.rejects(capture(root,async()=>response(Buffer.from('invalid json content here'))),
    /BEA_UNIT_NIPA_RAW_JSON_INVALID/);
  assert.equal(fs.existsSync(path.join(root,'raw')),false);
});

test('wrong API credential and unsafe archive directory prevent provider calls',async t=>{
  const root=fixture(t);
  let calls=0;
  await assert.rejects(capture(root,async()=>{calls++;return response();},{beaApiKey:'not-a-key'}),
    /BEA_UNIT_NIPA_CAPTURE_ARGUMENT_INVALID/);
  fs.symlinkSync(root,path.join(root,'raw'),'dir');
  await assert.rejects(capture(root,async()=>{calls++;return response();}),
    /BEA_UNIT_NIPA_PATH_UNSAFE/);
  assert.equal(calls,0);
});

test('reject tampered JSON, metadata and oversized metadata without modifying source',async t=>{
  const root=fixture(t);
  const first=await capture(root,async()=>response());
  const files=beaUnitNipaRawPaths({pcBase:root,sourceSha:first.sourceSha});
  const original=fs.readFileSync(files.raw);
  fs.writeFileSync(files.raw,Buffer.from('tampered raw source 123456789'));
  assert.throws(()=>readBeaUnitNipaRawArchive({pcBase:root,sourceSha:first.sourceSha}),
    /BEA_UNIT_NIPA_SHA_MISMATCH/);
  fs.writeFileSync(files.raw,original);
  const meta=fs.readFileSync(files.meta);
  fs.writeFileSync(files.meta,Buffer.alloc(10_001,0x77));
  assert.throws(()=>readBeaUnitNipaRawArchive({pcBase:root,sourceSha:first.sourceSha}),
    /BEA_UNIT_NIPA_FILE_SIZE_INVALID/);
  fs.writeFileSync(files.meta,meta);
  const changed=JSON.parse(meta.toString('utf8'));
  changed.sourceStoredAt+=1;
  fs.writeFileSync(files.meta,JSON.stringify(changed));
  assert.throws(()=>readBeaUnitNipaRawArchive({pcBase:root,sourceSha:first.sourceSha}),
    /BEA_UNIT_NIPA_META_MISMATCH/);
});

test('half-written original archive is preserved and not overwritten',async t=>{
  const root=fixture(t);
  const first=await capture(root,async()=>response());
  const files=beaUnitNipaRawPaths({pcBase:root,sourceSha:first.sourceSha});
  const bytes=fs.readFileSync(files.raw);
  fs.rmSync(files.meta);
  await assert.rejects(capture(root,async()=>response()),
    /BEA_UNIT_NIPA_SOURCE_MISSING/);
  assert.deepEqual(fs.readFileSync(files.raw),bytes);
  assert.equal(fs.existsSync(files.meta),false);
});
