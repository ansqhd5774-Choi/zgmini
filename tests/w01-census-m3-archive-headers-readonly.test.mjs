import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectCensusM3ArchiveHeaders} from '../scripts/pc-writer/inflation-census-m3-archive-headers-readonly.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const HEAD=['data_type_code','time_slot_date','seasonally_adj','category_code','cell_value','us'];
const fixture=t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'w01-census-headers-'));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const home=path.join(temp,'pc-writer');
  const raw=path.join(home,'inflation-causal-candidates-r1','raw');
  fs.mkdirSync(raw,{recursive:true});
  const save=(year,obj)=>{
    const bytes=Buffer.from(JSON.stringify(obj));
    const filename='census-m3-mtm-'+year+'-'+sha(bytes)+'.json';
    const file=path.join(raw,filename);
    fs.writeFileSync(file,bytes);
    return file;
  };
  return {home,raw,save};
};
test('existing archived headers only: no observation values, secrets or writes',t=>{
  const f=fixture(t);
  f.save(2025,[HEAD,['TI','2025-09-01','yes','MTM','123456','1']]);
  f.save(2026,[HEAD,['TI','2026-09-01','yes','MTM','987654','1']]);
  const before=fs.readdirSync(f.raw);
  const result=inspectCensusM3ArchiveHeaders({base:f.home,years:[2025,2026]});
  assert.equal(result.status,'PASS');
  assert.equal(result.archiveCount,2);
  assert.equal(result.invalidArchiveCount,0);
  assert.ok(result.archives.every(x=>x.schema==='HEADERS_VALID'));
  assert.equal(result.providerCalls,0);
  assert.equal(result.operationalWrites,0);
  assert.deepEqual(fs.readdirSync(f.raw),before);
  assert.doesNotMatch(JSON.stringify(result),/123456|987654|\/tmp\/|census-m3-mtm-/);
});
test('missing date, required columns and duplicate headers classified without values',t=>{
  const f=fixture(t);
  f.save(2025,[['data_type_code','seasonally_adj','category_code','cell_value','us'],
    ['TI','yes','MTM','123','1']]);
  f.save(2026,[['DATA_TYPE_CODE','DATA_TYPE_CODE','TIME','US'],['TI','TI','2026-09','1']]);
  const result=inspectCensusM3ArchiveHeaders({base:f.home,years:[2025,2026]});
  assert.equal(result.status,'DIAGNOSED');
  assert.equal(result.code,'CENSUS_ARCHIVE_HEADERS_INCOMPATIBLE');
  assert.equal(result.archives[0].hasMonthlyDate,false);
  assert.ok(result.archives[1].duplicateHeaderCount>0);
  assert.deepEqual(result.archives[1].missingRequired,
    ['seasonally_adj','category_code','cell_value']);
});
test('missing archived year remains PARTIAL, never collection success',t=>{
  const f=fixture(t);f.save(2025,[HEAD]);
  const result=inspectCensusM3ArchiveHeaders({base:f.home,years:[2025,2026]});
  assert.equal(result.status,'PARTIAL');
  assert.deepEqual(result.missingYears,[2026]);
});
test('archive hash tampering and symbolic-link redirection stop readback',t=>{
  const f=fixture(t),file=f.save(2025,[HEAD]);
  fs.writeFileSync(file,JSON.stringify([['bogus']]));
  assert.throws(()=>inspectCensusM3ArchiveHeaders({base:f.home,years:[2025]}),
    {code:'CENSUS_ARCHIVE_SHA_MISMATCH'});
  fs.unlinkSync(file);
  const outside=path.join(path.dirname(f.home),'outside.json');
  fs.writeFileSync(outside,'[]');fs.symlinkSync(outside,file);
  assert.throws(()=>inspectCensusM3ArchiveHeaders({base:f.home,years:[2025]}),
    {code:'CENSUS_ARCHIVE_FILE_UNSAFE'});
});
test('arbitrary paths and duplicate years cannot expand scan scope',t=>{
  const f=fixture(t);
  assert.throws(()=>inspectCensusM3ArchiveHeaders({base:f.raw,years:[2025]}),
    {code:'CENSUS_ARCHIVE_SCOPE_DENIED'});
  assert.throws(()=>inspectCensusM3ArchiveHeaders({base:f.home,years:[2025,2025]}),
    {code:'CENSUS_ARCHIVE_SCOPE_DENIED'});
});
