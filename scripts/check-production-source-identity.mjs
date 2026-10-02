import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const protectedObjects=Object.freeze({
  app:'041b5362e85cddd452ef60cf681a233eac5203e7',
  lib:'06b6e16e02cad824334b3b6ab6ce930f65020210',
  db:'a3be0334fddebdc8eb38fee875240dc34909a72a',
  'middleware.ts':'4ef4b6f9d9296bd1fd0ec5019cdaee9738cd2763',
  'worker/index.ts':'c3a8a884001d6af211257bee7ff64f7208641a28',
});

for(const [path,expected] of Object.entries(protectedObjects)){
  const actual=execFileSync('git',['rev-parse',`HEAD:${path}`],{encoding:'utf8'}).trim();
  assert.equal(actual,expected,`Protected Production source drift: ${path}`);
}

execFileSync('git',['diff','--quiet','HEAD','--','app','lib','db','worker/index.ts','middleware.ts']);
execFileSync('git',['diff','--cached','--quiet','HEAD','--','app','lib','db','worker/index.ts','middleware.ts']);

console.log('PASS: protected Production source identity verified from HEAD tree objects; no historical commit fetch required.');
