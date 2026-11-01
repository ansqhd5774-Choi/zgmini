import test from 'node:test';
import assert from 'node:assert/strict';
import {fomcInstant,fomcState,fomcKst} from '../lib/fomc-countdown.mjs';
test('Eastern 14:00 maps to Korean next-day 03:00 in DST and 04:00 in winter',()=>{
  assert.equal(fomcInstant('2026-10-28'),'2026-10-28T18:00:00.000Z');
  assert.equal(fomcKst(fomcInstant('2026-10-28')),'10.29 03:00');
  assert.equal(fomcInstant('2026-12-09'),'2026-12-09T19:00:00.000Z');
  assert.equal(fomcKst(fomcInstant('2026-12-09')),'12.10 04:00');
  assert.equal(fomcInstant('2027-03-17'),'2027-03-17T18:00:00.000Z');
});
test('countdown derives from absolute time, including subsecond and resumed tabs',()=>{
  const target=Date.parse(fomcInstant('2026-10-28'));
  assert.deepEqual(fomcState(target-((86400+2*3600+3*60+4)*1000)),{at:'2026-10-28T18:00:00.000Z',reached:false,days:'01',hours:'02',minutes:'03',seconds:'04'});
  assert.equal(fomcState(target-1).seconds,'01');
  assert.equal(fomcState(target-10000).seconds,'10');
});
test('arrival holds zero without inventing a result, then advances after 24h',()=>{
  const target=Date.parse(fomcInstant('2026-10-28'));
  assert.equal(fomcState(target).reached,true);
  assert.equal(fomcState(target+86399999).seconds,'00');
  assert.equal(fomcState(target+86400000).at,fomcInstant('2026-12-09'));
  assert.equal(fomcState(Date.parse('2030-01-01')),null);
  assert.equal(fomcState(NaN),null);
});
