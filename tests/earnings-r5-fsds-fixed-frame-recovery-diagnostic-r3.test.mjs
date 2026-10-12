import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {loadFsdsFactsR3} from "../scripts/pc-writer/earnings-r5-fsds-fixed-frame-recovery-diagnostic-r3.mjs";

test("R3 FSDS loader normalizes YYYYMMDD filed dates before as-of filtering",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-fsds-r3-"));
  const sub=path.join(dir,"sub.txt"),num=path.join(dir,"num.txt");
  fs.writeFileSync(sub,[
    "adsh\tcik\tname\tsic\tcountryba\tstprba\tcityba\tzipba\tbas1\tbas2\tbaph\tcountryma\tstprma\tcityma\tzipma\tmas1\tmas2\tcountryinc\tstprinc\tein\tformer\tchanged\tafs\twksi\tfye\tform\tperiod\tfy\tfp\tfiled\taccepted\tprevrpt\tdetail\tinstance\tnciks\taciks",
    "0000000001-26-000001\t1\tTEST\t3571\tUS\t\tX\t\t\t\t\tUS\t\tX\t\t\t\tUS\t\t\t\t\t\t\t1231\t10-Q\t20260630\t2026\tQ2\t20260815\t\t0\t1\tx.xml\t1\t",
    "0000000001-26-000002\t1\tFUTURE\t3571\tUS\t\tX\t\t\t\t\tUS\t\tX\t\t\t\tUS\t\t\t\t\t\t\t1231\t10-Q\t20260930\t2026\tQ3\t20261020\t\t0\t1\ty.xml\t1\t",
  ].join("\n")+"\n");
  fs.writeFileSync(num,[
    "adsh\ttag\tversion\tddate\tqtrs\tuom\tsegments\tcoreg\tvalue\tfootnote",
    "0000000001-26-000001\tRevenueFromContractWithCustomerExcludingAssessedTax\tus-gaap/2026\t20260630\t1\tUSD\t\t\t100\t",
    "0000000001-26-000001\tOperatingIncomeLoss\tus-gaap/2026\t20260630\t1\tUSD\t\t\t10\t",
    "0000000001-26-000001\tUnmappedCustomThing\tus-gaap/2026\t20260630\t1\tUSD\t\t\t5\t",
    "0000000001-26-000002\tRevenueFromContractWithCustomerExcludingAssessedTax\tus-gaap/2026\t20260930\t1\tUSD\t\t\t200\t",
  ].join("\n")+"\n");
  const result=await loadFsdsFactsR3({subFile:sub,numFile:num,universeCiks:new Set(["0000000001"]),asOf:"2026-10-12"});
  assert.equal(result.status,"PASS");
  assert.equal(result.submissionCount,1);
  assert.equal(result.counters.futureFiledRows,1);
  assert.equal(result.counters.joinedSubmissionRows,3);
  assert.equal(result.counters.acceptedByContract,2);
  assert.equal(result.acceptedFacts,2);
  assert.equal(result.acceptedByMetric.revenue,1);
  assert.equal(result.acceptedByMetric.operatingIncome,1);
  assert.equal(result.rejected.UNMAPPED_TAG,1);
  const rows=result.factsByCik.get("0000000001");
  assert.equal(rows.length,2);
  assert.equal(rows[0].filed,"2026-08-15");
  assert.equal(rows[0].ddate,"2026-06-30");
  fs.rmSync(dir,{recursive:true,force:true});
});
