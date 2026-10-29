import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {validateIranOfficialNewsBriefsR1,summarizeIranOfficialNewsBriefsR1}
 from '../lib/iran-progress/news-independent-official-r1.mjs';

const sample=JSON.parse(readFileSync(new URL('../docs/OUTBREAK_IRAN_OFFICIAL_INDEPENDENT_R1_CANDIDATES.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(sample);

test('independent official evidence candidates stay isolated from R41 and R5',()=>{
 assert.equal(validateIranOfficialNewsBriefsR1(sample),true);
 assert.deepEqual(summarizeIranOfficialNewsBriefsR1(sample),{
  version:'IRAN_OFFICIAL_NEWS_BRIEFS_R1',asOfDate:'2026-10-29',candidateCount:16,
  publicationAuthorized:false,officialEvidenceOnly:true,articleReadyCountDelta:0,
  r5ScoreChanges:0,signals:{diplomatic_positive:5,risk_persistent:2,risk_increase:5,mixed:2,neutral:2},
 });
});

test('reject article crosswalk, R41 id, and unauthorized auto publication',()=>{
 for(const property of ['articleId','sourceUrl','articleReady','r5Score']){
  const changed=clone();changed.items[0][property]='unapproved';
  assert.equal(validateIranOfficialNewsBriefsR1(changed),false,property);
 }
 const changed=clone();changed.publicationAuthorized=true;
 assert.equal(validateIranOfficialNewsBriefsR1(changed),false);
});

test('reject non-official links, query manipulation, duplicate events and invalid signals',()=>{
 const cases=[
  changed=>{changed.items[0].sourceEvidence[0].url='https://www.theguardian.com/world/article';},
  changed=>{changed.items[0].sourceEvidence[0].url='https://www.fm.gov.om.evil.example/en/62528/';},
  changed=>{changed.items[0].sourceEvidence[0].url+='?next=https://www.gov.uk/';},
  changed=>{changed.items[0].id=changed.items[1].id;},
  changed=>{changed.items[0].signal='negative';},
  changed=>{changed.items[1].evidenceLevel='MULTIPLE_PRIMARY_STATEMENTS';},
  changed=>{changed.items[1].sourceEvidence[0].sourceDate='2026-02-30';},
  changed=>{changed.items[1].sourceEvidence[0].dateKind='UNVERIFIED';},
  changed=>{changed.items[1].facts=[];},
  changed=>{changed.items[1].facts[0].sourceIndexes=[2];},
 ];
 for(const change of cases){const payload=clone();change(payload);assert.equal(validateIranOfficialNewsBriefsR1(payload),false);}
});

test('each candidate is anchored in official-source evidence with unique IDs and event dates',()=>{
 assert.equal(sample.items.length,16);
 const known=new Set();
 for(const item of sample.items){
  assert.equal(known.has(item.id),false,item.id);
  known.add(item.id);
  assert.match(item.id,/^OFFICIAL-\d{8}-\d{2}$/);
  assert.ok(item.sourceEvidence.every(source=>source.sourceDate<=sample.asOfDate));
  assert.ok(item.sourceEvidence.every(source=>new URL(source.url).protocol==='https:'));
  assert.ok(item.facts.every(fact=>fact.sourceIndexes.length>0));
  assert.equal(item.status,'SOURCE_VERIFIED_CANDIDATE');
 }
});

test('no publishable status or R41 READY annotation can be spoofed',()=>{
 const status=clone();status.items[0].status='READY';
 assert.equal(validateIranOfficialNewsBriefsR1(status),false);
 const missing=clone();missing.items[0].sourceEvidence=[];
 assert.equal(validateIranOfficialNewsBriefsR1(missing),false);
});
