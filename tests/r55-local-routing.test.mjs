import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=fs.readFileSync(new URL('../middleware.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function route(mode,host){
 const context={exports:{},process:{env:{NODE_ENV:mode}},require:()=>({NextResponse:{next:()=>({next:true}),redirect:(url,status=308)=>({url:url.toString(),status})}})};
 vm.runInNewContext(code,context);
 return context.exports.middleware({headers:new Headers({host}),nextUrl:{clone:()=>new URL(`http://${host}/?r55=verify`)}});
}
test('local development renders localhost and 127.0.0.1 without canonical redirect',()=>{
 for(const host of ['localhost:4173','127.0.0.1:4173'])assert.equal(route('development',host).next,true);
});
test('Production still canonicalizes noncanonical hosts and preserves canonical host',()=>{
 for(const host of ['localhost:4173','127.0.0.1:4173','example.com']){
  const result=route('production',host);
  assert.equal(result.status,308);
  assert.equal(new URL(result.url).hostname,'zgmini.kr');
  assert.equal(new URL(result.url).protocol,'https:');
 }
 assert.equal(route('production','zgmini.kr').next,true);
 assert.equal(route('production','zgmini-migration-candidate-r5.example.workers.dev').next,true);
 assert.equal(new URL(route('development','example.com').url).hostname,'zgmini.kr');
});
