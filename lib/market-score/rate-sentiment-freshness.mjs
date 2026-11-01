export const RATE_SENTIMENT_MAX_OBSERVATION_DAYS=7;
export function rateSentimentCalendarLag(date,asOfDate){
 const valid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 if(!valid(date)||!valid(asOfDate)||date>asOfDate)return null;
 return (Date.parse(asOfDate+'T00:00:00Z')-Date.parse(date+'T00:00:00Z'))/86400000;
}
