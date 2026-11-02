import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {
 buildR43SecReviewDraft,parseR43SecDraftArgs,runR43SecDraftCommand,
} from '../tools/market-calendar-r43/R43_SEC_ROSTER_CANDIDATES.mjs';

const source=()=>({fields:['cik','name','ticker','exchange'],data:[
 [100,'Alphabet Inc','GOOG','Nasdaq'],
 [100,'Alphabet Inc','GOOGL','Nasdaq'],
 [200,'Alibaba Group','BABA','NYSE'],
 [300,'Arm Holdings','ARM','Nasdaq'],
 [400,'Example OTC','EXMPL','OTC'],
 ...Array.from({length:2500},(_,i)=>[500+i,'Example '+i,'T'+i,'Nasdaq']),
]});
const digest=text=>createHash('sha256').update(text).digest('hex');

test('SEC review draft groups classes by CIK but approves no issuer',()=>{
 const sec=source(),draft=buildR43SecReviewDraft(sec,{sourceSha256:digest('official'),now:Date.UTC(2026,10,2)});
 assert.equal(draft.method,'R43_SEC_EDGAR_ISSUER_CANDIDATE_DRAFT_R1');
 assert.equal(draft.candidateIssuerCount,2504);
 assert.equal(draft.approvedForR43,false);
 assert.equal(draft.universeReviewed,false);
 assert.equal(draft.allEligibilityPending,true);
 assert.equal(draft.candidates.filter(x=>x.eligible===true).length,0);
 const alphabet=draft.candidates.find(x=>x.cik==='0000000100');
 assert.deepEqual(alphabet.securities.map(x=>x.ticker),['GOOG','GOOGL']);
 assert.equal(alphabet.securities.every(x=>x.eligible===null&&x.reviewStatus==='PENDING'),true);
 assert.equal(alphabet.issuerIdCandidate,'SEC_CIK_0000000100');
 assert.equal(draft.candidates.find(x=>x.cik==='0000000200').eligible,null);
 assert.equal(draft.candidates.find(x=>x.cik==='0000000400').securities[0].exchangeReviewRequired,true);
 assert.equal(draft.providerCalls,undefined);
});

test('only manually saved SEC file is read; preflight is read-only, write is explicit and once',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'r43-sec-draft-'));
 try{
  fs.writeFileSync(path.join(base,'local-sec-company-tickers-exchange.json'),JSON.stringify(source()));
  const pre=runR43SecDraftCommand(['--preflight','--pc-home',base]);
  assert.equal(pre.status,'R43_SEC_REVIEW_DRAFT_PREFLIGHT_READY_NOT_WRITTEN');
  assert.equal(pre.providerCalls,0);assert.equal(pre.d1Writes,0);
  assert.equal(fs.existsSync(path.join(base,'local-market-calendar-r43-sec-review-draft.json')),false);
  assert.throws(()=>parseR43SecDraftArgs(['--write-review-draft','--pc-home',base]),/EXPLICIT_CONFIRMATION/);
  const written=runR43SecDraftCommand(['--write-review-draft','--confirm-r43-sec-draft','--pc-home',base]);
  assert.equal(written.status,'R43_SEC_REVIEW_DRAFT_WRITTEN_AND_READBACK');
  const saved=JSON.parse(fs.readFileSync(path.join(base,'local-market-calendar-r43-sec-review-draft.json'),'utf8'));
  assert.equal(saved.approvedForR43,false);assert.equal(saved.candidates.every(x=>x.reviewStatus==='PENDING'&&x.eligible===null),true);
  assert.equal(fs.existsSync(path.join(base,'local-market-calendar-r43-reviewed-issuers.json')),false);
  assert.throws(()=>runR43SecDraftCommand(['--write-review-draft','--confirm-r43-sec-draft','--pc-home',base]),/EXISTING_REVIEW_PRESERVED/);
 }finally{fs.rmSync(base,{recursive:true,force:true})}
});

test('invalid official SEC shape or eligibility inference is never accepted',()=>{
 const sec=source();
 assert.throws(()=>buildR43SecReviewDraft({...sec,fields:['ticker','name','cik','exchange']},{sourceSha256:digest('x')}),/OFFICIAL_SCHEMA/);
 const malformed=source();malformed.data[0]=['bad','Company','TEST','Nasdaq'];
 assert.throws(()=>buildR43SecReviewDraft(malformed,{sourceSha256:digest('x')}),/SOURCE_ROW_INVALID/);
 assert.throws(()=>parseR43SecDraftArgs(['--preflight','--confirm-r43-sec-draft','--pc-home',os.tmpdir()]),/EXPLICIT_CONFIRMATION/);
 assert.match(runR43SecDraftCommand(['--help']).note,/never an approved R43/);
 assert.throws(()=>parseR43SecDraftArgs(['--pc-home',path.parse(os.tmpdir()).root]),/TOO_BROAD/);
});

test('duplicate source records and ticker-to-multiple-CIK conflicts stay visible for review',()=>{
 const sec=source();
 sec.data.push([100,'Alphabet Inc','GOOG','Nasdaq']);
 sec.data.push([9999999,'Another Issuer','GOOG','Nasdaq']);
 const draft=buildR43SecReviewDraft(sec,{sourceSha256:digest('fixture')});
 assert.equal(draft.duplicatedSourceRows,1);
 assert.equal(draft.tickerIssuerCollisionCount,1);
 assert.equal(draft.candidates.find(x=>x.cik==='0009999999').eligible,null);
 assert.equal(draft.candidates.every(x=>x.approvedIssuerId===null),true);
});
