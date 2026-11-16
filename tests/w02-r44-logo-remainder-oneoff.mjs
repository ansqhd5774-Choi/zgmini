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
for(const [k,v] of Object.entries(expected))if(output.counts[k]!==v)throw Error('RECALCULATED_COUNTS_MISMATCH_'+k+'_'+output.counts[k]+'_'+v);
if(output.calendarTickerCount!==3035||output.coveredTickerCount!==2750)throw Error('PINNED_CALENDAR_COVERAGE_MISMATCH');
const grade3=Object.entries(output.grades).filter(([,g])=>g===3).map(([t])=>t).sort();
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
  missingTickers:missing,graded94:grade3};
console.log('W02_R44_94_MANUAL_LOGO_INVENTORY '+JSON.stringify(outputLog));
