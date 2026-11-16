import test from 'node:test';
import assert from 'node:assert/strict';
import {sectorKo,industryKo} from '../lib/market-calendar-taxonomy-ko.mjs';

test('current public sector and industry option labels have a Korean UI translation',async()=>{
 const res=await fetch('https://zgmini.kr/api/earnings-calendar-taxonomy',{signal:AbortSignal.timeout(25000)});
 assert.equal(res.status,200);
 const obj=await res.json();
 assert.equal(obj.status,'READY_TAXONOMY_OPTIONS');
 const entries=Object.entries(obj.sectors);
 const industryEntries=entries.flatMap(([,arr])=>arr);
 const missingSector=entries.map(([s])=>s).filter(s=>sectorKo(s)===s);
 const missingIndustry=[...new Set(industryEntries)].filter(s=>industryKo(s)===s);
 console.log('W02_KO_LIVE_OPTIONS '+JSON.stringify({sectorCount:entries.length,industryOptions:industryEntries.length,uniqueIndustry: new Set(industryEntries).size,missingSector,missingIndustry}));
 assert.equal(entries.length,12);
 assert.equal(industryEntries.length,172);
 assert.deepEqual(missingSector,[]);
 assert.deepEqual(missingIndustry,[]);
});
