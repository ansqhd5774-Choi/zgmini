import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {EMPLOYMENT_R4_CORE_STATES} from "../lib/market-score/employment-r4-shadow-contract.mjs";
import {parseEta539ShadowRows} from "../lib/market-score/employment-r4-shadow-provider.mjs";
import {auditEmploymentR6Pit0605StoredRaw} from "../scripts/pc-writer/employment-r6-pit-coverage.mjs";

const sha=x=>createHash("sha256").update(x).digest("hex");
const retrievedAt="2026-11-19T01:00:00.000Z";
const body=["st,rptdate,c2,c3",...EMPLOYMENT_R4_CORE_STATES.map(
  (st,i)=>st+",11/12/2026,10/17/2026,"+(i+1)
)].join("\n")+"\n";
const bsha=sha(body);
const sid=sha(["DOL_UI_WEEKLY_CLAIMS","DOL_ETA","DOL_ETA539:60w",bsha].join("|"));
function sourceTable(db,name){
 db.exec("CREATE TABLE "+name+" ("+
  "logical_series_id TEXT, geography_type TEXT, geography_code TEXT,"+
  "observation_date TEXT,source_hash TEXT,value REAL,retrieved_at TEXT,"+
  "available_at TEXT,provider TEXT,provider_series_id TEXT,"+
  "quality_status TEXT,pit_class TEXT,provenance_json TEXT)");
}
async function fixture(){
 const directory=mkdtempSync(join(tmpdir(),"w04-pit0605-"));
 const corePath=join(directory,"core.sqlite"),candidatePath=join(directory,"candidate.sqlite");
 const core=new DatabaseSync(corePath),candidate=new DatabaseSync(candidatePath);
 for(const db of [core,candidate]){
  sourceTable(db,"market_score_employment_r4_shadow_current_v1");
  sourceTable(db,"market_score_employment_r4_shadow_history_v1");
 }
 core.exec("CREATE TABLE market_score_employment_r6_raw_snapshot_v1 ("+
   "snapshot_id TEXT,chunk_index INTEGER,chunk_count INTEGER,release_group TEXT,"+
   "provider TEXT,request_key TEXT,retrieved_at TEXT,body_sha256 TEXT,"+
   "detail_json TEXT,body_chunk TEXT)");
 core.exec("CREATE TABLE market_score_employment_r4_shadow_runs_v1 ("+
   "provider TEXT,status TEXT,completed_at TEXT,detail_json TEXT)");
 const parsed=(await parseEta539ShadowRows(body,{retrievedAt,historyWeeks:60})).rows;
 const statement=core.prepare("INSERT INTO market_score_employment_r4_shadow_current_v1 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)");
 for(const row of parsed)statement.run(row.logicalSeriesId,row.geographyType,
  row.geographyCode,row.observationDate,row.sourceHash,row.value,
  row.retrievedAt,row.availableAt,row.provider,row.providerSeriesId,
  row.qualityStatus,row.pitClass,JSON.stringify(row.provenance));
 core.prepare("INSERT INTO market_score_employment_r6_raw_snapshot_v1 VALUES(?,?,?,?,?,?,?,?,?,?)")
  .run(sid,0,1,"DOL_UI_WEEKLY_CLAIMS","DOL_ETA","DOL_ETA539:60w",
   retrievedAt,bsha,JSON.stringify({responseHash:bsha}),body);
 core.prepare("INSERT INTO market_score_employment_r4_shadow_runs_v1 VALUES(?,?,?,?)")
  .run("EMPLOYMENT_R6_DOL_UI_WEEKLY_CLAIMS","SUCCESS",
   "2026-11-19T01:01:00.000Z",
   JSON.stringify({rawSnapshots:[{snapshotId:sid,bodySha256:bsha}]}));
 core.close();candidate.close();
 return {directory,corePath,candidatePath};
}
test("PIT-06-05 opt-in native sqlite bridge retains private key evidence",async()=>{
 const f=await fixture();let privateRows=null,opened=0;
 try{
  const result=await auditEmploymentR6Pit0605StoredRaw({
    dbPath:f.corePath,candidateDbPath:f.candidatePath,asOfDate:"2026-11-19",
    writePrivateEvidence:async rows=>{privateRows=rows;},
    onSqliteOpened:()=>{opened++;},
  });
  assert.equal(opened,2);
  assert.equal(result.missingHistoryKeys,51);
  assert.equal(result.acceptedDOLSnapshots,1);
  assert.equal(result.counts.RAW_OBSERVATION_MATCH_HISTORICAL_TIME_UNPROVEN,51);
  assert.equal(result.counts.ORIGINAL_VERSION_AND_HISTORICAL_AVAILABILITY_PROVED,0);
  assert.equal(privateRows.length,51);
  assert.equal(privateRows[0].sourceVersions[0].snapshotId,sid);
  assert.equal(Object.hasOwn(result,"privateEvidence"),false);
  assert.equal(result.repairAuthorized,false);
  const db=new DatabaseSync(f.corePath,{readOnly:true});
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM market_score_employment_r4_shadow_history_v1").get().n,0);
  db.close();
 }finally{rmSync(f.directory,{recursive:true,force:true});}
});
test("PIT-06-05 bridge fails closed if private evidence persistence fails",async()=>{
 const f=await fixture();
 try{
  await assert.rejects(auditEmploymentR6Pit0605StoredRaw({
    dbPath:f.corePath,candidateDbPath:f.candidatePath,asOfDate:"2026-11-19",
    writePrivateEvidence:async()=>{throw Error("PRIVATE_STORE_FAILED");}
  }),/PRIVATE_STORE_FAILED/);
  const db=new DatabaseSync(f.corePath,{readOnly:true});
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM market_score_employment_r4_shadow_history_v1").get().n,0);
  db.close();
 }finally{rmSync(f.directory,{recursive:true,force:true});}
});
