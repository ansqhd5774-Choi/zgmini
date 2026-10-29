// A display-only projection: missing scores remain null and provisional points
// are never relabelled as confirmed. The bridge point preserves visual
// continuity exactly at a confirmed/provisional transition.
export type ConfiguredHistoryPoint={date:string;score:number|null;status:string};
type ScoreMode='confirmed'|'provisional';
export type ConfiguredChartPoint={date:string;confirmed:number|null;provisional:number|null};

const mode=(p:ConfiguredHistoryPoint):ScoreMode|null=>
 p.status==='R188_COMPATIBLE'?'confirmed':
 p.status==='ADAPTIVE_PROVISIONAL'?'provisional':null;

export function configuredChartSeries(history:readonly ConfiguredHistoryPoint[]):ConfiguredChartPoint[]{
 const points=history.map(p=>({date:p.date,
  confirmed:p.score!==null&&mode(p)==='confirmed'?p.score:null,
  provisional:p.score!==null&&mode(p)==='provisional'?p.score:null}));
 for(let i=1;i<history.length;i++){
  const previous=history[i-1],current=history[i],a=mode(previous),b=mode(current);
  if(a&&b&&a!==b&&previous.score!==null&&current.score!==null){
   // Share only the immediately adjacent prior point at the style boundary.
   points[i-1][b]=previous.score;
  }
 }
 return points;
}
