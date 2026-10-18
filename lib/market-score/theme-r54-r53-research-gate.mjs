import {THEME_R50_PHASE1_RESEARCH} from './theme-r50-phase1-research.mjs';

export const THEME_R54_VERSION='THEME-R54-R53-RESEARCH-EVIDENCE-GATE-V1';
export const THEME_R54_SOURCE_SHA='03612f0bc4a1b6ce2cd62f2706142c1aac8a08a1c84f610afdcc8bf6dca2b880';
export const THEME_R54_OBSERVATION_DATE='2026-10-16';
const KEYS=Object.freeze(['trend','relativeStrength','volatility']);
const round2=n=>Math.round((n+Number.EPSILON)*100)/100;
const finiteScore=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
function requireEvidence(ok,reason){if(!ok)throw Error('THEME_R54_EVIDENCE_'+reason);}

/**
 * Research-only gate for the R53 diagnostic summary, NOT a calculator or public feed.
 * It does not infer constituent PIT, historical reference completeness,
 * constituent breadth/demand, security continuity, or commercial licensing.
 * No persistent storage, network, provider, or D1 interactions.
 */
export function auditThemeR54R53ResearchEvidence(r53){
  requireEvidence(r53?.audit==='R53_R21_12_THEME_EXISTING_RESEARCH_EVIDENCE','WRONG_AUDIT');
  requireEvidence(r53.source?.verified===true&&r53.source?.sha256===THEME_R54_SOURCE_SHA,'SOURCE_HASH');
  requireEvidence(r53.source?.observationTarget===THEME_R54_OBSERVATION_DATE,'SOURCE_DATE');
  requireEvidence(r53.topLevel?.metrics?.fundsWith252ActuallyScoredResearchAxes===30,'R21_FUNDS_COUNT');
  requireEvidence(r53.topLevel?.metrics?.status==='THREE_APPROVED_R3_PRICE_AXES_RESEARCH_ONLY','R21_MODE');
  requireEvidence(r53.topLevel?.metrics?.stockBreadthActualScores===0&&r53.topLevel?.metrics?.stockDemandActualScores===0,'R21_MISSING_AXES');
  requireEvidence(r53.topLevel?.metrics?.reference756StillRequiresUpstreamProof===true,'REFERENCE_PROOF');
  requireEvidence(r53.policy?.newMarketDataFetched===false&&r53.policy?.newCalculation===false&&r53.policy?.fiveAxisCompositeComputed===false&&r53.policy?.pricePublicationAuthorized===false&&r53.policy?.dbOrDeploymentModified===false,'PUBLISH_POLICY');
  requireEvidence(r53.verdict==='READ_ONLY_SHADOW_EVIDENCE_ONLY','R53_VERDICT');
  requireEvidence(Array.isArray(r53.themes)&&r53.themes.length===12,'THEME_COUNT');
  const actualThemes=new Map();
  for(const item of r53.themes){
    requireEvidence(item&&typeof item.theme==='string'&&!actualThemes.has(item.theme),'DUPLICATE_THEME');
    actualThemes.set(item.theme,item);
  }
  const funds=r53.funds;
  requireEvidence(funds&&typeof funds==='object'&&!Array.isArray(funds),'FUND_SCHEMA');
  const requiredFundSymbols=new Set(THEME_R50_PHASE1_RESEARCH.flatMap(t=>t.etfs));
  requireEvidence(Object.keys(funds).length===requiredFundSymbols.size,'FUND_COUNT');
  const checked=new Map();
  for(const ticker of requiredFundSymbols){
    const item=funds[ticker];
    requireEvidence(item?.matches===1&&item?.review==='UNIQUE_R21_TICKER_OBJECT'&&Array.isArray(item.items)&&item.items.length===1,'FUND_UNIQUE_'+ticker);
    const m=item.items[0]?.metrics;
    requireEvidence(m?.history252Ready===true&&Number.isInteger(m.eligiblePriceBars)&&m.eligiblePriceBars>=252,'HISTORY_NOT_READY_'+ticker);
    requireEvidence(m.reference756Verified===false&&m.breadthScored===false&&m.demandScored===false,'FIVE_AXIS_NOT_RESEARCH_ONLY_'+ticker);
    requireEvidence(m.researchAxisScores&&KEYS.every(k=>finiteScore(m.researchAxisScores[k])),'PRICE_AXIS_INVALID_'+ticker);
    checked.set(ticker,m);
  }
  const themes=THEME_R50_PHASE1_RESEARCH.map(candidate=>{
    const actual=actualThemes.get(candidate.theme);
    requireEvidence(actual&&JSON.stringify(actual.etfs)===JSON.stringify(candidate.etfs),'THEME_PAIR_DRIFT_'+candidate.theme);
    requireEvidence(actual.r21PriceHistoryClaim==='RESEARCH_252_CLAIM_BOTH'&&actual.fiveAxisStatus==='NOT_VERIFIED'&&actual.rights==='NOT_VERIFIED','THEME_STATUS_DRIFT_'+candidate.theme);
    const [a,b]=candidate.etfs.map(t=>checked.get(t));
    const axisGap=Object.fromEntries(KEYS.map(k=>[k,round2(Math.abs(a.researchAxisScores[k]-b.researchAxisScores[k]))]));
    const maximum=round2(Math.max(...Object.values(axisGap)));
    requireEvidence(Math.abs(maximum-candidate.maxPriceAxisGap)<=0.01,'R22_PRICE_GAP_DRIFT_'+candidate.theme);
    return Object.freeze({
      theme:candidate.theme,
      etfs:candidate.etfs,
      eligibleBars:Object.freeze([a.eligiblePriceBars,b.eligiblePriceBars]),
      priceAxisGap:Object.freeze(axisGap),
      maxPriceAxisGap:maximum,
      priceHistoryResearchStatus:'RESEARCH_252_EACH_ETF',
      fiveAxisStatus:'NOT_VERIFIED',
      holdingsPitStatus:'NOT_VERIFIED',
      reference756Status:'NOT_VERIFIED',
      commercialRightsStatus:'NOT_VERIFIED',
      publicationStatus:'BLOCKED',
    });
  });
  return Object.freeze({
    version:THEME_R54_VERSION,
    sourceSha256:THEME_R54_SOURCE_SHA,
    observationDate:THEME_R54_OBSERVATION_DATE,
    candidateThemes:themes.length,
    uniqueEtfs:checked.size,
    researchPriceHistoryReady:themes.length,
    verifiedFiveAxisThemeScores:0,
    publicThemeScores:0,
    status:'RESEARCH_ONLY_NO_PUBLICATION',
    themes:Object.freeze(themes),
  });
}
