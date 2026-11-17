import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  CENSUS_M3_INVENTORIES_FILE,
  collectCensusM3Inventories,
} from '../scripts/pc-writer/inflation-causal-candidate-census-m3.mjs';

const HEADERS=['data_type_code','time_slot_id','time_slot_date','seasonally_adj',
  'category_code','cell_value','error_data','us'];
const okYear=year=>[HEADERS,
  ['TI','1329',`${year}-09-01`,'yes','MTM',year===2025?'700000':'900000','','1']];
const invalidYear=[['unrecognized_column'],['invalid']];
const answer=body=>new Response(JSON.stringify(body),{status:200});

test('both Census year schemas invalid: fail the new collection, preserve prior last-good without fabricated freshness',async t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'w01-census-m3-guard-'));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const base=path.join(temp,'pc-writer');fs.mkdirSync(base);
  const now=new Date('2026-11-17T00:00:00.000Z');
  let broken=false,calls=0;
  const quotaFetch=async url=>{
    calls++;
    const year=Number(new URL(url).searchParams.get('time'));
    return answer(broken?invalidYear:okYear(year));
  };
  const first=await collectCensusM3Inventories({base,censusKey:'fixture-key',quotaFetch,now});
  assert.equal(first.status,'SAVED_READBACK');
  assert.equal(first.providerRequests,2);
  assert.equal(first.count,2);
  const saved=path.join(base,CENSUS_M3_INVENTORIES_FILE);
  const before=fs.readFileSync(saved);
  broken=true;
  await assert.rejects(
    ()=>collectCensusM3Inventories({base,censusKey:'fixture-key',quotaFetch,now}),
    {code:'CENSUS_M3_HEADERS_INVALID'});
  assert.equal(calls,4,'exactly two attempted GETs for each source collection');
  assert.deepEqual(fs.readFileSync(saved),before,'do not overwrite valid prior data');
  const raw=path.join(base,'inflation-causal-candidates-r1','raw');
  assert.equal(fs.readdirSync(raw).length,4,'archive the failed raw response for each year');
  const prior=JSON.parse(before.toString('utf8'));
  assert.equal(prior.sourceStoredAt,'2026-11-17T00:00:00.000Z');
  assert.deepEqual(prior.observations.map(row=>row.value),[700000,900000]);
});
