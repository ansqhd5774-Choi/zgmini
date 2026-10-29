import test from 'node:test';
import assert from 'node:assert/strict';
import {scriptRefs,gitRootFromScript} from './ASSET_R10_AUTO_PC_QUOTA_ROUTE_READONLY_R4.mjs';

test('quota runner source is extracted from an installation VBS without execution',()=>{
 const vbs='WScript.Quit shell.Run("""E:\\ZGmini\\runtime\\node.exe"" ""E:\\ZGmini\\projects\\working\\scripts\\pc-writer\\quota-runner.mjs"" --publish", 0, True)';
 assert.deepEqual(scriptRefs(vbs),['E:\\ZGmini\\projects\\working\\scripts\\pc-writer\\quota-runner.mjs']);
 assert.equal(gitRootFromScript(scriptRefs(vbs)[0]),'E:\\ZGmini\\projects\\working');
});
test('source path not in pc-writer layout is not guessed',()=>{
 assert.equal(gitRootFromScript('E:\\ZGmini\\data\\pc-writer\\legacy.vbs'),null);
});
