import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

import { createBreadthR2D1StoreR2 } from "../lib/market-score/breadth-r2-d1-store-r2.mjs";

function sqliteD1() {
  const sqlite = new DatabaseSync(":memory:");
  const db = {
    prepare(sql) {
      const prepared = sqlite.prepare(sql);
      function wrapper(values = []) {
        return {
          bind(...next) { return wrapper(next); },
          async run() { return prepared.run(...values); },
          async first() { return prepared.get(...values); },
          async all() { return { results: prepared.all(...values) }; },
        };
      }
      return wrapper([]);
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return { sqlite, db };
}

const row = (value, provenance = { source: "X" }) => ({
  provider: "BEA",
  observationKey: "2026Q2",
  observationDate: "2026-06-30",
  entityType: "aggregate",
  entityId: "ALL",
  metric: "M",
  value,
  unit: "USD",
  provenance,
});

test("CURRENT/HISTORY protects valid values and deduplicates unchanged rows", async () => {
  const { sqlite, db } = sqliteD1();
  const store = createBreadthR2D1StoreR2(db, { now: () => new Date("2026-09-24T00:00:00Z") });
  const a = await store.upsertCurrentRows({ asOfDate: "2026-09-24", rows: [row(0)], retrievedAt: "2026-09-24T00:00:00Z" });
  assert.deepEqual([a.inserted, a.updated, a.noop, a.historyRowsAdded], [1,0,0,1]);
  const b = await store.upsertCurrentRows({ asOfDate: "2026-09-24", rows: [row(0)], retrievedAt: "2026-09-24T01:00:00Z" });
  assert.deepEqual([b.inserted, b.updated, b.noop, b.historyRowsAdded], [0,0,1,0]);
  const c = await store.upsertCurrentRows({ asOfDate: "2026-09-24", rows: [{ ...row(999), value: null }], retrievedAt: "2026-09-24T02:00:00Z" });
  assert.equal(c.validSeen, 0);
  const afterNull = await store.getObservationRows("BEA", "2026Q2");
  assert.equal(afterNull[0].value, 0);
  const d = await store.upsertCurrentRows({ asOfDate: "2026-09-24", rows: [row(5)], retrievedAt: "2026-09-24T03:00:00Z" });
  assert.deepEqual([d.inserted, d.updated, d.noop, d.historyRowsAdded], [0,1,0,1]);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM market_score_breadth_r2_history_v1").get().n, 2);
  sqlite.close();
});

test("omitted entities and other observation dates are never deleted or used as overwrite keys", async () => {
  const { sqlite, db } = sqliteD1();
  const store = createBreadthR2D1StoreR2(db);
  await store.upsertCurrentRows({
    asOfDate: "2026-09-24",
    retrievedAt: "2026-09-24T00:00:00Z",
    rows: [
      { provider:"CFTC",observationKey:"2026-09-15",observationDate:"2026-09-15",entityType:"contract",entityId:"A",metric:"open_interest_all",value:100,unit:"contracts",provenance:{} },
      { provider:"CFTC",observationKey:"2026-09-15",observationDate:"2026-09-15",entityType:"contract",entityId:"B",metric:"open_interest_all",value:200,unit:"contracts",provenance:{} },
    ],
  });
  await store.upsertCurrentRows({
    asOfDate: "2026-09-24",
    retrievedAt: "2026-09-24T01:00:00Z",
    rows: [
      { provider:"CFTC",observationKey:"2026-09-22",observationDate:"2026-09-22",entityType:"contract",entityId:"A",metric:"open_interest_all",value:110,unit:"contracts",provenance:{} },
    ],
  });
  assert.equal((await store.getObservationRows("CFTC","2026-09-15")).length, 2);
  assert.equal((await store.getObservationRows("CFTC","2026-09-22")).length, 1);
  sqlite.close();
});

test("UNIVERSE preserves prior periods while updating same-period membership", async () => {
  const { sqlite, db } = sqliteD1();
  const store = createBreadthR2D1StoreR2(db);
  await store.putUniverse({ universeKey:"SEC:WAVG",observationKey:"CY2026Q1",observationDate:"2026-03-31",members:["1","2"],retrievedAt:"2026-09-24T00:00:00Z" });
  await store.putUniverse({ universeKey:"SEC:WAVG",observationKey:"CY2026Q2",observationDate:"2026-06-30",members:["2","3"],retrievedAt:"2026-09-24T00:00:00Z" });
  await store.putUniverse({ universeKey:"SEC:WAVG",observationKey:"CY2026Q2",observationDate:"2026-06-30",members:["2","3","4"],retrievedAt:"2026-09-24T01:00:00Z" });
  assert.deepEqual((await store.getUniverse("SEC:WAVG","CY2026Q1")).members,["1","2"]);
  assert.deepEqual((await store.getUniverse("SEC:WAVG","CY2026Q2")).members,["2","3","4"]);
  sqlite.close();
});
