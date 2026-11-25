import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {createHash} from "node:crypto";
import {EMPLOYMENT_R4_SHADOW_TABLES as T} from "../lib/market-score/employment-r4-shadow-contract.mjs";
import {createEmploymentR4ShadowStore} from "../lib/market-score/employment-r4-shadow-store.mjs";
import {selectAsOfRevisions} from "../lib/market-score/employment-r6-observation-reader.mjs";
import {previewEmploymentHistoryRepairSelection as preview,applyEmploymentHistoryRepairTransaction as apply} from "../lib/market-score/employment-r6-history-repair-transaction.mjs";

const sha=x=>createHash("sha256").update(x).digest("hex");
const rt="2020-11-01T00:00:00.000Z",day="2020-10-31";
const row=geo=>({logical_series_id:"STATE_INITIAL_CLAIMS",provider:"DOL_ETA",provider_series_id:"ETA539:C3",
 geography_type:"STATE",geography_code:geo,frequency:"WEEKLY",unit:"CLAIMS_COUNT",
 seasonal_adjustment:null,population_coverage:null,observation_date:day,release_date:null,
 available_at:null,retrieved_at:rt,value:0,source_revision:"revision",source_hash:"a".repeat(64),
 quality_status:"READY_CORE_51",pit_class:"HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY",schema_version:1,
 provenance_json:'{"parser":"ETA539"}',first_seen_at:rt,last_seen_at:rt});
const proof=c=>({logicalSeriesId:c.logical_series_id,geographyType:c.geography_type,geographyCode:c.geography_code,
 observationDate:c.observation_date,classification:"RAW_OBSERVATION_MATCH_HISTORICAL_TIME_UNPROVEN",
 historicalAvailabilityProved:false,repairAuthorized:false,sourceVersions:[{sourceHash:c.source_hash,value:c.value,
 sourceRevision:c.source_revision,retrievedAt:rt,responseHash:"b".repeat(64),snapshotId:"c".repeat(64)}]});
const receipt=rows=>{const evidenceDigest=sha(JSON.stringify(rows)),receiptBytes=Buffer.from(JSON.stringify({
 kind:"PIT0605_PC_WORKSPACE_PRIVATE_V1",digest:evidenceDigest,rows}));
 return {receiptBytes,receiptSha256:sha(receiptBytes),evidenceDigest,expectedKeys:rows.length};};
async function fixture(rows){
 const db=new DatabaseSync(":memory:");
 const adapter={prepare(sql){const s=db.prepare(sql);return {run:async()=>s.run(),bind(...a){return {
 run:async()=>s.run(...a),first:async()=>s.get(...a),all:async()=>({results:s.all(...a)})};}}}};
 await createEmploymentR4ShadowStore(adapter).initialize();
 for(const r of rows){const cols=Object.keys(r);db.prepare("INSERT INTO "+T.current+" ("+cols.join(",")+
 ") VALUES ("+cols.map(()=>"?").join(",")+")").run(...Object.values(r));}
 return db;
}
function pin(db,r){db.exec("BEGIN");try{const p=preview(db,r);return {
 approvedCount:p.eligible,approvedSelectionSha256:p.selectionSha256};}finally{db.exec("ROLLBACK");}}
const all=(db,t)=>db.prepare("SELECT * FROM "+t).all();
test("repair exact History only, preserves zero, actual receipt and no past PIT",async()=>{
 const c=row("AK"),db=await fixture([c]);try{
 const r=receipt([proof(c)]),before=all(db,T.current),p=pin(db,r);
 const out=apply(db,r,p),h=all(db,T.history);
 assert.equal(out.inserted,1);assert.equal(h.length,1);assert.equal(h[0].value,0);
 assert.equal(h[0].available_at,out.recordedAt);assert.equal(h[0].recorded_at,out.recordedAt);
 assert.equal(h[0].retrieved_at,rt);assert.equal(h[0].pit_class,c.pit_class);
 assert.equal(selectAsOfRevisions(h,"2020-12-01T00:00:00Z").length,0);
 assert.equal(selectAsOfRevisions(h,out.recordedAt).length,1);
 assert.deepEqual(all(db,T.current),before);assert.equal(all(db,T.runs).length,0);
 assert.equal(all(db,T.lock).length,0);
 assert.throws(()=>apply(db,r,p),/SELECTION_DRIFT/);assert.equal(all(db,T.history).length,1);
 }finally{db.close();}
});
test("selected current drift or new history rejects whole transaction",async()=>{
 const c=row("AK"),db=await fixture([c]);try{const r=receipt([proof(c)]),p=pin(db,r);
 db.prepare("UPDATE "+T.current+" SET source_hash=?").run("d".repeat(64));
 assert.throws(()=>apply(db,r,p),/SELECTION_DRIFT/);assert.equal(all(db,T.history).length,0);
 assert.equal(db.isTransaction,false);}finally{db.close();}
});
test("second row invalid provenance rolls back first insert",async()=>{
 const a=row("AK"),b={...row("AL"),provenance_json:"not JSON"},db=await fixture([a,b]);
 try{const r=receipt([proof(a),proof(b)]),p=pin(db,r);
 assert.equal(p.approvedCount,2);assert.throws(()=>apply(db,r,p));
 assert.equal(all(db,T.history).length,0);assert.equal(db.isTransaction,false);
 }finally{db.close();}
});
test("unexpected History trigger rejects before any write",async()=>{
 const c=row("AK"),db=await fixture([c]);try{const r=receipt([proof(c)]),p=pin(db,r);
 db.exec("CREATE TRIGGER unexpected AFTER INSERT ON "+T.history+
 " BEGIN UPDATE "+T.current+" SET value=99; END;");
 assert.throws(()=>apply(db,r,p),/UNEXPECTED_HISTORY_TRIGGER/);
 assert.equal(all(db,T.history).length,0);assert.equal(all(db,T.current)[0].value,0);
 }finally{db.close();}
});
