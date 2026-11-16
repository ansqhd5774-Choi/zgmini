import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {parseDeltaScreenerCsv,gradeCalendarTickersFromDelta,DELTASCREENER_UPLOAD_SHA256,DELTASCREENER_URL} from '../lib/market-calendar-deltascreener-snapshot.mjs';
const timeout=ms=>AbortSignal.timeout(ms);
const ref='https://zgmini.kr/api/earnings-calendar-display?start=2026-11-01&end=2026-11-30';
const [response,csvResponse]=await Promise.all([
 fetch(ref,{signal:timeout(25000),headers:{accept:'text/html'},redirect:'error'}),
 fetch(DELTASCREENER_URL,{signal:timeout(25000),redirect:'error'})
]);
if(response.status!==200||response.headers.get('x-zgmini-earnings-grade-reader')!=='ZGMINI-R44-USD-CAP')throw Error('PUBLIC_R44_SOURCE_MISSING');
if(csvResponse.status!==200)throw Error('PINNED_CSV_UNAVAILABLE_'+csvResponse.status);
const bytes=Buffer.from(await csvResponse.arrayBuffer());
if(createHash('sha256').update(bytes).digest('hex')!==DELTASCREENER_UPLOAD_SHA256)throw Error('PINNED_CSV_SHA_MISMATCH');
const html=await response.text();
const rows=[...html.matchAll(/<article class="mc-row mc-vendor-row" data-search="([a-z0-9.\-]{1,12}) [^"]*">/g)];
const tickers=[...new Set(rows.map(m=>m[1].toUpperCase()))];
const output=gradeCalendarTickersFromDelta(parseDeltaScreenerCsv(bytes.toString('utf8')),tickers);
const expected={one:2553,two:103,three:94,missing:283,conflicting:2};
console.log('W02_R44_SOURCE_COVERAGE_DIAG '+JSON.stringify({
  liveCalendarTickerCount:output.calendarTickerCount,
  storedCalendarTickerCount:3035,
  liveCounts:output.counts,
  pinnedStoredCounts:expected,
  dataSourceShaVerified:true,
  calendarCountDrift:output.calendarTickerCount-3035
}));
if(output.counts.three!==94)throw Error('LIVE_THREE_STAR_COUNT_MISMATCH_'+output.counts.three);
const filteredResponse=await fetch(ref+'&importance=3',{signal:timeout(25000),redirect:'error'});
if(filteredResponse.status!==200)throw Error('PUBLIC_R44_THREE_STAR_UNAVAILABLE');
const filteredHtml=await filteredResponse.text();
const visibleThree=[...new Set([...filteredHtml.matchAll(/<article class="mc-row mc-vendor-row" data-search="([a-z0-9.\\-]{1,12}) [^"]*">/g)].map(m=>m[1].toUpperCase()))].sort();
if(visibleThree.length!==71)throw Error('PUBLIC_THREE_STAR_VISIBLE_COUNT_MISMATCH_'+visibleThree.length);
const publishedThree=new Set(visibleThree);
for(const t of publishedThree)if(output.grades[t]!==3)throw Error('PUBLIC_GRADE_MISMATCH_'+t);
const grade3=Object.entries(output.grades).filter(([,g])=>g===3).map(([t])=>t).sort();
const absentFromCurrentCalendar=grade3.filter(t=>!publishedThree.has(t));
if(absentFromCurrentCalendar.length!==23)throw Error('PUBLIC_23_STAR_DIFFERENCE_INVALID_'+absentFromCurrentCalendar.length);
const bannerFile=readFileSync(new URL('../lib/market-calendar-banner.mjs',import.meta.url),'utf8');
const block=bannerFile.match(/const domains=Object\.freeze\(\{([\s\S]*?)\}\);/);
if(!block)throw Error('BANNER_LOGO_MAP_MISSING');
const known=[...block[1].matchAll(/\b([A-Z][A-Z0-9.\-]*):'([^']+)'/g)].map(m=>m[1]);
const knownSet=new Set(known);
const linked=grade3.filter(t=>knownSet.has(t));
const missing=grade3.filter(t=>!knownSet.has(t));
if(grade3.length!==94||linked.length+missing.length!==94)throw Error('ROSTER_COVERAGE_MISMATCH');
const outputLog={status:'R44_94_READONLY_REDERIVED',sourceAsOf:'2026-11-03',sourceShaVerified:true,
  savedCountMatches:true,calendarTickerCount:output.calendarTickerCount,threeStarTickerCount:grade3.length,
  alreadyMapped:linked.length,actuallyUnmapped:missing.length,
  offCalendarThreeStarCount:absentFromCurrentCalendar.length,offCalendarThreeStars:absentFromCurrentCalendar,
  missingTickers:missing,graded94:grade3};
console.log('W02_R44_94_MANUAL_LOGO_INVENTORY '+JSON.stringify(outputLog));
