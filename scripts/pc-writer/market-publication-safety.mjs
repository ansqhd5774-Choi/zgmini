import {validDegradedMarket} from './collection-publication-policy.mjs';
import {DOMAIN_WEIGHTS} from '../../lib/market-score/composite-model-r1.mjs';
export function assertCompleteMarket(body){
 if(!validDegradedMarket(body))throw Error('MARKET_REQUIRED_SCORE_MISSING');
 if(!DOMAIN_WEIGHTS.every(d=>body.domains.some(x=>x.id===d.id)))throw Error('MARKET_REQUIRED_SCORE_MISSING');
 if(!Array.isArray(body.overall.trend)||!body.overall.trend.some(p=>Number.isFinite(p?.value??p?.score)))
  throw Error('MARKET_REQUIRED_TREND_MISSING');
}
