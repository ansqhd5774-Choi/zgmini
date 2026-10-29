import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseR49ApprovalEvidenceR50,publishIranNewsR50} from '../scripts/iran-progress/news-metadata-publish-r50.mjs';
const now=Date.parse('2026-10-29T10:00:00Z');
const articles=Array.from({length:8},(_,i)=>({
 sourceId:'arabnews',sourceUrl:'https://www.arabnews.com/middle-east/iran-peace-talks-'+(3008802+i),
 originalTitle:'Iran peace negotiations update '+i,
 publisherDeclaredPublishedAt:'2026-10-29T07:00:00.000Z',
 bodyVerified:true,twoStageKeywordsVerified:true,rightsVerified:false,displayEligible:false
}));
const r46Record={version:'IRAN_NEWS_R45_OPTIONAL_PRIVATE_PROBE',status:'PARTIAL',
 checkedAt:'2026-10-29T07:37:00.221Z',sources:[{sourceId:'arabnews',status:'READ',feedUrlsRead:1,feedUrlsFailed:0,candidates:22}],
 candidatesDiscovered:22,articleOutcomes:{ARTICLE_METADATA_REVIEWED:8,ARTICLE_FETCH_FAILED:1},
 metadataReviewed:8,eligible14Day:8,articles,pcCacheWritten:false,remoteD1Written:false,
 publicSnapshotModified:false,schedulerModified:false,scoreLedgerModified:false};
const r46=['R46_READ_ONLY_TEST_BEGIN=YES','PINNED_SOURCE=485c9a08b37270b5cc35260829e81adda3e19bc7',
 'PC_CORE_D1_SCHEDULER_PUBLIC_WRITES=DISABLED','SOURCE_FILES=20_VERIFIED',
 'NODE_TESTS=PASS',JSON.stringify(r46Record),'FINAL_STATUS=R46_TESTS_PASS_PROBE_RECORDED'].join('\r\n');
const r49Record={version:'IRAN_NEWS_R47',status:'PREFLIGHT_READY_FOR_APPROVED_PUBLISH',readOnly:true,
 evidenceCheckedAt:r46Record.checkedAt,reportedCandidates:22,newArticlesVerified:8,
 existingVerified:0,newArticleIds:8,failedArticleFetches:1,baselineOriginal39:39,
 baselineOriginal39Sha256:'f89e556e424db3b9bddbdfdad7c2e84597b8f1bbfd7a388015b6b1807fb55c03',
 currentOriginalSourceRows:41,extraOriginalSourceRows:2,historicalMetadataCorrections:0,
 r1Version:'IRAN_NEWS_DISPLAY_R1',r1StoredAt:1793242899922,d1Written:false,r1Modified:false,
 schedulerModified:false,publicCacheModified:false};
const r49=['R49_MEMBERSHIP_PREFLIGHT_BEGIN=YES',
 'PINNED_SOURCE=1c36f385d55d4fb97d380f33105b7e930ba6efe1',
 'D1_WRITES_SCHEDULER_SCORE_DEPLOY=DISABLED','SOURCE_FILES=11_VERIFIED',
 'MEMBERSHIP_TESTS=PASS',JSON.stringify(r49Record),
 'FINAL_STATUS=R49_MEMBERSHIP_PREFLIGHT_READY_NO_WRITE'].join('\r\n');
