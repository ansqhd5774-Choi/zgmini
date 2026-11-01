import test from 'node:test';import assert from 'node:assert/strict';
import {classifyFlowCandidate,buildReferenceFlow} from '../lib/iran-progress/reference-flow-r1.mjs';
const event=(quote,type,status='ASSERTED')=>classifyFlowCandidate({quote,type,claimStatus:status},{text:quote,publishedDate:'2026-10-08',sourceUrl:'https://example.test/article'});
test('actual escalation lowers and actual talks raise reference score',()=>{
 const attack=event('Iran launched missiles against Israel.','MILITARY');assert.equal(attack.accepted,true);
 assert.ok(buildReferenceFlow([attack],{asOfDate:'2026-10-09'}).score<50);
 const talks=event('Iran and the United States held indirect talks.','DIPLOMACY');assert.equal(talks.accepted,true);
 assert.ok(buildReferenceFlow([talks],{asOfDate:'2026-10-09'}).score>50);
});
test('negation, proposals and unsupported source evidence do not move score',()=>{
 assert.equal(event('Iran has not agreed to a ceasefire.','CEASEFIRE').accepted,false);
 assert.equal(event('Iran should resume talks.','DIPLOMACY','PROPOSED').accepted,false);
 assert.equal(classifyFlowCandidate({quote:'invented',claimStatus:'ASSERTED'},{text:'actual'}).accepted,false);
});
test('duplicates do not multiply moves and failures do not imply improvement',()=>{
 const e=event('Iran launched missiles against Israel.','MILITARY');
 const one=buildReferenceFlow([e],{asOfDate:'2026-10-09'}),many=buildReferenceFlow([e,e,e],{asOfDate:'2026-10-09',collectionOk:false,previousResult:one});
 assert.equal(many.score,one.score);assert.equal(many.eventCount,1);assert.equal(many.status,'UPDATE_DELAYED');
});
test('a separate call for restraint does not negate a reported attack',()=>{
 assert.equal(event('Iran launched missiles against Israel. Leaders urged Iran to show restraint.','MILITARY').accepted,true);
});
test('moving the chart window does not reset accumulated score',()=>{
 const e=event('Iran launched missiles against Israel.','MILITARY');
 assert.equal(buildReferenceFlow([e],{asOfDate:'2026-10-23'}).score,45);
 assert.equal(buildReferenceFlow([e],{asOfDate:'2026-10-23'}).history.length,0);
 assert.throws(()=>buildReferenceFlow([],{asOfDate:'2026-10-09',collectionOk:false}),/NO_VALID_PREVIOUS/);
});
