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
export function extremaLeader(point,label){
 const faces=[
  {side:'left',x:label.x-27,y:label.y+2,eligible:point.x<label.x-24},
  {side:'right',x:label.x+27,y:label.y+2,eligible:point.x>label.x+24},
  {side:'top',x:label.x,y:label.y-13,eligible:point.y<label.y-10},
  {side:'bottom',x:label.x,y:label.y+17,eligible:point.y>label.y+14},
 ];
 const eligible=faces.filter(f=>f.eligible);
 const face=(eligible.length?eligible:faces).sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y))[0];
 const horizontal=face.side==='left'||face.side==='right';
 // Approach each face perpendicularly; keep the first segment outside the dot.
 const firstVertical=horizontal?face.y!==point.y:face.x===point.x;
 const sx=point.x+(firstVertical?0:Math.sign(face.x-point.x)*4);
 const sy=point.y+(firstVertical?Math.sign(face.y-point.y)*4:0);
 return {side:face.side,path:horizontal?`M ${sx} ${sy} V ${face.y} H ${face.x}`:`M ${sx} ${sy} H ${face.x} V ${face.y}`};
}
// Find nearby empty label rectangles without changing the chart's plot bounds.
export function placeExtremaLabels(points,targets,plot){
 const placed=[];
 const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
 const segments=[];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];if(!a||!b)continue;
  segments.push({left:Math.min(a.x,b.x)-4,right:Math.max(a.x,b.x)+4,top:Math.min(a.y,b.y)-4,bottom:Math.max(a.y,b.y)+4});
 }
 for(const target of [...targets].sort((a,b)=>a.kind.localeCompare(b.kind))){
  let best=null;
  for(let y=10;y<=plot.y+plot.height-14;y+=6)for(let x=plot.x+25;x<=plot.x+plot.width-25;x+=10){
   const box={left:x-24,right:x+24,top:y-10,bottom:y+14};
   if(placed.some(p=>intersects(box,{left:p.x-28,right:p.x+28,top:p.y-14,bottom:p.y+18})))continue;
   const hits=segments.filter(s=>intersects(box,s)).length;
   const distance=Math.hypot(x-target.x,y+2-target.y);
   const wrongSide=target.kind==='max'?y>target.y:y+14<target.y;
   const cost=hits*100000+distance+(wrongSide?15:0);
   if(!best||cost<best.cost)best={kind:target.kind,x,y,cost,hits};
  }
  if(best)placed.push(best);
 }
 return placed;
}
