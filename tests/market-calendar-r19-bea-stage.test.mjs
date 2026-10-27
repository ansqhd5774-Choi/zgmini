import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseReleaseCalendar as previous,RELEASE_SOURCES as previousSources,recessionReleaseInfo as previousInfo} from '../staging/market-calendar/r11-bls/lib/release-calendar.mjs';
import {parseReleaseCalendar as next,RELEASE_SOURCES as nextSources,recessionReleaseInfo as nextInfo} from '../staging/market-calendar/r19-bea/lib/release-calendar.mjs';
import {parseReleaseCalendar as expanded} from '../lib/release-calendar.mjs';

const ics=items=>`BEGIN:VCALENDAR\n${items.map(({date,title,status=''})=>`BEGIN:VEVENT\nDTSTART;TZID=America/New_York:${date.replaceAll('-','')}T083000\nSUMMARY:${title}\n${status?`STATUS:${status}\n`:''}END:VEVENT`).join('\n')}\nEND:VCALENDAR`;
const sampleBea=ics([
 {date:'2026-10-29',title:'GDP (Advance Estimate)\\, 3rd Quarter 2026'},
 {date:'2026-10-29',title:'Personal Income and Outlays\\, September 2026'},
 {date:'2026-11-04',title:'U.S. International Trade in Goods and Services\\, September 2026'},
 {date:'2026-11-25',title:'GDP (Second Estimate) and Corporate Profits\\, 3rd Quarter 2026'},
 {date:'2026-12-02',title:'GDP by County and Personal Income by County\\, 2025'},
 {date:'2026-12-10',title:'Real Personal Consumption Expenditures by State and Real Personal Income by State\\, 2025'},
 {date:'2026-12-18',title:'U.S. International Transactions and Investment Position\\, 3rd Quarter 2026'},
 {date:'2026-12-23',title:'GDP (Third Estimate)\\, Industries\\, Corporate Profits\\, State GDP\\, and State Personal Income\\, 3rd Quarter 2026'},
 {date:'2026-12-23',title:'Personal Income and Outlays\\, November 2026'},
 {date:'2026-12-23',title:'Annual Schedule Reference',status:'CANCELLED'},
]);

test('R19 BEA expands all scheduled publications while preserving recession-linked GDP/PCE IDs',()=>{
 const rows=next(sampleBea,'bea');
 assert.equal(rows.length,9);
 assert.deepEqual(rows,expanded(sampleBea,'bea'));
 assert.deepEqual(rows.filter(e=>e.id==='gdp').map(e=>e.date),['2026-10-29','2026-11-25','2026-12-23']);
 assert.deepEqual(rows.filter(e=>e.id==='pce').map(e=>e.date),['2026-10-29','2026-12-23']);
 const county=rows.find(e=>e.title.startsWith('GDP by County'));
 assert.equal(county.id,'bea-gdp-by-county-and-personal-income-by-county-2025');
 assert.ok(rows.some(e=>e.id==='bea-u-s-international-trade-in-goods-and-services-september-2026'));
 assert.equal(rows.length-new Set(rows.map(e=>`${e.source}:${e.id}:${e.date}`)).size,0);
 assert.ok(rows.every(e=>Object.keys(e).sort().join(',')==='date,id,source,sourceUrl,title'));
 assert.ok(rows.every(e=>e.source==='bea'&&e.sourceUrl===previousSources.bea.page));
 const old=previous(sampleBea,'bea');
 assert.equal(old.length,6);
 const semanticKey=e=>`${e.date}:${e.title}`;
 const modern=new Set(rows.map(semanticKey));
 assert.ok(old.every(e=>modern.has(semanticKey(e))));
 assert.equal(rows.filter(e=>e.id==='gdp'&&e.title.startsWith('GDP by County')).length,0);
 const calendar={sources:{bea:{status:'READY',checkedAt:'2026-10-27T08:00:00Z'}},events:rows};
 const today='2026-10-27',now=Date.parse('2026-10-27T09:00:00Z');
 assert.deepEqual(nextInfo('realGdp',calendar,today,now),previousInfo('realGdp',calendar,today,now));
 assert.deepEqual(nextInfo('realPce',calendar,today,now),previousInfo('realPce',calendar,today,now));
});

test('R19 leaves installed BLS, Fed, Census, source definitions and policy behavior unchanged',()=>{
 assert.deepEqual(nextSources,previousSources);
 const bls=ics([
  {date:'2026-11-06',title:'Employment Situation'},
  {date:'2026-11-06',title:'Employment Situation of Veterans'},
  {date:'2026-11-10',title:'Consumer Price Index'},
  {date:'2026-11-10',title:'BLS.gov Economic News Release Schedule'},
 ]);
 const fed='<p><strong>2026:</strong>October 20, November 19</p>';
 const census='<table><tr><td>Advance Monthly Sales for Retail and Food Services</td><td>October 15, 2026</td></tr></table>';
 for(const [source,raw] of [['bls',bls],['fed',fed],['census',census]])assert.deepEqual(next(raw,source),previous(raw,source));
 const newSource=fs.readFileSync(new URL('../staging/market-calendar/r19-bea/lib/release-calendar.mjs',import.meta.url),'utf8');
 const oldSource=fs.readFileSync(new URL('../staging/market-calendar/r11-bls/lib/release-calendar.mjs',import.meta.url),'utf8');
 const stripBea=source=>source.replace(/\/\/ R19 stage 2:[^\n]*\n\/\/ Candidate[^\n]*\n\/\/ Staging[^\n]*\n/,'').replace(/\/\/ R11 stage 1:[^\n]*\n\/\/ Candidate[^\n]*\n\/\/ This file[^\n]*\n/,'').replace(/const beaId=title=>\{[\s\S]*?\n\};\n/,'').replace(/const id=source==='bls'\?blsId\(title\):beaId\(title\);/,"const id=source==='bls'?blsId(title):/Employment Situation/i.test(title)?'employment':/Personal Income and Outlays/i.test(title)?'pce':/^(?:GDP\\b|Gross Domestic Product,)/i.test(title)?'gdp':null;");
 assert.equal(stripBea(newSource),stripBea(oldSource),'R19 should contain only the BEA classifier delta');
});

test('R19 stage stays inert until exact approved PC source install',()=>{
 const collector=fs.readFileSync(new URL('../scripts/pc-writer/release-calendar.mjs',import.meta.url),'utf8');
 assert.match(collector,/from '\.\.\/\.\.\/lib\/release-calendar\.mjs'/);
 assert.doesNotMatch(collector,/staging\/market-calendar\/r19-bea/);
});
