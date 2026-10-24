import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dir=new URL('../dist/client/assets/',import.meta.url);
test('built common CSS excludes US-only education while route CSS retains it',{skip:!fs.existsSync(dir)},()=>{
 const files=fs.readdirSync(dir).filter(f=>f.endsWith('.css'));
 const common=files.filter(f=>/^index-/.test(f));
 assert.ok(common.length,'Common stylesheet exists');
 // Existing high-specificity detail overrides still mention the panel class.
 // Check the moved scorebar renderer, which those overrides never define.
 for(const file of common)assert.equal(fs.readFileSync(new URL(file,dir),'utf8').includes('.cnn-component-scorebar-track{'),false,
  `${file} must not include US-only education`);
 const source=fs.readFileSync(new URL('../public/styles/fear-greed-education-r1.css',import.meta.url),'utf8');
 const built=fs.readFileSync(new URL('../dist/client/styles/fear-greed-education-r1.css',import.meta.url),'utf8');
 assert.equal(built,source,'Route stylesheet survives production build unchanged');
 console.log('Education route CSS bytes:',Buffer.byteLength(built));
});
