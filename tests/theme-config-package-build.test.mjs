import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalPackageBytes} from '../scripts/pc-writer/theme-config-package-build.mjs';
test('Windows line-ending representation uses exact pinned Git bytes without allowing source drift',()=>{
 const expected=Buffer.from('const 한글=1;\n');
 assert.ok(canonicalPackageBytes(Buffer.from('const 한글=1;\r\n'),expected).equals(expected));
 assert.throws(()=>canonicalPackageBytes(Buffer.from('const 한글=2;\r\n'),expected),/SOURCE_BYTE_DRIFT/);
 assert.throws(()=>canonicalPackageBytes(Buffer.from('const 한글=1; \r\n'),expected),/SOURCE_BYTE_DRIFT/);
 assert.throws(()=>canonicalPackageBytes(Buffer.from([0xff]),Buffer.from([0xfe])),/SOURCE_BYTE_DRIFT/);
});
