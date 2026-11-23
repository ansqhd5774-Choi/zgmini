import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {beaUnitNipaArchivePaths,readBeaUnitNipaArchive,
  saveBeaUnitNipaArchive} from '../scripts/pc-writer/EARNINGS_BEA_UNIT_NIPA_ARCHIVE_R1.mjs';

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
    fs.writeFileSync(p.raw,Buffer.concat([rawBytes,Buffer.from(' ')]));
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
