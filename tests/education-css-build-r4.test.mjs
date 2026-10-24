import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dir=new URL('../dist/client/assets/',import.meta.url);
test('built common CSS excludes US-only education while route CSS retains it',{skip:!fs.existsSync(dir)},()=>{
 const files=fs.readdirSync(dir).filter(f=>f.endsWith('.css'));
 const common=files.filter(f=>/^index-/.test(f));
 assert.ok(common.length,'Common stylesheet exists');
 for(const file of common)assert.doesNotMatch(fs.readFileSync(new URL(file,dir),'utf8'),/\.cnn-education-panel/,
  `${file} must not include US-only education`);
 const route=files.filter(f=>!common.includes(f)&&fs.readFileSync(new URL(f,dir),'utf8').includes('.cnn-education-panel'));
 assert.ok(route.length,'Education stylesheet survives production build');
 console.log('Education CSS chunks:',route.map(f=>({file:path.basename(f),bytes:fs.statSync(new URL(f,dir)).size})));
});
