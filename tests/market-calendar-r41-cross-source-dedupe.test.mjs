import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {collapseCrossSourceTradeDuplicates} from '../lib/market-calendar-cross-source-dedupe.mjs';
const bea=(period,date)=>({source:'bea',date,title:'U.S. International Trade in Goods and Services, '+period,id:'bea-u-s-international-trade-in-goods-and-services-'+period.toLowerCase().replace(' ','-')});
const census=(period,date)=>({source:'census',date,title:'U.S. International Trade in Goods and Services · '+period,id:'census-u-s-international-trade-in-goods-and-services-'+period.toLowerCase().replace(' ','-')});
const day='2026-11-04',period='September 2026';
test('R41 shows BEA once only when Census and BEA date/period match',()=>{
 const events=[census(period,day),bea(period,day)];
 const out=collapseCrossSourceTradeDuplicates(events);
 assert.equal(out.length,1);assert.equal(out[0],events[1]);
 assert.equal(events.length,2);
});
test('R41 preserves different survey periods on the same day',()=>{
 const events=[bea(period,day),census('August 2026',day),census('October 2026',day)];
 assert.deepEqual(collapseCrossSourceTradeDuplicates(events),events);
});
test('R41 preserves different dates, unrelated Census and separate same-source reports',()=>{
 const extra={source:'census',date:day,id:'census-new-residential-sales-september-2025',title:'New Residential Sales · September 2025'};
 const extra2={...extra,id:'census-new-residential-sales-october-2025',title:'New Residential Sales · October 2025'};
 const events=[bea(period,day),census(period,'2026-11-05'),extra,extra2];
 assert.deepEqual(collapseCrossSourceTradeDuplicates(events),events);
});
test('R41 does not merge spoofed IDs, unrelated titles or unknown source',()=>{
 const events=[bea(period,day),{...census(period,day),id:'census-wrong'}, {...census(period,day),title:'Something else'}, {...census(period,day),source:'bls'}];
 assert.deepEqual(collapseCrossSourceTradeDuplicates(events),events);
 assert.deepEqual(collapseCrossSourceTradeDuplicates(null),[]);
});
test('R41 client uses display-only dedupe and leaves existing filters',()=>{
 const client=fs.readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
 assert.match(client,/collapseCrossSourceTradeDuplicates\(feed\.events\)/);
 assert.match(client,/useState<FilterKind>\('all'\)/);
 assert.match(client,/toggleStarImportance\(current,key\)/);
});
