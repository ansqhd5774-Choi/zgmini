// Private candidate for NEW themes only. No provider, file, D1 or scheduler access.
// Generalizes the approved 2-ETF 70:30 -> 50:50 ramp to an arbitrary ETF count.
// The quantitative extension to 2 young ETFs / 3+ ETFs needs separate approval
// before any publication or existing-theme migration.
const MIN_SCORE_SESSIONS=40;
const PARITY_SESSIONS=377;
const WEIGHT_RAMP=PARITY_SESSIONS-MIN_SCORE_SESSIONS;
const validSymbol=s=>typeof s==='string'&&/^[A-Z][A-Z0-9.-]{0,11}$/.test(s);

// At the approved long+young pair boundary, young/(long+young) must be 30%.
// Convert that share to a relative strength; normalize all available strengths.
function maturityStrength(sessions){
 const effective=Math.min(sessions,PARITY_SESSIONS);
 const youngShare=.30+.20*(effective-MIN_SCORE_SESSIONS)/WEIGHT_RAMP;
 return youngShare/(1-youngShare);
}

export function scoreRelativeThemeBasket({etfs}={}){
 if(!Array.isArray(etfs)||etfs.length<2)
  throw Error('THEME_R4_AT_LEAST_TWO_SCORED_ETFS_REQUIRED');
 const seen=new Set();
 const entries=etfs.map(etf=>{
  if(!validSymbol(etf?.symbol)||seen.has(etf.symbol))
   throw Error('THEME_R4_INVALID_OR_DUPLICATE_TICKER');
  seen.add(etf.symbol);
  if(!Number.isInteger(etf.sessions)||etf.sessions<MIN_SCORE_SESSIONS)
   throw Error('THEME_R4_INSUFFICIENT_REAL_SESSIONS');
  if(typeof etf.score!=='number'||!Number.isFinite(etf.score)||etf.score<0||etf.score>100)
   throw Error('THEME_R4_MISSING_ACTUAL_ADAPTIVE_SCORE');
  const expected=etf.sessions<PARITY_SESSIONS?'ADAPTIVE_PROVISIONAL':'R188_COMPATIBLE';
  if(etf.status!==expected)
   throw Error('THEME_R4_SCORER_PARITY_NOT_VERIFIED');
  return {symbol:etf.symbol,score:etf.score,sessions:etf.sessions,
   effectiveSessions:Math.min(etf.sessions,PARITY_SESSIONS),
   maturityStrength:maturityStrength(etf.sessions),status:etf.status};
 });
 const totalStrength=entries.reduce((sum,x)=>sum+x.maturityStrength,0);
 if(!Number.isFinite(totalStrength)||totalStrength<=0)
  throw Error('THEME_R4_INVALID_NORMALIZATION');
 const weights=Object.fromEntries(entries.map(x=>[x.symbol,x.maturityStrength/totalStrength]));
 const score=entries.reduce((sum,x)=>sum+x.score*weights[x.symbol],0);
 const maturityFactors=Object.fromEntries(entries.map(x=>[x.symbol,x.maturityStrength]));
 return {score,weights,maturityFactors,
  status:entries.every(x=>x.status==='R188_COMPATIBLE')?
   'R188_COMPATIBLE':'ADAPTIVE_PROVISIONAL',
  method:'R4_PRIVATE_PROPOSED_RELATIVE_MATURITY_NOT_PUBLISHED',
  publicationAuthorized:false};
}
