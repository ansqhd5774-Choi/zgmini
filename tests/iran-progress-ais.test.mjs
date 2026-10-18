import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {transitContinuity,H_TRANSIT_METHOD} from '../lib/iran-progress/transit-ais.mjs';
import {openStore} from '../scripts/iran-progress/store.mjs';
import {collectSources} from '../scripts/iran-progress/sources.mjs';
import {publishIranStatus} from '../scripts/iran-progress/publication.mjs';
import {IRAN_PROGRESS_VERSION} from '../lib/iran-progress/r13.mjs';
const now=Date.parse('2026-10-08T12:00:00Z'),DAY=86400000;
const input=()=>({method:H_TRANSIT_METHOD,source:'hormuz.now',termsApproved:true,upstreamTermsVerified:true,observationDate:'2026-10-07',
 rows:Array.from({length:7},(_,i)=>({date:new Date(Date.parse('2026-10-07')-i*DAY).toISOString().slice(0,10),value:1,source:'live',partial:false,qualityVerified:true})),
 restriction:{verified:true,state:'RESTRICTED_COMMERCIAL',lastVerifiedAt:now,effectiveAt:now-7*DAY,coverageThrough:now,
 evidence:[{source:'UKMTO',verified:true,reference:'official:1'},{source:'MARAD',verified:true,reference:'official:2'}]}});
test('each approved official restriction tier caps seven days of observed traffic',()=>{for(const [state,expected] of Object.entries({STOPPED:0,EMERGENCY_ESCORT_ONLY:25,RESTRICTED_COMMERCIAL:50,MAJOR_RESTRICTIONS_LIFTED:75,NORMAL_CONFIRMED:100})){const x=input();Object.assign(x.restriction,{state,restrictionsLiftedVerified:true,normalOperationVerified:true});assert.equal(transitContinuity(x,now).score,expected);}});
test('one ship per day means continuity100, not recovered volume',()=>{const r=transitContinuity(input(),now);assert.equal(r.continuity,100);assert.equal(r.dailyAverage,1);assert.equal(r.score,50);});
test('observed zero and missing day give different results',()=>{const x=input();x.rows[0].value=0;assert.equal(transitContinuity(x,now).continuity,600/7);x.rows.pop();assert.equal(transitContinuity(x,now).score,null);});
test('partial, reconstructed, unverified and duplicate days cannot produce Q',()=>{for(const patch of [{partial:true},{source:'legacy'},{source:'mixed'},{qualityVerified:false}]){const x=input();Object.assign(x.rows[0],patch);assert.equal(transitContinuity(x,now).score,null);}const x=input();x.rows.push(x.rows[0]);assert.equal(transitContinuity(x,now).score,null);});
test('conflict, expiry alone, missing official source and unmatched time cannot release R',()=>{for(const patch of [{conflicting:true},{state:'EXPIRED'},{evidence:[]},{effectiveAt:now+DAY},{coverageThrough:now-2*DAY}]){const x=input();Object.assign(x.restriction,patch);assert.equal(transitContinuity(x,now).score,null);}});
test('100 requires both verified restriction removal and normal operation',()=>{const x=input();x.restriction.state='NORMAL_CONFIRMED';assert.equal(transitContinuity(x,now).score,null);x.restriction.restrictionsLiftedVerified=true;assert.equal(transitContinuity(x,now).score,null);x.restriction.normalOperationVerified=true;assert.equal(transitContinuity(x,now).score,100);});
test('upstream rights unresolved cannot produce active commercial score',()=>{const x=input();x.upstreamTermsVerified=false;assert.equal(transitContinuity(x,now).score,null);});
test('retired AIS parser is physically absent and not referenced by the active runner',()=>{
 assert.equal(fs.existsSync(new URL('../scripts/iran-progress/ais.mjs',import.meta.url)),false);
 const runner=fs.readFileSync(new URL('../scripts/iran-progress/run.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(runner,/sources\\.ais|aisRows|H_TRANSIT_METHOD|transit-ais/);
});
test('active collector never requests retired AIS and retains official sources',async()=>{const urls=[];const sources=await collectSources({now,fetcher:async url=>{urls.push(url);return new Response('official source');}});assert.ok(urls.every(url=>!url.includes('hormuz.now')&&!url.includes('imf')&&!url.includes('arcgis')));assert.ok(urls.some(url=>url.includes('maritime.dot.gov')));assert.ok(urls.some(url=>url.includes('ukmto.org')));assert.equal(sources.ais,undefined);assert.equal(sources.aisHealth,undefined);});
test('AIS version pending status can publish and read back without obsolete version guard',async()=>{let stored=null;const remote={query:async()=>({results:stored?[stored]:[]}),request:async(_db,[q])=>{stored={body:q.params[1],stored_at:q.params[2]};}};const r=await publishIranStatus(remote,'fixture',{version:IRAN_PROGRESS_VERSION,status:'PENDING',calculatedAt:now,missing:['H']});assert.equal(r.status,'VERIFIED');assert.equal(JSON.parse(stored.body).version,IRAN_PROGRESS_VERSION);});
