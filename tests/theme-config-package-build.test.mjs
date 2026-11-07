import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {buildConfiguredPackage,canonicalPackageBytes} from '../scripts/pc-writer/theme-config-package-build.mjs';
test('Windows line-ending representation uses exact pinned Git bytes without allowing source drift',()=>{
 const expected=Buffer.from('const 한글=1;\n');
 assert.ok(canonicalPackageBytes(Buffer.from('const 한글=1;\r\n'),expected).equals(expected));
 assert.throws(()=>canonicalPackageBytes(Buffer.from('const 한글=2;\r\n'),expected),/SOURCE_BYTE_DRIFT/);
 assert.throws(()=>canonicalPackageBytes(Buffer.from('const 한글=1; \r\n'),expected),/SOURCE_BYTE_DRIFT/);
 assert.throws(()=>canonicalPackageBytes(Buffer.from([0xff]),Buffer.from([0xfe])),/SOURCE_BYTE_DRIFT/);
});
test('same source SHA produces byte-identical archives in independent directories',t=>{
 const repo=fileURLToPath(new URL('../',import.meta.url));
 const sourceSha=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
 const directories=[fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-theme-zip-a-')),
  fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-theme-zip-b-'))];
 t.after(()=>directories.forEach(dir=>fs.rmSync(dir,{recursive:true,force:true})));
 const first=buildConfiguredPackage({sourceSha,outputDir:directories[0]});
 const second=buildConfiguredPackage({sourceSha,outputDir:directories[1]});
 assert.equal(first.sourceTreeSha,second.sourceTreeSha);
 assert.equal(first.fileCount,second.fileCount);
 assert.equal(first.manifestSha256,second.manifestSha256);
 assert.equal(first.zipSha256,second.zipSha256);
});
