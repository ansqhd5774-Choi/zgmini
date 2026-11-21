// W05 R4-09: legacy baseline publishers must never put WPSFD42 into the five-row D1 key.
// Static entrypoint wiring check complements the actual SQLite 5+2 integration tests.
// No network, D1, or operational SQLite effects.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';

const read=name=>fs.readFileSync(new URL(`../scripts/pc-writer/${name}`,import.meta.url),'utf8');

test('both existing C publishers explicitly restrict baseline preview to five rows',()=>{
  for(const file of ['EARNINGS_R4_C_D1_DUAL_SOURCE_ONCE.mjs','EARNINGS_R4_C_D1_MANUAL.mjs']){
    const body=read(file);
    assert.match(body,/buildPreview\(db,\{generatedAt:now,includeServices:false\}\)/,file);
    assert.doesNotMatch(body,/buildPreview\(db,\{generatedAt:now\}\)/,file);
  }
});

test('WPSFD42 service publisher uses only its separate source and snapshot key',()=>{
  const body=read('EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs');
  assert.match(body,/buildServiceSourcePreview\(db,\{generatedAt:now\}\)/);
  assert.match(body,/snapshotKey:EARNINGS_C_SERVICE_SNAPSHOT_KEY/);
  assert.match(body,/BASE_SNAPSHOT_KEY_WRITES=0/);
  assert.match(body,/payload\.rows\.some\(row=>row\.seriesId!=='WPSFD42'\)/);
});
