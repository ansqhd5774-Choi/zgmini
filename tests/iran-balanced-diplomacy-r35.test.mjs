import test from 'node:test';import assert from 'node:assert/strict';
import {classifyR3Article} from '../lib/iran-progress/reference-flow-r3.mjs';
import {resolveR3Events} from '../scripts/iran-progress/operate-r3.mjs';
import {calculateIranDailyAnchorShadow} from '../lib/iran-progress/daily-anchored-shadow-r5.mjs';
const article=(title,url='https://www.tasnimnews.ir/en/news/test')=>({title,summary:'Iran and Saudi Arabia regional security',date:'2026-10-26',sourceUrl:url});
const event=(title,url)=>classifyR3Article(article(title,url));
const calculate=(events,balanced=true)=>calculateIranDailyAnchorShadow(events,{asOfDate:'2026-10-28',sensitivityScale:21,evidencePolicy:balanced?'BALANCED_REPORTED_STAGES_R5_2':'LEGACY_R5_1'});
test('actual Tehran meeting and continued dialogue are diplomatic reports, not ceasefire implementation',()=>{
 const held=event('Iran, Saudi Arabia, Pakistan, Turkey Hold Quadripartite Security Talks in Tehran');
 assert.equal(held.rule,'TALKS_HELD');assert.equal(held.delta,8);assert.equal(held.eventVerified,false);
 assert.equal(event('Iran, Saudi Arabia, Turkiye and Pakistan agree to continue talks for peace').rule,'DIALOGUE_WILLINGNESS');
 for(const title of ['Officials from Mecca pact states to hold talks in Iran amid regional tensions','Iran and Saudi Arabia will hold peace talks','Iran and Saudi Arabia may hold peace talks','Iran and Saudi Arabia did not hold peace talks','Gulf states plan to reopen Hormuz if Iran sanctions are lifted','Japan requested Iran to exercise restraint and resume talks between Iran and US as soon as possible'])assert.equal(event(title).accepted,false,title);
});
test('multiple publications or stages of the same multilateral meeting count only the highest reported stage',()=>{
 const a=event('Iran, Saudi Arabia, Pakistan, Turkey Hold Quadripartite Security Talks in Tehran');
 const b=event('Saudi Arabia, Turkey, Iran and Pakistan held security talks in Tehran','https://www.aljazeera.com/news/meeting');
 const c=event('Iran, Saudi Arabia, Pakistan, Turkey agreed to continue talks in Tehran','https://www.bbc.com/news/articles/meeting');
 for(const input of [[a,b,c],[c,b,a]]){const r=resolveR3Events(input);assert.equal(r.accepted.length,1);assert.equal(r.accepted[0].delta,8);assert.equal(r.held.length,2);}
 const noPlace=event('Iran, Saudi Arabia, Pakistan, Turkey agreed to continue talks','https://www.bbc.com/news/articles/continued');
 assert.equal(resolveR3Events([a,noPlace]).accepted.length,1,'Missing place does not prove an independent second meeting');
 const differentPlace=event('Iran, Saudi Arabia, Pakistan, Turkey held security talks in Doha','https://www.bbc.com/news/articles/doha');
 assert.equal(resolveR3Events([a,differentPlace]).accepted.length,2,'Explicitly different locations remain separate');
});
test('balanced policy permits reported diplomacy and nets both signs without a negative-day veto',()=>{
 const held=event('Iran and Saudi Arabia held peace talks');
 const warning=event('Iran warns US of attacks');
 const legacy=calculate([held,warning],false),balanced=calculate([held,warning]);
 assert(legacy.score<13);assert(balanced.score>13);assert.equal(balanced.history.find(p=>p.date==='2026-10-26').adverseVeto,false);
 assert.equal(balanced.history.find(p=>p.date==='2026-10-26').suppressedPositivePoints,0);
 const bad=event('Iran fired missiles at US base');assert(calculate([bad]).score<13);
});
test('actual implementation still requires independent verification, and legacy remains reproducible',()=>{
 const reopened=event('Iran says Hormuz strait reopened');assert.equal(reopened.rule,'MARITIME_REOPENED');
 assert.equal(calculate([reopened]).score,13);assert(calculate([{...reopened,eventVerified:true}]).score>13);
 assert.equal(calculate([event('Iran and Saudi Arabia held peace talks')],false).score,13);
 assert.throws(()=>calculateIranDailyAnchorShadow([],{asOfDate:'2026-10-28',evidencePolicy:'FAKE'}),/POLICY_INVALID/);
});
