import test from 'node:test';
import assert from 'node:assert/strict';
import {validateD1DualSource,inspectD1Source} from '../scripts/pc-writer/EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs';

const config={collectionTarget:'pc',enabled:true,source:'7'.repeat(40)};
const publisher={root:'C:\\stage',sha:'a'.repeat(40),branch:'main',remoteMatch:true,clean:true,provenanceVerified:true};
const operational={root:'E:\\approved',sha:'7'.repeat(40),branch:'codex/pc-auth',remoteMatch:true,clean:true};
const pass=(override={})=>validateD1DualSource({config,publisher,operational,...override});

test('accepts clean isolated main publisher and pinned operational source',()=>{
  assert.deepEqual(pass(),{publisherSha:publisher.sha,approvedOperationalSha:operational.sha});
});
test('rejects an unapproved configuration or an operational source SHA mismatch',()=>{
  assert.throws(()=>pass({config:{...config,enabled:false}}),/PC_CONFIG_NOT_APPROVED/);
  assert.throws(()=>pass({operational:{...operational,sha:'8'.repeat(40)}}),/SHA_MISMATCH/);
});
test('rejects untrusted or edited publisher source',()=>{
  assert.throws(()=>pass({publisher:{...publisher,branch:'feature'}}),/PUBLISHER_SOURCE/);
  assert.throws(()=>pass({publisher:{...publisher,remoteMatch:false}}),/PUBLISHER_SOURCE/);
  assert.throws(()=>pass({publisher:{...publisher,clean:false}}),/PUBLISHER_SOURCE/);
  assert.throws(()=>pass({publisher:{...publisher,provenanceVerified:false}}),/PUBLISHER_SOURCE/);
});
test('rejects dirty operational source and same-root publishing',()=>{
  assert.throws(()=>pass({operational:{...operational,clean:false}}),/OPERATIONAL_SOURCE/);
  assert.throws(()=>pass({publisher:{...publisher,root:operational.root}}),/NOT_ISOLATED/);
});

test('exact approved main-history commit survives unrelated tip changes and detached checkout',()=>{
 const root=process.cwd(),sha='a'.repeat(40),calls=[];
 const git=(_root,args)=>{
  calls.push(args);
  if(args[0]==='rev-parse'&&args[1]==='--show-toplevel')return root;
  if(args[0]==='rev-parse'&&args[1]==='HEAD')return sha;
  if(args[0]==='rev-parse')return 'c'.repeat(40);
  if(args[0]==='branch')return '';
  if(args[0]==='config')return 'https://github.com/ansqhd5774-Choi/zgmini.git';
  if(args[0]==='merge-base')return sha;
  return '';
 };
 const inspected=inspectD1Source(root,{git,realpath:x=>x,publisher:true,approvedPublisherSha:sha});
 assert.equal(inspected.provenanceVerified,true);assert.equal(inspected.approvedShaPin,sha);
 assert.equal(pass({publisher:inspected}).publisherSha,sha);
 assert.ok(calls.some(x=>x[0]==='merge-base'));
 const legacy=inspectD1Source(root,{git,realpath:x=>x,publisher:true});
 assert.equal(legacy.provenanceVerified,false);
 const divergent=inspectD1Source(root,{git:(r,a)=>a[0]==='merge-base'?'d'.repeat(40):git(r,a),
  realpath:x=>x,publisher:true,approvedPublisherSha:sha});
 assert.equal(divergent.provenanceVerified,false);assert.equal(divergent.approvedShaPin,null);
 assert.throws(()=>pass({publisher:divergent}),/PUBLISHER_SOURCE/);
 const wrongPin=inspectD1Source(root,{git,realpath:x=>x,publisher:true,approvedPublisherSha:'e'.repeat(40)});
 assert.equal(wrongPin.provenanceVerified,false);
});
