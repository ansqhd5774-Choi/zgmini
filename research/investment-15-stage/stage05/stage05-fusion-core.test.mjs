import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFusionStage05,SCHEMA_VERSION} from './stage05-fusion-core.mjs';

const period = {periodStart:'2025-10-27',periodEnd:'2026-10-27'};
const evidence = (kind,score) => ({kind,score,validation:'VERIFIED',etf:'ETF_A',
  source:'https://example.org/verified-prices',normalizationRuleId:'APPROVED_V1',
  priceSeriesId:'ETF_A_PRICES',...period});
const growth = (id,G1,G2,F) => {
  const G = 0.6*G1+0.4*G2;
  const D = Math.max(0,G-F);
  return {id,status:'QUANTIFIED',evidenceKind:'REALIZED_INDUSTRY_ACTIVITY',
    sourceValidation:'VERIFIED',freshnessStatus:'CURRENT',
    formulaId:'STAGE04_R2_PROPOSED',sourceUrls:['https://example.org/verified-realized'],
    validatedDate:'2026-10-27',observationPeriodEnd:'2026-09-30',
    G1,G2,F,G,D,M4:0.7*G+0.3*D};
};
function fixture() {
  return {schemaVersion:SCHEMA_VERSION,snapshotDate:'2026-10-28',
    stage01:{status:'READY',date:'2026-10-27',risk:'CAUTION'},
    stage02:{status:'READY',sectors:[{id:'s1',relativeStrength:evidence('ETF_PRICE_RELATIVE_STRENGTH',70)},
      {id:'s2',relativeStrength:evidence('ETF_PRICE_RELATIVE_STRENGTH',90)}]},
    stage03:{status:'READY',themes:[
      {id:'a',sectorId:'s1',approved:true,trend:evidence('ETF_PRICE_TREND',90)},
      {id:'b',sectorId:'s2',approved:true,trend:evidence('ETF_PRICE_TREND',90)},
      {id:'c',sectorId:'s1',approved:false,trend:evidence('ETF_PRICE_TREND',50)}]},
    stage04:{status:'READY',themes:[growth('a',80,80,80),growth('b',30,30,30)]}};
}
test('80:20 economic+trader fusion with separate market risk and 70/90 sensitivity', () => {
  const result = calculateFusionStage05(fixture());
  assert.equal(result.summary.approvedCandidateCount,2);
  assert.equal(result.summary.rankableCount,2);
  assert.equal(result.summary.selectedThemeId,'a');
  assert.equal(result.stage01.risk,'CAUTION');
  const a=result.rows.find(r=>r.themeId==='a');
  assert.deepEqual({E:a.E,T:a.T,S5:a.S5}, {E:56,T:80,S5:60.8});
  assert.equal(a.sensitivity['70'],63.2);
  assert.equal(a.sensitivity['90'],58.4);
  assert.equal(result.rows.some(r=>r.themeId==='c'),false);
});
test('source is forecast CAGR, not realized G; return null without substituting R77 11.285', () => {
  const input=fixture();
  input.stage04.themes[0].evidenceKind='FORECAST_CAGR';
  input.stage04.themes[0].M4=11.285;
  const a=calculateFusionStage05(input).rows[0];
  assert.equal(a.E,null); assert.equal(a.S5,null);
  assert.ok(a.blockReasons.includes('STAGE04_REALIZED_SOURCE_GATE_MISSING'));
});
test('fear-and-greed 252-score histories never become ETF price strength or trend', () => {
  const input=fixture();
  input.stage02.sectors[0].relativeStrength.kind='SECTOR_FEAR_GREED_SCORE';
  input.stage03.themes[0].trend.kind='THEME_FEAR_GREED_SCORE';
  const a=calculateFusionStage05(input).rows[0];
  assert.equal(a.T,null);assert.equal(a.S5,null);
  assert.ok(a.blockReasons.includes('ETF_PRICE_EVIDENCE_NOT_VERIFIED'));
});
test('missing stage02 evidence does not become zero, 50 or stale value', () => {
  const input=fixture();
  delete input.stage02.sectors[0].relativeStrength;
  const a=calculateFusionStage05(input).rows[0];
  assert.equal(a.E,56);assert.equal(a.T,null);assert.equal(a.S5,null);
  assert.deepEqual(a.sensitivity,{'70':null,'80':null,'90':null});
});
test('Stage04 G/D/M inconsistency blocks score', () => {
  const input=fixture();input.stage04.themes[0].D+=1;
  assert.equal(calculateFusionStage05(input).rows[0].blockReasons[0],'STAGE04_FORMULA_MISMATCH');
});
test('Stage04 post-snapshot validation or period end is lookahead and must block', () => {
  const input=fixture();input.stage04.themes[0].validatedDate='2026-10-29';
  assert.equal(calculateFusionStage05(input).rows[0].E,null);
  assert.ok(calculateFusionStage05(input).rows[0].blockReasons.includes('STAGE04_CHRONOLOGY_UNVERIFIED'));
  input.stage04.themes[0].validatedDate='2026-10-27';
  input.stage04.themes[0].observationPeriodEnd='2026-10-29';
  assert.equal(calculateFusionStage05(input).rows[0].S5,null);
});
test('period mismatch, future dates, and stale stage01 block promotion', () => {
  const input=fixture();input.stage03.themes[0].trend.periodStart='2025-11-01';
  assert.equal(calculateFusionStage05(input).rows[0].S5,null);
  assert.ok(calculateFusionStage05(input).rows[0].blockReasons.includes('ETF_RS_TREND_PERIOD_MISMATCH'));
  input.stage03.themes[0].trend.periodStart=period.periodStart;
  input.stage01.date='2026-10-15';
  assert.equal(calculateFusionStage05(input).rows[0].S5,null);
  assert.equal(calculateFusionStage05(input).stage01.status,'UNAVAILABLE');
});
test('unknown stage01 and high risk never silently add or subtract theme scores', () => {
  const input=fixture();input.stage01.risk='HIGH_RISK';
  const result=calculateFusionStage05(input);
  assert.equal(result.rows[0].S5,60.8);
  assert.equal(result.stage01.risk,'HIGH_RISK');
  input.stage01.status='UNAVAILABLE';
  assert.equal(calculateFusionStage05(input).rows[0].S5,null);
});
test('duplicate candidate IDs are rejected, no duplicate ranking', () => {
  const input=fixture();input.stage03.themes.push({...input.stage03.themes[0]});
  assert.throws(()=>calculateFusionStage05(input),/STAGE03_THEME_DUPLICATE_ID_a/);
});
test('no approved candidates remains empty without fabricated pick', () => {
  const input=fixture();input.stage03.themes.forEach(row=>row.approved=false);
  const result=calculateFusionStage05(input);
  assert.equal(result.summary.selectedThemeId,null);
  assert.equal(result.summary.approvedCandidateCount,0);
});
test('wrong schema, missing normalized rule and unverified source all block', () => {
  const input=fixture();input.schemaVersion='v0';
  assert.throws(()=>calculateFusionStage05(input),/INPUT_SCHEMA_VERSION_MISMATCH/);
  input.schemaVersion=SCHEMA_VERSION;
  delete input.stage02.sectors[0].relativeStrength.normalizationRuleId;
  assert.equal(calculateFusionStage05(input).rows[0].S5,null);
  input.stage02.sectors[0].relativeStrength.normalizationRuleId='APPROVED_V1';
  input.stage04.themes[0].sourceValidation='UNVERIFIED';
  assert.equal(calculateFusionStage05(input).rows[0].E,null);
});
