import {usePlotArea} from 'recharts';
type Point={date:string;value:number;index:number;kind:string};
// SVG text only: no tooltip box, and no pointer hit area over the line.
export default function ChartExtremumPoint({cx,cy,point,count,color,peerIndex}:{cx?:number;cy?:number;point:Point;count:number;color:string;peerIndex?:number}){
 const plot=usePlotArea();
 if(typeof cx!=='number'||typeof cy!=='number')return null;
 const tint=point.kind==='max'?'#10b981':point.kind==='min'?'#ff626b':color;
 const side=peerIndex===undefined?(point.index<count/2?1:-1):point.index<peerIndex?-1:1;
 const x=plot?Math.max(plot.x+25,Math.min(plot.x+plot.width-25,cx+side*30)):cx;
 // Reserve a small annotation rail above the plot; leaders identify the exact dot.
 const y=plot?Math.max(10,plot.y-16):10;
 const elbow=y+15;
 return <g className="zg-chart-extremum" pointerEvents="none" aria-label={`${point.kind==='min'?'최저':point.kind==='max'?'최고':'최고·최저'} ${point.value.toFixed(1)} (${point.date.slice(5)})`}>
  <path d={`M ${cx} ${cy-4} V ${elbow} H ${x} V ${y+13}`} fill="none" stroke={tint} strokeWidth={.8} opacity={.7}/>
  <circle cx={cx} cy={cy} r={2.8} fill={tint} stroke={tint} strokeWidth={1}/>
  <text x={x} y={y} textAnchor="middle" fill={tint} fontSize={10} fontWeight={600} stroke="#071a29" strokeWidth={2.5} paintOrder="stroke" strokeLinejoin="round">
   <tspan x={x}>{point.value.toFixed(1)}</tspan><tspan x={x} dy={11} fontWeight={400}>({point.date.slice(5)})</tspan>
  </text>
 </g>;
}
