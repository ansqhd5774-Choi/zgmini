import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {diagnoseR50ReadOnlyR52,verifyR51ZeroLogR52} from '../scripts/iran-progress/news-r50-failure-readonly-r52.mjs';

const now=Date.parse('2026-10-29T09:30:00Z');
const at='2026-10-29T07:37:00.221Z';
const sha=x=>createHash('sha256').update(x).digest('hex');
const articles=Array.from({length:8},(_,i)=>({
 sourceId:'arabnews',sourceUrl:'https://www.arabnews.com/middle-east/iran-talks-'+(3008802+i),
 originalTitle:'Iran talks article '+i,publisherDeclaredPublishedAt:'2026-10-29T06:00:00.000Z',
 bodyVerified:true,twoStageKeywordsVerified:true,rightsVerified:false,displayEligible:false
}));
const r46=['R46_READ_ONLY_TEST_BEGIN=YES','PINNED_SOURCE=485c9a08b37270b5cc35260829e81adda3e19bc7','PC_CORE_D1_SCHEDULER_PUBLIC_WRITES=DISABLED','SOURCE_FILES=20_VERIFIED','NODE_TESTS=PASS',JSON.stringify({version:'IRAN_NEWS_R45_OPTIONAL_PRIVATE_PROBE',status:'PARTIAL',checkedAt:at,
 sources:[{sourceId:'arabnews',status:'READ'}],articles,metadataReviewed:8,
 eligible14Day:8,candidatesDiscovered:22,pcCacheWritten:false,remoteD1Written:false,
 publicSnapshotModified:false,schedulerModified:false,scoreLedgerModified:false}),
 'FINAL_STATUS=R46_TESTS_PASS_PROBE_RECORDED'].join('\r\n');
const baselineHash='f89e556e424db3b9bddbdfdad7c2e84597b8f1bbfd7a388015b6b1807fb55c03';
const r49=['R49_MEMBERSHIP_PREFLIGHT_BEGIN=YES','PINNED_SOURCE=1c36f385d55d4fb97d380f33105b7e930ba6efe1','D1_WRITES_SCHEDULER_SCORE_DEPLOY=DISABLED','SOURCE_FILES=11_VERIFIED','MEMBERSHIP_TESTS=PASS',JSON.stringify({version:'IRAN_NEWS_R47',status:'PREFLIGHT_READY_FOR_APPROVED_PUBLISH',
 readOnly:true,d1Written:false,r1Modified:false,schedulerModified:false,publicCacheModified:false,
 newArticlesVerified:8,existingVerified:0,newArticleIds:8,baselineOriginal39:39,
 baselineOriginal39Sha256:baselineHash,currentOriginalSourceRows:41,extraOriginalSourceRows:2,
 historicalMetadataCorrections:0,r1Version:'IRAN_NEWS_DISPLAY_R1',r1StoredAt:1793242899922,evidenceCheckedAt:at}),
 'FINAL_STATUS=R49_MEMBERSHIP_PREFLIGHT_READY_NO_WRITE'].join('\r\n');
