// Display composition only. Legacy and registered projections remain stored
// and independently validated; no price requests or score calculation here.
export function mergeConfiguredThemeFeed(base,configured){
 const legacy=base?.status==='READY'&&Array.isArray(base.themes)?base.themes:[];
 const names=new Set(legacy.map(t=>t.theme)),ids=new Set();
 const themes=[...legacy],points=new Map();
 for(const p of base?.phase==='PROVISIONAL'?base.provisional?.points??[]:[])points.set(p.date,{date:p.date,scores:{...p.scores}});
 if(configured?.status==='READY'&&Array.isArray(configured.themes))for(const t of configured.themes){
  if(!t?.id||ids.has(t.id)||names.has(t.theme))continue;
  ids.add(t.id);names.add(t.theme);
  themes.push({id:t.id,theme:t.theme,etfs:t.etfs,score:t.score,history:t.history,configured:true});
  if(t.provisionalStatus==='READY'&&t.provisional?.date>t.observationDate){
   const point=points.get(t.provisional.date)??{date:t.provisional.date,scores:{}};
   point.scores[t.theme]=t.provisional.score;points.set(point.date,point);
  }
 }
 const dates=themes.flatMap(t=>t.history?.at(-1)?.date?[t.history.at(-1).date]:[]).sort();
 return {...base,status:themes.length?'READY':base?.status??configured?.status??'PENDING',themes,
  observationDate:dates.at(-1),phase:points.size?'PROVISIONAL':'CONFIRMED',
  provisional:{points:[...points.values()].sort((a,b)=>a.date.localeCompare(b.date))}};
}
