import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {runShadow as runCanonicalShadow} from '../scripts/pc-writer/breadth-r10-v9-shadow/engine.mjs';
import {runShadow as runFactorShadow} from '../scripts/pc-writer/breadth-v11-factor-engine.mjs';
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
test('R15 original V9 engine remains byte-identical to pinned scheduled source',()=>{
 const canonical=fs.readFileSync(new URL('../scripts/pc-writer/breadth-r10-v9-shadow/engine.mjs',import.meta.url));
 assert.equal(blob(canonical),'b9bb59be02335868692d256bc54982bebaeb32bd');
 assert.doesNotMatch(canonical.toString('utf8'),/includeFactorHistory/);
});
test('R15 factor reader lives outside original V9 engine and honors opt-in daily factors',()=>{
 const canonical=fs.readFileSync(new URL('../scripts/pc-writer/breadth-r10-v9-shadow/engine.mjs',import.meta.url),'utf8');
 const factor=fs.readFileSync(new URL('../scripts/pc-writer/breadth-v11-factor-engine.mjs',import.meta.url),'utf8');
 assert.equal(typeof runCanonicalShadow,'function');
 assert.equal(typeof runFactorShadow,'function');
 assert.match(factor,/includeFactorHistory=false/);
 assert.match(factor,/includeFactorHistory\?\{factors/);
 assert.match(factor,/query_only=ON/);
 assert.match(factor,/sourceStoredAt/);
 assert.match(factor,/breadth-r10-v9-shadow\/formula\.mjs/);
 assert.ok(factor.length>canonical.length);
});
test('R15 V11 publication uses isolated factor source but verifies baseline through original engine',()=>{
 const pub=fs.readFileSync(new URL('../scripts/pc-writer/breadth-v11-publication.mjs',import.meta.url),'utf8');
 assert.match(pub,/runShadow as runV11FactorShadow.*breadth-v11-factor-engine\.mjs/);
 assert.match(pub,/const latest=runV11FactorShadow\(\{base:BASE,now,writeLocal:false,historySessions:311,includeFactorHistory:true\}\)/);
 assert.match(pub,/const verified=runShadow\(\{base:BASE,now,asOf:last\.date,writeLocal:false\}\)/);
 assert.match(pub,/breadth-r10-v9-publication\.lock/);
 assert.doesNotMatch(pub,/provider\.fetch|fetch\(/);
});
