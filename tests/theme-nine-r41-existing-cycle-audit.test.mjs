import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectNineR41Source} from '../scripts/pc-writer/theme-nine-r41-existing-cycle-audit.mjs';
const roster=JSON.parse(readFileSync(new URL('../config/theme-nine-r20-approved-candidates.json',import.meta.url)));

test('R41 counts saved files and marks static text as insufficient collection proof',()=>{
 const result=inspectNineR41Source({roster,files:[
  'etf_daily_2026-10-23.parquet','etf_daily_2026-10-26.parquet',
  'stock_daily_2026-10-26.parquet','etf_daily_latest.parquet'],sourceTexts:{
   'r181-primary-cycle.mjs':'const etfs=["BOTZ","ROBO","SPY"];'
  }});
 assert.equal(result.etfDailyFileCount,2);
 assert.equal(result.latestEtfDailyDate,'2026-10-26');
 assert.equal(result.sourceAudit['r181-primary-cycle.mjs'].staticTickerMentions,2);
 assert.equal(result.sourceAudit['r179-publish-core.mjs'].present,false);
 assert.equal(result.providerCalls,0);
 assert.equal(result.schedulerWrites,0);
});
test('R41 fails closed on incomplete roster',()=>{
 assert.throws(()=>inspectNineR41Source({roster:{}}),/R41_ROSTER/);
});
