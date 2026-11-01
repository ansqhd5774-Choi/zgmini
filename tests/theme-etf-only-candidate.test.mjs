import test from 'node:test';
import assert from 'node:assert/strict';
import {makeThemeEtfOnlyResearchCandidate} from '../scripts/pc-writer/theme-etf-only-r149-stage.mjs';
import {THEME_ETF_ONLY_PAIRS,validateThemeEtfOnlyPublic} from '../worker/theme-etf-only-public.mjs';
function r145(){
 const dates=Array.from({length:252},(_,i)=>new Date(Date.parse('2026-10-16T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
 return {status:'PRIVATE_252_RESEARCH_READY_NO_PUBLICATION',etf252Ready:13,themes252Ready:7,
  weights:{trend:.4,relativeStrength:.2,volatility:.4},pairWeight:.5,scoreMethod:'ETF_ONLY_PROXY',
  individualStocksUsed:0,upstreamThirdPartyCommercialRightsVerified:false,adjustedCloseVerified:false,
  derivedProviderLicenseExists:true,observationDate:'2026-10-16',
  themes:THEME_ETF_ONLY_PAIRS.map(p=>({...p,status:'RESEARCH_252_READY_NOT_PUBLIC',validPoints:252,latestScore:44,days:dates.map(date=>({date,score:44,prior:47}))}))};
}
const source={sourceVersion:'R145-PC-RESULT',sourceStoredAt:'2026-10-20T00:00:00Z'};
test('R145 research gives seven 252-point private candidate histories only',()=>{
 const c=makeThemeEtfOnlyResearchCandidate(r145(),source);
 assert.equal(c.themes.length,7);
 assert.equal(c.themes[0].history.length,252);
 assert.equal(c.publicationAuthorized,false);
 assert.equal(c.upstreamCommercialRightsVerified,false);
 assert.equal(validateThemeEtfOnlyPublic(c),false);
 assert.equal('prior' in c.themes[0].history[0],false);
});
test('candidate rejects drift, missing history and unproven source timestamps',()=>{
 const a=r145();a.themes[0].days.pop();
 assert.throws(()=>makeThemeEtfOnlyResearchCandidate(a,source),/MISSING_252/);
 const b=r145();b.themes[0].etfs=['SPY','ROBO'];
 assert.throws(()=>makeThemeEtfOnlyResearchCandidate(b,source),/PAIR_DRIFT/);
 assert.throws(()=>makeThemeEtfOnlyResearchCandidate(r145(),{}),/SOURCE_PROVENANCE_REQUIRED/);
});
