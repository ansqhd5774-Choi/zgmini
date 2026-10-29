import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateArchiveR48,diagnoseIranNewsD1R48} from './news-metadata-baseline-diagnose-r48.mjs';
const ids=['tasnim','govuk','guardian-iran','dw-world','bbc-middle-east','aljazeera','un-middle-east'];
const raw=Array.from({length:39},(_,i)=>{const sourceUrl='https://example.net/article-'+i;return {articleId:createHash('sha256').update(sourceUrl).digest('hex'),sourceId:ids[i%7],sourceUrl,title:'News '+i,publishedAt:'2026-10-28T01:00:00.000Z'}});
const manifest=JSON.stringify({version:'IRAN_NEWS_R41_STAGING_ROWS',rows:raw});
function remote({extra=0,newCount=0,missing=0,changed=false,identity=false}={}){
 const archived=raw.slice(missing).map(row=>({article_id:row.articleId,source_id:row.sourceId,source_url:identity&&row===raw[missing]?'https://other.example.net':row.sourceUrl,title:changed&&row===raw[missing]?'Updated':row.title,published_at:row.publishedAt}));
 const counts=ids.map((id,i)=>({source_id:id,n:raw.slice(missing).filter(r=>r.sourceId===id).length+(i===0?extra:0)}));
 if(newCount)counts.push({source_id:'arabnews',n:newCount});
 const sqls=[];
 return {sqls,remote:{async query(db,sql,args=[]){assert.equal(db,'core');sqls.push({sql,args});assert.ok(sql.startsWith('SELECT '));if(sql.includes('market_public_snapshots_v1'))return {results:[{body:JSON.stringify({version:'IRAN_NEWS_DISPLAY_R1',news:[]}),stored_at:1234}]};if(sql.includes('GROUP BY'))return {results:counts};return {results:archived}}}};
}
test('archive fixture validates exactly 39 URL-identity records',()=>{assert.equal(validateArchiveR48(manifest).length,39);assert.throws(()=>validateArchiveR48(JSON.stringify({version:'IRAN_NEWS_R41_STAGING_ROWS',rows:raw.slice(1)})),/R48_MANIFEST_INVALID/)});
test('read only exact 39: three SELECTs; no writes',async()=>{const x=remote();const r=await diagnoseIranNewsD1R48({remote:x.remote,db:'core',archiveRows:raw});assert.equal(r.status,'ARCHIVE_39_PRESERVED_EXACT_COUNT');assert.equal(r.original39Present,39);assert.equal(r.totalD1Rows,39);assert.equal(x.sqls.length,3);assert.equal(r.d1Written,false)});
test('read only additions preserve all baseline 39 without treating new rows as failure',async()=>{const x=remote({extra:2,newCount:3});const r=await diagnoseIranNewsD1R48({remote:x.remote,db:'core',archiveRows:raw});assert.equal(r.status,'ARCHIVE_39_PRESERVED_WITH_ADDITIONS');assert.equal(r.totalD1Rows,44);assert.equal(r.oldSourceRows,41);assert.equal(r.newSourceRows,3);assert.equal(r.extraOldSourceRows,2);assert.equal(r.original39Missing,0)});
test('missing or altered archive identity is separated from extra current articles',async()=>{const a=await diagnoseIranNewsD1R48({remote:remote({missing:1}).remote,db:'core',archiveRows:raw});assert.equal(a.status,'ARCHIVE_39_MISSING_ROWS');assert.equal(a.original39Missing,1);const b=await diagnoseIranNewsD1R48({remote:remote({identity:true}).remote,db:'core',archiveRows:raw});assert.equal(b.status,'ARCHIVE_IDENTITY_CHANGED');assert.equal(b.original39IdentityChanged,1)});
test('legitimate title correction is observable without erasing archived ID',async()=>{const r=await diagnoseIranNewsD1R48({remote:remote({changed:true}).remote,db:'core',archiveRows:raw});assert.equal(r.status,'ARCHIVE_39_PRESERVED_METADATA_UPDATED');assert.equal(r.original39TitleOrDateChanged,1);assert.equal(r.original39Missing,0)});
