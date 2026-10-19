import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateThemeR72Etf,evaluateThemeR72Batch} from '../lib/market-score/theme-r72-approved-five-axis.mjs';
const keys=['trend','breadth','demand','relativeStrength','volatility'];
const date='2026-10-16';
const inp=(scores={trend:40,breadth:60,demand:50,relativeStrength:30,volatility:80})=>({observationDate:date,axes:scores,
 axisProvenance:Object.fromEntries(keys.map(k=>[k,{storedVerified:true,observedDate:date}])),
 priceHistory252Verified:true,reference756Verified:true,dailyMemberPITVerified:true,memberPriceVolumeAligned:true,volumeRevisionResolved:true});
test('approved exact R3 weighted score reused for per-ETF research only',()=>{const x=evaluateThemeR72Etf('CIBR',inp());assert.equal(x.verifiedFiveAxisResearchScore,(4*40+4*60+3*50+3*30+3*80)/17);assert.equal(x.publicScore,null);assert.equal(x.publicationAuthorized,false);});
test('CIBR cannot compute research five axes on missing breadth',()=>{const a=inp();a.axes.breadth=null;const x=evaluateThemeR72Etf('CIBR',a);assert.equal(x.verifiedFiveAxisResearchScore,null);assert.ok(x.missingRequirements.includes('MISSING_AXIS_breadth'));});
test('CIBR actual R57 PIT missing blocks score even if axes provided',()=>{const a=inp();a.dailyMemberPITVerified=false;const x=evaluateThemeR72Etf('CIBR',a);assert.equal(x.verifiedFiveAxisResearchScore,null);assert.ok(x.missingRequirements.includes('HISTORICAL_MEMBER_PIT_NOT_VERIFIED'));});
test('unresolved volume revision blocks score',()=>{const a=inp();a.volumeRevisionResolved=false;assert.equal(evaluateThemeR72Etf('CIBR',a).verifiedFiveAxisResearchScore,null);});
test('unverified reference 756 blocks score',()=>{const a=inp();a.reference756Verified=false;assert.equal(evaluateThemeR72Etf('CIBR',a).verifiedFiveAxisResearchScore,null);});
test('source date must match observation date',()=>{const a=inp();a.axisProvenance.demand.observedDate='2026-10-15';assert.equal(evaluateThemeR72Etf('CIBR',a).verifiedFiveAxisResearchScore,null);});
test('malformed scores rejected, not normalized',()=>{const a=inp();a.axes.trend=101;assert.throws(()=>evaluateThemeR72Etf('CIBR',a),/AXIS_INVALID_trend/);});
test('ETF registry check blocks extra unapproved ticker',()=>{assert.throws(()=>evaluateThemeR72Etf('QQQQ',inp()),/ETF_NOT_IN_APPROVED_RESEARCH_REGISTRY/);});
test('12 themes and 21 ETF batch stays null with only research 3 axes',()=>{const x=evaluateThemeR72Batch({observationDate:date,etfInputs:{CIBR:{...inp(),axes:{trend:50,relativeStrength:55,volatility:45},dailyMemberPITVerified:false}}});assert.equal(x.etfCount,21);assert.equal(x.themeCount,12);assert.equal(x.finalizedThemeScores,0);assert.equal(x.etfResearchFiveAxisReady,0);assert.equal(x.themes.find(t=>t.theme==='사이버보안').combinedThemeScore,null);});
test('two verified ETF scores never silently aggregate to one theme',()=>{const x=evaluateThemeR72Batch({observationDate:date,etfInputs:{CIBR:inp(),BUG:inp()}});const c=x.themes.find(t=>t.theme==='사이버보안');assert.equal(c.allEtfsFiveAxesVerified,true);assert.equal(c.combinedThemeScore,null);assert.equal(c.blocker,'ETF_COMBINATION_RULE_NOT_CONFIRMED');});
test('invalid batch date rejected',()=>{assert.throws(()=>evaluateThemeR72Batch({observationDate:'2026-02-30'}),/BATCH_INPUT_INVALID/);});
test('mismatched ETF date rejected',()=>{const a=inp();a.observationDate='2026-10-15';assert.throws(()=>evaluateThemeR72Batch({observationDate:date,etfInputs:{CIBR:a}}),/ETF_DATE_DRIFT/);});
