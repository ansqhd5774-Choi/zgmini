'use client';
import {Area,AreaChart,CartesianGrid,Line,LineChart,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
type Point={label:string;value:number};
type IndicatorPlotItem={name:string;signal:string;chart:Point[];benchmark:number;unit:string};
export function MiniIndicatorPlot({item}:{item:IndicatorPlotItem}){const color=item.signal==='positive'?'#059669':item.signal==='negative'?'#e11d48':'#64748b';return (<ResponsiveContainer width="100%" height="100%">
        <LineChart data={item.chart} margin={{top:5,right:3,bottom:5,left:3}}>
          <ReferenceLine y={item.benchmark} stroke="#94a3b8" strokeDasharray="3 3" ifOverflow="extendDomain" />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>);}
export function SentimentPlot({visible,color,kind,item}:{visible:Point[];color:string;kind:string;item:{name:string}}){return (<ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visible} margin={{top:5,right:2,left:2,bottom:3}}>
              <defs><linearGradient id={`sentiment-${kind}-${item.name.replace(/[^a-zA-Z0-9가-힣]/g, "")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.28}/><stop offset="100%" stopColor={color} stopOpacity={0.02}/></linearGradient></defs>
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.2} fill={`url(#sentiment-${kind}-${item.name.replace(/[^a-zA-Z0-9가-힣]/g, "")})`} dot={false} isAnimationActive={false}/>
            </AreaChart>
          </ResponsiveContainer>);}
export function IndicatorPlot({visible,item}:{visible:Point[];item:IndicatorPlotItem}){return (<ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visible} margin={{top:18,right:20,left:-12,bottom:0}}>
              <defs><linearGradient id={`macro-${item.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2463eb" stopOpacity={0.28}/><stop offset="100%" stopColor="#2463eb" stopOpacity={0.02}/></linearGradient></defs>
              <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:12}}/>
              <YAxis axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:12}} domain={([min,max]) => [Math.min(Number(min), item.benchmark - Math.max(1, Math.abs(item.benchmark)*0.15)), Math.max(Number(max), item.benchmark + Math.max(1, Math.abs(item.benchmark)*0.15))]}/>
              <ReferenceLine y={item.benchmark} stroke="#e11d48" strokeWidth={1.5} strokeDasharray="5 4" ifOverflow="extendDomain" label={{value:`기준 ${item.benchmark}`,position:"insideTopRight",fill:"#be123c",fontSize:12}}/>
              <Tooltip formatter={(value) => [`${value} ${item.unit}`, item.name]} contentStyle={{borderRadius:0,border:"1px solid #94a3b8",boxShadow:"0 8px 24px rgba(15,35,65,.12)"}}/>
              <Area type="monotone" dataKey="value" stroke="#2463eb" strokeWidth={2.8} fill={`url(#macro-${item.id})`} activeDot={{r:5}}/>
            </AreaChart>
          </ResponsiveContainer>);}
export function SummaryPlot({visible,color}:{visible:Point[];color:string}){return (<ResponsiveContainer width="100%" height="100%">
        <AreaChart data={visible} margin={{top:4,right:1,left:1,bottom:2}}>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.4} fill={color} fillOpacity={0.1} dot={false} isAnimationActive={false}/>
        </AreaChart>
      </ResponsiveContainer>);}
