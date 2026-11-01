import test from 'node:test';
import assert from 'node:assert/strict';
import {parseR43ManualArgs,runR43ManualCommand} from '../tools/market-calendar-r43/R43_MANUAL_RUN.mjs';

const pc=process.platform==='win32'?'C:\\r43-private':'/tmp/r43-private';
const repo=process.platform==='win32'?'C:\\r43-approved-repo':'/tmp/r43-approved-repo';

test('preflight is the default, with private absolute paths only',()=>{
 const args=parseR43ManualArgs(['--pc-home',pc,'--repo-root',repo]);
 assert.equal(args.mode,'preflight');
 assert.equal(args.inputPath,`${pc}${process.platform==='win32'?'\\':'/'}local-market-calendar-r43-input.json`);
 assert.throws(()=>parseR43ManualArgs(['--pc-home','relative','--repo-root',repo]),/ABSOLUTE_PATHS/);
});

test('D1 mutation requires both explicit publish mode and one-time confirmation',()=>{
 assert.throws(()=>parseR43ManualArgs(['--publish','--pc-home',pc,'--repo-root',repo]),/CONFIRMATION_REQUIRED/);
 assert.throws(()=>parseR43ManualArgs(['--confirm-r43-once','--pc-home',pc,'--repo-root',repo]),/WITHOUT_PUBLISH/);
 assert.equal(parseR43ManualArgs(['--publish','--confirm-r43-once','--pc-home',pc,'--repo-root',repo]).mode,'publish');
});

test('unknown/duplicate args never proceed to private inputs or D1',()=>{
 assert.throws(()=>parseR43ManualArgs(['--publish','--confirm-r43-once','--unsafe','--pc-home',pc,'--repo-root',repo]),/UNKNOWN_ARGUMENT/);
 assert.throws(()=>parseR43ManualArgs(['--pc-home',pc,'--pc-home',pc,'--repo-root',repo]),/ARGUMENT_INVALID/);
 assert.throws(()=>parseR43ManualArgs(['--preflight','--publish','--confirm-r43-once','--pc-home',pc,'--repo-root',repo]),/MODE_CONFLICT/);
});

test('help is safe without PC sources or network',async()=>{
 const result=await runR43ManualCommand(['--help']);
 assert.match(result.usage,/--preflight/);
 assert.match(result.usage,/--publish --confirm-r43-once/);
 assert.equal(result.note.includes('never calls providers'),true);
});

test('missing approved input stops before any external publication',async()=>{
 await assert.rejects(
  runR43ManualCommand(['--publish','--confirm-r43-once',
   '--pc-home',pc,'--repo-root',repo]),
  /R43_MANUAL_COMMAND_PRIVATE_FILE_MISSING_STOP/,
 );
});
