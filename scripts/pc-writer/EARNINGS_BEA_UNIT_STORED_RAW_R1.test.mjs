import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {captureBeaUnitSourceOnce,readBeaUnitArchivedSource,beaUnitRawPaths}
  from './EARNINGS_BEA_UNIT_STORED_RAW_R1.mjs';

const AT=Date.parse('2026-11-16T08:00:00.000Z');
const CSV='observation_date,A463RD3Q052SBEA\n'
  +'2024-01-01,0.202\n2024-04-01,0.207\n2024-07-01,0.213\n'
  +'2024-10-01,0.220\n2025-01-01,0.231\n2025-04-01,0.250\n';
function root(){return fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-bea-archive-'));}
function response(text=CSV,{lengthHeader,rawBytes,contentEncoding}={}){
  const bytes=rawBytes??Buffer.from(text,'utf8');
  const declared=lengthHeader===undefined?String(bytes.length):lengthHeader;
  return {ok:true,body:{},headers:{get:name=>name==='content-length'?declared
    :name==='content-encoding'?(contentEncoding??null):null},
    arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),
    text:async()=>{throw Error('HTTP_TEXT_MUST_NOT_BE_USED');}};
}
test('one source fetch, immutable bytes, pinned offline reread and preserved capture time',async()=>{
  const pcBase=root();let calls=0;
  try{
    const captured=await captureBeaUnitSourceOnce({pcBase,storedAt:AT,
      fetchImpl:async()=>{calls++;return response();}});
    assert.equal(captured.status,'SOURCE_STORED_READBACK_VERIFIED');
    assert.equal(calls,1);
    const first=readBeaUnitArchivedSource({pcBase,sourceSha:captured.sourceSha});
    assert.equal(first.payload.sourceVersion,captured.sourceSha);
    assert.equal(first.payload.sourceStoredAt,AT);
    assert.equal(first.payload.indicator.value,0.250);
    assert.equal(first.payload.indicator.previousValue,0.231);
    const again=readBeaUnitArchivedSource({pcBase,sourceSha:captured.sourceSha});
    assert.deepEqual(again.payload,first.payload);
    const repeated=await captureBeaUnitSourceOnce({pcBase,storedAt:AT+1000,
      fetchImpl:async()=>{calls++;return response();}});
    assert.equal(repeated.status,'ALREADY_CAPTURED');
    assert.equal(repeated.sourceStoredAt,AT);
    assert.equal(calls,2); // Legacy unpinned repeat remains an explicit fetch.
    const reused=await captureBeaUnitSourceOnce({pcBase,sourceSha:captured.sourceSha,
      fetchImpl:async()=>{calls++;throw Error('PROVIDER_MUST_NOT_BE_CALLED');}});
    assert.equal(reused.status,'ALREADY_CAPTURED');
    assert.equal(reused.sourceStoredAt,AT);
    assert.equal(calls,2); // Pinned archive reuse makes no second provider call.
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('pinned archive missing or invalid fails before provider fetch',async()=>{
  const pcBase=root();let calls=0;
  const fetchImpl=async()=>{calls++;return response();};
  try{
    await assert.rejects(captureBeaUnitSourceOnce({
      pcBase,sourceSha:'0'.repeat(64),fetchImpl}),
      /BEA_UNIT_STORED_SOURCE_MISSING/);
    await assert.rejects(captureBeaUnitSourceOnce({
      pcBase,sourceSha:'bad',fetchImpl}),
      /BEA_UNIT_STORED_SOURCE_PIN_INVALID/);
    assert.equal(calls,0);
    assert.equal(fs.existsSync(path.join(pcBase,'raw')),false);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});
test('archive SHA pins the raw HTTP response bytes without using response.text',async()=>{
  const pcBase=root();let reads=0;
  try{
    const captured=await captureBeaUnitSourceOnce({pcBase,storedAt:AT,
      fetchImpl:async()=>{reads++;return response();}});
    assert.equal(reads,1);
    const f=beaUnitRawPaths({pcBase,sourceSha:captured.sourceSha});
    const actual=fs.readFileSync(f.csv);
    const {createHash}=await import('node:crypto');
    assert.equal(createHash('sha256').update(actual).digest('hex'),captured.sourceSha);
    assert.equal(actual.toString('utf8'),CSV);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});
test('reject declared byte-length mismatch or malformed UTF-8 before writing',async()=>{
  const pcBase=root();
  try{
    await assert.rejects(captureBeaUnitSourceOnce({pcBase,storedAt:AT,
      fetchImpl:async()=>response(CSV,{lengthHeader:'1'})}),
      /BEA_UNIT_SOURCE_LENGTH_MISMATCH/);
    assert.equal(fs.existsSync(path.join(pcBase,'raw')),false);
    const invalid=Buffer.concat([Buffer.from(CSV),Buffer.from([0xff])]);
    await assert.rejects(captureBeaUnitSourceOnce({pcBase,storedAt:AT,
      fetchImpl:async()=>response(CSV,{rawBytes:invalid})}),
      /BEA_UNIT_SOURCE_ENCODING_INVALID/);
    assert.equal(fs.existsSync(path.join(pcBase,'raw')),false);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});
test('compressed HTTP length is distinct from decompressed CSV bytes',async()=>{
  const pcBase=root();
  try{
    const compressedLength=String(Buffer.byteLength(CSV)-5);
    const captured=await captureBeaUnitSourceOnce({pcBase,storedAt:AT,
      fetchImpl:async()=>response(CSV,{lengthHeader:compressedLength,contentEncoding:'gzip'})});
    assert.equal(captured.status,'SOURCE_STORED_READBACK_VERIFIED');
    const stored=readBeaUnitArchivedSource({pcBase,sourceSha:captured.sourceSha});
    assert.equal(stored.payload.indicator.value,0.250);
    assert.equal(fs.readFileSync(stored.files.csv,'utf8'),CSV);
    await assert.rejects(captureBeaUnitSourceOnce({pcBase,storedAt:AT,
      fetchImpl:async()=>response(CSV,{lengthHeader:compressedLength,contentEncoding:'identity'})}),
      /BEA_UNIT_SOURCE_LENGTH_MISMATCH/);
    await assert.rejects(captureBeaUnitSourceOnce({pcBase,storedAt:AT,
      fetchImpl:async()=>response(CSV,{contentEncoding:'unknown'})}),
      /BEA_UNIT_SOURCE_ENCODING_UNSUPPORTED/);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});
test('reject wrong SHA and broken/changed source without publishing',async()=>{
  const pcBase=root();
  try{
    assert.throws(()=>readBeaUnitArchivedSource({pcBase,sourceSha:'bad'}),
      /BEA_UNIT_STORED_SOURCE_PIN_INVALID/);
    const x=await captureBeaUnitSourceOnce({pcBase,storedAt:AT,
      fetchImpl:async()=>response()});
    const files=beaUnitRawPaths({pcBase,sourceSha:x.sourceSha});
    fs.writeFileSync(files.csv,'tampered');
    assert.throws(()=>readBeaUnitArchivedSource({pcBase,sourceSha:x.sourceSha}),
      /BEA_UNIT_STORED_SOURCE_HASH_MISMATCH/);
    await assert.rejects(captureBeaUnitSourceOnce({pcBase,storedAt:AT+1000,
      fetchImpl:async()=>response()}),/BEA_UNIT_STORED_SOURCE_HASH_MISMATCH/);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});
test('reject altered metadata source timestamp and wrong provenance',async()=>{
  const pcBase=root();
  try{
    const x=await captureBeaUnitSourceOnce({pcBase,storedAt:AT,fetchImpl:async()=>response()});
    const f=beaUnitRawPaths({pcBase,sourceSha:x.sourceSha});
    const v=JSON.parse(fs.readFileSync(f.meta,'utf8'));
    v.sourceRetrievedAt='2026-11-16T08:00:01.000Z';
    fs.writeFileSync(f.meta,JSON.stringify(v));
    assert.throws(()=>readBeaUnitArchivedSource({pcBase,sourceSha:x.sourceSha}),
      /BEA_UNIT_STORED_SOURCE_META_MISMATCH/);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});
test('invalid provider CSV never saves an archive',async()=>{
  const pcBase=root();
  try{
    await assert.rejects(captureBeaUnitSourceOnce({pcBase,storedAt:AT,
      fetchImpl:async()=>response('not,csv\n2025-01-01,0.2\n')}),
      /BEA_UNIT_INVALID_CSV_HEADER/);
    assert.equal(fs.existsSync(path.join(pcBase,'raw')),false);
    await assert.rejects(captureBeaUnitSourceOnce({pcBase,storedAt:AT,
      fetchImpl:async()=>({ok:false,body:{},headers:{get:()=>0}})}),
      /BEA_UNIT_SOURCE_HTTP_FAILED/);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});
test('publisher does not contain a provider fetch path in either mode',()=>{
  const source=fs.readFileSync(new URL('./EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bfetch\s*\(/);
  assert.match(source,/ZGMINI_EARNINGS_BEA_UNIT_SOURCE_SHA/);
  assert.match(source,/readBeaUnitArchivedSource/);
});

test('refuse archive directory symlink before creating immutable CSV',async()=>{
  const pcBase=root(),outside=root();
  try{
    fs.symlinkSync(outside,path.join(pcBase,'raw'),'dir');
    await assert.rejects(captureBeaUnitSourceOnce({pcBase,storedAt:AT,
      fetchImpl:async()=>response()}),/BEA_UNIT_STORED_PATH_UNSAFE/);
    assert.deepEqual(fs.readdirSync(outside),[]);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});
    fs.rmSync(outside,{recursive:true,force:true});}
});

test('refuse linked original CSV or metadata without altering either target',async()=>{
  const pcBase=root(),outside=root();
  try{
    const x=await captureBeaUnitSourceOnce({pcBase,storedAt:AT,
      fetchImpl:async()=>response()});
    const files=beaUnitRawPaths({pcBase,sourceSha:x.sourceSha});
    for(const file of [files.csv,files.meta]){
      const target=path.join(outside,path.basename(file));
      const original=fs.readFileSync(file);
      fs.writeFileSync(target,original);
      fs.rmSync(file);
      fs.symlinkSync(target,file,'file');
      assert.throws(()=>readBeaUnitArchivedSource({pcBase,sourceSha:x.sourceSha}),
        /BEA_UNIT_STORED_PATH_UNSAFE/);
      assert.deepEqual(fs.readFileSync(target),original);
      fs.rmSync(file);
      fs.writeFileSync(file,original,{flag:'wx'});
    }
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});
    fs.rmSync(outside,{recursive:true,force:true});}
});

test('half-written archive is preserved, not automatically healed or overwritten',async()=>{
  const pcBase=root();
  try{
    const first=await captureBeaUnitSourceOnce({pcBase,storedAt:AT,
      fetchImpl:async()=>response()});
    const files=beaUnitRawPaths({pcBase,sourceSha:first.sourceSha});
    fs.rmSync(files.meta);
    const before=fs.readFileSync(files.csv);
    await assert.rejects(captureBeaUnitSourceOnce({pcBase,storedAt:AT+1000,
      fetchImpl:async()=>response()}),/BEA_UNIT_STORED_SOURCE_MISSING/);
    assert.deepEqual(fs.readFileSync(files.csv),before);
    assert.equal(fs.existsSync(files.meta),false);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('dangling CSV or metadata symlink fails closed as unsafe, not missing',async()=>{
  const pcBase=root();
  try{
    const captured=await captureBeaUnitSourceOnce({pcBase,storedAt:AT,
      fetchImpl:async()=>response()});
    const files=beaUnitRawPaths({pcBase,sourceSha:captured.sourceSha});
    for(const file of [files.csv,files.meta]){
      const before=fs.readFileSync(file);
      fs.rmSync(file);
      fs.symlinkSync(path.join(files.archive,'not-present'),file,'file');
      assert.throws(()=>readBeaUnitArchivedSource({pcBase,sourceSha:captured.sourceSha}),
        /BEA_UNIT_STORED_PATH_UNSAFE/);
      await assert.rejects(captureBeaUnitSourceOnce({pcBase,storedAt:AT+1000,
        fetchImpl:async()=>response()}),/BEA_UNIT_STORED_PATH_UNSAFE/);
      fs.rmSync(file);
      fs.writeFileSync(file,before,{flag:'wx'});
    }
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});
