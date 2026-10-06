const validScore=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}/.test(value)&&Number.isFinite(Date.parse(value));

export function marketTrendWindowR1(data=[],days=365){
  const dated=(Array.isArray(data)?data:[])
    .filter(point=>validDate(point?.label)&&validScore(point?.value))
    .map(point=>({label:String(point.label).slice(0,10),value:point.value}))
    .sort((a,b)=>Date.parse(a.label)-Date.parse(b.label));
  if(!dated.length)return [];
  const end=Date.parse(dated.at(-1).label);
  const span=Math.max(1,Math.trunc(Number(days)||365));
  const start=end-span*86400000;
  const startLabel=new Date(start).toISOString().slice(0,10);
  const inside=dated.filter(point=>Date.parse(point.label)>=start);
  if(inside[0]?.label===startLabel)return inside;
  const prior=dated.filter(point=>Date.parse(point.label)<start).at(-1);
  return prior?[{label:startLabel,value:prior.value},...inside]:inside;
}
