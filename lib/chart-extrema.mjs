// Extrema use only the displayed, dated observations. Prefer the latest tie.
export function chartExtrema(rows){
 let low=null,high=null;
 rows.forEach((row,index)=>{
  if(typeof row.value!=='number'||!Number.isFinite(row.value)||!/^\d{4}-\d{2}-\d{2}$/.test(row.date??''))return;
  const point={date:row.date,value:row.value,index};
  if(!low||point.value<=low.value)low=point;
  if(!high||point.value>=high.value)high=point;
 });
 if(!low||!high)return [];
 return low.value===high.value?[{...high,kind:'flat'}]:[{...low,kind:'min'},{...high,kind:'max'}];
}
export function clampedChartIndex(clientX,left,width,count){
 if(count<1||width<=0)return null;
 return Math.round(Math.max(0,Math.min(1,(clientX-left)/width))*(count-1));
}
