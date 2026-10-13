import test from "node:test";
import assert from "node:assert/strict";
import {R21349_ETFS,R21349_REFERENCE_OBSERVATIONS,classifyR21349} from "../scripts/pc-writer/sector-fear-greed-r21349-etf-collection-path-audit.mjs";

test("R2.13.49 preserves frozen ETF mapping and reference",()=>{assert.equal(Object.keys(R21349_ETFS).length,11);assert.equal(R21349_REFERENCE_OBSERVATIONS,756);assert.equal(R21349_ETFS.technology,"XLK");assert.equal(R21349_ETFS.materials,"XLB");});
test("R2.13.49 identifies complete active ETF universe",()=>{assert.equal(classifyR21349({groupEtfCount:11,legacyEtfs:11,activeEtfRows:10}),"ACTIVE_GROUP_UNIVERSE_CONTAINS_ALL_ETFS");});
test("R2.13.49 identifies partial active ETF universe",()=>{assert.equal(classifyR21349({groupEtfCount:3,legacyEtfs:11,activeEtfRows:0}),"ACTIVE_GROUP_UNIVERSE_PARTIAL_ETFS");});
test("R2.13.49 identifies legacy-only ETF path",()=>{assert.equal(classifyR21349({groupEtfCount:0,legacyEtfs:11,activeEtfRows:0}),"LEGACY_ETF_BACKFILL_ONLY_NOT_IN_ACTIVE_GROUP_UNIVERSE");});
test("R2.13.49 does not invent a collection path",()=>{assert.equal(classifyR21349({groupEtfCount:0,legacyEtfs:0,activeEtfRows:0}),"NO_APPROVED_LOCAL_ETF_COLLECTION_PATH_EVIDENCE");});
