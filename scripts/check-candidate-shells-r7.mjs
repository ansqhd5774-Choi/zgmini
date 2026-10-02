import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {shellRoutes,shellArtifact} from '../worker/candidate-shell-r7.mjs';

const manifestPath='docs/migration/r7/shell-artifacts.json';
assert.equal(existsSync(manifestPath),true,'R7 shell manifest missing');
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
assert.equal(Array.isArray(manifest.routes),true);
assert.equal(manifest.routes.length,shellRoutes.length);
assert.equal(manifest.client_assets_identical,true);

for(const route of shellRoutes){
  const html='dist/client'+shellArtifact(route,false);
  const rsc='dist/client'+shellArtifact(route,true);
  assert.equal(existsSync(html),true,`HTML shell missing: ${route}`);
  assert.equal(existsSync(rsc),true,`RSC shell missing: ${route}`);
  assert.ok(readFileSync(html).length>0,`HTML shell empty: ${route}`);
  assert.ok(readFileSync(rsc).length>0,`RSC shell empty: ${route}`);
}

const manifestRoutes=new Set(manifest.routes.map(x=>x.route));
assert.deepEqual([...manifestRoutes].sort(),[...shellRoutes].sort());
console.log(`PASS: ${shellRoutes.length}/${shellRoutes.length} static HTML/RSC shell pairs present`);
