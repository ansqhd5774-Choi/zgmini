import test from 'node:test';
import assert from 'node:assert/strict';
import {earningsDisplayHtml,earningsDisplaySnapshot} from '../lib/earnings-api-display.mjs';
import {bannerCalendarRange,earningsBannerRows,marketCalendarBannerRows} from '../lib/market-calendar-banner.mjs';
const now=Date.parse('2026-10-29T13:30:00Z');
const calendar={status:'READY',sources:{bls:{status:'READY',checkedAt:new Date(now).toISOString()},bea:{status:'READY',checkedAt:new Date(now).toISOString()}},events:[
 {id:'pce',date:'2026-10-29',title:'Personal Income and Outlays',source:'bea',sourceUrl:'https://www.bea.gov/news/schedule'},
 {id:'employment',date:'2026-11-06',title:'Employment Situation',source:'bls',sourceUrl:'https://www.bls.gov/schedule/'},
 {id:'gdp',date:'2026-10-30',title:'GDP (Second Estimate)',source:'bea',sourceUrl:'https://www.bea.gov/news/schedule'},
 {id:'cpi',date:'2026-11-10',title:'Consumer Price Index',source:'bls',sourceUrl:'https://www.bls.gov/schedule/'},
]};
function html(events){
 const coveredDays=Array.from({length:14},(_,i)=>new Date(Date.parse('2026-10-29T00:00:00Z')+i*86400000).toISOString().slice(0,10));
 const projection={status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,redistribution:false,publicationStatus:'HELD_UNCONFIRMED',coveredDays,events:events.map(e=>({date:'2026-10-29',company:'Company & Co.',marketSession:'after_market',time:null,verification:'VENDOR_UNVERIFIED',source:'earnings-api',...e})),recordCount:events.length,checkedAt:new Date(now).toISOString()};
 return earningsDisplayHtml(earningsDisplaySnapshot(projection),{start:coveredDays[0],end:coveredDays.at(-1),importance:3}).html;
}
test('banner consumes the exact reviewed earnings HTML, not a manual company roster',()=>{
 const rows=earningsBannerRows(html([{ticker:'AMZN'},{ticker:'AAPL',date:'2026-11-02'},{ticker:'KO',priority:true}]),now);
 assert.deepEqual(rows.map(r=>r.ticker),['AMZN','AAPL']);assert.equal(rows[0].at,'2026-10-29T20:00:00.000Z');
 assert.equal(rows[0].estimated,true);assert.equal(rows[0].name,'Company & Co.');
});
test('only future three-star releases enter; elapsed and revised GDP do not',()=>{
 const rows=marketCalendarBannerRows(now,calendar,html([{ticker:'AMZN'}]));
 assert.equal(rows[0].ticker,'AMZN');assert.equal(rows.some(r=>r.key.includes('pce')),false);assert.equal(rows.some(r=>r.key.includes('gdp')),false);
 assert.ok(rows.some(r=>r.key.includes('employment')));assert.ok(rows.some(r=>r.key.includes('cpi')));assert.ok(rows.every(r=>r.importance===3));
 assert.deepEqual(rows.map(r=>r.sortAt),rows.map(r=>r.sortAt).sort());
});
test('release time is not inferred for unknown high-importance official entries',()=>{
 const feed={...calendar,events:[{id:'bea-other',date:'2026-10-30',title:'Personal Consumption Expenditures by State',source:'bea',sourceUrl:'https://www.bea.gov/news/schedule'}]};
 const [row]=marketCalendarBannerRows(now,feed);assert.equal(row.at,null);assert.equal(row.date,'2026-10-30');
});
test('unknown earnings time remains untimed and elapsed market anchor is excluded',()=>{
 const rows=earningsBannerRows(html([{ticker:'MSFT',marketSession:'unknown'},{ticker:'AMZN',marketSession:'before_market'}]),Date.parse('2026-10-29T14:00:00Z'));
 assert.equal(rows.length,1);assert.equal(rows[0].ticker,'MSFT');assert.equal(rows[0].at,null);
});
test('stale source and absent earnings do not activate snapshot fallback companies',()=>{
 const feed={...calendar,sources:{bls:{status:'SOURCE_FAILED'},bea:{status:'READY',checkedAt:'2026-10-20T00:00:00Z'}}};
 assert.deepEqual(marketCalendarBannerRows(now,feed,''),[]);
 assert.deepEqual(marketCalendarBannerRows(now,null,''),[]);
});
test('calendar day bounds and DST agree with source market dates',()=>{
 assert.deepEqual(bannerCalendarRange(Date.parse('2026-10-30T01:00:00Z')),{start:'2026-10-29',end:'2026-11-11'});
 const rows=marketCalendarBannerRows(now,calendar);assert.equal(rows.find(r=>r.key.includes('employment')).at,'2026-11-06T13:30:00.000Z');
});
test('reviewed Alphabet duplicate handling and non-HTML payloads stay safe',()=>{
 assert.equal(earningsBannerRows(html([{ticker:'GOOG'},{ticker:'GOOGL'}]),now).length,1);
 assert.deepEqual(earningsBannerRows('{"events":[]}',now),[]);
 assert.deepEqual(earningsBannerRows('<article><script>alert(1)</script></article>',now),[]);
});

