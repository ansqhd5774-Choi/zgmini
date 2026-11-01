import test from 'node:test';
import assert from 'node:assert/strict';
import {sameR10StoredSourceOrContent}
 from '../app/asset-bubble/asset-r10-source-vintage-r2.mjs';
const hex='728cb9b8d7fe547bf7bcf740bbdd31c733408948fdc0c0b4a83ba0d0f80c9db9';
const earlier=()=>({sourceVersion:'macro:2026-10-28:'+hex,
 sourceStoredAt:1793203206694,asOfDate:'2026-10-28'});
const newer=()=>({sourceVersion:'macro:2026-10-29:'+hex,
 sourceStoredAt:1793254203126,asOfDate:'2026-10-29'});

test('original exact source/date/storage comparison stays valid',()=>{
 const old=earlier();
 assert.equal(sameR10StoredSourceOrContent(old,{...old}),true);
});
test('only identical macro content fingerprint allows 28 to 29 daily metadata refresh',()=>{
 assert.equal(sameR10StoredSourceOrContent(newer(),earlier()),true);
});
test('different content fingerprint never joins a vintage change',()=>{
 assert.equal(sameR10StoredSourceOrContent({...newer(),
  sourceVersion:'macro:2026-10-29:'+('0'.repeat(64))},earlier()),false);
});
test('a future, inverted or forged date or stored timestamp cannot join',()=>{
 const old=earlier(),live=newer();
 for(const bad of [
  {...live,asOfDate:'2026-10-30'},
  {...live,sourceStoredAt:old.sourceStoredAt-1},
  {...live,sourceStoredAt:Date.now()+60000},
  {...live,sourceVersion:'macro:2026-10-28:'+hex},
  {...old,sourceStoredAt:old.sourceStoredAt-1},
 ]){
  assert.equal(sameR10StoredSourceOrContent(bad,old),false);
 }
});
test('unknown sourceVersion formats must remain strict on exact provenance',()=>{
 const old=earlier();
 for(const s of ['macro:2026-10-28:not-a-hash',
  'other:2026-10-29:'+hex,'macro:2026-10-29:'+('x'.repeat(64))]){
  assert.equal(sameR10StoredSourceOrContent({...newer(),sourceVersion:s},old),false);
 }
});
test('older score source cannot adopt a newer raw/history vintage',()=>{
 assert.equal(sameR10StoredSourceOrContent(earlier(),newer()),false);
});
