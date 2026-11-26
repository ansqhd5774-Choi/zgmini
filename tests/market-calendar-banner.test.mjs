import test from 'node:test';
import assert from 'node:assert/strict';
import {earningsDisplayHtml,earningsDisplaySnapshot} from '../lib/earnings-api-display.mjs';
import {bannerCalendarRange,earningsBannerRows,marketCalendarBannerRows} from '../lib/market-calendar-banner.mjs';
import {ER1_METHOD} from '../lib/market-calendar-er1-earnings-score.mjs';
import {parseDeltaScreenerCsv,gradeCalendarTickersFromDelta} from '../lib/market-calendar-deltascreener-snapshot.mjs';
import {makeDeltaR44Public,DELTA_R44_LEGACY_METHOD} from '../lib/market-calendar-deltascreener-public.mjs';
const now=Date.parse('2026-10-29T13:30:00Z');
const er1Rows=[['AMZN',99],['AAPL',98],['KO',90],['MSFT',97.5],['ADEA',99],['NVDA',92],['ZM',90],['ALPHABET',99]];
const er1={status:'READY_ER1_PUBLIC',method:ER1_METHOD,asOf:'2026-10-29',
 threshold:97,recordCount:er1Rows.length,star3Count:5,
 coverage:{inputSymbols:9,observedIssuers:er1Rows.length,
  scoreableIssuers:er1Rows.length,unscoreableReasons:{}},
 scores:er1Rows.map(([issuerId,score])=>({issuerId,
  tickers:issuerId==='ALPHABET'?['GOOG','GOOGL']:[issuerId],score}))};
// November's independently published cohort is mandatory for November dates;
// an October score cannot grade a November earnings row by fallback.
const novemberER1={...er1,asOf:'2026-10-31',
 scores:er1.scores.map(row=>({...row,tickers:[...row.tickers]}))};
