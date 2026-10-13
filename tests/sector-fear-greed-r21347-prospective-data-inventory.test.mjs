import test from "node:test";
import assert from "node:assert/strict";
import {R21347_EXPECTED_LOCK_STATUS,R21347_FEATURE,R21347_REFERENCE_OBSERVATIONS,extractDateR21347,uniqueDatesR21347,intersectDatesR21347,classifyReadinessR21347} from "../scripts/pc-writer/sector-fear-greed-r21347-prospective-data-inventory.mjs";

test("R2.13.47 preserves frozen lock constants",()=>{assert.equal(R21347_EXPECTED_LOCK_STATUS,"SHADOW_R21346_PROSPECTIVE_LOCK_READY");assert.equal(R21347_FEATURE,"internalCorrelationShock");assert.equal(R21347_REFERENCE_OBSERVATIONS,756);});
test("R2.13.47 extracts supported stored date fields",()=>{assert.equal(extractDateR21347({date:"2026-10-13T00:00:00Z"}),"2026-10-13");assert.equal(extractDateR21347({tradeDate:"2026-10-14"}),"2026-10-14");assert.equal(extractDateR21347({trade_date:"bad"}),null);});
test("R2.13.47 unique dates sort and deduplicate",()=>{assert.deepEqual(uniqueDatesR21347([{date:"2026-10-14"},{date:"2026-10-13"},{tradeDate:"2026-10-14"}]),["2026-10-13","2026-10-14"]);});
test("R2.13.47 intersects common ETF sessions",()=>{assert.deepEqual(intersectDatesR21347([["2026-10-12","2026-10-13"],["2026-10-13","2026-10-14"],["2026-10-13"]]),["2026-10-13"]);});
test("R2.13.47 readiness separates missing stock, ETF, and present data",()=>{assert.equal(classifyReadinessR21347({stockPostLockDates:[],commonEtfPostLockDates:["2026-10-13"]}),"WAIT_FOR_POST_LOCK_STOCK_DATA");assert.equal(classifyReadinessR21347({stockPostLockDates:["2026-10-13"],commonEtfPostLockDates:[]}),"WAIT_FOR_POST_LOCK_ETF_DATA");assert.equal(classifyReadinessR21347({stockPostLockDates:["2026-10-13"],commonEtfPostLockDates:["2026-10-13"]}),"RAW_POST_LOCK_DATA_PRESENT_REQUIRES_FROZEN_SIGNAL_RECOMPUTE");});
