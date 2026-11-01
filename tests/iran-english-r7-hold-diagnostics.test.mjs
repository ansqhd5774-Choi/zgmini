import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {openStore,hash} from '../scripts/iran-progress/store.mjs';
import {R3_FEEDS} from '../scripts/iran-progress/continuous-news-r3.mjs';
import {CLASSIFIER_VERSION} from '../lib/iran-progress/reference-flow-r3.mjs';
import {explainEnglishR5HoldsR7,runEnglishR5HoldsR7}
 from '../scripts/iran-progress/english-r5-hold-diagnostics-r7.mjs';
import {buildPortableR7} from '../tools/iran-r7-portable-build.mjs';

const now=Date.parse('2026-10-29T04:00:00Z');
const urlOld='https://www.gov.uk/government/news/old-attack';
const urlNew='https://www.gov.uk/government/news/new-talks';
const urlReuters='https://www.reuters.com/world/middle-east/iran-attack/';
const items=[
 {id:hash(urlOld),source:'GOV.UK',sourceUrl:urlOld,
  title:'Iran fired missiles at Saudi base',publishedAt:'2026-10-24T02:00:00.000Z'},
 {id:hash(urlNew),source:'GOV.UK',sourceUrl:urlNew,
  title:'Iran and Saudi officials held peace talks in Tehran',publishedAt:'2026-10-29T02:00:00.000Z'},
 {id:hash(urlReuters),source:'Reuters',sourceUrl:urlReuters,
  title:'Iran fired missiles at Saudi base',publishedAt:'2026-10-29T02:00:00.000Z'},
];
const feed={version:'IRAN_NEWS_METADATA_R41',status:'READY',sourceCount:2,
 itemCount:items.length,displayDays:14,items};
const quote='Iran fired missiles at Saudi base on Tuesday.';
const body=quote+' Military officials described the incident as an attack that took place. '+
 'The report stated missiles were launched against the base in the morning.';
function fixture(t){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-iran-r7-test-'));
 const store=openStore(path.join(directory,'iran.sqlite'));
 t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
 store.checkpoint('continuous-news-last-run-r3',{lastDiscoverySuccessAt:now-60000,
  classifierVersion:CLASSIFIER_VERSION,status:'UPDATED',
  feeds:R3_FEEDS.map(row=>({id:row.id,status:'COLLECTED'}))});
 const prior={sourceUrl:'https://www.gov.uk/government/news/historical-attack',
  title:'Iran fired missiles at Saudi military base',summary:'',date:'2026-10-20'};
 store.putSource('news-metadata:'+hash(prior),prior,Date.parse('2026-10-20T12:00:00Z'));
 return store;
}

test('R7 distinguishes old confirmed article, new unproved article and unapproved source',async t=>{
 const store=fixture(t);
 const sourcesBefore=store.db.prepare('SELECT COUNT(*) n FROM sources').get().n;
 const report=await runEnglishR5HoldsR7(store,{now,
  fetchImpl:async()=>new Response(JSON.stringify(feed),{status:200}),
  evidenceCollector:async()=>({items:[{sourceId:'govuk',sourceUrl:urlOld,
   originalTitle:items[0].title,publishedAt:items[0].publishedAt,articleBody:body}]}),
  generator:async()=>({eventRule:'MILITARY_ATTACK',stageStatus:'REPORTED_COMPLETED',
   supportingQuote:quote}),
 });
 assert.equal(report.status,'IRAN_ENGLISH_R7_HOLD_DIAGNOSTICS_READ_ONLY');
 assert.equal(report.publicNewsCount,3);
 assert.equal(report.traceCoverageCount,3);
 assert.equal(report.totalNewCandidates,0);
 assert.equal(report.confirmedEnglishProofs,1);
 assert.equal(report.confirmedButNotAdmitted,1);
 const old=report.articles.find(row=>row.id===items[0].id);
 const fresh=report.articles.find(row=>row.id===items[1].id);
 const other=report.articles.find(row=>row.id===items[2].id);
 assert.equal(old.proofStatus,'EVIDENCE_CONFIRMED');
 assert.deepEqual(old.scoreReasons,['OLDER_PUBLICATION_REQUIRES_REVIEW']);
 assert.equal(old.publicationAgeDays,5);
 assert.deepEqual(fresh.scoreReasons,['ENGLISH_AI_EVIDENCE_REQUIRED']);
 assert.equal(fresh.proofReason,'RIGHTS_CHECKED_BODY_NOT_AVAILABLE');
 assert.deepEqual(other.scoreReasons,['SOURCE_NOT_APPROVED_FOR_R5']);
 assert.equal(report.fullArticleBodyLogged,false);
 assert.equal(report.originalTitleLogged,false);
 assert.equal(report.sqliteWrite,false);
 assert.equal(report.taskChange,false);
 assert.equal(store.db.prepare('SELECT COUNT(*) n FROM sources').get().n,sourcesBefore);
 assert.equal(store.getCheckpoint('score-published-news-input-r1'),null);
 assert.ok(!JSON.stringify(report).includes(quote));
 assert.ok(!JSON.stringify(report).includes(items[0].title));
 assert.ok(!JSON.stringify(report).includes(urlOld));
});

test('R7 rejects incomplete article diagnostics and inconsistent evidence states',()=>{
 const fake={status:'ENGLISH_R5_R6_IN_MEMORY_PREVIEW',publicWrite:false,
  sqliteWrite:false,baselineScore:5,previewScore:5,previewDifference:0,
  sourceCollectionGate:'PASSED_EXISTING_R3_CHECKPOINT'};
 const plan={endpoint:'/api/outbreak-news/iran/r41',articleResults:[],held:[],planned:[]};
 assert.throws(()=>explainEnglishR5HoldsR7(feed,{items:[],pending:[]},plan,fake,{now}),
  /IRAN_R7_ARTICLE_LINEAGE_INVALID/);
});

test('R7 independent ZIP contains all imports and ASCII Windows commands',t=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r7-zip-'));
 t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
 const output=path.join(parent,'package'),manifest=buildPortableR7(output);
 assert.equal(manifest.readOnly,true);
 assert.equal(manifest.files.some(x=>x.path==='scripts/iran-progress/english-r5-hold-diagnostics-r7.mjs'),true);
 for(const row of manifest.files.filter(x=>x.path.endsWith('.cmd'))){
  const bytes=fs.readFileSync(path.join(output,row.path));
  assert.ok([...bytes].every(byte=>byte<128));
  assert.match(bytes.toString('ascii'),/\r\n/);
 }
 const entry=path.join(output,'scripts/iran-progress/english-r5-hold-diagnostics-r7.mjs');
 const proc=spawnSync(process.execPath,['--input-type=module','-e',
  `import(${JSON.stringify(new URL(`file://${entry}`).href)}).then(m=>{if(typeof m.runEnglishR5HoldsR7!=='function')process.exit(2)})`],
  {encoding:'utf8',cwd:parent,timeout:30000});
 assert.equal(proc.status,0,proc.stderr);
 assert.throws(()=>buildPortableR7(output),/IRAN_R7_OUTPUT_ALREADY_EXISTS/);
});
