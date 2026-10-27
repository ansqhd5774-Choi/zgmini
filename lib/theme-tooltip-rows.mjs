// One displayed row per selected theme and date. Chart solid/dashed segments
// are presentation-only; never use their duplicated Recharts payload as data.
const validScore=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;

export function themeTooltipRows(themes,selected,row,date){
 if(!row||row.date!==date||!Array.isArray(themes)||!(selected instanceof Set))return [];
 const seen=new Set(),result=[];
 for(const theme of themes){
  if(!selected.has(theme.name)||seen.has(theme.name))continue;
  seen.add(theme.name);
  const raw=row[theme.key];
  const score=validScore(raw)?raw:null;
  const observed=score===null&&Array.isArray(theme.points)?
   theme.points.findLast(point=>point.date<=date&&validScore(point.score))?.date??null:null;
  result.push({name:theme.name,color:theme.color,score,lastObservedDate:observed});
 }
 // Keep available scores together and place unavailable themes last.
 return [...result.filter(item=>item.score!==null),...result.filter(item=>item.score===null)];
}
