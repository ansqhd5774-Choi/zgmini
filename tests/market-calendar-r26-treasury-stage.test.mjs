import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTreasuryCusipXml,TREASURY_AUCTIONS_PAGE} from '../staging/market-calendar/r26-treasury/lib/treasury-calendar.mjs';
import {mockTreasuryXml} from './fixtures/market-calendar-r26-treasury-xml.mjs';

test('R26 extracts announcement and competitive auction only; issue is not a release',()=>{
 const events=parseTreasuryCusipXml(mockTreasuryXml());
 assert.deepEqual(events.map(e=>e.date),['2026-10-29','2026-11-02']);
 assert.deepEqual(events.map(e=>e.id),['treasury-announcement-912797wx1','treasury-auction-912797wx1']);
 assert.ok(events.every(e=>e.source==='treasury'&&e.sourceUrl===TREASURY_AUCTIONS_PAGE));
 assert.ok(events.every(e=>Object.keys(e).sort().join(',')==='date,id,source,sourceUrl,title'));
 assert.ok(events.every(e=>!e.title.includes('11-05')));
});

test('R26 excludes historical rows by an explicit cutoff without inferring future dates',()=>{
 const events=parseTreasuryCusipXml(mockTreasuryXml(),{fromDate:'2026-11-02'});
 assert.equal(events.length,1);
 assert.equal(events[0].date,'2026-11-02');
});

test('R26 fails closed on wrong XML, missing dates, impossible dates, duplicate rows',()=>{
 assert.throws(()=>parseTreasuryCusipXml('<html>Treasury upcoming auctions</html>'),/TREASURY_OFFICIAL_XML_INVALID/);
 assert.throws(()=>parseTreasuryCusipXml(mockTreasuryXml().replace('<IssueDate>2026-11-05</IssueDate>','')),/TREASURY_ENTRY_FIELD_INVALID/);
 assert.throws(()=>parseTreasuryCusipXml(mockTreasuryXml({auctionDay:'2026-11-31'})),/TREASURY_ENTRY_FIELD_INVALID/);
 const one=mockTreasuryXml();
 const entry=one.match(/<TreasuryCUSIPRelease>[\s\S]*?<\/TreasuryCUSIPRelease>/)[0];
 assert.throws(()=>parseTreasuryCusipXml(one.replace('</Data>',entry+'</Data>')),/TREASURY_DUPLICATE_CUSIP_DATE/);
});

test('R26 rejects a date order impossible for an announced auction',()=>{
 assert.throws(()=>parseTreasuryCusipXml(mockTreasuryXml({auctionDay:'2026-10-27'})),/TREASURY_ENTRY_FIELD_INVALID/);
});
