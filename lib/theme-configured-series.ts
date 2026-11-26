// A display-only projection: missing scores remain null and provisional points
// are never relabelled as confirmed. The bridge point preserves visual
// continuity exactly at a confirmed/provisional transition.
export type ConfiguredHistoryPoint={date:string;score:number|null;status:string;phase?:'CONFIRMED'|'PROVISIONAL'};
export type ConfiguredProvisionalPoint={date:string;score:number;phase:'PROVISIONAL'};
type ScoreMode='confirmed'|'provisional';
export type ConfiguredChartPoint={date:string;confirmed:number|null;provisional:number|null};

const mode=(p:ConfiguredHistoryPoint):ScoreMode|null=>
 p.phase==='CONFIRMED'?'confirmed':
 p.phase==='PROVISIONAL'?'provisional':
 p.status==='R188_COMPATIBLE'?'confirmed':
 p.status==='ADAPTIVE_PROVISIONAL'?'provisional':null;

export function configuredChartSeries(history:readonly ConfiguredHistoryPoint[],provisional?:ConfiguredProvisionalPoint|null):ConfiguredChartPoint[]{
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
 // R32's provisional is a separately published saved point, never inferred
 // from a confirmed aggregation mode. Connect only to its adjacent endpoint.
 const lastDate=history.at(-1)?.date;
 if(provisional?.phase==='PROVISIONAL'&&lastDate&&provisional.date>lastDate&&
   Number.isFinite(provisional.score)&&provisional.score>=0&&provisional.score<=100){
  const previous=points.at(-1);
  if(previous?.confirmed!==null&&previous?.confirmed!==undefined)previous.provisional=previous.confirmed;
  points.push({date:provisional.date,confirmed:null,provisional:provisional.score});
 }
 return points;
}
