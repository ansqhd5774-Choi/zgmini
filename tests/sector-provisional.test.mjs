import test from 'node:test';import assert from 'node:assert/strict';
import {provisionalCollectionWindow,newYorkClock,validSectorProvisional,SECTOR_PROVISIONAL_KEY} from '../lib/market-score/sector-provisional.mjs';
import {readSectorFearGreedR3,SECTOR_FEAR_GREED_R3_FEED_KEY} from '../worker/sector-fear-greed-r3-public.mjs';
import {SECTOR_FEAR_GREED_R3_PUBLIC_VERSION,SECTOR_FEAR_GREED_R3_SECTORS} from '../lib/market-score/sector-fear-greed-r3-public.mjs';
const now=Date.parse('2026-10-19T18:00:00Z');
const point={date:'2026-10-19',...Object.fromEntries(SECTOR_FEAR_GREED_R3_SECTORS.map(s=>[s.id,55]))};
const provisional={status:'READY',phase:'PROVISIONAL',source:'ALPACA_IEX_SPLIT',delayMinutes:null,observationDate:'2026-10-19',asOf:'2026-10-19T17:45:00Z',updatedAt:'2026-10-19T18:00:00Z',point};
const body={version:SECTOR_FEAR_GREED_R3_PUBLIC_VERSION,status:'READY',updatedAt:'2026-10-17T04:00:00Z',observationDate:'2026-10-16',sectors:SECTOR_FEAR_GREED_R3_SECTORS.map(s=>({...s,score:50})),history:Array.from({length:252},()=>({...point,date:'2026-10-16'}))};
test('regular collection uses New York date in DST and standard time; skips weekends and overnight',()=>{
 assert.equal(newYorkClock(now).date,'2026-10-19');assert.equal(provisionalCollectionWindow(now),true);
 assert.equal(provisionalCollectionWindow(Date.parse('2026-10-18T18:00:00Z')),false);
 assert.equal(provisionalCollectionWindow(Date.parse('2026-10-19T12:00:00Z')),false);
 assert.equal(provisionalCollectionWindow(Date.parse('2026-12-01T19:00:00Z')),true);
});
test('old/future/partial provisional never replaces a confirmed point',()=>{
 assert.equal(validSectorProvisional(provisional,'2026-10-16',now),true);
 assert.equal(validSectorProvisional(provisional,'2026-10-19',now),false);
 assert.equal(validSectorProvisional({...provisional,asOf:'2026-10-19T19:00:00Z'},'2026-10-16',now),false);
 assert.equal(validSectorProvisional({...provisional,point:{date:'2026-10-19'}},'2026-10-16',now),false);
 assert.equal(validSectorProvisional(provisional,'2026-10-16',now+86400000),false);
});
test('stored-only API appends provisional without modifying 252 confirmed observations',async()=>{
 const before=JSON.stringify(body);const store={readOutput:async key=>({body:key===SECTOR_FEAR_GREED_R3_FEED_KEY?body:provisional,storedAt:now})};
 const response=await readSectorFearGreedR3(null,{now,store});const result=await response.json();
 assert.equal(response.status,200);assert.equal(result.history.length,253);assert.equal(result.history.at(-1).date,'2026-10-19');assert.equal(result.confirmedObservationDate,'2026-10-16');assert.equal(result.phase,'PROVISIONAL');assert.equal(JSON.stringify(body),before);
});
test('missing provisional preserves confirmed response and remains HTTP200',async()=>{
 const store={readOutput:async key=>key===SECTOR_PROVISIONAL_KEY?null:{body,storedAt:now}};
 const result=await(await readSectorFearGreedR3(null,{now,store})).json();assert.equal(result.history.length,252);assert.equal(result.phase,'CONFIRMED');assert.equal(result.provisional,undefined);
});
test('confirmation supersedes provisional and expiration cannot freeze client publication clock',async()=>{
 const confirmed={...body,observationDate:'2026-10-19'};const store={readOutput:async key=>({body:key===SECTOR_PROVISIONAL_KEY?provisional:confirmed,storedAt:now})};
 const result=await(await readSectorFearGreedR3(null,{now,store})).json();assert.equal(result.phase,'CONFIRMED');assert.equal(result.history.length,252);assert.equal(result.updatedAt,new Date(now).toISOString());
});
