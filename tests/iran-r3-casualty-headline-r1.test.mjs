import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPublishedScoreArticle} from '../lib/iran-progress/published-event-r1.mjs';
import {classifyR3Article,R3_RULES} from '../lib/iran-progress/reference-flow-r3.mjs';
import {validateEnglishScoreEvidence} from '../scripts/iran-progress/news-r41-english-score-evidence-r1.mjs';

const sourceUrl='https://www.tasnimnews.ir/en/news/2026/10/29/3735170/at-least-14-killed-in-saudi-strikes-on-yemen-as-attacks-reach-101-in-24-hours';
const title='At Least 14 Killed in Saudi Strikes on Yemen As Attacks Reach 101 in 24 Hours';
const quote='At least 14 civilians were killed and 15 others wounded in Saudi airstrikes on a market in Yemen.';
const body=`${quote} Regional officials discussed the reports on Thursday and reviewed the effects on nearby communities. `+
 'Aid groups said they planned to distribute additional supplies to affected families as the situation developed.';
const meta={sourceUrl,title,summary:'',date:'2026-10-29'};

test('fatality-first attack reports match an existing R5 stage with unchanged -12 delta',()=>{
 const result=classifyPublishedScoreArticle(meta);
 assert.equal(result.accepted,true);
 assert.equal(result.rule,'MILITARY_ATTACK');
 assert.equal(result.type,'MILITARY');
 assert.equal(result.delta,-12);
 assert.equal(R3_RULES.filter(rule=>rule.id==='MILITARY_ATTACK').length,1);
 assert.equal(classifyR3Article({...meta,title:quote}).rule,'MILITARY_ATTACK');
});

test('an English body quote still needs a matching factual stage to pass',()=>{
 const proof=validateEnglishScoreEvidence({eventRule:'MILITARY_ATTACK',
  stageStatus:'REPORTED_COMPLETED',supportingQuote:quote},{sourceUrl,
  originalTitle:title,publishedAt:'2026-10-29T11:41:00.000Z',articleBody:body});
 assert.equal(proof.status,'EVIDENCE_CONFIRMED');
 assert.equal(proof.rule,'MILITARY_ATTACK');
 assert.equal(proof.delta,-12);
 assert.equal(proof.scoreApplied,false);
 assert.ok(!JSON.stringify(proof).includes(quote));
});

test('conditional, negated, hypothetical and other-topic casualty language remains blocked',()=>{
 for(const sample of [
  'At least 14 could be killed in Saudi strikes on Yemen',
  'At least 14 reportedly killed in Saudi strikes on Yemen',
  'At least 14 might be killed in Saudi strikes on Yemen',
  'No one was killed in Saudi strikes on Yemen',
  '14 killed in unrelated train accident in South America',
 ]){
  assert.equal(classifyPublishedScoreArticle({...meta,title:sample}).accepted,false,sample);
 }
 const warning=classifyPublishedScoreArticle({...meta,
  title:'Saudi minister warns of strikes on Yemen'});
 assert.equal(warning.rule,'MILITARY_WARNING');
 assert.equal(warning.delta,-2);
});
