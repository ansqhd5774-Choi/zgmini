import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {DatabaseSync} from "node:sqlite";
import {test} from "node:test";
import {createEmploymentR6Store} from "../lib/market-score/employment-r6-store.mjs";
import {parseBlsR6Rows} from "../lib/market-score/employment-r6-provider.mjs";
import {EMPLOYMENT_R4_SHADOW_TABLES} from "../lib/market-score/employment-r4-shadow-contract.mjs";

function memoryD1(){
  const sqlite=new DatabaseSync(":memory:");
  const db={
    prepare(sql){const prepared=sqlite.prepare(sql);function wrap(values=[]){return{
      bind(...next){return wrap(next)},
      async run(){return prepared.run(...values)},
      async first(){return prepared.get(...values)},
      async all(){return {results:prepared.all(...values)}},
    }}return wrap([])},
    async batch(statements){sqlite.exec("BEGIN");try{
      const out=[];for(const s of statements)out.push(await s.run());
      sqlite.exec("COMMIT");return out;
    }catch(error){sqlite.exec("ROLLBACK");throw error}},
  };
  return {sqlite,db};
}

function blsRows(series,releaseGroup,releaseAt,retrievedAt){
  const parsed=parseBlsR6Rows({Results:{series:series.map(([seriesID,data])=>({
    seriesID,data:data.map(([year,period,value])=>({year,period,value:String(value),footnotes:[]})),
  }))}},{releaseGroup,releaseAt,retrievedAt});
  return parsed.rows.map(row=>{
    const {_canonical,...clean}=row;
    return {...clean,sourceHash:createHash("sha256").update(_canonical).digest("hex")};
  });
}
const cps=(data,releaseAt,retrievedAt)=>blsRows([
  ["LNS14000000",data],
],"BLS_EMPLOYMENT_SITUATION",releaseAt,retrievedAt);
const stateMetro=(state,metro,releaseAt,retrievedAt)=>blsRows([
  ["SMS00000000000000022",state],
  ["SMS99999990000000022",metro],
],"BLS_STATE_MSA",releaseAt,retrievedAt);

test("BLS unchanged latest-to-history rollover is NOOP, while a genuine revision is UPDATE",async()=>{
  const {sqlite,db}=memoryD1();
  try{
    const store=createEmploymentR6Store(db);
    await assert.rejects(store.upsertObservationRows({rows:"INVALID"}),/ROWS_REQUIRED/);
    const firstAt="2026-10-03T15:00:00.000Z";
    const sep=cps([["2026","M09",4.2]],"2026-10-02T12:30:00.000Z",firstAt);
    const first=await store.upsertObservationRows({rows:sep,retrievedAt:firstAt});
    assert.deepEqual([first.inserted,first.revised,first.noop],[1,0,0]);
    assert.equal(sep[0].releaseDate,"2026-10-02T12:30:00.000Z");

    // Nov release is due, but BLS still returns the Sep period: no phantom Nov revision.
    const delayedAt="2026-11-07T17:00:00.000Z";
    const delayed=cps([["2026","M09",4.2]],"2026-11-06T13:30:00.000Z",delayedAt);
    assert.equal(delayed[0].releaseDate,"2026-10-02T12:30:00.000Z");
    const unchanged=await store.upsertObservationRows({rows:delayed,retrievedAt:delayedAt});
    assert.deepEqual([unchanged.inserted,unchanged.revised,unchanged.noop],[0,0,1]);

    const rolloverAt="2026-11-08T15:00:00.000Z";
    const rollover=cps([["2026","M10",4.1],["2026","M09",4.2]],
      "2026-11-06T13:30:00.000Z",rolloverAt);
    const changed=await store.upsertObservationRows({rows:rollover,retrievedAt:rolloverAt});
    assert.deepEqual([changed.inserted,changed.revised,changed.noop],[1,0,1]);
    const sepCurrent=(await db.prepare(`SELECT * FROM ${EMPLOYMENT_R4_SHADOW_TABLES.current} WHERE observation_date=?`)
      .bind("2026-09-30").first());
    assert.equal(sepCurrent.release_date,"2026-10-02T12:30:00.000Z");
    assert.equal(sepCurrent.quality_status,"READY_FORWARD");
    assert.equal(sepCurrent.available_at,firstAt);

    const actualRevision=cps([["2026","M10",4.1],["2026","M09",4.4]],
      "2026-11-06T13:30:00.000Z","2026-11-09T15:00:00.000Z");
    const revision=await store.upsertObservationRows({rows:actualRevision,retrievedAt:"2026-11-09T15:00:00.000Z"});
    assert.equal(revision.revised,1);
    assert.equal(revision.noop,1);
    const history=(await db.prepare(`SELECT observation_date,change_type,value FROM ${EMPLOYMENT_R4_SHADOW_TABLES.history} ORDER BY history_id`).all()).results;
    assert.equal(history.length,3);
    assert.deepEqual(history.map(x=>x.change_type),["INSERT","INSERT","UPDATE"]);
    assert.equal(history[2].value,4.4);
  }finally{sqlite.close()}
});

test("state and metro independent releases never rewrite unchanged counterpart PIT history",async()=>{
  const {sqlite,db}=memoryD1();
  try{
    const store=createEmploymentR6Store(db);
    const first=stateMetro([["2026","M10",50]],[["2026","M09",48]],
      "2026-11-20T15:00:00.000Z","2026-11-21T18:00:00.000Z");
    assert.equal((await store.upsertObservationRows({rows:first,retrievedAt:"2026-11-21T18:00:00.000Z"})).inserted,2);
    const after=stateMetro([["2026","M10",50]],[["2026","M10",49],["2026","M09",48]],
      "2026-12-02T15:00:00.000Z","2026-12-03T18:00:00.000Z");
    const result=await store.upsertObservationRows({rows:after,retrievedAt:"2026-12-03T18:00:00.000Z"});
    assert.deepEqual([result.inserted,result.revised,result.noop],[1,0,2]);
    const history=(await db.prepare(`SELECT change_type FROM ${EMPLOYMENT_R4_SHADOW_TABLES.history}`).all()).results;
    assert.equal(history.length,3);
  }finally{sqlite.close()}
});
