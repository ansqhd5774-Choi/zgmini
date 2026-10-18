import test from 'node:test';
import assert from 'node:assert/strict';
import {auditThemeR54R53ResearchEvidence,THEME_R54_SOURCE_SHA} from '../lib/market-score/theme-r54-r53-research-gate.mjs';
import {THEME_R50_PHASE1_RESEARCH} from '../lib/market-score/theme-r50-phase1-research.mjs';

// Entirely synthetic; no vendor market prices or R21 actual scores.
function fixture(){
  const pairs=THEME_R50_PHASE1_RESEARCH,ticks={};
  for(const item of pairs)for(const etf of item.etfs)ticks[etf]=40;
  ticks.ARKF=20;ticks.GNOM=40;ticks.BOTZ=40;
  for(const item of pairs){
    const [a,b]=item.etfs;
    if(a==='BLOK')ticks.BLOK=86.96;
    else if(b==='ARKF')ticks[a]=20+item.maxPriceAxisGap;
    else if(b==='BOTZ'||b==='GNOM')ticks[a]=40+item.maxPriceAxisGap;
    else ticks[b]=ticks[a]+item.maxPriceAxisGap;
  }
  ticks.FINX=44.88;ticks.BLOK=86.96;ticks.IBB=53.12;ticks.DRIV=52.02;
  const funds=Object.fromEntries(Object.entries(ticks).map(([etf,trend])=>[etf,{
    matches:1,review:'UNIQUE_R21_TICKER_OBJECT',
    items:[{metrics:{history252Ready:true,eligiblePriceBars:etf==='SHLD'?773:1202,reference756Verified:false,breadthScored:false,demandScored:false,researchAxisScores:{trend,relativeStrength:50,volatility:50}}}],
  }]));
  return {
    audit:'R53_R21_12_THEME_EXISTING_RESEARCH_EVIDENCE',
    source:{verified:true,sha256:THEME_R54_SOURCE_SHA,observationTarget:'2026-10-16'},
    topLevel:{metrics:{status:'THREE_APPROVED_R3_PRICE_AXES_RESEARCH_ONLY',fundsWith252ActuallyScoredResearchAxes:30,stockBreadthActualScores:0,stockDemandActualScores:0,reference756StillRequiresUpstreamProof:true}},
    policy:{newMarketDataFetched:false,newCalculation:false,pricePublicationAuthorized:false,fiveAxisCompositeComputed:false,dbOrDeploymentModified:false},
    verdict:'READ_ONLY_SHADOW_EVIDENCE_ONLY',funds,
    themes:pairs.map(({theme,etfs})=>({theme,etfs:[...etfs],r21PriceHistoryClaim:'RESEARCH_252_CLAIM_BOTH',fiveAxisStatus:'NOT_VERIFIED',rights:'NOT_VERIFIED'})),
  };
}
test('twelve-theme schema stays research-only',()=>{
 const r=auditThemeR54R53ResearchEvidence(fixture());
 assert.equal(r.candidateThemes,12);assert.equal(r.uniqueEtfs,21);
 assert.equal(r.researchPriceHistoryReady,12);
 assert.equal(r.publicThemeScores,0);assert.equal(r.verifiedFiveAxisThemeScores,0);
 assert.equal(r.status,'RESEARCH_ONLY_NO_PUBLICATION');
 assert.equal(r.themes[0].maxPriceAxisGap,4.21);
 assert.equal(r.themes.at(-1).maxPriceAxisGap,66.96);
 assert.equal(r.themes.find(x=>x.theme==='방산').eligibleBars[1],773);
});
test('source SHA and observation date must be unchanged',()=>{
 const a=fixture();a.source.sha256='changed';assert.throws(()=>auditThemeR54R53ResearchEvidence(a),/SOURCE_HASH/);
 const b=fixture();b.source.observationTarget='2026-10-19';assert.throws(()=>auditThemeR54R53ResearchEvidence(b),/SOURCE_DATE/);
});
test('R22 divergence drift is never silently accepted',()=>{
 const a=fixture();a.funds.BUG.items[0].metrics.researchAxisScores.trend=90;
 assert.throws(()=>auditThemeR54R53ResearchEvidence(a),/PRICE_GAP_DRIFT/);
});
test('missing 252-day research history is not zero-filled',()=>{
 const a=fixture();a.funds.CIBR.items[0].metrics.history252Ready=false;
 assert.throws(()=>auditThemeR54R53ResearchEvidence(a),/HISTORY_NOT_READY/);
});
test('publication and fabricated demand signals are rejected',()=>{
 const a=fixture();a.policy.pricePublicationAuthorized=true;
 assert.throws(()=>auditThemeR54R53ResearchEvidence(a),/PUBLISH_POLICY/);
 const b=fixture();b.funds.CIBR.items[0].metrics.demandScored=true;
 assert.throws(()=>auditThemeR54R53ResearchEvidence(b),/FIVE_AXIS_NOT_RESEARCH_ONLY/);
});
test('ETF pairs must retain R50 research inventory identity',()=>{
 const a=fixture();a.themes[0].etfs=['BUG','CIBR'];
 assert.throws(()=>auditThemeR54R53ResearchEvidence(a),/THEME_PAIR_DRIFT/);
});