const calendar={status:'READY',sources:{bls:{status:'READY',checkedAt:new Date(now).toISOString()},bea:{status:'READY',checkedAt:new Date(now).toISOString()}},events:[
 {id:'pce',date:'2026-10-29',title:'Personal Income and Outlays',source:'bea',sourceUrl:'https://www.bea.gov/news/schedule'},
 {id:'employment',date:'2026-11-06',title:'Employment Situation',source:'bls',sourceUrl:'https://www.bls.gov/schedule/'},
 {id:'gdp',date:'2026-10-30',title:'GDP (Second Estimate)',source:'bea',sourceUrl:'https://www.bea.gov/news/schedule'},
 {id:'cpi',date:'2026-11-10',title:'Consumer Price Index',source:'bls',sourceUrl:'https://www.bls.gov/schedule/'},
]};
function html(events){
 const coveredDays=Array.from({length:14},(_,i)=>new Date(Date.parse('2026-10-29T00:00:00Z')+i*86400000).toISOString().slice(0,10));
 const projection={status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,redistribution:false,publicationStatus:'HELD_UNCONFIRMED',coveredDays,events:events.map(e=>({date:'2026-10-29',company:'Company & Co.',marketSession:'after_market',time:null,verification:'VENDOR_UNVERIFIED',source:'earnings-api',...e})),recordCount:events.length,checkedAt:new Date(now).toISOString()};
 return earningsDisplayHtml(earningsDisplaySnapshot(projection),{start:coveredDays[0],end:coveredDays.at(-1),importance:3},er1,null,novemberER1).html;
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

test('banner recognizes ER1 >=97 only and excludes old FHS and unrated earnings',()=>{
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
 const display=earningsDisplaySnapshot(projection);
 const unpublished=earningsDisplayHtml(display,{start,end:coveredDays.at(-1),importance:3},er1);
 assert.equal(unpublished.count,0,'October generic ER1 must never grade November without its own cohort');
 const rendered=earningsDisplayHtml(display,{start,end:coveredDays.at(-1),importance:3},er1,null,novemberER1);
 assert.equal(rendered.count,1);
 assert.match(rendered.html,/aria-label="기업 실적 점수 99\.00점 · 별 3개"/);
 const rows=earningsBannerRows(rendered.html,when);
 assert.deepEqual(rows.map(row=>row.ticker),['ADEA']);
 assert.equal(rows[0].kind,'실적');
 assert.equal(rows[0].importance,3);
 assert.equal(marketCalendarBannerRows(when,null,rendered.html)[0].ticker,'ADEA');
});
test('banner rejects old legacy or FHS ★★★; accepts verified ER1 label only',()=>{
 const time=Date.parse('2026-10-31T04:55:00Z');
 const hdr='<div class="mc-week mc-vendor-week"><strong>2026-11-02 · 기업 실적</strong></div>';
 const article=importance=>'<article class="mc-row mc-vendor-row" data-search="adea adeia inc.">'+
  importance+'<div class=mc-event><span>Adeia Inc. (ADEA)</span></div>'+
  '<time class=mc-time>장후</time></article>';
 const prior=article('<div class=mc-importance aria-label="중요도 3">★★★</div>');
 const notThree=article('<div class="mc-importance" aria-label="재무건전성 별 2개" title="ZGMINI 재무건전성 잠정평가 · 2026-10-31 기준">★★</div>');
 const oldFhs=article('<div class=mc-importance aria-label="재무건전성 별 3개">★★★</div>');
 const scored=score=>article(`<div class=mc-importance aria-label="기업 실적 점수 ${score}점" title="ER1 실제 EPS·매출 · 2026-10-29 기준 · ★★★ 97점 이상">★★★</div>`);
 assert.equal(earningsBannerRows(hdr+prior,time).length,0);
 assert.deepEqual(earningsBannerRows(hdr+notThree,time),[]);
 assert.deepEqual(earningsBannerRows(hdr+oldFhs,time),[]);
 assert.equal(earningsBannerRows(hdr+scored('97.00'),time).length,1);
 assert.deepEqual(earningsBannerRows(hdr+scored('96.99'),time),[]);
});

test('R44 November 50B three-star earnings appear in the top banner from existing reviewed HTML',()=>{
 const timestamp=Date.parse('2026-11-16T04:00:00Z'),start='2026-11-16';
 const coveredDays=Array.from({length:14},(_,i)=>new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
 const csv='ticker,name,exchange,sector,industry,country,price,mktCap\n'+
  'AMZN,Amazon.com Inc.,NASDAQ,Technology,Internet Retail,US,200,150000000000\n'+
  'NVDA,Nvidia Corporation,NASDAQ,Technology,Semiconductors,US,200,4869646000000\n'+
  'MSFT,Microsoft Corporation,NASDAQ,Technology,Software,US,200,25000000000\n'+
  'DAC,Danaos Corporation,NYSE,Industrials,Marine Shipping,US,153.96,2802626256\n';
 const parsed=parseDeltaScreenerCsv(csv);
 const r44=makeDeltaR44Public(gradeCalendarTickersFromDelta(parsed,['AMZN','NVDA','MSFT','DAC']));
 assert.deepEqual(r44.counts,{one:1,two:1,three:2,missing:0,conflicting:0});
 const projection={status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,redistribution:false,
  publicationStatus:'HELD_UNCONFIRMED',coveredDays,recordCount:4,priorityCount:0,
  checkedAt:new Date(timestamp).toISOString(),events:['AMZN','NVDA','MSFT','DAC'].map(ticker=>({
   date:'2026-11-18',ticker,company:ticker+' Corporation',marketSession:'after_market',
   time:null,verification:'VENDOR_UNVERIFIED',source:'earnings-api'}))};
 const display=earningsDisplaySnapshot(projection);
 const filtered=earningsDisplayHtml(display,{start,end:coveredDays.at(-1),importance:3},
  null,null,null,{},r44);
 assert.equal(filtered.count,2);
 assert.match(filtered.html,/시총 기준 중요도 별 3개/);
 assert.match(filtered.html,/★★★ 50B USD 이상 · ★★ 20B USD 이상/);
 assert.deepEqual(earningsBannerRows(filtered.html,timestamp).map(row=>row.ticker),['AMZN','NVDA']);
 const banner=marketCalendarBannerRows(timestamp,null,filtered.html);
 assert.deepEqual(banner.map(row=>row.ticker),['AMZN','NVDA']);
 assert.ok(banner.every(row=>row.importance===3&&row.kind==='실적'));
 assert.ok(!banner.some(row=>['MSFT','DAC'].includes(row.ticker)));
 const previous={...r44,method:DELTA_R44_LEGACY_METHOD};
 const legacy=earningsDisplayHtml(display,{start,end:coveredDays.at(-1),importance:3},
  null,null,null,{},previous);
 assert.match(legacy.html,/★★★ 200B USD 이상/);
 assert.equal(earningsBannerRows(legacy.html,timestamp).length,2,
  'The previously published R44 200B format remains readable');
});
test('banner rejects unvalidated R44-like stars, FHS, ungraded and two-star rows',()=>{
 const timestamp=Date.parse('2026-11-16T04:00:00Z');
 const hdr='<div class="mc-week mc-vendor-week"><strong>2026-11-18 · 기업 실적</strong></div>';
 const article=markup=>'<article class="mc-row mc-vendor-row" data-search="nvda nvidia">'+markup+
  '<div class=mc-event><span>NVIDIA (NVDA)</span></div><time class=mc-time>장후</time></article>';
 const r44='<div class=mc-importance aria-label="시총 기준 중요도 별 3개" title="시총 중요도 · 2026-11-03 기준 · ★★★ 50B USD 이상 · ★★ 20B USD 이상">★★★</div>';
 assert.equal(earningsBannerRows(hdr+article(r44),timestamp).length,1);
 for(const invalid of [
  '<div class=mc-importance aria-label="중요도 3">★★★</div>',
  '<div class=mc-importance aria-label="시총 기준 중요도 별 2개" title="시총 중요도 · 2026-11-03 기준 · ★★★ 50B USD 이상 · ★★ 20B USD 이상">★★</div>',
  '<div class=mc-importance aria-label="시총 기준 중요도 미확인">-</div>',
  '<div class=mc-importance aria-label="시총 기준 중요도 별 3개">★★★</div>',
  '<div class=mc-importance aria-label="시총 기준 중요도 별 3개" title="다른 기준">★★★</div>',
 ])assert.deepEqual(earningsBannerRows(hdr+article(invalid),timestamp),[]);
});

test('top banner company labels strip nested legal-name parentheses while retaining genuine company names',()=>{
 const timestamp=Date.parse('2026-11-16T04:00:00Z'),start='2026-11-16';
 const coveredDays=Array.from({length:14},(_,i)=>new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
 const companies=[
  ['DIS','Walt Disney Company (The)','월트 디즈니'],
  ['HD','Home Depot, Inc. (The)','홈디포'],
  ['TJX','TJX Companies, Inc. (The)','TJX 컴퍼니스'],
  ['MDT','Medtronic plc','메드트로닉'],
  ['XYZ','Fictional Holdings (The)','Fictional Holdings (The)'],
 ];
 const csv=['ticker,name,exchange,sector,industry,country,price,mktCap',
  ...companies.map(([ticker,name])=>[ticker,'"'+name.replaceAll('"','""')+'"','NASDAQ','Technology','Software','US','200','100000000000'].join(','))].join('\n')+'\n';
 const delta=makeDeltaR44Public(gradeCalendarTickersFromDelta(parseDeltaScreenerCsv(csv),companies.map(c=>c[0])));
 const events=companies.map(([ticker,company])=>({date:'2026-11-18',ticker,company,
  marketSession:'after_market',time:null,verification:'VENDOR_UNVERIFIED',source:'earnings-api'}));
 const display=earningsDisplaySnapshot({status:'READY_PRIVATE',scope:'PC_PRIVATE',
  publicDisplay:false,redistribution:false,publicationStatus:'HELD_UNCONFIRMED',
  coveredDays,recordCount:events.length,priorityCount:0,checkedAt:new Date(timestamp).toISOString(),events});
 const filtered=earningsDisplayHtml(display,{start,end:coveredDays.at(-1),importance:3},
  null,null,null,{},delta);
 assert.equal(filtered.count,companies.length);
 assert.match(filtered.html,/월트 디즈니 \(Walt Disney Company \(The\) · DIS\)/);
 assert.match(filtered.html,/홈디포 \(Home Depot, Inc. \(The\) · HD\)/);
 const result=earningsBannerRows(filtered.html,timestamp);
 assert.equal(result.length,companies.length);
 const names=Object.fromEntries(result.map(({ticker,name})=>[ticker,name]));
 for(const [ticker,,expected] of companies)assert.equal(names[ticker],expected);
 assert.equal(marketCalendarBannerRows(timestamp,null,filtered.html).filter(r=>r.kind==='실적').length,companies.length);
});

test('R44 top banner resolves official company logo domains for every observed November issuer',()=>{
 const observed=[
  ['DIS','thewaltdisneycompany.com'],['HD','homedepot.com'],['MDT','medtronic.com'],
  ['NVDA','nvidia.com'],['LOW','lowes.com'],['TGT','target.com'],['TJX','tjx.com'],
  ['PANW','paloaltonetworks.com'],['WMT','walmart.com'],['INTU','intuit.com'],
  ['KEYS','keysight.com'],['ROST','rossstores.com'],['HPE','hpe.com'],
  ['ADI','analog.com'],['ADSK','autodesk.com'],['DELL','dell.com'],['DE','deere.com'],
 ];
 const unknownTicker='ZZZZ';
 const now=Date.parse('2026-11-16T04:00:00Z');
 const start='2026-11-16',end='2026-11-29';
 const coveredDays=Array.from({length:14},(_,i)=>new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
 const tickers=[...observed.map(row=>row[0]),unknownTicker];
 const csv=['ticker,name,exchange,sector,industry,country,price,mktCap',
  ...tickers.map(ticker=>[ticker,'Sample '+ticker,'NASDAQ','Technology','Software','US','200','100000000000'].join(','))].join('\n')+'\n';
 const delta=makeDeltaR44Public(gradeCalendarTickersFromDelta(parseDeltaScreenerCsv(csv),tickers));
 const events=[...tickers.map(ticker=>({ticker,date:'2026-11-18'})),{ticker:'MDT',date:'2026-11-20'}]
  .map(({ticker,date})=>({ticker,date,company:'Sample '+ticker,marketSession:'after_market',
   time:null,verification:'VENDOR_UNVERIFIED',source:'earnings-api'}));
 const display=earningsDisplaySnapshot({status:'READY_PRIVATE',scope:'PC_PRIVATE',
  publicDisplay:false,redistribution:false,publicationStatus:'HELD_UNCONFIRMED',
  coveredDays,recordCount:events.length,priorityCount:0,checkedAt:new Date(now).toISOString(),events});
 const filtered=earningsDisplayHtml(display,{start,end,importance:3},null,null,null,{},delta);
 const rows=earningsBannerRows(filtered.html,now);
 assert.equal(rows.length,observed.length+2);
 const domains=new Map(rows.map(row=>[row.ticker,row.logoDomain]));
 for(const [ticker,domain] of observed){
  assert.equal(domains.get(ticker),domain,'Logo domain must map to '+ticker);
  assert.match(domain,/^[a-z0-9.-]+\.[a-z]{2,}$/);
 }
 assert.equal(domains.get(unknownTicker),null,'Unknown issuer must retain ticker fallback');
 assert.equal(rows.filter(row=>row.ticker==='MDT').length,2,'Repeated earnings retain same issuer logo');
});

test('all 71 public November R44 three-star issuer logos have a curated official-domain mapping',()=>{
 const novThreeStar=`ABNB AFL ALL AMAT APD APP B BAM BDX BN CAH CEG CI CMI CNQ COP COR CSCO CVE CVS DDOG DUK DVN EMR ENB EOG EW GWW KKR MCD MCK MELI MET MFC MNST MRNA MSI MUFG NET NTRA NU NVO OXY PH QCOM SO SPG SRE TDG TM TRGP TRP UBER WPM`.split(' ');
 const alreadyCovered=`ADI ADSK DE DELL DIS HD HPE INTU KEYS LOW MDT NVDA PANW ROST TGT TJX WMT`.split(' ');
 const all=[...novThreeStar,...alreadyCovered].sort();
 assert.equal(new Set(all).size,71);
 const when=Date.parse('2026-11-16T04:00:00Z');
 const coveredDays=Array.from({length:14},(_,i)=>new Date(Date.parse('2026-11-16T00:00:00Z')+i*86400000).toISOString().slice(0,10));
 const csv=['ticker,name,exchange,sector,industry,country,price,mktCap',
  ...all.map(ticker=>[ticker,'Sample '+ticker,'NASDAQ','Technology','Software','US','100','100000000000'].join(','))].join('\n')+'\n';
 const delta=makeDeltaR44Public(gradeCalendarTickersFromDelta(parseDeltaScreenerCsv(csv),all));
 const events=all.map(ticker=>({date:'2026-11-18',ticker,company:'Sample '+ticker,
  marketSession:'after_market',time:null,verification:'VENDOR_UNVERIFIED',source:'earnings-api'}));
 const display=earningsDisplaySnapshot({status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,
  redistribution:false,publicationStatus:'HELD_UNCONFIRMED',
  coveredDays,recordCount:events.length,priorityCount:0,checkedAt:new Date(when).toISOString(),events});
 const rendered=earningsDisplayHtml(display,{start:coveredDays[0],end:coveredDays.at(-1),importance:3},
  null,null,null,{},delta);
 assert.equal(rendered.count,all.length);
 const rows=earningsBannerRows(rendered.html,when);
 assert.equal(rows.length,all.length);
 assert.ok(rows.every(row=>typeof row.logoDomain==='string'&&/^[a-z0-9.-]+\.[a-z]{2,}$/.test(row.logoDomain)));
 assert.equal(new Set(rows.map(r=>r.ticker)).size,all.length);
 assert.equal(marketCalendarBannerRows(when,null,rendered.html).length,20,'banner limit unchanged');
});

test('manual logos cover remaining live 50B-grade issuers, including dotted Berkshire ticker',()=>{
 const missing=Object.entries({
  AMD:'amd.com',AME:'ametek.com',AMGN:'amgen.com',ANET:'arista.com',
  APO:'apollo.com',BKNG:'bookingholdings.com','BRK.A':'berkshirehathaway.com',
  ETN:'eaton.com',ETR:'entergy.com',FANG:'diamondbackenergy.com',
  IDXX:'idexx.com',KDP:'keurigdrpepper.com',LITE:'lumentum.com',
  MAR:'marriott.com',MPC:'marathonpetroleum.com',O:'realtyincome.com',
  PFE:'pfizer.com',PLTR:'palantir.com',RACE:'ferrari.com',
  SHOP:'shopify.com',SU:'suncor.com',TRI:'thomsonreuters.com',
  VRTX:'vrtx.com',WMB:'williams.com'
 });
 const now=Date.parse('2026-11-16T04:00:00Z');
 const marker='<div class=mc-importance aria-label="시총 기준 중요도 별 3개" title="시총 중요도 · 2026-11-03 기준 · ★★★ 50B USD 이상 · ★★ 20B USD 이상">★★★</div>';
 const header='<div class="mc-week mc-vendor-week"><strong>2026-11-18 · 기업 실적</strong></div>';
 const html=header+missing.map(([ticker])=>'<article class="mc-row mc-vendor-row" data-search="'+ticker.toLowerCase()+' sample">'+
  marker+'<div class=mc-event><span>Sample ('+ticker+')</span></div>'+
  '<time class=mc-time>장후</time></article>').join('');
 const rows=earningsBannerRows(html,now);
 assert.equal(rows.length,24);
 for(const [ticker,domain] of missing){
  const found=rows.find(row=>row.ticker===ticker);
  assert.ok(found,'Missing ticker '+ticker);
  assert.equal(found.logoDomain,domain);
 }
 assert.equal(marketCalendarBannerRows(now,null,html).length,20,'existing top-banner display limit unchanged');
});