const r50=['R50_ONE_TIME_PUBLISH_BEGIN=YES','PINNED_SOURCE=35af18a7f1033b54867890944e66edf18348bdd0','R50_PRIOR_SAFE_PREWRITE_STOP=VERIFIED','SOURCE_FILES=12_VERIFIED','R50_TESTS=PASS','STEP_2=ONE_TIME_APPROVED_R41_D1_INCREMENTAL_PUBLISH',JSON.stringify({version:'IRAN_NEWS_R50_PUBLISH_ONCE',status:'STOP_NO_AUTO_RETRY',reason:'R50_WRITE_OR_READBACK_OUTCOME_UNKNOWN',d1State:'READBACK_REQUIRED_BEFORE_RETRY',retryAutomatically:false}),'R50_NODE_EXIT=1','FINAL_STATUS=R50_WRITE_OUTCOME_REQUIRES_D1_READBACK'].join('\r\n');
const r51=['R51_READBACK_BEGIN=YES','SOURCE_FILES=13_VERIFIED','R51_TESTS=PASS',JSON.stringify({version:'IRAN_NEWS_R51_READONLY',status:'R50_ZERO_EXPECTED_STORED_NO_RETRY',d1TotalRows:41,original39Present:39,original39Missing:0,r50ExpectedNew:8,r50StoredNew:0,arabNewsTotalRows:0,r1BaselinePreserved:true,r1StoredAt:1793242899922,d1Written:false}),'R51_NODE_EXIT=2','FINAL_STATUS=R51_D1_READBACK_REVIEW_NO_WRITE'].join('\r\n');
const body=JSON.stringify({version:'IRAN_NEWS_DISPLAY_R1',items:[]});
const r1Baseline={hash:sha(body),storedAt:1234};
const gate={status:'PREFLIGHT_READY_FOR_APPROVED_PUBLISH',baselineOriginal39:39,newArticleIds:8,existingVerified:0,baselineOriginal39Sha256:baselineHash};
function context({newRows=[],r1=body,adapterRows=[],gateChanged=false}={}){
 const readSql=[],adapterQueries=[];
 const remote={query:async(db,sql)=>{readSql.push(sql);assert.match(sql,/^SELECT/);
  if(sql.includes('market_public_snapshots_v1'))return {results:[{body:r1,stored_at:1234}]};
  return {results:Array.from({length:41},(_,i)=>({article_id:sha('old-'+i)})).concat(newRows)};
 },adapter:(_db,opts)=>{assert.equal(opts.allowWrites,false);return {
  prepare(sql){adapterQueries.push(sql);return {bind(...params){assert.equal(params.length,8);return {all:async()=>({results:adapterRows})}}}}
 }}};
 return {args:{remote,db:'core',r46,r49,r50,r51,now,r1Baseline,
  preflight:async()=>gateChanged?{...gate,newArticleIds:7}:gate},
  readSql,adapterQueries};
}
test('R52 accepts only verified R51 zero-result evidence',()=>{
 assert.equal(verifyR51ZeroLogR52(r51).storedNew,0);
 assert.throws(()=>verifyR51ZeroLogR52(r51.replace('r50StoredNew":0','r50StoredNew":4')),/R52_R51_ZERO_STATE_UNVERIFIED/);
});
test('R52 replicates all R50 prewrite phases using SELECT only',async()=>{
 const c=context();const phases=[];
 const r=await diagnoseR50ReadOnlyR52({...c.args,onPhase:x=>phases.push(x)});
 assert.equal(r.status,'PREWRITE_CURRENTLY_PASS_R50_CAUSE_NOT_YET_PROVEN');
 assert.equal(r.newArticlesValidated,8);assert.equal(r.d1Written,false);
 assert.equal(c.adapterQueries.length,1);assert.ok(phases.includes('ALL_PREWRITE_CHECKS_PASSED'));
 assert.ok(c.readSql.every(s=>s.startsWith('SELECT')));
});
test('R52 refuses R50 preflight drift before snapshot',async()=>{
 const c=context({gateChanged:true});
 await assert.rejects(diagnoseR50ReadOnlyR52(c.args),/R52_R47_PREFLIGHT_CHANGED/);
 assert.equal(c.readSql.length,0);
});
test('R52 detects newly stored IDs rather than proceeding to any mutation',async()=>{
 const url=articles[0].sourceUrl;const c=context({newRows:[{article_id:sha(url)}]});
 await assert.rejects(diagnoseR50ReadOnlyR52(c.args),/R52_NEW_ROWS_ALREADY_STORED/);
});
test('R52 refuses R1 identity change and incomplete adapter readback',async()=>{
 const a=context({r1:body+'changed'});
 await assert.rejects(diagnoseR50ReadOnlyR52(a.args),/R52_R1_BASELINE_CHANGED/);
 const b=context({adapterRows:[{article_id:'unanticipated'}]});
 await assert.rejects(diagnoseR50ReadOnlyR52(b.args),/R52_ADAPTER_READBACK_UNEXPECTED/);
});
