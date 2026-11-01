// Reconstruct an already-stored historical date window; never invent scores or
// mark an older optional theme as current merely because the core feed advanced.
export function themeHistoryReference(base,seed,date){
 if(!date||date>=base.observationDate)return null;
 const themes=[];
 for(const current of base.themes){
  const prior=seed?.themes?.find(t=>t.theme===current.theme),map=new Map();
  for(const p of [...(prior?.history??[]),...current.history]){
   if(map.has(p.date)&&map.get(p.date)!==p.score)return null;
   map.set(p.date,p.score);
  }
  const history=[...map].filter(([d])=>d<=date).sort(([a],[b])=>a.localeCompare(b)).slice(-252).map(([date,score])=>({date,score}));
  if(history.length!==252||history.at(-1).date!==date)return null;
  themes.push({...current,score:history.at(-1).score,history});
 }
 return {...base,observationDate:date,confirmedObservationDate:date,phase:'CONFIRMED',provisional:undefined,themes};
}
