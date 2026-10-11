import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  inspectBeaFile,
  inspectBlsPrFile,
  inspectSecFiles,
  runEarningsR5OfflinePreflight,
} from "../scripts/pc-writer/earnings-r5-offline-preflight.mjs";

function fixture(){return fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-e1-r5-preflight-"));}

test("offline preflight scans SEC/BLS/BEA files without DB or network writes",async()=>{
  const dir=fixture();
  try{
    const sub=path.join(dir,"sub.txt"),num=path.join(dir,"num.txt"),bls=path.join(dir,"pr.data.0.Current"),bea=path.join(dir,"bea-corporate-profits.csv");
    fs.writeFileSync(sub,[
      "adsh\tcik\tform\tperiod\tfiled\tfy\tfp\tsic",
      "0001\t1001\t10-Q\t20260630\t20260801\t2026\tQ2\t3571",
    ].join("\n"));
    fs.writeFileSync(num,[
      "adsh\ttag\tversion\tddate\tqtrs\tuom\tvalue\tcoreg",
      "0001\tEarningsPerShareDiluted\tus-gaap/2026\t20260630\t1\tUSD-per-shares\t2.5\t",
      "0001\tRevenues\tus-gaap/2026\t20260630\t1\tUSD\t100\t",
    ].join("\n"));
    fs.writeFileSync(bls,[
      "series_id\tyear\tperiod\tvalue\tfootnote_codes",
      "PRS85006111\t2026\tQ01\t0.4\t",
      "PRS85006111\t2026\tQ02\t1.4\tR",
      "PRS85006111\t2026\tQ05\t1.0\t",
    ].join("\n"));
    fs.writeFileSync(bea,"SeriesCode,Value\nA051RC,4709.5\n");

    const sec=await inspectSecFiles({subFile:sub,numFile:num});
    const labor=await inspectBlsPrFile(bls);
    const profits=await inspectBeaFile(bea);
    assert.equal(sec.status,"PASS");
    assert.equal(sec.acceptedFacts.eps,1);
    assert.equal(sec.acceptedFacts.revenue,1);
    assert.equal(labor.status,"PASS");
    assert.equal(labor.latest.value,1.4);
    assert.equal(labor.annualAverageRowsSkipped,1);
    assert.equal(profits.status,"PASS");
    assert.match(sec.files.sub.sha256,/^[a-f0-9]{64}$/);

    const report=await runEarningsR5OfflinePreflight({incoming:dir,secSub:sub,secNum:num,blsPr:bls,bea});
    assert.equal(report.active,false);
    assert.equal(report.networkCalls,0);
    assert.equal(report.dbWrites,0);
    assert.equal(report.status,"PARTIAL");
    assert.equal(report.inputs.blsProducerInput.status,"MISSING");
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
