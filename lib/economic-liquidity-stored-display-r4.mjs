// W06 R4 #56: display-only validation for the ACTIVE six-factor D3 score.
// Only four observable source rows are public. Never renormalize or pretend
// that their scores can reconstruct the six-factor approved aggregate.
const METHOD='DIAGNOSTIC_SCORE_TRANSFORM_R1';
const FRESHNESS='CURRENT_ACTIVE_DIAGNOSTIC_R1_RECONSTRUCTED_PLUS_STORED_PUBLIC_SCORE_HISTORY';
const READY_ROWS=Object.freeze([
 ['은행 준비금','Federal Reserve / WRESBAL active transform'],
 ['M2 증가율','Federal Reserve / M2SL active transform'],
 ['TGA 변화','U.S. Treasury / WTREGEN active transform'],
 ['ON RRP 변화','Federal Reserve / RRPONTSYD active transform'],
]);
const score=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
 Number.isFinite(Date.parse(value+'T00:00:00Z'))&&
 new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const close=(a,b)=>Math.abs(a-b)<=1e-6;

/**
 * @param {any} domain
 * @param {string|null|undefined} asOfDate
 * @param {{status?:string,score?:number|null,missingFactors?:string[]}|null|undefined} [diagnostic]
 */
export function verifiedEconomicLiquidityScore(domain,asOfDate,diagnostic=null){
 // Stored snapshots written before the additive CM-R1 provenance projection
 // legitimately omit BOTH fields. Preserve those only with independent
 // published six-factor diagnostic parity and the exact D3 fingerprint below.
 const legacyD3=domain?.methodologyVersion==null&&domain?.asOfDate==null
  &&diagnostic?.status==='READY'&&score(diagnostic.score)
  &&score(domain?.score)&&close(diagnostic.score,domain.score);
 if(domain?.id!=='liquidity'||domain.status!=='READY'||!score(domain.score)
  ||(domain.methodologyVersion!==METHOD&&!legacyD3)||domain.freshness!==FRESHNESS
  ||!date(asOfDate)||(!legacyD3&&domain.asOfDate!==asOfDate)||domain.updatedAt!==asOfDate
  ||!Array.isArray(domain.missingFactors)||domain.missingFactors.length!==0
  ||typeof domain.interpretation!=='string'
  ||!domain.interpretation.startsWith('현재 ACTIVE D3 유동성 점수와 동일한 구성점수입니다.')
  ||!Array.isArray(domain.indicators)||domain.indicators.length!==READY_ROWS.length)return null;
 const byName=new Map(domain.indicators.map(row=>[row?.name,row]));
 if(byName.size!==READY_ROWS.length)return null;
 for(const [name,source] of READY_ROWS){
  const row=byName.get(name);
  const observed=row?.asOfDate??row?.observationDate??null;
  if(row?.source!==source||row?.status!=='READY'||!score(row.score)
   ||!date(observed)||observed>asOfDate)return null;
 }
 // The separate published six-factor diagnostic is the only available
 // full-model score parity check. Four UI rows are not the whole formula.
 if(diagnostic!=null&&(diagnostic.status!=='READY'||!score(diagnostic.score)
  ||!close(diagnostic.score,domain.score)
  ||(Array.isArray(diagnostic.missingFactors)&&diagnostic.missingFactors.length>0)))return null;
 return domain.score;
}

/**
 * @param {any} domain
 * @param {string|null|undefined} asOfDate
 * @param {number|null|undefined} headline
 * @param {{status?:string,score?:number|null,missingFactors?:string[]}|null|undefined} [diagnostic]
 */
export function verifiedEconomicLiquidityChart(domain,asOfDate,headline,diagnostic=null){
 if(!score(headline)||verifiedEconomicLiquidityScore(domain,asOfDate,diagnostic)!==headline)return [];
 const start=new Date(asOfDate+'T00:00:00Z');
 start.setUTCFullYear(start.getUTCFullYear()-1);
 const since=start.toISOString().slice(0,10);
 const seen=new Map(),conflicts=new Set();
 for(const row of Array.isArray(domain?.trend)?domain.trend:[]){
  const day=row?.date??row?.label;
  if(!date(day)||day<since||day>asOfDate)continue;
  if(row?.status!==undefined&&!['READY','PARTIAL'].includes(row.status))continue;
  const raw=row?.score===null?null:row?.score??row?.value;
  const value=row?.status==='PARTIAL'||raw===null?null:score(raw)?raw:null;
  if(seen.has(day)&&seen.get(day)!==value)conflicts.add(day);
  seen.set(day,value);
 }
 if(conflicts.size)return [];
 const chart=[...seen].sort(([a],[b])=>a.localeCompare(b)).map(([day,value])=>({date:day,score:value}));
 const last=chart.at(-1);
 // A published current-day point may only be drawn if it equals the
 // currently published six-factor score. Missing dates are never inserted.
 if(last?.date===asOfDate&&(!score(last.score)||!close(last.score,headline)))return [];
 return chart;
}

/**
 * @param {any} chart
 * @param {any} domain
 * @param {string|null|undefined} asOfDate
 * @param {number|null|undefined} headline
 * @param {{status?:string,score?:number|null,missingFactors?:string[]}|null|undefined} [diagnostic]
 */
export function isEconomicLiquidityChartCurrent(chart,domain,asOfDate,headline,diagnostic=null){
 if(verifiedEconomicLiquidityScore(domain,asOfDate,diagnostic)!==headline||!score(headline))return false;
 const last=Array.isArray(chart)?chart.at(-1):null;
 return Boolean(last?.date===asOfDate&&score(last?.score)&&close(last.score,headline));
}
