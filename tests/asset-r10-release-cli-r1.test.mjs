import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldRunR10ReleaseCli} from '../scripts/pc-writer/build-asset-r10-release.mjs';

test('R10 CLI executes under an explicit marker despite a different Windows drive alias',()=>{
 const args=['node',String.raw`C:\ZGmini\projects\zgmini\scripts\pc-writer\build-asset-r10-release.mjs`,'--run-r10-release'];
 const canonical=String.raw`E:\ZGmini\projects\zgmini\scripts\pc-writer\build-asset-r10-release.mjs`;
 assert.equal(shouldRunR10ReleaseCli({argv:args,modulePath:canonical}),true);
});

test('R10 release cannot run from a plain import without a CLI marker',()=>{
 assert.equal(shouldRunR10ReleaseCli({argv:['node','another-entry.mjs'],modulePath:'r10-release.mjs'}),false);
});
