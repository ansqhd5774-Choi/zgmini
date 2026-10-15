import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {hash} from '../scripts/iran-progress/store.mjs';
import {replayStoredR2} from '../scripts/iran-progress/reference-flow-r2.mjs';
import {classifyR2Article,buildReferenceFlowR2,R2_RULES} from '../lib/iran-progress/reference-flow-r2.mjs';
const article=title=>({title,date:'2026-10-14',sourceUrl:'https://www.tasnimnews.ir/en/news/2026/10/14/123/iran-news'});
const event=title=>classifyR2Article(article(title));
test('R2 distinguishes intention, meeting, agreement and implementation across all five domains',()=>{
 for(const [title,rule] of [
  ['Iran ready to negotiate with US','DIALOGUE_WILLINGNESS'],
  ['Iran held indirect talks with US','TALKS_HELD'],
  ['Iran signed a ceasefire agreement with Israel','CEASEFIRE_SIGNED'],
  ['Iran-Israel ceasefire took effect','CEASEFIRE_IMPLEMENTED'],
  ['Iran launched missiles at US base','MILITARY_ATTACK'],
  ['Iran withdrew its troops from US base','MILITARY_WITHDRAWAL'],
  ['Iran says Hormuz navigation restored','MARITIME_REOPENED'],
  ['Iran nuclear inspections resumed','INSPECTIONS_RESUMED'],
  ['Iran nuclear inspections suspended','INSPECTIONS_SUSPENDED'],
 ]){const d=event(title);assert.equal(d.rule,rule,title);assert.equal(d.eventVerified,false);assert.equal(d.claimVerification,'SINGLE_SOURCE_REPORT');}
 assert.equal(new Set(R2_RULES.map(r=>r.type)).size,5);
});
test('prediction, negation, unrelated conflicts and ambiguous stages never become asserted events',()=>{
 for(const title of ['Iran may resume talks with US','Iran has not resumed talks with US','Iran plans to hold talks with US','Iran held talks and signed a ceasefire agreement','Iran held talks with Saudi officials about Yemen'])assert.equal(event(title).accepted,false,title);
 // Matching summary cannot override a non-asserted headline.
 assert.equal(classifyR2Article({...article('Iran considers next steps'),summary:'Iran held talks with US'}).accepted,false);
 assert.equal(classifyR2Article({...article('Iran held talks with US'),sourceUrl:'https://www.gov.uk.evil.test/iran'}).accepted,false);
 assert.equal(classifyR2Article({...article('Iran held talks with US'),date:'2026-02-30'}).accepted,false);
});
test('R2 uses raw 1x score and retains separate same-day events; exact syndicated headline counted once',()=>{
 const a=event('Iran held indirect talks with US in Doha'),b=event('Iran held indirect talks with US in Muscat');
 const duplicate={...a,sourceUrl:'https://www.gov.uk/news/iran-talks'};
 const flow=buildReferenceFlowR2([a,b,duplicate],{asOfDate:'2026-10-14'});
 assert.equal(flow.eventCount,2);assert.equal(flow.domains.DIPLOMACY,66);assert.equal(flow.score,54.8);assert.equal(flow.displaySensitivity,1);
 assert.equal(flow.probability,false);
 assert.deepEqual(flow,buildReferenceFlowR2([duplicate,b,a],{asOfDate:'2026-10-14'}));
});
test('no news does not invent recovery; history window is not the cumulative baseline',()=>{
 const e={...event('Iran launched missiles at US base'),date:'2026-09-10'};
 const f=buildReferenceFlowR2([e],{asOfDate:'2026-10-14'});
 assert.equal(f.score,47.6);assert.equal(f.history.length,0);assert.equal(f.eventCount,1);
 const invalid={...e,delta:-100};assert.equal(buildReferenceFlowR2([invalid],{asOfDate:'2026-10-14'}).score,50);
});
test('replay reclassifies old excluded receipts, uses latest content and does not write R1',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE sources(id TEXT PRIMARY KEY,body TEXT,stored_at INTEGER); CREATE TABLE checkpoints(name TEXT PRIMARY KEY,body TEXT)');
 const first=article('Iran considers next steps'),second=article('Iran held indirect talks with US');
 for(const [i,a] of [first,second].entries())db.prepare('INSERT INTO sources VALUES(?,?,?)').run('news-metadata:'+hash(a),JSON.stringify(a),i+1);
 db.prepare('INSERT INTO checkpoints VALUES(?,?)').run('reference-flow-last-valid-r1',JSON.stringify({version:'IRAN_REFERENCE_FLOW_R1',score:41.5,displaySensitivity:3.5}));
 const before=db.prepare('SELECT total_changes() AS n').get().n;
 const r=replayStoredR2(db,{now:Date.UTC(2026,9,15)});assert.equal(r.inputCount,1);assert.equal(r.accepted,1);assert.equal(r.r2.score,52.4);assert.equal(r.productionReady,false);
 assert.equal(db.prepare('SELECT total_changes() AS n').get().n,before);
 db.prepare('UPDATE sources SET body=? WHERE stored_at=2').run(JSON.stringify({...second,title:'tampered'}));
 assert.throws(()=>replayStoredR2(db),/R2_RECEIPT_HASH_MISMATCH/);db.close();
});
