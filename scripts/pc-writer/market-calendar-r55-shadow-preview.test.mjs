import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMarketCapShadowPreview as preview} from './market-calendar-r55-shadow-preview.mjs';
const start=Date.UTC(2026,9,29),days=Array.from({length:14},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10));
const row=(ticker,importance=1)=>`<article class="mc-row mc-vendor-row" data-search="${ticker.toLowerCase()} company"><div class=mc-importance aria-label="중요도 ${importance}">${'★'.repeat(importance)}</div><div class=mc-date>10.29</div><time class=mc-time>시각 미정</time><span class=mc-country>미국</span><div class=mc-event><span>${ticker} Company (${ticker})</span><span class=mc-tag-status>예정 · 미확정</span><small class=mc-source>기업 실적 · EarningsAPI</small></div></article>`;
const display=(rows=[row('ABBV'),row('GOOG'),row('GOOGL')])=>({status:'READY_DISPLAY',mode:'OWN_SITE_HTML_ONLY',rawVendorJsonExposed:false,publicJsonFeed:false,redistribution:false,coveredDays:days,byDay:Object.fromEntries(days.map((d,i)=>[d,i===0?rows:[]])),recordCount:rows.length});
const item=(ticker,stars,issuerId)=>({ticker,status:'VALIDATED_CANDIDATE_ONLY',issuerId,stars});
const grade=(items=[item('ABBV',3,'0000000001'),item('GOOG',2,'0000000002'),item('GOOGL',2,'0000000002')])=>({status:'R54_OFFLINE_GATE_COMPLETE',publicStarsChanged:false,publishReady:false,accepted:items.length,unverified:0,items});
test('valid preview changes only importance markup and remains nonpublic',()=>{
 const source=display(),out=preview(source,grade());
 assert.equal(out.status,'R55_PRIVATE_SHADOW_COMPLETE');assert.equal(out.publishReady,false);assert.equal(out.publicStarsChanged,false);assert.deepEqual(out.countsByImportance,{1:0,2:2,3:1});
 assert.equal(out.shadow.status,'PRIVATE_SHADOW_ONLY');assert.equal(out.shadow.mode,'NOT_PUBLICABLE_HTML');
 assert.equal(out.shadow.byDay[days[0]][0].includes('중요도 3">★★★'),true);
 assert.equal(source.byDay[days[0]][0].includes('중요도 1">★'),true);
 assert.equal(out.shadow.byDay[days[0]][1].replace('<div class=mc-importance aria-label="중요도 2">★★</div>','<div class=mc-importance aria-label="중요도 1">★</div>'),source.byDay[days[0]][1]);
});
test('withheld if any calendar ticker has no verified grade; no partial public output',()=>{
 const out=preview(display(),grade([item('ABBV',3,'0000000001')]));
 assert.equal(out.status,'R55_GATE_CLOSED');assert.equal(out.unverifiedRows,2);assert.equal(out.shadow,null);
});
test('R54 disabled policy cannot produce previews',()=>{
 const g=grade();g.status='R54_POLICY_DISABLED';assert.equal(preview(display(),g).status,'R55_GATE_CLOSED');
});
test('malformed star HTML is rejected, not mutated',()=>{
 const bad=display([row('ABBV').replace('★</div>','★★</div>')]);
 assert.equal(preview(bad,grade()).reason,'DISPLAY_MARKUP_INVALID');
});
test('disagreement between same issuer classes is blocked',()=>{
 const r=preview(display(),grade([item('ABBV',3,'0000000001'),item('GOOG',2,'0000000002'),item('GOOGL',3,'0000000002')]));
 assert.equal(r.reason,'R54_ISSUER_GRADE_CONFLICT');
});
test('duplicate tickers and mismatched recordCount stop',()=>{
 const g=grade();g.items.push(g.items[0]);g.accepted++;
 assert.equal(preview(display(),g).reason,'R54_DUPLICATE_TICKERS');
 const s=display();s.recordCount=2;
 assert.equal(preview(s,grade()).reason,'DISPLAY_RECORD_COUNT_MISMATCH');
});
test('source contract failure is different from no market cap',()=>{
 const s=display();s.redistribution=true;
 assert.equal(preview(s,grade()).status,'R55_SOURCE_CONTRACT_STOP');
});
test('published reader does not accept shadow snapshot status/mode',()=>{
 const r=preview(display(),grade());assert.equal(r.shadow.status==='READY_DISPLAY',false);assert.equal(r.shadow.mode==='OWN_SITE_HTML_ONLY',false);
});
