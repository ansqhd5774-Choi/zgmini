// null means no star filtering (all). Clicking a star selects or deselects
// that level independently; clicking the final selected level restores all.
export function toggleStarImportance(selected,level){
 if(![1,2,3].includes(level)||
  (selected!==null&&(!Array.isArray(selected)||selected.some(value=>![1,2,3].includes(value)))))
  throw Error('MARKET_CALENDAR_STAR_FILTER_INVALID');
 const next=selected?.includes(level)?selected.filter(value=>value!==level):[...(selected??[]),level].sort((a,b)=>b-a);
 return next.length?next:null;
}
