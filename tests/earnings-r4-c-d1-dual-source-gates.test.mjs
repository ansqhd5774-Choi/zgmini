import test from 'node:test';
import assert from 'node:assert/strict';
import {validateD1DualSource} from '../scripts/pc-writer/EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs';

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
