const validScore=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}/.test(value)&&Number.isFinite(Date.parse(value));

export function marketTrendWindowR1(data=[],days=365){
  const dated=(Array.isArray(data)?data:[])
    .filter(point=>validDate(point?.label)&&validScore(point?.value))
    .map(point=>{
      const label=String(point.label).slice(0,10);
      return {label,value:point.value,at:Date.parse(label)};
    })
    .sort((a,b)=>a.at-b.at);
  if(!dated.length)return [];
  const end=dated.at(-1).at;
  const span=Math.max(1,Math.trunc(Number(days)||365));
  const start=end-span*86400000;
  const startLabel=new Date(start).toISOString().slice(0,10);
  const inside=dated.filter(point=>point.at>=start).map(({label,value})=>({label,value}));
  if(inside[0]?.label===startLabel)return inside;
  const prior=dated.filter(point=>point.at<start).at(-1);
  return prior?[{label:startLabel,value:prior.value},...inside]:inside;
}
