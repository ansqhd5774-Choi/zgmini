import test from 'node:test';import assert from 'node:assert/strict';
import {hash} from '../scripts/iran-progress/store.mjs';
import {reviewedSignals} from '../scripts/iran-progress/reviewed-flow.mjs';
import {buildReferenceFlow} from '../lib/iran-progress/reference-flow-r1.mjs';
const e={accepted:true,rule:'MILITARY_PREPARATION_REPORT',type:'MILITARY',delta:-3,date:'2026-10-07',sourceUrl:'https://www.axios.com/2026/10/07/report',evidence:'reported preparations',incidentDate:null};
const checkpoint=events=>({version:'REVIEWED_NEWS_FLOW_STEP6',events,eventsHash:hash(events)});
test('approved preparation signal lowers score without claiming an attack',()=>{const events=reviewedSignals(checkpoint([e]));assert.equal(buildReferenceFlow(events,{asOfDate:'2026-10-09'}).score,49.4);assert.equal(events[0].incidentDate,null);assert.notEqual(events[0].rule,'MILITARY_ESCALATION');});
test('changed stored evidence, unsupported weights and sources are rejected',()=>{const c=checkpoint([e]);c.events[0]={...e,delta:-25};assert.throws(()=>reviewedSignals(c),/INVALID/);for(const change of [{delta:-25},{type:'DIPLOMACY'},{sourceUrl:'https://example.org/report'},{date:'invalid'}])assert.throws(()=>reviewedSignals(checkpoint([{...e,...change}])),/INVALID/);});
test('empty approval is backwards compatible and duplicates cannot multiply score',()=>{assert.deepEqual(reviewedSignals(null),[]);const events=reviewedSignals(checkpoint([e,e]));assert.equal(buildReferenceFlow(events,{asOfDate:'2026-10-09'}).score,49.4);});
