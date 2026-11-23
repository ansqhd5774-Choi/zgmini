import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {beaUnitNipaArchivePaths,readBeaUnitNipaArchive,
  saveBeaUnitNipaArchive,computeBeaUnitNipaStoredPreview} from '../scripts/pc-writer/EARNINGS_BEA_UNIT_NIPA_ARCHIVE_R1.mjs';

const AT=Date.parse('2026-11-23T00:00:00Z');
const data=()=>({BEAAPI:{Results:{Data:
  [['2025Q2','0.216'],['2025Q3','0.219'],['2025Q4','0.222'],
   ['2026Q1','0.231'],['2026Q2','0.250']]
    .map(([TimePeriod,DataValue])=>({
      TableName:'T11500',SeriesCode:'A463RD',LineNumber:'7',
      TimePeriod,DataValue,CL_UNIT:'USD',UNIT_MULT:'0'
    }))
}}});
const bytes=()=>Buffer.from(JSON.stringify(data()),'utf8');
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-bea-nipa-json-'));

test('exact BEA JSON bytes are saved once, reread by SHA, never represented as FRED',()=>{
  const pcBase=temp();
  try{
    const rawBytes=bytes();
    const hash=createHash('sha256').update(rawBytes).digest('hex');
    const one=saveBeaUnitNipaArchive({pcBase,rawBytes,sourceStoredAt:AT});
    assert.equal(one.status,'SOURCE_STORED_READBACK_VERIFIED');
    assert.equal(one.sourceVersion,hash);
    const paths=beaUnitNipaArchivePaths({pcBase,sourceSha:hash});
    assert.deepEqual(fs.readFileSync(paths.raw),rawBytes);
    const checked=readBeaUnitNipaArchive({pcBase,sourceSha:hash});
    assert.equal(checked.status,'SOURCE_READBACK_VERIFIED');
    assert.equal(checked.preview.transport,'BEA_API_JSON');
    assert.equal(checked.preview.observedThrough,'2026-06-30');
    assert.equal('indicator' in checked.preview,false);
    const again=saveBeaUnitNipaArchive({pcBase,rawBytes,sourceStoredAt:AT+1000});
    assert.equal(again.status,'ALREADY_CAPTURED');
    assert.equal(again.sourceStoredAt,AT);
    assert.deepEqual(fs.readFileSync(paths.raw),rawBytes);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('modern BEA Level response archives and revalidates without rewriting statistical unit values',()=>{
  const pcBase=temp();
  try{
    const modern=data();
    for(const row of modern.BEAAPI.Results.Data){
      row.CL_UNIT='Level';
      row.METRIC_NAME='Dollars per Unit';
    }
    const bytes=Buffer.from(JSON.stringify({BEAAPI:{
      Request:{RequestParam:[{ParameterName:'USERID',ParameterValue:'SECRET_ONLY_TEST'}]},
      Results:modern.BEAAPI.Results
    }}));
    const saved=saveBeaUnitNipaArchive({pcBase,rawBytes:bytes,sourceStoredAt:AT});
    assert.equal(saved.status,'SOURCE_STORED_READBACK_VERIFIED');
    const read=readBeaUnitNipaArchive({pcBase,sourceSha:saved.sourceVersion});
    assert.deepEqual(read.preview.recent.map(x=>x.value),[0.216,0.219,0.222,0.231,0.25]);
    const file=beaUnitNipaArchivePaths({pcBase,sourceSha:saved.sourceVersion});
    const stored=fs.readFileSync(file.raw,'utf8');
    assert.equal(stored.includes('SECRET_ONLY_TEST'),false);
    assert.equal(stored.includes('RequestParam'),false);
    assert.equal(stored.includes('METRIC_NAME'),false);
    assert.equal(JSON.parse(stored).BEAAPI.Results.Data.every(row=>
      row.CL_UNIT==='Level'&&row.UNIT_MULT==='0'),true);
    const checked=computeBeaUnitNipaStoredPreview({pcBase,sourceSha:saved.sourceVersion});
    assert.equal(checked.currentValue,0.25);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('missing and half-written BEA JSON archive stay missing, never auto-healed',()=>{
  const pcBase=temp();
  try{
    const rawBytes=bytes();
    const hash=createHash('sha256').update(rawBytes).digest('hex');
    assert.throws(()=>readBeaUnitNipaArchive({pcBase,sourceSha:hash}),
      /BEA_UNIT_NIPA_ARCHIVE_MISSING/);
    saveBeaUnitNipaArchive({pcBase,rawBytes,sourceStoredAt:AT});
    const p=beaUnitNipaArchivePaths({pcBase,sourceSha:hash});
    fs.rmSync(p.meta);
    const before=fs.readFileSync(p.raw);
    assert.throws(()=>saveBeaUnitNipaArchive({pcBase,rawBytes,sourceStoredAt:AT+1000}),
      /BEA_UNIT_NIPA_ARCHIVE_MISSING/);
    assert.deepEqual(fs.readFileSync(p.raw),before);
    assert.equal(fs.existsSync(p.meta),false);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('reject tampered original SHA or metadata without repairing or replacing files',()=>{
  const pcBase=temp();
  try{
    const rawBytes=bytes();
    const original=saveBeaUnitNipaArchive({pcBase,rawBytes,sourceStoredAt:AT});
    const p=beaUnitNipaArchivePaths({pcBase,sourceSha:original.sourceVersion});
    const meta=fs.readFileSync(p.meta);
    fs.writeFileSync(p.raw,Buffer.from(rawBytes.toString('utf8').replace('0.250','0.251')));
    assert.throws(()=>readBeaUnitNipaArchive({pcBase,sourceSha:original.sourceVersion}),
      /BEA_UNIT_NIPA_ARCHIVE_SOURCE_MISMATCH/);
    fs.writeFileSync(p.raw,rawBytes);
    const invalid=JSON.parse(meta.toString('utf8'));
    invalid.transport='FRED_CSV';
    fs.writeFileSync(p.meta,JSON.stringify(invalid));
    assert.throws(()=>readBeaUnitNipaArchive({pcBase,sourceSha:original.sourceVersion}),
      /BEA_UNIT_NIPA_ARCHIVE_METADATA_MISMATCH/);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('reject oversized stored files before loading full file into memory',()=>{
  const pcBase=temp();
  try{
    const rawBytes=bytes();
    const saved=saveBeaUnitNipaArchive({pcBase,rawBytes,sourceStoredAt:AT});
    const p=beaUnitNipaArchivePaths({pcBase,sourceSha:saved.sourceVersion});
    for(const [file,size] of [[p.raw,2_000_001],[p.meta,10_001]]){
      const original=fs.readFileSync(file);
      fs.writeFileSync(file,Buffer.alloc(size,120));
      try{
        assert.throws(()=>readBeaUnitNipaArchive({
          pcBase,sourceSha:saved.sourceVersion}),/BEA_UNIT_NIPA_ARCHIVE_TOO_LARGE/);
      }finally{fs.writeFileSync(file,original);}
    }
    assert.equal(readBeaUnitNipaArchive({
      pcBase,sourceSha:saved.sourceVersion}).preview.transport,'BEA_API_JSON');
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('BEA echoed USERID is never persisted; HTTP hash differs from sanitized stored hash',()=>{
  const pcBase=temp();
  const credential='TEST_ONLY_BEa_API_CREDENTIAL_36CHARS';
  try{
    const original={BEAAPI:{
      Request:{RequestParam:[{ParameterName:'USERID',ParameterValue:credential},
        {ParameterName:'METHOD',ParameterValue:'GETDATA'}]},
      Results:{Data:data().BEAAPI.Results.Data}
    }};
    const httpBytes=Buffer.from(JSON.stringify(original),'utf8');
    const httpSha=createHash('sha256').update(httpBytes).digest('hex');
    const saved=saveBeaUnitNipaArchive({pcBase,rawBytes:httpBytes,sourceStoredAt:AT});
    assert.equal(saved.status,'SOURCE_STORED_READBACK_VERIFIED');
    assert.equal(saved.sourceHttpSha256,httpSha);
    assert.notEqual(saved.sourceVersion,httpSha);
    const p=beaUnitNipaArchivePaths({pcBase,sourceSha:saved.sourceVersion});
    const stored=fs.readFileSync(p.raw,'utf8');
    const meta=fs.readFileSync(p.meta,'utf8');
    assert.equal(stored.includes(credential),false);
    assert.equal(meta.includes(credential),false);
    assert.equal(stored.includes('RequestParam'),false);
    assert.equal(stored.includes('USERID'),false);
    const verified=readBeaUnitNipaArchive({pcBase,sourceSha:saved.sourceVersion});
    assert.equal(verified.sourceHttpSha256,httpSha);
    assert.equal(verified.preview.sourceVersion,saved.sourceVersion);
    assert.equal(verified.preview.recent.at(-1).value,0.250);
    const replay=saveBeaUnitNipaArchive({
      pcBase,rawBytes:httpBytes,sourceStoredAt:AT+1000});
    assert.equal(replay.status,'ALREADY_CAPTURED');
    assert.equal(replay.sourceStoredAt,AT);
    assert.equal(replay.sourceHttpSha256,httpSha);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('unrelated BEA NIPA lines and arbitrary row fields never enter immutable archive',()=>{
  const pcBase=temp();
  const privateMarker='TEST_ONLY_UNRELATED_PRIVATE_FIELD';
  try{
    const rows=data().BEAAPI.Results.Data.map(row=>({...row,
      ProviderDebugToken:privateMarker}));
    rows.push({...rows[0],SeriesCode:'OTHER',LineNumber:'8',
      DataValue:'999',ProviderDebugToken:privateMarker});
    const httpBytes=Buffer.from(JSON.stringify({BEAAPI:{
      Request:{RequestParam:[{ParameterName:'USERID',ParameterValue:privateMarker}]},
      Results:{Data:rows}
    }}),'utf8');
    const saved=saveBeaUnitNipaArchive({pcBase,
      rawBytes:httpBytes,sourceStoredAt:AT});
    const files=beaUnitNipaArchivePaths({pcBase,sourceSha:saved.sourceVersion});
    const stored=fs.readFileSync(files.raw,'utf8');
    const meta=fs.readFileSync(files.meta,'utf8');
    assert.doesNotMatch(stored,/TEST_ONLY_UNRELATED_PRIVATE_FIELD|ProviderDebugToken|USERID|RequestParam|OTHER|999/);
    assert.doesNotMatch(meta,/TEST_ONLY_UNRELATED_PRIVATE_FIELD|ProviderDebugToken|USERID|RequestParam/);
    const extracted=JSON.parse(stored).BEAAPI.Results.Data;
    assert.equal(extracted.length,5);
    assert.equal(extracted.every(row=>row.SeriesCode==='A463RD'&&row.LineNumber==='7'),true);
    assert.deepEqual(Object.keys(extracted[0]),['TableName','SeriesCode','LineNumber',
      'TimePeriod','DataValue','CL_UNIT','UNIT_MULT']);
    const verified=readBeaUnitNipaArchive({pcBase,sourceSha:saved.sourceVersion});
    assert.equal(verified.preview.recent.at(-1).value,0.250);
    assert.equal(verified.sourceHttpSha256,
      createHash('sha256').update(httpBytes).digest('hex'));
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('reject invalid BEA source before creating any archive directory',()=>{
  const pcBase=temp();
  try{
    const modified=data();
    modified.BEAAPI.Results.Data[0].UNIT_MULT='3';
    assert.throws(()=>saveBeaUnitNipaArchive({
      pcBase,rawBytes:Buffer.from(JSON.stringify(modified)),sourceStoredAt:AT
    }),/BEA_UNIT_NIPA_UNIT_UNVERIFIED/);
    assert.equal(fs.existsSync(path.join(pcBase,'raw')),false);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('stored-only BEA JSON calculation preserves native provenance and exact source checkpoint',()=>{
  const pcBase=temp();
  try{
    const rawBytes=bytes();
    const source=saveBeaUnitNipaArchive({pcBase,rawBytes,sourceStoredAt:AT});
    const calc=computeBeaUnitNipaStoredPreview({pcBase,sourceSha:source.sourceVersion});
    assert.equal(calc.status,'STORED_SOURCE_CALCULATED');
    assert.equal(calc.transport,'BEA_API_JSON');
    assert.equal(calc.sourceVersion,source.sourceVersion);
    assert.equal(calc.sourceStoredAt,AT);
    assert.equal(calc.observationPeriodEnd,'2026-06-30');
    assert.equal(calc.currentValue,0.250);
    assert.equal(calc.previousValue,0.231);
    assert.ok(Math.abs(calc.change-0.019)<1e-12);
    assert.deepEqual(calc.history.map(x=>x.period),
      ['2025Q2','2025Q3','2025Q4','2026Q1','2026Q2']);
    assert.equal(Object.isFrozen(calc),true);
    assert.equal(Object.isFrozen(calc.history),true);
    assert.equal('indicator' in calc,false); // Never fake the FRED_CSV writer envelope.
    assert.equal('sourceURL' in calc,false);
    const archived=beaUnitNipaArchivePaths({pcBase,sourceSha:source.sourceVersion});
    const meta=fs.readFileSync(archived.meta);
    assert.deepEqual(fs.readFileSync(archived.raw),rawBytes);
    assert.deepEqual(fs.readFileSync(archived.meta),meta);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('offline calculation rejects missing, changed or invalid BEA archive rather than inventing values',()=>{
  const pcBase=temp();
  try{
    const hash=createHash('sha256').update(bytes()).digest('hex');
    assert.throws(()=>computeBeaUnitNipaStoredPreview({pcBase,sourceSha:hash}),
      /BEA_UNIT_NIPA_ARCHIVE_MISSING/);
    const saved=saveBeaUnitNipaArchive({pcBase,rawBytes:bytes(),sourceStoredAt:AT});
    const file=beaUnitNipaArchivePaths({pcBase,sourceSha:saved.sourceVersion});
    const original=fs.readFileSync(file.raw);
    fs.writeFileSync(file.raw,Buffer.from(original.toString('utf8').replace('0.250','0.251')));
    assert.throws(()=>computeBeaUnitNipaStoredPreview({pcBase,sourceSha:hash}),
      /BEA_UNIT_NIPA_ARCHIVE_SOURCE_MISMATCH/);
  }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});
