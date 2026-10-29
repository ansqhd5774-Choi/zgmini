import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {checkR81SevenAuth,installR81,runR81} from './theme-ten-r81-seven-auth-once.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,value);};
const setup=()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r81-test-'));
 const auth=path.join(root,'themes','biotech','source-r8','scripts','pc-writer',
  'theme-biotech-seven-auth-r8.mjs');
 const core=path.join(root,'theme-market-history-r131','marketparquet-r167',
  'r179-publish-core.mjs');
 write(auth,'R81-approved-auth-fixture');write(core,'R81-approved-core-fixture');
 return {root,auth,core};
};

test('R81 probes approved seven-auth in memory without reporting token',async t=>{
 const {root,auth,core}=setup();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let called=0;
 const out=await checkR81SevenAuth({dataRoot:root,
  expectedAuthSha:hash(fs.readFileSync(auth)),
  expectedCoreSha:hash(fs.readFileSync(core)),
  importer:async()=>({biotechApprovedSevenTokenR8:async()=>{
   called++;return 'memory-only-approved-token';}})});
 assert.deepEqual(out,{status:'R81_SEVEN_AUTH_MEMORY_ONLY_VERIFIED',
  secretWritten:0,secretLogged:0});
 assert.equal(called,1);
 assert.equal(JSON.stringify(out).includes('approved-token'),false);
});

test('R81 refuses hash drift before credential invocation',async t=>{
 const {root,auth,core}=setup();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const approved=hash(fs.readFileSync(auth));fs.appendFileSync(auth,'drift');
 await assert.rejects(checkR81SevenAuth({dataRoot:root,expectedAuthSha:approved,
  expectedCoreSha:hash(fs.readFileSync(core)),
  importer:async()=>{throw Error('MUST_NOT_IMPORT');}}),
  /R81_APPROVED_SOURCE_SHA_DRIFT/);
});

test('R81 patch refuses unknown installed source without modifying it',t=>{
 const {root}=setup();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const relative='scripts/pc-writer/theme-nine-r54-public-connect.mjs';
 const source=path.join(root,'bundle',relative),target=path.join(root,'installed',relative);
 const approvedPatch=path.join(path.dirname(fileURLToPath(import.meta.url)),
  'theme-nine-r54-public-connect.mjs');
 fs.mkdirSync(path.dirname(source),{recursive:true});fs.copyFileSync(approvedPatch,source);
 write(target,'unknown installed R54 source');
 assert.throws(()=>installR81({home:path.join(root,'installed'),
  bundle:path.join(root,'bundle')}),/R81_UNAPPROVED_OR_ALREADY_INSTALLED_SHA/);
 assert.equal(fs.readFileSync(target,'utf8'),'unknown installed R54 source');
 assert.equal(fs.existsSync(target+'.R81_BACKUP'),false);
});

test('R81 does not touch non-Windows environments',async()=>{
 assert.equal((await runR81({platform:'linux'})).status,'STOP_WINDOWS_PC_REQUIRED');
});
