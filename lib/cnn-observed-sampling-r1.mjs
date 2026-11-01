// Return only real stored observation points. For long periods, retain
// the first, last, minimum and maximum within buckets; raw day rows remain
// untouched in PC SQLite / public D1 for later detailed date-range queries.
export function sampleCnnObservedPoints(points,maxPoints=1200){
 if(!Array.isArray(points))throw Error('CNN_ARCHIVE_SAMPLE_INVALID');
 if(points.length<=maxPoints)return points;
 const buckets=Math.max(1,Math.floor((maxPoints-2)/2));
 const selected=new Map();
 selected.set(points[0].observedAt,points[0]);
 for(let i=0;i<buckets;i++){
  const start=1+Math.floor(i*(points.length-2)/buckets);
  const end=1+Math.floor((i+1)*(points.length-2)/buckets);
  if(end<=start)continue;
  let low=points[start],high=points[start];
  for(let j=start+1;j<end;j++){
   if(points[j].score<low.score)low=points[j];
   if(points[j].score>high.score)high=points[j];
  }
  selected.set(low.observedAt,low);
  selected.set(high.observedAt,high);
 }
 const last=points.at(-1);
 selected.set(last.observedAt,last);
 return [...selected.values()].sort((a,b)=>a.observedAt.localeCompare(b.observedAt));
}
