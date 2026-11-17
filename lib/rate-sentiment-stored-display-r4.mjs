// W06 R4 #61: read-only validation of the already-published H.15 rate
// sentiment display. Never calculate RSI, spread, volatility or missing dates;
// the approved PC scorer and stored public snapshot remain authoritative.
import {rateSentimentCalendarLag,RATE_SENTIMENT_MAX_OBSERVATION_DAYS} from './market-score/rate-sentiment-freshness.mjs';

const METHOD='RATE_SENTIMENT_R1_RESEARCH';
const SOURCE='FEDERAL_RESERVE_H15_STORED_RATES';
const finiteScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)
  &&Number.isFinite(Date.parse(d+'T00:00:00Z'))
  &&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const weekday=d=>validDate(d)&&![0,6].includes(new Date(d+'T00:00:00Z').getUTCDay());
const close=(a,b)=>Math.abs(a-b)<=1e-6;

function publishedSeries(rows,size,lastDate){
 if(!Array.isArray(rows)||rows.length!==size)return null;
 let last='',out=[];
 for(const row of rows){
  const date=row?.label;
  if(!weekday(date)||date<=last||date>lastDate||!finiteScore(row?.value))return null;
  last=date;out.push({label:date,value:row.value});
 }
 return out;
}

/**
 * Verify a persisted public rate sentiment display, including its score
 * and both independently published histories. Do not synthesize dates.
 * @param {any} body
 * @param {number} nowMs
 * @returns {any|null}
 */
export function verifiedRateSentimentStoredView(body,nowMs=Date.now()){
 if(!Number.isSafeInteger(nowMs)||nowMs<0)return null;
 const asOf=new Date(nowMs).toISOString().slice(0,10);
 const lag=rateSentimentCalendarLag(body?.observationDate,asOf);
 if(body?.status!=='READY'||body?.version!==METHOD||body?.source!==SOURCE
   ||body?.historyMode!=='CURRENT_VINTAGE_ONLY'
   ||!weekday(body?.observationDate)
   ||lag===null||lag>RATE_SENTIMENT_MAX_OBSERVATION_DAYS
   ||!finiteScore(body?.score)
   ||!Number.isSafeInteger(body?.sourceStoredAt)||body.sourceStoredAt<=0||body.sourceStoredAt>nowMs)return null;
 const week=publishedSeries(body?.week,5,body.observationDate);
 const oneMonth=publishedSeries(body?.oneMonth,22,body.observationDate);
 if(!week||!oneMonth)return null;
 if(week.at(-1).label!==body.observationDate||oneMonth.at(-1).label!==body.observationDate
   ||!close(body.score,week.at(-1).value)||!close(body.score,oneMonth.at(-1).value))return null;
 // The week chart must be precisely the last five actually stored months'
 // trading observations, not an unrelated five-point series.
 const expected=oneMonth.slice(-5);
 for(let i=0;i<5;i++){
  if(week[i].label!==expected[i].label||!close(week[i].value,expected[i].value))return null;
 }
 return body;
}
