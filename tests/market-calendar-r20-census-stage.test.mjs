import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseReleaseCalendar as stage} from '../staging/market-calendar/r20-census/lib/release-calendar.mjs';
import {parseReleaseCalendar as previous} from '../staging/market-calendar/r19-bea/lib/release-calendar.mjs';

const row=(title,date,period,code='A202610290830')=>
 `<tr><td><a href="/economic-indicators/">${title}</a></td><td>${date}</td><td>8:30 AM</td><td>${period}</td><td>${code}</td></tr>`;
const sample=`<table>
 ${row('Advance Monthly Sales for Retail and Food Services','October 29, 2026','September 2026')}
 ${row('New Residential Construction (Building Permits, Housing Starts, and Housing Completions)','October 29, 2026','August 2026')}
 ${row('New Residential Construction (Building Permits, Housing Starts, and Housing Completions)','October 29, 2026','September 2026')}
 ${row('Advance Report on Durable Goods--Manufacturers\' Shipments, Inventories, and Orders','October 29, 2026','September 2026')}
 ${row('U.S. International Trade in Goods and Services','November 4, 2026','September 2026')}
 ${row('Business Formation Statistics','October 29, 2026','September 2026')}
 <tr><td>Indicator</td><td>Release Date</td><td>Time</td><td>Period Covered</td></tr>
</table>`;

test('R20 adds distinct, real Census release titles while retaining the legacy retail ID',()=>{
 const e=stage(sample,'census');
 assert.equal(e.length,6);
 assert.equal(e.find(x=>x.id==='retail')?.title,'Advance Monthly Sales for Retail and Food Services');
 const homes=e.filter(x=>x.id.startsWith('census-new-residential-construction'));
 assert.equal(homes.length,2);
 assert.notEqual(homes[0].id,homes[1].id);
 assert.ok(homes.every(x=>x.date==='2026-10-29'));
 assert.ok(e.some(x=>x.title.startsWith('Advance Report on Durable Goods')));
 assert.ok(e.some(x=>x.title.startsWith('U.S. International Trade in Goods and Services')));
 assert.ok(e.some(x=>x.title.startsWith('Business Formation Statistics')));
 assert.ok(e.every(x=>Object.keys(x).sort().join(',')==='date,id,source,sourceUrl,title'));
 assert.ok(e.every(x=>x.source==='census'&&x.sourceUrl==='https://www.census.gov/economic-indicators/calendar-listview.html'));
 assert.equal(e.some(x=>x.id==='retail'&&x.date!=='2026-10-29'),false);
});
test('R20 rejects empty/non-Calendar Census pages and duplicate identical rows',()=>{
 assert.throws(()=>stage('<table><tr><td>Indicator</td><td>Release Date</td></tr></table>','census'),/CALENDAR_EVENTS_EMPTY/);
 const identical=row('Advance Monthly Sales for Retail and Food Services','October 29, 2026','September 2026');
 assert.equal(stage(`<table>${identical}${identical}</table>`,'census').length,1);
});
test('R20 leaves BLS, BEA and Fed parser outputs unchanged from installed R19',()=>{
 const ics='BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261029\nSUMMARY:Personal Income and Outlays\\, September 2026\nEND:VEVENT\nEND:VCALENDAR';
 const bls=ics.replace('Personal Income and Outlays\\, September 2026','Employment Situation');
 const fed='<p><strong>2026:</strong> January 16, February 18</p>';
 for(const [html,source] of [[ics,'bea'],[bls,'bls'],[fed,'fed']]){
  assert.deepEqual(stage(html,source),previous(html,source),source);
 }
});
test('R20 intended display accepts newly added Census IDs without replacing verified values',()=>{
 const client=fs.readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
 assert.match(client,/item\.source==='census'/);
 assert.match(client,/item\.id\.startsWith\(\`\$\{item\.source\}-\`\)/);
 assert.match(client,/sourceNames:Record<string,string>\s*=\s*\{bls:'BLS',bea:'BEA',fed:'연준',census:'Census'/);
 assert.match(client,/forecast:null,previous:null/);
});
