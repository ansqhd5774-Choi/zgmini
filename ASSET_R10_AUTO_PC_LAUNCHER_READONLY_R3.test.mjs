import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeTaskXml,tag,launcherFromAction,cycleFromVbs,canonical,redact} from './ASSET_R10_AUTO_PC_LAUNCHER_READONLY_R3.mjs';

test('UTF-16LE task XML and encoded arguments resolve the exact launcher',()=>{
 const xml='<Actions><Command>C:\\Windows\\System32\\wscript.exe</Command><Arguments>&quot;C:\\Users\\fred\\.zgmini\\pc-writer\\run-local-core.vbs&quot;</Arguments></Actions>';
 const decoded=decodeTaskXml(Buffer.concat([Buffer.from([0xff,0xfe]),Buffer.from(xml,'utf16le')]));
 assert.equal(launcherFromAction(tag(decoded,'Arguments')),'C:\\Users\\fred\\.zgmini\\pc-writer\\run-local-core.vbs');
 assert.equal(tag(decoded,'Command'),'C:\\Windows\\System32\\wscript.exe');
});
test('VBS quoted local-cycle path is extracted without activating it',()=>{
 const text='WScript.Quit shell.Run("""E:\\ZGmini\\runtime\\node.exe"" ""E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release\\scripts\\pc-writer\\local-cycle.mjs"" --publish", 0, True)';
 assert.equal(cycleFromVbs(text),'E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release\\scripts\\pc-writer\\local-cycle.mjs');
});
test('Canonical Windows junction targets and personal paths are safely represented',()=>{
 assert.equal(canonical('\\\\?\\E:\\ZGmini\\data\\pc-writer\\run-local-core.vbs'),canonical('e:\\zgmini\\data\\pc-writer\\run-local-core.vbs'));
 assert.equal(redact('C:\\Users\\Alice\\.zgmini\\pc-writer\\run-local-core.vbs'),'C:\\Users\\[USER]\\.zgmini\\pc-writer\\run-local-core.vbs');
});
