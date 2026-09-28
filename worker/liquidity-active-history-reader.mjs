const finiteScore=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
export const LIQUIDITY_ACTIVE_HISTORY_METHOD="DIAGNOSTIC_SCORE_TRANSFORM_R1";

export async function loadLiquidityActiveHistory(db,{asOf,limit=366}={}){
  if(!db||!validDate(asOf))return [];
  const n=Number.isInteger(limit)&&limit>0?Math.min(limit,5000):366;
  try{
    const result=await db.prepare(
      `SELECT as_of_date, score
       FROM market_liquidity_active_history_v1
       WHERE methodology_version = ? AND as_of_date <= ?
       ORDER BY as_of_date DESC
       LIMIT ?`
    ).bind(LIQUIDITY_ACTIVE_HISTORY_METHOD,asOf,n).all();
    const rows=Array.isArray(result?.results)?result.results:[];
    return rows
      .filter(row=>validDate(row?.as_of_date)&&finiteScore(row?.score))
      .map(row=>({label:row.as_of_date,value:row.score}))
      .reverse();
  }catch{
    return [];
  }
}
