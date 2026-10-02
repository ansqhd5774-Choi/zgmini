import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {shellRoutes,shellArtifact} from '../worker/candidate-shell-r7.mjs';
const base='https://zgmini-migration-candidate-r5.ansqhd5774.workers.dev';
const checks=[];
for(const route of shellRoutes) for(const method of ['GET','HEAD']) for(const rsc of [false,true]) {
 const r=await fetch(base+route,{method,headers:rsc?{RSC:'1'}:{},redirect:'manual'});
 const bytes=Buffer.from(await r.arrayBuffer()); const artifact=shellArtifact(route,rsc);
 assert.equal(r.status,200);assert.equal(r.headers.get('x-zgmini-ssr'),'bypassed');assert.equal(r.headers.get('x-zgmini-shell-artifact'),artifact);
 assert.ok(r.headers.get('content-type').startsWith(rsc?'text/x-component':'text/html'));
 if(method==='HEAD')assert.equal(bytes.length,0);else assert.deepEqual(bytes,readFileSync('dist/client'+artifact));
 checks.push({route,method,rsc,status:r.status,artifact,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),ssr:'bypassed'});
}
for(const method of ['POST','PUT','PATCH','DELETE']) {const r=await fetch(base+'/',{method});assert.equal(r.status,403);checks.push({route:'/',method,status:r.status});}
writeFileSync('docs/migration/r7/live-shell.json',JSON.stringify({version:'565d438c-8c40-40d7-9d87-ececab4e35d1',observed_at:new Date().toISOString(),checks},null,2));
console.log('PASS: 36 HTML/RSC GET/HEAD checks, byte equality, SSR bypass headers, 4 mutation denials');
