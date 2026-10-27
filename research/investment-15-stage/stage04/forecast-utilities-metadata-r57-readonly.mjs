/**
 * R57: a deliberately narrow, non-destructive audit of the TBRC Utilities page.
 * Publisher metadata may mislabel BOTH the endpoint year and historic CAGR.
 * Do not infer any market size or growth rate: parse and verify all literal
 * numbers independently from the same freshly fetched publisher HTML.
 * The metadata discrepancy remains visible; it is not silently corrected.
 */
import {auditForecastSource} from './forecast-source-audit-r29-readonly.mjs';
import {pagePlainText} from './stage04-four-publisher-r37-readonly.mjs';

const money=(s,u)=>{
  const x=Number(String(s).replaceAll(',',''));
  const scale={million:1e6,billion:1e9,trillion:1e12}[String(u).toLowerCase()];
  return Number.isFinite(x)&&scale?x*scale:null;
};
const comparable=(a,b)=>a>0&&b>0&&Math.abs(a/b-1)<0.00001;
const rateClose=(actual,expected,tolerance=0.15)=>
  Number.isFinite(actual)&&Number.isFinite(expected)&&Math.abs(actual-expected)<=tolerance;

export function auditUtilitiesMetadataR57(html){
  const old=auditForecastSource(html,{resolveHistoricTableMislabel:true});
  if(['CONSISTENT','RESOLVED_HISTORIC_RATE_MISLABEL'].includes(old.source_audit))
    return {...old,metadata_conflict_preserved:old.source_audit!=='CONSISTENT'};
  const rejected={...old,metadata_conflict_preserved:true};
  if(old.source_audit!=='INCOMPLETE'||
    old.source_conflict_reason!=='INCONSISTENT_REPORT_PERIOD_OR_UNITS')return rejected;

  const text=pagePlainText(html);
  if(!/\bUtilities Market Report 2026\b/i.test(text)||
    !/What Is The Utilities Market Size and Share 2026\s*\?/i.test(text))return rejected;
  const historical=text.match(/What Is The Utilities Market Size and Share 2026\s*\?\s*[^?]{0,350}?\b(?:will|is expected to) grow from \$([\d,.]+)\s+(million|billion|trillion) in (20\d{2}) to \$([\d,.]+)\s+(million|billion|trillion) in (20\d{2}) at a compound annual growth rate \(CAGR\) of ([\d.]+)%/i);
  const forecast=text.match(/What Is The Utilities Market Growth Forecast\s*\?\s*[^?]{0,350}?\b(?:will|is expected to) grow to \$([\d,.]+)\s+(million|billion|trillion) in (20\d{2}) at a compound annual growth rate \(CAGR\) of ([\d.]+)%/i);
  const table=text.match(/Utilities Market Report Forecast Analysis\s+[^?]{0,250}?Market Size Value In (20\d{2}) \$([\d,.]+)\s+(million|billion|trillion) Revenue Forecast In (20\d{2}) \$([\d,.]+)\s+(million|billion|trillion) Growth Rate CAGR of ([\d.]+)% from (20\d{2}) to (20\d{2})/i);
  if(!historical||!forecast||!table)return rejected;
  const h0=money(historical[1],historical[2]),h1=money(historical[4],historical[5]);
  const f1=money(forecast[1],forecast[2]);
  const t0=money(table[2],table[3]),t1=money(table[5],table[6]);
  const y0=Number(historical[3]),y1=Number(historical[6]);
  const futureYear=Number(forecast[3]);
  const tableStartYear=Number(table[1]),tableEndYear=Number(table[4]);
  const metadataRate=Number(table[7]),metadataPeriodStart=Number(table[8]);
  const metadataPeriodEnd=Number(table[9]);
  const historicalRate=Number(historical[7]),futureRate=Number(forecast[4]);
  if(![h0,h1,f1,t0,t1].every(x=>x>0))return rejected;
  const mathHistoric=100*(h1/h0-1);
  const mathForecast=100*(Math.pow(f1/h1,1/(futureYear-y1))-1);
  // Both mismatches must be demonstrated together, not waved away.
  const proven=y0===2025&&y1===2026&&futureYear===2030&&
    tableStartYear===y1&&tableEndYear===metadataPeriodEnd&&
    metadataPeriodStart===y1&&tableEndYear>futureYear&&
    y1===y0+1&&comparable(h1,t0)&&comparable(f1,t1)&&
    rateClose(mathHistoric,historicalRate)&&
    rateClose(historicalRate,metadataRate,0.05)&&
    rateClose(mathForecast,futureRate)&&
    !rateClose(mathForecast,metadataRate)&&
    /Forecast Period\s+2026\s*-\s*2030\s*-\s*2035/i.test(text);
  if(!proven)return rejected;

  const endOfForecast=text.indexOf('What Is The Utilities Market Growth Forecast');
  const forecastExcerpt=text.slice(endOfForecast,endOfForecast+400);
  return {...old,
    source_audit:'NARRATIVE_VERIFIED_METADATA_CONFLICT',
    source_conflict_reason:'TABLE_2035_ENDPOINT_AND_HISTORIC_RATE_CONTRADICT_VERIFIED_2030_FORECAST',
    forecast_narrative_pct:futureRate,forecast_table_pct:metadataRate,
    forecast_math_pct:Number(mathForecast.toFixed(3)),
    forecast_base_year:y1,forecast_end_year:futureYear,
    forecast_base_value:`${historical[4]} ${historical[5].toLowerCase()}`,
    forecast_end_value:`${forecast[1]} ${forecast[2].toLowerCase()}`,
    historic_narrative_pct:historicalRate,
    historic_math_pct:Number(mathHistoric.toFixed(3)),
    metadata_reported_end_year:tableEndYear,
    metadata_conflict_preserved:true,
    forecast_excerpt:`Market Size Value In ${y1} $${historical[4]} ${historical[5]}. ${forecastExcerpt}`.slice(0,650)};
}
