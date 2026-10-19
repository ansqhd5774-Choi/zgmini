import test from 'node:test';
import assert from 'node:assert/strict';
import {R63_GLOBALX_NCSRS,R63_GLOBALX_THEME_SERIES,auditR63GlobalXRegistration} from '../lib/market-score/theme-r63-globalx-series-reuse.mjs';
test('eight known Global X ETF identities are unique',()=>{const r=auditR63GlobalXRegistration();assert.equal(r.count,8);assert.equal(new Set(Object.values(R63_GLOBALX_THEME_SERIES).map(x=>x.classId)).size,8);});
test('filing visibility respects publication date',()=>{assert.equal(auditR63GlobalXRegistration({asOf:'2026-08-05'}).filingPublicByDate,false);assert.equal(auditR63GlobalXRegistration({asOf:'2026-08-06'}).filingPublicByDate,true);});
test('registration is not holdings or market scores',()=>{const r=auditR63GlobalXRegistration();assert.equal(r.filingIsSingleMultiFundRegistrant,true);assert.equal(r.allEightHaveParsedHistoricalHoldings,false);assert.equal(r.dailyPITVerified,false);assert.equal(r.fiveAxisScoreReady,false);assert.equal(r.publicationReady,false);assert.equal(r.missingStockPriceSeriesResolved,0);});
test('global x identity links exact SEC filing',()=>{assert.equal(R63_GLOBALX_NCSRS.accession,'0000930413-26-002360');assert.equal(R63_GLOBALX_THEME_SERIES.BUG.series,'S000066713');});
