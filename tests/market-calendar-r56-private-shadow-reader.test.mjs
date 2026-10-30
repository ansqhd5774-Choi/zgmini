import test from 'node:test';
import assert from 'node:assert/strict';
import {
 earningsDisplaySnapshot,earningsDisplayHtml,earningsDisplayResponse,
 earningsMarketCapPrivateShadowHtml
} from '../lib/earnings-api-display.mjs';
import {buildMarketCapShadowPreview} from '../scripts/pc-writer/market-calendar-r55-shadow-preview.mjs';

const start='2026-10-30';
const days=Array.from({length:14},(_,i)=>new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
const event=(ticker,company,priority=false)=>({ticker,company,date:start,marketSession:'after_market',
 time:null,priority,verification:'VENDOR_UNVERIFIED',source:'earnings-api'});
const source=()=>({status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,redistribution:false,
 publicationStatus:'HELD_UNCONFIRMED',checkedAt:'2026-10-30T01:00:00Z',coveredDays:days,
 recordCount:3,priorityCount:2,events:[
  event('GOOG','Alphabet Inc.',true),event('GOOGL','Alphabet Inc.',true),
  event('ABBV','AbbVie Inc.',false)]});
const grade=(items=[
 {ticker:'GOOG',status:'VALIDATED_CANDIDATE_ONLY',issuerId:'0000000001',stars:2},
 {ticker:'GOOGL',status:'VALIDATED_CANDIDATE_ONLY',issuerId:'0000000001',stars:2},
 {ticker:'ABBV',status:'VALIDATED_CANDIDATE_ONLY',issuerId:'0000000002',stars:3},
])=>({status:'R54_OFFLINE_GATE_COMPLETE',publishReady:false,publicStarsChanged:false,
 accepted:items.length,unverified:0,items});
const options={start,end:start};
const privateResult=()=>{
 const original=earningsDisplaySnapshot(source());
 const shadow=buildMarketCapShadowPreview(original,grade());
 assert.equal(shadow.status,'R55_PRIVATE_SHADOW_COMPLETE');
 return {original,shadow:shadow.shadow};
};

test('private market-cap rendering honors Alphabet issuer grade 2 without core override',()=>{
 const {original,shadow}=privateResult();
 const before=earningsDisplayHtml(original,{...options,importance:[3]});
 assert.equal(before.count,1);
 assert.match(before.html,/GOOG·GOOGL/);
 const mine=earningsMarketCapPrivateShadowHtml(shadow,{...options,importance:[2]});
 assert.equal(mine.status,'PRIVATE_SHADOW_RENDER_ONLY');
 assert.equal(mine.publishReady,false);
 assert.equal(mine.count,1);
 assert.match(mine.html,/중요도 2">★★/);
 assert.match(mine.html,/GOOG·GOOGL/);
 assert.doesNotMatch(mine.html,/핵심기업/);
});
test('ABBV rises from legacy level 1 to private level 3, without mutating stored source',()=>{
 const {original,shadow}=privateResult(),stored=original.byDay[start][2];
 assert.equal(earningsDisplayHtml(original,{...options,importance:[1]}).count,1);
 const out=earningsMarketCapPrivateShadowHtml(shadow,{...options,importance:[3]});
 assert.equal(out.count,1);
 assert.match(out.html,/ABBV/);
 assert.match(out.html,/중요도 3">★★★/);
 assert.equal(original.byDay[start][2],stored);
 assert.equal(earningsDisplayHtml(original,{...options,importance:[3]}).count,1);
});
test('private filter counts and classes remain coherent',()=>{
 const {shadow}=privateResult();
 assert.equal(earningsMarketCapPrivateShadowHtml(shadow,{...options,importance:[1]}).count,0);
 assert.equal(earningsMarketCapPrivateShadowHtml(shadow,{...options,importance:[2]}).count,1);
 assert.equal(earningsMarketCapPrivateShadowHtml(shadow,{...options,importance:[3]}).count,1);
 assert.equal(earningsMarketCapPrivateShadowHtml(shadow,{...options,importance:[2,3]}).count,2);
});
test('public response still uses legacy grades and refuses private shadow status',async()=>{
 const {original,shadow}=privateResult();
 const url='https://zgmini.kr/api/market-calendar/earnings?start='+start+'&end='+start+'&importance=3';
 const before=earningsDisplayResponse(original,url);
 assert.equal(before.status,200);
 assert.equal(before.headers.get('x-display-count'),'1');
 const body=await before.text();
 assert.match(body,/GOOG·GOOGL/);
 const notPublished=earningsDisplayResponse(shadow,url);
 assert.equal(notPublished.status,204);
});
test('private shadow renderer rejects published and arbitrary snapshots',()=>{
 const {original,shadow}=privateResult();
 assert.throws(()=>earningsMarketCapPrivateShadowHtml(original,options),/R56_PRIVATE_SHADOW_CONTRACT_STOP/);
 assert.throws(()=>earningsMarketCapPrivateShadowHtml({...shadow,mode:'OWN_SITE_HTML_ONLY'},options),/R56_PRIVATE_SHADOW_CONTRACT_STOP/);
 assert.throws(()=>earningsMarketCapPrivateShadowHtml(null,options),/R56_PRIVATE_SHADOW_CONTRACT_STOP/);
});
test('incomplete R54 grade has no R55 shadow to render',()=>{
 const original=earningsDisplaySnapshot(source());
 const incomplete=buildMarketCapShadowPreview(original,grade([
  {ticker:'GOOG',status:'VALIDATED_CANDIDATE_ONLY',issuerId:'0000000001',stars:2}
 ]));
 assert.equal(incomplete.status,'R55_GATE_CLOSED');
 assert.equal(incomplete.shadow,null);
 assert.throws(()=>earningsMarketCapPrivateShadowHtml(incomplete.shadow,options),/R56_PRIVATE_SHADOW_CONTRACT_STOP/);
});
