import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  E1_R5_FORWARD_SHADOW_SNAPSHOT_R1_VERSION,
  appendForwardShadowSnapshot,
  buildForwardShadowSnapshot,
  runForwardShadowSnapshotR1,
} from "../scripts/pc-writer/earnings-r5-forward-shadow-snapshot-r1.mjs";

const HASH="a".repeat(64);

function readiness(){
  return {
    version:"E1-R5-FORWARD-READINESS-R3",
    status:"RAW_READY_VALIDATION_PENDING",
    at:"2026-10-13T17:41:49.094Z",
    asOf:"2026-10-13T17:41:49.094Z",
    rawComponentsReady:true,
    productionReady:false,
    productionBaseline:"E1-R4",
    productionActivation:false,
    raw:{s12a:0.009032430983650381,s12b:0.375,s13:0.5555555555555556},
    sec:{currentIssuers:499,readyGuidanceIssuers:46,comparableIssuerCount:18,comparableOverallCoverage:18/499,comparableWithinGuidanceCoverage:18/46,directions:{up:13,same:2,down:3}},
    cfo:{surveyYear:2026,surveyQuarter:3,currentLevel:7.325,previousLevel:6.95,history:{readyPeriodCount:2,readyRevisionCount:1}},
    normalization:{status:"NOT_READY",reason:"HISTORICAL_PERCENTILE_PIT_SERIES_NOT_AVAILABLE"},
  };
}

test("shadow snapshot preserves raw state without normalizing or activating production",()=>{
  const snapshot=buildForwardShadowSnapshot({
    report:readiness(),
    sourceReportHash:HASH,
    sourceStoredAt:"2026-10-13T17:42:00.000Z",
    recordedAt:"2026-10-14T00:10:00.000Z",
  });
  assert.equal(snapshot.snapshotDate,"2026-10-14");
  assert.equal(snapshot.sourceVersion,"E1-R5-FORWARD-READINESS-R3");
  assert.equal(snapshot.sourceAsOf,"2026-10-13T17:41:49.094Z");
  assert.equal(snapshot.productionActivation,false);
  assert.equal(snapshot.state.raw.s12a,0.009032430983650381);
  assert.equal(snapshot.state.raw.s12b,0.375);
  assert.equal(snapshot.state.raw.s13,0.5555555555555556);
  assert.equal(snapshot.state.normalization.status,"NOT_READY");
  assert.match(snapshot.checkpoint,/^[a-f0-9]{64}$/);
});

test("same UTC day plus same raw/source state is deduplicated",()=>{
  const first=buildForwardShadowSnapshot({
    report:readiness(),sourceReportHash:HASH,sourceStoredAt:"2026-10-13T17:42:00Z",recordedAt:"2026-10-14T00:10:00Z",
  });
  const second=buildForwardShadowSnapshot({
    report:{...readiness(),at:"2026-10-13T18:41:49.094Z",asOf:"2026-10-13T18:41:49.094Z"},
    sourceReportHash:"b".repeat(64),sourceStoredAt:"2026-10-13T18:42:00Z",recordedAt:"2026-10-14T05:10:00Z",
  });
  assert.equal(first.checkpoint,second.checkpoint);
  const a=appendForwardShadowSnapshot({ledger:null,snapshot:first});
  const b=appendForwardShadowSnapshot({ledger:a.ledger,snapshot:second});
  assert.equal(a.status,"STORED");
  assert.equal(b.status,"NOOP");
  assert.equal(b.ledger.snapshots.length,1);
});

test("changed raw state on same day creates a new immutable snapshot",()=>{
  const first=buildForwardShadowSnapshot({
    report:readiness(),sourceReportHash:HASH,sourceStoredAt:"2026-10-13T17:42:00Z",recordedAt:"2026-10-14T00:10:00Z",
  });
  const changed=readiness();
  changed.raw={...changed.raw,s12a:0.02};
  const second=buildForwardShadowSnapshot({
    report:changed,sourceReportHash:"b".repeat(64),sourceStoredAt:"2026-10-13T18:42:00Z",recordedAt:"2026-10-14T05:10:00Z",
  });
  const a=appendForwardShadowSnapshot({ledger:null,snapshot:first});
  const b=appendForwardShadowSnapshot({ledger:a.ledger,snapshot:second});
  assert.equal(b.status,"STORED");
  assert.equal(b.ledger.snapshots.length,2);
});

test("runner writes append-only local shadow ledger and NOOPs exact daily state",()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r5-shadow-snapshot-r1-"));
  try{
    const reports=path.join(base,"manual-input","e1-r5","reports");
    fs.mkdirSync(reports,{recursive:true});
    const reportFile=path.join(reports,"e1-r5-forward-readiness-r3-last.json");
    fs.writeFileSync(reportFile,JSON.stringify(readiness(),null,2));
    const first=runForwardShadowSnapshotR1({base,recordedAt:"2026-10-14T00:10:00Z"});
    const second=runForwardShadowSnapshotR1({base,recordedAt:"2026-10-14T05:10:00Z"});
    assert.equal(first.status,"STORED");
    assert.equal(second.status,"NOOP");
    assert.equal(first.snapshotCount,1);
    assert.equal(second.snapshotCount,1);
    const ledger=JSON.parse(fs.readFileSync(first.ledgerFile,"utf8"));
    assert.equal(ledger.version,E1_R5_FORWARD_SHADOW_SNAPSHOT_R1_VERSION);
    assert.equal(ledger.snapshots.length,1);
    assert.equal(ledger.snapshots[0].productionActivation,false);
  }finally{
    fs.rmSync(base,{recursive:true,force:true});
  }
});

test("unready input fails closed",()=>{
  const bad=readiness();
  bad.rawComponentsReady=false;
  assert.throws(()=>buildForwardShadowSnapshot({
    report:bad,sourceReportHash:HASH,sourceStoredAt:"2026-10-13T17:42:00Z",recordedAt:"2026-10-14T00:10:00Z",
  }),/READINESS_RAW_NOT_READY/);
});

test("CMD wrapper remains local-only",()=>{
  const source=fs.readFileSync(new URL("../ZGMINI_EARNINGS_R5_FORWARD_SHADOW_SNAPSHOT_R1.cmd",import.meta.url),"utf8");
  assert.match(source,/earnings-r5-forward-shadow-snapshot-r1\.mjs/i);
  assert.doesNotMatch(source,/curl|wrangler|powershell|wsl|--publish/i);
});
