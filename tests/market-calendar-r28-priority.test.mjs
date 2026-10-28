import test from 'node:test';
import assert from 'node:assert/strict';
import {PRIORITY_EARNINGS_ISSUERS} from '../staging/market-calendar/r28-earnings/lib/priority-issuers.mjs';
import {EARNINGS_SOURCES,validateEarningsSource} from '../staging/market-calendar/r28-earnings/lib/earnings-calendar.mjs';

test('R28 core eight are distinct stable issuers, not manually entered event dates',()=>{
 assert.deepEqual(PRIORITY_EARNINGS_ISSUERS.map(x=>x.ticker),[
  'NVDA','AAPL','MSFT','GOOGL','AMZN','META','TSLA','AVGO']);
 assert.equal(new Set(PRIORITY_EARNINGS_ISSUERS.map(x=>x.cik)).size,8);
 for(const issuer of PRIORITY_EARNINGS_ISSUERS){
  assert.match(issuer.cik,/^\d{1,10}$/);
  assert.equal(new URL(issuer.irUrl).protocol,'https:');
  assert.equal(issuer.tier,1);
  assert.ok(!('date' in issuer)&&!('time' in issuer)&&!('events' in issuer));
  assert.ok(['RESEARCHING','EXCLUDED_RIGHTS'].includes(issuer.rightsStatus));
 }
});

test('R28 rights-unapproved research list cannot silently activate the PC provider registry',()=>{
 assert.deepEqual(EARNINGS_SOURCES,[]);
 assert.equal(PRIORITY_EARNINGS_ISSUERS.filter(x=>x.rightsStatus==='ELIGIBLE').length,0);
 assert.throws(()=>validateEarningsSource(PRIORITY_EARNINGS_ISSUERS[0]),/NOT_APPROVED/);
 assert.throws(()=>validateEarningsSource(PRIORITY_EARNINGS_ISSUERS[1]),/NOT_APPROVED/);
});

test('R28 NVIDIA issuer RSS is recorded solely as research; rights exclusion remains explicit',()=>{
 const nvda=PRIORITY_EARNINGS_ISSUERS[0];
 assert.equal(nvda.rightsStatus,'EXCLUDED_RIGHTS');
 assert.equal(nvda.machineFeedUrl,'https://investor.nvidia.com/rss/Event.aspx?LanguageId=1');
 assert.equal(nvda.rightsUrl,'https://www.nvidia.com/en-us/about-nvidia/terms-of-service/');
});
