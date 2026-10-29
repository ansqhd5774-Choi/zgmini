import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectR45Article,normalizeR45ArticleUrl} from '../scripts/iran-progress/news-four-source-probe-r45.mjs';
const now=Date.parse('2026-10-29T04:00:00Z');
const a='https://www.arabnews.com/middle-east/iran-war-discussions-3008699';
const t='https://www.aa.com.tr/en/middle-east/iran-saudi-war-talks/4100729';
test('Arab News editorial container is verified without counting unrelated navigation',()=>{
 const html='<!doctype html><html><head><meta property="og:title" content="Saudi Houthi ceasefire"/><meta property="article:published_time" content="2026-10-28T05:42:00Z"/></head><body><nav><p>Iranian trade</p></nav><div class="field-name-body"><div class="field-item"><p>Saudi and Houthi forces began ceasefire talks to end the war.</p></div></div></body></html>';
 const r=inspectR45Article('arabnews',a,html,{now});
 assert.equal(r.status,'ARTICLE_METADATA_REVIEWED');
 assert.equal(r.bodyEvidence,'PUBLISHER_EDITORIAL_BODY');
 assert.equal(r.rightsVerified,false);
});
test('Anadolu timezone is required for an exact timestamp',()=>{
 const html='<!doctype html><html><head><meta property="og:title" content="Houthi peace talks" /></head><body><time datetime="2026-10-28T10:20:00+03:00">28.10.2026</time><div class="detay-icerik"><p>The Houthi and Saudi negotiators met for new ceasefire talks.</p></div></body></html>';
 const ok=inspectR45Article('anadolu',t,html,{now});
 assert.equal(ok.status,'ARTICLE_METADATA_REVIEWED');
 assert.equal(ok.publishedAt,'2026-10-28T07:20:00.000Z');
 assert.equal(ok.bodyEvidence,'PUBLISHER_EDITORIAL_BODY');
 assert.equal(inspectR45Article('anadolu',t,html.replace('2026-10-28T10:20:00+03:00','28.10.2026'),{now}).status,'FIRST_PUBLICATION_UNVERIFIED');
});
test('Publisher body cannot be replaced by unrelated navigation text',()=>{
 const html='<!doctype html><html><head><meta property="og:title" content="Iran war talks"/><meta property="article:published_time" content="2026-10-28T05:42:00Z"/></head><body><nav><p>Saudi and Iran war negotiations continue today</p></nav><div class="sidebar"><p>Iran war news about diplomatic talks</p></div></body></html>';
 assert.equal(normalizeR45ArticleUrl('arabnews',a),a);
 assert.equal(inspectR45Article('arabnews',a,html,{now}).status,'ARTICLE_BODY_UNVERIFIED');
});
