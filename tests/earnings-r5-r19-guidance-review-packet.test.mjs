import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {buildR19GuidanceReviewPacket} from "../scripts/pc-writer/earnings-r5-r19-guidance-review-packet.mjs";

const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+"\n","utf8");}

test("R19 builds a local-only semantic review packet from R18 samples and verifies hashes",()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r19-"));
  const reports=path.join(base,"manual-input","e1-r5","reports");
  const docs=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents");
  const rel="0000000001/000000000126000001/ex99-1.htm";const file=path.join(docs,...rel.split("/"));fs.mkdirSync(path.dirname(file),{recursive:true});
  const body=Buffer.from("<html><body><p>Management raised its full-year guidance for revenue and earnings.</p></body></html>","utf8");fs.writeFileSync(file,body);
  writeJson(path.join(reports,"e1-r5-r18-guidance-review-manifest.json"),{version:"E1-R5-R18-GUIDANCE-AUDIT-R1",rawTextIncluded:false,buckets:{UP:[{cik:"0000000001",accessionNumber:"0000000001-26-000001",filed:"2026-10-01",direction:"UP",sourceRole:"EXHIBIT",documentRelativePath:rel,sourceSha256:sha256(body)}]}});
  const result=buildR19GuidanceReviewPacket({base,maxSamples:10});
  assert.equal(result.status,"COMPLETE");assert.equal(result.rows.length,1);assert.equal(result.hashVerified,1);assert.equal(result.errors,0);
  const packet=fs.readFileSync(result.packetFile,"utf8");const report=fs.readFileSync(result.reportFile,"utf8");
  assert.match(packet,/LOCAL_EXCERPTS_INCLUDED: YES/);assert.match(packet,/raised its full-year guidance/);assert.match(packet,/HASH_VERIFIED: YES/);
  assert.match(report,/SEMANTIC_VALIDATION: REVIEW_REQUIRED/);assert.match(report,/NETWORK_CALLS: 0/);assert.match(report,/DB_WRITES: 0/);assert.match(report,/PRODUCTION_ACTIVATION: NO/);assert.match(report,/RAW_TEXT_PUBLICATION: NO/);
});

test("R19 fails closed on a sampled document hash mismatch",()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r19-bad-"));
  const reports=path.join(base,"manual-input","e1-r5","reports");const docs=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents");
  const rel="0000000002/000000000226000002/main.htm";const file=path.join(docs,...rel.split("/"));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,"<html>unchanged</html>","utf8");
  writeJson(path.join(reports,"e1-r5-r18-guidance-review-manifest.json"),{buckets:{UNCLASSIFIED_NO_ANCHOR:[{cik:"0000000002",accessionNumber:"0000000002-26-000002",filed:"2026-10-01",direction:"UNCLASSIFIED",sourceRole:"PRIMARY",documentRelativePath:rel,sourceSha256:"0".repeat(64)}]}});
  const result=buildR19GuidanceReviewPacket({base,maxSamples:10});
  assert.equal(result.status,"FAILED");assert.equal(result.hashVerified,0);assert.equal(result.errors,1);
  assert.match(fs.readFileSync(result.packetFile,"utf8"),/R19_SAMPLE_HASH_MISMATCH/);
});
