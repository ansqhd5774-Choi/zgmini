// Static, source-only regression: the shared Writer is staged but W05
// recurring D1 effects stay disabled until their exact approval/installed CAS.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {W05_SAVED_IDS,W05_SAVED_KEYS}
 from '../scripts/pc-writer/w05-stored-sidecar-publication-r1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('W05 run-local hook is disabled by default; no recurring D1 effect is authorized',()=>{
 const run=read('scripts/pc-writer/run-local.mjs');
 assert.match(run,/const W05_SAVED_SIDECARS_AUTO_PUBLICATION_APPROVED=false;/);
 assert.match(run,/if\(W05_SAVED_SIDECARS_AUTO_PUBLICATION_APPROVED\)\{/);
 assert.match(run,/await import\(\s*'\.\/w05-stored-sidecar-publication-r1\.mjs'\)/);
 assert.ok(run.indexOf('if(W05_SAVED_SIDECARS_AUTO_PUBLICATION_APPROVED)')
  >run.indexOf('if(publish){'),
  'hook is only within the preexisting Writer publication block');
 const cycle=read('scripts/pc-writer/local-cycle.mjs');
 assert.doesNotMatch(cycle,/w05-stored-sidecar-publication-r1|W05_SAVED_SIDECARS_AUTO_PUBLICATION/);
 assert.ok(run.includes('const INFLATION_19_AUTO_PUBLICATION_APPROVED=true;'));
});

test('staged W05 dispatcher uses exactly existing Writer, three independent keys and isolated result tracking',()=>{
 const run=read('scripts/pc-writer/run-local.mjs');
 assert.match(run,/for\(const id of W05_SAVED_IDS\)/);
 assert.match(run,/attemptOutput\(report,'w05-saved-sidecar:'\+id,async\(\)=>\{/);
 assert.match(run,/report\.w05SavedSidecars\[id\]=await publishW05StoredSidecar\(\{/);
 assert.match(run,/id,pcHome:base,remote,coreDb:config\.core,now,/);
 assert.deepEqual(W05_SAVED_IDS,['wpsfd42','qfr','bea']);
 assert.equal(Object.values(W05_SAVED_KEYS).length,3);
 assert.doesNotMatch(run,/spawnSync\([^\n]*w05|new Worker\([^\n]*w05/);
});
