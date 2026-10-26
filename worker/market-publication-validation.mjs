import {DOMAIN_WEIGHTS} from '../lib/market-score/composite-model-r1.mjs';
const score=value=>Number.isFinite(value)&&value>=0&&value<=100;
export function assertCompleteMarket(body){
 if(body?.status!=='SUCCESS'||body.overall?.status!=='READY'||!score(body.overall.score)
  ||!Array.isArray(body.domains)||body.domains.length!==DOMAIN_WEIGHTS.length
  ||!DOMAIN_WEIGHTS.every(d=>body.domains.filter(x=>x?.id===d.id&&x.status==='READY'&&score(x.score)).length===1))throw Error('MARKET_REQUIRED_SCORE_MISSING');
 if(!Array.isArray(body.overall.trend)||!body.overall.trend.some(p=>score(p?.value??p?.score)))throw Error('MARKET_REQUIRED_TREND_MISSING');
}