const records=articles;
const expected=records.map(x=>({article_id:createHash('sha256').update(x.sourceUrl).digest('hex'),source_id:'arabnews',source_url:x.sourceUrl,title:x.originalTitle,published_at:x.publisherDeclaredPublishedAt,body_verified:1,keywords_verified:1,checked_at:Date.parse('2026-10-29T07:37:00.221Z')}));
const old=Array.from({length:41},(_,i)=>({article_id:createHash('sha256').update('old-'+i).digest('hex'),source_id:i%2?'guardian-iran':'aljazeera',source_url:'https://old.example/'+i,title:'Old '+i,published_at:'2026-10-27T12:00:00.000Z',body_verified:1,keywords_verified:1,checked_at:now-100000}));
function mock({existing=old,failOnStage=false,changeR1=false}={}){
 const memory=new Map(existing.map(x=>[x.article_id,x]));let writes=0,reads=0;
 const remote={async query(db,sql){reads++;if(sql.includes('market_public_snapshots_v1'))return {results:[{body:JSON.stringify({version:'IRAN_NEWS_DISPLAY_R1',v:changeR1&&writes?2:1}),stored_at:1234}]};return {results:[...memory.values()]};},adapter(db,{allowWrites}){assert.equal(allowWrites,true);return {}}};
 const preflight=async()=>({status:'PREFLIGHT_READY_FOR_APPROVED_PUBLISH',baselineOriginal39:39,newArticlesVerified:8,newArticleIds:8,existingVerified:0,historicalMetadataCorrections:0,baselineOriginal39Sha256:'f89e556e424db3b9bddbdfdad7c2e84597b8f1bbfd7a388015b6b1807fb55c03'});
 const stage=async(adapter,rows)=>{writes++;if(failOnStage)throw Error('WRITER_OUTCOME_UNKNOWN');for(const row of rows){memory.set(row.articleId,{article_id:row.articleId,source_id:row.sourceId,source_url:row.sourceUrl,title:row.title,published_at:row.publishedAt,body_verified:1,keywords_verified:1,checked_at:row.checkedAt})};return {status:'STAGED_READBACK_VERIFIED',rows:8,readbackVerified:8,d1Written:true};};
 return {remote,preflight,stage,get writes(){return writes},get reads(){return reads}};
}
test('R49 pinned evidence accepts generated fixture',()=>{assert.equal(parseR49ApprovalEvidenceR50(r49).newRows,8)});
test('R49 corrupted log fails closed before any D1 write',()=>{assert.throws(()=>parseR49ApprovalEvidenceR50(r49.replace('MEMBERSHIP_TESTS=PASS','MEMBERSHIP_TESTS=FAIL')),/R50_R49_LOG_IDENTITY_INVALID/)});
test('R50 adds eight verified rows without changing the original 41',async()=>{const db=mock();const r=await publishIranNewsR50({remote:db.remote,db:'core',r46Evidence:r46,r49Evidence:r49,preflight:db.preflight,stage:db.stage,now});assert.equal(r.status,'D1_EIGHT_ROWS_VERIFIED_API_DEPLOY_PENDING');assert.equal(r.baseRows,41);assert.equal(r.remoteRows,49);assert.equal(r.newRowsVerified,8);assert.equal(db.writes,1);assert.equal(r.r1Preserved,true)});
test('R50 rejects an already stored new ID before any write',async()=>{const db=mock({existing:[...old,expected[0]]});await assert.rejects(publishIranNewsR50({remote:db.remote,db:'core',r46Evidence:r46,r49Evidence:r49,preflight:db.preflight,stage:db.stage,now}),/R50_NEW_ARTICLE_ALREADY_STORED/);assert.equal(db.writes,0)});
test('R50 uncertain write never automatically retries',async()=>{const db=mock({failOnStage:true});await assert.rejects(publishIranNewsR50({remote:db.remote,db:'core',r46Evidence:r46,r49Evidence:r49,preflight:db.preflight,stage:db.stage,now}),/WRITER_OUTCOME_UNKNOWN/);assert.equal(db.writes,1)});
test('R50 detects R1 change during write',async()=>{const db=mock({changeR1:true});await assert.rejects(publishIranNewsR50({remote:db.remote,db:'core',r46Evidence:r46,r49Evidence:r49,preflight:db.preflight,stage:db.stage,now}),/R50_R1_CHANGED_DURING_PUBLISH/);assert.equal(db.writes,1)});
test('R50 rejects stale or incomplete preflight before any write',async()=>{const db=mock();const bad=async()=>({...await db.preflight(),newArticleIds:7});await assert.rejects(publishIranNewsR50({remote:db.remote,db:'core',r46Evidence:r46,r49Evidence:r49,preflight:bad,stage:db.stage,now}),/R50_LIVE_PREFLIGHT_CHANGED/);assert.equal(db.writes,0)});
