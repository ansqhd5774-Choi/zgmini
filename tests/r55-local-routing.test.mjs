import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=fs.readFileSync(new URL('../middleware.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function route(mode,host,{protocol='https:',forwardedProto}={}){
 const headers=new Headers({host});
 if(forwardedProto)headers.set('x-forwarded-proto',forwardedProto);
 const context={exports:{},process:{env:{NODE_ENV:mode}},require:()=>({NextResponse:{next:()=>({next:true}),redirect:(url,status=308)=>({url:url.toString(),status})}})};
 vm.runInNewContext(code,context);
 return context.exports.middleware({headers,nextUrl:{protocol,clone:()=>new URL(`${protocol}//${host}/?r55=verify`)}});
}
test('local development renders localhost and 127.0.0.1 without canonical redirect',()=>{
 for(const host of ['localhost:4173','127.0.0.1:4173'])assert.equal(route('development',host,{protocol:'http:'}).next,true);
});
test('Production canonicalizes noncanonical hosts and preserves canonical HTTPS host',()=>{
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
test('Production redirects canonical HTTP requests to canonical HTTPS',()=>{
 const directHttp=route('production','zgmini.kr',{protocol:'http:'});
 assert.equal(directHttp.status,308);
 assert.equal(directHttp.url,'https://zgmini.kr/?r55=verify');

 const forwardedHttp=route('production','zgmini.kr',{protocol:'https:',forwardedProto:'http'});
 assert.equal(forwardedHttp.status,308);
 assert.equal(forwardedHttp.url,'https://zgmini.kr/?r55=verify');
});
