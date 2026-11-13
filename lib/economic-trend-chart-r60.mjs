// Presentation-only conversion of published economic score history.
// Keep explicitly missing dates as null so the chart's connectNulls=false
// does not draw a line through an unobserved point.
const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
 Number.isFinite(Date.parse(value+'T00:00:00Z'))&&
 new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const score=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;

export function economicOneYearChart(points){
 const byDate=new Map();
 for(const point of Array.isArray(points)?points:[]){
  const date=point?.date??point?.label;
  if(!day(date))continue;
  const value=point?.score??point?.value;
  // Explicit null and invalid values are gaps, not zeros or interpolated scores.
  byDate.set(date,score(value)?value:null);
 }
 const rows=[...byDate].sort(([a],[b])=>a.localeCompare(b)).map(([date,value])=>({date,score:value}));
 const latest=rows.at(-1)?.date;
 if(!latest)return [];
 const start=new Date(latest+'T00:00:00Z');
 start.setUTCFullYear(start.getUTCFullYear()-1);
 const startDay=start.toISOString().slice(0,10);
 return rows.filter(point=>point.date>=startDay);
}
