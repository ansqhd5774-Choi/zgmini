// Explicit tombstone for the user-retired MarketParquet breadth publication lane.
// Do not replace it with a different provider, a synthetic score, or old D1 bars.
import {MARKETPARQUET_REMOVED_CODE} from '../lib/marketparquet-retirement.mjs';

export function retiredBreadthPublicDomain(){
 return {
  id:'breadth',name:'수급·폭',
  source:'RETIRED_BREADTH_PUBLIC_SOURCE',
  status:'UNAVAILABLE',score:null,state:MARKETPARQUET_REMOVED_CODE,
  methodologyVersion:null,asOfDate:null,observationDate:null,updatedAt:null,
  trend:[],indicators:[],missingFactors:[],freshness:'UNAVAILABLE',
 };
}