test('banner recognizes R59 FHS-R3 annual three-star HTML but excludes two-star and unrated earnings',()=>{
 const at='2026-10-31T04:55:00Z',when=Date.parse(at),start='2026-10-31';
 const coveredDays=Array.from({length:14},(_,i)=>new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
 const events=[
  {ticker:'ADEA',company:'Adeia Inc.',date:'2026-11-02',marketSession:'after_market'},
  {ticker:'NVDA',company:'NVIDIA Corporation',date:'2026-11-02',marketSession:'after_market'},
  {ticker:'ZM',company:'Zoom Communications, Inc.',date:'2026-11-02',marketSession:'after_market'}
 ].map(e=>({...e,time:null,verification:'VENDOR_UNVERIFIED',source:'earnings-api'}));
 const projection={status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,redistribution:false,
  publicationStatus:'HELD_UNCONFIRMED',coveredDays,events,recordCount:events.length,
  priorityCount:0,checkedAt:at};
 const annual={status:'READY_R3_PROVISIONAL',version:'ZGMINI-FHS-R3',asOf:'2026-10-31',
  sourceStoredAt:1793332803791,recordCount:2,grades:{ADEA:[3,91],NVDA:[2,63]}};
 const display=earningsDisplaySnapshot(projection);
 const rendered=earningsDisplayHtml(display,{start,end:coveredDays.at(-1),importance:3},annual);
 assert.equal(rendered.count,1);
 assert.match(rendered.html,/aria-label="재무건전성 별 3개"/);
 const rows=earningsBannerRows(rendered.html,when);
 assert.deepEqual(rows.map(row=>row.ticker),['ADEA']);
 assert.equal(rows[0].kind,'실적');
 assert.equal(rows[0].importance,3);
 assert.equal(marketCalendarBannerRows(when,null,rendered.html)[0].ticker,'ADEA');
});
test('banner matches legacy three-star format but never accepts a false R3 two-star tag',()=>{
 const time=Date.parse('2026-10-31T04:55:00Z');
 const hdr='<div class="mc-week mc-vendor-week"><strong>2026-11-02 · 기업 실적</strong></div>';
 const article=importance=>'<article class="mc-row mc-vendor-row" data-search="adea adeia inc.">'+
  importance+'<div class=mc-event><span>Adeia Inc. (ADEA)</span></div>'+
  '<time class=mc-time>장후</time></article>';
 const prior=article('<div class=mc-importance aria-label="중요도 3">★★★</div>');
 const notThree=article('<div class="mc-importance" aria-label="재무건전성 별 2개" title="ZGMINI 재무건전성 잠정평가 · 2026-10-31 기준">★★</div>');
 assert.equal(earningsBannerRows(hdr+prior,time).length,1);
 assert.deepEqual(earningsBannerRows(hdr+notThree,time),[]);
});
