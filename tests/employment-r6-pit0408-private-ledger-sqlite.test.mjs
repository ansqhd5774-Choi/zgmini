import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {auditEmploymentR6PitCoverage} from "../scripts/pc-writer/employment-r6-pit-coverage.mjs";

const digest=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const now="2026-11-17T12:00:00.000Z";
const base={logical_series_id:"STATE_INITIAL_CLAIMS",geography_type:"STATE",
 geography_code:"AL",observation_date:"2026-11-07",value:8,source_hash:"a".repeat(64),
 retrieved_at:now,available_at:now,provider:"DOL_ETA",
 provider_series_id:"ETA539:C3",source_revision:"ETA539:RPTDATE:2026-11-12",
 quality_status:"READY_CORE_51",pit_class:"HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY",
 provenance_json:'{"responseHash":"fixture"}'};
const cols=["logical_series_id","geography_type","geography_code","observation_date",
 "source_hash","value","retrieved_at","available_at","provider",
 "provider_series_id","source_revision","quality_status","pit_class","provenance_json"];
function table(db,name){
 db.exec("CREATE TABLE "+name+" ("+cols.map(c=>c+" "+(c==="value"?"REAL":"TEXT")).join(",")+")");
}
function insert(db,tableName,row){
 db.prepare("INSERT INTO "+tableName+"("+cols.join(",")+") VALUES("+
  cols.map(()=>"?").join(",")+")").run(...cols.map(c=>row[c]));
}
function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),"w04-pit0408-private-"));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const dbPath=join(dir,"core.sqlite"),candidateDbPath=join(dir,"candidate.sqlite");
 const core=new DatabaseSync(dbPath),candidate=new DatabaseSync(candidateDbPath);
 const current="market_score_employment_r4_shadow_current_v1";
 const history="market_score_employment_r4_shadow_history_v1";
 for(const db of [core,candidate]){table(db,current);table(db,history);}
 for(const state of ["AK","AL","CA","NV"])insert(core,current,{...base,geography_code:state});
 for(const state of ["AL","CA"])insert(core,history,{...base,geography_code:state});
 insert(candidate,current,{...base,geography_code:"AK"});
 insert(candidate,history,{...base,geography_code:"AK"});
 insert(candidate,current,{...base,geography_code:"CA",value:9});
 core.close();candidate.close();return {dbPath,candidateDbPath};
}
test("PIT0408 private ledger captures every claim review key and distinct cross-series conflicts",t=>{
 const paths=fixture(t);
 let captured=null,sha=null;
 const r=auditEmploymentR6PitCoverage({...paths,asOfDate:"2026-11-18",
  keyReviewOffset:0,onPrivateKeyLedger:(x,d)=>{captured=x;sha=d;}});
 assert.equal(r.pit04KeyReview.counts.coreKeys,4);
 assert.equal(r.pit04KeyReview.counts.coreHistoryMissing,2);
 assert.equal(r.pit04KeyReview.counts.missingCandidateInternalMatch,1);
 assert.equal(r.pit04KeyReview.counts.missingWithoutCandidate,1);
 assert.equal(r.pit04KeyReview.counts.candidateOverlapConflicts,1);
 assert.equal(r.pit04KeyReview.evidenceTotal,3);
 assert.equal(r.pit04KeyReview.evidence.length,3);
 assert.equal(captured.evidence.length,3);
 assert.equal(captured.allSeriesCandidateCurrentConflicts.length,1);
 assert.equal(captured.allSeriesCandidateCurrentConflicts[0].geographyCode,"CA");
 assert.equal(captured.evidence[0].geographyCode,"CA");
 assert.equal(captured.evidence.filter(x=>x.coreHistoryMissing).length,2);
 assert.equal(r.pit04PrivateEvidenceDigest,digest(captured));
 assert.equal(sha,r.pit04PrivateEvidenceDigest);
 assert.equal(r.pit04PrivateEvidencePersisted,true);
 assert.equal(Object.hasOwn(r.pit04KeyReview,"privateEvidence"),false);
 assert.equal(r.pit04KeyReview.repairAuthorized,false);
 const read=new DatabaseSync(paths.dbPath,{readOnly:true});
 assert.equal(read.prepare("SELECT COUNT(*) AS n FROM "+ 
   "market_score_employment_r4_shadow_history_v1").get().n,2);
 read.close();
});
test("PIT0408 private ledger must not run unless offset zero and sink available",t=>{
 const paths=fixture(t);
 for(const args of [{keyReviewOffset:8,onPrivateKeyLedger:()=>{}},
                    {keyReviewOffset:null,onPrivateKeyLedger:()=>{}},
                    {keyReviewOffset:0,onPrivateKeyLedger:true}]){
  assert.throws(()=>auditEmploymentR6PitCoverage({...paths,
   asOfDate:"2026-11-18",...args}),/PIT_AUDIT_PRIVATE_SCOPE_INVALID/);
 }
 assert.throws(()=>auditEmploymentR6PitCoverage({...paths,
  asOfDate:"2026-11-18",keyReviewOffset:0,
  onPrivateKeyLedger:()=>{throw Error("PRIVATE_RECEIPT_FAILED");}
 }),/PRIVATE_RECEIPT_FAILED/);
});
