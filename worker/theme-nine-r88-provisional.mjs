// MarketParquet R88 overlay removed; never query the old provisional key.
import {THEME_NINE_R37_ROSTER,THEME_NINE_R37_VERSION} from './theme-nine-r37-public.mjs';
import {MARKETPARQUET_REMOVED_CODE} from '../lib/marketparquet-retirement.mjs';
export const R88_KEY='theme-nine-r32-provisional-r88';
export const R88_VERSION='THEME_NINE_R32_PROVISIONAL_R88_V1';
export const R88_PRICE_MODE='PROVISIONAL_UNAVAILABLE_PROVIDER_REMOVED';
export const R88_PUBLIC_ROSTER=THEME_NINE_R37_ROSTER.filter(t=>t.theme!=='AI·반도체');
export function validNineR88(){return false;}
export async function addVerifiedNineR88(_db,base){
 if(base?.modelRevision!==THEME_NINE_R37_VERSION)return base;
 const core=new Set(R88_PUBLIC_ROSTER.map(t=>t.theme));
 const points=(base.provisional?.points??[]).map(p=>({...p,
  scores:Object.fromEntries(Object.entries(p.scores??{}).filter(([name])=>!core.has(name)))}))
  .filter(p=>Object.keys(p.scores).length);
 return {...base,r32ProvisionalReaderVersion:R88_VERSION,r32ProvisionalStatus:'UNAVAILABLE',
  r32ProvisionalReason:MARKETPARQUET_REMOVED_CODE,phase:points.length?'PROVISIONAL':'CONFIRMED',
  provisional:{...base.provisional,points}};
}
