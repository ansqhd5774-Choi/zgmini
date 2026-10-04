export const PROJECTION_MACRO_SERIES=Object.freeze(Object.fromEntries(Object.entries({
 recession:['PAYEMS','GDPC1','INDPRO','DPCERA3M086SBEA','UNRATE','RRSFS','DSPIC96'],
 liquidityCrisis:['WLCFLPCL','WLCFLSCL','H41RESPPALDKNWW','WLCFOCEL','TLAACBM027NBOG','SOFR','IORB','OBFR','WRESBAL','WTREGEN','RRPONTSYD','M2SL','DGS2','DGS5','DGS10','DGS30'],
 creditRisk:['DGS2','DGS5','DGS10','DGS30'],
 assetBubble:['BOGZ1LM793164115Q','BOGZ1LM103164115Q','GDP','BOGZ1FL153064486Q','M2SL'],
 debtRisk:['B471RC1Q027SBEA','A455RC1Q027SBEA','A464RC1Q027SBEA'],
 supplyShock:['MCOILWTICO','GASREGCOVM','INDPRO','CPIAUCSL','CPILFESL'],
}).map(([id,series])=>[id,Object.freeze(series)])));
export function projectionMacroKey(id){if(!PROJECTION_MACRO_SERIES[id])throw Error('INVALID_PROJECTION_ID');return `projection-macro:${id}`;}
export function sliceProjectionMacro(id,body){
 const ids=PROJECTION_MACRO_SERIES[id];if(!ids)throw Error('INVALID_PROJECTION_ID');
 const pick=source=>Object.fromEntries(ids.filter(key=>Object.hasOwn(source??{},key)).map(key=>[key,source[key]]));
 // These current-vintage builders normalize raw series using observationDate/value.
 // Keep all observations (including duplicates/null/zero); source metadata stays in full macro.
 const series=Object.fromEntries(Object.entries(pick(body?.series)).map(([key,rows])=>[key,Array.isArray(rows)?rows.map(row=>row&&typeof row==='object'?Object.fromEntries(['observationDate','value'].filter(k=>Object.hasOwn(row,k)).map(k=>[k,row[k]])):row):rows]));
 return {...body,series,...(body?.seriesStoredAt?{seriesStoredAt:pick(body.seriesStoredAt)}:{})};
}
