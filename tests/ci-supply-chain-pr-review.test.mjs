import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareSupplyLocks,sourceKind} from '../scripts/ci-supply-chain-review.mjs';

const integrity='sha512-'+Buffer.from('sample').toString('base64');
const lock=(packages={})=>JSON.stringify({name:'site',lockfileVersion:3,
 packages:{'':{name:'site',version:'1.0.0'},...packages}});
const npm=(version='1.0.0')=>({version,resolved:'https://registry.npmjs.org/x/-/x-1.0.0.tgz',integrity});

test('unchanged v3 lockfile reports a measured zero and no invented risks',()=>{
 const report=compareSupplyLocks(lock(),lock());
 assert.equal(report.changedPackages,0);
 assert.equal(report.warningEntries,0);
 assert.equal(report.advisoryOnly,true);
 assert.equal(report.baselinePresent,true);
});
test('new npm dependency reports source kind and SRI metadata without raw integrity',()=>{
 const result=compareSupplyLocks(lock(),lock({'node_modules/x':npm()}));
 assert.equal(result.added,1);
 assert.equal(result.removed,0);
 assert.equal(result.changes[0].packagePath,'node_modules/x');
 assert.deepEqual(result.changes[0].warnings,[]);
 assert.equal(result.changes[0].integrity,'PRESENT');
 assert.doesNotMatch(JSON.stringify(result),/sha512-|registry\.npmjs\.org/);
});
test('modified and removed packages are distinguished from additions',()=>{
 const before=lock({'node_modules/x':npm('1.0.0'),'node_modules/y':npm()});
 const after=lock({'node_modules/x':npm('2.0.0')});
 const result=compareSupplyLocks(before,after);
 assert.equal(result.modified,1);
 assert.equal(result.removed,1);
 assert.equal(result.added,0);
 assert.equal(result.changes[0].currentVersion,'2.0.0');
});
test('nonregistry source, missing integrity and install scripts are advisory warnings',()=>{
 const after=lock({'node_modules/x':{
  version:'1.0.0',resolved:'https://token:secret@private.host/x?token=private',
  hasInstallScript:true}});
 const report=compareSupplyLocks(lock(),after);
 assert.deepEqual(report.changes[0].warnings,[
  'NON_STANDARD_OR_UNKNOWN_SOURCE','INTEGRITY_UNVERIFIED','INSTALL_SCRIPT_PRESENT']);
 assert.doesNotMatch(JSON.stringify(report),/secret|private\.host|token/);
 assert.equal(sourceKind('http://registry.npmjs.org/x'),'INSECURE_HTTP');
 assert.equal(sourceKind('git+ssh://example/x'),'GIT');
});
test('same-version SRI and tarball changes are still detected without exposing values',()=>{
 const a=lock({'node_modules/x':npm('1.2.3')});
 const b=lock({'node_modules/x':{
  version:'1.2.3',
  resolved:'https://registry.npmjs.org/x/-/different-tarball.tgz',
  integrity:'sha512-'+Buffer.from('different').toString('base64')
 }});
 const report=compareSupplyLocks(a,b);
 assert.equal(report.modified,1);
 assert(report.changes[0].warnings.includes('RESOLUTION_VALUE_CHANGED'));
 assert(report.changes[0].warnings.includes('INTEGRITY_VALUE_CHANGED'));
 assert.doesNotMatch(JSON.stringify(report),/different-tarball|sha512-|different/);
});
test('invalid or unsupported lockfile fails without inventing valid report',()=>{
 assert.throws(()=>compareSupplyLocks(lock(),{}),/CI_SUPPLY_LOCK_INVALID/);
 assert.throws(()=>compareSupplyLocks(lock(),JSON.stringify({lockfileVersion:2,packages:{}})),/CI_SUPPLY_LOCK_INVALID/);
 assert.throws(()=>compareSupplyLocks(lock(),lock({'node_modules/x':'bad'})),/CI_SUPPLY_ENTRY_INVALID/);
});
test('existing Node CI invokes local PR review with artifacts; npm audit remains enforced',()=>{
 const wf=readFileSync(new URL('../.github/workflows/node.js.yml',import.meta.url),'utf8');
 assert.match(wf,/node scripts\/ci-supply-chain-review\.mjs/);
 assert.match(wf,/artifacts\/ci-supply-chain-review\/report\.json/);
 assert.match(wf,/github\.event_name == 'pull_request'/);
 assert.doesNotMatch(wf,/actions\/dependency-review-action@/);
 assert.match(wf,/npm audit --omit=dev --audit-level=high/);
 assert.match(wf,/node --test tests\/\*\.test\.mjs/);
 assert.doesNotMatch(wf,/continue-on-error:\s*true/);
});
