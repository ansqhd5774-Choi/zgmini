import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDeltaScreenerCsv,gradeCalendarTickersFromDelta}
 from '../lib/market-calendar-deltascreener-snapshot.mjs';
import {makeDeltaR44Public} from '../lib/market-calendar-deltascreener-public.mjs';
import {makeMarketCalendarTaxonomyPublic} from '../lib/market-calendar-taxonomy-public.mjs';
import {earningsDisplayHtml,earningsDisplayResponse,earningsDisplaySnapshot}
 from '../lib/earnings-api-display.mjs';
import {earningsBannerRows} from '../lib/market-calendar-banner.mjs';

const start='2026-11-16',end='2026-11-29';
const coveredDays=Array.from({length:14},(_,i)=>
 new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
const raw='ticker,name,exchange,sector,industry,country,price,mktCap\n'+
 'NVDA,NVIDIA,NASDAQ,Technology,Semiconductors,US,100,100000000000\n'+
 'HD,Home Depot,NYSE,Consumer Cyclical,Home Improvement Retail,US,100,70000000000\n';
const parsed=parseDeltaScreenerCsv(raw);
const grades=makeDeltaR44Public(gradeCalendarTickersFromDelta(parsed,['NVDA','HD','MISS']));
const taxonomy=makeMarketCalendarTaxonomyPublic(parsed,grades);
const event=ticker=>({ticker,company:ticker+' Corporation',date:'2026-11-18',
 marketSession:'after_market',time:null,verification:'VENDOR_UNVERIFIED',source:'earnings-api'});
const snapshot=earningsDisplaySnapshot({status:'READY_PRIVATE',scope:'PC_PRIVATE',
 publicDisplay:false,redistribution:false,publicationStatus:'HELD_UNCONFIRMED',
 coveredDays,events:['NVDA','HD','MISS'].map(event),recordCount:3,
 priorityCount:0,checkedAt:'2026-11-16T04:00:00Z'});

test('nine cells and centered classification badges preserve original name/ticker and top banner',()=>{
 const output=earningsDisplayHtml(snapshot,{start,end,importance:3},
  null,null,null,{},grades,taxonomy);
 assert.equal(output.count,2);
 assert.match(output.html,/class="mc-sector" title="정보기술">정보기술/);
 assert.match(output.html,/class="mc-industry" title="반도체">반도체/);
 assert.match(output.html,/class="mc-sector" title="경기소비재">경기소비재/);
 assert.doesNotMatch(output.html,/class=mc-number/);
 assert.match(output.html,/https:\/\/deltascreener.com\/data/);
 const banner=earningsBannerRows(output.html,Date.parse('2026-11-16T04:00:00Z'));
 assert.equal(banner.length,2);
 assert.deepEqual(Object.fromEntries(banner.map(row=>[row.ticker,[row.sector,row.sectorLabel,row.sectorTone]])),{
  NVDA:['정보기술','기술','technology'],HD:['경기소비재','경기소비재','cyclical']
 });
});
test('server filters sector and industry with original labels and correct day totals',async()=>{
 const url='https://zgmini.kr/api/earnings-calendar-display?start='+start+'&end='+end+
  '&sector=Technology&industry=Semiconductors';
 const response=earningsDisplayResponse(snapshot,url,null,null,null,{},grades,taxonomy);
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-display-count'),'1');
 assert.match(response.headers.get('x-display-day-counts')??'',/2026-11-18:1/);
 const html=await response.text();
 assert.match(html,/NVDA/);
 assert.doesNotMatch(html,/Home Depot/);
 const empty=earningsDisplayResponse(snapshot,url.replace('Semiconductors','Medical Devices'),
  null,null,null,{},grades,taxonomy);
 assert.equal(empty.status,200);
 assert.equal(empty.headers.get('x-display-count'),'0');
});
test('missing company classification stays missing, while unpublished taxonomy preserves legacy rows',()=>{
 const output=earningsDisplayHtml(snapshot,{start,end},null,null,null,{},grades,taxonomy);
 assert.equal(output.count,3);
 assert.match(output.html,/is-empty" title="미분류">미분류/);
 const banner=earningsBannerRows(output.html,Date.parse('2026-11-16T04:00:00Z'));
 assert.equal(banner.find(row=>row.ticker==='MISS'),undefined,'ungraded issuers stay excluded from three-star top banner');
 assert.equal(banner.find(row=>row.ticker==='NVDA')?.sectorLabel,'기술');
 assert.doesNotMatch(output.html,/class=mc-number/);
 const legacy=earningsDisplayHtml(snapshot,{start,end},null,null,null,{},grades,null);
 assert.match(legacy.html,/class=mc-number/);
 assert.doesNotMatch(legacy.html,/class="mc-sector/);
 const rawBanner=earningsBannerRows(legacy.html,Date.parse('2026-11-16T04:00:00Z'));
 assert.ok(rawBanner.every(row=>row.sector===null&&row.sectorLabel===null),
  'unpublished taxonomy must not be replaced by guessed company classifications');
});
test('unvalidated sector parameters reject the HTML request',()=>{
 const url='https://zgmini.kr/api/earnings-calendar-display?start='+start+'&end='+end+
  '&sector='+encodeURIComponent('<script>'.repeat(15));
 const response=earningsDisplayResponse(snapshot,url,null,null,null,{},grades,taxonomy);
 assert.equal(response.status,400);
});
