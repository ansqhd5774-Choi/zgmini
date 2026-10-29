import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchFlags} from '../r10-writer-origin-readonly.mjs';

test('Core VBS-like R38 dispatch is not a direct Writer route',()=>{
 const x=dispatchFlags('shell.Run "node.exe ZGMINI_EARNINGS_R38_AUTO_DISPATCH.mjs"');
 assert.equal(x.HAS_RUN_LOCAL,'NO');assert.equal(x.HAS_LOCAL_CYCLE,'NO');
 assert.equal(x.HAS_R38_DISPATCH,'YES');
});
test('Korea keywords do not establish a core publisher',()=>{
 const x=dispatchFlags('local-cycle.mjs --publish --korea');
 assert.equal(x.HAS_LOCAL_CYCLE,'YES');assert.equal(x.HAS_PUBLISH_FLAG,'YES');
 assert.equal(x.HAS_RUN_LOCAL,'NO');
});
test('Dispatcher structural tokens are reported without source contents',()=>{
 const x=dispatchFlags('spawnSync(process.execPath,["run-local.mjs","--publish"]);');
 assert.equal(x.HAS_RUN_LOCAL,'YES');assert.equal(x.HAS_SPAWN,'YES');
 assert.equal(x.MJS_REFERENCES,'run-local.mjs');
});
