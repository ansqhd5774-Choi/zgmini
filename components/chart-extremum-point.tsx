import {usePlotArea,useXAxisScale,useYAxisScale} from 'recharts';
import {placeExtremaLabels} from '../lib/chart-extrema.mjs';
type Point={date:string;value:number;index:number;kind:string};
// SVG text only: no tooltip box, and no pointer hit area over the line.
export default function ChartExtremumPoint({cx,cy,point,color,peerIndex,samples}:{cx?:number;cy?:number;point:Point;count:number;color:string;peerIndex?:number;samples:Array<{x:string|number;value:number|null}>}){
 const plot=usePlotArea();
 const xScale=useXAxisScale(),yScale=useYAxisScale();
 if(typeof cx!=='number'||typeof cy!=='number')return null;
 const tint=point.kind==='max'?'#10b981':point.kind==='min'?'#ff626b':color;
 const positions=samples.map(s=>{const x=xScale?.(s.x),y=s.value===null?undefined:yScale?.(s.value);return typeof x==='number'&&typeof y==='number'?{x,y}:null});
 const targets=[{kind:point.kind,x:cx,y:cy}];
 const peer=peerIndex===undefined?null:positions[peerIndex];
 if(peer)targets.push({kind:point.kind==='max'?'min':'max',...peer});
 const label=plot?placeExtremaLabels(positions,targets,plot).find(p=>p.kind===point.kind):null;
 const x=label?.x??cx,y=label?.y??10;
 const below=y>cy,edge=below?y-13:y+16,elbow=below?edge-3:edge+3;
 return <g className="zg-chart-extremum" data-label-clear={label?.hits===0} pointerEvents="none" aria-label={`${point.kind==='min'?'최저':point.kind==='max'?'최고':'최고·최저'} ${point.value.toFixed(1)} (${point.date.slice(5)})`}>
  <path d={`M ${cx} ${cy+(below?4:-4)} V ${elbow} H ${x} V ${edge}`} fill="none" stroke={tint} strokeWidth={.8} opacity={.7}/>
  <circle cx={cx} cy={cy} r={2.8} fill={tint} stroke={tint} strokeWidth={1}/>
  <text x={x} y={y} textAnchor="middle" fill={tint} fontSize={10} fontWeight={600} stroke="#071a29" strokeWidth={2.5} paintOrder="stroke" strokeLinejoin="round">
   <tspan x={x}>{point.value.toFixed(1)}</tspan><tspan x={x} dy={11} fontWeight={400}>({point.date.slice(5)})</tspan>
  </text>
 </g>;
}
