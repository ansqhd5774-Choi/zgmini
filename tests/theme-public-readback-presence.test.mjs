import test from 'node:test';
import assert from 'node:assert/strict';
import {THEME_PUBLIC_READBACK_KEYS,summarizeThemePublicReadback} from
 '../scripts/pc-writer/theme-public-readback-presence.mjs';
const AT='2026-11-14T01:00:00Z';
const rows=()=>THEME_PUBLIC_READBACK_KEYS.map((feed_key,i)=>({feed_key,stored_at:1763070000000+i}));

test('exact seven approved theme keys including rolling; no duplicated keys',()=>{
 assert.equal(THEME_PUBLIC_READBACK_KEYS.length,7);
 assert.equal(new Set(THEME_PUBLIC_READBACK_KEYS).size,7);
 const result=summarizeThemePublicReadback(rows(),{observedAt:AT});
 assert.equal(result.status,'ALL_KEYS_PRESENT_METADATA_ONLY');
 assert.equal(result.scope,'D1_OUTPUT_CURRENT_KEY_STORED_AT_ONLY');
 assert.equal(result.feeds.length,7);
 assert.ok(result.feeds.every(x=>x.state==='PRESENT_METADATA_ONLY'&&x.exists===true));
 assert.ok(result.unreadFields.includes('localCheckpoint'));
 assert.ok(result.unreadFields.includes('sourceVersion'));
});
test('missing keys are MISSING only when the D1 query returned an array',()=>{
 const result=summarizeThemePublicReadback(rows().slice(1));
 assert.equal(result.feeds[0].state,'MISSING');
 assert.equal(result.feeds[0].exists,false);
 assert.equal(result.status,'PARTIAL_OR_INVALID');
});
test('no read evidence does not invent missing rows',()=>{
 for(const input of [null,undefined,{status:'ERROR'}]){
  const result=summarizeThemePublicReadback(input);
  assert.equal(result.status,'NOT_READ');
  assert.ok(result.feeds.every(x=>x.state==='UNKNOWN'&&x.exists===null));
 }
});
test('invalid and duplicate timestamps never claim valid storedAt',()=>{
 const malformed=rows();malformed[0].stored_at='2026-11-14';
 assert.equal(summarizeThemePublicReadback(malformed).feeds[0].state,'PRESENT_INVALID_STORED_AT');
 assert.equal(summarizeThemePublicReadback(malformed).feeds[0].storedAt,null);
 malformed.push({...malformed[1]});
 assert.equal(summarizeThemePublicReadback(malformed).feeds[1].state,'AMBIGUOUS_DUPLICATE');
 assert.equal(summarizeThemePublicReadback(malformed).feeds[1].exists,null);
});
test('extra sensitive fields and unrelated output rows never escape',()=>{
 const data=rows();
 data[0].body='PRIVATE_PRICE_BARS';data[0].credential='SECRET';data[0].sourceVersion='FAKE_READY';
 data.push({feed_key:'other-private-feed',stored_at:1763070000000,body:'SECRET'});
 const summary=JSON.stringify(summarizeThemePublicReadback(data));
 for(const fragment of ['PRIVATE_PRICE_BARS','SECRET','FAKE_READY','other-private-feed'])
  assert.equal(summary.includes(fragment),false);
});
test('empty successful query yields seven definite MISSING rather than READY',()=>{
 const result=summarizeThemePublicReadback([]);
 assert.ok(result.feeds.every(x=>x.state==='MISSING'&&x.exists===false));
 assert.equal(result.status,'PARTIAL_OR_INVALID');
});
test('source storedAt is not conflated with observedAt or license',()=>{
 const result=summarizeThemePublicReadback(rows(),{observedAt:'bad timestamp'});
 assert.equal(result.observedAt,null);
 assert.equal(result.feeds[0].storedAt,1763070000000);
 assert.equal('publicationAuthorized' in result,false);
 assert.equal('rightsVerified' in result,false);
});
test('existing Writer SQL contract stays unchanged; summary consumes previous feed result',async()=>{
 const {readFileSync}=await import('node:fs');
 const {fileURLToPath}=await import('node:url');
 const {resolve,dirname}=await import('node:path');
 const source=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),
  '../scripts/pc-writer/read-publication-readback.mjs'),'utf8');
 assert.ok(source.includes("SELECT feed_key,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND snapshot_key='current' ORDER BY feed_key"));
 assert.equal(source.includes('themePublicReadback:summarizeThemePublicReadback(feeds,{observedAt})'),true);
 assert.equal((source.match(/remote\.query\(/g)??[]).length,3);
 assert.equal(/\b(?:INSERT|UPDATE|DELETE|REPLACE|DROP|ALTER)\s+(?:INTO|TABLE|FROM)\b/i.test(source),false);
});
