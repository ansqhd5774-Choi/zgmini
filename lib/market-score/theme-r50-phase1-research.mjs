/**
 * R50: first 12 theme research candidates, from the R21/R22 price-axis audit.
 * Not a production data contract, ETF approval, score model, weight change, or publication list.
 * No market data, external I/O, or persistent-state side effects.
 * The ordering is increasing R22 maximum inter-ETF axis-point gap, for REVIEW ONLY.
 */
export const THEME_R50_PHASE1_RESEARCH_VERSION='THEME-R50-PHASE1-RESEARCH-2026-10-19';

const snapshot=[
  ['사이버보안','CIBR','BUG',4.21],
  ['AI 신약개발','GNOM','ARKG',4.33],
  ['원전·SMR','NLR','URA',5.30],
  ['로봇·자동화','BOTZ','ROBO',6.79],
  ['AI 반도체','SMH','SOXX',9.19],
  ['자율주행','DRIV','BOTZ',12.02],
  ['클라우드·SaaS','SKYY','CLOU',12.14],
  ['바이오테크','IBB','GNOM',13.12],
  ['게임·e스포츠','HERO','ESPO',14.33],
  ['핀테크','FINX','ARKF',24.88],
  ['방산','ITA','SHLD',32.78],
  ['블록체인·디지털자산','BLOK','ARKF',66.96],
];

export const THEME_R50_PHASE1_RESEARCH=Object.freeze(snapshot.map(([theme,a,b,maxPriceAxisGap])=>Object.freeze({
  theme,
  etfs:Object.freeze([a,b]),
  maxPriceAxisGap,
  state:'PRICE_3_AXIS_RESEARCH_ONLY',
})));

/** A catalog lookup only: it must never be interpreted as display or publication readiness. */
export function findThemeR50ResearchCandidate(theme){
  return THEME_R50_PHASE1_RESEARCH.find(item=>item.theme===theme)??null;
}

/** Source-catalog drift detection; never changes the 30-theme public catalog. */
export function auditThemeR50ResearchCatalog(themeNames){
  if(!Array.isArray(themeNames)||themeNames.length!==30||new Set(themeNames).size!==30){
    throw Error('THEME_R50_CATALOG_NOT_30_UNIQUE');
  }
  if(THEME_R50_PHASE1_RESEARCH.length!==12)throw Error('THEME_R50_BATCH_NOT_12');
  const known=new Set(themeNames),seen=new Set();
  for(const {theme,etfs,maxPriceAxisGap,state} of THEME_R50_PHASE1_RESEARCH){
    if(!known.has(theme)||seen.has(theme))throw Error('THEME_R50_CANDIDATE_NOT_IN_CATALOG_OR_DUPLICATE:'+theme);
    seen.add(theme);
    if(etfs.length!==2||new Set(etfs).size!==2||etfs.some(etf=>!/^[A-Z]{2,5}$/.test(etf))){
      throw Error('THEME_R50_INVALID_R21_ETF_PAIR:'+theme);
    }
    if(!Number.isFinite(maxPriceAxisGap)||maxPriceAxisGap<0||maxPriceAxisGap>100){
      throw Error('THEME_R50_INVALID_R22_GAP:'+theme);
    }
    if(state!=='PRICE_3_AXIS_RESEARCH_ONLY')throw Error('THEME_R50_RESEARCH_STATE_CHANGED:'+theme);
  }
  const etfUseCount={};
  for(const item of THEME_R50_PHASE1_RESEARCH)for(const etf of item.etfs)etfUseCount[etf]=(etfUseCount[etf]??0)+1;
  return Object.freeze({
    version:THEME_R50_PHASE1_RESEARCH_VERSION,
    catalogThemes:themeNames.length,
    researchCandidates:seen.size,
    productionFiveAxisReady:0, // R21 baseline, NOT a live runtime claim
    liveReadinessChecked:false,
    repeatedResearchEtfs:Object.freeze(Object.entries(etfUseCount).filter(([,n])=>n>1).map(([etf,n])=>Object.freeze({etf,usedBy:n}))),
    status:'RESEARCH_ONLY_NO_PUBLICATION',
  });
}
